// =============================================================================
// Kavana CleanStock — Jest Configuration
// =============================================================================

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  setupFiles: ['./src/__tests__/setup.js'],
  verbose: true,
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/middleware/**/*.js',
    '!src/__tests__/**',
  ],
};
