/**
 * Better Gemini Extension - Copy as Markdown Feature
 *
 * This module adds a "Copy as Markdown" button next to Gemini's native copy button
 * for each assistant response. It extracts the response content and copies it as
 * properly formatted markdown.
 *
 * Features:
 * - Adds inline "Copy MD" button next to each response's copy button
 * - Copies individual assistant responses as markdown
 * - Handles SPA navigation (watches for new responses)
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = {
    // Button identification
    BUTTON_CLASS: 'better-gemini-copy-md-btn',

    // Selectors for Gemini's UI
    SELECTORS: {
      RESPONSE_CONTAINER: '.response-container',
      BUTTONS_CONTAINER: '.buttons-container-v2',
      // Gemini's per-response copy control, most stable first. The <copy-button>
      // element name does not depend on the UI language or on build-generated
      // ids; the aria-label match is the English-UI fallback (exact match, so the
      // code block's "Copy code" and a table's "Copy table" never qualify); the
      // data-test-id is what older Gemini layouts carried.
      COPY_BUTTON_CANDIDATES: [
        'copy-button',
        'button[aria-label="Copy"]',
        '[data-test-id="copy-button"]',
      ],
      MARKDOWN_CONTENT: '.model-response-text .markdown',
      RESPONSE_CONTENT: '.response-content',
    },

    // Debug mode
    DEBUG: false,
  };

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  function log(message, data = null) {
    if (CONFIG.DEBUG) {
      const prefix = '[Better Gemini Copy MD]';
      if (data !== null) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  function logError(message, error = null) {
    const prefix = '[Better Gemini Copy MD Error]';
    if (error) {
      console.error(prefix, message, error);
    } else {
      console.error(prefix, message);
    }
  }

  // ============================================================================
  // CLIPBOARD UTILITIES
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

  // ============================================================================
  // MARKDOWN EXTRACTION
  // ============================================================================

  /**
   * Extracts markdown content from a response container
   * @param {HTMLElement} responseContainer - The .response-container element
   * @returns {string} The extracted markdown text
   */
  function extractMarkdownFromResponse(responseContainer) {
    const markdownEl = responseContainer.querySelector(CONFIG.SELECTORS.MARKDOWN_CONTENT);
    if (!markdownEl) {
      // Fallback to response content
      const responseContent = responseContainer.querySelector(CONFIG.SELECTORS.RESPONSE_CONTENT);
      return responseContent ? responseContent.textContent.trim() : '';
    }

    // Convert HTML to markdown-like text
    return convertHtmlToMarkdown(markdownEl);
  }

  /**
   * Reads the language Gemini prints in a code block's header ("Python", "C++"),
   * for code elements that carry no language-* class. Returns '' when the header
   * has no single-word label (e.g. "Code snippet").
   * @param {HTMLElement} pre - The <pre> inside a <code-block>
   * @returns {string} Lowercased language token or ''
   */
  function getCodeBlockLanguageLabel(pre) {
    const block = pre.closest('code-block');
    if (!block) return '';
    const labelEl = Array.from(block.querySelectorAll('span')).find(span =>
      !pre.contains(span) && !span.closest('button, gem-icon-button') && span.textContent.trim()
    );
    const label = labelEl ? labelEl.textContent.trim() : '';
    return /^[\w#+.-]{1,30}$/.test(label) ? label.toLowerCase() : '';
  }

  /**
   * Converts HTML elements to markdown format
   * @param {HTMLElement} element - The element to convert
   * @returns {string} Markdown text
   */
  function convertHtmlToMarkdown(element) {
    const result = [];

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
          // Check if inline or block code
          if (node.parentElement?.tagName.toLowerCase() === 'pre') {
            return processChildren(children);
          }
          return `\`${processChildren(children)}\``;
        case 'code-block': {
          // Gemini wraps each <pre> in a header (language label plus download and
          // copy buttons). That text is not part of the code, and emitting it would
          // glue the label onto the opening fence ("Python```").
          const pre = node.querySelector('pre');
          return pre ? processNode(pre) : processChildren(children);
        }
        case 'pre': {
          // Find the code element and language
          const codeEl = node.querySelector('code');
          let lang = '';
          if (codeEl) {
            // Try to extract language from class
            const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
            if (langClass) {
              lang = langClass.replace('language-', '');
            }
          }
          if (!lang) {
            lang = getCodeBlockLanguageLabel(node);
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

        // Add header separator after first row if it contains th elements
        if (rowIndex === 0 && row.querySelector('th')) {
          result.push(`| ${cells.map(() => '---').join(' | ')} |`);
        }
      });

      return result.join('\n');
    }

    const rawMarkdown = processNode(element);

    // Clean up excessive newlines
    return rawMarkdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ============================================================================
  // COPY MARKDOWN BUTTON
  // ============================================================================

  function createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  /**
   * Creates a "Copy MD" button that matches Gemini's native icon buttons.
   *
   * It reuses the Material icon-button classes Gemini's own action buttons carry,
   * so the hover/focus/ripple state layer comes from Gemini's stylesheet, and pins
   * the 32px circular size and the icon colour the native row uses. Built with DOM
   * calls only: this repo avoids innerHTML on gemini.google.com (Trusted Types CSP).
   * @returns {HTMLButtonElement}
   */
  function createCopyMdButton() {
    const button = createElement(
      'button',
      `${CONFIG.BUTTON_CLASS} mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-unthemed`
    );
    button.type = 'button';
    button.setAttribute('aria-label', 'Copy as Markdown');
    button.setAttribute('title', 'Copy as Markdown');
    button.setAttribute('data-test-id', 'copy-md-button');
    button.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'box-sizing: border-box',
      'flex: 0 0 auto',
      'width: 32px',
      'height: 32px',
      'padding: 4px',
      'color: var(--lumi-sys-color--on-surface, var(--gem-sys-color--on-surface, currentColor))',
    ].join('; ');

    const label = createElement('span', 'copy-md-label');
    label.textContent = 'MD';
    label.style.cssText = [
      'font: 600 11px/20px "Google Sans Text", "Google Sans", Roboto, Arial, sans-serif',
      'letter-spacing: 0.3px',
    ].join('; ');

    button.append(
      createElement('span', 'mat-mdc-button-persistent-ripple mdc-icon-button__ripple'),
      label,
      createElement('span', 'mat-focus-indicator')
    );

    return button;
  }

  /**
   * Handles click on the Copy MD button
   * @param {Event} event
   */
  async function handleCopyMdClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const responseContainer = button.closest(CONFIG.SELECTORS.RESPONSE_CONTAINER);

    if (!responseContainer) {
      logError('Could not find response container');
      return;
    }

    const labelEl = button.querySelector('.copy-md-label');
    const originalText = labelEl?.textContent || 'MD';

    try {
      const markdown = extractMarkdownFromResponse(responseContainer);

      if (!markdown) {
        throw new Error('No content found to copy');
      }

      await copyToClipboard(markdown);

      // Show success feedback
      if (labelEl) {
        labelEl.textContent = '✓';
        setTimeout(() => {
          labelEl.textContent = originalText;
        }, 1500);
      }

      log('Copied markdown to clipboard', markdown.substring(0, 100) + '...');

    } catch (error) {
      logError('Failed to copy markdown', error);

      // Show error feedback
      if (labelEl) {
        labelEl.textContent = '✗';
        setTimeout(() => {
          labelEl.textContent = originalText;
        }, 1500);
      }
    }
  }

  /**
   * Finds Gemini's copy control inside a response's action row (or the response
   * itself when the row's class name has changed).
   * @param {Element} scope
   * @returns {Element|null}
   */
  function findCopyControl(scope) {
    for (const selector of CONFIG.SELECTORS.COPY_BUTTON_CANDIDATES) {
      const match = scope.querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  /**
   * Returns the element our button should be inserted after: the copy control's
   * outermost wrapper that is still a direct child of the action row, so the new
   * button becomes a sibling of the native buttons rather than nesting inside the
   * <copy-button> host.
   * @param {Element} copyControl
   * @param {Element|null} row - the action row, when it was found
   * @returns {Element}
   */
  function getInsertionAnchor(copyControl, row) {
    let anchor = copyControl.closest('copy-button') || copyControl;
    if (row && row !== anchor && row.contains(anchor)) {
      while (anchor.parentElement && anchor.parentElement !== row) {
        anchor = anchor.parentElement;
      }
    }
    return anchor;
  }

  /**
   * Adds the Copy MD button to a response container if not already present
   * @param {HTMLElement} responseContainer
   */
  function addCopyMdButtonToResponse(responseContainer) {
    // Check if already added
    if (responseContainer.querySelector(`.${CONFIG.BUTTON_CLASS}`)) {
      return;
    }

    // The action row only exists once the response has finished rendering.
    const row = responseContainer.querySelector(CONFIG.SELECTORS.BUTTONS_CONTAINER);
    const copyControl = findCopyControl(row || responseContainer);
    if (!copyControl) {
      log('No copy control found in response');
      return;
    }

    // Create and insert our button after the copy control
    const copyMdButton = createCopyMdButton();
    copyMdButton.addEventListener('click', handleCopyMdClick);

    const anchor = getInsertionAnchor(copyControl, row);
    anchor.parentNode.insertBefore(copyMdButton, anchor.nextSibling);

    log('Added Copy MD button to response');
  }

  /**
   * Scans all response containers and adds Copy MD buttons
   */
  function addCopyMdButtonsToAllResponses() {
    const responses = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_CONTAINER);
    responses.forEach(addCopyMdButtonToResponse);
    log(`Processed ${responses.length} response containers`);
  }

  // ============================================================================
  // MUTATION OBSERVER
  // ============================================================================

  let observer = null;
  let scanTimer = null;

  /**
   * Queues one scan of all responses; calls made while a scan is already queued
   * are folded into it. Tracked so destroy() can cancel it.
   * @param {number} delay - ms to wait so Gemini finishes rendering the node
   */
  function scheduleScan(delay) {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      addCopyMdButtonsToAllResponses();
    }, delay);
  }

  /**
   * Anything whose arrival can mean a response just became ready for a button:
   * the response itself, its action row, or the copy control (the row can be
   * added before its buttons are).
   */
  function getWatchedSelector() {
    const { RESPONSE_CONTAINER, BUTTONS_CONTAINER, COPY_BUTTON_CANDIDATES } = CONFIG.SELECTORS;
    return [RESPONSE_CONTAINER, BUTTONS_CONTAINER, ...COPY_BUTTON_CANDIDATES].join(', ');
  }

  /**
   * Sets up MutationObserver to watch for new responses
   */
  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }

    const watched = getWatchedSelector();

    observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // The added node can be the match itself or contain one
              if (node.matches?.(watched) || node.querySelector?.(watched)) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        scheduleScan(100);
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
   * Removes all Copy MD buttons and cleans up
   */
  function destroy() {
    // Disconnect observer and drop any scan that was still queued, so a pending
    // scan cannot put buttons back after the feature is turned off
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }

    // Remove all Copy MD buttons
    const buttons = document.querySelectorAll(`.${CONFIG.BUTTON_CLASS}`);
    buttons.forEach(btn => btn.remove());

    log('Copy MD feature destroyed');
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initializes the Copy as Markdown feature
   */
  function init() {
    log('Initializing Copy as Markdown feature');

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
    // Set up observer for new responses
    setupObserver();

    // Add buttons to existing responses (with delay to ensure page is loaded)
    scheduleScan(1000);

    log('Copy as Markdown feature initialized');
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  // Export for use as a module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init,
      destroy,
      extractMarkdownFromResponse,
      convertHtmlToMarkdown,
      CONFIG,
    };
  }

  // Attach to window for browser access and feature loader
  if (typeof window !== 'undefined') {
    window.BetterGeminiExport = {
      init,
      destroy,
      extractMarkdownFromResponse,
      convertHtmlToMarkdown,
    };
  }

})();
