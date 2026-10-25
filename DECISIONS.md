# Decisiones técnicas — KAVANA WAREHOUSE

Este documento consolida las decisiones de arquitectura e ingeniería del proyecto.
Cada decisión tiene su ADR cuando es de arquitectura, o su entrada aquí cuando es
de implementación. Git describe qué cambió; este documento explica por qué.

- **ADRs**: [`docs/adr/`](docs/adr/) (formales, con alternativas y consecuencias)
- **Decisiones estratégicas ampliadas**: [`docs/DECISIONES_ESTRATEGICAS.md`](docs/DECISIONES_ESTRATEGICAS.md)

---

## ADRs (formales)

| # | Decisión | Archivo |
|---|----------|---------|
| 001 | Arquitectura multi-tenant con feature flags por cliente | [`docs/adr/001-multi-tenant-feature-flags.md`](docs/adr/001-multi-tenant-feature-flags.md) |
| 002 | Autenticación JWT con refresh tokens (no sesiones en servidor) | [`docs/adr/002-auth-jwt-refresh-tokens.md`](docs/adr/002-auth-jwt-refresh-tokens.md) |
| 003 | Prisma ORM en vez de SQL raw | [`docs/adr/003-prisma-orm.md`](docs/adr/003-prisma-orm.md) |
| 004 | Despliegue Vercel + Render + Neon, migraciones fuera del start | [`docs/adr/004-deploy-vercel-render-neon.md`](docs/adr/004-deploy-vercel-render-neon.md) |
| 005 | Asistente técnico RAG (TF-IDF + OpenRouter) y blindaje de la demo (officeOnly) | [`docs/adr/005-asistente-rag-y-blindaje-demo.md`](docs/adr/005-asistente-rag-y-blindaje-demo.md) |
| 006 | Coste cero y modelos gratuitos como decisión explícita (asistente con modelo gratuito, 11,2 s medidos frente a 26,3 s del de pago) | [`docs/adr/006-coste-cero-y-modelos-gratuitos.md`](docs/adr/006-coste-cero-y-modelos-gratuitos.md) |

## Decisiones de implementación (resumen)

### 1. Validación de cantidades de consumo positivas
La API de consumo exige cantidad **positiva** en el body (`/stock/consume`). El
backend registra el movimiento como negativo (`-cantidad`) para mantener la
integridad histórica del almacén, y actualiza el stock con `decrement` de Prisma.
Evita inyección fraudulenta de stock (enviar cantidad positiva y que la lógica
la sumara). Validación manual, sin librería de schemas (YAGNI).

### 2. Centro resuelto en servidor al registrar consumo
`POST /stock/consume` ignora el `id_centro` del body y lo resuelve desde la
asignación del usuario autenticado. Si el body no coincide con su asignación
activa, responde 403. Protección estricta en servidor, independiente de la UI.

### 3. CORS dinámico y HTTPS forzado en producción
CORS verifica el origen contra `CORS_ORIGIN` (lista de dominios separada por
comas). En producción se fuerza HTTPS vía `x-forwarded-proto`. Evita el falso
500 de Express cuando el origen es `*` (el callback se parchea explícitamente).

### 4. Fallos de red capturados con mensaje en español
El cliente de API envuelve todas las peticiones en try/catch: error de red o DNS
se notifica como "Error de conexión. Por favor, inténtalo de nuevo cuando tengas
cobertura." en un toast. Sin estados de carga infinitos.

### 5. Cierre de sesión automático por token expirado
El cliente intercepta los 401 globalmente: limpia credenciales, guarda
`auth_error` en localStorage ("Su sesión ha expirado"), dispara `auth:unauthorized`
y el componente raíz devuelve al Login mostrando el mensaje.

### 6. Propuesta de compra calculada en servidor
El déficit (`stock_actual - stock_minimo`) y el coste estimado se calculan en el
backend (`purchaseController.js`). El frontend solo convierte el JSON a CSV.
Evita descargar miles de registros a tablets/móviles antiguos.

### 7. Desviaciones (mermas) basadas en conteo físico
`deviationController.js` compara stock registrado vs stock físico del último
conteo. `desviacion > 0` → falta (crítico, primero), `< 0` → sobra, `null` →
pendiente. El coste de la desviación se calcula con el coste unitario del
producto. El dashboard de mermas solo muestra lo relevante (falta/sobra/pendiente).

### 8. Costes por centro basados en movimientos reales
El endpoint `/dashboard/costes` suma los consumos reales de `registro_movimientos`
del mes en curso. Se descartó calcular desde `cantidad_actual - stock_fisico`
(diferencia de conteo): producía cifras desmesuradas (616%, 1867%) en centros con
conteo antiguo y 0€ en centros sin conteo.

### 9. Dos roles, no cuatro
La app evolucionó de control de personal a gestión de stock pura: se simplificó a
`oficina` (gestión total) y `supervisor` (recuento de inventario). El rol
`operario` (antes `limpiador`, renombrado en octubre de 2026) existe en la BD solo
como autor interno del seed de simulación diaria; no tiene acceso a la app.

### 10. Demo "viva" con simulación diaria
Seed histórico de 3 meses + cron diario (6:00) que simula consumos (idempotente
vía usuario de sistema marcador). Los presupuestos se calibran con el consumo
simulado de cada sección (entre ~1.100 y ~1.750 €/mes) para que la demo muestre
centros en verde, ámbar y rojo.
Supervisores demo con expiración 24h y cron de limpieza a las 3:00.

### 11. Demo industrial: datos por sección y recarga segura
En octubre de 2026 la demo pasó del caso de origen (empresa de limpieza) a una
planta metalúrgica ficticia con consumibles indirectos por sección. El modelo de
datos no cambia: "centro" es el centro de coste o sección de la planta.
- **Fuente única de datos:** `prisma/demo-industrial-data.js` (secciones, catálogo,
  inventario y consumo diario por sección). Seed base, histórico, incidencias y
  simulación leen de ahí.
- **Cada sección consume solo lo que tiene en su inventario.** Antes, histórico y
  simulación recorrían el catálogo global en todos los centros.
- **La simulación diaria aplica las reposiciones** y mueve el stock físico junto
  con el consumo, para que la merma diseñada no derive con los días.
- **La simulación se autorrepara:** si el cron falla unos días, la siguiente
  ejecución rellena los días que faltan (hasta 120). Antes solo simulaba "hoy":
  un fallo del cron dejaba la demo congelada para siempre y los filtros "mes
  actual" / "mes anterior" del panel salían vacíos.
- **Recarga de la demo:** `prisma/reset-demo.js` (simulación por defecto, `--confirm`
  para borrar). El catálogo de productos es global: sin limpiarlo, los productos
  antiguos se mezclarían con los nuevos. No usa una lista de nombres (la demo de
  producción se sembró con versiones antiguas del catálogo): borra los productos
  que no usa ningún cliente real y muestra la lista completa antes de borrar.
- **`esDemoCliente` cachea 60 s** y cubre todos los clientes demo; antes la caché
  no caducaba y tras recargar la demo el blindaje de solo lectura dejaba de
  aplicarse al cliente nuevo hasta reiniciar la API.
- **El rol interno `limpiador` pasa a `operario`** (migración
  `20261025120000_rol_operario`). El backend no cambia de comportamiento:
  `officeOnly` ya es una lista permitida (`oficina`/`supervisor`).
- **El job `demo-scripts` del CI** ejecuta sembrado, histórico, simulación y
  recarga completa con Postgres real y comprueba el resultado con SQL.

---

## Por qué este documento existe

Un reclutador técnico que siga el embudo CV → Landing → GitHub debe encontrar en
el repo la misma historia que cuenta la landing. Cada decisión aquí es verificable
en el código: endpoints, controladores y esquema Prisma. Si una afirmación no se
puede verificar, no está en este documento.
