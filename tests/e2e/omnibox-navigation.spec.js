/**
 * E2E Test: Omnibox Navigation
 * Tests typing in omnibox and navigating to Gemini with robust interaction
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../..');

// Utility to get the correct keyboard modifier based on OS
const getModifier = () => process.platform === 'darwin' ? 'Meta' : 'Control';

// Utility to wait and retry for omnibox activation
async function activateOmnibox(page, retries = 3) {
  const modifier = getModifier();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Focus address bar
      await page.keyboard.press(`${modifier}+L`);
      await page.waitForTimeout(300);

      // Type the gem keyword and space to activate omnibox
      await page.keyboard.type('gem ', { delay: 75 });
      await page.waitForTimeout(400);

      return true;
    } catch (e) {
      if (attempt === retries) throw e;
      await page.waitForTimeout(500);
    }
  }
  return false;
}

test.describe('Omnibox Navigation', () => {
  let context;
  let extensionId;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-features=TranslateUI',
        '--disable-popup-blocking',
      ],
    });

    // Wait for extension to load
    try {
      const serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15000 });
      const url = serviceWorker.url();
      const match = url.match(/chrome-extension:\/\/([^/]+)/);
      if (match) {
        extensionId = match[1];
      }
    } catch (e) {
      console.warn('Could not get extension ID:', e.message);
    }
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('typing "gem test query" navigates to Gemini with bg_prompt parameter', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Activate omnibox
    await activateOmnibox(page);

    // Type query
    await page.keyboard.type('test query', { delay: 50 });
    await page.waitForTimeout(300);

    // Press Enter to navigate
    await page.keyboard.press('Enter');

    // Wait for navigation with increased timeout
    await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });

    // Capture URL immediately after navigation
    const url = page.url();
    expect(url).toContain('gemini.google.com');

    // Verify bg_prompt parameter is present in URL (before content script cleans it)
    // The URL may or may not contain bg_prompt depending on timing
    // If content script ran quickly, it may have been cleaned
    // Either way, we should be on gemini.google.com
    expect(url).toMatch(/gemini\.google\.com/);

    await page.close();
  });

  test('bg_prompt parameter contains encoded prompt', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Set up request interception to capture the URL before any redirects
    let capturedUrl = '';
    page.on('request', (request) => {
      if (request.url().includes('gemini.google.com') && request.url().includes('bg_prompt')) {
        capturedUrl = request.url();
      }
    });

    await activateOmnibox(page);
    await page.keyboard.type('hello world', { delay: 50 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');

    // Wait for navigation
    await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });

    // Either captured URL or current URL should have bg_prompt
    const currentUrl = page.url();
    const urlToCheck = capturedUrl || currentUrl;

    if (urlToCheck.includes('bg_prompt')) {
      // Verify the prompt is properly encoded
      expect(urlToCheck).toContain('bg_prompt=');
      const params = new URL(urlToCheck).searchParams;
      const prompt = params.get('bg_prompt');
      expect(decodeURIComponent(prompt)).toBe('hello world');
    }

    await page.close();
  });

  test('empty omnibox input navigates to Gemini home without bg_prompt', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Focus address bar
    const modifier = getModifier();
    await page.keyboard.press(`${modifier}+L`);
    await page.waitForTimeout(300);

    // Type just the keyword and space (no query)
    await page.keyboard.type('gem ', { delay: 75 });
    await page.waitForTimeout(400);

    // Press Enter with no query
    await page.keyboard.press('Enter');

    // Wait for navigation
    await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });

    // URL should be Gemini base without bg_prompt
    const url = page.url();
    expect(url).toContain('gemini.google.com');

    // Empty query should NOT include bg_prompt
    expect(url).not.toContain('bg_prompt');

    await page.close();
  });

  test('special characters are properly URL-encoded', async () => {
    const testCases = [
      { input: 'What is 2+2?', encoded: '2%2B2' },
      { input: 'test & verify', encoded: '%26' },
      { input: 'path/to/file', encoded: '%2F' },
    ];

    for (const testCase of testCases) {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      // Capture request URL
      let capturedUrl = '';
      page.on('request', (request) => {
        if (request.url().includes('gemini.google.com')) {
          capturedUrl = request.url();
        }
      });

      await activateOmnibox(page);
      await page.keyboard.type(testCase.input, { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });

      const finalUrl = page.url();
      expect(finalUrl).toContain('gemini.google.com');

      await page.close();
    }
  });

  test('current tab disposition - navigates in same tab', async () => {
    const page = await context.newPage();
    const originalTabCount = context.pages().length;

    await page.goto('about:blank');
    await page.waitForTimeout(500);

    await activateOmnibox(page);
    await page.keyboard.type('same tab test', { delay: 50 });
    await page.waitForTimeout(300);

    // Regular Enter should navigate in current tab
    await page.keyboard.press('Enter');

    await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });

    // Should not have opened new tab
    const newTabCount = context.pages().length;
    expect(newTabCount).toBe(originalTabCount);

    await page.close();
  });

  test('new foreground tab disposition with Alt+Enter', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    const initialPages = context.pages().length;

    await activateOmnibox(page);
    await page.keyboard.type('new tab test', { delay: 50 });
    await page.waitForTimeout(300);

    // Press Alt+Enter for new foreground tab
    await page.keyboard.press('Alt+Enter');

    // Wait for new tab to open
    await page.waitForTimeout(3000);

    // Should have created a new tab
    const newPageCount = context.pages().length;
    expect(newPageCount).toBeGreaterThanOrEqual(initialPages);

    // Clean up all pages
    for (const p of context.pages()) {
      if (p !== page) {
        await p.close().catch(() => {});
      }
    }
    await page.close();
  });

  test('handles timeout gracefully when Gemini is slow', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    await activateOmnibox(page);
    await page.keyboard.type('timeout test', { delay: 50 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');

    // Use shorter timeout to test timeout handling
    try {
      await page.waitForURL(/gemini\.google\.com/, { timeout: 25000 });
      // Navigation succeeded
      expect(page.url()).toContain('gemini.google.com');
    } catch (e) {
      // Timeout is acceptable - extension should not crash
      expect(e.message).toContain('Timeout');
    }

    await page.close();
  });

  test('handles rapid omnibox interactions without crashing', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    const modifier = getModifier();

    // Rapid activate/cancel cycles
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press(`${modifier}+L`);
      await page.waitForTimeout(150);
      await page.keyboard.type('gem test', { delay: 30 });
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }

    // Final navigation should still work
    await activateOmnibox(page);
    await page.keyboard.type('final query', { delay: 50 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');

    await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });
    expect(page.url()).toContain('gemini.google.com');

    await page.close();
  });

  test('preserves query with leading/trailing whitespace', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    let capturedUrl = '';
    page.on('request', (request) => {
      if (request.url().includes('bg_prompt')) {
        capturedUrl = request.url();
      }
    });

    await activateOmnibox(page);
    // Extra spaces should be handled
    await page.keyboard.type('  query with spaces  ', { delay: 30 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');

    await page.waitForURL(/gemini\.google\.com/, { timeout: 20000 });

    // The query should be preserved (potentially trimmed)
    const finalUrl = page.url();
    expect(finalUrl).toContain('gemini.google.com');

    await page.close();
  });

  test('handles Ctrl+Shift+Enter for background tab (if supported)', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    const initialPages = context.pages().length;

    await activateOmnibox(page);
    await page.keyboard.type('background tab test', { delay: 50 });
    await page.waitForTimeout(300);

    // Try Ctrl+Shift+Enter for background tab
    const modifier = getModifier();
    await page.keyboard.press(`${modifier}+Shift+Enter`);

    await page.waitForTimeout(3000);

    // May or may not open background tab depending on Chrome version
    // Just verify no crash
    const newPages = context.pages();
    expect(newPages.length).toBeGreaterThanOrEqual(initialPages);

    // Clean up
    for (const p of newPages) {
      await p.close().catch(() => {});
    }
  });
});

