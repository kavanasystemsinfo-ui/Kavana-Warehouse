// =============================================================================
// Kavana CleanStock — Purchase Proposal Controller (Auto-Restock)
//   Genera propuestas de compra basadas en el stock actual vs. stock mínimo
// =============================================================================

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// ---------------------------------------------------------------------------
// GET /api/v1/purchases/proposal?centro=:id
// Calcula la cantidad necesaria para reponer cada producto al nivel mínimo
// ---------------------------------------------------------------------------
async function getProposal(req, res) {
  try {
    const { centro } = req.query;
    const where = centro ? { id_centro: Number(centro) } : {};

    const inventario = await prisma.inventarioCentro.findMany({
      where,
      include: {
        producto: true,
        centro: { select: { id_centro: true, nombre_centro: true } },
      },
      orderBy: [
        { centro: { nombre_centro: 'asc' } },
        { producto: { nombre_producto: 'asc' } },
      ],
    });

    // Filtrar productos por debajo del stock mínimo
    const propuestas = inventario
      .filter((item) => item.cantidad_actual < item.producto.stock_minimo_alerta)
      .map((item) => {
        const cantidadNecesaria = item.producto.stock_minimo_alerta - item.cantidad_actual;
        // Redondeamos hacia arriba al múltiplo de 5 para pedidos prácticos
        const cantidadPedido = Math.ceil(cantidadNecesaria / 5) * 5;
        const costeEstimado = cantidadPedido * (item.producto.coste_unitario || 0);

        return {
          centro: item.centro,
          producto: {
            id_producto: item.producto.id_producto,
            nombre_producto: item.producto.nombre_producto,
            unidad_medida: item.producto.unidad_medida,
            coste_unitario: item.producto.coste_unitario,
          },
          stock_actual: item.cantidad_actual,
          stock_minimo: item.producto.stock_minimo_alerta,
          deficit: cantidadNecesaria,
          cantidad_pedido: cantidadPedido,
          coste_estimado: parseFloat(costeEstimado.toFixed(2)),
        };
      });

    // Totales
    const totalArticulos = propuestas.length;
    const totalUnidades = propuestas.reduce((sum, p) => sum + p.cantidad_pedido, 0);
    const totalCoste = propuestas.reduce((sum, p) => sum + p.coste_estimado, 0);

    logger.info('Propuesta de compra generada', {
      centro,
      totalArticulos,
      totalCoste,
    });

    res.json({
      fecha_generacion: new Date().toISOString(),
      total_articulos: totalArticulos,
      total_unidades: totalUnidades,
      total_coste_estimado: parseFloat(totalCoste.toFixed(2)),
      propuestas,
    });
  } catch (error) {
    logger.error('Error en getProposal:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getProposal };
