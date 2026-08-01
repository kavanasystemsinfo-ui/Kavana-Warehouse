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

| Email | Rol | Contraseña |
|---|---|---|
| `admin@kavana.com` | Admin | CleanStock2026! |
| `supervisor@kavana.com` | Supervisor | CleanStock2026! |

> El rol `limpiador` existe en el modelo de datos (`Usuario.rol`) para trazabilidad de
> asignación a centros, **pero no tiene credenciales de acceso a ninguna app**.

## Migración futura a Serverless

Si el proyecto crece y se necesita escalar sin VPS, el código ya está preparado:

- **API**: `api/index.js` con `serverless-http` (Express → Vercel)
- **DB**: Se puede migrar a Supabase (proyecto creado, SQL de migración disponible)
- **Frontends**: Build estático Vite, desplegable en Vercel
- **Config**: `vercel.json` con rutas y build script

Ver `supabase-migrate.sh` para el procedimiento.
