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

const app = express();
app.set('trust proxy', true);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'cleanstock-jwt-secret';

// ----- Auth middleware -----
const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalido' }); }
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
    const token = jwt.sign({ id_usuario: u.id_usuario, email: u.email, rol: u.rol, is_super_admin: u.is_super_admin }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, usuario: { id_usuario: u.id_usuario, nombre: u.nombre, email: u.email, username: u.username, rol: u.rol, is_super_admin: u.is_super_admin } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- DASHBOARD -----
app.get('/api/v1/dashboard', auth, async (req, res) => {
  try {
    const tp = await prisma.producto.count();
    const tc = await prisma.centro.count();
    const te = await prisma.usuario.count({ where: { rol: 'limpiador' } });
    const bs = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM inventario_centros WHERE cantidad_actual <= stock_minimo AND stock_minimo > 0`);
    const ch = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM registro_movimientos WHERE fecha_hora >= CURRENT_DATE`);
    res.json({ totalProductos: tp, totalCentros: tc, totalEmpleados: te, bajoStock: parseInt(bs[0]?.c||0), consumosHoy: parseInt(ch[0]?.c||0), topConsumos: [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- CATEGORIAS -----
app.get('/api/v1/categorias', auth, async (req, res) => {
  try { 
    const cats = await prisma.$queryRawUnsafe(`SELECT id_categoria, nombre, icono, descripcion FROM categorias ORDER BY nombre`);
    res.json({ categorias: cats }); 
  }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/categorias', auth, supervisorOnly, async (req, res) => {
  try { const c = await prisma.categoria.create({ data: req.body }); res.json({ categoria: c }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- PRODUCTOS -----
app.get('/api/v1/productos', auth, async (req, res) => {
  try {
    const { search, categoria } = req.query;
    const where = {};
    if (search) where.nombre = { contains: search, mode: 'insensitive' };
    if (categoria) where.id_categoria = parseInt(categoria);
    const prods = await prisma.producto.findMany({ where, include: { categoria: true }, orderBy: { nombre: 'asc' } });
    res.json({ productos: prods });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/productos', auth, supervisorOnly, async (req, res) => {
  try { const p = await prisma.producto.create({ data: req.body }); res.json({ producto: p }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- CENTROS -----
app.get('/api/v1/centros', auth, async (req, res) => {
  try {
    const centros = await prisma.centro.findMany({ orderBy: { nombre_centro: 'asc' }, include: { _count: { select: { asignaciones: true, inventarioCentros: true } } } });
    res.json({ centros });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/centros', auth, supervisorOnly, async (req, res) => {
  try { const c = await prisma.centro.create({ data: req.body }); res.json({ centro: c }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- EMPLEADOS -----
app.get('/api/v1/empleados', auth, supervisorOnly, async (req, res) => {
  try {
    const emps = await prisma.usuario.findMany({ where: { rol: 'limpiador' }, include: { asignaciones: { include: { centro: true }, where: { fecha_fin: null } } }, orderBy: { nombre: 'asc' } });
    res.json({ empleados: emps });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/empleados', auth, supervisorOnly, async (req, res) => {
  try {
    const { nombre, email, password, numero_empleado, id_centro } = req.body;
    const hash = await bcrypt.hash(password || 'cleanstock', 12);
    const u = await prisma.usuario.create({ data: { nombre, email, password_hash: hash, numero_empleado, id_centro, rol: 'limpiador' } });
    res.json({ empleado: u });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- INVENTARIO -----
app.get('/api/v1/inventario', auth, async (req, res) => {
  try {
    const { centro, search } = req.query;
    const where = {};
    if (centro) where.id_centro = parseInt(centro);
    const items = await prisma.inventarioCentro.findMany({ where, include: { producto: { include: { categoria: true } }, centro: true } });
    let result = items;
    if (search) result = items.filter(i => i.producto.nombre.toLowerCase().includes(search.toLowerCase()));
    res.json({ inventario: result });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/inventario', auth, supervisorOnly, async (req, res) => {
  try {
    const { id_centro, id_producto, cantidad_actual, stock_minimo } = req.body;
    const item = await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro, id_producto } },
      update: { cantidad_actual, stock_minimo, fecha_actualizacion: new Date() },
      create: { id_centro, id_producto, cantidad_actual, stock_minimo }
    });
    res.json({ inventario: item });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/inventario/reponer', auth, supervisorOnly, async (req, res) => {
  try {
    const { id_centro, id_producto, cantidad } = req.body;
    const inv = await prisma.inventarioCentro.findUnique({ where: { id_centro_id_producto: { id_centro, id_producto } } });
    const nueva = (inv?.cantidad_actual || 0) + cantidad;
    await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro, id_producto } },
      update: { cantidad_actual: nueva, fecha_actualizacion: new Date() },
      create: { id_centro, id_producto, cantidad_actual: cantidad }
    });
    res.json({ message: 'Repuesto' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- CONSUMOS -----
app.get('/api/v1/consumos', auth, async (req, res) => {
  try {
    const { centro } = req.query;
    const where = {};
    if (centro) where.id_centro = parseInt(centro);
    const movs = await prisma.registroMovimiento.findMany({
      where, include: { producto: true, centro: true, usuario: { select: { nombre: true } } },
      orderBy: { fecha_hora: 'desc' }, take: 200
    });
    res.json({ consumos: movs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/consumos', auth, async (req, res) => {
  try {
    const { id_centro, id_producto, cantidad } = req.body;
    const inv = await prisma.inventarioCentro.findUnique({ where: { id_centro_id_producto: { id_centro, id_producto } } });
    if (!inv || inv.cantidad_actual < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
    await prisma.inventarioCentro.update({ where: { id_centro_id_producto: { id_centro, id_producto } }, data: { cantidad_actual: inv.cantidad_actual - cantidad } });
    const mov = await prisma.registroMovimiento.create({ data: { id_centro, id_producto, id_usuario: req.user.id_usuario, cantidad: -Math.abs(cantidad) } });
    res.json({ consumo: mov });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ----- INCIDENCIAS -----
app.get('/api/v1/incidencias', auth, async (req, res) => {
  try {
    const incs = await prisma.incidencia.findMany({ include: { centro: true, usuario: { select: { nombre: true } } }, orderBy: { fecha_creacion: 'desc' } });
    res.json({ incidencias: incs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/v1/incidencias', auth, async (req, res) => {
  try { const inc = await prisma.incidencia.create({ data: { ...req.body, id_usuario: req.user.id_usuario } }); res.json({ incidencia: inc }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/v1/incidencias/:id', auth, supervisorOnly, async (req, res) => {
  try { const inc = await prisma.incidencia.update({ where: { id_incidencia: parseInt(req.params.id) }, data: { estado: req.body.estado } }); res.json({ incidencia: inc }); }
  catch(e) { res.status(500).json({ error: e.message }); }
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

    // Crear cliente
    const cliente = await prisma.cliente.create({
      data: {
        nombre_empresa,
        email_contacto: email,
        telefono,
        plan: 'basic',
        estado: 'trial',
        trial_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      }
    });

    // Crear centro por defecto
    const centro = await prisma.centro.create({
      data: {
        nombre_centro: 'Centro Principal',
        id_cliente: cliente.id_cliente,
      }
    });

    // Crear usuario admin del cliente
    const hash = await bcrypt.hash(password, 12);
    const usuario = await prisma.usuario.create({
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

    // Asignar al centro por defecto
    await prisma.asignacionPersonal.create({
      data: {
        id_usuario: usuario.id_usuario,
        id_centro: centro.id_centro,
        fecha_inicio: new Date(),
      }
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
    res.status(500).json({ error: e.message });
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
  } catch(e) { res.status(500).json({ error: e.message }); }
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
  } catch(e) { res.status(500).json({ error: e.message }); }
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
  } catch(e) { res.status(500).json({ error: e.message }); }
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
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Login ahora también devuelve is_super_admin
// (modificar endpoint existente arriba si hace falta)

// Health check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;