---
name: plan
description: Generate execution plans from user queries through intake, research, specification, and validation. Use when user provides any query (vague to specific) and needs an executable plan for /execute skill.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion, WebSearch, WebFetch
model: claude-sonnet-4-20250514
---

# /plan Skill - Deterministic Planning System

> **Version**: 2.0.0
> **Status**: Active
> **Purpose**: Generate evidence-backed, gap-free execution plans consumable by /execute skill
> **Key Feature**: Mathematical certainty through mandatory code verification

---

## Core Principles

1. **Evidence-Based**: All claims traced to verified codebase evidence (grep outputs, file:line refs)
2. **No Assumptions**: NEVER claim something exists/doesn't exist without verification
3. **Contract-Driven**: Every task has explicit preconditions, postconditions, verification commands
4. **Gap-Free**: Research phase verifies against actual code, not assumptions
5. **Deterministic Handoff**: Output format exactly matches /execute skill input requirements

---

## CRITICAL: Anti-Hallucination Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│  BEFORE ADDING ANY TASK TO PLAN:                                │
│                                                                 │
│  1. VERIFY the feature doesn't already exist:                   │
│     grep -r "ClassName" src/                                   │
│     find . -name "*FeatureName*"                               │
│                                                                 │
│  2. VERIFY dependencies exist:                                  │
│     ls -la path/to/required/files                              │
│                                                                 │
│  3. EXTRACT existing patterns:                                  │
│     grep -A 10 "similar pattern" existing_file.ts             │
│                                                                 │
│  4. DOCUMENT evidence in plan:                                  │
│     - File:line references                                      │
│     - Actual command outputs                                    │
│     - Existing test patterns                                    │
│                                                                 │
│  IF YOU CANNOT VERIFY → DO NOT ADD TO PLAN                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Startup Protocol

### Required Context Loads

```bash
# 1. Detect project context
PROJECT=$(basename $(git rev-parse --show-toplevel 2>/dev/null || pwd))
echo "Project: $PROJECT"

# 2. Find existing planning artifacts
find . -name "IMPLEMENTATION-PLAN.md" -o -name "*-PLAN.md" 2>/dev/null

# 3. Detect tech stack
if [[ -f "package.json" ]]; then
  STACK="typescript"
  TEST_CMD="bun test"
  TYPECHECK_CMD="bun run typecheck"
elif [[ -f "pyproject.toml" ]]; then
  STACK="python"
  TEST_CMD="pytest"
  TYPECHECK_CMD="mypy ."
fi

# 4. Read project CLAUDE.md if exists
if [[ -f "CLAUDE.md" ]]; then
  cat CLAUDE.md | head -100
fi
```

### Initial State

```
┌─────────────────────────────────────────────────────────────────┐
│                    STARTUP STATE                                 │
├─────────────────────────────────────────────────────────────────┤
│  Input: User Query (vague to specific)                          │
│  Context: Project structure + existing patterns                 │
│  Constraint: Max 2-3 concurrent research agents                 │
│  Output: IMPLEMENTATION-PLAN.md (v2.0) + tasks.json             │
│  Guarantee: Every task has verification evidence                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Intake (User Query → Structured Requirements)

### Step 1.1: Receive User Query

User provides query in natural language. Examples:
- "build me a notes app"
- "add authentication to my API"
- "integrate Shopify roast into rad-engineer"

### Step 1.2: Ask Clarifying Questions (5-10 max)

```javascript
AskUserQuestion({
  questions: [
    {
      question: "What is the main feature you want to build?",
      header: "Core Feature",
      multiSelect: false,
      options: [
        { label: "New feature from scratch", description: "Building something completely new" },
        { label: "Enhancement to existing", description: "Adding to/modifying existing code" },
        { label: "Integration", description: "Connecting with external system/library" },
        { label: "Bug fix", description: "Fixing a specific issue" }
      ]
    },
    {
      question: "What are the success criteria?",
      header: "Success Criteria",
      multiSelect: true,
      options: [
        { label: "Tests passing (≥80% coverage)", description: "All tests must pass" },
        { label: "TypeScript strict (0 errors)", description: "Zero typecheck errors" },
        { label: "Documentation", description: "Include inline documentation" },
        { label: "Working demo", description: "Runnable demonstration" }
      ]
    },
    {
      question: "What should we NOT include (scope boundaries)?",
      header: "Out of Scope",
      multiSelect: true,
      options: [
        { label: "Database changes", description: "No DB modifications" },
        { label: "API breaking changes", description: "Maintain backward compatibility" },
        { label: "UI/UX design", description: "Focus on backend only" },
        { label: "Performance optimization", description: "Functional requirements only" }
      ]
    }
  ]
})
```

### Step 1.3: Build StructuredRequirements

```typescript
interface StructuredRequirements {
  query: string;                    // Original user query
  coreFeature: string;              // Main feature to build
  featureType: 'new' | 'enhancement' | 'integration' | 'bugfix';
  techStack: string;                // Detected or specified
  successCriteria: string[];        // User-selected criteria
  outOfScope: string[];             // Explicitly excluded
  complexity: 'simple' | 'medium' | 'complex';
}
```

---

## Phase 2: Research (Parallel Agents)

### Step 2.1: Spawn Research Agents

**CRITICAL**: Use `run_in_background: true` for parallel execution

```markdown
# Spawn 2-3 research agents in PARALLEL

Agent 1: Technical Feasibility & Best Practices
───────────────────────────────────────────────
Task: "Research technical approaches for: [coreFeature]

Research focus:
1. Technical feasibility (can this be built with current stack?)
2. Best practices (context7 for library docs, web search for patterns)
3. Potential risks and mitigations
4. Existing solutions we can learn from

Output: JSON
{
  'feasible': boolean,
  'approaches': [{'name': string, 'pros': string[], 'cons': string[]}],
  'risks': [{'risk': string, 'mitigation': string}],
  'bestPractices': [{'practice': string, 'source': string}],
  'evidence': [{'claim': string, 'source': string}]
}

Rules: Use context7 for docs, web search for current patterns, JSON output"


Agent 2: Codebase Analysis (for enhancement/integration)
─────────────────────────────────────────────────────────
Task: "Analyze existing codebase patterns for: [coreFeature]

MANDATORY verification steps:
1. grep/glob to find similar existing features
2. Read actual files to understand patterns
3. Identify integration points with file:line references
4. Check for existing tests we can follow

Output: JSON
{
  'existingPatterns': [{'file': string, 'line': number, 'pattern': string}],
  'integrationPoints': [{'file': string, 'line': number, 'type': string}],
  'testPatterns': [{'file': string, 'pattern': string}],
  'dependencies': string[],
  'evidence': [{'claim': string, 'verification': string, 'output': string}]
}

Rules: Grep-first, include actual command outputs, JSON output"
```

### Step 2.2: Collect and Validate Research

After agents complete:

```bash
# Validate evidence exists for each claim
for claim in research_claims; do
  if [[ -z "${claim.evidence}" ]]; then
    echo "WARNING: Unverified claim: ${claim}"
    # Either verify now or mark as assumption
  fi
done
```

---

## Phase 2.5: Codebase Verification (MANDATORY)

> **This phase prevents false gap analysis by requiring code verification before planning**

### Step 2.5.1: Verify Feature Doesn't Already Exist

**BEFORE planning any task, run these checks:**

```bash
# For each planned feature/component
FEATURE_NAME="ComponentName"

# 1. Search by class/type name
echo "=== Searching for existing implementation ==="
grep -r "class ${FEATURE_NAME}" src/
grep -r "interface ${FEATURE_NAME}" src/
grep -r "type ${FEATURE_NAME}" src/

# 2. Search by file name pattern
echo "=== Searching for existing files ==="
find . -name "*${FEATURE_NAME}*" -type f

# 3. Search for similar functionality
echo "=== Searching for similar patterns ==="
grep -r "similar_keyword" src/ --include="*.ts"
```

### Step 2.5.2: Check for Alternative Implementations

```bash
# Common naming variations
grep -r "compact\|compactState\|compress" src/  # For "compact" feature
grep -r "monitor\|Monitor\|Watcher" src/        # For "monitor" feature

# Check different locations
ls src/
ls lib/
ls packages/
```

### Step 2.5.3: Document Evidence

For each planned task, capture:

```yaml
codebase_evidence:
  - claim: "LinuxMonitor needs to be implemented"
    verification_command: "grep -r 'class LinuxMonitor' src/"
    output: "src/sdk/monitors/LinuxMonitor.ts:export class LinuxMonitor"
    conclusion: "ALREADY EXISTS - remove from plan"

  - claim: "StateManager needs compact() method"
    verification_command: "grep -r 'compact' src/advanced/StateManager.ts"
    output: "line 329: async compactState(): Promise<void>"
    conclusion: "ALREADY EXISTS as compactState() - remove from plan"

  - claim: "Need to add authentication middleware"
    verification_command: "grep -r 'auth\|Auth' src/middleware/"
    output: "(no results)"
    conclusion: "VERIFIED MISSING - include in plan"
```

### Step 2.5.4: Verification Checklist

```markdown
## Pre-Planning Verification Checklist

For each planned feature:
- [ ] Searched for class/type by name: `grep -r "class Name" src/`
- [ ] Searched for file by pattern: `find . -name "*Name*"`
- [ ] Checked alternative naming: (list variations checked)
- [ ] Checked alternative locations: (list directories checked)
- [ ] Read similar existing code: (file:line references)
- [ ] Documented evidence: (command outputs included)

Verification Result:
- [ ] Feature confirmed MISSING → Add to plan
- [ ] Feature ALREADY EXISTS → Remove from plan / Document gap reason
```

---

## Phase 3: Specification with Contracts

### Step 3.1: Define Task Contracts

**Every task MUST have explicit contracts for /execute skill:**

```yaml
task:
  id: "TASK-001"
  title: "Implement AuthMiddleware"

  # MANDATORY: Preconditions
  preconditions:
    - id: "pre-1"
      type: "directory_exists"
      path: "src/middleware/"
      verification: "ls -la src/middleware/"

    - id: "pre-2"
      type: "dependency_installed"
      package: "jsonwebtoken"
      verification: "grep 'jsonwebtoken' package.json"

    - id: "pre-3"
      type: "no_existing_implementation"
      verification: "grep -r 'class AuthMiddleware' src/"
      expected_output: "(no results)"

  # MANDATORY: Postconditions
  postconditions:
    - id: "post-1"
      type: "file_created"
      path: "src/middleware/AuthMiddleware.ts"
      verification: "ls -la src/middleware/AuthMiddleware.ts"

    - id: "post-2"
      type: "test_file_created"
      path: "src/middleware/__tests__/AuthMiddleware.test.ts"
      verification: "ls -la src/middleware/__tests__/AuthMiddleware.test.ts"

    - id: "post-3"
      type: "tests_pass"
      verification: "bun test src/middleware/__tests__/AuthMiddleware.test.ts"
      expected_output: "pass"

    - id: "post-4"
      type: "typecheck_clean"
      verification: "bun run typecheck"
      expected_output: "0 errors"

  # MANDATORY: Codebase evidence
  codebase_evidence:
    - claim: "No existing auth middleware"
      verification: "grep -r 'AuthMiddleware' src/"
      output: "(no results)"

    - claim: "Similar pattern in RateLimiter"
      source: "src/middleware/RateLimiter.ts:15"
      pattern: "export class RateLimiter implements IMiddleware"
```

### Step 3.2: Define Acceptance Criteria with Verification

```yaml
acceptance_criteria:
  - criterion: "AuthMiddleware validates JWT tokens"
    verification:
      command: "grep -n 'verify.*jwt\|jwt.*verify' src/middleware/AuthMiddleware.ts"
      expected: "At least one match"

  - criterion: "Returns 401 for invalid tokens"
    verification:
      command: "grep -n '401' src/middleware/AuthMiddleware.ts"
      expected: "At least one match"

  - criterion: "Unit tests cover happy and error paths"
    verification:
      command: "grep -c 'it(' src/middleware/__tests__/AuthMiddleware.test.ts"
      expected: "≥ 4 tests"
```

---

## Phase 4: Plan Generation (v2.0 Format)

### Output: IMPLEMENTATION-PLAN.md

**Location**: `docs/planning/IMPLEMENTATION-PLAN.md` (or project-specific)

```yaml
# IMPLEMENTATION-PLAN.md
# Generated by /plan skill v2.0

execution_metadata:
  version: "2.0"
  schema: "deterministic-plan-v2"
  project: "[project-name]"
  created: "[ISO timestamp]"
  skill_version: "plan-v2.0.0"
  verification_level: "mathematical_certainty"

requirements:
  query: "[original user query]"
  feature_type: "new|enhancement|integration|bugfix"
  success_criteria:
    - "Tests passing (≥80% coverage)"
    - "TypeScript strict (0 errors)"
  out_of_scope:
    - "[excluded items]"

# Evidence from Phase 2.5 verification
codebase_verification:
  verified_at: "[ISO timestamp]"
  features_checked:
    - feature: "AuthMiddleware"
      verification: "grep -r 'class AuthMiddleware' src/"
      output: "(no results)"
      status: "VERIFIED_MISSING"

    - feature: "LinuxMonitor"
      verification: "grep -r 'class LinuxMonitor' src/"
      output: "src/sdk/monitors/LinuxMonitor.ts:5"
      status: "ALREADY_EXISTS"
      action: "EXCLUDED_FROM_PLAN"

waves:
  - id: "wave-1"
    name: "Foundation"
    stories:
      - id: "STORY-001"
        title: "Implement AuthMiddleware"
        description: "JWT-based authentication middleware"
        agent_type: "developer"
        model: "sonnet"
        estimated_minutes: 45

        # Contract for /execute skill
        preconditions:
          - id: "pre-1"
            type: "directory_exists"
            path: "src/middleware/"
            verification: "ls -la src/middleware/"

          - id: "pre-2"
            type: "no_existing_implementation"
            verification: "grep -r 'class AuthMiddleware' src/"
            expected: "(no results)"

        postconditions:
          - id: "post-1"
            type: "file_created"
            path: "src/middleware/AuthMiddleware.ts"
            verification: "ls -la src/middleware/AuthMiddleware.ts"

          - id: "post-2"
            type: "tests_pass"
            verification: "bun test src/middleware/__tests__/AuthMiddleware.test.ts"

          - id: "post-3"
            type: "typecheck_clean"
            verification: "bun run typecheck"

        acceptance_criteria:
          - criterion: "Validates JWT tokens"
            verification: "grep -n 'verify.*jwt' src/middleware/AuthMiddleware.ts"

          - criterion: "Returns 401 for invalid tokens"
            verification: "grep -n '401' src/middleware/AuthMiddleware.ts"

        codebase_evidence:
          - claim: "Similar pattern in RateLimiter"
            source: "src/middleware/RateLimiter.ts:15"

        files_in_scope:
          - "src/middleware/AuthMiddleware.ts"
          - "src/middleware/__tests__/AuthMiddleware.test.ts"

        test_requirements:
          unit_tests: 4
          integration_tests: 1
          coverage_target: 80

quality_gates:
  - wave: "all"
    gates:
      - name: "TypeScript compilation"
        command: "bun run typecheck"
        must_pass: true

      - name: "Tests"
        command: "bun test"
        threshold: "≥80% coverage"
        must_pass: true

      - name: "Lint"
        command: "bun run lint"
        must_pass: true

research_summary:
  sources:
    - type: "codebase"
      files_analyzed: 15
      patterns_extracted: 3

    - type: "documentation"
      sources: ["context7/jwt", "web/auth-patterns"]

  evidence_count: 12
  unverified_claims: 0
```

### Output: tasks.json

```json
{
  "version": "2.0",
  "schema": "deterministic-tasks-v2",
  "project": "[project-name]",
  "generatedAt": "[ISO timestamp]",
  "stories": [
    {
      "id": "STORY-001",
      "waveId": "wave-1",
      "title": "Implement AuthMiddleware",
      "status": "pending",
      "model": "sonnet",
      "estimatedMinutes": 45,
      "preconditions": [
        {
          "id": "pre-1",
          "type": "directory_exists",
          "path": "src/middleware/",
          "verification": "ls -la src/middleware/"
        }
      ],
      "postconditions": [
        {
          "id": "post-1",
          "type": "file_created",
          "path": "src/middleware/AuthMiddleware.ts",
          "verification": "ls -la src/middleware/AuthMiddleware.ts"
        }
      ],
      "acceptanceCriteria": [
        {
          "criterion": "Validates JWT tokens",
          "verification": "grep -n 'verify.*jwt' src/middleware/AuthMiddleware.ts"
        }
      ],
      "filesInScope": [
        "src/middleware/AuthMiddleware.ts",
        "src/middleware/__tests__/AuthMiddleware.test.ts"
      ]
    }
  ]
}
```

---

## Phase 5: Validation

### Step 5.1: Evidence Completeness Check

```typescript
function validateEvidence(plan: Plan): ValidationResult {
  const issues: string[] = [];

  for (const story of plan.waves.flatMap(w => w.stories)) {
    // Check preconditions have verification
    for (const pre of story.preconditions) {
      if (!pre.verification) {
        issues.push(`Story ${story.id}: Precondition ${pre.id} missing verification command`);
      }
    }

    // Check postconditions have verification
    for (const post of story.postconditions) {
      if (!post.verification) {
        issues.push(`Story ${story.id}: Postcondition ${post.id} missing verification command`);
      }
    }

    // Check codebase evidence exists
    if (!story.codebase_evidence || story.codebase_evidence.length === 0) {
      issues.push(`Story ${story.id}: No codebase evidence provided`);
    }
  }

  return { passed: issues.length === 0, issues };
}
```

### Step 5.2: Contract Validity Check

```typescript
function validateContracts(plan: Plan): ValidationResult {
  const issues: string[] = [];

  for (const story of plan.waves.flatMap(w => w.stories)) {
    // Must have at least 1 precondition
    if (!story.preconditions || story.preconditions.length === 0) {
      issues.push(`Story ${story.id}: No preconditions defined`);
    }

    // Must have at least 3 postconditions (file, tests, typecheck)
    if (!story.postconditions || story.postconditions.length < 3) {
      issues.push(`Story ${story.id}: Insufficient postconditions (need file, tests, typecheck)`);
    }

    // Must have typecheck postcondition
    const hasTypecheck = story.postconditions?.some(p =>
      p.verification?.includes('typecheck')
    );
    if (!hasTypecheck) {
      issues.push(`Story ${story.id}: Missing typecheck postcondition`);
    }
  }

  return { passed: issues.length === 0, issues };
}
```

### Step 5.3: /execute Compatibility Check

```typescript
function validateExecuteCompatibility(plan: Plan): ValidationResult {
  // Ensure plan format matches what /execute expects
  const required = [
    'execution_metadata.version',
    'execution_metadata.schema',
    'waves',
    'quality_gates'
  ];

  const issues = required.filter(field => !getNestedField(plan, field))
    .map(field => `Missing required field: ${field}`);

  return { passed: issues.length === 0, issues };
}
```

---

## Phase 6: User Approval

### Present Plan Summary

```markdown
# Execution Plan Ready

## Overview
- **Project**: [project-name]
- **Stories**: 12 stories across 5 waves
- **Verification Level**: Mathematical Certainty

## Codebase Verification Summary
- Features checked: 8
- Verified missing (in plan): 6
- Already exist (excluded): 2

## Contract Summary
- Preconditions defined: 24
- Postconditions defined: 36
- Verification commands: 60

## Evidence Summary
- Codebase patterns extracted: 12
- Research sources: 8
- Unverified claims: 0

## Quality Gates
- TypeScript: 0 errors required
- Tests: ≥80% coverage required
- Lint: Must pass

## Files Generated
1. `docs/planning/IMPLEMENTATION-PLAN.md` (v2.0)
2. `docs/planning/tasks.json`
3. `docs/planning/VALIDATION-SUMMARY.md`

## Next Steps
Run `/execute` to begin deterministic implementation.

**Plan approved?**
```

---

## Integration with /execute Skill

### Handoff Protocol

```
/plan completes
    │
    ▼
┌─────────────────────────────────────────────┐
│ IMPLEMENTATION-PLAN.md (v2.0)               │
│ ├── execution_metadata                      │
│ ├── codebase_verification (evidence)        │
│ ├── waves                                   │
│ │   └── stories                             │
│ │       ├── preconditions (with commands)   │
│ │       ├── postconditions (with commands)  │
│ │       └── codebase_evidence               │
│ └── quality_gates                           │
└─────────────────────────────────────────────┘
    │
    ▼
/execute reads plan
    │
    ▼
For each story:
  1. Run precondition verification commands
  2. Create test (TDD)
  3. Implement
  4. Run postcondition verification commands
  5. Capture evidence
  6. Git commit
```

### What /execute Expects (Contract)

```yaml
# /execute requires these fields per story:
required_fields:
  - id                    # Story identifier
  - title                 # Human-readable name
  - preconditions         # Array with verification commands
  - postconditions        # Array with verification commands
  - files_in_scope        # Files to create/modify
  - acceptance_criteria   # With verification commands

# /execute runs these verification commands:
verification_protocol:
  - preconditions: "Run all before starting"
  - postconditions: "Run all after implementing"
  - acceptance_criteria: "Run all before marking complete"
```

---

## Error Handling

### Verification Failures

| Error | Recovery |
|-------|----------|
| Feature already exists | Remove from plan, document in excluded |
| Dependency not found | Add prerequisite story or document blocker |
| Pattern not found | Research more, ask user, or document assumption |

### Research Failures

| Error | Recovery |
|-------|----------|
| Agent timeout | Retry once, then sequential research |
| No evidence found | Mark as assumption with confidence score |
| Conflicting evidence | Present options to user |

---

## Quality Standards

### Evidence Quality

- **Verified**: grep/find output included
- **Source**: file:line reference provided
- **Confidence**: Based on verification strength

### Plan Quality

- **Completeness**: All required fields present
- **Contracts**: Every story has pre/post conditions
- **Verification**: Every claim has a command to prove it
- **Traceability**: All decisions traceable to evidence

---

## Usage Examples

### Basic Planning

```
/plan add user authentication with JWT
```

### Integration Planning

```
/plan integrate Shopify roast workflow engine into rad-engineer
```

### With Specific Requirements

```
/plan refactor StateManager to support distributed state
  - Must maintain backward compatibility
  - Need 90% test coverage
  - Document all changes
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-14 | Added Phase 2.5 (Codebase Verification), contracts, deterministic output |
| 1.0.0 | 2026-01-06 | Initial hybrid /plan skill |

---

**Maintained by**: Rad Engineering Platform
**Last Updated**: 2026-01-14
**Integration**: Works with /execute skill v1.2+
