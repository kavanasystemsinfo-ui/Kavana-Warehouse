# ADR 005 — Asistente técnico RAG y blindaje de la demo

**Estado:** Aceptado
**Fecha:** 2026-08-04

## Contexto

La demo pública de Kavana Warehouse (`warehouse.kavanasystems.com`) la prueba un
reclutador que no conoce el código: entra con `warehouse`/`kavana`, ve una
empresa de limpieza con 3 meses de histórico (30.723 movimientos) y puede
preguntarse qué hay detrás. En RouteAI (mismo patrón de portfolio) se resolvió
con un asistente técnico que responde SOLO con la documentación real del repo,
y un blindaje que impide a los visitantes tocar los datos compartidos.

Problemas detectados en Warehouse antes de este ADR:

1. **Sin asistente**: no había forma de preguntar cómo funciona el proyecto
   desde la demo. El código (README, DECISIONS, ADRs, docs técnicos) existía
   pero no era consultable desde la propia app.
2. **Reset sin protección**: `POST /api/v1/demo/reset` solo exigía estar
   autenticado. Un supervisor de visita (creado desde `/supervisores`, caduca en
   24h) podía borrar TODA la empresa demo (movimientos, centros, usuarios).
3. **Gestión global abierta a visitantes**: los supervisores demo (session_id)
   podían crear/editar/borrar productos, centros y usuarios del catálogo
   compartido.

## Decisión

### 1. Asistente técnico RAG (mismo patrón que RouteAI)

- `POST /api/v1/assistant` público (sin auth), límite 25 preguntas/día/IP.
- Corpus: `README.md`, `DECISIONS.md`, `docs/DECISIONES_ESTRATEGICAS.md`,
  `docs/deployment.md`, `docs/adr/*.md`, `docs/technical/*.md`.
- Búsqueda **TF-IDF en memoria** (sin embeddings ni vector DB): corpus < 100 KB,
  determinista, gratis. `pgvector` sería sobreingeniería a esta escala.
- LLM: **OpenRouter** con modelo gratuito (`openai/gpt-oss-20b:free`) por
  defecto y escalado a `deepseek/deepseek-chat` para preguntas complejas
  (comparativas, arquitectura, seguridad). Fallback automático si el free
  devuelve rate limit.
- **Regla de honestidad**: responde exclusivamente con el contexto; si no está
  documentado, remite a Jorge sin inventar. Sin `OPENROUTER_API_KEY` devuelve
  500 claro (no alucina).
- Frontend: componente `AssistantChat` reutilizable en el widget flotante del
  login y en la página `/asistente` del panel (una sola fuente de verdad).

### 2. Blindaje: `officeOnly` (supervisor de visita = solo lectura + recuento)

- Nuevo middleware `officeOnly`: permite `oficina` y supervisores SIN
  `session_id` (admin legítimo de su empresa registrada); **bloquea (403) a los
  supervisores de visita** (los que tienen `session_id`, creados desde
  `/supervisores` con caducidad 24h).
- Aplicado a la gestión global: `POST/PUT/DELETE /productos`, `POST/PUT
  /centros`, `POST /categorias`, `POST /usuarios`, `POST /usuarios/:id/centros`,
  `POST /empleados`, `POST /inventario`, `POST /inventario/reponer` y
  `POST /demo/reset`.
- El supervisor de visita conserva su flujo real: conteo físico
  (`POST /inventario/:id/:producto/conteo`), recuentos, incidencias y lectura.

## Alternativas evaluadas

| Alternativa | Pro | Contra | Veredicto |
|---|---|---|---|
| Embeddings + pgvector | Semántica más rica | Infra extra, coste, complejidad | ❌ sobreingeniería a esta escala |
| OpenAI API directa | Simple | Coste, sin fallback free→pro | ❌ OpenRouter da el fallback gratis |
| Bloquear TODO a supervisores demo | Máxima seguridad | Rompe el flujo de recuento del supervisor | ❌ capado fino por session_id |
| Solo oficina puede todo (rol estricto) | Simple | El admin de empresa registrada es rol supervisor | ❌ se rompe el alta de empresas |

## Consecuencias

- Un reclutador puede interrogar la demo sin contaminarla: las preguntas del
  asistente no gastan crédito de más (25/día/IP) y el supervisor de visita no
  toca datos compartidos.
- El catálogo y el histórico de la empresa demo quedan a salvo de borrados
  accidentales o malintencionados desde cuentas de visita.
- `OPENROUTER_API_KEY` debe existir en Render para que el asistente responda
  (sin ella responde 500 "no configurado", nunca inventa).
- Los tests cubren el capado: un supervisor demo recibe 403 en DELETE
  producto, POST producto y demo/reset (45 tests en total).

## Código

- `src/services/assistantService.js` — corpus, TF-IDF, OpenRouter, honestidad.
- `src/app.js` — endpoint `POST /api/v1/assistant` (público), middleware
  `officeOnly`, `session_id` en `req.user`.
- `src/__tests__/assistant.test.js` y `src/__tests__/api.test.js` — tests.
- `dashboard/src/components/AssistantChat.tsx`, `dashboard/src/pages/Asistente.tsx`,
  `dashboard/src/lib/format.ts` — frontend.
