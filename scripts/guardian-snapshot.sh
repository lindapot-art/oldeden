#!/bin/bash
# Guardian Snapshot Script - Code Integrity Watchdog
# Tracks critical markers in codebase to detect regressions

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_DIR="${REPO_ROOT}/memories/repo"
BASELINE_FILE="${SNAPSHOT_DIR}/guardian-baseline.json"
CURRENT_FILE="${SNAPSHOT_DIR}/guardian-current.json"

# Create memories directory if it doesn't exist
mkdir -p "${SNAPSHOT_DIR}"

# Function to count markers in files
count_markers() {
    local output_file="$1"
    
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"metrics\": {"
    
    # HTML section tags
    section_count=0
    if [ -f "${REPO_ROOT}/public/index.html" ]; then
        section_count=$(grep -o '<section' "${REPO_ROOT}/public/index.html" 2>/dev/null | wc -l | tr -d ' ')
        [ -z "$section_count" ] && section_count=0
    fi
    echo "    \"html_sections\": ${section_count},"
    
    # Navigation buttons
    nav_count=0
    if [ -f "${REPO_ROOT}/public/index.html" ]; then
        nav_count=$(grep -o 'nav-btn' "${REPO_ROOT}/public/index.html" 2>/dev/null | wc -l | tr -d ' ')
        [ -z "$nav_count" ] && nav_count=0
    fi
    echo "    \"nav_buttons\": ${nav_count},"
    
    # Event listeners in main JS files
    listener_count=0
    if [ -d "${REPO_ROOT}/src" ]; then
        listener_count=$(find "${REPO_ROOT}/src" -name "*.js" -type f -exec grep -o 'addEventListener' {} \; 2>/dev/null | wc -l | tr -d ' ')
    fi
    if [ -d "${REPO_ROOT}/public/js" ]; then
        public_listeners=$(find "${REPO_ROOT}/public/js" -name "*.js" -type f -exec grep -o 'addEventListener' {} \; 2>/dev/null | wc -l | tr -d ' ')
        listener_count=$((listener_count + public_listeners))
    fi
    echo "    \"event_listeners\": ${listener_count},"
    
    # Function definitions in src/
    function_count=0
    if [ -d "${REPO_ROOT}/src" ]; then
        function_count=$(find "${REPO_ROOT}/src" -name "*.js" -type f -exec grep -E '^export (function|const|class)' {} \; 2>/dev/null | wc -l | tr -d ' ')
    fi
    [ -z "$function_count" ] && function_count=0
    echo "    \"exported_functions\": ${function_count},"
    
    # CSS rules count
    css_count=0
    if [ -f "${REPO_ROOT}/public/css/style.css" ]; then
        css_count=$(grep -o '{' "${REPO_ROOT}/public/css/style.css" 2>/dev/null | wc -l | tr -d ' ')
        [ -z "$css_count" ] && css_count=0
    fi
    echo "    \"css_rules\": ${css_count},"
    
    # Total JS files
    js_file_count=$(find "${REPO_ROOT}/src" -name "*.js" -type f 2>/dev/null | wc -l | tr -d ' ')
    [ -z "$js_file_count" ] && js_file_count=0
    echo "    \"js_files\": ${js_file_count},"
    
    # Total test files
    test_count=$(find "${REPO_ROOT}/tests" -name "*.test.js" -type f 2>/dev/null | wc -l | tr -d ' ')
    [ -z "$test_count" ] && test_count=0
    echo "    \"test_files\": ${test_count}"
    
    echo "  }"
    echo "}"
}

# Command parsing
case "${1:-snapshot}" in
    --baseline)
        echo "📸 Taking baseline snapshot..."
        count_markers > "${BASELINE_FILE}"
        echo "✅ Baseline saved to ${BASELINE_FILE}"
        cat "${BASELINE_FILE}"
        ;;
    
    --compare)
        if [ ! -f "${BASELINE_FILE}" ]; then
            echo "❌ No baseline found. Run with --baseline first."
            exit 1
        fi
        
        echo "📊 Comparing current state to baseline..."
        count_markers > "${CURRENT_FILE}"
        
        # Simple JSON comparison
        echo ""
        echo "BASELINE:"
        cat "${BASELINE_FILE}"
        echo ""
        echo "CURRENT:"
        cat "${CURRENT_FILE}"
        echo ""
        
        # Check for regressions (basic comparison)
        baseline_sections=$(grep '"html_sections"' "${BASELINE_FILE}" | grep -o '[0-9]\+')
        current_sections=$(grep '"html_sections"' "${CURRENT_FILE}" | grep -o '[0-9]\+')
        
        if [ "${current_sections}" -lt "${baseline_sections}" ]; then
            echo "⚠️  REGRESSION DETECTED: HTML sections decreased from ${baseline_sections} to ${current_sections}"
            exit 1
        fi
        
        baseline_nav=$(grep '"nav_buttons"' "${BASELINE_FILE}" | grep -o '[0-9]\+')
        current_nav=$(grep '"nav_buttons"' "${CURRENT_FILE}" | grep -o '[0-9]\+')
        
        if [ "${current_nav}" -lt "${baseline_nav}" ]; then
            echo "⚠️  REGRESSION DETECTED: Nav buttons decreased from ${baseline_nav} to ${current_nav}"
            exit 1
        fi
        
        echo "✅ No regressions detected"
        ;;
    
    --report)
        echo "📋 Guardian Report"
        echo "=================="
        if [ -f "${BASELINE_FILE}" ]; then
            echo "Baseline:"
            cat "${BASELINE_FILE}"
        fi
        if [ -f "${CURRENT_FILE}" ]; then
            echo ""
            echo "Current:"
            cat "${CURRENT_FILE}"
        fi
        ;;
    
    snapshot|*)
        echo "📸 Taking current snapshot..."
        count_markers
        ;;
esac
