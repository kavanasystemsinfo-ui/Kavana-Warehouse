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
      // Centro ya existe: NO tocar presupuesto_mensual ni dirección.
      // El seed solo crea datos iniciales; los valores editados por el usuario
      // (presupuesto, dirección) deben persistir y no ser sobreescritos.
      console.log('  • Centro ya existe:', c.nombre_centro, `(presu ${c.presupuesto_mensual ?? '—'}€ — sin cambios)`);
    }
    centros[nombre] = c.id_centro;
  }

  // 3. Productos (catálogo realista de empresa de limpieza)
  const productosDef = [
    // Papel / higiene
    { nombre: 'Papel higiénico (rollo)', unidad: 'rollos', coste: 0.8, min: 5 },
    { nombre: 'Papel industrial (rollo)', unidad: 'rollos', coste: 1.2, min: 3 },
    { nombre: 'Papel de cocina (rollo)', unidad: 'rollos', coste: 0.9, min: 4 },
    // Químicos básicos
    { nombre: 'Lejía', unidad: 'litros', coste: 1.5, min: 4 },
    { nombre: 'Amoníaco', unidad: 'litros', coste: 2.1, min: 3 },
    { nombre: 'Desengrasante', unidad: 'litros', coste: 3.2, min: 3 },
    { nombre: 'Limpia cristales', unidad: 'litros', coste: 2.4, min: 3 },
    { nombre: 'Fregasuelos', unidad: 'litros', coste: 1.8, min: 5 },
    { nombre: 'Detergente lavadora', unidad: 'litros', coste: 2.0, min: 4 },
    // Guantes (varios tipos)
    { nombre: 'Guantes de latex (par)', unidad: 'pares', coste: 0.25, min: 10 },
    { nombre: 'Guantes de nitrilo (par)', unidad: 'pares', coste: 0.35, min: 10 },
    { nombre: 'Guantes de vinilo (par)', unidad: 'pares', coste: 0.3, min: 10 },
    { nombre: 'Guantes gruesos (par)', unidad: 'pares', coste: 0.6, min: 6 },
    // Bolsas de basura (varios tamaños)
    { nombre: 'Bolsas basura 50L (paq)', unidad: 'paquetes', coste: 2.0, min: 5 },
    { nombre: 'Bolsas basura 100L (paq)', unidad: 'paquetes', coste: 3.5, min: 4 },
    { nombre: 'Bolsas basura 240L (paq)', unidad: 'paquetes', coste: 6.0, min: 3 },
    // Utensilios
    { nombre: 'Mopa / fregona', unidad: 'unidades', coste: 4.5, min: 2 },
    { nombre: 'Cubo de fregar', unidad: 'unidades', coste: 3.0, min: 2 },
    { nombre: 'Estropajo / esponja (ud)', unidad: 'unidades', coste: 0.4, min: 15 },
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
  //    Estructura: [centro, producto, registrado, fisico|null, minimo]
  const inventario = [
    // Diputación — todo cuadra (contado = registrado), catálogo amplio
    ['Diputación de Valencia', 'Papel higiénico (rollo)', 40, 40, 10],
    ['Diputación de Valencia', 'Papel de cocina (rollo)', 25, 25, 8],
    ['Diputación de Valencia', 'Lejía', 25, 25, 8],
    ['Diputación de Valencia', 'Fregasuelos', 30, 30, 10],
    ['Diputación de Valencia', 'Guantes de nitrilo (par)', 60, 58, 10], // -2 (leve merma)
    ['Diputación de Valencia', 'Bolsas basura 100L (paq)', 15, 15, 5],
    ['Diputación de Valencia', 'Amoníaco', 12, 12, 4],
    ['Diputación de Valencia', 'Limpia cristales', 10, 10, 4],
    // Beneficencia — sin contar aún (fisico null); lejía bajo mínimo
    ['Beneficencia', 'Papel higiénico (rollo)', 35, null, 12],
    ['Beneficencia', 'Bolsas basura 50L (paq)', 20, null, 5],
    ['Beneficencia', 'Lejía', 22, 22, 30], // registrado 22 < mínimo 30 → propuesta de compra
    ['Beneficencia', 'Desengrasante', 8, null, 6],
    ['Beneficencia', 'Guantes de latex (par)', 40, null, 12],
    ['Beneficencia', 'Fregasuelos', 18, null, 8],
    // Plaza de Toros — ANÓMALO merma: registrado 50, físico 30 → faltan 20; mínimo alto
    ['Plaza de Toros', 'Papel higiénico (rollo)', 50, 30, 45], // registrado 50 > mínimo 45, pero merma de 20 rollos
    ['Plaza de Toros', 'Lejía', 18, 18, 10],
    ['Plaza de Toros', 'Papel industrial (rollo)', 22, 22, 15],
    ['Plaza de Toros', 'Guantes gruesos (par)', 30, 30, 8],
    ['Plaza de Toros', 'Bolsas basura 240L (paq)', 10, 10, 4],
    ['Plaza de Toros', 'Detergente lavadora', 14, 14, 6],
    // Museo Bellas Artes — sobra un poco (fisico > registrado, no crítico)
    ['Museo Bellas Artes', 'Papel higiénico (rollo)', 30, 33, 10],
    ['Museo Bellas Artes', 'Guantes de vinilo (par)', 45, 45, 10],
    ['Museo Bellas Artes', 'Fregasuelos', 22, 22, 8],
    ['Museo Bellas Artes', 'Mopa / fregona', 4, 4, 2],
    ['Museo Bellas Artes', 'Cubo de fregar', 3, 3, 2],
    ['Museo Bellas Artes', 'Estropajo / esponja (ud)', 50, 50, 15],
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
