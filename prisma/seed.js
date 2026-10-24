// Seed de producción/demo — redirige al seed de la demo industrial.
// Los datos de demostración (Industrias Metálicas Demo, S.L. — 6 secciones de
// una planta metalúrgica ficticia) se gestionan en seed-demo-industrial.js,
// con los datos compartidos en demo-industrial-data.js.
// Mantenemos este archivo como entrypoint de `prisma db seed` / Railway
// para no romper la configuración de deploy.
require('./seed-demo-industrial.js');
