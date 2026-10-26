// =============================================================================
// Datos de la DEMO industrial — KAVANA WAREHOUSE
// Fuente única para seed-demo-industrial.js, seed-historico.js y simulate-daily.js.
// Planta metalúrgica INVENTADA: ningún dato real.
//
// Caso de uso: control de consumibles indirectos de planta (EPIs, abrasivos,
// hilo de soldadura, lubricantes, embalaje) por sección, como herramienta de
// mejora continua: ver dónde se consume más de lo previsto y dónde el stock
// registrado no coincide con el contado.
//
// "Centro" es el centro de coste / sección de la planta. El nombre del modelo
// de datos se mantiene; solo cambian los datos.
// =============================================================================

export const EMPRESA_DEMO = 'Industrias Metálicas Demo, S.L.';
export const EMAIL_CONTACTO = 'contacto@industrias-metalicas.test';
export const EMAIL_SISTEMA = 'sistema.demo@kavanawarehouse.com'; // autor de reserva si una sección no tiene personal
export const SUPERVISOR_DEMO = {
  nombre: 'Responsable de Planta',
  email: 'supervisor.demo@kavanawarehouse.com',
  username: 'warehouse', // credenciales públicas de la demo: warehouse / kavana
};

// Responsable de cada sección: hace los recuentos físicos y las reposiciones.
// Sale en la página Responsables y firma el histórico de recuentos.
export const RESPONSABLES_SECCION = {
  'Perfilado': 'Rosa Gallego Peña',
  'Corte y punzonado': 'Tomás Herrero Vila',
  'Soldadura': 'Iván Lozano Campos',
  'Pintura y acabado': 'Silvia Rubio Mora',
  'Mantenimiento': 'Ernesto Pascual Soler',
  'Expediciones': 'Lorena Vega Bravo',
};
export const emailResponsable = (seccion) =>
  `responsable.${seccion.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')}@industrias-metalicas.test`;

// Presupuesto mensual por sección (€), calibrado con el consumo simulado
// (ver consumoMensualEsperado). Soldadura queda algo por debajo de su consumo
// para que la demo muestre un centro que "se pasa" del presupuesto.
export const SECCIONES = [
  { nombre: 'Perfilado', dir: 'Nave 1 · Líneas de perfilado', presu: 1600 },
  { nombre: 'Corte y punzonado', dir: 'Nave 1 · Corte y punzonado', presu: 1550 },
  { nombre: 'Soldadura', dir: 'Nave 2 · Soldadura y montaje', presu: 1750 },
  { nombre: 'Pintura y acabado', dir: 'Nave 2 · Cabina de pintura', presu: 1250 },
  { nombre: 'Mantenimiento', dir: 'Nave 3 · Taller de mantenimiento', presu: 1100 },
  { nombre: 'Expediciones', dir: 'Nave 3 · Embalaje y expediciones', presu: 1200 },
];

// Catálogo global de consumibles indirectos.
export const PRODUCTOS = [
  // EPIs
  { nombre: 'Guantes anticorte nivel C (par)', unidad: 'pares', coste: 4.2, min: 20 },
  { nombre: 'Guantes de soldador (par)', unidad: 'pares', coste: 6.5, min: 8 },
  { nombre: 'Guantes de nitrilo (par)', unidad: 'pares', coste: 0.3, min: 50 },
  { nombre: 'Gafas de protección (ud)', unidad: 'unidades', coste: 3.1, min: 10 },
  { nombre: 'Tapones auditivos (par)', unidad: 'pares', coste: 0.18, min: 100 },
  { nombre: 'Mascarilla FFP2 (ud)', unidad: 'unidades', coste: 0.95, min: 40 },
  { nombre: 'Mono desechable (ud)', unidad: 'unidades', coste: 3.2, min: 10 },
  { nombre: 'Filtros de mascarilla A2P3 (par)', unidad: 'pares', coste: 7.5, min: 6 },
  // Abrasivos y corte
  { nombre: 'Disco de corte 125 mm (ud)', unidad: 'unidades', coste: 1.1, min: 30 },
  { nombre: 'Disco de corte 230 mm (ud)', unidad: 'unidades', coste: 2.6, min: 10 },
  { nombre: 'Disco de desbaste 125 mm (ud)', unidad: 'unidades', coste: 1.6, min: 20 },
  { nombre: 'Disco de láminas 125 mm (ud)', unidad: 'unidades', coste: 3.2, min: 15 },
  { nombre: 'Cepillo de acero (ud)', unidad: 'unidades', coste: 4.5, min: 6 },
  { nombre: 'Brocas HSS (ud)', unidad: 'unidades', coste: 3.8, min: 8 },
  // Soldadura
  { nombre: 'Hilo de soldadura MIG 1,0 mm (bobina 15 kg)', unidad: 'bobinas', coste: 52, min: 3 },
  { nombre: 'Boquilla de soldadura (ud)', unidad: 'unidades', coste: 2.4, min: 20 },
  { nombre: 'Punta de contacto (ud)', unidad: 'unidades', coste: 0.9, min: 40 },
  { nombre: 'Botella de gas Ar/CO2', unidad: 'botellas', coste: 34, min: 2 },
  { nombre: 'Spray antiproyecciones (ud)', unidad: 'unidades', coste: 5.5, min: 6 },
  { nombre: 'Cubre-filtro de pantalla de soldar (ud)', unidad: 'unidades', coste: 1.2, min: 20 },
  // Lubricantes y limpieza industrial
  { nombre: 'Aceite de corte (litros)', unidad: 'litros', coste: 3.9, min: 40 },
  { nombre: 'Aceite hidráulico (litros)', unidad: 'litros', coste: 4.8, min: 20 },
  { nombre: 'Grasa multiusos (cartucho)', unidad: 'cartuchos', coste: 3.2, min: 10 },
  { nombre: 'Spray lubricante (ud)', unidad: 'unidades', coste: 4.2, min: 10 },
  { nombre: 'Desengrasante industrial (litros)', unidad: 'litros', coste: 3.0, min: 20 },
  { nombre: 'Trapos de algodón (kg)', unidad: 'kilos', coste: 2.2, min: 15 },
  { nombre: 'Papel industrial (rollo)', unidad: 'rollos', coste: 1.9, min: 10 },
  { nombre: 'Absorbente para derrames (saco)', unidad: 'sacos', coste: 7.5, min: 4 },
  // Pintura y acabado
  { nombre: 'Disolvente de limpieza (litros)', unidad: 'litros', coste: 2.8, min: 15 },
  { nombre: 'Cinta de enmascarar (rollo)', unidad: 'rollos', coste: 1.9, min: 20 },
  { nombre: 'Filtros de cabina de pintura (ud)', unidad: 'unidades', coste: 6.8, min: 8 },
  // Embalaje y expediciones
  { nombre: 'Fleje de polipropileno (rollo)', unidad: 'rollos', coste: 14, min: 6 },
  { nombre: 'Sellos de fleje (caja)', unidad: 'cajas', coste: 6.5, min: 4 },
  { nombre: 'Film estirable (rollo)', unidad: 'rollos', coste: 9.5, min: 6 },
  { nombre: 'Esquineros de cartón (ud)', unidad: 'unidades', coste: 0.35, min: 100 },
  { nombre: 'Etiquetas de trazabilidad (rollo)', unidad: 'rollos', coste: 8, min: 5 },
  { nombre: 'Cinta de embalaje (ud)', unidad: 'unidades', coste: 1.4, min: 20 },
  { nombre: 'Bridas de nylon (bolsa 100)', unidad: 'bolsas', coste: 3.5, min: 6 },
];

// Inventario por sección:
//   [sección, producto, registrado, físico|null, mínimo, consumo por día laborable]
// "registrado" es lo que dice el sistema; "físico" lo contado por el responsable
// (null = pendiente de contar). La diferencia físico − registrado es la merma.
//
// Escenarios diseñados (la demo debe enseñarlos siempre, ver prisma/seed-historico.js):
//   · Soldadura / hilo MIG: registrado 8, físico 5 → faltan 3 bobinas (156 €)  ← merma estrella
//   · Perfilado / guantes anticorte: registrado 60, físico 52 → faltan 8 pares
//   · Pintura y acabado: todo pendiente de contar (físico null)
//   · Expediciones / fleje: registrado 4 < mínimo 6 → entra en la propuesta de compra
//   · Mantenimiento / aceite hidráulico: físico > registrado (sobrante leve)
export const INVENTARIO = [
  // Perfilado
  ['Perfilado', 'Guantes anticorte nivel C (par)', 60, 52, 20, 3],
  ['Perfilado', 'Gafas de protección (ud)', 24, 24, 10, 0.4],
  ['Perfilado', 'Tapones auditivos (par)', 400, 400, 100, 8],
  ['Perfilado', 'Mascarilla FFP2 (ud)', 120, 120, 40, 2],
  ['Perfilado', 'Aceite de corte (litros)', 80, 80, 40, 6],
  ['Perfilado', 'Grasa multiusos (cartucho)', 24, 24, 10, 0.8],
  ['Perfilado', 'Spray lubricante (ud)', 18, 18, 10, 0.5],
  ['Perfilado', 'Trapos de algodón (kg)', 40, 40, 15, 2],
  ['Perfilado', 'Papel industrial (rollo)', 30, 30, 10, 1.2],
  ['Perfilado', 'Disco de corte 125 mm (ud)', 60, 60, 30, 2.5],
  ['Perfilado', 'Fleje de polipropileno (rollo)', 12, 12, 6, 0.4],
  ['Perfilado', 'Sellos de fleje (caja)', 8, 8, 4, 0.4],
  // Corte y punzonado
  ['Corte y punzonado', 'Guantes anticorte nivel C (par)', 60, 60, 20, 3],
  ['Corte y punzonado', 'Gafas de protección (ud)', 20, 20, 10, 0.4],
  ['Corte y punzonado', 'Tapones auditivos (par)', 300, 300, 100, 6],
  ['Corte y punzonado', 'Mascarilla FFP2 (ud)', 100, 100, 40, 2],
  ['Corte y punzonado', 'Disco de corte 230 mm (ud)', 40, 40, 10, 1.5],
  ['Corte y punzonado', 'Disco de corte 125 mm (ud)', 80, 80, 30, 3],
  ['Corte y punzonado', 'Brocas HSS (ud)', 20, 20, 8, 0.3],
  ['Corte y punzonado', 'Aceite de corte (litros)', 100, 100, 40, 7],
  ['Corte y punzonado', 'Desengrasante industrial (litros)', 40, 40, 20, 1.5],
  ['Corte y punzonado', 'Trapos de algodón (kg)', 40, 40, 15, 2],
  ['Corte y punzonado', 'Papel industrial (rollo)', 24, 24, 10, 1],
  ['Corte y punzonado', 'Absorbente para derrames (saco)', 8, 8, 4, 0.15],
  // Soldadura
  ['Soldadura', 'Hilo de soldadura MIG 1,0 mm (bobina 15 kg)', 8, 5, 3, 0.45],
  ['Soldadura', 'Boquilla de soldadura (ud)', 60, 60, 20, 3],
  ['Soldadura', 'Punta de contacto (ud)', 150, 150, 40, 8],
  ['Soldadura', 'Botella de gas Ar/CO2', 6, 6, 2, 0.35],
  ['Soldadura', 'Spray antiproyecciones (ud)', 12, 12, 6, 0.5],
  ['Soldadura', 'Cubre-filtro de pantalla de soldar (ud)', 50, 50, 20, 2],
  ['Soldadura', 'Guantes de soldador (par)', 24, 24, 8, 1.2],
  ['Soldadura', 'Disco de desbaste 125 mm (ud)', 90, 90, 20, 5],
  ['Soldadura', 'Disco de láminas 125 mm (ud)', 40, 40, 15, 2],
  ['Soldadura', 'Cepillo de acero (ud)', 12, 12, 6, 0.4],
  ['Soldadura', 'Gafas de protección (ud)', 20, 20, 10, 0.5],
  ['Soldadura', 'Mono desechable (ud)', 20, 20, 10, 0.8],
  // Pintura y acabado (pendiente de contar)
  ['Pintura y acabado', 'Disolvente de limpieza (litros)', 60, null, 15, 3],
  ['Pintura y acabado', 'Cinta de enmascarar (rollo)', 80, null, 20, 4],
  ['Pintura y acabado', 'Filtros de cabina de pintura (ud)', 20, null, 8, 0.5],
  ['Pintura y acabado', 'Guantes de nitrilo (par)', 400, null, 50, 18],
  ['Pintura y acabado', 'Mono desechable (ud)', 30, null, 10, 1.5],
  ['Pintura y acabado', 'Filtros de mascarilla A2P3 (par)', 12, null, 6, 0.5],
  ['Pintura y acabado', 'Papel industrial (rollo)', 30, null, 10, 1.5],
  ['Pintura y acabado', 'Trapos de algodón (kg)', 40, null, 15, 2.5],
  ['Pintura y acabado', 'Mascarilla FFP2 (ud)', 100, null, 40, 3],
  // Mantenimiento
  ['Mantenimiento', 'Aceite hidráulico (litros)', 100, 104, 20, 3],
  ['Mantenimiento', 'Grasa multiusos (cartucho)', 30, 31, 10, 1],
  ['Mantenimiento', 'Spray lubricante (ud)', 24, 24, 10, 1],
  ['Mantenimiento', 'Bridas de nylon (bolsa 100)', 20, 20, 6, 0.7],
  ['Mantenimiento', 'Brocas HSS (ud)', 16, 16, 8, 0.3],
  ['Mantenimiento', 'Disco de corte 125 mm (ud)', 40, 40, 15, 1.5],
  ['Mantenimiento', 'Cepillo de acero (ud)', 8, 8, 6, 0.2],
  ['Mantenimiento', 'Guantes anticorte nivel C (par)', 30, 30, 10, 1],
  ['Mantenimiento', 'Trapos de algodón (kg)', 30, 30, 15, 1.5],
  ['Mantenimiento', 'Desengrasante industrial (litros)', 30, 30, 20, 1.5],
  ['Mantenimiento', 'Absorbente para derrames (saco)', 6, 6, 4, 0.2],
  ['Mantenimiento', 'Gafas de protección (ud)', 12, 12, 6, 0.3],
  // Expediciones
  ['Expediciones', 'Fleje de polipropileno (rollo)', 4, 4, 6, 0.6],
  ['Expediciones', 'Sellos de fleje (caja)', 12, 12, 4, 0.5],
  ['Expediciones', 'Film estirable (rollo)', 14, 14, 6, 0.8],
  ['Expediciones', 'Esquineros de cartón (ud)', 600, 600, 100, 30],
  ['Expediciones', 'Etiquetas de trazabilidad (rollo)', 10, 10, 5, 0.6],
  ['Expediciones', 'Cinta de embalaje (ud)', 36, 36, 20, 2],
  ['Expediciones', 'Guantes anticorte nivel C (par)', 50, 50, 20, 2],
  ['Expediciones', 'Gafas de protección (ud)', 14, 14, 10, 0.2],
  ['Expediciones', 'Tapones auditivos (par)', 200, 200, 100, 3],
  ['Expediciones', 'Bridas de nylon (bolsa 100)', 20, 20, 6, 0.3],
];

// ----------------------------------------------------------------- utilidades

// Generador pseudoaleatorio determinista (LCG): misma semilla = mismos datos.
// Cada llamada avanza el estado, así que dos productos el mismo día no reciben
// el mismo número (la versión anterior de simulate-daily devolvía siempre el
// mismo valor dentro del día).
export function crearRnd(seed) {
  let s = seed >>> 0;
  return function rnd() {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return (s % 2147483648) / 2147483648;
  };
}

export function entre(rnd, min, max) {
  return Math.round(min + rnd() * (max - min));
}

// Consumo (unidades enteras) de un día. Fin de semana: planta casi parada.
export function consumoDelDia(consumoDia, rnd, esFinSemana) {
  const factor = esFinSemana ? 0.1 : 1;
  const esperado = consumoDia * factor * (0.6 + 0.8 * rnd());
  const base = Math.floor(esperado);
  return base + (rnd() < esperado - base ? 1 : 0);
}

// Nivel al que repone el lunes: dos veces el mínimo o mínimo + 15 días de consumo.
export function nivelObjetivo(minimo, consumoDia) {
  return Math.max(minimo * 2, Math.ceil(minimo + consumoDia * 15));
}

// Escenario "bajo mínimo" (registrado < mínimo en INVENTARIO, p. ej. el fleje de
// Expediciones): se repone poco y tarde para que siga por debajo del mínimo y
// la propuesta de compra lo enseñe siempre.
export const esBajoMinimo = (perfil) => perfil.registrado < perfil.minimo;

// Reposición del lunes para un par: cuánto entra (0 si no toca reponer).
export function reposicionLunes(perfil, cantidad) {
  if (esBajoMinimo(perfil)) {
    const techo = perfil.minimo - 1;
    return cantidad < techo - 1 ? techo - cantidad : 0;
  }
  const puntoPedido = perfil.minimo + Math.ceil(perfil.consumoDia * 5);
  return cantidad <= puntoPedido ? Math.max(0, nivelObjetivo(perfil.minimo, perfil.consumoDia) - cantidad) : 0;
}

// Personal activo de cada sección del cliente demo: id_centro -> { operarios, responsable }.
// Los consumos los firma un operario de la sección; recuentos y reposiciones, su responsable.
export async function personalPorSeccion(prisma, idCliente) {
  const asignaciones = await prisma.asignacionPersonal.findMany({
    where: { fecha_fin: null, centro: { id_cliente: idCliente }, usuario: { estado: 'activo' } },
    select: { id_centro: true, id_usuario: true, usuario: { select: { rol: true } } },
    orderBy: { id_usuario: 'asc' },
  });
  const m = new Map();
  for (const a of asignaciones) {
    if (!m.has(a.id_centro)) m.set(a.id_centro, { operarios: [], responsable: null });
    const p = m.get(a.id_centro);
    if (a.usuario.rol === 'responsable') p.responsable ??= a.id_usuario;
    else if (a.usuario.rol === 'operario') p.operarios.push(a.id_usuario);
  }
  return m;
}

// Fecha del día + minutos desde las 00:00 (las horas salen con minutos, no en punto).
export const aLas = (dia, minutos) => new Date(dia.getTime() + minutos * 60 * 1000);

export const clavePar = (seccion, producto) => `${seccion}|${producto}`;

// Mapa "sección|producto" -> definición, para que histórico y simulación
// recorran SOLO lo que cada sección tiene en su inventario.
export function perfilesPorPar() {
  const m = new Map();
  for (const [seccion, producto, registrado, fisico, minimo, consumoDia] of INVENTARIO) {
    m.set(clavePar(seccion, producto), { seccion, producto, registrado, fisico, minimo, consumoDia });
  }
  return m;
}

// Consumo mensual esperado (€) por sección: ~21,7 días laborables + fines de semana al 10 %.
export function consumoMensualEsperado() {
  const coste = new Map(PRODUCTOS.map((p) => [p.nombre, p.coste]));
  const total = new Map();
  for (const [seccion, producto, , , , consumoDia] of INVENTARIO) {
    const eur = consumoDia * (21.7 + 8.6 * 0.1) * (coste.get(producto) ?? 0);
    total.set(seccion, (total.get(seccion) || 0) + eur);
  }
  return total;
}
