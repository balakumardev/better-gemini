/**
 * Playwright Global Setup
 * Runs once before all tests to validate extension and fixtures
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../..');
const FIXTURES_PATH = path.resolve(__dirname, '../e2e/fixtures');

module.exports = async (config) => {
  console.log('🚀 Running Playwright global setup...');

  // Verify extension exists
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Extension manifest not found at: ${manifestPath}`);
  }

  // Validate manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`📦 Extension: ${manifest.name} v${manifest.version}`);

  // Validate manifest structure
  const requiredManifestFields = ['manifest_version', 'name', 'version', 'background', 'content_scripts', 'omnibox'];
  const missingFields = requiredManifestFields.filter(field => !manifest[field]);
  if (missingFields.length > 0) {
    console.warn(`⚠️ Warning: Manifest missing fields: ${missingFields.join(', ')}`);
  }

  // Create test artifacts directory
  const artifactsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Verify required extension files exist
  const requiredFiles = ['background.js', 'config.js', 'content/injector.js'];
  console.log('📄 Checking extension files...');
  for (const file of requiredFiles) {
    const filePath = path.join(EXTENSION_PATH, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.warn(`   ⚠️ Missing: ${file}`);
    }
  }

  // Verify fixtures exist
  console.log('📄 Checking test fixtures...');
  const fixtureFiles = ['mock-gemini.html'];
  for (const file of fixtureFiles) {
    const filePath = path.join(FIXTURES_PATH, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.warn(`   ⚠️ Missing fixture: ${file}`);
    }
  }

  // Validate omnibox configuration
  if (manifest.omnibox) {
    console.log(`🔑 Omnibox keyword: "${manifest.omnibox.keyword}"`);
  }

  // Validate content scripts
  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    console.log(`📜 Content scripts: ${manifest.content_scripts[0].js.join(', ')}`);
    console.log(`   Matches: ${manifest.content_scripts[0].matches.join(', ')}`);
  }

  console.log('✅ Global setup complete\n');

  // Return data that can be used in tests
  return {
    extensionPath: EXTENSION_PATH,
    fixturesPath: FIXTURES_PATH,
    manifestVersion: manifest.version,
    omniboxKeyword: manifest.omnibox?.keyword,
  };
};

