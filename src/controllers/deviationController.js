// =============================================================================
// Kavana CleanStock — Deviation Controller (Consumo Teórico vs. Real)
// =============================================================================

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/deviations?centro=:id&mes=YYYY-MM
// Compara el consumo real del mes con el teórico asignado por centro/producto
// ---------------------------------------------------------------------------
async function getDeviations(req, res) {
  try {
    const { centro, mes } = req.query;

    // Determinar rango de fechas del mes
    const now = new Date();
    let startDate, endDate;
    if (mes) {
      const [year, month] = mes.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Obtener consumos teóricos
    const whereTeorico = centro ? { id_centro: Number(centro) } : {};
    const teoricos = await prisma.consumoTeorico.findMany({
      where: whereTeorico,
      include: {
        centro: { select: { id_centro: true, nombre_centro: true } },
        producto: { select: { id_producto: true, nombre_producto: true, unidad_medida: true, coste_unitario: true } },
      },
    });

    // Obtener consumos reales del mes (cantidad < 0)
    const whereReal = {
      cantidad: { lt: 0 },
      fecha_hora: { gte: startDate, lte: endDate },
    };
    if (centro) whereReal.id_centro = Number(centro);

    const movimientos = await prisma.registroMovimiento.findMany({
      where: whereReal,
      select: {
        id_centro: true,
        id_producto: true,
        cantidad: true,
      },
    });

    // Agrupar consumo real por centro+producto
    const consumoReal = {};
    for (const m of movimientos) {
      const key = `${m.id_centro}-${m.id_producto}`;
      if (!consumoReal[key]) consumoReal[key] = 0;
      consumoReal[key] += Math.abs(m.cantidad);
    }

    // Construir resultado de desviaciones
    const desviaciones = teoricos.map((t) => {
      const key = `${t.id_centro}-${t.id_producto}`;
      const real = consumoReal[key] || 0;
      const teorico = t.cantidad_teorica;
      const desviacion = real - teorico;
      const porcentaje = teorico > 0 ? ((real / teorico) * 100) : 0;
      const coste_desviacion = desviacion > 0 ? desviacion * (t.producto.coste_unitario || 0) : 0;

      return {
        centro: t.centro,
        producto: t.producto,
        consumo_teorico: teorico,
        consumo_real: real,
        desviacion,
        porcentaje_consumido: parseFloat(porcentaje.toFixed(1)),
        coste_desviacion: parseFloat(coste_desviacion.toFixed(2)),
        estado: desviacion > 0 ? 'exceso' : desviacion < 0 ? 'infraconsumo' : 'normal',
      };
    });

    // Ordenar por desviación descendente (los peores primero)
    desviaciones.sort((a, b) => b.desviacion - a.desviacion);

    logger.info('Desviaciones consultadas', { centro, mes, total: desviaciones.length });

    res.json({
      mes: mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      total_desviaciones: desviaciones.filter(d => d.estado === 'exceso').length,
      desviaciones,
    });
  } catch (error) {
    logger.error('Error en getDeviations:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getDeviations };
