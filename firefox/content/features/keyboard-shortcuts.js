/**
 * Better Gemini Extension - Keyboard Shortcuts Feature
 *
 * Implements power-user keyboard shortcuts for enhanced Gemini interaction.
 *
 * Features:
 * - Chat management (new, delete, navigate)
 * - Text input and editing shortcuts
 * - Draft navigation
 * - Sharing and copying
 * - Audio and file controls
 * - Help popup with shortcut reference
 *
 * Note: Content scripts cannot use ES6 module imports directly.
 */

(function() {
'use strict';

// ========== ENVIRONMENT DETECTION ==========
const IS_TEST_ENV = typeof process !== 'undefined' && process.versions && process.versions.node;
const IS_BROWSER_ENV = typeof window !== 'undefined' && typeof document !== 'undefined';

// ========== PLATFORM DETECTION ==========
const isMac = IS_BROWSER_ENV && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'metaKey' : 'ctrlKey';
const modKeyLabel = isMac ? 'Cmd' : 'Ctrl';

// ========== CONFIGURATION ==========
const SHORTCUTS_CONFIG = {
  // Debug mode
  DEBUG: false,

  // Toast notification settings
  TOAST: {
    DURATION: 2000,        // Time toast is visible (ms)
    FADE_DURATION: 300,    // Fade animation duration (ms)
  },

  // Help popup settings
  HELP_POPUP: {
    WIDTH: '500px',
    MAX_HEIGHT: '80vh',
  },

  // DOM Selectors for Gemini UI
  SELECTORS: {
    // New chat button
    NEW_CHAT: [
      'button[aria-label*="New chat"]',
      'button[data-test-id="new-chat"]',
      'a[href="/app"]',
    ],

    // Send button
    SEND_BUTTON: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'button[data-testid="send-button"]',
    ],

    // Sidebar toggle
    SIDEBAR_TOGGLE: [
      '[aria-label*="Hide side panel"]',
      '[aria-label*="Show side panel"]',
      'button[aria-label*="sidebar"]',
      '[data-test-id="sidebar-toggle"]',
    ],

    // Conversation list items
    CONVERSATIONS: [
      '[data-test-id="conversation"]',
      '.conversation-item',
      '[role="listitem"]',
    ],

    // Model response text
    MODEL_RESPONSE: [
      '.model-response-text',
      '.response-content',
      '[data-test-id="model-response"]',
    ],

    // Code blocks
    CODE_BLOCKS: [
      'code-block',
      'pre code',
      '.code-block',
    ],

    // Text input field
    TEXT_INPUT: [
      '.text-input-field',
      'div[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      '[data-placeholder="Enter a prompt here"]',
    ],

    // Stop/Start generation button
    STOP_BUTTON: [
      'button[aria-label*="Stop"]',
      'button[aria-label*="Cancel"]',
      '[data-test-id="stop-button"]',
    ],

    // Draft navigation buttons
    DRAFT_MORE: [
      'button[aria-label*="more drafts"]',
      'button[aria-label*="More drafts"]',
      '[data-test-id="generate-drafts"]',
    ],
    DRAFT_NEXT: [
      'button[aria-label*="Next draft"]',
      'button[aria-label*="next draft"]',
      '[data-test-id="next-draft"]',
    ],
    DRAFT_PREV: [
      'button[aria-label*="Previous draft"]',
      'button[aria-label*="previous draft"]',
      '[data-test-id="prev-draft"]',
    ],

    // Share/link buttons
    SHARE_LINK: [
      'button[aria-label*="Share"]',
      'button[aria-label*="Copy link"]',
      '[data-test-id="share-button"]',
    ],

    // Audio controls
    AUDIO_PLAY: [
      'button[aria-label*="Play"]',
      'button[aria-label*="Pause"]',
      '[data-test-id="audio-toggle"]',
    ],

    // Voice input button
    VOICE_INPUT: [
      'button[aria-label*="voice"]',
      'button[aria-label*="microphone"]',
      '[data-test-id="voice-input"]',
    ],

    // File upload button
    FILE_UPLOAD: [
      'button[aria-label*="Upload"]',
      'button[aria-label*="Attach"]',
      'input[type="file"]',
      '[data-test-id="file-upload"]',
    ],

    // Edit response button
    EDIT_BUTTON: [
      'button[aria-label*="Edit"]',
      '[data-test-id="edit-response"]',
    ],

    // Delete chat button
    DELETE_CHAT: [
      'button[aria-label*="Delete"]',
      '[data-test-id="delete-chat"]',
    ],

    // Sidebar container (for finding chats)
    SIDEBAR: [
      '[data-test-id="sidebar"]',
      '.sidebar',
      'nav',
    ],
  },
};

// ========== LOGGING UTILITIES ==========

/**
 * Logs a message if debug mode is enabled
 * @param {string} message - The message to log
 * @param {*} data - Optional data to log
 */
function log(message, data = null) {
  if (SHORTCUTS_CONFIG.DEBUG) {
    const prefix = '[Better Gemini Shortcuts]';
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
  const prefix = '[Better Gemini Shortcuts Error]';
  if (error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
}

// ========== DOM UTILITIES ==========

/**
 * Queries the DOM using multiple selectors, returning the first match
 * @param {string[]} selectors - Array of CSS selectors to try
 * @returns {Element|null} The first matching element or null
 */
function queryWithSelectors(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

/**
 * Queries the DOM using multiple selectors, returning all matches
 * @param {string[]} selectors - Array of CSS selectors to try
 * @returns {Element[]} Array of matching elements
 */
function queryAllWithSelectors(selectors) {
  const results = [];
  const seen = new Set();

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (!seen.has(el)) {
        seen.add(el);
        results.push(el);
      }
    });
  }
  return results;
}

/**
 * Simulates a click on an element
 * @param {Element} element - The element to click
 * @returns {boolean} True if click was successful
 */
function clickElement(element) {
  if (!element) return false;

  try {
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    element.dispatchEvent(clickEvent);
    return true;
  } catch (e) {
    logError('Failed to click element', e);
    return false;
  }
}

// ========== TOAST NOTIFICATIONS ==========

let toastContainer = null;

/**
 * Ensures the toast container exists
 */
function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) {
    return;
  }

  toastContainer = document.createElement('div');
  toastContainer.id = 'better-gemini-toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
}

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info'
 */
function showToast(message, type = 'info') {
  ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = 'better-gemini-toast';

  const colors = {
    success: { bg: '#1e7e34', border: '#28a745' },
    error: { bg: '#c82333', border: '#dc3545' },
    info: { bg: '#0056b3', border: '#007bff' },
  };

  const colorSet = colors[type] || colors.info;

  toast.style.cssText = `
    background: ${colorSet.bg};
    border: 1px solid ${colorSet.border};
    color: white;
    padding: 10px 16px;
    border-radius: 6px;
    font-family: 'Google Sans', Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    opacity: 0;
    transform: translateY(20px);
    transition: opacity ${SHORTCUTS_CONFIG.TOAST.FADE_DURATION}ms ease,
                transform ${SHORTCUTS_CONFIG.TOAST.FADE_DURATION}ms ease;
    pointer-events: auto;
    max-width: 350px;
    word-wrap: break-word;
  `;

  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, SHORTCUTS_CONFIG.TOAST.FADE_DURATION);
  }, SHORTCUTS_CONFIG.TOAST.DURATION);
}

// ========== HELP POPUP ==========

let helpPopup = null;

/**
 * Keyboard shortcut definitions for help display
 */
const SHORTCUT_DEFINITIONS = {
  'Chat Management': [
    { keys: `${modKeyLabel}+Shift+O`, description: 'Open new chat' },
    { keys: `${modKeyLabel}+Shift+Backspace`, description: 'Delete current chat' },
    { keys: `${modKeyLabel}+B`, description: 'Toggle sidebar' },
    { keys: 'Alt+1-9', description: 'Go to nth chat in sidebar' },
    { keys: `${modKeyLabel}+Shift+=`, description: 'Next chat' },
    { keys: `${modKeyLabel}+Shift+-`, description: 'Previous chat' },
  ],
  'Text Input & Editing': [
    { keys: 'Shift+Esc', description: 'Focus chat input' },
    { keys: `${modKeyLabel}+Shift+E`, description: 'Edit text' },
    { keys: `${modKeyLabel}+Shift+;`, description: 'Copy last code block' },
    { keys: `${modKeyLabel}+Shift+\'`, description: 'Copy second-to-last code block' },
    { keys: `${modKeyLabel}+Shift+C`, description: 'Copy response' },
    { keys: `${modKeyLabel}+Shift+K`, description: 'Stop/start generation' },
  ],
  'Draft Navigation': [
    { keys: `${modKeyLabel}+Shift+D`, description: 'Generate more drafts' },
    { keys: `${modKeyLabel}+Shift+,`, description: 'Previous draft' },
    { keys: `${modKeyLabel}+Shift+.`, description: 'Next draft' },
  ],
  'Sharing': [
    { keys: `${modKeyLabel}+Shift+L`, description: 'Copy prompt/response link' },
    { keys: `${modKeyLabel}+Shift+M`, description: 'Copy chat link' },
  ],
  'Audio & Files': [
    { keys: `${modKeyLabel}+Shift+Y`, description: 'Play/pause audio' },
    { keys: `${modKeyLabel}+Shift+S`, description: 'Voice to text' },
    { keys: `${modKeyLabel}+O`, description: 'Open file' },
  ],
  'Help': [
    { keys: `${modKeyLabel}+Shift+?`, description: 'Show this help popup' },
  ],
};

/**
 * Creates and shows the help popup
 */
function showHelpPopup() {
  if (helpPopup && document.body.contains(helpPopup)) {
    hideHelpPopup();
    return;
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'better-gemini-help-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999998;
    opacity: 0;
    transition: opacity 200ms ease;
  `;

  // Create popup
  helpPopup = document.createElement('div');
  helpPopup.id = 'better-gemini-help-popup';
  helpPopup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    width: ${SHORTCUTS_CONFIG.HELP_POPUP.WIDTH};
    max-height: ${SHORTCUTS_CONFIG.HELP_POPUP.MAX_HEIGHT};
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    overflow: hidden;
    opacity: 0;
    transition: opacity 200ms ease, transform 200ms ease;
    font-family: 'Google Sans', Arial, sans-serif;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid #3c3c3c;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #252525;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Better Gemini Keyboard Shortcuts';
  title.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #e8eaed;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u00D7';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    color: #9aa0a6;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 150ms ease;
  `;
  closeBtn.onmouseover = () => { closeBtn.style.color = '#e8eaed'; };
  closeBtn.onmouseout = () => { closeBtn.style.color = '#9aa0a6'; };
  closeBtn.onclick = hideHelpPopup;

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 16px 20px;
    overflow-y: auto;
    max-height: calc(${SHORTCUTS_CONFIG.HELP_POPUP.MAX_HEIGHT} - 60px);
  `;

  // Build sections
  for (const [sectionName, shortcuts] of Object.entries(SHORTCUT_DEFINITIONS)) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = sectionName;
    sectionTitle.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 500;
      color: #8ab4f8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    section.appendChild(sectionTitle);

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
    `;

    for (const shortcut of shortcuts) {
      const row = document.createElement('tr');

      const keyCell = document.createElement('td');
      keyCell.style.cssText = `
        padding: 6px 0;
        width: 50%;
        vertical-align: middle;
      `;

      const keyBadge = document.createElement('span');
      keyBadge.style.cssText = `
        background: #3c3c3c;
        border: 1px solid #5c5c5c;
        border-radius: 4px;
        padding: 4px 8px;
        font-family: 'Roboto Mono', monospace;
        font-size: 12px;
        color: #e8eaed;
        display: inline-block;
      `;
      keyBadge.textContent = shortcut.keys;
      keyCell.appendChild(keyBadge);

      const descCell = document.createElement('td');
      descCell.style.cssText = `
        padding: 6px 0;
        color: #bdc1c6;
        font-size: 13px;
      `;
      descCell.textContent = shortcut.description;

      row.appendChild(keyCell);
      row.appendChild(descCell);
      table.appendChild(row);
    }

    section.appendChild(table);
    content.appendChild(section);
  }

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 12px 20px;
    border-top: 1px solid #3c3c3c;
    background: #252525;
    text-align: center;
    color: #9aa0a6;
    font-size: 12px;
  `;
  footer.textContent = 'Press Esc or click outside to close';

  helpPopup.appendChild(header);
  helpPopup.appendChild(content);
  helpPopup.appendChild(footer);

  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(helpPopup);

  // Close on overlay click
  overlay.onclick = hideHelpPopup;

  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    helpPopup.style.opacity = '1';
    helpPopup.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  log('Help popup shown');
}

/**
 * Hides the help popup
 */
function hideHelpPopup() {
  const overlay = document.getElementById('better-gemini-help-overlay');

  if (helpPopup) {
    helpPopup.style.opacity = '0';
    helpPopup.style.transform = 'translate(-50%, -50%) scale(0.9)';
  }

  if (overlay) {
    overlay.style.opacity = '0';
  }

  setTimeout(() => {
    if (helpPopup && helpPopup.parentNode) {
      helpPopup.parentNode.removeChild(helpPopup);
    }
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    helpPopup = null;
  }, 200);

  log('Help popup hidden');
}

// ========== SHORTCUT ACTIONS ==========

/**
 * Opens a new chat
 */
function actionNewChat() {
  const newChatBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.NEW_CHAT);
  if (newChatBtn) {
    clickElement(newChatBtn);
    showToast('New chat opened', 'success');
  } else {
    // Fallback: navigate to new chat URL
    window.location.href = 'https://gemini.google.com/app';
    showToast('Navigating to new chat', 'info');
  }
  log('Action: New chat');
}

/**
 * Deletes the current chat
 */
function actionDeleteChat() {
  const deleteBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.DELETE_CHAT);
  if (deleteBtn) {
    clickElement(deleteBtn);
    showToast('Delete chat initiated', 'info');
  } else {
    showToast('Delete button not found', 'error');
  }
  log('Action: Delete chat');
}

/**
 * Toggles the sidebar
 */
function actionToggleSidebar() {
  const sidebarToggle = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.SIDEBAR_TOGGLE);
  if (sidebarToggle) {
    clickElement(sidebarToggle);
    showToast('Sidebar toggled', 'success');
  } else {
    showToast('Sidebar toggle not found', 'error');
  }
  log('Action: Toggle sidebar');
}

/**
 * Navigates to the nth chat in sidebar
 * @param {number} n - Chat number (1-9)
 */
function actionGoToChat(n) {
  const conversations = queryAllWithSelectors(SHORTCUTS_CONFIG.SELECTORS.CONVERSATIONS);
  if (conversations.length >= n) {
    clickElement(conversations[n - 1]);
    showToast(`Switched to chat ${n}`, 'success');
  } else {
    showToast(`Chat ${n} not found`, 'error');
  }
  log('Action: Go to chat', n);
}

/**
 * Navigates to next chat
 */
function actionNextChat() {
  const conversations = queryAllWithSelectors(SHORTCUTS_CONFIG.SELECTORS.CONVERSATIONS);
  const currentIndex = findCurrentChatIndex(conversations);
  if (currentIndex < conversations.length - 1) {
    clickElement(conversations[currentIndex + 1]);
    showToast('Next chat', 'success');
  } else {
    showToast('Already at last chat', 'info');
  }
  log('Action: Next chat');
}

/**
 * Navigates to previous chat
 */
function actionPrevChat() {
  const conversations = queryAllWithSelectors(SHORTCUTS_CONFIG.SELECTORS.CONVERSATIONS);
  const currentIndex = findCurrentChatIndex(conversations);
  if (currentIndex > 0) {
    clickElement(conversations[currentIndex - 1]);
    showToast('Previous chat', 'success');
  } else {
    showToast('Already at first chat', 'info');
  }
  log('Action: Previous chat');
}

/**
 * Finds the index of the current active chat
 * @param {Element[]} conversations - List of conversation elements
 * @returns {number} Index of current chat, or 0 if not found
 */
function findCurrentChatIndex(conversations) {
  for (let i = 0; i < conversations.length; i++) {
    if (conversations[i].classList.contains('active') ||
        conversations[i].getAttribute('aria-selected') === 'true' ||
        conversations[i].hasAttribute('data-active')) {
      return i;
    }
  }
  return 0;
}

/**
 * Focuses the chat input field
 */
function actionFocusInput() {
  const input = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.TEXT_INPUT);
  if (input) {
    input.focus();
    showToast('Input focused', 'success');
  } else {
    showToast('Input field not found', 'error');
  }
  log('Action: Focus input');
}

/**
 * Triggers edit mode
 */
function actionEditText() {
  const editBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.EDIT_BUTTON);
  if (editBtn) {
    clickElement(editBtn);
    showToast('Edit mode', 'success');
  } else {
    showToast('Edit button not found', 'error');
  }
  log('Action: Edit text');
}

/**
 * Copies a code block to clipboard
 * @param {number} index - Index from end (0 = last, 1 = second-to-last)
 */
function actionCopyCodeBlock(index) {
  const codeBlocks = queryAllWithSelectors(SHORTCUTS_CONFIG.SELECTORS.CODE_BLOCKS);
  if (codeBlocks.length > index) {
    const targetBlock = codeBlocks[codeBlocks.length - 1 - index];
    const code = targetBlock.textContent || targetBlock.innerText;
    copyToClipboard(code);
    showToast(`Code block copied (${index === 0 ? 'last' : 'second-to-last'})`, 'success');
  } else {
    showToast('Code block not found', 'error');
  }
  log('Action: Copy code block', index);
}

/**
 * Copies the last response to clipboard
 */
function actionCopyResponse() {
  const responses = queryAllWithSelectors(SHORTCUTS_CONFIG.SELECTORS.MODEL_RESPONSE);
  if (responses.length > 0) {
    const lastResponse = responses[responses.length - 1];
    const text = lastResponse.textContent || lastResponse.innerText;
    copyToClipboard(text);
    showToast('Response copied', 'success');
  } else {
    showToast('No response to copy', 'error');
  }
  log('Action: Copy response');
}

/**
 * Stops or starts generation
 */
function actionToggleGeneration() {
  const stopBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.STOP_BUTTON);
  const sendBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.SEND_BUTTON);

  if (stopBtn && !stopBtn.disabled) {
    clickElement(stopBtn);
    showToast('Generation stopped', 'info');
  } else if (sendBtn && !sendBtn.disabled) {
    clickElement(sendBtn);
    showToast('Message sent', 'success');
  } else {
    showToast('No action available', 'info');
  }
  log('Action: Toggle generation');
}

/**
 * Generates more drafts
 */
function actionGenerateDrafts() {
  const draftBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.DRAFT_MORE);
  if (draftBtn) {
    clickElement(draftBtn);
    showToast('Generating more drafts', 'info');
  } else {
    showToast('Draft button not found', 'error');
  }
  log('Action: Generate drafts');
}

/**
 * Navigates to next draft
 */
function actionNextDraft() {
  const nextBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.DRAFT_NEXT);
  if (nextBtn) {
    clickElement(nextBtn);
    showToast('Next draft', 'success');
  } else {
    showToast('Next draft button not found', 'error');
  }
  log('Action: Next draft');
}

/**
 * Navigates to previous draft
 */
function actionPrevDraft() {
  const prevBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.DRAFT_PREV);
  if (prevBtn) {
    clickElement(prevBtn);
    showToast('Previous draft', 'success');
  } else {
    showToast('Previous draft button not found', 'error');
  }
  log('Action: Previous draft');
}

/**
 * Copies the current prompt/response link
 */
function actionCopyPromptLink() {
  const shareBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.SHARE_LINK);
  if (shareBtn) {
    clickElement(shareBtn);
    showToast('Share dialog opened', 'info');
  } else {
    // Fallback: copy current URL
    copyToClipboard(window.location.href);
    showToast('Current URL copied', 'success');
  }
  log('Action: Copy prompt link');
}

/**
 * Copies the chat link
 */
function actionCopyChatLink() {
  const url = window.location.href.split('?')[0]; // Remove query params
  copyToClipboard(url);
  showToast('Chat link copied', 'success');
  log('Action: Copy chat link');
}

/**
 * Toggles audio playback
 */
function actionToggleAudio() {
  const audioBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.AUDIO_PLAY);
  if (audioBtn) {
    clickElement(audioBtn);
    showToast('Audio toggled', 'success');
  } else {
    showToast('Audio button not found', 'error');
  }
  log('Action: Toggle audio');
}

/**
 * Activates voice input
 */
function actionVoiceInput() {
  const voiceBtn = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.VOICE_INPUT);
  if (voiceBtn) {
    clickElement(voiceBtn);
    showToast('Voice input activated', 'success');
  } else {
    showToast('Voice input not available', 'error');
  }
  log('Action: Voice input');
}

/**
 * Opens file dialog
 */
function actionOpenFile() {
  const fileInput = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.FILE_UPLOAD);
  if (fileInput) {
    if (fileInput.tagName === 'INPUT') {
      fileInput.click();
    } else {
      clickElement(fileInput);
    }
    showToast('File dialog opened', 'info');
  } else {
    showToast('File upload not found', 'error');
  }
  log('Action: Open file');
}

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(err => {
      logError('Clipboard write failed', err);
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

/**
 * Fallback clipboard copy using textarea
 * @param {string} text - Text to copy
 */
function fallbackCopyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position: fixed; left: -9999px; top: -9999px;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand('copy');
  } catch (err) {
    logError('Fallback copy failed', err);
  }

  document.body.removeChild(textarea);
}

// ========== URL PARAMETER HANDLING ==========

/**
 * Checks for and handles the ?q= URL parameter for prefilled prompts
 */
function handleUrlPrefill() {
  const urlParams = new URLSearchParams(window.location.search);
  const prefillPrompt = urlParams.get('q');

  if (prefillPrompt) {
    log('Found prefill prompt in URL:', prefillPrompt);

    // Wait for input field to be available
    const checkInput = setInterval(() => {
      const input = queryWithSelectors(SHORTCUTS_CONFIG.SELECTORS.TEXT_INPUT);
      if (input) {
        clearInterval(checkInput);

        // Focus and insert text
        input.focus();

        // Use execCommand for React compatibility
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        selection.removeAllRanges();
        selection.addRange(range);

        document.execCommand('insertText', false, prefillPrompt);

        showToast('Prompt prefilled from URL', 'info');
        log('Prompt prefilled successfully');

        // Clean up URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('q');
        window.history.replaceState(null, '', cleanUrl.toString());
      }
    }, 100);

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkInput), 10000);
  }
}

// ========== KEYBOARD EVENT HANDLER ==========

/**
 * Main keyboard event handler
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeydown(event) {
  // Skip if user is typing in an input field (unless it's a shortcut we want to capture)
  const activeElement = document.activeElement;
  const isInInput = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  );

  // Check for modifier combinations
  const hasShift = event.shiftKey;
  const hasMod = event[modKey];
  const hasAlt = event.altKey;

  // Help popup can always be closed with Escape
  if (event.key === 'Escape' && helpPopup) {
    event.preventDefault();
    hideHelpPopup();
    return;
  }

  // Shift+Esc: Focus input (works even in input)
  if (hasShift && event.key === 'Escape') {
    event.preventDefault();
    actionFocusInput();
    return;
  }

  // Alt+1-9: Go to nth chat (works anywhere)
  if (hasAlt && event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    actionGoToChat(parseInt(event.key, 10));
    return;
  }

  // Skip other shortcuts if in input field
  if (isInInput && !hasMod) {
    return;
  }

  // Cmd/Ctrl + B: Toggle sidebar
  if (hasMod && !hasShift && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    actionToggleSidebar();
    return;
  }

  // Cmd/Ctrl + O: Open file
  if (hasMod && !hasShift && event.key.toLowerCase() === 'o') {
    event.preventDefault();
    actionOpenFile();
    return;
  }

  // Shortcuts with Cmd/Ctrl + Shift
  if (hasMod && hasShift) {
    switch (event.key.toLowerCase()) {
      case 'o':
        event.preventDefault();
        actionNewChat();
        break;

      case 'backspace':
        event.preventDefault();
        actionDeleteChat();
        break;

      case '=':
      case '+':
        event.preventDefault();
        actionNextChat();
        break;

      case '-':
      case '_':
        event.preventDefault();
        actionPrevChat();
        break;

      case 'e':
        event.preventDefault();
        actionEditText();
        break;

      case ';':
      case ':':
        event.preventDefault();
        actionCopyCodeBlock(0); // Last code block
        break;

      case '\'':
      case '"':
        event.preventDefault();
        actionCopyCodeBlock(1); // Second-to-last code block
        break;

      case 'c':
        event.preventDefault();
        actionCopyResponse();
        break;

      case 'k':
        event.preventDefault();
        actionToggleGeneration();
        break;

      case 'd':
        event.preventDefault();
        actionGenerateDrafts();
        break;

      case ',':
      case '<':
        event.preventDefault();
        actionPrevDraft();
        break;

      case '.':
      case '>':
        event.preventDefault();
        actionNextDraft();
        break;

      case 'l':
        event.preventDefault();
        actionCopyPromptLink();
        break;

      case 'm':
        event.preventDefault();
        actionCopyChatLink();
        break;

      case 'y':
        event.preventDefault();
        actionToggleAudio();
        break;

      case 's':
        event.preventDefault();
        actionVoiceInput();
        break;

      case '?':
      case '/':
        event.preventDefault();
        showHelpPopup();
        break;

      default:
        // No matching shortcut
        break;
    }
  }
}

// ========== INITIALIZATION AND CLEANUP ==========

let isInitialized = false;

/**
 * Initializes the keyboard shortcuts feature
 * Sets up event listeners and handles URL prefill
 */
function init() {
  if (isInitialized) {
    log('Keyboard shortcuts already initialized');
    return;
  }

  log('Initializing keyboard shortcuts...');
  log('Platform:', isMac ? 'macOS' : 'Windows/Linux');
  log('Modifier key:', modKeyLabel);

  // Add keydown listener
  document.addEventListener('keydown', handleKeydown, true);

  // Handle URL prefill
  handleUrlPrefill();

  isInitialized = true;
  log('Keyboard shortcuts initialized successfully');

  // Show init toast (only in browser)
  if (IS_BROWSER_ENV) {
    showToast(`Shortcuts enabled (${modKeyLabel}+Shift+? for help)`, 'info');
  }
}

/**
 * Destroys the keyboard shortcuts feature
 * Removes all event listeners and cleans up DOM elements
 */
function destroy() {
  if (!isInitialized) {
    log('Keyboard shortcuts not initialized');
    return;
  }

  log('Destroying keyboard shortcuts...');

  // Remove keydown listener
  document.removeEventListener('keydown', handleKeydown, true);

  // Remove toast container
  if (toastContainer && toastContainer.parentNode) {
    toastContainer.parentNode.removeChild(toastContainer);
    toastContainer = null;
  }

  // Remove help popup
  hideHelpPopup();

  isInitialized = false;
  log('Keyboard shortcuts destroyed');
}

// ========== BROWSER EXPORTS ==========
// Expose init/destroy on window for the feature loader to use
// Do NOT auto-initialize - let the feature loader control initialization based on settings

if (IS_BROWSER_ENV && !IS_TEST_ENV) {
  window.BetterGeminiKeyboardShortcuts = {
    init,
    destroy,
    showHelpPopup,
    hideHelpPopup,
  };
}

// ========== EXPORTS ==========

if (IS_TEST_ENV) {
  module.exports = {
    // Main functions
    init,
    destroy,

    // Configuration
    SHORTCUTS_CONFIG,
    SHORTCUT_DEFINITIONS,

    // Platform detection
    isMac,
    modKey,
    modKeyLabel,

    // UI functions
    showToast,
    showHelpPopup,
    hideHelpPopup,

    // Action functions
    actionNewChat,
    actionDeleteChat,
    actionToggleSidebar,
    actionGoToChat,
    actionNextChat,
    actionPrevChat,
    actionFocusInput,
    actionEditText,
    actionCopyCodeBlock,
    actionCopyResponse,
    actionToggleGeneration,
    actionGenerateDrafts,
    actionNextDraft,
    actionPrevDraft,
    actionCopyPromptLink,
    actionCopyChatLink,
    actionToggleAudio,
    actionVoiceInput,
    actionOpenFile,

    // Utility functions
    queryWithSelectors,
    queryAllWithSelectors,
    clickElement,
    copyToClipboard,
    handleKeydown,
    handleUrlPrefill,
  };
}

})();
