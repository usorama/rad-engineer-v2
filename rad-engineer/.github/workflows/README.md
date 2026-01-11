# GitHub Actions Workflows

This directory contains CI/CD workflows for the rad-engineer project.

## Workflows

### ci.yml

**Trigger**: Push to main/develop/initial-implementation branches, or pull requests to main/develop

**Jobs**:
1. **test**: Runs TypeScript type checking, ESLint, and Bun tests with coverage
2. **quality-gates**: Verifies zero TypeScript errors, lint passes, and all tests pass

**Artifacts**: Coverage reports uploaded to codecov.io (requires `CODECOV_TOKEN` secret)

**Node Version**: 20
**Test Runner**: Bun

**Steps**:
- Checkout code
- Setup Node.js 20
- Setup Bun (latest)
- Install dependencies with `bun install --frozen-lockfile`
- Run `bun run typecheck`
- Run `bun run lint`
- Run `bun test --coverage`
- Upload coverage to Codecov (main branch only)
- Upload coverage artifacts (always, 7-day retention)

### release.yml

**Trigger**: Push of tags matching `v*.*.*` (e.g., v0.0.1, v1.2.3)

**Jobs**:
1. **build-and-release**: Builds artifacts, generates checksums, creates GitHub release

**Artifacts**:
- `rad-engineer-v{version}.tar.gz` (gzipped tarball)
- `rad-engineer-v{version}.zip` (zip archive)
- `checksums.txt` (SHA256 checksums for verification)

**Permissions**: Requires `contents: write` permission to create releases

**Steps**:
- Checkout code with full history
- Setup Node.js 20 and Bun
- Run quality gates (typecheck, lint, test)
- Extract version from tag
- Build release artifacts (tar.gz and zip)
- Generate SHA256 checksums
- Generate release notes from git commits
- Create GitHub release with artifacts
- Upload artifacts (90-day retention)

**Release Notes Include**:
- Commit history since last tag
- Installation instructions
- SHA256 verification instructions
- Requirements (Node >= 20, Bun >= 1.0)
- Full changelog link

**Prerelease Detection**: Versions containing `-` (e.g., v1.0.0-beta) are marked as prereleases

## Setup Requirements

### For CI Workflow

1. **Codecov Integration** (optional, for coverage badges):
   - Sign up at https://codecov.io
   - Add `CODECOV_TOKEN` to repository secrets
   - Or remove the codecov step if not needed

### For Release Workflow

1. **GitHub Token**: Uses automatic `GITHUB_TOKEN` (no setup required)
2. **Tag Format**: Tags must match `v*.*.*` pattern (semantic versioning)

## Creating a Release

To create a new release:

```bash
# Ensure all changes are committed and pushed
git add .
git commit -m "Release v0.0.2"
git push

# Create and push a tag
git tag v0.0.2
git push origin v0.0.2
```

The release workflow will automatically:
- Run quality gates
- Build artifacts
- Generate checksums
- Create GitHub release with notes

## Coverage Badge

To display the coverage badge in your README, add:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/rad-engineer-v2/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/rad-engineer-v2)
```

Replace `YOUR_USERNAME` with your GitHub username or organization name.

## Local Testing

To run the same checks locally before pushing:

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Tests with coverage
bun test --coverage

# All quality gates
bun run typecheck && bun run lint && bun test
```

## Troubleshooting

### CI Failing on TypeScript Errors

```bash
# Run locally to see errors
bun run typecheck
```

### CI Failing on Lint

```bash
# Run locally to see lint errors
bun run lint

# Auto-fix where possible
bun run lint --fix
```

### Tests Failing

```bash
# Run tests locally
bun test

# Run specific test file
bun test path/to/test.test.ts

# Run with verbose output
bun test --verbose
```

### Release Not Triggering

- Ensure tag matches `v*.*.*` pattern
- Check that tag was pushed: `git push origin <tag>`
- Verify repository has Actions enabled in Settings > Actions

## Security Notes

- Workflows use pinned versions of actions (e.g., `@v4`)
- No untrusted input is used in shell commands
- Environment variables are used for all dynamic values
- See [GitHub Actions Security Guide](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
