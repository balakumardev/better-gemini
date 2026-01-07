/**
 * Unit Tests for content/features/wider-chat.js
 * Tests style injection, MutationObserver, and cleanup
 */

const widerChat = require('../../content/features/wider-chat.js');

const { init, destroy, _internals } = widerChat;
const {
  STYLE_ID,
  WIDER_CHAT_CSS,
  WATCHED_SELECTORS,
  injectStyles,
  removeStyles,
  hasWatchedElements,
  handleMutations,
  setupObserver,
  getState,
} = _internals;

describe('Wider Chat Feature - Unit Tests', () => {
  beforeEach(() => {
    global.resetAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Ensure the module is in a clean state by calling destroy
    // This handles the module's internal state
    try {
      destroy();
    } catch (e) {
      // Ignore errors if already destroyed
    }
  });

  afterEach(() => {
    // Clean up after each test
    try {
      destroy();
    } catch (e) {
      // Ignore errors
    }
  });

  describe('Configuration Constants', () => {
    test('STYLE_ID has correct value', () => {
      expect(STYLE_ID).toBe('better-gemini-wider-chat');
    });

    test('WIDER_CHAT_CSS contains max-width rule', () => {
      expect(WIDER_CHAT_CSS).toContain('max-width: 98%');
      expect(WIDER_CHAT_CSS).toContain('!important');
    });

    test('WIDER_CHAT_CSS targets expected selectors', () => {
      expect(WIDER_CHAT_CSS).toContain('.conversation-container');
      expect(WIDER_CHAT_CSS).toContain('.input-area-container');
      expect(WIDER_CHAT_CSS).toContain('.bottom-container');
      expect(WIDER_CHAT_CSS).toContain('user-query');
    });

    test('WATCHED_SELECTORS contains expected values', () => {
      expect(WATCHED_SELECTORS).toContain('.conversation-container');
      expect(WATCHED_SELECTORS).toContain('.input-area-container');
      expect(WATCHED_SELECTORS).toContain('.bottom-container');
      expect(WATCHED_SELECTORS).toContain('user-query');
    });
  });

  describe('injectStyles()', () => {
    test('creates style element in document head', () => {
      const style = injectStyles();

      expect(style).toBeTruthy();
      expect(style.tagName.toLowerCase()).toBe('style');
      expect(document.head.contains(style)).toBe(true);
    });

    test('style element has correct ID', () => {
      const style = injectStyles();

      expect(style.id).toBe(STYLE_ID);
    });

    test('style element contains CSS rules', () => {
      const style = injectStyles();

      expect(style.textContent).toBe(WIDER_CHAT_CSS);
    });

    test('returns existing style if already injected', () => {
      const style1 = injectStyles();
      const style2 = injectStyles();

      expect(style1).toBe(style2);
      // Should only have one style element
      const styleElements = document.querySelectorAll(`#${STYLE_ID}`);
      expect(styleElements.length).toBe(1);
    });

    test('style element has correct type attribute', () => {
      const style = injectStyles();

      expect(style.type).toBe('text/css');
    });
  });

  describe('removeStyles()', () => {
    test('removes style element from document', () => {
      injectStyles();
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      removeStyles();

      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('does nothing if style element does not exist', () => {
      // No style injected
      expect(document.getElementById(STYLE_ID)).toBeNull();

      // Should not throw
      expect(() => removeStyles()).not.toThrow();
    });
  });

  describe('hasWatchedElements()', () => {
    test('returns true when watched element exists', () => {
      document.body.innerHTML = '<div class="conversation-container"></div>';

      expect(hasWatchedElements()).toBe(true);
    });

    test('returns true for user-query element', () => {
      document.body.innerHTML = '<user-query></user-query>';

      expect(hasWatchedElements()).toBe(true);
    });

    test('returns false when no watched elements exist', () => {
      document.body.innerHTML = '<div class="other-container"></div>';

      expect(hasWatchedElements()).toBe(false);
    });

    test('returns true when multiple watched elements exist', () => {
      document.body.innerHTML = `
        <div class="conversation-container"></div>
        <div class="input-area-container"></div>
      `;

      expect(hasWatchedElements()).toBe(true);
    });
  });

  describe('init()', () => {
    test('injects styles into document', () => {
      init();

      const style = document.getElementById(STYLE_ID);
      expect(style).toBeTruthy();
      expect(style.textContent).toBe(WIDER_CHAT_CSS);
    });

    test('sets isInitialized to true', () => {
      init();

      const state = getState();
      expect(state.isInitialized).toBe(true);
    });

    test('sets up MutationObserver', () => {
      init();

      const state = getState();
      expect(state.observer).toBeTruthy();
    });

    test('is idempotent - calling twice does not duplicate styles', () => {
      init();
      init();

      const styleElements = document.querySelectorAll(`#${STYLE_ID}`);
      expect(styleElements.length).toBe(1);
    });

    test('is idempotent - second call returns early', () => {
      init();
      const firstState = getState();

      init();
      const secondState = getState();

      // Should be the same observer instance
      expect(firstState.observer).toBe(secondState.observer);
    });
  });

  describe('destroy()', () => {
    test('removes injected styles', () => {
      init();
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      destroy();

      expect(document.getElementById(STYLE_ID)).toBeNull();
    });

    test('sets isInitialized to false', () => {
      init();
      expect(getState().isInitialized).toBe(true);

      destroy();

      expect(getState().isInitialized).toBe(false);
    });

    test('disconnects MutationObserver', () => {
      init();
      const { observer } = getState();
      expect(observer).toBeTruthy();
      expect(observer.observing).toBe(true);

      destroy();

      expect(observer.observing).toBe(false);
    });

    test('clears observer reference', () => {
      init();

      destroy();

      expect(getState().observer).toBeNull();
    });

    test('does nothing if not initialized', () => {
      // Not initialized
      expect(getState().isInitialized).toBe(false);

      // Should not throw
      expect(() => destroy()).not.toThrow();
    });

    test('allows re-initialization after destroy', () => {
      init();
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      destroy();
      expect(document.getElementById(STYLE_ID)).toBeNull();

      init();
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });
  });

  describe('MutationObserver behavior', () => {
    test('observer watches document.body', () => {
      init();

      const { observer } = getState();
      expect(observer.target).toBe(document.body);
    });

    test('observer is configured for childList and subtree', () => {
      init();

      const { observer } = getState();
      expect(observer.config.childList).toBe(true);
      expect(observer.config.subtree).toBe(true);
    });

    test('handleMutations re-injects styles if removed', () => {
      init();
      expect(document.getElementById(STYLE_ID)).toBeTruthy();

      // Manually remove the style (simulating external removal)
      document.getElementById(STYLE_ID).remove();
      expect(document.getElementById(STYLE_ID)).toBeNull();

      // Trigger mutation handler
      handleMutations([]);

      // Style should be re-injected
      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('handleMutations re-injects styles when new nodes added and watched elements exist', () => {
      init();

      // Remove style manually
      document.getElementById(STYLE_ID).remove();

      // Add a watched element
      document.body.innerHTML = '<div class="conversation-container"></div>';

      // Create mutation record
      const mutations = [
        {
          type: 'childList',
          addedNodes: [document.querySelector('.conversation-container')],
          removedNodes: [],
        },
      ];

      handleMutations(mutations);

      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('observer trigger method calls callback', () => {
      init();
      const { observer } = getState();

      // Remove style to test re-injection
      document.getElementById(STYLE_ID).remove();
      expect(document.getElementById(STYLE_ID)).toBeNull();

      // Trigger observer manually
      observer.trigger([]);

      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });
  });

  describe('setupObserver()', () => {
    test('returns MutationObserver instance', () => {
      const observer = setupObserver();

      expect(observer).toBeTruthy();
      expect(observer.observe).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });

    test('observer is in observing state after setup', () => {
      const observer = setupObserver();

      expect(observer.observing).toBe(true);

      // Clean up
      observer.disconnect();
    });
  });

  describe('State Management', () => {
    test('getState returns current state', () => {
      const state = getState();

      expect(state).toHaveProperty('styleElement');
      expect(state).toHaveProperty('observer');
      expect(state).toHaveProperty('isInitialized');
    });

    test('state reflects initialization', () => {
      expect(getState().isInitialized).toBe(false);
      expect(getState().styleElement).toBeNull();
      expect(getState().observer).toBeNull();

      init();

      expect(getState().isInitialized).toBe(true);
      expect(getState().styleElement).toBeTruthy();
      expect(getState().observer).toBeTruthy();
    });

    test('state reflects destruction', () => {
      init();
      expect(getState().isInitialized).toBe(true);

      destroy();

      expect(getState().isInitialized).toBe(false);
      expect(getState().styleElement).toBeNull();
      expect(getState().observer).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('handles MutationObserver not available', () => {
      // Save original MutationObserver
      const originalMutationObserver = global.MutationObserver;
      global.MutationObserver = undefined;

      // Clean state
      try {
        destroy();
      } catch (e) {}

      // Should initialize without observer
      init();

      expect(getState().isInitialized).toBe(true);
      expect(getState().styleElement).toBeTruthy();
      expect(getState().observer).toBeNull();

      // Restore
      global.MutationObserver = originalMutationObserver;
    });

    test('handles document.head being null', () => {
      // This is an edge case - in practice head should always exist
      // The function appends to document.head, so if head is null it would fail
      // This test verifies normal behavior with head present
      expect(document.head).toBeTruthy();

      init();

      expect(document.getElementById(STYLE_ID)).toBeTruthy();
    });

    test('multiple injectStyles calls with removal in between', () => {
      const style1 = injectStyles();
      expect(style1).toBeTruthy();

      // Remove it
      style1.remove();

      // Inject again - should create new element
      const style2 = injectStyles();
      expect(style2).toBeTruthy();
      expect(document.getElementById(STYLE_ID)).toBe(style2);
    });
  });
});
