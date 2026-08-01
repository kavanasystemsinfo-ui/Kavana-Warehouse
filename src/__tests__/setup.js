// =============================================================================
// Kavana CleanOps — Test Setup
// Global mocks for all tests
// =============================================================================

// Mock logger to prevent noise in tests
jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
}));

// Mock socket to prevent noise in tests
jest.mock('../lib/socket', () => ({
  emitStockConsumed: jest.fn(),
  emitStockRestocked: jest.fn(),
  createSocketServer: jest.fn(),
}));

// Manual mock for Prisma
const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  centro: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  producto: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  asignacionPersonal: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  inventarioCentro: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  registroMovimiento: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  // --- Enterprise Modules (Hito 6) ---
  consumoTeorico: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  incidencia: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  reglaNotificacion: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  notificacion: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((queries) => Promise.all(queries)),
};

jest.mock('../lib/prisma', () => mockPrisma);

module.exports = { mockPrisma };
