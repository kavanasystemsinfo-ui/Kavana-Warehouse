// Logger mínimo estructurado (sin dependencias externas).
// Formato: [timestamp] LEVEL message {contexto opcional}
// Evita console.error disperso y facilita observabilidad futura (winston/pino).

function ts() {
  return new Date().toISOString();
}

const logger = {
  info: (msg, meta) => console.log(`[${ts()}] INFO ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[${ts()}] WARN ${msg}`, meta ?? ''),
  error: (msg, err) => {
    const detail = err instanceof Error ? { message: err.message, stack: err.stack } : err;
    console.error(`[${ts()}] ERROR ${msg}`, detail ?? '');
  },
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') console.debug(`[${ts()}] DEBUG ${msg}`, meta ?? '');
  },
};

module.exports = logger;
