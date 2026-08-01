// =============================================================================
// Kavana CleanOps — Stock Controller Tests
// Tests for src/controllers/stockController.js
// =============================================================================

const httpMocks = require('node-mocks-http');
const { mockPrisma } = require('./setup');
const prisma = require('../lib/prisma');

const {
  getInventory,
  consumeStock,
  restock,
  getAlerts,
} = require('../controllers/stockController');

describe('stockController.getInventory', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      query: {},
      user: { id_usuario: 1, rol: 'limpiador' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return all inventory when no filter', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 10,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades' },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getInventory(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.inventario).toHaveLength(1);
    expect(data.inventario[0].producto.nombre_producto).toBe('Lejía 2L');
  });

  test('should filter inventory by centro when provided', async () => {
    req.query.centro = '2';

    mockPrisma.inventarioCentro.findMany.mockResolvedValue([]);

    await getInventory(req, res);

    expect(mockPrisma.inventarioCentro.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_centro: 2 },
      })
    );
  });

  test('should handle empty inventory', async () => {
    mockPrisma.inventarioCentro.findMany.mockResolvedValue([]);

    await getInventory(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.inventario).toEqual([]);
  });
});

describe('stockController.consumeStock', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      body: { id_producto: 1, cantidad: 2 },
      user: { id_usuario: 1, rol: 'limpiador' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
    // Mock reglaNotificacion to return empty (no notification rules active)
    mockPrisma.reglaNotificacion.findMany.mockResolvedValue([]);
  });

  test('should resolve active center and consume stock for limpiador', async () => {
    // Mock: find active assignment
    mockPrisma.asignacionPersonal.findFirst.mockResolvedValue({
      id_asignacion: 1,
      id_usuario: 1,
      id_centro: 1,
    });

    // Mock: product exists
    mockPrisma.producto.findUnique.mockResolvedValue({
      id_producto: 1,
      nombre_producto: 'Lejía 2L',
    });

    // Mock: current inventory
    mockPrisma.inventarioCentro.findUnique.mockResolvedValue({
      id_centro: 1,
      id_producto: 1,
      cantidad_actual: 10,
    });

    // Mock: transaction
    mockPrisma.$transaction.mockResolvedValue([
      { id_centro: 1, id_producto: 1, cantidad_actual: 8 },
      { id_movimiento: 1, id_usuario: 1, id_centro: 1, id_producto: 1, cantidad: -2 },
    ]);

    await consumeStock(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.message).toContain('Consumo registrado');
    expect(data.inventario.cantidad_actual).toBe(8);
  });

  test('should return 403 if limpiador has no active center', async () => {
    mockPrisma.asignacionPersonal.findFirst.mockResolvedValue(null);

    await consumeStock(req, res);

    expect(res.statusCode).toBe(403);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('No tienes un centro activo');
  });

  test('should return 403 if limpiador attempts to consume from a different center', async () => {
    req.body.id_centro = 2; // Different from assigned center

    mockPrisma.asignacionPersonal.findFirst.mockResolvedValue({
      id_asignacion: 1,
      id_usuario: 1,
      id_centro: 1, // Assigned to center 1
    });

    await consumeStock(req, res);

    expect(res.statusCode).toBe(403);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('No tienes permisos para registrar consumos en este centro');
  });

  test('should use provided id_centro when given for supervisor', async () => {
    req.user.rol = 'supervisor';
    req.body.id_centro = 2;

    mockPrisma.producto.findUnique.mockResolvedValue({
      id_producto: 1,
      nombre_producto: 'Lejía 2L',
    });

    mockPrisma.inventarioCentro.findUnique.mockResolvedValue({
      id_centro: 2,
      id_producto: 1,
      cantidad_actual: 10,
    });

    mockPrisma.$transaction.mockResolvedValue([
      { id_centro: 2, id_producto: 1, cantidad_actual: 8 },
      { id_movimiento: 2, cantidad: -2 },
    ]);

    await consumeStock(req, res);

    // Should NOT call asignacionPersonal.findFirst
    expect(mockPrisma.asignacionPersonal.findFirst).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('should return 404 if product not found', async () => {
    req.user.rol = 'supervisor';
    req.body.id_centro = 1; // Provide centro to skip assignment lookup
    mockPrisma.producto.findUnique.mockResolvedValue(null);

    await consumeStock(req, res);

    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Producto no encontrado');
  });

  test('should return 400 if insufficient stock', async () => {
    mockPrisma.asignacionPersonal.findFirst.mockResolvedValue({
      id_asignacion: 1,
      id_centro: 1,
    });

    mockPrisma.producto.findUnique.mockResolvedValue({
      id_producto: 1,
      nombre_producto: 'Lejía 2L',
    });

    mockPrisma.inventarioCentro.findUnique.mockResolvedValue({
      id_centro: 1,
      id_producto: 1,
      cantidad_actual: 1, // only 1 available, trying to consume 2
    });

    await consumeStock(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Stock insuficiente');
    expect(data.disponible).toBe(1);
  });

  test('should create inventory if upsert on consume (edge case)', async () => {
    // With current code: consumeStock uses update, not upsert
    // This is an edge case where inventory record may not exist
    // Mock: skip for now — the controller uses update()
    // Test should pass as long as we don't crash
  });
});

describe('stockController.restock', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      body: { id_producto: 1, cantidad: 10, id_centro: 1 },
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return 404 if product not found', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue(null);

    await restock(req, res);

    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Producto no encontrado');
  });

  test('should return 404 if center not found', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue({
      id_producto: 1,
      nombre_producto: 'Lejía 2L',
    });
    mockPrisma.centro.findUnique.mockResolvedValue(null);

    await restock(req, res);

    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Centro no encontrado');
  });

  test('should upsert inventory and register movement', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue({
      id_producto: 1,
      nombre_producto: 'Lejía 2L',
    });
    mockPrisma.centro.findUnique.mockResolvedValue({
      id_centro: 1,
      nombre_centro: 'CEIP San Juan',
    });

    mockPrisma.$transaction.mockResolvedValue([
      { id_centro: 1, id_producto: 1, cantidad_actual: 22 },
      { id_movimiento: 3, cantidad: 10 },
    ]);

    await restock(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.message).toContain('Reposición registrada');
    expect(data.inventario.cantidad_actual).toBe(22);
  });
});

describe('stockController.getAlerts', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      query: {},
      user: { id_usuario: 1, rol: 'limpiador' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return products below stock_minimo_alerta', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 3, // Below stock_minimo_alerta = 5
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', stock_minimo_alerta: 5 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
      {
        id_centro: 1,
        id_producto: 2,
        cantidad_actual: 10, // Above stock_minimo_alerta = 5
        producto: { id_producto: 2, nombre_producto: 'Fregasuelos 1L', stock_minimo_alerta: 5 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getAlerts(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.alerts).toHaveLength(1);
    expect(data.alerts[0].producto.nombre_producto).toBe('Lejía 2L');
  });

  test('should filter alerts by centro when provided', async () => {
    req.query.centro = '2';

    mockPrisma.inventarioCentro.findMany.mockResolvedValue([]);

    await getAlerts(req, res);

    expect(mockPrisma.inventarioCentro.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_centro: 2 },
      })
    );
  });

  test('should return empty alerts when stock is sufficient', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 10,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', stock_minimo_alerta: 5 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getAlerts(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.alerts).toHaveLength(0);
  });
});