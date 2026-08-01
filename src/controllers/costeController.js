// KAVANA WAREHOUSE — Coste Controller (Fase 2: control de costes por centro)
// Calcula el coste de material por centro comparándolo con el presupuesto mensual
// que fija la empresa (campo presupuesto_mensual en Centro).
//
// Lógica de coste (simple y honesta):
//   Para cada inventario con conteo físico: consumido = cantidad_actual - stock_fisico
//   (material que "desapareció" del registro al contar).
//   coste_centro = Σ(consumido × coste_unitario)
//   % usado = coste_centro / presupuesto_mensual
//   estado: verde (<70%), ámbar (<100%), rojo (>=100%)
//
// Contrato de salida:
//   { mes, total_coste, total_presupuesto, centros: [{ centro, coste_material,
//     presupuesto_mensual, porcentaje_usado, diferencia, estado }] }

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function estadoSegunPorcentaje(pct) {
  if (pct >= 100) return 'rojo';     // se pasa del presupuesto
  if (pct >= 70) return 'ambar';    // se acerca
  return 'verde';                    // controlado
}

async function getCostes(req, res) {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(401).json({ error: 'No autenticado' });

    let idCliente = usuario.id_cliente;
    if (!idCliente && usuario.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    if (!idCliente) return res.status(403).json({ error: 'Sin empresa asociada' });

    const centros = await prisma.centro.findMany({
      where: { id_cliente: idCliente },
      select: { id_centro: true, nombre_centro: true, presupuesto_mensual: true },
    });

    // Gasto real del MES EN CURSO por centro: suma de consumos (cantidad < 0)
    // desde registro_movimientos. Ya NO se usa la diferencia stock_fisico,
    // que daba cifras desmesuradas (centros con conteo físico viejo) o 0
    // (centros sin conteo físico).
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const movs = await prisma.registroMovimiento.findMany({
      where: {
        cantidad: { lt: 0 },
        fecha_hora: { gte: inicioMes },
        centro: { id_cliente: idCliente },
      },
      select: { id_centro: true, cantidad: true, producto: { select: { coste_unitario: true } } },
    });

    const costePorCentro = new Map();
    for (const m of movs) {
      const coste = Math.abs(Number(m.cantidad)) * Number(m.producto?.coste_unitario || 0);
      costePorCentro.set(m.id_centro, (costePorCentro.get(m.id_centro) || 0) + coste);
    }

    let totalCoste = 0;
    let totalPresupuesto = 0;
    const lista = [];

    for (const c of centros) {
      const coste = Math.round((costePorCentro.get(c.id_centro) || 0) * 100) / 100;
      const presu = c.presupuesto_mensual || 0;
      const pct = presu > 0 ? Math.round((coste / presu) * 100) : null;
      const diferencia = presu > 0 ? Math.round((presu - coste) * 100) / 100 : null;

      totalCoste += coste;
      totalPresupuesto += presu;

      lista.push({
        centro: { id_centro: c.id_centro, nombre_centro: c.nombre_centro },
        coste_material: coste,
        presupuesto_mensual: presu,
        porcentaje_usado: pct,
        diferencia,
        estado: pct === null ? 'sin_presupuesto' : estadoSegunPorcentaje(pct),
      });
    }

    // Ordenar por coste descendente
    lista.sort((a, b) => b.coste_material - a.coste_material);

    res.json({
      mes: new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      total_coste: Math.round(totalCoste * 100) / 100,
      total_presupuesto: Math.round(totalPresupuesto * 100) / 100,
      centros: lista,
    });
  } catch (err) {
    console.error('[costeController]', err);
    res.status(500).json({ error: 'Error al calcular costes' });
  }
}

async function setPresupuesto(req, res) {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(401).json({ error: 'No autenticado' });
    const idCentro = Number(req.params.id_centro);
    if (!Number.isInteger(idCentro) || idCentro <= 0) {
      return res.status(400).json({ error: 'Centro inválido' });
    }
    const valor = Number(req.body.presupuesto_mensual);
    if (!Number.isFinite(valor) || valor < 0) {
      return res.status(400).json({ error: 'Presupuesto inválido' });
    }
    // Scoping multi-tenant: el centro debe pertenecer al cliente del usuario.
    let idCliente = usuario.id_cliente;
    if (!idCliente && usuario.id_usuario) {
      const u = await prisma.usuario.findUnique({ where: { id_usuario: usuario.id_usuario } });
      idCliente = u?.id_cliente;
    }
    const centro = await prisma.centro.findUnique({ where: { id_centro: idCentro } });
    if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
    if (idCliente && centro.id_cliente !== idCliente) {
      return res.status(403).json({ error: 'Sin acceso a este centro' });
    }
    const updated = await prisma.centro.update({
      where: { id_centro: idCentro },
      data: { presupuesto_mensual: valor },
    });
    res.json({ ok: true, presupuesto_mensual: updated.presupuesto_mensual });
  } catch (err) {
    console.error('[costeController:setPresupuesto]', err);
    res.status(500).json({ error: 'Error al guardar presupuesto' });
  }
}

module.exports = { getCostes, setPresupuesto };
