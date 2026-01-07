/**
 * Test Utilities Index
 * Re-exports all utilities for convenient importing
 */

const { chromeMock, createStorageArea, createTabsMock, createOmniboxMock, createRuntimeMock } = require('./chrome-mock');
const {
  EXTENSION_PATH,
  launchBrowserWithExtension,
  createMockGeminiPage,
  waitForExtensionInjection,
  typeInOmnibox,
  cleanup,
} = require('./extension-helpers');
const {
  assertUrlHasPrompt,
  assertIsGeminiBaseUrl,
  assertUrlCleaned,
  assertTextInjected,
  createUrlBuilder,
  testData,
  generateEncodingTestCases,
} = require('./assertions');

module.exports = {
  // Chrome API mocks
  chromeMock,
  createStorageArea,
  createTabsMock,
  createOmniboxMock,
  createRuntimeMock,

  // Extension helpers
  EXTENSION_PATH,
  launchBrowserWithExtension,
  createMockGeminiPage,
  waitForExtensionInjection,
  typeInOmnibox,
  cleanup,

  // Assertions
  assertUrlHasPrompt,
  assertIsGeminiBaseUrl,
  assertUrlCleaned,
  assertTextInjected,
  createUrlBuilder,
  testData,
  generateEncodingTestCases,
};

