/**
 * Better Gemini - Background Service Worker
 *
 * This service worker handles the omnibox integration for quick Gemini access.
 * Users can type "gem" in the address bar followed by their prompt to navigate
 * directly to Google Gemini with their query pre-filled.
 *
 * Usage: Type "gem " in the address bar, then enter your prompt
 * Example: "gem explain quantum computing" -> opens Gemini with that prompt
 */

// ========== ENVIRONMENT DETECTION ==========
// Detect if running in Node.js test environment vs Chrome extension
const IS_TEST_ENV = typeof module !== 'undefined' && module.exports;
const IS_CHROME_ENV = typeof chrome !== 'undefined' && chrome.omnibox;

// ========== CONFIG IMPORT ==========
// In Chrome extension: use ES6 import
// In Node.js test: config will be injected or mocked
let URL_PARAM = 'bg_prompt';
let DEBUG = true;

// Dynamic import for Chrome extension environment
if (IS_CHROME_ENV) {
  import('./config.js').then(config => {
    URL_PARAM = config.URL_PARAM;
    DEBUG = config.DEBUG;
  }).catch(() => {
    // Fallback to defaults if import fails
    console.log('[Better Gemini] Using default config values');
  });
}

// ========== CONSTANTS ==========

/**
 * Base URL for Google Gemini web application
 * The bg_prompt parameter will be appended to pass the user's query
 */
const GEMINI_BASE_URL = 'https://gemini.google.com/app';

// ========== UTILITY FUNCTIONS ==========

/**
 * Log messages only when DEBUG mode is enabled
 * @param  {...any} args - Arguments to log
 */
function log(...args) {
  if (DEBUG) {
    console.log('[Better Gemini]', ...args);
  }
}

/**
 * Log errors (always logged regardless of DEBUG mode)
 * @param  {...any} args - Arguments to log
 */
function logError(...args) {
  console.error('[Better Gemini]', ...args);
}

// ========== URL BUILDING ==========

/**
 * Build the Gemini URL with the encoded prompt parameter
 *
 * @param {string} prompt - The user's prompt text
 * @param {string} [urlParam] - Optional URL parameter name (for testing)
 * @returns {string} - The complete URL with encoded prompt
 */
function buildGeminiUrl(prompt, urlParam = URL_PARAM) {
  // Use encodeURIComponent to safely encode the prompt for URL transmission
  // This handles special characters, spaces, unicode, emojis, etc.
  const encodedPrompt = encodeURIComponent(prompt);

  return `${GEMINI_BASE_URL}?${urlParam}=${encodedPrompt}`;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Escape XML special characters for omnibox suggestion descriptions
 * Chrome's omnibox uses XML for formatting, so we need to escape special chars
 *
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for XML
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========== NAVIGATION ==========

/**
 * Navigate to a URL based on the disposition (how user invoked the action)
 *
 * @param {string} url - The URL to navigate to
 * @param {string} disposition - How to open the URL:
 *   - "currentTab": Open in current tab (default - Enter key)
 *   - "newForegroundTab": Open in new foreground tab (Alt+Enter on Windows/Linux, Option+Enter on Mac)
 *   - "newBackgroundTab": Open in new background tab (Meta/Ctrl+Enter)
 * @param {object} [chromeApi] - Optional Chrome API object (for testing)
 */
async function navigateToUrl(url, disposition, chromeApi = (typeof chrome !== 'undefined' ? chrome : null)) {
  if (!chromeApi || !chromeApi.tabs) {
    throw new Error('Chrome tabs API not available');
  }

  try {
    switch (disposition) {
      case 'newForegroundTab':
        // Open in a new tab and switch to it (Alt+Enter / Option+Enter)
        log('Opening in new foreground tab');
        await chromeApi.tabs.create({ url, active: true });
        break;

      case 'newBackgroundTab':
        // Open in a new tab but don't switch to it (Ctrl/Cmd+Enter)
        log('Opening in new background tab');
        await chromeApi.tabs.create({ url, active: false });
        break;

      case 'currentTab':
      default:
        // Update the current active tab (default behavior - just Enter)
        log('Opening in current tab');
        const [activeTab] = await chromeApi.tabs.query({
          active: true,
          currentWindow: true
        });

        if (activeTab && activeTab.id) {
          await chromeApi.tabs.update(activeTab.id, { url });
        } else {
          // Fallback: if no active tab found, create a new one
          log('No active tab found, creating new tab as fallback');
          await chromeApi.tabs.create({ url, active: true });
        }
        break;
    }
  } catch (error) {
    logError('Navigation failed:', error);
    throw error;
  }
}

// ========== INPUT HANDLER ==========

/**
 * Handle omnibox input entered (user pressed Enter or clicked suggestion)
 * This is the main handler that navigates to Gemini with the user's prompt
 *
 * @param {string} text - The text entered by the user after "gem "
 * @param {string} disposition - How the URL should be opened
 * @param {object} [chromeApi] - Optional Chrome API object (for testing)
 * @param {string} [urlParam] - Optional URL parameter name (for testing)
 */
async function handleInputEntered(text, disposition, chromeApi = (typeof chrome !== 'undefined' ? chrome : null), urlParam = URL_PARAM) {
  log('Input entered:', { text, disposition });

  // Handle empty or whitespace-only input
  const trimmedText = text.trim();

  if (!trimmedText) {
    // If no text provided, just open Gemini home page
    log('Empty input, navigating to Gemini home');
    await navigateToUrl(GEMINI_BASE_URL, disposition, chromeApi);
    return;
  }

  try {
    // Construct the URL with the encoded prompt
    const geminiUrl = buildGeminiUrl(trimmedText, urlParam);
    log('Navigating to:', geminiUrl);

    // Navigate based on the disposition
    await navigateToUrl(geminiUrl, disposition, chromeApi);

    log('Navigation successful');
  } catch (error) {
    // Log the error
    logError('Error navigating to Gemini:', error);

    // Fallback: try to open Gemini home page instead of leaving user stuck
    try {
      log('Attempting fallback navigation to Gemini home');
      await navigateToUrl(GEMINI_BASE_URL, disposition, chromeApi);
    } catch (fallbackError) {
      logError('Fallback navigation also failed:', fallbackError);
    }
  }
}

// ========== CHROME EXTENSION INITIALIZATION ==========
// Only register Chrome event listeners when running in extension context

if (IS_CHROME_ENV) {
  // ========== OMNIBOX EVENT HANDLERS ==========

  /**
   * Handle omnibox input changes (fires as user types after the keyword)
   * Provides suggestions showing what will happen when Enter is pressed
   */
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    log('Input changed:', text);

    const trimmedText = text.trim();

    // Only show suggestion if there's actual content
    if (trimmedText) {
      // Provide a suggestion showing what the user is about to send
      suggest([
        {
          content: trimmedText,
          description: `Ask Gemini: "${escapeXml(trimmedText)}"`
        }
      ]);
    }
  });

  /**
   * Handle omnibox input entered (user pressed Enter or clicked suggestion)
   */
  chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
    await handleInputEntered(text, disposition);
  });

  // ========== LIFECYCLE EVENTS ==========

  /**
   * Handle extension installation and updates
   */
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      log('Extension installed');
      // Could open onboarding page here if needed
    } else if (details.reason === 'update') {
      log('Extension updated to version', chrome.runtime.getManifest().version);
    }
  });

  /**
   * Message listener for content script communication
   * Currently a placeholder for future functionality
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Message received:', message);

    // Handle specific message types here as needed
    // For now, just acknowledge receipt
    sendResponse({ received: true });

    return false; // No async response
  });

  // ========== INITIALIZATION ==========

  /**
   * Set the default suggestion text shown in the omnibox
   * This appears when the user activates the omnibox keyword but hasn't typed yet
   */
  chrome.omnibox.setDefaultSuggestion({
    description: 'Ask Gemini: Type your prompt and press Enter'
  });

  // Log that the service worker has loaded successfully
  log('Background service worker initialized');
}

// ========== EXPORTS FOR TESTING ==========
// Export functions for Node.js test environment

if (IS_TEST_ENV) {
  module.exports = {
    buildGeminiUrl,
    escapeXml,
    navigateToUrl,
    handleInputEntered,
    GEMINI_BASE_URL,
    // Allow tests to configure these
    setConfig: (config) => {
      if (config.URL_PARAM !== undefined) URL_PARAM = config.URL_PARAM;
      if (config.DEBUG !== undefined) DEBUG = config.DEBUG;
    }
  };
}
