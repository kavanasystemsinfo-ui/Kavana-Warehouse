// =============================================================================
// Kavana CleanStock — Protected API Routes (/api/v1)
//   Stock:
//     GET    /stock/inventory   → Inventario (autenticado)
//     POST   /stock/consume     → Consumir stock (autenticado)
//     POST   /stock/restock     → Reponer stock (supervisor+)
//     GET    /stock/alerts      → Alertas stock mínimo (autenticado)
//
//   Asignaciones:
//     GET    /asignaciones/active → Centro activo (autenticado)
//     GET    /asignaciones        → Listar asignaciones (autenticado)
//     POST   /asignaciones        → Crear asignación (supervisor+)
//     PUT    /asignaciones/:id    → Actualizar asignación (supervisor+)
//
//   Dashboard:
//     GET    /dashboard/consumption  → Consumo OPEX por centro/producto
//     GET    /dashboard/alerts       → Alertas críticas de stock
//     GET    /dashboard/deviations   → Desviaciones teórico vs. real
//
//   Incidencias:
//     POST   /incidencias       → Reportar incidencia (autenticado)
//     GET    /incidencias        → Listar incidencias (autenticado)
//     PUT    /incidencias/:id    → Actualizar estado (supervisor+)
//
//   Compras:
//     GET    /purchases/proposal → Propuesta de reabastecimiento (supervisor+)
//
//   Notificaciones:
//     GET    /notifications            → Obtener notificaciones (supervisor+)
//     PUT    /notifications/:id/read   → Marcar como leída (supervisor+)
//     GET    /notifications/rules      → Obtener reglas (supervisor+)
//     POST   /notifications/rules      → Crear regla (supervisor+)
//     DELETE /notifications/rules/:id  → Eliminar regla (supervisor+)
// =============================================================================

const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validate,
  consumeStockSchema,
  restockSchema,
  createAsignacionSchema,
  updateAsignacionSchema,
} = require('../middleware/validate');
const stockController = require('../controllers/stockController');
const asignacionController = require('../controllers/asignacionController');
const dashboardController = require('../controllers/dashboardController');
const deviationController = require('../controllers/deviationController');
const incidenciaController = require('../controllers/incidenciaController');
const purchaseController = require('../controllers/purchaseController');
const notificationsController = require('../controllers/notificationsController');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// --- Stock ---
router.get('/stock/inventory', stockController.getInventory);
router.get('/stock/centros', stockController.getCentros);
router.post('/stock/consume', validate(consumeStockSchema), stockController.consumeStock);
router.post('/stock/restock', authorize('supervisor', 'admin'), validate(restockSchema), stockController.restock);
router.get('/stock/alerts', stockController.getAlerts);

// --- Asignaciones ---
router.get('/asignaciones/active', asignacionController.getActive);
router.get('/asignaciones/users', asignacionController.getAllUsers);
router.get('/asignaciones', asignacionController.list);
router.post('/asignaciones', authorize('supervisor', 'admin'), validate(createAsignacionSchema), asignacionController.create);
router.put('/asignaciones/:id', authorize('supervisor', 'admin'), validate(updateAsignacionSchema), asignacionController.update);

// --- Dashboard ---
router.get('/dashboard/consumption', authorize('supervisor', 'admin'), dashboardController.consumption);
router.get('/dashboard/alerts', authorize('supervisor', 'admin'), dashboardController.alerts);
router.get('/dashboard/deviations', authorize('supervisor', 'admin'), deviationController.getDeviations);

// --- Incidencias ---
router.post('/incidencias', incidenciaController.createIncidencia);
router.get('/incidencias', incidenciaController.listIncidencias);
router.put('/incidencias/:id', authorize('supervisor', 'admin'), incidenciaController.updateIncidencia);

// --- Compras ---
router.get('/purchases/proposal', authorize('supervisor', 'admin'), purchaseController.getProposal);

// --- Notificaciones ---
router.get('/notifications', authorize('supervisor', 'admin'), notificationsController.getNotifications);
router.put('/notifications/:id/read', authorize('supervisor', 'admin'), notificationsController.markAsRead);
router.get('/notifications/rules', authorize('supervisor', 'admin'), notificationsController.getRules);
router.post('/notifications/rules', authorize('supervisor', 'admin'), notificationsController.createRule);
router.delete('/notifications/rules/:id', authorize('supervisor', 'admin'), notificationsController.deleteRule);

module.exports = router;