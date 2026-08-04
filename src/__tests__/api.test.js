// =============================================================================
// KAVANA WAREHOUSE API — Integration Tests (TDD)
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
      .send({ email: 'warehouse', password: 'kavana' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.rol).toBe('oficina');
    token = res.body.token;
  });

  it('accepts username with uppercase (autocapitalización móvil)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'Warehouse', password: 'kavana' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('trims trailing space from password (autocomplete del teclado móvil)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warehouse', password: 'kavana ' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
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

  it('returns evolucion_mensual con agrupación por mes (trayectoria histórica)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/consumption')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.evolucion_mensual)).toBe(true);
    // Cada punto: mes (YYYY-MM), unidades consumidas y gasto
    if (res.body.evolucion_mensual.length > 0) {
      const primer = res.body.evolucion_mensual[0];
      expect(typeof primer.mes).toBe('string');
      expect(primer.mes).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof primer.unidades).toBe('number');
      expect(typeof primer.gasto_euros).toBe('number');
    }
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

describe('GET /api/v1/asignaciones/users', () => {
  it('returns responsables list (lo usa la página Responsables)', async () => {
    const res = await request(app)
      .get('/api/v1/asignaciones/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.usuarios)).toBe(true);
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

// ---------------------------------------------------------------------------
// Supervisores demo (sesión de reclutador, expiran a las 24h)
// ---------------------------------------------------------------------------
describe('Supervisores demo con expiración', () => {
  const sessionId = `test-session-${Date.now()}`;
  const emailSup = `sup-demo-${Date.now()}@demo.local`;

  it('POST /api/v1/supervisores crea supervisor demo con expiración 24h', async () => {
    const res = await request(app)
      .post('/api/v1/supervisores')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Sup Demo', email: emailSup, password: 'demo1234', session_id: sessionId });
    expect(res.status).toBe(201);
    expect(res.body.supervisor.rol).toBe('supervisor');
    expect(res.body.supervisor.session_id).toBe(sessionId);
    expect(res.body.supervisor.expira_en).toBeTruthy();
  });

  it('GET /api/v1/supervisores?session_id filtra por sesión', async () => {
    const res = await request(app)
      .get(`/api/v1/supervisores?session_id=${sessionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.supervisores)).toBe(true);
    const sup = res.body.supervisores.find((s) => s.email === emailSup);
    expect(sup).toBeTruthy();
    expect(sup.rol).toBe('supervisor');
  });

  it('el supervisor demo puede loguearse', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: emailSup, password: 'demo1234' });
    expect(res.status).toBe(200);
    expect(res.body.usuario.rol).toBe('supervisor');
  });
});

// ---------------------------------------------------------------------------
// Costes por centro (basados en movimientos reales, no en conteo físico)
// ---------------------------------------------------------------------------
describe('GET /api/v1/dashboard/costes', () => {
  it('returns costes with estado por centro', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/costes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.centros)).toBe(true);
    if (res.body.centros.length > 0) {
      const c = res.body.centros[0];
      expect(typeof c.coste_material).toBe('number');
      expect(typeof c.presupuesto_mensual).toBe('number');
      expect(typeof c.porcentaje_usado).toBe('number');
    }
  });

  it('el coste por centro viene de movimientos reales, no del conteo físico', async () => {
    // Inserta un movimiento de consumo de HOY para que el mes en curso tenga
    // datos (en CI la BD es fresca y no hay histórico de meses previos).
    const centro = await prisma.centro.findFirst({
      where: { id_cliente: (await prisma.usuario.findUnique({ where: { username: 'warehouse' } })).id_cliente },
    });
    const producto = await prisma.producto.findFirst();
    const usuario = await prisma.usuario.findUnique({ where: { username: 'warehouse' } });
    if (centro && producto && usuario) {
      await prisma.registroMovimiento.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_centro: centro.id_centro,
          id_producto: producto.id_producto,
          cantidad: -10,
          tipo: 'movimiento',
          fecha_hora: new Date(),
        },
      });
    }

    const res = await request(app)
      .get('/api/v1/dashboard/costes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // El centro con el movimiento de hoy debe tener coste > 0
    const conMovimientos = res.body.centros.filter((c) => c.coste_material > 0);
    expect(conMovimientos.length).toBeGreaterThan(0);
    // Y ningún centro debe superar el 2000% (cifra desmesurada del bug)
    for (const c of res.body.centros) {
      if (c.porcentaje_usado !== null) {
        expect(c.porcentaje_usado).toBeLessThan(2000);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Flujo completo: conteo físico → desviación (mermas) → propuesta de compra
// Modelo real: la desviación es la diferencia entre el stock REGISTRADO
// (cantidad_actual) y el último conteo físico (stock_fisico). El seed lo fija
// así (Plaza de Toros: registrado 50, físico 30 → faltan 20). Aquí se replica
// con datos propios: registrado 10, físico 7 → faltan 3 (desviación > 0).
// ---------------------------------------------------------------------------
describe('Flujo conteo → desviación → propuesta de compra', () => {
  let fToken = '';
  let fCentroId = null;
  let fProductoId = null;
  const fEmail = `flujo-${Date.now()}@yagni.com`;

  beforeAll(async () => {
    jest.setTimeout(45000);
    // Empresa de prueba con su centro
    await request(app).post('/api/v1/auth/register-empresa')
      .send({ nombre_empresa: 'Flujo Test SL', email: fEmail, password: 'test123', nombre_responsable: 'F' });
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: fEmail, password: 'test123' });
    fToken = login.body.token;
    const centros = await request(app).get('/api/v1/centros').set('Authorization', `Bearer ${fToken}`);
    fCentroId = centros.body.centros[0].id_centro;

    // Producto (coste 2€) con inventario: registrado 10, físico 7, mínimo 15
    const prod = await request(app).post('/api/v1/productos')
      .set('Authorization', `Bearer ${fToken}`)
      .send({ nombre_producto: 'Bayeta Flujo Test', unidad_medida: 'ud', coste_unitario: 2 });
    fProductoId = prod.body.producto.id_producto;

    // Inventario directo (como hace el seed): cantidad_actual=10, stock_fisico=7,
    // stock_minimo=15 → desviación de 3 (falta) y déficit de 5 (propuesta de compra)
    await prisma.inventarioCentro.create({
      data: {
        id_centro: fCentroId,
        id_producto: fProductoId,
        cantidad_actual: 10,
        stock_fisico: 7,
        stock_minimo: 15,
      },
    });
  }, 30000);

  it('la desviación aparece como "falta" en el dashboard de mermas', async () => {
    // Inventario inicial: registrado 10 vs físico 7 → desviación +3 (falta de material)
    const dev = await request(app)
      .get(`/api/v1/dashboard/deviations?centro=${fCentroId}`)
      .set('Authorization', `Bearer ${fToken}`);
    expect(dev.status).toBe(200);
    const falta = (dev.body.desviaciones || []).find((d) => d.producto.id_producto === fProductoId);
    expect(falta).toBeTruthy();
    expect(falta.estado).toBe('falta');
    expect(falta.desviacion).toBeGreaterThan(0);
    expect(falta.coste_desviacion).toBeGreaterThan(0);
  });

  it('GET purchases/proposal incluye el producto bajo mínimo', async () => {
    // stock_actual 10 < stock_minimo 15 → déficit 5 → propuesta de compra
    const res = await request(app)
      .get(`/api/v1/purchases/proposal?centro=${fCentroId}`)
      .set('Authorization', `Bearer ${fToken}`);
    expect(res.status).toBe(200);
    const prop = (res.body.propuestas || []).find((p) => p.producto.id_producto === fProductoId);
    expect(prop).toBeTruthy();
    expect(prop.deficit).toBeGreaterThan(0);
    expect(prop.cantidad_pedido).toBeGreaterThan(0);
    expect(prop.coste_estimado).toBeGreaterThan(0);
  });

  it('POST conteo físico registra el recuento y sincroniza el stock físico', async () => {
    // La encargada cuenta y deja el stock físico en 7 (conteo real)
    const conteo = await request(app)
      .post(`/api/v1/inventario/${fCentroId}/${fProductoId}/conteo`)
      .set('Authorization', `Bearer ${fToken}`)
      .send({ stock_fisico: 7 });
    expect(conteo.status).toBe(200);
    expect(conteo.body.ok).toBe(true);

    // El conteo deja un movimiento tipo 'recuento' en el histórico
    const movs = await prisma.registroMovimiento.findMany({
      where: { id_centro: fCentroId, id_producto: fProductoId, tipo: 'recuento' },
    });
    expect(movs.length).toBeGreaterThan(0);
    expect(movs[0].cantidad).toBe(7);

    // Tras el conteo, stock_fisico y cantidad_actual quedan sincronizados
    const inv = await prisma.inventarioCentro.findUnique({
      where: { id_centro_id_producto: { id_centro: fCentroId, id_producto: fProductoId } },
    });
    expect(inv.stock_fisico).toBe(7);
    expect(inv.cantidad_actual).toBe(7);
  });

  afterAll(async () => {
    const cliente = await prisma.cliente.findFirst({ where: { email_contacto: fEmail } });
    if (cliente) {
      await prisma.registroMovimiento.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
      await prisma.inventarioCentro.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
      await prisma.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: cliente.id_cliente } } });
      await prisma.usuario.deleteMany({ where: { id_cliente: cliente.id_cliente } });
      await prisma.centro.deleteMany({ where: { id_cliente: cliente.id_cliente } });
      await prisma.cliente.delete({ where: { id_cliente: cliente.id_cliente } });
    }
    // Producto global de prueba (tabla global sin id_cliente)
    if (fProductoId) {
      await prisma.producto.deleteMany({ where: { id_producto: fProductoId } });
    }
  });
});
// ---------------------------------------------------------------------------
// Blindaje demo: un supervisor de visita (24h) NO gestiona datos globales
// ---------------------------------------------------------------------------
describe('Blindaje: supervisor demo no gestiona datos globales', () => {
  let supToken = '';

  beforeAll(async () => {
    const emailSup = `sup-blink-${Date.now()}@demo.local`;
    await request(app)
      .post('/api/v1/supervisores')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Sup Blindaje', email: emailSup, password: 'demo1234', session_id: `blink-${Date.now()}` });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: emailSup, password: 'demo1234' });
    supToken = login.body.token;
    expect(supToken).toBeTruthy();
  });

  it('403 al borrar un producto', async () => {
    const res = await request(app)
      .delete('/api/v1/productos/1')
      .set('Authorization', `Bearer ${supToken}`);
    expect(res.status).toBe(403);
  });

  it('403 al crear un producto', async () => {
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${supToken}`)
      .send({ nombre: 'Producto X', unidad_medida: 'unidad' });
    expect(res.status).toBe(403);
  });

  it('403 al resetear la demo', async () => {
    const res = await request(app)
      .post('/api/v1/demo/reset')
      .set('Authorization', `Bearer ${supToken}`);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Filtro de periodo en /dashboard/consumption (desde/hasta)
// ---------------------------------------------------------------------------
describe('GET /api/v1/dashboard/consumption?desde=&hasta=', () => {
  it('con rango futuro devuelve 0 movimientos (el filtro aplica de verdad)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/consumption?desde=2099-01-01&hasta=2099-12-31')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total_consumo_unidades).toBe(0);
    expect(res.body.total_movimientos).toBe(0);
    expect(res.body.evolucion_mensual.length).toBe(0);
  });

  it('sin filtro devuelve el histórico completo (compatibilidad)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/consumption')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.evolucion_mensual)).toBe(true);
    expect(res.body.evolucion_mensual.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Filtro de periodo en /api/v1/incidencias (desde/hasta)
// ---------------------------------------------------------------------------
describe('GET /api/v1/incidencias?desde=&hasta=', () => {
  it('con rango futuro devuelve 0 incidencias', async () => {
    const res = await request(app)
      .get('/api/v1/incidencias?desde=2099-01-01&hasta=2099-12-31')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.incidencias.length).toBe(0);
  });

  it('sin filtro devuelve la lista completa (compatibilidad)', async () => {
    const res = await request(app)
      .get('/api/v1/incidencias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.incidencias)).toBe(true);
  });
});
