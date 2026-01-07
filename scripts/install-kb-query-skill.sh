#!/bin/bash

################################################################################
# kb-query Skill Installation Script
#
# This script installs the kb-query skill from the VPS to either:
#   - Claude Code global root (~/.claude/skills/) - available to ALL projects
#   - A specific project (.claude/skills/) - available only to that project
#
# The skill is maintained on the VPS as the source of truth.
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS credentials
VPS_HOST="72.60.204.156"
VPS_USER="root"
VPS_SKILL_PATH="/root/Projects/skills/kb-query"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if VPS is accessible
check_vps_connection() {
    print_info "Checking VPS connection..."
    if ssh -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" "echo 'Connected'" >/dev/null 2>&1; then
        print_success "VPS is accessible"
        return 0
    else
        print_error "Cannot connect to VPS at ${VPS_HOST}"
        print_info "Please ensure:"
        echo "  - VPS is running"
        echo "  - SSH keys are configured"
        echo "  - Network connection is active"
        return 1
    fi
}

# Function to download skill from VPS
download_skill_from_vps() {
    local dest_dir="$1"

    print_info "Downloading kb-query skill from VPS..."

    # Create destination directory
    mkdir -p "$dest_dir"

    # Download skill files from VPS
    if scp -r "${VPS_USER}@${VPS_HOST}:${VPS_SKILL_PATH}/"* "$dest_dir/" 2>/dev/null; then
        print_success "Skill downloaded successfully to $dest_dir"
        return 0
    else
        print_error "Failed to download skill from VPS"
        return 1
    fi
}

# Function to install to Claude Code global root
install_to_global() {
    local global_skill_dir="$HOME/.claude/skills/kb-query"

    print_info "Installing to Claude Code global root..."
    echo "  Destination: $global_skill_dir"

    if download_skill_from_vps "$global_skill_dir"; then
        print_success "kb-query skill installed globally"
        echo ""
        print_info "The skill is now available in ALL projects"
        echo "  Invoke with: /kb-query \"your query\""
        return 0
    else
        return 1
    fi
}

# Function to install to specific project
install_to_project() {
    # Prompt for project path
    echo ""
    read -p "Enter project path (e.g., ~/Projects/my-project): " project_path

    # Expand tilde
    project_path="${project_path/#\~/$HOME}"

    # Validate project path
    if [ ! -d "$project_path" ]; then
        print_error "Directory does not exist: $project_path"
        return 1
    fi

    local project_skill_dir="$project_path/.claude/skills/kb-query"

    print_info "Installing to project..."
    echo "  Project: $project_path"
    echo "  Destination: $project_skill_dir"

    if download_skill_from_vps "$project_skill_dir"; then
        print_success "kb-query skill installed to project"
        echo ""
        print_warning "Skill is only available in this project"
        echo "  Invoke with: /kb-query \"your query\""
        echo "  Note: You must be in the project directory to use it"
        return 0
    else
        return 1
    fi
}

# Function to verify installation
verify_installation() {
    local skill_dir="$1"

    if [ -f "$skill_dir/SKILL.md" ]; then
        print_success "SKILL.md found"

        # Check YAML frontmatter
        if head -3 "$skill_dir/SKILL.md" | grep -q "name: kb-query"; then
            print_success "Skill frontmatter valid"
            return 0
        else
            print_warning "Skill frontmatter may be invalid"
            return 1
        fi
    else
        print_error "SKILL.md not found"
        return 1
    fi
}

# Main installation flow
main() {
    clear
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  kb-query Skill Installation${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check VPS connection
    if ! check_vps_connection; then
        exit 1
    fi

    echo ""
    print_info "Choose installation location:"
    echo "  1) Claude Code global root (~/.claude/skills/)"
    echo "     → Available to ALL projects"
    echo ""
    echo "  2) Specific project (.claude/skills/)"
    echo "     → Available only to that project"
    echo ""
    read -p "Enter choice [1-2]: " choice

    case $choice in
        1)
            echo ""
            install_to_global
            ;;
        2)
            echo ""
            install_to_project
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    if [ $? -eq 0 ]; then
        echo ""
        print_success "Installation complete!"
        echo ""
        print_info "To verify the skill is working, try:"
        echo "  /kb-query \"test query\""
        echo ""
    else
        echo ""
        print_error "Installation failed"
        exit 1
    fi
}

# Run main function
main "$@"
