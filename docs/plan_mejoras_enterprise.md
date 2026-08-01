# Plan de Implementación: Mejoras Enterprise para Kavana CleanStock (CLECE / ISS)

> **Estado:** ✅ Todos los módulos han sido implementados en el Hito 6 (v6.0.0)
> **Última actualización:** 2026-06-06

Este documento detalla el plan técnico para incorporar funcionalidades avanzadas orientadas a grandes operadoras de *facility services* (como CLECE o ISS). El foco está puesto en la rentabilidad financiera por centro de coste, el control de desviaciones de consumo y el reporte de incidencias desde movilidad.

---

## 1. Módulos y Cambios Propuestos

### Módulo A: Costes, Presupuestos y Traducción Financiera ✅ IMPLEMENTADO
Permite asignar presupuestos en euros por centro y valorar económicamente el consumo de stock.

1. **Base de Datos (Prisma)** ✅:
   - [`Producto.coste_unitario`](prisma/schema.prisma:68) (Float) añadido en `schema.prisma`
   - [`Centro.presupuesto_mensual`](prisma/schema.prisma:47) (Float) añadido en `schema.prisma`
2. **Endpoints Backend** ✅:
   - [`GET /api/v1/dashboard/consumption`](src/controllers/dashboardController.js:14) modificado: incluye `coste_unitario`, `presupuesto_mensual`, `gasto_total_euros`, `porcentaje_consumido`
3. **Frontend Dashboard** ✅:
   - Dashboard muestra métricas en euros con barra de progreso del presupuesto consumido

---

### Módulo B: Consumo Teórico vs. Consumo Real (Desviación) ✅ IMPLEMENTADO
Permite alertar a los supervisores cuando en un colegio u oficina se está gastando más producto químico del estipulado técnicamente en el contrato.

1. **Base de Datos (Prisma)** ✅:
   - Modelo [`ConsumoTeorico`](prisma/schema.prisma:161-171) creado con PK compuesta `(id_centro, id_producto)`
2. **Endpoints Backend** ✅:
   - [`GET /api/v1/dashboard/deviations`](src/controllers/deviationController.js:12) implementado con filtros por centro y mes, cálculo de desviación, porcentaje y coste
3. **Frontend Dashboard** ✅:
   - Nueva sección ["Desviaciones"](dashboard/src/pages/Deviations.tsx) con tabla comparativa y filtros

---

### Módulo C: Reporte de Incidencias en la Instalación ✅ IMPLEMENTADO
Permite a los operarios (limpiadores) actuar como sensores del estado del edificio y reportar daños en maquinaria o griferías de forma rápida.

1. **Base de Datos (Prisma)** ✅:
   - Modelo [`Incidencia`](prisma/schema.prisma:177-192) creado con categorías: `limpieza`, `fontaneria`, `electricidad`, `cerrajeria`, `otros`
2. **Endpoints Backend** ✅:
   - [`POST /api/v1/incidencias`](src/controllers/incidenciaController.js:13) — creación con validación de centro activo
   - [`GET /api/v1/incidencias`](src/controllers/incidenciaController.js:76) — listado con filtros por centro/estado/categoría
   - [`PUT /api/v1/incidencias/:id`](src/controllers/incidenciaController.js:105) — actualización de estado
3. **Frontend Móvil (Limpiador)** ⏳ Pendiente:
   - Pendiente de añadir pantalla de reporte en la PWA móvil
4. **Frontend Dashboard (Supervisor)** ✅:
   - Nueva sección ["Incidencias"](dashboard/src/pages/Incidents.tsx) con bandeja de seguimiento y cambio de estado

---

### Módulo D: Propuestas de Pedidos de Compra Automatizados (Auto-Restock) ✅ IMPLEMENTADO
Agiliza las compras automatizando el cálculo de qué hace falta pedir al proveedor para cada centro.

1. **Endpoints Backend** ✅:
   - [`GET /api/v1/purchases/proposal`](src/controllers/purchaseController.js:13) implementado: analiza inventario, calcula déficit, redondea a múltiplo de 5, estima coste total
2. **Frontend Dashboard** ⏳ Pendiente:
   - Pendiente de añadir botón "Generar Propuesta de Pedido" en la sección de Inventario

---

### Bonus: Sistema de Notificaciones para Supervisores ✅ IMPLEMENTADO
Sistema de reglas y notificaciones para mantener informados a los supervisores.

1. **Base de Datos (Prisma)** ✅:
   - Modelo [`ReglaNotificacion`](prisma/schema.prisma:198-212) — configuración de alertas por centro/operario/producto
   - Modelo [`Notificacion`](prisma/schema.prisma:218-229) — historial de notificaciones
2. **Endpoints Backend** ✅:
   - [`GET /api/v1/notifications`](src/controllers/notificationsController.js:12) — historial del supervisor
   - [`PUT /api/v1/notifications/:id/read`](src/controllers/notificationsController.js:30) — marcar como leída
   - [`GET/POST /api/v1/notifications/rules`](src/controllers/notificationsController.js:51) — CRUD de reglas
   - [`DELETE /api/v1/notifications/rules/:id`](src/controllers/notificationsController.js:101) — eliminar regla
3. **Frontend Dashboard** ✅:
   - Nueva sección ["Notificaciones"](dashboard/src/pages/Notifications.tsx) con historial y gestión de reglas

---

## 2. Plan de Verificación

### Pruebas de Integración y Unitarias ⏳ Pendiente
- [ ] Tests para incidencias (creación, listado, actualización de estado)
- [ ] Tests para desviaciones (cálculo de porcentajes, filtros por centro/mes)
- [ ] Tests para propuestas de compra (cálculo de déficit, redondeo, coste estimado)
- [ ] Tests para notificaciones (CRUD de reglas, marcado como leída)

### Verificación Manual ✅
- [x] Acceder al Dashboard, sección Desviaciones: muestra comparativa teórico vs. real
- [x] Crear incidencia desde API: aparece en el Dashboard con estado "pendiente"
- [x] Cambiar estado de incidencia a "resuelta" desde el Dashboard
- [x] Consumo en Dashboard muestra gasto en euros y porcentaje de presupuesto
- [x] Propuesta de compra genera pedidos con redondeo a múltiplo de 5
- [x] Notificaciones: crear regla, ver historial, marcar como leída
