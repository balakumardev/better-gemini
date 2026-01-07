/**
 * Better Gemini Extension - Export Full Chat Feature
 *
 * This module adds a floating "Export Chat" button at the bottom right of the page
 * that exports the entire conversation (user messages + assistant responses) as markdown.
 *
 * Features:
 * - Floating button at bottom right corner
 * - Exports complete conversation as markdown
 * - Handles SPA navigation
 * - Download as .md file or copy to clipboard
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = {
    // Button identification
    BUTTON_ID: 'better-gemini-export-chat-btn',
    STYLE_ID: 'better-gemini-export-chat-styles',

    // Selectors for Gemini's UI
    SELECTORS: {
      CONVERSATION_CONTAINER: '.conversation-container',
      USER_QUERY: 'user-query .query-content',
      USER_QUERY_FALLBACK: 'user-query',
      MODEL_RESPONSE: 'model-response .markdown',
      MODEL_RESPONSE_FALLBACK: 'model-response message-content',
      CHAT_CONTAINER: 'chat-window-content',
      CHAT_TITLE: 'span.conversation-title.gds-title-m',
      CHAT_TITLE_FALLBACK: 'button.conversation-actions-menu-button span.conversation-title',
    },

    // Debug mode
    DEBUG: false,
  };

  // ============================================================================
  // CSS STYLES - Google Material Design 3 Native Style
  // ============================================================================

  const STYLES = `
    /* Floating Action Button - Gemini-native dark style */
    #${CONFIG.BUTTON_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      height: 48px;
      padding: 0 20px;
      background-color: #394457;
      color: #c2e7ff;
      border: 1px solid #4a5568;
      border-radius: 24px;
      font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.1px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 200ms ease;
    }

    #${CONFIG.BUTTON_ID}:hover {
      background-color: #4a5a6e;
      border-color: #5a6a7e;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    #${CONFIG.BUTTON_ID}:active {
      transform: scale(0.98);
      background-color: #3a4a5e;
    }

    #${CONFIG.BUTTON_ID}:focus-visible {
      outline: 2px solid #8ab4f8;
      outline-offset: 2px;
    }

    #${CONFIG.BUTTON_ID} .export-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    #${CONFIG.BUTTON_ID} .export-label {
      white-space: nowrap;
      line-height: 1;
    }

    /* Success state */
    #${CONFIG.BUTTON_ID}.success {
      background-color: #1e4620;
      color: #81c995;
      border-color: #2e5a30;
    }

    #${CONFIG.BUTTON_ID}.success:hover {
      background-color: #2a5a2c;
    }

    /* Error state */
    #${CONFIG.BUTTON_ID}.error {
      background-color: #5c2b29;
      color: #f28b82;
      border-color: #7c3b39;
    }

    #${CONFIG.BUTTON_ID}.error:hover {
      background-color: #6c3b39;
    }

    /* Dropdown Menu - Dark theme to match Gemini */
    #${CONFIG.BUTTON_ID}-menu {
      position: fixed;
      bottom: 88px;
      right: 24px;
      z-index: 9998;
      min-width: 220px;
      background-color: #282a2c;
      border: 1px solid #3c4043;
      border-radius: 12px;
      padding: 8px 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4),
                  0 2px 8px rgba(0, 0, 0, 0.3);
      display: none;
      flex-direction: column;
      transform-origin: bottom right;
    }

    #${CONFIG.BUTTON_ID}-menu.visible {
      display: flex;
      animation: menuSlideIn 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    @keyframes menuSlideIn {
      from {
        opacity: 0;
        transform: scale(0.92);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Menu Items - Dark theme */
    #${CONFIG.BUTTON_ID}-menu button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      height: 44px;
      padding: 0 16px;
      background: transparent;
      color: #e3e3e3;
      border: none;
      font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.1px;
      text-align: left;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    #${CONFIG.BUTTON_ID}-menu button:hover {
      background-color: rgba(255, 255, 255, 0.08);
    }

    #${CONFIG.BUTTON_ID}-menu button:active {
      background-color: rgba(255, 255, 255, 0.12);
    }

    #${CONFIG.BUTTON_ID}-menu button svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex-shrink: 0;
      color: #8ab4f8;
    }

    /* Menu divider */
    #${CONFIG.BUTTON_ID}-menu hr {
      height: 1px;
      margin: 8px 0;
      background-color: rgba(0, 0, 0, 0.12);
      border: none;
    }

    /* Hide button when no chat */
    #${CONFIG.BUTTON_ID}.hidden {
      display: none;
    }
  `;

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  function log(message, data = null) {
    if (CONFIG.DEBUG) {
      const prefix = '[Better Gemini Export Chat]';
      if (data !== null) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  function logError(message, error = null) {
    const prefix = '[Better Gemini Export Chat Error]';
    if (error) {
      console.error(prefix, message, error);
    } else {
      console.error(prefix, message);
    }
  }

  // ============================================================================
  // CLIPBOARD & DOWNLOAD UTILITIES
  // ============================================================================

  /**
   * Copies text to clipboard with fallback
   */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(err => {
        logError('Clipboard write failed, using fallback', err);
        return fallbackCopyToClipboard(text);
      });
    } else {
      return fallbackCopyToClipboard(text);
    }
  }

  function fallbackCopyToClipboard(text) {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position: fixed; left: -9999px; top: -9999px;';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        logError('Fallback copy failed', err);
        reject(err);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  /**
   * Downloads text as a markdown file
   */
  function downloadAsFile(text, filename) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Gets the chat title from Gemini's UI
   * @returns {string} The chat title or a fallback
   */
  function getChatTitle() {
    // Try primary selector
    let titleEl = document.querySelector(CONFIG.SELECTORS.CHAT_TITLE);
    if (titleEl && titleEl.textContent?.trim()) {
      return titleEl.textContent.trim();
    }

    // Try fallback selector
    titleEl = document.querySelector(CONFIG.SELECTORS.CHAT_TITLE_FALLBACK);
    if (titleEl && titleEl.textContent?.trim()) {
      return titleEl.textContent.trim();
    }

    // Default fallback
    return 'Gemini Chat';
  }

  /**
   * Sanitizes a string for use as a filename
   * @param {string} str - The string to sanitize
   * @returns {string} Sanitized string safe for filenames
   */
  function sanitizeFilename(str) {
    return str
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Collapse multiple hyphens
      .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
      .substring(0, 100);            // Limit length
  }

  /**
   * Generates a filename based on current date/time and chat title
   */
  function generateFilename() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const title = getChatTitle();
    const sanitizedTitle = sanitizeFilename(title);
    return `${sanitizedTitle}-${dateStr}.md`;
  }

  // ============================================================================
  // MARKDOWN CONVERSION (shared with export-markdown.js)
  // ============================================================================

  /**
   * Converts HTML elements to markdown format
   * @param {HTMLElement} element - The element to convert
   * @returns {string} Markdown text
   */
  function convertHtmlToMarkdown(element) {
    function processNode(node, listDepth = 0) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes);

      switch (tag) {
        case 'h1':
          return `# ${processChildren(children)}\n\n`;
        case 'h2':
          return `## ${processChildren(children)}\n\n`;
        case 'h3':
          return `### ${processChildren(children)}\n\n`;
        case 'h4':
          return `#### ${processChildren(children)}\n\n`;
        case 'h5':
          return `##### ${processChildren(children)}\n\n`;
        case 'h6':
          return `###### ${processChildren(children)}\n\n`;
        case 'p':
          return `${processChildren(children)}\n\n`;
        case 'br':
          return '\n';
        case 'strong':
        case 'b':
          return `**${processChildren(children)}**`;
        case 'em':
        case 'i':
          return `*${processChildren(children)}*`;
        case 'code':
          if (node.parentElement?.tagName.toLowerCase() === 'pre') {
            return processChildren(children);
          }
          return `\`${processChildren(children)}\``;
        case 'pre': {
          const codeEl = node.querySelector('code');
          let lang = '';
          if (codeEl) {
            const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
            if (langClass) {
              lang = langClass.replace('language-', '');
            }
          }
          const codeContent = codeEl ? codeEl.textContent : node.textContent;
          return `\`\`\`${lang}\n${codeContent.trim()}\n\`\`\`\n\n`;
        }
        case 'ul':
          return processListItems(children, listDepth, false) + '\n';
        case 'ol':
          return processListItems(children, listDepth, true) + '\n';
        case 'li': {
          const indent = '  '.repeat(listDepth);
          const content = processChildren(children).trim();
          return `${indent}${content}`;
        }
        case 'a': {
          const href = node.getAttribute('href') || '';
          const text = processChildren(children);
          return `[${text}](${href})`;
        }
        case 'blockquote':
          return processChildren(children).split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
        case 'hr':
          return '---\n\n';
        case 'table':
          return processTable(node) + '\n\n';
        case 'div':
        case 'span':
        case 'article':
        case 'section':
          return processChildren(children);
        default:
          return processChildren(children);
      }
    }

    function processChildren(children) {
      return children.map(child => processNode(child)).join('');
    }

    function processListItems(children, depth, ordered) {
      let index = 1;
      return children
        .filter(child => child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li')
        .map(child => {
          const bullet = ordered ? `${index++}.` : '-';
          const indent = '  '.repeat(depth);
          const content = processNode(child, depth + 1);
          return `${indent}${bullet} ${content}`;
        })
        .join('\n');
    }

    function processTable(table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const result = [];

      rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const cellContents = cells.map(cell => processChildren(Array.from(cell.childNodes)).trim());
        result.push(`| ${cellContents.join(' | ')} |`);

        if (rowIndex === 0 && row.querySelector('th')) {
          result.push(`| ${cells.map(() => '---').join(' | ')} |`);
        }
      });

      return result.join('\n');
    }

    const rawMarkdown = processNode(element);

    return rawMarkdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ============================================================================
  // CHAT EXTRACTION
  // ============================================================================

  /**
   * Extracts all conversation turns from the page
   * @returns {Array<{role: string, content: string}>}
   */
  function extractFullChat() {
    const turns = [];
    const containers = document.querySelectorAll(CONFIG.SELECTORS.CONVERSATION_CONTAINER);

    containers.forEach((container, index) => {
      // Extract user message
      let userEl = container.querySelector(CONFIG.SELECTORS.USER_QUERY);
      if (!userEl) {
        userEl = container.querySelector(CONFIG.SELECTORS.USER_QUERY_FALLBACK);
      }

      if (userEl) {
        const userText = userEl.textContent?.trim();
        if (userText) {
          turns.push({ role: 'user', content: userText });
        }
      }

      // Extract assistant response
      let assistantEl = container.querySelector(CONFIG.SELECTORS.MODEL_RESPONSE);
      if (!assistantEl) {
        assistantEl = container.querySelector(CONFIG.SELECTORS.MODEL_RESPONSE_FALLBACK);
      }

      if (assistantEl) {
        const assistantMarkdown = convertHtmlToMarkdown(assistantEl);
        if (assistantMarkdown) {
          turns.push({ role: 'assistant', content: assistantMarkdown });
        }
      }
    });

    log(`Extracted ${turns.length} turns from ${containers.length} containers`);
    return turns;
  }

  /**
   * Formats the chat turns as markdown
   * @param {Array<{role: string, content: string}>} turns
   * @returns {string}
   */
  function formatChatAsMarkdown(turns) {
    if (turns.length === 0) {
      return '';
    }

    const lines = [];
    const chatTitle = getChatTitle();

    // Add header
    lines.push(`# ${chatTitle}`);
    lines.push(`*Exported on ${new Date().toLocaleString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    turns.forEach((turn, index) => {
      if (turn.role === 'user') {
        lines.push('## User');
        lines.push('');
        lines.push(turn.content);
        lines.push('');
      } else {
        lines.push('## Assistant');
        lines.push('');
        lines.push(turn.content);
        lines.push('');
      }

      // Add separator between conversation turns (not after the last one)
      if (index < turns.length - 1 && turn.role === 'assistant') {
        lines.push('---');
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  // ============================================================================
  // UI COMPONENTS
  // ============================================================================

  /**
   * Injects the CSS styles
   */
  function injectStyles() {
    if (document.getElementById(CONFIG.STYLE_ID)) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = CONFIG.STYLE_ID;
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  /**
   * Creates the floating export button
   */
  function createExportButton() {
    if (document.getElementById(CONFIG.BUTTON_ID)) {
      return;
    }

    const button = document.createElement('button');
    button.id = CONFIG.BUTTON_ID;
    button.setAttribute('aria-label', 'Export Chat');
    button.setAttribute('title', 'Export full chat as Markdown');

    button.innerHTML = `
      <svg class="export-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="export-label">Export</span>
    `;

    button.addEventListener('click', handleExportClick);

    document.body.appendChild(button);
    log('Export button created');

    // Create dropdown menu
    createExportMenu();

    // Initial visibility check
    updateButtonVisibility();
  }

  /**
   * Creates the export options menu
   */
  function createExportMenu() {
    if (document.getElementById(`${CONFIG.BUTTON_ID}-menu`)) {
      return;
    }

    const menu = document.createElement('div');
    menu.id = `${CONFIG.BUTTON_ID}-menu`;

    menu.innerHTML = `
      <button data-action="copy">
        <svg viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy to clipboard
      </button>
      <button data-action="download">
        <svg viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download as .md
      </button>
    `;

    // Handle menu item clicks
    menu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        handleMenuAction(action);
        hideMenu();
      });
    });

    document.body.appendChild(menu);
  }

  /**
   * Shows the export menu
   */
  function showMenu() {
    const menu = document.getElementById(`${CONFIG.BUTTON_ID}-menu`);
    if (menu) {
      menu.classList.add('visible');
    }
  }

  /**
   * Hides the export menu
   */
  function hideMenu() {
    const menu = document.getElementById(`${CONFIG.BUTTON_ID}-menu`);
    if (menu) {
      menu.classList.remove('visible');
    }
  }

  /**
   * Toggles the export menu
   */
  function toggleMenu() {
    const menu = document.getElementById(`${CONFIG.BUTTON_ID}-menu`);
    if (menu) {
      menu.classList.toggle('visible');
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles click on the export button
   */
  function handleExportClick(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  }

  /**
   * Handles menu action selection
   * @param {string} action - 'copy' or 'download'
   */
  async function handleMenuAction(action) {
    const button = document.getElementById(CONFIG.BUTTON_ID);
    const labelEl = button?.querySelector('.export-label');
    const originalText = labelEl?.textContent || 'Export Chat';

    try {
      const turns = extractFullChat();

      if (turns.length === 0) {
        throw new Error('No conversation found to export');
      }

      const markdown = formatChatAsMarkdown(turns);

      if (action === 'copy') {
        await copyToClipboard(markdown);
        showFeedback(button, labelEl, 'Copied!', 'success', originalText);
        log('Chat copied to clipboard');
      } else if (action === 'download') {
        const filename = generateFilename();
        downloadAsFile(markdown, filename);
        showFeedback(button, labelEl, 'Downloaded!', 'success', originalText);
        log('Chat downloaded as', filename);
      }

    } catch (error) {
      logError('Failed to export chat', error);
      showFeedback(button, labelEl, 'Error!', 'error', originalText);
    }
  }

  /**
   * Shows visual feedback on the button
   */
  function showFeedback(button, labelEl, text, type, originalText) {
    if (labelEl) {
      labelEl.textContent = text;
    }
    if (button) {
      button.classList.add(type);
    }

    setTimeout(() => {
      if (labelEl) {
        labelEl.textContent = originalText;
      }
      if (button) {
        button.classList.remove('success', 'error');
      }
    }, 2000);
  }

  /**
   * Updates button visibility based on whether there's a chat
   */
  function updateButtonVisibility() {
    const button = document.getElementById(CONFIG.BUTTON_ID);
    if (!button) return;

    const hasChat = document.querySelectorAll(CONFIG.SELECTORS.CONVERSATION_CONTAINER).length > 0;

    if (hasChat) {
      button.classList.remove('hidden');
    } else {
      button.classList.add('hidden');
    }
  }

  /**
   * Handles clicks outside the menu to close it
   */
  function handleDocumentClick(event) {
    const button = document.getElementById(CONFIG.BUTTON_ID);
    const menu = document.getElementById(`${CONFIG.BUTTON_ID}-menu`);

    if (menu && menu.classList.contains('visible')) {
      if (!menu.contains(event.target) && !button?.contains(event.target)) {
        hideMenu();
      }
    }
  }

  // ============================================================================
  // MUTATION OBSERVER
  // ============================================================================

  let observer = null;

  /**
   * Sets up MutationObserver to watch for chat changes
   */
  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      let shouldCheck = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches?.(CONFIG.SELECTORS.CONVERSATION_CONTAINER) ||
                  node.querySelector?.(CONFIG.SELECTORS.CONVERSATION_CONTAINER) ||
                  node.matches?.(CONFIG.SELECTORS.CHAT_CONTAINER) ||
                  node.querySelector?.(CONFIG.SELECTORS.CHAT_CONTAINER)) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
        if (shouldCheck) break;
      }

      if (shouldCheck) {
        setTimeout(updateButtonVisibility, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    log('MutationObserver set up');
  }

  // ============================================================================
  // CLEANUP / DESTROY
  // ============================================================================

  /**
   * Removes all UI elements and cleans up
   */
  function destroy() {
    // Disconnect observer
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // Remove event listeners
    document.removeEventListener('click', handleDocumentClick);

    // Remove UI elements
    const button = document.getElementById(CONFIG.BUTTON_ID);
    if (button) {
      button.remove();
    }

    const menu = document.getElementById(`${CONFIG.BUTTON_ID}-menu`);
    if (menu) {
      menu.remove();
    }

    const styles = document.getElementById(CONFIG.STYLE_ID);
    if (styles) {
      styles.remove();
    }

    log('Export Chat feature destroyed');
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initializes the Export Full Chat feature
   */
  function init() {
    log('Initializing Export Full Chat feature');

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
    // Inject styles
    injectStyles();

    // Create the floating button
    createExportButton();

    // Set up observer for chat changes
    setupObserver();

    // Handle clicks outside menu
    document.addEventListener('click', handleDocumentClick);

    // Delay initial visibility check to ensure page is loaded
    setTimeout(updateButtonVisibility, 1000);

    log('Export Full Chat feature initialized');
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  // Export for use as a module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init,
      destroy,
      extractFullChat,
      formatChatAsMarkdown,
      convertHtmlToMarkdown,
      CONFIG,
    };
  }

  // Attach to window for browser access and feature loader
  if (typeof window !== 'undefined') {
    window.BetterGeminiExportFullChat = {
      init,
      destroy,
      extractFullChat,
      formatChatAsMarkdown,
      getChatTitle,
    };
  }

})();
