/**
 * Playwright Global Teardown
 * Runs once after all tests
 */

const fs = require('fs');
const path = require('path');

module.exports = async (config) => {
  console.log('🧹 Running Playwright global teardown...');

  // Clean up temporary files if needed
  const tempDir = path.join(__dirname, '../.temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // Generate summary report
  const resultsPath = path.join(__dirname, '../test-results/results.json');
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const passed = results.suites?.reduce((acc, suite) =>
        acc + suite.specs?.filter(s => s.ok).length || 0, 0) || 0;
      const failed = results.suites?.reduce((acc, suite) =>
        acc + suite.specs?.filter(s => !s.ok).length || 0, 0) || 0;

      console.log(`\n📊 Test Summary:`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   📝 Total: ${passed + failed}\n`);
    } catch (e) {
      // Ignore parsing errors
    }
  }

  console.log('✅ Global teardown complete');
};

