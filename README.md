# CleanStock — Trazabilidad de Stock para Limpieza Profesional

[![Tests](https://img.shields.io/badge/tests-26%20passing-brightgreen)](docs/METRICS.md)
[![Node](https://img.shields.io/badge/Node-20-339933?logo=nodedotjs)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](docker-compose.yml)
[![Multi-Tenant](https://img.shields.io/badge/Multi‑Tenant-client__id-8B5CF6)](docs/adr/001-multi-tenant-feature-flags.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## ⚡ 30 Segundos

**Problema:** Empresas de limpieza con centros descentralizados pierden hasta un 30% de su presupuesto en materiales porque no saben qué se consume en cada centro ni si el gasto se ajusta a lo previsto.

**Solución:** SaaS multi-tenant donde el **responsable de centro** hace recuento físico del stock desde una app móvil, y el **supervisor** controla el consumo real vs presupuestado desde un dashboard web, con alertas de desviación.

**Stack:** Node + Express · React + Vite · PostgreSQL 16 · Prisma · Docker

---

## 🏗️ Arquitectura

```
RESPONSABLE CENTRO (app móvil)     SUPERVISOR (dashboard web)
         │                                  │
         └──────────────┬───────────────────┘
                        ▼
              ┌─────────────────────┐
              │  API REST (Express) │
              │  + Auth JWT + Prisma│
              └─────────┬───────────┘
                        │
              ┌─────────▼───────────┐
              │  PostgreSQL 16      │
              │  + client_id        │
              │  (multi-tenant)     │
              └─────────────────────┘
```

## 🧠 Decisiones

| Decisión | Alternativas | Elegida | Por qué |
|----------|-------------|---------|---------|
| Multi-tenancy | Schema-per-tenant | Shared-schema + `client_id` | Escalable, migraciones simples |
| Feature flags | Tablas por plan | JSON en clients | Sin deploy para activar |
| Framework | NestJS, Fastify | Express | Suficiente, sin over-engineering |
| App limpiadores | App nativa | ❌ **Descartada** | Fricción de usabilidad real |

[📘 ADR-001 →](docs/adr/001-multi-tenant-feature-flags.md)

## 📊 Estado

| Scope | Estado |
|-------|--------|
| Autenticación multi-tenant | ✅ |
| Dashboard supervisor | ✅ |
| App móvil recuento físico | ✅ |
| Alertas stock mínimo | ✅ |
| 26 tests (Jest + Supertest) | ✅ |
| CI/CD (GitHub Actions) | ✅ |
| Docker + VPS producción | ✅ |
| Informes exportables | 🚧 Pendiente |
| App nativa (React Native) | 🚧 Pendiente |
| Clientes reales | ⚠️ Sin implantación real aún |

## 📚 Documentación

| Para qué | Dónde |
|----------|-------|
| Decisiones arquitectónicas | [`docs/adr/`](docs/adr/) |
| Estado del producto | [`docs/commercial/`](docs/commercial/) |
| Especificación técnica | [`docs/technical/`](docs/technical/) |
| Evolución del proyecto | [`docs/HISTORY.md`](docs/HISTORY.md) |
| Métricas de código | [`docs/METRICS.md`](docs/METRICS.md) |

## 🚀 Cómo ejecutar

```bash
cp .env.example .env    # Editar credenciales
docker compose up -d    # Stack completo
npm test                # 26 tests
```

**Live demo:** [`https://cleanstock.kavanasystems.com`](https://cleanstock.kavanasystems.com)

---

*Proyecto diseñado con criterio arquitectónico propio, implementado con asistencia de IA como par de programación.*  
*Parte del ecosistema [Kavana Systems](https://github.com/kavanasystemsinfo-ui).*
