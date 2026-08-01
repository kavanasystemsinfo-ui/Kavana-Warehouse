// =============================================================================
// Kavana CleanStock — Seed Data for Development
// Ejecutar: npx prisma db seed
// Configurar en package.json: "prisma": { "seed": "node prisma/seed.js" }
// =============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // -----------------------------------------------------------------------
  // 1. Usuarios
  // -----------------------------------------------------------------------
  const salt = await bcrypt.genSalt(12);

  // Contraseña común para todos los usuarios (producción y desarrollo)
  // Email: supervisor@kavana.com / carlos@kavana.com / ana@kavana.com / admin@kavana.com
  // Password: CleanStock2026!
  const hash = await bcrypt.hash('CleanStock2026!', salt);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@kavana.com' },
    update: { password_hash: hash },
    create: {
      nombre: 'Admin Kavana',
      email: 'admin@kavana.com',
      password_hash: hash,
      rol: 'admin',
      estado: 'activo',
    },
  });

  const supervisor = await prisma.usuario.upsert({
    where: { email: 'supervisor@kavana.com' },
    update: { password_hash: hash },
    create: {
      nombre: 'María García',
      email: 'supervisor@kavana.com',
      password_hash: hash,
      rol: 'supervisor',
      estado: 'activo',
    },
  });

  const limpiador1 = await prisma.usuario.upsert({
    where: { email: 'carlos@kavana.com' },
    update: { password_hash: hash },
    create: {
      nombre: 'Carlos López',
      email: 'carlos@kavana.com',
      password_hash: hash,
      rol: 'limpiador',
      estado: 'activo',
    },
  });

  const limpiador2 = await prisma.usuario.upsert({
    where: { email: 'ana@kavana.com' },
    update: { password_hash: hash },
    create: {
      nombre: 'Ana Martínez',
      email: 'ana@kavana.com',
      password_hash: hash,
      rol: 'limpiador',
      estado: 'activo',
    },
  });

  const bajaMedica = await prisma.usuario.upsert({
    where: { email: 'baja@kavana.com' },
    update: { password_hash: hash },
    create: {
      nombre: 'Pedro Sánchez',
      email: 'baja@kavana.com',
      password_hash: hash,
      rol: 'limpiador',
      estado: 'baja_medica',
    },
  });

  console.log('  ✅ Usuarios creados');

  // -----------------------------------------------------------------------
  // 2. Centros de trabajo
  // -----------------------------------------------------------------------
  const centro1 = await prisma.centro.upsert({
    where: { id_centro: 1 },
    update: {},
    create: {
      nombre_centro: 'CEIP San Juan',
      direccion: 'Calle Mayor 15, Madrid',
      presupuesto_mensual: 200.0,
    },
  });

  const centro2 = await prisma.centro.upsert({
    where: { id_centro: 2 },
    update: {},
    create: {
      nombre_centro: 'Oficinas Centrales Kavana',
      direccion: 'Av. de la Industria 42, Alcobendas',
      presupuesto_mensual: 500.0,
    },
  });

  const centro3 = await prisma.centro.upsert({
    where: { id_centro: 3 },
    update: {},
    create: {
      nombre_centro: 'Hospital Universitario del Sur',
      direccion: 'Calle Salud 100, Getafe',
      presupuesto_mensual: 1500.0,
    },
  });

  console.log('  ✅ Centros creados');

  // -----------------------------------------------------------------------
  // 3. Productos
  // -----------------------------------------------------------------------
  const productos = await Promise.all([
    prisma.producto.upsert({
      where: { id_producto: 1 },
      update: {},
      create: { nombre_producto: 'Lejía 2L', unidad_medida: 'unidades', stock_minimo_alerta: 5, coste_unitario: 1.20 },
    }),
    prisma.producto.upsert({
      where: { id_producto: 2 },
      update: {},
      create: { nombre_producto: 'Fregasuelos 1L', unidad_medida: 'unidades', stock_minimo_alerta: 10, coste_unitario: 1.50 },
    }),
    prisma.producto.upsert({
      where: { id_producto: 3 },
      update: {},
      create: { nombre_producto: 'Bolsa de Basura 50L (pack 10)', unidad_medida: 'paquetes', stock_minimo_alerta: 8, coste_unitario: 0.80 },
    }),
    prisma.producto.upsert({
      where: { id_producto: 4 },
      update: {},
      create: { nombre_producto: 'Papel Higiénico (pack 12)', unidad_medida: 'paquetes', stock_minimo_alerta: 15, coste_unitario: 3.50 },
    }),
    prisma.producto.upsert({
      where: { id_producto: 5 },
      update: {},
      create: { nombre_producto: 'Jabón de Manos 5L', unidad_medida: 'unidades', stock_minimo_alerta: 3, coste_unitario: 5.00 },
    }),
    prisma.producto.upsert({
      where: { id_producto: 6 },
      update: {},
      create: { nombre_producto: 'Bayetas Microfibra (pack 5)', unidad_medida: 'paquetes', stock_minimo_alerta: 10, coste_unitario: 2.50 },
    }),
  ]);

  console.log('  ✅ Productos creados');

  // -----------------------------------------------------------------------
  // 4. Asignaciones de personal
  // -----------------------------------------------------------------------
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mesPasado = new Date(hoy);
  mesPasado.setMonth(mesPasado.getMonth() - 1);
  const mesProximo = new Date(hoy);
  mesProximo.setMonth(mesProximo.getMonth() + 1);
  const dosMesesAtras = new Date(hoy);
  dosMesesAtras.setMonth(dosMesesAtras.getMonth() - 2);

  // Carlos (limpiador1) → CEIP San Juan (fijo, indefinido)
  await prisma.asignacionPersonal.upsert({
    where: { id_asignacion: 1 },
    update: {},
    create: {
      id_usuario: limpiador1.id_usuario,
      id_centro: centro1.id_centro,
      fecha_inicio: dosMesesAtras,
      fecha_fin: null, // Personal fijo
    },
  });

  // Ana (limpiador2) → Hospital (temporal, vigente)
  await prisma.asignacionPersonal.upsert({
    where: { id_asignacion: 2 },
    update: {},
    create: {
      id_usuario: limpiador2.id_usuario,
      id_centro: centro3.id_centro,
      fecha_inicio: mesPasado,
      fecha_fin: mesProximo,
    },
  });

  // Pedro (baja médica) → Oficinas (asignación pasada)
  const mesPasado2 = new Date(hoy);
  mesPasado2.setMonth(mesPasado2.getMonth() - 3);
  const mesPasado1 = new Date(hoy);
  mesPasado1.setMonth(mesPasado1.getMonth() - 1);

  await prisma.asignacionPersonal.upsert({
    where: { id_asignacion: 3 },
    update: {},
    create: {
      id_usuario: bajaMedica.id_usuario,
      id_centro: centro2.id_centro,
      fecha_inicio: mesPasado2,
      fecha_fin: mesPasado1,
    },
  });

  // Supervisor → Oficinas (fijo)
  await prisma.asignacionPersonal.upsert({
    where: { id_asignacion: 4 },
    update: {},
    create: {
      id_usuario: supervisor.id_usuario,
      id_centro: centro2.id_centro,
      fecha_inicio: dosMesesAtras,
      fecha_fin: null,
    },
  });

  console.log('  ✅ Asignaciones creadas');

  // -----------------------------------------------------------------------
  // 5. Inventario inicial por centro
  // -----------------------------------------------------------------------
  // CEIP San Juan
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro1.id_centro, id_producto: productos[0].id_producto } },
    update: {},
    create: { id_centro: centro1.id_centro, id_producto: productos[0].id_producto, cantidad_actual: 12 },
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro1.id_centro, id_producto: productos[1].id_producto } },
    update: {},
    create: { id_centro: centro1.id_centro, id_producto: productos[1].id_producto, cantidad_actual: 8 },
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro1.id_centro, id_producto: productos[2].id_producto } },
    update: {},
    create: { id_centro: centro1.id_centro, id_producto: productos[2].id_producto, cantidad_actual: 3 }, // Bajo stock!
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro1.id_centro, id_producto: productos[3].id_producto } },
    update: {},
    create: { id_centro: centro1.id_centro, id_producto: productos[3].id_producto, cantidad_actual: 20 },
  });

  // Hospital
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro3.id_centro, id_producto: productos[3].id_producto } },
    update: {},
    create: { id_centro: centro3.id_centro, id_producto: productos[3].id_producto, cantidad_actual: 10 },
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro3.id_centro, id_producto: productos[4].id_producto } },
    update: {},
    create: { id_centro: centro3.id_centro, id_producto: productos[4].id_producto, cantidad_actual: 2 }, // Bajo stock!
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro3.id_centro, id_producto: productos[5].id_producto } },
    update: {},
    create: { id_centro: centro3.id_centro, id_producto: productos[5].id_producto, cantidad_actual: 15 },
  });

  // Oficinas
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro2.id_centro, id_producto: productos[0].id_producto } },
    update: {},
    create: { id_centro: centro2.id_centro, id_producto: productos[0].id_producto, cantidad_actual: 6 },
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro2.id_centro, id_producto: productos[1].id_producto } },
    update: {},
    create: { id_centro: centro2.id_centro, id_producto: productos[1].id_producto, cantidad_actual: 4 }, // Bajo stock!
  });
  await prisma.inventarioCentro.upsert({
    where: { id_centro_id_producto: { id_centro: centro2.id_centro, id_producto: productos[4].id_producto } },
    update: {},
    create: { id_centro: centro2.id_centro, id_producto: productos[4].id_producto, cantidad_actual: 3 },
  });

  console.log('  ✅ Inventario inicial creado');

  // -----------------------------------------------------------------------
  // 6. Movimientos de ejemplo (historial)
  // -----------------------------------------------------------------------
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const anteayer = new Date(hoy);
  anteayer.setDate(anteayer.getDate() - 2);

  await prisma.registroMovimiento.createMany({
    data: [
      {
        id_usuario: limpiador1.id_usuario,
        id_centro: centro1.id_centro,
        id_producto: productos[0].id_producto,
        cantidad: -2,
        fecha_hora: ayer,
      },
      {
        id_usuario: limpiador1.id_usuario,
        id_centro: centro1.id_centro,
        id_producto: productos[2].id_producto,
        cantidad: -1,
        fecha_hora: ayer,
      },
      {
        id_usuario: supervisor.id_usuario,
        id_centro: centro1.id_centro,
        id_producto: productos[0].id_producto,
        cantidad: 10,
        fecha_hora: anteayer,
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✅ Movimientos de ejemplo creados');

  // -----------------------------------------------------------------------
  // 7. Consumo Teórico y Reglas de Notificación (OPEX & Enterprise)
  // -----------------------------------------------------------------------
  await prisma.consumoTeorico.createMany({
    data: [
      { id_centro: centro1.id_centro, id_producto: productos[0].id_producto, cantidad_teorica: 15 }, // Lejía
      { id_centro: centro1.id_centro, id_producto: productos[1].id_producto, cantidad_teorica: 10 }, // Fregasuelos
      { id_centro: centro1.id_centro, id_producto: productos[2].id_producto, cantidad_teorica: 5 },  // Bolsas
      { id_centro: centro3.id_centro, id_producto: productos[3].id_producto, cantidad_teorica: 50 }, // Papel higiénico (Hospital)
      { id_centro: centro3.id_centro, id_producto: productos[4].id_producto, cantidad_teorica: 20 }, // Jabón (Hospital)
    ],
    skipDuplicates: true,
  });

  await prisma.reglaNotificacion.createMany({
    data: [
      {
        id_supervisor: supervisor.id_usuario,
        id_centro: centro1.id_centro,
        activa: true
      },
      {
        id_supervisor: supervisor.id_usuario,
        id_operario: limpiador1.id_usuario,
        activa: true
      }
    ],
    skipDuplicates: true,
  });

  console.log('  ✅ Consumos teóricos y reglas de notificación creadas');
  console.log('🎉 Seed completado correctamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });