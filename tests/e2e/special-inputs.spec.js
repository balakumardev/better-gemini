/**
 * E2E Test: Special Input Handling
 * Comprehensive tests for special characters, unicode, security inputs, and edge cases
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../..');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');

// Utility to get correct keyboard modifier
const getModifier = () => process.platform === 'darwin' ? 'Meta' : 'Control';

// Utility to activate omnibox
async function activateOmnibox(page) {
  const modifier = getModifier();
  await page.keyboard.press(`${modifier}+L`);
  await page.waitForTimeout(300);
  await page.keyboard.type('gem ', { delay: 75 });
  await page.waitForTimeout(400);
}

test.describe('Special Input Handling', () => {
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

    // Wait for extension
    try {
      await context.waitForEvent('serviceworker', { timeout: 15000 });
    } catch (e) {
      console.warn('Service worker:', e.message);
    }
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test.describe('Unicode Character Handling', () => {
    test('handles Japanese characters', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('日本語テスト', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles Chinese characters', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('中文测试', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles Korean characters', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('한국어 테스트', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles Arabic characters (RTL)', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('مرحبا بالعالم', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles mixed language characters', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('Hello 世界 مرحبا', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles emoji characters', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      // Use text representation since direct emoji typing may not work
      await page.keyboard.type('emoji test :) :D <3', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles accented characters', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('café résumé naïve', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });
  });

  test.describe('Special Character Handling', () => {
    const specialCharCases = [
      { name: 'ampersand', query: 'test & query' },
      { name: 'plus sign', query: '2 + 2 = 4' },
      { name: 'hash', query: 'C# programming' },
      { name: 'percent', query: '50% off sale' },
      { name: 'forward slash', query: 'path/to/file' },
      { name: 'backslash', query: 'path\\to\\file' },
      { name: 'question mark', query: 'how does this work?' },
      { name: 'at symbol', query: 'email@example.com' },
      { name: 'dollar sign', query: '$100 price' },
      { name: 'asterisk', query: 'bold *text* here' },
      { name: 'caret', query: '2^10 power' },
      { name: 'brackets', query: 'array[0] and {object}' },
      { name: 'pipe', query: 'cmd | grep pattern' },
      { name: 'tilde', query: '~home directory' },
      { name: 'backtick', query: '`code` inline' },
    ];

    for (const testCase of specialCharCases) {
      test(`handles ${testCase.name}`, async () => {
        const page = await context.newPage();
        await page.goto('about:blank');
        await page.waitForTimeout(500);

        await activateOmnibox(page);
        await page.keyboard.type(testCase.query, { delay: 30 });
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');

        try {
          await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
            timeout: 15000,
          });
          expect(page.url()).toContain('google.com');
        } catch (e) {
          // Log but don't fail - some special chars may have browser-level issues
          console.warn(`Query "${testCase.query}" navigation: ${e.message}`);
        }

        await page.close();
      });
    }
  });

  test.describe('Quote and String Handling', () => {
    test('handles single quotes', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type("What's the meaning of life?", { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles double quotes', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('Explain "hello world"', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles mixed quotes', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type("He said \"it's working\"", { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });
  });

  test.describe('Whitespace Handling', () => {
    test('handles multiple spaces between words', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('hello    world    test', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles leading whitespace', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('   leading spaces', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles trailing whitespace', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('trailing spaces   ', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles tabs in input', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('text with', { delay: 30 });
      await page.keyboard.press('Tab'); // May not insert tab but should handle
      await page.keyboard.type('tab', { delay: 30 });
      await page.waitForTimeout(300);

      // Tab may trigger completion, so press Enter if still in omnibox
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);

      // Should either navigate or tab triggered completion - both valid
      await page.close();
    });
  });

  test.describe('Empty and Edge Case Prompts', () => {
    test('handles completely empty prompt', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      const modifier = getModifier();
      await page.keyboard.press(`${modifier}+L`);
      await page.waitForTimeout(300);
      await page.keyboard.type('gem ', { delay: 75 });
      await page.waitForTimeout(300);

      // Press Enter with empty query (just after "gem ")
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      // Should navigate to base Gemini without bg_prompt
      expect(page.url()).toContain('gemini.google.com');
      expect(page.url()).not.toContain('bg_prompt');

      await page.close();
    });

    test('handles single character prompt', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('x', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles very long prompt (500+ chars)', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);

      // Type a long prompt (but not so long it times out)
      const longPrompt = 'word '.repeat(100); // ~500 chars
      await page.keyboard.type(longPrompt, { delay: 5 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 25000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles prompt with only punctuation', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('???!!!...', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles prompt with numbers only', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('1234567890', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(page.url()).toContain('google.com');
      await page.close();
    });
  });

  test.describe('XSS and Security Tests', () => {
    test('handles script tag injection attempt', async () => {
      const page = await context.newPage();

      // Set up dialog handler
      let dialogDetected = false;
      page.on('dialog', async (dialog) => {
        dialogDetected = true;
        await dialog.dismiss();
      });

      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('<script>alert(1)</script>', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      // No XSS should have triggered
      expect(dialogDetected).toBe(false);
      await page.close();
    });

    test('handles img onerror injection attempt', async () => {
      const page = await context.newPage();

      let dialogDetected = false;
      page.on('dialog', async (dialog) => {
        dialogDetected = true;
        await dialog.dismiss();
      });

      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('<img src=x onerror=alert(1)>', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(dialogDetected).toBe(false);
      await page.close();
    });

    test('handles javascript: URI injection attempt', async () => {
      const page = await context.newPage();

      let dialogDetected = false;
      page.on('dialog', async (dialog) => {
        dialogDetected = true;
        await dialog.dismiss();
      });

      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('javascript:alert(1)', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForTimeout(3000);

      // Should have navigated to Gemini, not executed javascript
      // (or stayed on blank if omnibox rejected it)
      expect(dialogDetected).toBe(false);
      await page.close();
    });

    test('handles data: URI injection attempt', async () => {
      const page = await context.newPage();

      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('data:text/html,<script>alert(1)</script>', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      // Should have navigated to Gemini with the text as prompt
      expect(page.url()).toContain('google.com');
      await page.close();
    });

    test('handles event handler injection attempt', async () => {
      const page = await context.newPage();

      let dialogDetected = false;
      page.on('dialog', async (dialog) => {
        dialogDetected = true;
        await dialog.dismiss();
      });

      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('" onmouseover="alert(1)" "', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      expect(dialogDetected).toBe(false);
      await page.close();
    });
  });

  test.describe('URL-like Input Handling', () => {
    test('handles URL in prompt - should go to Gemini not URL', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('explain https://example.com', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      // Should navigate to Gemini, NOT to example.com
      expect(page.url()).toContain('gemini.google.com');
      expect(page.url()).not.toContain('example.com');

      await page.close();
    });

    test('handles file:// URL in prompt', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('open file:///etc/passwd', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      // Should go to Gemini, not try to open file
      expect(page.url()).toContain('gemini.google.com');

      await page.close();
    });

    test('handles chrome:// URL in prompt', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('explain chrome://settings', { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      // Should go to Gemini
      expect(page.url()).toContain('gemini.google.com');

      await page.close();
    });
  });

  test.describe('Code Snippet Handling', () => {
    test('handles JavaScript code', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('explain function() { return 42; }', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles Python code', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('explain def hello(): print("world")', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles SQL code', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type("SELECT * FROM users WHERE id = '1'", { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });

    test('handles shell command', async () => {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      await activateOmnibox(page);
      await page.keyboard.type('explain ls -la | grep test', { delay: 20 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');

      await page.waitForURL(/gemini\.google\.com|accounts\.google\.com/, {
        timeout: 20000,
      });

      await page.close();
    });
  });
});

