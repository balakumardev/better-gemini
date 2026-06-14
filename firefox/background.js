/**
 * Better Gemini - Background Service Worker (Firefox)
 *
 * Omnibox integration for quick Gemini access from the Firefox address bar.
 * Type "gem " followed by your prompt to open Gemini with it pre-filled.
 */

const browserApi = typeof browser !== 'undefined' ? browser : null;
const IS_FIREFOX_ENV = browserApi !== null && browserApi.omnibox;

// Matches config.js — background.scripts can't use ES module imports
const URL_PARAM = 'bg_prompt';
const DEBUG = true;

const GEMINI_BASE_URL = 'https://gemini.google.com/app';

function log(...args) {
  if (DEBUG) {
    console.log('[Better Gemini]', ...args);
  }
}

function logError(...args) {
  console.error('[Better Gemini]', ...args);
}

function buildGeminiUrl(prompt, urlParam = URL_PARAM) {
  const encodedPrompt = encodeURIComponent(prompt);
  return `${GEMINI_BASE_URL}?${urlParam}=${encodedPrompt}`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function navigateToUrl(url, disposition, api = browserApi) {
  if (!api || !api.tabs) {
    throw new Error('Firefox tabs API not available');
  }

  try {
    switch (disposition) {
      case 'newForegroundTab':
        log('Opening in new foreground tab');
        await api.tabs.create({ url, active: true });
        break;

      case 'newBackgroundTab':
        log('Opening in new background tab');
        await api.tabs.create({ url, active: false });
        break;

      case 'currentTab':
      default:
        log('Opening in current tab');
        const [activeTab] = await api.tabs.query({
          active: true,
          currentWindow: true
        });

        if (activeTab && activeTab.id) {
          await api.tabs.update(activeTab.id, { url });
        } else {
          log('No active tab found, creating new tab as fallback');
          await api.tabs.create({ url, active: true });
        }
        break;
    }
  } catch (error) {
    logError('Navigation failed:', error);
    throw error;
  }
}

async function handleInputEntered(text, disposition, api = browserApi, urlParam = URL_PARAM) {
  log('Input entered:', { text, disposition });

  const trimmedText = text.trim();

  if (!trimmedText) {
    log('Empty input, navigating to Gemini home');
    await navigateToUrl(GEMINI_BASE_URL, disposition, api);
    return;
  }

  try {
    const geminiUrl = buildGeminiUrl(trimmedText, urlParam);
    log('Navigating to:', geminiUrl);
    await navigateToUrl(geminiUrl, disposition, api);
    log('Navigation successful');
  } catch (error) {
    logError('Error navigating to Gemini:', error);

    try {
      log('Attempting fallback navigation to Gemini home');
      await navigateToUrl(GEMINI_BASE_URL, disposition, api);
    } catch (fallbackError) {
      logError('Fallback navigation also failed:', fallbackError);
    }
  }
}

if (IS_FIREFOX_ENV) {
  browserApi.omnibox.onInputChanged.addListener((text, suggest) => {
    log('Input changed:', text);

    const trimmedText = text.trim();

    if (trimmedText) {
      suggest([
        {
          content: trimmedText,
          description: `Ask Gemini: "${escapeXml(trimmedText)}"`
        }
      ]);
    }
  });

  browserApi.omnibox.onInputEntered.addListener(async (text, disposition) => {
    await handleInputEntered(text, disposition);
  });

  browserApi.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      log('Extension installed');
    } else if (details.reason === 'update') {
      log('Extension updated to version', browserApi.runtime.getManifest().version);
    }
  });

  browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Message received:', message);
    sendResponse({ received: true });
    return false;
  });

  browserApi.omnibox.setDefaultSuggestion({
    description: 'Ask Gemini: Type your prompt and press Enter'
  });

  log('Background script initialized');
}
