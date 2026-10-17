/**
 * Unit Tests for content/features/export-markdown.js
 *
 * Drives the feature through its public init()/destroy() and the DOM it leaves
 * behind, against fixtures that mirror Gemini's response footer:
 *  - the current layout, where the copy control is a <copy-button> element
 *    wrapping <gem-icon-button><button aria-label="Copy"> and carries no
 *    data-test-id (the layout that broke the original selector), and
 *  - the older layout that identified it with data-test-id="copy-button".
 */

const exportMarkdown = require('../../content/features/export-markdown.js');

const { init, destroy } = exportMarkdown;

const BUTTON_SELECTOR = '.better-gemini-copy-md-btn';

// Response body as Gemini renders it. The code block mirrors the live DOM: a
// header carrying the language label and the download/copy buttons sits above the
// <pre>, and the <code> element has no language-* class.
const MARKDOWN_BODY = `
  <p>Here is the code:</p>
  <code-block>
    <div class="code-block">
      <div class="formatted-code-block-internal-container">
        <div class="animated-opacity">
          <div class="code-block-decoration header-formatted">
            <span>Python</span>
            <div class="buttons">
              <gem-icon-button arialabel="Download code">
                <button aria-label="Download code"></button>
              </gem-icon-button>
              <gem-icon-button data-test-id="gem-copy-button" arialabel="Copy code">
                <button aria-label="Copy code"></button>
              </gem-icon-button>
            </div>
          </div>
          <pre><code role="text" data-test-id="code-content"><span class="hljs-built_in">print</span>("hi")</code></pre>
        </div>
      </div>
    </div>
  </code-block>
  <table-block>
    <div class="table-block">
      <table>
        <thead><tr><th>Name</th><th>Year</th></tr></thead>
        <tbody><tr><td>Python</td><td>1991</td></tr></tbody>
      </table>
    </div>
  </table-block>
`;

// Current Gemini footer, as recorded from the live page.
const CURRENT_ACTION_ROW = `
  <message-actions class="hide-on-print">
    <div class="actions-container-v2">
      <div class="buttons-container-v2">
        <div>
          <regenerate-button>
            <gem-icon-button data-test-id="regenerate-button" arialabel="Redo">
              <button aria-label="Redo"></button>
            </gem-icon-button>
          </regenerate-button>
        </div>
        <copy-button>
          <gem-icon-button arialabel="Copy"><button aria-label="Copy"></button></gem-icon-button>
          <mat-menu></mat-menu>
        </copy-button>
        <div>
          <div class="menu-button-wrapper">
            <div class="more-menu-button-container">
              <gem-icon-button data-test-id="more-menu-button" arialabel="Show more options">
                <button aria-label="Show more options"></button>
              </gem-icon-button>
            </div>
          </div>
        </div>
        <div class="spacer"></div>
      </div>
    </div>
  </message-actions>
`;

// Older Gemini footer: the copy control was found by its data-test-id alone.
const LEGACY_ACTION_ROW = `
  <message-actions>
    <div class="buttons-container-v2">
      <button data-test-id="regenerate-button"></button>
      <button data-test-id="copy-button"><mat-icon>content_copy</mat-icon></button>
      <button data-test-id="more-menu-button"></button>
    </div>
  </message-actions>
`;

function responseHtml(footerHtml) {
  return `
    <response-container>
      <div class="response-container response-container-with-gpi">
        <div class="presented-response-container">
          <div class="response-content">
            <model-response-content>
              <structured-content-container class="model-response-text">
                <div class="markdown">${MARKDOWN_BODY}</div>
              </structured-content-container>
            </model-response-content>
          </div>
        </div>
        <div class="response-container-footer">${footerHtml}</div>
      </div>
    </response-container>
  `;
}

function addResponse(footerHtml) {
  const holder = document.createElement('div');
  // Gemini's rendered DOM has no whitespace between elements; match that so the
  // Markdown conversion is not fed fixture indentation.
  holder.innerHTML = responseHtml(footerHtml).replace(/>\s+</g, '><').trim();
  document.body.appendChild(holder);
  return holder.querySelector('.response-container');
}

describe('Copy as Markdown button injection', () => {
  let BaseObserver;
  let observers;

  // Fires the page's MutationObserver as if `node` had just been rendered.
  function renderNode(node) {
    observers.forEach(o => o.trigger([{ type: 'childList', addedNodes: [node] }]));
  }

  beforeEach(() => {
    global.resetAllMocks();
    window.location.hostname = 'gemini.google.com';
    document.body.innerHTML = '';

    // jest.setup replaces MutationObserver with a mock; keep the instances the
    // feature creates so the tests can feed it mutations.
    BaseObserver = global.MutationObserver;
    observers = [];
    global.MutationObserver = class extends BaseObserver {
      constructor(callback) {
        super(callback);
        observers.push(this);
      }
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    destroy();
    jest.useRealTimers();
    global.MutationObserver = BaseObserver;
    document.body.innerHTML = '';
  });

  function startFeature() {
    init();
    jest.advanceTimersByTime(1000);
  }

  describe('current Gemini layout (<copy-button>, no data-test-id)', () => {
    test('fixture really has no data-test-id on the copy control', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      expect(response.querySelector('[data-test-id="copy-button"]')).toBeNull();
      expect(response.querySelector('copy-button')).not.toBeNull();
    });

    test('injects the MD button right after <copy-button>, in the same row', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      startFeature();

      const buttons = response.querySelectorAll(BUTTON_SELECTOR);
      expect(buttons).toHaveLength(1);

      const copyHost = response.querySelector('copy-button');
      const row = response.querySelector('.buttons-container-v2');
      expect(copyHost.nextElementSibling).toBe(buttons[0]);
      expect(buttons[0].parentElement).toBe(row);
      expect(copyHost.contains(buttons[0])).toBe(false);
    });

    test('does not put a button in the code block next to "Copy code"', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      startFeature();
      expect(response.querySelector(`code-block ${BUTTON_SELECTOR}`)).toBeNull();
    });

    test('never duplicates the button on repeated scans', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      startFeature();

      renderNode(response);
      jest.advanceTimersByTime(100);
      renderNode(response.querySelector('.buttons-container-v2'));
      jest.advanceTimersByTime(100);

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
    });

    test('adds exactly one button per finished response in a multi-turn chat', () => {
      const first = addResponse(CURRENT_ACTION_ROW);
      const second = addResponse(CURRENT_ACTION_ROW);
      const streaming = addResponse('');
      startFeature();

      expect(first.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
      expect(second.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
      expect(streaming.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);
      expect(document.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(2);
    });

    test('still finds <copy-button> if the action row class is renamed', () => {
      const response = addResponse(
        CURRENT_ACTION_ROW.replace('buttons-container-v2', 'buttons-container-v3')
      );
      startFeature();

      const buttons = response.querySelectorAll(BUTTON_SELECTOR);
      expect(buttons).toHaveLength(1);
      expect(response.querySelector('copy-button').nextElementSibling).toBe(buttons[0]);
    });

    test('falls back to the Copy aria-label when the element name changes', () => {
      const response = addResponse(CURRENT_ACTION_ROW.replace(/copy-button>/g, 'copy-widget>'));
      startFeature();

      const buttons = response.querySelectorAll(BUTTON_SELECTOR);
      expect(buttons).toHaveLength(1);
      // Sits beside the control's outermost wrapper in the row, not inside it.
      expect(response.querySelector('copy-widget').nextElementSibling).toBe(buttons[0]);
    });
  });

  describe('streaming: button appears when the response finishes rendering', () => {
    test('no button while the footer is empty, one once the action row renders', () => {
      const response = addResponse('');
      startFeature();
      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);

      const footer = response.querySelector('.response-container-footer');
      footer.innerHTML = CURRENT_ACTION_ROW;
      renderNode(footer.firstElementChild);
      jest.advanceTimersByTime(100);

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
    });

    test('triggers when the action row element itself is the added node', () => {
      const response = addResponse('');
      startFeature();

      const footer = response.querySelector('.response-container-footer');
      footer.innerHTML = CURRENT_ACTION_ROW;
      renderNode(footer.querySelector('.buttons-container-v2'));
      jest.advanceTimersByTime(100);

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
    });

    test('triggers when the copy control is rendered after its row', () => {
      const response = addResponse('');
      startFeature();

      const footer = response.querySelector('.response-container-footer');
      footer.innerHTML = CURRENT_ACTION_ROW;
      const copyHost = footer.querySelector('copy-button');
      const detached = copyHost.parentNode.removeChild(copyHost);
      renderNode(footer.firstElementChild); // row arrives without its copy button
      jest.advanceTimersByTime(100);
      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);

      footer.querySelector('.buttons-container-v2').insertBefore(
        detached,
        footer.querySelector('.spacer')
      );
      renderNode(detached);
      jest.advanceTimersByTime(100);

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
    });
  });

  describe('legacy layout (data-test-id="copy-button")', () => {
    test('injects the MD button right after the copy button, exactly once', () => {
      const response = addResponse(LEGACY_ACTION_ROW);
      startFeature();

      const buttons = response.querySelectorAll(BUTTON_SELECTOR);
      expect(buttons).toHaveLength(1);
      expect(response.querySelector('[data-test-id="copy-button"]').nextElementSibling).toBe(
        buttons[0]
      );

      renderNode(response);
      jest.advanceTimersByTime(100);
      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
    });
  });

  describe('clicking the MD button', () => {
    let writeText;

    function clickMd(response) {
      writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
      response.querySelector(BUTTON_SELECTOR).click();
      expect(writeText).toHaveBeenCalledTimes(1);
      return writeText.mock.calls[0][0];
    }

    test('copies the response as Markdown with the code fence and a pipe table', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      startFeature();
      const markdown = clickMd(response);

      expect(markdown).toContain('Here is the code:');
      expect(markdown).toContain('| Name | Year |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Python | 1991 |');
    });

    test('opens the code fence on its own line with the language from the header', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      startFeature();
      const markdown = clickMd(response);

      expect(markdown).toMatch(/^```python\nprint\("hi"\)\n```$/m);
      // The header label must not be glued onto the fence ("Python```")
      expect(markdown).not.toContain('Python```');
    });

    test('leaves the fence bare when the header is not a single-word language', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      response.querySelector('code-block span').textContent = 'Code snippet';
      startFeature();
      const markdown = clickMd(response);

      expect(markdown).toMatch(/^```\nprint\("hi"\)\n```$/m);
      expect(markdown).not.toContain('Code snippet');
    });
  });

  describe('turning the feature off', () => {
    test('destroy() removes every MD button', () => {
      const first = addResponse(CURRENT_ACTION_ROW);
      const second = addResponse(CURRENT_ACTION_ROW);
      startFeature();
      expect(document.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(2);

      destroy();

      expect(first.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);
      expect(second.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);
    });

    test('a scan that was still queued cannot re-add buttons after destroy()', () => {
      const response = addResponse(LEGACY_ACTION_ROW);
      init(); // initial scan is queued but has not run yet
      destroy();

      jest.advanceTimersByTime(2000);

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);
    });

    test('stops reacting to new responses after destroy()', () => {
      startFeature();
      destroy();

      const response = addResponse(CURRENT_ACTION_ROW);
      renderNode(response);
      jest.advanceTimersByTime(100);

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);
    });

    test('turning it back on gives exactly one button per response', () => {
      const response = addResponse(CURRENT_ACTION_ROW);
      startFeature();
      destroy();
      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(0);

      startFeature();

      expect(response.querySelectorAll(BUTTON_SELECTOR)).toHaveLength(1);
    });
  });
});
