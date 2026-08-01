// Seed de HISTÓRICO — Empresa ficticia "Limpiezas Valencia Centro, S.L."
// Genera 3 meses de datos realistas (mayo-julio 2026) para que los
// reclutadores vean la app como si estuviera en producción: consumos,
// reposiciones, recuentos, costes y alertas con historia real.
//
// Uso: node prisma/seed-historico.js
// Idempotente: si el cliente demo ya tiene movimientos históricos, NO duplica.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMPRESA_DEMO = 'Limpiezas Valencia Centro, S.L.';

// Centros adicionales (los 4 del seed base + 3 nuevos = 7)
// Presupuestos realistas: consumo medio ~3.600€/mes por centro
const CENTROS_NUEVOS = [
  { nombre: 'Hospital General Universitario', presu: 3650, dir: 'Av. Tres Cruces, 2, Valencia' },
  { nombre: 'Oficinas Parque Empresarial', presu: 3600, dir: 'C/ de la Reina, Parque Empresarial Táctica, Paterna' },
  { nombre: 'Colegio Público Cervantes', presu: 3400, dir: 'C/ Cervantes, 12, Valencia' },
];

// Productos adicionales (catálogo más amplio para una empresa grande)
const PRODUCTOS_NUEVOS = [
  { nombre: 'Gel hidroalcohólico (500ml)', unidad: 'unidades', coste: 1.8, min: 10 },
  { nombre: 'Papel secamanos (paq)', unidad: 'paquetes', coste: 3.0, min: 5 },
  { nombre: 'Bolsas basura 30L (paq)', unidad: 'paquetes', coste: 1.5, min: 6 },
  { nombre: 'Quitagrasas cocina', unidad: 'litros', coste: 2.8, min: 3 },
  { nombre: 'Ambientador industrial', unidad: 'litros', coste: 4.2, min: 3 },
  { nombre: 'Cepillo de fregar (ud)', unidad: 'unidades', coste: 1.2, min: 8 },
];

// Semilla determinista para reproducibilidad (misma BD = mismos datos)
let seedRnd = 42;
function rnd() {
  seedRnd = (seedRnd * 1103515245 + 12345) % 2147483648;
  return seedRnd / 2147483648;
}
function entre(min, max) { return Math.round(min + rnd() * (max - min)); }

async function main() {
  console.log('→ Seed HISTÓRICO (3 meses) — empresa ficticia en producción...');

  const cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) {
    console.error('  ✗ Cliente demo no existe. Ejecuta primero: node prisma/seed.js');
    process.exit(1);
  }
  const idCliente = cliente.id_cliente;

  // Si ya hay un histórico real (miles de movimientos), no duplicar.
  // El seed base de la cuñada crea ~5 movimientos; un histórico de 90 días
  // genera varios miles. Umbral de 200 distingue ambos casos.
  const yaTieneHistorico = await prisma.registroMovimiento.count({
    where: { centro: { id_cliente: idCliente }, fecha_hora: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (yaTieneHistorico > 200) {
    console.log(`  • Ya existe histórico (${yaTieneHistorico} movimientos). No se duplica.`);
    return;
  }

  // 1. Crear centros nuevos (los 4 del seed base ya existen)
  const centros = {};
  for (const def of CENTROS_NUEVOS) {
    let c = await prisma.centro.findFirst({ where: { nombre_centro: def.nombre, id_cliente: idCliente } });
    if (!c) {
      c = await prisma.centro.create({
        data: { nombre_centro: def.nombre, direccion: def.dir, presupuesto_mensual: def.presu, id_cliente: idCliente },
      });
      console.log('  ✓ Centro creado:', c.nombre_centro, `(presu ${def.presu}€)`);
    }
    centros[def.nombre] = c.id_centro;
  }

  // 2. Crear productos nuevos
  const productosExtra = {};
  for (const p of PRODUCTOS_NUEVOS) {
    let prod = await prisma.producto.findFirst({ where: { nombre_producto: p.nombre } });
    if (!prod) {
      prod = await prisma.producto.create({
        data: { nombre_producto: p.nombre, unidad_medida: p.unidad, coste_unitario: p.coste, stock_minimo_alerta: p.min },
      });
      console.log('  ✓ Producto creado:', prod.nombre_producto);
    }
    productosExtra[p.nombre] = prod.id_producto;
  }

  // 3. Todos los centros del cliente (4 base + 3 nuevos)
  const todosCentros = await prisma.centro.findMany({ where: { id_cliente: idCliente }, select: { id_centro: true } });
  const todosProductos = await prisma.producto.findMany({ select: { id_producto: true, nombre_producto: true } });

  // 4. Generar 3 meses de movimientos (desde ~90 días atrás hasta hoy)
  const hoy = new Date();
  const inicio = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);
  const usuarios = await prisma.usuario.findMany({
    where: { id_cliente: idCliente, rol: { in: ['limpiador', 'supervisor', 'oficina'] } },
    select: { id_usuario: true },
  });
  if (usuarios.length === 0) {
    console.error('  ✗ Sin usuarios del cliente demo. Ejecuta primero: node prisma/seed.js');
    process.exit(1);
  }

  // Inventario inicial por centro-producto (para descontar consumos)
  const stockActual = new Map(); // "centroId:prodId" -> cantidad
  const inventarioInit = await prisma.inventarioCentro.findMany({
    where: { centro: { id_cliente: idCliente } },
    select: { id_centro: true, id_producto: true, cantidad_actual: true },
  });
  for (const inv of inventarioInit) stockActual.set(`${inv.id_centro}:${inv.id_producto}`, inv.cantidad_actual);

  let totalMov = 0;
  // Consumo base por producto (unidades/mes) según categoría
  const consumoPorProducto = new Map();
  for (const p of todosProductos) {
    const n = p.nombre_producto.toLowerCase();
    if (n.includes('papel higiénico')) consumoPorProducto.set(p.id_producto, 40);
    else if (n.includes('papel')) consumoPorProducto.set(p.id_producto, 20);
    else if (n.includes('lejía') || n.includes('amoníaco') || n.includes('desengrasante')) consumoPorProducto.set(p.id_producto, 15);
    else if (n.includes('bolsas')) consumoPorProducto.set(p.id_producto, 12);
    else if (n.includes('guantes')) consumoPorProducto.set(p.id_producto, 25);
    else if (n.includes('gel') || n.includes('secamanos')) consumoPorProducto.set(p.id_producto, 30);
    else consumoPorProducto.set(p.id_producto, 10);
  }

  // Recorremos días: consumo diario + reposición semanal + recuento mensual
  const fecha = new Date(inicio);
  while (fecha <= hoy) {
    const diaSemana = fecha.getDay();
    const esFinSemana = diaSemana === 0 || diaSemana === 6;

    for (const centro of todosCentros) {
      // Consumo diario (menor en fin de semana)
      for (const p of todosProductos) {
        const base = consumoPorProducto.get(p.id_producto) || 8;
        const consumo = esFinSemana ? entre(0, Math.ceil(base / 3)) : entre(1, Math.ceil(base / 20) + 1);
        if (consumo <= 0) continue;

        const key = `${centro.id_centro}:${p.id_producto}`;
        const stock = stockActual.get(key) ?? 0;
        stockActual.set(key, Math.max(0, stock - consumo));

        // Usuario aleatorio (limpiador preferentemente)
        const u = usuarios[Math.floor(rnd() * usuarios.length)];
        await prisma.registroMovimiento.create({
          data: {
            id_usuario: u.id_usuario,
            id_centro: centro.id_centro,
            id_producto: p.id_producto,
            cantidad: -consumo,
            tipo: 'movimiento',
            fecha_hora: new Date(fecha.getTime() + entre(6, 20) * 60 * 60 * 1000), // 6:00-20:00
          },
        });
        totalMov++;
      }

      // Reposición semanal (lunes): devuelve stock hacia el máximo
      if (diaSemana === 1) {
        for (const p of todosProductos) {
          const key = `${centro.id_centro}:${p.id_producto}`;
          const stock = stockActual.get(key) ?? 0;
          const maxReposicion = entre(20, 60);
          if (stock < maxReposicion) {
            const repo = maxReposicion - stock;
            stockActual.set(key, maxReposicion);
            const u = usuarios[Math.floor(rnd() * usuarios.length)];
            await prisma.registroMovimiento.create({
              data: {
                id_usuario: u.id_usuario,
                id_centro: centro.id_centro,
                id_producto: p.id_producto,
                cantidad: repo,
                tipo: 'movimiento',
                fecha_hora: new Date(fecha.getTime() + 8 * 60 * 60 * 1000),
              },
            });
            totalMov++;
          }
        }
      }
    }

    // Recuento mensual (día 1): el supervisor hace conteo físico
    if (fecha.getDate() === 1) {
      const sup = usuarios.find((u) => u.id_usuario) || usuarios[0];
      for (const centro of todosCentros) {
        for (const p of todosProductos) {
          if (rnd() < 0.3) continue; // no todos los productos se cuentan
          const key = `${centro.id_centro}:${p.id_producto}`;
          const stock = stockActual.get(key) ?? 0;
          const fisico = Math.max(0, stock + entre(-3, 2)); // pequeña merma realista
          stockActual.set(key, fisico);
          await prisma.registroMovimiento.create({
            data: {
              id_usuario: sup.id_usuario,
              id_centro: centro.id_centro,
              id_producto: p.id_producto,
              cantidad: fisico,
              tipo: 'recuento',
              fecha_hora: new Date(fecha.getTime() + 10 * 60 * 60 * 1000),
            },
          });
          totalMov++;
        }
      }
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  // 5. Sincronizar inventario_centros con el stock final simulado
  for (const [key, cantidad] of stockActual) {
    const [idCentro, idProd] = key.split(':').map(Number);
    await prisma.inventarioCentro.updateMany({
      where: { id_centro: idCentro, id_producto: idProd },
      data: { cantidad_actual: cantidad, fecha_actualizacion: new Date() },
    });
  }

  console.log(`\n✅ Histórico generado: ${totalMov} movimientos en 90 días`);
  console.log('   Centros: 7 · Productos: ' + (todosProductos.length + Object.keys(productosExtra).length));
  console.log('   Login oficina: warehouse / kavana');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
