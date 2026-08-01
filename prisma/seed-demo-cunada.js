// Seed de DEMOSTRACIÓN — Caso real de la cuñada (encargada limpieza Valencia)
// Modelo: MERMAS de inventario (stock registrado vs stock físico contado)
//   Centro estrella: Plaza de Toros — papel registrado 50, físico 30 → faltan 20 rollos
//
// Uso: node prisma/seed-demo-cunada.js
// Carga datos de ejemplo en la BD que ya corre (definida por DATABASE_URL en .env).
// Idempotente: si ya existe el cliente demo, no duplica.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMPRESA_DEMO = 'Limpiezas Valencia Centro, S.L.';

async function main() {
  console.log('→ Seed demo CleanStock (mermas de inventario — caso cuñada)...');

  // 1. Cliente demo (idempotente por nombre) — marcado es_demo para borrado limpio
  let cliente = await prisma.cliente.findFirst({ where: { nombre_empresa: EMPRESA_DEMO } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nombre_empresa: EMPRESA_DEMO,
        email_contacto: 'cuñada@limpiezasvalencia.demo',
        telefono: '600000000',
        plan: 'pro',
        estado: 'trial',
        trial_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notas: 'Cliente piloto demo — caso real centros descentralizados Valencia',
        es_demo: true,
      },
    });
    console.log('  ✓ Cliente demo creado:', cliente.id_cliente);
  } else {
    await prisma.cliente.update({ where: { id_cliente: cliente.id_cliente }, data: { es_demo: true } });
    console.log('  • Cliente demo ya existe:', cliente.id_cliente);
  }

  const idCliente = cliente.id_cliente;

  // 2. Centros (sus centros reales) — con presupuesto mensual distinto para la demo
  const centrosDef = [
    { nombre: 'Diputación de Valencia', presu: 100, dir: 'Calle de la Diputación, Valencia' },
    { nombre: 'Beneficencia', presu: 25, dir: 'Calle de la Beneficencia, Valencia' },
    { nombre: 'Plaza de Toros', presu: 15, dir: 'Plaza de Toros, Valencia' },
    { nombre: 'Museo Bellas Artes', presu: 50, dir: 'C/ San Pío V, Valencia (Museo de Bellas Artes)' },
  ];
  const centros = {};
  for (const def of centrosDef) {
    const nombre = def.nombre;
    let c = await prisma.centro.findFirst({ where: { nombre_centro: nombre, id_cliente: idCliente } });
    if (!c) {
      c = await prisma.centro.create({
        data: { nombre_centro: nombre, direccion: def.dir, presupuesto_mensual: def.presu, id_cliente: idCliente },
      });
      console.log('  ✓ Centro creado:', c.nombre_centro, `(presu ${def.presu}€)`);
    } else {
      // Actualiza el presupuesto y la dirección por si cambiaron en el seed
      c = await prisma.centro.update({ where: { id_centro: c.id_centro }, data: { presupuesto_mensual: def.presu, direccion: def.dir } });
      console.log('  • Centro ya existe:', c.nombre_centro, `(presu ${def.presu}€)`);
    }
    centros[nombre] = c.id_centro;
  }

  // 3. Productos
  const productosDef = [
    { nombre: 'Papel higiénico (rollo)', unidad: 'rollos', coste: 0.8, min: 5 },
    { nombre: 'Papel industrial (rollo)', unidad: 'rollos', coste: 1.2, min: 3 },
    { nombre: 'Lejía', unidad: 'litros', coste: 1.5, min: 4 },
    { nombre: 'Guantes de limpieza', unidad: 'pares', coste: 0.3, min: 10 },
    { nombre: 'Bolsas de basura', unidad: 'paquetes', coste: 2.0, min: 5 },
  ];
  const productos = {};
  for (const p of productosDef) {
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

  // 4. Inventario: stock REGISTRADO (cantidad_actual) vs stock FÍSICO (stock_fisico)
  //    Caso cuñada: Plaza de Toros papel registrado 50, físico 30 → faltan 20.
  //    Estructura: [centro, producto, registrado, fisico|null]
  const inventario = [
    // Diputación — todo cuadra (contado = registrado)
    ['Diputación de Valencia', 'Papel higiénico (rollo)', 40, 40, 10],
    ['Diputación de Valencia', 'Lejía', 25, 25, 8],
    ['Diputación de Valencia', 'Guantes de limpieza', 60, 58, 10], // -2 (leve merma)
    // Beneficencia — sin contar aún (fisico null); lejía bajo mínimo
    ['Beneficencia', 'Papel higiénico (rollo)', 35, null, 12],
    ['Beneficencia', 'Bolsas de basura', 20, null, 5],
    ['Beneficencia', 'Lejía', 22, 22, 30], // registrado 22 < mínimo 30 → propuesta de compra
    // Plaza de Toros — ANÓMALO merma: registrado 50, físico 30 → faltan 20; mínimo alto
    ['Plaza de Toros', 'Papel higiénico (rollo)', 50, 30, 45], // registrado 50 > mínimo 45, pero merma de 20 rollos
    ['Plaza de Toros', 'Lejía', 18, 18, 10],
    ['Plaza de Toros', 'Papel industrial (rollo)', 22, 22, 15],
    // Museo Bellas Artes — sobra un poco (fisico > registrado, no crítico)
    ['Museo Bellas Artes', 'Papel higiénico (rollo)', 30, 33, 10],
    ['Museo Bellas Artes', 'Guantes de limpieza', 45, 45, 10],
  ];
  for (const [nombreCentro, nombreProd, registrado, fisico, minimo] of inventario) {
    const idCentro = centros[nombreCentro];
    const idProd = productos[nombreProd];
    await prisma.inventarioCentro.upsert({
      where: { id_centro_id_producto: { id_centro: idCentro, id_producto: idProd } },
      update: { cantidad_actual: registrado, stock_fisico: fisico, stock_minimo: minimo, fecha_actualizacion: new Date() },
      create: { id_centro: idCentro, id_producto: idProd, cantidad_actual: registrado, stock_fisico: fisico, stock_minimo: minimo },
    });
  }
  console.log('  ✓ Inventario con conteo físico inicializado');

  // 5. Usuarios (supervisor + operarios)
  const pw = await bcrypt.hash('demo1234', 10);
  let supervisor = await prisma.usuario.findFirst({ where: { email: 'supervisor.demo@cleanstock.com' } });
  if (!supervisor) {
    supervisor = await prisma.usuario.create({
      data: { nombre: 'Zaira García', email: 'supervisor.demo@cleanstock.com', username: 'zaira', password_hash: pw, rol: 'supervisor', id_cliente: idCliente },
    });
    console.log('  ✓ Supervisor creado (Zaira García)');
  }
  // 5b. Empleados (5-10 por centro) — email normal, teléfono, nº empleado 100-500
  const nombres = ['María', 'José', 'Lucía', 'Antonio', 'Carmen', 'David', 'Ana', 'Carlos', 'Pedro', 'Laura', 'Miguel', 'Sara', 'Javier', 'Elena', 'Francisco', 'Marta', 'Manuel', 'Paula', 'Diego', 'Raquel', 'Álvaro', 'Nuria', 'Pablo', 'Cristina', 'Sergio', 'Beatriz', 'Rubén', 'Patricia', 'Ángel', 'Mónica'];
  const apellidos = ['López', 'Pérez', 'Romero', 'Muñoz', 'Torres', 'Ferrer', 'García', 'Sánchez', 'Martín', 'Ruiz', 'Jiménez', 'Moreno', 'Álvarez', 'Díaz', 'Suárez', 'Vidal', 'Castro', 'Ortega', 'Ramos', 'Iglesias', 'Molina', 'Serrano', 'Navarro', 'Gil', 'Reyes', 'Cano', 'Cruz', 'Mendoza', 'Prieto', 'Marín'];
  const dominios = ['gmail.com', 'hotmail.com', 'outlook.com'];
  const centrosNombres = Object.keys(centros); // 4 centros
  let telefonoSeq = 600123000;
  let empSeq = 500; // base para nº empleado y username único

  // Cuenta existentes por centro para no duplicar al reejecutar el seed
  const existentesPorCentro = {};
  for (const cn of centrosNombres) {
    const c = await prisma.centro.findUnique({ where: { id_centro: centros[cn] }, include: { asignaciones: { where: { fecha_fin: null }, select: { id_usuario: true } } } });
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
            rol: 'limpiador',
            id_cliente: idCliente,
            telefono,
            numero_empleado: String(ne),
          },
        });
        // Asigna al centro si no tiene asignación activa
        const ya = await prisma.asignacionPersonal.findFirst({ where: { id_usuario: u.id_usuario, id_centro: centros[cn], fecha_fin: null } });
        if (!ya) {
          await prisma.asignacionPersonal.create({ data: { id_usuario: u.id_usuario, id_centro: centros[cn], fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        }
      } catch (err) {
        console.warn('  ⚠️ No se pudo crear', full, '→', err.message.split('\n')[0]);
      }
    }
  }
  console.log('  ✓ Empleados generados (5-10 por centro)');

  console.log('\n✅ Demo lista. Login encargada: supervisor.demo@cleanstock.com / demo1234');
  console.log('   Centros: Diputación, Beneficencia, Plaza de Toros, Museo Bellas Artes');
  console.log('   Merma esperada: Plaza de Toros papel registrado 50 / físico 30 → FALTAN 20 rollos');
  console.log('   Beneficencia: pendiente de contar (sin stock_fisico)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
