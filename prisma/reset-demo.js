// Recarga segura de la DEMO — KAVANA WAREHOUSE
//
// Borra el cliente demo (es_demo = true) con todo lo suyo y los productos del
// catálogo antiguo de limpieza, para poder volver a sembrar la demo industrial.
// El catálogo de productos es GLOBAL (sin id_cliente): si no se limpia, los
// productos viejos (lejía, fregonas...) se mezclan con los consumibles nuevos.
//
// Uso:
//   node prisma/reset-demo.js              → SIMULACIÓN: cuenta qué se borraría, no borra nada
//   node prisma/reset-demo.js --confirm    → borra de verdad (una sola transacción)
//
// Recarga completa (npm run demo:recargar):
//   reset-demo --confirm → seed → seed-historico → seed-incidencias
//
// Seguridad:
//   · Muestra el host y la base de datos de destino antes de hacer nada.
//   · Solo toca clientes con es_demo = true; nunca empresas reales.
//   · Un producto antiguo solo se borra si NINGÚN cliente no demo lo usa.
//   · Todo el borrado va en una transacción: o se borra todo o nada.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const CONFIRMAR = process.argv.includes('--confirm');

// Catálogo de la demo anterior (empresa de limpieza). Coincidencia exacta de nombre.
const PRODUCTOS_ANTIGUOS = [
  'Papel higiénico (rollo)', 'Papel industrial (rollo)', 'Papel de cocina (rollo)',
  'Lejía', 'Amoníaco', 'Desengrasante', 'Limpia cristales', 'Fregasuelos', 'Detergente lavadora',
  'Guantes de latex (par)', 'Guantes de nitrilo (par)', 'Guantes de vinilo (par)', 'Guantes gruesos (par)',
  'Bolsas basura 50L (paq)', 'Bolsas basura 100L (paq)', 'Bolsas basura 240L (paq)',
  'Mopa / fregona', 'Cubo de fregar', 'Estropajo / esponja (ud)',
  'Gel hidroalcohólico (500ml)', 'Papel secamanos (paq)', 'Bolsas basura 30L (paq)',
  'Quitagrasas cocina', 'Ambientador industrial', 'Cepillo de fregar (ud)',
];

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
    const [movs, inv, incs, centros, usuarios] = await Promise.all([
      prisma.registroMovimiento.count({ where: filtro }),
      prisma.inventarioCentro.count({ where: filtro }),
      prisma.incidencia.count({ where: filtro }),
      prisma.centro.count({ where: { id_cliente: c.id_cliente } }),
      prisma.usuario.count({ where: { id_cliente: c.id_cliente } }),
    ]);
    console.log(`  · Cliente demo #${c.id_cliente} "${c.nombre_empresa}": ${centros} centros, ${usuarios} usuarios, ${inv} filas de inventario, ${movs} movimientos, ${incs} incidencias`);
  }
  if (demos.length === 0) console.log('  · No hay ningún cliente demo (es_demo = true).');

  // Productos del catálogo antiguo: solo los que no usa ningún cliente real
  const candidatos = await prisma.producto.findMany({
    where: { nombre_producto: { in: PRODUCTOS_ANTIGUOS }, session_id: null },
    select: { id_producto: true, nombre_producto: true },
  });
  const borrables = [];
  const protegidos = [];
  for (const p of candidatos) {
    const fuera = { id_producto: p.id_producto, centro: { id_cliente: { notIn: ids } } };
    const usos = (await prisma.inventarioCentro.count({ where: fuera })) + (await prisma.registroMovimiento.count({ where: fuera }));
    (usos === 0 ? borrables : protegidos).push(p);
  }
  console.log(`  · Productos del catálogo antiguo: ${borrables.length} a borrar, ${protegidos.length} protegidos (los usa un cliente no demo)`);
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

  console.log(`\n✅ Borrado: ${demos.length} cliente(s) demo y ${borrables.length} productos antiguos.`);
  console.log('   Siguiente: node prisma/seed.js && node prisma/seed-historico.js && node prisma/seed-incidencias.js');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
