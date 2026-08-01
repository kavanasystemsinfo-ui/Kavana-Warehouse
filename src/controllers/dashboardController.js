// =============================================================================
// Kavana CleanStock — Dashboard Controller
//   - consumption: Analítica de consumo por centro/producto/período
//   - alerts:      Alertas críticas de stock (concentrado para dashboard)
// =============================================================================

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/consumption
// Query: ?centro=:id&producto=:id&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// ---------------------------------------------------------------------------
async function consumption(req, res) {
  try {
    const { centro, producto, desde, hasta } = req.query;

    // Filtro base: solo movimientos de consumo (cantidad < 0)
    const where = {
      cantidad: { lt: 0 },
    };

    if (centro) where.id_centro = Number(centro);
    if (producto) where.id_producto = Number(producto);
    if (desde) {
      where.fecha_hora = { ...where.fecha_hora, gte: new Date(desde) };
    }
    if (hasta) {
      where.fecha_hora = { ...where.fecha_hora, lte: new Date(hasta + 'T23:59:59.999Z') };
    }

    // Obtener movimientos de consumo
    const movements = await prisma.registroMovimiento.findMany({
      where,
      include: {
        producto: { select: { id_producto: true, nombre_producto: true, unidad_medida: true, coste_unitario: true } },
        centro: { select: { id_centro: true, nombre_centro: true, presupuesto_mensual: true } },
        usuario: { select: { id_usuario: true, nombre: true } },
      },
      orderBy: { fecha_hora: 'desc' },
    });

    // Agrupar por centro para el resumen financiero (OPEX)
    const groupedByCenter = movements.reduce((acc, m) => {
      const key = m.centro.nombre_centro;
      if (!acc[key]) {
        acc[key] = {
          centro: m.centro,
          presupuesto_mensual: m.centro.presupuesto_mensual,
          total_consumo_unidades: 0,
          gasto_total_euros: 0,
          productos: {},
          movimientos: 0,
        };
      }
      
      const cantidadConsumida = Math.abs(m.cantidad);
      const costeUnitario = m.producto.coste_unitario || 0;
      const costeTotal = cantidadConsumida * costeUnitario;

      acc[key].total_consumo_unidades += cantidadConsumida;
      acc[key].gasto_total_euros += costeTotal;
      acc[key].movimientos += 1;
      
      const prodKey = m.producto.nombre_producto;
      if (!acc[key].productos[prodKey]) {
        acc[key].productos[prodKey] = {
          ...m.producto,
          cantidad: 0,
          gasto_euros: 0,
        };
      }
      acc[key].productos[prodKey].cantidad += cantidadConsumida;
      acc[key].productos[prodKey].gasto_euros += costeTotal;
      
      return acc;
    }, {});

    // Calcular porcentajes y totales globales
    let totalConsumoUnidades = 0;
    let totalGastoEuros = 0;

    const resumenCentros = Object.values(groupedByCenter).map((g) => {
      totalConsumoUnidades += g.total_consumo_unidades;
      totalGastoEuros += g.gasto_total_euros;

      // Porcentaje de presupuesto consumido
      let porcentaje_consumido = 0;
      if (g.presupuesto_mensual && g.presupuesto_mensual > 0) {
        porcentaje_consumido = (g.gasto_total_euros / g.presupuesto_mensual) * 100;
      }

      return {
        ...g,
        porcentaje_consumido: parseFloat(porcentaje_consumido.toFixed(2)),
        productos: Object.values(g.productos),
      };
    });

    logger.info('Dashboard consumo consultado (OPEX)', {
      filtros: { centro, producto, desde, hasta },
      totalMovimientos: movements.length,
      totalGastoEuros,
    });

    res.json({
      total_consumo_unidades: totalConsumoUnidades,
      total_gasto_euros: parseFloat(totalGastoEuros.toFixed(2)),
      total_movimientos: movements.length,
      resumen_por_centro: resumenCentros,
      movimientos: movements.slice(0, 100).map(m => ({
        ...m,
        gasto_euros: parseFloat((Math.abs(m.cantidad) * (m.producto.coste_unitario || 0)).toFixed(2))
      })),
    });
  } catch (error) {
    logger.error('Error en dashboard consumption:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/alerts
// ---------------------------------------------------------------------------
async function alerts(req, res) {
  try {
    // Obtener todo el inventario con datos de producto y centro
    const inventario = await prisma.inventarioCentro.findMany({
      include: {
        producto: true,
        centro: true,
      },
      orderBy: [
        { cantidad_actual: 'asc' },
      ],
    });

    // Filtrar los que están por debajo del umbral
    const criticalAlerts = inventario
      .filter((item) => item.cantidad_actual <= item.producto.stock_minimo_alerta)
      .map((item) => {
        const stockMinimo = item.producto.stock_minimo_alerta;
        return {
          id_centro: item.id_centro,
          centro: item.centro.nombre_centro,
          id_producto: item.id_producto,
          producto: item.producto.nombre_producto,
          unidad_medida: item.producto.unidad_medida,
          cantidad_actual: item.cantidad_actual,
          stock_minimo_alerta: stockMinimo,
          deficit: stockMinimo - item.cantidad_actual,
        };
      });

    // Separar por nivel de criticidad
    const critical = criticalAlerts.filter((a) => a.cantidad_actual <= 0);
    const warning = criticalAlerts.filter((a) => a.cantidad_actual > 0 && a.cantidad_actual <= a.stock_minimo_alerta);

    logger.info('Dashboard alertas consultado', {
      totalCritical: critical.length,
      totalWarning: warning.length,
    });

    res.json({
      total_alertas: criticalAlerts.length,
      criticas: critical,
      advertencias: warning,
    });
  } catch (error) {
    logger.error('Error en dashboard alerts:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { consumption, alerts };