# CleanStock

**SaaS de control de inventario para empresas de limpieza**

CleanStock permite a supervisores y operarios gestionar productos, inventarios y consumos desde cualquier dispositivo. Registro con 30 días de prueba gratuita y email automático de bienvenida con credenciales.

---

## 🚀 Demo

| Sitio | URL |
|-------|-----|
| 🌐 Landing página | `https://cleanstock.kavanasystems.com/welcome/` |
| 📝 Registro | `https://cleanstock.kavanasystems.com/registro/` |
| 📊 Panel supervisor | `https://cleanstock.kavanasystems.com/` |
| 📱 App operario | `https://cleanstock.kavanasystems.com/empleado/` |
| 🔧 Admin panel | `https://cleanstock.kavanasystems.com/admin/` |
| 💚 Health | `https://cleanstock.kavanasystems.com/api/v1/health` |

---

## 🛠️ Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | React + Vite + TailwindCSS |
| **Backend** | Node.js + Express + Prisma ORM |
| **Database** | PostgreSQL 16 (Docker) |
| **Auth** | JWT + bcrypt |
| **Email** | Nodemailer + Gmail SMTP |
| **Infra** | Docker Compose + nginx + Let's Encrypt |
| **Hosting** | VPS Hetzner (2 vCPU, 3.7 GB RAM) |

---

## 📁 Estructura

```
clean-stock/
├── src/
│   └── app.js              # API Express (toda la lógica)
├── prisma/
│   ├── schema.prisma       # Modelo de datos
│   └── seed.js             # Seed de ejemplo
├── dashboard/              # Panel supervisor (React)
├── mobile/                 # App operario (React + Capacitor)
├── landing/                # Página de aterrizaje (HTML estático)
├── api/index.js            # Entry Vercel (opcional)
├── docker-compose.yml      # Infraestructura completa
├── Dockerfile.api          # Build de la API
├── nginx/                  # Configuración nginx
└── supabase_init.sql       # Esquema para migración futura
```

---

## 🚀 Despliegue (VPS)

### Requisitos
- Docker + Docker Compose
- Dominio apuntando al VPS (A record)
- Puerto 80/443 abierto

### Pasos

```bash
git clone git@github.com:kavanasystemsinfo-ui/clean-stock.git
cd clean-stock
cp .env.example .env
# Editar .env con tus credenciales reales
docker compose up -d
# Configurar nginx + SSL (certbot)
```

### Variables de entorno

```env
DATABASE_URL=postgresql://kavana:pass@db:5432/kavana_cleanstock
JWT_SECRET=tu-secret-seguro
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kavanasystems.info@gmail.com
SMTP_PASS=app-password-gmail
SMTP_FROM=CleanStock <kavanasystems.info@gmail.com>
```

---

## 📚 API

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Login (email o username) |
| `POST` | `/api/v1/auth/register-empresa` | Registro + email bienvenida |

### Recursos (requieren auth)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/dashboard` | Stats (productos, centros, empleados) |
| `GET` | `/api/v1/categorias` | Categorías |
| `GET` | `/api/v1/productos` | Productos (filtro search, categoria) |
| `POST` | `/api/v1/productos` | Crear producto |
| `GET` | `/api/v1/centros` | Centros |
| `POST` | `/api/v1/centros` | Crear centro |
| `GET` | `/api/v1/empleados` | Empleados |
| `POST` | `/api/v1/empleados` | Crear empleado |
| `GET` | `/api/v1/inventario` | Stock por centro |
| `POST` | `/api/v1/inventario` | Ajustar stock |
| `POST` | `/api/v1/inventario/reponer` | Reponer producto |
| `GET` | `/api/v1/consumos` | Historial consumos |
| `POST` | `/api/v1/consumos` | Registrar consumo |
| `GET` | `/api/v1/incidencias` | Incidencias |
| `POST` | `/api/v1/incidencias` | Crear incidencia |

### Admin (super admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/admin/clientes` | Listar empresas |
| `GET` | `/api/v1/admin/clientes/:id` | Detalle cliente |
| `PUT` | `/api/v1/admin/clientes/:id` | Actualizar plan/estado |
| `GET` | `/api/v1/admin/stats` | Estadísticas SaaS |

---

## 💰 Planes

| Característica | Basic (9€/mes) | Pro (29€/mes) |
|----------------|----------------|----------------|
| Empleados | 5 usuarios | Ilimitados |
| Centros | 3 centros | Ilimitados |
| Historial | 60 días | Ilimitado |
| Exportar datos | ❌ | ✅ |
| Notificaciones | ❌ | ✅ |

---

## 📱 APK Android

```bash
cd mobile
npx cap sync android
# Abrir mobile/android/ en Android Studio
# Build > Generate Signed Bundle/APK
```

---

## ⚠️ Notas técnicas

- **Auth:** login por email (clientes) o username (admin `jorge`)
- **Email:** Gmail App Password - activar verificación 2 pasos → App Passwords
- **Admin:** `https://cleanstock.kavanasystems.com/admin/` usuario `jorge`
- **Registro:** crea empresa + centro principal + usuario supervisor + trial 30 días

---

## 🆘 Soporte

kavanasystems.info@gmail.com