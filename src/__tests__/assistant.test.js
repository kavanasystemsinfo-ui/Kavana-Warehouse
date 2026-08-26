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
