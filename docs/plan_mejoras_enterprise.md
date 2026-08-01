# Plan de Implementación: Mejoras Enterprise — CleanStock

> **Estado:** Parcialmente implementado (actualizado 2026-07-16 con datos reales del código en producción)
> **⚠️ Versión anterior marcaba todo como ✅ IMPLEMENTADO. Esta versión refleja lo que realmente existe.**
> Los módulos A (Costes), B (Desviaciones), C (Incidencias backend) y D (Compras) están en producción.
> El módulo E (Notificaciones) y las conexiones en tiempo real son planificados.

---

## Módulo A: Costes, Presupuestos y Traducción Financiera ✅ IMPLEMENTADO

Permite asignar presupuestos en euros por centro y valorar económicamente el consumo de stock.

1. **Base de Datos (Prisma)** ✅:
   - `Producto.coste_unitario` (Float) — añadido en schema
   - `Centro.presupuesto_mensual` (Float) — añadido en schema
2. **Endpoints Backend** ✅:
   - `GET /api/v1/dashboard/costes` — implementado en `src/controllers/costeController.js`
   - Incluye coste unitario, presupuesto mensual, gasto total €, porcentaje consumido
3. **Frontend Dashboard** ✅:
   - Página `/costes` con tabla de gasto por centro y barra de presupuesto

---

## Módulo B: Consumo Teórico vs. Consumo Real (Desviación) ✅ IMPLEMENTADO

Compara el stock registrado (`cantidad_actual`) contra el stock físico real tras conteo del supervisor.
Permite alertar cuando se detecta material faltante (merma).

1. **Base de Datos (Prisma)** ✅:
   - `InventarioCentro.stock_fisico` (campo nullable para los conteos físicos)
2. **Endpoints Backend** ✅:
   - `GET /api/v1/dashboard/deviations` — implementado en `src/controllers/deviationController.js`
   - Filtros por centro y mes, cálculo de desviación, porcentaje y coste
3. **Frontend Dashboard** ✅:
   - Página `/desviaciones` con tabla comparativa y filtros

> **Nota técnica:** El modelo `ConsumoTeorico` fue **eliminado** en la auditoría ECC (M15, julio 2026)
> por ser tabla muerta (no se usaba en ningún endpoint). Las desviaciones se calculan comparando
> `cantidad_actual` (stock registrado) vs `stock_fisico` (conteo real), no contra tabla teórica.

---

## Módulo C: Reporte de Incidencias en la Instalación ✅ BACKEND IMPLEMENTADO / ⏳ FRONTEND MÓVIL PENDIENTE

Los **supervisores o personal de control** reportan averías (fontanería, electricidad, etc.) y les dan seguimiento desde el dashboard.

1. **Base de Datos (Prisma)** ✅:
   - Modelo `Incidencia` con categorías: `limpieza`, `fontaneria`, `electricidad`, `cerrajeria`, `otros`
2. **Endpoints Backend** (implementados en `src/app.js`, no en controlador separado) ✅:
   - `POST /api/v1/incidencias` — creación con validación de centro activo
   - `GET /api/v1/incidencias` — listado con filtros por centro/estado/categoría
   - `PUT /api/v1/incidencias/:id` — actualización de estado (pendiente→en_proceso→resuelta)
3. **Frontend Supervisor** ✅:
   - Página `/incidents` con bandeja de seguimiento y cambio de estado
4. **Frontend (registro de consumo)** ✅ En el dashboard del supervisor:
   - El supervisor registra el consumo y reporta incidencias desde el panel web (responsive).
   - No hay app móvil del limpiador (rediseño 2026-07-16: el limpiador no usa ninguna app).

---

## Módulo D: Propuestas de Pedidos de Compra Automatizados ✅ IMPLEMENTADO

Genera una propuesta de pedido basada en el stock mínimo por centro.

1. **Endpoints Backend** ✅:
   - `GET /api/v1/purchases/proposal` — implementado en `src/controllers/purchaseController.js`
   - Analiza inventario, calcula déficit (`stock_minimo - cantidad_actual`), redondea a múltiplo de 5, estima coste total
2. **Frontend Dashboard** ⏳ **Pendiente**:
   - Pendiente de añadir botón "Generar Propuesta de Pedido" en la sección de Inventario

---

## Módulo E: Notificaciones y Tiempo Real ⏳ PLANIFICADO (NO implementado)

**Las tablas existen en la BD pero NO hay endpoints CRUD ni frontend enrutado.**
Se intentó implementar pero la página de Notificaciones no está enrutada en el dashboard.

1. **Base de Datos (Prisma)** ✅ (solo tablas):
   - `ReglaNotificacion` — configuración de alertas por centro/usuario/producto
   - `Notificacion` — historial de notificaciones
2. **Endpoints Backend** ❌ **No implementados**:
   - No existe `GET /api/v1/notifications` ni `PUT /api/v1/notifications/:id/read`
   - No existe CRUD de reglas de notificación
   - El endpoint `POST /api/v1/stock/consume` **no** genera notificaciones automáticas
3. **Socket.IO / Tiempo real** ❌ **No implementado**:
   - No hay servidor Socket.IO ni suscripciones en el frontend
   - Las alertas se consultan vía `GET /api/v1/dashboard/alerts` (REST polling)
4. **Frontend Dashboard** ❌ **No enrutado**:
   - El archivo `pages/Notifications.tsx` existe pero **no tiene ruta** en `App.tsx`
   - Lo mismo para `Alerts.tsx` (la página que conectaba Socket.IO)

---

## 2. Plan de Verificación — Estado real

| Tipo | Estado | Notas |
|------|--------|-------|
| **Tests automatizados** (Jest) | ✅ 26 tests | Cubren auth, CRUD, scoping multi-tenant (SECURITY), escritura |
| Tests para incidencias | ❌ No cubiertos específicamente | Las rutas de incidencias existen pero sin test dedicado |
| Tests para desviaciones | ❌ No cubiertos | El controlador existe, sin test |
| Tests para propuestas de compra | ❌ No cubiertos | El controlador existe, sin test |
| Tests para notificaciones | ❌ No aplica | Módulo no implementado |
| Verificación manual | ✅ Parcial | Centros, consumos, incidencias, desviaciones verificados manualmente |
