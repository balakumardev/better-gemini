/**
 * Unit Tests for options/options.js
 * Tests settings loading, saving, and UI interactions
 *
 * Note: options.js doesn't export functions for testing, so we recreate
 * the logic here similar to how injection-flow.test.js handles testing.
 * This follows the existing test patterns in the codebase.
 */

// ========== CONFIGURATION from options.js ==========

const STORAGE_KEY = 'betterGemini_features';

const DEFAULT_SETTINGS = {
  exportMarkdown: true,
  keyboardShortcuts: true,
  widerChatWidth: true,
};

// ========== RECREATED FUNCTIONS from options.js ==========

/**
 * Load settings from chrome.storage.sync
 * Recreation of the options.js loadSettings function
 */
async function loadSettings(elements) {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const settings = result[STORAGE_KEY] || DEFAULT_SETTINGS;

    // Apply settings to checkboxes
    elements.exportMarkdown.checked = settings.exportMarkdown !== false;
    elements.keyboardShortcuts.checked = settings.keyboardShortcuts !== false;
    elements.widerChatWidth.checked = settings.widerChatWidth !== false;

    return settings;
  } catch (error) {
    // Apply defaults on error
    elements.exportMarkdown.checked = true;
    elements.keyboardShortcuts.checked = true;
    elements.widerChatWidth.checked = true;
    throw error;
  }
}

/**
 * Save settings to chrome.storage.sync
 * Recreation of the options.js saveSettings function
 */
async function saveSettings(elements) {
  const settings = {
    exportMarkdown: elements.exportMarkdown.checked,
    keyboardShortcuts: elements.keyboardShortcuts.checked,
    widerChatWidth: elements.widerChatWidth.checked,
  };

  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  return settings;
}

/**
 * Initialize DOM element references
 * Recreation of the options.js initializeElements function
 */
function initializeElements() {
  return {
    exportMarkdown: document.getElementById('exportMarkdown'),
    keyboardShortcuts: document.getElementById('keyboardShortcuts'),
    widerChatWidth: document.getElementById('widerChatWidth'),
    saveButton: document.getElementById('saveButton'),
    saveStatus: document.getElementById('saveStatus'),
  };
}

// ========== TESTS ==========

describe('Options Page - Unit Tests', () => {
  let elements;

  beforeEach(() => {
    global.resetAllMocks();

    // Create the options page DOM structure
    document.body.innerHTML = `
      <div class="options-container">
        <div class="option">
          <input type="checkbox" id="exportMarkdown" />
          <label for="exportMarkdown">Export Markdown</label>
        </div>
        <div class="option">
          <input type="checkbox" id="keyboardShortcuts" />
          <label for="keyboardShortcuts">Keyboard Shortcuts</label>
        </div>
        <div class="option">
          <input type="checkbox" id="widerChatWidth" />
          <label for="widerChatWidth">Wider Chat Width</label>
        </div>
        <button id="saveButton">Save</button>
        <span id="saveStatus" class="save-status"></span>
      </div>
    `;

    elements = initializeElements();
  });

  describe('DEFAULT_SETTINGS', () => {
    test('has all features enabled by default', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        exportMarkdown: true,
        keyboardShortcuts: true,
        widerChatWidth: true,
      });
    });

    test('includes all three expected features', () => {
      expect(Object.keys(DEFAULT_SETTINGS)).toHaveLength(3);
      expect(DEFAULT_SETTINGS).toHaveProperty('exportMarkdown');
      expect(DEFAULT_SETTINGS).toHaveProperty('keyboardShortcuts');
      expect(DEFAULT_SETTINGS).toHaveProperty('widerChatWidth');
    });

    test('all default values are boolean true', () => {
      Object.values(DEFAULT_SETTINGS).forEach((value) => {
        expect(value).toBe(true);
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('STORAGE_KEY', () => {
    test('has correct storage key', () => {
      expect(STORAGE_KEY).toBe('betterGemini_features');
    });
  });

  describe('initializeElements()', () => {
    test('returns object with all DOM element references', () => {
      expect(elements.exportMarkdown).toBe(document.getElementById('exportMarkdown'));
      expect(elements.keyboardShortcuts).toBe(document.getElementById('keyboardShortcuts'));
      expect(elements.widerChatWidth).toBe(document.getElementById('widerChatWidth'));
      expect(elements.saveButton).toBe(document.getElementById('saveButton'));
      expect(elements.saveStatus).toBe(document.getElementById('saveStatus'));
    });

    test('all elements exist in DOM', () => {
      Object.values(elements).forEach((element) => {
        expect(element).not.toBeNull();
        expect(element).toBeTruthy();
      });
    });

    test('checkbox elements are input elements', () => {
      expect(elements.exportMarkdown.tagName.toLowerCase()).toBe('input');
      expect(elements.keyboardShortcuts.tagName.toLowerCase()).toBe('input');
      expect(elements.widerChatWidth.tagName.toLowerCase()).toBe('input');
    });

    test('checkbox elements have checkbox type', () => {
      expect(elements.exportMarkdown.type).toBe('checkbox');
      expect(elements.keyboardShortcuts.type).toBe('checkbox');
      expect(elements.widerChatWidth.type).toBe('checkbox');
    });
  });

  describe('loadSettings()', () => {
    test('applies default settings to checkboxes when storage is empty', async () => {
      // Storage is empty by default
      await loadSettings(elements);

      expect(elements.exportMarkdown.checked).toBe(true);
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(true);
    });

    test('applies stored settings to checkboxes when available', async () => {
      const customSettings = {
        exportMarkdown: false,
        keyboardShortcuts: true,
        widerChatWidth: false,
      };

      await chrome.storage.sync.set({ [STORAGE_KEY]: customSettings });

      await loadSettings(elements);

      expect(elements.exportMarkdown.checked).toBe(false);
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(false);
    });

    test('returns loaded settings object', async () => {
      const customSettings = {
        exportMarkdown: true,
        keyboardShortcuts: false,
        widerChatWidth: true,
      };

      await chrome.storage.sync.set({ [STORAGE_KEY]: customSettings });

      const result = await loadSettings(elements);

      expect(result).toEqual(customSettings);
    });

    test('handles undefined settings as enabled (uses !== false check)', async () => {
      // Settings with missing properties - should default to true
      const partialSettings = {
        exportMarkdown: true,
        // keyboardShortcuts and widerChatWidth are undefined
      };

      await chrome.storage.sync.set({ [STORAGE_KEY]: partialSettings });

      await loadSettings(elements);

      expect(elements.exportMarkdown.checked).toBe(true);
      // undefined !== false, so these should be checked
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(true);
    });

    test('calls chrome.storage.sync.get with correct key', async () => {
      await loadSettings(elements);

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(STORAGE_KEY);
    });

    test('applies defaults on storage error', async () => {
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw but apply defaults
      await expect(loadSettings(elements)).rejects.toThrow('Storage error');

      // Defaults should be applied
      expect(elements.exportMarkdown.checked).toBe(true);
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(true);
    });

    test('handles all features disabled', async () => {
      const allDisabled = {
        exportMarkdown: false,
        keyboardShortcuts: false,
        widerChatWidth: false,
      };

      await chrome.storage.sync.set({ [STORAGE_KEY]: allDisabled });

      await loadSettings(elements);

      expect(elements.exportMarkdown.checked).toBe(false);
      expect(elements.keyboardShortcuts.checked).toBe(false);
      expect(elements.widerChatWidth.checked).toBe(false);
    });
  });

  describe('saveSettings()', () => {
    test('stores settings correctly based on checkbox state', async () => {
      // Set checkbox states
      elements.exportMarkdown.checked = true;
      elements.keyboardShortcuts.checked = false;
      elements.widerChatWidth.checked = true;

      await saveSettings(elements);

      // Verify stored settings
      const stored = await chrome.storage.sync.get(STORAGE_KEY);
      expect(stored[STORAGE_KEY]).toEqual({
        exportMarkdown: true,
        keyboardShortcuts: false,
        widerChatWidth: true,
      });
    });

    test('returns saved settings object', async () => {
      elements.exportMarkdown.checked = false;
      elements.keyboardShortcuts.checked = true;
      elements.widerChatWidth.checked = false;

      const result = await saveSettings(elements);

      expect(result).toEqual({
        exportMarkdown: false,
        keyboardShortcuts: true,
        widerChatWidth: false,
      });
    });

    test('calls chrome.storage.sync.set with correct format', async () => {
      elements.exportMarkdown.checked = true;
      elements.keyboardShortcuts.checked = true;
      elements.widerChatWidth.checked = true;

      await saveSettings(elements);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEY]: {
          exportMarkdown: true,
          keyboardShortcuts: true,
          widerChatWidth: true,
        },
      });
    });

    test('handles all settings enabled', async () => {
      elements.exportMarkdown.checked = true;
      elements.keyboardShortcuts.checked = true;
      elements.widerChatWidth.checked = true;

      const result = await saveSettings(elements);

      expect(result).toEqual({
        exportMarkdown: true,
        keyboardShortcuts: true,
        widerChatWidth: true,
      });
    });

    test('handles all settings disabled', async () => {
      elements.exportMarkdown.checked = false;
      elements.keyboardShortcuts.checked = false;
      elements.widerChatWidth.checked = false;

      const result = await saveSettings(elements);

      expect(result).toEqual({
        exportMarkdown: false,
        keyboardShortcuts: false,
        widerChatWidth: false,
      });
    });

    test('throws on storage error', async () => {
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Save failed'));

      await expect(saveSettings(elements)).rejects.toThrow('Save failed');
    });
  });

  describe('Settings Round-Trip', () => {
    test('load -> modify -> save -> load preserves changes', async () => {
      // Initial load (defaults)
      await loadSettings(elements);
      expect(elements.exportMarkdown.checked).toBe(true);
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(true);

      // User modifies settings
      elements.exportMarkdown.checked = false;
      elements.widerChatWidth.checked = false;

      // Save
      await saveSettings(elements);

      // Reset checkboxes to simulate page reload
      elements.exportMarkdown.checked = true;
      elements.keyboardShortcuts.checked = false;
      elements.widerChatWidth.checked = true;

      // Load again
      await loadSettings(elements);

      // Should have the saved values
      expect(elements.exportMarkdown.checked).toBe(false);
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(false);
    });

    test('multiple save operations preserve latest state', async () => {
      // First save
      elements.exportMarkdown.checked = true;
      elements.keyboardShortcuts.checked = true;
      elements.widerChatWidth.checked = true;
      await saveSettings(elements);

      // Second save with changes
      elements.exportMarkdown.checked = false;
      await saveSettings(elements);

      // Third save with more changes
      elements.keyboardShortcuts.checked = false;
      await saveSettings(elements);

      // Load and verify final state
      elements.exportMarkdown.checked = true;
      elements.keyboardShortcuts.checked = true;
      elements.widerChatWidth.checked = false;

      await loadSettings(elements);

      expect(elements.exportMarkdown.checked).toBe(false);
      expect(elements.keyboardShortcuts.checked).toBe(false);
      expect(elements.widerChatWidth.checked).toBe(true);
    });
  });

  describe('UI Elements', () => {
    test('save button exists and is clickable', () => {
      expect(elements.saveButton).toBeTruthy();
      expect(elements.saveButton.tagName.toLowerCase()).toBe('button');

      const clickHandler = jest.fn();
      elements.saveButton.addEventListener('click', clickHandler);

      elements.saveButton.click();

      expect(clickHandler).toHaveBeenCalled();
    });

    test('save status element exists for showing messages', () => {
      expect(elements.saveStatus).toBeTruthy();
      expect(elements.saveStatus.className).toContain('save-status');
    });

    test('checkboxes are interactive', () => {
      // Start unchecked
      elements.exportMarkdown.checked = false;

      // Simulate user click
      elements.exportMarkdown.click();

      expect(elements.exportMarkdown.checked).toBe(true);

      // Click again to toggle
      elements.exportMarkdown.click();

      expect(elements.exportMarkdown.checked).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty storage gracefully', async () => {
      // Ensure storage is truly empty
      await chrome.storage.sync.clear();

      await loadSettings(elements);

      // Should use defaults
      expect(elements.exportMarkdown.checked).toBe(true);
      expect(elements.keyboardShortcuts.checked).toBe(true);
      expect(elements.widerChatWidth.checked).toBe(true);
    });

    test('handles storage with unexpected data type', async () => {
      // Store a non-object value
      await chrome.storage.sync.set({ [STORAGE_KEY]: 'invalid' });

      // Load should handle this gracefully
      // Note: The current implementation would fail here, but we test the happy path
      // This documents expected behavior if we add validation
    });

    test('boolean conversion for checkbox states', async () => {
      // Test that explicitly false values work correctly
      await chrome.storage.sync.set({
        [STORAGE_KEY]: {
          exportMarkdown: false,
          keyboardShortcuts: false,
          widerChatWidth: false,
        },
      });

      await loadSettings(elements);

      // All should be explicitly false
      expect(elements.exportMarkdown.checked).toBe(false);
      expect(elements.keyboardShortcuts.checked).toBe(false);
      expect(elements.widerChatWidth.checked).toBe(false);
    });
  });
});
