# ADR-001: Arquitectura Multi-Tenant con Feature Flags por Cliente

**Estado:** Aceptado  
**Fecha:** 2026-07-15  
**Decisor:** Jorge Adán Rodríguez

---

## Contexto

CleanStock es un SaaS B2B de trazabilidad de stock para empresas de limpieza con centros descentralizados. Cada cliente (empresa de limpieza) tiene múltiples centros (colegios, oficinas, hospitales) y necesita:

1. Que sus datos estén **aislados** de otros clientes
2. Activar/desactivar funcionalidades según su plan (recuento físico, alertas, informes)

---

## Alternativas Evaluadas

| Alternativa | Descripción | Problemas |
|------------|-------------|-----------|
| **Esquema por tenant** | Una BD/schema por cliente | Migraciones multiplicadas por N clientes. Imposible de mantener con +10 clientes |
| **RLS por tenant** | Misma BD, filas aisladas por `client_id` | Más complejo al inicio, pero escalable. Elegida |
| **App por cliente** | Instancia separada por cliente | Coste de infraestructura × N. Inviable para SaaS |

---

## Decisión

Se adopta **shared-schema con `client_id` en todas las tablas** y middleware en Express que inyecta el contexto del cliente en cada request.

**Razones:**
- Una sola base de datos, una sola migración
- Escalable a cientos de clientes sin cambiar infraestructura
- El aislamiento se enforce en cada query (el middleware filtra por `client_id`)
- Feature flags por cliente via `client.features` (JSON) en la tabla `clients`

**Consecuencias:**
- Positivas: despliegue simple, coste de infraestructura fijo, feature flags dinámicos
- Negativas: cada query DEBE incluir `client_id` (error humano puede filtrar datos entre clientes)

---

## Feature Flags

Cada cliente tiene un campo `features` (JSON) que activa/desactiva funcionalidades:

```json
{
  "recuento_fisico": true,
  "alertas_stock": false,
  "informes_avanzados": false,
  "multi_idioma": true
}
```

Las features se verifican en el middleware y en el frontend. No requieren deploy para activarse.

---

## Alternativa Rechazada: App para Limpiadores

**Problema original:** Se diseñó una app para que los limpiadores registraran consumo en tiempo real.

**Por qué se descartó:** Fricción de usabilidad en operarios de limpieza — no pueden perder tiempo en una app. El modelo de negocio cambió a que el **responsable de centro** haga recuento físico periódico desde una app móvil, y el **supervisor** gestione desde el dashboard web.

**Lección:** No asumir que el usuario final adoptará tecnología. Validar con el cliente real antes de construir.
