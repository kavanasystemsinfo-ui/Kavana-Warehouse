// =============================================================================
// Seed de incidencias de planta — KAVANA WAREHOUSE demo
// Genera incidencias históricas realistas (seguridad, mantenimiento, electricidad,
// calidad de consumibles) repartidas en los últimos 90 días para que la planta
// ficticia parezca viva.
// Uso: node prisma/seed-incidencias.js
// Idempotente: si ya hay incidencias, no duplica.
// =============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { EMPRESA_DEMO, EMAIL_SISTEMA, CATALOGO_INCIDENCIAS as CATALOGO } from './demo-industrial-data.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Semilla determinista (misma fecha = mismos datos, reproducible)
function rnd(seed) {
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
function entre(min, max, seed) { return Math.floor(min + rnd(seed) * (max - min + 1)); }

async function main() {
  const cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) { console.log('Cliente demo no existe, nada que hacer.'); return; }

  const ya = await prisma.incidencia.count({ where: { centro: { id_cliente: cliente.id_cliente } } });
  if (ya > 0) { console.log(`Ya hay ${ya} incidencias. Sin cambios.`); return; }

  const centros = await prisma.centro.findMany({ where: { id_cliente: cliente.id_cliente }, select: { id_centro: true } });
  if (centros.length === 0) { console.log('Sin centros, nada que hacer.'); return; }

  // Usuario autor: el de sistema si existe, si no cualquiera del cliente
  let autor = await prisma.usuario.findFirst({ where: { email: EMAIL_SISTEMA } });
  if (!autor) autor = await prisma.usuario.findFirst({ where: { id_cliente: cliente.id_cliente }, select: { id_usuario: true } });
  if (!autor) { console.log('Sin usuario autor, nada que hacer.'); return; }

  const TOTAL = 60;
  const ahora = Date.now();
  const incidencias = [];
  for (let i = 0; i < TOTAL; i++) {
    const seed = 1000 + i;
    const grupo = CATALOGO[i % CATALOGO.length];
    const [titulo, descripcion] = grupo.titulos[i % grupo.titulos.length];
    const diasAtras = Math.floor(Math.pow(rnd(seed + 7), 1.4) * 90); // más densidad reciente
    const fecha = new Date(ahora - diasAtras * 24 * 3600 * 1000 - entre(0, 10, seed) * 3600 * 1000);
    // Estados ponderados: ~70% resueltas, ~20% en proceso, ~10% pendientes (las recientes)
    const r = rnd(seed + 13);
    let estado = 'resuelta';
    if (diasAtras < 5 && r > 0.7) estado = 'pendiente';
    else if (r > 0.8) estado = 'en_proceso';
    incidencias.push({
      id_centro: centros[i % centros.length].id_centro,
      id_usuario: autor.id_usuario,
      categoria: grupo.categoria,
      titulo,
      descripcion,
      estado,
      fecha_creacion: fecha,
    });
  }

  await prisma.incidencia.createMany({ data: incidencias });
  console.log(`✓ ${TOTAL} incidencias históricas creadas (90 días, 5 categorías).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
