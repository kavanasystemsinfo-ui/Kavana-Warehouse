# CleanStock

**SaaS de control de inventario para empresas de limpieza**

CleanStock permite a supervisores ver quién ha cogido qué, dónde y cuándo, con alertas de stock mínimo. Los operarios consumen productos desde su móvil con un solo clic.

---

## 🚀 Demo

| Sitio | URL |
|-------|-----|
| 🌐 Landing | `https://cleanstock.kavanasystems.com/welcome/` |
| 📝 Registro (30 días gratis) | `https://cleanstock.kavanasystems.com/registro/` |
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
│   ├── app.js              # API Express (todo en un archivo)
│   ├── server.js           # Entry point
│   └── __tests__/
│       └── api.test.js     # 17 tests de integración
├── prisma/
│   ├── schema.prisma       # Modelo de datos
│   └── seed.js             # Datos de ejemplo
├── dashboard/              # Panel supervisor (React)
├── mobile/                 # App operario (React + Capacitor)
├── landing/                # Página de aterrizaje (HTML)
├── docker-compose.yml      # Infraestructura completa
├── Dockerfile.api          # Build de la API
└── jest.config.js          # Configuración de tests
```

---

## 🚀 Despliegue (VPS)

```bash
git clone git@github.com:kavanasystemsinfo-ui/clean-stock.git
cd clean-stock
cp .env.example .env
# Editar .env con credenciales reales
docker compose up -d
# Configurar nginx + SSL (certbot)
```

### Variables de entorno

```env
DATABASE_URL=postgresql://kavana:***@db:5432/kavana_cleanstock
JWT_SECRET=tu...tock <kavanasystems.info@gmail.com>
```

---

## 📚 API

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Login (email o username) |
| `POST` | `/api/v1/auth/register-empresa` | Registro empresa + email credenciales |

### Dashboard (supervisor)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/dashboard` | Stats generales |
| `GET` | `/api/v1/dashboard/consumption` | Consumos con filtros |
| `GET` | `/api/v1/dashboard/alerts` | Alertas de stock crítico/bajo |

### CRUD (supervisor)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/v1/categorias` | Categorías |
| `GET/POST` | `/api/v1/productos` | Productos |
| `GET/POST` | `/api/v1/centros` | Centros de trabajo |
| `GET/POST` | `/api/v1/empleados` | Empleados |
| `GET/POST` | `/api/v1/inventario` | Stock por centro |
| `POST` | `/api/v1/inventario/reponer` | Reponer producto |
| `GET/POST` | `/api/v1/consumos` | Historial de consumos |
| `GET/POST` | `/api/v1/incidencias` | Incidencias |

### App operario
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/asignaciones/active` | Centro activo del empleado |
| `GET` | `/api/v1/stock/inventory?centro=X` | Inventario del centro |
| `POST` | `/api/v1/stock/consume` | Consumir producto |
| `POST` | `/api/v1/incidencias` | Reportar incidencia |

### Admin (super admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/admin/clientes` | Listar empresas |
| `GET/PUT` | `/api/v1/admin/clientes/:id` | Detalle/editar cliente |
| `GET` | `/api/v1/admin/stats` | Estadísticas SaaS |

### Health
| Método | Ruta |
|--------|------|
| `GET` | `/api/v1/health` |

---

## 🧪 Tests (TDD)

17 tests de integración que verifican todos los endpoints críticos:

```bash
npm test
# 17 passed, 17 total
```

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

## ⚠️ Notas técnicas

- **Supervisor:** login con email, menú: Dashboard, Empleados, Centros, Inventario, Incidencias
- **Operario:** login con email, ve su centro asignado, consume productos, reporta incidencias
- **Admin:** `https://cleanstock.kavanasystems.com/admin/` usuario `jorge`
- **Email:** usa Gmail App Password (verificación 2 pasos → App Passwords)
- **Registro:** crea empresa + centro + usuario supervisor + trial 30d + email credenciales

---

## 🆘 Soporte

kavanasystems.info@gmail.com