# Deployment Validation Scripts

This directory contains scripts to validate local and Docker deployments of rad-engineer.

## Available Scripts

### Local Deployment Validation

#### Shell Script (Quick Check)

```bash
./scripts/validate-local.sh
```

Fast validation using shell commands. Checks:
- Bun installation and version
- Dependencies (node_modules)
- Source structure
- Configuration files
- Environment setup
- TypeScript compilation (typecheck)
- Linter (ESLint)
- Tests execution
- CLI accessibility

**Exit Codes:**
- `0`: All checks passed
- `1`: Critical issues found

**Output:**
- Color-coded results (✓ green, ✗ red, ⚠ yellow)
- Issue count and warnings
- Next steps and remediation advice

#### TypeScript Script (Detailed Analysis)

```bash
bun run scripts/local-deploy-check.ts
```

Comprehensive validation with detailed reporting. Provides:
- Categorized validation results
- Programmatic result parsing
- Detailed error messages
- Summary statistics
- Machine-readable output (JSON-friendly)

**Features:**
- Runtime environment checks
- Dependency validation
- Configuration file analysis
- Source structure verification
- TypeScript compilation
- Test execution and parsing
- CLI accessibility checks

### Docker Deployment Validation

```bash
./scripts/validate-docker.sh
```

Validates Docker configuration:
- Required files (Dockerfile, docker-compose.yml, etc.)
- Multi-stage build setup
- Health check configuration
- Service definitions
- Prometheus/Grafana setup
- Environment templates

## Usage Examples

### Quick Validation

Run before committing or starting development:

```bash
./scripts/validate-local.sh
```

### CI/CD Integration

Use in GitHub Actions or other CI systems:

```bash
# Shell script for fast feedback
./scripts/validate-local.sh || exit 1

# Or TypeScript for detailed reporting
bun run scripts/local-deploy-check.ts || exit 1
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd "$(git rev-parse --show-toplevel)/rad-engineer"
./scripts/validate-local.sh
```

### Development Workflow

```bash
# 1. Install dependencies
bun install

# 2. Validate setup
./scripts/validate-local.sh

# 3. Fix any issues
bun run typecheck  # Fix TypeScript errors
bun test           # Fix failing tests

# 4. Re-validate
./scripts/validate-local.sh

# 5. Start development
bun run dev
```

## Validation Categories

### 1. Runtime Environment
- Bun installation
- Version requirements (>= 1.0.0)

### 2. Dependencies
- node_modules presence
- Critical dependencies (@anthropic-ai/sdk, opentelemetry, etc.)
- Dev dependencies (TypeScript, ESLint, etc.)

### 3. Source Structure
- src directory
- Key modules (sdk, config, observability, security, memory, cli)

### 4. Configuration
- package.json with required scripts
- tsconfig.json
- eslint.config.js
- Environment files (.env)

### 5. TypeScript
- Type checking (0 errors required)
- Compilation status

### 6. Tests
- Test directory structure
- Test execution
- Pass/fail status

### 7. CLI
- CLI directory
- Entry points
- Accessibility

## Troubleshooting

### Bun Not Found

```bash
curl -fsSL https://bun.sh/install | bash
```

### Dependencies Missing

```bash
bun install
```

### TypeScript Errors

```bash
bun run typecheck
# Fix reported errors
```

### Test Failures

```bash
bun test
# Review and fix failing tests
```

### Environment Issues

```bash
# Create .env from template
cp .env.example .env
# Add required values (ANTHROPIC_API_KEY, etc.)
```

## Exit Codes

Both scripts follow standard exit code conventions:

- `0`: Success (all critical checks passed)
- `1`: Failure (one or more critical checks failed)

Warnings do not cause script failure but are reported in output.

## Output Format

### Shell Script
- Human-readable colored output
- Section headers with separators
- Symbol-based status (✓, ✗, ⚠)
- Summary with issue counts
- Next steps guidance

### TypeScript Script
- Structured output by category
- Detailed check results
- Error details and remediation
- Statistics and summaries
- Machine-parseable format

## Integration with Quality Gates

These scripts complement the quality gate process defined in `.claude/skills/execute/`:

```bash
# Quality gates (serialized with flock)
LOCK="/tmp/rad-engineer-quality-gate.lock"
flock -w 300 "$LOCK" sh -c 'bun run typecheck && bun run lint && bun test'
```

Use validation scripts for:
- Initial setup verification
- Pre-deployment checks
- CI/CD validation
- Development environment troubleshooting

## Contributing

When adding new validation checks:

1. Add to both shell and TypeScript scripts for consistency
2. Follow existing patterns (pass/fail/warn status)
3. Provide clear error messages and remediation steps
4. Update this README with new checks
5. Test with both success and failure scenarios

## References

- Bun documentation: https://bun.sh/docs
- TypeScript handbook: https://www.typescriptlang.org/docs/
- ESLint: https://eslint.org/docs/
- Testing with Bun: https://bun.sh/docs/cli/test
