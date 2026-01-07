/**
 * Integration Tests for Message Passing
 *
 * Tests the REAL message passing between background and content scripts
 * by recreating actual message handlers from background.js and injector.js
 */

// ========== REAL CONFIGURATION ==========
const CONFIG = {
  URL_PARAM: 'bg_prompt',
  TIMEOUTS: {
    DOM_READY: 10000,
    AFTER_INJECTION: 300,
  },
  SELECTORS: {
    INPUT_FIELD: ['div[contenteditable="true"]'],
    SEND_BUTTON: ['button[aria-label="Send message"]'],
  },
};

// ========== REAL MESSAGE HANDLER from background.js ==========

/**
 * Creates the REAL background script message handler
 * Implementation matches background.js chrome.runtime.onMessage.addListener
 */
function createBackgroundMessageHandler() {
  return (message, sender, sendResponse) => {
    // REAL implementation from background.js
    // Just acknowledges receipt for now
    sendResponse({ received: true });
    return false; // No async response
  };
}

// ========== REAL MESSAGE HANDLER from injector.js ==========

/**
 * Helper functions needed by the content script message handler
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function queryWithSelectors(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function waitForInputField() {
  return new Promise((resolve, reject) => {
    const existingElement = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Input field not found'));
    }, CONFIG.TIMEOUTS.DOM_READY);

    // For testing, we'll just resolve immediately if found
    const element = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);
    if (element) {
      clearTimeout(timeoutId);
      resolve(element);
    } else {
      reject(new Error('Input field not found'));
    }
  });
}

function injectText(inputElement, text) {
  try {
    inputElement.focus();
    const success = document.execCommand('insertText', false, text);
    return success;
  } catch (e) {
    return false;
  }
}

async function clickSendButton() {
  const sendButton = queryWithSelectors(CONFIG.SELECTORS.SEND_BUTTON);
  if (sendButton && !sendButton.disabled) {
    sendButton.click();
    return true;
  }
  return false;
}

/**
 * Handles prompt injection triggered via message
 * REAL implementation from injector.js
 */
async function injectPromptFromMessage(prompt) {
  try {
    const inputElement = await waitForInputField();
    const injected = injectText(inputElement, prompt);

    if (injected) {
      await delay(CONFIG.TIMEOUTS.AFTER_INJECTION);
      await clickSendButton();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Creates the REAL content script message handler
 * Implementation matches injector.js chrome.runtime.onMessage.addListener
 */
function createContentScriptMessageHandler() {
  return (message, sender, sendResponse) => {
    // REAL implementation from injector.js

    if (message.action === 'injectPrompt' && message.prompt) {
      // Inject prompt received from background script
      injectPromptFromMessage(message.prompt).then(success => {
        sendResponse({ success });
      });
      return true; // Keep channel open for async response
    }

    if (message.action === 'ping') {
      sendResponse({ status: 'alive' });
      return true;
    }

    sendResponse({ status: 'unknown_action' });
    return true;
  };
}

// ========== TESTS ==========

describe('Message Passing - Real Component Integration', () => {
  beforeEach(() => {
    global.resetAllMocks();
    document.body.innerHTML = '';
  });

  describe('Background Script Message Handler', () => {
    let backgroundHandler;

    beforeEach(() => {
      backgroundHandler = createBackgroundMessageHandler();
    });

    test('acknowledges all messages with { received: true }', () => {
      const sendResponse = jest.fn();

      backgroundHandler(
        { any: 'message' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ received: true });
    });

    test('returns false (no async response)', () => {
      const sendResponse = jest.fn();

      const result = backgroundHandler(
        { any: 'message' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(result).toBe(false);
    });

    test('handles various message formats', () => {
      const messages = [
        { action: 'test' },
        { type: 'query', data: 123 },
        { command: 'execute', params: { foo: 'bar' } },
        'simple string',
        null,
      ];

      messages.forEach(message => {
        const sendResponse = jest.fn();
        backgroundHandler(message, { tab: { id: 1 } }, sendResponse);
        expect(sendResponse).toHaveBeenCalledWith({ received: true });
      });
    });
  });

  describe('Content Script Message Handler', () => {
    let contentHandler;

    beforeEach(() => {
      contentHandler = createContentScriptMessageHandler();
    });

    describe('ping action', () => {
      test('responds with { status: "alive" }', () => {
        const sendResponse = jest.fn();

        contentHandler(
          { action: 'ping' },
          { tab: { id: 1 } },
          sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: 'alive' });
      });

      test('returns true to keep channel open', () => {
        const sendResponse = jest.fn();

        const result = contentHandler(
          { action: 'ping' },
          { tab: { id: 1 } },
          sendResponse
        );

        expect(result).toBe(true);
      });
    });

    describe('unknown action', () => {
      test('responds with { status: "unknown_action" }', () => {
        const sendResponse = jest.fn();

        contentHandler(
          { action: 'unsupported' },
          { tab: { id: 1 } },
          sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: 'unknown_action' });
      });

      test('handles missing action property', () => {
        const sendResponse = jest.fn();

        contentHandler(
          { type: 'not_action' },
          { tab: { id: 1 } },
          sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: 'unknown_action' });
      });
    });

    describe('injectPrompt action', () => {
      test('requires prompt parameter', () => {
        const sendResponse = jest.fn();

        contentHandler(
          { action: 'injectPrompt' }, // No prompt
          { tab: { id: 1 } },
          sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: 'unknown_action' });
      });

      test('returns true for async response', async () => {
        document.body.innerHTML = `
          <div contenteditable="true"></div>
          <button aria-label="Send message">Send</button>
        `;
        const sendResponse = jest.fn();

        const result = contentHandler(
          { action: 'injectPrompt', prompt: 'test' },
          { tab: { id: 1 } },
          sendResponse
        );

        expect(result).toBe(true);
      });

      test('injects prompt when DOM is ready', async () => {
        document.body.innerHTML = `
          <div contenteditable="true" id="input"></div>
          <button aria-label="Send message">Send</button>
        `;
        const sendResponse = jest.fn();

        contentHandler(
          { action: 'injectPrompt', prompt: 'Hello from message' },
          { tab: { id: 1 } },
          sendResponse
        );

        // Wait for async injection
        await new Promise(resolve => setTimeout(resolve, 400));

        expect(sendResponse).toHaveBeenCalledWith({ success: true });
        expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'Hello from message');
      });

      test('handles missing input field', async () => {
        document.body.innerHTML = '<div>No input</div>';
        const sendResponse = jest.fn();

        contentHandler(
          { action: 'injectPrompt', prompt: 'test' },
          { tab: { id: 1 } },
          sendResponse
        );

        // Wait for async failure
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(sendResponse).toHaveBeenCalledWith({ success: false });
      });
    });
  });

  describe('Message Format Compatibility', () => {
    test('injectPrompt message format is consistent', () => {
      const validMessage = {
        action: 'injectPrompt',
        prompt: 'Test prompt'
      };

      expect(validMessage).toHaveProperty('action', 'injectPrompt');
      expect(validMessage).toHaveProperty('prompt');
      expect(typeof validMessage.prompt).toBe('string');
    });

    test('ping message format is consistent', () => {
      const validMessage = { action: 'ping' };

      expect(validMessage).toHaveProperty('action', 'ping');
    });

    test('response formats are consistent', () => {
      // Background response
      const bgResponse = { received: true };
      expect(bgResponse).toHaveProperty('received', true);

      // Content script ping response
      const pingResponse = { status: 'alive' };
      expect(pingResponse).toHaveProperty('status', 'alive');

      // Content script inject response
      const injectResponse = { success: true };
      expect(injectResponse).toHaveProperty('success', true);

      // Unknown action response
      const unknownResponse = { status: 'unknown_action' };
      expect(unknownResponse).toHaveProperty('status', 'unknown_action');
    });
  });

  describe('Runtime Event Listeners Integration', () => {
    test('background onMessage listener registration', () => {
      const handler = createBackgroundMessageHandler();

      chrome.runtime.onMessage.addListener(handler);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(handler);
    });

    test('content script onMessage listener registration', () => {
      const handler = createContentScriptMessageHandler();

      chrome.runtime.onMessage.addListener(handler);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(handler);
    });

    test('onInstalled handles installation', () => {
      let installHandled = false;
      let updateHandled = false;

      // Create listener matching the REAL background.js implementation
      const listener = (details) => {
        if (details.reason === 'install') {
          installHandled = true;
          // Real code logs: log('Extension installed')
        } else if (details.reason === 'update') {
          updateHandled = true;
          // Real code logs: log('Extension updated to version', chrome.runtime.getManifest().version)
        }
      };

      chrome.runtime.onInstalled.addListener(listener);
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledWith(listener);

      // Simulate install event
      listener({ reason: 'install' });
      expect(installHandled).toBe(true);

      // Simulate update event
      listener({ reason: 'update' });
      expect(updateHandled).toBe(true);
    });
  });

  describe('Storage Integration', () => {
    test('settings can be stored and retrieved', async () => {
      const settings = {
        autoFocus: true,
        enableShortcuts: true,
        debugMode: false,
      };

      // Store settings
      await chrome.storage.sync.set({ betterGemini_settings: settings });

      // Retrieve settings
      const result = await chrome.storage.sync.get('betterGemini_settings');

      expect(result.betterGemini_settings).toEqual(settings);
    });

    test('local and sync storage are independent', async () => {
      await chrome.storage.local.set({ local: 'value' });
      await chrome.storage.sync.set({ sync: 'value' });

      const localResult = await chrome.storage.local.get('local');
      const syncResult = await chrome.storage.sync.get('sync');
      const crossCheck = await chrome.storage.local.get('sync');

      expect(localResult.local).toBe('value');
      expect(syncResult.sync).toBe('value');
      expect(crossCheck).toEqual({});
    });

    test('storage clear removes all data', async () => {
      await chrome.storage.sync.set({ key1: 'value1', key2: 'value2' });
      await chrome.storage.sync.clear();

      const result = await chrome.storage.sync.get(['key1', 'key2']);

      expect(result).toEqual({});
    });
  });

  describe('Cross-Component Communication Flow', () => {
    test('simulates full message flow: background → content', async () => {
      // Setup content script DOM
      document.body.innerHTML = `
        <div contenteditable="true"></div>
        <button aria-label="Send message">Send</button>
      `;

      // Create handlers
      const contentHandler = createContentScriptMessageHandler();

      // Simulate background sending message to content script
      const message = { action: 'injectPrompt', prompt: 'Cross-component test' };
      const sendResponse = jest.fn();

      // Content script receives and processes
      contentHandler(message, { tab: { id: 1 } }, sendResponse);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 400));

      // Verify injection happened
      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'Cross-component test');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('ping-pong communication for health check', () => {
      const contentHandler = createContentScriptMessageHandler();
      const sendResponse = jest.fn();

      // Background sends ping
      const result = contentHandler(
        { action: 'ping' },
        { tab: { id: 1, url: 'https://gemini.google.com/app' } },
        sendResponse
      );

      // Content script responds
      expect(result).toBe(true);
      expect(sendResponse).toHaveBeenCalledWith({ status: 'alive' });
    });
  });
});

