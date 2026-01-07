/**
 * Integration Tests for Feature System
 *
 * Tests the interaction between:
 * - Feature Loader (content/feature-loader.js)
 * - Wider Chat Feature (content/features/wider-chat.js)
 * - Settings storage and change handling
 */

// Import real modules
const featureLoader = require('../../content/feature-loader.js');
const widerChatModule = require('../../content/features/wider-chat.js');

const {
  loadSettings,
  initializeFeatures,
  handleSettingsChange,
  initWiderChat,
  destroyWiderChat,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  getFeaturesInitialized,
  _resetForTesting,
} = featureLoader;

const { init: widerChatInit, destroy: widerChatDestroy, _internals } = widerChatModule;
const { STYLE_ID, getState: getWiderChatState } = _internals;

describe('Feature System - Integration Tests', () => {
  beforeEach(() => {
    global.resetAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Reset feature loader's internal state
    _resetForTesting();

    // Reset wider chat module state
    try {
      widerChatDestroy();
    } catch (e) {}

    // Set up the features on window as they would be in the browser
    window.BetterGeminiWiderChat = {
      init: widerChatInit,
      destroy: widerChatDestroy,
    };

    // Mock other features that we're not testing directly
    window.BetterGeminiExport = {
      init: jest.fn(),
    };

    window.BetterGeminiKeyboardShortcuts = {
      init: jest.fn(),
      destroy: jest.fn(),
    };
  });

  afterEach(() => {
    // Clean up
    try {
      widerChatDestroy();
    } catch (e) {}

    delete window.BetterGeminiWiderChat;
    delete window.BetterGeminiExport;
    delete window.BetterGeminiKeyboardShortcuts;
  });

  describe('Feature Loader with Real Features', () => {
    test('initializes all features when all enabled', async () => {
      // Set all features enabled in storage
      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });

      // Initialize features
      await initializeFeatures();

      // Verify wider chat was initialized (check for style injection)
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      // Verify mock features were called
      expect(window.BetterGeminiExport.init).toHaveBeenCalled();
      expect(window.BetterGeminiKeyboardShortcuts.init).toHaveBeenCalled();

      // Verify initialization state
      const state = getFeaturesInitialized();
      expect(state.exportMarkdown).toBe(true);
      expect(state.keyboardShortcuts).toBe(true);
      expect(state.widerChatWidth).toBe(true);
    });

    test('skips disabled features', async () => {
      // Only enable wider chat
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: false,
          keyboardShortcuts: false,
          widerChatWidth: true,
        },
      });

      await initializeFeatures();

      // Verify only wider chat was initialized
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      // Other features should not be initialized
      expect(window.BetterGeminiExport.init).not.toHaveBeenCalled();
      expect(window.BetterGeminiKeyboardShortcuts.init).not.toHaveBeenCalled();

      // Verify state
      const state = getFeaturesInitialized();
      expect(state.exportMarkdown).toBe(false);
      expect(state.keyboardShortcuts).toBe(false);
      expect(state.widerChatWidth).toBe(true);
    });

    test('skips all features when all disabled', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: false,
          keyboardShortcuts: false,
          widerChatWidth: false,
        },
      });

      await initializeFeatures();

      // No features should be initialized
      expect(document.getElementById(STYLE_ID)).toBeNull();
      expect(window.BetterGeminiExport.init).not.toHaveBeenCalled();
      expect(window.BetterGeminiKeyboardShortcuts.init).not.toHaveBeenCalled();

      const state = getFeaturesInitialized();
      expect(state.exportMarkdown).toBe(false);
      expect(state.keyboardShortcuts).toBe(false);
      expect(state.widerChatWidth).toBe(false);
    });
  });

  describe('Settings Change Handling', () => {
    test('enables feature when settings change from false to true', async () => {
      // Start with wider chat disabled
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          widerChatWidth: false,
        },
      });

      await initializeFeatures();

      // Verify wider chat is not initialized
      expect(document.getElementById(STYLE_ID)).toBeNull();

      // Simulate settings change to enable wider chat
      const changes = {
        [STORAGE_KEY]: {
          oldValue: { widerChatWidth: false },
          newValue: { widerChatWidth: true },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Verify wider chat is now initialized
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('disables feature when settings change from true to false', async () => {
      // Start with wider chat enabled
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          widerChatWidth: true,
        },
      });

      await initializeFeatures();

      // Verify wider chat is initialized
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      // Simulate settings change to disable wider chat
      const changes = {
        [STORAGE_KEY]: {
          oldValue: { widerChatWidth: true },
          newValue: { widerChatWidth: false },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Verify wider chat styles are removed
      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('handles multiple feature changes simultaneously', async () => {
      // Start with specific settings
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: false,
          keyboardShortcuts: true,
          widerChatWidth: false,
        },
      });

      await initializeFeatures();

      // Clear mocks for the change verification
      window.BetterGeminiKeyboardShortcuts.init.mockClear();
      window.BetterGeminiKeyboardShortcuts.destroy.mockClear();

      // Change: enable export, disable shortcuts, enable wider chat
      const changes = {
        [STORAGE_KEY]: {
          newValue: {
            exportMarkdown: true,
            keyboardShortcuts: false,
            widerChatWidth: true,
          },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Export should be initialized (it was false, now true)
      expect(window.BetterGeminiExport.init).toHaveBeenCalled();

      // Shortcuts should be destroyed (it was true, now false)
      expect(window.BetterGeminiKeyboardShortcuts.destroy).toHaveBeenCalled();

      // Wider chat should be initialized (it was false, now true)
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('ignores changes from local storage', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: false },
      });

      await initializeFeatures();

      const changes = {
        [STORAGE_KEY]: {
          newValue: { widerChatWidth: true },
        },
      };

      // Use 'local' instead of 'sync'
      handleSettingsChange(changes, 'local');

      // Should not have enabled wider chat
      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('ignores changes without storage key', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: false },
      });

      await initializeFeatures();

      const changes = {
        otherKey: {
          newValue: { widerChatWidth: true },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Should not have enabled wider chat
      expect(document.getElementById(STYLE_ID)).toBeNull();
    });
  });

  describe('Wider Chat Integration', () => {
    test('wider chat styles persist in DOM after initialization', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: true },
      });

      await initializeFeatures();

      // Check style element exists
      const styleEl = document.getElementById(STYLE_ID);
      expect(styleEl).toBeTruthy();

      // Check style contains expected CSS
      expect(styleEl.textContent).toContain('max-width: 98%');
      expect(styleEl.textContent).toContain('.conversation-container');
    });

    test('wider chat MutationObserver is active after initialization', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: true },
      });

      await initializeFeatures();

      // Get wider chat internal state
      const widerChatState = getWiderChatState();

      expect(widerChatState.isInitialized).toBe(true);
      expect(widerChatState.observer).toBeTruthy();
      expect(widerChatState.observer.observing).toBe(true);
    });

    test('wider chat cleanup removes styles and stops observer', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: true },
      });

      await initializeFeatures();

      // Verify initialized
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
      expect(getWiderChatState().observer.observing).toBe(true);

      // Disable via settings change
      const changes = {
        [STORAGE_KEY]: {
          newValue: { widerChatWidth: false },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Verify cleaned up
      expect(document.getElementById(STYLE_ID)).toBeNull();
      expect(getWiderChatState().isInitialized).toBe(false);
    });

    test('wider chat re-injects styles if removed during use', async () => {
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: true },
      });

      await initializeFeatures();

      // Manually remove the style (simulating external modification)
      const styleEl = document.getElementById(STYLE_ID);
      styleEl.remove();

      // Verify removed
      expect(document.getElementById(STYLE_ID)).toBeNull();

      // Get observer and trigger mutation
      const widerChatState = getWiderChatState();
      widerChatState.observer.trigger([]);

      // Style should be re-injected
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });
  });

  describe('Complete User Flow', () => {
    test('user enables feature via settings change', async () => {
      // Start with feature disabled
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: true,
          keyboardShortcuts: true,
          widerChatWidth: false,
        },
      });

      // Initialize (simulating page load)
      await initializeFeatures();

      expect(document.getElementById(STYLE_ID)).toBeNull();

      // User goes to options page and enables wider chat
      // This triggers storage change event
      const changes = {
        [STORAGE_KEY]: {
          oldValue: {
            exportMarkdown: true,
            keyboardShortcuts: true,
            widerChatWidth: false,
          },
          newValue: {
            exportMarkdown: true,
            keyboardShortcuts: true,
            widerChatWidth: true,
          },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Feature should now be active
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('user disables feature via settings change', async () => {
      // Start with feature enabled
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: true,
          keyboardShortcuts: true,
          widerChatWidth: true,
        },
      });

      await initializeFeatures();

      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      // User disables wider chat
      const changes = {
        [STORAGE_KEY]: {
          oldValue: {
            exportMarkdown: true,
            keyboardShortcuts: true,
            widerChatWidth: true,
          },
          newValue: {
            exportMarkdown: true,
            keyboardShortcuts: true,
            widerChatWidth: false,
          },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Feature should now be inactive
      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('feature stays disabled through page reload', async () => {
      // User previously disabled wider chat
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          widerChatWidth: false,
        },
      });

      // Simulate page reload by calling initializeFeatures
      await initializeFeatures();

      // Feature should still be disabled
      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('default settings apply on fresh install', async () => {
      // Fresh install - no settings in storage
      // Storage is empty after resetAllMocks

      await initializeFeatures();

      // All default features should be enabled
      expect(document.getElementById(STYLE_ID)).toBeTruthy(); // widerChatWidth default: true
      expect(window.BetterGeminiExport.init).toHaveBeenCalled(); // exportMarkdown default: true
      expect(window.BetterGeminiKeyboardShortcuts.init).toHaveBeenCalled(); // keyboardShortcuts default: true
    });
  });

  describe('Error Handling', () => {
    test('continues with other features when one fails to initialize', async () => {
      // Make export init throw
      window.BetterGeminiExport.init = jest.fn(() => {
        throw new Error('Export init failed');
      });

      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });

      // Should not throw
      await expect(initializeFeatures()).resolves.not.toThrow();

      // Other features should still initialize
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
      expect(window.BetterGeminiKeyboardShortcuts.init).toHaveBeenCalled();
    });

    test('continues with other features when one fails to destroy', async () => {
      // Initialize all features
      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
      await initializeFeatures();

      // Make keyboard shortcuts destroy throw
      window.BetterGeminiKeyboardShortcuts.destroy = jest.fn(() => {
        throw new Error('Destroy failed');
      });

      // Disable all features
      const changes = {
        [STORAGE_KEY]: {
          newValue: {
            exportMarkdown: false,
            keyboardShortcuts: false,
            widerChatWidth: false,
          },
        },
      };

      // Should not throw
      expect(() => handleSettingsChange(changes, 'sync')).not.toThrow();

      // Wider chat should still be cleaned up
      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('handles storage errors gracefully during initialization', async () => {
      // Make storage.sync.get fail
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw and should use defaults
      await expect(initializeFeatures()).resolves.not.toThrow();

      // Default settings have all features enabled
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });
  });

  describe('Feature Independence', () => {
    test('disabling one feature does not affect others', async () => {
      // Start with all enabled
      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
      await initializeFeatures();

      expect(document.getElementById(STYLE_ID)).toBeTruthy();
      expect(window.BetterGeminiKeyboardShortcuts.init).toHaveBeenCalledTimes(1);

      // Disable only keyboard shortcuts
      const changes = {
        [STORAGE_KEY]: {
          newValue: {
            exportMarkdown: true,
            keyboardShortcuts: false,
            widerChatWidth: true,
          },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Keyboard shortcuts should be destroyed
      expect(window.BetterGeminiKeyboardShortcuts.destroy).toHaveBeenCalled();

      // Wider chat should still be active
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('enabling one feature does not reinitialize others', async () => {
      // Start with some enabled, some disabled
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: true,
          keyboardShortcuts: true,
          widerChatWidth: false,
        },
      });

      await initializeFeatures();

      // Clear call counts
      window.BetterGeminiExport.init.mockClear();
      window.BetterGeminiKeyboardShortcuts.init.mockClear();

      // Enable wider chat
      const changes = {
        [STORAGE_KEY]: {
          newValue: {
            exportMarkdown: true,
            keyboardShortcuts: true,
            widerChatWidth: true,
          },
        },
      };

      handleSettingsChange(changes, 'sync');

      // Wider chat should be initialized
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      // Other features should not be re-initialized
      expect(window.BetterGeminiExport.init).not.toHaveBeenCalled();
      expect(window.BetterGeminiKeyboardShortcuts.init).not.toHaveBeenCalled();
    });
  });
});
