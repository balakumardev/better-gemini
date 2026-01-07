/**
 * Unit Tests for config.js
 * Tests REAL configuration exports and structure
 */

import { CONFIG, URL_PARAM, DEBUG } from '../../config.js';

describe('Config Module - REAL EXPORTS', () => {
  describe('CONFIG object exists and is frozen', () => {
    test('CONFIG is defined', () => {
      expect(CONFIG).toBeDefined();
      expect(typeof CONFIG).toBe('object');
    });

    test('CONFIG is frozen (immutable)', () => {
      expect(Object.isFrozen(CONFIG)).toBe(true);
      expect(Object.isFrozen(CONFIG.meta)).toBe(true);
      expect(Object.isFrozen(CONFIG.timing)).toBe(true);
      expect(Object.isFrozen(CONFIG.selectors)).toBe(true);
    });

    test('WOULD FAIL if someone removes freeze', () => {
      // Attempting to modify should have no effect
      const originalName = CONFIG.meta.name;
      expect(() => {
        CONFIG.meta.name = 'Hacked';
      }).toThrow();
      expect(CONFIG.meta.name).toBe(originalName);
    });
  });

  describe('Meta Configuration', () => {
    test('has extension name', () => {
      expect(CONFIG.meta.name).toBe('Better Gemini');
    });

    test('has version number in semver format', () => {
      expect(CONFIG.meta.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Timing Configuration', () => {
    test('has domTimeout and is reasonable', () => {
      expect(CONFIG.timing.domTimeout).toBeGreaterThan(0);
      expect(CONFIG.timing.domTimeout).toBeLessThanOrEqual(30000); // Not too long
      expect(typeof CONFIG.timing.domTimeout).toBe('number');
    });

    test('has pollInterval and is reasonable', () => {
      expect(CONFIG.timing.pollInterval).toBeGreaterThan(0);
      expect(CONFIG.timing.pollInterval).toBeLessThan(1000); // Should be sub-second
    });

    test('has maxRetries', () => {
      expect(CONFIG.timing.maxRetries).toBeGreaterThan(0);
      expect(CONFIG.timing.maxRetries).toBeLessThanOrEqual(20); // Not infinite
    });

    test('has retryDelay', () => {
      expect(CONFIG.timing.retryDelay).toBeGreaterThan(0);
    });

    test('has debounceDelay', () => {
      expect(CONFIG.timing.debounceDelay).toBeGreaterThan(0);
    });

    test('WOULD FAIL if timeout values are strings', () => {
      expect(typeof CONFIG.timing.domTimeout).toBe('number');
      expect(typeof CONFIG.timing.pollInterval).toBe('number');
      expect(typeof CONFIG.timing.retryDelay).toBe('number');
    });
  });

  describe('Selectors Configuration', () => {
    test('has promptInput selector', () => {
      expect(CONFIG.selectors.promptInput).toBeDefined();
      expect(CONFIG.selectors.promptInput).toContain('contenteditable');
    });

    test('has sendButton selector', () => {
      expect(CONFIG.selectors.sendButton).toBeDefined();
      expect(CONFIG.selectors.sendButton).toContain('aria-label');
    });

    test('all selectors are valid CSS selector strings', () => {
      Object.entries(CONFIG.selectors).forEach(([key, selector]) => {
        expect(typeof selector).toBe('string');
        expect(selector.length).toBeGreaterThan(0);

        // Test that it's a valid CSS selector (won't throw)
        expect(() => document.querySelector(selector)).not.toThrow();
      });
    });

    test('WOULD FAIL if selector syntax is invalid', () => {
      // This tests that all selectors can be used with querySelector
      Object.values(CONFIG.selectors).forEach((selector) => {
        // Invalid selectors like "div[" would throw
        expect(() => document.querySelector(selector)).not.toThrow();
      });
    });
  });

  describe('URLs Configuration', () => {
    test('has base URL', () => {
      expect(CONFIG.urls.base).toBe('https://gemini.google.com');
    });

    test('has app URL', () => {
      expect(CONFIG.urls.app).toBe('https://gemini.google.com/app');
    });

    test('all URLs are valid URL objects', () => {
      Object.entries(CONFIG.urls).forEach(([key, url]) => {
        expect(() => new URL(url)).not.toThrow();
      });
    });

    test('all URLs use HTTPS', () => {
      Object.entries(CONFIG.urls).forEach(([key, url]) => {
        expect(url).toMatch(/^https:\/\//);
      });
    });

    test('WOULD FAIL if URLs point to wrong domain', () => {
      expect(CONFIG.urls.base).toContain('gemini.google.com');
      expect(CONFIG.urls.app).toContain('gemini.google.com');
    });
  });

  describe('Storage Keys Configuration', () => {
    test('has settings key', () => {
      expect(CONFIG.storageKeys.settings).toBeDefined();
    });

    test('has history key', () => {
      expect(CONFIG.storageKeys.history).toBeDefined();
    });

    test('has shortcuts key', () => {
      expect(CONFIG.storageKeys.shortcuts).toBeDefined();
    });

    test('all keys have consistent prefix', () => {
      Object.values(CONFIG.storageKeys).forEach((key) => {
        expect(key).toMatch(/^betterGemini_/);
      });
    });
  });

  describe('Default Settings', () => {
    test('has autoFocus default', () => {
      expect(typeof CONFIG.defaults.autoFocus).toBe('boolean');
    });

    test('has enableShortcuts default', () => {
      expect(typeof CONFIG.defaults.enableShortcuts).toBe('boolean');
    });

    test('has debugMode default as boolean', () => {
      expect(typeof CONFIG.defaults.debugMode).toBe('boolean');
    });
  });

  describe('Named Exports', () => {
    test('URL_PARAM is exported and valid', () => {
      expect(URL_PARAM).toBeDefined();
      expect(typeof URL_PARAM).toBe('string');
      expect(URL_PARAM).toBe('bg_prompt');
    });

    test('DEBUG is exported and is boolean', () => {
      expect(typeof DEBUG).toBe('boolean');
    });

    test('WOULD FAIL if URL_PARAM changes unexpectedly', () => {
      // Other code depends on this exact value
      expect(URL_PARAM).toBe('bg_prompt');
    });
  });
});

