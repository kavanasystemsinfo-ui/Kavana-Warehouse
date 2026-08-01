// =============================================================================
// Kavana CleanOps — Purchase Controller Tests
// Tests for src/controllers/purchaseController.js
// =============================================================================

const httpMocks = require('node-mocks-http');
const { mockPrisma } = require('./setup');
const prisma = require('../lib/prisma');

const { getProposal } = require('../controllers/purchaseController');

describe('purchaseController.getProposal', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      query: {},
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should generate purchase proposal for items below minimum stock', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 2,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', stock_minimo_alerta: 10, unidad_medida: 'unidades', coste_unitario: 1.5 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
      {
        id_centro: 1,
        id_producto: 2,
        cantidad_actual: 15,
        producto: { id_producto: 2, nombre_producto: 'Fregasuelos 1L', stock_minimo_alerta: 10, unidad_medida: 'unidades', coste_unitario: 3.0 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getProposal(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());

    // Only item 1 (Lejía) should be in proposal (2 < 10)
    expect(data.total_articulos).toBe(1);
    expect(data.propuestas).toHaveLength(1);
    expect(data.propuestas[0].producto.nombre_producto).toBe('Lejía 2L');
    expect(data.propuestas[0].stock_actual).toBe(2);
    expect(data.propuestas[0].stock_minimo).toBe(10);
    expect(data.propuestas[0].deficit).toBe(8);
    // Redondeo a múltiplo de 5: ceil(8/5)*5 = 10
    expect(data.propuestas[0].cantidad_pedido).toBe(10);
    expect(data.propuestas[0].coste_estimado).toBe(15.0);
  });

  test('should filter by centro query param', async () => {
    req.query.centro = '2';

    mockPrisma.inventarioCentro.findMany.mockResolvedValue([]);

    await getProposal(req, res);

    expect(mockPrisma.inventarioCentro.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_centro: 2 },
      })
    );
  });

  test('should return empty proposal when all stock is sufficient', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 20,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', stock_minimo_alerta: 10, unidad_medida: 'unidades', coste_unitario: 1.5 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getProposal(req, res);

    const data = JSON.parse(res._getData());
    expect(data.total_articulos).toBe(0);
    expect(data.total_unidades).toBe(0);
    expect(data.total_coste_estimado).toBe(0);
    expect(data.propuestas).toEqual([]);
  });

  test('should handle multiple items below minimum and calculate totals', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 1,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', stock_minimo_alerta: 10, unidad_medida: 'unidades', coste_unitario: 1.5 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
      {
        id_centro: 1,
        id_producto: 2,
        cantidad_actual: 3,
        producto: { id_producto: 2, nombre_producto: 'Fregasuelos 1L', stock_minimo_alerta: 10, unidad_medida: 'unidades', coste_unitario: 3.0 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getProposal(req, res);

    const data = JSON.parse(res._getData());
    expect(data.total_articulos).toBe(2);
    // Lejía: deficit=9, pedido=10; Fregasuelos: deficit=7, pedido=10
    expect(data.total_unidades).toBe(20);
    // Lejía: 10*1.5=15; Fregasuelos: 10*3=30
    expect(data.total_coste_estimado).toBe(45.0);
  });

  test('should handle zero cost_unitario gracefully', async () => {
    const mockInventory = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_actual: 0,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', stock_minimo_alerta: 5, unidad_medida: 'unidades', coste_unitario: 0 },
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      },
    ];

    mockPrisma.inventarioCentro.findMany.mockResolvedValue(mockInventory);

    await getProposal(req, res);

    const data = JSON.parse(res._getData());
    expect(data.total_articulos).toBe(1);
    expect(data.propuestas[0].coste_estimado).toBe(0);
    expect(data.total_coste_estimado).toBe(0);
  });

  test('should return 500 on database error', async () => {
    mockPrisma.inventarioCentro.findMany.mockRejectedValue(new Error('DB connection failed'));

    await getProposal(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});