#!/bin/bash

################################################################################
# Ingest Claude Code Documentation into Knowledge Base
#
# This script fetches docs from docs.anthropic.com and ingests them via KB API
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# VPS config
VPS_HOST="72.60.204.156"
VPS_USER="root"
COLLECTION="claude-code-docs"

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're on VPS or local
if [ -z "$SSH_CONNECTION" ]; then
    # Running locally - need to use SSH
    if command -v sshpass &> /dev/null; then
        VPS_PASSWORD=$(grep -A1 "Password:" ~/Projects/.creds/hostinger_vps.txt 2>/dev/null | tail -1 | xargs)
        SSH_CMD="sshpass -p '$VPS_PASSWORD' ssh ${VPS_USER}@${VPS_HOST}"
        SCP_CMD="sshpass -p '$VPS_PASSWORD' scp"
    else
        print_error "sshpass not installed. Install with: brew install hudochenkov/sshpass/sshpass"
        exit 1
    fi
else
    # Running on VPS
    SSH_CMD="bash -c"
    SCP_CMD="cp"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Claude Code Documentation Ingestion${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Documentation URLs to ingest
print_info "Documents to ingest:"

DOCS=(
    "prompt-iteration|https://docs.anthropic.com/en/docs/build-with-claude/prompt-iteration"
    "iteration|https://docs.anthropic.com/en/docs/build-with-claude/iteration"
    "tool-use|https://docs.anthropic.com/en/docs/build-with-claude/tool-use"
    "tool-use-examples|https://docs.anthropic.com/en/docs/build-with-claude/tool-use-examples"
    "skills|https://docs.anthropic.com/en/docs/build-with-claude/skills"
    "evals|https://docs.anthropic.com/en/docs/build-with-claude/evals"
    "monitoring|https://docs.anthropic.com/en/docs/build-with-claude/monitoring"
)

for doc in "${DOCS[@]}"; do
    IFS='|' read -r name url <<< "$doc"
    echo "  - $name: $url"
done

echo ""

# Ask for confirmation
read -p "Continue with ingestion? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cancelled"
    exit 0
fi

# Function to fetch and ingest a document
ingest_document() {
    local name="$1"
    local url="$2"

    print_info "Fetching: $name"

    # Fetch content using curl and basic markdown extraction
    CONTENT=$(curl -sL "$url" | \
        grep -oP '(?<=<main[^>]*>).*?(?=</main>)' | \
        sed -E 's/<script[^>]*>.*?<\/script>//g' | \
        sed -E 's/<[^>]+>//g' | \
        tr -s '\n' ' ' | \
        head -c 10000)

    if [ -z "$CONTENT" ]; then
        print_error "Failed to fetch $name"
        return 1
    fi

    # Create document JSON
    DOC_JSON=$(cat <<EOF
{
  "source": {
    "repo": "anthropic/docs",
    "path": "$url",
    "language": "markdown"
  },
  "content": "$name\n\n$CONTENT",
  "metadata": {
    "title": "$name",
    "url": "$url",
    "source": "docs.anthropic.com",
    "category": "claude-code",
    "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
)

    # Send to KB ingest API (this would need the KB API endpoint)
    # For now, just save to a file for manual ingestion
    echo "$DOC_JSON" > "/tmp/kb_ingest_${name}.json"
    print_success "Saved $name"

    return 0
}

# Ingest all documents
SUCCESS=0
FAILED=0

for doc in "${DOCS[@]}"; do
    IFS='|' read -r name url <<< "$doc"

    if ingest_document "$name" "$url"; then
        ((SUCCESS++))
    else
        ((FAILED++))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_success "Ingestion preparation complete"
echo ""
echo "  Saved: $SUCCESS documents"
echo "  Failed: $FAILED documents"
echo ""
print_info "Documents saved to /tmp/kb_ingest_*.json"
print_info "Run KB ingest script to process these files"
echo ""
