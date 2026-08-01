// =============================================================================
// Kavana CleanStock — Stock Controller
//   - getInventory:   Obtener inventario (filtrable por centro)
//   - consumeStock:   Registrar consumo de producto (cantidad negativa)
//   - restock:        Registrar reposición de producto (cantidad positiva)
//   - getAlerts:      Productos por debajo del stock mínimo de alerta
// =============================================================================

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { emitStockConsumed, emitStockRestocked } = require('../lib/socket');
const { sendPushNotification } = require('../lib/push');

// ---------------------------------------------------------------------------
// GET /api/v1/stock/inventory?centro=:id
// Si el usuario es limpiador, solo ve el inventario de su centro activo.
// ---------------------------------------------------------------------------
async function getInventory(req, res) {
  try {
    let { centro } = req.query;

    // Los limpiadores solo ven su centro asignado
    if (!centro && req.user.rol === 'limpiador') {
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
      if (asignacion) {
        centro = String(asignacion.id_centro);
      }
    }

    const where = centro ? { id_centro: Number(centro) } : {};

    const inventario = await prisma.inventarioCentro.findMany({
      where,
      include: {
        producto: true,
        centro: true,
      },
      orderBy: [
        { centro: { nombre_centro: 'asc' } },
        { producto: { nombre_producto: 'asc' } },
      ],
    });

    res.json({ inventario });
  } catch (error) {
    logger.error('Error en getInventory:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/stock/consume
// Body: { id_producto: number, cantidad: number, id_centro?: number }
// ---------------------------------------------------------------------------
async function consumeStock(req, res) {
  try {
    const { id_producto, cantidad, id_centro } = req.body;

    // Resolver y validar centro de trabajo
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

      // Si intentó especificar otro centro en el cuerpo de la petición, le denegamos acceso
      if (id_centro && Number(id_centro) !== asignacion.id_centro) {
        return res.status(403).json({ error: 'No tienes permiso para consumir en ese centro.' });
      }

      centroId = asignacion.id_centro;
    }

    // Obtener información del producto y centro
    const producto = await prisma.producto.findUnique({
      where: { id_producto: Number(id_producto) }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const centro = await prisma.centro.findUnique({
      where: { id_centro: centroId }
    });

    if (!centro) {
      return res.status(404).json({ error: 'Centro no encontrado.' });
    }

    // Obtener inventario actual
    let inventario = await prisma.inventarioCentro.findFirst({
      where: {
        id_centro: centroId,
        id_producto: Number(id_producto)
      }
    });

    // Si no existe inventario previo, crear uno con cantidad 0
    if (!inventario) {
      inventario = await prisma.inventarioCentro.create({
        data: {
          id_centro: centroId,
          id_producto: Number(id_producto),
          cantidad_actual: 0
        }
      });
    }

    // Validar stock suficiente (solo para consumo, negativo)
    if (cantidad < 0 && Math.abs(cantidad) > inventario.cantidad_actual) {
      return res.status(400).json({ error: 'Stock insuficiente.' });
    }

    // Actualizar inventario
    const nuevaCantidad = inventario.cantidad_actual + cantidad; // cantidad es negativa para consumo
    inventario = await prisma.inventarioCentro.update({
      where: {
        id_centro_id_producto: {
          id_centro: centroId,
          id_producto: Number(id_producto)
        }
      },
      data: {
        cantidad_actual: nuevaCantidad
      }
    });

    // Registrar movimiento
    const movimiento = await prisma.registroMovimiento.create({
      data: {
        id_usuario: req.user.id_usuario,
        id_centro: centroId,
        id_producto: Number(id_producto),
        cantidad: cantidad // negativa = consumo
      }
    });

    // --- Notificación en tiempo real (Socket.IO) ---
    emitStockConsumed({
      id_centro: centroId,
      id_producto: Number(id_producto),
      nombre_producto: producto.nombre_producto,
      cantidad: cantidad, // negativa = consumo
      usuario: { id_usuario: req.user.id_usuario, nombre: req.user.nombre || 'Desconocido' },
      cantidad_actual: nuevaCantidad,
      stock_minimo_alerta: producto.stock_minimo_alerta
    });

    // --- Notificaciones push para el operario ---
    try {
      const operadorNombre = req.user.nombre || 'Operario';
      const payload = {
        title: 'Consumo Registrado',
        body: `${operadorNombre} ha retirado ${Math.abs(cantidad)} ud de ${producto.nombre_producto} en ${centro.nombre_centro}. Quedan ${nuevaCantidad}.`,
        data: {
          type: 'consumption_confirmation',
          centroId: centroId,
          productoId: Number(id_producto),
          movimientoId: movimiento.id_movimiento
        }
      };
      
      // Send to the operator who performed the action
      await sendPushNotification(req.user.id_usuario, payload);
    } catch (pushError) {
      logger.error('Error sending push notification for consumption:', pushError);
      // Don't fail the main operation
    }

    res.json({
      message: 'Consumo registrado correctamente.',
      inventario,
      movimiento,
    });
  } catch (error) {
    logger.error('Error en consumeStock:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/stock/restock
// Body: { id_producto: number, cantidad: number, id_centro: number }
// ---------------------------------------------------------------------------
async function restock(req, res) {
  try {
    const { id_producto, cantidad, id_centro } = req.body;

    // Validar permisos (solo supervisor y admin pueden reponer)
    if (!['supervisor', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }

    // Obtener información del producto y centro
    const producto = await prisma.producto.findUnique({
      where: { id_producto: Number(id_producto) }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const centro = await prisma.centro.findUnique({
      where: { id_centro: Number(id_centro) }
    });

    if (!centro) {
      return res.status(404).json({ error: 'Centro no encontrado.' });
    }

    // Obtener inventario actual
    let inventario = await prisma.inventarioCentro.findFirst({
      where: {
        id_centro: Number(id_centro),
        id_producto: Number(id_producto)
      }
    });

    // Si no existe inventario previo, crear uno con cantidad 0
    if (!inventario) {
      inventario = await prisma.inventarioCentro.create({
        data: {
          id_centro: Number(id_centro),
          id_producto: Number(id_producto),
          cantidad_actual: 0
        }
      });
    }

    // Actualizar inventario
    const nuevaCantidad = inventario.cantidad_actual + cantidad; // cantidad es positiva para reposición
    inventario = await prisma.inventarioCentro.update({
      where: {
        id_centro_id_producto: {
          id_centro: Number(id_centro),
          id_producto: Number(id_producto)
        }
      },
      data: {
        cantidad_actual: nuevaCantidad
      }
    });

    // Registrar movimiento
    const movimiento = await prisma.registroMovimiento.create({
      data: {
        id_usuario: req.user.id_usuario,
        id_centro: Number(id_centro),
        id_producto: Number(id_producto),
        cantidad: cantidad // positiva = reposición
      }
    });

    // --- Notificación en tiempo real (Socket.IO) ---
    emitStockRestocked({
      id_centro: Number(id_centro),
      id_producto: Number(id_producto),
      nombre_producto: producto.nombre_producto,
      cantidad: cantidad, // positiva = reposición
      usuario: { id_usuario: req.user.id_usuario, nombre: req.user.nombre || 'Desconocido' },
      cantidad_actual: nuevaCantidad
    });

    // --- Notificaciones push para el supervisor (opcional) ---
    // Podemos enviar notificaciones de reposición si es necesario
    // Por ahora, nos enfocamos en las notificaciones de consumo para el operario

    res.json({
      message: 'Reposición registrada correctamente.',
      inventario,
      movimiento,
    });
  } catch (error) {
    logger.error('Error en restock:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/stock/alerts
// ---------------------------------------------------------------------------
async function getAlerts(req, res) {
  try {
    const { centro } = req.query;

    const whereCentro = centro ? { id_centro: Number(centro) } : {};

    // Prisma no soporta comparación cross-field en where (ej: cantidad_actual <= stock_minimo_alerta),
    // así que obtenemos todos los registros y filtramos en memoria.
    const alerts = await prisma.inventarioCentro.findMany({
      where: {
        ...whereCentro,
      },
      include: {
        producto: true,
        centro: true,
      },
      orderBy: { cantidad_actual: 'asc' },
    });

    const filteredAlerts = alerts.filter(
      (item) => item.cantidad_actual <= item.producto.stock_minimo_alerta,
    );

    res.json({ alerts: filteredAlerts });
  } catch (error) {
    logger.error('Error en getAlerts:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/stock/centros
// Devuelve todos los centros (para selects en dashboard).
// ---------------------------------------------------------------------------
async function getCentros(req, res) {
  try {
    const centros = await prisma.centro.findMany({
      orderBy: { nombre_centro: 'asc' },
    });
    res.json({ centros });
  } catch (error) {
    logger.error('Error en getCentros:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getInventory, consumeStock, restock, getAlerts, getCentros };