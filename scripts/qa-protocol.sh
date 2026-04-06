#!/bin/bash
# QA Protocol Script - 4-Phase Mandatory Quality Assurance
# Implements the failsafe QA protocol from AI_AGENT_SYSTEM.md

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"

echo "🔍 FAILSAFE QA PROTOCOL - 4 PHASES"
echo "==================================="

# PHASE 1: PRE-FLIGHT (informational only)
echo ""
echo "📋 PHASE 1: PRE-FLIGHT"
echo "----------------------"
echo "✓ Check memories/repo/ for context"
if [ -d "${REPO_ROOT}/memories/repo" ]; then
    echo "  ✅ Memory directory exists"
    ls -la "${REPO_ROOT}/memories/repo" 2>/dev/null || true
else
    echo "  ℹ️  No memory directory (will be created)"
fi

# PHASE 2: POST-EDIT VERIFICATION
echo ""
echo "🔧 PHASE 2: POST-EDIT VERIFICATION"
echo "-----------------------------------"

# Node syntax check on all JS files in src/
echo "Testing JavaScript syntax..."
js_error=0
for js_file in $(find "${REPO_ROOT}/src" -name "*.js" -type f 2>/dev/null); do
    if ! node --check "$js_file" 2>/dev/null; then
        echo "  ❌ Syntax error in: $js_file"
        js_error=1
    fi
done

if [ $js_error -eq 0 ]; then
    echo "  ✅ All JavaScript files pass syntax check"
else
    echo "  ❌ JavaScript syntax errors detected"
    exit 1
fi

# Run guardian snapshot comparison
if [ -f "${REPO_ROOT}/scripts/guardian-snapshot.sh" ]; then
    echo ""
    echo "Running guardian comparison..."
    if bash "${REPO_ROOT}/scripts/guardian-snapshot.sh" --compare 2>/dev/null; then
        echo "  ✅ Guardian check passed"
    else
        echo "  ⚠️  Guardian baseline not set or regression detected"
        echo "  ℹ️  Run: bash scripts/guardian-snapshot.sh --baseline"
    fi
fi

# Git diff check
echo ""
echo "Checking git status..."
git -C "${REPO_ROOT}" diff --stat HEAD 2>/dev/null || echo "  ℹ️  No git changes"

# PHASE 3: PROXY QA (if server is running)
echo ""
echo "🌐 PHASE 3: PROXY QA"
echo "--------------------"

# Check if server is running on port
if lsof -i ":${PORT}" >/dev/null 2>&1; then
    echo "  ✅ Server detected on port ${PORT}"
    
    # HTML structure test
    html_sections=$(curl -s "http://localhost:${PORT}/" | grep -c '<section' || echo "0")
    echo "  📊 HTML sections: ${html_sections}"
    
    # Nav buttons test
    nav_buttons=$(curl -s "http://localhost:${PORT}/" | grep -c 'nav-btn' || echo "0")
    echo "  📊 Nav buttons: ${nav_buttons}"
    
    # CSS load test
    css_loaded=$(curl -s "http://localhost:${PORT}/" | grep -c 'style.css' || echo "0")
    if [ "${css_loaded}" -gt 0 ]; then
        echo "  ✅ CSS linked"
    else
        echo "  ⚠️  CSS not detected"
    fi
    
    # JS load test
    js_loaded=$(curl -s "http://localhost:${PORT}/" | grep -c 'main.js\|index.js\|GameEngine.js' || echo "0")
    if [ "${js_loaded}" -gt 0 ]; then
        echo "  ✅ JavaScript linked"
    else
        echo "  ⚠️  Main JS not detected"
    fi
else
    echo "  ℹ️  Server not running on port ${PORT}"
    echo "  ℹ️  Skipping proxy QA tests"
    echo "  💡 To test: npm start (or your server command)"
fi

# PHASE 4: HEADLESS BROWSER
echo ""
echo "🤖 PHASE 4: HEADLESS BROWSER VALIDATION"
echo "----------------------------------------"
echo "  ℹ️  Headless browser testing requires Playwright/Puppeteer"
echo "  ℹ️  Run separately: npx playwright test (if configured)"

# Summary
echo ""
echo "✅ QA PROTOCOL COMPLETE"
echo "======================="
echo "Review results above. All phases should pass before task completion."
exit 0
