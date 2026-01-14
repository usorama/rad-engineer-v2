#!/usr/bin/env bash
# Local Deployment Validation Script for rad-engineer
# Validates all requirements for local development setup

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for issues
ISSUES=0
WARNINGS=0

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((ISSUES++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

print_header "Local Deployment Validation"
print_info "Project root: $PROJECT_ROOT"

# ============================================
# 1. Check Bun Installation
# ============================================
print_header "1. Checking Bun Installation"

if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed"
    print_info "Install: curl -fsSL https://bun.sh/install | bash"
else
    BUN_VERSION=$(bun --version)
    print_success "Bun is installed: v$BUN_VERSION"

    # Check version requirement (>= 1.0.0)
    REQUIRED_VERSION="1.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$BUN_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Bun version $BUN_VERSION is below required $REQUIRED_VERSION"
    else
        print_success "Bun version meets requirement (>= $REQUIRED_VERSION)"
    fi
fi

# ============================================
# 2. Check Dependencies
# ============================================
print_header "2. Checking Dependencies"

if [ ! -d "node_modules" ]; then
    print_error "node_modules not found. Run: bun install"
else
    print_success "node_modules directory exists"

    # Check key dependencies
    REQUIRED_DEPS=(
        "@anthropic-ai/sdk"
        "@opentelemetry/api"
        "js-yaml"
        "pino"
        "zod"
    )

    for dep in "${REQUIRED_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            print_success "Dependency found: $dep"
        else
            print_error "Missing dependency: $dep"
        fi
    done

    # Check dev dependencies
    DEV_DEPS=(
        "@types/bun"
        "@types/node"
        "typescript"
        "eslint"
    )

    for dep in "${DEV_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            print_success "Dev dependency found: $dep"
        else
            print_error "Missing dev dependency: $dep"
        fi
    done
fi

# ============================================
# 3. Check Source Files
# ============================================
print_header "3. Checking Source Files"

if [ ! -d "src" ]; then
    print_error "src directory not found"
else
    print_success "src directory exists"

    # Check key directories
    KEY_DIRS=(
        "src/sdk"
        "src/config"
        "src/observability"
        "src/security"
        "src/memory"
    )

    for dir in "${KEY_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_success "Directory found: $dir"
        else
            print_warning "Directory not found: $dir (may not be implemented yet)"
        fi
    done
fi

# ============================================
# 4. Check Configuration Files
# ============================================
print_header "4. Checking Configuration Files"

REQUIRED_CONFIG=(
    "package.json"
    "tsconfig.json"
    "eslint.config.js"
)

for file in "${REQUIRED_CONFIG[@]}"; do
    if [ -f "$file" ]; then
        print_success "Config file found: $file"
    else
        print_error "Missing config file: $file"
    fi
done

# Check for test setup
if [ -d "test" ]; then
    print_success "test directory exists"

    if [ -f "test/setup.ts" ]; then
        print_success "test/setup.ts found"
    else
        print_warning "test/setup.ts not found (tests may not run properly)"
    fi
else
    print_warning "test directory not found"
fi

# ============================================
# 5. Check Environment Configuration
# ============================================
print_header "5. Checking Environment Configuration"

if [ -f ".env" ]; then
    print_success ".env file found"

    # Check for critical environment variables
    if grep -q "ANTHROPIC_API_KEY" .env 2>/dev/null; then
        print_success "ANTHROPIC_API_KEY configured"
    else
        print_warning "ANTHROPIC_API_KEY not found in .env"
    fi
else
    print_warning ".env file not found (optional for local dev)"
fi

if [ -f ".env.template" ] || [ -f ".env.example" ]; then
    print_success "Environment template file found"
else
    print_info "No .env template file (not required)"
fi

# ============================================
# 6. Run TypeScript Type Check
# ============================================
print_header "6. Running TypeScript Type Check"

if [ -f "tsconfig.json" ]; then
    print_info "Running: bun run typecheck"

    if bun run typecheck 2>&1 | tee /tmp/typecheck-output.txt; then
        # Check if output contains errors
        if grep -q "error TS" /tmp/typecheck-output.txt; then
            ERROR_COUNT=$(grep -c "error TS" /tmp/typecheck-output.txt)
            print_error "TypeScript errors found: $ERROR_COUNT errors"
            print_info "Run 'bun run typecheck' for details"
        else
            print_success "TypeScript check passed: 0 errors"
        fi
    else
        print_error "TypeScript check failed"
    fi

    rm -f /tmp/typecheck-output.txt
else
    print_error "tsconfig.json not found, cannot run typecheck"
fi

# ============================================
# 7. Run Linter
# ============================================
print_header "7. Running Linter"

if [ -f "eslint.config.js" ] || [ -f ".eslintrc.js" ]; then
    print_info "Running: bun run lint"

    if bun run lint 2>&1 | tee /tmp/lint-output.txt; then
        print_success "Linter check passed"
    else
        # Check error count
        if grep -q "error" /tmp/lint-output.txt; then
            ERROR_COUNT=$(grep -c "error" /tmp/lint-output.txt || echo "0")
            print_warning "Linter found $ERROR_COUNT issues (may be fixable)"
            print_info "Run 'bun run lint' for details"
        else
            print_success "Linter check passed with warnings only"
        fi
    fi

    rm -f /tmp/lint-output.txt
else
    print_warning "ESLint config not found, skipping lint check"
fi

# ============================================
# 8. Run Tests
# ============================================
print_header "8. Running Tests"

if [ -d "test" ] || [ -d "src" ]; then
    print_info "Running: bun test"

    if bun test 2>&1 | tee /tmp/test-output.txt; then
        # Parse test results
        if grep -q "pass" /tmp/test-output.txt; then
            PASS_COUNT=$(grep -o "[0-9]* pass" /tmp/test-output.txt | head -1 | awk '{print $1}')
            print_success "All tests passed: $PASS_COUNT tests"
        else
            print_success "Tests executed successfully"
        fi
    else
        if grep -q "fail" /tmp/test-output.txt; then
            FAIL_COUNT=$(grep -o "[0-9]* fail" /tmp/test-output.txt | head -1 | awk '{print $1}')
            print_error "Tests failed: $FAIL_COUNT failures"
            print_info "Run 'bun test' for details"
        else
            print_warning "No tests found or tests could not run"
        fi
    fi

    rm -f /tmp/test-output.txt
else
    print_warning "No test directory found"
fi

# ============================================
# 9. Check CLI Accessibility
# ============================================
print_header "9. Checking CLI Accessibility"

if [ -d "src/cli" ]; then
    print_success "CLI directory found: src/cli"

    # Check for CLI entry points
    CLI_FILES=($(find src/cli -name "*.ts" -type f))

    if [ ${#CLI_FILES[@]} -gt 0 ]; then
        print_success "Found ${#CLI_FILES[@]} CLI files"

        for file in "${CLI_FILES[@]}"; do
            print_info "  - $file"
        done
    else
        print_warning "No CLI files found in src/cli"
    fi
else
    print_warning "CLI directory not found (may not be implemented yet)"
fi

# Check package.json for bin entries
if [ -f "package.json" ]; then
    if grep -q '"bin"' package.json; then
        print_success "CLI command defined in package.json"
    else
        print_info "No bin entry in package.json (CLI may be run via bun run)"
    fi
fi

# ============================================
# 10. Summary
# ============================================
print_header "Validation Summary"

if [ $ISSUES -eq 0 ]; then
    print_success "All critical checks passed!"

    if [ $WARNINGS -gt 0 ]; then
        print_warning "Found $WARNINGS warnings (non-critical)"
    fi

    echo ""
    print_header "Next Steps"
    echo "1. Start development:"
    echo "   bun run dev"
    echo ""
    echo "2. Run tests:"
    echo "   bun test"
    echo ""
    echo "3. Run CLI (if available):"
    echo "   bun run src/cli/index.ts --help"
    echo ""
    echo "4. Build for production:"
    echo "   bun run build"
    echo ""

    exit 0
else
    print_error "Found $ISSUES critical issues"

    if [ $WARNINGS -gt 0 ]; then
        print_warning "Found $WARNINGS warnings"
    fi

    echo ""
    print_header "Required Actions"

    if ! command -v bun &> /dev/null; then
        echo "1. Install Bun:"
        echo "   curl -fsSL https://bun.sh/install | bash"
        echo ""
    fi

    if [ ! -d "node_modules" ]; then
        echo "2. Install dependencies:"
        echo "   bun install"
        echo ""
    fi

    if [ -f "tsconfig.json" ]; then
        echo "3. Fix TypeScript errors:"
        echo "   bun run typecheck"
        echo ""
    fi

    if [ -d "test" ]; then
        echo "4. Fix failing tests:"
        echo "   bun test"
        echo ""
    fi

    exit 1
fi
