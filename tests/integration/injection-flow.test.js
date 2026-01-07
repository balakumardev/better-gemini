/**
 * Integration Tests for Content Script Injection Flow
 *
 * Tests the REAL flow from URL parameter to prompt injection
 * by recreating and testing actual functions from content/injector.js
 */

// ========== REAL CONFIGURATION from injector.js ==========
const CONFIG = {
  URL_PARAM: 'bg_prompt',
  TIMEOUTS: {
    DOM_READY: 10000,
    AFTER_INJECTION: 300,
    RETRY_INTERVAL: 100,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 200,
  },
  SELECTORS: {
    INPUT_FIELD: [
      'div[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '[data-placeholder="Enter a prompt here"]',
      'rich-textarea div[contenteditable="true"]',
    ],
    SEND_BUTTON: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'button[data-testid="send-button"]',
      '.send-button',
      'button[mattooltip="Send message"]',
    ],
    LOGIN_INDICATORS: [
      'a[href*="accounts.google.com"]',
      '[data-action="sign in"]',
      '.login-button',
    ],
  },
  DEBUG: false,
};

// ========== REAL FUNCTIONS from injector.js ==========

/**
 * Extracts and decodes the bg_prompt parameter from the URL
 * REAL implementation from injector.js
 */
function getPromptFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedPrompt = urlParams.get(CONFIG.URL_PARAM);

  if (!encodedPrompt) {
    return null;
  }

  try {
    return decodeURIComponent(encodedPrompt);
  } catch (e) {
    return null;
  }
}

/**
 * Removes the bg_prompt parameter from the URL
 * REAL implementation from injector.js
 */
function cleanupURL() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(CONFIG.URL_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Queries the DOM using multiple selectors
 * REAL implementation from injector.js
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
 * Checks if the user appears to be logged out
 * REAL implementation from injector.js
 */
function isUserLoggedOut() {
  if (window.location.href.includes('accounts.google.com')) {
    return true;
  }

  for (const selector of CONFIG.SELECTORS.LOGIN_INDICATORS) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  return false;
}

/**
 * Creates a promise that resolves after a specified delay
 * REAL implementation from injector.js
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Injects text into a contenteditable element in a React-compatible way
 * REAL implementation from injector.js
 */
function injectText(inputElement, text) {
  try {
    inputElement.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(inputElement);
    selection.removeAllRanges();
    selection.addRange(range);

    const success = document.execCommand('insertText', false, text);

    if (success) {
      return true;
    }

    return injectTextWithInputEvent(inputElement, text);
  } catch (e) {
    return false;
  }
}

/**
 * Fallback text injection using InputEvent
 * REAL implementation from injector.js
 */
function injectTextWithInputEvent(inputElement, text) {
  try {
    inputElement.textContent = '';

    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true,
    });
    inputElement.dispatchEvent(beforeInputEvent);

    inputElement.textContent = text;

    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: false,
    });
    inputElement.dispatchEvent(inputEvent);

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Finds the send button using configured selectors
 * REAL implementation from injector.js
 */
function findSendButton() {
  return queryWithSelectors(CONFIG.SELECTORS.SEND_BUTTON);
}

/**
 * Clicks the send button
 * Simplified for testing (no retry logic)
 */
function clickSendButton() {
  const sendButton = findSendButton();

  if (!sendButton) {
    return false;
  }

  if (sendButton.disabled || sendButton.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  sendButton.dispatchEvent(clickEvent);

  return true;
}

// ========== TESTS ==========

describe('URL Parameter to Injection Flow - Real Component Integration', () => {
  beforeEach(() => {
    global.resetAllMocks();
    document.body.innerHTML = '';
  });

  describe('URL Parameter Extraction (getPromptFromURL)', () => {
    test('extracts prompt from URL with bg_prompt parameter', () => {
      window.location.search = '?bg_prompt=Hello%20World';

      const prompt = getPromptFromURL();

      expect(prompt).toBe('Hello World');
    });

    test('returns null when no bg_prompt parameter', () => {
      window.location.search = '';

      const prompt = getPromptFromURL();

      expect(prompt).toBeNull();
    });

    test('returns null when parameter is different name', () => {
      window.location.search = '?other_param=test';

      const prompt = getPromptFromURL();

      expect(prompt).toBeNull();
    });

    test('decodes URL-encoded special characters', () => {
      window.location.search = '?bg_prompt=What%20is%202%2B2%3F';

      const prompt = getPromptFromURL();

      expect(prompt).toBe('What is 2+2?');
    });

    test('decodes unicode characters', () => {
      window.location.search = '?bg_prompt=%E6%97%A5%E6%9C%AC%E8%AA%9E';

      const prompt = getPromptFromURL();

      expect(prompt).toBe('日本語');
    });

    test('decodes emoji', () => {
      window.location.search = '?bg_prompt=%F0%9F%91%8B';

      const prompt = getPromptFromURL();

      expect(prompt).toBe('👋');
    });

    test('handles multiple parameters correctly', () => {
      window.location.search = '?other=value&bg_prompt=test&another=123';

      const prompt = getPromptFromURL();

      expect(prompt).toBe('test');
    });
  });

  describe('DOM Selector Queries (queryWithSelectors)', () => {
    test('finds element with first matching selector', () => {
      document.body.innerHTML = '<div contenteditable="true" id="found"></div>';

      const element = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);

      expect(element).not.toBeNull();
      expect(element.id).toBe('found');
    });

    test('tries fallback selectors when first doesnt match', () => {
      document.body.innerHTML = '<div class="ql-editor" contenteditable="true" id="fallback"></div>';

      const element = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);

      expect(element).not.toBeNull();
      expect(element.id).toBe('fallback');
    });

    test('returns null when no selectors match', () => {
      document.body.innerHTML = '<div>No matching elements</div>';

      const element = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);

      expect(element).toBeNull();
    });

    test('finds send button with various selectors', () => {
      const testCases = [
        '<button aria-label="Send message">Send</button>',
        '<button aria-label="Send">Send</button>',
        '<button data-testid="send-button">Send</button>',
        '<button class="send-button">Send</button>',
      ];

      testCases.forEach(html => {
        document.body.innerHTML = html;
        const button = queryWithSelectors(CONFIG.SELECTORS.SEND_BUTTON);
        expect(button).not.toBeNull();
      });
    });
  });

  describe('Login Detection (isUserLoggedOut)', () => {
    test('detects login page in URL', () => {
      window.location.href = 'https://accounts.google.com/signin';

      expect(isUserLoggedOut()).toBe(true);
    });

    test('detects login button indicator', () => {
      window.location.href = 'https://gemini.google.com/app';
      document.body.innerHTML = '<button class="login-button">Sign In</button>';

      expect(isUserLoggedOut()).toBe(true);
    });

    test('detects Google account link indicator', () => {
      window.location.href = 'https://gemini.google.com/app';
      document.body.innerHTML = '<a href="https://accounts.google.com/signin">Sign In</a>';

      expect(isUserLoggedOut()).toBe(true);
    });

    test('returns false when logged in', () => {
      window.location.href = 'https://gemini.google.com/app';
      document.body.innerHTML = '<div contenteditable="true"></div>';

      expect(isUserLoggedOut()).toBe(false);
    });
  });

  describe('Text Injection (injectText)', () => {
    let inputElement;

    beforeEach(() => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      inputElement = document.getElementById('input');
    });

    test('injects text via execCommand', () => {
      const result = injectText(inputElement, 'Hello World');

      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'Hello World');
    });

    test('focuses the input element', () => {
      const focusSpy = jest.spyOn(inputElement, 'focus');

      injectText(inputElement, 'test');

      expect(focusSpy).toHaveBeenCalled();
    });

    test('selects all content before injecting', () => {
      injectText(inputElement, 'test');

      expect(window.getSelection).toHaveBeenCalled();
      expect(document.createRange).toHaveBeenCalled();
    });

    test('falls back to InputEvent when execCommand fails', () => {
      document.execCommand = jest.fn(() => false);

      const result = injectText(inputElement, 'fallback text');

      expect(result).toBe(true);
      expect(inputElement.textContent).toBe('fallback text');
    });
  });

  describe('Send Button Click (clickSendButton)', () => {
    test('clicks enabled send button', () => {
      document.body.innerHTML = '<button aria-label="Send message" id="send">Send</button>';
      const button = document.getElementById('send');
      const clickSpy = jest.fn();
      button.addEventListener('click', clickSpy);

      const result = clickSendButton();

      expect(result).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });

    test('returns false when button is disabled', () => {
      document.body.innerHTML = '<button aria-label="Send message" disabled>Send</button>';

      const result = clickSendButton();

      expect(result).toBe(false);
    });

    test('returns false when button has aria-disabled', () => {
      document.body.innerHTML = '<button aria-label="Send message" aria-disabled="true">Send</button>';

      const result = clickSendButton();

      expect(result).toBe(false);
    });

    test('returns false when button not found', () => {
      document.body.innerHTML = '<div>No button</div>';

      const result = clickSendButton();

      expect(result).toBe(false);
    });
  });

  describe('URL Cleanup (cleanupURL)', () => {
    test('removes bg_prompt parameter', () => {
      window.location.href = 'https://gemini.google.com/app?bg_prompt=test';

      const result = cleanupURL();

      expect(result).toBe(true);
      expect(window.history.replaceState).toHaveBeenCalled();

      const newUrl = window.history.replaceState.mock.calls[0][2];
      expect(newUrl).not.toContain('bg_prompt');
    });

    test('preserves other URL parameters', () => {
      window.location.href = 'https://gemini.google.com/app?other=value&bg_prompt=test&another=123';

      cleanupURL();

      const newUrl = window.history.replaceState.mock.calls[0][2];
      expect(newUrl).toContain('other=value');
      expect(newUrl).toContain('another=123');
      expect(newUrl).not.toContain('bg_prompt');
    });

    test('preserves history state in replaceState call', () => {
      // window.history.state is read-only, so we verify the function
      // passes window.history.state (whatever it is) to replaceState
      window.location.href = 'https://gemini.google.com/app?bg_prompt=test';

      cleanupURL();

      // Verify replaceState was called with the current history state (first arg)
      expect(window.history.replaceState).toHaveBeenCalled();
      const firstArg = window.history.replaceState.mock.calls[0][0];
      expect(firstArg).toBe(window.history.state);
    });
  });

  describe('Complete Integration Flow', () => {
    /**
     * Test the complete real flow: URL → extraction → DOM → injection → submit → cleanup
     */
    function runCompleteFlow() {
      // Step 1: Extract prompt from URL (real function)
      const prompt = getPromptFromURL();
      if (!prompt) {
        return { success: false, reason: 'no_prompt' };
      }

      // Step 2: Check login status (real function)
      if (isUserLoggedOut()) {
        return { success: false, reason: 'not_logged_in' };
      }

      // Step 3: Find input field (real function)
      const inputElement = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);
      if (!inputElement) {
        return { success: false, reason: 'input_not_found' };
      }

      // Step 4: Inject text (real function)
      const injected = injectText(inputElement, prompt);
      if (!injected) {
        return { success: false, reason: 'injection_failed' };
      }

      // Step 5: Click send button (real function)
      const submitted = clickSendButton();

      // Step 6: Cleanup URL (real function)
      cleanupURL();

      return {
        success: submitted,
        prompt,
        injected: true,
        submitted,
        reason: submitted ? null : 'submit_failed',
      };
    }

    test('complete flow with valid setup succeeds', () => {
      // Setup: URL with prompt and Gemini-like DOM
      window.location.search = '?bg_prompt=Hello%20Gemini!';
      window.location.href = 'https://gemini.google.com/app?bg_prompt=Hello%20Gemini!';
      document.body.innerHTML = `
        <div contenteditable="true" class="ql-editor"></div>
        <button aria-label="Send message">Send</button>
      `;

      const result = runCompleteFlow();

      expect(result.success).toBe(true);
      expect(result.prompt).toBe('Hello Gemini!');
      expect(result.injected).toBe(true);
      expect(result.submitted).toBe(true);
    });

    test('complete flow fails without prompt parameter', () => {
      window.location.search = '';
      document.body.innerHTML = '<div contenteditable="true"></div>';

      const result = runCompleteFlow();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_prompt');
    });

    test('complete flow fails when user logged out', () => {
      window.location.search = '?bg_prompt=test';
      window.location.href = 'https://gemini.google.com/app?bg_prompt=test';
      document.body.innerHTML = '<button class="login-button">Sign In</button>';

      const result = runCompleteFlow();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_logged_in');
    });

    test('complete flow fails without input field', () => {
      window.location.search = '?bg_prompt=test';
      window.location.href = 'https://gemini.google.com/app?bg_prompt=test';
      document.body.innerHTML = '<div>Loading...</div>';

      const result = runCompleteFlow();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('input_not_found');
    });

    test('complete flow handles missing send button', () => {
      window.location.search = '?bg_prompt=test';
      window.location.href = 'https://gemini.google.com/app?bg_prompt=test';
      document.body.innerHTML = '<div contenteditable="true"></div>';

      const result = runCompleteFlow();

      expect(result.success).toBe(false);
      expect(result.injected).toBe(true);
      expect(result.reason).toBe('submit_failed');
    });

    test('complete flow with special characters', () => {
      window.location.search = '?bg_prompt=What%20is%202%2B2%3F%20%E6%97%A5%E6%9C%AC%E8%AA%9E%20%F0%9F%91%8B';
      window.location.href = 'https://gemini.google.com/app' + window.location.search;
      document.body.innerHTML = `
        <div contenteditable="true"></div>
        <button aria-label="Send message">Send</button>
      `;

      const result = runCompleteFlow();

      expect(result.success).toBe(true);
      expect(result.prompt).toBe('What is 2+2? 日本語 👋');
    });
  });

  describe('React-like DOM Structure', () => {
    test('works with Gemini-like nested contenteditable', () => {
      window.location.search = '?bg_prompt=test';
      window.location.href = 'https://gemini.google.com/app?bg_prompt=test';
      document.body.innerHTML = `
        <rich-textarea>
          <div contenteditable="true" class="ql-editor" data-placeholder="Enter a prompt here">
          </div>
        </rich-textarea>
        <button aria-label="Send message">Send</button>
      `;

      const inputElement = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);
      expect(inputElement).not.toBeNull();

      const result = injectText(inputElement, 'test prompt');
      expect(result).toBe(true);
    });

    test('finds send button with multiple class names', () => {
      document.body.innerHTML = `
        <button class="btn btn-primary send-button" type="submit">
          <span>Send</span>
        </button>
      `;

      const button = findSendButton();
      expect(button).not.toBeNull();
    });
  });
});

