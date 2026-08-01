# Internal Roadmap — Kavana CleanStock

> **Propósito:** Control de estado del proyecto, decisiones técnicas tomadas y planificación viva.
> **Última actualización:** 2026-06-06 (Hito 7 — Deploy Cloud Gratuito: Neon + Render + Vercel)

---

## Estado General del Proyecto

| Fase | Estado |
|------|--------|
| Infraestructura Base y API Relacional | ✅ Completado |
| Mejoras del Hito 1 (Logging, Refresh Tokens, Validación, Dashboard) | ✅ Completado |
| **Mejoras v1.2 — Tests Unitarios y Limpieza de Código** | ✅ Completado |
| **Mejoras v1.3 — Tests Dashboard + Documentación OpenAPI** | ✅ Completado |
| **Aplicación Móvil del Limpiador (PWA)** | ✅ Completado (v2.0) |
| **Panel de Control del Supervisor (Dashboard Frontend)** | ✅ Completado (v3.0) |
| **Despliegue Completo con Docker Compose** | ✅ Completado (Hito 4) |
| **Tiempo Real con Socket.IO** | ✅ Completado (Hito 5) |
| **Módulos Enterprise (OPEX, Desviaciones, Incidencias, Compras, Notificaciones)** | ✅ Completado (Hito 6) |
| **Deploy Cloud Gratuito (Neon + Render + Vercel)** | ✅ Completado (Hito 7) |

---

## Hito 1 — Infraestructura Base y API Relacional

### ✅ Completado

- [x] Creación de estructura de carpetas del proyecto:
  - `config/` — Configuración de BD y entorno
  - `src/controllers/` — Lógica de negocio
  - `src/routes/` — Enrutamiento REST
  - `src/middleware/` — Middleware de autenticación y validación
  - `prisma/` — Esquemas, modelos y migraciones Prisma (reemplaza a `src/models/`)
  - `docs/` — Documentación interna y técnica
- [x] Generación de `package.json` con dependencias:
  - **Runtime:** express, @prisma/client, bcryptjs, jsonwebtoken, cors, helmet, winston, zod, swagger-jsdoc, swagger-ui-express
  - **Dev:** nodemon, prisma, jest, node-mocks-http, supertest
- [x] Instalación de dependencias npm (`node_modules/`)
- [x] Creación de `docs/internal_roadmap.md` (este archivo)
- [x] Creación de `docs/architecture_spec.md`
- [x] Creación de `docker-compose.yml` para PostgreSQL 16 Alpine
- [x] Creación de `prisma/schema.prisma` con el modelo completo (7 tablas):
  - `usuarios` — Tabla de usuarios con roles (limpiador, supervisor, admin)
  - `centros` — Centros de trabajo
  - `productos` — Catálogo global de productos
  - `asignaciones_personal` — Asignaciones temporales con ventana de fechas
  - `inventario_centros` — Stock por centro (PK compuesta)
  - `registro_movimientos` — Auditoría de movimientos de stock
  - `refresh_tokens` — Tokens de actualización JWT para sesiones persistentes
- [x] Creación de `.env` con variables de entorno (DB, JWT, Server, Refresh)
- [x] Implementación de `src/lib/prisma.js` — Singleton de Prisma Client
- [x] Implementación de `src/server.js` — Punto de entrada Express con middleware chain (helmet, cors, winston-http, json). Puerto configurable vía `PORT` en `.env` (por defecto: `3000`).
- [x] Middleware JWT (`src/middleware/auth.js`) — autenticación + autorización RBAC por roles
- [x] Middleware de validación (`src/middleware/validate.js`) — Validación Zod con esquemas tipados
- [x] Logger estructurado (`src/lib/logger.js`) — Winston con formato timestamp, colores, niveles
- [x] Controlador de autenticación (`src/controllers/authController.js`) — login, register, verify, refresh, logout, cleanupExpiredTokens
- [x] Controlador de stock (`src/controllers/stockController.js`) — inventario, consumir, reponer, alertas, listar centros
- [x] Controlador de asignaciones (`src/controllers/asignacionController.js`) — Centro activo, CRUD
- [x] Controlador de dashboard (`src/controllers/dashboardController.js`) — consumo analítico + alertas críticas
- [x] Rutas de autenticación (`src/routes/auth.js`) — POST login, POST register, GET verify, POST refresh, POST logout
- [x] Rutas de API protegidas (`src/routes/api.js`) — Stock (inventario, consumir, reponer, alertas, centros), Asignaciones (centro activo, listar, crear, actualizar, usuarios), Dashboard (consumo analítico + alertas)
- [x] Endpoints adicionales para selects del Dashboard:
  - `GET /api/v1/stock/centros` — Listar centros disponibles
  - `GET /api/v1/asignaciones/users` — Listar usuarios del sistema
- [x] Ejecutar contenedor Docker PostgreSQL 16
- [x] Migración Prisma (`prisma/migrations/20260603150812_init` + `20260603154619_add_refresh_tokens`)
- [x] Script de seed (`prisma/seed.js`) — 5 usuarios, 3 centros, 6 productos, asignaciones, inventario, movimientos
- [x] Verificación de endpoints — health, login, verify, centro activo, consumo stock, restock, register, alerts (todo ✅)
- [x] Fix: Error `PrismaClientKnownRequestError (P2019)` en `GET /api/v1/stock/alerts`
- [x] Logging estructurado: Winston reemplaza a morgan — logs coloreados en consola, archivos rotativos en producción
- [x] Sistema de refresh tokens: tokens de 30 días con rotación (revoke on use), limpieza automática cada 6h, endpoint `POST /refresh` y `POST /logout`
- [x] Middleware de validación Zod: esquemas tipados para login, register, refresh, consumeStock, restock, createAsignacion, updateAsignacion
- [x] Endpoint Dashboard: `GET /dashboard/consumption` (analítica con filtros y agrupación) + `GET /dashboard/alerts` (alertas críticas y advertencias separadas)

### ✅ Completado (v1.2 — Tests Unitarios y Limpieza)

- [x] Eliminación de `morgan` como dependencia (reemplazado por Winston desde v1.1)
- [x] Eliminación de validación manual redundante en controladores (Zod ya valida schemas)
- [x] Instalación de Jest + supertest + node-mocks-http como dependencias de desarrollo
- [x] Configuración de Jest con mocks globales (Prisma, Logger)
- [x] **80 tests unitarios** en 5 suites de prueba:
  - `src/__tests__/auth.middleware.test.js` — 10 tests (authenticate + authorize)
  - `src/__tests__/validate.middleware.test.js` — 22 tests (todos los schemas Zod)
  - `src/__tests__/auth.controller.test.js` — 17 tests (login, register, verify, refresh, logout, cleanup)
  - `src/__tests__/stock.controller.test.js` — 16 tests (inventory, consume, restock, alerts)
  - `src/__tests__/asignacion.controller.test.js` — 14 tests (active, list, create, update)
- [x] Comando `npm test` para ejecutar todos los tests

### ✅ Completado (v1.3 — Tests Dashboard + Documentación OpenAPI)

- [x] **12 tests** para dashboardController (8 consumption + 4 alerts):
  - `consumption`: grouped data, centro filter, producto filter, date range filter, empty result, 100-item limit, multi-center grouping, database error
  - `alerts`: critical/warning separation, empty alerts, multi-center alerts, database error
- [x] Instalación de `swagger-jsdoc` y `swagger-ui-express` como dependencias
- [x] Documentación OpenAPI 3.0 completa en `src/config/swagger.js`:
  - Schemas tipados para todos los endpoints (Login, Register, Refresh, Consume, Restock, Asignaciones, Dashboard)
  - Security scheme JWT Bearer Auth
  - Todos los endpoints documentados con parámetros, request bodies y respuestas
  - Accesible vía `GET /api-docs` en el servidor Express (puerto `3000`)
- [x] **92 tests totales** en 6 suites de prueba (80 originales + 12 nuevos)
- [x] Actualización de `package.json` con nuevas dependencias

---

## Hito 2 — Aplicación Móvil del Limpiador (PWA) — v2.0

### ✅ Completado (v2.0)

- [x] Inicializar proyecto Vite + React + TypeScript en `mobile/`
- [x] Service Worker con `vite-plugin-pwa` + Workbox (NetworkFirst para API, precaching de assets)
- [x] Librería API cliente (`mobile/src/lib/api.ts`):
  - JWT + refresh token con rotación automática
  - Interceptor 401 → refresh → retry
  - `login()`, `logout()`, `getCentroActivo()`, `getInventory()`, `consumeStock()`
- [x] IndexedDB offline cache (`mobile/src/lib/db.ts`) con `idb`:
  - 3 object stores: `inventory`, `pending_consumptions`, `centro_activo`
  - `cacheInventory()`, `getCachedInventory()`, `updateCachedInventoryItem()`
  - `addPendingConsumption()`, `getPendingConsumptions()`, `markPendingSynced()`, `removePendingConsumption()`, `clearSyncedConsumptions()`
  - `cacheCentroActivo()`, `getCachedCentroActivo()`
- [x] Pantalla Login (`mobile/src/pages/Login.tsx`):
  - Formulario email + contraseña
  - Manejo de errores
  - Almacenamiento de tokens en localStorage
- [x] Pantalla Principal (`mobile/src/pages/Main.tsx`):
  - Header con info de usuario, rol, centro activo
  - Lista de inventario con indicadores de stock bajo/crítico
  - Botón "Consumir" por producto
  - Modal de consumo con selector de cantidad (+/−)
  - Confirmación online → llama API
  - Sin conexión → guarda en IndexedDB + UI optimista
- [x] Sincronización batch automática al recuperar conexión:
  - `useOnlineStatus` hook detecta cambios online/offline
  - Sincroniza consumos pendientes en orden FIFO
  - Refresca datos tras sincronización
- [x] Indicadores visuales de estado:
  - Badge "Sin conexión", "Sincronizando...", "# pendientes"
  - Alertas de éxito/error con auto-dismiss
- [x] Build de producción verificado (0 errores TS, 0 errores Vite, PWA generado)
- [x] PWA manifest con `display: standalone`, theme-color, orientación portrait

---

## Hito 3 — Panel de Control del Supervisor (Dashboard Frontend)

### ✅ Completado

- [x] Inicializar proyecto Vite + React + TypeScript en `dashboard/` con puerto 4001
- [x] Autenticación con JWT + refresh token rotation (interceptor 401 → refresh → retry)
- [x] Dashboard de consumo por centro/producto/período con filtros:
  - Selector de centro, producto y rango de fechas
  - Tarjetas de estadísticas (consumo total, movimientos, alertas)
  - Tabla de consumo agrupado por centro con badges de productos
  - Tabla de últimos 50 movimientos
  - Exportación a CSV desde cada sección
- [x] Panel de alertas de stock mínimo con separación crítica/advertencia:
  - Filtro por centro
  - Indicadores de déficit
  - Exportación a CSV
- [x] Gestión de asignaciones de personal con tabla CRUD completa:
  - Listado con usuario, rol, centro, fechas, estado activo/vencido
  - Modal de creación con validación de solapamiento
  - Modal de edición de fechas
  - Filtros por centro
- [x] Página de inventario completo:
  - Tabla con stock actual, mínimo, indicador visual (normal/bajo/crítico)
  - Modal de reposición de stock con selector de centro/producto/cantidad
  - Filtro por centro
- [x] Reportes exportables CSV (BOM UTF-8, escape de campos):
  - Consumo por centro, movimientos, alertas críticas, advertencias
- [x] Nuevos endpoints backend:
  - `GET /api/v1/asignaciones/users` — listar usuarios para selects
  - `GET /api/v1/stock/centros` — listar centros para selects
- [x] Sidebar de navegación con secciones: Dashboard, Alertas, Asignaciones, Inventario
- [x] Build de producción verificado (0 errores TS, 0 errores Vite, build en 116ms)
- [x] Proxy de API a `localhost:3000` en desarrollo

### Reportes Exportables

El dashboard exporta datos en formato CSV con BOM UTF-8 para compatibilidad con Excel:
- **Dashboard**: Consumo por centro (producto, cantidad) y últimos movimientos
- **Alertas**: Alertas críticas y advertencias separadas con datos de déficit
- **Asignaciones**: Se puede extender fácilmente desde la tabla

---

## Hito 4 — Despliegue Completo con Docker Compose

### ✅ Completado

- [x] **Dockerfile multi-stage para API** (`Dockerfile.api`):
  - `node:20-alpine` con Prisma Client generado
  - Script `start.sh` que ejecuta migraciones + seed + servidor automáticamente
  - Usuario no-root (`appuser`)
  - Health check vía `GET /health`
  - Variables de entorno inyectadas en tiempo de ejecución (DATABASE_URL apunta a `db:5432`)
- [x] **Dockerfile multi-stage para Dashboard** (`Dockerfile.dashboard`):
  - Build: Vite + TypeScript → nginx:1.27-alpine
  - Proxy inverso `/api/*` → `http://api:3000`
  - Cacheo de assets estáticos (1 año), HTML sin caché
  - Gzip compresión, headers de seguridad
  - Usuario no-root (`nginx`)
  - Health check vía nginx directo
- [x] **Dockerfile multi-stage para Mobile PWA** (`Dockerfile.mobile`):
  - Build: Vite + TypeScript → nginx:1.27-alpine
  - Proxy inverso `/api/*` → `http://api:3000`
  - Service Worker con headers `no-cache` y `Service-Worker-Allowed: /`
  - Cacheo de PWA assets, Gzip, headers de seguridad
  - Usuario no-root (`nginx`)
- [x] **docker-compose.yml con 4 servicios**:
  - `db` — PostgreSQL 16 Alpine con healthcheck y volumen persistente
  - `api` — Express + Prisma, depende de `db` (condition: service_healthy)
  - `dashboard` — nginx sirviendo React build, depende de `api`
  - `mobile` — nginx sirviendo React build, depende de `api`
  - Red interna `kavana-net` (bridge) para comunicación entre servicios
- [x] **Configuraciones nginx**:
  - `dashboard/nginx.conf` — SPA fallback, API proxy, Gzip, seguridad
  - `mobile/nginx.conf` — SPA fallback, SW headers, API proxy, Gzip, seguridad
- [x] **Documentación de despliegue** (`docs/deployment.md`):
  - Arquitectura, puertos, prerequisitos
  - Quick start local (5 pasos)
  - Variables de entorno y `.env.example`
  - Producción: secrets, backup/restore, actualización
  - Escalado horizontal y CDN
  - Troubleshooting de servicios
- [x] **Build verificado de 4 imágenes Docker**:
  - `kavana-cleanstock-api` — 1.09 GB (Node.js + Prisma + dependencias)
  - `kavana-cleanstock-dashboard` — 74.4 MB (nginx + static assets)
  - `kavana-cleanstock-mobile` — 74.7 MB (nginx + static assets + PWA)
  - `postgres:16-alpine` — 396 MB (base de datos)
- [x] **Fix: errores TypeScript en mobile**:
  - `useCallback` importado pero no usado en `useOnlineStatus.ts`
  - Variable `data` no usada en `login()` de `api.ts`
  - Logo `../../../logos/logo fondo azul.png` → `/logo.png` en `public/`
  - `includeAssets` actualizado, `logo-cleanops.png` (30.7 MB) eliminado
  - Workbox `maximumFileSizeToCacheInBytes` configurado a 4 MB
- [x] **Script `start.bat` — Lanzador de desarrollo local**:
  - Verifica/inicia contenedor Docker PostgreSQL automáticamente
  - Instala dependencias si `node_modules` no existe
  - Ejecuta migraciones Prisma (`generate` + `migrate deploy`)
  - Abre 3 ventanas de terminal: API (:3000), Dashboard (:4001), Mobile (:4000)
  - Abre el navegador en Dashboard automáticamente
  - Muestra todas las URLs de los servicios
---

## Hito 5 — Tiempo Real con Socket.IO

### ✅ Completado

- [x] Instalación de `socket.io` en backend y `socket.io-client` en dashboard
- [x] [`src/lib/socket.js`](src/lib/socket.js) — Servidor Socket.IO:
  - Autenticación JWT en handshake (middleware)
  - Rooms por centro (`centro:{id}`) para eventos filtrados
  - Eventos emitidos: `stock:consumed`, `stock:restocked`, `stock:alert`
  - Helpers `emitStockConsumed()` y `emitStockRestocked()` para controllers
- [x] [`src/server.js`](src/server.js) — Integración:
  - Cambio de `app.listen()` a `http.createServer()` para compatibilidad Socket.IO
  - Inicialización de Socket.IO sobre el mismo servidor HTTP
- [x] [`src/controllers/stockController.js`](src/controllers/stockController.js) — Emisión de eventos:
  - `emitStockConsumed()` después de cada consumo (`consumeStock`)
  - `emitStockRestocked()` después de cada reposición (`restock`)
  - Alerta automática si stock cae por debajo del mínimo
- [x] [`dashboard/src/lib/socket.ts`](dashboard/src/lib/socket.ts) — Cliente Socket.IO:
  - Conexión automática con JWT almacenado
  - Reconexión con backoff exponencial
  - Función `subscribe()` para escuchar eventos
  - `joinCentro()`/`leaveCentro()` para suscripción a centros
  - Limpieza automática de listeners
- [x] [`dashboard/src/pages/Inventario.tsx`](dashboard/src/pages/Inventario.tsx) — Actualización en tiempo real:
  - Actualización optimista del array de inventario sin recargar la página
  - Toast de notificación visual al recibir `stock:consumed` o `stock:restocked`
  - Suscripción a rooms según filtro de centro activo
- [x] [`dashboard/src/pages/Alerts.tsx`](dashboard/src/pages/Alerts.tsx) — Alertas en tiempo real:
  - Recarga automática de datos al recibir `stock:alert`
  - Conexión Socket.IO en montaje, desconexión en desmontaje
- [x] [`dashboard/nginx.conf`](dashboard/nginx.conf) — Configuración para producción:
  - Nuevo location `/socket.io/` con proxy WebSocket a `api:3000`
  - Timeouts extendidos (3600s) para conexiones WebSocket
  - `proxy_buffering off` para evitar buffering de WebSocket
- [x] [`dashboard/vite.config.ts`](dashboard/vite.config.ts) — Configuración para desarrollo:
  - Proxy `/socket.io` con `ws: true` en Vite
- [x] Documentación actualizada en [`docs/architecture_spec.md`](docs/architecture_spec.md):
  - Diagrama de arquitectura con Socket.IO
  - Deployment diagram con WebSocket proxy
  - Referencia a `dashboard/nginx.conf` con Socket.IO

---

## Hito 6 — Módulos Enterprise (OPEX, Desviaciones, Incidencias, Compras, Notificaciones)

### ✅ Completado (v6.0)

- [x] **Modelo de datos ampliado** ([`prisma/schema.prisma`](prisma/schema.prisma)):
  - `Centro.presupuesto_mensual` — Límite de coste mensual en euros
  - `Producto.coste_unitario` — Precio de adquisición por unidad
  - `ConsumoTeorico` — Cantidad estándar mensual asignada por centro/producto (PK compuesta)
  - `Incidencia` — Reporte de averías con categoría, título, descripción, foto, estado
  - `ReglaNotificacion` — Configuración de alertas por supervisor/centro/operario/producto
  - `Notificacion` — Historial de notificaciones enviadas a supervisores
- [x] **Migración Prisma** ([`prisma/migrations/20260605145346_opex_and_notifications`](prisma/migrations/20260605145346_opex_and_notifications/migration.sql)):
  - 4 nuevas tablas: `consumo_teorico`, `incidencias`, `reglas_notificacion`, `notificaciones`
  - 2 columnas nuevas: `centros.presupuesto_mensual`, `productos.coste_unitario`
  - Foreign keys con CASCADE y RESTRICT según corresponda
- [x] **Seed actualizado** ([`prisma/seed.js`](prisma/seed.js)):
  - Centros con `presupuesto_mensual` (200€ y 500€)
  - Productos con `coste_unitario` (1.50€, 3.00€, 8.50€, etc.)
  - Consumos teóricos para cada centro/producto
  - Incidencias de ejemplo
  - Reglas de notificación para el supervisor
- [x] **Módulo A — Costes, Presupuestos y Traducción Financiera (OPEX)**:
  - [`src/controllers/dashboardController.js`](src/controllers/dashboardController.js) — `consumption` ahora incluye:
    - `coste_unitario` por producto
    - `presupuesto_mensual` por centro
    - `gasto_total_euros` y `gasto_euros` por movimiento
    - `porcentaje_consumido` del presupuesto mensual
  - Dashboard frontend muestra métricas en euros con barra de progreso
- [x] **Módulo B — Consumo Teórico vs. Real (Desviaciones)**:
  - [`src/controllers/deviationController.js`](src/controllers/deviationController.js) — `getDeviations()`:
    - Compara consumo real del mes vs. teórico por centro/producto
    - Calcula desviación absoluta, porcentaje consumido y coste de desviación
    - Clasifica estado: `exceso`, `infraconsumo`, `normal`
    - Filtros por centro y mes (YYYY-MM)
    - Ordenado por desviación descendente (peores primero)
  - [`src/routes/api.js`](src/routes/api.js:75) — `GET /dashboard/deviations` (supervisor+)
  - [`dashboard/src/pages/Deviations.tsx`](dashboard/src/pages/Deviations.tsx) — Nueva página con tabla de desviaciones y filtros
- [x] **Módulo C — Reporte de Incidencias**:
  - [`src/controllers/incidenciaController.js`](src/controllers/incidenciaController.js):
    - `createIncidencia()` — Creación con validación de centro activo para limpiadores
    - `listIncidencias()` — Listado con filtros por centro/estado/categoría
    - `updateIncidencia()` — Cambio de estado (pendiente → en_proceso → resuelta)
  - [`src/routes/api.js`](src/routes/api.js:78-80) — `POST/GET /incidencias`, `PUT /incidencias/:id`
  - [`dashboard/src/pages/Incidents.tsx`](dashboard/src/pages/Incidents.tsx) — Bandeja de incidencias con filtros y cambio de estado
- [x] **Módulo D — Propuestas de Pedidos de Compra (Auto-Restock)**:
  - [`src/controllers/purchaseController.js`](src/controllers/purchaseController.js) — `getProposal()`:
    - Analiza inventario completo o por centro
    - Filtra productos por debajo del stock mínimo
    - Calcula déficit y cantidad de pedido (redondeo a múltiplo de 5)
    - Estima coste total del pedido
  - [`src/routes/api.js`](src/routes/api.js:83) — `GET /purchases/proposal` (supervisor+)
- [x] **Sistema de Notificaciones para Supervisores**:
  - [`src/controllers/notificationsController.js`](src/controllers/notificationsController.js):
    - `getNotifications()` — Historial de notificaciones del supervisor
    - `markAsRead()` — Marcar como leída (con verificación de propiedad)
    - `getRules()` / `createRule()` / `deleteRule()` — CRUD de reglas de notificación
  - [`src/routes/api.js`](src/routes/api.js:86-90) — 5 endpoints de notificaciones
  - [`dashboard/src/pages/Notifications.tsx`](dashboard/src/pages/Notifications.tsx) — Panel de notificaciones y reglas
- [x] **Dashboard Frontend — Navegación actualizada**:
  - [`dashboard/src/components/Layout.tsx`](dashboard/src/components/Layout.tsx:41-52) — 3 nuevos enlaces en sidebar: Desviaciones, Incidencias, Notificaciones
  - [`dashboard/src/App.tsx`](dashboard/src/App.tsx:69-71) — 3 nuevas rutas protegidas
- [x] **Documentación actualizada**:
  - [`docs/internal_roadmap.md`](docs/internal_roadmap.md) — Este hito
  - [`docs/architecture_spec.md`](docs/architecture_spec.md) — Diagramas y descripción de nuevos módulos
  - [`docs/plan_mejoras_enterprise.md`](docs/plan_mejoras_enterprise.md) — Módulos marcados como implementados

---

## Hito 7 — Deploy Cloud Gratuito (Neon + Render + Vercel)

### ✅ Completado (v7.0)

- [x] **Seed actualizado** ([`prisma/seed.js`](prisma/seed.js)):
  - Contraseña unificada `CleanStock2026!` para todos los usuarios de prueba
  - Email del limpiador principal cambiado de `limpiador@kavana.com` a `carlos@kavana.com`
  - Eliminados hashes individuales por hash único compartido
- [x] **Guía de deploy corregida** ([`docs/deployment.md`](docs/deployment.md)):
  - Arquitectura actualizada a Neon + Render + Vercel (coste 0 €/mes)
  - Rama corregida: `master` → `main` (coincide con [`github_push.bat`](github_push.bat))
  - Credenciales corregidas: `CleanStock2026!` para todos los usuarios
  - Email del limpiador corregido: `carlos@kavana.com`
  - Puerto por defecto documentado: `3000` (con nota de que el fallback en código es `4000`)
  - Seed manual documentado: `node prisma/seed.js` desde Shell de Render
  - Checklist de verificación con credenciales correctas
  - Sección de troubleshooting para errores comunes
- [x] **Infraestructura cloud desplegada**:
  - Neon.tech: PostgreSQL Free (0.5 GB, Frankfurt)
  - Render: API Express + Socket.IO (Free, Frankfurt)
  - Vercel: Dashboard Supervisor (Hobby)
  - Vercel: Mobile PWA Limpiador (Hobby)
- [x] **Repositorio cambiado a público** en GitHub (requisito de planes gratuitos)
- [x] **URLs finales de producción**:
  - API: `https://kavana-cleanstock-api.onrender.com`
  - Swagger: `https://kavana-cleanstock-api.onrender.com/api-docs`
  - Dashboard: `https://kavana-cleanstock-dashboard.vercel.app`
  - Mobile: `https://kavana-cleanstock-mobile.vercel.app`

---

## Decisiones Técnicas Registradas
| ID | Decisión | Justificación |
|----|----------|---------------|
| D001 | PostgreSQL + Prisma ORM | Modelo relacional estricto necesario para integridad ACID en operaciones de stock concurrentes |
| D002 | Asignaciones temporales por fechas (no GPS) | La lógica `fecha_inicio <= TODAY AND (fecha_fin >= TODAY OR fecha_fin IS NULL)` evita conflictos de permisos GPS y funciona en sótanos sin cobertura |
| D003 | JWT para autenticación stateless | Sesiones sin estado en servidor, escalable horizontalmente, ideal para PWA |
| D004 | Docker para BD local | Entorno reproducible, aislamiento de la base de datos del host, fácil reset |
| D005 | Documentación dual (interna + técnica) | La interna permite retomar contexto tras pausas; la técnica sirve para auditorías IT y onboarding |
| D006 | Winston para logging estructurado | Niveles, colores, rotación de archivos, stream HTTP Morgan-compatible; reemplaza console.error() en toda la API |
| D007 | Refresh tokens con rotación en BD | Cada uso de refresh token genera uno nuevo y revoca el anterior — previene replay attacks sin estado en servidor |
| D008 | Zod para validación de entrada | Esquemas tipados con TypeScript-ready, mensajes de error detallados y parseo automático; reemplaza validación manual inline |
| D009 | IndexedDB (idb) para caché offline | Necesario para modo sin conexión: almacena inventario actual y cola de consumos pendientes. Sincronización batch FIFO al recuperar conexión |
| D010 | Vite + React + TypeScript para PWA | React proporciona ecosistema maduro con Vite para builds rápidos y PWA plugin para service worker automático |
| D011 | Docker multi-stage + nginx para frontends | Multi-stage separa build de runtime: imagen final 74 MB vs >1 GB con Node. nginx sirve estáticos eficientemente con Gzip, caché y proxy inverso |
| D012 | Socket.IO para eventos en tiempo real | WebSocket con fallback a long-polling, rooms para filtrar por centro, autenticación JWT reutilizada, reconexión automática. Alternativa a SSE (sin rooms) y polling (wasteful) |
| D013 | Modelo financiero en la misma tabla (coste_unitario + presupuesto_mensual) | Evita joins adicionales con tablas de contabilidad externa; el coste unitario del producto y el presupuesto del centro son datos intrínsecos del catálogo |
| D014 | ConsumoTeórico como tabla separada (no campo en inventario) | La cantidad teórica es un estándar contractual independiente del stock actual; permite comparación mensual sin acoplar lógica de inventario |
| D015 | Incidencias con categorías cerradas y estado workflow | Workflow simple (pendiente → en_proceso → resuelta) evita complejidad de BPMN; categorías cerradas garantizan consistencia en reportes |
| D016 | Reglas de notificación desacopladas de la lógica de negocio | El supervisor configura qué eventos le interesan (por centro/operario/producto) sin modificar controladores; las reglas se evalúan en segundo plano |

---

## Notas de Contexto

- El flujo crítico del operario debe resolver en **< 10 segundos y 3 clics**: Login → Centro automático → Restar stock → Confirmar
- La lógica de centro activo se resuelve vía query de asignaciones con ventana de fechas (ver D002)
- Los movimientos de stock usan cantidades con signo: negativo = salida/consumo, positivo = entrada/reposición
- `fecha_fin = NULL` en asignaciones indica personal fijo asignado indefinidamente al centro
- La API base es `/api/v1` y sigue convenciones RESTful
- El servidor Express escucha en puerto `3000` por defecto (configurable via `PORT` en `.env`)
- Los refresh tokens tienen expiración de 30 días y se limpian automáticamente cada 6 horas
- El dashboard devuelve datos agrupados por centro con separación entre alertas críticas (stock ≤ 0) y advertencias (stock por debajo del mínimo)
- La PWA móvil se sirve desde `mobile/` con Vite en puerto `4000`, con proxy a la API en `http://localhost:3000`
- El flujo offline: Login (requiere conexión) → carga inventario en IndexedDB → consume sin conexión (cola) → sincronización batch al recuperar conexión
- `useOnlineStatus` hook detecta cambios de conectividad vía eventos `online`/`offline` del navegador
- La DB se llama `kavana_cleanstock` en PostgreSQL 16 dentro de Docker
- El esquema de tests se compone de 6 suites con **92 tests totales**, usando mocks de Prisma y logger

---

## Hito 8 — Reenfoque Demo Cuñada (Zaira García) + Fase 2 Costes + Módulo Empleados

> **Contexto:** La demo se reorientó del modelo enterprise (consumo teórico) al caso real de la cuñada Zaira García (Limpiezas Valencia Centro, S.L.). El modelo de control es por **mermas** (stock registrado vs. stock físico contado por la encargada), NO consumo teórico. El proyecto corre en el VPS (no en Neon/Render/Vercel como decía el Hito 7).

### ✅ Completado

- [x] **Modelo de mermas** (`prisma/schema.prisma`):
  - `InventarioCentro.stock_fisico Int?` — conteo real de la encargada
  - `Cliente.es_demo Boolean @default(false)` — flag para reset de demo
  - Eliminadas columnas muertas `stock_maximo` y `tipo` (db push --accept-data-loss)
- [x] **Control de Mermas** (`src/controllers/deviationController.js` + `Deviations.tsx`):
  - Merma = `cantidad_actual` (registrado) − `stock_fisico` (físico contado)
  - Botón "Contar" + modal para registrar conteo físico (`POST /api/v1/inventario/:id_centro/:id_producto/conteo`)
  - Botón "🧹 Limpiar datos demo" (`POST /api/v1/demo/reset` — borra `es_demo`)
- [x] **Fase 2 — Costes por Centro** (`src/controllers/costeController.js` + `Costes.tsx`):
  - `GET /api/v1/dashboard/costes` — coste = Σ (cantidad_actual − stock_fisico) × coste_unitario por centro
  - `POST /api/v1/centros/:id/presupuesto` — fijar presupuesto mensual por centro
  - Tarjetas por centro: coste mes, presupuesto, % usado (verde/ámbar/rojo), "te pasas en X €"
  - Presupuestos demo: Diputación 100€, Beneficencia 25€, Plaza de Toros 15€ (107% rojo), Museo 50€
- [x] **Propuesta de Compras** (`src/controllers/purchaseController.js`):
  - `GET /api/v1/purchases/proposal` — por `stock_minimo` (no por mermas): cantidad_pedido = max(0, min×2 − actual), coste_estimado
  - Botón en Inventario → exporta CSV
- [x] **Edición de Centros** (`PUT /api/v1/centros/:id` + modal en `Centros.tsx`):
  - Edita nombre, dirección y presupuesto
- [x] **Acordeón de Centros** (`Centros.tsx`):
  - Clic en fila despliega empleados (nombre, rol, nº, 📞, ✉️) + productos (reg/fís)
  - Flecha ▸/▾ indicadora + hover
- [x] **Módulo Empleados** (Fase final — 2026-07-16):
  - Seed regenera 33 empleados (5-10 por centro), emails gmail/hotmail/outlook, teléfono, nº empleado aleatorio 100-500
  - Borrados los empleados basura (`@kavana.com`, `id_cliente = null`, rol limpiador)
  - `GET /api/v1/empleados` filtra por `id_cliente` del usuario logueado (no trae huérfanos)
  - `POST /api/v1/empleados` usa `id_cliente` del logueado + crea `asignacionPersonal` con `id_centro`
  - Tabla de Empleados muestra Centro (corregido: backend manda `nombre_centro`, no `nombre`)
  - **Filtro por centro** en la tabla de Empleados (select frontend, datos ya cargados)

### 🐛 Bugs corregidos en el proceso
- kavana-api unhealthy por llave desbalanceada en `app.js` línea 205 (el `select` de asignaciones no cerraba `include`/`asignaciones`) → `node --check` lo detectó
- Empleados basura (`@kavana.com`) salían porque `/empleados` no filtraba por cliente → añadido filtro `id_cliente`
- Seed duplicaba empleados (corridas múltiples) → hecho idempotente con `username` único (`nombre.apellido.ne`) + `upsert` por email
- CSS de detalle de centro no se aplicaba en cliente → nginx cacheaba assets 1 año → cambiado a `Cache-Control: no-cache` en `/assets/`
- Filtro de centros en Empleados salía en blanco → leía `c.nombre` pero backend manda `nombre_centro`

### Estado de la Demo (credenciales)
```
URL:        https://cleanstock.kavanasystems.com/
Login:      supervisor.demo@cleanstock.com / demo1234
Empresa:    Limpiezas Valencia Centro, S.L. (es_demo = true)
Centros:    Diputación de Valencia, Beneficencia, Plaza de Toros, Museo Bellas Artes
Empleados:  33 (5-10 por centro)
Mermas:     Plaza de Toros — papel: reg 50 / fís 30 (falta 20)
Costes:     Plaza de Toros 🔴 107% del presupuesto (15€)
Compras:    Beneficencia — lejía: reg 22 / min 30 → propuesta 38 u (57€)
```

### ⚠️ Notas de despliegue
- El dashboard usa nginx con `Cache-Control: no-cache` en `/assets/` (evita CSS viejo en cliente durante la demo)
- El `start.sh` del API ejecuta migraciones + seed en Render, pero en el VPS el seed se corre manual
- `seed.js` redirige a `prisma/seed-demo-cunada.js` (la demo de la cuñada)
- El VPS tiene cronjob de mantenimiento diario 06:00 UTC (prune -a SIN --volumes)