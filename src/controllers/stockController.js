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
        return res.status(403).json({ error: 'No tienes permisos para registrar consumos en este centro.' });
      }
      centroId = asignacion.id_centro;
    } else {
      // Para supervisor/admin, id_centro es obligatorio
      if (!centroId) {
        return res.status(400).json({ error: 'Debe especificar el id_centro.' });
      }
    }

    // Verificar que el producto exista
    const producto = await prisma.producto.findUnique({ where: { id_producto } });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Verificar stock suficiente (consumo = cantidad positiva)
    const inventarioActual = await prisma.inventarioCentro.findUnique({
      where: {
        id_centro_id_producto: { id_centro: centroId, id_producto },
      },
    });

    if (!inventarioActual || inventarioActual.cantidad_actual - cantidad < 0) {
      return res.status(400).json({
        error: 'Stock insuficiente.',
        disponible: inventarioActual?.cantidad_actual ?? 0,
      });
    }

    // Transacción: actualizar inventario + registrar movimiento
    const [inventario, movimiento] = await prisma.$transaction([
      prisma.inventarioCentro.update({
        where: {
          id_centro_id_producto: { id_centro: centroId, id_producto },
        },
        data: {
          cantidad_actual: { decrement: cantidad }, // cantidad es positiva, decrementamos
        },
      }),
      prisma.registroMovimiento.create({
        data: {
          id_usuario: req.user.id_usuario,
          id_centro: centroId,
          id_producto,
          cantidad: -cantidad, // negativa = consumo en el log
        },
      }),
    ]);

    // --- Notificación en tiempo real (Sockets) ---
    emitStockConsumed({
      id_centro: centroId,
      id_producto,
      nombre_producto: producto.nombre_producto,
      cantidad: -cantidad, // negativa = consumo para el cliente socket
      usuario: { id_usuario: req.user.id_usuario, nombre: req.user.nombre || 'Desconocido' },
      cantidad_actual: inventario.cantidad_actual,
      stock_minimo_alerta: producto.stock_minimo_alerta,
    });

    // --- Sistema de Notificaciones (Reglas Supervisor) ---
    // Buscar reglas que apliquen a este consumo
    const reglas = await prisma.reglaNotificacion.findMany({
      where: {
        activa: true,
        OR: [
          { id_centro: null, id_operario: null, id_producto: null }, // Regla global
          { id_centro: centroId },
          { id_operario: req.user.id_usuario },
          { id_producto: id_producto },
        ]
      }
    });

    // Filtrar reglas que coincidan de forma estricta (si tienen varios filtros)
    const reglasAplicables = reglas.filter(r => 
      (r.id_centro === null || r.id_centro === centroId) &&
      (r.id_operario === null || r.id_operario === req.user.id_usuario) &&
      (r.id_producto === null || r.id_producto === id_producto)
    );

    // Crear notificaciones en la base de datos
    if (reglasAplicables.length > 0) {
      const centro = await prisma.centro.findUnique({ where: { id_centro: centroId } });
      const nombreCentro = centro ? centro.nombre_centro : `Centro ${centroId}`;
      const operador = req.user.nombre || 'Operario desconocido';
      
      const mensaje = `${operador} ha retirado ${cantidad} ud de ${producto.nombre_producto} en ${nombreCentro}. Quedan ${inventario.cantidad_actual}.`;

      // Evitar notificaciones duplicadas al mismo supervisor si varias reglas coinciden
      const supervisoresSet = new Set(reglasAplicables.map(r => r.id_supervisor));
      
      const notificacionesData = Array.from(supervisoresSet).map(id_supervisor => ({
        id_usuario: id_supervisor,
        titulo: 'Alerta de Consumo',
        mensaje: mensaje,
        leida: false,
      }));

      await prisma.notificacion.createMany({
        data: notificacionesData
      });
    }

    res.json({
      message: 'Consumo registrado correctamente.',
      inventario,
      movimiento,
    });
  } catch (error) {
    logger.error('Error en consumeStock:', { error: error.message, stack: error.stack, body: req.body, user: req.user?.id_usuario });
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/stock/restock (supervisor+)
// Body: { id_producto: number, cantidad: number, id_centro: number }
// ---------------------------------------------------------------------------
async function restock(req, res) {
  try {
    const { id_producto, cantidad, id_centro } = req.body;

    // Verificar que el producto exista
    const producto = await prisma.producto.findUnique({ where: { id_producto } });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Verificar que el centro exista
    const centro = await prisma.centro.findUnique({ where: { id_centro } });
    if (!centro) {
      return res.status(404).json({ error: 'Centro no encontrado.' });
    }

    // Asegurar que exista el registro de inventario (upsert)
    const [inventario, movimiento] = await prisma.$transaction([
      prisma.inventarioCentro.upsert({
        where: {
          id_centro_id_producto: { id_centro, id_producto },
        },
        create: {
          id_centro,
          id_producto,
          cantidad_actual: cantidad,
        },
        update: {
          cantidad_actual: { increment: cantidad },
        },
      }),
      prisma.registroMovimiento.create({
        data: {
          id_usuario: req.user.id_usuario,
          id_centro,
          id_producto,
          cantidad, // positiva = reposición
        },
      }),
    ]);

    // --- Notificación en tiempo real ---
    emitStockRestocked({
      id_centro,
      id_producto,
      nombre_producto: producto.nombre_producto,
      cantidad,
      usuario: { id_usuario: req.user.id_usuario, nombre: req.user.nombre || 'Desconocido' },
      cantidad_actual: inventario.cantidad_actual,
    });

    res.json({
      message: 'Reposición registrada correctamente.',
      inventario,
      movimiento,
    });
  } catch (error) {
    logger.error('Error en restock:', { error: error.message, stack: error.stack, body: req.body, user: req.user?.id_usuario });
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