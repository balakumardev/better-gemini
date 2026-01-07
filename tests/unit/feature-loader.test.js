/**
 * Unit Tests for content/feature-loader.js
 * Tests feature loading, initialization, and settings management
 */

const {
  loadSettings,
  initializeFeatures,
  handleSettingsChange,
  initExportMarkdown,
  initKeyboardShortcuts,
  initWiderChat,
  destroyKeyboardShortcuts,
  destroyWiderChat,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  getFeaturesInitialized,
  _resetForTesting,
} = require('../../content/feature-loader.js');

describe('Feature Loader - Unit Tests', () => {
  // Store original window features
  let originalBetterGeminiExport;
  let originalBetterGeminiKeyboardShortcuts;
  let originalBetterGeminiWiderChat;

  beforeEach(() => {
    global.resetAllMocks();

    // Reset the feature loader's internal state
    _resetForTesting();

    // Store originals
    originalBetterGeminiExport = window.BetterGeminiExport;
    originalBetterGeminiKeyboardShortcuts = window.BetterGeminiKeyboardShortcuts;
    originalBetterGeminiWiderChat = window.BetterGeminiWiderChat;

    // Clear any window features
    delete window.BetterGeminiExport;
    delete window.BetterGeminiKeyboardShortcuts;
    delete window.BetterGeminiWiderChat;
  });

  afterEach(() => {
    // Restore originals
    if (originalBetterGeminiExport) {
      window.BetterGeminiExport = originalBetterGeminiExport;
    }
    if (originalBetterGeminiKeyboardShortcuts) {
      window.BetterGeminiKeyboardShortcuts = originalBetterGeminiKeyboardShortcuts;
    }
    if (originalBetterGeminiWiderChat) {
      window.BetterGeminiWiderChat = originalBetterGeminiWiderChat;
    }
  });

  describe('DEFAULT_SETTINGS', () => {
    test('has all features enabled by default', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        exportMarkdown: true,
        keyboardShortcuts: true,
        widerChatWidth: true,
      });
    });

    test('includes all three features', () => {
      expect(Object.keys(DEFAULT_SETTINGS)).toHaveLength(3);
      expect(DEFAULT_SETTINGS).toHaveProperty('exportMarkdown');
      expect(DEFAULT_SETTINGS).toHaveProperty('keyboardShortcuts');
      expect(DEFAULT_SETTINGS).toHaveProperty('widerChatWidth');
    });
  });

  describe('STORAGE_KEY', () => {
    test('has correct storage key', () => {
      expect(STORAGE_KEY).toBe('betterGemini_features');
    });
  });

  describe('loadSettings()', () => {
    test('returns default settings when storage is empty', async () => {
      // Storage is empty by default after resetAllMocks
      const settings = await loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    test('returns stored settings when available', async () => {
      const customSettings = {
        exportMarkdown: false,
        keyboardShortcuts: true,
        widerChatWidth: false,
      };

      // Pre-populate storage with custom settings
      await chrome.storage.sync.set({ [STORAGE_KEY]: customSettings });

      const settings = await loadSettings();

      expect(settings).toEqual(customSettings);
    });

    test('returns default settings on storage error', async () => {
      // Make storage.sync.get throw an error
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      const settings = await loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    test('returns default settings when chrome.storage is undefined', async () => {
      const originalStorage = chrome.storage;
      chrome.storage = undefined;

      const settings = await loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);

      // Restore
      chrome.storage = originalStorage;
    });

    test('calls chrome.storage.sync.get with correct key', async () => {
      await loadSettings();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('initializeFeatures()', () => {
    test('initializes all features when all enabled', async () => {
      // Setup mock features on window
      const mockExportInit = jest.fn();
      const mockShortcutsInit = jest.fn();
      const mockWiderChatInit = jest.fn();

      window.BetterGeminiExport = { init: mockExportInit };
      window.BetterGeminiKeyboardShortcuts = { init: mockShortcutsInit };
      window.BetterGeminiWiderChat = { init: mockWiderChatInit };

      // Storage has all features enabled (default)
      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });

      await initializeFeatures();

      expect(mockExportInit).toHaveBeenCalled();
      expect(mockShortcutsInit).toHaveBeenCalled();
      expect(mockWiderChatInit).toHaveBeenCalled();
    });

    test('skips disabled features', async () => {
      const mockExportInit = jest.fn();
      const mockShortcutsInit = jest.fn();
      const mockWiderChatInit = jest.fn();

      window.BetterGeminiExport = { init: mockExportInit };
      window.BetterGeminiKeyboardShortcuts = { init: mockShortcutsInit };
      window.BetterGeminiWiderChat = { init: mockWiderChatInit };

      // Only enable keyboardShortcuts
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: false,
          keyboardShortcuts: true,
          widerChatWidth: false,
        },
      });

      await initializeFeatures();

      expect(mockExportInit).not.toHaveBeenCalled();
      expect(mockShortcutsInit).toHaveBeenCalled();
      expect(mockWiderChatInit).not.toHaveBeenCalled();
    });

    test('handles missing feature gracefully', async () => {
      // Only set up one feature
      const mockExportInit = jest.fn();
      window.BetterGeminiExport = { init: mockExportInit };
      // BetterGeminiKeyboardShortcuts and BetterGeminiWiderChat are undefined

      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });

      // Should not throw
      await expect(initializeFeatures()).resolves.not.toThrow();

      expect(mockExportInit).toHaveBeenCalled();
    });

    test('handles feature init error gracefully', async () => {
      const mockExportInit = jest.fn(() => {
        throw new Error('Init failed');
      });
      const mockShortcutsInit = jest.fn();

      window.BetterGeminiExport = { init: mockExportInit };
      window.BetterGeminiKeyboardShortcuts = { init: mockShortcutsInit };

      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });

      // Should not throw, and should continue with other features
      await expect(initializeFeatures()).resolves.not.toThrow();

      expect(mockExportInit).toHaveBeenCalled();
      expect(mockShortcutsInit).toHaveBeenCalled();
    });
  });

  describe('handleSettingsChange()', () => {
    test('ignores changes from non-sync storage areas', () => {
      const mockExportInit = jest.fn();
      window.BetterGeminiExport = { init: mockExportInit };

      const changes = {
        [STORAGE_KEY]: {
          newValue: { exportMarkdown: true },
        },
      };

      handleSettingsChange(changes, 'local');

      expect(mockExportInit).not.toHaveBeenCalled();
    });

    test('ignores changes without the storage key', () => {
      const mockExportInit = jest.fn();
      window.BetterGeminiExport = { init: mockExportInit };

      const changes = {
        otherKey: { newValue: 'something' },
      };

      handleSettingsChange(changes, 'sync');

      expect(mockExportInit).not.toHaveBeenCalled();
    });

    test('enables feature when settings change from false to true', () => {
      const mockWiderChatInit = jest.fn();
      window.BetterGeminiWiderChat = { init: mockWiderChatInit, destroy: jest.fn() };

      const changes = {
        [STORAGE_KEY]: {
          oldValue: { widerChatWidth: false },
          newValue: { widerChatWidth: true },
        },
      };

      handleSettingsChange(changes, 'sync');

      expect(mockWiderChatInit).toHaveBeenCalled();
    });

    test('disables feature when settings change from true to false', async () => {
      const mockWiderChatInit = jest.fn();
      const mockWiderChatDestroy = jest.fn();

      window.BetterGeminiWiderChat = {
        init: mockWiderChatInit,
        destroy: mockWiderChatDestroy,
      };

      // First initialize the feature
      await chrome.storage.sync.set({
        [STORAGE_KEY]: { widerChatWidth: true },
      });
      await initializeFeatures();

      expect(mockWiderChatInit).toHaveBeenCalled();

      // Now change settings to disable it
      const changes = {
        [STORAGE_KEY]: {
          oldValue: { widerChatWidth: true },
          newValue: { widerChatWidth: false },
        },
      };

      handleSettingsChange(changes, 'sync');

      expect(mockWiderChatDestroy).toHaveBeenCalled();
    });

    test('handles multiple feature changes at once', async () => {
      const mockShortcutsInit = jest.fn();
      const mockShortcutsDestroy = jest.fn();
      const mockWiderChatInit = jest.fn();
      const mockWiderChatDestroy = jest.fn();

      window.BetterGeminiKeyboardShortcuts = {
        init: mockShortcutsInit,
        destroy: mockShortcutsDestroy,
      };
      window.BetterGeminiWiderChat = {
        init: mockWiderChatInit,
        destroy: mockWiderChatDestroy,
      };

      // Initialize with shortcuts enabled, wider chat disabled
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          keyboardShortcuts: true,
          widerChatWidth: false,
        },
      });
      await initializeFeatures();

      mockShortcutsInit.mockClear();

      // Change: disable shortcuts, enable wider chat
      const changes = {
        [STORAGE_KEY]: {
          newValue: {
            keyboardShortcuts: false,
            widerChatWidth: true,
          },
        },
      };

      handleSettingsChange(changes, 'sync');

      expect(mockShortcutsDestroy).toHaveBeenCalled();
      expect(mockWiderChatInit).toHaveBeenCalled();
    });

    test('uses default settings when newValue is undefined', () => {
      const mockExportInit = jest.fn();
      window.BetterGeminiExport = { init: mockExportInit };

      const changes = {
        [STORAGE_KEY]: {
          oldValue: { exportMarkdown: false },
          newValue: undefined,
        },
      };

      // Should use DEFAULT_SETTINGS which has exportMarkdown: true
      handleSettingsChange(changes, 'sync');

      expect(mockExportInit).toHaveBeenCalled();
    });
  });

  describe('Individual Feature Initialization', () => {
    describe('initExportMarkdown()', () => {
      test('calls init on BetterGeminiExport', () => {
        const mockInit = jest.fn();
        window.BetterGeminiExport = { init: mockInit };

        initExportMarkdown();

        expect(mockInit).toHaveBeenCalled();
      });

      test('is idempotent - calling twice only initializes once', () => {
        const mockInit = jest.fn();
        window.BetterGeminiExport = { init: mockInit };

        initExportMarkdown();
        initExportMarkdown();

        expect(mockInit).toHaveBeenCalledTimes(1);
      });

      test('handles missing feature gracefully', () => {
        // BetterGeminiExport is undefined
        expect(() => initExportMarkdown()).not.toThrow();
      });
    });

    describe('initKeyboardShortcuts()', () => {
      test('calls init on BetterGeminiKeyboardShortcuts', () => {
        const mockInit = jest.fn();
        window.BetterGeminiKeyboardShortcuts = { init: mockInit };

        initKeyboardShortcuts();

        expect(mockInit).toHaveBeenCalled();
      });

      test('is idempotent', () => {
        const mockInit = jest.fn();
        window.BetterGeminiKeyboardShortcuts = { init: mockInit };

        initKeyboardShortcuts();
        initKeyboardShortcuts();

        expect(mockInit).toHaveBeenCalledTimes(1);
      });
    });

    describe('initWiderChat()', () => {
      test('calls init on BetterGeminiWiderChat', () => {
        const mockInit = jest.fn();
        window.BetterGeminiWiderChat = { init: mockInit };

        initWiderChat();

        expect(mockInit).toHaveBeenCalled();
      });

      test('is idempotent', () => {
        const mockInit = jest.fn();
        window.BetterGeminiWiderChat = { init: mockInit };

        initWiderChat();
        initWiderChat();

        expect(mockInit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Feature Destruction', () => {
    describe('destroyKeyboardShortcuts()', () => {
      test('calls destroy on initialized feature', async () => {
        const mockDestroy = jest.fn();
        window.BetterGeminiKeyboardShortcuts = {
          init: jest.fn(),
          destroy: mockDestroy,
        };

        // First initialize
        await chrome.storage.sync.set({
          [STORAGE_KEY]: { keyboardShortcuts: true },
        });
        await initializeFeatures();

        // Then destroy
        destroyKeyboardShortcuts();

        expect(mockDestroy).toHaveBeenCalled();
      });

      test('does nothing if feature not initialized', () => {
        const mockDestroy = jest.fn();
        window.BetterGeminiKeyboardShortcuts = {
          init: jest.fn(),
          destroy: mockDestroy,
        };

        // Try to destroy without initializing first
        destroyKeyboardShortcuts();

        expect(mockDestroy).not.toHaveBeenCalled();
      });
    });

    describe('destroyWiderChat()', () => {
      test('calls destroy on initialized feature', async () => {
        const mockDestroy = jest.fn();
        window.BetterGeminiWiderChat = {
          init: jest.fn(),
          destroy: mockDestroy,
        };

        // First initialize
        await chrome.storage.sync.set({
          [STORAGE_KEY]: { widerChatWidth: true },
        });
        await initializeFeatures();

        // Then destroy
        destroyWiderChat();

        expect(mockDestroy).toHaveBeenCalled();
      });

      test('does nothing if feature not initialized', () => {
        const mockDestroy = jest.fn();
        window.BetterGeminiWiderChat = {
          init: jest.fn(),
          destroy: mockDestroy,
        };

        // Try to destroy without initializing first
        destroyWiderChat();

        expect(mockDestroy).not.toHaveBeenCalled();
      });
    });
  });

  describe('getFeaturesInitialized()', () => {
    test('returns current initialization state', () => {
      const state = getFeaturesInitialized();

      expect(state).toHaveProperty('exportMarkdown');
      expect(state).toHaveProperty('keyboardShortcuts');
      expect(state).toHaveProperty('widerChatWidth');
    });

    test('returns a copy, not the original object', () => {
      const state1 = getFeaturesInitialized();
      const state2 = getFeaturesInitialized();

      // Should be equal in value
      expect(state1).toEqual(state2);

      // But not the same object reference
      expect(state1).not.toBe(state2);
    });
  });
});
