// Simulación diaria de la planta ficticia — KAVANA WAREHOUSE
// Mantiene la demo "viva": cada día genera consumos realistas de las secciones,
// baja el stock (aparecen alertas solas) y cada lunes repone lo que está en su
// punto de pedido.
//
// Uso: node prisma/simulate-daily.js  (cron diario)
// Idempotente: si ya hay movimientos hoy, no duplica. Autorreparable: si el cron
// falló unos días, rellena los días que faltan (hasta 120) en la misma ejecución.
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

const DIA_MS = 24 * 60 * 60 * 1000;

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

  // Último día con actividad en la demo (de cualquier autor: el histórico también cuenta).
  // Si el cron falló unos días, aquí se detecta el hueco y se rellena. Idempotente:
  // si ya hay movimientos hoy, no hay nada que simular.
  const ultimo = await prisma.registroMovimiento.aggregate({
    where: { centro: { id_cliente: idCliente } },
    _max: { fecha_hora: true },
  });
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const ultimoDia = ultimo._max.fecha_hora ? new Date(ultimo._max.fecha_hora) : null;
  if (ultimoDia) ultimoDia.setHours(0, 0, 0, 0);
  if (ultimoDia && ultimoDia >= inicioHoy) {
    console.log('  • Hoy ya se simuló. Sin cambios.');
    return;
  }

  // Días a simular: desde el siguiente al último con datos hasta hoy (tope: MAX_DIAS_RELLENO).
  const MAX_DIAS_RELLENO = 120;
  let desde = ultimoDia ? new Date(ultimoDia.getTime() + DIA_MS) : new Date(inicioHoy);
  const tope = new Date(inicioHoy.getTime() - (MAX_DIAS_RELLENO - 1) * DIA_MS);
  if (desde < tope) desde = tope;
  const dias = [];
  for (let d = new Date(desde); d <= inicioHoy; d = new Date(d.getTime() + DIA_MS)) {
    // Evita desfases de hora por cambio horario: se normaliza a las 00:00 locales
    const n = new Date(d); n.setHours(0, 0, 0, 0); dias.push(n);
  }
  if (ultimoDia && dias.length > 1) console.log(`  ⚠ Faltaban ${dias.length - 1} día(s) sin simular: se rellenan.`);

  const perfiles = perfilesPorPar();
  const filasInv = await prisma.inventarioCentro.findMany({
    where: { centro: { id_cliente: idCliente } },
    include: { centro: { select: { nombre_centro: true } }, producto: { select: { nombre_producto: true } } },
  });
  // Estado en memoria; se escribe una sola vez por fila al final
  const estado = [];
  for (const inv of filasInv) {
    const perfil = perfiles.get(clavePar(inv.centro.nombre_centro, inv.producto.nombre_producto));
    if (!perfil) continue;
    estado.push({
      id_centro: inv.id_centro,
      id_producto: inv.id_producto,
      minimo: inv.stock_minimo,
      consumoDia: perfil.consumoDia,
      cantidad: inv.cantidad_actual,
      fisico: inv.stock_fisico,
      inicial: { cantidad: inv.cantidad_actual, fisico: inv.stock_fisico },
    });
  }

  const movimientos = [];
  let nConsumos = 0;
  let nRepos = 0;
  const ahora = Date.now();

  for (const dia of dias) {
    const diaSemana = dia.getDay();
    const esLunes = diaSemana === 1;
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    // Semilla por fecha: misma fecha = mismos datos (reproducible), y cada producto
    // recibe un número distinto dentro del día.
    const rnd = crearRnd(dia.getFullYear() * 10000 + (dia.getMonth() + 1) * 100 + dia.getDate());
    const ts = (h) => new Date(Math.min(dia.getTime() + h * 60 * 60 * 1000, ahora)); // nunca en el futuro

    for (const par of estado) {
      // 1. Consumo del día (casi nulo en fin de semana). No se consume lo que no hay.
      const consumo = Math.min(consumoDelDia(par.consumoDia, rnd, esFinSemana), Math.max(0, par.cantidad));
      if (consumo > 0) {
        par.cantidad -= consumo;
        if (par.fisico !== null) par.fisico = Math.max(0, par.fisico - consumo);
        movimientos.push({
          id_usuario: sistema.id_usuario,
          id_centro: par.id_centro,
          id_producto: par.id_producto,
          cantidad: -consumo,
          tipo: 'movimiento',
          fecha_hora: ts(entre(rnd, 7, 19)), // 7:00-19:00
        });
        nConsumos++;
      }

      // 2. Reposición semanal (lunes): si está en el punto de pedido, repone al nivel objetivo
      if (esLunes) {
        const puntoPedido = par.minimo + Math.ceil(par.consumoDia * 5);
        if (par.cantidad <= puntoPedido) {
          const repo = nivelObjetivo(par.minimo, par.consumoDia) - par.cantidad;
          if (repo > 0) {
            par.cantidad += repo;
            if (par.fisico !== null) par.fisico += repo; // lo que entra, entra también en el físico
            movimientos.push({
              id_usuario: sistema.id_usuario,
              id_centro: par.id_centro,
              id_producto: par.id_producto,
              cantidad: repo,
              tipo: 'movimiento',
              fecha_hora: ts(8),
            });
            nRepos++;
          }
        }
      }
    }
  }

  // 3. Guardar movimientos y sincronizar el stock
  for (let i = 0; i < movimientos.length; i += 500) {
    await prisma.registroMovimiento.createMany({ data: movimientos.slice(i, i + 500) });
  }
  for (const par of estado) {
    if (par.cantidad !== par.inicial.cantidad || par.fisico !== par.inicial.fisico) {
      await prisma.inventarioCentro.updateMany({
        where: { id_centro: par.id_centro, id_producto: par.id_producto },
        data: { cantidad_actual: par.cantidad, stock_fisico: par.fisico, fecha_actualizacion: new Date() },
      });
    }
  }

  console.log(`✅ Simulación: ${dias.length} día(s), ${movimientos.length} movimientos (${nConsumos} consumos, ${nRepos} reposiciones)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
