// ============================
// CleanStock v2 API — Express App
// Exportable: Docker (listen) + Vercel (serverless-http)
// ============================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const logger = require('./lib/logger');

const app = express();
app.set('trust proxy', true);
// CORS: whitelist de orígenes (evita reflejar cualquier dominio con credentials)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4001,http://localhost:4000')
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
const JWT_SECRET = jwtSecretRaw || 'cleanstock-jwt-secret-dev';

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
    };
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado. Inicie sesión nuevamente.' });
    res.status(401).json({ error: 'Token invalido' });
  }
};
const supervisorOnly = (req, res, next) => {
  if (req.user.rol !== 'supervisor') return res.status(403).json({ error: 'Solo supervisor' });
  next();
};
const superAdminOnly = (req, res, next) => {
  if (!req.user.is_super_admin) return res.status(403).json({ error: 'Solo administrador del sistema' });
  next();
};

// ----- AUTH -----
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Buscar por email o username
    const u = email.includes('@')
      ? await prisma.usuario.findUnique({ where: { email } })
      : await prisma.usuario.findFirst({ where: { username: email } });
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Credenciales invalidas' });
    const token = jwt.sign({ id_usuario: u.id_usuario, email: u.email, rol: u.rol, is_super_admin: u.is_super_admin, id_cliente: u.id_cliente }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
    res.json({ token, usuario: { id_usuario: u.id_usuario, nombre: u.nombre, email: u.email, username: u.username, rol: u.rol, is_super_admin: u.is_super_admin } });
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
    const bs = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM inventario_centros ic JOIN centros c ON ic.id_centro = c.id_centro WHERE ic.cantidad_actual <= ic.stock_minimo AND ic.stock_minimo > 0 ${idCliente ? `AND c.id_cliente = ${Number(idCliente)}` : ''}`);
    const ch = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM registro_movimientos rm JOIN centros c ON rm.id_centro = c.id_centro WHERE rm.fecha_hora >= CURRENT_DATE ${idCliente ? `AND c.id_cliente = ${Number(idCliente)}` : ''}`);
    res.json({ totalProductos: tp, totalCentros: tc, totalEmpleados: te, bajoStock: parseInt(bs[0]?.c||0), consumosHoy: parseInt(ch[0]?.c||0), topConsumos: [] });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Dashboard — Consumption data (frontend)
app.get('/api/v1/dashboard/consumption', auth, async (req, res) => {
  try {
    const idCliente = req.user.id_cliente;
    const filtro = idCliente ? ` AND c.id_cliente = ${Number(idCliente)}` : '';
    const movs = await prisma.$queryRawUnsafe(`
      SELECT rm.*, p.nombre_producto, p.unidad_medida, p.coste_unitario,
             c.nombre_centro, u.nombre as usuario_nombre
      FROM registro_movimientos rm
      JOIN productos p ON rm.id_producto = p.id_producto
      JOIN centros c ON rm.id_centro = c.id_centro
      JOIN usuarios u ON rm.id_usuario = u.id_usuario
      WHERE rm.cantidad < 0${filtro}
      ORDER BY rm.fecha_hora DESC LIMIT 50
    `);
    const total = movs.reduce((s, m) => s + Math.abs(Number(m.cantidad)), 0);
    const totalEuro = movs.reduce((s, m) => s + (Math.abs(Number(m.cantidad)) * Number(m.coste_unitario || 0)), 0);
    res.json({
      total_consumo_unidades: total,
      total_gasto_euros: Math.round(totalEuro * 100) / 100,
      total_movimientos: movs.length,
      resumen_por_centro: [],
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
    const filtro = idCliente ? ` AND c.id_cliente = ${Number(idCliente)}` : '';
    const criticas = await prisma.$queryRawUnsafe(`
      SELECT ic.*, p.nombre_producto, c.nombre_centro
      FROM inventario_centros ic
      JOIN productos p ON ic.id_producto = p.id_producto
      JOIN centros c ON ic.id_centro = c.id_centro
      WHERE ic.cantidad_actual <= 0${filtro}
      ORDER BY c.nombre_centro
    `);
    const advertencias = await prisma.$queryRawUnsafe(`
      SELECT ic.*, p.nombre_producto, c.nombre_centro
      FROM inventario_centros ic
      JOIN productos p ON ic.id_producto = p.id_producto
      JOIN centros c ON ic.id_centro = c.id_centro
      WHERE ic.cantidad_actual > 0 AND ic.cantidad_actual <= ic.stock_minimo AND ic.stock_minimo > 0${filtro}
      ORDER BY c.nombre_centro
    `);
    res.json({
      criticas: criticas.map(c => ({ id: c.id_centro + '-' + c.id_producto, centro: c.nombre_centro, producto: c.nombre_producto, cantidad_actual: c.cantidad_actual })),
      advertencias: advertencias.map(a => ({ id: a.id_centro + '-' + a.id_producto, centro: a.nombre_centro, producto: a.nombre_producto, cantidad_actual: a.cantidad_actual }))
    });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});

// Dashboard — Desviaciones (mermas de inventario: registrado vs físico)
const deviationController = require('./controllers/deviationController');
app.get('/api/v1/dashboard/deviations', auth, deviationController.getDeviations);
app.post('/api/v1/inventario/:id_centro/:id_producto/conteo', auth, deviationController.guardarConteo);

// Propuesta de compras (reabastecimiento por stock mínimo)
const purchaseController = require('./controllers/purchaseController');
app.get('/api/v1/purchases/proposal', auth, purchaseController.getProposal);

// Costes por centro (Fase 2: control de coste vs presupuesto)
const costeController = require('./controllers/costeController');
app.get('/api/v1/dashboard/costes', auth, costeController.getCostes);
app.post('/api/v1/centros/:id_centro/presupuesto', auth, costeController.setPresupuesto);

// Reset de datos de demostración (solo borra clientes marcados es_demo)
app.post('/api/v1/demo/reset', auth, async (req, res) => {
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
    const cats = await prisma.$queryRawUnsafe(`SELECT id_categoria, nombre, icono, descripcion FROM categorias ORDER BY nombre`);
    res.json({ categorias: cats }); 
  }
  catch(e) { logger.error('api', e); res.status(500).json({ error: 'Error interno' }); }
});
app.post('/api/v1/categorias', auth, supervisorOnly, async (req, res) => {
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
app.post('/api/v1/productos', auth, supervisorOnly, async (req, res) => {
  try {
    const p = await prisma.producto.create({
      data: {
        nombre_producto: req.body.nombre_producto,
        unidad_medida: req.body.unidad_medida || 'unidades',
        coste_unitario: Number(req.body.coste_unitario) || 0,
        stock_minimo_alerta: Number(req.body.stock_minimo_alerta) || 5,
        id_categoria: req.body.id_categoria ? Number(req.body.id_categoria) : null
      }
    });
    res.json({ producto: p });
  }
  catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.put('/api/v1/productos/:id', auth, supervisorOnly, async (req, res) => {
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
app.delete('/api/v1/productos/:id', auth, supervisorOnly, async (req, res) => {
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
app.post('/api/v1/centros', auth, supervisorOnly, async (req, res) => {
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
app.put('/api/v1/centros/:id', auth, supervisorOnly, async (req, res) => {
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
app.post('/api/v1/empleados', auth, supervisorOnly, async (req, res) => {
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
    const asignacion = await prisma.asignacionPersonal.findFirst({
      where: {
        id_usuario: req.user.id_usuario,
        fecha_inicio: { lte: now },
        OR: [{ fecha_fin: null }, { fecha_fin: { gte: now } }]
      },
      include: { centro: true }
    });
    if (!asignacion) return res.status(404).json({ error: 'No tienes un centro asignado' });
    res.json({ asignacion: { centro: asignacion.centro } });
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
app.post('/api/v1/inventario', auth, supervisorOnly, async (req, res) => {
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
app.post('/api/v1/inventario/reponer', auth, supervisorOnly, async (req, res) => {
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
app.post('/api/v1/stock/consume', auth, async (req, res) => {
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
app.post('/api/v1/consumos', auth, async (req, res) => {
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
    const inc = await prisma.incidencia.create({ data: { id_centro, id_usuario: req.user.id_usuario, categoria: req.body.categoria, titulo: req.body.titulo, descripcion: req.body.descripcion, foto_url: req.body.foto_url } });
    res.json({ incidencia: inc });
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
});
app.put('/api/v1/incidencias/:id', auth, supervisorOnly, async (req, res) => {
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
        from: `CleanStock <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '✅ Bienvenido a CleanStock - Credenciales de acceso',
        html: `
          <h2>¡Bienvenido a CleanStock!</h2>
          <p>Tu cuenta está activa con <strong>30 días de prueba gratuita</strong>.</p>
          <h3>Credenciales de acceso</h3>
          <p><strong>URL:</strong> https://cleanstock.kavanasystems.com/login</p>
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

// Health check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;