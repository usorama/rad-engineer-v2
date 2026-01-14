# UI Integration Memory Management Strategy

> **Purpose**: Define hierarchical memory management for rad-engineer UI integration to prevent context overflow
> **Based On**: CCA (Collaborative Cognitive Architecture) patterns from Meta research
> **Status**: ACTIVE

---

## Memory Hierarchy

### GLOBAL SCOPE (Immutable, ~500 tokens)

**Persists**: Entire project lifetime
**Location**: Loaded at session start, never modified
**Compression**: Never compressed

**Contents**:
```yaml
vision: |
  Autonomous Engineering Platform that can engineer digital solutions from
  ideation to production and beyond, fully autonomously using Claude Code
  and Claude Agent SDK.

ui_integration_goal: |
  Integrate rad-engineer backend (VAC, decision learning, hierarchical memory,
  meta-agent) with Auto-Claude UI (276 React components, Electron, i18n).

architecture_constraints:
  - max_parallel_agents: 2-3
  - quality_gates: "bun test only, flock serialization"
  - context_management: "GLOBAL/TASK/LOCAL scopes, compact at 70%"
  - tdd_protocol: "Write test first, verify with evidence"
  - vac_protocol: "Pre/post conditions, invariants per story"

integration_context:
  auto_claude_ui:
    status: "EXISTING (276 components, React 19.2.3)"
    location: "workspaces/Auto-Claude/apps/frontend/"

  rad_engineer_backend:
    status: "EXISTING (19 modules, 36K LOC, 91% complete)"
    location: "rad-engineer/src/"

critical_issue:
  initialization_bug: "Button at GeneralSettings.tsx:65 fails silently"
  rebrand_needed: "127+ 'Auto-Claude' references throughout codebase"
  ui_missing: "0% rad-engineer features exposed in UI"
```

**Token Budget**: 500 tokens
**Retrieval**: Always available via `docs/platform-foundation/UI-INTEGRATION-MEMORY-STRATEGY.md`

---

### TASK SCOPE (Persistent per wave, ~2K tokens)

**Persists**: Duration of current wave (2-3 days typically)
**Location**: Memory-keeper MCP (category: "task")
**Compression**: Compress when > 2K tokens (summarize completed stories)

**Contents**:
```yaml
current_wave:
  id: 1
  title: "Critical Bug Fix"
  duration: "2 days"
  agents: 1
  status: "IN_PROGRESS"

stories_in_wave:
  - story_id: 1
    title: "Fix Initialization Button Error Feedback"
    status: "IN_PROGRESS"
    files_modified: []
    tests_written: []

current_story:
  id: 1
  title: "Fix Initialization Button Error Feedback"
  tasks:
    - task_id: "1.1"
      description: "Add useToast hook and error display"
      status: "pending"
    - task_id: "1.2"
      description: "Add success toast to useProjectSettings"
      status: "pending"

contracts:
  story_1:
    preconditions: ["GeneralSettings.tsx exists", "useProjectSettings exists"]
    postconditions: ["Error toast displays", "Success toast displays"]
    invariants: ["Button loading state works", "Error cleared after toast"]

progress_summary: |
  Wave 1, Story 1: Starting TDD protocol
  - Read preconditions: VERIFIED
  - Writing test file: IN_PROGRESS
```

**Token Budget**: 2K tokens
**Compression Trigger**: When TASK scope exceeds 2K, compress old stories
**Compression Strategy**:
  - Keep: Current story, current tasks, contract
  - Summarize: Completed stories (1-line summary each)
  - Discard: Old task details, intermediate file reads

**Save Frequency**:
  - After each task completes: `mcp__memory-keeper__context_save(category="task")`
  - After story completes: `mcp__memory-keeper__context_save(category="progress")`
  - Before checkpoint: `mcp__memory-keeper__context_checkpoint()`

---

### LOCAL SCOPE (Ephemeral, ~5K tokens)

**Persists**: Current operation only (minutes to hours)
**Location**: Active conversation context
**Compression**: Discard after use, re-read if needed

**Contents**:
```yaml
immediate_context:
  current_file: "apps/frontend/.../GeneralSettings.tsx"
  file_contents: |
    [Full file contents loaded for editing]

  test_output: |
    [Last test run output]

  compilation_errors: |
    [TypeScript errors from last typecheck]

  tool_outputs:
    grep_results: [...]
    glob_results: [...]
    bash_output: [...]

working_memory:
  decision: "Need to add useToast hook to GeneralSettings"
  reasoning: "Error is set but never displayed to user"
  next_action: "Import useToast, add useEffect for error display"
```

**Token Budget**: 5K tokens
**Compression Trigger**: When LOCAL scope exceeds 5K tokens
**Compression Strategy**:
  - Extract key findings (error messages, decisions made)
  - Move to TASK scope as summary
  - Discard raw outputs (can be re-read)
  - Keep only: Next action, current decision

**Discard Policy**:
  - After task completes: Discard all LOCAL context
  - After file modification: Discard file contents (file exists on disk)
  - After test pass: Discard test output (keep only: PASS/FAIL status)

---

## Token Budget Allocation

| Scope | Budget | Usage | Management |
|-------|--------|-------|------------|
| GLOBAL | 500 | 100% (always loaded) | Never compressed |
| TASK | 2,000 | 40-60% | Compress old stories |
| LOCAL | 5,000 | 70-90% | Discard after use |
| **Total** | **7,500** | **~ 50% of 15K window** | Leaves 7.5K for tool use |

**Why 50% utilization?**:
- Tool use requires tokens (Read files, Bash output, Grep results)
- Agent responses require tokens (generated code, explanations)
- Buffer for unexpected context (error messages, logs)

---

## Compression Triggers

### Automatic Triggers

1. **LOCAL > 5K tokens**:
   - Action: Extract key findings → TASK scope
   - Discard: Raw file contents, tool outputs
   - Example: After reading 10 files for research

2. **TASK > 2K tokens**:
   - Action: Summarize completed stories (1-line each)
   - Keep: Current story, contracts, progress
   - Example: After completing 3 stories in a wave

3. **Total context > 70%** (via `/context` command):
   - Action: `/compact Keep: current story, test status, contract`
   - Summarize: Everything else
   - Example: After processing 15+ files in one story

### Manual Triggers

4. **Between waves**:
   - Action: `/clear` (reset all context)
   - Save: Wave summary to memory-keeper before clearing
   - Load: Next wave info from GLOBAL scope

5. **Before risky operations** (rebrand, bulk replace):
   - Action: `mcp__memory-keeper__context_checkpoint()`
   - Creates: Snapshot of current state
   - Recovery: Can restore if operation fails

---

## Example: Story 1 Execution

### Step 1: Story Start (GLOBAL + TASK loaded)

**Context Breakdown**:
- GLOBAL: 500 tokens (vision, constraints, issue)
- TASK: 800 tokens (Wave 1, Story 1, contract, tasks)
- LOCAL: 0 tokens (not started yet)
- **Total**: 1,300 tokens (~9% of window)

### Step 2: Read Preconditions (LOCAL grows)

**Actions**:
- Read `GeneralSettings.tsx` (100 lines → ~1K tokens)
- Read `useProjectSettings.ts` (200 lines → ~2K tokens)
- Grep for `useToast` usage (output → 200 tokens)

**Context Breakdown**:
- GLOBAL: 500 tokens
- TASK: 800 tokens
- LOCAL: 3,200 tokens (file contents, grep results)
- **Total**: 4,500 tokens (~30% of window)

### Step 3: Write Test (LOCAL continues to grow)

**Actions**:
- Read test setup: `test/setup.ts` (→ +500 tokens)
- Write test file: `GeneralSettings.test.tsx` (→ +1K tokens)

**Context Breakdown**:
- GLOBAL: 500 tokens
- TASK: 800 tokens
- LOCAL: 4,700 tokens (files + new test code)
- **Total**: 6,000 tokens (~40% of window)

**Decision**: No compression needed yet

### Step 4: Implement Changes (LOCAL at limit)

**Actions**:
- Modify `GeneralSettings.tsx` (→ +300 tokens)
- Run `bun test` (output → +800 tokens)

**Context Breakdown**:
- GLOBAL: 500 tokens
- TASK: 800 tokens
- LOCAL: 5,800 tokens (exceeds 5K limit!)
- **Total**: 7,100 tokens (~47% of window)

**Compression Triggered**:
```yaml
# Extract key findings to TASK
task_update:
  test_status: "FAIL (as expected, TDD)"
  error: "Cannot find name 'useToast'"
  next_action: "Import useToast from hooks"

# Discard from LOCAL
discarded:
  - GeneralSettings.tsx full contents (can re-read)
  - useProjectSettings.ts full contents (can re-read)
  - test/setup.ts contents (not needed anymore)
```

**After Compression**:
- GLOBAL: 500 tokens
- TASK: 1,000 tokens (added test status)
- LOCAL: 1,200 tokens (test output + next action only)
- **Total**: 2,700 tokens (~18% of window)

### Step 5: Fix Implementation

**Actions**:
- Re-read `GeneralSettings.tsx` (only relevant section → 500 tokens)
- Add import and useEffect
- Run `bun test` again (→ +800 tokens)

**Context Breakdown**:
- GLOBAL: 500 tokens
- TASK: 1,000 tokens
- LOCAL: 2,500 tokens (partial file + test output)
- **Total**: 4,000 tokens (~27% of window)

### Step 6: Verify Postconditions (LOCAL cleaned)

**Actions**:
- Run quality gates: `bun run typecheck && bun test` (→ +500 tokens)
- Capture evidence: Save to memory-keeper

**Context Breakdown**:
- GLOBAL: 500 tokens
- TASK: 1,200 tokens (added: "Story 1 COMPLETE")
- LOCAL: 800 tokens (quality gate results only)
- **Total**: 2,500 tokens (~17% of window)

**Save to Memory-Keeper**:
```yaml
category: "progress"
content: |
  Story 1 COMPLETE
  - Files modified: GeneralSettings.tsx, GeneralSettings.test.tsx
  - Tests written: GeneralSettings.test.tsx (4 test cases)
  - Quality gates: PASS (typecheck: 0 errors, test: 100% pass)
  - Evidence: Test output saved
```

**Discard LOCAL**:
- After save: Discard all LOCAL context
- Story complete: Ready for next story

---

## Memory-Keeper MCP Integration

### Session Management

**Start Session**:
```typescript
mcp__memory-keeper__context_session_start({
  name: "rad-engineer-ui-integration",
  description: "6-week UI integration, 16 waves, 30 stories",
  projectDir: "/Users/umasankr/Projects/rad-engineer-v2"
})
```

**Session Channels**:
- Default channel: Auto-derived from git branch (`feature/gap-analysis-v2-atomic-swarm`)
- Custom channels: Wave-based (`wave-1-bug-fix`, `wave-2-rebrand-config`, etc.)

### Context Saves

**After Task**:
```typescript
mcp__memory-keeper__context_save({
  category: "task",
  key: "story-1-task-1.1-complete",
  value: "Added useToast hook to GeneralSettings.tsx",
  priority: "normal"
})
```

**After Story**:
```typescript
mcp__memory-keeper__context_save({
  category: "progress",
  key: "story-1-complete",
  value: "Initialization button now shows error/success toasts",
  priority: "high"
})
```

**After Wave**:
```typescript
mcp__memory-keeper__context_save({
  category: "progress",
  key: "wave-1-complete",
  value: "Critical bug fix: Initialization feedback working",
  priority: "high"
})
```

### Checkpoints

**Before Risky Operations**:
```typescript
mcp__memory-keeper__context_checkpoint({
  name: "before-rebrand",
  description: "Before bulk i18n replacement (127+ files)",
  includeFiles: true,
  includeGitStatus: true
})
```

**Recovery**:
```typescript
// If bulk replace fails
mcp__memory-keeper__context_restore_checkpoint({
  name: "before-rebrand",
  restoreFiles: true
})
```

### Compaction Preparation

**Before /compact**:
```typescript
// CRITICAL: Call this BEFORE running /compact
mcp__memory-keeper__context_prepare_compaction()

// Then run compaction
/compact Keep: current story, test status, contract
```

---

## Wave-Based Context Management

### Wave Start Protocol

1. **Clear previous wave**:
   ```bash
   /clear  # Reset all context
   ```

2. **Load wave info**:
   ```yaml
   # From GLOBAL scope
   current_wave: Wave 2
   stories: [Story 2, Story 3]
   dependencies: None
   ```

3. **Create checkpoint**:
   ```typescript
   mcp__memory-keeper__context_checkpoint({
     name: "wave-2-start",
     description: "Before rebrand configuration"
   })
   ```

### During Wave

**Monitor Context**:
```bash
/context  # Check usage percentage
# If > 70%: /compact
```

**Save Progress**:
```typescript
// After each story
mcp__memory-keeper__context_save({
  category: "progress",
  key: "wave-2-story-2-complete",
  value: "Package configuration updated"
})
```

### Wave End Protocol

1. **Verify completion**:
   - All stories complete
   - Quality gates pass
   - Contracts verified

2. **Save wave summary**:
   ```typescript
   mcp__memory-keeper__context_save({
     category: "progress",
     key: "wave-2-complete",
     value: "Rebrand configuration: package.json + i18n updated",
     priority: "high"
   })
   ```

3. **Create checkpoint**:
   ```typescript
   mcp__memory-keeper__context_checkpoint({
     name: "wave-2-complete",
     description: "Rebrand configuration complete"
   })
   ```

4. **Clear context**:
   ```bash
   /clear  # Ready for Wave 3
   ```

---

## Cross-Session Context Sharing

### Handoff Protocol

**End of Session**:
1. Save current progress: `mcp__memory-keeper__context_save()`
2. Create checkpoint: `mcp__memory-keeper__context_checkpoint(name="session-end")`
3. Export session: `mcp__memory-keeper__context_export(format="json")`

**Start of Next Session**:
1. Start session: `mcp__memory-keeper__context_session_start(continueFrom="<previous-session-id>")`
2. Search history: `mcp__memory-keeper__context_search(query="last completed story")`
3. Load wave info: `mcp__memory-keeper__context_get(key="wave-X-progress")`

---

## Success Metrics

### Token Efficiency

**Target**: < 50% context usage per story
**Measurement**: `/context` output after each story
**Alert**: If > 70%, trigger compression

### Memory-Keeper Usage

**Target**: >= 5 saves per story (tasks + story completion)
**Measurement**: `mcp__memory-keeper__context_status()`
**Alert**: If < 3 saves, risk of losing work

### Checkpoint Coverage

**Target**: 1 checkpoint per wave
**Measurement**: Count checkpoints via `context_status()`
**Alert**: If missing checkpoints, can't recover from failures

---

**Version**: 1.0.0
**Status**: ACTIVE
**Generated**: 2026-01-13
