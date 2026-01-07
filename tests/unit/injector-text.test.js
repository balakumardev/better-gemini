/**
 * Unit Tests for content/injector-core.js Text Injection
 * Tests REAL text injection and send button interaction
 */

import {
  injectText,
  injectTextWithInputEvent,
  findSendButton,
  clickSendButton,
  delay,
  CONFIG,
} from '../../content/injector-core.js';

describe('Content Script Text Injection - REAL FUNCTIONS', () => {
  beforeEach(() => {
    global.resetAllMocks();
    document.body.innerHTML = '';
  });

  describe('injectText - REAL FUNCTION', () => {
    test('injects text into contenteditable element', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');

      const result = injectText(input, 'Hello World');

      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'Hello World');
    });

    test('focuses element before injection', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');
      const focusSpy = jest.spyOn(input, 'focus');

      injectText(input, 'test');

      expect(focusSpy).toHaveBeenCalled();
    });

    test('selects existing content before injection', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input">Existing</div>';
      const input = document.getElementById('input');

      const selection = window.getSelection();

      injectText(input, 'New text');

      expect(selection.removeAllRanges).toHaveBeenCalled();
      expect(selection.addRange).toHaveBeenCalled();
    });

    test('handles empty text', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');

      const result = injectText(input, '');

      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '');
    });

    test('returns false when execCommand fails', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');
      document.execCommand.mockReturnValueOnce(false);

      const result = injectText(input, 'test');

      expect(result).toBe(false);
    });

    test('WOULD FAIL if focus is not called', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');
      const focusSpy = jest.spyOn(input, 'focus');

      injectText(input, 'test');

      // Real function MUST call focus first
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('injectTextWithInputEvent - REAL FUNCTION', () => {
    test('sets text content', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');

      const result = injectTextWithInputEvent(input, 'Hello');

      expect(result).toBe(true);
      expect(input.textContent).toBe('Hello');
    });

    test('dispatches beforeinput event', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');
      const beforeInputSpy = jest.fn();
      input.addEventListener('beforeinput', beforeInputSpy);

      injectTextWithInputEvent(input, 'test');

      expect(beforeInputSpy).toHaveBeenCalled();
    });

    test('dispatches input event', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';
      const input = document.getElementById('input');
      const inputSpy = jest.fn();
      input.addEventListener('input', inputSpy);

      injectTextWithInputEvent(input, 'test');

      expect(inputSpy).toHaveBeenCalled();
    });

    test('clears existing content first', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input">Old content</div>';
      const input = document.getElementById('input');

      injectTextWithInputEvent(input, 'New content');

      expect(input.textContent).toBe('New content');
    });
  });

  describe('findSendButton - REAL FUNCTION', () => {
    test('finds button with aria-label="Send message"', () => {
      document.body.innerHTML = '<button aria-label="Send message">Send</button>';
      expect(findSendButton()).not.toBeNull();
    });

    test('finds button with aria-label="Send"', () => {
      document.body.innerHTML = '<button aria-label="Send">Send</button>';
      expect(findSendButton()).not.toBeNull();
    });

    test('finds button with data-testid', () => {
      document.body.innerHTML = '<button data-testid="send-button">Send</button>';
      expect(findSendButton()).not.toBeNull();
    });

    test('finds button with .send-button class', () => {
      document.body.innerHTML = '<button class="send-button">Send</button>';
      expect(findSendButton()).not.toBeNull();
    });

    test('returns null when no button found', () => {
      document.body.innerHTML = '<button>Submit</button>';
      expect(findSendButton()).toBeNull();
    });

    test('uses CONFIG.SELECTORS.SEND_BUTTON', () => {
      // Verify that findSendButton uses the actual config selectors
      // Add an element that matches the first selector in CONFIG
      document.body.innerHTML = '<button aria-label="Send message">Send</button>';
      const button = findSendButton();
      expect(button).not.toBeNull();
      // The function should find the same element we can find with the config selector
      const configSelector = CONFIG.SELECTORS.SEND_BUTTON[0];
      expect(document.querySelector(configSelector)).toBe(button);
    });
  });

  describe('clickSendButton - REAL FUNCTION', () => {
    test('clicks enabled button', () => {
      document.body.innerHTML = '<button id="send">Send</button>';
      const button = document.getElementById('send');
      const clickSpy = jest.fn();
      button.addEventListener('click', clickSpy);

      const result = clickSendButton(button);

      expect(result.success).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });

    test('reports disabled button', () => {
      document.body.innerHTML = '<button id="send" disabled>Send</button>';
      const button = document.getElementById('send');

      const result = clickSendButton(button, 3, 3);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('disabled_after_retries');
    });

    test('handles aria-disabled button with retry', () => {
      document.body.innerHTML = '<button id="send" aria-disabled="true">Send</button>';
      const button = document.getElementById('send');

      const result = clickSendButton(button, 1, 3);

      expect(result.success).toBe(false);
      expect(result.retry).toBe(true);
    });

    test('returns not_found for null button', () => {
      const result = clickSendButton(null);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_found');
    });

    test('dispatches MouseEvent with correct properties', () => {
      document.body.innerHTML = '<button id="send">Send</button>';
      const button = document.getElementById('send');
      let receivedEvent = null;
      button.addEventListener('click', (e) => { receivedEvent = e; });

      clickSendButton(button);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.bubbles).toBe(true);
      expect(receivedEvent.cancelable).toBe(true);
    });

    test('uses CONFIG.RETRY.MAX_ATTEMPTS by default', () => {
      document.body.innerHTML = '<button id="send" disabled>Send</button>';
      const button = document.getElementById('send');

      // First attempt should indicate retry
      const result1 = clickSendButton(button, 1);
      expect(result1.retry).toBe(true);

      // At max attempts should not indicate retry
      const result2 = clickSendButton(button, CONFIG.RETRY.MAX_ATTEMPTS);
      expect(result2.retry).toBeUndefined();
    });
  });

  describe('delay - REAL FUNCTION', () => {
    test('resolves after specified time', async () => {
      jest.useFakeTimers();

      const promise = delay(100);
      jest.advanceTimersByTime(100);

      await expect(promise).resolves.toBeUndefined();

      jest.useRealTimers();
    });

    test('returns a Promise', () => {
      jest.useFakeTimers();
      const result = delay(100);
      expect(result).toBeInstanceOf(Promise);
      jest.useRealTimers();
    });
  });
});

