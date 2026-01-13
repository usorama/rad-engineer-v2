# Unified Workflow: rad-engineer-v2 + engg-support-system

> **Purpose**: Single source of truth for execution workflow across both projects
> **Version**: 1.0.0
> **Created**: 2026-01-13
> **Skill**: Both projects use `/execute` skill

---

## Executive Summary

Both rad-engineer-v2 and engg-support-system use **identical workflows**:
- Same skill: `/execute`
- Same verification protocol: Triple Verification
- Same git workflow: Commit + Checkpoint + Push
- Same metrics: Task completion proof
- Same context sharing: Files + memory-keeper

---

## Shared Skill

Both sessions use: **`/execute`**

Location: `.claude/skills/execute/SKILL.md`

The skill auto-detects which project based on file presence:
- `RAD-ENGINEER-IMPLEMENTATION-PLAN.md` → rad-engineer-v2
- `engg-support-system/IMPLEMENTATION-PLAN.md` → engg-support-system

---

## Unified Execution Protocol

### Every Task in Both Projects

```
1. VALIDATE    → Check preconditions (files, deps, env)
2. CREATE TEST → TDD: Write failing test first
3. EXECUTE     → Implement to pass test
4. VERIFY      → Run typecheck + tests
5. RETRY       → If failed, max 3 attempts
6. CAPTURE     → Evidence + git commit
7. UPDATE      → Progress file + memory-keeper
```

### Every Phase in Both Projects

```
1. Execute all tasks in phase
2. Verify all tasks complete
3. Create git tag: phase-N-complete
4. Create memory-keeper checkpoint
5. Update integration status (if ESS)
6. Push to remote
```

---

## Shared Files (Context Sharing)

| File | Purpose | Updated By |
|------|---------|------------|
| `INTEGRATION-DEPENDENCIES.md` | What rad-engineer needs from ESS | Orchestrator |
| `INTEGRATION-STATUS.md` | ESS phase completion status | ESS session |
| `ANALYSIS-MEMORY.yaml` | Progress tracking | Both sessions |
| `UNIFIED-WORKFLOW.md` | This document (read-only) | Orchestrator |

### Sync Protocol

```bash
# Before starting work (both sessions)
git pull origin main

# After phase completion (both sessions)
git add -A
git commit -m "progress: Phase N complete"
git push origin main

# Check for updates from other session
git fetch origin
git diff origin/main -- docs/platform-foundation/
```

---

## Git Workflow (Identical for Both)

### Branch Strategy

```
main
  └── feature/gap-analysis-v2-atomic-swarm  (current)
         ├── rad-engineer-v2 commits
         └── engg-support-system commits
```

### Commit Message Format

```
type(scope): description

Task: X.Y.Z
Phase: N

- Evidence item 1
- Evidence item 2

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types:
- `feat`: New feature/implementation
- `fix`: Bug fix
- `test`: Test addition
- `refactor`: Code refactoring
- `progress`: Progress update
- `docs`: Documentation

### Checkpoint Tags

```bash
# After each phase
git tag -a "phase-N-complete" -m "Phase N: [description] verified"
git tag -a "ess-phase-N-complete" -m "ESS Phase N verified"  # ESS only
git push --tags
```

---

## Memory-Keeper Usage (Identical for Both)

### Save Progress

```javascript
mcp_context_save({
  category: "progress",
  key: `task-${taskId}-complete`,
  value: JSON.stringify({
    taskId,
    phase,
    timestamp: new Date().toISOString(),
    evidence: {
      typecheck: "0 errors",
      tests: "12 passing",
      files: ["file1.ts", "file2.ts"]
    }
  }),
  priority: "high"
})
```

### Create Checkpoint

```javascript
mcp_context_checkpoint({
  name: `phase-${phaseNumber}-complete`,
  description: `Phase ${phaseNumber}: ${phaseName} verified`,
  includeGitStatus: true
})
```

### Read Progress

```javascript
mcp_context_get({
  category: "progress",
  sort: "created_desc",
  limit: 20
})
```

---

## Quality Gates (Identical for Both)

### rad-engineer-v2

```bash
cd rad-engineer
bun run typecheck  # Must return 0 errors
bun test           # All tests must pass
```

### engg-support-system

```bash
# TypeScript (gateway, knowledge-base)
cd gateway && bun run typecheck && bun test && cd ..

# Python (veracity-engine)
cd veracity-engine && pytest && cd ..
```

### Verification Formula

```
COMPLETE(task) ⟺
  preconditions.all(TRUE)
  ∧ postconditions.all(TRUE)
  ∧ tests.all_pass
  ∧ typecheck.errors = 0
  ∧ evidence.captured
  ∧ git.committed
  ∧ progress.updated
```

---

## Metrics (Identical Format for Both)

### Task Metrics

```yaml
task_metrics:
  project: "rad-engineer-v2"  # or "engg-support-system"
  task_id: "1.1.1"
  phase: 1
  start_time: "2026-01-13T10:00:00Z"
  end_time: "2026-01-13T10:45:00Z"
  duration_minutes: 45
  attempts: 1
  first_pass: true
  verification:
    typecheck_errors: 0
    tests_passing: 12
    tests_total: 12
  evidence:
    files_created: ["Scope.ts", "Scope.test.ts"]
    lines_added: 245
    commit_hash: "abc123"
```

### Phase Metrics

```yaml
phase_metrics:
  project: "rad-engineer-v2"
  phase: 1
  name: "Hierarchical Memory"
  tasks_total: 12
  tasks_complete: 12
  tasks_blocked: 0
  first_pass_rate: 0.83
  verification_pass_rate: 1.0
  git_tag: "phase-1-complete"
  checkpoint: "phase-1-complete"
```

---

## Cross-Session Coordination

### ESS → rad-engineer-v2 Signal

When ESS completes a phase that rad-engineer depends on:

```bash
# ESS session updates INTEGRATION-STATUS.md
## Phase 2: HTTP Gateway
- Status: COMPLETE
- Verified: 2026-01-13 14:30:00
- Endpoints: /health, /query, /projects
- Tests: 15 passing

# ESS commits and pushes
git add docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md
git commit -m "progress: ESS Phase 2 complete - HTTP Gateway ready"
git push origin main
```

### rad-engineer-v2 Checks for ESS

Before starting dependent task:

```bash
# rad-engineer session checks
git pull origin main
grep -A5 "Phase 2" docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md

# If COMPLETE, proceed with Phase 3 (ESS Integration)
# If not, work on independent tasks
```

---

## Error Handling (Identical for Both)

### Retry Protocol

```
Attempt 1: Same approach with error context
Attempt 2: Alternative implementation strategy
Attempt 3: Escalate model or scope

After 3 failures:
- Mark task BLOCKED
- Document reason in progress file
- Continue with independent tasks
- Alert if on critical path
```

### Integration Dependency Blocked

```
If ESS dependency not ready:
1. Log in ANALYSIS-MEMORY.yaml
2. Skip to independent task
3. Set reminder to check later
4. Continue progress on non-blocked work
```

---

## Session Startup Checklist

### Both Sessions

```markdown
□ Read UNIFIED-WORKFLOW.md (this file)
□ Read PLAN-EXECUTION-DETERMINISM.md
□ Read INTEGRATION-DEPENDENCIES.md
□ Read relevant IMPLEMENTATION-PLAN.md
□ Run: git pull origin main
□ Run: mcp_context_get(category: "progress")
□ Identify next task to execute
□ Verify preconditions
□ Begin execution with /execute
```

### rad-engineer-v2 Specific

```markdown
□ Read RAD-ENGINEER-IMPLEMENTATION-PLAN.md
□ Check engg-support-system/INTEGRATION-STATUS.md for dependencies
□ Execute Phase 1-2 (independent) or Phase 3+ (if ESS ready)
```

### engg-support-system Specific

```markdown
□ Read engg-support-system/IMPLEMENTATION-PLAN.md
□ Prioritize P0 items (rad-engineer dependencies)
□ Update INTEGRATION-STATUS.md after each phase
□ Push immediately after P0 phases complete
```

---

## Completion Criteria

### Session Complete When

```markdown
□ All tasks in current phase verified
□ All evidence captured
□ All git commits made
□ All progress files updated
□ Memory-keeper checkpoint created
□ Git tag created and pushed
□ Integration status updated (if ESS)
□ Next session can resume without context
```

---

**Version**: 1.0.0
**Last Updated**: 2026-01-13
**Applies To**: rad-engineer-v2, engg-support-system
**Skill**: /execute
