// =============================================================================
// Seed de incidencias de instalaciones — KAVANA WAREHOUSE demo
// Genera incidencias históricas realistas repartidas en los últimos 90 días
// para que la empresa ficticia parezca viva (la tabla estaba vacía).
// Uso: node prisma/seed-incidencias.js
// Idempotente: si ya hay incidencias, no duplica.
// =============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMPRESA_DEMO = 'Limpiezas Valencia Centro, S.L.';

// Semilla determinista (misma fecha = mismos datos, reproducible)
function rnd(seed) {
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
function entre(min, max, seed) { return Math.floor(min + rnd(seed) * (max - min + 1)); }

const CATALOGO = [
  { categoria: 'limpieza', titulos: [
    ['Suelo resbaladizo en el hall de entrada', 'El suelo de la entrada queda resbaladizo tras la fregada de media mañana.'],
    ['Olor fuerte en los baños', 'Persiste un olor fuerte en el baño de la planta 1 a pesar del repaso.'],
    ['Manchas persistentes en los cristales', 'Los cristales del acceso principal acumulan manchas que no salen con el producto habitual.'],
    ['Papelera central desbordada', 'La papelera del hall central se llena a media tarde y desborda.'],
  ]},
  { categoria: 'fontaneria', titulos: [
    ['Fuga de agua en el lavabo del baño', 'El lavabo del baño principal pierde agua por la base de la llave.'],
    ['Inodoro atascado', 'El inodoro de la planta 2 no descarga bien.'],
    ['Grifo goteando en la cocina', 'El grifo de la cocina del personal gotea de forma continua.'],
    ['Tubería con pérdida bajo el fregadero', 'Se acumula agua bajo el fregadero del office.'],
  ]},
  { categoria: 'electricidad', titulos: [
    ['Luz fundida en el pasillo', 'El tubo del pasillo principal está fundido.'],
    ['Enchufe que chispea', 'Un enchufe de la sala de reuniones hace chispas al conectar.'],
    ['Interruptor de la escalera no funciona', 'El interruptor del rellano no enciende el tramo de escalera.'],
    ['Fluorescente parpadeando en el almacén', 'El fluorescente del almacén parpadea de forma intermitente.'],
  ]},
  { categoria: 'cerrajeria', titulos: [
    ['Puerta de acceso no cierra bien', 'La puerta de acceso al patio no cierra del todo y queda abierta.'],
    ['Cerrojo atascado en el vestuario', 'El cerrojo del vestuario se atasca al girar la llave.'],
    ['Llave rota en la cerradura', 'Quedó media llave dentro de la cerradura del almacén.'],
    ['Puerta de emergencia bloqueada', 'La puerta de emergencia lateral no abre con facilidad.'],
  ]},
  { categoria: 'otros', titulos: [
    ['Cristal roto en ventana', 'La ventana del despacho tiene un cristal agrietado.'],
    ['Radiador frío en la sala de juntas', 'El radiador de la sala de juntas no calienta.'],
    ['Ruido en el ascensor', 'El ascensor hace un ruido metálico al pasar la planta 3.'],
    ['Persiana atascada', 'La persiana de la oficina 2 no sube más de medio metro.'],
  ]},
];

async function main() {
  const cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) { console.log('Cliente demo no existe, nada que hacer.'); return; }

  const ya = await prisma.incidencia.count({ where: { centro: { id_cliente: cliente.id_cliente } } });
  if (ya > 0) { console.log(`Ya hay ${ya} incidencias. Sin cambios.`); return; }

  const centros = await prisma.centro.findMany({ where: { id_cliente: cliente.id_cliente }, select: { id_centro: true } });
  if (centros.length === 0) { console.log('Sin centros, nada que hacer.'); return; }

  // Usuario autor: el de sistema si existe, si no cualquiera del cliente
  let autor = await prisma.usuario.findFirst({ where: { email: 'sistema.demo@kavanawarehouse.com' } });
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
