# RAD Engineer - Quick Start Guide

## Installation (1 Command)

```bash
curl -fsSL https://raw.githubusercontent.com/usorama/rad-engineer-v2/main/install.sh | bash
```

## Setup API Keys

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export ANTHROPIC_API_KEY='your-key-here'
export OPENAI_API_KEY='your-key-here'

# Reload your shell
source ~/.bashrc  # or: source ~/.zshrc
```

## Verify Installation

```bash
rad --help
```

## First Commands

```bash
# Show performance statistics
rad stats

# Compare two providers
rad compare anthropic claude-3-5-sonnet-20241022 openai gpt-4-turbo-preview

# Test query routing
rad route "Write a function to calculate fibonacci"

# Run diagnostics
rad diagnose
```

## Configuration

### User Defaults (All Projects)

Edit: `~/.config/rad-engineer/providers.yaml`

```yaml
version: "1.0"

providers:
  anthropic:
    providerType: "anthropic"
    apiKey: "${ANTHROPIC_API_KEY}"
    model: "claude-3-5-sonnet-20241022"
    maxTokens: 4096
    temperature: 0.7

defaults:
  provider: "anthropic"
```

### Project Override (Current Project Only)

Create: `.rad-engineer/providers.yaml`

This file takes precedence over user defaults.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/usorama/rad-engineer-v2/main/install.sh | bash -s -- --uninstall
```

## Advanced

### Development Mode

Install from local repository:

```bash
git clone https://github.com/usorama/rad-engineer-v2.git
cd rad-engineer-v2
./install.sh --dev
```

### Custom Installation Directory

```bash
RAD_HOME=/custom/path ./install.sh
```

### Specific Branch

```bash
RAD_BRANCH=develop ./install.sh
```

## Troubleshooting

### Command not found: `rad`

Add to PATH:

```bash
export PATH="/usr/local/bin:$PATH"
```

### Permission denied

Use manual installation with alias:

```bash
alias rad='bun run ~/.rad-engineer/rad-engineer/src/cli/evals.ts'
```

### API key not working

Verify environment variables:

```bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

## Documentation

- **Installation Guide**: [INSTALL.md](INSTALL.md)
- **Platform Foundation**: [docs/platform-foundation/](docs/platform-foundation/)
- **Configuration**: [docs/config/](docs/config/)

## Support

- **Issues**: [GitHub Issues](https://github.com/usorama/rad-engineer-v2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/usorama/rad-engineer-v2/discussions)
