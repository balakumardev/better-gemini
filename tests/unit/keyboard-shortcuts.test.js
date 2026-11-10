/**
 * Unit Tests for content/features/keyboard-shortcuts.js
 *
 * Guards the selector map against Gemini UI renames. These tests assert the
 * shape of the fallback chains, not the live DOM — a rename in Gemini shows up
 * here as a missing fallback before it silently kills a shortcut.
 */

const { SHORTCUTS_CONFIG } = require('../../content/features/keyboard-shortcuts.js');

const { SELECTORS } = SHORTCUTS_CONFIG;

describe('Keyboard Shortcuts - selector contract', () => {
  test('voice input matches the current "Dictate" label', () => {
    // Gemini renamed the dictation control from "Microphone" to
    // "Dictate (⌘⇧D)"; matching only the old label left the shortcut dead.
    expect(SELECTORS.VOICE_INPUT).toContain('button[aria-label*="Dictate"]');
  });

  test('voice input keeps a case-insensitive Microphone fallback', () => {
    expect(SELECTORS.VOICE_INPUT).toContain('button[aria-label*="Microphone"]');
    expect(SELECTORS.VOICE_INPUT).toContain('button[aria-label*="microphone"]');
  });

  test('the "Dictate" fallback is tried before the retired label', () => {
    const dictate = SELECTORS.VOICE_INPUT.indexOf('button[aria-label*="Dictate"]');
    const microphone = SELECTORS.VOICE_INPUT.indexOf('button[aria-label*="Microphone"]');
    expect(dictate).toBeGreaterThanOrEqual(0);
    expect(dictate).toBeLessThan(microphone);
  });

  test('sidebar finds the redesigned <bard-sidenav> element', () => {
    // [data-test-id="sidebar"] and .sidebar are gone from the live DOM.
    expect(SELECTORS.SIDEBAR).toContain('bard-sidenav');
    expect(SELECTORS.SIDEBAR).toContain('side-navigation-v2');
  });

  test('new chat is reachable now that it is an <a>, not a <button>', () => {
    expect(SELECTORS.NEW_CHAT.some(sel => sel.startsWith('a['))).toBe(true);
  });

  test('send button is matched by its accessible name', () => {
    expect(SELECTORS.SEND_BUTTON).toContain('button[aria-label="Send message"]');
  });

  test('text input puts the focusable editor before the non-focusable wrapper', () => {
    // `.text-input-field` is a wrapper with contentEditable:false / tabIndex:-1,
    // so focusing it is a no-op — the ql-editor must win.
    const editor = SELECTORS.TEXT_INPUT.indexOf('div[contenteditable="true"].ql-editor');
    const wrapper = SELECTORS.TEXT_INPUT.indexOf('.text-input-field');
    expect(editor).toBeGreaterThanOrEqual(0);
    expect(wrapper).toBeGreaterThanOrEqual(0);
    expect(editor).toBeLessThan(wrapper);
  });

  test('audio control matches the current "Listen" label', () => {
    expect(SELECTORS.AUDIO_PLAY).toContain('button[aria-label*="Listen"]');
  });

  test('no selector depends on a build-generated class or id', () => {
    const allSelectors = Object.values(SELECTORS).flat();
    for (const selector of allSelectors) {
      expect(selector).not.toMatch(/ng-tns-c|_ngcontent|ng-c\d{4,}|\.cdk-|\bmat-mdc-/);
    }
  });

  test('every selector group is a non-empty array of strings', () => {
    for (const [group, selectors] of Object.entries(SELECTORS)) {
      expect(Array.isArray(selectors)).toBe(true);
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) {
        expect(typeof selector).toBe('string');
        expect(selector.trim().length).toBeGreaterThan(0);
      }
      expect(group).toBeTruthy();
    }
  });
});
