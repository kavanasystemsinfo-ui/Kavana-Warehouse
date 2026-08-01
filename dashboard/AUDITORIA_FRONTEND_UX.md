# Auditoría Frontend/UX — CleanStock Dashboard

**Alcance:** `/root/clean_ops/dashboard/src` (React 18 + TS + Vite)
**Skills aplicadas:** ai-first-engineering, frontend-a11y, accessibility (WCAG 2.2 AA), frontend-patterns, frontend-design-direction, react-patterns, react-performance, error-handling
**Modo:** SOLO LECTURA — no se modificó ningún archivo.

---

## Hallazgos (15)

### CRÍTICOS / ALTOS

**1. `lib/api.ts:197` — 403 no manejado, no fuerza logout**
`apiFetch` solo intercepta `res.status === 401`. Un `403 Forbidden` (token válido pero rol sin permiso, o empresa desvinculada) cae en el bloque genérico `if (!res.ok)` y lanza el texto crudo del servidor sin limpiar tokens ni disparar `auth:unauthorized`. El usuario se queda "colgado" con un mensaje críptico y sesión potencialmente inconsistente.
**Fix:** tratar 401 y 403 igual (o al menos 403 → `clearTokens()` + `auth:unauthorized`), o comprobar `res.status >= 401 && res.status < 500`.

**2. `App.tsx:60-75` — Rutas de 3 pantallas inexistentes**
Existen los archivos `pages/Notifications.tsx`, `pages/Asignaciones.tsx` y `pages/Alerts.tsx`, pero **ninguna ruta está declarada** en `App.tsx` (solo dashboard/inventario/incidents/empleados/centros/desviaciones/costes). `Layout.tsx` tampoco las enlaza. Esas pantallas son **inaccesibles** desde la UI aunque el código compila.
**Fix:** añadir `<Route path="notifications" .../>`, `asignaciones`, `alerts` dentro del `ProtectedRoute`, y sus `NavLink` en `Layout.tsx`.

**3. `pages/Alerts.tsx:33-51` — Socket.IO conectado en página no enrutada**
`Alerts` llama `connect()`/`subscribe('stock:alert')`/`disconnect()` en su `useEffect`. Como la página no está enrutada (ver #2), este código nunca se ejecuta, así que **las alertas en tiempo real nunca llegan**. Además, si se enrutara, `disconnect()` en cleanup mata el socket global para toda la app.
**Fix:** mover la suscripción Socket.IO a un lugar siempre montado (p.ej. `Layout` o un hook global) o enrutar Alerts y no desconectar el socket global en el unmount de una vista.

**#4. `pages/Centros.tsx + Empleados.tsx — API devuelve campos no tipados (`as any` en cascada)** — **✅ CORREGIDO (M11, julio 2026)**
La interfaz `Centro` en `api.ts:29` ha sido extendida con `asignaciones`, `inventarioCentros` y `presupuesto_mensual`. La interfaz `Empleado` incluye `asignaciones`. Todos los `as any` (14 en total) han sido eliminados. `tsc --noEmit` exit 0.

**5. `lib/api.ts:387-397` — `getProductos` ya defiende contra `{productos:[...]}`; pero hay llamadores frágiles**
El bug reportado `b.map is not a function` venía de asumir array cuando la API devuelve `{productos:[...]}`. Hoy `getProductos`/`getCatalogoProductos` ya hacen `return res.productos || []` — **OK, corregido**. Riesgo residual: `getEmpleados`, `getCentros`, `getCategorias`, `getUsuarios`, `getAsignaciones`, `getInventory`, `getConsumos` confían en que el backend SIEMPRE envuelve en la clave correcta; si alguna deja de hacerlo, el `.map` en la página rompe igual. `getConsumption`/`getAlerts`/`getDeviations`/`getCostes` NO unwrap (esperan el objeto entero) y se usarían como `.resumen_por_centro.map` — frágil si el backend cambia el shape.
**Fix:** añadir `?? []`/`?? {}` defensivo en todos los wrappers de api.ts y validar shapes en el límite (una función `asArray()`/`asObject()`).

### MEDIOS

**6. `pages/Empleados.tsx:25-33` — Crear empleado sin validación cliente**
`handleCreate` envía el form tal cual: `nombre`, `email`, `password` (default `'cleanstock'`), `numero_empleado`, `id_centro`. Los inputs NO tienen `required` ni validación de email/longitud (líneas 75,79,83,87,91,95). Se puede crear un empleado con nombre vacío o email inválido; el error solo aparece si el backend lo rechaza, y el mensaje de `msg` dice "Error..." genérico.
**Fix:** validar `nombre.trim()`, `email` con regex, longitud mínima de password y `id_centro>0` antes de llamar a `createEmpleado`, mostrando el error en rojo como en Inventario.

**7. `pages/Centros.tsx:38-46` — Crear centro sin validación**
`handleCreate` no comprueba que `form.nombre` esté relleno (input sin `required` en línea 157). Centro con nombre vacío se envía al backend.
**Fix:** `if (!form.nombre.trim()) { setMsg('El nombre es obligatorio'); return }` antes de `createCentro`; añadir `required` al input.

**8. `components/Layout.tsx + páginas — Modales sin focus trap ni Escape**
Ningún modal (Inventario, Centros, Deviations, Costes, Asignaciones, GuiaAyuda) implementa focus trap, `role="dialog"`, `aria-modal="true"`, ni cierre con `Escape`. Solo cierran por click en overlay o botón ✕. Viola WCAG 2.4.3 / 2.1.2 (skill frontend-a11y). El foco queda atrapado en el fondo al abrir/cerrar.
**Fix:** extraer un `<Modal>` reutilizable con `role="dialog" aria-modal`, focus al primer input, `Tab` cíclico y listener `Escape`→cerrar.

**9. `pages/*` — Botones de icono sin `aria-label` suficiente**
Varios botones solo muestran emoji y carecen de `aria-label`: borrar producto 🗑️ (Inventario.tsx:220), editar (Centros.tsx:209, Asignaciones.tsx:161), "Iniciar"/"Resolver" incidencias (Incidents.tsx:208,213). Lector de pantalla lee solo el emoji o nada. `GuiaAyuda` sí tiene `aria-label` — **OK modelo a seguir**.
**Fix:** añadir `aria-label="Eliminar producto X"` etc. a cada botón de icono.

**10. `index.css` — Contraste gris-400 (#9ca3af) sobre blanco ~2.8:1 (WCAG exige 4.5:1)**
`--gray-400` se usa para texto secundario/placeholder en muchos sitios (Notifications.tsx:161,244-246; Centros.tsx:186; Deviations/Costes "—"; CSS líneas 84,130,517,582). #9ca3af sobre blanco es ~2.8:1, por debajo del mínimo AA. Texto "Sin personal asignado", "—", fechas, etc. quedan ilegibles para baja visión.
**Fix:** subir a `--gray-500` (#6b7280, 4.6:1) o `--gray-600` para texto informativo.

**11. `lib/api.ts:135-139 vs App.tsx — Token viejo / "sin empresa asociada" no detectado**
`clearTokens` y `getStoredUser` existen, pero no hay validación de que el `Usuario` almacenado tenga empresa asociada. Si el backend devuelve sesión válida pero `usuario` sin `id_empresa` (caso "sin empresa asociada"), el frontend lo acepta y renderiza pantallas vacías/misteriosas. `App.tsx` solo chequea `!user` o rol `limpiador`.
**Fix:** tras login y en `ProtectedRoute`, validar `usuario.id_empresa` (o campo equivalente) y redirigir a un estado de "completa tu empresa" si falta; no depender solo del token.

**12. `pages/*` — Sin caché en memoria desactualizada, pero sin re-fetch tras acciones cruzadas**
Las páginas cargan en `useEffect([])` y refrescan tras su propia acción (OK). Pero si se crea un centro en `Centros` y se va a `Dashboard`, el Dashboard NO re-fetch (su `useEffect` solo corre al montar). No es un bug de caché corrupta, pero sí datos posiblemente desactualizados entre vistas en la misma sesión.
**Fix:** o bien un store compartido (Context/Zustand) o `key` de ruta que fuerce remount, o `useFocusEffect`.

### BAJOS / OK

**13. `pages/Inventario.tsx` — Validación de Nuevo Producto: OK**
Sí valida nombre vacío y coste numérico ≥0 (líneas 60-63), muestra `npError` en `alert-danger`, y loading `npLoading`. **Buen modelo.**

**14. `pages/Centros.tsx:75-100` — Validación "Añadir producto a centro": OK**
Comprueba `addProdId` y valida cantidad/mínimo numéricos, muestra `addError`. **OK**.

**15. `pages/Deviations.tsx / Costes.tsx / Asignaciones.tsx` — Validación de conteo/presupuesto/asignación: OK**
Deviations valida número ≥0 (líneas 52-56); Costes valida importe (37); Asignaciones valida campos obligatorios (71-73). Todas muestran error visible. **OK**.

**Estados de carga/error: OK generalmente** — todas las páginas tienen spinner (`.loading`/`.spinner`) y `alert alert-danger` para errores, y `alert alert-success` para éxitos. Bien cubierto.

---

## Resumen por categoría pedida

| # | Categoría | Veredicto |
|---|-----------|-----------|
| 1 | Errores silenciosos (401/403, `.map` en objeto) | **403 NO manejado** (#1); `as any` corregido (#4, M11) |
| 2 | Caché / token viejo | Token viejo no fuerza logout en 403 (#1); "sin empresa" no detectado (#11); no hay caché corrupta pero sí datos desactualizados entre vistas (#12) |
| 3 | Validación formularios | Inventario/Centros(add)/Deviations/Costes/Asignaciones: **OK**; **Empleados y Crear-Centro tienen huecos** (#6, #7) |
| 4 | Accesibilidad | Sin focus trap ni `role="dialog"` en modales (#8); botones-icono sin `aria-label` (#9); contraste gris-400 insuficiente (#10) |
| 5 | Estados carga/error | **OK** en todas las páginas (spinner + alertas visibles) |

## Prioridad de arreglo — Estado actual
1. ~~#4 (tipado Centro, eliminar `as any`)~~ → **✅ CORREGIDO (M11)**
2. #2 + #3 (rutas/alertas en tiempo real — funcionalidad rota)
3. #1 (403 → logout) → **✅ CORREGIDO (A7)**
4. #8/#9/#10 (a11y: focus trap, aria-label, contraste) → **✅ CORREGIDO (M12-M14)**
5. #6/#7 (validación Empleados/Crear Centro)
6. #11/#12 (empresa asociada, re-fetch entre vistas)
