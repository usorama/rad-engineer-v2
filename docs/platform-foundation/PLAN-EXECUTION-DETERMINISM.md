# Plan Execution Determinism Specification

> **Purpose**: Define HOW to execute implementation plans with mathematical certainty
> **Version**: 1.0.0
> **Created**: 2026-01-13
> **Scope**: Applies to both rad-engineer-v2 and engg-support-system plans

---

## Executive Summary

This document specifies the **deterministic execution protocol** for implementing the plans. It addresses:

1. **Workflow with loops** - Validate-Execute-Verify cycles
2. **Mathematical certainty** - How to prove task completion
3. **Metrics** - What to measure and track
4. **Skill enhancements** - What capabilities are needed
5. **Reproducibility** - Ensuring same inputs → same outputs

---

## Core Principle: Triple Verification

Every task must pass three verification layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIPLE VERIFICATION                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: PRECONDITION CHECK                                │
│  - Dependencies met?                                         │
│  - Required files exist?                                     │
│  - Environment configured?                                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: EXECUTION WITH EVIDENCE                           │
│  - Run task                                                  │
│  - Capture all outputs                                       │
│  - Log decisions with rationale                              │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: POSTCONDITION VERIFICATION                        │
│  - Tests pass?                                               │
│  - Success criteria met?                                     │
│  - Evidence captured?                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow: Validate-Execute-Verify Loop

### Phase Flow Diagram

```
START
  │
  ▼
┌─────────────────┐
│ Read Task Spec  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Check           │ NO  │ Wait / Fix      │
│ Preconditions   ├────►│ Dependencies    │
└────────┬────────┘     └────────┬────────┘
         │ YES                   │
         ▼                       │
┌─────────────────┐              │
│ Create Test     │              │
│ (TDD First)     │              │
└────────┬────────┘              │
         │                       │
         ▼                       │
┌─────────────────┐              │
│ Implement       │◄─────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Run Tests       │ NO  │ Fix & Retry     │
│ & Typecheck     ├────►│ (max 3)         │
└────────┬────────┘     └────────┬────────┘
         │ YES                   │
         ▼                       │
┌─────────────────┐              │
│ Verify Success  │ NO           │
│ Criteria        ├──────────────┘
└────────┬────────┘
         │ YES
         ▼
┌─────────────────┐
│ Capture Evidence│
│ Update Progress │
└────────┬────────┘
         │
         ▼
       NEXT TASK
```

### Loop Invariants

1. **Test-first invariant**: No implementation without failing test first
2. **Evidence invariant**: No task complete without captured evidence
3. **Retry limit invariant**: Max 3 retries before escalation
4. **Progress invariant**: Progress file updated after every task

---

## Mathematical Certainty Protocol

### Definition of "Complete"

A task is **mathematically complete** when:

```
COMPLETE(task) ⟺
  ∀ precondition ∈ task.preconditions: precondition = TRUE
  ∧ ∀ postcondition ∈ task.postconditions: postcondition = TRUE
  ∧ tests.all_pass = TRUE
  ∧ typecheck.errors = 0
  ∧ evidence.captured = TRUE
```

### Verification Functions

| Function | Input | Output | Certainty |
|----------|-------|--------|-----------|
| `typecheck()` | source files | 0 errors OR list of errors | 100% |
| `runTests()` | test files | pass/fail per test | 100% |
| `measureDrift()` | task, N runs | variance (0 = deterministic) | 100% |
| `veracityScore()` | code output | 0-100 confidence | Formula-based |

### Proof of Completion

For each task, generate:

```markdown
## Task Completion Proof: [Task ID]

### Preconditions Verified
- [x] Dependency A exists: `ls -la path/to/file`
- [x] Environment configured: `echo $VAR`

### Implementation Evidence
- Files created/modified: [list]
- Lines of code: [count]
- Test coverage: [percentage]

### Postconditions Verified
- [x] typecheck: `bun run typecheck` → 0 errors
- [x] tests: `bun test path/to/test.ts` → all pass
- [x] Success criteria 1: [evidence]
- [x] Success criteria 2: [evidence]

### Verification Command Outputs
```
[paste actual command outputs]
```

### Completion Timestamp
YYYY-MM-DD HH:MM:SS
```

---

## Metrics Framework

### Execution Metrics

| Metric | Formula | Target | Measurement |
|--------|---------|--------|-------------|
| Task Completion Rate | completed / total | 100% | Track per phase |
| First-Pass Success | pass_on_first / total | ≥80% | Track retries |
| Verification Pass Rate | verified / implemented | 100% | Track rejections |
| Drift Rate | unique_outputs / runs | 0% | Run task 10× |
| Evidence Capture Rate | with_evidence / total | 100% | Track missing |

### Quality Metrics

| Metric | Formula | Target | Measurement |
|--------|---------|--------|-------------|
| Test Coverage | covered_lines / total_lines | ≥80% | bun test --coverage |
| Type Coverage | typed / total | 100% | No `any` types |
| Veracity Score | ESS confidence score | ≥85 | Per agent output |
| Contract Coverage | with_contract / changes | 100% | Track commits |

### Efficiency Metrics

| Metric | Formula | Target | Measurement |
|--------|---------|--------|-------------|
| Token Efficiency | used / budget | ≤70% | Per agent run |
| Compression Ratio | raw / compressed | ≥5:1 | Scope compression |
| Agent Utilization | active_time / total_time | 60-80% | Track wait time |

---

## Skill Enhancements Required

### Current Skills Analysis

| Skill | Location | Purpose | Enhancement Needed? |
|-------|----------|---------|-------------------|
| `/execute` | `.claude/skills/execute/SKILL.md` | Execute stories | YES - add validation loops |
| `/plan` | `rad-engineer/.claude/skills/plan/SKILL.md` | Generate plans | YES - add precondition checks |
| `/orchestrate-spec` | `.claude/skills/orchestrate-spec.md` | Spec generation | Minor - add evidence capture |

### Enhancement 1: /execute Skill

**Current Gap**: No formal validation loop
**Enhancement**: Add Validate-Execute-Verify protocol

**Add to skill**:

```markdown
## Execution Protocol (MANDATORY)

### Before Each Task
1. Read task specification
2. Verify all preconditions:
   - Run: `ls -la [required_files]`
   - Run: `grep -l [required_patterns] [files]`
   - Check ESS integration status if needed
3. Create failing test first (TDD)

### During Execution
1. Implement to make test pass
2. Log all decisions with rationale
3. Capture all command outputs

### After Each Task
1. Run verification suite:
   ```bash
   bun run typecheck
   bun test [relevant_tests]
   ```
2. Check success criteria from spec
3. Capture evidence to PROGRESS.md
4. Update task status

### Retry Protocol
- Max 3 retries per task
- On retry: analyze failure, adjust approach
- After 3 failures: escalate to user
```

### Enhancement 2: /plan Skill

**Current Gap**: No precondition specification
**Enhancement**: Add precondition/postcondition to plan output

**Add to plan output format**:

```yaml
task:
  id: "1.1.1"
  name: "Implement Scope class"
  preconditions:
    - type: "file_exists"
      path: "rad-engineer/src/memory/"
    - type: "dependency_installed"
      package: "typescript"
  postconditions:
    - type: "file_created"
      path: "rad-engineer/src/memory/Scope.ts"
    - type: "test_passes"
      pattern: "Scope.test.ts"
    - type: "typecheck_clean"
  verification:
    commands:
      - "bun run typecheck"
      - "bun test src/memory/Scope.test.ts"
```

### Enhancement 3: New Skill - /verify-task

**Purpose**: Verify task completion with mathematical certainty

**Location**: `.claude/skills/verify-task.md`

```markdown
---
name: verify-task
description: Verify task completion with evidence
---

## Usage
/verify-task [task-id]

## Verification Steps

1. **Load task specification**
   - Read task from IMPLEMENTATION-PLAN.md
   - Extract preconditions, postconditions, success criteria

2. **Check preconditions**
   - Execute each precondition check
   - If any fail: report and stop

3. **Check postconditions**
   - Run typecheck
   - Run tests
   - Check file existence
   - Verify success criteria

4. **Generate proof**
   - Create completion proof markdown
   - Include all command outputs
   - Add timestamp

5. **Update progress**
   - Mark task complete in progress file
   - Add evidence to ANALYSIS-MEMORY.yaml

## Output Format

```markdown
## Verification Report: [Task ID]

### Status: VERIFIED | FAILED

### Preconditions
| Condition | Status | Evidence |
|-----------|--------|----------|
| ... | PASS/FAIL | ... |

### Postconditions
| Condition | Status | Evidence |
|-----------|--------|----------|
| ... | PASS/FAIL | ... |

### Commands Executed
\`\`\`
[actual outputs]
\`\`\`

### Timestamp
[ISO datetime]
```
```

---

## Reproducibility Protocol

### Same Inputs → Same Outputs

To ensure reproducibility:

1. **Seed all randomness**
   - Use `SeededRandom` class (exists in adaptive/)
   - Pass seed to all agents

2. **Pin all dependencies**
   - package.json versions locked
   - Docker image tags specified
   - Ollama model digest captured

3. **Capture execution context**
   ```yaml
   execution_context:
     timestamp: "2026-01-13T10:00:00Z"
     node_version: "20.10.0"
     bun_version: "1.0.25"
     random_seed: 42
     environment:
       NEO4J_URI: "bolt://localhost:7687"
       QDRANT_URL: "http://localhost:6333"
   ```

4. **Track all decisions**
   - Use DecisionLearningIntegration
   - Log decision rationale
   - Store with timestamp

### Drift Detection During Execution

After implementing a task, optionally run drift check:

```bash
# Run task 3 times with same input
for i in 1 2 3; do
  ./scripts/run-task.sh task-id > output_$i.txt
done

# Compare outputs
diff output_1.txt output_2.txt
diff output_2.txt output_3.txt
```

Target: 0 differences (perfect determinism)

---

## Progress Tracking Structure

### ANALYSIS-MEMORY.yaml Updates

After each task:

```yaml
task:
  progress_log:
    - timestamp: "2026-01-13T10:00:00Z"
      task_id: "1.1.1"
      action: "VERIFIED"
      summary: "Scope class implemented, 4 tests pass"
      evidence:
        typecheck: "0 errors"
        tests: "4 passed, 0 failed"
        files_created: ["Scope.ts", "Scope.test.ts"]
```

### Phase Completion Checkpoint

After each phase:

```yaml
phases:
  - id: "phase-1"
    name: "Hierarchical Memory"
    status: "COMPLETE"
    completed_at: "2026-01-13T15:00:00Z"
    metrics:
      tasks_completed: 12
      first_pass_rate: 0.83
      test_coverage: 0.87
      verification_pass_rate: 1.0
    evidence:
      integration_test: "PASSED"
      typecheck: "0 errors"
```

---

## Error Handling and Recovery

### Retry Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                     RETRY PROTOCOL                          │
├─────────────────────────────────────────────────────────────┤
│  Attempt 1: Execute as specified                            │
│    └─► On failure: Analyze error, adjust approach           │
│                                                             │
│  Attempt 2: Execute with adjustment                         │
│    └─► On failure: Analyze pattern, try alternative         │
│                                                             │
│  Attempt 3: Execute alternative approach                    │
│    └─► On failure: ESCALATE TO USER                        │
│                                                             │
│  User Resolution:                                           │
│    - Provide guidance                                       │
│    - Modify task specification                              │
│    - Mark as blocked with reason                            │
└─────────────────────────────────────────────────────────────┘
```

### Blocking Issue Protocol

When blocked:

1. Document issue in INTEGRATION-DEPENDENCIES.md
2. Mark task as BLOCKED with reason
3. Continue with next independent task
4. Alert user if critical path blocked

---

## Implementation Checklist

### For rad-engineer-v2 Session

- [ ] Enhance `/execute` skill with validation loops
- [ ] Enhance `/plan` skill with precondition/postcondition
- [ ] Create `/verify-task` skill
- [ ] Update ANALYSIS-MEMORY.yaml template
- [ ] Create phase checkpoint template

### For engg-support-system Session

- [ ] Use same verification protocol
- [ ] Update INTEGRATION-STATUS.md after each phase
- [ ] Capture evidence for all completions
- [ ] Signal rad-engineer-v2 at checkpoints

---

## Quick Reference

### Before Starting Any Task

```bash
# 1. Verify preconditions
cat [task-spec] | grep preconditions

# 2. Check environment
./scripts/verify-local-env.sh

# 3. Create test file first
touch [test-file].test.ts
```

### After Completing Any Task

```bash
# 1. Run verification
bun run typecheck
bun test [relevant-tests]

# 2. Check success criteria
# (manual verification against spec)

# 3. Update progress
# (edit ANALYSIS-MEMORY.yaml or relevant progress file)

# 4. Capture evidence
# (paste command outputs to proof document)
```

### On Phase Completion

```bash
# 1. Run integration tests
bun test test/integration/

# 2. Update phase status
# (edit relevant checkpoint)

# 3. Signal parallel session if applicable
# (update INTEGRATION-STATUS.md)
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-13
**Applies To**: rad-engineer-v2, engg-support-system, any future plans
