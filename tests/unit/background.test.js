/**
 * Unit Tests for background.js
 * Tests URL building and XML escaping using REAL exported functions
 */

import { buildGeminiUrl, escapeXml, GEMINI_BASE_URL } from '../../background.js';
import { URL_PARAM } from '../../config.js';

describe('Background Service Worker', () => {
  describe('buildGeminiUrl - REAL FUNCTION', () => {
    test('builds URL with simple prompt', () => {
      const url = buildGeminiUrl('test prompt');
      expect(url).toBe(`${GEMINI_BASE_URL}?${URL_PARAM}=test%20prompt`);
    });

    test('encodes special characters correctly', () => {
      const prompt = 'test & query = result';
      const url = buildGeminiUrl(prompt);
      expect(url).toContain(URL_PARAM);

      // Verify we can decode it back
      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    test('handles unicode characters', () => {
      const prompt = 'こんにちは世界';
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    test('handles emoji', () => {
      const prompt = 'Hello 👋 World 🌍';
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    test('handles empty string', () => {
      const url = buildGeminiUrl('');
      expect(url).toBe(`${GEMINI_BASE_URL}?${URL_PARAM}=`);
    });

    test('handles very long prompts', () => {
      const prompt = 'x'.repeat(5000);
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
      expect(decoded.length).toBe(5000);
    });

    test('handles newlines', () => {
      const prompt = 'Line 1\nLine 2\nLine 3';
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    test('handles code snippets', () => {
      const prompt = 'function test() { return "hello"; }';
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    test('handles HTML-like content', () => {
      const prompt = '<div>Hello</div>';
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    test('handles percent signs', () => {
      const prompt = '50% discount';
      const url = buildGeminiUrl(prompt);

      expect(url).toContain(URL_PARAM);
      expect(url).toContain('50%25%20discount'); // %25 is encoded %
    });

    test('handles hash symbols', () => {
      const prompt = 'C# programming';
      const url = buildGeminiUrl(prompt);

      const urlObj = new URL(url);
      const decoded = decodeURIComponent(urlObj.searchParams.get(URL_PARAM));
      expect(decoded).toBe(prompt);
    });

    // Bug detection tests - these would fail if encoding is broken
    test('WOULD FAIL if double encoding occurred', () => {
      const prompt = 'hello world';
      const url = buildGeminiUrl(prompt);
      // If double encoded, would contain hello%2520world
      expect(url).not.toContain('%2520');
      expect(url).toContain('hello%20world');
    });

    test('WOULD FAIL if URL_PARAM is wrong', () => {
      const url = buildGeminiUrl('test');
      // Must use the actual param name from config
      expect(url).toContain('bg_prompt=');
    });

    test('returns the correct base URL', () => {
      const url = buildGeminiUrl('test');
      expect(url.startsWith('https://gemini.google.com/app')).toBe(true);
    });
  });

  describe('escapeXml - REAL FUNCTION', () => {
    test('escapes ampersand', () => {
      expect(escapeXml('rock & roll')).toBe('rock &amp; roll');
    });

    test('escapes less than', () => {
      expect(escapeXml('a < b')).toBe('a &lt; b');
    });

    test('escapes greater than', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b');
    });

    test('escapes double quotes', () => {
      expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    test('escapes single quotes', () => {
      expect(escapeXml("it's")).toBe('it&#39;s');
    });

    test('escapes all special characters together', () => {
      const input = '<div class="test">Hello & \'World\'</div>';
      const expected = '&lt;div class=&quot;test&quot;&gt;Hello &amp; &#39;World&#39;&lt;/div&gt;';
      expect(escapeXml(input)).toBe(expected);
    });

    test('returns empty string unchanged', () => {
      expect(escapeXml('')).toBe('');
    });

    test('returns plain text unchanged', () => {
      expect(escapeXml('Hello World')).toBe('Hello World');
    });

    // Bug detection tests - these would fail if escape order is wrong
    test('WOULD FAIL if ampersand not escaped first', () => {
      // If & is escaped after < or >, we'd get double-escaping like &amp;lt;
      const input = '<&>';
      const result = escapeXml(input);
      expect(result).toBe('&lt;&amp;&gt;');
      expect(result).not.toContain('&amp;lt;');
      expect(result).not.toContain('&amp;gt;');
    });

    test('handles multiple ampersands', () => {
      expect(escapeXml('a & b & c')).toBe('a &amp; b &amp; c');
    });
  });
});

