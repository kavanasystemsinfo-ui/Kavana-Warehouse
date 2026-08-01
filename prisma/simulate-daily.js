// Simulación diaria de la empresa ficticia — KAVANA WAREHOUSE
// Mantiene la demo "viva": cada día genera consumos realistas de los
// limpiadores, baja el stock (aparecen alertas solas) y cada lunes repone.
//
// Uso: node prisma/simulate-daily.js  (cron diario)
// Idempotente: si el usuario de sistema ya generó movimientos hoy, no duplica.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMPRESA_DEMO = 'Limpiezas Valencia Centro, S.L.';
const USUARIO_SISTEMA = 'sistema.demo@kavanawarehouse.com'; // marcador de idempotencia

// Semilla determinista por día (misma fecha = mismos datos, reproducible)
function rnd() {
  const hoy = new Date();
  const seed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return (x - Math.floor(x));
}
function entre(min, max) { return Math.round(min + rnd() * (max - min)); }

async function main() {
  const cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) {
    console.log('Cliente demo no existe, nada que simular.');
    return;
  }
  const idCliente = cliente.id_cliente;

  // Marcador: usuario de sistema (rol oficina, sin acceso real)
  let sistema = await prisma.usuario.findFirst({ where: { email: USUARIO_SISTEMA } });
  if (!sistema) {
    sistema = await prisma.usuario.create({
      data: {
        nombre: 'Sistema Demo',
        email: USUARIO_SISTEMA,
        password_hash: '$2a$10$invalido.noacceso.solo.para.marcar.movimientos',
        rol: 'oficina',
        id_cliente: idCliente,
        estado: 'inactivo', // no puede loguearse
      },
    });
    console.log('  ✓ Usuario de sistema creado (marcador)');
  }

  // Idempotencia: ¿ya simulamos hoy?
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const yaHoy = await prisma.registroMovimiento.count({
    where: { id_usuario: sistema.id_usuario, fecha_hora: { gte: inicioHoy } },
  });
  if (yaHoy > 0) {
    console.log(`  • Hoy ya se simuló (${yaHoy} movimientos). Sin cambios.`);
    return;
  }

  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const esLunes = diaSemana === 1;
  const esFinSemana = diaSemana === 0 || diaSemana === 6;

  const centros = await prisma.centro.findMany({ where: { id_cliente: idCliente }, select: { id_centro: true } });
  const productos = await prisma.producto.findMany({ select: { id_producto: true, nombre_producto: true } });

  // Consumo base por producto (unidades/mes) — misma tabla que el seed histórico
  const consumoBase = new Map();
  for (const p of productos) {
    const n = p.nombre_producto.toLowerCase();
    if (n.includes('papel higiénico')) consumoBase.set(p.id_producto, 40);
    else if (n.includes('papel')) consumoBase.set(p.id_producto, 20);
    else if (n.includes('lejía') || n.includes('amoníaco') || n.includes('desengrasante')) consumoBase.set(p.id_producto, 15);
    else if (n.includes('bolsas')) consumoBase.set(p.id_producto, 12);
    else if (n.includes('guantes')) consumoBase.set(p.id_producto, 25);
    else if (n.includes('gel') || n.includes('secamanos')) consumoBase.set(p.id_producto, 30);
    else consumoBase.set(p.id_producto, 10);
  }

  let totalMov = 0;

  // 1. Consumos del día (menores en fin de semana)
  for (const centro of centros) {
    for (const p of productos) {
      const base = consumoBase.get(p.id_producto) || 8;
      const consumo = esFinSemana ? entre(0, Math.ceil(base / 3)) : entre(1, Math.ceil(base / 20) + 1);
      if (consumo <= 0) continue;
      await prisma.registroMovimiento.create({
        data: {
          id_usuario: sistema.id_usuario,
          id_centro: centro.id_centro,
          id_producto: p.id_producto,
          cantidad: -consumo,
          tipo: 'movimiento',
          fecha_hora: new Date(hoy.getTime() + entre(7, 19) * 60 * 60 * 1000), // 7:00-19:00
        },
      });
      totalMov++;
    }
  }

  // 2. Reposición semanal (lunes): devuelve stock hacia un máximo
  if (esLunes) {
    for (const centro of centros) {
      for (const p of productos) {
        const inv = await prisma.inventarioCentro.findUnique({
          where: { id_centro_id_producto: { id_centro: centro.id_centro, id_producto: p.id_producto } },
        });
        if (!inv) continue;
        const max = Math.max(inv.stock_minimo * 3, 30);
        if (inv.cantidad_actual < max) {
          const repo = max - inv.cantidad_actual;
          await prisma.registroMovimiento.create({
            data: {
              id_usuario: sistema.id_usuario,
              id_centro: centro.id_centro,
              id_producto: p.id_producto,
              cantidad: repo,
              tipo: 'movimiento',
              fecha_hora: new Date(hoy.getTime() + 8 * 60 * 60 * 1000),
            },
          });
          totalMov++;
        }
      }
    }
  }

  // 3. Sincronizar stock (descontar consumos)
  const movsHoy = await prisma.registroMovimiento.findMany({
    where: { id_usuario: sistema.id_usuario, fecha_hora: { gte: inicioHoy }, cantidad: { lt: 0 } },
    select: { id_centro: true, id_producto: true, cantidad: true },
  });
  for (const m of movsHoy) {
    await prisma.inventarioCentro.updateMany({
      where: { id_centro: m.id_centro, id_producto: m.id_producto },
      data: { cantidad_actual: { decrement: Math.abs(m.cantidad) }, fecha_actualizacion: new Date() },
    });
  }

  console.log(`✅ Simulación diaria: ${totalMov} movimientos (${esFinSemana ? 'fin de semana' : 'laborable'}${esLunes ? ', con reposición' : ''})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
