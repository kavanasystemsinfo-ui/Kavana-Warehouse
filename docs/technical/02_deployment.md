# Deployment Guide — KAVANA WAREHOUSE

> **Target:** DevOps, IT Operations
> **Version:** 4.2.0 (actualizado 2026-07-20, modelo de responsables de centro)
> **Last Updated:** 2026-07-20

---

## Arquitectura Actual

```
                    warehouse.kavanasystems.com
                            │
                       ┌────┴────┐
                       │  nginx  │  ← SSL (Let's Encrypt)
                       │  :443   │
                       └────┬────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌────────────┐              ┌──────────────┐
    │ Dashboard  │              │  API Express │
    │ :4001      │              │ :3000        │
    │ React SPA  │              │ + Prisma     │
    │ (Docker)   │              │ (Docker)     │
    └────────────┘              └──────┬───────┘
                                       │
                                       ▼
                                ┌────────────┐
                                │ PostgreSQL │
                                │ :5432      │
                                │ (Docker)   │
                                └────────────┘
```

> **Nota de alcance (2026-07-20):** El proyecto **tiene app móvil del responsable de centro**
> (`mobile/`, PWA React, puerto 4000). El responsable hace **recuento físico** del stock de sus
> centros asignados. Los limpiadores NO usan app (modelo descartado). El supervisor registra
> consumos desde el dashboard web. Ver `docs/ESTADO_ACTUAL_CLEANSTOCK.md`.

| Componente | Plataforma | Coste |
|---|---|---|
| Servidor | Hetzner VPS (2 cores, 3.7 GB) | ~4€/mes |
| Base de datos | PostgreSQL 16 (Docker) | Incluido |
| Backend API | Express + Prisma (Docker) | Incluido |
| Frontend | nginx reverse proxy (dashboard :4001) | Incluido |
| SSL | Let's Encrypt (certbot) | Gratis |
| **TOTAL** | | **~4€/mes** |

## Servidor

**VPS Hetzner:**
- IP: 167.233.97.71
- OS: Ubuntu 24.04
- CPU: 2 cores
- RAM: 3.7 GB
- Disco: 38 GB (67% usado tras limpieza)

## Configuración nginx

El virtual host para `warehouse.kavanasystems.com` está en `/etc/nginx/sites-available/kavanawarehouse`:

```nginx
server {
    listen 443 ssl;
    server_name warehouse.kavanasystems.com;

    ssl_certificate /etc/letsencrypt/live/warehouse.kavanasystems.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/warehouse.kavanasystems.com/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
    }
    location / {
        proxy_pass http://127.0.0.1:4001;
    }
}
```

## Rutas de la aplicación

| Ruta | Servicio interno | Puerto |
|---|---|---|
| `https://warehouse.kavanasystems.com/` | Dashboard supervisor (web, responsive) | :4001 |
| `https://warehouse.kavanasystems.com/mobile/` | App responsable de centro (PWA) | :4000 |
| `https://warehouse.kavanasystems.com/api/v1/*` | API REST | :3000 |

> No hay ruta `/empleado/` en producción. El registro de consumos se hace desde el dashboard.

## Mantenimiento

### Renovar SSL

El certificado Let's Encrypt se renueva automáticamente. Para verificar:
```bash
certbot renew --dry-run
```

### Actualizar la aplicación

```bash
cd /root/kavana-warehouse
git pull
docker compose up -d --build
```

### Limpiar disco

```bash
# Limpiar imágenes Docker no usadas
docker image prune -a
# Limpiar build cache
docker builder prune -f
```

## Usuarios de prueba

| Email | Rol | Contraseña |
|---|---|---|
| `warehouse` | Oficina (Zaira García, gestión total) | `kavana` |

> El rol `limpiador` existe en el modelo de datos (`Usuario.rol`) para trazabilidad de
> asignación a centros, **pero no tiene credenciales de acceso a ninguna app**.

## Despliegue actual (2026-08-01)

Arquitectura en producción, desacoplada y sin coste:

```
warehouse.kavanasystems.com  (DNS → Vercel)
        │
        ├── /            → Vercel (dashboard estático, CDN)
        └── /api/*       → rewrite → Render Web Service
                                │
                                └── Neon PostgreSQL (serverless)
```

| Capa | Proveedor | Detalle |
|------|-----------|---------|
| **Frontend** | Vercel | `dashboard/`, build Vite, dominio `warehouse.kavanasystems.com` |
| **API** | Render (free) | Web Service `kavana-warehouse-api`, `node src/server.js` |
| **BD** | Neon (free) | PostgreSQL serverless, región Frankfurt, proyecto `kavana-cleanstock` |

- **Build Command (Render)**: `npm install && npx prisma generate`
- **Start Command (Render)**: `node src/server.js` (sin migrate en arranque)
- **Health Check (Render)**: `/api/v1/health`
- **Env vars (Render)**: `DATABASE_URL` (Neon), `JWT_SECRET`, `CORS_ORIGIN`
- **Antiduerme**: cron local cada 10 min hace ping a `/api/v1/health` (el free tier de Render duerme a los ~15 min de inactividad)
- **Migraciones**: se aplican manualmente con `npx prisma migrate deploy` contra Neon (nunca en el start command, eso rompía el Hito 7)

## Notas de arquitectura descartada

Durante el Hito 7 se consideraron opciones que quedaron descartadas y cuyo código
se eliminó del repo en la limpieza de 2026-08-01:

- **API serverless en Vercel** (`api/index.js` con `serverless-http`): descartada, la API corre en Render como Web Service
- **Railway** (`railway.json`): descartado por límites del free tier
- **Supabase** (`supabase-migrate.sh`): descartado por incompatibilidad IPv4/IPv6 con Render free; se usa Neon
- **App móvil** (`mobile/`, Dockerfile.mobile): eliminada, la visión actual es solo gestión de stock web
