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
// como el físico (si ya está contado) se mueven igual, y nunca se consume más
// de lo que hay en ninguno de los dos: la diferencia físico − registrado (merma
// estrella, sobrantes) se mantiene exactamente igual día tras día.
// Los consumos los firma un operario de la sección; las reposiciones, su responsable.

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
  reposicionLunes,
  personalPorSeccion,
  aLas,
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

  // Autor de reserva si una sección no tiene personal (rol oficina, sin acceso real)
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
    console.log('  ✓ Usuario de sistema creado (autor de reserva)');
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
  // Se avanza por días de calendario (setDate), no sumando 24 h: el día del cambio
  // de hora dura 23 o 25 h y sumar 24 h repetía un día y se saltaba el siguiente.
  const masDias = (f, n) => { const r = new Date(f); r.setDate(r.getDate() + n); r.setHours(0, 0, 0, 0); return r; };
  let desde = ultimoDia ? masDias(ultimoDia, 1) : new Date(inicioHoy);
  const tope = masDias(inicioHoy, -(MAX_DIAS_RELLENO - 1));
  if (desde < tope) desde = tope;
  const dias = [];
  for (let d = desde; d <= inicioHoy; d = masDias(d, 1)) dias.push(d);
  if (ultimoDia && dias.length > 1) console.log(`  ⚠ Faltaban ${dias.length - 1} día(s) sin simular: se rellenan.`);

  const perfiles = perfilesPorPar();
  const personal = await personalPorSeccion(prisma, idCliente);
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
      perfil,
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
    const ts = (min) => new Date(Math.min(aLas(dia, min).getTime(), ahora)); // nunca en el futuro

    for (const par of estado) {
      const equipo = personal.get(par.id_centro);
      const operario = equipo?.operarios.length ? equipo.operarios[Math.floor(rnd() * equipo.operarios.length)] : sistema.id_usuario;
      const responsable = equipo?.responsable ?? sistema.id_usuario;

      // 1. Consumo del día (casi nulo en fin de semana). No se consume más de lo
      //    que hay ni en el registrado ni en el físico: la diferencia no cambia.
      const disponible = Math.max(0, Math.min(par.cantidad, par.fisico ?? par.cantidad));
      const consumo = Math.min(consumoDelDia(par.perfil.consumoDia, rnd, esFinSemana), disponible);
      if (consumo > 0) {
        par.cantidad -= consumo;
        if (par.fisico !== null) par.fisico -= consumo;
        movimientos.push({
          id_usuario: operario,
          id_centro: par.id_centro,
          id_producto: par.id_producto,
          cantidad: -consumo,
          tipo: 'movimiento',
          fecha_hora: ts(entre(rnd, 7 * 60, 19 * 60)), // 7:00-19:00
        });
        nConsumos++;
      }

      // 2. Reposición semanal (lunes por la mañana). Lo que entra, entra también en el físico.
      if (esLunes) {
        const repo = reposicionLunes(par.perfil, par.cantidad);
        if (repo > 0) {
          par.cantidad += repo;
          if (par.fisico !== null) par.fisico += repo;
          movimientos.push({
            id_usuario: responsable,
            id_centro: par.id_centro,
            id_producto: par.id_producto,
            cantidad: repo,
            tipo: 'movimiento',
            fecha_hora: ts(entre(rnd, 7 * 60 + 30, 9 * 60)), // 7:30-9:00
          });
          nRepos++;
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
