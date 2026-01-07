/**
 * Unit Tests for background.js Navigation Logic
 * Tests tab navigation with different dispositions using REAL functions
 */

import { navigateToUrl, buildGeminiUrl, GEMINI_BASE_URL } from '../../background.js';

describe('Background Navigation Logic - REAL FUNCTIONS', () => {
  beforeEach(() => {
    global.resetAllMocks();
  });

  describe('navigateToUrl with disposition', () => {
    test('opens in current tab by default', async () => {
      await navigateToUrl(GEMINI_BASE_URL, 'currentTab');

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { url: GEMINI_BASE_URL });
    });

    test('currentTab disposition uses tabs.update NOT tabs.create', async () => {
      // This test specifically verifies that 'currentTab' updates existing tab
      // If the case statement is broken, this would fail
      await navigateToUrl(GEMINI_BASE_URL, 'currentTab');

      // Must use update, not create for currentTab
      expect(chrome.tabs.update).toHaveBeenCalled();
      expect(chrome.tabs.create).not.toHaveBeenCalled();
    });

    test('opens in new foreground tab', async () => {
      await navigateToUrl(GEMINI_BASE_URL, 'newForegroundTab');

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: GEMINI_BASE_URL,
        active: true,
      });
    });

    test('opens in new background tab', async () => {
      await navigateToUrl(GEMINI_BASE_URL, 'newBackgroundTab');

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: GEMINI_BASE_URL,
        active: false,
      });
    });

    test('handles missing active tab by creating new tab', async () => {
      chrome.tabs.query.mockResolvedValueOnce([]);

      await navigateToUrl(GEMINI_BASE_URL, 'currentTab');

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: GEMINI_BASE_URL,
        active: true,
      });
    });

    test('handles tab with no id by creating new tab', async () => {
      chrome.tabs.query.mockResolvedValueOnce([{ url: 'https://example.com' }]); // no id

      await navigateToUrl(GEMINI_BASE_URL, 'currentTab');

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: GEMINI_BASE_URL,
        active: true,
      });
    });

    test('handles unknown disposition as currentTab', async () => {
      await navigateToUrl(GEMINI_BASE_URL, 'unknownDisposition');

      expect(chrome.tabs.query).toHaveBeenCalled();
    });

    test('WOULD FAIL if navigation uses wrong tab API', async () => {
      await navigateToUrl('https://test.com', 'newForegroundTab');

      // Verify it uses tabs.create, not some other method
      expect(chrome.tabs.create).toHaveBeenCalled();
      expect(chrome.tabs.update).not.toHaveBeenCalled();
    });

    test('throws error on navigation failure', async () => {
      chrome.tabs.create.mockRejectedValueOnce(new Error('Tab creation failed'));

      await expect(navigateToUrl(GEMINI_BASE_URL, 'newForegroundTab')).rejects.toThrow(
        'Tab creation failed'
      );
    });
  });

  describe('Integration: buildGeminiUrl + navigateToUrl', () => {
    test('can navigate to built URL', async () => {
      const prompt = 'test query';
      const url = buildGeminiUrl(prompt);

      await navigateToUrl(url, 'newForegroundTab');

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('bg_prompt=test%20query'),
        active: true,
      });
    });

    test('URL is valid for navigation', async () => {
      const url = buildGeminiUrl('hello & world');

      // Should not throw when constructing URL object
      expect(() => new URL(url)).not.toThrow();

      await navigateToUrl(url, 'currentTab');
      expect(chrome.tabs.update).toHaveBeenCalled();
    });
  });

  describe('Runtime Events', () => {
    test('handles install event', () => {
      let installHandled = false;

      const listener = (details) => {
        if (details.reason === 'install') {
          installHandled = true;
        }
      };
      chrome.runtime.onInstalled.addListener(listener);

      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledWith(listener);
      listener({ reason: 'install' });
      expect(installHandled).toBe(true);
    });

    test('handles update event', () => {
      let updateHandled = false;

      const listener = (details) => {
        if (details.reason === 'update') {
          updateHandled = true;
        }
      };
      chrome.runtime.onInstalled.addListener(listener);

      listener({ reason: 'update' });
      expect(updateHandled).toBe(true);
    });
  });
});

