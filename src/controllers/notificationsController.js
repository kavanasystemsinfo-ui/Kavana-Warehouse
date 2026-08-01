// =============================================================================
// Kavana CleanStock — Notifications Controller
// =============================================================================

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// ---------------------------------------------------------------------------
// GET /api/v1/notifications
// Obtener notificaciones del supervisor actual
// ---------------------------------------------------------------------------
async function getNotifications(req, res) {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { id_usuario: req.user.id_usuario },
      orderBy: { fecha_creacion: 'desc' },
      take: 50,
    });
    res.json({ notificaciones });
  } catch (error) {
    logger.error('Error en getNotifications:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/v1/notifications/:id/read
// Marcar una notificación como leída
// ---------------------------------------------------------------------------
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notificacion = await prisma.notificacion.update({
      where: { 
        id_notificacion: Number(id),
        id_usuario: req.user.id_usuario // Asegurar que sea suya
      },
      data: { leida: true },
    });
    res.json({ success: true, notificacion });
  } catch (error) {
    logger.error('Error en markAsRead:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/notifications/rules
// Obtener reglas de notificación configuradas por el supervisor
// ---------------------------------------------------------------------------
async function getRules(req, res) {
  try {
    const reglas = await prisma.reglaNotificacion.findMany({
      where: { id_supervisor: req.user.id_usuario },
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        operario: { select: { id_usuario: true, nombre: true } },
        producto: { select: { id_producto: true, nombre_producto: true } },
      },
      orderBy: { id_regla: 'asc' },
    });
    res.json({ reglas });
  } catch (error) {
    logger.error('Error en getRules:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/notifications/rules
// Crear una nueva regla de notificación
// ---------------------------------------------------------------------------
async function createRule(req, res) {
  try {
    const { id_centro, id_operario, id_producto } = req.body;
    const regla = await prisma.reglaNotificacion.create({
      data: {
        id_supervisor: req.user.id_usuario,
        id_centro: id_centro ? Number(id_centro) : null,
        id_operario: id_operario ? Number(id_operario) : null,
        id_producto: id_producto ? Number(id_producto) : null,
        activa: true,
      },
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        operario: { select: { id_usuario: true, nombre: true } },
        producto: { select: { id_producto: true, nombre_producto: true } },
      }
    });
    res.json({ message: 'Regla creada', regla });
  } catch (error) {
    logger.error('Error en createRule:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/notifications/rules/:id
// Eliminar una regla
// ---------------------------------------------------------------------------
async function deleteRule(req, res) {
  try {
    const { id } = req.params;
    await prisma.reglaNotificacion.delete({
      where: {
        id_regla: Number(id),
        id_supervisor: req.user.id_usuario,
      }
    });
    res.json({ success: true, message: 'Regla eliminada' });
  } catch (error) {
    logger.error('Error en deleteRule:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getNotifications, markAsRead, getRules, createRule, deleteRule };
