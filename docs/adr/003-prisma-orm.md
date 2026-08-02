# ADR-003: Prisma ORM en vez de SQL raw

**Estado:** Aceptado
**Fecha:** 2026-07-15
**Decisor:** Jorge Adán Rodríguez

---

## Contexto

El backend de KAVANA WAREHOUSE es Node.js + Express con PostgreSQL 16. Se necesitaba
la capa de acceso a datos para un dominio con 14 modelos (Usuario, Cliente, Centro,
Producto, AsignacionPersonal, InventarioCentro, RefreshToken, RegistroMovimiento,
Incidencia, ReglaNotificacion, Notificacion, PushSubscription, Categoria) y un
aislamiento multi-tenant por `client_id` que obliga a incluir el filtro en cada query.

Restricciones reales del proyecto: un solo desarrollador, iteración rápida, y la
necesidad de que el tipado llegue hasta el frontend para que un cambio de esquema
rompa el build, no la demo.

## Alternativas Evaluadas

| Alternativa | Descripción | Problemas |
|------------|-------------|-----------|
| **SQL raw con `pg`** | Queries escritas a mano | Sin type-safety, migraciones manuales, errores de columnas solo visibles en runtime |
| **Query builder (Knex)** | SQL programático | Sigue sin dar tipos de salida ni migraciones declarativas |
| **ORM con generación de tipos (Prisma)** | Schema declarativo, cliente tipado, migraciones automáticas | Curva de aprendizaje inicial, abstracción sobre SQL. **Elegido** |

## Decisión

Se usa **Prisma ORM** como capa de persistencia.

**Razones:**
- El schema (`prisma/schema.prisma`) es la fuente de verdad del modelo de datos
- `prisma generate` produce un cliente tipado: si una columna cambia, el compilador
  del dashboard (TypeScript) lo detecta en build, no en producción
- Migraciones declarativas (`prisma migrate`) versionadas en el repo
- Operaciones atómicas útiles para el dominio: `decrement` para consumos de stock,
  `deleteMany` para limpieza de datos de sesión demo

**Consecuencias:**
- Positivas: type-safety de extremo a extremo, migraciones versionadas, menos errores
- Negativas: abstracción sobre SQL (para queries muy complejas hay que bajar a `$queryRaw`),
  y el generado de cliente debe ejecutarse en cada build (Dockerfile.api hace
  `npx prisma generate` en el stage de instalación)
