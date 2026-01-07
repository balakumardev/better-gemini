/**
 * Better Gemini - Options Page Script
 *
 * Handles saving and loading of extension settings using chrome.storage.sync
 */

// Storage key for all feature settings
const STORAGE_KEY = 'betterGemini_features';
const MODEL_STORAGE_KEY = 'betterGemini_defaultModel';

// Default settings - all features enabled by default
const DEFAULT_SETTINGS = {
  exportMarkdown: true,
  keyboardShortcuts: true,
  widerChatWidth: true,
  defaultModel: true
};

// Default model
const DEFAULT_MODEL = 'thinking';

// DOM element references
const elements = {
  exportMarkdown: null,
  keyboardShortcuts: null,
  widerChatWidth: null,
  defaultModel: null,
  selectedModel: null,
  modelSelectorContainer: null,
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
  elements.defaultModel = document.getElementById('defaultModel');
  elements.selectedModel = document.getElementById('selectedModel');
  elements.modelSelectorContainer = document.getElementById('modelSelectorContainer');
  elements.saveButton = document.getElementById('saveButton');
  elements.saveStatus = document.getElementById('saveStatus');
}

/**
 * Load settings from chrome.storage.sync
 * If no settings exist, use defaults
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEY, MODEL_STORAGE_KEY]);
    const settings = result[STORAGE_KEY] || DEFAULT_SETTINGS;
    const selectedModel = result[MODEL_STORAGE_KEY] || DEFAULT_MODEL;

    // Apply settings to checkboxes
    elements.exportMarkdown.checked = settings.exportMarkdown !== false;
    elements.keyboardShortcuts.checked = settings.keyboardShortcuts !== false;
    elements.widerChatWidth.checked = settings.widerChatWidth !== false;
    elements.defaultModel.checked = settings.defaultModel !== false;

    // Apply selected model
    elements.selectedModel.value = selectedModel;

    // Update model selector visibility
    updateModelSelectorVisibility();

    console.log('[Better Gemini] Settings loaded:', settings, 'Model:', selectedModel);
  } catch (error) {
    console.error('[Better Gemini] Error loading settings:', error);
    // Apply defaults on error
    elements.exportMarkdown.checked = true;
    elements.keyboardShortcuts.checked = true;
    elements.widerChatWidth.checked = true;
    elements.defaultModel.checked = true;
    elements.selectedModel.value = DEFAULT_MODEL;
    updateModelSelectorVisibility();
  }
}

/**
 * Updates the visibility of the model selector based on defaultModel toggle
 */
function updateModelSelectorVisibility() {
  if (elements.defaultModel.checked) {
    elements.modelSelectorContainer.style.display = 'flex';
  } else {
    elements.modelSelectorContainer.style.display = 'none';
  }
}

/**
 * Save settings to chrome.storage.sync
 */
async function saveSettings() {
  const settings = {
    exportMarkdown: elements.exportMarkdown.checked,
    keyboardShortcuts: elements.keyboardShortcuts.checked,
    widerChatWidth: elements.widerChatWidth.checked,
    defaultModel: elements.defaultModel.checked
  };

  const selectedModel = elements.selectedModel.value;

  try {
    await chrome.storage.sync.set({
      [STORAGE_KEY]: settings,
      [MODEL_STORAGE_KEY]: selectedModel
    });
    console.log('[Better Gemini] Settings saved:', settings, 'Model:', selectedModel);
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

  // Add event listener for defaultModel toggle to show/hide model selector
  elements.defaultModel.addEventListener('change', updateModelSelectorVisibility);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
