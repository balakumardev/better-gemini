/**
 * Extension Test Helpers
 * Utilities for testing Chrome extensions with Playwright
 */

const { chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../..');

/**
 * Launches a browser with the extension loaded
 * @param {Object} options - Launch options
 * @returns {Promise<{browser, context, extensionId}>}
 */
async function launchBrowserWithExtension(options = {}) {
  const {
    headless = false,
    slowMo = 0,
    devtools = false,
  } = options;

  // Note: Extensions cannot run in headless mode
  // Use headless: false or 'new' for headed mode
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Extensions require headed mode
    slowMo,
    devtools,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-popup-blocking',
    ],
  });

  // Get extension ID from service worker
  let extensionId = null;
  try {
    // Wait for service worker to register
    const serviceWorkerPage = await context.waitForEvent('serviceworker', { timeout: 5000 });
    const url = serviceWorkerPage.url();
    // Extract extension ID from URL (chrome-extension://EXTENSION_ID/...)
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    if (match) {
      extensionId = match[1];
    }
  } catch (e) {
    console.warn('Could not get extension ID from service worker:', e.message);
  }

  return { browser: context.browser(), context, extensionId };
}

/**
 * Creates a mock Gemini page for testing
 * @param {Page} page - Playwright page instance
 */
async function createMockGeminiPage(page) {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Gemini</title>
    </head>
    <body>
      <div id="app">
        <div class="chat-container">
          <div contenteditable="true" 
               class="ql-editor" 
               data-placeholder="Enter a prompt here"
               id="prompt-input">
          </div>
          <button id="send-button" aria-label="Send message">Send</button>
        </div>
        <div id="responses"></div>
      </div>
      <script>
        // Simulate React-like behavior
        const input = document.getElementById('prompt-input');
        const sendBtn = document.getElementById('send-button');
        const responses = document.getElementById('responses');
        
        sendBtn.addEventListener('click', () => {
          const text = input.textContent.trim();
          if (text) {
            const div = document.createElement('div');
            div.className = 'response';
            div.textContent = 'Response to: ' + text;
            responses.appendChild(div);
            input.textContent = '';
          }
        });
        
        // Track input for testing
        input.addEventListener('input', () => {
          window.__lastInput = input.textContent;
        });
      </script>
    </body>
    </html>
  `);
}

/**
 * Waits for the extension to inject content
 * @param {Page} page - Playwright page instance
 * @param {number} timeout - Timeout in ms
 */
async function waitForExtensionInjection(page, timeout = 10000) {
  await page.waitForFunction(
    () => window.__betterGeminiInjected === true,
    { timeout }
  ).catch(() => {
    // Extension may not set this flag, check for other indicators
  });
}

/**
 * Simulates typing in the omnibox
 * @param {Page} page - Playwright page instance
 * @param {string} keyword - Extension keyword (e.g., "gem")
 * @param {string} query - Query to type
 */
async function typeInOmnibox(page, keyword, query) {
  // Focus address bar with keyboard shortcut
  await page.keyboard.press('Control+L');
  await page.waitForTimeout(100);
  
  // Type keyword and space to activate extension
  await page.keyboard.type(`${keyword} `, { delay: 50 });
  await page.waitForTimeout(200);
  
  // Type the query
  await page.keyboard.type(query, { delay: 30 });
  
  return { keyword, query };
}

/**
 * Cleans up browser resources
 * @param {Browser} browser - Browser instance
 * @param {BrowserContext} context - Context instance
 */
async function cleanup(browser, context) {
  if (context) await context.close();
  if (browser) await browser.close();
}

module.exports = {
  EXTENSION_PATH,
  launchBrowserWithExtension,
  createMockGeminiPage,
  waitForExtensionInjection,
  typeInOmnibox,
  cleanup,
};

