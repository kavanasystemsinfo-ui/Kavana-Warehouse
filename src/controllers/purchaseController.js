// Kavana CleanStock — Purchase Controller
// Genera una propuesta de compras basada en stock mínimo por centro.
// Para cada inventario donde cantidad_actual < stock_minimo, propone pedir
// hasta llevarlo a 2x el mínimo (lote de reabastecimiento estándar).
//
// Contrato de salida (ver dashboard/src/lib/api.ts -> PurchaseProposal):
//   { fecha_generacion, total_articulos, total_unidades, total_coste_estimado,
//     propuestas: [{ centro, producto, stock_actual, stock_minimo, deficit,
//                    cantidad_pedido, coste_estimado }] }

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getProposal(req, res) {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(401).json({ error: 'No autenticado' });

    let idCliente = usuario.id_cliente;
    if (!idCliente && usuario.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });

    const filtroCentro = req.query.centro ? Number(req.query.centro) : null;
    const where = { centro: { id_cliente: idCliente }, stock_minimo: { gt: 0 } };
    if (filtroCentro) where.id_centro = filtroCentro;

    const inventarios = await prisma.inventarioCentro.findMany({
      where,
      include: { centro: true, producto: true },
    });

    const propuestas = [];
    let totalUnidades = 0;
    let totalCoste = 0;

    for (const inv of inventarios) {
      const actual = inv.cantidad_actual;
      const minimo = inv.stock_minimo;
      if (actual >= minimo) continue; // No hace falta pedir

      const deficit = minimo - actual;
      // Llevar a 2x el mínimo como lote estándar de reabastecimiento
      const cantidadPedido = Math.max(deficit, minimo * 2 - actual);
      const costeUnitario = inv.producto.coste_unitario || 0;
      const costeEstimado = Math.round(cantidadPedido * costeUnitario * 100) / 100;

      totalUnidades += cantidadPedido;
      totalCoste += costeEstimado;

      propuestas.push({
        centro: { id_centro: inv.centro.id_centro, nombre_centro: inv.centro.nombre_centro },
        producto: {
          id_producto: inv.producto.id_producto,
          nombre_producto: inv.producto.nombre_producto,
          unidad_medida: inv.producto.unidad_medida,
          coste_unitario: costeUnitario,
        },
        stock_actual: actual,
        stock_minimo: minimo,
        deficit,
        cantidad_pedido: cantidadPedido,
        coste_estimado: costeEstimado,
      });
    }

    // Ordenar por coste descendente (lo más caro primero)
    propuestas.sort((a, b) => b.coste_estimado - a.coste_estimado);

    res.json({
      fecha_generacion: new Date().toISOString(),
      total_articulos: propuestas.length,
      total_unidades: totalUnidades,
      total_coste_estimado: Math.round(totalCoste * 100) / 100,
      propuestas,
    });
  } catch (err) {
    console.error('[purchaseController]', err);
    res.status(500).json({ error: 'Error al generar propuesta de compras' });
  }
}

module.exports = { getProposal };
