#!/bin/bash
# Comprehensive API Verification using HTTP endpoints
# No external dependencies required

set -e

PAGE_ID="463EC43F842D7F56CFB2F64341A5AE48"
DEVTOOLS_URL="http://localhost:9222"

echo "═══════════════════════════════════════════════════════════════"
echo "  rad-engineer API Verification Suite (HTTP Method)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Function to evaluate JavaScript and return result
eval_js() {
    local expression="$1"
    local description="$2"

    echo "📋 $description"

    # Create JSON payload
    local payload=$(cat <<EOF
{
  "id": 1,
  "method": "Runtime.evaluate",
  "params": {
    "expression": "$expression",
    "returnByValue": true,
    "awaitPromise": true
  }
}
EOF
)

    # Send to DevTools WebSocket endpoint (using HTTP fallback)
    # Note: This requires websocket connection, so we'll use a different approach

    echo "  → Expression: ${expression:0:60}..."
}

echo "Note: This script shows the test structure."
echo "For actual testing, please use Chrome DevTools Console with the commands from:"
echo "  manual-test-commands.md"
echo ""
echo "Alternative: Install ws module for automated testing:"
echo "  cd /Users/umasankr/Projects/rad-engineer-v2"
echo "  npm install ws"
echo "  node verify-apis.js"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Quick Manual Test Commands:"
echo ""
echo "1. Open Chrome DevTools on the running app"
echo "2. Go to Console tab"
echo "3. Run these commands:"
echo ""
echo "// Test Planning API"
echo "await window.electronAPI.planning.startIntake()"
echo ""
echo "// Test VAC API"
echo "await window.electronAPI.vac.getAllContracts()"
echo ""
echo "// Test Learning API"
echo "await window.electronAPI.learning.getDecisionHistory()"
echo ""
echo "Expected: All should return success: true with data"
echo ""
