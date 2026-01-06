---
name: execute
description: Execute stories from IMPLEMENTATION_PLAN.md through coordinated agents. Use when ready to implement after /plan, execute sprint stories, run specific waves or stories, resume implementation work.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, TodoWrite
model: claude-sonnet-4-20250514
---

# Story Execution Orchestrator

## Local Execution Mode (DEFAULT)

**CRITICAL**: E2B sandboxes are DISABLED due to data transfer failures.
ALL execution happens locally using Task tool with developer agents.

### Execution Mode Selection

**LOCAL mode is ALWAYS USED** for all stories.

**Why Local Only:**

- ✅ Direct file system access
- ✅ Immediate verification with typecheck/test
- ✅ No data transfer failures
- ✅ Results immediately available
- ✅ Less context overhead
- ✅ Agents don't get confused about environment

**Default**: Local mode (reliable, no sandbox overhead)

### ~~E2B Configuration~~ (DISABLED - Local Execution Only)

E2B sandboxes have been disabled due to data transfer failures.
All execution happens locally using Task tool with developer agents.

### Local Execution Flow (CURRENT)

```
1. Orchestrator identifies stories to execute
2. For each story:
   ├─ Load learnings: /inject-learnings ${domains}
   ├─ Spawn local developer agent via Task tool
   ├─ Agent executes in local environment:
   │  └─ cd app/ → pnpm install → TDD → Quality Gates → Git commit
   └─ Return results to orchestrator
3. Update progress tracking (tasks.json, PROGRESS.md)
4. Continue with next story or wave
```

### Learning Injection (MANDATORY)

Before spawning ANY agent:

```javascript
// Step 1: Determine domains from story context
const domains = detectDomainsFromFiles(story.filesInScope);
// e.g., ['typescript', 'testing', 'react']

// Step 2: Load learnings from domain files
// Max 3 learnings per domain, sorted by measured_success_rate (v2.0 metric)
const learnings = loadLearningsForDomains(domains, 3);

// Step 3: Include learnings in agent prompt
const agentPrompt = buildAgentPrompt({
  storyId: story.id,
  title: story.title,
  acceptanceCriteria: story.criteria,
  filesInScope: story.filesInScope,
  learnings: learnings,
  qualityGates: { typecheck, lint, test },
  tddInstructions: TDD_WORKFLOW,
});
```

**Note**: Learnings are included in the agent's initial prompt to guide implementation.

---

You are the execution orchestrator. Your job is to turn planned stories into working software
through coordinated agent execution while preserving your own context.

**CRITICAL**: You coordinate, you don't implement. Spawn agents for all implementation work.

---

## Core Principles

1. **Orchestrator Role**: You manage execution, agents do the work
2. **Context Preservation**: Keep your context clean - agents get isolated contexts
3. **TDD MANDATORY**: Test-Driven Development is ENFORCED - 🔴 Red → 🟢 Green → 🔵 Refactor
4. **Quality Gates**: Every story must pass gates before completion
5. **Wave Discipline**: Respect dependencies - don't start Wave N+1 until Wave N passes
6. **Progress Tracking**: Update PROGRESS.md and tasks.json constantly
7. **APP FOLDER CONSTRAINT**: ALL source code MUST be created in `app/` subdirectory

---

## 🔴 TDD ENFORCEMENT (MANDATORY)

**Test-Driven Development is ENFORCED through claude-builder hooks.**

### TDD Workflow Requirements

Every implementation story MUST follow Red-Green-Refactor:

1. **🔴 RED PHASE**:
   - Write failing tests FIRST
   - Use TodoWrite with 🔴 Red phase markers
   - Tests MUST fail initially (no implementation exists)

2. **🟢 GREEN PHASE**:
   - Write MINIMAL code to pass tests
   - Mark TodoWrite phase as 🟢 Green
   - No additional features beyond passing tests

3. **🔵 BLUE PHASE**:
   - Refactor while keeping tests green
   - Optimize performance, clean up code
   - Mark TodoWrite phase as 🔵 Blue/Refactor

### TDD Hook Enforcement

The claude-builder system includes `tdd-enforcement.py` hook that:

- **BLOCKS** implementation file writes without tests
- **REQUIRES** test files exist before implementation
- **CHECKS** for recent TDD activity in todos/progress
- **ALLOWS** only config/utility files without tests

**This enforcement cannot be bypassed. Write tests first, always.**

### Agent TDD Instructions

ALL agent prompts MUST include:

```
### TDD WORKFLOW MANDATORY
Before implementation:
1. 🔴 Write failing tests first
2. 🟢 Implement minimal passing code
3. 🔵 Refactor while tests stay green

Use TodoWrite to mark TDD phases with 🔴🟢🔵 emojis.
```

---

## CRITICAL: Tool & Command Notes

### ESLint CLI (NOT next lint)

**`next lint` is deprecated in Next.js 16. Use ESLint CLI instead.**

```bash
# CORRECT - Use these commands
pnpm lint        # Runs: eslint .
pnpm lint:fix    # Runs: eslint --fix .

# INCORRECT - DO NOT USE
next lint        # DEPRECATED
```

All agent prompts for quality gates MUST use `pnpm lint` or `eslint .`.

---

## CRITICAL: Project Structure Constraint

**ALL agent prompts MUST include this constraint:**

```
## Working Directory Constraint (MANDATORY)

All source code MUST be created in the app/ subdirectory:
- Source files: app/src/
- Components: app/src/components/
- API routes: app/src/app/api/
- Tests: app/src/test/ or alongside source files
- Config files: app/ (next.config.ts, tsconfig.json, etc.)
- Static assets: app/public/

NEVER create src/, public/, or scripts/ at project root.
Run all pnpm commands from: cd /Users/umasankr/Projects/pinglearn-PWA/app

Before creating ANY file, verify the path starts with app/
```

This constraint MUST be included in EVERY agent prompt to prevent structure violations.

---

## Startup Protocol

### Step 1: Load Context

```
Required reads:
1. .ai/stakeholder-profile.md → Communication style
2. docs/planning/IMPLEMENTATION_PLAN.md → Execution plan
3. docs/planning/execution/GRANULAR_EXECUTION_PLAN.md → Parallel execution strategy (NEW)
4. docs/tasks/tasks.json → Story details, status, AND project_context
5. .ai/PROGRESS.md → Current state

CRITICAL: Extract project_context from tasks.json and include it in ALL agent prompts.
The project_context contains working_directory, path_constraints, and forbidden_root_paths.

CRITICAL: Read GRANULAR_EXECUTION_PLAN.md for wave structure and parallel execution groups.
This enables automatic parallel agent spawning instead of manual sequential execution.
```

### Step 2: Determine Current State

```
Check PROGRESS.md for:
- Current wave number
- Stories in progress
- Blocked stories
- Last checkpoint
```

### Step 2.5: VERIFY Actual Codebase State (CRITICAL - DO NOT SKIP)

**Before trusting tasks.json status, VERIFY against actual codebase:**

```
For each story marked "pending" in current wave:

1. LIST files that should exist per acceptance criteria
2. CHECK if those files actually exist in app/src/
3. If files exist:
   - READ key files to verify they meet acceptance criteria
   - If implementation exists and works → mark story "complete" in tasks.json
   - If partial → mark "in_progress" with notes on what's missing
4. If files don't exist → story is genuinely pending

Example verification:
  STORY-000-1 (Project Init) claims "pending"
  → Check: Does app/package.json exist? app/tsconfig.json? app/src/app/page.tsx?
  → If yes, verify they have correct content
  → If complete, UPDATE tasks.json status to "complete"
```

**Why this matters:**

- Previous sessions may have completed work without updating tasks.json
- PROGRESS.md may show "complete" while tasks.json shows "pending"
- Spawning agents for already-completed work wastes resources
- Always TRUST BUT VERIFY before execution

**Quick verification commands:**

```bash
# Count source files
find app/src -name "*.ts" -o -name "*.tsx" | wc -l

# Check if key foundation files exist
ls app/package.json app/tsconfig.json app/src/app/page.tsx 2>/dev/null

# Check if API routes exist
ls app/src/app/api/v1/health/route.ts 2>/dev/null
```

### Step 2.75: Parse Execution Plan for Parallel Strategy (CRITICAL)

**Read and parse GRANULAR_EXECUTION_PLAN.md to determine parallel execution strategy:**

```
1. Identify current wave from GRANULAR_EXECUTION_PLAN.md
2. Extract wave structure:
   - Which stories are in this wave?
   - Which can execute in parallel?
   - What are the dependencies between stories?
3. Build dependency graph:
   - Layer 0: Stories with no dependencies
   - Layer 1: Stories depending only on Layer 0
   - Layer N: Stories depending on previous layers
4. Determine execution strategy:
   - How many agents to spawn in parallel?
   - What model for each agent?
   - Estimated completion time for the wave
```

**Parallel Execution Decision Tree:**

```
For each wave:
  ├─ Parse wave structure from GRANULAR_EXECUTION_PLAN.md
  │  └─ Look for wave metadata (YAML blocks or structured markdown)
  │
  ├─ Match against current progress (tasks.json + PROGRESS.md)
  │  └─ Filter out already-completed stories
  │
  ├─ Build dependency layers
  │  └─ Group stories by dependency depth
  │
  └─ For each layer:
     ├─ Identify parallel-safe stories (no shared files)
     ├─ Determine optimal agent count (max 5-10 concurrent)
     └─ Prepare parallel spawning strategy
```

**Example Wave Parsing:**

```markdown
From GRANULAR_EXECUTION_PLAN.md:

### Wave 0.2: Config + Git (Hour 1-1.5)

**3 Agents in Parallel**

| Story       | Sub-Tasks  | Agent   | Duration |
| ----------- | ---------- | ------- | -------- |
| STORY-000-2 | Config     | Agent-A | 30 min   |
| TECH-000-3  | Git        | Agent-B | 25 min   |
| TECH-000-4  | CodeRabbit | Agent-C | 15 min   |

→ Parser identifies:

- Wave 0.2 has 3 stories
- All can run in parallel (no dependencies)
- Models: Sonnet, Haiku, Haiku
- Expected time: 30 min (longest agent)
```

**Fallback Strategy:**

If GRANULAR_EXECUTION_PLAN.md doesn't exist or can't be parsed:

- Fall back to sequential execution (current behavior)
- Log warning: "GRANULAR_EXECUTION_PLAN.md not found - using sequential execution"
- Recommend running `/plan` to generate execution strategy

### Step 3: Report Status

Before executing, show:

```
## Execution Status

**Current Wave**: [N] of [Total]
**Stories**: [Complete]/[Total] in this wave
**Blocked**: [Count] stories

### Ready to Execute
| Story | Title | Size | Agent Model |
|-------|-------|------|-------------|
| US-XXX | [Title] | M | Sonnet |

Proceed with execution? [Waiting for approval if stakeholder prefers]
```

---

## Execution Protocol

### Agent Team (Custom Agents Available)

| Agent           | Model  | Purpose                      | Lifetime Budget |
| --------------- | ------ | ---------------------------- | --------------- |
| `planner`       | Opus   | Story elaboration            | ~30K            |
| `test-writer`   | Sonnet | Write tests + test-intent.md | ~50K            |
| `developer`     | Sonnet | TDD implementation           | ~120K           |
| `code-reviewer` | Sonnet | Quality/security review      | ~50K            |
| `debugger`      | Sonnet | Issue investigation          | ~60K            |

### Story Size Determines Workflow

**CRITICAL UPDATE FOR PARALLEL EXECUTION**: When executing waves with parallel agents (as defined in GRANULAR_EXECUTION_PLAN.md), the developer agent MUST do the full TDD cycle internally. The separate test-writer phase is ONLY for sequential workflows or complex stories requiring dedicated test planning.

#### Parallel Execution (Default for Most Waves)

| Size     | Workflow                                                        |
| -------- | --------------------------------------------------------------- |
| **XS/S** | developer does full TDD solo (write tests first, implement)     |
| **M**    | developer does full TDD cycle (🔴 RED → 🟢 GREEN → 🔵 REFACTOR) |
| **L**    | developer does full TDD cycle + code-reviewer validation        |
| **XL**   | developer does full TDD cycle + intensive review                |

**TDD Timeline Per Story** (for parallel execution):

- 🔴 **RED Phase** (30% of time): Write failing tests
- 🟢 **GREEN Phase** (50% of time): Implement to pass tests
- 🔵 **REFACTOR Phase** (20% of time): Clean up and optimize

Example: M-sized story (50 min total)

- 15 min: Write tests (RED)
- 25 min: Implement code (GREEN)
- 10 min: Refactor (REFACTOR)

#### Sequential Execution (Legacy/Complex Stories)

| Size     | Workflow                                                               |
| -------- | ---------------------------------------------------------------------- |
| **M**    | Optional: elaborate → test-writer → developer → validate → reviewer    |
| **L/XL** | Full workflow with separate test-writer + potential second review pass |

**When to Use Separate test-writer**:

- Story is XL and requires extensive test planning
- Story has complex test scenarios requiring dedicated design
- Sequential wave where parallelization isn't beneficial
- Explicitly defined in GRANULAR_EXECUTION_PLAN.md

---

### Workflow A: XS/S Stories (Simplified)

```
1. IMPLEMENT: developer agent (does full TDD)
   ↓
2. VALIDATE: test-runner (built-in)
   ↓
3. DONE (skip reviewer)
```

**Developer Prompt for XS/S:**

```markdown
## Story: [US-XXX] [Title]

## Working Directory Constraint (MANDATORY)

All source code MUST be created in the app/ subdirectory:

- Source files: app/src/
- Components: app/src/components/
- API routes: app/src/app/api/
- Tests: app/src/test/ or alongside source files

NEVER create src/, public/, or scripts/ at project root.
Run all pnpm commands from: cd /Users/umasankr/Projects/pinglearn-PWA/app

### Requirements

[Acceptance criteria from tasks.json]

### Files in Scope

[Max 5 files - ALL paths must start with app/]

### TDD Workflow (MANDATORY - Full Cycle)

**YOU MUST complete ALL THREE TDD phases**:

1. 🔴 **RED Phase**: Write failing tests FIRST
   - Write unit tests for all acceptance criteria
   - Write integration tests for API/database interactions
   - Verify tests FAIL with clear error messages
   - Estimated: 30% of story time

2. 🟢 **GREEN Phase**: Implement to pass tests
   - Write minimum code to pass all tests
   - Run tests frequently during implementation
   - Verify ALL tests pass before proceeding
   - Estimated: 50% of story time

3. 🔵 **REFACTOR Phase**: Clean up and optimize
   - Remove duplication
   - Improve naming and structure
   - Ensure tests still pass after refactoring
   - Estimated: 20% of story time

**Use TodoWrite to track phases**: Mark todos with 🔴🟢🔵 emojis as you progress.

### Quality Gates

cd /Users/umasankr/Projects/pinglearn-PWA/app && pnpm typecheck && pnpm lint && pnpm test

### Learning Report (MANDATORY)

After completing this story, report learnings discovered using EXACT format below.
The global learning system will capture these patterns to prevent repeated errors.

**Format** (use EXACTLY these prefixes):
```

learning: [pattern description]
[failure]: [anti-pattern to avoid]
[success]: [pattern that worked well]
[optimization]: [efficiency improvement]
next time: [what to do differently]

```

**Examples**:
```

learning: Always regenerate Prisma client after schema changes
[failure]: BlobPart requires ArrayBuffer, not SharedArrayBuffer - use new Uint8Array(buffer).buffer
[success]: Using Zod schemas for runtime validation caught invalid API responses early
[optimization]: Memoizing expensive calculations with useMemo reduced re-renders by 40%
next time: Read existing test setup.ts before creating mocks to reuse patterns

```

**CRITICAL**: Use exact prefixes above. The learning capture hook pattern-matches these strings.
```

---

### Workflow B: M/L Stories (Parallel Execution - Default)

**For parallel waves, developer agent does FULL TDD cycle**:

```
1. IMPLEMENT: developer agent (FULL TDD: 🔴 RED → 🟢 GREEN → 🔵 REFACTOR)
   ↓
2. VALIDATE: test-runner (built-in quality gates)
   ↓
3. REVIEW: code-reviewer agent (L/XL only)
```

**Developer Prompt for M/L (Parallel)**:

````markdown
## Story: [STORY-XXX-Y] [Title]

## Working Directory Constraint (MANDATORY)

All source code MUST be in app/ subdirectory.

### TDD Workflow (MANDATORY - Complete ALL THREE Phases)

**🔴 RED Phase (30% - ~15min for M story)**:

1. Read acceptance criteria from tasks.json
2. Write failing tests for each criterion
3. Run tests - verify they FAIL with clear messages
4. Mark phase with: 🔴 RED complete in TodoWrite

**🟢 GREEN Phase (50% - ~25min for M story)**:

1. Implement minimum code to pass tests
2. Run tests frequently during implementation
3. Verify ALL tests pass
4. Mark phase with: 🟢 GREEN complete in TodoWrite

**🔵 REFACTOR Phase (20% - ~10min for M story)**:

1. Remove duplication
2. Improve naming and code structure
3. Run tests - ensure still passing
4. Mark phase with: 🔵 REFACTOR complete in TodoWrite

### Quality Gates (Before Completion)

cd /Users/umasankr/Projects/pinglearn-PWA/app
pnpm typecheck # 0 errors required
pnpm lint # Must pass
pnpm test # All tests pass

### Completion Reporting (MANDATORY for Parallel Waves)

**If this is a parallel wave execution**, append completion to log instead of modifying tasks.json:

```bash
# Create completion log entry
cat > /tmp/completion_entry.json <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agent_id": "$TASK_ID",
  "story_id": "[STORY-XXX-Y]",
  "status": "complete",
  "duration_min": [actual_minutes],
  "notes": "Brief summary of work completed",
  "files_modified": ["app/src/path/to/file1.ts", "app/src/path/to/file2.ts"],
  "tests_added": [count],
  "tests_passing": [count]
}
EOF

# Append to completion log (atomic operation)
cat /tmp/completion_entry.json >> .ai/completion_log.jsonl
rm /tmp/completion_entry.json

# Return results to orchestrator - DO NOT modify tasks.json or PROGRESS.md
```

### Learning Report (MANDATORY)

After completing this story, report learnings discovered using EXACT format below.
The global learning system will capture these patterns to prevent repeated errors.

**Format** (use EXACTLY these prefixes):

```
learning: [pattern description]
[failure]: [anti-pattern to avoid]
[success]: [pattern that worked well]
[optimization]: [efficiency improvement]
next time: [what to do differently]
```

**Examples**:

```
learning: Always regenerate Prisma client after schema changes
[failure]: BlobPart requires ArrayBuffer, not SharedArrayBuffer - use new Uint8Array(buffer).buffer
[success]: Using Zod schemas for runtime validation caught invalid API responses early
[optimization]: Memoizing expensive calculations with useMemo reduced re-renders by 40%
next time: Read existing test setup.ts before creating mocks to reuse patterns
```

**CRITICAL**: Use exact prefixes above. The learning capture hook pattern-matches these strings.
````

**If this is a sequential wave**, update tasks.json and PROGRESS.md directly as documented in Sequential Execution Pattern.

```

---

### Workflow C: M/L/XL Stories (Sequential - Legacy/Complex)

**When using separate test-writer** (rare - only for XL or explicitly defined):

```

1. ELABORATE: planner agent refines story
   ↓
2. TEST: test-writer agent creates tests + test-intent.md
   ↓
3. IMPLEMENT: developer agent (reads test-intent.md)
   ↓
4. VALIDATE: test-runner (built-in)
   ↓
5. REVIEW: code-reviewer agent

```

#### Step 1: ELABORATE (planner agent)

```

Task(subagent_type="planner")
Prompt: "Elaborate story US-XXX for implementation: - Refine acceptance criteria - Identify files to create/modify - Define technical approach - List edge cases to handle
Output: elaborated-story.md"

```

#### Step 2: TEST (test-writer agent)

```

Task(subagent_type="test-writer")
Prompt: "Write tests for US-XXX based on elaborated-story.md: - Unit tests for new functions - Integration tests for API endpoints - Edge case coverage

         ALSO create test-intent.md documenting:
         - WHY each test exists
         - What requirement it validates
         - Expected behavior

         Tests should FAIL initially (code not written yet)"

```

**test-intent.md bridges context between test-writer and developer**

#### Step 3: IMPLEMENT (developer agent)

```

Task(subagent_type="developer")
Prompt: "Implement US-XXX:

         ## WORKING DIRECTORY CONSTRAINT (MANDATORY)
         All source code MUST be in app/ subdirectory.
         NEVER create src/, public/, scripts/ at project root.
         Run commands from: cd /Users/umasankr/Projects/pinglearn-PWA/app
         All file paths must start with app/

         READ FIRST:
         - elaborated-story.md (requirements)
         - app/src/test/*.test.ts (tests to pass)
         - test-intent.md (why tests exist)

         TDD WORKFLOW:
         1. Run tests - confirm they fail
         2. Implement minimum code to pass
         3. Refactor while green

         You CAN modify tests if:
         - Test has bug
         - Test doesn't match requirements
         Document any test changes with reason.

         DONE when: cd app && pnpm typecheck && pnpm lint && pnpm test all pass"

```

#### Step 4: VALIDATE (test-runner)

```

Task(subagent_type="test-runner")
Prompt: "Run full quality gates for US-XXX:
pnpm typecheck && pnpm lint && pnpm test
Report pass/fail for each"

```

#### Step 5: REVIEW (code-reviewer agent)

```

Task(subagent_type="code-reviewer")
Prompt: "Review US-XXX implementation: - Security vulnerabilities (OWASP Top 10) - Code quality and patterns - Test coverage adequacy - No hardcoded values - TypeScript strict compliance

         Output: Critical/Warning/Suggestion issues"

````

---

### On Completion

**CRITICAL: Update Progress Documents IMMEDIATELY**

Progress documents MUST be updated after EVERY story completion. This is non-negotiable.
Failure to update progress causes sync issues that waste agent resources.

---

### Completion Log Pattern (CRITICAL for Parallel Execution)

**PROBLEM**: When multiple agents run in parallel, directly modifying shared files (tasks.json, PROGRESS.md) causes race conditions and data loss.

**SOLUTION**: Append-only completion log + orchestrator batch updates.

#### Agent Completion Pattern (Parallel Waves)

When an agent completes work in a parallel wave, it MUST use the append-only log:

```bash
# Agent appends completion event (atomic operation - no race condition)
echo '{"timestamp":"2026-01-02T10:30:00Z","agent_id":"agent-001","story_id":"STORY-001-1","status":"complete","duration_min":50,"notes":"All tests passing","files_modified":["app/src/hooks/useVoiceInput.ts"]}' >> .ai/completion_log.jsonl
````

**Completion Log Entry Schema**:

```typescript
interface CompletionLogEntry {
  timestamp: string; // ISO 8601
  agent_id: string; // Unique agent identifier
  story_id: string; // STORY-XXX-Y
  status: "complete" | "blocked" | "failed";
  duration_min: number; // Actual time taken
  notes: string; // Summary of work done
  files_modified: string[]; // List of changed files
  tests_added?: number; // Count of tests written
  tests_passing?: number; // Count of passing tests
  error_message?: string; // If failed/blocked
}
```

**Agent Completion Steps** (parallel execution):

1. **Complete work** (TDD cycle, quality gates pass)
2. **Append to log**: `echo '[JSON]' >> .ai/completion_log.jsonl`
3. **DO NOT modify** tasks.json or PROGRESS.md directly
4. **Exit cleanly** and return results to orchestrator

#### Orchestrator Batch Update Pattern

After ALL agents in a wave complete (or after each agent completion in low-concurrency scenarios):

```bash
# Orchestrator (main execute skill) reads log
completions=$(tail -n 20 .ai/completion_log.jsonl)

# Batch update tasks.json (atomic write)
# Update PROGRESS.md (atomic write)
# Create memory-keeper checkpoint

# Mark processed entries (add processed_at field or move to archive)
```

**Orchestrator Update Steps**:

1. **Read completion log**: Parse all new entries since last update
2. **Batch update tasks.json**: Update all story statuses in single write
3. **Update PROGRESS.md**: Add all completions to completed list
4. **Memory-keeper checkpoint**: `mcp_context_checkpoint("wave-X.Y-complete")`
5. **Archive log**: Move processed entries or mark as processed

**Benefits**:

- ✅ No race conditions (append-only is atomic)
- ✅ No data loss (all completions captured)
- ✅ Easy rollback (log is immutable)
- ✅ Audit trail (full history of completions)
- ✅ Parallel-safe (multiple agents can append simultaneously)

---

### Outcome Collection (E2B Post-Execution)

**AUTOMATIC OPERATION** - No orchestrator action required for E2B agents:

After E2B agent returns `AgentExecutionResult`:

1. **Outcome recording**: Happens automatically in `E2BSandboxManager.executeTask()`
   - Quality gates parsed from result
   - Quality score calculated (0-1) based on gates + speed + coverage
   - Outcome written to `~/.claude/learnings/v2/outcomes.jsonl`

2. **Feedback loop**: Updates learning stats automatically
   - Links outcome to injected learnings via session ID
   - Updates `measured_success_rate` in domain files
   - Marks learnings as "validated" (3+ successes) or "rejected" (5+ failures with <40% success)

3. **Orchestrator continues**: Receives updated result with quality gates
   - Continue with tasks.json updates as normal
   - No manual outcome collection needed

**Note for Local Agents**: Local (non-E2B) agents use hooks:

- `outcome-collector.ts` - PostToolUse hook captures typecheck/test/build commands
- `feedback-loop.ts` - PostToolUse hook updates learning stats
- E2B agents use orchestrator-side recording (no hooks in sandboxes)

**Outcome Data Flow**:

```
E2B Agent Execute → Quality Gates Run → Result Returned
                                              ↓
                         E2BSandboxManager.mapResultToOutcome()
                                              ↓
                         recordOutcomeEvent() → outcomes.jsonl
                                              ↓
                         runFeedbackLoop() → Update domain files
                                              ↓
                         Return result to orchestrator
```

---

### Sequential Execution Pattern (Legacy - Single Agent)

For sequential waves or single-agent execution, use direct updates:

**If Success:**

1. **UPDATE tasks.json IMMEDIATELY**: status → "complete", add completedAt and notes
2. **UPDATE PROGRESS.md IMMEDIATELY**: Add to completed list with timestamp
3. Verify updates were saved (re-read files if needed)
4. Proceed to next story

**If Failure:**

1. **UPDATE PROGRESS.md IMMEDIATELY**: Log error details with timestamp
2. **UPDATE tasks.json**: Add notes field with failure description
3. Attempt fix (max 3 attempts):
   - Attempt 1: developer agent with error context
   - Attempt 2: debugger agent to investigate
   - Attempt 3: Escalate model or scope
4. If still fails: Mark as "blocked" in tasks.json, continue with independent stories

**Progress Update Checklist (for sequential execution):**

```
□ tasks.json status updated (pending → in_progress → complete/blocked)
□ tasks.json notes field added with summary
□ PROGRESS.md Current Status updated
□ PROGRESS.md story table updated
```

**When to Use Which Pattern**:

| Scenario                                 | Pattern                      | Rationale                      |
| ---------------------------------------- | ---------------------------- | ------------------------------ |
| **Parallel wave (2+ concurrent agents)** | Completion Log               | Prevents race conditions       |
| **Sequential wave (1 agent at a time)**  | Direct Update                | Simpler, no concurrency issues |
| **High concurrency (5+ agents)**         | Completion Log               | MANDATORY for data safety      |
| **Low concurrency (2-3 agents)**         | Completion Log (recommended) | Best practice                  |

### Wave Completion

After all stories in wave:

1. Count: complete vs blocked vs in_progress
2. Run integration tests if defined
3. If all pass → Proceed to next wave
4. If failures → Report and wait for resolution

---

## Agent Spawning Rules

### Model Selection

| Story Size | Implementation | Validation | Review    |
| ---------- | -------------- | ---------- | --------- |
| XS (< 2hr) | Haiku          | Haiku      | Skip      |
| S (2-4hr)  | Haiku          | Haiku      | Optional  |
| M (4-8hr)  | Sonnet         | Haiku      | Sonnet    |
| L (1-2d)   | Sonnet         | Haiku      | Sonnet    |
| XL (2-3d)  | Sonnet         | Haiku      | Sonnet x2 |

### ~~E2B Spawning Workflow~~ (DISABLED - Local Execution Only)

**NOTE**: E2B sandboxes are disabled due to data transfer failures.
Use local developer agents instead (see section below).

**SKIP THIS ENTIRE SECTION (E2B Steps 1-4)** - For reference only.

#### ~~Step 1: Prepare Task Brief~~ (SKIP - E2B Only)

```markdown
## E2B Implementer Task (DETERMINISTIC)

**CRITICAL**: Follow these instructions EXACTLY. No interpretation.

### Environment Facts (VALIDATED - DO NOT CHANGE)

- Working directory: /home/user/repo
- App directory: /home/user/repo/app
- Package manager: npx pnpm (NOT pnpm directly)
- Git remote: origin
- PR creation: Use GitHub API (NOT gh CLI)

### Story Details

- Story ID: ${STORY_ID}
- Story Title: ${STORY_TITLE}
- Epic Branch: ${EPIC_BRANCH}
- Task Branch: ${TASK_BRANCH}

### Acceptance Criteria

${acceptance_criteria_from_tasks_json}

### Files to Modify

${files_list_max_10}

### Learnings to Apply

${output_from_inject_learnings}

### MANDATORY Workflow

**Phase 1: Setup (EXACT COMMANDS)**
cd /home/user/repo/app
npx pnpm install --frozen-lockfile

**Phase 2: TDD Red (Write failing tests)**

- Create test file(s) for acceptance criteria
- Run: npx pnpm test - tests MUST fail

**Phase 3: TDD Green (Minimal implementation)**

- Implement ONLY what's needed to pass tests
- Run: npx pnpm test - tests MUST pass

**Phase 4: Quality Gates (ALL MUST PASS)**
cd /home/user/repo/app
npx pnpm typecheck # 0 errors required
npx pnpm lint # Must pass
npx pnpm test # All tests pass

**Phase 5: Commit and Push**
cd /home/user/repo
git add -A
git commit -m "feat(${SCOPE}): ${STORY_TITLE}

Story: ${STORY_ID}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push -u origin ${TASK_BRANCH}

**Phase 6: Create PR (GitHub API - NOT gh CLI)**
Use github-api.js at /home/user/repo/app/scripts/github-api.js

### Output Format (EXACT JSON)

{
"success": true|false,
"storyId": "${STORY_ID}",
  "prNumber": <number>,
  "prUrl": "<url>",
  "branch": "${TASK_BRANCH}",
"testsAdded": <count>,
"testsPassing": <count>,
"filesModified": ["<file1>", "<file2>"],
"qualityGates": {
"typecheck": "pass|fail",
"lint": "pass|fail",
"test": "pass|fail"
},
"error": "<error message if success=false>"
}
```

#### ~~Step 2: Spawn E2B Implementer~~ (SKIP - E2B Only)

```
(E2B only - skipped)
```

#### ~~Step 3: Monitor PR Lifecycle~~ (SKIP - E2B Only)

After TaskOutput returns with PR URL:

```
PR_LIFECYCLE:
1. PR Created by Implementer
   ↓
2. GitHub Actions CI runs (agent-pr-workflow.yml)
   ├─ If CI fails → labels "needs-work"
   └─ If CI passes → labels "ci-verified"
   ↓
3. CodeRabbit reviews automatically
   ├─ If changes requested → Spawn Fixer agent
   └─ If approved → Continue
   ↓
4. (Optional) Custom Reviewer for edge cases
   ├─ If changes requested → Spawn Fixer agent
   └─ If approved → Continue
   ↓
5. Tester agent in fresh E2B sandbox
   ├─ If fails → Spawn Fixer agent
   └─ If passes → labels "tester-passed"
   ↓
6. Auto-merge triggers when:
   - ci-verified ✓
   - tester-passed ✓
   - CodeRabbit approved ✓
```

#### ~~Step 4: Handle Review Feedback~~ (SKIP - E2B Only)

(E2B only - skipped)

---

### LOCAL AGENT SPAWNING (CURRENT - Use This Instead)

**This is the ACTIVE workflow for all story execution.**

#### Local Agent Workflow

```
For each story to execute:

1. Build agent prompt with:
   - Story requirements and acceptance criteria
   - Files in scope (max 10)
   - Learnings from relevant domains
   - TDD workflow instructions
   - Quality gate commands

2. Spawn local developer agent:
   Task(
     subagent_type="developer",
     model="sonnet",  # or "haiku" for XS/S
     description="Implement ${STORY_ID}",
     prompt="${agent_prompt}"
   )

3. Agent works in local environment:
   - Working dir: /Users/umasankr/Projects/pinglearn-PWA/app
   - Runs: pnpm install, pnpm typecheck, pnpm lint, pnpm test
   - Creates/modifies files directly in app/src/
   - Returns results to orchestrator

4. Orchestrator updates progress:
   - Update tasks.json status
   - Update PROGRESS.md
   - Save checkpoint to memory-keeper
```

---

### Parallel Execution (AUTOMATIC from GRANULAR_EXECUTION_PLAN.md)

**CRITICAL: Parallel execution is now AUTOMATED based on GRANULAR_EXECUTION_PLAN.md**

**How It Works:**

1. **Step 2.75** reads GRANULAR_EXECUTION_PLAN.md and identifies parallel groups
2. **Dependency resolution** builds execution layers automatically
3. **Automatic spawning** launches agents in parallel for each layer
4. **No manual coordination** required - the orchestrator handles it all

**When Stories Run in Parallel:**

Stories run in parallel automatically when GRANULAR_EXECUTION_PLAN.md indicates:

- Same wave number
- No dependency relationships
- Different file scopes (verified during parsing)

**Implementation Pattern (AUTOMATED):**

```markdown
## Parallel Spawning - AUTOMATED APPROACH

The orchestrator automatically:

1. Parses wave structure from GRANULAR_EXECUTION_PLAN.md
2. Identifies parallel-safe stories in current layer
3. Spawns MULTIPLE Task tool calls in a SINGLE message with run_in_background: true:

Task(
subagent_type="developer",
run_in_background=true,
description="Implement STORY-001",
prompt="[story prompt]"
)

Task(
subagent_type="developer",
run_in_background=true,
description="Implement STORY-002",
prompt="[story prompt]"
)

Then use TaskOutput to collect results when needed:
TaskOutput(task_id="[agent-id-from-task]", block=true)
```

**Wave Execution Pattern (AUTOMATED from GRANULAR_EXECUTION_PLAN.md):**

```
Real Example - Wave 0.2 from GRANULAR_EXECUTION_PLAN.md:

PARSED STRUCTURE:
  Wave: 0.2
  Stories: ["STORY-000-2", "TECH-000-3", "TECH-000-4"]
  Dependencies: All parallel (no dependencies)
  Models: [Sonnet, Haiku, Haiku]
  Expected time: 30 min (longest agent)

AUTOMATIC EXECUTION:
1. PARSE WAVE (Step 2.75):
   ✓ Read GRANULAR_EXECUTION_PLAN.md
   ✓ Identify current wave (0.2)
   ✓ Extract parallel groups
   ✓ Build dependency graph → 1 layer, 3 stories

2. SPAWN IN PARALLEL (single message, 3 Task calls):
   ├─ Task(run_in_background=true, model="sonnet") → STORY-000-2 (Config)
   ├─ Task(run_in_background=true, model="haiku") → TECH-000-3 (Git)
   └─ Task(run_in_background=true, model="haiku") → TECH-000-4 (CodeRabbit)

3. COLLECT RESULTS:
   ├─ TaskOutput(task_id="story-000-2-agent", block=true) → ✓ Complete
   ├─ TaskOutput(task_id="tech-000-3-agent", block=true) → ✓ Complete
   └─ TaskOutput(task_id="tech-000-4-agent", block=true) → ✓ Complete

4. VERIFY WAVE:
   ✓ All 3 stories complete
   ✓ Quality gates passed
   ✓ Update PROGRESS.md + tasks.json
   ✓ Save checkpoint to memory-keeper

5. PROCEED TO NEXT WAVE (0.3)

VELOCITY GAIN:
  Sequential: 30 + 25 + 15 = 70 minutes
  Parallel:   max(30, 25, 15) = 30 minutes
  Speedup:    2.3x faster
```

**Memory-Keeper State Persistence (CRITICAL):**

After EACH parallel batch completes, save state immediately:

```
mcp_context_save(
  category: "progress",
  key: "wave-N-batch-M",
  value: "Completed: US-004 ✓, US-005 ✓. Starting US-006."
)
```

### Context Budget (Agent Lifetime Rule)

**Agent TOTAL LIFETIME must stay ≤180K tokens** (90% of 200K window).

This is NOT about initial prompt size - it's about the agent's entire existence:

```
Agent Lifetime Budget Breakdown:
├── Initial prompt: ~15-20K (lean, task-oriented)
├── Research phase: ~50K (file reads, greps, exploration)
├── TDD test writing: ~20K (test code + output)
├── Implementation: ~40K (code generation + iteration)
├── Reasoning/thinking: ~30K (internal reasoning)
└── Buffer: ~20K (unexpected needs)
────────────────────────────
Total Lifetime: ≤180K tokens
```

**To keep initial prompt lean (~15-20K)**:

- Include ONLY story requirements + acceptance criteria
- List only files in scope (max 10 files)
- Show 1-2 pattern examples, not all
- Reference architecture sections, don't copy
- Let agent research what it needs during execution

---

## Progress Tracking

### Update PROGRESS.md After Each Story

```markdown
## Wave [N] Progress

### Completed

- [x] US-001: [Title] - [timestamp]
- [x] US-002: [Title] - [timestamp]

### In Progress

- [ ] US-003: [Title] - Agent: Builder (Sonnet)

### Blocked

- [ ] US-004: [Title] - Blocker: [reason]

### Next Up

- US-005, US-006 (waiting for US-003)
```

### Update tasks.json Status

```json
{
  "id": "US-001",
  "status": "complete", // pending | in_progress | complete | blocked
  "completedAt": "2026-01-01T19:00:00Z",
  "agent": "Builder (Sonnet)",
  "filesModified": ["src/X.ts", "tests/X.test.ts"]
}
```

### Checkpoint to Memory-Keeper

After each wave:

```
mcp_context_save(
  category: "progress",
  key: "wave-N-complete",
  value: "Stories: X complete, Y blocked. Next: Wave N+1"
)
```

---

## Memory-Keeper State Persistence (MANDATORY)

**CRITICAL: State must survive context compaction. Use memory-keeper aggressively.**

### When to Save State

Save state at EVERY significant checkpoint:

| Event                   | Save Immediately                                      |
| ----------------------- | ----------------------------------------------------- |
| Story started           | `mcp_context_save(key: "story-XXX-started", ...)`     |
| Tests written           | `mcp_context_save(key: "story-XXX-tests-done", ...)`  |
| Implementation complete | `mcp_context_save(key: "story-XXX-implemented", ...)` |
| Quality gates passed    | `mcp_context_save(key: "story-XXX-validated", ...)`   |
| Story blocked           | `mcp_context_save(key: "story-XXX-blocked", ...)`     |
| Wave complete           | `mcp_context_checkpoint(name: "wave-N-complete")`     |
| Before any risky op     | `mcp_context_checkpoint(name: "pre-risky-operation")` |

### State Save Format

```typescript
// For story progress
mcp_context_save({
  category: "progress",
  key: `story-${storyId}-${phase}`,
  value: JSON.stringify({
    storyId: "STORY-001",
    phase: "green", // "started" | "red" | "green" | "refactor" | "validated" | "complete" | "blocked"
    timestamp: new Date().toISOString(),
    filesModified: ["app/src/x.ts", "app/src/x.test.ts"],
    testStatus: { total: 12, passing: 12, failing: 0 },
    notes: "All tests passing, ready for review",
  }),
  priority: "high",
});

// For wave progress
mcp_context_save({
  category: "progress",
  key: `wave-${waveNum}-status`,
  value: JSON.stringify({
    wave: 1,
    total: 5,
    complete: 3,
    inProgress: 1,
    blocked: 0,
    pending: 1,
    completedStories: ["STORY-001", "STORY-002", "STORY-003"],
    currentStory: "STORY-004",
    timestamp: new Date().toISOString(),
  }),
  priority: "high",
});
```

### Recovery Protocol

On session start or after compaction:

```
1. mcp_context_get(category: "progress") → Get all progress items
2. Parse latest wave status and story statuses
3. Identify: What was in progress? What's the next step?
4. Resume from exact point of interruption
```

### Before Compaction Hook

The `pre-compact-preserve.py` hook will call `mcp_context_prepare_compaction()` automatically.
This saves critical state before context is summarized.

---

## Error Recovery

### Story Implementation Fails

```
Attempt 1: Builder agent tries implementation
  ↓ Fails
Attempt 2: Spawn new agent with error context
  "Previous attempt failed with: [error]
   Try alternative approach: [suggestion]"
  ↓ Fails
Attempt 3: Escalate to higher model (Haiku → Sonnet)
  ↓ Fails
Mark as blocked, continue with independent stories
```

### Quality Gate Fails

```
1. Validator reports specific failure
2. Spawn fix agent with narrow scope:
   "Fix typecheck error in src/X.ts line 42:
    [error message]"
3. Re-run quality gate
4. Max 3 fix attempts → mark blocked
```

### Integration Test Fails

```
1. Identify which story broke integration
2. Spawn debugger agent to investigate
3. Fix in isolation
4. Re-run integration tests
5. If persistent → block wave, report to stakeholder
```

---

## Communication Protocol

### For Non-Technical Stakeholders

```
## Wave 1 Complete!

### What Got Done
- User login now works
- Dashboard shows real data
- Settings page is functional

### What's Next
- Wave 2: Core features (3 stories)
- Estimated: [time range]

### Any Issues?
- None currently / [Issue in simple terms]
```

### For Technical Stakeholders

```
## Wave 1 Execution Report

### Completed (3/3)
| Story | Files | Tests | Coverage |
|-------|-------|-------|----------|
| US-001 | 4 | 12 | 94% |
| US-002 | 2 | 8 | 87% |
| US-003 | 3 | 6 | 91% |

### Quality Gates
- Typecheck: ✓ 0 errors
- Lint: ✓ 0 warnings
- Tests: ✓ 26/26 passing
- Coverage: 91% (target: 80%)

### Integration
- API → DB: ✓
- Auth → API: ✓

### Next: Wave 2
Ready to proceed with US-004, US-005, US-006
```

---

## Quick Reference

### Execute Single Story

```
/execute US-001
```

### Execute Current Wave

```
/execute wave
```

### Execute All Remaining

```
/execute all
```

### Check Status Only

```
/execute status
```

### Resume After Block

```
/execute resume
```

---

## Integration with Other Skills

| Skill       | When to Use                             |
| ----------- | --------------------------------------- |
| `/verify`   | After each story for quality gates      |
| `/review`   | For M/L/XL stories after implementation |
| `/status`   | Quick progress check without execution  |
| `/continue` | Resume session after interruption       |

---

## Quality Standards (Non-Negotiable)

From project-planner skill - these apply to ALL stories:

- [ ] No `any` types in TypeScript
- [ ] No hardcoded URLs, keys, or magic numbers
- [ ] All config values externalized
- [ ] Error handling for all external calls
- [ ] Loading states for async operations
- [ ] Meaningful variable/function names
- [ ] No commented-out code
- [ ] No console.log in production code
- [ ] TypeScript strict mode passing
- [ ] Lint rules passing
- [ ] Tests written and passing
