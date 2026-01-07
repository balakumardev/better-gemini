/**
 * Custom Assertion Helpers for Better Gemini Tests
 */

/**
 * Asserts that a URL contains the expected prompt parameter
 * @param {string} url - The URL to check
 * @param {string} expectedPrompt - Expected prompt value (decoded)
 * @param {string} paramName - Parameter name (default: 'bg_prompt')
 */
function assertUrlHasPrompt(url, expectedPrompt, paramName = 'bg_prompt') {
  const urlObj = new URL(url);
  const actualValue = urlObj.searchParams.get(paramName);

  if (!actualValue) {
    throw new Error(`URL does not contain parameter "${paramName}": ${url}`);
  }

  const decodedValue = decodeURIComponent(actualValue);
  if (decodedValue !== expectedPrompt) {
    throw new Error(
      `Prompt mismatch. Expected: "${expectedPrompt}", Got: "${decodedValue}"`
    );
  }

  return true;
}

/**
 * Asserts that a URL is the Gemini base URL without prompt
 * @param {string} url - The URL to check
 */
function assertIsGeminiBaseUrl(url) {
  const urlObj = new URL(url);

  if (!url.includes('gemini.google.com')) {
    throw new Error(`Not a Gemini URL: ${url}`);
  }

  if (urlObj.searchParams.has('bg_prompt')) {
    throw new Error(`URL should not have bg_prompt parameter: ${url}`);
  }

  return true;
}

/**
 * Asserts URL was cleaned (bg_prompt removed)
 * @param {string} currentUrl - Current page URL
 */
function assertUrlCleaned(currentUrl) {
  const url = new URL(currentUrl);
  if (url.searchParams.has('bg_prompt')) {
    throw new Error(`URL should have been cleaned of bg_prompt: ${currentUrl}`);
  }
  return true;
}

/**
 * Asserts that text was injected into an element
 * @param {Element} element - DOM element to check
 * @param {string} expectedText - Expected text content
 */
function assertTextInjected(element, expectedText) {
  const actualText = element.textContent?.trim() || element.innerText?.trim();

  if (actualText !== expectedText) {
    throw new Error(
      `Text injection failed. Expected: "${expectedText}", Got: "${actualText}"`
    );
  }

  return true;
}

/**
 * Creates a URL builder for testing
 * @param {string} baseUrl - Base Gemini URL
 * @param {string} paramName - Prompt parameter name
 */
function createUrlBuilder(baseUrl = 'https://gemini.google.com/app', paramName = 'bg_prompt') {
  return {
    /**
     * Builds URL with prompt
     * @param {string} prompt - The prompt to encode
     * @returns {string} Full URL with encoded prompt
     */
    withPrompt(prompt) {
      const encoded = encodeURIComponent(prompt);
      return `${baseUrl}?${paramName}=${encoded}`;
    },

    /**
     * Returns base URL without prompt
     */
    base() {
      return baseUrl;
    },
  };
}

/**
 * Test data generators for various input types
 */
const testData = {
  // Basic text prompts
  simple: 'Hello world',
  withSpaces: 'Hello world with spaces',
  multiWord: 'What is the meaning of life?',

  // Special characters
  withAmpersand: 'rock & roll',
  withEquals: 'x = y + z',
  withQuestion: 'What is 2+2?',
  withHash: 'C# programming',
  withPercent: '50% discount',

  // Unicode and emoji
  unicode: 'こんにちは世界',
  emoji: 'Hello 👋 World 🌍',
  mixedUnicode: 'Café résumé naïve',

  // Edge cases
  empty: '',
  whitespace: '   ',
  singleChar: 'a',
  veryLong: 'x'.repeat(5000),
  withNewlines: 'Line 1\nLine 2\nLine 3',
  withTabs: 'Col1\tCol2\tCol3',

  // Code snippets
  codeBlock: 'function test() { return "hello"; }',
  htmlTags: '<div>Hello</div>',
  sqlQuery: "SELECT * FROM users WHERE name = 'test'",

  // URL-like content
  withUrl: 'Check out https://example.com',
  withEmail: 'Contact me@example.com',
};

/**
 * Generates test cases for character encoding
 */
function generateEncodingTestCases() {
  return Object.entries(testData).map(([name, value]) => ({
    name,
    input: value,
    encoded: encodeURIComponent(value),
    decoded: value,
  }));
}

module.exports = {
  assertUrlHasPrompt,
  assertIsGeminiBaseUrl,
  assertUrlCleaned,
  assertTextInjected,
  createUrlBuilder,
  testData,
  generateEncodingTestCases,
};

