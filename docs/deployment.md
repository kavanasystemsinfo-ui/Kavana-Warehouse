# Deployment Guide — Kavana CleanStock

> **Document Type:** Technical Deployment Guide
> **Target:** DevOps, IT Operations
> **Version:** 3.0.0
> **Last Updated:** 2026-06-06

---

## Arquitectura de Producción (Coste 0 €/mes)

```
                          ┌─────────────────────────────────────┐
                          │       Vercel (Hobby)                │
                          │                                     │
                          │  ┌──────────────────────────────┐   │
                          │  │  Dashboard (Supervisor)      │   │
                          │  │  Root: /dashboard            │   │
                          │  │  → /api/* → Render           │   │
                          │  │  → /socket.io → Render       │   │
                          │  └──────────────────────────────┘   │
                          │  ┌──────────────────────────────┐   │
                          │  │  Mobile PWA (Limpiador)      │   │
                          │  │  Root: /mobile               │   │
                          │  │  → /api/* → Render           │   │
                          │  └──────────────────────────────┘   │
                          └──────────────┬──────────────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────────────────┐
                          │     Render (Free)                    │
                          │                                      │
                          │  ┌──────────────────────────────┐    │
                          │  │  API Express + Socket.IO     │    │
                          │  │  Node.js + Prisma            │    │
                          │  │  :3000                       │    │
                          │  └──────────────┬───────────────┘    │
                          │                 │                    │
                          │                 ▼                    │
                          │  ┌──────────────────────────────┐    │
                          │  │  Neon.tech PostgreSQL Free   │    │
                          │  │  0.5 GB, Frankfurt           │    │
                          │  └──────────────────────────────┘    │
                          └──────────────────────────────────────┘
```

| Componente | Plataforma | Plan | Coste |
|------------|-----------|------|-------|
| Base de datos PostgreSQL | Neon.tech | Free (0.5 GB) | 0 € |
| Backend API (Express + Socket.IO) | Render | Free | 0 € |
| Dashboard Supervisor (React) | Vercel | Hobby | 0 € |
| Mobile PWA Limpiador (React) | Vercel | Hobby | 0 € |
| **TOTAL** | | | **0 €/mes** |

---

## Prerequisitos

- Cuenta en [GitHub](https://github.com) con el repositorio en **público** (los planes gratuitos de Render y Vercel requieren repos público)
- Cuenta en [Neon.tech](https://neon.tech)
- Cuenta en [Render](https://render.com)
- Cuenta en [Vercel](https://vercel.com)
- Git instalado localmente

---

## Paso 1 — Base de Datos en Neon.tech (5 minutos)

> **IMPORTANTE:** Hacemos esto PRIMERO porque Render necesitará la URL de conexión a la BD.

1. Ve a https://neon.tech y regístrate con tu cuenta de GitHub
2. Crea un nuevo proyecto:
   - **Project name:** `kavana-cleanstock`
   - **Database name:** `kavana_cleanstock`
   - **Region:** `eu-central-1` (Frankfurt, Europa — el más cercano a España)
3. Neon te mostrará una **Connection String**. Cópiala entera. Tendrá este formato:

```
postgresql://neondb_owner:AbCdEf123456@ep-cool-morning-123456.eu-central-1.aws.neon.tech/kavana_cleanstock?sslmode=require
```

4. Guárdala en un bloc de notas. La necesitarás en el paso 2.

---

## Paso 2 — Backend API en Render (10 minutos)

1. Ve a https://render.com e inicia sesión con GitHub
2. En el Dashboard de Render, pulsa **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub: `kavanasystemsinfo-ui/clean_ops`
4. Configura el servicio:

| Campo | Valor |
|-------|-------|
| **Name** | `kavana-cleanstock-api` |
| **Region** | Frankfurt (EU Central) |
| **Branch** | `main` ⚠️ (NO `master` — tu repo usa `main`) |
| **Root Directory** | (déjalo vacío) |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `npx prisma migrate deploy && node src/server.js` |
| **Instance Type** | Free |

5. Antes de crear, ve a la sección **"Environment Variables"** y añade:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (pega la Connection String de Neon del Paso 1) |
| `JWT_SECRET` | `kavana-cleanstock-prod-jwt-2026-CAMBIA-ESTO` ⚠️ |
| `JWT_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRY_DAYS` | `30` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` |
| `PORT` | `3000` |

> **⚠️ WARNING:** Cambia el `JWT_SECRET` por algo largo y aleatorio. Puedes generar uno con: `openssl rand -base64 32`

6. Pulsa **"Create Web Service"**
7. Render tardará 2-5 minutos en construir y desplegar. Cuando termine, verás el estado **"Live"** y una URL como:
   ```
   https://kavana-cleanstock-api.onrender.com
   ```

### Verificación del Backend

Abre en tu navegador:
```
https://kavana-cleanstock-api.onrender.com/health
```

Debes ver:
```json
{"status":"ok","timestamp":"2026-06-06T..."}
```

### Seed de datos iniciales (solo la primera vez)

Render ejecutará las migraciones automáticamente (`prisma migrate deploy`), pero el seed hay que lanzarlo manualmente una vez:

1. Ve a tu **Render Dashboard** → tu servicio (`kavana-cleanstock-api`)
2. Pestaña superior → **"Shell"**
3. Ejecuta:
```bash
node prisma/seed.js
```

Esto creará los usuarios de prueba con la contraseña **`CleanStock2026!`** para todos.

---

## Paso 3 — Dashboard en Vercel (5 minutos)

1. Ve a https://vercel.com e inicia sesión con GitHub
2. Pulsa **"Add New..."** → **"Project"**
3. Importa el repositorio: `kavanasystemsinfo-ui/clean_ops`
4. Configura el proyecto:

| Campo | Valor |
|-------|-------|
| **Project Name** | `kavana-cleanstock-dashboard` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `dashboard` ⚠️ |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

5. Pulsa **"Deploy"**
6. Vercel te dará una URL como:
   ```
   https://kavana-cleanstock-dashboard.vercel.app
   ```

### Dominio personalizado (opcional)

Si quieres que el Dashboard sea accesible desde `cleanstock.kavanasystems.com`:
1. En Vercel, ve a **Settings** → **Domains**
2. Añade `cleanstock.kavanasystems.com`
3. Vercel te dirá qué registro DNS (CNAME) añadir en tu proveedor de dominio

---

## Paso 4 — Mobile PWA en Vercel (5 minutos)

1. En Vercel, pulsa otra vez **"Add New..."** → **"Project"**
2. Importa el **mismo repositorio**: `kavanasystemsinfo-ui/clean_ops`
3. Configura el proyecto:

| Campo | Valor |
|-------|-------|
| **Project Name** | `kavana-cleanstock-mobile` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `mobile` ⚠️ |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. Pulsa **"Deploy"**
5. URL resultante:
   ```
   https://kavana-cleanstock-mobile.vercel.app
   ```

### Dominio personalizado (opcional)

Subdominio sugerido: `app.kavanasystems.com` → apuntando a este proyecto de Vercel.

---

## Paso 5 — Verificación Final

### ✅ Checklist de comprobación

| # | Comprobación | Credenciales |
|---|-------------|--------------|
| 1 | `https://kavana-cleanstock-api.onrender.com/health` → `{"status":"ok"}` | — |
| 2 | `https://kavana-cleanstock-api.onrender.com/api-docs` → Swagger UI | — |
| 3 | `https://kavana-cleanstock-dashboard.vercel.app` → Login | `supervisor@kavana.com` / `CleanStock2026!` |
| 4 | `https://kavana-cleanstock-mobile.vercel.app` → Login | `carlos@kavana.com` / `CleanStock2026!` |
| 5 | Login como supervisor funciona correctamente | `supervisor@kavana.com` / `CleanStock2026!` |
| 6 | Login como limpiador funciona correctamente | `carlos@kavana.com` / `CleanStock2026!` |
| 7 | El operario registra un consumo y el supervisor lo ve en tiempo real | — |

### Usuarios de prueba disponibles

| Email | Rol | Contraseña |
|-------|-----|------------|
| `admin@kavana.com` | Admin | `CleanStock2026!` |
| `supervisor@kavana.com` | Supervisor | `CleanStock2026!` |
| `carlos@kavana.com` | Limpiador | `CleanStock2026!` |
| `ana@kavana.com` | Limpiador | `CleanStock2026!` |
| `baja@kavana.com` | Limpiador (baja médica) | `CleanStock2026!` |

---

## ⚠️ Cosas a tener en cuenta

### Cold Starts (arranque en frío)

El plan gratuito de Render **"duerme"** tu servidor tras **15 minutos de inactividad**. La primera visita tras ese periodo tarda **~30-50 segundos** en cargar. Esto es normal y aceptable para un prototipo/MVP.

### Repositorio público

Los planes gratuitos de Render y Vercel requieren que el repositorio de GitHub sea **público**. Has tenido que cambiarlo de privado a público para que funcione.

### Actualizaciones futuras

Cada vez que hagas `git push` a tu repositorio de GitHub (usando [`github_push.bat`](github_push.bat)), tanto Render como Vercel se actualizarán automáticamente. No tienes que hacer nada más.

### Si cambias el nombre del servicio en Render

Si la URL final de tu servicio en Render NO es exactamente `kavana-cleanstock-api.onrender.com`, necesitarás actualizar los archivos [`dashboard/vercel.json`](dashboard/vercel.json) y [`mobile/vercel.json`](mobile/vercel.json) con la nueva URL, y hacer push de nuevo.

---

## Resumen de URLs Finales

| Servicio | URL |
|----------|-----|
| 🔧 Backend API | `https://kavana-cleanstock-api.onrender.com` |
| 📖 API Docs (Swagger) | `https://kavana-cleanstock-api.onrender.com/api-docs` |
| 📊 Dashboard Supervisor | `https://kavana-cleanstock-dashboard.vercel.app` |
| 📱 Mobile Limpiador | `https://kavana-cleanstock-mobile.vercel.app` |

---

## Troubleshooting

### Error: `ECONNREFUSED` en la base de datos

La conexión a Neon puede fallar si:
- La `DATABASE_URL` tiene espacios o caracteres extra
- No has incluido `?sslmode=require` al final
- La IP de Render no está permitida (Neon Free permite todas por defecto)

### Error: `Cannot find module '@prisma/client'`

El Build Command debe ejecutar `npx prisma generate` después de `npm install`. Verifica que en Render tienes:
```
Build Command: npm install && npx prisma generate
```

### Error: 404 en las rutas de la API

Verifica que los [`vercel.json`](dashboard/vercel.json) de los frontends apuntan a la URL correcta de Render. Si cambiaste el nombre del servicio, actualiza las URLs.

### Error de autenticación al hacer login

Asegúrate de haber ejecutado el seed manualmente desde el Shell de Render:
```bash
node prisma/seed.js
```

---

## File Reference

| File | Purpose |
|------|---------|
| [`prisma/seed.js`](prisma/seed.js) | Seed data con usuarios de prueba |
| [`dashboard/vercel.json`](dashboard/vercel.json) | Rewrites de Vercel para Dashboard |
| [`mobile/vercel.json`](mobile/vercel.json) | Rewrites de Vercel para Mobile PWA |
| [`github_push.bat`](github_push.bat) | Script de push a GitHub |
| [`.env.example`](.env.example) | Variables de entorno de ejemplo |
| [`src/server.js`](src/server.js) | Entry point del servidor Express |
