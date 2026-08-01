// =============================================================================
// Kavana CleanStock — Express Server Entry Point
// =============================================================================

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const logger = require('./lib/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { cleanupExpiredTokens } = require('./controllers/authController');
const { createSocketServer } = require('./lib/socket');

const app = express();
const PORT = process.env.PORT || 4000;
const TOKEN_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // cada 6 horas

// ---------------------------------------------------------------------------
// Middleware Chain
// ---------------------------------------------------------------------------
app.use(helmet());                                          // Security headers

// Redirección HTTPS en producción
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Configuración de CORS dinámica
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Si no hay origen (ej. apps móviles o herramientas locales como curl)
    if (!origin) return callback(null, true);

    // Si se permite el comodín global '*'
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // En desarrollo, si no hay orígenes configurados se permite
    if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json());                                    // Body parsing

// Swagger UI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Kavana CleanStock API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// HTTP request logging via Winston (replaces morgan)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userAgent: req.get('user-agent') || '-',
    });
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  logger.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ---------------------------------------------------------------------------
// Create HTTP Server (needed for Socket.IO)
// ---------------------------------------------------------------------------
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Initialize Socket.IO
// ---------------------------------------------------------------------------
createSocketServer(server);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  logger.info(`[Kavana CleanStock] Server running on http://localhost:${PORT}`);
  logger.info(`[Kavana CleanStock] Socket.IO ready for real-time connections`);
  logger.info(`[Kavana CleanStock] Environment: ${process.env.NODE_ENV || 'development'}`);

  // Programar limpieza periódica de refresh tokens expirados
  cleanupExpiredTokens(); // Ejecutar al inicio
  setInterval(cleanupExpiredTokens, TOKEN_CLEANUP_INTERVAL);
  logger.info(`[Kavana CleanStock] Token cleanup scheduled every ${TOKEN_CLEANUP_INTERVAL / 60000} minutes`);
});

module.exports = app;
