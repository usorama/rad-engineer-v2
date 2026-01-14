# Rad Engineer v2 - Autonomous Engineering Platform

> **Vision**: Engineer and engineering platform that can engineer digital solutions from ideation to production and beyond, fully autonomously using Claude Code and Claude Agent SDK

## 📖 START HERE: Platform Foundation

**ALWAYS READ FIRST**: `docs/platform-foundation/`

This folder contains critical context documents:
1. `PROJECT-MANIFEST.md` - Vision, objectives, outcomes, progress (91% complete, 20/22 components)
2. `RESEARCH-SUMMARY.md` - Meta's CCA architecture + VAC innovation for deterministic engineering
3. `ANALYSIS-MEMORY.yaml` - YAML tracking pattern with GLOBAL/TASK/LOCAL scopes
4. `INTEGRATION-DEPENDENCIES.md` - Dependencies with engg-support-system project

Read these at session start to understand what we're building and the research backing it.

---

**Current Focus**: UI Integration + Platform Completion (91% backend complete, 0% UI exposure)

**Active Integration Projects**:

### 1. UI Integration (Priority 1)
Auto-Claude UI + rad-engineer-v2 Backend integration

**Key Documents**:
- **Integration Plan**: `~/.claude/plans/stateless-petting-eclipse.md` (approved, 6 weeks, 3 phases)
- **Gap Analysis**: `docs/platform-foundation/UI-INTEGRATION-GAP-ANALYSIS.yaml` (10 gaps identified)

**Status**: Phase 1 ready to start (fix initialization bug)

### 2. Platform Completion (Priority 2)
Finish remaining 2 deferred components

**Progress Files**:
- **Master Progress**: `.claude/orchestration/specs/PROGRESS.md`
- **Full Vision**: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`

---

## 📁 Project Structure

```
rad-engineer-v2/
├── rad-engineer/              # 🎯 MAIN IMPLEMENTATION FOLDER
│   └── (all system code goes here)
│
├── .claude/
│   ├── orchestration/         # 📋 PLANNING & PROGRESS TRACKING
│   │   ├── specs/
│   │   │   └── PROGRESS.md    # ⭐ MASTER PROGRESS TRACKER
│   │   ├── docs/
│   │   │   └── planning/
│   │   │       ├── AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md
│   │   │       ├── SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md
│   │   │       └── PHASE_GATE_ITERATION_PATTERN.md
│   │   └── (orchestration research & specs)
│   │
│   ├── skills/                # 🔧 SKILLS (tools & workflows)
│   │   └── orchestrate-spec.md # Research-first specification system
│   │
│   └── (Claude Code configuration)
│
└── CLAUDE.md                  # 📖 THIS FILE - Root reference guide
```

---

## 🎯 CRITICAL: Implementation Folder

**ALL SYSTEM CODE GOES IN**: `rad-engineer/`

```bash
cd /Users/umasankr/Projects/rad-engineer-v2/rad-engineer
```

**This is where you build**:
- /execute skill implementation
- Claude Agent SDK orchestration
- Resource management
- State management
- Error recovery
- Security layer

---

## 📋 CRITICAL: Progress Tracking Files

### Master Progress Tracker

**File**: `.claude/orchestration/specs/PROGRESS.md`

**What it tracks**:
- All 9 components across 4 phases
- Current status (pending → specified → implemented → verified)
- Next component to work on
- Dependencies and blockers

**How to use**:
```bash
# Read current progress
cat .claude/orchestration/specs/PROGRESS.md

# Continue with next component
/orchestrate-spec

# Specify specific component
/orchestrate-spec [component-name] [phase]
```

### Planning Files

#### Full Platform Vision
**File**: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`

**Why read this**:
- Complete roadmap (Phases 0-5)
- Gap analysis
- Research areas
- Success metrics

**Current**: We're building Phase 1 only (~15% of full vision)

#### Integration Plan
**File**: `.claude/orchestration/docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md`

**Why read this**:
- 16-week implementation timeline
- Component breakdown
- Dependencies and milestones

#### Phase Gate Pattern
**File**: `.claude/orchestration/docs/planning/PHASE_GATE_ITERATION_PATTERN.md`

**Why read this**:
- Go/No-Go decision framework
- Iteration loops
- Quality gates

---

## 🔧 Skills Reference

### /execute (Deterministic Execution)

**Location**: `.claude/skills/execute/SKILL.md`

**What it does**:
- Deterministic task execution with mathematical certainty
- TDD protocol: Validate → Write Test → Implement → Verify → Capture Evidence
- Triple verification: Preconditions → Implementation → Postconditions
- Cross-session context sharing via memory-keeper MCP
- Git workflow with automatic commits
- Quality gates: typecheck → lint → test (serialized with flock)

**Protocol**:
```
1. Validate preconditions (from contract)
2. Create failing test FIRST
3. Run test (expect FAIL)
4. Implement minimal code
5. Run test (expect PASS)
6. Verify postconditions
7. Capture evidence (save to memory-keeper)
8. Update progress file
9. Git commit (if requested)

Max 3 retries per story, then escalate
```

**Expected Plan Format**:
```markdown
# Story 1: Fix Initialization Button

## Tasks
- Task 1.1: Add error toast to GeneralSettings
- Task 1.2: Add i18n keys

## Tests
- [ ] Error toast appears on failure
- [ ] Success toast appears on success

## Dependencies
- None

## Wave Assignment
- Wave 1, Agent 1
```

**Usage**:
```bash
/execute                              # Auto-detect plan file
/execute --plan-file path/to/PLAN.md  # Specific plan
```

**Plan File Locations** (auto-detected):
- `docs/platform-foundation/RAD-ENGINEER-IMPLEMENTATION-PLAN.md`
- `docs/platform-foundation/RAD-ENGINEER-UI-INTEGRATION-PLAN.md`
- `docs/engg-support-system/IMPLEMENTATION-PLAN.md`

---

### /orchestrate-spec (Research-First Specification)

**Location**: `.claude/skills/orchestrate-spec.md`

**What it does**:
- Auto-detects next pending component
- Spawns 2-3 parallel research agents
- Generates evidence-backed specs
- Validates specifications
- Updates progress automatically
- Offers optional implementation

**Usage**:
```bash
/orchestrate-spec                    # Auto-continue
/orchestrate-spec [component] [phase] # Specific component
/orchestrate-spec --reset-progress    # Rebuild from filesystem
```

---

## 🚀 Quick Start Workflow

### For Starting Fresh Implementation

```bash
# 1. Check current progress
cat .claude/orchestration/specs/PROGRESS.md

# 2. Go to implementation folder
cd rad-engineer

# 3. Continue with next component
/orchestrate-spec

# 4. Implement in rad-engineer/
# 5. Quality gates: typecheck → lint → test
```

### For Planning/Research

```bash
# Read full platform vision
cat .claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md

# Read integration plan
cat .claude/orchestration/docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md

# Check phase gate pattern
cat .claude/orchestration/docs/planning/PHASE_GATE_ITERATION_PATTERN.md
```

---

## 🎯 Current Phase: Phase 1 - /execute Skill

**Scope**: Deterministic execution foundation (16 weeks)

**Components** (9 total):
- Phase 0: SDK Integration ✅, Baseline Measurement
- Phase 1: ResourceManager, PromptValidator, ResponseParser
- Phase 2: WaveOrchestrator, StateManager
- Phase 3: ErrorRecoveryEngine, SecurityLayer

**Progress**: See `.claude/orchestration/specs/PROGRESS.md`

---

## ⚠️ CRITICAL CONSTRAINTS

### Evidence-Based Approach (MANDATORY)

```
📊 EVIDENCE REQUIRED FOR ALL CLAIMS
   • NEVER claim files exist without reading them first
   • NEVER claim features exist without checking the codebase
   • Use Glob/Grep to verify before making statements
   • Provide file paths and line numbers as evidence
   • Run commands to verify state (ls, cat, find)
   • Update CLAUDE.md only with verified information

VERIFICATION PROTOCOL:
   1. Glob for pattern: "**/*keyword*"
   2. Read actual file contents
   3. Run verification commands
   4. Present evidence with file paths
   5. Update documentation with facts only

PENALTY: If you make unverified claims, user will be disappointed
```

### Agent Concurrency

```
⛔ MAXIMUM 2-3 PARALLEL AGENTS
   Exceeding this causes system crash (5 agents = 685 threads, kernel overload)
```

### Quality Gates (BUN-ONLY)

```
⚠️ BUN-ONLY COMMANDS (NEVER use pnpm/npm/node)

ALL quality gates MUST use bun exclusively:
- bun run typecheck    # TypeScript check
- bun run lint         # ESLint
- bun test             # Tests (17x faster than vitest)

JIT Resource Check BEFORE running:
.claude/hooks/check-system-resources.sh

Serialized execution (one at a time):
cd rad-engineer && LOCK="/tmp/rad-engineer-quality-gate.lock" && \
flock -w 300 "$LOCK" sh -c 'bun run typecheck && bun run lint && bun test'
```

### Context Management

```
📦 AGENT PROMPTS < 500 CHARS
   Use JIT loading, not upfront file reading
```

---

## 📚 Platform Phases (Full Vision)

### Phase 0: Foundation (Current)
- SDK Integration ✅
- Baseline Measurement
- /execute skill

### Phase 1: /plan skill (Future)
- Autonomous planning
- Requirements engineering
- Architecture decision engine

### Phase 2: /design skill (Future)
- Architecture engine
- Technology stack selection
- Performance prediction

### Phase 3: /deploy skill (Future)
- DevOps automation
- CI/CD optimization
- Infrastructure as code

### Phase 4: /monitor skill (Future)
- Evolution engine
- Continuous improvement
- Self-optimization

---

## 🔗 Quick Links

### Platform Documentation
- **Platform Foundation**: `docs/platform-foundation/` ⭐ (read first)
  - `PROJECT-MANIFEST.md` - Progress, status, components
  - `RESEARCH-SUMMARY.md` - CCA patterns, VAC protocol
  - `ANALYSIS-MEMORY.yaml` - YAML tracking pattern
  - `INTEGRATION-DEPENDENCIES.md` - External dependencies

### UI Integration
- **Integration Plan**: `~/.claude/plans/stateless-petting-eclipse.md` (6 weeks, 3 phases)
- **Gap Analysis**: `docs/platform-foundation/UI-INTEGRATION-GAP-ANALYSIS.yaml` (10 gaps)
- **Implementation**: `rad-engineer/src/ui-adapter/` (backend IPC handlers)
- **Frontend**: `workspaces/Auto-Claude/apps/frontend/` (React UI)

### Skills
- **Execute Skill**: `.claude/skills/execute/SKILL.md` (deterministic execution)
- **Orchestrate Spec**: `.claude/skills/orchestrate-spec.md` (research-first specs)

### Legacy (Deprecated Folders)
- ~~`.claude/orchestration/`~~ → Use `docs/platform-foundation/` instead
- Old Progress: `.claude/orchestration/specs/PROGRESS.md` (still maintained)
- Old Vision: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`

---

**Version**: 2.0.0
**Status**: UI Integration Phase (Priority 1) + Platform Completion (Priority 2)
**Last Updated**: 2026-01-13 (folder restructure, /execute skill integration)

---

## CRITICAL: Evidence-Based Outcome Reasoning (MANDATORY)

**PRINCIPLE**: Always optimize for OUTCOMES based on EVIDENCE, never convenience

```
┌─────────────────────────────────────────────────────────────────┐
│  WHEN ANSWERING QUESTIONS OR MAKING DECISIONS:                 │
│                                                                 │
│  1. START WITH OUTCOMES: What result do we want?               │
│  2. GATHER EVIDENCE: What data/experience supports this?       │
│  3. CRITICALLY REASON: Does evidence support the outcome?      │
│  4. CHOOSE BEST PATH: Even if inconvenient                   │
│                                                                 │
│  NEVER: Choose the easy path without evidence                 │
│  NEVER: Assume without verification                            │
│  NEVER: Optimize for convenience over outcomes                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Framework

**When asked a question or making a choice:**

1. **Define the Outcome**: What are we trying to achieve?
   - Example: "Deterministic, repeatable, reproducible execution"

2. **Gather Evidence**: What proof exists?
   - Read actual files (use Glob/Grep/Read)
   - Run commands to verify state
   - Check documentation
   - Research best practices

3. **Critical Analysis**: Does evidence support the approach?
   - What are the trade-offs?
   - What are the risks?
   - What does the data say?

4. **Choose Based on Evidence**: Not convenience
   - If evidence shows X is better but harder → do X
   - If evidence shows Y is worse but easier → don't do Y

### Examples

**❌ WRONG (Convenience-Based)**:
```
Q: Should we adopt existing agents or create new ones?
A: Let's adopt existing ones - it's faster and we already have them.
```

**✅ CORRECT (Outcome-Based)**:
```
Q: Should we adopt existing agents or create new ones?
A: Let me analyze from outcomes perspective:

DESIRED OUTCOME: Deterministic, repeatable, reproducible agents

EVIDENCE:
- .claude/agents/planner.md has 7709 bytes, detailed PM persona
- .claude/agents/developer.md has TDD workflow, quality gates
- Agents are proven (used in production)
- Base instructions mandate context management, quality checks

ANALYSIS:
- Existing agents have proven patterns ✓
- Repeated use = improvement over time ✓
- Creating new = unknown quality, more effort ✗

DECISION: Adopt existing agents (evidence supports better outcome)
```

### Verification Protocol

**Before making any recommendation:**

1. **Read the actual files** - Don't assume
2. **Run verification commands** - Don't guess
3. **Check multiple sources** - Don't rely on one
4. **Present evidence** - File paths, line numbers, outputs

### Questions to Always Ask

When uncertain:
- "What outcome are we optimizing for?"
- "What evidence supports this?"
- "Is this the best way or just the easiest way?"
- "What does the data/code actually say?"

---

