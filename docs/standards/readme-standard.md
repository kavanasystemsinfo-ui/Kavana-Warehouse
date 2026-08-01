# KES-README — Estándar de README para proyectos Kavana Systems

**Versión:** 1.0  
**Aplica a:** Todos los repositorios públicos de Kavana Systems  
**Propósito:** Que cualquier persona (reclutador, CTO, inversor, desarrollador) entienda en 30 segundos qué hace el proyecto, por qué existe y si es relevante para ellos.

---

## 1. Estructura Obligatoria

Cada README debe seguir EXACTAMENTE este orden. No se añaden secciones intermedias. No se omiten secciones obligatorias.

```
1. Título + Badges técnicos (máx 12)      ← 1 línea + 1 línea
2. ⚡ 30 Segundos                          ← 3-5 líneas (problema + solución + stack)
3. 🏗️ Arquitectura                        ← Diagrama ASCII (máx 15 líneas) + 1 párrafo
4. 🧠 Decisiones clave                     ← Tabla (decisión | alternativas | elegida | por qué)
5. 📊 Estado                               ← Checklist visual (✅ 🚧 ⚠️)
6. 📚 Documentación                        ← Tabla enlaces a docs/
7. 🚀 Cómo ejecutar                        ← 3-5 comandos
8. Footer                                  ← Atribución + licencia
```

**Regla de oro:** El README **nunca** debe superar las **100 líneas** (aprox. 200-300 líneas de archivo contando saltos). Si algo no cabe, va a `docs/`.

---

## 2. Secciones Detalladas

### 2.1. Título + Badges

```
# [Nombre Proyecto] — [Tagline 5-7 palabras]

[![Tests](enlace)](docs/METRICS.md)
[![Tecnología1](shield)](url)
[![Tecnología2](shield)](url)
...
[![License](shield)](LICENSE)
```

**Badges obligatorios:** Tests, lenguaje/framework principal, BD, Docker, Multi-Tenant (si aplica), License.  
**Badges recomendados:** Offline-First (si aplica), IA (si aplica), CI/CD.  
**Máximo 12 badges.** Usar shields.io con logos oficiales.

### 2.2. ⚡ 30 Segundos

```
## ⚡ 30 Segundos

**Problema:** [Una frase. El dolor real. Sin jerga técnica.]

**Solución:** [Una frase. Cómo lo resuelve. Con la tecnología clave mencionada.]

**Stack:** [Tecnologías principales separadas por · ]

**Transparencia (si aplica):** "Sin clientes en producción" / "Proyecto de portfolio" / "En fase piloto"
```

**Prohibido:** empezar con "React", "NestJS", "Python" o cualquier tecnología.  
**Obligatorio:** empezar con el problema de negocio.

### 2.3. 🏗️ Arquitectura

```
## 🏗️ Arquitectura

\`\`\`
[Diagrama ASCII — máx 15 líneas]
\`\`\`

[1 párrafo explicando el flujo. Qué hace cada actor/capa.]
```

El diagrama debe mostrar el flujo completo: usuario → frontend → API → BD.  
Si hay offline-first, mostrar el almacenamiento local + sync.

### 2.4. 🧠 Decisiones clave

```
## 🧠 Decisiones

| Decisión | Alternativas | Elegida | Por qué |
|----------|-------------|---------|---------|
| [Decisión] | [2-3 alternativas] | [Elegida] | [Una frase] |
```

Máximo 5 filas. Si hay más decisiones, van a `docs/adr/`.  
Si hubo una decisión importante que se descartó, incluirla como fila con ❌.

### 2.5. 📊 Estado

```
## 📊 Estado

| Scope | Estado |
|-------|--------|
| Funcionalidad A | ✅ |
| Funcionalidad B | 🚧 Pendiente |
| Clientes reales | ⚠️ Sin implantación real |
```

✅ = implementado y verificable en el código  
🚧 = planificado, no implementado  
⚠️ = advertencia / transparencia

### 2.6. 📚 Documentación

```
## 📚 Documentación

| Para qué | Dónde |
|----------|-------|
| Decisiones arquitectónicas | [`docs/adr/`](docs/adr/) |
| ... | ... |
```

Solo los enlaces más importantes. El resto se descubre navegando.

### 2.7. 🚀 Cómo ejecutar

```
## 🚀 Cómo ejecutar

\`\`\`bash
comando 1
comando 2
\`\`\`
```

Máximo 5 comandos. Si hay más, ir a `docs/deploy/`.

### 2.8. Footer

```
---

*Proyecto diseñado con criterio arquitectónico propio, implementado con asistencia de IA.*
*Parte del ecosistema [Kavana Systems](https://github.com/kavanasystemsinfo-ui).*
```

---

## 3. Prohibiciones

| No hacer | Por qué |
|----------|---------|
| Empezar el README con tecnología | El problema es lo primero, no React |
| Poner capturas sin contexto | Si hay capturas (dashboard, app), deben tener un pie que explique qué muestran |
| Listar tecnologías sin justificación | Cada tecnología en el stack debe tener un "por qué" (aunque sea breve) |
| README > 100 líneas de contenido | Lo que no cabe va a `docs/` |
| Prometer funciones no implementadas | Si no está en el código, no está en el README (a menos que sea 🚧) |
| Referencias a herramientas IA como autor | El arquitecto es quien decide. La IA ejecuta. |

---

## 4. Checklist de Validación

- [ ] ¿Empieza con el problema de negocio?
- [ ] ¿Tiene badges técnicos (tests, stack, license)?
- [ ] ¿Arquitectura en ≤15 líneas ASCII?
- [ ] ¿Decisiones clave con alternativas?
- [ ] ¿Estado con ✅ 🚧 ⚠️?
- [ ] ¿Transparencia sobre clientes reales?
- [ ] ¿Enlaces a docs/ funcionan?
- [ ] ¿Footer con atribución correcta?
- [ ] ¿< 100 líneas de contenido?
- [ ] ¿Sin tecnologías sin justificar?

---

*Este estándar es obligatorio para todos los proyectos Kavana. Versión 1.0 — 2026-07-23.*
