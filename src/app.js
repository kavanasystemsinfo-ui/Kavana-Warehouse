// ============================
// KAVANA WAREHOUSE v2 API — Express App
// Exportable: Docker (listen) + Vercel (serverless-http)
// ============================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { PrismaClient, Prisma } = require('@prisma/client');
const logger = require('./lib/logger');
const { validate, loginSchema, centroSchema, categoríaSchema } = require('./middleware/validate');

const app = express();
app.set('trust proxy', true);
// CORS: whitelist de orígenes (evita reflejar cualquier dominio con credentials)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4001,http://localhost:4000,https://www.kavanasystems.com')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin Origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json());
const prisma = new PrismaClient();
const jwtSecretRaw = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !jwtSecretRaw) {
  console.error('[FATAL] JWT_SECRET no definido en producción. Abortando arranque.');
  process.exit(1);
}
const JWT_SECRET = jwtSecretRaw || 'kavanawarehouse-jwt-secret-dev';

// ----- Auth middleware -----
// Resuelve id_cliente desde BD y lo popula en req.user para que los handlers
// apliquen scoping multi-tenant sin re-consultar (evita fugas cross-tenant).
const auth = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(h.split(' ')[1], JWT_SECRET);
    let idCliente = decoded.id_cliente;
    const u = await prisma.usuario.findUnique({ where: { id_usuario: decoded.id_usuario } });
    if (!u) return res.status(401).json({ error: 'Token invalido' });
    if (!idCliente && u.id_cliente) idCliente = u.id_cliente;
    req.user = {
      id_usuario: u.id_usuario,
      email: u.email,
      rol: u.rol,
      is_super_admin: u.is_super_admin,
      id_cliente: idCliente,
      session_id: u.session_id,
    };
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado. Inicie sesión nuevamente.' });
    res.status(401).json({ error: 'Token invalido' });
  }
};
const supervisorOnly = (req, res, next) => {
  // Rol 'oficina' (gestiona todo) y 'supervisor' (responsable de centro) pueden
  // operar. 'oficina' es el nombre nuevo; 'supervisor' se mantiene por
  // compatibilidad hasta que toda la BD migre.
  if (req.user.rol !== 'supervisor' && req.user.rol !== 'oficina') return res.status(403).json({ error: 'Solo personal autorizado' });
  next();
};
// ¿El cliente del usuario es la empresa demo? (caché: solo hay una)
let _demoClienteId = null;
async function esDemoCliente(idCliente) {
  if (!idCliente) return false;
  if (_demoClienteId === null) {
    const cli = await prisma.cliente.findFirst({ where: { es_demo: true }, select: { id_cliente: true } });
    _demoClienteId = cli ? cli.id_cliente : false;
  }
  return _demoClienteId === idCliente;
}

// ¿El usuario es un visitante de la demo? (supervisor con session_id o la cuenta demo)
async function esVisitaUsuario(user) {
  return Boolean(user.session_id) || await esDemoCliente(user.id_cliente);
}

const officeOnly = async (req, res, next) => {
  // Blindaje de la demo: la gestión global (editar/borrar productos, centros,
  // usuarios, presupuestos, reset) es solo para la oficina real. Los visitantes
  // (supervisores de 24h y la cuenta demo warehouse/kavana) solo leen lo
  // existente: no tocan los datos compartidos.
  if (await esVisitaUsuario(req.user)) {
    return res.status(403).json({ error: 'Modo demo: los datos existentes son de solo lectura' });
  }
  if (req.user.rol !== 'oficina' && req.user.rol !== 'supervisor') {
    return res.status(403).json({ error: 'Solo personal autorizado' });
  }
  next();
};
const superAdminOnly = (req, res, next) => {
  if (!req.user.is_super_admin) return res.status(403).json({ error: 'Solo administrador del sistema' });
  next();
};

// ----- AUTH -----
app.post('/api/v1/auth/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    // Buscar por email o username. El username se normaliza a minúsculas:
    // los teclados móviles autocapitalizan la primera letra y el login debe
    // funcionar igual (warehouse == Warehouse).
    const normalized = email.trim();
    const u = normalized.includes('@')
      ? await prisma.usuario.findUnique({ where: { email: normalized } })
      : await prisma.usuario.findFirst({ where: { username: normalized.toLowerCase() } });
    // La contraseña se trimmea: los teclados móviles (autocomplete) añaden
    // espacios al pulsar siguiente/sugerencia, y en el campo de puntos no se ve.
    if (!u || !(await bcrypt.compare(password.trim(), u.password_hash))) {
      // La cuenta demo es pública (como el PIN de RouteAI). Los teclados
      // móviles autocapitalizan ("Kavana" en vez de "kavana") y los gestores
      // de contraseñas guardan esa variante: aceptamos mayúsculas/espacios
      // SOLO para la empresa demo. Las empresas reales usan bcrypt estricto.
      const esDemo = u ? await esDemoCliente(u.id_cliente) : false;
      if (!esDemo || !(await bcrypt.compare(password.trim().toLowerCase(), u.password_hash))) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }
    }
    const token = jwt.sign({ id_usuario: u.id_usuario, email: u.email, rol: u.rol, is_super_admin: u.is_super_admin, id_cliente: u.id_cliente }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
    res.json({ token, usuario: { id_usuario: u.id_usuario, nombre: u.nombre, email: u.email, username: u.username, rol: u.rol, is_super_admin: u.is_super_admin, session_id: u.session_id, demo: await esDemoCliente(u.id_cliente) } });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// ----- DASHBOARD -----
app.get('/api/v1/dashboard', auth, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    const filtro = idCliente ? { id_cliente: idCliente } : {};
    const tp = await prisma.producto.count();
    const tc = await prisma.centro.count({ where: filtro });
    const te = await prisma.usuario.count({ where: { rol: 'limpiador', ...(idCliente ? { id_cliente: idCliente } : {}) } });
    const bs = await prisma.$queryRaw`
      SELECT COUNT(*) as c FROM inventario_centros ic
      JOIN centros c ON ic.id_centro = c.id_centro
      WHERE ic.cantidad_actual <= ic.stock_minimo AND ic.stock_minimo > 0
      ${idCliente ? Prisma.sql`AND c.id_cliente = ${idCliente}` : Prisma.empty}
    `;
    const ch = await prisma.$queryRaw`
      SELECT COUNT(*) as c FROM registro_movimientos rm
      JOIN centros c ON rm.id_centro = c.id_centro
      WHERE rm.fecha_hora >= CURRENT_DATE
      ${idCliente ? Prisma.sql`AND c.id_cliente = ${idCliente}` : Prisma.empty}
    `;
    res.json({ totalProductos: tp, totalCentros: tc, totalEmpleados: te, bajoStock: parseInt(bs[0]?.c||0), consumosHoy: parseInt(ch[0]?.c||0), topConsumos: [] });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Dashboard — Consumption data (frontend)
app.get('/api/v1/dashboard/consumption', auth, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    // Filtro de periodo (desde/hasta): aplica a totales, evolución y movimientos.
    const rangoParts = [];
    if (req.query.desde) rangoParts.push(Prisma.sql`rm.fecha_hora >= ${String(req.query.desde)}::date`);
    if (req.query.hasta) rangoParts.push(Prisma.sql`rm.fecha_hora < (${String(req.query.hasta)}::date + INTERVAL '1 day')`);
    const rangoSql = rangoParts.length ? Prisma.sql`AND ${Prisma.join(rangoParts, ' AND ')}` : Prisma.empty;
    // Totales y evolución: sobre TODO el histórico del cliente (no solo 50 movs)
    const scope = idCliente ? Prisma.sql`AND c.id_cliente = ${idCliente}` : Prisma.empty;
    const evol = await prisma.$queryRaw`
      SELECT to_char(rm.fecha_hora, 'YYYY-MM') AS mes,
             SUM(ABS(rm.cantidad))::int AS unidades,
             ROUND(SUM(ABS(rm.cantidad) * p.coste_unitario)::numeric, 2) AS gasto
      FROM registro_movimientos rm
      JOIN productos p ON rm.id_producto = p.id_producto
      JOIN centros c ON rm.id_centro = c.id_centro
      WHERE rm.cantidad < 0 ${scope} ${rangoSql}
      GROUP BY 1 ORDER BY 1
    `;
    let movs;
    if (idCliente) {
      movs = await prisma.$queryRaw`
        SELECT rm.*, p.nombre_producto, p.unidad_medida, p.coste_unitario,
               c.nombre_centro, u.nombre as usuario_nombre
        FROM registro_movimientos rm
        JOIN productos p ON rm.id_producto = p.id_producto
        JOIN centros c ON rm.id_centro = c.id_centro
        JOIN usuarios u ON rm.id_usuario = u.id_usuario
        WHERE rm.cantidad < 0 AND c.id_cliente = ${idCliente} ${rangoSql}
        ORDER BY rm.fecha_hora DESC LIMIT 50
      `;
    } else {
      movs = await prisma.$queryRaw`
        SELECT rm.*, p.nombre_producto, p.unidad_medida, p.coste_unitario,
               c.nombre_centro, u.nombre as usuario_nombre
        FROM registro_movimientos rm
        JOIN productos p ON rm.id_producto = p.id_producto
        JOIN centros c ON rm.id_centro = c.id_centro
        JOIN usuarios u ON rm.id_usuario = u.id_usuario
        WHERE rm.cantidad < 0 ${rangoSql}
        ORDER BY rm.fecha_hora DESC LIMIT 50
      `;
    }
    const total = evol.reduce((s, m) => s + Number(m.unidades), 0);
    const totalEuro = evol.reduce((s, m) => s + Number(m.gasto), 0);
    // Conteo REAL de movimientos del periodo (no el length de los últimos 50)
    const countMovs = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n
      FROM registro_movimientos rm
      JOIN centros c ON rm.id_centro = c.id_centro
      WHERE rm.cantidad < 0 ${scope} ${rangoSql}
    `;
    const totalMovimientos = parseInt(countMovs[0]?.n || 0, 10);
    // Resumen por centro (con el filtro de periodo): consumos agrupados + desglose por producto
    const porCentro = await prisma.$queryRaw`
      SELECT c.id_centro, c.nombre_centro, c.presupuesto_mensual,
             SUM(ABS(rm.cantidad))::int AS unidades,
             ROUND(SUM(ABS(rm.cantidad) * p.coste_unitario)::numeric, 2) AS gasto,
             COUNT(*)::int AS movimientos
      FROM registro_movimientos rm
      JOIN productos p ON rm.id_producto = p.id_producto
      JOIN centros c ON rm.id_centro = c.id_centro
      WHERE rm.cantidad < 0 ${scope} ${rangoSql}
      GROUP BY c.id_centro, c.nombre_centro, c.presupuesto_mensual
      ORDER BY gasto DESC
    `;
    const porProducto = await prisma.$queryRaw`
      SELECT c.id_centro, p.id_producto, p.nombre_producto, p.unidad_medida,
             SUM(ABS(rm.cantidad))::int AS cantidad,
             ROUND(SUM(ABS(rm.cantidad) * p.coste_unitario)::numeric, 2) AS gasto
      FROM registro_movimientos rm
      JOIN productos p ON rm.id_producto = p.id_producto
      JOIN centros c ON rm.id_centro = c.id_centro
      WHERE rm.cantidad < 0 ${scope} ${rangoSql}
      GROUP BY c.id_centro, p.id_producto, p.nombre_producto, p.unidad_medida
      ORDER BY c.id_centro, gasto DESC
    `;
    const prodPorCentro = new Map();
    for (const pp of porProducto) {
      const arr = prodPorCentro.get(pp.id_centro) || [];
      arr.push({ id_producto: pp.id_producto, nombre_producto: pp.nombre_producto, unidad_medida: pp.unidad_medida, cantidad: Number(pp.cantidad), gasto_euros: Number(pp.gasto) });
      prodPorCentro.set(pp.id_centro, arr);
    }
    const resumen_por_centro = porCentro.map((c) => {
      const presupuesto = Number(c.presupuesto_mensual || 0);
      const gasto = Number(c.gasto);
      return {
        centro: { id_centro: c.id_centro, nombre_centro: c.nombre_centro },
        presupuesto_mensual: presupuesto || null,
        total_consumo_unidades: Number(c.unidades),
        gasto_total_euros: gasto,
        porcentaje_consumido: presupuesto > 0 ? Math.round((gasto / presupuesto) * 1000) / 10 : null,
        movimientos: Number(c.movimientos),
        productos: prodPorCentro.get(c.id_centro) || [],
      };
    });
    res.json({
      total_consumo_unidades: total,
      total_gasto_euros: Math.round(totalEuro * 100) / 100,
      total_movimientos: totalMovimientos,
      evolucion_mensual: evol.map(m => ({ mes: m.mes, unidades: Number(m.unidades), gasto_euros: Number(m.gasto) })),
      resumen_por_centro,
      movimientos: movs.map(m => ({
        id_movimiento: m.id_movimiento,
        fecha_hora: m.fecha_hora,
        centro: { id_centro: m.id_centro, nombre_centro: m.nombre_centro },
        producto: { id_producto: m.id_producto, nombre_producto: m.nombre_producto, unidad_medida: m.unidad_medida },
        cantidad: m.cantidad,
        gasto_euros: Math.round(Math.abs(Number(m.cantidad)) * Number(m.coste_unitario || 0) * 100) / 100,
        usuario: { nombre: m.usuario_nombre }
      }))
    });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Dashboard — Alerts (frontend)
app.get('/api/v1/dashboard/alerts', auth, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    let criticas, advertencias;
    if (idCliente) {
      criticas = await prisma.$queryRaw`
        SELECT ic.*, p.nombre_producto, c.nombre_centro
        FROM inventario_centros ic
        JOIN productos p ON ic.id_producto = p.id_producto
        JOIN centros c ON ic.id_centro = c.id_centro
        WHERE ic.cantidad_actual <= 0 AND c.id_cliente = ${idCliente}
        ORDER BY c.nombre_centro
      `;
      advertencias = await prisma.$queryRaw`
        SELECT ic.*, p.nombre_producto, c.nombre_centro
        FROM inventario_centros ic
        JOIN productos p ON ic.id_producto = p.id_producto
        JOIN centros c ON ic.id_centro = c.id_centro
        WHERE ic.cantidad_actual > 0 AND ic.cantidad_actual <= ic.stock_minimo AND ic.stock_minimo > 0 AND c.id_cliente = ${idCliente}
        ORDER BY c.nombre_centro
      `;
    } else {
      criticas = await prisma.$queryRaw`
        SELECT ic.*, p.nombre_producto, c.nombre_centro
        FROM inventario_centros ic
        JOIN productos p ON ic.id_producto = p.id_producto
        JOIN centros c ON ic.id_centro = c.id_centro
        WHERE ic.cantidad_actual <= 0
        ORDER BY c.nombre_centro
      `;
      advertencias = await prisma.$queryRaw`
        SELECT ic.*, p.nombre_producto, c.nombre_centro
        FROM inventario_centros ic
        JOIN productos p ON ic.id_producto = p.id_producto
        JOIN centros c ON ic.id_centro = c.id_centro
        WHERE ic.cantidad_actual > 0 AND ic.cantidad_actual <= ic.stock_minimo AND ic.stock_minimo > 0
        ORDER BY c.nombre_centro
      `;
    }
    res.json({
      criticas: criticas.map(c => ({ id: c.id_centro + '-' + c.id_producto, centro: c.nombre_centro, producto: c.nombre_producto, cantidad_actual: c.cantidad_actual })),
      advertencias: advertencias.map(a => ({ id: a.id_centro + '-' + a.id_producto, centro: a.nombre_centro, producto: a.nombre_producto, cantidad_actual: a.cantidad_actual }))
    });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Dashboard — Desviaciones (mermas de inventario: registrado vs físico)
const deviationController = require('./controllers/deviationController');
app.get('/api/v1/dashboard/deviations', auth, deviationController.getDeviations);
app.post('/api/v1/inventario/:id_centro/:id_producto/conteo', auth, officeOnly, deviationController.guardarConteo);

// Propuesta de compras (reabastecimiento por stock mínimo)
const purchaseController = require('./controllers/purchaseController');
app.get('/api/v1/purchases/proposal', auth, purchaseController.getProposal);

// Costes por centro (Fase 2: control de coste vs presupuesto)
const costeController = require('./controllers/costeController');
app.get('/api/v1/dashboard/costes', auth, costeController.getCostes);
app.post('/api/v1/centros/:id_centro/presupuesto', auth, officeOnly, costeController.setPresupuesto);

// Reset de datos de demostración (solo borra clientes marcados es_demo)
app.post('/api/v1/demo/reset', auth, officeOnly, async (req, res) => {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(401).json({ error: 'No autenticado' });
    const demoClientes = await prisma.cliente.findMany({ where: { es_demo: true } });
    for (const cli of demoClientes) {
      const id = cli.id_cliente;
      await prisma.registroMovimiento.deleteMany({ where: { centro: { id_cliente: id } } });
      await prisma.inventarioCentro.deleteMany({ where: { centro: { id_cliente: id } } });
      await prisma.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: id } } });
      const uids = (await prisma.usuario.findMany({ where: { id_cliente: id } })).map(u => u.id_usuario);
      await prisma.reglaNotificacion.deleteMany({ where: { id_supervisor: { in: uids } } });
      await prisma.usuario.deleteMany({ where: { id_cliente: id } });
      await prisma.centro.deleteMany({ where: { id_cliente: id } });
      await prisma.cliente.deleteMany({ where: { id_cliente: id } });
    }
    res.json({ ok: true, mensaje: 'Datos de demostración eliminados. Panel limpio listo.' });
  } catch (e) {
    logger.error('demo/reset', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ----- CATEGORIAS -----
app.get('/api/v1/categorias', auth, async (req, res) => {
  try { 
    const cats = await prisma.$queryRaw`SELECT id_categoria, nombre, icono, descripcion FROM categorias ORDER BY nombre`;
    res.json({ categorias: cats }); 
  }
  catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/categorias', auth, officeOnly, async (req, res) => {
  try {
    const c = await prisma.categoria.create({
      data: {
        nombre: req.body.nombre,
        icono: req.body.icono,
        descripcion: req.body.descripcion
      }
    });
    res.json({ categoria: c });
  }
  catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// ----- PRODUCTOS -----
app.get('/api/v1/productos', auth, async (req, res) => {
  try {
    const { search, categoria } = req.query;
    const where = {};
    if (search) where.nombre = { contains: search, mode: 'insensitive' };
    if (categoria) where.id_categoria = parseInt(categoria);
    const prods = await prisma.producto.findMany({ where, include: { categoria: true }, orderBy: { nombre_producto: 'asc' } });
    res.json({ productos: prods });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/productos', auth, async (req, res) => {
  try {
    // Cualquiera autenticado puede CREAR un material nuevo; si es visitante
    // (demo), queda marcado con su sesión y caduca en 24h (lo limpia el cron).
    const esVisita = await esVisitaUsuario(req.user);
    const p = await prisma.producto.create({
      data: {
        nombre_producto: req.body.nombre_producto,
        unidad_medida: req.body.unidad_medida || 'unidades',
        coste_unitario: Number(req.body.coste_unitario) || 0,
        stock_minimo_alerta: Number(req.body.stock_minimo_alerta) || 5,
        id_categoria: req.body.id_categoria ? Number(req.body.id_categoria) : null,
        ...(esVisita ? { session_id: req.user.session_id || 'demo', expira_en: new Date(Date.now() + 24 * 3600 * 1000) } : {})
      }
    });
    res.json({ producto: p });
  }
  catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.put('/api/v1/productos/:id', auth, officeOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = {};
    if (req.body.nombre_producto !== undefined) data.nombre_producto = req.body.nombre_producto;
    if (req.body.unidad_medida !== undefined) data.unidad_medida = req.body.unidad_medida;
    if (req.body.coste_unitario !== undefined) data.coste_unitario = Number(req.body.coste_unitario);
    if (req.body.stock_minimo_alerta !== undefined) data.stock_minimo_alerta = Number(req.body.stock_minimo_alerta);
    const p = await prisma.producto.update({ where: { id_producto: id }, data });
    res.json({ producto: p });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});
app.delete('/api/v1/productos/:id', auth, officeOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usos = await prisma.inventarioCentro.count({ where: { id_producto: id } });
    if (usos > 0) {
      return res.status(409).json({ error: `No se puede borrar: el producto está en ${usos} centro(s). Quítalo de los centros primero.` });
    }
    await prisma.producto.delete({ where: { id_producto: id } });
    res.json({ ok: true });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// ----- CENTROS -----
app.get('/api/v1/centros', auth, async (req, res) => {
  try {
    const usuario = req.user;
    let idCliente = usuario?.id_cliente;
    if (!idCliente && usuario?.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    const centros = await prisma.centro.findMany({
      where: idCliente ? { id_cliente: idCliente } : {},
      orderBy: { nombre_centro: 'asc' },
      include: {
        _count: { select: { asignaciones: true, inventarioCentros: true } },
        asignaciones: { where: { fecha_fin: null }, include: { usuario: { select: { nombre: true, rol: true, telefono: true, numero_empleado: true, email: true } } } },
        inventarioCentros: { include: { producto: { select: { nombre_producto: true, unidad_medida: true, coste_unitario: true } } } },
      },
    });
    res.json({ centros });
  } catch (e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/centros', auth, officeOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const c = await prisma.centro.create({
      data: {
        nombre_centro: req.body.nombre_centro,
        direccion: req.body.direccion,
        presupuesto_mensual: Number(req.body.presupuesto_mensual) || 0,
        id_cliente: idCliente
      }
    });
    res.json({ centro: c });
  }
  catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.put('/api/v1/centros/:id', auth, officeOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Centro inválido' });
    // Scoping multi-tenant: el centro debe pertenecer al cliente del usuario.
    let idCliente = req.user?.id_cliente;
    if (!idCliente && req.user?.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: req.user.id_usuario } });
      idCliente = u?.id_cliente;
    }
    const existente = await prisma.centro.findUnique({ where: { id_centro: id } });
    if (!existente) return res.status(404).json({ error: 'Centro no encontrado' });
    if (idCliente && existente.id_cliente !== idCliente) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    const data = {};
    if (req.body.nombre_centro !== undefined) data.nombre_centro = req.body.nombre_centro;
    if (req.body.direccion !== undefined) data.direccion = req.body.direccion;
    if (req.body.presupuesto_mensual !== undefined) data.presupuesto_mensual = Number(req.body.presupuesto_mensual);
    const c = await prisma.centro.update({ where: { id_centro: id }, data });
    res.json({ centro: c });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// =============================================================================
// GESTIÓN DE RESPONSABLES DE CENTRO (supervisor)
// El supervisor crea usuarios con rol "responsable" y les asigna centros
// mediante checkboxes. El responsable usa la app móvil para hacer recuentos
// físicos que actualizan el stock real y generan histórico.
// =============================================================================

// Crear usuario responsable (solo supervisor)
app.post('/api/v1/usuarios', auth, officeOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son requeridos' });
    }
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) return res.status(400).json({ error: 'Ese email ya está registrado' });
    const password_hash = await bcrypt.hash(password, 10);
    const u = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password_hash,
        rol: 'responsable',
        id_cliente: idCliente,
        telefono: telefono || null,
        estado: 'activo',
      },
      select: { id_usuario: true, nombre: true, email: true, rol: true, telefono: true }
    });
    res.status(201).json({ usuario: u });
  } catch (e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// Asignar centros a un responsable mediante checkboxes (sincroniza AsignacionPersonal)
app.post('/api/v1/usuarios/:id/centros', auth, officeOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const idUsuario = Number(req.params.id);
    const centrosBody = req.body.centros;
    if (!Array.isArray(centrosBody)) return res.status(400).json({ error: 'centros debe ser un array de ids' });

    // Verificar que el usuario responsable pertenece al cliente
    const usuario = await prisma.usuario.findUnique({ where: { id_usuario: idUsuario } });
    if (!usuario || usuario.id_cliente !== idCliente) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuario.rol !== 'responsable') return res.status(400).json({ error: 'El usuario no es responsable' });

    // Validar que todos los centros pertenecen al cliente
    const centrosValidos = await prisma.centro.findMany({
      where: { id_centro: { in: centrosBody.map(Number) }, id_cliente: idCliente },
      select: { id_centro: true }
    });
    const idsValidos = new Set(centrosValidos.map(c => c.id_centro));
    const centrosFinal = centrosBody.map(Number).filter(id => idsValidos.has(id));

    // Cerrar asignaciones previas (fecha_fin = now) y crear las nuevas
    await prisma.asignacionPersonal.updateMany({
      where: { id_usuario: idUsuario, fecha_fin: null },
      data: { fecha_fin: new Date() }
    });
    for (const idCentro of centrosFinal) {
      await prisma.asignacionPersonal.create({
        data: { id_usuario: idUsuario, id_centro: idCentro, fecha_inicio: new Date() }
      });
    }
    const asignadas = await prisma.asignacionPersonal.findMany({
      where: { id_usuario: idUsuario, fecha_fin: null },
      include: { centro: { select: { id_centro: true, nombre_centro: true } } }
    });
    res.json({ centros_asignados: asignadas.map(a => a.centro) });
  } catch (e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// Histórico de recuentos físicos (solo supervisor) — tabla en Dashboard
app.get('/api/v1/recuentos', auth, supervisorOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const where = { centro: { id_cliente: idCliente }, tipo: 'recuento' };
    const filtroCentro = req.query.centro ? Number(req.query.centro) : null;
    if (filtroCentro) where.id_centro = filtroCentro;
    const recuentos = await prisma.registroMovimiento.findMany({
      where,
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        producto: { select: { id_producto: true, nombre_producto: true, unidad_medida: true } },
        usuario: { select: { id_usuario: true, nombre: true, email: true } }
      },
      orderBy: { fecha_hora: 'desc' },
      take: 200
    });
    res.json({
      recuentos: recuentos.map(r => ({
        id_movimiento: r.id_movimiento,
        fecha_hora: r.fecha_hora,
        responsable: { id_usuario: r.usuario.id_usuario, nombre: r.usuario.nombre, email: r.usuario.email },
        centro: { id_centro: r.centro.id_centro, nombre_centro: r.centro.nombre_centro },
        producto: { id_producto: r.producto.id_producto, nombre_producto: r.producto.nombre_producto, unidad_medida: r.producto.unidad_medida },
        cantidad_nueva: r.cantidad,
      }))
    });
  } catch (e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// ----- SUPERVISORES DEMO (sesión de reclutador, expiran 24h) -----
// La oficina crea supervisores de prueba. Se guardan en BD con session_id
// (etiqueta del visitante) y expira_en (now + 24h). Un cron diario los borra.
app.post('/api/v1/supervisores', auth, supervisorOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const { nombre, email, password, session_id } = req.body;
    if (!nombre || !email || !password || !session_id) {
      return res.status(400).json({ error: 'nombre, email, password y session_id son requeridos' });
    }
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) return res.status(400).json({ error: 'Ese email ya está registrado' });
    const password_hash = await bcrypt.hash(password, 10);
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const u = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password_hash,
        rol: 'supervisor',
        id_cliente: idCliente,
        session_id,
        expira_en: expiraEn,
        estado: 'activo',
      },
      select: { id_usuario: true, nombre: true, email: true, rol: true, session_id: true, expira_en: true }
    });
    res.status(201).json({ supervisor: u });
  } catch (e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

app.get('/api/v1/supervisores', auth, supervisorOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    const sessionId = req.query.session_id;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const where = { rol: 'supervisor', id_cliente: idCliente };
    if (sessionId) where.session_id = sessionId;
    const supervisores = await prisma.usuario.findMany({
      where,
      select: { id_usuario: true, nombre: true, email: true, rol: true, session_id: true, expira_en: true },
      orderBy: { id_usuario: 'desc' },
    });
    res.json({ supervisores });
  } catch (e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// ----- EMPLEADOS -----
app.get('/api/v1/empleados', auth, supervisorOnly, async (req, res) => {
  try {
    const usuario = req.user;
    let idCliente = usuario?.id_cliente;
    if (!idCliente && usuario?.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    const emps = await prisma.usuario.findMany({
      where: { rol: 'limpiador', id_cliente: idCliente ?? undefined },
      include: { asignaciones: { include: { centro: true }, where: { fecha_fin: null } } },
      orderBy: { nombre: 'asc' },
    });
    res.json({ empleados: emps });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/empleados', auth, officeOnly, async (req, res) => {
  try {
    const { nombre, email, password, numero_empleado, id_centro } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email obligatorios' });
    if (!password) return res.status(400).json({ error: 'La contraseña es obligatoria' });
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    if (id_centro && !(await requireCentroDelCliente(id_centro, idCliente))) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: { nombre, email, password_hash: hash, numero_empleado, id_cliente: idCliente, rol: 'limpiador' },
      });
      if (id_centro) {
        await tx.asignacionPersonal.create({ data: { id_usuario: u.id_usuario, id_centro, fecha_inicio: new Date() } });
      }
      return u;
    });
    res.json({ empleado: result });
  } catch(e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error interno' });
  }
});

// Centro activo del usuario logueado (app empleado)
app.get('/api/v1/asignaciones/active', auth, async (req, res) => {
  try {
    const now = new Date();
    const asignaciones = await prisma.asignacionPersonal.findMany({
      where: {
        id_usuario: req.user.id_usuario,
        fecha_inicio: { lte: now },
        OR: [{ fecha_fin: null }, { fecha_fin: { gte: now } }]
      },
      include: { centro: true }
    });
    if (!asignaciones.length) return res.status(404).json({ error: 'No tienes centros asignados' });
    res.json({ centros: asignaciones.map(a => a.centro) });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// Lista de responsables del cliente con sus centros asignados (página Responsables)
app.get('/api/v1/asignaciones/users', auth, supervisorOnly, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });
    const usuarios = await prisma.usuario.findMany({
      where: { id_cliente: idCliente, rol: { in: ['responsable', 'supervisor', 'oficina'] } },
      include: {
        asignaciones: { include: { centro: true }, where: { fecha_fin: null } },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json({
      usuarios: usuarios.map(u => ({
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        telefono: u.telefono,
        centros_asignados: u.asignaciones.map(a => ({ id_centro: a.centro.id_centro, nombre_centro: a.centro.nombre_centro })),
      })),
    });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// ----- INVENTARIO (scoping multi-tenant) -----
const requireCentroDelCliente = async (idCentro, idCliente) => {
  if (!idCentro) return false;
  const c = await prisma.centro.findUnique({ where: { id_centro: Number(idCentro) } });
  return !!c && (idCliente == null || c.id_cliente === idCliente);
};

app.get('/api/v1/inventario', auth, async (req, res) => {
  try {
    const { centro, search } = req.query;
    const where = {};
    if (centro) {
      if (!(await requireCentroDelCliente(centro, req.user.id_cliente))) {
        return res.status(403).json({ error: 'Sin acceso a este centro' });
      }
      where.id_centro = parseInt(centro);
    } else if (req.user.id_cliente) {
      const centros = await prisma.centro.findMany({ where: { id_cliente: req.user.id_cliente }, select: { id_centro: true } });
      where.id_centro = { in: centros.map(c => c.id_centro) };
    }
    const items = await prisma.inventarioCentro.findMany({ where, include: { producto: { include: { categoria: true } }, centro: true } });
    let result = items;
    if (search) result = items.filter(i => i.producto.nombre.toLowerCase().includes(search.toLowerCase()));
    res.json({ inventario: result });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/inventario', auth, officeOnly, async (req, res) => {
  try {
    const { id_centro, id_producto, cantidad_actual, stock_minimo } = req.body;
    if (!(await requireCentroDelCliente(id_centro, req.user.id_cliente))) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    const item = await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro, id_producto } },
      update: { cantidad_actual, stock_minimo, fecha_actualizacion: new Date() },
      create: { id_centro, id_producto, cantidad_actual, stock_minimo }
    });
    res.json({ inventario: item });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/inventario/reponer', auth, officeOnly, async (req, res) => {
  try {
    const { id_centro, id_producto, cantidad } = req.body;
    if (!(await requireCentroDelCliente(id_centro, req.user.id_cliente))) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    const inv = await prisma.inventarioCentro.findUnique({ where: { id_centro_id_producto: { id_centro, id_producto } } });
    const nueva = (inv?.cantidad_actual || 0) + cantidad;
    await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro, id_producto } },
      update: { cantidad_actual: nueva, fecha_actualizacion: new Date() },
      create: { id_centro, id_producto, cantidad_actual: cantidad }
    });
    res.json({ message: 'Repuesto' });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Stock inventory con productos (para frontend getProductos) — scoping multi-tenant
app.get('/api/v1/stock/inventory', auth, async (req, res) => {
  try {
    const { centro } = req.query;
    const where = {};
    if (centro) {
      if (!(await requireCentroDelCliente(centro, req.user.id_cliente))) {
        return res.status(403).json({ error: 'Sin acceso a este centro' });
      }
      where.id_centro = parseInt(centro);
    } else if (req.user.id_cliente) {
      const centros = await prisma.centro.findMany({ where: { id_cliente: req.user.id_cliente }, select: { id_centro: true } });
      where.id_centro = { in: centros.map(c => c.id_centro) };
    }
    const items = await prisma.inventarioCentro.findMany({
      where,
      include: { producto: true, centro: { select: { nombre_centro: true } } },
      orderBy: { id_producto: 'asc' }
    });
    const result = items.map(i => ({
      id_centro: i.id_centro,
      id_producto: i.id_producto,
      cantidad_actual: i.cantidad_actual,
      centro: { nombre_centro: i.centro?.nombre_centro },
      producto: {
        id_producto: i.producto.id_producto,
        nombre_producto: i.producto.nombre_producto,
        unidad_medida: i.producto.unidad_medida,
        stock_minimo_alerta: i.producto.stock_minimo_alerta,
        coste_unitario: i.producto.coste_unitario,
        id_categoria: i.producto.id_categoria
      }
    }));
    res.json({ inventario: result });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Consumir stock (app empleado)
app.post('/api/v1/stock/consume', auth, officeOnly, async (req, res) => {
  try {
    const { id_producto, cantidad } = req.body;
    if (!id_producto || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Producto y cantidad requeridos' });
    }
    const now = new Date();
    const asignacion = await prisma.asignacionPersonal.findFirst({
      where: { id_usuario: req.user.id_usuario, fecha_inicio: { lte: now }, OR: [{ fecha_fin: null }, { fecha_fin: { gte: now } }] }
    });
    if (!asignacion) return res.status(400).json({ error: 'No tienes un centro asignado' });
    const id_centro = asignacion.id_centro;
    const inv = await prisma.inventarioCentro.findUnique({ where: { id_centro_id_producto: { id_centro, id_producto } } });
    if (!inv || inv.cantidad_actual < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
    await prisma.inventarioCentro.update({ where: { id_centro_id_producto: { id_centro, id_producto } }, data: { cantidad_actual: inv.cantidad_actual - cantidad } });
    const mov = await prisma.registroMovimiento.create({ data: { id_centro, id_producto, id_usuario: req.user.id_usuario, cantidad: -Math.abs(cantidad) } });
    const updated = await prisma.inventarioCentro.findUnique({ where: { id_centro_id_producto: { id_centro, id_producto } }, include: { producto: true } });
    res.json({
      message: 'Consumo registrado',
      inventario: { id_centro, id_producto, cantidad_actual: updated.cantidad_actual, producto: { id_producto: updated.producto.id_producto, nombre_producto: updated.producto.nombre_producto, unidad_medida: updated.producto.unidad_medida, stock_minimo_alerta: updated.producto.stock_minimo_alerta } },
      movimiento: { id_movimiento: mov.id_movimiento, cantidad: mov.cantidad, fecha_hora: mov.fecha_hora }
    });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// ----- CONSUMOS (scoping multi-tenant) -----
app.get('/api/v1/consumos', auth, async (req, res) => {
  try {
    const { centro } = req.query;
    const where = {};
    if (centro) {
      if (!(await requireCentroDelCliente(centro, req.user.id_cliente))) {
        return res.status(403).json({ error: 'Sin acceso a este centro' });
      }
      where.id_centro = parseInt(centro);
    } else if (req.user.id_cliente) {
      const centros = await prisma.centro.findMany({ where: { id_cliente: req.user.id_cliente }, select: { id_centro: true } });
      where.id_centro = { in: centros.map(c => c.id_centro) };
    }
    const movs = await prisma.registroMovimiento.findMany({
      where, include: { producto: true, centro: true, usuario: { select: { nombre: true } } },
      orderBy: { fecha_hora: 'desc' }, take: 200
    });
    res.json({ consumos: movs });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/consumos', auth, officeOnly, async (req, res) => {
  try {
    const { id_centro, id_producto, cantidad } = req.body;
    if (!(await requireCentroDelCliente(id_centro, req.user.id_cliente))) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    const inv = await prisma.inventarioCentro.findUnique({ where: { id_centro_id_producto: { id_centro, id_producto } } });
    if (!inv || inv.cantidad_actual < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
    await prisma.inventarioCentro.update({ where: { id_centro_id_producto: { id_centro, id_producto } }, data: { cantidad_actual: inv.cantidad_actual - cantidad } });
    const mov = await prisma.registroMovimiento.create({ data: { id_centro, id_producto, id_usuario: req.user.id_usuario, cantidad: -Math.abs(cantidad) } });
    res.json({ consumo: mov });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// ----- INCIDENCIAS (scoping multi-tenant) -----
app.get('/api/v1/incidencias', auth, async (req, res) => {
  try {
    const where = req.user.id_cliente
      ? { centro: { id_cliente: req.user.id_cliente } }
      : {};
    // Filtro de periodo global (desde/hasta) sobre fecha_creacion
    if (req.query.desde) where.fecha_creacion = { ...(where.fecha_creacion || {}), gte: new Date(String(req.query.desde)) };
    if (req.query.hasta) where.fecha_creacion = { ...(where.fecha_creacion || {}), lt: new Date(String(req.query.hasta) + 'T23:59:59') };
    const incs = await prisma.incidencia.findMany({ where, include: { centro: true, usuario: { select: { nombre: true } } }, orderBy: { fecha_creacion: 'desc' } });
    res.json({ incidencias: incs });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/incidencias', auth, async (req, res) => {
  try {
    const { id_centro } = req.body;
    if (!(await requireCentroDelCliente(id_centro, req.user.id_cliente))) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    // Cualquiera autenticado puede CREAR una incidencia; si es visitante,
    // queda marcada y caduca en 24h (la limpia el cron).
    const esVisita = await esVisitaUsuario(req.user);
    const inc = await prisma.incidencia.create({ data: { id_centro, id_usuario: req.user.id_usuario, categoria: req.body.categoria, titulo: req.body.titulo, descripcion: req.body.descripcion, foto_url: req.body.foto_url, ...(esVisita ? { session_id: req.user.session_id || 'demo', expira_en: new Date(Date.now() + 24 * 3600 * 1000) } : {}) } });
    res.json({ incidencia: inc });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.put('/api/v1/incidencias/:id', auth, officeOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const inc = await prisma.incidencia.findUnique({ where: { id_incidencia: id } });
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada' });
    if (req.user.id_cliente && inc.id_centro && !(await requireCentroDelCliente(inc.id_centro, req.user.id_cliente))) {
      return res.status(403).json({ error: 'Sin acceso a esta incidencia' });
    }
    const updated = await prisma.incidencia.update({ where: { id_incidencia: id }, data: { estado: req.body.estado } });
    res.json({ incidencia: updated });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// ============================
// SAAS — Registro de empresas & Admin
// ============================

// Registro público de nueva empresa (prueba gratis)
app.post('/api/v1/auth/register-empresa', async (req, res) => {
  try {
    const { nombre_empresa, email, password, nombre_responsable, telefono } = req.body;
    if (!nombre_empresa || !email || !password || !nombre_responsable) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Crear cliente + centro + usuario + asignación en una sola transacción
    const { cliente, centro, usuario } = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          nombre_empresa,
          email_contacto: email,
          telefono,
          plan: 'basic',
          estado: 'trial',
          trial_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        }
      });

      const centro = await tx.centro.create({
        data: {
          nombre_centro: 'Centro Principal',
          id_cliente: cliente.id_cliente,
        }
      });

      const hash = await bcrypt.hash(password, 12);
      const usuario = await tx.usuario.create({
        data: {
          nombre: nombre_responsable,
          email,
          password_hash: hash,
          rol: 'supervisor',
          estado: 'activo',
          id_cliente: cliente.id_cliente,
          telefono,
        }
      });

      await tx.asignacionPersonal.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_centro: centro.id_centro,
          fecha_inicio: new Date(),
        }
      });

      return { cliente, centro, usuario };
    });

    // Enviar email de bienvenida
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      });
      
      await transporter.sendMail({
        from: `KAVANA WAREHOUSE <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '✅ Bienvenido a KAVANA WAREHOUSE - Credenciales de acceso',
        html: `
          <h2>¡Bienvenido a KAVANA WAREHOUSE!</h2>
          <p>Tu cuenta está activa con <strong>30 días de prueba gratuita</strong>.</p>
          <h3>Credenciales de acceso</h3>
          <p><strong>URL:</strong> https://warehouse.kavanasystems.com/login</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Contraseña:</strong> ${password}</p>
          <p>Accede ahora y empieza a gestionar tu inventario.</p>
        `
      });
    } catch(err) {
      console.error('Email error:', err.message);
    }

    res.json({
      success: true,
      mensaje: 'Empresa registrada. Revisa tu email para acceder.',
      cliente: {
        id: cliente.id_cliente,
        empresa: cliente.nombre_empresa,
        plan: cliente.plan,
        trial_hasta: cliente.trial_fin,
      }
    });
  } catch(e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'El email ya está registrado' });
    logger.error('api', e); res.status(500).json({ error: 'Error interno' });
  }
});

// --- Admin endpoints (solo super admin) ---
app.get('/api/v1/admin/clientes', auth, superAdminOnly, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        _count: { select: { usuarios: true, centros: true } },
        usuarios: { select: { id_usuario: true, nombre: true, email: true, rol: true, estado: true, is_super_admin: true } }
      },
      orderBy: { fecha_registro: 'desc' }
    });
    res.json({ clientes });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

app.get('/api/v1/admin/clientes/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: parseInt(req.params.id) },
      include: {
        usuarios: { orderBy: { nombre: 'asc' } },
        centros: { include: { _count: { select: { usuarios: true } } } },
      }
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ cliente });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

app.put('/api/v1/admin/clientes/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const { plan, estado, notas } = req.body;
    const data = {};
    if (plan) data.plan = plan;
    if (estado) data.estado = estado;
    if (notas !== undefined) data.notas = notas;
    if (estado === 'activo' && !req.body.fecha_renovacion) {
      data.fecha_renovacion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    const cliente = await prisma.cliente.update({
      where: { id_cliente: parseInt(req.params.id) },
      data,
    });
    res.json({ cliente, mensaje: 'Cliente actualizado' });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

app.get('/api/v1/admin/stats', auth, superAdminOnly, async (req, res) => {
  try {
    const total = await prisma.cliente.count();
    const activos = await prisma.cliente.count({ where: { estado: 'activo' } });
    const trials = await prisma.cliente.count({ where: { estado: 'trial' } });
    const expirados = await prisma.cliente.count({ where: { estado: 'expirado' } });
    const basic = await prisma.cliente.count({ where: { plan: 'basic' } });
    const pro = await prisma.cliente.count({ where: { plan: 'pro' } });
    const ingresos_mensuales = (basic * 9) + (pro * 29);
    res.json({ stats: { total, activos, trials, expirados, basic, pro, ingresos_mensuales } });
  } catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});

// Login ahora también devuelve is_super_admin
// (modificar endpoint existente arriba si hace falta)

// ----- Asistente técnico (RAG sobre la documentación del repo) -----
// Público (sin auth): un reclutador pregunta cómo funciona el proyecto.
// Límite por IP: 25 preguntas/día para no gastar el crédito de OpenRouter.
const assistantLimits = new Map(); // ip -> {count, resetAt}
app.post('/api/v1/assistant', async (req, res) => {
  const question = (req.body?.question || '').trim();
  if (question.length < 4 || question.length > 500) {
    return res.status(400).json({ error: 'La pregunta debe tener entre 4 y 500 caracteres.' });
  }
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const lim = assistantLimits.get(ip);
  if (!lim || now > lim.resetAt) {
    assistantLimits.set(ip, { count: 1, resetAt: now + 24 * 3600 * 1000 });
  } else if (lim.count >= 25) {
    return res.status(429).json({ error: 'Has alcanzado el límite de preguntas de hoy (25). Vuelve mañana.' });
  } else {
    lim.count += 1;
  }
  try {
    const { responderPregunta } = require('./services/assistantService');
    const resultado = await responderPregunta(process.env.OPENROUTER_API_KEY, question);
    return res.json({ success: true, respuesta: resultado.respuesta, fuentes: resultado.fuentes, modelo: resultado.modelo });
  } catch (err) {
    logger.error('Asistente: ' + err.message);
    return res.status(500).json({ error: 'Asistente no configurado o error interno. Inténtalo más tarde.' });
  }
});

// Health check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;