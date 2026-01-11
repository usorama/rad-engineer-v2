#!/usr/bin/env bash
# Test CI workflow locally before pushing
# Usage: ./test-ci-local.sh

set -e

echo "================================================"
echo "Testing CI Workflow Locally"
echo "================================================"
echo ""

# Navigate to project root
cd "$(dirname "$0")/../.."

echo "Step 1: Installing dependencies..."
bun install --frozen-lockfile
echo "✅ Dependencies installed"
echo ""

echo "Step 2: Running TypeScript type checking..."
bun run typecheck
echo "✅ Type checking passed"
echo ""

echo "Step 3: Running ESLint..."
bun run lint
echo "✅ Lint passed"
echo ""

echo "Step 4: Running tests with coverage..."
bun test --coverage
echo "✅ Tests passed"
echo ""

echo "================================================"
echo "Quality Gates Verification"
echo "================================================"
echo ""

echo "Verifying zero TypeScript errors..."
OUTPUT=$(bun run typecheck 2>&1)
if echo "$OUTPUT" | grep -q "error TS"; then
    echo "❌ TypeScript errors found:"
    echo "$OUTPUT"
    exit 1
fi
echo "✅ Zero TypeScript errors confirmed"
echo ""

echo "Verifying lint passes..."
bun run lint
echo "✅ ESLint passed"
echo ""

echo "Verifying all tests pass..."
bun test
echo "✅ All tests passed"
echo ""

echo "================================================"
echo "🎉 All CI checks passed! Ready to push."
echo "================================================"
