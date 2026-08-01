// Kavana CleanStock — Deviation Controller (modelo de MERMAS de inventario)
// Compara stock REGISTRADO (cantidad_actual) vs stock FÍSICO (conteo de la encargada).
//   desviacion = cantidad_actual - stock_fisico
//     > 0  → Falta material (se llevaron / perdieron)        → estado "falta"
//     < 0  → Sobra material (error a favor, no crítico)      → estado "sobra"
//     null → Pendiente de contar                             → estado "pendiente"
// Contrato de salida (ver dashboard/src/lib/api.ts -> DeviationsData):
//   { mes, total_desviaciones, desviaciones: [{ centro, producto, cantidad_actual,
//     stock_fisico, desviacion, porcentaje_desviacion, coste_desviacion, estado }] }

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calcularEstado(desviacion) {
  if (desviacion === null || desviacion === undefined) return 'pendiente';
  if (desviacion > 0) return 'falta';
  if (desviacion < 0) return 'sobra';
  return 'normal';
}

async function getDeviations(req, res) {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(401).json({ error: 'No autenticado' });

    // El token puede no traer id_cliente; lo resolvemos desde la BD.
    let idCliente = usuario.id_cliente;
    if (!idCliente && usuario.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });

    const filtroCentro = req.query.centro ? Number(req.query.centro) : null;

    const where = { centro: { id_cliente: idCliente } };
    if (filtroCentro) where.id_centro = filtroCentro;

    const inventarios = await prisma.inventarioCentro.findMany({
      where,
      include: { centro: true, producto: true },
    });

    const desviaciones = inventarios
      .map((inv) => {
        const registrado = inv.cantidad_actual;
        const fisico = inv.stock_fisico;
        const desviacion = fisico === null ? null : registrado - fisico;
        const porcentaje = fisico === null
          ? null
          : (registrado === 0 ? 0 : Math.round(((registrado - fisico) / registrado) * 100));
        const coste = desviacion === null ? 0 : Math.max(0, desviacion) * (inv.producto.coste_unitario || 0);
        return {
          centro: { id_centro: inv.centro.id_centro, nombre_centro: inv.centro.nombre_centro },
          producto: {
            id_producto: inv.producto.id_producto,
            nombre_producto: inv.producto.nombre_producto,
            unidad_medida: inv.producto.unidad_medida,
            coste_unitario: inv.producto.coste_unitario,
          },
          cantidad_actual: registrado,
          stock_fisico: fisico,
          desviacion,
          porcentaje_desviacion: porcentaje,
          coste_desviacion: Math.round(coste * 100) / 100,
          estado: calcularEstado(desviacion),
        };
      })
      .filter((d) => d.estado !== 'normal') // Solo mostramos lo relevante (falta/sobra/pendiente)
      .sort((a, b) => {
        // Críticos (falta) primero, luego pendiente, luego sobra
        const orden = { falta: 0, pendiente: 1, sobra: 2 };
        return orden[a.estado] - orden[b.estado];
      });

    const total = desviaciones.filter((d) => d.estado === 'falta').length;

    res.json({
      mes: new Date().toISOString().slice(0, 7),
      total_desviaciones: total,
      desviaciones,
    });
  } catch (err) {
    console.error('[deviationController]', err);
    res.status(500).json({ error: 'Error al calcular desviaciones' });
  }
}

// Guardar conteo físico de un producto en un centro
async function guardarConteo(req, res) {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(401).json({ error: 'No autenticado' });
    let idCliente = usuario.id_cliente;
    if (!idCliente && usuario.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });

    const idCentro = Number(req.params.id_centro);
    const idProducto = Number(req.params.id_producto);
    const stockFisico = Number(req.body.stock_fisico);

    if (!Number.isFinite(stockFisico) || stockFisico < 0) {
      return res.status(400).json({ error: 'Stock físico inválido' });
    }

    // Verificar que el centro pertenece al cliente
    const centro = await prisma.centro.findFirst({ where: { id_centro: idCentro, id_cliente: idCliente } });
    if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });

    const inv = await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro: idCentro, id_producto: idProducto } },
      update: { stock_fisico: stockFisico, fecha_actualizacion: new Date() },
      create: {
        id_centro: idCentro,
        id_producto: idProducto,
        cantidad_actual: stockFisico,
        stock_fisico: stockFisico,
      },
    });

    res.json({ ok: true, inventario: inv });
  } catch (err) {
    console.error('[deviationController:guardarConteo]', err);
    res.status(500).json({ error: 'Error al guardar conteo' });
  }
}

module.exports = { getDeviations, guardarConteo };
