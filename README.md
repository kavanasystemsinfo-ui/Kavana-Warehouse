# Kavana CleanStock

Kavana CleanStock es un sistema MES (Manufacturing Execution System) industrial multi-tenant adaptado para el control de inventario distribuido, control de producción y costes, diseñado inicialmente para fabricantes de estanterías metálicas (Puntales Titán K-100, Largueros L-2700, Bandejas E-900).

El sistema consta de:
* **Backend API**: Servidor Express + Prisma (PostgreSQL) + Socket.IO para tiempo real.
* **Mobile App (PWA/Tablet)**: Aplicación móvil para operarios de limpieza con capacidades offline.
* **Dashboard App**: Panel de control interactivo para supervisores y administradores.

---

## Requisitos Previos

* Node.js v18 o superior
* Docker y Docker Compose (para base de datos PostgreSQL en local)

## Instalación y Configuración

1. Instalar dependencias en el directorio raíz:
   ```bash
   npm install
   ```
2. Instalar dependencias del panel (dashboard) y la aplicación móvil:
   ```bash
   cd dashboard && npm install
   cd ../mobile && npm install
   ```
3. Copiar archivo de entorno `.env.example` a `.env` en la raíz y configurar las variables:
   ```bash
   cp .env.example .env
   ```
4. Levantar la base de datos en Docker:
   ```bash
   npm run docker:db
   ```
5. Ejecutar las migraciones y el seed de base de datos:
   ```bash
   npx prisma migrate dev
   node prisma/seed.js
   ```

## Ejecución en Local

* **Iniciar Backend API**: `npm run dev` (ejecuta nodemon en el puerto 4000)
* **Iniciar App Móvil**: `npm run mobile:dev`
* **Iniciar Dashboard**: `npm run dashboard:dev`

## Ejecutar Pruebas

Para validar la lógica de negocio y las validaciones de seguridad:
```bash
npm run test
```

---

## Módulos Enterprise Implementados

Recientemente hemos implementado mejoras críticas para asegurar la aplicación y dotarla de capacidad Enterprise:

1. **Inteligencia Financiera (OPEX y Desviaciones)**: Cálculo del "Hambre de material" en tiempo real usando Consumos Teóricos. El dashboard traduce las unidades consumidas a impacto económico (OPEX) usando el coste de adquisición del producto y alertas financieras si se supera el presupuesto asignado al centro.
2. **Propuestas de Compra Predictivas (CSV)**: Generador inteligente de propuestas de pedido que calcula el déficit entre el stock mínimo y el actual, estimando el coste total por proveedor. Permite exportación a formato `.csv` compatible con Excel y sistemas ERP de contabilidad.
3. **Gestión Integral de Incidencias**: Flujo completo de reportes desde el cliente móvil PWA para reportar fallos en campo (Limpieza, Fontanería, etc.) hasta el dashboard de supervisión para su resolución.
4. **Sistema de Alertas y Reglas de Notificación**: Motor de notificaciones dinámico. Los administradores pueden suscribirse a eventos específicos (ej. "Avisarme si Carlos saca Lejía", o "Avisarme de cualquier consumo en la Fábrica Norte").
5. **Seguridad y Anti-Fraude**: 
   - Restricción estricta (Bypass) de Centros por ROL y protección CORS dinámica.
   - Refactor de la arquitectura para soportar sesiones persistentes (`Refresh Tokens`) e interceptores de red para caídas de cobertura en sótanos/fábricas.

Para ver las decisiones arquitectónicas en detalle técnico, consulta [DECISIONES_ESTRATEGICAS.md](./DECISIONES_ESTRATEGICAS.md).
