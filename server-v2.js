// ============================
// CleanStock v2 API
// ============================
require('dotenv').config({ path: '/root/clean_ops/.env' });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
const prisma = new PrismaClient();
const JWT_SECRET=process.env.JWT_SECRET || 'cleanstock-jwt-secret';

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

// ----- AUTH -----
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await prisma.usuario.findUnique({ where: { email } });
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Credenciales invalidas' });
    const token = jwt.sign({ id_usuario: u.id_usuario, email, rol: u.rol }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, usuario: { id_usuario: u.id_usuario, nombre: u.nombre, email: u.email, rol: u.rol } });
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
    const centros = await prisma.centro.findMany({ orderBy: { nombre: 'asc' }, include: { _count: { select: { usuarios: true, inventario_centros: true } } } });
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
    const emps = await prisma.usuario.findMany({ where: { rol: 'limpiador' }, include: { centro: true }, orderBy: { nombre: 'asc' } });
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('CleanStock v2 API ready'));
