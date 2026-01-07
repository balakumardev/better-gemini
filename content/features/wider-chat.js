/**
 * Better Gemini Extension - Wider Chat Width Feature
 *
 * This module increases the chat container width for a better reading experience.
 *
 * Features:
 * - Injects CSS to set max-width to 98% on conversation containers
 * - Uses MutationObserver to handle dynamically loaded content
 * - Persists styles across SPA navigation
 *
 * Supports both ES6 modules (Chrome extension) and CommonJS (Node.js testing)
 */

(function() {
'use strict';

// ========== ENVIRONMENT DETECTION ==========
const IS_TEST_ENV_WIDER = typeof module !== 'undefined' && module.exports;
const IS_BROWSER_ENV_WIDER = typeof window !== 'undefined' && typeof document !== 'undefined';

// ========== CONFIGURATION ==========

const STYLE_ID = 'better-gemini-wider-chat';

const WIDER_CHAT_CSS = `
.conversation-container,
.input-area-container,
.bottom-container,
user-query {
  max-width: 98% !important;
}
`;

// Selectors to watch for dynamic content
const WATCHED_SELECTORS = [
  '.conversation-container',
  '.input-area-container',
  '.bottom-container',
  'user-query',
];

// ========== STATE ==========

let styleElement = null;
let observer = null;
let isInitialized = false;

// ========== INTERNAL FUNCTIONS ==========

/**
 * Creates and injects the style element into the document head
 * @returns {HTMLStyleElement} The created style element
 */
function injectStyles() {
  // Check if styles already exist
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    return existingStyle;
  }

  // Create new style element
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.type = 'text/css';
  style.textContent = WIDER_CHAT_CSS;

  // Inject into document head
  document.head.appendChild(style);

  return style;
}

/**
 * Removes the style element from the document
 */
function removeStyles() {
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }
}

/**
 * Checks if any of the watched elements exist in the DOM
 * @returns {boolean} True if any watched elements exist
 */
function hasWatchedElements() {
  return WATCHED_SELECTORS.some(selector => document.querySelector(selector) !== null);
}

/**
 * Callback for MutationObserver
 * Re-injects styles if they were removed (e.g., during SPA navigation)
 * @param {MutationRecord[]} mutations - Array of mutation records
 */
function handleMutations(mutations) {
  // Check if our style element was removed
  if (!document.getElementById(STYLE_ID)) {
    // Style was removed, re-inject it
    styleElement = injectStyles();
  }

  // Check for new watched elements that might need styling
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // New nodes were added, ensure styles are present
      if (hasWatchedElements() && !document.getElementById(STYLE_ID)) {
        styleElement = injectStyles();
      }
    }
  }
}

/**
 * Sets up the MutationObserver to watch for DOM changes
 * @returns {MutationObserver} The created observer
 */
function setupObserver() {
  const mutationObserver = new MutationObserver(handleMutations);

  // Observe the document body for changes
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return mutationObserver;
}

// ========== PUBLIC API ==========

/**
 * Initializes the wider chat feature
 * - Injects CSS styles
 * - Sets up MutationObserver for dynamic content
 */
function init() {
  if (isInitialized) {
    return;
  }

  // Inject styles immediately
  styleElement = injectStyles();

  // Set up observer to handle dynamic content and SPA navigation
  if (typeof MutationObserver !== 'undefined') {
    observer = setupObserver();
  }

  isInitialized = true;
}

/**
 * Destroys the wider chat feature
 * - Removes injected styles
 * - Disconnects MutationObserver
 */
function destroy() {
  if (!isInitialized) {
    return;
  }

  // Disconnect observer
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  // Remove styles
  removeStyles();
  styleElement = null;

  isInitialized = false;
}

// ========== EXPORTS ==========

if (IS_TEST_ENV_WIDER) {
  // CommonJS exports for Node.js testing
  module.exports = {
    init,
    destroy,
    // Expose internals for testing
    _internals: {
      STYLE_ID,
      WIDER_CHAT_CSS,
      WATCHED_SELECTORS,
      injectStyles,
      removeStyles,
      hasWatchedElements,
      handleMutations,
      setupObserver,
      getState: () => ({ styleElement, observer, isInitialized }),
    },
  };
}

// Browser exports for feature loader
if (IS_BROWSER_ENV_WIDER && !IS_TEST_ENV_WIDER) {
  window.BetterGeminiWiderChat = {
    init,
    destroy,
  };
}

})();
