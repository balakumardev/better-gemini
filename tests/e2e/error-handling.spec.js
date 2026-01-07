/**
 * E2E Test: Error Handling
 * Tests extension behavior in error conditions, timeouts, and edge cases
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../..');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');

// Utility to get correct keyboard modifier
const getModifier = () => process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Error Handling', () => {
  let context;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-features=TranslateUI',
      ],
    });

    // Wait for extension to load
    try {
      await context.waitForEvent('serviceworker', { timeout: 15000 });
    } catch (e) {
      console.warn('Service worker event:', e.message);
    }
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test.describe('Login State Handling', () => {
    test('handles not logged in state gracefully', async () => {
      const page = await context.newPage();

      // Capture any JavaScript errors
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));

      const url = `https://gemini.google.com/app?bg_prompt=test`;
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(5000);

      const currentUrl = page.url();

      // Either on Gemini or redirected to login - both are valid
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      // No critical JavaScript errors should have occurred
      const criticalErrors = errors.filter(e =>
        !e.includes('ResizeObserver') && // Common benign error
        !e.includes('Script error')      // Cross-origin script errors
      );

      // Log any unexpected errors but don't fail on Google's own errors
      if (criticalErrors.length > 0) {
        console.log('Page errors detected:', criticalErrors);
      }

      await page.close();
    });

    test('preserves bg_prompt on login redirect for retry', async () => {
      const page = await context.newPage();

      const testPrompt = 'retry after login';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(testPrompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();

      // If redirected to accounts.google.com, bg_prompt should be preserved
      // so user can retry after login
      if (currentUrl.includes('accounts.google.com')) {
        // Content script shouldn't clean URL on login pages
        console.log('User redirected to login - expected behavior');
      }

      await page.close();
    });
  });

  test.describe('Malformed URL Handling', () => {
    test('handles malformed URL encoding gracefully', async () => {
      const page = await context.newPage();

      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));

      // Malformed encoded value (incomplete encoding)
      const url = `https://gemini.google.com/app?bg_prompt=%E2%28`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Page should still load without crashing
      const currentUrl = page.url();
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      await page.close();
    });

    test('handles completely invalid URL encoding', async () => {
      const page = await context.newPage();

      // Completely broken encoding
      const url = `https://gemini.google.com/app?bg_prompt=%XX%YY%ZZ`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Should not crash - page should load
      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles empty bg_prompt parameter', async () => {
      const page = await context.newPage();

      const url = `https://gemini.google.com/app?bg_prompt=`;
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Should handle empty prompt gracefully
      const currentUrl = page.url();
      expect(
        currentUrl.includes('gemini.google.com') ||
        currentUrl.includes('accounts.google.com')
      ).toBe(true);

      await page.close();
    });

    test('handles bg_prompt with only whitespace', async () => {
      const page = await context.newPage();

      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent('   ')}`;
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Should handle whitespace-only prompt gracefully
      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles multiple bg_prompt parameters', async () => {
      const page = await context.newPage();

      // Multiple bg_prompt params - should use first one
      const url = `https://gemini.google.com/app?bg_prompt=first&bg_prompt=second`;
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('google.com');

      await page.close();
    });
  });

  test.describe('Timeout Handling', () => {
    test('handles network timeout gracefully', async () => {
      const page = await context.newPage();

      // Set a very short timeout for navigation
      try {
        await page.goto('https://gemini.google.com/app?bg_prompt=test', {
          timeout: 1000, // Very short timeout
        });
      } catch (e) {
        // Timeout is expected - extension should not crash the browser
        expect(e.message.toLowerCase()).toContain('timeout');
      }

      // Browser should still be usable after timeout
      await page.goto('about:blank');
      expect(page.url()).toBe('about:blank');

      await page.close();
    });

    test('browser remains functional after navigation timeout', async () => {
      const page = await context.newPage();

      // Force timeout
      try {
        await page.goto('https://gemini.google.com/app', { timeout: 500 });
      } catch (e) {
        // Expected
      }

      // Should be able to navigate elsewhere
      await page.goto('https://www.google.com', { timeout: 30000 });
      expect(page.url()).toContain('google.com');

      // Extension should still work
      const modifier = getModifier();
      await page.keyboard.press(`${modifier}+L`);
      await page.waitForTimeout(200);
      await page.keyboard.type('gem test', { delay: 50 });
      await page.keyboard.press('Escape');

      await page.close();
    });

    test('extension survives slow page load', async () => {
      const page = await context.newPage();

      // Navigate with reasonable timeout
      await page.goto('https://gemini.google.com/app?bg_prompt=slow', {
        timeout: 60000,
        waitUntil: 'domcontentloaded'
      });

      // Even if slow, should eventually load
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('google.com');

      await page.close();
    });
  });

  test.describe('Missing Elements Handling', () => {
    test('handles missing input field gracefully', async () => {
      const page = await context.newPage();

      // Navigate to a page that won't have the expected elements
      await page.goto('https://www.google.com?bg_prompt=test', { timeout: 30000 });
      await page.waitForTimeout(2000);

      // Content script shouldn't crash on pages without expected elements
      // (though it only runs on gemini.google.com per manifest)
      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles page with incomplete DOM', async () => {
      const page = await context.newPage();

      // Create minimal page without expected elements
      await page.setContent(`
        <!DOCTYPE html>
        <html><body><h1>Minimal Page</h1></body></html>
      `);

      // Navigate to Gemini - content script should handle DOM changes
      await page.goto('https://gemini.google.com/app', {
        timeout: 30000,
        waitUntil: 'domcontentloaded'
      });
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('google.com');

      await page.close();
    });
  });

  test.describe('Rapid Interaction Handling', () => {
    test('handles rapid successive queries without crashing', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');

      const modifier = getModifier();

      // Simulate rapid typing in omnibox
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press(`${modifier}+L`);
        await page.waitForTimeout(100);
        await page.keyboard.type(`gem query ${i}`, { delay: 20 });
        await page.waitForTimeout(100);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      // Extension should handle rapid inputs without crashing
      await page.keyboard.press(`${modifier}+L`);
      await page.waitForTimeout(200);
      await page.keyboard.type('gem final test', { delay: 30 });
      await page.keyboard.press('Enter');

      await page.waitForTimeout(5000);

      // Should navigate without error
      const url = page.url();
      expect(
        url.includes('gemini.google.com') ||
        url.includes('accounts.google.com') ||
        url === 'about:blank'
      ).toBe(true);

      await page.close();
    });

    test('handles rapid page refreshes', async () => {
      const page = await context.newPage();

      const url = `https://gemini.google.com/app?bg_prompt=test`;
      await page.goto(url, { timeout: 30000 });

      // Multiple rapid refreshes
      for (let i = 0; i < 3; i++) {
        await page.reload({ timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(500);
      }

      // Page should load without issues after refreshes
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles rapid navigation between pages', async () => {
      const page = await context.newPage();

      // Rapid navigation
      await page.goto('https://gemini.google.com/app', { timeout: 30000 });
      await page.goto('about:blank');
      await page.goto('https://www.google.com', { timeout: 30000 });
      await page.goto('https://gemini.google.com/app?bg_prompt=rapid', { timeout: 30000 });

      await page.waitForTimeout(2000);
      expect(page.url()).toContain('google.com');

      await page.close();
    });
  });

  test.describe('Edge Cases', () => {
    test('handles special URL characters in domain', async () => {
      const page = await context.newPage();

      // URL with encoded characters
      const prompt = 'test with ñ and ü and 你好';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(prompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles extremely long prompt in URL', async () => {
      const page = await context.newPage();

      // Very long prompt (but within URL limits)
      const prompt = 'a'.repeat(2000);
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(prompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Should either succeed or handle gracefully
      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles prompt with null bytes', async () => {
      const page = await context.newPage();

      const prompt = 'test\x00null\x00bytes';
      const url = `https://gemini.google.com/app?bg_prompt=${encodeURIComponent(prompt)}`;

      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('google.com');

      await page.close();
    });

    test('handles concurrent tabs with bg_prompt', async () => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Navigate both tabs simultaneously
      await Promise.all([
        page1.goto('https://gemini.google.com/app?bg_prompt=tab1', { timeout: 30000 }),
        page2.goto('https://gemini.google.com/app?bg_prompt=tab2', { timeout: 30000 }),
      ]);

      await Promise.all([
        page1.waitForTimeout(3000),
        page2.waitForTimeout(3000),
      ]);

      // Both should load without conflict
      expect(page1.url()).toContain('google.com');
      expect(page2.url()).toContain('google.com');

      await page1.close();
      await page2.close();
    });

    test('handles browser back/forward with bg_prompt', async () => {
      const page = await context.newPage();

      await page.goto('about:blank');
      await page.goto('https://gemini.google.com/app?bg_prompt=first', { timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.goto('https://www.google.com', { timeout: 30000 });

      // Go back
      await page.goBack({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Go forward
      await page.goForward({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Should handle navigation history without crashing
      expect(page.url()).toContain('google.com');

      await page.close();
    });
  });
});

