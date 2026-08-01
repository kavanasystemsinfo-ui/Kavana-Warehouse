# Seguridad — CleanStock

## Gestión de Secretos

No hay contraseñas, tokens ni claves en el repositorio. Todas las credenciales se configuran mediante variables de entorno.

```
.env.example ← Template de todas las variables necesarias
```

## Autenticación y Autorización

- **JWT** con firma HMAC + bcrypt para hash de contraseñas
- **Roles:** `super_admin` · `client_admin` · `supervisor` · `responsable_centro`
- Validación de entrada centralizada con **Zod**
- Middleware de autenticación en todas las rutas protegidas

## Multi-Tenancy

- **Schema compartido** con `client_id` en todas las tablas
- Middleware que inyecta el contexto del cliente en cada request
- Cada query filtra por `client_id` — el cliente solo ve sus datos

## API

- CORS configurado
- HTTPS forzado (Let's Encrypt)
- Rate limiting (vía nginx)

## Dependencias

- Dependencias auditadas (`npm audit`)
- Prisma ORM tipado (evita inyección SQL)
- Zod para validación de entrada (evita ataques de inyección)

---

**Para reportar una vulnerabilidad:** abre un issue en GitHub con el tag `security`.
