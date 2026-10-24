// Simulación diaria de la planta ficticia — KAVANA WAREHOUSE
// Mantiene la demo "viva": cada día genera consumos realistas de las secciones,
// baja el stock (aparecen alertas solas) y cada lunes repone lo que está en su
// punto de pedido.
//
// Uso: node prisma/simulate-daily.js  (cron diario)
// Idempotente: si el usuario de sistema ya generó movimientos hoy, no duplica.
//
// Cada sección solo consume lo que tiene en su inventario, con el consumo
// diario definido en prisma/demo-industrial-data.js. Tanto el stock registrado
// como el físico (si ya está contado) se mueven igual, de modo que las
// diferencias de la demo (merma estrella, sobrantes) se mantienen estables.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EMPRESA_DEMO,
  EMAIL_SISTEMA,
  perfilesPorPar,
  clavePar,
  crearRnd,
  entre,
  consumoDelDia,
  nivelObjetivo,
} from './demo-industrial-data.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Neon free tier duerme la BD tras inactividad; el primer arranque puede tardar.
// Reintenta la conexión inicial (3 intentos, espera creciente) antes de rendirse.
async function conectarConReintentos() {
  const esperas = [5_000, 15_000, 30_000];
  for (const ms of esperas) {
    try {
      await prisma.$connect();
      return;
    } catch (e) {
      console.error(`  ⚠ Conexión fallida, reintento en ${ms / 1000}s: ${String(e.message).split('\n')[0]}`);
      await new Promise((r) => setTimeout(r, ms));
    }
  }
  throw new Error('No se pudo conectar a la BD tras 3 intentos.');
}

async function main() {
  await conectarConReintentos();
  const cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) {
    console.log('Cliente demo no existe, nada que simular.');
    return;
  }
  const idCliente = cliente.id_cliente;

  // Marcador: usuario de sistema (rol oficina, sin acceso real)
  let sistema = await prisma.usuario.findFirst({ where: { email: EMAIL_SISTEMA } });
  if (!sistema) {
    sistema = await prisma.usuario.create({
      data: {
        nombre: 'Sistema Demo',
        email: EMAIL_SISTEMA,
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

  // Semilla por fecha: misma fecha = mismos datos (reproducible), pero cada
  // producto recibe un número distinto dentro del día.
  const rnd = crearRnd(hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate());

  const perfiles = perfilesPorPar();
  const filasInv = await prisma.inventarioCentro.findMany({
    where: { centro: { id_cliente: idCliente } },
    include: { centro: { select: { nombre_centro: true } }, producto: { select: { nombre_producto: true } } },
  });

  const movimientos = [];
  let nConsumos = 0;
  let nRepos = 0;

  for (const inv of filasInv) {
    const perfil = perfiles.get(clavePar(inv.centro.nombre_centro, inv.producto.nombre_producto));
    if (!perfil) continue;

    // 1. Consumo del día (casi nulo en fin de semana). No se consume lo que no hay.
    const consumo = Math.min(consumoDelDia(perfil.consumoDia, rnd, esFinSemana), Math.max(0, inv.cantidad_actual));
    let cantidad = inv.cantidad_actual - consumo;
    let fisico = inv.stock_fisico === null ? null : Math.max(0, inv.stock_fisico - consumo);
    if (consumo > 0) {
      movimientos.push({
        id_usuario: sistema.id_usuario,
        id_centro: inv.id_centro,
        id_producto: inv.id_producto,
        cantidad: -consumo,
        tipo: 'movimiento',
        fecha_hora: new Date(hoy.getTime() + entre(rnd, 7, 19) * 60 * 60 * 1000), // 7:00-19:00
      });
      nConsumos++;
    }

    // 2. Reposición semanal (lunes): si está en el punto de pedido, repone al nivel objetivo
    if (esLunes) {
      const puntoPedido = inv.stock_minimo + Math.ceil(perfil.consumoDia * 5);
      if (cantidad <= puntoPedido) {
        const repo = nivelObjetivo(inv.stock_minimo, perfil.consumoDia) - cantidad;
        if (repo > 0) {
          movimientos.push({
            id_usuario: sistema.id_usuario,
            id_centro: inv.id_centro,
            id_producto: inv.id_producto,
            cantidad: repo,
            tipo: 'movimiento',
            fecha_hora: new Date(hoy.getTime() + 8 * 60 * 60 * 1000),
          });
          cantidad += repo;
          if (fisico !== null) fisico += repo; // lo que entra, entra también en el físico
          nRepos++;
        }
      }
    }

    // 3. Sincronizar el stock (consumos y reposiciones)
    if (cantidad !== inv.cantidad_actual || fisico !== inv.stock_fisico) {
      await prisma.inventarioCentro.updateMany({
        where: { id_centro: inv.id_centro, id_producto: inv.id_producto },
        data: { cantidad_actual: cantidad, stock_fisico: fisico, fecha_actualizacion: new Date() },
      });
    }
  }

  if (movimientos.length > 0) {
    await prisma.registroMovimiento.createMany({ data: movimientos });
  }

  console.log(`✅ Simulación diaria: ${movimientos.length} movimientos (${nConsumos} consumos, ${nRepos} reposiciones; ${esFinSemana ? 'fin de semana' : 'laborable'}${esLunes ? ', lunes' : ''})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
