// Seed de producción/demo — redirige al seed de la demo de la cuñada.
// Los datos de demostración (Limpiezas Valencia Centro, S.L. — 4 centros)
// se gestionan en seed-demo-cunada.js.
// Mantenemos este archivo como entrypoint de `prisma db seed` / Railway
// para no romper la configuración de deploy.
require('./seed-demo-cunada.js');
