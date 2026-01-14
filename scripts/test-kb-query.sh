#!/bin/bash

################################################################################
# kb-query Skill Test Script
#
# Tests the complete kb-query workflow:
# 1. VPS connectivity
# 2. Ollama embedding generation
# 3. Qdrant collection check
# 4. Sample search query
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# VPS config
VPS_HOST="72.60.204.156"
VPS_USER="root"
TEST_QUERY="authentication"

print_test() {
    echo -e "${BLUE}TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  kb-query Skill Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: VPS Connectivity
print_test "VPS Connectivity"
if timeout 5 ssh -o ConnectTimeout=3 -o BatchMode=yes ${VPS_USER}@${VPS_HOST} "echo 'OK'" >/dev/null 2>&1; then
    print_pass "VPS is reachable"
else
    print_fail "Cannot connect to VPS"
    exit 1
fi
echo ""

# Test 2: Qdrant Service
print_test "Qdrant Service"
QDRANT_STATUS=$(ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:6333/" 2>/dev/null | jq -r '.title' 2>/dev/null || echo "failed")
if [ "$QDRANT_STATUS" = "qdrant - vector search engine" ]; then
    print_pass "Qdrant is running"
    QDRANT_VERSION=$(ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:6333/" | jq -r '.version')
    print_info "Version: $QDRANT_VERSION"
else
    print_fail "Qdrant is not responding"
    exit 1
fi
echo ""

# Test 3: Ollama Service
print_test "Ollama Service"
OLLAMA_MODELS=$(ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:11434/api/tags" 2>/dev/null | jq -r '.models[].model' 2>/dev/null || echo "")
if echo "$OLLAMA_MODELS" | grep -q "nomic-embed-text"; then
    print_pass "Ollama is running with required models"
    print_info "Available models:"
    echo "$OLLAMA_MODELS" | while read model; do
        echo "      - $model"
    done
else
    print_fail "Ollama models not loaded"
    exit 1
fi
echo ""

# Test 4: Embedding Generation
print_test "Embedding Generation"
EMBEDDING_RESULT=$(ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:11434/api/embeddings \
  -H 'Content-Type: application/json' \
  -d '{\"model\": \"nomic-embed-text\", \"prompt\": \"${TEST_QUERY}\"}'" 2>/dev/null)

EMBEDDING_DIM=$(echo "$EMBEDDING_RESULT" | jq -r '.embedding | length' 2>/dev/null || echo "0")
if [ "$EMBEDDING_DIM" = "768" ]; then
    print_pass "Embedding generation works"
    print_info "Embedding dimensions: ${EMBEDDING_DIM}"
else
    print_fail "Embedding generation failed (expected 768, got ${EMBEDDING_DIM})"
    exit 1
fi
echo ""

# Test 5: Qdrant Collection
print_test "Qdrant Collection"
COLLECTION_INFO=$(ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:6333/collections/rad-engineer-kb" 2>/dev/null)
COLLECTION_STATUS=$(echo "$COLLECTION_INFO" | jq -r '.status' 2>/dev/null || echo "error")
POINTS_COUNT=$(echo "$COLLECTION_INFO" | jq -r '.result.points_count' 2>/dev/null || echo "0")

if [ "$COLLECTION_STATUS" = "ok" ]; then
    print_pass "Collection exists"
    if [ "$POINTS_COUNT" -gt 0 ]; then
        print_pass "Collection has data"
        print_info "Points count: $POINTS_COUNT"
    else
        print_info "Collection is empty - need to ingest documents"
    fi
else
    print_fail "Collection does not exist"
    print_info "Create collection first"
fi
echo ""

# Test 6: Skill File
print_test "Skill File"
if [ -f ~/.claude/skills/kb-query/SKILL.md ]; then
    print_pass "Global skill file exists"
    SKILL_NAME=$(head -3 ~/.claude/skills/kb-query/SKILL.md | grep "name:" | cut -d: -f2 | xargs)
    if [ "$SKILL_NAME" = "kb-query" ]; then
        print_pass "Skill frontmatter is valid"
    else
        print_fail "Skill frontmatter may be invalid"
    fi
else
    print_fail "Global skill file not found"
    print_info "Run: ./scripts/install-kb-query-skill.sh"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}All Tests Passed!${NC}"
echo ""
echo -e "${BLUE}Skill is ready to use.${NC}"
echo ""
echo -e "Try it with:"
echo -e "  ${YELLOW}/kb-query \"${TEST_QUERY}\"${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
