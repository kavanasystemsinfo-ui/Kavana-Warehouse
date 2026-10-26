// Seed de DEMOSTRACIÓN — planta metalúrgica ficticia (control de consumibles por sección)
// Modelo: MERMAS de inventario (stock registrado vs stock físico contado)
//   Merma estrella: Soldadura — hilo MIG registrado 8 bobinas, físico 5 → faltan 3
//
// Uso: node prisma/seed-demo-industrial.js
// Carga datos de ejemplo en la BD que ya corre (definida por DATABASE_URL en .env).
// Idempotente: si ya existe el cliente demo, no duplica.
// Todos los datos salen de prisma/demo-industrial-data.js.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  EMPRESA_DEMO,
  EMAIL_CONTACTO,
  SUPERVISOR_DEMO,
  RESPONSABLES_SECCION,
  emailResponsable,
  SECCIONES,
  PRODUCTOS,
  INVENTARIO,
} from './demo-industrial-data.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log('→ Seed demo KAVANA WAREHOUSE (consumibles por sección — planta metalúrgica ficticia)...');

  // 1. Cliente demo (idempotente por nombre) — marcado es_demo para borrado limpio
  let cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nombre_empresa: EMPRESA_DEMO,
        email_contacto: EMAIL_CONTACTO,
        telefono: '600000000',
        plan: 'pro',
        estado: 'trial',
        trial_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notas: 'Cliente demo — planta metalúrgica ficticia con centros de coste por sección',
        es_demo: true,
      },
    });
    console.log('  ✓ Cliente demo creado:', cliente.id_cliente);
  } else {
    await prisma.cliente.update({ where: { id_cliente: cliente.id_cliente }, data: { es_demo: true } });
    console.log('  • Cliente demo ya existe:', cliente.id_cliente);
  }

  const idCliente = cliente.id_cliente;

  // 2. Secciones (centros de coste) — presupuesto mensual calibrado con el consumo
  //    simulado (ver consumoMensualEsperado en demo-industrial-data.js)
  const centros = {};
  for (const def of SECCIONES) {
    const nombre = def.nombre;
    let c = await prisma.centro.findFirst({ where: { nombre_centro: nombre, id_cliente: idCliente } });
    if (!c) {
      c = await prisma.centro.create({
        data: { nombre_centro: nombre, direccion: def.dir, presupuesto_mensual: def.presu, id_cliente: idCliente },
      });
      console.log('  ✓ Sección creada:', c.nombre_centro, `(presu ${def.presu}€)`);
    } else {
      // Centro ya existe: NO tocar presupuesto_mensual ni dirección.
      // El seed solo crea datos iniciales; los valores editados por el usuario
      // (presupuesto, dirección) deben persistir y no ser sobreescritos.
      console.log('  • Sección ya existe:', c.nombre_centro, `(presu ${c.presupuesto_mensual ?? '—'}€ — sin cambios)`);
    }
    centros[nombre] = c.id_centro;
  }

  // 3. Productos (catálogo de consumibles indirectos de planta)
  const productos = {};
  for (const p of PRODUCTOS) {
    let prod = await prisma.producto.findFirst({ where: { nombre_producto: p.nombre } });
    if (!prod) {
      prod = await prisma.producto.create({
        data: { nombre_producto: p.nombre, unidad_medida: p.unidad, coste_unitario: p.coste, stock_minimo_alerta: p.min },
      });
      console.log('  ✓ Producto creado:', prod.nombre_producto);
    } else {
      console.log('  • Producto ya existe:', prod.nombre_producto);
    }
    productos[p.nombre] = prod.id_producto;
  }

  // 4. Inventario: stock REGISTRADO (cantidad_actual) vs stock FÍSICO (stock_fisico).
  //    Estructura: [sección, producto, registrado, fisico|null, minimo, consumo/día]
  for (const [nombreCentro, nombreProd, registrado, fisico, minimo] of INVENTARIO) {
    const idCentro = centros[nombreCentro];
    const idProd = productos[nombreProd];
    await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro: idCentro, id_producto: idProd } },
      update: { cantidad_actual: registrado, stock_fisico: fisico, stock_minimo: minimo, fecha_actualizacion: new Date() },
      create: { id_centro: idCentro, id_producto: idProd, cantidad_actual: registrado, stock_fisico: fisico, stock_minimo: minimo },
    });
  }
  console.log('  ✓ Inventario con conteo físico inicializado');

  // 5. Usuarios (responsable de planta + operarios)
  const pw = await bcrypt.hash('kavana', 10);
  const supervisorEmail = SUPERVISOR_DEMO.email;
  let supervisor;
  const supervisorExistente = await prisma.usuario.findFirst({
    where: { OR: [{ username: SUPERVISOR_DEMO.username }, { email: supervisorEmail }] },
  });
  if (supervisorExistente) {
    // Idempotente: actualiza username y password si el usuario demo ya existe
    supervisor = await prisma.usuario.update({
      where: { id_usuario: supervisorExistente.id_usuario },
      data: { username: SUPERVISOR_DEMO.username, password_hash: pw, rol: 'oficina', id_cliente: idCliente, nombre: SUPERVISOR_DEMO.nombre },
    });
    console.log('  ✓ Responsable demo actualizado (login: warehouse / kavana)');
  } else {
    supervisor = await prisma.usuario.create({
      data: { nombre: SUPERVISOR_DEMO.nombre, email: supervisorEmail, username: SUPERVISOR_DEMO.username, password_hash: pw, rol: 'oficina', id_cliente: idCliente },
    });
    console.log('  ✓ Responsable creado (login: warehouse / kavana)');
  }
  // 5b. Operarios (5-10 por sección) — email normal, teléfono, nº empleado 100-500
  const nombres = ['María', 'José', 'Lucía', 'Antonio', 'Carmen', 'David', 'Ana', 'Carlos', 'Pedro', 'Laura', 'Miguel', 'Sara', 'Javier', 'Elena', 'Francisco', 'Marta', 'Manuel', 'Paula', 'Diego', 'Raquel', 'Álvaro', 'Nuria', 'Pablo', 'Cristina', 'Sergio', 'Beatriz', 'Rubén', 'Patricia', 'Ángel', 'Mónica'];
  const apellidos = ['López', 'Pérez', 'Romero', 'Muñoz', 'Torres', 'Ferrer', 'García', 'Sánchez', 'Martín', 'Ruiz', 'Jiménez', 'Moreno', 'Álvarez', 'Díaz', 'Suárez', 'Vidal', 'Castro', 'Ortega', 'Ramos', 'Iglesias', 'Molina', 'Serrano', 'Navarro', 'Gil', 'Reyes', 'Cano', 'Cruz', 'Mendoza', 'Prieto', 'Marín'];
  const dominios = ['gmail.com', 'hotmail.com', 'outlook.com'];
  const centrosNombres = Object.keys(centros);
  let telefonoSeq = 600123000;
  let empSeq = 500; // base para nº empleado y username único

  // Cuenta existentes por sección para no duplicar al reejecutar el seed
  const existentesPorCentro = {};
  for (const cn of centrosNombres) {
    const c = await prisma.centro.findUnique({ where: { id_centro: centros[cn] }, include: { asignaciones: { where: { fecha_fin: null, usuario: { rol: 'operario' } }, select: { id_usuario: true } } } });
    existentesPorCentro[cn] = c?.asignaciones?.length || 0;
  }

  for (const cn of centrosNombres) {
    const quiere = 5 + Math.floor(Math.random() * 6); // 5..10 objetivo
    const falta = Math.max(0, quiere - (existentesPorCentro[cn] || 0));
    for (let i = 0; i < falta; i++) {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
      const full = `${nombre} ${apellido}`;
      const dom = dominios[Math.floor(Math.random() * dominios.length)];
      const ne = ++empSeq; // nº empleado y sufijo único
      const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${ne}@${dom}`;
      const username = `${nombre.toLowerCase()}.${apellido.toLowerCase()}.${ne}`;
      const telefono = String(++telefonoSeq);
      try {
        const u = await prisma.usuario.upsert({
          where: { email },
          update: {},
          create: {
            nombre: full,
            email,
            username,
            password_hash: pw,
            rol: 'operario',
            id_cliente: idCliente,
            telefono,
            numero_empleado: String(ne),
          },
        });
        // Asigna a la sección si no tiene asignación activa
        const ya = await prisma.asignacionPersonal.findFirst({ where: { id_usuario: u.id_usuario, id_centro: centros[cn], fecha_fin: null } });
        if (!ya) {
          await prisma.asignacionPersonal.create({ data: { id_usuario: u.id_usuario, id_centro: centros[cn], fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        }
      } catch (err) {
        console.warn('  ⚠️ No se pudo crear', full, '→', err.message.split('\n')[0]);
      }
    }
  }
  console.log('  ✓ Operarios generados (5-10 por sección)');

  // 5c. Responsable de cada sección (rol responsable): firma recuentos y
  //     reposiciones. Contraseña aleatoria: no se puede entrar con su cuenta.
  for (const [seccion, nombre] of Object.entries(RESPONSABLES_SECCION)) {
    const email = emailResponsable(seccion);
    let r = await prisma.usuario.findUnique({ where: { email } });
    if (!r) {
      r = await prisma.usuario.create({
        data: { nombre, email, password_hash: await bcrypt.hash(randomUUID(), 10), rol: 'responsable', id_cliente: idCliente, telefono: String(++telefonoSeq) },
      });
    }
    const ya = await prisma.asignacionPersonal.findFirst({ where: { id_usuario: r.id_usuario, id_centro: centros[seccion], fecha_fin: null } });
    if (!ya) {
      await prisma.asignacionPersonal.create({ data: { id_usuario: r.id_usuario, id_centro: centros[seccion], fecha_inicio: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) } });
    }
  }
  console.log('  ✓ Responsables de sección (uno por sección)');

  console.log('\n✅ Demo lista. Login: warehouse / kavana');
  console.log('   Secciones: ' + SECCIONES.map((s) => s.nombre).join(', '));
  console.log('   Merma esperada: Soldadura hilo MIG registrado 8 / físico 5 → FALTAN 3 bobinas');
  console.log('   Pintura y acabado: pendiente de contar (sin stock_fisico)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
