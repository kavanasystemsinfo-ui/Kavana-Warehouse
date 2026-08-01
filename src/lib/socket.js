// =============================================================================
// Kavana CleanOps — Socket.IO Server
// Proporciona eventos en tiempo real para el Dashboard del Supervisor.
//   - Autenticación mediante JWT (mismo secret que el middleware HTTP)
//   - Los clientes se unen a rooms por centro para recibir solo eventos relevantes
//   - Eventos emitidos:
//       stock:consumed   → cuando un limpiador consume stock
//       stock:restocked  → cuando un supervisor/admin repone stock
//       stock:alert      → cuando un producto baja del stock mínimo
// =============================================================================

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

let io = null;

// ---------------------------------------------------------------------------
// createSocketServer — Crea y configura el servidor Socket.IO
//   Se llama desde server.js con el http.Server ya creado.
function createSocketServer(httpServer) {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? (process.env.CORS_ORIGIN.includes(',') ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : process.env.CORS_ORIGIN)
    : '*';

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // En producción con nginx, usar solo WebSocket para evitar
    // problemas con el proxy HTTP.
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ---------------------------------------------------------------------------
  // Middleware de autenticación JWT
  //   El cliente envía el token en auth.token durante el handshake.
  // ---------------------------------------------------------------------------
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Autenticación requerida. Token no proporcionado.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = {
        id_usuario: decoded.id_usuario,
        email: decoded.email,
        rol: decoded.rol,
      };
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token expirado.'));
      }
      return next(new Error('Token inválido.'));
    }
  });

  // ---------------------------------------------------------------------------
  // Manejo de conexiones
  // ---------------------------------------------------------------------------
  io.on('connection', (socket) => {
    const { id_usuario, email, rol } = socket.user;
    logger.info(`[Socket.IO] Cliente conectado: usuario=${id_usuario} email=${email} rol=${rol} socketId=${socket.id}`);

    // -------------------------------------------------------------------------
    // Evento: join:centro — El cliente solicita unirse a un room de centro
    //   Los supervisores se unen a los centros que gestionan para recibir
    //   solo los eventos relevantes.
    // -------------------------------------------------------------------------
    socket.on('join:centro', (centroId) => {
      if (!centroId || typeof centroId !== 'number') {
        return socket.emit('error', { message: 'centroId debe ser un número.' });
      }

      const roomName = `centro:${centroId}`;
      socket.join(roomName);
      logger.info(`[Socket.IO] Usuario ${id_usuario} se unió a ${roomName}`);
      socket.emit('joined:centro', { centroId, room: roomName });
    });

    // -------------------------------------------------------------------------
    // Evento: leave:centro — El cliente abandona un room de centro
    // -------------------------------------------------------------------------
    socket.on('leave:centro', (centroId) => {
      if (!centroId || typeof centroId !== 'number') return;

      const roomName = `centro:${centroId}`;
      socket.leave(roomName);
      logger.info(`[Socket.IO] Usuario ${id_usuario} abandonó ${roomName}`);
      socket.emit('left:centro', { centroId, room: roomName });
    });

    // -------------------------------------------------------------------------
    // Desconexión
    // -------------------------------------------------------------------------
    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Cliente desconectado: usuario=${id_usuario} socketId=${socket.id} razón=${reason}`);
    });
  });

  logger.info('[Socket.IO] Servidor inicializado correctamente.');
  return io;
}

// ---------------------------------------------------------------------------
// getIO — Retorna la instancia de Socket.IO (para usarla desde controllers)
//   Si no se ha inicializado (ej: en tests), devuelve null.
// ---------------------------------------------------------------------------
function getIO() {
  return io; // Puede ser null si no se ha llamado a createSocketServer
}

// ---------------------------------------------------------------------------
// Helpers de emisión de eventos
// ---------------------------------------------------------------------------

// emitStockConsumed — Emite un evento de consumo a los suscriptores del centro
function emitStockConsumed({ id_centro, id_producto, nombre_producto, cantidad, usuario, cantidad_actual, stock_minimo_alerta }) {
  const socketIO = getIO();
  if (!socketIO) return; // Socket.IO no inicializado (tests o server en startup)

  const room = `centro:${id_centro}`;

  const payload = {
    id_centro,
    id_producto,
    nombre_producto,
    cantidad,           // negativa = consumo
    usuario,
    cantidad_actual,
    timestamp: new Date().toISOString(),
  };

  socketIO.to(room).emit('stock:consumed', payload);
  logger.info(`[Socket.IO] Evento stock:consumed emitido a ${room}`, payload);

  // Verificar si se ha alcanzado o superado el umbral de alerta
  if (cantidad_actual <= stock_minimo_alerta) {
    const alertPayload = {
      ...payload,
      tipo: cantidad_actual <= 0 ? 'critica' : 'advertencia',
      stock_minimo_alerta,
      deficit: stock_minimo_alerta - cantidad_actual,
    };
    socketIO.to(room).emit('stock:alert', alertPayload);
    logger.info(`[Socket.IO] Evento stock:alert emitido a ${room}`, alertPayload);
  }
}

// emitStockRestocked — Emite un evento de reposición a los suscriptores del centro
function emitStockRestocked({ id_centro, id_producto, nombre_producto, cantidad, usuario, cantidad_actual }) {
  const socketIO = getIO();
  if (!socketIO) return; // Socket.IO no inicializado (tests o server en startup)

  const room = `centro:${id_centro}`;

  const payload = {
    id_centro,
    id_producto,
    nombre_producto,
    cantidad,           // positiva = reposición
    usuario,
    cantidad_actual,
    timestamp: new Date().toISOString(),
  };

  socketIO.to(room).emit('stock:restocked', payload);
  logger.info(`[Socket.IO] Evento stock:restocked emitido a ${room}`, payload);
}

module.exports = { createSocketServer, getIO, emitStockConsumed, emitStockRestocked };
