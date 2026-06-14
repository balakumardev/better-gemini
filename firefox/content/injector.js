/**
 * Better Gemini Extension - Content Script Injector
 *
 * This script handles:
 * 1. Detecting bg_prompt URL parameter
 * 2. Waiting for Gemini's React app to hydrate
 * 3. Injecting text into the contenteditable input (React-compatible)
 * 4. Auto-submitting the prompt
 * 5. Cleaning up the URL for clean browser history
 *
 * Note: Content scripts cannot use ES6 module imports directly.
 * Configuration is inlined here for compatibility.
 */

// ========== IMMEDIATE LOAD CONFIRMATION ==========
// Log immediately to confirm script is loaded (before any environment checks)
console.log('[Better Gemini] Content script file loaded at:', window?.location?.href || 'unknown URL');

// ========== ENVIRONMENT DETECTION ==========
// Detect if running in Node.js test environment vs browser
// More robust check: require Node.js-specific globals, not just `module`
const IS_TEST_ENV = typeof process !== 'undefined' && process.versions && process.versions.node;
const IS_BROWSER_ENV = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof chrome !== 'undefined';

// ============================================================================
// CONFIGURATION (inlined from config.js for content script compatibility)
// ============================================================================

const CONFIG = {
  // URL parameter name for injecting prompts
  URL_PARAM: 'bg_prompt',

  // Timeout constants (in milliseconds)
  TIMEOUTS: {
    DOM_READY: 10000,        // Max wait time for DOM to be ready
    BEFORE_INJECTION: 500,   // Wait after input field appears before injecting
    AFTER_INJECTION: 300,    // Delay after text injection before clicking send
    RETRY_INTERVAL: 100,     // Interval between retry attempts
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,         // Max attempts to find send button
    DELAY: 200,              // Delay between retries
  },

  // DOM Selectors for Gemini's interface
  SELECTORS: {
    // Main input field - contenteditable div used by Gemini
    INPUT_FIELD: [
      'div[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '[data-placeholder="Enter a prompt here"]',
      'rich-textarea div[contenteditable="true"]',
    ],

    // Send button selectors
    SEND_BUTTON: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'button[data-testid="send-button"]',
      '.send-button',
      'button[mattooltip="Send message"]',
    ],

    // Elements that indicate user IS logged in to Gemini
    LOGGED_IN_INDICATORS: [
      'div[contenteditable="true"]',  // Chat input only appears when logged in
      'rich-textarea',                 // Gemini's rich text input component
      '[data-placeholder="Enter a prompt here"]',  // Input placeholder
    ],

    // URL patterns that definitively indicate NOT logged in
    LOGIN_PAGE_PATTERNS: [
      'accounts.google.com/signin',
      'accounts.google.com/v3/signin',
      'accounts.google.com/ServiceLogin',
    ],
  },

  // Debug mode - set to true for verbose logging
  DEBUG: true,
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Logs a message if debug mode is enabled
 * @param {string} message - The message to log
 * @param {*} data - Optional data to log
 */
function log(message, data = null) {
  if (CONFIG.DEBUG) {
    const prefix = '[Better Gemini]';
    if (data !== null) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

/**
 * Logs an error message
 * @param {string} message - The error message
 * @param {Error} error - Optional error object
 */
function logError(message, error = null) {
  const prefix = '[Better Gemini Error]';
  if (error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
}

// ============================================================================
// URL PARAMETER DETECTION
// ============================================================================

/**
 * Extracts and decodes the bg_prompt parameter from the URL
 * @param {Location} [locationObj] - Optional location object (for testing)
 * @param {string} [urlParam] - Optional URL parameter name (for testing)
 * @returns {string|null} The decoded prompt text or null if not found
 */
function getPromptFromURL(locationObj = (typeof window !== 'undefined' ? window.location : null), urlParam = CONFIG.URL_PARAM) {
  if (!locationObj) {
    return null;
  }

  const urlParams = new URLSearchParams(locationObj.search);
  const encodedPrompt = urlParams.get(urlParam);

  if (!encodedPrompt) {
    log('No prompt parameter found in URL');
    return null;
  }

  try {
    // Decode the URL-encoded prompt
    const decodedPrompt = decodeURIComponent(encodedPrompt);
    log('Found prompt in URL:', decodedPrompt.substring(0, 50) + '...');
    return decodedPrompt;
  } catch (e) {
    logError('Failed to decode prompt parameter', e);
    return null;
  }
}

// ============================================================================
// URL CLEANUP
// ============================================================================

/**
 * Removes the bg_prompt parameter from the URL without triggering navigation
 * Uses history.replaceState to maintain clean browser history
 * @param {Window} [windowObj] - Optional window object (for testing)
 * @param {string} [urlParam] - Optional URL parameter name (for testing)
 */
function cleanupURL(windowObj = (typeof window !== 'undefined' ? window : null), urlParam = CONFIG.URL_PARAM) {
  if (!windowObj || !windowObj.location || !windowObj.history) {
    return;
  }

  try {
    const url = new URL(windowObj.location.href);
    url.searchParams.delete(urlParam);

    // Replace current history entry with clean URL
    windowObj.history.replaceState(
      windowObj.history.state,  // Preserve existing state
      '',                        // Title (ignored by most browsers)
      url.toString()             // New clean URL
    );

    log('URL cleaned up successfully');
  } catch (e) {
    logError('Failed to cleanup URL', e);
  }
}

// ============================================================================
// DOM UTILITIES
// ============================================================================

/**
 * Queries the DOM using multiple selectors, returning the first match
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {Document} [doc] - Optional document object (for testing)
 * @returns {Element|null} The first matching element or null
 */
function queryWithSelectors(selectors, doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) {
    return null;
  }

  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      log('Found element with selector:', selector);
      return element;
    }
  }
  return null;
}

/**
 * Checks if the user is logged out by:
 * 1. Checking if we're on a Google login page URL
 * 2. Checking if logged-in indicators are ABSENT
 *
 * This avoids false positives from accounts.google.com links that appear
 * on logged-in Gemini pages (like profile menu links).
 *
 * @param {Window} [windowObj] - Optional window object (for testing)
 * @param {Document} [doc] - Optional document object (for testing)
 * @returns {boolean} True if user appears to be logged out
 */
function isUserLoggedOut(windowObj = (typeof window !== 'undefined' ? window : null), doc = (typeof document !== 'undefined' ? document : null)) {
  if (!windowObj || !doc) {
    return false;
  }

  const currentUrl = windowObj.location.href;

  // Check if we're on an actual Google login page (not just a link)
  for (const pattern of CONFIG.SELECTORS.LOGIN_PAGE_PATTERNS) {
    if (currentUrl.includes(pattern)) {
      log('Detected login page URL pattern:', pattern);
      return true;
    }
  }

  // If we're on gemini.google.com, check for logged-in indicators
  // If ANY logged-in indicator is present, user is logged in
  for (const selector of CONFIG.SELECTORS.LOGGED_IN_INDICATORS) {
    if (doc.querySelector(selector)) {
      log('Found logged-in indicator:', selector);
      return false;  // User IS logged in
    }
  }

  // If we're on gemini.google.com but no logged-in indicators found,
  // the page might still be loading. We should NOT immediately assume logged out.
  // Only consider logged out if we're NOT on a Gemini page
  if (currentUrl.includes('gemini.google.com')) {
    log('On Gemini page, no logged-in indicators yet - assuming still loading');
    return false;  // Let the page continue loading
  }

  // Not on Gemini or login page - don't interfere
  log('Not on Gemini or login page');
  return false;
}

// ============================================================================
// DOM READY DETECTION
// ============================================================================

/**
 * Creates a promise that resolves after a specified delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for an element matching any of the given selectors to appear in the DOM
 * Uses MutationObserver for efficient detection without polling
 * Implements timeout to prevent infinite waiting
 * @param {string[]} selectors - Array of CSS selectors to wait for
 * @param {Document} [doc] - Optional document object (for testing)
 * @param {number} [timeout] - Optional timeout in ms (for testing)
 * @returns {Promise<Element>} Resolves with the element
 * @throws {Error} If element not found within timeout
 */
function waitForElement(selectors, doc = (typeof document !== 'undefined' ? document : null), timeout = CONFIG.TIMEOUTS.DOM_READY) {
  return new Promise((resolve, reject) => {
    if (!doc) {
      reject(new Error('Document not available'));
      return;
    }

    // First, check if element already exists (React may have already hydrated)
    const existingElement = queryWithSelectors(selectors, doc);
    if (existingElement) {
      log('Element already present');
      resolve(existingElement);
      return;
    }

    log('Waiting for element to appear...');

    // Set up timeout to prevent infinite waiting
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found within ${timeout}ms`));
    }, timeout);

    // Create MutationObserver to watch for DOM changes
    // This is more efficient than polling and works with React's hydration
    const observer = new MutationObserver((mutations, obs) => {
      const element = queryWithSelectors(selectors, doc);
      if (element) {
        log('Element appeared in DOM');
        clearTimeout(timeoutId);
        obs.disconnect();
        resolve(element);
      }
    });

    // Start observing the document body for any DOM changes
    if (doc.body) {
      observer.observe(doc.body, {
        childList: true,    // Watch for added/removed nodes
        subtree: true,      // Watch entire subtree
      });
    } else {
      clearTimeout(timeoutId);
      reject(new Error('Document body not available'));
    }
  });
}

/**
 * Waits for the input field to appear in the DOM (convenience wrapper)
 * @param {Document} [doc] - Optional document object (for testing)
 * @returns {Promise<Element>} Resolves with the input element
 * @throws {Error} If element not found within timeout
 */
function waitForInputField(doc = (typeof document !== 'undefined' ? document : null)) {
  return waitForElement(CONFIG.SELECTORS.INPUT_FIELD, doc);
}

// ============================================================================
// TEXT INJECTION (React-Compatible)
// ============================================================================

/**
 * Injects text into a contenteditable element in a React-compatible way
 *
 * React maintains its own virtual DOM and doesn't respond to direct DOM mutations.
 * We use document.execCommand('insertText') which simulates actual user typing,
 * triggering React's event handlers properly.
 *
 * @param {Element} inputElement - The contenteditable element
 * @param {string} text - The text to inject
 * @param {Window} [windowObj] - Optional window object (for testing)
 * @param {Document} [doc] - Optional document object (for testing)
 * @returns {boolean} True if injection was successful
 */
function injectText(inputElement, text, windowObj = (typeof window !== 'undefined' ? window : null), doc = (typeof document !== 'undefined' ? document : null)) {
  if (!inputElement || !windowObj || !doc) {
    return false;
  }

  try {
    // Step 1: Focus the input element
    // This is required for execCommand to work
    inputElement.focus();
    log('Input element focused');

    // Step 2: Clear any existing content (select all)
    // This ensures we start with a clean slate
    const selection = windowObj.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(inputElement);
    selection.removeAllRanges();
    selection.addRange(range);

    // Step 3: Use execCommand to insert text (React-compatible)
    // This triggers proper input events that React can capture
    const success = doc.execCommand('insertText', false, text);

    if (success) {
      log('Text injected via execCommand');
      return true;
    }

    // Fallback: Use InputEvent if execCommand fails (deprecated in some browsers)
    log('execCommand failed, trying InputEvent fallback');
    return injectTextWithInputEvent(inputElement, text);

  } catch (e) {
    logError('Failed to inject text', e);
    return false;
  }
}

/**
 * Fallback text injection using InputEvent
 * Used when document.execCommand is not available
 *
 * @param {Element} inputElement - The contenteditable element
 * @param {string} text - The text to inject
 * @returns {boolean} True if injection was successful
 */
function injectTextWithInputEvent(inputElement, text) {
  try {
    // Clear existing content
    inputElement.textContent = '';

    // Create and dispatch beforeinput event
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true,
    });
    inputElement.dispatchEvent(beforeInputEvent);

    // Set the content
    inputElement.textContent = text;

    // Create and dispatch input event
    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: false,
    });
    inputElement.dispatchEvent(inputEvent);

    log('Text injected via InputEvent fallback');
    return true;
  } catch (e) {
    logError('InputEvent fallback failed', e);
    return false;
  }
}

// ============================================================================
// AUTO-SUBMISSION
// ============================================================================

/**
 * Finds the send button using configured selectors
 * @param {Document} [doc] - Optional document object (for testing)
 * @returns {Element|null} The send button element or null
 */
function findSendButton(doc = (typeof document !== 'undefined' ? document : null)) {
  return queryWithSelectors(CONFIG.SELECTORS.SEND_BUTTON, doc);
}

/**
 * Clicks the send button with retry logic
 * Implements multiple attempts in case of timing issues
 *
 * @param {number} [attempt] - Current attempt number
 * @param {Document} [doc] - Optional document object (for testing)
 * @param {Window} [windowObj] - Optional window object (for testing)
 * @returns {Promise<boolean>} True if button was clicked
 */
async function clickSendButton(attempt = 1, doc = (typeof document !== 'undefined' ? document : null), windowObj = (typeof window !== 'undefined' ? window : null)) {
  log(`Attempting to click send button (attempt ${attempt}/${CONFIG.RETRY.MAX_ATTEMPTS})`);

  const sendButton = findSendButton(doc);

  if (sendButton) {
    // Check if button is disabled
    if (sendButton.disabled || sendButton.getAttribute('aria-disabled') === 'true') {
      log('Send button is disabled, waiting...');
      if (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
        await delay(CONFIG.RETRY.DELAY);
        return clickSendButton(attempt + 1, doc, windowObj);
      }
      logError('Send button remained disabled after all retries');
      return false;
    }

    // Dispatch click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: windowObj,
    });
    sendButton.dispatchEvent(clickEvent);

    log('Send button clicked successfully');
    return true;
  }

  // Retry if button not found
  if (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
    log('Send button not found, retrying...');
    await delay(CONFIG.RETRY.DELAY);
    return clickSendButton(attempt + 1, doc, windowObj);
  }

  logError('Send button not found after all retries');
  return false;
}

// ============================================================================
// MAIN EXECUTION FLOW
// ============================================================================

/**
 * Main function that orchestrates the entire injection process
 *
 * Flow:
 * 1. Check for bg_prompt parameter
 * 2. Verify user is logged in
 * 3. Wait for input field
 * 4. Inject text
 * 5. Auto-submit
 * 6. Cleanup URL
 */
async function main() {
  log('Better Gemini content script initialized');
  log('Current URL:', window.location.href);
  log('URL search params:', window.location.search);
  log('URL pathname:', window.location.pathname);

  // Step 1: Check for prompt parameter
  const prompt = getPromptFromURL();
  log('Extracted prompt:', prompt ? `"${prompt.substring(0, 50)}..."` : 'null');

  if (!prompt) {
    log('No prompt to inject, script idle');
    return;
  }

  // Step 2: Check if user is logged in
  // Small delay to allow page to render login indicators
  await delay(500);
  if (isUserLoggedOut()) {
    logError('User appears to be logged out. Aborting injection.');
    // Don't cleanup URL - let user retry after login
    return;
  }

  try {
    // Step 3: Wait for the input field to appear
    log('Waiting for Gemini interface to load...');
    const inputElement = await waitForInputField();

    // Step 3.5: Wait a bit for the interface to fully stabilize
    log(`Input field found. Waiting ${CONFIG.TIMEOUTS.BEFORE_INJECTION}ms before injecting...`);
    await delay(CONFIG.TIMEOUTS.BEFORE_INJECTION);

    // Step 4: Inject the prompt text
    log('Injecting prompt text...');
    const injected = injectText(inputElement, prompt);

    if (!injected) {
      logError('Failed to inject text');
      return;
    }

    // Step 5: Wait before submitting (allow React to process)
    log(`Waiting ${CONFIG.TIMEOUTS.AFTER_INJECTION}ms before submitting...`);
    await delay(CONFIG.TIMEOUTS.AFTER_INJECTION);

    // Step 6: Click the send button
    const submitted = await clickSendButton();

    if (submitted) {
      log('Prompt submitted successfully!');
    } else {
      logError('Failed to submit prompt');
    }

    // Step 7: Cleanup URL regardless of submission success
    // This prevents re-injection on page refresh
    cleanupURL();

  } catch (error) {
    logError('Injection process failed', error);
    // Cleanup URL to prevent retry loop
    cleanupURL();
  }
}

/**
 * Handles prompt injection triggered via message
 * @param {string} prompt - The prompt to inject
 * @returns {Promise<boolean>} Success status
 */
async function injectPromptFromMessage(prompt) {
  try {
    const inputElement = await waitForInputField();

    // Wait for interface to stabilize
    await delay(CONFIG.TIMEOUTS.BEFORE_INJECTION);

    const injected = injectText(inputElement, prompt);

    if (injected) {
      await delay(CONFIG.TIMEOUTS.AFTER_INJECTION);
      await clickSendButton();
      return true;
    }
    return false;
  } catch (e) {
    logError('Message-triggered injection failed', e);
    return false;
  }
}

// ============================================================================
// BROWSER INITIALIZATION (only runs in browser context)
// ============================================================================

console.log('[Better Gemini] Environment check:', {
  IS_BROWSER_ENV,
  IS_TEST_ENV,
  hasWindow: typeof window !== 'undefined',
  hasDocument: typeof document !== 'undefined',
  hasChrome: typeof chrome !== 'undefined',
  hasProcess: typeof process !== 'undefined',
  url: typeof window !== 'undefined' ? window.location.href : 'N/A',
  search: typeof window !== 'undefined' ? window.location.search : 'N/A',
});

if (IS_BROWSER_ENV && !IS_TEST_ENV) {
  console.log('[Better Gemini] Browser environment detected, starting initialization...');

  (function() {
    'use strict';

    // ============================================================================
    // MESSAGE HANDLER (for background script communication)
    // ============================================================================

    /**
     * Handles messages from the background script
     * Allows triggering injection programmatically
     */
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        log('Received message from background:', message);

        if (message.action === 'injectPrompt' && message.prompt) {
          // Inject prompt received from background script
          injectPromptFromMessage(message.prompt).then(success => {
            sendResponse({ success });
          });
          return true; // Keep channel open for async response
        }

        if (message.action === 'ping') {
          sendResponse({ status: 'alive' });
          return true;
        }

        sendResponse({ status: 'unknown_action' });
        return true;
      });
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    console.log('[Better Gemini] Document readyState:', document.readyState);

    // Run main function - since run_at is "document_idle", DOM should already be ready
    // but we check anyway for robustness
    if (document.readyState === 'loading') {
      console.log('[Better Gemini] DOM still loading, adding DOMContentLoaded listener');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[Better Gemini] DOMContentLoaded fired, calling main()');
        main();
      });
    } else {
      // DOM already loaded (most common case with run_at: "document_idle")
      console.log('[Better Gemini] DOM already loaded, calling main() immediately');
      main();
    }

  })();
} else {
  console.log('[Better Gemini] NOT initializing browser code:', {
    reason: !IS_BROWSER_ENV ? 'Not a browser environment' : 'Test environment detected',
    IS_BROWSER_ENV,
    IS_TEST_ENV,
  });
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

if (IS_TEST_ENV) {
  module.exports = {
    // Core functions for testing
    getPromptFromURL,
    cleanupURL,
    waitForElement,
    waitForInputField,
    injectText,
    clickSendButton,
    findSendButton,
    queryWithSelectors,
    isUserLoggedOut,
    delay,
    // Config for test inspection/modification
    CONFIG,
    // Internal functions that might be useful for testing
    injectTextWithInputEvent,
    main,
    injectPromptFromMessage,
  };
}
