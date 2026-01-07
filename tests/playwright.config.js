/**
 * Playwright Configuration for Better Gemini E2E Tests
 *
 * Tests extension behavior in a real browser environment.
 * Note: Extensions require headed mode (headless: false)
 */

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

// Extension and fixtures paths
const EXTENSION_PATH = path.resolve(__dirname, '..');
const FIXTURES_PATH = path.resolve(__dirname, 'e2e/fixtures');

module.exports = defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file pattern
  testMatch: '**/*.spec.js',

  // Timeout for each test (increased for extension loading)
  timeout: 90000,

  // Timeout for expect assertions
  expect: {
    timeout: 15000,
  },

  // Run tests serially - Chrome extensions don't work well with parallel
  fullyParallel: false,
  workers: 1,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (extensions can be flaky)
  retries: process.env.CI ? 3 : 1,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'https://gemini.google.com',

    // Trace on first retry (helps debug flaky tests)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording on retry
    video: 'on-first-retry',

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Note: Actual browser launch happens in test files
        // with launchPersistentContext for extension support
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results',

  // Preserve output on failure
  preserveOutput: 'failures-only',

  // Global setup - validates extension structure
  globalSetup: require.resolve('./setup/playwright.global-setup.js'),

  // Global teardown - cleanup and reporting
  globalTeardown: require.resolve('./setup/playwright.global-teardown.js'),

  // Metadata for reports
  metadata: {
    extensionPath: EXTENSION_PATH,
    fixturesPath: FIXTURES_PATH,
    testType: 'e2e-extension',
  },
});

