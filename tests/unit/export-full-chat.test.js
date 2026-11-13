/**
 * Unit Tests for content/features/export-full-chat.js
 *
 * The user turns of an exported chat were polluted by Gemini's screen-reader
 * markup, and code blocks lost their fences. These tests pin the extraction
 * against markup captured from live gemini.google.com (Nov 2026).
 */

const exportFullChat = require('../../content/features/export-full-chat.js');

const { extractFullChat, getUserQueryText, toMarkdown } = exportFullChat;

// <user-query> holds a screen-reader copy of the prompt ("You said" + the whole
// prompt again) next to the visible .query-text-line paragraphs.
function userQuery(lines) {
  const uq = document.createElement('user-query');
  const content = document.createElement('div');
  content.className = 'query-content';
  const sr = document.createElement('h5');
  sr.className = 'cdk-visually-hidden screen-reader-user-query-label';
  const said = document.createElement('span');
  said.textContent = 'You said';
  sr.append(said, document.createTextNode(lines.join(' ')));
  content.appendChild(sr);
  for (const line of lines) {
    const p = document.createElement('p');
    p.className = 'query-text-line';
    p.textContent = line;
    content.appendChild(p);
  }
  uq.appendChild(content);
  return uq;
}

function modelResponse(html) {
  const r = document.createElement('model-response');
  const text = document.createElement('div');
  text.className = 'model-response-text';
  const md = document.createElement('div');
  md.className = 'markdown';
  md.innerHTML = html;
  text.appendChild(md);
  r.appendChild(text);
  return r;
}

function turn(user, response) {
  const c = document.createElement('div');
  c.className = 'conversation-container';
  c.append(user, response);
  return c;
}

describe('Export Full Chat - user turns', () => {
  afterEach(() => { document.body.replaceChildren(); delete window.BetterGeminiExport; });

  test('reads the visible prompt, not the screen-reader copy', () => {
    const uq = userQuery(['Explain closures']);
    expect(getUserQueryText(uq.querySelector('.query-content'))).toBe('Explain closures');
  });

  test('keeps multi-line prompts as separate lines', () => {
    const uq = userQuery(['First line', 'Second line']);
    expect(getUserQueryText(uq.querySelector('.query-content'))).toBe('First line\nSecond line');
  });

  test('falls back to text minus hidden labels when the line markup changes', () => {
    const uq = userQuery(['x']);
    uq.querySelectorAll('.query-text-line').forEach(p => p.remove());
    uq.querySelector('.query-content').append('Typed text');
    expect(getUserQueryText(uq.querySelector('.query-content'))).toBe('Typed text');
  });

  test('extractFullChat emits one clean user turn and one assistant turn', () => {
    document.body.appendChild(turn(userQuery(['Say hi']), modelResponse('<p>Hi there</p>')));
    const turns = extractFullChat();
    expect(turns).toHaveLength(2);
    expect(turns[0]).toEqual({ role: 'user', content: 'Say hi' });
    expect(turns[0].content).not.toMatch(/You said/);
    expect(turns[1]).toEqual({ role: 'assistant', content: 'Hi there' });
  });
});

describe('Export Full Chat - assistant Markdown', () => {
  afterEach(() => { document.body.replaceChildren(); delete window.BetterGeminiExport; });

  test('uses the converter shared with the MD button when it is loaded', () => {
    const shared = jest.fn().mockReturnValue('```python\nprint("hi")\n```');
    window.BetterGeminiExport = { convertHtmlToMarkdown: shared };
    const el = document.createElement('div');
    expect(toMarkdown(el)).toBe('```python\nprint("hi")\n```');
    expect(shared).toHaveBeenCalledWith(el);
  });

  test('falls back to its own converter when the shared one is unavailable', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p>Plain <strong>bold</strong></p>';
    expect(toMarkdown(el)).toContain('**bold**');
  });
});
