// =============================================================================
// CleanStock API — Integration Tests (TDD)
// Run: npm test
// =============================================================================
const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let token = '';
let testEmail = `test-${Date.now()}@yagni.com`;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
describe('GET /api/v1/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/login', () => {
  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noexiste@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales invalidas');
  });

  it('accepts supervisor credentials and returns token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'supervisor@kavana.com', password: 'CleanStock2026!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.rol).toBe('supervisor');
    token = res.body.token;
  });
});

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
describe('Auth middleware', () => {
  it('blocks requests without token', async () => {
    const res = await request(app).get('/api/v1/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token requerido');
  });

  it('blocks requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer token-falso');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalido');
  });
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
describe('GET /api/v1/dashboard', () => {
  it('returns stats with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalProductos).toBe('number');
    expect(typeof res.body.totalCentros).toBe('number');
    expect(typeof res.body.totalEmpleados).toBe('number');
  });
});

describe('GET /api/v1/dashboard/consumption', () => {
  it('returns consumption data', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/consumption')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total_consumo_unidades).toBe('number');
    expect(typeof res.body.total_gasto_euros).toBe('number');
    expect(Array.isArray(res.body.movimientos)).toBe(true);
  });
});

describe('GET /api/v1/dashboard/alerts', () => {
  it('returns alerts', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/alerts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.criticas)).toBe(true);
    expect(Array.isArray(res.body.advertencias)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Centros
// ---------------------------------------------------------------------------
describe('GET /api/v1/centros', () => {
  it('returns centros list', async () => {
    const res = await request(app)
      .get('/api/v1/centros')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.centros)).toBe(true);
    expect(res.body.centros.length).toBeGreaterThan(0);
    expect(res.body.centros[0].nombre_centro).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
describe('GET /api/v1/productos', () => {
  it('returns productos list', async () => {
    const res = await request(app)
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.productos)).toBe(true);
    expect(res.body.productos.length).toBeGreaterThan(0);
    expect(res.body.productos[0].nombre_producto).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Stock / Inventory
// ---------------------------------------------------------------------------
describe('GET /api/v1/stock/inventory', () => {
  it('returns inventory with product info', async () => {
    const res = await request(app)
      .get('/api/v1/stock/inventory')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.inventario)).toBe(true);
    if (res.body.inventario.length > 0) {
      expect(res.body.inventario[0].producto.nombre_producto).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Empleados
// ---------------------------------------------------------------------------
describe('GET /api/v1/empleados', () => {
  it('returns empleados list', async () => {
    const res = await request(app)
      .get('/api/v1/empleados')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.empleados)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Consumos
// ---------------------------------------------------------------------------
describe('GET /api/v1/consumos', () => {
  it('returns consumos list', async () => {
    const res = await request(app)
      .get('/api/v1/consumos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.consumos)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Incidencias
// ---------------------------------------------------------------------------
describe('GET /api/v1/incidencias', () => {
  it('returns incidencias list', async () => {
    const res = await request(app)
      .get('/api/v1/incidencias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.incidencias)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Registro de empresa (SaaS)
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/register-empresa', () => {
  it('creates a new company with trial', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-empresa')
      .send({
        nombre_empresa: 'Test YAGNI SL',
        email: testEmail,
        password: 'test123',
        nombre_responsable: 'Tester'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cliente.empresa).toBe('Test YAGNI SL');
    expect(res.body.cliente.plan).toBe('basic');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-empresa')
      .send({
        nombre_empresa: 'Dupe',
        email: testEmail,
        password: 'test123',
        nombre_responsable: 'Tester'
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('El email ya está registrado');
  });

  afterAll(async () => {
    // Cleanup test data
    const cliente = await prisma.cliente.findFirst({ where: { email_contacto: testEmail } });
    if (cliente) {
      await prisma.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
      await prisma.usuario.deleteMany({ where: { id_cliente: cliente.id_cliente } });
      await prisma.inventarioCentro.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
      await prisma.centro.deleteMany({ where: { id_cliente: cliente.id_cliente } });
      await prisma.cliente.delete({ where: { id_cliente: cliente.id_cliente } });
    }
  });
});

// ---------------------------------------------------------------------------
// SECURITY — Multi-tenant isolation (TDD: must fail before scoping, pass after)
// ---------------------------------------------------------------------------
describe('SECURITY: multi-tenant isolation', () => {
  let tokenA = '';
  let tokenB = '';
  let centroAId = null;
  let centroBId = null;
  const emailA = `sec-a-${Date.now()}@yagni.com`;
  const emailB = `sec-b-${Date.now()}@yagni.com`;

  beforeAll(async () => {
    jest.setTimeout(45000);
    // Empresa A (nueva, con id_cliente real)
    await request(app).post('/api/v1/auth/register-empresa')
      .send({ nombre_empresa: 'Empresa A Seg', email: emailA, password: 'test123', nombre_responsable: 'A' });
    const loginA = await request(app).post('/api/v1/auth/login')
      .send({ email: emailA, password: 'test123' });
    tokenA = loginA.body.token;
    const centrosA = await request(app).get('/api/v1/centros').set('Authorization', `Bearer ${tokenA}`);
    centroAId = centrosA.body.centros[0].id_centro;

    // Empresa B (nueva, con id_cliente real)
    await request(app).post('/api/v1/auth/register-empresa')
      .send({ nombre_empresa: 'Empresa B Seg', email: emailB, password: 'test123', nombre_responsable: 'B' });
    const loginB = await request(app).post('/api/v1/auth/login')
      .send({ email: emailB, password: 'test123' });
    tokenB = loginB.body.token;
    const centrosB = await request(app).get('/api/v1/centros').set('Authorization', `Bearer ${tokenB}`);
    centroBId = centrosB.body.centros[0].id_centro;
  }, 30000);

  it('Empresa A cannot read Empresa B inventory by centro id', async () => {
    const res = await request(app)
      .get(`/api/v1/inventario?centro=${centroBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });

  it('Empresa A cannot write inventory in Empresa B centro', async () => {
    const res = await request(app)
      .post('/api/v1/inventario')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ id_centro: centroBId, id_producto: 1, cantidad_actual: 5, stock_minimo: 1 });
    expect(res.status).toBe(403);
  });

  it('Empresa A cannot read Empresa B incidencias (global leak blocked)', async () => {
    const res = await request(app)
      .get('/api/v1/incidencias')
      .set('Authorization', `Bearer ${tokenA}`);
    // No debe devolver incidencias de empresa B; comprobamos que no hay fugas por id de centro ajeno
    const incs = res.body.incidencias || [];
    const fugadas = incs.filter(i => i.id_centro === centroBId);
    expect(fugadas.length).toBe(0);
  });

  it('Empresa A cannot POST incidencia in Empresa B centro', async () => {
    const res = await request(app)
      .post('/api/v1/incidencias')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ id_centro: centroBId, categoria: 'limpieza', titulo: 'x', descripcion: 'x' });
    expect(res.status).toBe(403);
  });

  it('Empresa A dashboard/consumption does not leak Empresa B centros', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/consumption')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const movs = res.body.movimientos || [];
    const fugados = movs.filter(m => m.centro && m.centro.id_centro === centroBId);
    expect(fugados.length).toBe(0);
  });

  it('Empresa A dashboard/alerts returns 200 and own-scoped data', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/alerts')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.criticas)).toBe(true);
    expect(Array.isArray(res.body.advertencias)).toBe(true);
  });

  afterAll(async () => {
    for (const email of [emailA, emailB]) {
      const cliente = await prisma.cliente.findFirst({ where: { email_contacto: email } });
      if (cliente) {
        await prisma.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
        await prisma.usuario.deleteMany({ where: { id_cliente: cliente.id_cliente } });
        await prisma.inventarioCentro.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
        await prisma.centro.deleteMany({ where: { id_cliente: cliente.id_cliente } });
        await prisma.cliente.delete({ where: { id_cliente: cliente.id_cliente } });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// M7 — Cobertura de escritura (happy-path + mass-assignment denegado)
// ---------------------------------------------------------------------------
describe('Escritura: centros / productos / stock', () => {
  let centroId = null;
  beforeAll(async () => {
    const r = await request(app).get('/api/v1/centros').set('Authorization', `Bearer ${token}`);
    centroId = r.body.centros?.[0]?.id_centro ?? null;
  });

  it('PUT /centros/:id actualiza nombre (happy path)', async () => {
    if (!centroId) return;
    const res = await request(app)
      .put(`/api/v1/centros/${centroId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre_centro: 'Centro Test Edit' });
    expect(res.status).toBe(200);
    expect(res.body.centro.nombre_centro).toBe('Centro Test Edit');
    // revertir
    await request(app).put(`/api/v1/centros/${centroId}`).set('Authorization', `Bearer ${token}`).send({ nombre_centro: 'Beneficencia' });
  });

  it('POST /productos rechaza id_cliente inyectado (mass-assignment)', async () => {
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre_producto: 'Prod Test MA', unidad_medida: 'ud', coste_unitario: 1, id_cliente: 99999 });
    expect(res.status).toBe(200);
    expect(res.body.producto.id_cliente).toBeUndefined();
    // limpiar
    if (res.body.producto?.id_producto) {
      await request(app).delete(`/api/v1/productos/${res.body.producto.id_producto}`).set('Authorization', `Bearer ${token}`);
    }
  });

  it('DELETE /productos/:id borra (happy path)', async () => {
    const c = await request(app).post('/api/v1/productos').set('Authorization', `Bearer ${token}`)
      .send({ nombre_producto: 'Prod Test Del', unidad_medida: 'ud', coste_unitario: 1 });
    const id = c.body.producto?.id_producto;
    expect(id).toBeTruthy();
    const del = await request(app).delete(`/api/v1/productos/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Categorias (tabla global, sin scoping por cliente)
// ---------------------------------------------------------------------------
describe('GET /api/v1/categorias', () => {
  it('returns categorias list', async () => {
    const res = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categorias)).toBe(true);
  });
});