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
// Categorias
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

afterAll(async () => {
  await prisma.$disconnect();
});