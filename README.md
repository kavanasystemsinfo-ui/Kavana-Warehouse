# CleanStock

**SaaS de trazabilidad de consumo para encargados de limpieza con centros descentralizados**

CleanStock permite a supervisores y personal de control ver qué producto se ha consumido, dónde y cuándo, con alertas de stock mínimo y desviaciones por centro. **El consumo lo registra el supervisor o personal adecuado** (desde el panel web, también accesible desde móvil) — los limpiadores **no usan ninguna app**.

---

## 🚀 Demo

| Sitio | URL |
|-------|-----|
| 🌐 Landing | `https://cleanstock.kavanasystems.com/welcome/` |
| 📝 Registro (30 días gratis) | `https://cleanstock.kavanasystems.com/registro/` |
| 📊 Panel supervisor | `https://cleanstock.kavanasystems.com/` |
| 🔧 Admin panel | `https://cleanstock.kavanasystems.com/admin/` |
| 💚 Health | `https://cleanstock.kavanasystems.com/api/v1/health` |

> **Nota de alcance:** No hay app móvil del limpiador. El registro de consumos se hace desde el panel del supervisor (responsive, usable desde el móvil del encargado). Ver `docs/REUNION_DIRECTIVA_2026-07-15.md` para el rediseño de visión de negocio.

---

## 🛠️ Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | React + Vite + TypeScript + Socket.io (dashboard supervisor) |
| **Backend** | Node.js + Express + Prisma ORM |
| **Database** | PostgreSQL 16 (Docker) |
| **Auth** | JWT + bcrypt + Zod (validación centralizada) |
| **Email** | Nodemailer + Gmail SMTP |
| **Infra** | Docker Compose + nginx + Let's Encrypt |
| **Hosting** | VPS Hetzner (2 vCPU, 3.7 GB RAM) |
| **CI/CD** | GitHub Actions (tests + Postgres en cada push) |
| **Tests** | Jest + Supertest (26 tests de integración) |

---

## 📁 Estructura

```
clean-stock/
├── src/
│   ├── app.js              # API Express (todo en un archivo, 38 endpoints)
│   ├── server.js           # Entry point
│   ├── lib/logger.js       # Logger estructurado
│   ├── controllers/        # costeController, deviationController, purchaseController
│   └── __tests__/
│       └── api.test.js     # 26 tests de integración
├── prisma/
│   ├── schema.prisma       # Modelo de datos (10 modelos)
│   └── seed.js             # Datos de ejemplo
├── dashboard/              # Panel supervisor (React + Vite + TS)
├── mobile/                 # App legacy (no usada en producción — ver nota de alcance)
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
JWT_SECRET=*** <kavanasystems.info@gmail.com>
```

---

## 📚 API

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Login (email o username) |
| `POST` | `/api/v1/auth/register-empresa` | Registro empresa + email credenciales |

### Demo
| Email | Contraseña | Rol |
|-------|-----------|-----|
| `supervisor.demo@cleanstock.com` | `demo1234` | Supervisor (Zaira García, client `Limpiezas Valencia Centro`) |
| `admin@kavana.com` | `CleanStock2026!` | Admin del sistema |
| `supervisor@kavana.com` | `CleanStock2026!` | Supervisor general |

### Dashboard (supervisor)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/dashboard` | Stats generales |
| `GET` | `/api/v1/dashboard/consumption` | Consumos con filtros |
| `GET` | `/api/v1/dashboard/alerts` | Alertas de stock crítico/bajo |
| `GET` | `/api/v1/dashboard/deviations` | Desviación stock registrado vs físico |
| `GET` | `/api/v1/dashboard/costes` | Coste € por centro vs presupuesto |

### CRUD (supervisor)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/v1/categorias` | Categorías |
| `GET/POST` | `/api/v1/productos` | Productos |
| `GET/POST` | `/api/v1/centros` | Centros de trabajo |
| `GET/POST` | `/api/v1/empleados` | Empleados |
| `GET/POST` | `/api/v1/inventario` | Stock por centro |
| `POST` | `/api/v1/inventario/reponer` | Reponer producto |
| `GET/POST` | `/api/v1/consumos` | Historial de consumos (registrado por supervisor) |
| `GET/POST` | `/api/v1/incidencias` | Incidencias |

### Registro de consumo (desde el panel del supervisor)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/stock/inventory?centro=X` | Inventario del centro |
| `POST` | `/api/v1/stock/consume` | Registrar consumo (panel del supervisor) |

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

26 tests de integración (Jest) que verifican auth, CRUD, scoping multi-tenant y escritura:

```bash
npm test
# 26 passed, 26 total
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

- **Supervisor:** login con email, menú: Dashboard, Empleados, Centros, Inventario, Incidencias, Desviaciones, Costes. Registra consumos y repone stock.
- **Empleado (limpiador):** figura en el modelo de datos (`Usuario.rol='limpiador'`, `AsignacionPersonal`) para trazabilidad de quién está asignado a qué centro, **pero no usa ninguna app** — su consumo lo registra el supervisor.
- **Admin:** `https://cleanstock.kavanasystems.com/admin/` usuario `jorge`
- **Email:** usa Gmail App Password (verificación 2 pasos → App Passwords)
- **Registro:** crea empresa + centro + usuario supervisor + trial 30d + email credenciales

---

## 🆘 Soporte

kavanasystems.info@gmail.com
