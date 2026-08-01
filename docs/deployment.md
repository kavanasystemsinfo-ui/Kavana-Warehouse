# Deployment Guide — Kavana CleanStock

> **Target:** DevOps, IT Operations
> **Version:** 4.0.0
> **Last Updated:** 2026-07-11

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
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌────────────┐  ┌────────────┐  ┌──────────────┐
    │ Dashboard  │  │   Mobile   │  │  API Express │
    │ :4001      │  │ :4000      │  │ :3000        │
    │ React SPA  │  │ PWA React  │  │ + Prisma     │
    │ (Docker)   │  │ (Docker)   │  │ (Docker)     │
    └────────────┘  └────────────┘  └──────┬───────┘
                                           │
                                           ▼
                                    ┌────────────┐
                                    │ PostgreSQL │
                                    │ :5432      │
                                    │ (Docker)   │
                                    └────────────┘
```

| Componente | Plataforma | Coste |
|---|---|---|
| Servidor | Hetzner VPS (2 cores, 3.7 GB) | ~4€/mes |
| Base de datos | PostgreSQL 16 (Docker) | Incluido |
| Backend API | Express + Prisma (Docker) | Incluido |
| Frontends | nginx reverse proxy | Incluido |
| SSL | Let's Encrypt (certbot) | Gratis |
| APK Android | Capacitor (build local) | Gratis |
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
    location /empleado/ {
        proxy_pass http://127.0.0.1:4000/;
    }
    location / {
        proxy_pass http://127.0.0.1:4001;
    }
}
```

## Rutas de la aplicación

| Ruta | Servicio interno | Puerto |
|---|---|---|
| `https://cleanstock.kavanasystems.com/` | Dashboard supervisor | :4001 |
| `https://cleanstock.kavanasystems.com/empleado/` | App móvil limpiador | :4000 |
| `https://cleanstock.kavanasystems.com/api/v1/*` | API REST | :3000 |

## APK Android (Capacitor)

La app móvil tiene Capacitor configurado para generar un APK. El APK carga `https://cleanstock.kavanasystems.com/empleado` en una WebView nativa.

**Para generar el APK desde Android Studio:**

1. Clonar el repo: `git clone https://github.com/kavanasystemsinfo-ui/clean-stock.git`
2. Android Studio → File → Open → `clean-stock/mobile/android/`
3. Build → Build APK
4. APK en `android/app/build/outputs/apk/debug/app-debug.apk`

No es necesario reinstalar el APK tras cambios en la web — la app siempre carga el contenido actualizado del servidor.

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
| `empleado@kavana.com` | Limpiador | CleanStock2026! |

## Migración futura a Serverless

Si el proyecto crece y se necesita escalar sin VPS, el código ya está preparado:

- **API**: `api/index.js` con `serverless-http` (Express → Vercel)
- **DB**: Se puede migrar a Supabase (proyecto creado, SQL de migración disponible)
- **Frontends**: Build estático Vite, desplegable en Vercel
- **Config**: `vercel.json` con rutas y build script

Ver `supabase-migrate.sh` para el procedimiento.
