# ADR-006: Coste cero y modelos gratuitos como decisión explícita

**Estado:** ✅ Implementado · **Fecha:** 2026-09-17 · **Relacionado:** [ADR-005](005-asistente-rag-y-blindaje-demo.md) (asistente y blindaje de la demo)

## Contexto

KAVANA Warehouse es una demo de portafolio con **un solo usuario real: su autor**. El asistente técnico responde preguntas sobre la documentación del repositorio: indexa README, DECISIONS y los ADRs en memoria con **TF-IDF** (sin embeddings ni coste) y solo usa un modelo de lenguaje para redactar la respuesta a partir de los fragmentos recuperados.

Ese modelo es la única partida de coste variable del proyecto, y hasta hoy producción lo tenía apuntando a **DeepSeek de pago**: el código traía por defecto un modelo gratuito de OpenRouter, pero las variables de entorno del servicio lo sobreescribían. El precio por pregunta es bajo, pero es una clave de facturación con saldo que se puede agotar, y la latencia medida era de 26 segundos por respuesta.

## Decisión

1. El asistente usa una **variante gratuita** de OpenRouter: `nvidia/nemotron-3-super-120b-a12b:free`, configurada por variables de entorno (`ASSISTANT_MODEL_PRO`, `ASSISTANT_MODEL_FREE`) y `LLM_BASE_URL=https://openrouter.ai/api/v1`.
2. **La elección de proveedor y de modelo vive en configuración, no en código.** Cambiar de modelo es una variable de entorno y un redespliegue.
3. La clave de DeepSeek se **retira del servicio y se guarda** en el almacén de secretos del titular, no se borra: volver atrás es volver a poner la variable.
4. Queda escrito, en el README y aquí, qué cambiaría con usuarios reales y presupuesto.

## Alternativas evaluadas

| Alternativa | A favor | En contra | Veredicto |
|---|---|---|---|
| DeepSeek de pago (lo que había) | Modelo sólido en español, razonamiento multi-paso | Coste por pregunta y latencia medida de 26 s en producción | Descartado para una demo personal; es la elección con presupuesto |
| Modelo autoalojado (Ollama) | Coste 0 y los datos no salen del servidor | El plan gratuito de Render no tiene CPU/RAM para servirlo | Aplazado; ruta natural si algún día hay datos sensibles |
| Variante gratuita en OpenRouter | Coste 0, ya era el valor por defecto del código, latencia mucho menor | Cuota diaria de peticiones, disponibilidad variable del proveedor, los prompts pueden registrarse | **Elegido** |

## Consecuencias

**Medido, no estimado:** con la variante gratuita la misma pregunta pasa de **26,3 s a 11,2 s** de latencia y el coste de IA del proyecto es **0 €**. El coste de recuperación de contexto ya era 0 por diseño (TF-IDF en memoria, sin embeddings ni base de datos vectorial).

**Límites asumidos:** cuota de 1.000 peticiones al día en la cuenta actual (50 en cuentas sin compras); los `429` del proveedor de origen son posibles y hoy no hay modelo de respaldo automático; los modelos gratuitos pueden registrar los prompts, así que **esta demo no debe usarse con datos personales o de cliente**. La demo además solo responde con la documentación del repositorio y dice que no lo sabe cuando la respuesta no está documentada (regla de honestidad, ver ADR-005).

## Señal de revisión

Se revisa si el proyecto pasa a tener usuarios reales, si entran datos sensibles, si la cuota diaria deja de cubrir el uso o si la latencia del modelo gratuito empeora. En los cuatro casos el cambio es de configuración y de plan, no de arquitectura: el asistente, sus tests y el blindaje de la demo siguen igual.
