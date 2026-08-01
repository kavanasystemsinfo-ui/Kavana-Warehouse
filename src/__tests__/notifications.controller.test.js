// =============================================================================
// Kavana CleanOps — Notifications Controller Tests
// Tests for src/controllers/notificationsController.js
// =============================================================================

const httpMocks = require('node-mocks-http');
const { mockPrisma } = require('./setup');
const prisma = require('../lib/prisma');

const {
  getNotifications,
  markAsRead,
  getRules,
  createRule,
  deleteRule,
} = require('../controllers/notificationsController');

describe('notificationsController.getNotifications', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return notifications for the current user', async () => {
    const mockNotificaciones = [
      {
        id_notificacion: 1,
        id_usuario: 2,
        titulo: 'Stock bajo',
        mensaje: 'Lejía 2L en CEIP San Juan está por debajo del mínimo',
        leida: false,
        fecha_creacion: new Date(),
      },
      {
        id_notificacion: 2,
        id_usuario: 2,
        titulo: 'Desviación detectada',
        mensaje: 'Consumo de Fregasuelos supera el teórico en 150%',
        leida: true,
        fecha_creacion: new Date(),
      },
    ];

    mockPrisma.notificacion.findMany.mockResolvedValue(mockNotificaciones);

    await getNotifications(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.notificaciones).toHaveLength(2);
    expect(data.notificaciones[0].titulo).toBe('Stock bajo');
    expect(data.notificaciones[1].leida).toBe(true);
  });

  test('should filter by current user id', async () => {
    mockPrisma.notificacion.findMany.mockResolvedValue([]);

    await getNotifications(req, res);

    expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_usuario: 2 },
      })
    );
  });

  test('should order by fecha_creacion desc and limit to 50', async () => {
    mockPrisma.notificacion.findMany.mockResolvedValue([]);

    await getNotifications(req, res);

    expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { fecha_creacion: 'desc' },
        take: 50,
      })
    );
  });

  test('should return empty array when no notifications exist', async () => {
    mockPrisma.notificacion.findMany.mockResolvedValue([]);

    await getNotifications(req, res);

    const data = JSON.parse(res._getData());
    expect(data.notificaciones).toEqual([]);
  });

  test('should return 500 on database error', async () => {
    mockPrisma.notificacion.findMany.mockRejectedValue(new Error('DB connection failed'));

    await getNotifications(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});

describe('notificationsController.markAsRead', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      params: { id: '1' },
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should mark notification as read', async () => {
    mockPrisma.notificacion.update.mockResolvedValue({
      id_notificacion: 1,
      id_usuario: 2,
      leida: true,
    });

    await markAsRead(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.notificacion.leida).toBe(true);
  });

  test('should verify notification belongs to user', async () => {
    mockPrisma.notificacion.update.mockResolvedValue({ id_notificacion: 1, leida: true });

    await markAsRead(req, res);

    expect(mockPrisma.notificacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_notificacion: 1, id_usuario: 2 },
      })
    );
  });

  test('should return 500 on database error', async () => {
    mockPrisma.notificacion.update.mockRejectedValue(new Error('DB connection failed'));

    await markAsRead(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});

describe('notificationsController.getRules', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return rules for the current supervisor', async () => {
    const mockReglas = [
      {
        id_regla: 1,
        id_supervisor: 2,
        id_centro: 1,
        id_operario: null,
        id_producto: 1,
        activa: true,
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        operario: null,
        producto: { id_producto: 1, nombre_producto: 'Lejía 2L' },
      },
    ];

    mockPrisma.reglaNotificacion.findMany.mockResolvedValue(mockReglas);

    await getRules(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.reglas).toHaveLength(1);
    expect(data.reglas[0].centro.nombre_centro).toBe('CEIP San Juan');
  });

  test('should filter by supervisor id', async () => {
    mockPrisma.reglaNotificacion.findMany.mockResolvedValue([]);

    await getRules(req, res);

    expect(mockPrisma.reglaNotificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_supervisor: 2 },
      })
    );
  });

  test('should return empty array when no rules exist', async () => {
    mockPrisma.reglaNotificacion.findMany.mockResolvedValue([]);

    await getRules(req, res);

    const data = JSON.parse(res._getData());
    expect(data.reglas).toEqual([]);
  });

  test('should return 500 on database error', async () => {
    mockPrisma.reglaNotificacion.findMany.mockRejectedValue(new Error('DB connection failed'));

    await getRules(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});

describe('notificationsController.createRule', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      body: {
        id_centro: 1,
        id_operario: 3,
        id_producto: 1,
      },
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should create a notification rule successfully', async () => {
    const mockRegla = {
      id_regla: 1,
      id_supervisor: 2,
      id_centro: 1,
      id_operario: 3,
      id_producto: 1,
      activa: true,
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      operario: { id_usuario: 3, nombre: 'Carlos López' },
      producto: { id_producto: 1, nombre_producto: 'Lejía 2L' },
    };

    mockPrisma.reglaNotificacion.create.mockResolvedValue(mockRegla);

    await createRule(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.message).toContain('Regla creada');
    expect(data.regla.activa).toBe(true);
    expect(data.regla.id_supervisor).toBe(2);
  });

  test('should create rule with only centro (no operario/producto)', async () => {
    req.body = { id_centro: 1 };

    mockPrisma.reglaNotificacion.create.mockResolvedValue({
      id_regla: 2,
      id_supervisor: 2,
      id_centro: 1,
      id_operario: null,
      id_producto: null,
      activa: true,
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      operario: null,
      producto: null,
    });

    await createRule(req, res);

    expect(mockPrisma.reglaNotificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_centro: 1,
          id_operario: null,
          id_producto: null,
        }),
      })
    );
    expect(res.statusCode).toBe(200);
  });

  test('should return 500 on database error', async () => {
    mockPrisma.reglaNotificacion.create.mockRejectedValue(new Error('DB connection failed'));

    await createRule(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});

describe('notificationsController.deleteRule', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      params: { id: '1' },
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should delete a rule successfully', async () => {
    mockPrisma.reglaNotificacion.delete.mockResolvedValue({ id_regla: 1 });

    await deleteRule(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toContain('Regla eliminada');
  });

  test('should verify rule belongs to supervisor before deleting', async () => {
    mockPrisma.reglaNotificacion.delete.mockResolvedValue({ id_regla: 1 });

    await deleteRule(req, res);

    expect(mockPrisma.reglaNotificacion.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_regla: 1, id_supervisor: 2 },
      })
    );
  });

  test('should return 500 on database error', async () => {
    mockPrisma.reglaNotificacion.delete.mockRejectedValue(new Error('DB connection failed'));

    await deleteRule(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});