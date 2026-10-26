# Roadmap Interno — KAVANA WAREHOUSE (versión honesta)

> **Propósito:** Control de estado real del proyecto.
> **Última actualización:** 2026-08-01

---

## Estado real del proyecto (2026-08-01)

| Módulo | Estado real | Notas |
|--------|-------------|-------|
| API Express (CRUD centros/productos/inventario) | ✅ En producción | Monolítico en `src/app.js`, 44 endpoints |
| Auth JWT + bcrypt | ✅ En producción | Token 2h, login tolerante a mayúsculas/espacios |
| Roles oficina + supervisor | ✅ En producción | Oficina gestiona todo; supervisor demo caduca 24h |
| Supervisores demo (session_id) | ✅ En producción | Aislados por navegador, expiran 24h (cron limpieza 03:00) |
| Incidencias (backend + dashboard) | ❌ Retirado (2026-10) | No encaja en control de stock; la tabla se conserva |
| Desviaciones (stock físico vs registrado) | ✅ En producción | `deviationController`, página `/desviaciones` |
| Costes por centro (€) | ✅ En producción | `costeController`, página `/costes`, presupuestos realistas |
| Propuesta de compra | ✅ En producción | `purchaseController`, endpoint `GET /purchases/proposal` |
| Consumos + mermas | ✅ En producción | `RegistroMovimiento` con signo, stock_fisico nullable |
| Multi-tenant | ✅ En producción + auditado | Scoping verificado con tests (403) |
| Seguridad (auditoría ECC) | ✅ Completada 2026-07-16 | 4 críticos + 8 altos + 14 medios cerrados |
| Tests automatizados | ✅ 86 de API (Jest) + 11 del panel (Vitest) | Incluye tests de aislamiento multi-tenant y de fugas |
| Dashboard consumo + evolución mensual | ✅ En producción | Gráfica de evolución mayo→agosto |
| Empresa demo viva | ✅ En producción | Planta metalúrgica ficticia: 6 secciones, 38 productos, histórico desde el 1-sep-2026 |
| Simulación diaria | ✅ En producción | Cron 06:00 genera consumos (baja stock, sube costes) |
| Docker Compose | ✅ Local | 3 servicios: db, api, dashboard |
| Despliegue nube | ✅ En producción | Vercel + Render + Neon (serverless) |

### Parcialmente implementado

| Módulo | Estado | Qué falta |
|--------|--------|-----------|
| Notificaciones | ⏳ Tablas en BD, sin endpoints ni UI | CRUD + enrutado |

### Planificado (NO implementado)

| Módulo | Prioridad | Dependencias |
|--------|-----------|--------------|
| CRUD de notificaciones + reglas | Media | Tablas existen en BD, endpoints por crear |
| Documentación OpenAPI/Swagger | Baja | Sin iniciar |

### Descartado

| Módulo | Estado | Notas |
|--------|--------|-------|
| App móvil (PWA del operario) | ❌ Eliminada (2026-08-01) | La visión es solo gestión de stock web |
| Control de empleados (UI) | ❌ Eliminada (2026-08-01) | El rol operario (antes limpiador) queda solo como dato interno de la simulación |
| Tiempo real (Socket.IO) | ❌ Descartado | Las alertas son consultas REST |
| Supabase | ❌ Descartado | IPv6 no compatible con Render free; se usa Neon |
| Railway | ❌ Descartado | Límites del free tier |
| API serverless Vercel | ❌ Descartado | La API corre en Render |

---

## Hitos cumplidos (reales)

| Hito | Fecha | Logro |
|------|-------|-------|
| MVP funcional | ~2026-05 | CRUD básico, login JWT, Docker |
| Cliente piloto (Zaira) | ~2026-06 | Despliegue con centros reales |
| Módulos enterprise | ~2026-06 | Costes, desviaciones, incidencias, compras |
| Auditoría ECC | 2026-07-16 | 100% hallazgos cerrados, multi-tenant verificado |
| Despliegue nube | 2026-08-01 | Vercel + Render + Neon; roles oficina/supervisor; demo viva |

---

## Notas históricas

La versión previa de este documento (2026-06-06) describía una arquitectura objetivo
con hitos marcados como "✅ Completado" que no se correspondían con la realidad
(Socket.IO, Swagger, Neon/Render, Zod). Esos errores provenían de documentación de
planificación que describía el objetivo, no el estado real. Desde 2026-07-16 el
documento refleja el código que realmente corre, y el 2026-08-01 se actualizó al
despliegue en la nube y la eliminación de la app móvil.
