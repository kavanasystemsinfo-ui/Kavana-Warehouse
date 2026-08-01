# Reunión Directiva — CleanStock (15/07/2026)

**Asistentes:** Jorge (CEO/Dev), Hermes (Análisis)
**Cliente piloto identificado:** Cuñada (encargada limpieza Valencia, varios centros)

## 1. Visión de negocio (REENFOQUE)
De "SaaS de control de inventario para empresas de limpieza" →
**"Trazabilidad de consumo para encargados de limpieza con centros descentralizados:
quién cogió qué, dónde y cuándo, con alertas automáticas de desviación."**

## 2. Problema validado (cliente real)
- 500€/15d solo en papel por centro ciego.
- Sospecha de robo/sobre-consumo no confirmable.
- Encargada no puede estar en todos los centros (Diputación, Beneficencia,
  Plaza de Toros, Museo Bellas Artes).

## 3. Decisión de producto
- **MVP-vendible**: encargada registra consumos por centro desde móvil (1 clic)
  + dashboard de desviaciones por centro. NO depende de que el limpiador use la app.
- **Evolución**: el limpiador consume directo (PWA) si hay adopción.

## 4. Funcionalidades priorizadas (roadmap)
1. Registro de consumo por centro (móvil encargada) — YA EXISTE
2. Dashboard comparativo por centro + desviación real vs teórico — AÑADIDO (15/07)
3. Alertas de anomalía (motor de reglas) — YA EXISTE
4. Reporte para justificar pedidos (CSV) — YA EXISTE
5. Onboarding cliente + facturación real — FASE 2

## 5. Demo preparada (15/07/2026)
- Seed `prisma/seed-demo-cunada.js` con su caso real:
  - Cliente: "Limpiezas Valencia Centro (DEMO)"
  - Centros: Diputación, Beneficencia, Plaza de Toros, Museo Bellas Artes
  - Producto estrella: Papel higiénico (consumo teórico 10/mes)
  - Anomalía inyectada: Plaza de Toros consumió 35 rollos (3.5x teórico)
  - Login encargada: supervisor.demo@cleanstock.com / demo1234
- Endpoint `/api/v1/dashboard/deviations` + página `/desviaciones` en dashboard.
- Ruta montada en `src/app.js` (no en routes/api.js, que es huérfano).

## 6. Mantenimiento VPS
- Cronjob diario 08:00 "VPS Maintenance Daily" (script vps-maintenance.sh):
  limpia Docker cache/logs, alerta y actúa si disco >= 85%.
- Motivo: el disco del VPS se llenó (100%) por cache de Docker y colapsó
  Postgres. Se liberó y se automatizó la limpieza.

## 7. Siguiente paso
Enseñar la demo a la cuñada y validar el dolor antes de vender.
