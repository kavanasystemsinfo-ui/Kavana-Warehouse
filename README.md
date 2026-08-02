# KAVANA WAREHOUSE

> **Control de stock multi-tenant para empresas de limpieza con múltiples centros. Consumo por centro, alertas de stock bajo y control de presupuesto en una sola plataforma.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-API-lightgrey)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)
![Tests](https://img.shields.io/badge/Tests-35-success)
![License](https://img.shields.io/badge/License-MIT-success)

---

## ⚡ 30 Segundos

Kavana Warehouse es una plataforma web para empresas de limpieza que operan en varios centros (colegios, oficinas, hospitales). La oficina sabe qué producto se consume en cada centro, cuándo baja de stock y cuánto se gasta respecto al presupuesto mensual. Nació del problema real de una empresa de limpieza de Valencia que no sabía cuánto material gastaba cada centro.

La demo pública simula una empresa viva con 3 meses de histórico (10 centros, 31 productos, ~31.000 movimientos) y evoluciona sola cada día.

---

## 🏗️ Arquitectura

```
          Oficina / Supervisor
                    │
                    ▼
          Dashboard web (React 19)
                    │
                    ▼
            API REST (Express)
                    │
            JWT + RBAC (2 roles)
                    │
              Prisma ORM
                    │
            PostgreSQL 16 (Neon)
```

- **Multi-tenant shared schema**: aislamiento lógico por `client_id` en todas las queries.
- **Despliegue**: frontend en Vercel, API en Render, BD en Neon (serverless).
- **Demo viva**: un cron diario simula el consumo de los limpiadores (baja el stock, suben los costes, aparecen alertas solas).

---

## 🧠 Decisiones clave

| Decisión | Alternativas | Elegida | Por qué |
|----------|-------------|---------|---------|
| Multi-tenancy | Schema-per-tenant, RLS | Shared schema + `client_id` | Simple y suficiente para el dominio (ADR-001) |
| Auth | Sesiones en servidor, JWT largo | JWT corto + refresh tokens | Stateless, sesiones revocables sin Redis (ADR-002) |
| ORM | SQL raw, Knex | Prisma | Type-safety de extremo a extremo, migraciones declarativas (ADR-003) |
| Roles | 4 roles, app móvil | 2 roles: `oficina` + `supervisor` | La app evolucionó a gestión de stock pura; menos roles, menos fricción |
| BD | Supabase, VPS | Neon serverless | IPv4 nativo, compatible con Render free |
| Deploy | VPS, serverless | Vercel + Render + Neon | Coste cero, auto-deploy por push, demo viva (ADR-004) |
| Migraciones | En el start | Manuales | `migrate deploy` en el arranque rompía los deploys |

> Todas las decisiones consolidadas con detalle en [`DECISIONS.md`](DECISIONS.md) (4 ADRs + decisiones de implementación).

---

## 📊 Estado

| Funcionalidad | Estado |
|--------------|:------:|
| Login por usuario o email (tolerante a mayúsculas/espacios) | ✅ |
| Dashboard con KPIs y evolución mensual | ✅ |
| Gestión de centros, productos e inventario | ✅ |
| Costes por centro vs presupuesto | ✅ |
| Alertas de stock bajo | ✅ |
| Desviaciones (stock registrado vs físico) | ✅ |
| Recuentos físicos del supervisor | ✅ |
| Propuesta de compra | ✅ |
| Incidencias | ✅ |
| Supervisores demo (caducan a las 24h) | ✅ |
| Multi-tenant verificado con tests | ✅ |
| CI/CD (GitHub Actions) | ✅ |
| 38 tests de API + 3 tests de frontend | ✅ |
| App móvil | ❌ Descartada (gestión de stock web) |

---

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| `DECISIONS.md` | Consolidación de todas las decisiones (ADRs + implementación) |
| `docs/adr/` | Architecture Decision Records (4) |
| `docs/technical/` | Arquitectura, despliegue, auditoría, roadmap |
| `docs/commercial/` | Documentación de producto y plan de mejoras |
| `docs/deployment.md` | Despliegue real (Vercel + Render + Neon) y credenciales demo |

---

## 🚀 Cómo ejecutar

```bash
cp .env.example .env       # configura DATABASE_URL, JWT_SECRET
docker compose up -d       # levanta db + api + dashboard
npm install
npx prisma migrate deploy  # aplica migraciones (nunca en el start)
npm test                   # 35 tests
```

---

## 🌐 Demo

- **Landing portfolio**: https://www.kavanasystems.com/warehouse/
- **Aplicación**: https://warehouse.kavanasystems.com
- **Usuario demo**: `warehouse` · **Contraseña**: `kavana`

---

## 📄 Licencia

MIT © 2026 [Jorge Adán Rodríguez](https://www.kavanasystems.com) · Kavana Systems
