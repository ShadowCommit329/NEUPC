#!/bin/bash

# NEUPC Extension - Interactive Browser Testing Script
# This script helps you test the extension in Chrome and Firefox

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         NEUPC Extension - Browser Testing Helper              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Pre-flight checks
echo -e "${BLUE}Running pre-flight checks...${NC}"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found - install from https://nodejs.org"
    exit 1
fi

# Run validator
print_info "Running extension validator..."
node "$SCRIPT_DIR/validate.js"
VALIDATOR_EXIT=$?

if [ $VALIDATOR_EXIT -eq 0 ]; then
    print_status "Validation passed"
else
    print_warning "Validation had warnings (see above)"
fi

echo ""

# Run compatibility checker
print_info "Running browser compatibility checker..."
node "$SCRIPT_DIR/check-compatibility.js"
COMPAT_EXIT=$?

if [ $COMPAT_EXIT -eq 0 ]; then
    print_status "Compatibility check passed"
else
    print_error "Compatibility issues found (see above)"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Browser selection
echo "Which browser do you want to test?"
echo ""
echo "  1) Chrome/Chromium (manual installation)"
echo "  2) Firefox (manual installation)"
echo "  3) Firefox (using web-ext - auto reload)"
echo "  4) Both Chrome and Firefox"
echo "  5) Skip installation, just show test URLs"
echo ""
read -p "Enter choice [1-5]: " browser_choice

case $browser_choice in
    1)
        echo ""
        echo -e "${BLUE}═══ Chrome Installation Instructions ═══${NC}"
        echo ""
        echo "1. Open Chrome and navigate to:"
        echo -e "   ${GREEN}chrome://extensions/${NC}"
        echo ""
        echo "2. Enable 'Developer mode' (toggle in top-right)"
        echo ""
        echo "3. Click 'Load unpacked'"
        echo ""
        echo "4. Select this directory:"
        echo -e "   ${GREEN}$SCRIPT_DIR${NC}"
        echo ""
        echo "5. Verify extension appears with no errors"
        echo ""
        print_info "Press Enter when ready to continue..."
        read
        ;;
    
    2)
        echo ""
        echo -e "${BLUE}═══ Firefox Installation Instructions ═══${NC}"
        echo ""
        echo "1. Open Firefox and navigate to:"
        echo -e "   ${GREEN}about:debugging#/runtime/this-firefox${NC}"
        echo ""
        echo "2. Click 'Load Temporary Add-on...'"
        echo ""
        echo "3. Navigate to this directory and select:"
        echo -e "   ${GREEN}$SCRIPT_DIR/manifest.json${NC}"
        echo ""
        echo "4. Verify extension appears with no errors"
        echo ""
        echo -e "${YELLOW}Note: Extension will be removed when Firefox restarts${NC}"
        echo ""
        print_info "Press Enter when ready to continue..."
        read
        ;;
    
    3)
        echo ""
        echo -e "${BLUE}═══ Firefox with web-ext ═══${NC}"
        echo ""
        
        # Check if web-ext is installed
        if command -v web-ext &> /dev/null; then
            print_status "web-ext is installed"
            echo ""
            echo "Starting Firefox with extension..."
            echo ""
            cd "$SCRIPT_DIR"
            web-ext run --verbose
            exit 0
        else
            print_error "web-ext not found"
            echo ""
            echo "Install with:"
            echo -e "  ${GREEN}npm install -g web-ext${NC}"
            echo ""
            exit 1
        fi
        ;;
    
    4)
        echo ""
        echo -e "${BLUE}═══ Testing Both Browsers ═══${NC}"
        echo ""
        
        # Chrome
        echo -e "${YELLOW}Chrome:${NC}"
        echo "1. Open chrome://extensions/"
        echo "2. Enable Developer mode"
        echo "3. Load unpacked → $SCRIPT_DIR"
        echo ""
        
        # Firefox
        echo -e "${YELLOW}Firefox:${NC}"
        echo "1. Open about:debugging#/runtime/this-firefox"
        echo "2. Load Temporary Add-on → $SCRIPT_DIR/manifest.json"
        echo ""
        
        print_info "Press Enter when both browsers are ready..."
        read
        ;;
    
    5)
        # Skip to test URLs
        ;;
    
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Test URLs
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           Test URLs (Open in browser with extension)          ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✓ Easy Test (No Login Required):${NC}"
echo ""
echo "Codeforces (Best for testing):"
echo "  https://codeforces.com/contest/1/submission/1"
echo ""
echo "DMOJ:"
echo "  https://dmoj.ca/submissions/"
echo ""

echo -e "${YELLOW}⚠ Requires Login:${NC}"
echo ""
echo "AtCoder:"
echo "  https://atcoder.jp/contests/abc100/submissions/me"
echo ""
echo "LeetCode:"
echo "  https://leetcode.com/submissions/"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# What to check
echo -e "${GREEN}What to Check:${NC}"
echo ""
echo "1. Open DevTools (F12) → Console tab"
echo ""
echo "2. Look for logs starting with:"
echo -e "   ${GREEN}[NEUPC:platform]${NC}"
echo ""
echo "3. Expected logs:"
echo "   - Initializing extractor"
echo "   - Page type detected: submission"
echo "   - Extracted submission: {object}"
echo ""
echo "4. Expand the object to verify:"
echo "   - submissionId is present"
echo "   - problemId is extracted"
echo "   - verdict is normalized"
echo "   - language is detected"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Common issues
echo -e "${YELLOW}Common Issues:${NC}"
echo ""
echo "• No logs appear?"
echo "  → Extension might not be loaded"
echo "  → Check chrome://extensions or about:debugging"
echo "  → Try hard refresh (Ctrl+Shift+R)"
echo ""
echo "• 'Cannot use import statement'?"
echo "  → Should not happen (we use ES modules)"
echo "  → Report this as a bug"
echo ""
echo "• 'Failed to fetch'?"
echo "  → Expected (backend not running yet)"
echo "  → Extraction should still work"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Test report template
echo -e "${GREEN}After testing, please report results:${NC}"
echo ""
echo "Browser: Chrome/Firefox"
echo "Version: [Browser version]"
echo "Extension loads: ✓/✗"
echo "Console logs appear: ✓/✗"
echo "Extraction works: ✓/✗"
echo "Issues found: [describe any issues]"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Happy Testing! 🚀${NC}"
echo ""
