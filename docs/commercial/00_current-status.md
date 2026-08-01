# Estado Actual — KAVANA WAREHOUSE

> **Documento de consultoría IT — Estado del producto**
> **Audiencia:** Dirección (CEO), IT Operations, desarrollo senior
> **Fecha:** 2026-08-01
> **Alcance:** Estado real de KAVANA WAREHOUSE tras el despliegue en la nube (Vercel + Render + Neon) y la simplificación a 2 roles.

---

## 1. Resumen ejecutivo

KAVANA WAREHOUSE es un **SaaS B2B de control de stock** para empresas de limpieza con centros descentralizados. La **oficina** sabe qué producto hay en cada centro, cuánto se consume, cuándo baja de stock y cuánto se gasta respecto al presupuesto mensual, para detectar mermas y sobrecostes.

**Evolución del modelo (2026-08-01):**
- Se simplificó de 4 roles (admin, supervisor, operario, viewer) a **2 roles**: `oficina` (gestión total) y `supervisor` (recuento de inventario, creado por la oficina).
- Se **eliminó la app móvil** y el control de personal: el producto es gestión de stock pura.
- La demo es una **empresa viva** con 3 meses de histórico (10 centros, 31 productos, ~31.000 movimientos) que evoluciona sola cada día con una simulación automática.

**Estado operativo:** ✅ En producción, accesible en `https://warehouse.kavanasystems.com`. Frontend en Vercel, API en Render (free), BD en Neon (serverless).

---

## 2. Modelo de negocio actual

| Rol | Acceso | Función |
|-----|--------|---------|
| **Oficina** | Dashboard web (`warehouse.kavanasystems.com`) | Gestiona centros, productos, inventario, costes, presupuestos, incidencias. Crea supervisores. |
| **Supervisor** | Dashboard (creado por la oficina) | Hace **recuento físico** del stock. En la demo, caduca a las 24h (sesión de visitante aislada). |
| **Limpiador** | — | No usa ninguna app. Existe en el modelo de datos solo para la plantilla que genera los movimientos simulados de la demo. |

**Flujo clave (demo):**
1. El reclutador entra con `warehouse` / `kavana` (rol oficina).
2. Puede crear supervisores de prueba desde `/supervisores` (se guardan con `session_id` del navegador y expiran a las 24h).
3. Cada navegador genera una etiqueta de visitante única: los datos de un reclutador nunca se mezclan con los de otro.
4. Un cron diario (06:00) simula el consumo de los limpiadores: baja el stock, suben los costes del mes y aparecen alertas solas. La demo siempre parece una empresa en medio de su mes de trabajo.

---

## 3. Arquitectura real (despliegue)

```
          warehouse.kavanasystems.com (Vercel)
                    │  /api/* → rewrite
                    ▼
          API Express (Render, free tier)
                    │
                    ▼
          PostgreSQL 16 (Neon, Frankfurt)
```

- **Hosting:** Vercel (frontend estático) + Render (API, Web Service free) + Neon (PostgreSQL serverless).
- **Antiduerme:** un cron local hace ping cada 10 min a `/api/v1/health` (el free tier de Render duerme tras ~15 min sin tráfico).
- **Migraciones:** se aplican manualmente con `npx prisma migrate deploy` contra Neon. Nunca en el start command (rompía los deploys del Hito 7).

### Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + TypeScript + CSS propio |
| Backend | Node.js 20 + Express (monolito en `src/app.js`, 44 endpoints) |
| ORM | Prisma 6.x |
| BD | PostgreSQL 16 (Neon) |
| Auth | JWT + bcrypt, login por usuario o email |
| CI/CD | GitHub Actions (35 tests) |

---

## 4. API — endpoints del modelo actual

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `POST` | `/api/v1/auth/login` | todos | Login (usuario o email, tolerante a mayúsculas/espacios) |
| `POST` | `/api/v1/supervisores` | oficina | Crea supervisor demo (session_id + expira 24h) |
| `GET` | `/api/v1/supervisores?session_id=X` | oficina | Lista supervisores de una sesión |
| `POST` | `/api/v1/inventario/:centro/:producto/conteo` | supervisor | Recuento físico |
| `GET` | `/api/v1/recuentos?centro=X` | oficina | Histórico de recuentos |
| `GET` | `/api/v1/dashboard/costes` | oficina | Coste € por centro vs presupuesto |
| `GET` | `/api/v1/dashboard/consumption` | oficina | Consumos + evolución mensual |

Catálogo completo: `docs/technical/01_architecture-spec.md` §5.

---

## 5. Base de datos y migraciones

- **Motor:** PostgreSQL 16 (Neon serverless), BD `neondb` del proyecto `kavana-cleanstock`.
- **ORM:** Prisma 6.x. 13 modelos, 11 migraciones.
- **Histórico:** `registro_movimientos` con `tipo` (`movimiento` | `recuento`); ~31.000 filas de 3 meses simulados.
- **Migraciones:** `prisma migrate deploy` idempotente y seguro, aplicadas manualmente contra Neon.

---

## 6. Verificación realizada (2026-08-01)

```
Login oficina (warehouse/kavana) → token válido (rol oficina)
Crear supervisor demo → session_id + expira_en (24h)
Listar supervisores por sesión → aislado por navegador
Costes por centro → movimientos reales del mes vs presupuesto realista
Evolución mensual → mayo 17.570 · junio 18.485 · julio 18.689 unidades
35/35 tests verdes · CI success · deploys Ready
```

---

## 7. Pendientes y riesgos

| # | Item | Prioridad | Notas |
|---|------|-----------|-------|
| P1 | **Refresh token** no wireado al login | Baja | Mitigado con JWT de 2h |
| P2 | Contrato de respuesta inconsistente (`{ok}`, arrays planos) | Baja | Requiere refactor coordinado FE/BE |
| P3 | **Notificaciones** (tablas sin endpoints) | Baja | Tablas existen, CRUD por crear |
| P4 | **Propuesta de compra (UI)** | Baja | Backend listo, botón en Inventario pendiente |
| P5 | Token OAuth de Drive caduca cada ~7 días | Baja | Solo afecta a la KB interna, no al producto |

---

## 8. Conclusión

KAVANA WAREHOUSE está **operativo, desplegado en la nube y coherente** con la visión actual: gestión de stock pura con 2 roles, demo viva con 3 meses de histórico y supervisores aislados por sesión para que cualquier reclutador la pruebe sin contaminar datos. La arquitectura cumple la separación acordada (prod fuera del VPS) con free tiers.
