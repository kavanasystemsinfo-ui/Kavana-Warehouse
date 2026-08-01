# Architecture Specification — KAVANA WAREHOUSE

> **Document Type:** Technical Architecture Specification (estado real, 2026-08-01)
> **Audience:** IT Consultants, Senior Developers, Technical Stakeholders
> **Versión actual:** 1.2 (backend monolítico, dashboard web, sin app móvil)
> **Última actualización:** 2026-08-01

---

## 1. Visión de negocio (actual)

KAVANA WAREHOUSE es un **SaaS B2B de control de stock** para empresas de limpieza con centros descentralizados (colegios, oficinas, hospitales). Permite a la **oficina** saber qué producto se consume en cada centro, cuándo baja de stock y cuánto se gasta respecto al presupuesto mensual, para **detectar mermas y sobrecostes por centro**.

**Alcance de usuario:**
- ✅ **Oficina** (`warehouse`): gestión total desde el dashboard web: centros, productos, inventario, costes, presupuestos, incidencias y creación de supervisores.
- ✅ **Supervisor**: creado por la oficina, hace **recuento físico** del stock de sus centros asignados. En la demo, los supervisores caducan a las 24h (sesión de reclutador aislada).
- ❌ **Limpiador**: no tiene acceso a ninguna app. Existe en el modelo de datos solo para trazabilidad de la plantilla que genera los movimientos simulados de la demo.

---

## 2. Arquitectura real

### Stack
| Capa | Tecnología real |
|------|---------------|
| Frontend | React 19 + Vite + TypeScript + CSS propio (sin Tailwind) |
| Backend | Node.js 20 + Express (monolítico en `src/app.js`, 44 endpoints) |
| Controladores separados | 3: `costeController`, `deviationController`, `purchaseController` |
| ORM | Prisma 6.x (@prisma/client) |
| Base de datos | PostgreSQL 16 (Neon serverless) |
| Auth | JWT (jsonwebtoken, expira 2h) + bcrypt |
| Validación | Zod (login) + manual en handlers |
| Tiempo real | No implementado (las alertas son consultas REST) |
| Infraestructura | Vercel (frontend) + Render (API) + Neon (BD) |

### Diagrama de despliegue
```
          warehouse.kavanasystems.com (Vercel)
                    │  /api/* → rewrite
                    ▼
          API Express (Render, free tier)
                    │
                    ▼
          PostgreSQL 16 (Neon, Frankfurt)
```

### Estructura real del proyecto
```
kavana-warehouse/
├── src/
│   ├── app.js              # API Express (monolítico, 44 endpoints)
│   ├── server.js           # Entry point
│   ├── lib/                # logger.js, prisma.js
│   ├── controllers/        # costeController, deviationController, purchaseController
│   ├── middleware/         # validate.js (Zod)
│   └── __tests__/          # api.test.js (35 tests)
├── prisma/
│   ├── schema.prisma       # 13 modelos
│   ├── migrations/         # 11 migraciones
│   ├── seed.js             # entrypoint → seed-demo-cunada.js
│   ├── seed-demo-cunada.js # datos demo (empresa de limpieza)
│   ├── seed-historico.js   # 3 meses de movimientos simulados
│   └── simulate-daily.js   # simulación diaria (cron 06:00)
├── dashboard/              # Panel de la oficina (React 19 + Vite + TS)
│   └── src/pages/          # 8 rutas funcionales
├── docs/                   # adr/, technical/, commercial/, deployment.md
├── docker-compose.yml      # 3 servicios: db, api, dashboard (local)
└── Dockerfile.api
```

---

## 3. Modelo de datos (Prisma schema)

| Modelo | Descripción | Relaciones clave |
|--------|------------|------------------|
| `Cliente` | Empresa cliente del SaaS | 1:N → `Usuario`, `Centro` |
| `Usuario` | `rol`: oficina \| supervisor \| limpiador | N:1 → `Cliente`; `session_id` y `expira_en` para supervisores demo |
| `Centro` | Centro de trabajo (ej. un colegio) | N:1 → `Cliente` (NOT NULL); 1:N → `InventarioCentro`, `AsignacionPersonal`, `RegistroMovimiento` |
| `Producto` | Catálogo global (lejía, papel, etc.) | N:1 → `Cliente` (opcional, catálogo público) |
| `InventarioCentro` | Stock de un producto en un centro | FK compuesta `(id_centro, id_producto)`, ON DELETE CASCADE |
| `AsignacionPersonal` | Usuario asignado a un centro (trazabilidad) | N:1 → `Usuario`, `Centro` |
| `RegistroMovimiento` | Cada consumo/entrada/recuento | N:1 → `Usuario`, `Centro`, `Producto`; ON DELETE CASCADE |
| `Incidencia` | Reporte de avería | N:1 → `Usuario`, `Centro` |
| `ReglaNotificacion` | Regla de alerta (tabla, sin CRUD) | N:1 → `Usuario` |
| `Notificacion` | Historial de alertas (tabla, sin CRUD) | N:1 → `Usuario` |
| `RefreshToken` | Token de refresco (tabla, sin wirear) | N:1 → `Usuario` |

---

## 4. Seguridad (auditoría ECC 2026-07-16)

| Capa | Implementación |
|------|---------------|
| **Multi-tenant** | Todo endpoint filtra por `id_cliente` del token JWT. Centro ajeno → 403. Verificado con tests (empresa A vs empresa B). |
| **Auth** | JWT con `id_cliente` en payload; en producción sin `JWT_SECRET` el servidor no arranca. Token expira en 2h. Login tolerante a mayúsculas/espacios. |
| **CORS** | Whitelist de orígenes desde env `CORS_ORIGIN`. |
| **SQL Injection** | Eliminado `$queryRawUnsafe`; todo vía Prisma tipado. |
| **Mass-assignment** | Whitelist de campos en POST; `id_cliente` se fuerza del token. |
| **Errores 500** | Mensajes genéricos + logger estructurado. |
| **Tests** | 35 tests, bloque SECURITY multi-tenant (403 confirmado). |

**Detalle completo:** `docs/technical/00_audit-status.md`

---

## 5. API REST (endpoints reales)

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login (usuario o email, tolerante a mayúsculas/espacios) |
| POST | `/api/v1/auth/register-empresa` | Registro empresa + trial + email credenciales |

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/dashboard` | Stats generales |
| GET | `/api/v1/dashboard/consumption` | Consumos + evolución mensual, gasto €, % presupuesto |
| GET | `/api/v1/dashboard/alerts` | Alertas de stock crítico/bajo (REST) |
| GET | `/api/v1/dashboard/deviations` | Desviación stock registrado vs físico |
| GET | `/api/v1/dashboard/costes` | Coste € por centro vs presupuesto |

### CRUD
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/v1/categorias` | Categorías de producto |
| GET/POST/PUT/DELETE | `/api/v1/productos` | Catálogo de productos |
| GET/POST/PUT | `/api/v1/centros` | Centros de trabajo |
| GET/POST | `/api/v1/empleados` | Plantilla (rol limpiador, trazabilidad demo) |
| GET/POST | `/api/v1/inventario` | Stock por centro |
| POST | `/api/v1/inventario/reponer` | Reponer producto |
| GET/POST | `/api/v1/consumos` | Historial de consumos |
| GET/POST/PUT | `/api/v1/incidencias` | Incidencias |
| GET | `/api/v1/asignaciones/active` | Centros activos de un usuario |
| GET | `/api/v1/asignaciones/users` | Responsables del cliente con sus centros |
| POST | `/api/v1/stock/consume` | Registrar consumo |
| GET | `/api/v1/stock/inventory?centro=X` | Inventario de un centro |
| GET/PUT | `/api/v1/centros/:id_centro/presupuesto` | Presupuesto mensual |
| GET | `/api/v1/purchases/proposal` | Propuesta de compra |
| POST | `/api/v1/supervisores` | Crear supervisor demo (session_id + expira 24h) |
| GET | `/api/v1/supervisores?session_id=X` | Listar supervisores de una sesión |
| POST | `/api/v1/inventario/:id_centro/:id_producto/conteo` | Recuento físico del supervisor |
| GET | `/api/v1/recuentos?centro=X` | Histórico de recuentos |
| POST | `/api/v1/demo/reset` | Reset de la demo |

### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/PUT | `/api/v1/admin/clientes` | Gestión empresas |
| GET | `/api/v1/admin/clientes/:id` | Detalle cliente |
| GET | `/api/v1/admin/stats` | Estadísticas SaaS |

### Health
| GET | `/api/v1/health` | Health check (lo usa Render y el cron antiduerme) |

---

## 6. Descartado (no implementado, código eliminado)

- **App móvil** (`mobile/`): eliminada en la limpieza de 2026-08-01. La visión es solo gestión de stock web.
- **API serverless en Vercel** (`api/index.js` con `serverless-http`): la API corre en Render.
- **Railway** (`railway.json`): descartado por límites del free tier.
- **Supabase** (`supabase-migrate.sh`): descartado por incompatibilidad IPv4/IPv6 con Render free; se usa Neon.
- **Notificaciones CRUD y tiempo real (Socket.IO)**: tablas existen, endpoints no implementados.
- **Refresh token wireado**: tabla existe, login sin refresh (JWT 2h suficiente).
- **Documentación OpenAPI/Swagger**: no implementada.
