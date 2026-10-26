// =============================================================================
// KAVANA WAREHOUSE API — Asistente técnico (RAG) tests
// Run: npm test
// =============================================================================
const request = require('supertest');
const app = require('../app');

describe('POST /api/v1/assistant', () => {
  it('400 con pregunta demasiado corta', async () => {
    const res = await request(app)
      .post('/api/v1/assistant')
      .send({ question: 'hol' });
    expect(res.status).toBe(400);
  });

  it('400 sin pregunta', async () => {
    const res = await request(app).post('/api/v1/assistant').send({});
    expect(res.status).toBe(400);
  });

  it('500 sin OPENROUTER_API_KEY (el asistente no inventa respuestas sin configurar)', async () => {
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const res = await request(app)
        .post('/api/v1/assistant')
        .send({ question: '¿Qué problema resuelve Kavana Warehouse?' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBeTruthy();
    } finally {
      if (saved) process.env.OPENROUTER_API_KEY = saved;
    }
  });
});

describe('assistantService corpus', () => {
  it('indexa la documentación real del repo (chunks y fuentes > 0)', () => {
    const { estadisticasCorpus } = require('../services/assistantService');
    const stats = estadisticasCorpus();
    expect(stats.chunks).toBeGreaterThan(10);
    expect(stats.fuentes).toBeGreaterThanOrEqual(3);
  });

  it('no indexa plantillas en el corpus', () => {
    const { cargarCorpus } = require('../services/assistantService');
    const corpus = cargarCorpus();
    const fuentes = new Set(corpus.map((c) => c.fuente));
    expect([...fuentes].some((f) => f.toLowerCase().includes('template'))).toBe(false);
  });
});

describe('Preguntas rápidas del chat', () => {
  // Las preguntas de los botones del panel (AssistantChat.tsx) deben encontrar su
  // respuesta revisada en docs/PREGUNTAS_FRECUENTES.md entre los fragmentos recuperados.
  const fs = require('fs');
  const path = require('path');
  const chat = fs.readFileSync(path.join(__dirname, '../../dashboard/src/components/AssistantChat.tsx'), 'utf8');
  const preguntas = [...chat.matchAll(/^\s+'(¿[^']+)',?$/gm)].map((m) => m[1]);

  it('hay preguntas rápidas en el chat', () => {
    expect(preguntas.length).toBeGreaterThanOrEqual(8);
  });

  it.each(preguntas)('"%s" recupera su respuesta de PREGUNTAS_FRECUENTES', (pregunta) => {
    const { buscar, getIndice } = require('../services/assistantService');
    const titulo = pregunta.replace(/\s+/g, ' ').trim();
    const docs = buscar(getIndice(), pregunta);
    expect(docs.some((d) => d.fuente === 'docs/PREGUNTAS_FRECUENTES.md' && d.titulo.startsWith(titulo.slice(0, 25)))).toBe(true);
  });
});
