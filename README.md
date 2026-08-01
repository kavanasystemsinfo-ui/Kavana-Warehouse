# KAVANA WAREHOUSE

> **Sistema de Gestión de Almacenes (WMS) multi-tenant diseñado para organizaciones que necesitan controlar inventario, movimientos y trazabilidad entre múltiples centros y ubicaciones.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-API-lightgrey)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![Tests](https://img.shields.io/badge/Tests-26-success)
![License](https://img.shields.io/badge/License-MIT-success)

---

# Visión General

**Kavana Warehouse** es una plataforma SaaS para la gestión de almacenes, inventario y trazabilidad de stock desarrollada como parte del ecosistema **Kavana Systems**.

La aplicación permite centralizar el control de materiales distribuidos entre múltiples centros, almacenes o ubicaciones, proporcionando visibilidad en tiempo real sobre existencias, movimientos y consumo.

La demostración pública utiliza como escenario una empresa de limpieza profesional, aunque la arquitectura ha sido diseñada para adaptarse a cualquier organización que necesite gestionar inventario distribuido.

---

# Problema

En muchas organizaciones el control de inventario continúa realizándose mediante hojas de cálculo, procesos manuales o aplicaciones desconectadas.

Esto dificulta conocer:

- Stock disponible en cada centro.
- Movimientos entre almacenes.
- Consumo real de materiales.
- Necesidades de reposición.
- Historial y trazabilidad del inventario.

---

# Solución

Kavana Warehouse centraliza toda la gestión del inventario en una única plataforma mediante:

- Gestión multi-almacén.
- Inventarios físicos.
- Entradas y salidas de material.
- Transferencias entre ubicaciones.
- Dashboard operativo.
- Gestión de usuarios y permisos.
- Arquitectura multi-tenant.
- API REST.
- Despliegue mediante Docker.

---

# Arquitectura

```
          Operarios / Supervisores
                    │
                    ▼

          Aplicación Web (React)

                    │

            API REST (Express)

                    │

        JWT Authentication + RBAC

                    │

              Prisma ORM

                    │

            PostgreSQL 16

                    │

       Shared Schema + client_id
```

La plataforma implementa una arquitectura **Shared Schema Multi-Tenant**, donde todos los clientes comparten la misma base de datos manteniendo el aislamiento lógico mediante `client_id`.

---

# Stack Tecnológico

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express
- Prisma ORM

### Base de datos

- PostgreSQL 16

### Infraestructura

- Docker
- Docker Compose
- GitHub Actions
- VPS Linux

### Seguridad

- JWT Authentication
- Refresh Tokens
- Role Based Access Control (RBAC)

---

# Funcionalidades

- Gestión de productos.
- Gestión de almacenes.
- Inventarios físicos.
- Movimientos de stock.
- Transferencias entre centros.
- Gestión de usuarios.
- Roles y permisos.
- Dashboard para supervisores.
- Arquitectura multi-tenant.
- API REST.

---

# Decisiones de Ingeniería

| Decisión | Solución adoptada | Motivo |
|----------|-------------------|--------|
| Multi-tenancy | Shared Schema + `client_id` | Simplicidad y escalabilidad |
| ORM | Prisma | Productividad y tipado |
| Backend | Express | Ligero y suficiente para el dominio |
| Autenticación | JWT | Arquitectura stateless |
| Infraestructura | Docker | Entornos reproducibles |

Las decisiones de arquitectura completas están documentadas mediante ADRs en:

```
docs/adr/
```

---

# Estado del Proyecto

| Funcionalidad | Estado |
|--------------|:------:|
| Multi-tenant | ✅ |
| Gestión de almacenes | ✅ |
| Inventarios | ✅ |
| Dashboard | ✅ |
| Roles y permisos | ✅ |
| Docker | ✅ |
| CI/CD | ✅ |
| Tests automatizados | ✅ |
| Informes exportables | 🚧 |
| Aplicación móvil dedicada | 🚧 |

---

# Documentación

| Documento | Descripción |
|-----------|-------------|
| `docs/adr/` | Architecture Decision Records |
| `docs/commercial/` | Documentación funcional |
| `docs/technical/` | Documentación técnica |
| `docs/HISTORY.md` | Historial del proyecto |
| `docs/METRICS.md` | Métricas de calidad |
| `docs/SECURITY.md` | Consideraciones de seguridad |

---

# Ejecución Local

```bash
cp .env.example .env

docker compose up -d

npm install

npm test
```

---

# Demo

🌐 **Landing**

https://warehouse.kavanasystems.com

🖥️ **Aplicación**

https://warehouse.kavanasystems.com/app

---

# Roadmap

Próximas líneas de evolución:

- Informes exportables.
- Códigos QR.
- Lectura de códigos de barras.
- Sincronización offline.
- Aplicación móvil dedicada.
- Predicción de consumo mediante IA.

---

# Ecosistema Kavana Systems

Este proyecto forma parte del ecosistema **Kavana Systems**, una colección de aplicaciones empresariales desarrolladas siguiendo el **Kavana Engineering Standard (KES)**.

- Manufacturing (MES)
- Warehouse (WMS)
- RouteFleet (Fleet Management)

Todos los proyectos comparten la misma filosofía de arquitectura, documentación y calidad de ingeniería.

---

# Aviso

Este proyecto forma parte de mi portfolio profesional y tiene como objetivo demostrar conocimientos de arquitectura de software, desarrollo full stack y construcción de aplicaciones SaaS siguiendo prácticas modernas de ingeniería.

No representa un producto comercial implantado en clientes reales.

---

# Autor

Desarrollado por **Jorge Adán Rodríguez**

**Founder · Kavana Systems**

Software Architect · Full Stack Developer · AI Product Engineer

🌐 https://www.kavanasystems.com
