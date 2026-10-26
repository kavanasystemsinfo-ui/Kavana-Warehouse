# Preguntas frecuentes de CTOs y reclutadores — KAVANA Warehouse

Respuestas cortas y verificables a lo que suele preguntar alguien que evalúa el
proyecto. Cada respuesta remite al documento o al código donde se comprueba.
Datos a 26 de octubre de 2026.

## Producto y negocio

### ¿Qué es Kavana Warehouse y qué problema resuelve?
Es una aplicación web para controlar los **consumibles indirectos de una planta
industrial** (EPIs, discos de corte, hilo de soldadura, lubricantes, embalaje)
por **sección o centro de coste**. Responde a cuatro preguntas de la oficina:
cuánto consume cada sección, qué stock está por debajo del mínimo, cuánto se
gasta frente al presupuesto mensual y dónde hay **mermas** (diferencia entre el
stock registrado y el contado). Es una herramienta de mejora continua, no un MES
ni un ERP.

### ¿De dónde sale la idea?
De un problema real: una empresa de limpieza de Valencia no sabía cuánto
material gastaba cada centro. Es el mismo problema que en planta, con
consumibles repartidos por secciones. En octubre de 2026 la demo pasó de la
empresa de limpieza a una planta metalúrgica ficticia (DECISIONS, decisión 11).

### ¿Es un producto comercial? ¿Tiene clientes?
No. Es un **proyecto de portfolio** con un solo usuario real, su autor, y coste
objetivo de 0 €/mes (ADR-006). Está diseñado como SaaS multi-empresa
(multi-tenant) para que pudiera tener clientes, pero hoy solo existe la empresa
demo.

### ¿Quién lo ha hecho y qué papel tuvo la IA?
**Jorge Adán Rodríguez** (Kavana Systems), con 8 años de experiencia en
fabricación industrial: ajuste de máquina, control de calidad, perfiladora y
montaje. Las decisiones de producto, dominio y arquitectura son suyas; la IA
se usó como copiloto de implementación, y cada decisión está escrita y
justificada en los ADRs y en DECISIONS.md. Contacto: https://www.linkedin.com/in/jorgeadan/
y https://www.kavanasystems.com.

### ¿Qué funciones tiene?
- **Dashboard** con KPIs (consumo, movimientos, alertas) y evolución mensual, con filtro de periodo.
- **Inventario**: catálogo de productos y stock por sección, con mínimo de alerta.
- **Centros**: secciones con su inventario y su presupuesto mensual.
- **Costes**: gasto del mes por sección frente al presupuesto, con semáforo.
- **Desviaciones**: stock registrado frente a stock físico contado (mermas y sobrantes) con su coste.
- **Responsables**: quién cuenta el stock de cada sección e histórico de recuentos.
- **Propuesta de compra**: qué pedir según el stock mínimo, exportable a CSV desde Inventario.
- **Supervisores de visita**: cuentas temporales de 24 h para probar la demo.
- **Asistente técnico**: este chat, que responde con la documentación del proyecto.

### ¿Qué se quitó y por qué?
- **Incidencias** (averías de la instalación), en octubre de 2026: no encaja en una
  herramienta de control de stock (DECISIONS, decisión 12). La tabla se conserva.
- **App móvil del operario**, en agosto de 2026: la visión es gestión de stock web.
- **Tiempo real con Socket.IO**: las alertas son consultas REST; no hacía falta.

## Demo

### ¿Cómo pruebo la demo?
En https://warehouse.kavanasystems.com con el usuario `warehouse` y la
contraseña `kavana`. La landing del proyecto está en
https://www.kavanasystems.com/warehouse/. La primera carga puede tardar unos
segundos: la API está en el plan gratuito de Render y se duerme sin tráfico.

### ¿Qué datos tiene la demo?
Una planta metalúrgica **inventada**, "Industrias Metálicas Demo, S.L.", con
**6 secciones** (Perfilado, Corte y punzonado, Soldadura, Pintura y acabado,
Mantenimiento, Expediciones), **38 consumibles**, 67 combinaciones
sección-producto, un responsable por sección y entre 5 y 10 operarios por
sección. Tiene histórico desde el 1 de septiembre de 2026 (unos 2.500
movimientos al recargarla el 26 de octubre) y crece cada día.

### ¿Qué escenarios enseña la demo?
Están diseñados para que siempre se vean (`prisma/demo-industrial-data.js`):
- **Merma estrella**: Soldadura, hilo MIG de 15 kg. Registradas 3 bobinas más de las contadas (156 € de merma).
- **Merma en EPIs**: Perfilado, guantes anticorte. Faltan 8 pares.
- **Sobrantes leves**: Mantenimiento, aceite hidráulico (+4 litros) y grasa (+1 cartucho).
- **Sección sin contar**: Pintura y acabado, todo pendiente de recuento físico.
- **Producto bajo mínimo**: Expediciones, fleje de polipropileno (4 rollos con mínimo de 6); siempre sale en la propuesta de compra.
- **Sección que se pasa del presupuesto**: Soldadura tiene un presupuesto algo menor que su consumo.

### ¿Por qué la demo parece "viva"?
Un cron diario a las 06:00 en un VPS ejecuta `prisma/simulate-daily.js`: genera
los consumos del día (firmados por operarios de cada sección), repone los lunes
lo que está en punto de pedido (lo firma el responsable) y mantiene constantes
las mermas diseñadas. Si el cron falla unos días, la siguiente ejecución rellena
los días que faltan (hasta 120). Avanza por días de calendario para no fallar el
día del cambio de hora.

### ¿Un visitante puede estropear la demo?
No. Las acciones de gestión (productos, centros, presupuestos, usuarios,
reposiciones, reset) están protegidas por `officeOnly`; un supervisor de visita
solo lee y hace recuentos. Lo que crea un visitante queda marcado con su sesión
y caduca a las 24 h. Está cubierto por tests de "blindaje" (ADR-005).

### ¿Cómo se recarga la demo?
`npm run demo:recargar`: `prisma/reset-demo.js --confirm` borra solo los
clientes con `es_demo = true` (nunca empresas reales) y los productos que no usa
ningún cliente real, en una transacción. Sin `--confirm` solo simula y lista lo
que borraría. Después vuelve a sembrar la base y el histórico.

## Arquitectura y stack

### ¿Qué stack usa?
- **Frontend**: React 19, TypeScript, Vite y React Router 7. Desplegado en Vercel.
- **Backend**: Node.js con Express 4, Prisma 7 (con el adaptador `pg`) y validación con Zod 4. Desplegado en Render.
- **Base de datos**: PostgreSQL 16 en Neon (serverless).
- **Tests**: Jest y Supertest en la API; Vitest y Testing Library en el panel.
- **CI**: GitHub Actions.
- **Local**: Docker Compose con base de datos, API y dashboard.

### ¿Cómo es la arquitectura?
Un **monolito modular**: dashboard React, una API REST en Express
(`src/app.js` más controladores para costes, desviaciones y compras) y
PostgreSQL vía Prisma. Autenticación con JWT y control de acceso por rol en
cada ruta. Es deliberado: un solo desarrollador y un dominio acotado no
justifican microservicios ni colas.

### ¿Por qué un monolito y no microservicios?
Por tamaño del problema y del equipo: un dominio pequeño, un solo desarrollador
y coste cero. Un monolito se despliega, se prueba y se depura en un sitio.
La separación en módulos (controladores, servicios, middleware) permite extraer
piezas si algún día hiciera falta.

### ¿Cómo se modelan los datos?
Las tablas principales son `Cliente` (empresa), `Centro` (sección o centro de
coste), `Producto` (catálogo), `InventarioCentro` (stock por sección y
producto, con `cantidad_actual` registrada y `stock_fisico` contado), y
`RegistroMovimiento` (consumos con signo negativo, entradas positivas y
recuentos con `tipo = 'recuento'`). `Usuario` y `AsignacionPersonal` relacionan
personas con secciones. El detalle está en `prisma/schema.prisma` y en
docs/technical/01_architecture-spec.md.

### ¿Cómo se calculan los costes y las mermas?
- **Coste del mes de una sección**: suma de los consumos del mes en curso multiplicados por el coste unitario del producto.
- **Semáforo de costes**: rojo si ya ha superado el presupuesto; ámbar si, al ritmo del mes, acabará superándolo o ya va por el 90 %; verde si va bien. Tiene en cuenta el día del mes.
- **Merma**: stock registrado menos stock físico contado. El coste de la merma es esa diferencia por el coste unitario.

### ¿Por qué Prisma?
Por tipado de extremo a extremo y migraciones declarativas y versionadas, para
un dominio de 13 modelos (ADR-003). Las migraciones se aplican a mano con
`prisma migrate deploy`, nunca en el arranque: hacerlo en el arranque rompía
los despliegues.

## Seguridad

### ¿Cómo funciona la autenticación?
JWT de vida corta (2 h por defecto) más **refresh token rotativo de 7 días**
guardado **hasheado** (SHA-256) en la base de datos. Se pueden revocar sesiones
sin Redis. Contraseñas con bcrypt. Login por usuario o email (ADR-002).

### ¿Cómo se aísla a cada empresa (multi-tenant)?
Un cliente (empresa) **nunca puede ver ni modificar los datos de otro cliente**.
Es un SaaS multi-tenant con esquema compartido con la columna de cliente en los datos: cada consulta filtra
por la empresa del usuario autenticado, y cada escritura comprueba que el
centro pertenece a esa empresa (`requireCentroDelCliente`). Hay tests
específicos de fugas entre empresas (`src/__tests__/fugas.test.js` y el bloque
SECURITY de `api.test.js`) que esperan 403 o listas vacías (ADR-001).

### ¿Qué otras medidas de seguridad tiene?
- Validación de entrada con **Zod** en login, refresh, alta de empresa, consumos y salida de stock.
- **Límite de intentos de login** fallidos por IP y usuario (10 en 15 minutos por defecto).
- **CORS** con lista blanca de orígenes: un dominio que no esté en la lista no recibe cabeceras CORS.
- **Roles** comprobados en el servidor, no solo en la interfaz.
- Secretos en variables de entorno del proveedor, nunca en el repo.

Hubo una auditoría de seguridad en julio de 2026 que cerró 4 hallazgos críticos,
8 altos y 14 medios (docs/technical/00_audit-status.md).

### ¿Qué limitaciones de seguridad reconoce?
El límite de login vive en la memoria de una instancia: con varias instancias
haría falta un almacén compartido (Redis o una tabla). El asistente usa modelos
gratuitos que pueden registrar las preguntas, así que no debe usarse con datos
personales. Con usuarios reales: gestor de secretos con rotación, auditoría de
accesos y cuotas por usuario.

## Calidad, tests y CI

### ¿Cuántos tests tiene y qué cubren?
**86 tests de API** (Jest y Supertest contra PostgreSQL real), en tres archivos:
49 en `api.test.js` (autenticación, CRUD, aislamiento multi-tenant, blindaje de
la demo, costes, desviaciones y filtros de periodo), 19 en `fugas.test.js`
(intentos de leer o escribir datos de otra empresa) y 18 en `assistant.test.js`
(validación, corpus y que cada pregunta rápida encuentre su respuesta). **11 tests del panel** (Vitest): login, cálculo
de periodos en hora local y formatos en español.

### ¿Qué hace el CI?
Tres trabajos en GitHub Actions:
1. **API**: levanta PostgreSQL 16, aplica migraciones, siembra y ejecuta los tests.
2. **Panel**: tests de Vitest y build.
3. **Scripts de la demo**: siembra, histórico y simulación (dos pasadas, debe ser idempotente). Simula que el cron falla 10 días y comprueba que se recupera, y hace una recarga completa. Lo verifica todo con SQL: secciones, mermas exactas, Pintura sin contar, fleje bajo mínimo, autores de los movimientos y ningún stock negativo.

### ¿Cómo se ejecuta en local?
```bash
cp .env.example .env       # DATABASE_URL y JWT_SECRET
docker compose up -d       # base de datos, API y dashboard
npm install
npx prisma migrate deploy
npm test
```

## Despliegue y costes

### ¿Dónde está desplegado?
Panel en **Vercel** (warehouse.kavanasystems.com), API en **Render** (plan
gratuito, Frankfurt), base de datos en **Neon** (PostgreSQL serverless,
Frankfurt) y el cron de la simulación en un VPS. Cada push a `main` despliega
el panel y la API (ADR-004).

### ¿Cuánto cuesta mantenerlo?
**0 € al mes**: todos los servicios están en planes gratuitos y el asistente
usa modelos gratuitos de OpenRouter. Es una restricción elegida y documentada
(ADR-006), con lo que cambiaría con presupuesto: instancias dedicadas sin
arranque en frío, plan de base de datos con restauración amplia y un modelo de
pago con SLA.

### ¿Escala?
Para el uso actual, sí. Los cuellos de botella conocidos serían el arranque en
frío de Render, la instancia única de la API (el límite de login está en
memoria) y que el catálogo de productos es global. Con clientes reales: más
instancias detrás de un balanceador, el límite de login en Redis o en una tabla,
índices revisados con datos reales y réplicas de lectura en la base de datos.

## Asistente técnico

### ¿Cómo funciona este asistente?
Es un RAG sencillo: indexa en memoria el README, DECISIONS, los ADRs y los
documentos técnicos (incluida esta guía), busca los fragmentos más parecidos a
la pregunta con **TF-IDF** (sin embeddings ni base vectorial) y un modelo
gratuito de OpenRouter redacta la respuesta solo con esos fragmentos. Si algo
no está documentado, lo dice.

### ¿Qué modelos usa?
`google/gemma-4-31b-it:free` como principal y
`nvidia/nemotron-3.5-lightning:free` como respaldo, de proveedores distintos,
para que un límite de peticiones (429) de uno no deje el asistente sin
respuesta. Se piden sin razonamiento para que respondan rápido. Se cambian con
variables de entorno, sin tocar código (ADR-006).

### ¿Por qué TF-IDF y no embeddings?
La documentación ocupa menos de 100 KB: TF-IDF en memoria encuentra bien los
fragmentos, no cuesta nada y no necesita otra base de datos. Con un corpus
mucho mayor o preguntas más ambiguas, el siguiente paso serían embeddings con
pgvector en la misma PostgreSQL (ADR-005).

## Estado y siguientes pasos

### ¿Qué falta o qué haría después?
Lo pendiente y los siguientes pasos que Jorge tiene identificados son estos:
- Notificaciones: las tablas existen, faltan endpoints e interfaz.
- Documentación OpenAPI de la API.
- Separar `src/app.js` (unas 1.200 líneas) en routers por dominio.
- Mover el límite de login a un almacén compartido si hay más de una instancia.
- Con clientes reales: catálogo de productos por empresa y auditoría de accesos.

### ¿Dónde está todo documentado?
- `README.md`: visión general, decisiones clave y cómo ejecutarlo.
- `DECISIONS.md`: todas las decisiones, con su porqué.
- `docs/adr/`: 6 ADRs con alternativas evaluadas.
- `docs/technical/`: arquitectura, despliegue, auditoría y roadmap.
- `docs/deployment.md`: despliegue real y credenciales de la demo.
