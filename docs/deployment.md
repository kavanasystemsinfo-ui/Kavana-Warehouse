# Deployment Guide — Kavana CleanStock

> **Target:** DevOps, IT Operations
> **Version:** 4.1.0 (actualizado 2026-07-16, post-rediseño de visión de negocio)
> **Last Updated:** 2026-07-16

---

## Arquitectura Actual

```
                    cleanstock.kavanasystems.com
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

> **Nota de alcance (2026-07-16):** El proyecto **no tiene app móvil del limpiador**.
> El registro de consumos lo hace el **supervisor o personal de control** desde el dashboard
> web (responsive, accesible desde el móvil del encargado). La carpeta `mobile/` existe
> en el repo pero **no se despliega** (es código legacy del enfoque anterior).

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

El virtual host para `cleanstock.kavanasystems.com` está en `/etc/nginx/sites-available/cleanstock`:

```nginx
server {
    listen 443 ssl;
    server_name cleanstock.kavanasystems.com;

    ssl_certificate /etc/letsencrypt/live/cleanstock.kavanasystems.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cleanstock.kavanasystems.com/privkey.pem;

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
| `https://cleanstock.kavanasystems.com/` | Dashboard supervisor (web, responsive) | :4001 |
| `https://cleanstock.kavanasystems.com/api/v1/*` | API REST | :3000 |

> No hay ruta `/empleado/` en producción. El registro de consumos se hace desde el dashboard.

## Mantenimiento

### Renovar SSL

El certificado Let's Encrypt se renueva automáticamente. Para verificar:
```bash
certbot renew --dry-run
```

### Actualizar la aplicación

```bash
cd /root/clean_ops
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

| Usuario | Rol | Contraseña |
|---|---|---|
| `warehouse` | Oficina (Zaira García, gestión total) | `kavana` |

> El rol `limpiador` existe en el modelo de datos (`Usuario.rol`) para trazabilidad de
> asignación a centros, **pero no tiene credenciales de acceso a ninguna app**.

## Supervisores demo (reclutadores)

Para que cualquier visitante pruebe la app sin contaminar los datos compartidos:

- La **oficina** crea supervisores de prueba desde el dashboard (`/supervisores`)
- Cada supervisores se guarda en BD con `session_id` (etiqueta única por navegador,
  generada en `localStorage`) y `expira_en` (now + 24h)
- Un cron diario (`cleanup_warehouse_supervisores.sh`) borra los expirados
- La empresa ficticia con 3 meses de histórico (`seed-historico.js`) es la base
  que todos ven al entrar con `warehouse` / `kavana`
- **Simulación diaria** (`prisma/simulate-daily.js` + cron 06:00): cada día
  genera consumos realistas de los limpiadores, baja el stock (las alertas
  aparecen solas) y repone los lunes. La demo "vive" en el tiempo: los costes
  del mes suben solos. Idempotente (no duplica si ya se simuló hoy).

## Notas de arquitectura descartada

Durante el Hito 7 se consideraron opciones que quedaron descartadas y cuyo código
se eliminó del repo en la limpieza de 2026-08-01:

- **API serverless en Vercel** (`api/index.js` con `serverless-http`): descartada, la API corre en Render como Web Service
- **Railway** (`railway.json`): descartado por límites del free tier
- **Supabase** (`supabase-migrate.sh`): descartado por incompatibilidad IPv4/IPv6 con Render free; se usa Neon
- **App móvil** (`mobile/`, Dockerfile.mobile): eliminada, la visión actual es solo gestión de stock web
