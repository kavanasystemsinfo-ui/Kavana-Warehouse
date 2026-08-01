# Architecture Specification — Kavana CleanStock

> **Document Type:** Technical Architecture Specification
> **Audience:** IT Consultants, Senior Developers, Technical Stakeholders
> **Version:** 7.0.0
> **Swagger API Version:** 4.0.0
> **Last Updated:** 2026-06-06
> **Status:** Implemented — Backend API v1.3 + Mobile PWA v2.0 (Limpiador App) + Dashboard Supervisor v3.0 + Socket.IO Real-time v5.0 + Full Docker Deployment v4.0 + Enterprise Modules v6.0 (OPEX, Deviations, Incidents, Purchases, Notifications) + Cloud Deploy v7.0 (Neon + Render + Vercel)

---

## 1. Conceptual Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│                                                                     │
│  ┌──────────────────────┐          ┌──────────────────────────┐     │
│  │   PWA (Mobile)       │          │   Dashboard (Supervisor) │     │
│  │   Vite + React       │          │   Vite + React + TS      │     │
│  │   Offline-first      │          │   Analytics & CRUD       │     │
│  │   Dev :4000          │          │   Dev :4001              │     │
│  └─────────┬────────────┘          └─────────────┬────────────┘     │
│            │  HTTPS / JWT                         │  HTTPS / JWT    │
│            │  → /api/* → :3000                    │  → /api/* → :3000│
│            │                                      │  → /socket.io/* │
│            │                                      │    → :3000 (WS) │
│            │                                      │  (tiempo real)  │
│            │                                      │  (eventos push) │
│            │                                      │  (sin refresh)  │
└────────────┼──────────────────────────────────────┼─────────────────┘
              │                                      │
              ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                              │
│                                                                     │
│              Express.js REST API (src/server.js)                    │
│              Middleware Chain:                                       │
│                helmet → cors → winston-http →                       │
│                auth(JWT) → zod-validation                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Auth Routes  │  │  API Routes          │  │ Middleware       │  │
│  │ /api/auth/*  │  │  /api/v1/*           │  │ - authenticate   │  │
│  └──────┬───────┘  │  /stock/*            │  │ - authorize      │  │
│         │          │  /asignaciones/*     │  │ - validate (Zod) │  │
│         │          │  /dashboard/*        │  └──────────────────┘  │
│         │          │  /api-docs (Swagger) │                        │
│         │          └──────────────────────┘                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │       Socket.IO Server (src/lib/socket.js)                   │  │
│  │       - Auth JWT en handshake                                │  │
│  │       - Rooms por centro: centro:{id}                        │  │
│  │       - Eventos emitidos:                                    │  │
│  │         • stock:consumed  → room del centro                  │  │
│  │         • stock:restocked → room del centro                  │  │
│  │         • stock:alert     → room del centro                  │  │
│  │       - Reconexión automática + fallback polling             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────┼───────────────────────────────┼──────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                            │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ authController   │  │ stockController  │  │ asignacionCtrl   │  │
│  │ - login          │  │ - consumeStock   │  │ - getActive      │  │
│  │ - register       │  │   → emite        │  │ - list           │  │
│  │ - verifyToken    │  │   stock:consumed │  │ - create         │  │
│  │ - refresh        │  │   (+ alert si    │  │ - update         │  │
│  │ - logout         │  │     stock bajo)  │  │ - getAllUsers    │  │
│  │                  │  │ - restock        │  └──────────────────┘  │
│  │                  │  │   → emite        │                        │
│  │                  │  │   stock:restocked│                        │
│  │                  │  │ - getInventory   │                        │
│  │                  │  │ - getAlerts      │                        │
│  │                  │  │ - getCentros     │                        │
│  │                  │  └───────┬──────────┘                        │
│  │                  │          │ emitStockConsumed()               │
│  │                  │          │ emitStockRestocked()              │
│  │                  │          ▼                                  │
│  │                  │    ┌──────────────┐                         │
│  │                  │    │ Socket.IO    │                         │
│  │                  │    │ (lib/socket) │                         │
│  │                  │    └──────────────┘                         │
│  └──────────────────┘                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   dashboardCtrl                               │ │
│  │  - consumption (analytics + OPEX: coste_unitario,             │ │
│  │    presupuesto_mensual, gasto_total_euros,                    │ │
│  │    porcentaje_consumido)                                      │ │
│  │  - alerts (critical + warning separation)                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              deviationController (NUEVO)                      │ │
│  │  - getDeviations: compara consumo real vs. teórico            │ │
│  │    por centro/producto/mes, calcula desviación,               │ │
│  │    porcentaje y coste de desviación                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │             incidenciaController (NUEVO)                      │ │
│  │  - createIncidencia: reporte con categoría, título, foto      │ │
│  │  - listIncidencias: filtros por centro/estado/categoría       │ │
│  │  - updateIncidencia: workflow pendiente→en_proceso→resuelta   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │             purchaseController (NUEVO)                        │ │
│  │  - getProposal: analiza inventario, calcula déficit,          │ │
│  │    genera pedido recomendado con coste estimado               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           notificationsController (NUEVO)                     │ │
│  │  - getNotifications / markAsRead: historial de notificaciones │ │
│  │  - getRules / createRule / deleteRule: CRUD reglas            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           Dashboard Frontend (dashboard/src/)                  │ │
│  │                                                                 │ │
│  │  ┌────────────┐ ┌────────┐ ┌────────────┐ ┌──────────────┐   │ │
│  │  │ Consumption│ │ Alerts │ │Asignaciones│ │ Inventario   │   │ │
│  │  │ Filtros,   │ │Críticas│ │CRUD Table  │ │ Stock +      │   │ │
│  │  │ tabla,     │ │+ Warn, │ │+ Modal     │ │ Restock      │   │ │
│  │  │ CSV export │ │ CSV    │ │Create/Edit │ │ Modal        │   │ │
│  │  │ OPEX €     │ │◄───────│ │            │ │◄─────────────│   │ │
│  │  └────────────┘ └────────┘ └────────────┘ └──────────────┘   │ │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────────────────┐      │ │
│  │  │Deviations  │ │ Incidents  │ │ Notifications        │      │ │
│  │  │Teórico vs  │ │ Bandeja    │ │ Historial + Reglas   │      │ │
│  │  │Real,       │ │ Filtros,   │ │ Crear/Eliminar      │      │ │
│  │  │CSV export  │ │ Cambio     │ │ Reglas              │      │ │
│  │  │            │ │ Estado     │ │                     │      │ │
│  │  └────────────┘ └────────────┘ └──────────────────────┘      │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │   lib/api.ts    — JWT auth + refresh token rotation      │ │ │
│  │  │   lib/socket.ts — Socket.IO client (socket.io-client)    │ │ │
│  │  │   lib/csv.ts    — BOM UTF-8 CSV export utility           │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────┼─────────────────────┼──────────────────────┼────────────┘
             │                     │                      │
             ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                              │
│                                                                     │
│                         Prisma ORM                                  │
│                    @prisma/client (v6.x)                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   PostgreSQL Database                        │   │
│  │  usuarios │ centros │ productos │ asignaciones_personal      │   │
│  │  inventario_centros │ registro_movimientos │ refresh_tokens  │   │
│  │  consumo_teorico │ incidencias │ reglas_notificacion         │   │
│  │  notificaciones                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│               Docker Compose — 4 Services (kavana-net bridge)       │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  PostgreSQL  │    │  API         │    │  Dashboard           │  │
│  │  :5432       │◄──►│  :3000       │◄───│  nginx :80 → :4001   │  │
│  │  pgdata vol  │    │  Express     │    │  /api/* → api:3000   │  │
│  └──────────────┘    │  Prisma      │    │  /socket.io/* →      │  │
│                      │  + Socket.IO │    │  api:3000 (WS)       │  │
│                      └──────┬───────┘    └──────────────────────┘  │
│                              │                                      │
│                      ┌──────▼───────┐                              │
│                      │  Mobile PWA  │                              │
│                      │  nginx :80   │                              │
│                      │  → :4000     │                              │
│                      │  /api/* →    │                              │
│                      │  api:3000    │                              │
│                      └──────────────┘                              │
│                                                                     │
│  Volumes: pgdata (persistent)                                       │
│  Networks: kavana-net (internal bridge)                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Container Images

| Image | Size | Base | Notes |
|-------|------|------|-------|
| `kavana-cleanstock-api` | 1.09 GB | `node:20-alpine` | Prisma + Express + Socket.IO, multi-stage |
| `kavana-cleanstock-dashboard` | 74.4 MB | `nginx:1.27-alpine` | Vite build → nginx static serve + WebSocket proxy |
| `kavana-cleanstock-mobile` | 74.7 MB | `nginx:1.27-alpine` | Vite build → nginx + PWA SW |
| `postgres:16-alpine` | 396 MB | `alpine:3.21` | PostgreSQL 16 Alpine |

### Key Files

| File | Purpose |
|------|---------|
| [`Dockerfile.api`](Dockerfile.api) | API multi-stage build with auto-migrate + seed script |
| [`Dockerfile.dashboard`](Dockerfile.dashboard) | Dashboard Vite build → nginx production serve |
| [`Dockerfile.mobile`](Dockerfile.mobile) | Mobile PWA Vite build → nginx with SW support |
| [`dashboard/nginx.conf`](dashboard/nginx.conf) | nginx config: SPA fallback, API proxy + Socket.IO WebSocket, Gzip, security |
| [`mobile/nginx.conf`](mobile/nginx.conf) | nginx config: SPA fallback, SW headers, API proxy |
| [`start.bat`](start.bat) | **Windows launcher:** starts Docker + migrates + opens 3 dev servers in terminals |
| [`docker-compose.yml`](docker-compose.yml) | 4-service orchestration with healthchecks |
| [`.env.example`](.env.example) | Environment template for production |
| [`docs/deployment.md`](docs/deployment.md) | Full deployment guide |
