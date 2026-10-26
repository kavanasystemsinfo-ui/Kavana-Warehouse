// Recarga segura de la DEMO — KAVANA WAREHOUSE
//
// Borra el cliente demo (es_demo = true) con todo lo suyo y los productos del
// catálogo que se quedan sin uso, para poder volver a sembrar la demo industrial.
// El catálogo de productos es GLOBAL (sin id_cliente): si no se limpia, los
// productos viejos (papel higiénico, jabón, fregonas...) se mezclan con los nuevos.
// No depende de nombres: la demo de producción se sembró con versiones antiguas
// del catálogo ("Papel Higiénico (pack 12)", "Jabón de Manos 5L"...) que no
// coinciden con ninguna lista fija.
//
// Uso:
//   node prisma/reset-demo.js              → SIMULACIÓN: cuenta qué se borraría, no borra nada
//   node prisma/reset-demo.js --confirm    → borra de verdad (una sola transacción)
//
// Recarga completa (npm run demo:recargar):
//   reset-demo --confirm → seed → seed-historico
//
// Seguridad:
//   · Muestra el host y la base de datos de destino antes de hacer nada.
//   · Solo toca clientes con es_demo = true; nunca empresas reales.
//   · Un producto solo se borra si NINGÚN cliente no demo lo usa (inventario o
//     movimientos). Los creados por visitantes (session_id) caducan solos: no se tocan.
//   · La simulación imprime la lista completa de productos a borrar: revísala.
//   · Todo el borrado va en una transacción: o se borra todo o nada.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const CONFIRMAR = process.argv.includes('--confirm');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ Falta DATABASE_URL.');
  process.exit(1);
}
let destino = '(no se pudo leer)';
try {
  const u = new URL(url);
  destino = `${u.hostname}${u.pathname}`;
} catch { /* se queda el texto por defecto */ }

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  console.log(`→ Recarga de la demo — base de datos de destino: ${destino}`);
  console.log(CONFIRMAR
    ? '  MODO: BORRADO REAL (--confirm)'
    : '  MODO: simulación — no se borra nada (añade --confirm para ejecutar)');

  const demos = await prisma.cliente.findMany({
    where: { es_demo: true },
    select: { id_cliente: true, nombre_empresa: true },
  });
  const ids = demos.map((c) => c.id_cliente);

  for (const c of demos) {
    const filtro = { centro: { id_cliente: c.id_cliente } };
    const [movs, inv, centros, usuarios] = await Promise.all([
      prisma.registroMovimiento.count({ where: filtro }),
      prisma.inventarioCentro.count({ where: filtro }),
      prisma.centro.count({ where: { id_cliente: c.id_cliente } }),
      prisma.usuario.count({ where: { id_cliente: c.id_cliente } }),
    ]);
    console.log(`  · Cliente demo #${c.id_cliente} "${c.nombre_empresa}": ${centros} centros, ${usuarios} usuarios, ${inv} filas de inventario, ${movs} movimientos`);
  }
  if (demos.length === 0) console.log('  · No hay ningún cliente demo (es_demo = true).');

  // Productos del catálogo: solo se borran los que no usa ningún cliente real.
  // Incluye los creados por visitantes de la demo (session_id) y los de prueba
  // ("Material Prueba Visita"...): la resiembra vuelve a crear el catálogo bueno.
  const candidatos = await prisma.producto.findMany({
    select: { id_producto: true, nombre_producto: true },
  });
  const borrables = [];
  const protegidos = [];
  for (const p of candidatos) {
    const fuera = { id_producto: p.id_producto, centro: { id_cliente: { notIn: ids } } };
    const usos = (await prisma.inventarioCentro.count({ where: fuera })) + (await prisma.registroMovimiento.count({ where: fuera }));
    (usos === 0 ? borrables : protegidos).push(p);
  }
  console.log(`  · Productos del catálogo: ${borrables.length} a borrar, ${protegidos.length} protegidos (los usa un cliente no demo)`);
  for (const p of borrables) console.log(`      borrar:    ${p.nombre_producto}`);
  for (const p of protegidos) console.log(`      protegido: ${p.nombre_producto}`);

  if (demos.length === 0 && borrables.length === 0) {
    console.log('\nNada que borrar.');
    return;
  }
  if (!CONFIRMAR) {
    console.log('\nSimulación terminada. No se ha borrado nada.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const id of ids) {
      const uids = (await tx.usuario.findMany({ where: { id_cliente: id }, select: { id_usuario: true } })).map((u) => u.id_usuario);
      await tx.registroMovimiento.deleteMany({ where: { centro: { id_cliente: id } } });
      await tx.inventarioCentro.deleteMany({ where: { centro: { id_cliente: id } } });
      // La función Incidencias ya no existe, pero la tabla se conserva: se
      // borran las filas antiguas de la demo para que no bloqueen el borrado.
      await tx.incidencia.deleteMany({ where: { centro: { id_cliente: id } } });
      await tx.asignacionPersonal.deleteMany({ where: { centro: { id_cliente: id } } });
      await tx.reglaNotificacion.deleteMany({ where: { id_supervisor: { in: uids } } });
      await tx.usuario.deleteMany({ where: { id_cliente: id } });
      await tx.centro.deleteMany({ where: { id_cliente: id } });
      await tx.cliente.deleteMany({ where: { id_cliente: id } });
    }
    if (borrables.length > 0) {
      await tx.producto.deleteMany({ where: { id_producto: { in: borrables.map((p) => p.id_producto) } } });
    }
  }, { timeout: 120_000, maxWait: 20_000 });

  console.log(`\n✅ Borrado: ${demos.length} cliente(s) demo y ${borrables.length} productos del catálogo.`);
  console.log('   Siguiente: node prisma/seed.js && node prisma/seed-historico.js');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
