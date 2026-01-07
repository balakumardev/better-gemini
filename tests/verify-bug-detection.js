/**
 * Bug Detection Verification Script
 * 
 * This script introduces intentional bugs one at a time and verifies that
 * the test suite catches them, proving tests are actually testing real code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const TESTS_DIR = __dirname;
const REPORT_FILE = path.join(TESTS_DIR, 'BUG_DETECTION_REPORT.md');

// Bug definitions
const BUGS = [
  // ============ BACKGROUND.JS BUGS ============
  {
    id: 'BG-001',
    component: 'background.js',
    file: 'background.js',
    description: 'Remove URL encoding (encodeURIComponent)',
    find: 'const encodedPrompt = encodeURIComponent(prompt);',
    replace: 'const encodedPrompt = prompt; // BUG: no encoding',
    expectedFailure: 'encode',
  },
  {
    id: 'BG-002',
    component: 'background.js',
    file: 'background.js',
    description: 'Use hardcoded wrong URL parameter name',
    find: 'return `${GEMINI_BASE_URL}?${urlParam}=${encodedPrompt}`;',
    replace: 'return `${GEMINI_BASE_URL}?wrong_param=${encodedPrompt}`;',
    expectedFailure: 'bg_prompt',
  },
  {
    id: 'BG-003',
    component: 'background.js',
    file: 'background.js',
    description: 'Break ampersand XML escaping',
    find: ".replace(/&/g, '&amp;')",
    replace: ".replace(/&/g, 'BROKEN')",
    expectedFailure: 'amp',
  },
  {
    id: 'BG-004',
    component: 'background.js',
    file: 'background.js',
    description: 'Break tabs.update call in currentTab disposition',
    find: "await chromeApi.tabs.update(activeTab.id, { url });",
    replace: "await chromeApi.tabs.create({ url, active: true }); // BUG: should be update",
    expectedFailure: 'update',
  },
  
  // ============ INJECTOR-CORE.JS BUGS ============
  {
    id: 'INJ-001',
    component: 'injector-core.js',
    file: 'content/injector-core.js',
    description: 'Use wrong URL parameter name in getPromptFromURL',
    find: "const encodedPrompt = urlParams.get(CONFIG.URL_PARAM);",
    replace: "const encodedPrompt = urlParams.get('wrong_param');",
    expectedFailure: 'bg_prompt',
  },
  {
    id: 'INJ-002',
    component: 'injector-core.js',
    file: 'content/injector-core.js',
    description: 'Remove execCommand call from injectText',
    find: "return document.execCommand('insertText', false, text);",
    replace: "return false; // BUG: no execCommand",
    expectedFailure: 'execCommand',
  },
  {
    id: 'INJ-003',
    component: 'injector-core.js',
    file: 'content/injector-core.js',
    description: 'Break URL cleanup - do not delete param',
    find: "url.searchParams.delete(CONFIG.URL_PARAM);",
    replace: "// BUG: url.searchParams.delete(CONFIG.URL_PARAM);",
    expectedFailure: 'bg_prompt',
  },
  {
    id: 'INJ-004',
    component: 'injector-core.js',
    file: 'content/injector-core.js',
    description: 'Change CONFIG.URL_PARAM value',
    find: "URL_PARAM: 'bg_prompt',",
    replace: "URL_PARAM: 'wrong_param',",
    expectedFailure: 'bg_prompt',
  },
  
  // ============ CONFIG.JS BUGS ============
  {
    id: 'CFG-001',
    component: 'config.js',
    file: 'config.js',
    description: 'Change URL_PARAM export to wrong value',
    find: "const URL_PARAM = 'bg_prompt';",
    replace: "const URL_PARAM = 'wrong_param';",
    expectedFailure: 'bg_prompt',
  },
  {
    id: 'CFG-002',
    component: 'config.js',
    file: 'config.js',
    description: 'Change base URL to wrong domain',
    find: "base: 'https://gemini.google.com',",
    replace: "base: 'https://wrong.domain.com',",
    expectedFailure: 'gemini',
  },
];

// Results storage
const results = [];

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[0m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
  };
  console.log(`${colors[type]}${msg}\x1b[0m`);
}

function testBug(bug) {
  const filePath = path.join(PROJECT_ROOT, bug.file);
  log(`\n[${bug.id}] Testing: ${bug.description}`, 'warn');
  log(`  File: ${bug.file}`);
  
  // Read original file
  const original = fs.readFileSync(filePath, 'utf8');
  
  // Check if find pattern exists
  if (!original.includes(bug.find)) {
    log(`  ✗ Pattern not found in file!`, 'error');
    results.push({ ...bug, caught: false, error: 'Pattern not found', output: '' });
    return;
  }
  
  // Introduce the bug
  const buggy = original.replace(bug.find, bug.replace);
  fs.writeFileSync(filePath, buggy);
  
  // Run tests
  let testOutput = '';
  let testFailed = false;
  
  try {
    testOutput = execSync('npm test 2>&1', { cwd: TESTS_DIR, encoding: 'utf8' });
  } catch (error) {
    testFailed = true;
    testOutput = error.stdout || error.message;
  }
  
  // Restore original file
  fs.writeFileSync(filePath, original);
  
  // Analyze results
  const caught = testFailed && testOutput.toLowerCase().includes(bug.expectedFailure.toLowerCase());
  
  if (caught) {
    log(`  ✓ Bug caught! Tests failed as expected.`, 'success');
  } else if (testFailed) {
    log(`  ✗ Tests failed but possibly not for expected reason`, 'error');
  } else {
    log(`  ✗ Bug NOT caught! Tests passed when they should have failed.`, 'error');
  }
  
  // Extract failed tests
  const failedTests = testOutput.match(/✕[^\n]+/g) || [];
  
  results.push({
    ...bug,
    caught,
    testFailed,
    failedTests: failedTests.slice(0, 5),
    output: testOutput.slice(0, 2000),
  });
}

function generateReport() {
  const caughtCount = results.filter(r => r.caught).length;
  
  let report = `# Bug Detection Verification Report

This report documents the verification that tests ACTUALLY catch real bugs.

**Process**: Each bug was intentionally introduced into the real source code,
tests were run, and we verified that specific tests failed.

**Date Generated**: ${new Date().toISOString()}

---

## Summary

| ID | Component | Description | Caught |
|----|-----------|-------------|--------|
`;
  
  for (const r of results) {
    const status = r.caught ? '✅' : '❌';
    report += `| ${r.id} | ${r.component} | ${r.description} | ${status} |\n`;
  }

  report += `\n**Total**: ${results.length} bugs tested, **${caughtCount} caught** (${Math.round(caughtCount/results.length*100)}%)\n\n`;
  report += `---\n\n## Detailed Results\n\n`;
  
  for (const r of results) {
    const status = r.caught ? '✅' : '❌';
    report += `### ${status} ${r.id}: ${r.description}\n\n`;
    report += `- **Component**: ${r.component}\n`;
    report += `- **File**: ${r.file}\n`;
    report += `- **Bug Caught**: ${r.caught ? 'YES' : 'NO'}\n`;
    report += `- **Tests Failed**: ${r.testFailed ? 'YES' : 'NO'}\n\n`;
    
    if (r.error) {
      report += `**Error**: ${r.error}\n\n`;
    }
    
    if (r.failedTests.length > 0) {
      report += `**Failed Tests**:\n\`\`\`\n${r.failedTests.join('\n')}\n\`\`\`\n\n`;
    }
    
    report += `**Code Change**:\n\`\`\`diff\n- ${r.find}\n+ ${r.replace}\n\`\`\`\n\n---\n\n`;
  }
  
  fs.writeFileSync(REPORT_FILE, report);
  log(`\nReport saved to: ${REPORT_FILE}`, 'success');
}

// Main execution
log('============================================');
log('Bug Detection Verification Script');
log('============================================');

// Run all bug tests
for (const bug of BUGS) {
  testBug(bug);
}

// Generate report
generateReport();

// Final summary
const caughtCount = results.filter(r => r.caught).length;
log('\n============================================');
log('Final Summary');
log('============================================');
log(`Total bugs tested: ${results.length}`);
log(`Bugs caught by tests: ${caughtCount}`, caughtCount === results.length ? 'success' : 'warn');
log(`Success rate: ${Math.round(caughtCount/results.length*100)}%`);

// Verify clean state
log('\nVerifying original code still passes...');
try {
  execSync('npm test', { cwd: TESTS_DIR, stdio: 'pipe' });
  log('✓ All tests pass with original code', 'success');
} catch (e) {
  log('✗ Tests failed with original code!', 'error');
  process.exit(1);
}

