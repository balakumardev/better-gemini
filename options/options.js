/**
 * Better Gemini - Options Page Script
 *
 * Handles saving and loading of extension settings using chrome.storage.sync
 */

// Storage key for all feature settings
const STORAGE_KEY = 'betterGemini_features';

// Default settings - all features enabled by default
const DEFAULT_SETTINGS = {
  exportMarkdown: true,
  keyboardShortcuts: true,
  widerChatWidth: true
};

// DOM element references
const elements = {
  exportMarkdown: null,
  keyboardShortcuts: null,
  widerChatWidth: null,
  saveButton: null,
  saveStatus: null
};

/**
 * Initialize DOM element references
 */
function initializeElements() {
  elements.exportMarkdown = document.getElementById('exportMarkdown');
  elements.keyboardShortcuts = document.getElementById('keyboardShortcuts');
  elements.widerChatWidth = document.getElementById('widerChatWidth');
  elements.saveButton = document.getElementById('saveButton');
  elements.saveStatus = document.getElementById('saveStatus');
}

/**
 * Load settings from chrome.storage.sync
 * If no settings exist, use defaults
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const settings = result[STORAGE_KEY] || DEFAULT_SETTINGS;

    // Apply settings to checkboxes
    elements.exportMarkdown.checked = settings.exportMarkdown !== false;
    elements.keyboardShortcuts.checked = settings.keyboardShortcuts !== false;
    elements.widerChatWidth.checked = settings.widerChatWidth !== false;

    console.log('[Better Gemini] Settings loaded:', settings);
  } catch (error) {
    console.error('[Better Gemini] Error loading settings:', error);
    // Apply defaults on error
    elements.exportMarkdown.checked = true;
    elements.keyboardShortcuts.checked = true;
    elements.widerChatWidth.checked = true;
  }
}

/**
 * Save settings to chrome.storage.sync
 */
async function saveSettings() {
  const settings = {
    exportMarkdown: elements.exportMarkdown.checked,
    keyboardShortcuts: elements.keyboardShortcuts.checked,
    widerChatWidth: elements.widerChatWidth.checked
  };

  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    console.log('[Better Gemini] Settings saved:', settings);
    showSaveConfirmation();
  } catch (error) {
    console.error('[Better Gemini] Error saving settings:', error);
    showSaveError();
  }
}

/**
 * Show save confirmation message
 */
function showSaveConfirmation() {
  elements.saveStatus.textContent = 'Settings saved!';
  elements.saveStatus.className = 'save-status success';

  // Clear the message after 3 seconds
  setTimeout(() => {
    elements.saveStatus.textContent = '';
    elements.saveStatus.className = 'save-status';
  }, 3000);
}

/**
 * Show save error message
 */
function showSaveError() {
  elements.saveStatus.textContent = 'Error saving settings';
  elements.saveStatus.className = 'save-status error';

  // Clear the message after 3 seconds
  setTimeout(() => {
    elements.saveStatus.textContent = '';
    elements.saveStatus.className = 'save-status';
  }, 3000);
}

/**
 * Initialize the options page
 */
function initialize() {
  initializeElements();
  loadSettings();

  // Add event listener for save button
  elements.saveButton.addEventListener('click', saveSettings);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
