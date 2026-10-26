// Seed de HISTÓRICO — Empresa ficticia "Industrias Metálicas Demo, S.L."
// Genera 3 meses de datos realistas para que los reclutadores vean la app como
// si estuviera en producción: consumos, reposiciones, recuentos, costes y
// alertas con historia real.
//
// Cada sección solo consume lo que tiene en su inventario (no el catálogo
// global), con el consumo diario definido en demo-industrial-data.js.
//
// Uso: node prisma/seed-historico.js   (antes: node prisma/seed.js)
// Idempotente: si el cliente demo ya tiene movimientos históricos, NO duplica.
// HISTORICO_DIAS (opcional) acorta el histórico, p. ej. para pruebas en CI.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EMPRESA_DEMO,
  perfilesPorPar,
  clavePar,
  crearRnd,
  entre,
  consumoDelDia,
  reposicionLunes,
  personalPorSeccion,
  aLas,
} from './demo-industrial-data.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DIAS = Math.max(1, parseInt(process.env.HISTORICO_DIAS || '90', 10) || 90);
const DIA_MS = 24 * 60 * 60 * 1000;
const LOTE = 500;

async function insertarMovimientos(filas) {
  for (let i = 0; i < filas.length; i += LOTE) {
    await prisma.registroMovimiento.createMany({ data: filas.slice(i, i + LOTE) });
  }
}

async function main() {
  console.log(`→ Seed HISTÓRICO (${DIAS} días) — planta ficticia en producción...`);

  const cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) {
    console.error('  ✗ Cliente demo no existe. Ejecuta primero: node prisma/seed.js');
    process.exit(1);
  }
  const idCliente = cliente.id_cliente;

  // Si ya hay un histórico real (miles de movimientos), no duplicar.
  // El seed base crea 0 movimientos; un histórico genera varios miles.
  // Umbral de 200 distingue ambos casos.
  const yaTieneHistorico = await prisma.registroMovimiento.count({
    where: { centro: { id_cliente: idCliente }, fecha_hora: { lt: new Date(Date.now() - DIA_MS) } },
  });
  if (yaTieneHistorico > 200) {
    console.log(`  • Ya existe histórico (${yaTieneHistorico} movimientos). No se duplica.`);
    return;
  }

  // 1. Inventario real de la demo: solo los pares sección-producto del seed base
  const perfiles = perfilesPorPar();
  const filasInv = await prisma.inventarioCentro.findMany({
    where: { centro: { id_cliente: idCliente } },
    include: { centro: { select: { nombre_centro: true } }, producto: { select: { nombre_producto: true } } },
  });
  const pares = [];
  for (const inv of filasInv) {
    const perfil = perfiles.get(clavePar(inv.centro.nombre_centro, inv.producto.nombre_producto));
    if (!perfil) continue;
    pares.push({
      id_centro: inv.id_centro,
      id_producto: inv.id_producto,
      perfil,
      stock: inv.cantidad_actual,
    });
  }
  if (pares.length === 0) {
    console.error('  ✗ Sin inventario demo. Ejecuta primero: node prisma/seed.js');
    process.exit(1);
  }

  // 2. Autores: los consumos los firma un operario de la sección; recuentos y
  //    reposiciones, el responsable de la sección.
  const personal = await personalPorSeccion(prisma, idCliente);
  const oficina = await prisma.usuario.findFirst({
    where: { id_cliente: idCliente, estado: 'activo', rol: { in: ['oficina', 'supervisor'] } },
    select: { id_usuario: true },
  });
  if (!oficina) {
    console.error('  ✗ Sin usuarios del cliente demo. Ejecuta primero: node prisma/seed.js');
    process.exit(1);
  }
  const rnd = crearRnd(42);
  const operarioDe = (idCentro) => {
    const ops = personal.get(idCentro)?.operarios || [];
    return ops.length ? ops[Math.floor(rnd() * ops.length)] : oficina.id_usuario;
  };
  const responsableDe = (idCentro) => personal.get(idCentro)?.responsable ?? oficina.id_usuario;

  // 3. Simulación día a día: consumo diario + reposición semanal + recuento mensual
  const ahora = Date.now();
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  inicio.setDate(inicio.getDate() - DIAS); // días de calendario: sin desfase por el cambio de hora

  const movimientos = [];
  const fecha = new Date(inicio);
  while (fecha <= hoy) {
    const diaSemana = fecha.getDay();
    const esFinSemana = diaSemana === 0 || diaSemana === 6;

    for (const par of pares) {
      const { consumoDia } = par.perfil;

      // Consumo diario (la planta casi para en fin de semana). No se consume lo que no hay.
      const consumo = Math.min(consumoDelDia(consumoDia, rnd, esFinSemana), par.stock);
      const tsConsumo = aLas(fecha, entre(rnd, 6 * 60, 20 * 60)); // 6:00-20:00
      if (consumo > 0 && tsConsumo.getTime() <= ahora) {
        par.stock -= consumo;
        movimientos.push({
          id_usuario: operarioDe(par.id_centro),
          id_centro: par.id_centro,
          id_producto: par.id_producto,
          cantidad: -consumo,
          tipo: 'movimiento',
          fecha_hora: tsConsumo,
        });
      }

      // Reposición semanal (lunes por la mañana)
      if (diaSemana === 1) {
        const repo = reposicionLunes(par.perfil, par.stock);
        const tsRepo = aLas(fecha, entre(rnd, 7 * 60 + 30, 9 * 60)); // 7:30-9:00
        if (repo > 0 && tsRepo.getTime() <= ahora) {
          par.stock += repo;
          movimientos.push({
            id_usuario: responsableDe(par.id_centro),
            id_centro: par.id_centro,
            id_producto: par.id_producto,
            cantidad: repo,
            tipo: 'movimiento',
            fecha_hora: tsRepo,
          });
        }
      }
    }

    // Recuento mensual (día 1): el responsable de la sección hace conteo físico.
    // Las secciones pendientes de contar (físico null, p. ej. Pintura) no tienen recuentos.
    if (fecha.getDate() === 1) {
      for (const par of pares) {
        if (par.perfil.fisico === null) continue;
        if (rnd() < 0.3) continue; // no todo se cuenta
        const tsRecuento = aLas(fecha, entre(rnd, 9 * 60 + 30, 12 * 60 + 30)); // 9:30-12:30
        if (tsRecuento.getTime() > ahora) continue;
        // Pequeña merma realista: de -4 % a +2 % del stock (mínimo ±1 unidad)
        const tope = Math.max(1, Math.ceil(par.stock * 0.04));
        const fisico = Math.max(0, par.stock + entre(rnd, -tope, Math.max(1, Math.ceil(par.stock * 0.02))));
        par.stock = fisico;
        movimientos.push({
          id_usuario: responsableDe(par.id_centro),
          id_centro: par.id_centro,
          id_producto: par.id_producto,
          cantidad: fisico,
          tipo: 'recuento',
          fecha_hora: tsRecuento,
        });
      }
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  await insertarMovimientos(movimientos);

  // 4. Sincronizar inventario_centros con el stock final simulado y fijar los
  //    escenarios diseñados: la demo debe enseñar siempre las mismas diferencias
  //    (merma estrella, sección sin contar, producto bajo mínimo).
  for (const par of pares) {
    const { registrado, fisico, minimo } = par.perfil;
    const diferencia = fisico === null ? 0 : fisico - registrado;
    // Con merma (diferencia < 0) el registrado debe cubrirla, para que el físico
    // no quede en negativo y la diferencia sea exactamente la diseñada.
    const cantidad = registrado < minimo ? registrado : Math.max(par.stock, -diferencia);
    const stockFisico = fisico === null ? null : cantidad + diferencia;
    await prisma.inventarioCentro.updateMany({
      where: { id_centro: par.id_centro, id_producto: par.id_producto },
      data: { cantidad_actual: cantidad, stock_fisico: stockFisico, fecha_actualizacion: new Date() },
    });
  }

  console.log(`\n✅ Histórico generado: ${movimientos.length} movimientos en ${DIAS} días`);
  console.log(`   Pares sección-producto: ${pares.length}`);
  console.log('   Login: warehouse / kavana');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
