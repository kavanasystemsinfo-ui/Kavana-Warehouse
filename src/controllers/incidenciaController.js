// =============================================================================
// Kavana CleanStock — Incidencia Controller
//   Reporte de averías/desperfectos en instalaciones (facility services)
// =============================================================================

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// ---------------------------------------------------------------------------
// POST /api/v1/incidencias
// Body: { id_centro, categoria, titulo, descripcion, foto_url? }
// ---------------------------------------------------------------------------
async function createIncidencia(req, res) {
  try {
    const { id_centro, categoria, titulo, descripcion, foto_url } = req.body;

    // Validar centro
    let centroId = id_centro;
    if (req.user.rol === 'limpiador') {
      const asignacion = await prisma.asignacionPersonal.findFirst({
        where: {
          id_usuario: req.user.id_usuario,
          fecha_inicio: { lte: new Date() },
          OR: [
            { fecha_fin: { gte: new Date() } },
            { fecha_fin: null },
          ],
        },
      });
      if (!asignacion) {
        return res.status(403).json({ error: 'No tienes un centro activo asignado.' });
      }
      centroId = asignacion.id_centro;
    }

    if (!centroId) {
      return res.status(400).json({ error: 'Debe especificar el centro.' });
    }

    const categoriasValidas = ['limpieza', 'fontaneria', 'electricidad', 'cerrajeria', 'otros'];
    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({ error: `Categoría inválida. Opciones: ${categoriasValidas.join(', ')}` });
    }

    if (!titulo || titulo.trim().length < 3) {
      return res.status(400).json({ error: 'El título debe tener al menos 3 caracteres.' });
    }

    const incidencia = await prisma.incidencia.create({
      data: {
        id_centro: Number(centroId),
        id_usuario: req.user.id_usuario,
        categoria,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || '',
        foto_url: foto_url || null,
      },
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        usuario: { select: { id_usuario: true, nombre: true } },
      },
    });

    logger.info('Incidencia creada', { id: incidencia.id_incidencia, centro: centroId, categoria });

    res.status(201).json({ message: 'Incidencia reportada correctamente.', incidencia });
  } catch (error) {
    logger.error('Error en createIncidencia:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/incidencias?centro=:id&estado=:estado&categoria=:cat
// ---------------------------------------------------------------------------
async function listIncidencias(req, res) {
  try {
    const { centro, estado, categoria } = req.query;
    const where = {};
    if (centro) where.id_centro = Number(centro);
    if (estado) where.estado = estado;
    if (categoria) where.categoria = categoria;

    const incidencias = await prisma.incidencia.findMany({
      where,
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        usuario: { select: { id_usuario: true, nombre: true } },
      },
      orderBy: { fecha_creacion: 'desc' },
      take: 100,
    });

    res.json({ total: incidencias.length, incidencias });
  } catch (error) {
    logger.error('Error en listIncidencias:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/v1/incidencias/:id
// Body: { estado: 'en_proceso' | 'resuelta' }
// ---------------------------------------------------------------------------
async function updateIncidencia(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'en_proceso', 'resuelta'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Opciones: ${estadosValidos.join(', ')}` });
    }

    const incidencia = await prisma.incidencia.update({
      where: { id_incidencia: Number(id) },
      data: { estado },
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        usuario: { select: { id_usuario: true, nombre: true } },
      },
    });

    logger.info('Incidencia actualizada', { id: Number(id), estado });

    res.json({ message: 'Incidencia actualizada.', incidencia });
  } catch (error) {
    logger.error('Error en updateIncidencia:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { createIncidencia, listIncidencias, updateIncidencia };
