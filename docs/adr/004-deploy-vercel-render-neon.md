# ADR-004: Despliegue en Vercel + Render + Neon con migraciones fuera del start

**Estado:** Aceptado
**Fecha:** 2026-07-31 (actualizado 2026-08-01)
**Decisor:** Jorge Adán Rodríguez

---

## Contexto

KAVANA WAREHOUSE necesitaba un despliegue en producción **de coste cero** para un
portfolio/demo ante reclutadores, con tres piezas: dashboard web (React + Vite),
API (Node + Express + Prisma) y PostgreSQL. Restricciones reales:

1. Render free no tiene salida IPv6 → Supabase (que solo expone IPv6 en su tier
   gratis) quedó descartado por `ENETUNREACH`
2. Render free tiene filesystem read-only → no se puede `apt-get` en el build
3. La demo debe estar siempre despierta (Render free duerme a los ~15 min de
   inactividad y el primer arranque tarda ~50s)

## Alternativas Evaluadas

| Alternativa | Descripción | Problemas |
|------------|-------------|-----------|
| **VPS propio (Hetzner)** | Control total, Docker compose | Coste mensual, mantenimiento del SO, sin auto-deploy |
| **Supabase (PostgreSQL)** | Serverless gratis | Solo IPv6 en tier gratis, incompatible con Render free (IPv4-only) |
| **Neon (PostgreSQL)** | Serverless gratis con IPv4 nativo | Ninguno relevante. **Elegida** |
| **`prisma migrate deploy` en el start de Render** | Migraciones automáticas al arrancar | Rompía los deploys (el anti-patrón del Hito 7): la migración fallaba a mitad y el servicio no arrancaba |

## Decisión

| Pieza | Servicio | Nota |
|-------|----------|------|
| Dashboard (React + Vite) | **Vercel** | Root Directory: `dashboard/`, `vercel.json` dentro de `dashboard/` |
| API (Node + Express + Prisma) | **Render** | Health check `/api/v1/health`, keep-alive con cron cada 10 min |
| PostgreSQL | **Neon** | Variables individuales `PGHOST`/`PGPASSWORD` (no `DATABASE_URL`, las contraseñas de Neon rompen el URL-parser de `pg`) |

**Reglas de despliegue:**
- **Las migraciones se aplican manualmente, NUNCA en el start command** (`CMD ["node", "src/server.js"]`
  en Dockerfile.api, con comentario que lo explica). `prisma migrate deploy` en el
  start rompía los deploys.
- Keep-alive: cron cada 10 min haciendo ping al health check (doble función:
  antiduerme + vigilante).
- Demo multi-reclutador: datos aislados por `session_id` (localStorage) con caducidad
  24h y cron de limpieza de supervisores demo a las 3:00.

**Consecuencias:**
- Positivas: coste cero, auto-deploy por push, demo viva 24/7
- Negativas: migraciones requieren paso manual (se documenta en `docs/deployment.md`),
  dependencia de tres plataformas distintas (más superficie de configuración)
