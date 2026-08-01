// =============================================================================
// Kavana CleanOps — Validate Middleware Tests
// Tests for src/middleware/validate.js
// =============================================================================

const httpMocks = require('node-mocks-http');
const {
  validate,
  loginSchema,
  registerSchema,
  refreshSchema,
  consumeStockSchema,
  restockSchema,
  createAsignacionSchema,
  updateAsignacionSchema,
} = require('../middleware/validate');

describe('validate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
  });

  test('should call next and parse body on valid data', () => {
    req.body = { email: 'test@test.com', password: '123456' };
    const middleware = validate(loginSchema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ email: 'test@test.com', password: '123456' });
  });

  test('should return 400 with error details on invalid data', () => {
    req.body = { email: 'not-an-email', password: '' };
    const middleware = validate(loginSchema);

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Datos de entrada inválidos.');
    expect(data.detalles.length).toBeGreaterThan(0);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('loginSchema', () => {
  test('should accept valid login data', () => {
    const result = loginSchema.safeParse({ email: 'user@kavana.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  test('should reject invalid email', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: 'secret' });
    expect(result.success).toBe(false);
  });

  test('should reject empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@kavana.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  test('should accept valid register data', () => {
    const result = registerSchema.safeParse({
      nombre: 'Test User',
      email: 'test@kavana.com',
      password: '123456',
    });
    expect(result.success).toBe(true);
  });

  test('should accept register with optional rol', () => {
    const result = registerSchema.safeParse({
      nombre: 'Test User',
      email: 'test@kavana.com',
      password: '123456',
      rol: 'supervisor',
    });
    expect(result.success).toBe(true);
    expect(result.data.rol).toBe('supervisor');
  });

  test('should reject short password', () => {
    const result = registerSchema.safeParse({
      nombre: 'Test',
      email: 'test@kavana.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('refreshSchema', () => {
  test('should accept valid refresh token', () => {
    const result = refreshSchema.safeParse({ refreshToken: 'abc123def456' });
    expect(result.success).toBe(true);
  });

  test('should reject empty refresh token', () => {
    const result = refreshSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});

describe('consumeStockSchema', () => {
  test('should accept valid consume data', () => {
    const result = consumeStockSchema.safeParse({
      id_producto: 1,
      cantidad: 3,
    });
    expect(result.success).toBe(true);
  });

  test('should accept consume data with optional id_centro', () => {
    const result = consumeStockSchema.safeParse({
      id_producto: 1,
      cantidad: 3,
      id_centro: 2,
    });
    expect(result.success).toBe(true);
    expect(result.data.id_centro).toBe(2);
  });

  test('should reject negative cantidad', () => {
    const result = consumeStockSchema.safeParse({
      id_producto: 1,
      cantidad: -3,
    });
    expect(result.success).toBe(false);
  });

  test('should reject non-integer id_producto', () => {
    const result = consumeStockSchema.safeParse({
      id_producto: 'abc',
      cantidad: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe('restockSchema', () => {
  test('should accept valid restock data', () => {
    const result = restockSchema.safeParse({
      id_producto: 1,
      cantidad: 10,
      id_centro: 1,
    });
    expect(result.success).toBe(true);
  });

  test('should reject negative cantidad for restock', () => {
    const result = restockSchema.safeParse({
      id_producto: 1,
      cantidad: -10,
      id_centro: 1,
    });
    expect(result.success).toBe(false);
  });

  test('should reject missing id_centro', () => {
    const result = restockSchema.safeParse({
      id_producto: 1,
      cantidad: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe('createAsignacionSchema', () => {
  test('should accept valid assignment data', () => {
    const result = createAsignacionSchema.safeParse({
      id_usuario: 1,
      id_centro: 1,
      fecha_inicio: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });

  test('should accept assignment with fecha_fin', () => {
    const result = createAsignacionSchema.safeParse({
      id_usuario: 1,
      id_centro: 1,
      fecha_inicio: '2026-06-01',
      fecha_fin: '2026-07-01',
    });
    expect(result.success).toBe(true);
  });

  test('should reject invalid date format', () => {
    const result = createAsignacionSchema.safeParse({
      id_usuario: 1,
      id_centro: 1,
      fecha_inicio: '01-06-2026',
    });
    expect(result.success).toBe(false);
  });

  test('should reject missing required fields', () => {
    const result = createAsignacionSchema.safeParse({
      id_usuario: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateAsignacionSchema', () => {
  test('should accept update with fecha_inicio only', () => {
    const result = updateAsignacionSchema.safeParse({
      fecha_inicio: '2026-07-01',
    });
    expect(result.success).toBe(true);
  });

  test('should accept update setting fecha_fin to null', () => {
    const result = updateAsignacionSchema.safeParse({
      fecha_fin: null,
    });
    expect(result.success).toBe(true);
  });

  test('should reject empty body (no fields)', () => {
    const result = updateAsignacionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
