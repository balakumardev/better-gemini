/**
 * Unit Tests for content/features/keyboard-shortcuts.js
 *
 * Guards the selector map against Gemini UI renames. These tests assert the
 * shape of the fallback chains, not the live DOM — a rename in Gemini shows up
 * here as a missing fallback before it silently kills a shortcut.
 */

const ks = require('../../content/features/keyboard-shortcuts.js');
const { SHORTCUTS_CONFIG } = ks;

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


// ---------------------------------------------------------------------------
// Behaviour against markup captured from live gemini.google.com (Nov 2026).
describe('Keyboard Shortcuts - sidebar chat navigation', () => {
  // <gem-nav-list-item data-test-id="conversation"><a href="/app/<id>" ...></a>
  // Only the inner link navigates; the open chat's link has aria-current="page".
  function mountSidebar(currentId) {
    const items = ['aaa', 'bbb', 'ccc'].map((id) => {
      const host = document.createElement('gem-nav-list-item');
      host.setAttribute('data-test-id', 'conversation');
      const link = document.createElement('a');
      link.setAttribute('href', '/app/' + id);
      if (id === currentId) {
        link.setAttribute('aria-current', 'page');
        link.className = 'is-active';
      }
      link.addEventListener('click', (e) => { e.preventDefault(); link.dataset.clicked = '1'; });
      host.appendChild(link);
      return host;
    });
    document.body.replaceChildren(...items);
    return items;
  }
  const clicked = () => [...document.querySelectorAll('a')].map(a => !!a.dataset.clicked);

  afterEach(() => { document.body.replaceChildren(); window.location.pathname = '/app'; });

  test('detects the open chat from the link inside the host', () => {
    const items = mountSidebar('bbb');
    expect(ks.findCurrentChatIndex(items)).toBe(1);
  });

  test('detects the open chat from the URL when aria-current is missing', () => {
    const items = mountSidebar(null);
    window.location.pathname = '/app/ccc';
    expect(ks.findCurrentChatIndex(items)).toBe(2);
  });

  test('reports no open chat on a brand-new chat', () => {
    expect(ks.findCurrentChatIndex(mountSidebar(null))).toBe(-1);
  });

  test('Alt+n clicks the inner link, not the host', () => {
    mountSidebar(null);
    ks.actionGoToChat(2);
    expect(clicked()).toEqual([false, true, false]);
  });

  test('next / previous move relative to the open chat', () => {
    mountSidebar('bbb');
    ks.actionNextChat();
    expect(clicked()).toEqual([false, false, true]);
    mountSidebar('bbb');
    ks.actionPrevChat();
    expect(clicked()).toEqual([true, false, false]);
  });

  test('next from a new chat opens the first entry; previous does nothing', () => {
    mountSidebar(null);
    ks.actionNextChat();
    expect(clicked()).toEqual([true, false, false]);
    mountSidebar(null);
    ks.actionPrevChat();
    expect(clicked()).toEqual([false, false, false]);
  });
});

describe('Keyboard Shortcuts - copy actions', () => {
  // <code-block><div class="code-block-decoration"><span>Bash</span>
  //   <gem-icon-button/></div><pre><code>echo "hi"</code></pre></code-block>
  function codeBlock(label, code) {
    const block = document.createElement('code-block');
    const header = document.createElement('div');
    header.className = 'code-block-decoration';
    const span = document.createElement('span');
    span.textContent = label;
    header.appendChild(span);
    const pre = document.createElement('pre');
    const c = document.createElement('code');
    c.textContent = code;
    pre.appendChild(c);
    block.append(header, pre);
    return block;
  }
  let writeText;
  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => { document.body.replaceChildren(); delete window.BetterGeminiExport; });

  test('code block copy excludes the language label', () => {
    document.body.replaceChildren(codeBlock('Python', 'print("hello")\n'), codeBlock('Bash', 'echo "hi"\n'));
    ks.actionCopyCodeBlock(0);
    expect(writeText).toHaveBeenLastCalledWith('echo "hi"\n');
    ks.actionCopyCodeBlock(1);
    expect(writeText).toHaveBeenLastCalledWith('print("hello")\n');
  });

  test('second-to-last counts blocks, not every matching descendant', () => {
    document.body.replaceChildren(codeBlock('Python', 'a'), codeBlock('Bash', 'b'));
    expect(ks.queryAllFirstGroup(SELECTORS.CODE_BLOCKS)).toHaveLength(2);
  });

  function response(markdownText) {
    const r = document.createElement('model-response');
    const said = document.createElement('h6');
    said.className = 'cdk-visually-hidden';
    said.textContent = 'Gemini said';
    const body = document.createElement('div');
    body.className = 'model-response-text';
    body.textContent = markdownText;
    r.append(said, body);
    return r;
  }

  test('copy response drops the screen-reader "Gemini said" label', () => {
    document.body.replaceChildren(response('Hello there'));
    ks.actionCopyResponse();
    expect(writeText).toHaveBeenLastCalledWith('Hello there');
  });

  test('copy response prefers the shared Markdown converter when present', () => {
    const extract = jest.fn().mockReturnValue('| A |\n| --- |');
    window.BetterGeminiExport = { extractMarkdownFromResponse: extract };
    document.body.replaceChildren(response('flattened'));
    ks.actionCopyResponse();
    expect(extract).toHaveBeenCalledWith(document.querySelector('model-response'));
    expect(writeText).toHaveBeenLastCalledWith('| A |\n| --- |');
  });
});

describe('Keyboard Shortcuts - key handling', () => {
  function press(init) {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    ks.handleKeydown(event);
    return event;
  }

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue() },
      configurable: true,
    });
  });
  afterEach(() => document.body.replaceChildren());

  test("leaves Gemini's native Shift+M / Shift+D / Shift+K to Gemini", () => {
    for (const key of ['m', 'd', 'k']) {
      expect(press({ key, ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    }
  });

  test('the dropped draft shortcuts are gone from the help list', () => {
    const all = Object.values(ks.SHORTCUT_DEFINITIONS).flat();
    expect(Object.keys(ks.SHORTCUT_DEFINITIONS)).not.toContain('Draft Navigation');
    expect(all.some(d => /draft/i.test(d.description))).toBe(false);
    const keys = all.map(d => d.keys);
    for (const taken of ['Shift+M', 'Shift+D', 'Shift+K']) {
      expect(keys.some(k => k.endsWith(taken))).toBe(false);
    }
  });

  test('generation toggle and chat link moved to free keys', () => {
    expect(press({ key: 'g', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(press({ key: 'u', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  });

  test('Alt+digit works on macOS where Option+1 types "¡"', () => {
    const link = document.createElement('a');
    link.setAttribute('href', '/app/aaa');
    let clicked = false;
    link.addEventListener('click', (e) => { e.preventDefault(); clicked = true; });
    const host = document.createElement('gem-nav-list-item');
    host.setAttribute('data-test-id', 'conversation');
    host.appendChild(link);
    document.body.appendChild(host);
    const event = press({ key: '¡', code: 'Digit1', altKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(clicked).toBe(true);
  });
});
