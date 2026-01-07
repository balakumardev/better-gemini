/**
 * Better Gemini Extension - Feature Loader
 *
 * This script loads feature settings from chrome.storage and initializes
 * enabled features. It acts as the central coordinator for all optional features.
 *
 * Features are loaded from separate scripts and controlled via the options page.
 */

(function() {
  'use strict';

  // ========== ENVIRONMENT DETECTION ==========
  var IS_TEST_ENV = typeof process !== 'undefined' && process.versions && process.versions.node;
  var IS_BROWSER_ENV = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof chrome !== 'undefined';

  // ========== CONFIGURATION ==========
  var STORAGE_KEY = 'betterGemini_features';

  // Default settings - all features enabled by default
  var DEFAULT_SETTINGS = {
    exportMarkdown: true,
    keyboardShortcuts: true,
    widerChatWidth: true,
    defaultModel: true,
  };

  // ========== LOGGING ==========
  function log(message, data) {
    var prefix = '[Better Gemini Loader]';
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  function logError(message, error) {
    var prefix = '[Better Gemini Loader Error]';
    if (error) {
      console.error(prefix, message, error);
    } else {
      console.error(prefix, message);
    }
  }

  // ========== FEATURE STATE ==========
  var featuresInitialized = {
    exportMarkdown: false,
    keyboardShortcuts: false,
    widerChatWidth: false,
    defaultModel: false,
  };

  // ========== SETTINGS MANAGEMENT ==========

  /**
   * Loads settings from chrome.storage.sync
   * Returns default settings if none exist or on error
   * @returns {Promise<Object>} Settings object
   */
  function loadSettings() {
    return new Promise(function(resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get(STORAGE_KEY, function(result) {
            var settings = result[STORAGE_KEY] || DEFAULT_SETTINGS;
            log('Settings loaded:', settings);
            resolve(settings);
          });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      } catch (error) {
        logError('Failed to load settings:', error);
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  // ========== FEATURE INITIALIZATION ==========

  /**
   * Initializes the Export Markdown feature
   */
  function initExportMarkdown() {
    if (featuresInitialized.exportMarkdown) {
      return;
    }

    if (window.BetterGeminiExport && typeof window.BetterGeminiExport.init === 'function') {
      try {
        window.BetterGeminiExport.init();
        featuresInitialized.exportMarkdown = true;
        log('Export Markdown feature initialized');
      } catch (error) {
        logError('Failed to initialize Export Markdown:', error);
      }
    } else {
      logError('Export Markdown feature not found on window');
    }
  }

  /**
   * Initializes the Keyboard Shortcuts feature
   */
  function initKeyboardShortcuts() {
    if (featuresInitialized.keyboardShortcuts) {
      return;
    }

    if (window.BetterGeminiKeyboardShortcuts && typeof window.BetterGeminiKeyboardShortcuts.init === 'function') {
      try {
        window.BetterGeminiKeyboardShortcuts.init();
        featuresInitialized.keyboardShortcuts = true;
        log('Keyboard Shortcuts feature initialized');
      } catch (error) {
        logError('Failed to initialize Keyboard Shortcuts:', error);
      }
    } else {
      logError('Keyboard Shortcuts feature not found on window');
    }
  }

  /**
   * Initializes the Wider Chat feature
   */
  function initWiderChat() {
    if (featuresInitialized.widerChatWidth) {
      return;
    }

    if (window.BetterGeminiWiderChat && typeof window.BetterGeminiWiderChat.init === 'function') {
      try {
        window.BetterGeminiWiderChat.init();
        featuresInitialized.widerChatWidth = true;
        log('Wider Chat feature initialized');
      } catch (error) {
        logError('Failed to initialize Wider Chat:', error);
      }
    } else {
      logError('Wider Chat feature not found on window');
    }
  }

  /**
   * Destroys (disables) the Keyboard Shortcuts feature
   */
  function destroyKeyboardShortcuts() {
    if (!featuresInitialized.keyboardShortcuts) {
      return;
    }

    if (window.BetterGeminiKeyboardShortcuts && typeof window.BetterGeminiKeyboardShortcuts.destroy === 'function') {
      try {
        window.BetterGeminiKeyboardShortcuts.destroy();
        featuresInitialized.keyboardShortcuts = false;
        log('Keyboard Shortcuts feature destroyed');
      } catch (error) {
        logError('Failed to destroy Keyboard Shortcuts:', error);
      }
    }
  }

  /**
   * Destroys (disables) the Wider Chat feature
   */
  function destroyWiderChat() {
    if (!featuresInitialized.widerChatWidth) {
      return;
    }

    if (window.BetterGeminiWiderChat && typeof window.BetterGeminiWiderChat.destroy === 'function') {
      try {
        window.BetterGeminiWiderChat.destroy();
        featuresInitialized.widerChatWidth = false;
        log('Wider Chat feature destroyed');
      } catch (error) {
        logError('Failed to destroy Wider Chat:', error);
      }
    }
  }

  /**
   * Initializes the Default Model feature
   */
  function initDefaultModel() {
    if (featuresInitialized.defaultModel) {
      return;
    }

    if (window.BetterGeminiDefaultModel && typeof window.BetterGeminiDefaultModel.init === 'function') {
      try {
        window.BetterGeminiDefaultModel.init();
        featuresInitialized.defaultModel = true;
        log('Default Model feature initialized');
      } catch (error) {
        logError('Failed to initialize Default Model:', error);
      }
    } else {
      logError('Default Model feature not found on window');
    }
  }

  /**
   * Destroys (disables) the Default Model feature
   */
  function destroyDefaultModel() {
    if (!featuresInitialized.defaultModel) {
      return;
    }

    if (window.BetterGeminiDefaultModel && typeof window.BetterGeminiDefaultModel.destroy === 'function') {
      try {
        window.BetterGeminiDefaultModel.destroy();
        featuresInitialized.defaultModel = false;
        log('Default Model feature destroyed');
      } catch (error) {
        logError('Failed to destroy Default Model:', error);
      }
    }
  }

  // ========== MAIN INITIALIZATION ==========

  /**
   * Main initialization function
   * Loads settings and initializes enabled features
   */
  function initializeFeatures() {
    log('Starting feature initialization...');

    // Load settings
    loadSettings().then(function(settings) {
      // Initialize features based on settings
      if (settings.exportMarkdown !== false) {
        initExportMarkdown();
      }

      if (settings.keyboardShortcuts !== false) {
        initKeyboardShortcuts();
      }

      if (settings.widerChatWidth !== false) {
        initWiderChat();
      }

      if (settings.defaultModel !== false) {
        initDefaultModel();
      }

      log('Feature initialization complete');
    });
  }

  /**
   * Handles settings changes from the options page
   * @param {Object} changes - Changes object from chrome.storage.onChanged
   * @param {string} areaName - Storage area name
   */
  function handleSettingsChange(changes, areaName) {
    if (areaName !== 'sync' || !changes[STORAGE_KEY]) {
      return;
    }

    var newSettings = changes[STORAGE_KEY].newValue || DEFAULT_SETTINGS;
    log('Settings changed:', newSettings);

    // Handle Export Markdown - can only be enabled (no destroy function)
    if (newSettings.exportMarkdown !== false && !featuresInitialized.exportMarkdown) {
      initExportMarkdown();
    }

    // Handle Keyboard Shortcuts
    if (newSettings.keyboardShortcuts !== false && !featuresInitialized.keyboardShortcuts) {
      initKeyboardShortcuts();
    } else if (newSettings.keyboardShortcuts === false && featuresInitialized.keyboardShortcuts) {
      destroyKeyboardShortcuts();
    }

    // Handle Wider Chat
    if (newSettings.widerChatWidth !== false && !featuresInitialized.widerChatWidth) {
      initWiderChat();
    } else if (newSettings.widerChatWidth === false && featuresInitialized.widerChatWidth) {
      destroyWiderChat();
    }

    // Handle Default Model
    if (newSettings.defaultModel !== false && !featuresInitialized.defaultModel) {
      initDefaultModel();
    } else if (newSettings.defaultModel === false && featuresInitialized.defaultModel) {
      destroyDefaultModel();
    }
  }

  // ========== BROWSER INITIALIZATION ==========

  if (IS_BROWSER_ENV && !IS_TEST_ENV) {
    log('Feature loader script loaded');

    // Listen for settings changes
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleSettingsChange);
    }

    // Initialize features when DOM is ready
    // Use a small delay to ensure feature scripts have loaded
    function startInitialization() {
      // Wait for feature scripts to load (they are loaded before this script)
      setTimeout(initializeFeatures, 100);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startInitialization);
    } else {
      startInitialization();
    }
  }

  // ========== EXPORTS FOR TESTING ==========

  if (IS_TEST_ENV) {
    module.exports = {
      loadSettings: loadSettings,
      initializeFeatures: initializeFeatures,
      handleSettingsChange: handleSettingsChange,
      initExportMarkdown: initExportMarkdown,
      initKeyboardShortcuts: initKeyboardShortcuts,
      initWiderChat: initWiderChat,
      initDefaultModel: initDefaultModel,
      destroyKeyboardShortcuts: destroyKeyboardShortcuts,
      destroyWiderChat: destroyWiderChat,
      destroyDefaultModel: destroyDefaultModel,
      DEFAULT_SETTINGS: DEFAULT_SETTINGS,
      STORAGE_KEY: STORAGE_KEY,
      getFeaturesInitialized: function() { return Object.assign({}, featuresInitialized); },
      // Reset function for testing - resets internal state
      _resetForTesting: function() {
        featuresInitialized = {
          exportMarkdown: false,
          keyboardShortcuts: false,
          widerChatWidth: false,
          defaultModel: false,
        };
      },
    };
  }

})();
