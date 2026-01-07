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
      COPY_BUTTON: '[data-test-id="copy-button"]',
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

  /**
   * Creates a "Copy MD" button that matches Gemini's style
   * @returns {HTMLButtonElement}
   */
  function createCopyMdButton() {
    const button = document.createElement('button');
    button.className = `${CONFIG.BUTTON_CLASS} mdc-button mat-mdc-button-base mat-mdc-tooltip-trigger icon-button mat-mdc-button mat-unthemed`;
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', 'Copy as Markdown');
    button.setAttribute('mattooltip', 'Copy as Markdown');
    button.setAttribute('data-test-id', 'copy-md-button');

    // Create the button content structure
    button.innerHTML = `
      <span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span>
      <span class="copy-md-label" style="font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">MD</span>
      <span class="mdc-button__label"></span>
      <span class="mat-focus-indicator"></span>
      <span class="mat-mdc-button-touch-target"></span>
    `;

    // Add some custom styling
    button.style.cssText = `
      min-width: 36px !important;
      padding: 0 8px !important;
    `;

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
   * Adds the Copy MD button to a response container if not already present
   * @param {HTMLElement} responseContainer
   */
  function addCopyMdButtonToResponse(responseContainer) {
    // Check if already added
    if (responseContainer.querySelector(`.${CONFIG.BUTTON_CLASS}`)) {
      return;
    }

    const buttonsContainer = responseContainer.querySelector(CONFIG.SELECTORS.BUTTONS_CONTAINER);
    if (!buttonsContainer) {
      log('No buttons container found in response');
      return;
    }

    const copyButton = buttonsContainer.querySelector(CONFIG.SELECTORS.COPY_BUTTON);
    if (!copyButton) {
      log('No copy button found in response');
      return;
    }

    // Create and insert our button after the copy button
    const copyMdButton = createCopyMdButton();
    copyMdButton.addEventListener('click', handleCopyMdClick);

    // Insert after the copy button
    copyButton.parentNode.insertBefore(copyMdButton, copyButton.nextSibling);

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

  /**
   * Sets up MutationObserver to watch for new responses
   */
  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this is a response container or contains one
              if (node.matches?.(CONFIG.SELECTORS.RESPONSE_CONTAINER) ||
                  node.querySelector?.(CONFIG.SELECTORS.RESPONSE_CONTAINER) ||
                  node.querySelector?.(CONFIG.SELECTORS.BUTTONS_CONTAINER)) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        // Debounce the scan
        setTimeout(addCopyMdButtonsToAllResponses, 100);
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
    // Disconnect observer
    if (observer) {
      observer.disconnect();
      observer = null;
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
    setTimeout(addCopyMdButtonsToAllResponses, 1000);

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
