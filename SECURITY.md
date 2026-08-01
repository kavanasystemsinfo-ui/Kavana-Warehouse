# Seguridad — KAVANA WAREHOUSE

## Gestión de Secretos

No hay contraseñas, tokens ni claves en el repositorio. Todas las credenciales se configuran mediante variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`). Ver `.env.example`.

## Autenticación y Autorización

- **JWT** con firma HMAC + bcrypt para hash de contraseñas (expira en 2h, configurable con `JWT_EXPIRES_IN`)
- **Roles:** `oficina` (gestión total) · `supervisor` (recuento de inventario, lo crea la oficina)
  - El rol `limpiador` existe en el modelo de datos solo para trazabilidad de la plantilla en la demo simulada; no tiene acceso a ninguna app
- Login por **usuario o email**, tolerante a mayúsculas y espacios (teclados móviles)
- Validación de entrada centralizada con **Zod**
- Middleware de autenticación en todas las rutas protegidas

## Multi-Tenancy

- **Schema compartido** con `client_id` en todas las tablas
- Middleware que inyecta el contexto del cliente en cada request
- Cada query filtra por `client_id` — el cliente solo ve sus datos (verificado con tests de aislamiento)

## Supervisores demo (reclutadores)

- Los supervisores que crea la oficina se guardan con `session_id` (etiqueta única del navegador) y `expira_en` (24h)
- Un cron diario borra los expirados: cada visitante de la demo queda aislado y sus datos no persisten

## API

- CORS con whitelist desde `CORS_ORIGIN`
- HTTPS forzado en producción (via proxy)
- Mensajes de error genéricos (sin fugas de `e.message`)

## Dependencias

- Dependencias auditadas (`npm audit`)
- Prisma ORM tipado (eliminado `$queryRawUnsafe`, evita inyección SQL)
- Zod para validación de entrada

---

**Para reportar una vulnerabilidad:** abre un issue en GitHub con el tag `security`.
