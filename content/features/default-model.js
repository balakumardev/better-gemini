/**
 * Better Gemini Extension - Default Model Feature
 *
 * This module automatically sets the preferred model for every chat.
 * It watches for page loads and model picker availability, then selects
 * the user's preferred model.
 *
 * Features:
 * - Automatically selects preferred model on new chats
 * - Applies to existing chats when navigating
 * - Handles SPA navigation
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = {
    // Available models with their identifiers
    MODELS: {
      flash: {
        id: '56fdd199312815e2',
        testId: 'bard-mode-option-flash',
        name: 'Flash',
      },
      fast: {
        id: '56fdd199312815e2',
        testId: 'bard-mode-option-flash',
        name: 'Flash',
        alias: 'flash', // fast is an alias for flash
      },
      thinking: {
        id: 'e051ce1aa80aa576',
        testId: 'bard-mode-option-thinking',
        name: 'Thinking',
      },
      pro: {
        id: 'e6fa609c3fa255c0',
        testId: 'bard-mode-option-pro',
        name: 'Pro',
      },
    },

    // Selectors
    SELECTORS: {
      MODEL_PICKER_BUTTON: '[data-test-id="bard-mode-menu-button"]',
      MODEL_MENU_PANEL: '.mat-mdc-menu-panel.gds-mode-switch-menu',
      MODEL_OPTION_BY_TEST_ID: '[data-test-id="bard-mode-option-',
      MODEL_OPTION_BY_TEXT: '.bard-mode-list-button',
      CURRENT_MODEL_TEXT: '[data-test-id="bard-mode-menu-button"] .input-area-switch',
    },

    // Storage key for the selected model
    STORAGE_KEY: 'betterGemini_defaultModel',

    // Timing
    RETRY_DELAY: 500,
    MAX_RETRIES: 10,
    MENU_OPEN_DELAY: 150,

    // Debug mode
    DEBUG: true,
  };

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  function log(message, data = null) {
    if (CONFIG.DEBUG) {
      const prefix = '[Better Gemini Default Model]';
      if (data !== null) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  function logError(message, error = null) {
    const prefix = '[Better Gemini Default Model Error]';
    if (error) {
      console.error(prefix, message, error);
    } else {
      console.error(prefix, message);
    }
  }

  // ============================================================================
  // STATE
  // ============================================================================

  let currentPreferredModel = null;
  let isApplying = false;
  let observer = null;
  let lastAppliedUrl = null;
  let urlModelOverride = null; // Model from URL query param

  // ============================================================================
  // URL QUERY PARAM HANDLING
  // ============================================================================

  /**
   * Gets the model from URL query parameter if present
   * @returns {string|null} Model key (fast, thinking, pro) or null
   */
  function getModelFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const model = urlParams.get('model');

      if (model && CONFIG.MODELS[model]) {
        log('Model from URL param:', model);
        return model;
      }
    } catch (error) {
      logError('Failed to parse URL for model param', error);
    }
    return null;
  }

  /**
   * Removes the model param from URL without triggering navigation
   * This keeps the URL clean after we've applied the model
   */
  function cleanModelFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('model')) {
        url.searchParams.delete('model');
        // Use replaceState to update URL without navigation
        history.replaceState(null, '', url.toString());
        log('Cleaned model param from URL');
      }
    } catch (error) {
      logError('Failed to clean model from URL', error);
    }
  }

  // ============================================================================
  // STORAGE
  // ============================================================================

  /**
   * Loads the preferred model from storage
   * @returns {Promise<string|null>} Model key (fast, thinking, pro) or null
   */
  async function loadPreferredModel() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get(CONFIG.STORAGE_KEY);
        return result[CONFIG.STORAGE_KEY] || null;
      }
    } catch (error) {
      logError('Failed to load preferred model', error);
    }
    return null;
  }

  /**
   * Sets up storage change listener
   */
  function setupStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes[CONFIG.STORAGE_KEY]) {
          const newModel = changes[CONFIG.STORAGE_KEY].newValue;
          log('Preferred model changed:', newModel);
          currentPreferredModel = newModel;

          // Apply the new model immediately
          if (newModel) {
            applyDefaultModel();
          }
        }
      });
    }
  }

  // ============================================================================
  // MODEL DETECTION & SELECTION
  // ============================================================================

  /**
   * Gets the currently selected model
   * @returns {string|null} Model key or null
   */
  function getCurrentModel() {
    const buttonText = document.querySelector(CONFIG.SELECTORS.CURRENT_MODEL_TEXT);
    if (!buttonText) return null;

    const text = buttonText.textContent?.trim().toLowerCase();

    for (const [key, model] of Object.entries(CONFIG.MODELS)) {
      if (model.name.toLowerCase() === text) {
        return key;
      }
    }

    return null;
  }

  /**
   * Checks if the model picker is available on the page
   * @returns {boolean}
   */
  function isModelPickerAvailable() {
    return !!document.querySelector(CONFIG.SELECTORS.MODEL_PICKER_BUTTON);
  }

  /**
   * Opens the model picker menu
   * @returns {Promise<boolean>} True if menu opened successfully
   */
  async function openModelPicker() {
    const pickerButton = document.querySelector(CONFIG.SELECTORS.MODEL_PICKER_BUTTON);
    if (!pickerButton) {
      log('Model picker button not found');
      return false;
    }

    // Check if already open
    if (document.querySelector(CONFIG.SELECTORS.MODEL_MENU_PANEL)) {
      return true;
    }

    // Click to open
    pickerButton.click();

    // Wait for menu to appear
    await new Promise(resolve => setTimeout(resolve, CONFIG.MENU_OPEN_DELAY));

    return !!document.querySelector(CONFIG.SELECTORS.MODEL_MENU_PANEL);
  }

  /**
   * Selects a model from the open menu
   * @param {string} modelKey - The model key (flash, fast, thinking, pro)
   * @returns {boolean} True if selection was successful
   */
  function selectModel(modelKey) {
    const model = CONFIG.MODELS[modelKey];
    if (!model) {
      logError('Unknown model:', modelKey);
      return false;
    }

    // Use the canonical key (handle aliases like fast->flash)
    const canonicalKey = model.alias || modelKey;

    // Try by data-test-id first
    let selector = `${CONFIG.SELECTORS.MODEL_OPTION_BY_TEST_ID}${canonicalKey}"]`;
    let option = document.querySelector(selector);

    // If not found, try finding by text content
    if (!option) {
      log('Model option not found by test-id, trying text match:', selector);
      const allOptions = document.querySelectorAll('[role="menuitemradio"]');
      for (const opt of allOptions) {
        const text = opt.textContent?.toLowerCase() || '';
        if (text.includes(model.name.toLowerCase())) {
          option = opt;
          break;
        }
      }
    }

    if (!option) {
      logError('Model option not found:', modelKey);
      return false;
    }

    option.click();
    log('Selected model:', model.name);

    // Close the menu after selection (sometimes it stays open)
    setTimeout(() => {
      closeModelPicker();
    }, 100);

    return true;
  }

  /**
   * Closes the model picker if open
   */
  function closeModelPicker() {
    const menu = document.querySelector(CONFIG.SELECTORS.MODEL_MENU_PANEL);
    if (menu) {
      // Press Escape to close
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Also try clicking outside to close
      setTimeout(() => {
        const overlay = document.querySelector('.cdk-overlay-backdrop');
        if (overlay) overlay.click();
      }, 50);
    }
  }

  // ============================================================================
  // MAIN LOGIC
  // ============================================================================

  /**
   * Gets the effective model to apply (URL override takes precedence)
   * @returns {string|null} Model key to apply
   */
  function getEffectiveModel() {
    // URL param takes precedence
    if (urlModelOverride) {
      return urlModelOverride;
    }
    // Fall back to stored preference
    return currentPreferredModel;
  }

  /**
   * Applies the default model if different from current
   * @returns {Promise<boolean>} True if model was changed
   */
  async function applyDefaultModel() {
    const targetModel = getEffectiveModel();

    if (!targetModel) {
      log('No model to apply (no URL override or preferred model)');
      return false;
    }

    if (isApplying) {
      log('Already applying model, skipping');
      return false;
    }

    if (!isModelPickerAvailable()) {
      log('Model picker not available yet');
      return false;
    }

    // Check if we already applied for this URL (only for non-URL-override cases)
    const currentUrl = window.location.href;
    if (!urlModelOverride && lastAppliedUrl === currentUrl) {
      log('Already applied for this URL');
      return false;
    }

    const currentModel = getCurrentModel();
    log('Current model:', currentModel, 'Target:', targetModel, 'From URL:', !!urlModelOverride);

    if (currentModel === targetModel) {
      log('Already using target model');
      lastAppliedUrl = currentUrl;
      // Clean URL param if it was from URL
      if (urlModelOverride) {
        cleanModelFromUrl();
        urlModelOverride = null;
      }
      return false;
    }

    isApplying = true;

    try {
      // Open the model picker
      const opened = await openModelPicker();
      if (!opened) {
        logError('Failed to open model picker');
        return false;
      }

      // Small delay to ensure menu is fully rendered
      await new Promise(resolve => setTimeout(resolve, 50));

      // Select the model
      const selected = selectModel(targetModel);
      if (!selected) {
        closeModelPicker();
        return false;
      }

      lastAppliedUrl = currentUrl;
      log('Successfully applied model:', targetModel);

      // Clean URL param after successful application
      if (urlModelOverride) {
        cleanModelFromUrl();
        urlModelOverride = null;
      }

      return true;

    } catch (error) {
      logError('Error applying default model', error);
      closeModelPicker();
      return false;
    } finally {
      isApplying = false;
    }
  }

  /**
   * Waits for model picker to be available and applies default model
   * @param {number} retries - Number of retries remaining
   */
  async function waitAndApplyModel(retries = CONFIG.MAX_RETRIES) {
    if (retries <= 0) {
      log('Max retries reached, giving up');
      return;
    }

    if (!currentPreferredModel) {
      log('No preferred model configured');
      return;
    }

    if (isModelPickerAvailable()) {
      await applyDefaultModel();
    } else {
      log('Model picker not ready, retrying...', retries - 1);
      setTimeout(() => waitAndApplyModel(retries - 1), CONFIG.RETRY_DELAY);
    }
  }

  // ============================================================================
  // NAVIGATION OBSERVER
  // ============================================================================

  /**
   * Sets up observer for SPA navigation
   */
  function setupNavigationObserver() {
    let lastUrl = window.location.href;

    // Watch for URL changes via history API
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      handleNavigation();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      handleNavigation();
    };

    window.addEventListener('popstate', handleNavigation);

    // Also observe DOM changes for model picker appearance
    observer = new MutationObserver((mutations) => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleNavigation();
        return;
      }

      // Check if model picker just appeared
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches?.(CONFIG.SELECTORS.MODEL_PICKER_BUTTON) ||
                  node.querySelector?.(CONFIG.SELECTORS.MODEL_PICKER_BUTTON)) {
                log('Model picker appeared');
                waitAndApplyModel();
                return;
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    function handleNavigation() {
      log('Navigation detected');
      // Reset last applied URL to allow re-application
      lastAppliedUrl = null;
      // Check for new URL model override
      urlModelOverride = getModelFromUrl();
      // Wait for page to settle then apply
      setTimeout(() => waitAndApplyModel(), 500);
    }

    log('Navigation observer set up');
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Destroys the feature
   */
  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    currentPreferredModel = null;
    urlModelOverride = null;
    isApplying = false;
    lastAppliedUrl = null;
    log('Default model feature destroyed');
  }

  /**
   * Initializes the default model feature
   */
  async function init() {
    log('Initializing Default Model feature');

    // Only run in browser context
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      logError('Not in browser context, skipping initialization');
      return;
    }

    // Check if we're on a Gemini page
    if (!window.location.hostname.includes('gemini.google.com')) {
      log('Not on Gemini, skipping initialization');
      return;
    }

    // Check for URL model override first
    urlModelOverride = getModelFromUrl();
    if (urlModelOverride) {
      log('URL model override:', urlModelOverride);
    }

    // Load the preferred model from storage
    currentPreferredModel = await loadPreferredModel();
    log('Loaded preferred model:', currentPreferredModel);

    // Set up storage listener for changes
    setupStorageListener();

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeFeature);
    } else {
      initializeFeature();
    }
  }

  /**
   * Internal initialization after DOM is ready
   */
  function initializeFeature() {
    // Set up navigation observer
    setupNavigationObserver();

    // Apply model after page loads
    setTimeout(() => waitAndApplyModel(), 1000);

    log('Default Model feature initialized');
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init,
      destroy,
      CONFIG,
      getCurrentModel,
      applyDefaultModel,
    };
  }

  if (typeof window !== 'undefined') {
    window.BetterGeminiDefaultModel = {
      init,
      destroy,
      getCurrentModel,
      applyDefaultModel,
      getModelFromUrl,
      // Expose for debugging
      getPreferredModel: () => currentPreferredModel,
      setPreferredModel: (model) => { currentPreferredModel = model; },
      getUrlOverride: () => urlModelOverride,
      setUrlOverride: (model) => { urlModelOverride = model; },
    };
  }

})();
