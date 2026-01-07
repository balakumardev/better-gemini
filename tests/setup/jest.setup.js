/**
 * Jest Setup File
 * Configures global mocks and test utilities
 */

// Import Chrome API mocks
const { chromeMock } = require('../utils/chrome-mock');

// Setup global Chrome API mock
global.chrome = chromeMock;

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Mock window.location
delete window.location;
window.location = {
  href: 'https://gemini.google.com/app',
  search: '',
  origin: 'https://gemini.google.com',
  pathname: '/app',
  host: 'gemini.google.com',
  protocol: 'https:',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.history
window.history.replaceState = jest.fn();
window.history.pushState = jest.fn();

// Mock MutationObserver
class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observing = false;
  }

  observe(target, config) {
    this.observing = true;
    this.target = target;
    this.config = config;
  }

  disconnect() {
    this.observing = false;
  }

  // Helper to trigger mutations manually in tests
  trigger(mutations) {
    if (this.observing) {
      this.callback(mutations, this);
    }
  }
}

global.MutationObserver = MockMutationObserver;

// Mock document.execCommand
document.execCommand = jest.fn(() => true);

// Mock Selection API
const createMockSelection = () => ({
  removeAllRanges: jest.fn(),
  addRange: jest.fn(),
  rangeCount: 0,
  getRangeAt: jest.fn(),
});
let mockSelection = createMockSelection();
window.getSelection = jest.fn(() => mockSelection);

// Store reference for reset
global._mockSelection = mockSelection;
global._createMockSelection = createMockSelection;

// Mock Range
class MockRange {
  selectNodeContents() {}
  setStart() {}
  setEnd() {}
  collapse() {}
}
global.Range = MockRange;

// Create a function that returns a new MockRange instance
const createRangeImpl = () => new MockRange();
document.createRange = jest.fn(createRangeImpl);
global._createRangeImpl = createRangeImpl;

// Helper function to reset all mocks between tests
global.resetAllMocks = () => {
  chromeMock.reset();
  window.location.search = '';
  window.location.href = 'https://gemini.google.com/app';
  // Reset mock selection
  mockSelection = createMockSelection();
  global._mockSelection = mockSelection;
  window.getSelection = jest.fn(() => mockSelection);
  // Reset document.execCommand
  document.execCommand = jest.fn(() => true);
  // Reset document.createRange
  document.createRange = jest.fn(createRangeImpl);
};

// Extend Jest expect with custom matchers
expect.extend({
  toBeValidUrl(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },

  toContainEncodedParam(received, paramName, expectedValue) {
    const url = new URL(received);
    const actualValue = url.searchParams.get(paramName);
    const decodedValue = actualValue ? decodeURIComponent(actualValue) : null;
    
    const pass = decodedValue === expectedValue;
    return {
      message: () =>
        pass
          ? `expected URL not to contain param ${paramName}=${expectedValue}`
          : `expected URL to contain param ${paramName}=${expectedValue}, got ${decodedValue}`,
      pass,
    };
  },
});

// Set test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  global.resetAllMocks();
});

