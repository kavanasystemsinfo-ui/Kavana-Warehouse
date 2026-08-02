# ADR-002: Autenticación JWT con Refresh Tokens (en vez de sesiones en servidor)

**Estado:** Aceptado
**Fecha:** 2026-07-15
**Decisor:** Jorge Adán Rodríguez

---

## Contexto

El dashboard de KAVANA WAREHOUSE lo usan la oficina y los supervisores desde navegadores
de escritorio y móvil. El acceso se identifica por **nombre de usuario** (no email),
y los supervisores demo de reclutadores expiran a las 24h. Se necesitaba un esquema de
autenticación que:

1. Funcionara sin estado en servidor (la API corre en Render free, sin sesiones persistentes)
2. Permitiera cerrar sesión de forma natural al expirar (el supervisor deja el panel abierto de un día para otro)
3. No obligara a reintroducir credenciales cada pocos minutos

## Alternativas Evaluadas

| Alternativa | Descripción | Problemas |
|------------|-------------|-----------|
| **Sesiones con cookie** | Estado en servidor, cookie HttpOnly | Render free reinicia la instancia y pierde las sesiones en memoria. Estado compartido entre instancias requiere Redis (coste) |
| **JWT de larga duración** | Un solo token que dura días | Si se filtra, vale durante días. Sin forma de invalidarlo a nivel de servidor |
| **JWT corto + refresh token** | Access token 2h + refresh token persistido en BD con rotación | Más piezas, pero permite invalidar sesiones y renovar sin pedir login. **Elegida** |

## Decisión

Doble token:

- **Access token JWT** (`expiresIn: 2h` por defecto, configurable vía `JWT_EXPIRES_IN`):
  `{ id_usuario, email, rol, is_super_admin, id_cliente }` firmado con `JWT_SECRET`.
- **Refresh token** persistido en la tabla `RefreshToken` (Prisma) con caducidad de
  `REFRESH_TOKEN_EXPIRY_DAYS` (30 por defecto en Docker Compose).

**Razones:**
- La API queda stateless para las peticiones normales (el middleware solo verifica el JWT)
- El refresh token permite rotar la sesión sin obligar al usuario a loguearse cada 2h
- El cliente de API intercepta globalmente los 401: si no hay refresh o falla, limpia
  credenciales, muestra "Su sesión ha expirado" y devuelve al Login (decisión 5 de
  `docs/DECISIONES_ESTRATEGICAS.md`)
- En producción se aborta el arranque si no existe `JWT_SECRET` (fail closed)

**Consecuencias:**
- Positivas: escalable horizontalmente, sesiones revocables vía refresh, sin dependencia de Redis
- Negativas: más piezas que gestionar (dos tokens, rotación), la tabla RefreshToken
  necesita limpieza periódica de tokens vencidos
