# Estado Actual — Kavana CleanStock

> **Documento de consultoría IT — Estado del producto**
> **Audiencia:** Dirección (CEO), IT Operations, desarrollo senior
> **Fecha:** 2026-07-20
> **Autor:** Hermes Agent (mantenimiento proactivo KAVANA)
> **Alcance:** Estado real de CleanStock tras el cambio de modelo de negocio (responsables de centro) y su despliegue.

---

## 1. Resumen ejecutivo

CleanStock es un **SaaS B2B de trazabilidad de stock** para empresas de limpieza con centros descentralizados. Permite al **supervisor** saber qué producto hay en cada centro y compararlo con lo presupuestado, para detectar mermas y sobrecostes.

**Cambio de modelo de negocio (2026-07-20):** se descartó el uso de la app por parte del limpiador (fricción de usabilidad: el limpiador no puede perder tiempo en una app). El nuevo flujo delega el **recuento físico del stock** en **responsables de centro** (personal de confianza del cliente) que usan una **app móvil** para registrar la cantidad real. El supervisor mantiene el control total desde el dashboard web.

**Estado operativo:** ✅ En producción, accesible en `https://cleanstock.kavanasystems.com`, sobre VPS Hetzner (la migración a serverless externo sigue pendiente, ver §7).

**Últimos commits (main):**
- `07cc9d5` — Backend: gestión de responsables + recuento físico con histórico
- `55bf429` — Dashboard: pantalla Responsables + tabla de recuentos
- `391f01e` — Mobile: recuento físico para responsable de centro
- `60e6d31` — Migración BD `add_tipo_recuento` sincronizada

---

## 2. Modelo de negocio actual

| Rol | Acceso | Función |
|-----|--------|---------|
| **Supervisor** | Dashboard web (`/`) | Crea responsables, les asigna centros (checkboxes), ve stock en tiempo real y histórico de recuentos. |
| **Responsable de centro** | App móvil (`/`, PWA) | Ve la lista de sus centros asignados, hace **recuento físico** (setea cantidad real por producto). |
| **Limpiador** | — | No usa app. Figura en el modelo de datos (`rol='limpiador'`, `AsignacionPersonal`) solo para trazabilidad de asignación a centros. |
| **Admin** | `/admin/` | Gestiona empresas cliente y ve estadísticas del SaaS. |

**Flujo clave (recuento):**
1. Supervisor crea usuario `responsable` desde el dashboard.
2. Supervisor marca con ✓ los centros que puede gestionar.
3. El responsable entra en la app móvil, elige centro, y en cada producto pulsa **Recuento** para poner la cantidad real que ve en estantería.
4. Al confirmar: **(a)** el `cantidad_actual` del producto en el dashboard se actualiza al valor real, **(b)** se registra una fila en el histórico (`RegistroMovimiento` tipo `recuento`) con nombre del responsable, fecha, centro, producto y cantidad.

---

## 3. Arquitectura real (despliegue)

```
           cleanstock.kavanasystems.com
                     │
                ┌────┴────┐
                │  nginx   │  ← SSL (Let's Encrypt)
                │  :443    │
                └────┬────┘
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
 ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ Dashboard │  │   API    │  │  Mobile  │
 │  :4001    │  │  :3000   │  │  :4000   │
 │ React SPA │  │ Express  │  │ React PWA│
 │ nginx     │  │ + Prisma │  │ nginx    │
 └──────────┘  └────┬─────┘  └──────────┘
                    │
                    ▼
             ┌────────────┐
             │ PostgreSQL │
             │  :5432     │
             │ (Docker)   │
             └────────────┘
```

- **Hosting:** VPS Hetzner (IP `167.233.97.71`, Ubuntu 24.04, 2 vCPU, 3.7 GB RAM, 38 GB disco).
- **Infra:** Docker Compose (4 servicios: `db`, `api`, `dashboard`, `mobile`).
- **SSL:** Let's Encrypt vía nginx.
- **DNS:** `cleanstock.kavanasystems.com` → `167.233.97.71` (apunta al VPS, no a serverless externo).

### Stack
| Capa | Tecnología |
|------|-----------|
| Frontend supervisor | React 18 + Vite + TypeScript |
| App móvil responsable | React + Vite + TypeScript (PWA, offline-capable) |
| Backend | Node.js + Express (monolito en `src/app.js` + 3 controladores) |
| ORM | Prisma 6.x |
| BD | PostgreSQL 16 |
| Auth | JWT + bcrypt |

> **Nota:** el repositorio contiene también `landing/` (HTML estático) y la carpeta `mobile/` **ya no es legacy**: es la app del responsable de centro y está en producción (puerto 4000).

---

## 4. API — endpoints relevantes al nuevo modelo

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `POST` | `/api/v1/usuarios` | supervisor | Crea usuario rol `responsable` |
| `POST` | `/api/v1/usuarios/:id/centros` | supervisor | Asigna centros (checkboxes) → sincroniza `AsignacionPersonal` |
| `GET` | `/api/v1/asignaciones/active` | responsable | Devuelve **lista** de centros asignados al responsable |
| `POST` | `/api/v1/inventario/:centro/:producto/conteo` | responsable | Recuento físico: setea `cantidad_actual = stock_fisico` + crea histórico |
| `GET` | `/api/v1/recuentos?centro=X` | supervisor | Histórico de recuentos (tabla del dashboard) |

Endpoints previos (consumo, inventario, centros, empleados, incidencias, dashboard) se mantienen. Ver `README.md` para el catálogo completo.

---

## 5. Base de datos y migraciones

- **Motor:** PostgreSQL 16 (Docker), BD `kavana_cleanstock`.
- **ORM:** Prisma 6.x. Cliente generado en build de imagen (`prisma generate`).
- **Tabla de histórico:** `registro_movimientos` con nueva columna `tipo` (`movimiento` | `recuento`).
- **Tracking de migraciones:** la tabla `_prisma_migrations` **no existía** (el proyecto aplicaba SQL directo). El 2026-07-20 se creó y se registraron las 9 migraciones (8 previas + `20260720130000_add_tipo_recuento`) como aplicadas. `prisma migrate deploy` ahora es **idempotente y seguro**.
- **Sin drift:** `prisma migrate diff` entre schema y BD = vacío (✅ sincronizados).

---

## 6. Verificación realizada (2026-07-20)

Prueba end-to-end ejecutada contra la BD de producción (sin datos de cliente afectados):

```
Supervisor crea responsable → asigna [Beneficencia, Diputación]
Responsable login → ve 2 centros → recuento "Papel higiénico" = 12
Dashboard /recuentos → "Resp Movil Test | Beneficencia | Papel higiénico → 12"  ✅
```

Containers: `kavana-db`, `kavana-api`, `kavana-dashboard` (:4001), `kavana-mobile` (:4000) → todos `healthy`.

---

## 7. Pendientes y riesgos

| # | Item | Prioridad | Notas |
|---|------|-----------|-------|
| P1 | **Migración a serverless externo** (Vercel/Render/Supabase) | Media | El DNS apunta al VPS. La regla arquitectónica dice "prod fuera del VPS" pero CleanStock sigue aquí. Funciona, pero no cumple la separación acordada. |
| P2 | **Refresh token** no wireado al login | Baja | Mitigado con JWT de 2h (ver AUDITORIA_ESTADO.md). |
| P3 | Contrato de respuesta inconsistente (`{ok}`, arrays planos) | Baja | M6 documentado; requiere refactor coordinado FE/BE. |
| P4 | **Tests de la nueva funcionalidad** | Media | Los 26 tests existentes siguen verdes, pero no cubren responsables/recuentos. Recomendado añadir tests de la Fase 1. |
| P5 | `demo/reset` sin scoping por cliente | Baja | Solo entorno demo. |
| P6 | Documentación de la app móvil | Baja | README/architecture aún dicen "mobile legacy no usada" (ver §8). |

---

## 8. Acciones de documentación aplicadas

- Este documento (`docs/ESTADO_ACTUAL_CLEANSTOCK.md`) creado como fuente de verdad post-cambios.
- `README.md`: corregida la nota de "mobile legacy no usada" → ahora es la app del responsable.
- `docs/deployment.md`: actualizada la nota de alcance (responsable de centro, no limpiador).
- `docs/architecture_spec.md`: pendiente de actualizar la sección de alcance de usuario (§1).

---

## 9. Conclusión

CleanStock está **operativo y coherentes** tras el cambio de modelo de negocio. El supervisor tiene control total; el responsable de centro aporta el dato de stock real desde el móvil; el histórico queda trazado. La BD está bajo control de migraciones. El único gap de arquitectura es el despliegue (VPS vs serverless externo), que funciona pero no cumple la separación prevista.

**Próximo paso recomendado:** decidir si migrar a serverless (P1) o formalizar CleanStock en el VPS como entorno de producción definitivo.
