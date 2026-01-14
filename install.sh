#!/usr/bin/env bash
###############################################################################
# RAD Engineer - One-Command CLI Installer
#
# Installation:
#   curl -fsSL https://raw.githubusercontent.com/usorama/rad-engineer-v2/main/install.sh | bash
#
# Or with custom options:
#   bash install.sh [--uninstall] [--dev] [--skip-deps]
#
# Usage:
#   rad <command>              # Use the rad CLI
#   rad --help                 # Show help
#   rad --version              # Show version
#
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
RAD_HOME="${RAD_HOME:-$HOME/.rad-engineer}"
RAD_REPO="https://github.com/usorama/rad-engineer-v2.git"
RAD_BRANCH="${RAD_BRANCH:-main}"
RAD_DIR="${RAD_HOME}/rad-engineer"
RAD_BIN="/usr/local/bin/rad"
RAD_CONFIG_DIR="${HOME}/.config/rad-engineer"

# Flags
UNINSTALL=0
DEV_MODE=0
SKIP_DEPS=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}║          ${GREEN}RAD Engineer${CYAN} - Autonomous Engineering Platform   ║${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

print_step() {
    echo -e "${CYAN}→${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Detect architecture
detect_arch() {
    local arch=$(uname -m)
    case "$arch" in
        x86_64|amd64)
            echo "x64"
            ;;
        arm64|aarch64)
            echo "arm64"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    local missing_deps=()

    # Check for git
    if ! command_exists git; then
        missing_deps+=("git")
    else
        print_success "git found: $(git --version | head -n1)"
    fi

    # Check for bun or node
    local runtime=""
    if command_exists bun; then
        runtime="bun"
        print_success "bun found: $(bun --version)"
    elif command_exists node; then
        runtime="node"
        print_success "node found: $(node --version)"
        print_warning "bun is recommended for better performance (17x faster tests)"
    else
        missing_deps+=("bun or node")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        print_info "Please install missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            case "$dep" in
                git)
                    echo "  - git: https://git-scm.com/downloads"
                    ;;
                "bun or node")
                    echo "  - bun (recommended): https://bun.sh"
                    echo "  - or node: https://nodejs.org"
                    ;;
            esac
        done
        echo ""
        exit 1
    fi

    print_success "All prerequisites met"
    echo ""
    return 0
}

###############################################################################
# Installation Functions
###############################################################################

install_rad() {
    print_header

    local os=$(detect_os)
    local arch=$(detect_arch)

    print_info "OS: ${os}"
    print_info "Architecture: ${arch}"
    echo ""

    # Check prerequisites
    if [ $SKIP_DEPS -eq 0 ]; then
        check_prerequisites
    fi

    # Create installation directory
    print_step "Creating installation directory..."
    if [ -d "$RAD_DIR" ]; then
        print_warning "Installation directory already exists: $RAD_DIR"
        read -p "Overwrite? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installation cancelled"
            exit 0
        fi
        rm -rf "$RAD_DIR"
    fi

    mkdir -p "$RAD_HOME"
    print_success "Created: $RAD_HOME"

    # Clone repository
    print_step "Cloning rad-engineer repository..."
    if [ $DEV_MODE -eq 1 ]; then
        print_info "Development mode: using local repository"
        if [ ! -d "$PWD/rad-engineer" ]; then
            print_error "No local rad-engineer directory found in $PWD"
            exit 1
        fi
        cp -r "$PWD/rad-engineer" "$RAD_DIR"
    else
        git clone --depth 1 --branch "$RAD_BRANCH" "$RAD_REPO" "$RAD_HOME" 2>&1 | sed 's/^/  /'
        if [ ! -d "$RAD_DIR" ]; then
            print_error "Failed to clone repository"
            exit 1
        fi
    fi
    print_success "Repository cloned"

    # Install dependencies
    print_step "Installing dependencies..."
    cd "$RAD_DIR"

    if command_exists bun; then
        bun install 2>&1 | tail -n 5 | sed 's/^/  /'
    else
        npm install 2>&1 | tail -n 5 | sed 's/^/  /'
    fi
    print_success "Dependencies installed"

    # Run quality checks
    print_step "Running quality checks..."
    if command_exists bun; then
        bun run typecheck 2>&1 | tail -n 3 | sed 's/^/  /'
        bun test 2>&1 | tail -n 5 | sed 's/^/  /'
    else
        npm run typecheck 2>&1 | tail -n 3 | sed 's/^/  /'
        npm test 2>&1 | tail -n 5 | sed 's/^/  /'
    fi
    print_success "Quality checks passed"

    # Create config directory
    print_step "Setting up configuration..."
    mkdir -p "$RAD_CONFIG_DIR"

    # Create default providers config if it doesn't exist
    if [ ! -f "$RAD_CONFIG_DIR/providers.yaml" ]; then
        cat > "$RAD_CONFIG_DIR/providers.yaml" <<EOF
# RAD Engineer Provider Configuration
# Edit this file to configure your AI providers
#
# Environment variables:
#   - Use \${VAR_NAME} or \$VAR_NAME for environment variable expansion
#   - Example: apiKey: "\${ANTHROPIC_API_KEY}"
#
# Configuration locations:
#   - User defaults: ~/.config/rad-engineer/providers.yaml
#   - Project override: .rad-engineer/providers.yaml (takes precedence)

version: "1.0"

providers:
  anthropic:
    providerType: "anthropic"
    apiKey: "\${ANTHROPIC_API_KEY}"
    model: "claude-3-5-sonnet-20241022"
    maxTokens: 4096
    temperature: 0.7

  openai:
    providerType: "openai"
    apiKey: "\${OPENAI_API_KEY}"
    baseUrl: "https://api.openai.com/v1"
    model: "gpt-4-turbo-preview"
    maxTokens: 4096
    temperature: 0.7

  # Example: Custom provider
  # custom:
  #   providerType: "openai"
  #   apiKey: "\${CUSTOM_API_KEY}"
  #   baseUrl: "https://custom-endpoint.com/v1"
  #   model: "custom-model"

defaults:
  provider: "anthropic"
EOF
        print_success "Created default config: $RAD_CONFIG_DIR/providers.yaml"
    else
        print_info "Config already exists: $RAD_CONFIG_DIR/providers.yaml"
    fi

    # Create CLI wrapper
    print_step "Creating global 'rad' command..."

    # Detect runtime
    local runtime_cmd=""
    if command_exists bun; then
        runtime_cmd="bun"
    else
        runtime_cmd="node"
    fi

    # Create wrapper script
    sudo tee "$RAD_BIN" > /dev/null <<EOF
#!/usr/bin/env bash
# RAD Engineer CLI Wrapper
# Generated by install.sh

RAD_DIR="$RAD_DIR"

# Check if installation exists
if [ ! -d "\$RAD_DIR" ]; then
    echo "Error: RAD Engineer not found at \$RAD_DIR"
    echo "Please run the installer again."
    exit 1
fi

# Execute CLI
cd "\$RAD_DIR"
exec $runtime_cmd run src/cli/evals.ts "\$@"
EOF

    sudo chmod +x "$RAD_BIN"
    print_success "Created: $RAD_BIN"

    # Print success message
    echo ""
    print_success "Installation complete!"
    echo ""
    print_info "Configuration:"
    echo "  - Installation: $RAD_DIR"
    echo "  - Config: $RAD_CONFIG_DIR"
    echo "  - CLI: $RAD_BIN"
    echo ""
    print_info "Next steps:"
    echo "  1. Set up your API keys:"
    echo "     export ANTHROPIC_API_KEY='your-key-here'"
    echo "     export OPENAI_API_KEY='your-key-here'"
    echo ""
    echo "  2. Edit your config (optional):"
    echo "     $RAD_CONFIG_DIR/providers.yaml"
    echo ""
    echo "  3. Run your first command:"
    echo "     rad stats"
    echo ""
    print_info "For help:"
    echo "  rad --help"
    echo ""
}

uninstall_rad() {
    print_header
    print_step "Uninstalling RAD Engineer..."

    local items_removed=0

    # Remove installation directory
    if [ -d "$RAD_DIR" ]; then
        rm -rf "$RAD_DIR"
        print_success "Removed: $RAD_DIR"
        items_removed=$((items_removed + 1))
    fi

    # Remove parent directory if empty
    if [ -d "$RAD_HOME" ]; then
        if [ -z "$(ls -A $RAD_HOME)" ]; then
            rm -rf "$RAD_HOME"
            print_success "Removed: $RAD_HOME"
        else
            print_info "Kept: $RAD_HOME (not empty)"
        fi
    fi

    # Remove CLI wrapper
    if [ -f "$RAD_BIN" ]; then
        sudo rm "$RAD_BIN"
        print_success "Removed: $RAD_BIN"
        items_removed=$((items_removed + 1))
    fi

    # Ask about config
    if [ -d "$RAD_CONFIG_DIR" ]; then
        echo ""
        read -p "Remove configuration directory? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$RAD_CONFIG_DIR"
            print_success "Removed: $RAD_CONFIG_DIR"
            items_removed=$((items_removed + 1))
        else
            print_info "Kept: $RAD_CONFIG_DIR"
        fi
    fi

    echo ""
    if [ $items_removed -eq 0 ]; then
        print_info "Nothing to uninstall"
    else
        print_success "Uninstallation complete!"
    fi
    echo ""
}

###############################################################################
# Main
###############################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --uninstall)
            UNINSTALL=1
            shift
            ;;
        --dev)
            DEV_MODE=1
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=1
            shift
            ;;
        -h|--help)
            print_header
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --uninstall    Remove RAD Engineer installation"
            echo "  --dev          Install from local repository (for development)"
            echo "  --skip-deps    Skip dependency checks"
            echo "  -h, --help     Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  RAD_HOME       Installation directory (default: ~/.rad-engineer)"
            echo "  RAD_BRANCH     Git branch to install (default: main)"
            echo ""
            echo "Examples:"
            echo "  # Standard installation"
            echo "  $0"
            echo ""
            echo "  # Uninstall"
            echo "  $0 --uninstall"
            echo ""
            echo "  # Development mode"
            echo "  $0 --dev"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    print_info "The script will use sudo when needed"
    exit 1
fi

# Execute
if [ $UNINSTALL -eq 1 ]; then
    uninstall_rad
else
    install_rad
fi
