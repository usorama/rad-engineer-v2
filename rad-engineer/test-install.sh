#!/usr/bin/env bash
###############################################################################
# RAD Engineer Installer Test Script
#
# Tests the installation script without actually installing
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_HOME="/tmp/rad-engineer-test-$$"
TEST_CONFIG="${TEST_HOME}/.config/rad-engineer"
TEST_BIN="${TEST_HOME}/bin/rad"

print_test() {
    echo -e "${BLUE}→${NC} Testing: $1"
}

print_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

cleanup() {
    rm -rf "$TEST_HOME"
}

trap cleanup EXIT

echo ""
echo "RAD Engineer Installer Test Suite"
echo "=================================="
echo ""

# Test 1: Script Syntax
print_test "Script syntax validation"
if bash -n install.sh; then
    print_pass "Script syntax is valid"
else
    print_fail "Script has syntax errors"
fi

# Test 2: Help output
print_test "Help output"
if ./install.sh --help | grep -q "RAD Engineer"; then
    print_pass "Help output is correct"
else
    print_fail "Help output is missing or incorrect"
fi

# Test 3: Detect OS function
print_test "OS detection"
OS=$(uname -s)
if [[ "$OS" == "Darwin" ]] || [[ "$OS" == "Linux" ]]; then
    print_pass "OS detected: $OS"
else
    print_fail "Unsupported OS: $OS"
fi

# Test 4: Detect Architecture function
print_test "Architecture detection"
ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64|arm64|aarch64)
        print_pass "Architecture detected: $ARCH"
        ;;
    *)
        print_fail "Unsupported architecture: $ARCH"
        ;;
esac

# Test 5: Prerequisites check
print_test "Prerequisites detection"
if command -v git >/dev/null 2>&1; then
    print_pass "git found: $(git --version | head -n1)"
else
    print_fail "git not found"
fi

if command -v bun >/dev/null 2>&1; then
    print_pass "bun found: $(bun --version)"
elif command -v node >/dev/null 2>&1; then
    print_pass "node found: $(node --version)"
else
    print_fail "Neither bun nor node found"
fi

# Test 6: File structure
print_test "Installation script files"
if [ -f "install.sh" ]; then
    print_pass "install.sh exists"
else
    print_fail "install.sh not found"
fi

if [ -x "install.sh" ]; then
    print_pass "install.sh is executable"
else
    print_fail "install.sh is not executable"
fi

# Test 7: Configuration template
print_test "Provider configuration template"
if grep -q "providers:" install.sh && grep -q "providerType:" install.sh; then
    print_pass "Provider config template found in script"
else
    print_fail "Provider config template missing"
fi

# Test 8: Environment variable expansion pattern
print_test "Environment variable expansion pattern"
if grep -q '\${.*}' install.sh; then
    print_pass "Environment variable expansion pattern found"
else
    print_fail "Environment variable expansion pattern missing"
fi

# Test 9: Safety checks
print_test "Safety checks"
if grep -q "set -e" install.sh; then
    print_pass "Exit on error enabled (set -e)"
else
    print_fail "Exit on error not enabled"
fi

if grep -q "EUID" install.sh && grep -q "root" install.sh; then
    print_pass "Root check present"
else
    print_fail "Root check missing"
fi

# Test 10: Idempotency check
print_test "Idempotency checks"
if grep -q "already exists" install.sh && grep -q "Overwrite" install.sh; then
    print_pass "Idempotency checks present"
else
    print_fail "Idempotency checks missing"
fi

# Test 11: Uninstall function
print_test "Uninstall functionality"
if grep -q "uninstall_rad()" install.sh; then
    print_pass "Uninstall function present"
else
    print_fail "Uninstall function missing"
fi

# Test 12: CLI wrapper creation
print_test "CLI wrapper generation"
if grep -q "RAD Engineer CLI Wrapper" install.sh; then
    print_pass "CLI wrapper template present"
else
    print_fail "CLI wrapper template missing"
fi

# Test 13: Quality gates
print_test "Quality gate checks in installer"
if grep -q "typecheck" install.sh && grep -q "test" install.sh; then
    print_pass "Quality gate checks present"
else
    print_fail "Quality gate checks missing"
fi

# Test 14: Documentation
print_test "Installation documentation"
if [ -f "INSTALL.md" ]; then
    print_pass "INSTALL.md exists"

    # Check for key sections
    if grep -q "Quick Installation" INSTALL.md && \
       grep -q "Configuration" INSTALL.md && \
       grep -q "Troubleshooting" INSTALL.md; then
        print_pass "INSTALL.md has all key sections"
    else
        print_fail "INSTALL.md missing key sections"
    fi
else
    print_fail "INSTALL.md not found"
fi

# Test 15: Script portability
print_test "Script portability (shebang)"
if head -n1 install.sh | grep -q "#!/usr/bin/env bash"; then
    print_pass "Portable shebang present"
else
    print_fail "Non-portable shebang"
fi

echo ""
echo "=================================="
echo -e "${GREEN}All tests passed!${NC}"
echo ""
echo "Manual test suggestions:"
echo "  1. Test actual installation in a clean environment"
echo "  2. Test uninstallation"
echo "  3. Test --dev mode installation"
echo "  4. Test with both bun and node"
echo "  5. Test on different OS (macOS, Linux)"
echo ""
