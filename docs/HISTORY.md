# 📜 Historia del Proyecto — CleanStock

*Evolución, decisiones y aprendizajes desde la idea hasta la producción.*

---

## Fase 0: Concepción (Abril — Junio 2026)

**Problema:** Empresas de limpieza con centros descentralizados (colegios, oficinas, hospitales) pierden dinero porque no saben qué producto se consume en cada centro, ni si el consumo se ajusta a lo presupuestado.

**Idea inicial:** App para que los limpiadores registraran el consumo de productos en tiempo real.

**Stack elegido:** Node.js + Express + PostgreSQL + React + Vite

---

## Fase 1: MVP Funcional (Junio 2026)

**Objetivo:** Tener un SaaS funcionando con login, dashboard y registro básico.

**Decisiones:**
- Express (sin framework adicional) por simplicidad del dominio
- Prisma ORM para tipado seguro de BD
- JWT + bcrypt para autenticación
- PostgreSQL con schema compartido + `client_id` para multi-tenancy

**Resultado:**
- ✅ Backend con Express + Prisma
- ✅ Frontend dashboard con React + Vite
- ✅ Autenticación multi-tenant
- ✅ CI/CD con GitHub Actions
- ✅ 26 tests de integración con Jest + Supertest

---

## Fase 2: Pivote del Modelo de Negocio (Julio 2026)

**Problema detectado:** Los limpiadores no pueden usar una app en su trabajo diario — demasiada fricción.

**Decisión:** Descartar la app del limpiador. Rediseñar el flujo:

- **Responsable de centro** (personal de confianza del cliente) → app móvil para recuento físico periódico
- **Supervisor** → dashboard web con control total
- **Limpíadores** → no usan ninguna app

**Resultado:**
- ✅ App móvil para recuento físico (React Native / web mobile)
- ✅ Dashboard con tabla de recuentos por centro
- ✅ Gestión de responsables de centro
- ✅ Feature flags por cliente (JSON en tabla clients)

**Lo descartado:**
- App nativa para limpiadores (fricción de usabilidad)
- Registro en tiempo real por operario (no viable)

---

## Fase 3: Producción y Despliegue (Julio 2026)

**Objetivo:** Poner el producto accesible online con dominio propio.

**Decisiones:**
- VPS Hetzner (2 vCPU, 3.7 GB RAM) con Docker Compose
- nginx + Let's Encrypt para HTTPS
- `.kavanasystems.com` como dominio principal

**Resultado:**
- ✅ **Live:** `https://cleanstock.kavanasystems.com`
- ✅ Landing + registro + dashboard + admin
- ✅ Docker Compose completo (BD + backend + frontend)
- ✅ Railway.json (preparado para migración futura a serverless)

---

## Resumen de Evolución

```
Abr 2026  │  Concepción: idea, investigación de mercado
Jun 2026  │  F1: MVP funcional (Express, Prisma, React, auth, CI/CD)
Jul W2    │  F2: Pivote modelo negocio (recuento físico, feature flags)
Jul W3    │  F3: Producción (VPS, Docker, dominio, landing)
```

---

## Decisiones Descartadas

| Decisión descartada | Por qué no se hizo | Lección |
|--------------------|-------------------|---------|
| **App para limpiadores** | Fricción de usabilidad en operarios | Validar UX con usuario real antes de construir |
| **Schema-per-tenant** | Migraciones inviables con N clientes | Shared-schema + client_id es suficiente para este dominio |
| **Serverless desde el inicio** | Más coste y complejidad que VPS para MVP | VPS es correcto para fase inicial; migrar cuando escale |
| **Tiempo real (WebSockets)** | No necesario para el modelo de negocio actual | REST es suficiente; WebSockets se añaden si hay demanda |

---

*Cada fase documentada con su justificación. Cada decisión descartada, también.*

*Última actualización: 2026-07-23*
