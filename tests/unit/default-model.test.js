/**
 * Unit Tests for content/features/default-model.js
 *
 * Focuses on the pure matching / resolution helpers, which are the part that
 * breaks when Gemini renames a model tier or a thinking-effort level.
 */

const {
  CONFIG,
  nameMatches,
  stripVersionPrefix,
  stripEffortSuffix,
  resolveModelKey,
  resolveEffortKey,
  findModelOption,
  optionNamesModel,
  optionHasPurpose,
} = require('../../content/features/default-model.js');

// Mirrors getCurrentModel()'s reverse mapping.
function modelKeyForLabel(label) {
  const text = stripEffortSuffix(label);
  for (const [key, model] of Object.entries(CONFIG.MODELS)) {
    if (model.alias || model.legacy) continue;
    if (nameMatches(text, model.name)) return key;
  }
  return null;
}

// Mirrors getCurrentEffortFromMenu()'s option-label mapping.
function effortKeyForLabel(label) {
  for (const [key, effort] of Object.entries(CONFIG.EFFORTS)) {
    if (effort.legacy) continue;
    if (nameMatches(label, effort.name)) return key;
  }
  return null;
}

describe('Default Model - tier matching', () => {
  test('matches the current live model lineup', () => {
    expect(modelKeyForLabel('3.5 Flash-Lite Fastest answers')).toBe('flash-lite');
    expect(modelKeyForLabel('3.8 Flash All-around help')).toBe('flash');
    expect(modelKeyForLabel('3.1 Pro Advanced reasoning')).toBe('pro');
    expect(modelKeyForLabel('4 Argon Complex tasks')).toBe('argon');
  });

  test('Flash never matches Flash-Lite', () => {
    expect(nameMatches('Flash-Lite', 'Flash')).toBe(false);
    expect(nameMatches('3.5 Flash-Lite Fastest', 'Flash')).toBe(false);
    expect(nameMatches('Flash', 'Flash')).toBe(true);
  });

  test('strips the version prefix', () => {
    expect(stripVersionPrefix('3.5 Flash')).toBe('Flash');
    expect(stripVersionPrefix('3.1 Pro')).toBe('Pro');
    expect(stripVersionPrefix('4 Argon')).toBe('Argon');
    expect(stripVersionPrefix('Flash')).toBe('Flash');
  });

  test('reads the picker label when name and effort are concatenated', () => {
    // The visible label element renders "ArgonHigh" with no separator.
    expect(stripEffortSuffix('ArgonHigh')).toBe('Argon');
    expect(modelKeyForLabel('ArgonHigh')).toBe('argon');
    expect(modelKeyForLabel('Flash-LiteHigh')).toBe('flash-lite');
  });

  test('reads the accessible name that includes the effort word', () => {
    expect(modelKeyForLabel('Argon High')).toBe('argon');
    expect(modelKeyForLabel('3.8 Flash High')).toBe('flash');
    expect(modelKeyForLabel('3.1 Pro High')).toBe('pro');
  });

  test('unknown label resolves to null', () => {
    expect(modelKeyForLabel('Something Else')).toBeNull();
  });
});

describe('Default Model - thinking effort matching', () => {
  test('matches the current Low / Medium / High levels', () => {
    expect(effortKeyForLabel('Low Quick and efficient')).toBe('low');
    expect(effortKeyForLabel('Medium Balanced depth')).toBe('medium');
    expect(effortKeyForLabel('High Extra thorough')).toBe('high');
  });

  test('does not match the "Thinking level" trigger row', () => {
    expect(effortKeyForLabel('Thinking level')).toBeNull();
  });

  test('every effort level has a name', () => {
    for (const [key, effort] of Object.entries(CONFIG.EFFORTS)) {
      expect(typeof effort.name).toBe('string');
      expect(effort.name.length).toBeGreaterThan(0);
      if (effort.legacy) {
        expect(CONFIG.EFFORTS[effort.legacy]).toBeDefined();
      }
    }
  });
});

describe('Default Model - retired preferences keep working', () => {
  test('retired "thinking" tier resolves to Argon', () => {
    expect(resolveModelKey('thinking')).toBe('argon');
  });

  test('"fast" alias resolves to Flash', () => {
    expect(resolveModelKey('fast')).toBe('flash');
  });

  test('canonical model keys resolve to themselves', () => {
    for (const key of ['flash-lite', 'flash', 'pro', 'argon']) {
      expect(resolveModelKey(key)).toBe(key);
    }
  });

  test('retired effort names resolve to the nearest current level', () => {
    expect(resolveEffortKey('standard')).toBe('medium');
    expect(resolveEffortKey('extended')).toBe('high');
  });

  test('canonical effort keys resolve to themselves', () => {
    for (const key of ['low', 'medium', 'high']) {
      expect(resolveEffortKey(key)).toBe(key);
    }
  });

  test('empty and unknown preferences resolve to null', () => {
    expect(resolveModelKey('')).toBeNull();
    expect(resolveModelKey(null)).toBeNull();
    expect(resolveModelKey('nope')).toBeNull();
    expect(resolveEffortKey('')).toBeNull();
    expect(resolveEffortKey(null)).toBeNull();
  });
});

describe('Default Model - selector contract', () => {
  test('model options use the rotating-hash prefix selector', () => {
    expect(CONFIG.SELECTORS.MODEL_OPTION).toBe('[data-test-id^="bard-mode-option-"]');
  });

  test('effort options exclude the model-option rows', () => {
    // Effort menuitemradios carry no bard-mode-option- id, so the exclusion keeps
    // the two groups from being confused when reading the checked level.
    expect(CONFIG.SELECTORS.EFFORT_OPTION).toContain('menuitemradio');
    expect(CONFIG.SELECTORS.EFFORT_OPTION).toContain('bard-mode-option-');
  });

  test('thinking-level trigger and picker button keep their stable markup', () => {
    expect(CONFIG.SELECTORS.THINKING_LEVEL_ITEM).toBe('gem-menu-item[value="thinking_level"]');
    expect(CONFIG.SELECTORS.MODEL_PICKER_BUTTON).toBe('[data-test-id="bard-mode-menu-button"]');
  });
});


// ---------------------------------------------------------------------------
// Menu markup captured from live gemini.google.com (Nov 2026). Each option is a
// use-case label plus the model name in a sublabel, with an optional badge:
//   <gem-menu-item role="menuitemradio" data-test-id="bard-mode-option-<id>">
//     <div class="label-container"><span class="label">Everyday help</span>
//       <div class="sublabel">4 Hydrogen</div></div>
//     <div class="trailing-container"><div class="badge">New</div></div>
describe('Default Model - option matching against the live menu markup', () => {
  function option({ id, label, sub, badge, checked }) {
    const item = document.createElement('gem-menu-item');
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute('data-test-id', 'bard-mode-option-' + id);
    item.setAttribute('aria-checked', checked ? 'true' : 'false');
    const labelWrap = document.createElement('div');
    labelWrap.className = 'label-container';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = ' ' + label + ' ';
    labelWrap.appendChild(l);
    if (sub) {
      const sl = document.createElement('div');
      sl.className = 'sublabel';
      sl.textContent = sub;
      labelWrap.appendChild(sl);
    }
    item.appendChild(labelWrap);
    if (badge) {
      const b = document.createElement('div');
      b.className = 'badge';
      b.textContent = badge;
      item.appendChild(b);
    }
    return item;
  }

  function trigger() {
    const t = document.createElement('gem-menu-item');
    t.setAttribute('role', 'menuitem');
    t.setAttribute('value', 'thinking_level');
    t.textContent = 'Thinking level';
    return t;
  }

  function mount(options) {
    document.body.replaceChildren(...options.map(option), trigger());
  }

  const loggedIn = [
    { id: '8c46', label: 'Quick answers', sub: '3.5 Flash-Lite' },
    { id: '56fd', label: 'Everyday help', sub: '4 Hydrogen', badge: 'New', checked: true },
    { id: 'e6fa', label: 'Detailed research', sub: '3.1 Pro' },
    { id: 'argon', label: 'Code & analysis', sub: '4 Argon' },
  ];
  const guest = [
    ...loggedIn.slice(0, 2),
    { id: 'argon', label: 'Code & analysis', sub: '4 Argon' },
    { id: '', label: 'Most complex work', sub: '4 Carbon' },
  ];

  const labelOf = (found) => found && found.option.querySelector('.label').textContent.trim();

  afterEach(() => document.body.replaceChildren());

  test('resolves every tier in the logged-in lineup by its sublabel', () => {
    mount(loggedIn);
    expect(labelOf(findModelOption('flash-lite'))).toBe('Quick answers');
    expect(labelOf(findModelOption('hydrogen'))).toBe('Everyday help');
    expect(labelOf(findModelOption('pro'))).toBe('Detailed research');
    expect(labelOf(findModelOption('argon'))).toBe('Code & analysis');
  });

  test('the "New" badge does not break the Hydrogen match', () => {
    mount(loggedIn);
    const hydrogen = document.querySelector('[data-test-id="bard-mode-option-56fd"]');
    expect(hydrogen.textContent).toMatch(/HydrogenNew/); // flat text is glued together
    expect(optionNamesModel(hydrogen, CONFIG.MODELS.hydrogen)).toBe(true);
  });

  test('resolves Carbon in the guest lineup and reports it missing when absent', () => {
    mount(guest);
    expect(labelOf(findModelOption('carbon'))).toBe('Most complex work');
    mount(loggedIn);
    expect(findModelOption('carbon')).toBeNull();
  });

  test('Flash-Lite is never picked for "flash"', () => {
    mount(loggedIn);
    const found = findModelOption('flash');
    expect(found.key).toBe('hydrogen'); // no Flash option: falls back to its successor
    expect(labelOf(found)).toBe('Everyday help');
  });

  test('a real Flash option wins over the Hydrogen fallback', () => {
    mount([...loggedIn, { id: 'flash', label: 'Flash', sub: 'All-around help' }]);
    const found = findModelOption('flash');
    expect(found.key).toBe('flash');
    expect(labelOf(found)).toBe('Flash');
  });

  test('retired "thinking" preference resolves to the Argon option', () => {
    mount(loggedIn);
    expect(labelOf(findModelOption(resolveModelKey('thinking')))).toBe('Code & analysis');
  });

  test('falls back to the use-case label if the model names change', () => {
    mount(loggedIn.map(o => ({ ...o, sub: '9 Renamed' })));
    expect(labelOf(findModelOption('pro'))).toBe('Detailed research');
    expect(optionHasPurpose(document.querySelector('[data-test-id="bard-mode-option-argon"]'), CONFIG.MODELS.argon)).toBe(true);
  });

  test('older layout (model name as the label) still matches', () => {
    mount([
      { id: 'a', label: 'Flash', sub: 'All-around help' },
      { id: 'b', label: '3.1 Pro', sub: 'Advanced reasoning' },
    ]);
    expect(labelOf(findModelOption('flash'))).toBe('Flash');
    expect(labelOf(findModelOption('pro'))).toBe('3.1 Pro');
  });

  test('skips options the account cannot use (signed-out menu)', () => {
    mount(guest);
    document.querySelectorAll('[data-test-id^="bard-mode-option-"]').forEach((el) => {
      const lite = el.querySelector('.label').textContent.trim() === 'Quick answers';
      el.setAttribute('aria-disabled', lite ? 'false' : 'true');
    });
    expect(findModelOption('hydrogen')).toBeNull();
    expect(findModelOption('carbon')).toBeNull();
    expect(labelOf(findModelOption('flash-lite'))).toBe('Quick answers');
    expect(findModelOption('flash')).toBeNull(); // fallback target is disabled too
  });

  test('never resolves to the thinking-level trigger or a sign-in row', () => {
    document.body.replaceChildren(trigger());
    expect(findModelOption('argon')).toBeNull();
    const signIn = document.createElement('gem-menu-item');
    signIn.setAttribute('role', 'menuitem');
    signIn.textContent = 'Sign in Get more access';
    document.body.appendChild(signIn);
    expect(findModelOption('pro')).toBeNull();
  });
});

describe('Default Model - new tiers', () => {
  test('Hydrogen and Carbon are selectable and reverse-map from the picker label', () => {
    expect(modelKeyForLabel('Hydrogen')).toBe('hydrogen');
    expect(modelKeyForLabel('HydrogenHigh')).toBe('hydrogen');
    expect(modelKeyForLabel('4 Carbon')).toBe('carbon');
  });

  test('"flash" keeps working through its Hydrogen fallback', () => {
    expect(CONFIG.MODELS.flash.fallback).toBe('hydrogen');
    expect(resolveModelKey('flash')).toBe('flash');
    expect(resolveModelKey('fast')).toBe('flash');
  });
});

describe('Default Model - options page stays in sync with the loader', () => {
  const fs = require('fs');
  const path = require('path');

  for (const dir of ['options', 'firefox/options']) {
    test(`${dir}/options.html only offers tiers the loader understands`, () => {
      const html = fs.readFileSync(path.resolve(__dirname, '../..', dir, 'options.html'), 'utf8');
      const select = html.match(/<select id="selectedModel"[^>]*>([\s\S]*?)<\/select>/)[1];
      const values = [...select.matchAll(/value="([^"]+)"/g)].map(m => m[1]);
      expect(values.length).toBeGreaterThan(0);
      for (const value of values) {
        const model = CONFIG.MODELS[value];
        expect(model).toBeDefined();
        expect(model.alias || model.legacy).toBeFalsy(); // never offer a retired value
      }
      // every current tier is selectable
      for (const [key, model] of Object.entries(CONFIG.MODELS)) {
        if (model.alias || model.legacy || key === 'flash') continue;
        expect(values).toContain(key);
      }
    });

    test(`${dir}/options.js maps retired model values onto current tiers`, () => {
      const js = fs.readFileSync(path.resolve(__dirname, '../..', dir, 'options.js'), 'utf8');
      const legacy = js.match(/const LEGACY_MODELS = (\{[^}]*\})/)[1];
      const map = Function('return ' + legacy)();
      expect(map.thinking).toBe('argon');
      expect(map.flash).toBe('hydrogen');
      expect(CONFIG.MODELS[map.flash]).toBeDefined();
      const html = fs.readFileSync(path.resolve(__dirname, '../..', dir, 'options.html'), 'utf8');
      expect(html).toContain(`value="${js.match(/const DEFAULT_MODEL = '([^']+)'/)[1]}"`);
    });
  }
});
