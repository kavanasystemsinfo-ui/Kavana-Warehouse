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
`limpiador` existe en la BD solo como autor interno del seed de simulación
diaria; no tiene acceso a la app.

### 10. Demo "viva" con simulación diaria
Seed histórico de 3 meses + cron diario (6:00) que simula consumos (idempotente
vía usuario de sistema marcador). Los presupuestos se ajustaron al consumo medio
real (~3.600€/mes) para que la demo muestre centros en verde, ámbar y rojo.
Supervisores demo con expiración 24h y cron de limpieza a las 3:00.

---

## Por qué este documento existe

Un reclutador técnico que siga el embudo CV → Landing → GitHub debe encontrar en
el repo la misma historia que cuenta la landing. Cada decisión aquí es verificable
en el código: endpoints, controladores y esquema Prisma. Si una afirmación no se
puede verificar, no está en este documento.
