// =============================================================================
// Kavana CleanOps — Incidencia Controller Tests
// Tests for src/controllers/incidenciaController.js
// =============================================================================

const httpMocks = require('node-mocks-http');
const { mockPrisma } = require('./setup');
const prisma = require('../lib/prisma');

const {
  createIncidencia,
  listIncidencias,
  updateIncidencia,
} = require('../controllers/incidenciaController');

describe('incidenciaController.createIncidencia', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      body: {
        id_centro: 1,
        categoria: 'fontaneria',
        titulo: 'Grifo goteando en baño',
        descripcion: 'El grifo del baño de hombres no cierra bien',
      },
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should create an incidencia successfully for supervisor', async () => {
    const mockIncidencia = {
      id_incidencia: 1,
      id_centro: 1,
      id_usuario: 2,
      categoria: 'fontaneria',
      titulo: 'Grifo goteando en baño',
      descripcion: 'El grifo del baño de hombres no cierra bien',
      foto_url: null,
      estado: 'pendiente',
      fecha_creacion: new Date(),
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      usuario: { id_usuario: 2, nombre: 'María García' },
    };

    mockPrisma.incidencia.create.mockResolvedValue(mockIncidencia);

    await createIncidencia(req, res);

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.message).toContain('Incidencia reportada correctamente');
    expect(data.incidencia.categoria).toBe('fontaneria');
    expect(data.incidencia.titulo).toBe('Grifo goteando en baño');
    expect(data.incidencia.estado).toBe('pendiente');
  });

  test('should resolve active center for limpiador', async () => {
    req.user.rol = 'limpiador';
    req.user.id_usuario = 1;
    delete req.body.id_centro;

    mockPrisma.asignacionPersonal.findFirst.mockResolvedValue({
      id_asignacion: 1,
      id_usuario: 1,
      id_centro: 1,
    });

    mockPrisma.incidencia.create.mockResolvedValue({
      id_incidencia: 2,
      id_centro: 1,
      id_usuario: 1,
      categoria: 'limpieza',
      titulo: 'Derrame en pasillo',
      descripcion: '',
      estado: 'pendiente',
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      usuario: { id_usuario: 1, nombre: 'Carlos López' },
    });

    await createIncidencia(req, res);

    expect(mockPrisma.asignacionPersonal.findFirst).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
  });

  test('should return 403 if limpiador has no active center', async () => {
    req.user.rol = 'limpiador';
    req.user.id_usuario = 1;
    delete req.body.id_centro;

    mockPrisma.asignacionPersonal.findFirst.mockResolvedValue(null);

    await createIncidencia(req, res);

    expect(res.statusCode).toBe(403);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('No tienes un centro activo asignado');
  });

  test('should return 400 if categoria is invalid', async () => {
    req.body.categoria = 'maquinaria_pesada';

    await createIncidencia(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Categoría inválida');
  });

  test('should return 400 if titulo is too short', async () => {
    req.body.titulo = 'Ab';

    await createIncidencia(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('El título debe tener al menos 3 caracteres');
  });

  test('should return 400 if no centro provided and not limpiador', async () => {
    delete req.body.id_centro;

    await createIncidencia(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Debe especificar el centro');
  });

  test('should accept optional foto_url', async () => {
    req.body.foto_url = 'https://storage.example.com/foto.jpg';

    mockPrisma.incidencia.create.mockResolvedValue({
      id_incidencia: 3,
      id_centro: 1,
      id_usuario: 2,
      categoria: 'electricidad',
      titulo: 'Enchufe suelto',
      descripcion: '',
      foto_url: 'https://storage.example.com/foto.jpg',
      estado: 'pendiente',
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      usuario: { id_usuario: 2, nombre: 'María García' },
    });

    await createIncidencia(req, res);

    expect(mockPrisma.incidencia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          foto_url: 'https://storage.example.com/foto.jpg',
        }),
      })
    );
    expect(res.statusCode).toBe(201);
  });

  test('should return 500 on database error', async () => {
    mockPrisma.incidencia.create.mockRejectedValue(new Error('DB connection failed'));

    await createIncidencia(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});

describe('incidenciaController.listIncidencias', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      query: {},
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should return all incidencias without filters', async () => {
    const mockIncidencias = [
      {
        id_incidencia: 1,
        id_centro: 1,
        categoria: 'fontaneria',
        titulo: 'Grifo goteando',
        descripcion: 'Descripción',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
        usuario: { id_usuario: 1, nombre: 'Carlos López' },
      },
      {
        id_incidencia: 2,
        id_centro: 2,
        categoria: 'electricidad',
        titulo: 'Luz fundida',
        descripcion: 'Descripción',
        estado: 'resuelta',
        fecha_creacion: new Date(),
        centro: { id_centro: 2, nombre_centro: 'IES La Plana' },
        usuario: { id_usuario: 2, nombre: 'María García' },
      },
    ];

    mockPrisma.incidencia.findMany.mockResolvedValue(mockIncidencias);

    await listIncidencias(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.total).toBe(2);
    expect(data.incidencias).toHaveLength(2);
  });

  test('should filter by centro query param', async () => {
    req.query.centro = '1';

    mockPrisma.incidencia.findMany.mockResolvedValue([]);

    await listIncidencias(req, res);

    expect(mockPrisma.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_centro: 1 }),
      })
    );
  });

  test('should filter by estado query param', async () => {
    req.query.estado = 'pendiente';

    mockPrisma.incidencia.findMany.mockResolvedValue([]);

    await listIncidencias(req, res);

    expect(mockPrisma.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'pendiente' }),
      })
    );
  });

  test('should filter by categoria query param', async () => {
    req.query.categoria = 'electricidad';

    mockPrisma.incidencia.findMany.mockResolvedValue([]);

    await listIncidencias(req, res);

    expect(mockPrisma.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoria: 'electricidad' }),
      })
    );
  });

  test('should return empty array when no incidencias exist', async () => {
    mockPrisma.incidencia.findMany.mockResolvedValue([]);

    await listIncidencias(req, res);

    const data = JSON.parse(res._getData());
    expect(data.total).toBe(0);
    expect(data.incidencias).toEqual([]);
  });

  test('should limit results to 100 and order by fecha_creacion desc', async () => {
    mockPrisma.incidencia.findMany.mockResolvedValue([]);

    await listIncidencias(req, res);

    expect(mockPrisma.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { fecha_creacion: 'desc' },
        take: 100,
      })
    );
  });

  test('should return 500 on database error', async () => {
    mockPrisma.incidencia.findMany.mockRejectedValue(new Error('DB connection failed'));

    await listIncidencias(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});

describe('incidenciaController.updateIncidencia', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      params: { id: '1' },
      body: { estado: 'en_proceso' },
      user: { id_usuario: 2, rol: 'supervisor' },
    });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test('should update incidencia estado successfully', async () => {
    const mockUpdated = {
      id_incidencia: 1,
      id_centro: 1,
      categoria: 'fontaneria',
      titulo: 'Grifo goteando',
      estado: 'en_proceso',
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      usuario: { id_usuario: 1, nombre: 'Carlos López' },
    };

    mockPrisma.incidencia.update.mockResolvedValue(mockUpdated);

    await updateIncidencia(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.message).toContain('Incidencia actualizada');
    expect(data.incidencia.estado).toBe('en_proceso');
  });

  test('should update to resuelta', async () => {
    req.body.estado = 'resuelta';

    mockPrisma.incidencia.update.mockResolvedValue({
      id_incidencia: 1,
      estado: 'resuelta',
      centro: { id_centro: 1, nombre_centro: 'CEIP San Juan' },
      usuario: { id_usuario: 1, nombre: 'Carlos López' },
    });

    await updateIncidencia(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.incidencia.estado).toBe('resuelta');
  });

  test('should return 400 if estado is invalid', async () => {
    req.body.estado = 'cancelada';

    await updateIncidencia(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Estado inválido');
  });

  test('should return 500 on database error', async () => {
    mockPrisma.incidencia.update.mockRejectedValue(new Error('DB connection failed'));

    await updateIncidencia(req, res);

    expect(res.statusCode).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Error interno del servidor');
  });
});