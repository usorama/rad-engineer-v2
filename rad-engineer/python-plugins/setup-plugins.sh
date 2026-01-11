#!/usr/bin/env bash
# Auto-Claude Integration - Python Plugin Setup Script
# This script sets up Python plugins for rad-engineer-v2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== rad-engineer Python Plugin Setup ===${NC}"

# Detect script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR"

# Check Python version (requires 3.9+)
echo -e "\n${YELLOW}Checking Python version...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found. Please install Python 3.9 or later.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
REQUIRED_VERSION="3.9"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)"; then
    echo -e "${RED}Error: Python 3.9 or later required. Found: $PYTHON_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python $PYTHON_VERSION detected${NC}"

# Check for virtual environment
if [ -d "$PLUGIN_DIR/.venv" ]; then
    echo -e "\n${YELLOW}Virtual environment already exists. Reusing...${NC}"
else
    echo -e "\n${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv "$PLUGIN_DIR/.venv"
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
source "$PLUGIN_DIR/.venv/bin/activate"

# Upgrade pip
echo -e "\n${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip --quiet

# Install dependencies
echo -e "\n${YELLOW}Installing plugin dependencies...${NC}"
pip install -r "$PLUGIN_DIR/requirements.txt" --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Verify plugin files exist
echo -e "\n${YELLOW}Verifying plugin files...${NC}"

PLUGINS=(
    "qa_loop.py"
    "spec_generator.py"
    "ai_merge.py"
)

MISSING_PLUGINS=()
for plugin in "${PLUGINS[@]}"; do
    if [ -f "$PLUGIN_DIR/$plugin" ]; then
        echo -e "${GREEN}✓ $plugin${NC}"
    else
        echo -e "${RED}✗ $plugin (missing)${NC}"
        MISSING_PLUGINS+=("$plugin")
    fi
done

if [ ${#MISSING_PLUGINS[@]} -gt 0 ]; then
    echo -e "\n${RED}Error: Missing plugin files: ${MISSING_PLUGINS[*]}${NC}"
    exit 1
fi

# Make plugins executable
chmod +x "$PLUGIN_DIR"/*.py

# Test plugin execution
echo -e "\n${YELLOW}Testing plugin execution...${NC}"

# Test QA Loop
echo -n "Testing qa_loop.py... "
if python3 "$PLUGIN_DIR/qa_loop.py" <<< '{"project_dir": "/tmp", "task_id": "test"}' &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ (may require valid project directory)${NC}"
fi

# Test Spec Generator
echo -n "Testing spec_generator.py... "
if python3 "$PLUGIN_DIR/spec_generator.py" <<< '{"task_description": "test", "complexity": "simple"}' &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ (may require valid input)${NC}"
fi

# Test AI Merge
echo -n "Testing ai_merge.py... "
if python3 "$PLUGIN_DIR/ai_merge.py" <<< '{"file_path": "test.txt", "conflict": {"current": "a", "incoming": "b"}, "provider": "anthropic", "api_key": "test"}' &> /dev/null; then
    echo -e "${YELLOW}⚠ (requires valid API key)${NC}"
else
    echo -e "${YELLOW}⚠ (requires valid API key)${NC}"
fi

# Print usage instructions
echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "\nPython plugins are now installed and ready to use."
echo -e "\nTo activate the virtual environment manually:"
echo -e "  ${YELLOW}source $PLUGIN_DIR/.venv/bin/activate${NC}"
echo -e "\nTo test a plugin:"
echo -e "  ${YELLOW}python3 $PLUGIN_DIR/qa_loop.py < input.json${NC}"
echo -e "\nFor integration with rad-engineer:"
echo -e "  ${YELLOW}See: docs/auto-claude-integration/evidence/*-results.md${NC}"
echo -e "\n${GREEN}All done!${NC}"
