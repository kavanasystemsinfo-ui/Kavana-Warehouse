// =============================================================================
// Kavana CleanOps — Deviation Controller Tests
// Tests for src/controllers/deviationController.js
// =============================================================================

const httpMocks = require('node-mocks-http');
const { mockPrisma } = require('./setup');
const prisma = require('../lib/prisma');

const { getDeviations } = require('../controllers/deviationController');

describe('deviationController.getDeviations', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      query: {},
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return deviations comparing theoretical vs real consumption', async () => {
    const mockTeoricos = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_teorica: 10,
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', coste_unitario: 1.5 },
      },
    ];

    const mockMovimientos = [
      { id_centro: 1, id_producto: 1, cantidad: -8 },
      { id_centro: 1, id_producto: 1, cantidad: -5 },
    ];

    mockPrisma.consumoTeorico.findMany.mockResolvedValue(mockTeoricos);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue(mockMovimientos);

    await getDeviations(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.desviaciones).toHaveLength(1);
    expect(data.desviaciones[0].consumo_teorico).toBe(10);
    expect(data.desviaciones[0].consumo_real).toBe(13);
    expect(data.desviaciones[0].desviacion).toBe(3);
    expect(data.desviaciones[0].porcentaje_consumido).toBe(130.0);
    expect(data.desviaciones[0].estado).toBe('exceso');
    expect(data.desviaciones[0].coste_desviacion).toBe(4.5);
    expect(data.total_desviaciones).toBe(1);
  });

  test('should filter by centro query param', async () => {
    req.query.centro = '2';

    mockPrisma.consumoTeorico.findMany.mockResolvedValue([]);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue([]);

    await getDeviations(req, res);

    expect(mockPrisma.consumoTeorico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_centro: 2 },
      })
    );
    expect(mockPrisma.registroMovimiento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_centro: 2 }),
      })
    );
  });

  test('should filter by mes (YYYY-MM) query param', async () => {
    req.query.mes = '2026-05';

    mockPrisma.consumoTeorico.findMany.mockResolvedValue([]);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue([]);

    await getDeviations(req, res);

    // Should use May 2026 date range
    expect(mockPrisma.registroMovimiento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fecha_hora: expect.objectContaining({
            gte: new Date(2026, 4, 1),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  test('should return infraconsumo when real is less than theoretical', async () => {
    const mockTeoricos = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_teorica: 20,
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', coste_unitario: 1.5 },
      },
    ];

    const mockMovimientos = [
      { id_centro: 1, id_producto: 1, cantidad: -5 },
    ];

    mockPrisma.consumoTeorico.findMany.mockResolvedValue(mockTeoricos);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue(mockMovimientos);

    await getDeviations(req, res);

    const data = JSON.parse(res._getData());
    expect(data.desviaciones[0].consumo_real).toBe(5);
    expect(data.desviaciones[0].desviacion).toBe(-15);
    expect(data.desviaciones[0].porcentaje_consumido).toBe(25.0);
    expect(data.desviaciones[0].estado).toBe('infraconsumo');
    expect(data.total_desviaciones).toBe(0);
  });

  test('should return normal when real equals theoretical', async () => {
    const mockTeoricos = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_teorica: 10,
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', coste_unitario: 1.5 },
      },
    ];

    const mockMovimientos = [
      { id_centro: 1, id_producto: 1, cantidad: -10 },
    ];

    mockPrisma.consumoTeorico.findMany.mockResolvedValue(mockTeoricos);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue(mockMovimientos);

    await getDeviations(req, res);

    const data = JSON.parse(res._getData());
    expect(data.desviaciones[0].desviacion).toBe(0);
    expect(data.desviaciones[0].porcentaje_consumido).toBe(100.0);
    expect(data.desviaciones[0].estado).toBe('normal');
  });

  test('should handle multiple centers and sort by deviation descending', async () => {
    const mockTeoricos = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_teorica: 10,
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', coste_unitario: 1.5 },
      },
      {
        id_centro: 2,
        id_producto: 1,
        cantidad_teorica: 10,
        centro: { id_centro: 2, nombre_centro: 'IES La Plana' },
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', coste_unitario: 1.5 },
      },
    ];

    const mockMovimientos = [
      { id_centro: 1, id_producto: 1, cantidad: -15 },
      { id_centro: 2, id_producto: 1, cantidad: -5 },
    ];

    mockPrisma.consumoTeorico.findMany.mockResolvedValue(mockTeoricos);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue(mockMovimientos);

    await getDeviations(req, res);

    const data = JSON.parse(res._getData());
    expect(data.desviaciones).toHaveLength(2);
    // First should be the one with highest deviation (exceso)
    expect(data.desviaciones[0].centro.nombre_centro).toBe('CEIP San Juan');
    expect(data.desviaciones[0].desviacion).toBe(5);
    expect(data.desviaciones[1].centro.nombre_centro).toBe('IES La Plana');
    expect(data.desviaciones[1].desviacion).toBe(-5);
  });

  test('should handle zero theoretical consumption', async () => {
    const mockTeoricos = [
      {
        id_centro: 1,
        id_producto: 1,
        cantidad_teorica: 0,
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', coste_unitario: 1.5 },
      },
    ];

    mockPrisma.consumoTeorico.findMany.mockResolvedValue(mockTeoricos);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue([]);

    await getDeviations(req, res);

    const data = JSON.parse(res._getData());
    expect(data.desviaciones[0].porcentaje_consumido).toBe(0);
    expect(data.desviaciones[0].estado).toBe('normal');
  });

  test('should return empty array when no theoretical data exists', async () => {
    mockPrisma.consumoTeorico.findMany.mockResolvedValue([]);
    mockPrisma.registroMovimiento.findMany.mockResolvedValue([]);

    await getDeviations(req, res);

    const data = JSON.parse(res._getData());
    expect(data.desviaciones).toEqual([]);
    expect(data.total_desviaciones).toBe(0);
  });

  test('should return 500 on database error', async () => {
    mockPrisma.consumoTeorico.findMany.mockRejectedValue(new Error('DB connection failed'));

    await getDeviations(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});