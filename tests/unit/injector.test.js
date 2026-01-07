/**
 * Unit Tests for content/injector-core.js
 * Tests REAL URL parameter detection, cleanup, and DOM utilities
 */

import {
  getPromptFromURL,
  cleanupURL,
  queryWithSelectors,
  isUserLoggedOut,
  CONFIG,
} from '../../content/injector-core.js';

describe('Content Script Injector - REAL FUNCTIONS', () => {
  beforeEach(() => {
    global.resetAllMocks();
    document.body.innerHTML = '';
  });

  describe('getPromptFromURL - REAL FUNCTION', () => {
    test('returns null when no parameter exists', () => {
      expect(getPromptFromURL('')).toBeNull();
      expect(getPromptFromURL('?other=value')).toBeNull();
    });

    test('extracts and decodes simple prompt', () => {
      expect(getPromptFromURL('?bg_prompt=hello%20world')).toBe('hello world');
    });

    test('handles special characters', () => {
      expect(getPromptFromURL('?bg_prompt=test%26query%3Dresult')).toBe('test&query=result');
    });

    test('handles unicode characters', () => {
      const unicode = 'こんにちは';
      expect(getPromptFromURL(`?bg_prompt=${encodeURIComponent(unicode)}`)).toBe(unicode);
    });

    test('handles emoji', () => {
      const emoji = '👋🌍';
      expect(getPromptFromURL(`?bg_prompt=${encodeURIComponent(emoji)}`)).toBe(emoji);
    });

    test('handles empty parameter value', () => {
      expect(getPromptFromURL('?bg_prompt=')).toBeNull();
    });

    test('ignores other parameters', () => {
      expect(getPromptFromURL('?other=value&bg_prompt=test&another=param')).toBe('test');
    });

    test('WOULD FAIL if using wrong param name', () => {
      // Only bg_prompt should work, not other names
      expect(getPromptFromURL('?prompt=test')).toBeNull();
      expect(getPromptFromURL('?query=test')).toBeNull();
      expect(getPromptFromURL('?bg_prompt=test')).toBe('test');
    });

    test('handles malformed URL encoding gracefully', () => {
      // Invalid % sequence - should return null, not throw
      expect(getPromptFromURL('?bg_prompt=%')).toBeNull();
    });

    test('handles complex prompts with multiple encodings', () => {
      const prompt = 'Code: function() { return x > y && a < b; }';
      const encoded = encodeURIComponent(prompt);
      expect(getPromptFromURL(`?bg_prompt=${encoded}`)).toBe(prompt);
    });
  });

  describe('cleanupURL - REAL FUNCTION', () => {
    test('removes bg_prompt parameter', () => {
      const cleaned = cleanupURL('https://gemini.google.com/app?bg_prompt=test');
      expect(cleaned).not.toContain('bg_prompt');
      expect(cleaned).toBe('https://gemini.google.com/app');
    });

    test('preserves other parameters', () => {
      const cleaned = cleanupURL('https://gemini.google.com/app?other=value&bg_prompt=test');
      expect(cleaned).toContain('other=value');
      expect(cleaned).not.toContain('bg_prompt');
    });

    test('handles URL without bg_prompt gracefully', () => {
      const original = 'https://gemini.google.com/app';
      expect(() => cleanupURL(original)).not.toThrow();
      expect(cleanupURL(original)).toBe(original);
    });

    test('preserves URL structure', () => {
      const cleaned = cleanupURL('https://gemini.google.com/app?bg_prompt=test#section');
      expect(cleaned).toContain('#section');
      expect(cleaned).not.toContain('bg_prompt');
    });

    test('WOULD FAIL if cleanup removes wrong parameter', () => {
      const cleaned = cleanupURL('https://gemini.google.com/app?important=keep&bg_prompt=test');
      expect(cleaned).toContain('important=keep');
    });
  });

  describe('queryWithSelectors - REAL FUNCTION', () => {
    test('returns first matching element', () => {
      document.body.innerHTML = `
        <div id="first" contenteditable="true"></div>
        <div id="second" class="ql-editor"></div>
      `;

      const result = queryWithSelectors([
        '[contenteditable="true"]',
        '.ql-editor',
      ]);

      expect(result).not.toBeNull();
      expect(result.id).toBe('first');
    });

    test('returns null when no match found', () => {
      document.body.innerHTML = '<div>No match</div>';

      const result = queryWithSelectors(['.non-existent', '#also-not-here']);
      expect(result).toBeNull();
    });

    test('tries selectors in order', () => {
      document.body.innerHTML = '<div class="second"></div>';

      const result = queryWithSelectors(['.first', '.second', '.third']);
      expect(result).not.toBeNull();
      expect(result.className).toBe('second');
    });

    test('works with CONFIG.SELECTORS.INPUT_FIELD', () => {
      document.body.innerHTML = '<div contenteditable="true" id="input"></div>';

      const result = queryWithSelectors(CONFIG.SELECTORS.INPUT_FIELD);
      expect(result).not.toBeNull();
      expect(result.id).toBe('input');
    });

    test('works with CONFIG.SELECTORS.SEND_BUTTON', () => {
      document.body.innerHTML = '<button aria-label="Send message">Send</button>';

      const result = queryWithSelectors(CONFIG.SELECTORS.SEND_BUTTON);
      expect(result).not.toBeNull();
    });
  });

  describe('isUserLoggedOut - REAL FUNCTION', () => {
    test('detects login page URL with signin pattern', () => {
      expect(isUserLoggedOut('https://accounts.google.com/signin')).toBe(true);
    });

    test('detects login page URL with v3/signin pattern', () => {
      expect(isUserLoggedOut('https://accounts.google.com/v3/signin')).toBe(true);
    });

    test('detects login page URL with ServiceLogin pattern', () => {
      expect(isUserLoggedOut('https://accounts.google.com/ServiceLogin')).toBe(true);
    });

    test('returns false when logged in (contenteditable present)', () => {
      document.body.innerHTML = '<div contenteditable="true">Chat input</div>';
      expect(isUserLoggedOut('https://gemini.google.com/app')).toBe(false);
    });

    test('returns false when logged in (rich-textarea present)', () => {
      document.body.innerHTML = '<rich-textarea></rich-textarea>';
      expect(isUserLoggedOut('https://gemini.google.com/app')).toBe(false);
    });

    test('returns false when logged in with /u/2/ path', () => {
      document.body.innerHTML = '<div contenteditable="true">Chat input</div>';
      expect(isUserLoggedOut('https://gemini.google.com/u/2/app')).toBe(false);
    });

    test('does NOT false positive on accounts.google.com links', () => {
      // This was the bug: profile menu links contain accounts.google.com
      // but user IS logged in
      document.body.innerHTML = `
        <div contenteditable="true">Chat input</div>
        <a href="https://accounts.google.com/profile">Profile</a>
      `;
      expect(isUserLoggedOut('https://gemini.google.com/app')).toBe(false);
    });

    test('returns false on Gemini page even without logged-in indicators (still loading)', () => {
      // Page might still be loading, don't assume logged out
      document.body.innerHTML = '<div class="loading"></div>';
      expect(isUserLoggedOut('https://gemini.google.com/app')).toBe(false);
    });

    test('returns false for non-Gemini pages', () => {
      document.body.innerHTML = '<div>Some other page</div>';
      expect(isUserLoggedOut('https://example.com')).toBe(false);
    });
  });

  describe('CONFIG structure', () => {
    test('has URL_PARAM defined', () => {
      expect(CONFIG.URL_PARAM).toBe('bg_prompt');
    });

    test('has SELECTORS with arrays', () => {
      expect(Array.isArray(CONFIG.SELECTORS.INPUT_FIELD)).toBe(true);
      expect(Array.isArray(CONFIG.SELECTORS.SEND_BUTTON)).toBe(true);
      expect(Array.isArray(CONFIG.SELECTORS.LOGGED_IN_INDICATORS)).toBe(true);
      expect(Array.isArray(CONFIG.SELECTORS.LOGIN_PAGE_PATTERNS)).toBe(true);
    });

    test('has LOGGED_IN_INDICATORS that detect logged-in state', () => {
      // These selectors should match elements that only appear when logged in
      expect(CONFIG.SELECTORS.LOGGED_IN_INDICATORS).toContain('div[contenteditable="true"]');
      expect(CONFIG.SELECTORS.LOGGED_IN_INDICATORS).toContain('rich-textarea');
    });

    test('has LOGIN_PAGE_PATTERNS for actual login pages', () => {
      // These patterns should only match actual login page URLs
      expect(CONFIG.SELECTORS.LOGIN_PAGE_PATTERNS).toContain('accounts.google.com/signin');
      expect(CONFIG.SELECTORS.LOGIN_PAGE_PATTERNS).toContain('accounts.google.com/v3/signin');
      expect(CONFIG.SELECTORS.LOGIN_PAGE_PATTERNS).toContain('accounts.google.com/ServiceLogin');
    });

    test('has TIMEOUTS defined', () => {
      expect(CONFIG.TIMEOUTS.DOM_READY).toBeGreaterThan(0);
      expect(CONFIG.TIMEOUTS.AFTER_INJECTION).toBeGreaterThan(0);
    });

    test('has RETRY config', () => {
      expect(CONFIG.RETRY.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(CONFIG.RETRY.DELAY).toBeGreaterThan(0);
    });
  });
});

