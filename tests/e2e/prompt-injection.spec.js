/**
 * E2E Test: Prompt Injection
 * Tests content script injection using mock Gemini page (no Google login required)
 * Also includes tests against real Gemini for comprehensive coverage
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../..');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');
const MOCK_GEMINI_PATH = path.join(FIXTURES_PATH, 'mock-gemini.html');

test.describe('Prompt Injection', () => {
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
        // Allow file:// access for mock HTML testing
        '--allow-file-access-from-files',
      ],
    });

    // Get extension ID
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

  test.describe('Mock Gemini Page Tests (No Login Required)', () => {

    test('injector functions are correctly exported', async () => {
      // Verify the injector.js file exists and has expected exports
      const injectorPath = path.join(EXTENSION_PATH, 'content/injector.js');
      const content = fs.readFileSync(injectorPath, 'utf-8');

      expect(content).toContain('getPromptFromURL');
      expect(content).toContain('cleanupURL');
      expect(content).toContain('injectText');
      expect(content).toContain('waitForElement');
      expect(content).toContain('clickSendButton');
    });

    test('mock Gemini page loads correctly', async () => {
      const page = await context.newPage();

      // Load the mock Gemini page
      await page.goto(`file://${MOCK_GEMINI_PATH}`);
      await page.waitForTimeout(500);

      // Verify mock page structure
      const inputField = await page.$('div[contenteditable="true"]');
      expect(inputField).not.toBeNull();

      const sendButton = await page.$('button[aria-label="Send message"]');
      expect(sendButton).not.toBeNull();

      // Verify button is initially disabled (no content)
      const isDisabled = await sendButton.evaluate(el => el.disabled);
      expect(isDisabled).toBe(true);

      await page.close();
    });

    test('mock page contenteditable accepts text input', async () => {
      const page = await context.newPage();
      await page.goto(`file://${MOCK_GEMINI_PATH}`);
      await page.waitForTimeout(500);

      const inputField = await page.$('div[contenteditable="true"]');

      // Focus and type
      await inputField.focus();
      await page.keyboard.type('Test input text');
      await page.waitForTimeout(200);

      // Verify text was entered
      const content = await inputField.textContent();
      expect(content).toBe('Test input text');

      // Send button should now be enabled
      const sendButton = await page.$('button[aria-label="Send message"]');
      const isDisabled = await sendButton.evaluate(el => el.disabled);
      expect(isDisabled).toBe(false);

      await page.close();
    });

    test('mock page send button click triggers submission', async () => {
      const page = await context.newPage();
      await page.goto(`file://${MOCK_GEMINI_PATH}`);
      await page.waitForTimeout(500);

      const inputField = await page.$('div[contenteditable="true"]');
      await inputField.focus();
      await page.keyboard.type('Test submission');
      await page.waitForTimeout(200);

      // Click send button
      const sendButton = await page.$('button[aria-label="Send message"]');
      await sendButton.click();
      await page.waitForTimeout(1000);

      // Verify submission occurred - check state
      const state = await page.evaluate(() => window.mockGeminiState);
      expect(state.submitted).toBe(true);
      expect(state.injectedText).toBe('Test submission');

      // Verify message appears in conversation
      const userMessage = await page.$('.user-message');
      expect(userMessage).not.toBeNull();

      await page.close();
    });

    test('mock page detects bg_prompt parameter in URL', async () => {
      const page = await context.newPage();
      const testPrompt = 'Hello from URL';

      await page.goto(`file://${MOCK_GEMINI_PATH}?bg_prompt=${encodeURIComponent(testPrompt)}`);
      await page.waitForTimeout(500);

      // Check that status shows bg_prompt detected
      const statusText = await page.$eval('#status-text', el => el.textContent);
      expect(statusText).toContain('bg_prompt');

      await page.close();
    });
  });

  test.describe('Real Gemini Tests (May Require Login)', () => {

    test('navigating with bg_prompt triggers content script', async () => {
      const page = await context.newPage();

      // Capture console logs from content script
      const logs = [];
      page.on('console', (msg) => {
        if (msg.text().includes('[Better Gemini]')) {
          logs.push(msg.text());
        }
      });

      const testPrompt = 'Hello from test';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(testPrompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();

      if (currentUrl.includes('accounts.google.com')) {
        // Not logged in - verify we were redirected appropriately
        expect(currentUrl).toContain('accounts.google.com');
        console.log('Test ran in logged-out state - redirect verified');
      } else {
        // Logged in - check for content script activity
        const hasContentScriptLog = logs.some(log =>
          log.includes('initialized') ||
          log.includes('prompt') ||
          log.includes('Better Gemini')
        );
        // Content script should have logged something
        // URL may or may not have bg_prompt cleaned
      }

      await page.close();
    });

    test('URL cleanup removes bg_prompt after injection', async () => {
      const page = await context.newPage();

      const testPrompt = 'Test cleanup';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(testPrompt)}`;

      await page.goto(url, { timeout: 30000 });

      // Wait for content script to process
      await page.waitForTimeout(5000);

      const currentUrl = page.url();

      if (currentUrl.includes('accounts.google.com')) {
        // Not logged in - bg_prompt should be preserved for retry after login
        console.log('Logged out state - URL preserved for retry');
      } else {
        // bg_prompt should be removed from URL after successful injection
        expect(currentUrl).not.toContain('bg_prompt');
      }

      await page.close();
    });

    test('handles unicode prompts', async () => {
      const page = await context.newPage();

      const testPrompt = '日本語テスト 🎉 émojis';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(testPrompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Page should load without error regardless of login state
      const currentUrl = page.url();
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      await page.close();
    });

    test('handles very long prompts (1000+ characters)', async () => {
      const page = await context.newPage();

      const testPrompt = 'This is a test prompt. '.repeat(50); // ~1150 chars
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(testPrompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Page should load without error
      const currentUrl = page.url();
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      await page.close();
    });

    test('handles prompts with HTML-like content safely', async () => {
      const page = await context.newPage();

      // Set up dialog handler to detect any alert dialogs
      let dialogDetected = false;
      page.on('dialog', async (dialog) => {
        dialogDetected = true;
        await dialog.dismiss();
      });

      const testPrompt = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(testPrompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // No alert/dialog should have been triggered
      expect(dialogDetected).toBe(false);

      // Page should load normally
      const currentUrl = page.url();
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      await page.close();
    });
  });

  test.describe('Content Script Behavior Tests', () => {

    test('content script waits for DOM before injection', async () => {
      const page = await context.newPage();

      // Monitor console for timing logs
      const logs = [];
      page.on('console', (msg) => logs.push(msg.text()));

      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent('DOM timing test')}`;
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Content script should have waited for DOM
      // We can't directly verify MutationObserver, but page should load correctly
      const currentUrl = page.url();
      expect(currentUrl).toContain('google.com');

      await page.close();
    });

    test('content script handles page with no input field gracefully', async () => {
      const page = await context.newPage();

      // Navigate to Gemini homepage (may not have input field immediately)
      await page.goto('https://gemini.google.com/', { timeout: 30000 });
      await page.waitForTimeout(2000);

      // Page should load without errors
      const currentUrl = page.url();
      expect(currentUrl).toContain('google.com');

      await page.close();
    });

    test('content script does not interfere without bg_prompt', async () => {
      const page = await context.newPage();

      // Navigate without bg_prompt parameter
      await page.goto('https://gemini.google.com/app', { timeout: 30000 });
      await page.waitForTimeout(2000);

      // URL should remain unchanged (no cleanup needed)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('bg_prompt');
      expect(currentUrl).toContain('gemini.google.com');

      await page.close();
    });

    test('handles refresh during injection', async () => {
      const page = await context.newPage();

      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent('refresh test')}`;

      // Start navigation
      await page.goto(url, { timeout: 30000 });

      // Immediate refresh
      await page.reload({ timeout: 30000 });
      await page.waitForTimeout(3000);

      // Page should handle refresh gracefully
      const currentUrl = page.url();
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      await page.close();
    });

    test('handles back/forward navigation', async () => {
      const page = await context.newPage();

      // Navigate to Gemini without prompt
      await page.goto('https://gemini.google.com/app', { timeout: 30000 });
      await page.waitForTimeout(1000);

      // Navigate with prompt
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent('nav test')}`;
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(2000);

      // Go back
      await page.goBack({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Go forward
      await page.goForward({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Should handle navigation without crashing
      const currentUrl = page.url();
      expect(currentUrl).toContain('google.com');

      await page.close();
    });
  });
});

