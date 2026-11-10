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
