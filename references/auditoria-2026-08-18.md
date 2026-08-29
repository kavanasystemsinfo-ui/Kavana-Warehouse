# AUDITORÍA COMPLETA KAVANA WAREHOUSE — 2026-08-18

## Resumen Ejecutivo

| Aspecto | Estado | Severidad |
|---------|--------|-----------|
| **API en producción (Render)** | ❌ **SUSPENDIDA** (503 Service Suspended) | **CRÍTICO** |
| **Frontend (Vercel)** | ✅ 200 OK | OK |
| **Tests backend** | ✅ 60/60 pass (local PG) | OK |
| **Tests frontend** | ✅ 3/3 pass | OK |
| **Build TS/Vite** | ✅ OK | OK |
| **Seguridad/Auth** | ⚠️ 7 hallazgos | **ALTA** |
| **Validación/Integridad datos** | ⚠️ 4 hallazgos | **ALTA** |
| **Formato numérico (regla Jorge)** | ⚠️ 3 puntos rotos | **MEDIA** |
| **UX/Frontend bugs** | ⚠️ 6 hallazgos | **MEDIA** |
| **Escalabilidad/Arquitectura** | ⚠️ 5 hallazgos | **MEDIA** |
| **Negocio/Operación** | ⚠️ 4 hallazgos | **MEDIA** |
| **CI/CD/Deploy** | ⚠️ 3 hallazgos | **MEDIA** |
| **Documentación/Landing** | ⚠️ Desactualizada | **BAJA** |

**Total hallazgos: 37** (5 Críticos, 12 Alta, 14 Media, 6 Baja)

---

## 1. ESTADO OPERATIVO EN VIVO (CRÍTICO)

### 1.1 API Render suspendida
- **Evidencia**: `curl https://kavana-warehouse-api.onrender.com/api/v1/health` → HTML "Service Suspended", header `x-render-routing: suspend`
- **Impacto**: Demo pública **inoperativa** (login falla, todas las llamadas 503)
- **Causa**: Plan free de Render suspende servicios tras inactividad
- **Fix conocido**: Migrar a Fly.io (patrón RouteAI completado 2026-08-17). Requiere: `fly.toml`, Dockerfile, secretos en Fly, volúmenes para persistencia
- **Referencia**: RouteAI migración completada en `kavana-routefleet-debug` skill, refs `fly-deploy-routeai-2026-08.md`

### 1.2 Crons no registrados en Hermes
- **Scripts existentes** (perfil kavana, NO en `jobs.json`):
  - `ping_warehouse_api.sh` (antiduerme cada 10 min)
  - `simulate_warehouse_daily.sh` (06:00 UTC)
  - `cleanup_warehouse_supervisores.sh` (03:00 UTC)
- **Impacto**: Demo sin vigilante → si API cae (como ahora) nadie la despierta; supervisores demo expirados no se limpian; consumos diarios no se simulan
- **Fix**: Registrar jobs en Hermes con `cronjob create` (ver skill `kavana-warehouse-debug`)

### 1.3 Tests locales pasan (60 backend + 3 frontend)
- **Entorno**: Docker Postgres 16 en puerto 5433, `DATABASE_URL` local, seed `seed-demo-cunada.js`
- **Nota**: Badge README dice 35 tests → desactualizado (real: 63)

---

## 2. BACKEND — ENDPOINTS, AUTH, SEGURIDAD, VALIDACIÓN

### 2.1 Refresh tokens fantasma (ALTA)
- **Archivo**: `src/app.js` — **NO existe** `/api/v1/auth/refresh` ni `/api/v1/auth/logout`
- **Frontend** (`dashboard/src/lib/api.ts:77-110`): llama a ambos, espera `refreshToken` en login
- **Login real** (app.js:128-129): devuelve solo `token` + `usuario`, **sin refreshToken**
- **Flujo roto**: sesión 2h → expira → FE intenta refresh → 404 → cierra sesión forzado
- **ADR-002** documenta refresh tokens como "implementado" → **falso**
- **Fix**: Implementar endpoints + rotación refresh tokens (tabla `RefreshToken` ya existe en schema) O quitar del FE y usar solo access token largo

### 2.2 register-empresa sin validación Zod (ALTA)
- **Archivo**: `src/app.js:935-1030` — endpoint público de registro de empresas
- **Validación actual**: solo `if (!nombre_empresa || !email || !password || !nombre_responsable)`
- **Existe schema**: `registerSchema` en `src/middleware/validate.js` (min 6 chars password, email válido) **PERO NO SE USA**
- **Verificado**: password de 1 carácter aceptado → hash bcrypt se genera
- **Fix**: Añadir `validate(registerSchema)` al endpoint

### 2.3 Sin rate limiting en login (ALTA)
- **Archivo**: `src/app.js:106` — `/api/v1/auth/login` sin rate limit
- **Impacto**: Brute force viable (endpoint público)
- **Fix**: Añadir rate limiter por IP (ej. `express-rate-limit`)

### 2.4 CORS error → 500 en lugar de 403 (ALTA)
- **Archivo**: `src/app.js:20-28` — callback CORS pasa `Error` al handler genérico
- **Código**: `return cb(new Error('Origen no permitido por CORS'))`
- **Resultado**: Error 500 "Error interno" en lugar de 403
- **Fix**: `return cb(null, false)` para rechazar sin error, o handler específico

### 2.5 Contraseña en claro en email bienvenida (ALTA)
- **Archivo**: `src/app.js:1002-1008` — email HTML incluye `<strong>Contraseña:</strong> ${password}`
- **Adicional**: Si SMTP falla, `catch` solo loguea y **responde success igualmente** (línea 1012-1014)
- **Fix**: No enviar password (enlace de setup), o al menos fallar si email falla

### 2.6 `expira_en` no se comprueba en auth (ALTA)
- **Archivo**: `src/app.js:41-63` (middleware `auth`) — **no valida** `u.expira_en`
- **Supervisor demo** con `expira_en` pasado sigue entrando si el cron no lo borró
- **Cron no está registrado** (punto 1.2) → supervisores demo **permanentes de facto**
- **Fix**: En `auth`, tras resolver usuario: `if (u.expira_en && new Date(u.expira_en) < new Date()) return 401`

### 2.7 Sin gitleaks en CI (ALTA)
- **CI**: `.github/workflows/ci.yml` — solo tests, sin secret scanning
- **RouteAI**: tiene gitleaks + `.gitleaks.toml` con allowlist del JWT_SECRET rotado
- **Fix**: Añadir job `secret-scan` con gitleaks (copiar de RouteAI)

---

## 3. BACKEND — INTEGRIDAD DE DATOS Y LÓGICA DE NEGOCIO

### 3.1 `POST /consumos` acepta cantidad negativa → **infla stock** (CRÍTICO)
- **Archivo**: `src/app.js:877-889`
- **Código**:
  ```js
  const { id_centro, id_producto, cantidad } = req.body;
  // NO valida cantidad > 0
  await prisma.inventarioCentro.update({ data: { cantidad_actual: inv.cantidad_actual - cantidad } });
  const mov = await prisma.registroMovimiento.create({ data: { cantidad: -Math.abs(cantidad) } });
  ```
- **Verificado empíricamente**: stock 10 + cantidad -5 → stock 15, movimiento -5 registrado
- **Comparación**: `/stock/consume` (línea 834) **SÍ valida** `cantidad <= 0`
- **Fix**: Validar `cantidad > 0` + transacción atómica (stock + movimiento)

### 3.2 `GET /consumos` y `GET /incidencias` — filtros ignorados (MEDIA)
- **Archivo**: `src/app.js:857-876` (`/consumos`) — acepta `centro` y `producto` query params **pero backend los ignora**
- **Archivo**: `src/app.js:892-902` (`/incidencias`) — FE manda `estado`, `categoria`, `desde`, `hasta` (api.ts:440-452) → **backend no los filtra**
- **Además**: FE espera `{total, incidencias}` (api.ts:438) → backend devuelve solo `{incidencias}` → tarjeta "Total" vacía

### 3.3 Endpoint `/stock/consume` requiere `officeOnly` (MEDIA)
- **Archivo**: `src/app.js:831` — `app.post('/api/v1/stock/consume', auth, officeOnly, ...)`
- **Problema**: `officeOnly` bloquea a `supervisor` y `oficina` — **el operario (`limpiador`) NO puede consumir**
- **Contradicción**: Comentario dice "app empleado" pero middleware lo prohíbe
- **Fix**: Cambiar a `supervisorOnly` o crear middleware específico para operarios asignados

### 3.4 Password por defecto conocida en Responsables (MEDIA)
- **Archivo**: `dashboard/src/pages/Responsables.tsx:35`
- **Código**: `password: form.password || 'kavanawarehouse'`
- **Impacto**: Si supervisor no escribe password, se usa conocida públicamente
- **Fix**: Validar password obligatorio en frontend (ya lo valida backend con bcrypt min 1 char, pero FE debería exigirlo)

### 3.5 Rol `responsable` entra al dashboard pero todo da 403 (MEDIA)
- **Archivo**: `dashboard/src/App.tsx:19` — `ProtectedRoute` solo bloquea `limpiador`
- **Rol `responsable`** pasa → ve dashboard completo
- **Pero**: TODAS las escrituras (`officeOnly`, `supervisorOnly`) devuelven 403
- **Experiencia rota**: Usuario ve UI pero no puede hacer nada
- **Fix**: Añadir `responsable` a `officeOnly`/`supervisorOnly` donde proceda O crear vista read-only dedicada

---

## 4. FRONTEND — UX, FORMATO NUMÉRICO, HOOKS

### 4.1 Formato numérico roto (regla Jorge) — 3 puntos (MEDIA)
| Archivo | Línea | Código actual | Debería ser |
|---------|-------|---------------|-------------|
| `dashboard/src/pages/Costes.tsx` | 93 | `{data?.total_coste ?? 0} €` | `{fmtEuro(data?.total_coste ?? 0)} €` |
| `dashboard/src/pages/Costes.tsx` | 98 | `{data?.total_presupuesto ?? 0} €` | `{fmtEuro(data?.total_presupuesto ?? 0)} €` |
| `dashboard/src/pages/Inventario.tsx` | 219 | `{p.coste_unitario}` | `{fmtEuro(p.coste_unitario)} €` |

- **Regla**: punto miles (12.415), coma decimales (43,5), sin decimales si no hay (43)
- **fmtNum/fmtEuro** existen en `dashboard/src/lib/format.ts` y **sí funcionan** (usados en Deviations.tsx, Costes.tsx tarjetas)
- **Fix**: Aplicar `fmtEuro` en los 3 puntos señalados

### 4.2 Botones visibles en demo que fallan con 403 (MEDIA)
| Página | Botón | Visible para | Backend response |
|--------|-------|--------------|------------------|
| `Incidents.tsx:213` | "Iniciar" | **visitantes** (demo) | 403 (officeOnly) |
| `Deviations.tsx:109` | "Limpiar datos demo" | **visitantes** (demo) | 403 (officeOnly) |

- **Fix**: Ocultar botones con `!visita` (ya se usa en otras partes: línea 203 Deviations, 217 Incidents para "Resolver")

### 4.3 `getIncidencias` espera `{total, incidencias}` — backend devuelve solo array (MEDIA)
- **FE**: `dashboard/src/lib/api.ts:438` — `Promise<{ total: number; incidencias: Incidencia[] }>`
- **BE**: `src/app.js:901` — `res.json({ incidencias: incs })` **sin total**
- **Resultado**: Tarjeta "Total" muestra 0/undefined

### 4.4 `getConsumption` manda `centro`/`producto` — backend los ignora (MEDIA)
- **FE**: `dashboard/src/lib/api.ts:370-378` — params `centro`, `producto`, `desde`, `hasta`
- **BE**: `src/app.js:158-272` — solo usa `desde`/`hasta`, ignora `centro`/`producto`

### 4.5 Sin toast/notificaciones de feedback (MEDIA)
- **Patrón**: Tras acciones (guardar presupuesto, contar stock, crear responsable) **no hay feedback visual** salvo error
- **Fix**: Añadir toast simple (como Steelworks) o mensaje inline temporal

### 4.6 `AuthResponse` espera `refreshToken` — login no lo devuelve (ALTA)
- **FE**: `dashboard/src/lib/api.ts:8-13` — interface incluye `refreshToken: string`
- **Login real**: `src/app.js:129` — devuelve `{ token, usuario: {...} }` **sin refreshToken**
- **Consecuencia**: `setTokens(data.token, data.refreshToken)` → `refreshToken` = `undefined` → refresh falla siempre

---

## 5. ESCALABILIDAD Y ARQUITECTURA

### 5.1 `src/app.js` monolítico 1125 líneas (MEDIA)
- **Estructura**: 45 rutas en un solo archivo, lógica de negocio mezclada con HTTP
- **Controllers**: Solo 3 (coste, deviation, purchase) — el resto inline
- **Comparación**: RouteAI tiene `server/src/routes/` modular (auth, drivers, stops, routes, etc.)
- **Riesgo**: Difícil testear aisladamente, onboarding lento, merges conflictivos

### 5.2 Prisma Client instanciado 4 veces (MEDIA)
- **Archivos**: `src/app.js:30`, `src/controllers/costeController.js:11`, `deviationController.js:11`, `purchaseController.js:11`
- **Patrón correcto**: Singleton exportado desde `src/lib/prisma.js` (RouteAI lo hace)
- **Impacto**: Conexiones extra, pool fragmentation

### 5.3 `assistantLimits` en Map en memoria (MEDIA)
- **Archivo**: `src/app.js:1097` — `const assistantLimits = new Map()`
- **Problema**: En producción con múltiples instancias (Fly.io, K8s) **cada instancia tiene su contador** → límite 25/IP/día se burla escalando horizontalmente
- **Fix**: Redis o tabla BD para rate limiting distribuido

### 5.4 `_demoClienteId` caché en variable global (MEDIA)
- **Archivo**: `src/app.js:72-80` — `let _demoClienteId = null`
- **Mismo problema**: En multi-instancia, caché no se invalida entre instancias
- **Fix**: Redis o consulta directa (es 1 query, caché micro-optimización prematura)

### 5.5 Sin paginación en listados grandes (MEDIA)
- **Ejemplos**: `/incidencias` (línea 900) devuelve **todo** sin límite; `/recuentos` (587) `take: 200` hardcodeado
- **Riesgo**: Payloads MB, memoria, timeouts con histórico real

---

## 6. NEGOCIO Y OPERACIÓN

### 6.1 OPEX solo real — no estimado (regla Jorge, ya aplicada)
- **CosteController** (línea 167-177): usa consumos REALES del mes en curso desde `registro_movimientos`
- **Comentario**: "Ya NO se usa la diferencia stock_fisico, que daba cifras desmesuradas"
- **OK**: Alineado con decisión RouteAI (OPEX real vs estimado inflado 4.5x)

### 6.2 Filtro periodo global implementado (OK)
- **Endpoints**: `/dashboard/consumption`, `/incidencias`, `/driver/sessions`, `/dashboard-data` aceptan `desde`/`hasta`
- **Frontend**: `PeriodoContext` + selector global (Mes actual / Mes anterior / Esta semana / Todo / Personalizado)

### 6.3 Demo blindada patrón RouteAI (OK)
- **Campos**: `is_demo`, `session_id`, `expira_en` en Usuario, Producto, Incidencia
- **Frontend**: `esVisita()` detecta `session_id` o `demo` → UI read-only + badge "demo · solo lectura" 🔒
- **Backend**: `officeOnly` bloquea escrituras para visitantes
- **Pendiente**: Cron limpieza expirados no registrado (punto 1.2)

### 6.4 Seed histórico 3 meses (OK)
- **Archivos**: `prisma/seed-historico.js`, `simulate-daily.js`, `seed-incidencias.js`
- **Datos**: ~centros, consumos, mermas, incidencias con fotos placeholder
- **Idempotente**: Umbral >500 paradas/movimientos → no duplica

---

## 7. CI/CD Y DEPLOY

### 7.1 CI solo backend + frontend test (MEDIA)
- **`.github/workflows/ci.yml`**: 2 jobs (test, frontend-test)
- **Falta**: secret-scan (gitleaks), build frontend, deploy preview, lint, typecheck
- **RouteAI CI**: 5 jobs (secret-scan, server-tests, client-build, client-tests, client-admin-build)

### 7.2 Deploy API: Render free (suspendido) — sin migración Fly.io (CRÍTICO)
- **Estado**: Mismo problema que RouteAI ANTES de migración 2026-08-17
- **Patrón conocido**: `Dockerfile.api`, `fly.toml`, secrets en Fly, volumen `warehouse_data`
- **Bloqueador**: Jorge prefiere Render (memoria: "Jorge NO migra a Fly (prefiere Render) y dejó el proyecto pausado: no tocar infra sin que lo pida")
- **Decisión**: Documentar, NO ejecutar sin orden

### 7.3 Deploy Frontend: Vercel OK (200)
- **Dashboard**: `warehouse.kavanasystems.com` → 200, build Vite + TS OK
- **Config**: `dashboard/vercel.json` + `vite.config.ts` (base `/`)

### 7.4 BD: Neon PostgreSQL — variables individuales (OK)
- **Config**: `PGHOST`, `PGPASSWORD`, `PGUSER`, `PGDATABASE` (no `DATABASE_URL` con password — rompe parser `pg`)
- **Migraciones**: Manuales (`npx prisma migrate deploy`), NUNCA en start (rompía deploys)

---

## 8. DOCUMENTACIÓN Y LANDING

### 8.1 README badge tests desactualizado (BAJA)
- **README.md**: Badge "35 passing" → real **63** (60 backend + 3 frontend)
- **Fix**: Actualizar badge o quitar

### 8.2 ADRs 001-005 — numeración fijada (OK)
- **docs/adr/**: 5 ADRs (001 PWA, 002 Auth JWT, 003 Multi-tenant, 004 Deploy, 005 Demo Blindaje)
- **Regla**: No renumerar (igual que RouteAI ADR 001-007)

### 8.3 Landing en OTRO repo (regla Jorge)
- **Repo**: `/root/kavana-landing` (rama `main` → `kavanasystems.com/warehouse/`)
- **Hábito obligatorio**: Tras CADA commit/push a Warehouse, auditar landing contra código real y actualizarla
- **Métricas a verificar**: tests count, ADRs count, endpoints count, features listadas

---

## 9. PLAN DE ACCIÓN PROPUESTO (PRIORIZADO)

### FASE 0 — CRÍTICO (Bloquea demo viva)
| # | Acción | Esfuerzo | Dependencia |
|---|--------|----------|-------------|
| 0.1 | Migrar API Render → Fly.io (Dockerfile, fly.toml, secrets, volumen) | 1 día | Requiere OK de Jorge (memoria: prefiere Render) |
| 0.2 | Registrar crons en Hermes (ping, simulate-daily, cleanup) | 30 min | Ninguna |
| 0.3 | Arreglar `POST /consumos` cantidad negativa → infla stock | 30 min | Ninguna |

### FASE 1 — ALTA (Seguridad + Integridad)
| # | Acción | Esfuerzo |
|---|--------|----------|
| 1.1 | Implementar `/auth/refresh` + `/auth/logout` + rotación refresh tokens O quitar del FE | 2-3 h |
| 1.2 | Añadir `validate(registerSchema)` a `/auth/register-empresa` | 15 min |
| 1.3 | Rate limiting en `/auth/login` (express-rate-limit) | 30 min |
| 1.4 | CORS error → 403 no 500 | 15 min |
| 1.5 | Quitar password de email bienvenida / fallar si SMTP falla | 30 min |
| 1.6 | Validar `expira_en` en middleware `auth` | 15 min |
| 1.7 | Añadir gitleaks a CI (copiar de RouteAI) | 30 min |

### FASE 2 — MEDIA (UX + Formato + Arquitectura)
| # | Acción | Esfuerzo |
|---|--------|----------|
| 2.1 | Aplicar `fmtEuro` en Costes.tsx:93,98 e Inventario.tsx:219 | 15 min |
| 2.2 | Ocultar botones "Iniciar" (Incidents) y "Limpiar demo" (Deviations) para `visita` | 15 min |
| 2.3 | Backend `/incidencias` devolver `{total, incidencias}` + filtrar `estado`/`categoria` | 30 min |
| 2.4 | Backend `/consumos` filtrar `centro`/`producto` | 30 min |
| 2.5 | `/stock/consume`: cambiar `officeOnly` → permitir operario asignado | 30 min |
| 2.6 | Password obligatorio en Responsables.tsx (quitar default 'kavanawarehouse') | 15 min |
| 2.7 | Rol `responsable`: vista read-only dedicada O permisos coherentes | 1 h |
| 2.8 | Toast/notificaciones feedback en acciones | 1 h |
| 2.9 | Refactor `app.js` → routers modulares (`src/routes/`) | 1 día |
| 2.10 | PrismaClient singleton (`src/lib/prisma.js`) | 30 min |
| 2.11 | Rate limiting asistente distribuido (Redis/BD) | 2 h |
| 2.12 | Paginación en `/incidencias`, `/recuentos`, `/consumos` | 1 h |

### FASE 3 — BAJA (Docs + Landing)
| # | Acción | Esfuerzo |
|---|--------|----------|
| 3.1 | Actualizar badge tests README (35 → 63) | 5 min |
| 3.2 | Auditar landing `kavana-landing` contra código real | 30 min |

---

## 10. ARCHIVOS CLAVE PARA FIJAR (referencia rápida)

```
Backend:
/root/Kavana-Warehouse/src/app.js                    # 1125 líneas, monolítico
/root/Kavana-Warehouse/src/middleware/validate.js    # Zod schemas (registerSchema existe, no usado)
/root/Kavana-Warehouse/src/controllers/*.js          # 3 controllers
/root/Kavana-Warehouse/prisma/schema.prisma          # Schema completo
/root/Kavana-Warehouse/prisma/seed-*.js              # Seeds (demo, histórico, incidencias, daily)

Frontend:
/root/Kavana-Warehouse/dashboard/src/lib/api.ts      # Cliente API (refresh/logout rotos)
/root/Kavana-Warehouse/dashboard/src/lib/format.ts   # fmtNum/fmtEuro (OK, usar en 3 puntos)
/root/Kavana-Warehouse/dashboard/src/pages/*.tsx     # 11 páginas
/root/Kavana-Warehouse/dashboard/src/App.tsx         # ProtectedRoute (solo bloquea limpiador)

CI/CD:
/root/Kavana-Warehouse/.github/workflows/ci.yml      # Solo tests, sin gitleaks
/root/Kavana-Warehouse/Dockerfile.api                # Para Fly.io
/root/Kavana-Warehouse/docker-compose.yml            # Local dev

Docs:
/root/Kavana-Warehouse/docs/adr/                     # ADR 001-005
/root/Kavana-Warehouse/references/auditoria-2026-08-18.md  # Este informe (guardar aquí)
```

---

## 11. PRÓXIMOS PASOS RECOMENDADOS

1. **Confirmar con Jorge** si autoriza migración API a Fly.io (patrón RouteAI listo, él prefiere Render)
2. **Ejecutar Fase 0.2-0.3** (crons + fix stock negativo) — **no requieren permiso**, son bugs puros
3. **Ejecutar Fase 1** completa (seguridad) — base para cualquier uso real
4. **Decidir arquitectura refresh tokens**: implementar en backend O simplificar FE a solo access token largo (2h o 24h)
5. **Programar refactor modular** (`app.js` → routers) en sprint dedicado

---

*Informe generado 2026-08-18 tras auditoría completa: clonado repo, verificación identidad, tests locales (63 pass), probes HTTP en vivo, revisión código backend + frontend + tests + CI + docs. Metodología: skill `kavana-warehouse-debug` + patrones `kavana-routefleet-debug` (RouteAI).*