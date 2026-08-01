# Decisiones Estratégicas - Kavana CleanStock

Este documento registra el "por qué" de las decisiones arquitectónicas y de diseño técnico tomadas durante la fase de preparación para el entorno de producción.

---

## 1. Validación de Cantidades de Consumo Positivas en la API
* **Problema**: El diseño original de la API de consumo (`/stock/consume`) requería que la cantidad enviada en el body fuera negativa (ej. `cantidad: -3`). Esto introducía un riesgo de seguridad de inyección: si un atacante enviaba una cantidad positiva (ej. `cantidad: 3`), y la lógica hacía `cantidad_actual + cantidad` para actualizar el stock, el inventario se incrementaba artificialmente de forma fraudulenta.
* **Solución**: Se modificó el handler en `src/app.js` para validar que la cantidad recibida sea estrictamente un número entero **positivo** (> 0). No se usa librería de schemas (Zod); la validación es manual en el handler `POST /stock/consume`.
* **Decisión Técnica**: 
  - El frontend (panel del supervisor) envía la cantidad como un número positivo (`Math.abs(cantidad)`).
  - La base de datos sigue registrando el movimiento como negativo (`-cantidad`) en `registroMovimiento` para mantener la integridad histórica del almacén donde los consumos son salidas.
  - La actualización en `inventarioCentro` se hace usando el operador `decrement` de Prisma con el valor positivo recibido.

> **Contexto de rol (2026-07-16):** El consumo lo registra el **supervisor o personal de control** desde el dashboard web. El modelo `Usuario.rol='limpiador'` existe para trazabilidad de asignación a centros, pero el limpiador no usa ninguna app.

## 2. Restricción estricta de Centros al registrar Consumo (Bypass de Centro)
* **Problema**: Un usuario podía manipular las peticiones HTTP para enviar un `id_centro` diferente al de su centro asignado, logrando alterar el inventario de otras instalaciones de forma remota.
* **Solución**: En el handler `POST /stock/consume` de `src/app.js`, el backend resuelve obligatoriamente su centro asignado de forma dinámica a partir del `id_usuario` autenticado (vía `AsignacionPersonal`), ignorando cualquier `id_centro` enviado en el body.
* **Decisión Técnica**: Si el cliente envía un `id_centro` en el cuerpo que no coincide con su asignación actual activa, la petición es rechazada de inmediato con un código `403 (Forbidden)`. Esto proporciona una protección estricta en el servidor que no depende de la UI.

> **Contexto (2026-07-16):** El consumo lo registra el supervisor/personal de control desde el dashboard. El rol `limpiador` existe en el modelo de datos para trazabilidad de plantilla y asignación a centros, pero no tiene interfaz de usuario ni app móvil.

## 3. Configuración Dinámica de CORS y Forzado de HTTPS en Producción
* **Problema**: En producción, un middleware de CORS estático con origen `*` es inseguro y permite llamadas desde cualquier sitio web externo. Asimismo, los datos de inventario en tránsito y las credenciales deben viajar cifrados obligatoriamente.
* **Solución**: 
  - Se configuró el middleware de CORS para verificar dinámicamente el origen contra la variable de entorno `CORS_ORIGIN`, permitiendo mapear una lista de dominios múltiples separados por comas.
  - Se añadió un middleware de redirección a HTTPS en producción que comprueba la cabecera `x-forwarded-proto` (usada por proxies inversos como Railway y Render).

## 4. Gestión de Fallos de Red y Experiencia de Usuario
* **Problema**: Los fallos de red (pérdida de señal) provocaban excepciones sin capturar en el cliente de API, lo que se traducía en estados de carga infinitos o comportamientos inestables en la interfaz.
* **Solución**: Las peticiones del cliente de API se envolvieron en bloques `try/catch` globales.
* **Decisión Técnica**: Si ocurre un error de red o de resolución DNS, se intercepta y se lanza un error sanitizado en español: *"Error de conexión. Por favor, inténtalo de nuevo cuando tengas cobertura."* de forma que la interfaz lo notifique en un toast amigable.

> **Nota (2026-07-16):** El registro de consumos se hace desde el dashboard web del supervisor (responsive). No hay app móvil del limpiador.

## 5. Cierre Automático de Sesión por Expiración (Token 401)
* **Problema**: Si el supervisor dejaba el panel abierto de un día para otro, el token JWT expiraba. Al intentar registrar un consumo, la petición fallaba con 401 y la interfaz se quedaba en la misma pantalla sin dar una explicación o forzar el login.
* **Solución**: El cliente de API intercepta de forma global las respuestas 401. Si no hay refresh token o el proceso de refresco falla:
  - Se limpian las credenciales guardadas (`clearTokens()`).
  - Se guarda una clave en `localStorage` (`auth_error`) con un mensaje explicativo: *"Su sesión ha expirado. Por favor, inicie sesión de nuevo."*
  - Se dispara un evento global de ventana (`auth:unauthorized`).
  - El componente raíz (`App.tsx`) reacciona al evento devolviendo el estado al Login, donde el formulario lee la clave de error del `localStorage`, la muestra de forma amigable y la limpia.

## 6. Generador de Propuestas de Compra (Lado del Servidor vs Cliente)
* **Problema**: El sistema necesitaba generar un listado de productos a reponer basado en el stock mínimo. Si se generaba en el Frontend (React), obligaría a descargar todo el inventario de la empresa (miles de registros) para luego filtrarlos en el navegador, causando problemas de rendimiento en tablets/móviles antiguos.
* **Solución**: La lógica de cálculo del déficit (`stock_actual` - `stock_minimo`) y estimación de coste de pedido se centralizó completamente en el Backend (`purchaseController.js`).
* **Decisión Técnica**: El backend procesa todo en la base de datos y solo envía por red un objeto JSON muy ligero con los productos estrictamente necesarios a comprar. El frontend solo se encarga de convertir ese JSON a un Blob y disparar la descarga de un `.csv` estructurado.

## 7. Arquitectura del Motor de Notificaciones por Eventos
* **Problema**: Los supervisores querían ser avisados de robos o consumos excesivos de material. No querían recibir un email por cada cepillo que se cogiera, sino establecer reglas precisas (ej. "Solo avísame si sacan Lejía en el CEIP San Juan").
* **Solución**: Creación de un sistema de "Reglas de Notificación" que actúa como un Webhook interno.
* **Decisión Técnica**: En lugar de saturar el frontend con lógica de reglas, el handler de stock en `src/app.js`, cada vez que registra un consumo, podría consultar la tabla `ReglasNotificacion`. **Actualmente esto no está implementado** — las notificaciones son planificadas (el Módulo E de enterprise).

## 8. Tratamiento de Errores Cors (El falso Error 500)
* **Problema**: Tras configurar la variable de entorno `CORS_ORIGIN=*`, el sistema devolvía un `500 Internal Server Error` bloqueando todos los inicios de sesión desde React. Express interceptaba el fallo del middleware CORS nativo y lo encapsulaba como un error global de servidor, en lugar de un `403 Forbidden`.
* **Solución**: Se implementó una lógica de validación CORS condicional robusta en `src/app.js`.
* **Decisión Técnica**: Se parcheó la función de retorno (callback) del CORS. Ahora comprueba explícitamente `if (allowedOrigins.includes('*')) return callback(null, true);`. Esto evita que la librería evalúe literalmente el asterisco como una URL inválida.
