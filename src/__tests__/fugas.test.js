// =============================================================================
// KAVANA WAREHOUSE API — Pruebas de las fugas de la auditoría del 2026-08-18
// Cada bloque reproduce un fallo que existía y comprueba que ya no ocurre.
// Run: npm test
// =============================================================================
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const sufijo = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emailEmpresa = `fugas-${sufijo}@yagni.com`;
const PASSWORD = 'fugas12345';

let token = '';
let refreshToken = '';
let idCliente = null;
let idCentro = null;
let idProducto = null;

const stockActual = async () => (await prisma.inventarioCentro.findUnique({
  where: { id_centro_id_producto: { id_centro: idCentro, id_producto: idProducto } },
})).cantidad_actual;

beforeAll(async () => {
  const reg = await request(app).post('/api/v1/auth/register-empresa')
    .send({ nombre_empresa: 'Fugas Test SL', email: emailEmpresa, password: PASSWORD, nombre_responsable: 'Fugas' });
  expect(reg.status).toBe(200);
  const login = await request(app).post('/api/v1/auth/login').send({ email: emailEmpresa, password: PASSWORD });
  token = login.body.token;
  refreshToken = login.body.refreshToken;
  idCliente = login.body.usuario.id_cliente;
  idCentro = (await prisma.centro.findFirst({ where: { id_cliente: idCliente } })).id_centro;
  idProducto = (await prisma.producto.create({ data: { nombre_producto: `Lejía fugas ${sufijo}`, coste_unitario: 2 } })).id_producto;
  await prisma.inventarioCentro.create({ data: { id_centro: idCentro, id_producto: idProducto, cantidad_actual: 20 } });
}, 30000);

afterAll(async () => {
  if (idCliente) {
    await prisma.registroMovimiento.deleteMany({ where: { centro: { id_cliente: idCliente } } });
    await prisma.inventarioCentro.deleteMany({ where: { centro: { id_cliente: idCliente } } });
    await prisma.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: idCliente } } });
    await prisma.usuario.deleteMany({ where: { id_cliente: idCliente } });
    await prisma.centro.deleteMany({ where: { id_cliente: idCliente } });
    await prisma.cliente.deleteMany({ where: { id_cliente: idCliente } });
  }
  if (idProducto) await prisma.producto.deleteMany({ where: { id_producto: idProducto } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Fuga 2 · Un consumo negativo inflaba el stock
// ---------------------------------------------------------------------------
describe('POST /consumos: la cantidad tiene que ser un entero positivo', () => {
  const consumir = (cantidad) => request(app).post('/api/v1/consumos')
    .set('Authorization', `Bearer ${token}`)
    .send({ id_centro: idCentro, id_producto: idProducto, cantidad });

  it('rechaza una cantidad negativa y el stock no cambia', async () => {
    const antes = await stockActual();
    const res = await consumir(-50);
    expect(res.status).toBe(400);
    expect(await stockActual()).toBe(antes);
  });

  it('rechaza cantidad 0 y cantidades decimales', async () => {
    expect((await consumir(0)).status).toBe(400);
    expect((await consumir(1.5)).status).toBe(400);
  });

  it('rechaza consumir más de lo que hay, sin tocar el stock', async () => {
    const antes = await stockActual();
    const res = await consumir(antes + 1);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Stock insuficiente');
    expect(await stockActual()).toBe(antes);
  });

  it('un consumo válido resta exactamente esa cantidad y registra el movimiento en negativo', async () => {
    const antes = await stockActual();
    const res = await consumir(3);
    expect(res.status).toBe(200);
    expect(res.body.consumo.cantidad).toBe(-3);
    expect(await stockActual()).toBe(antes - 3);
  });

  it('dos consumos simultáneos no dejan el stock en negativo', async () => {
    const antes = await stockActual();
    const resultados = await Promise.all([consumir(antes), consumir(antes)]);
    const ok = resultados.filter((r) => r.status === 200).length;
    expect(ok).toBe(1);
    expect(await stockActual()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fuga 1 · El dashboard pedía /auth/refresh y el endpoint no existía
// ---------------------------------------------------------------------------
describe('Sesión: refresh token rotativo y logout', () => {
  it('el login devuelve un refresh token', () => {
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBeGreaterThan(20);
  });

  it('el refresh token se guarda hasheado, no en claro', async () => {
    const enClaro = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    expect(enClaro).toBeNull();
  });

  it('refresh devuelve una sesión nueva que sirve para la API', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(refreshToken);
    const dash = await request(app).get('/api/v1/dashboard').set('Authorization', `Bearer ${res.body.token}`);
    expect(dash.status).toBe(200);

    // Rotación: el token viejo ya no sirve
    const reuso = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reuso.status).toBe(401);
    refreshToken = res.body.refreshToken;
  });

  it('logout revoca el refresh token', async () => {
    const out = await request(app).post('/api/v1/auth/logout').send({ refreshToken });
    expect(out.status).toBe(204);
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('un refresh token inventado se rechaza', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'x'.repeat(64) });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Fuga 5 · Los supervisores demo seguían entrando pasadas sus 24 h
// ---------------------------------------------------------------------------
describe('Supervisores caducados', () => {
  const emailSup = `caduca-${sufijo}@demo.local`;
  let idSup = null;

  beforeAll(async () => {
    const sup = await prisma.usuario.create({ data: {
      nombre: 'Sup Caduca', email: emailSup, password_hash: await bcrypt.hash('demo1234', 4),
      rol: 'supervisor', id_cliente: idCliente, expira_en: new Date(Date.now() + 3600 * 1000),
    } });
    idSup = sup.id_usuario;
  });

  it('con la sesión abierta, deja de entrar en cuanto caduca', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: emailSup, password: 'demo1234' });
    expect(login.status).toBe(200);
    await prisma.usuario.update({ where: { id_usuario: idSup }, data: { expira_en: new Date(Date.now() - 1000) } });

    const dash = await request(app).get('/api/v1/dashboard').set('Authorization', `Bearer ${login.body.token}`);
    expect(dash.status).toBe(401);
    const ref = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(ref.status).toBe(401);
  });

  it('un supervisor caducado no puede iniciar sesión', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: emailSup, password: 'demo1234' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Usuario caducado');
  });
});

// ---------------------------------------------------------------------------
// Fuga 3 · Registro público sin validar y con la contraseña en el email
// ---------------------------------------------------------------------------
describe('POST /auth/register-empresa', () => {
  const registrar = (datos) => request(app).post('/api/v1/auth/register-empresa').send({
    nombre_empresa: 'Validación SL', email: `val-${sufijo}@yagni.com`, password: PASSWORD, nombre_responsable: 'Val', ...datos,
  });

  it('rechaza contraseñas de menos de 8 caracteres', async () => {
    const res = await registrar({ password: 'a' });
    expect(res.status).toBe(400);
  });

  it('rechaza un email inválido', async () => {
    const res = await registrar({ email: 'no-es-un-email' });
    expect(res.status).toBe(400);
  });

  it('sin SMTP no promete un email que no se envía', async () => {
    const email = `nosmtp-${sufijo}@yagni.com`;
    const res = await registrar({ email });
    expect(res.status).toBe(200);
    expect(res.body.email_enviado).toBe(false);
    expect(res.body.mensaje).not.toMatch(/revisa tu email/i);
    const cli = await prisma.cliente.findFirst({ where: { email_contacto: email } });
    if (cli) {
      await prisma.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: cli.id_cliente } } });
      await prisma.usuario.deleteMany({ where: { id_cliente: cli.id_cliente } });
      await prisma.centro.deleteMany({ where: { id_cliente: cli.id_cliente } });
      await prisma.cliente.delete({ where: { id_cliente: cli.id_cliente } });
    }
  });

  it('en producción está cerrado salvo REGISTRO_PUBLICO=true', async () => {
    const entorno = process.env.NODE_ENV;
    const registro = process.env.REGISTRO_PUBLICO;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.REGISTRO_PUBLICO;
      const res = await registrar({ email: `prod-${sufijo}@yagni.com` });
      expect(res.status).toBe(403);
    } finally {
      process.env.NODE_ENV = entorno;
      if (registro === undefined) delete process.env.REGISTRO_PUBLICO; else process.env.REGISTRO_PUBLICO = registro;
    }
  });
});

// ---------------------------------------------------------------------------
// Fuga 4 · El login no limitaba los intentos
// ---------------------------------------------------------------------------
describe('Límite de intentos de login', () => {
  it('tras 10 fallos seguidos bloquea esa cuenta desde esa IP, incluso con la contraseña buena', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post('/api/v1/auth/login').send({ email: emailEmpresa, password: 'incorrecta' });
      expect(r.status).toBe(401);
    }
    const bloqueado = await request(app).post('/api/v1/auth/login').send({ email: emailEmpresa, password: PASSWORD });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.headers['retry-after']).toBeTruthy();
  });

  it('el bloqueo de una cuenta no afecta a la cuenta demo', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'warehouse', password: 'kavana' });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// CORS · Un origen no permitido daba 500
// ---------------------------------------------------------------------------
describe('CORS', () => {
  it('un origen no permitido no recibe cabeceras CORS y no provoca un 500', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
