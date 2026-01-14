# RAD Engineer - Installation Guide

## Quick Installation

### One-Command Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/usorama/rad-engineer-v2/main/install.sh | bash
```

This will:
1. Check prerequisites (git, bun/node)
2. Clone the repository
3. Install dependencies
4. Run quality checks
5. Create global `rad` command
6. Set up configuration directory

## Manual Installation

### Prerequisites

- **Git**: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- **Bun** (recommended): [https://bun.sh](https://bun.sh)
  - Or **Node.js** (alternative): [https://nodejs.org](https://nodejs.org)

### Steps

1. Clone the repository:
```bash
git clone https://github.com/usorama/rad-engineer-v2.git
cd rad-engineer-v2/rad-engineer
```

2. Install dependencies:
```bash
bun install  # or: npm install
```

3. Run quality checks:
```bash
bun run typecheck
bun test
```

4. Create configuration directory:
```bash
mkdir -p ~/.config/rad-engineer
cp install.sh ~/.config/rad-engineer/
```

5. Create global command (optional):
```bash
# Add to your ~/.bashrc or ~/.zshrc:
alias rad='bun run /path/to/rad-engineer/src/cli/evals.ts'
```

## Configuration

### Environment Variables

Set up your API keys:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or ~/.profile
export ANTHROPIC_API_KEY='your-anthropic-key-here'
export OPENAI_API_KEY='your-openai-key-here'
```

### Provider Configuration

Edit your provider configuration:

```bash
# User defaults (applies to all projects)
~/.config/rad-engineer/providers.yaml

# Project override (takes precedence)
.rad-engineer/providers.yaml
```

Example configuration:

```yaml
version: "1.0"

providers:
  anthropic:
    providerType: "anthropic"
    apiKey: "${ANTHROPIC_API_KEY}"
    model: "claude-3-5-sonnet-20241022"
    maxTokens: 4096
    temperature: 0.7

  openai:
    providerType: "openai"
    apiKey: "${OPENAI_API_KEY}"
    baseUrl: "https://api.openai.com/v1"
    model: "gpt-4-turbo-preview"
    maxTokens: 4096
    temperature: 0.7

defaults:
  provider: "anthropic"
```

## Verify Installation

Test your installation:

```bash
rad stats                    # Show performance statistics
rad --help                   # Show help
rad diagnose                 # Run diagnostics
```

## Uninstallation

### Using Installer Script

```bash
curl -fsSL https://raw.githubusercontent.com/usorama/rad-engineer-v2/main/install.sh | bash -s -- --uninstall
```

Or if you have the installer locally:

```bash
./install.sh --uninstall
```

### Manual Uninstallation

```bash
# Remove installation
rm -rf ~/.rad-engineer

# Remove global command
sudo rm /usr/local/bin/rad

# Remove configuration (optional)
rm -rf ~/.config/rad-engineer
```

## Advanced Installation Options

### Development Mode

Install from a local repository (for development):

```bash
cd /path/to/rad-engineer-v2
./install.sh --dev
```

### Custom Installation Directory

```bash
RAD_HOME=/custom/path ./install.sh
```

### Install Specific Branch

```bash
RAD_BRANCH=develop ./install.sh
```

### Skip Dependency Checks

```bash
./install.sh --skip-deps
```

## Troubleshooting

### Command Not Found: `rad`

Make sure `/usr/local/bin` is in your PATH:

```bash
echo $PATH
```

If not, add to your shell profile:

```bash
export PATH="/usr/local/bin:$PATH"
```

### Permission Denied

The installer needs sudo access to create the global command. If you don't have sudo access:

1. Use manual installation
2. Create an alias instead:
   ```bash
   alias rad='bun run ~/.rad-engineer/rad-engineer/src/cli/evals.ts'
   ```

### Bun Not Found

Install bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

Or use Node.js as an alternative:

```bash
# The installer will automatically detect and use node if bun is not available
```

### API Key Issues

Verify your environment variables are set:

```bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

If not set, add them to your shell profile and reload:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### Installation Fails

1. Check prerequisites:
   ```bash
   git --version
   bun --version  # or: node --version
   ```

2. Run with verbose output:
   ```bash
   bash -x install.sh
   ```

3. Check the installation log:
   ```bash
   cat ~/.rad-engineer/install.log
   ```

## System Requirements

### Supported Platforms

- **macOS**: 10.15+ (Catalina or later)
  - x64 (Intel)
  - arm64 (Apple Silicon)
- **Linux**: Most distributions
  - x64
  - arm64

### Hardware Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 500MB for installation
- **CPU**: Any modern processor (x64 or arm64)

### Software Requirements

- **Git**: 2.0+
- **Bun**: 1.0+ (recommended)
  - Or **Node.js**: 18+ (alternative)

## Getting Started

After installation, try these commands:

```bash
# Show performance statistics
rad stats

# Compare two providers
rad compare anthropic claude-3-5-sonnet-20241022 openai gpt-4-turbo-preview

# Test routing for a query
rad route "Write a function to calculate fibonacci"

# Export metrics
rad export --format json ./metrics.json

# Run diagnostics
rad diagnose
```

## Documentation

- **Project Documentation**: [docs/](../docs/)
- **Platform Foundation**: [docs/platform-foundation/](../docs/platform-foundation/)
- **Configuration**: [docs/config/](../docs/config/)
- **API Reference**: [src/README.md](../src/README.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/usorama/rad-engineer-v2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/usorama/rad-engineer-v2/discussions)

## License

See [LICENSE](../LICENSE) for details.
