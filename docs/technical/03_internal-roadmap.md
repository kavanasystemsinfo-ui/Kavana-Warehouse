# Roadmap Interno — CleanStock (versión honesta)

> **Propósito:** Control de estado real del proyecto.
> **⚠️ NOTA:** Este documento reemplaza la versión anterior (2026-06-06) que marcaba como
>   "✅ Completado" módulos que no existen en producción (Socket.IO, Swagger, Neon/Render,
>   Zod, controladores separados). Esta versión refleja el código que realmente corre.
> **Última actualización:** 2026-07-16 (post auditoría ECC)

---

## Estado real del proyecto (2026-07-16)

| Módulo | Estado real | Notas |
|--------|-------------|-------|
| API Express (CRUD centros/empleados/productos)| ✅ En producción | Monolítico en `src/app.js`, 38 endpoints |
| Auth JWT + bcrypt | ✅ En producción | Token 2h, multi-tenant por `id_cliente` |
| Incidencias (backend + dashboard) | ✅ En producción | 3 endpoints, página `/incidents` enrutada |
| Desviaciones (stock físico vs registrado) | ✅ En producción | `deviationController`, página `/desviaciones` |
| Costes por centro (€) | ✅ En producción | `costeController`, página `/costes` |
| Propuesta de compra | ✅ En producción | `purchaseController`, endpoint `GET /purchases/proposal` |
| Consumos + mermas | ✅ En producción | `RegistroMovimiento` con signo, stock_fisico nullable |
| Multi-tenant | ✅ En producción + auditado | Scoping verificado con tests (403) |
| Seguridad (auditoría ECC) | ✅ Completada 2026-07-16 | 4 críticos + 8 altos + 14 medios cerrados |
| Tests automatizados | ✅ 26 tests (Jest) | Incluye test de aislamiento multi-tenant |
| Dashboard consumo + alerts (REST) | ✅ En producción | Sin tiempo real (consultas REST) |
| Frontend PWA operario | ❌ **Descartado (rediseño 2026-07-16)** | El limpiador no usa app; el supervisor registra desde el dashboard web |
| Docker Compose + nginx | ✅ En producción | 4 servicios en VPS Hetzner |
| Informe de auditoría | ✅ `AUDITORIA_ESTADO.md` | En raíz del repo |

### Parcialmente implementado

| Módulo | Estado | Qué falta |
|--------|--------|-----------|
| Frontend operario (incidencias) | ❌ **Descartado** | El supervisor reporta incidencias desde el dashboard; no hay app del operario |
| Propuesta de compra (UI) | ⏳ Backend listo, botón en frontend pendiente | Botón "Generar" en Inventario |
| Páginas sin enrutar | ⏳ Código creado, sin ruta | Notifications, Asignaciones, Alerts (los archivos `.tsx` existen) |

### Planificado (NO implementado)

| Módulo | Prioridad | Dependencias |
|--------|-----------|--------------|
| CRUD de notificaciones + reglas | Media | Tablas existen en BD, endpoints por crear |
| Tiempo real (Socket.IO) | Baja | Requiere arquitectura de eventos |
| Refresh token wireado | Media | Tabla `RefreshToken` existe, login sin refresh |
| Documentación OpenAPI/Swagger | Baja | Sin iniciar |
| Zod / validación con schemas | Baja | Sin iniciar (validación manual hoy) |
| Separación en controladores modulares | Baja | YAGNI: equipo de 1 persona |
| Migración serverless (Vercel + Supabase) | Baja | Cuando escale el SaaS |

---

## Hitos cumplidos (reales)

| Hito | Fecha | Logro |
|------|-------|-------|
| MVP funcional | ~2026-05 | CRUD básico, login JWT, Docker |
| Cliente piloto (Zaira) | ~2026-06 | Despliegue con 4 centros reales |
| Módulos enterprise | ~2026-06 | Costes, desviaciones, incidencias, compras |
| Auditoría ECC | 2026-07-16 | 100% hallazgos cerrados, 26 tests, multi-tenant verificado |

---

## Notas sobre la versión anterior del roadmap

La versión previa de este documento (2026-06-06) describía una arquitectura objetivo
con los siguientes hitos marcados como "✅ Completado" que **no se corresponden con la realidad**:

| Lo que decía | Realidad |
|-------------|----------|
| "Socket.IO Real-time v5.0 ✅" | ❌ No existe. Las alertas son REST. |
| "Despliegue Neon + Render + Vercel ✅" | ❌ Está en VPS Hetzner con Docker. |
| "Documentación OpenAPI ✅" | ❌ No existe Swagger. |
| "Refresh Tokens ✅" | ❌ Tabla creada, login sin refresh. |
| "Validación Zod ✅" | ❌ Validación manual en cada handler. |
| "Controladores separados (stock, auth, etc.) ✅" | ❌ Backend monolítico en `app.js`. 3 controladores reales (coste, deviation, purchase). |
| "Notificaciones CRUD ✅" | ❌ Tablas existen, endpoints NO. |
| "Tests Dashboard + OpenAPI ✅" | ❌ Tests existen, pero 26 (no 17 como antes). Sin tests de dashboard. |

Estos errores provenían de documentación de planificación (architecture_spec.md,
plan_mejoras_enterprise.md) que describía el objetivo del producto, no el estado real.
A fecha 2026-07-16 **todos esos documentos han sido corregidos** para reflejar la realidad.
