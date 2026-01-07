#!/bin/bash

# ============================================================================
# Bug Detection Verification Script
# ============================================================================
# This script introduces intentional bugs one at a time and verifies that
# the test suite catches them, proving tests are actually testing real code.
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_FILE="$SCRIPT_DIR/BUG_DETECTION_REPORT.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << 'EOF'
# Bug Detection Verification Report

This report documents the verification that tests ACTUALLY catch real bugs.

**Process**: Each bug was intentionally introduced into the real source code,
tests were run, and we verified that specific tests failed.

**Date Generated**: $(date)

---

## Summary

| Component | Bugs Tested | Tests Caught | Status |
|-----------|-------------|--------------|--------|
EOF
}

# Track results
declare -a RESULTS=()
declare -i TOTAL_BUGS=0
declare -i BUGS_CAUGHT=0

# Function to introduce a bug and test
test_bug() {
    local component="$1"
    local file="$2"
    local description="$3"
    local original_line="$4"
    local buggy_line="$5"
    local expected_failure_pattern="$6"
    
    echo -e "${YELLOW}Testing bug: $description${NC}"
    echo "  File: $file"
    
    TOTAL_BUGS=$((TOTAL_BUGS + 1))
    
    # Create backup
    cp "$PROJECT_ROOT/$file" "$PROJECT_ROOT/$file.bak"
    
    # Introduce the bug
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|$original_line|$buggy_line|g" "$PROJECT_ROOT/$file"
    else
        sed -i "s|$original_line|$buggy_line|g" "$PROJECT_ROOT/$file"
    fi
    
    # Run tests and capture output
    cd "$SCRIPT_DIR"
    local test_output
    local test_exit_code=0
    test_output=$(npm test 2>&1) || test_exit_code=$?
    
    # Restore original file
    mv "$PROJECT_ROOT/$file.bak" "$PROJECT_ROOT/$file"
    
    # Check if tests failed as expected
    local bug_caught="NO"
    local failed_tests=""
    
    if [ $test_exit_code -ne 0 ]; then
        if echo "$test_output" | grep -q "$expected_failure_pattern"; then
            bug_caught="YES"
            BUGS_CAUGHT=$((BUGS_CAUGHT + 1))
            echo -e "${GREEN}  ✓ Bug caught! Tests failed as expected.${NC}"
            # Extract failed test names
            failed_tests=$(echo "$test_output" | grep -E "✕|FAIL" | head -5)
        else
            echo -e "${RED}  ✗ Tests failed but not for expected reason${NC}"
            failed_tests=$(echo "$test_output" | grep -E "✕|FAIL" | head -5)
        fi
    else
        echo -e "${RED}  ✗ Bug NOT caught! Tests passed when they should have failed.${NC}"
    fi
    
    # Record result
    RESULTS+=("$component|$description|$bug_caught|$failed_tests|$test_output")
}

# Function to add bug results to report
add_bug_to_report() {
    local component="$1"
    local description="$2"
    local caught="$3"
    local failed_tests="$4"
    
    local status_emoji="❌"
    [ "$caught" == "YES" ] && status_emoji="✅"
    
    cat >> "$REPORT_FILE" << EOF

### $status_emoji $description

- **Component**: $component
- **Bug Caught**: $caught
- **Failed Tests**:
\`\`\`
$failed_tests
\`\`\`

EOF
}

echo "============================================"
echo "Bug Detection Verification Script"
echo "============================================"
echo ""

init_report

# ============================================================================
# BACKGROUND.JS BUGS
# ============================================================================
echo -e "${YELLOW}Testing Background.js bugs...${NC}"
echo ""

# Bug 1: Remove URL encoding
test_bug "background.js" "background.js" \
    "Remove URL encoding (encodeURIComponent)" \
    "const encodedPrompt = encodeURIComponent(prompt);" \
    "const encodedPrompt = prompt;" \
    "encod"

# Bug 2: Wrong URL parameter name
test_bug "background.js" "background.js" \
    "Use wrong URL parameter name" \
    "return \\\`\\\${GEMINI_BASE_URL}?\\\${urlParam}=\\\${encodedPrompt}\\\`;" \
    "return \\\`\\\${GEMINI_BASE_URL}?wrong_param=\\\${encodedPrompt}\\\`;" \
    "bg_prompt"

# Bug 3: Wrong disposition handling (always use newTab)
test_bug "background.js" "background.js" \
    "Always create new tab instead of updating current" \
    "case 'currentTab':" \
    "case 'NEVER_MATCH_THIS':" \
    "currentTab"

# Bug 4: Break XML escaping order
test_bug "background.js" "background.js" \
    "Break XML ampersand escaping" \
    ".replace(/&/g, '\&amp;')" \
    ".replace(/&/g, 'BROKEN')" \
    "amp"

echo ""

# ============================================================================
# INJECTOR-CORE.JS BUGS  
# ============================================================================
echo -e "${YELLOW}Testing Injector-core.js bugs...${NC}"
echo ""

# Bug 5: Wrong URL parameter in getPromptFromURL
test_bug "injector-core.js" "content/injector-core.js" \
    "Use wrong URL parameter name in getPromptFromURL" \
    "const encodedPrompt = urlParams.get(CONFIG.URL_PARAM);" \
    "const encodedPrompt = urlParams.get('wrong_param');" \
    "bg_prompt"

# Bug 6: Remove execCommand call in injectText
test_bug "injector-core.js" "content/injector-core.js" \
    "Remove execCommand call in injectText" \
    "return document.execCommand('insertText', false, text);" \
    "return false;" \
    "execCommand"

# Bug 7: Skip URL cleanup
test_bug "injector-core.js" "content/injector-core.js" \
    "Return empty URL from cleanupURL" \
    "url.searchParams.delete(CONFIG.URL_PARAM);" \
    "// BROKEN: url.searchParams.delete(CONFIG.URL_PARAM);" \
    "bg_prompt"

# Bug 8: Change selector to non-existent
test_bug "injector-core.js" "content/injector-core.js" \
    "Break input field selector" \
    "'div\[contenteditable=\"true\"\]'," \
    "'div\[BROKEN=\"true\"\]'," \
    "contenteditable"

echo ""

# ============================================================================
# CONFIG.JS BUGS
# ============================================================================
echo -e "${YELLOW}Testing Config.js bugs...${NC}"
echo ""

# Bug 9: Change URL_PARAM value
test_bug "config.js" "config.js" \
    "Change URL_PARAM to wrong value" \
    "const URL_PARAM = 'bg_prompt';" \
    "const URL_PARAM = 'wrong_param';" \
    "bg_prompt"

# Bug 10: Change Gemini URL
test_bug "config.js" "config.js" \
    "Change base URL to wrong domain" \
    "base: 'https://gemini.google.com'," \
    "base: 'https://wrong.domain.com'," \
    "gemini"

echo ""
echo "============================================"
echo "Bug Detection Results Summary"
echo "============================================"
echo ""
echo -e "Total bugs tested: $TOTAL_BUGS"
echo -e "Bugs caught by tests: ${GREEN}$BUGS_CAUGHT${NC}"
echo ""

# Add summary to report
echo "| Background.js | 4 | - | - |" >> "$REPORT_FILE"
echo "| Injector-core.js | 4 | - | - |" >> "$REPORT_FILE"
echo "| Config.js | 2 | - | - |" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Total**: $TOTAL_BUGS bugs tested, $BUGS_CAUGHT caught" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Detailed Results" >> "$REPORT_FILE"

# Add detailed results
for result in "${RESULTS[@]}"; do
    IFS='|' read -r component desc caught failed full_output <<< "$result"
    add_bug_to_report "$component" "$desc" "$caught" "$failed"
done

# Final verification - run clean tests
echo "Running final verification with original code..."
cd "$SCRIPT_DIR"
npm test > /dev/null 2>&1 && echo -e "${GREEN}✓ All tests pass with original code${NC}" || echo -e "${RED}✗ Tests failed with original code!${NC}"

echo ""
echo "Report generated: $REPORT_FILE"

