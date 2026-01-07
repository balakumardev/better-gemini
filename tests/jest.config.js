/**
 * Jest Configuration for Better Gemini Extension Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/setup/jest.setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Module name mapper for resolving imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1',
    '^@tests/(.*)$': '<rootDir>/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    '<rootDir>/../*.js',
    '<rootDir>/../content/**/*.js',
    '!<rootDir>/../**/node_modules/**',
    '!<rootDir>/../tests/**',
    '!<rootDir>/../**/icons/**',
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Test patterns
  testMatch: [
    '<rootDir>/unit/**/*.test.js',
    '<rootDir>/integration/**/*.test.js',
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Timeout for tests (in milliseconds)
  testTimeout: 10000,

  // Maximum workers for parallel tests
  maxWorkers: '50%',

  // Reporter configuration
  reporters: ['default'],
};

