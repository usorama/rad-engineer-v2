# Rad Engineer v2 - Autonomous Engineering Platform

> **Vision**: Engineer and engineering platform that can engineer digital solutions from ideation to production and beyond, fully autonomously using Claude Code and Claude Agent SDK

**Current Focus**: Phase 1 - /execute skill + Claude Agent SDK orchestration (~15% of full platform)

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

### /orchestrate-spec

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

### Agent Concurrency

```
⛔ MAXIMUM 2-3 PARALLEL AGENTS
   Exceeding this causes system crash (5 agents = 685 threads, kernel overload)
```

### Testing

```
✅ USE BUN TEST (not vitest)
   17x faster, lower memory footprint
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

- **Progress**: `.claude/orchestration/specs/PROGRESS.md`
- **Implementation**: `rad-engineer/`
- **Full Vision**: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`
- **Integration Plan**: `.claude/orchestration/docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md`
- **Orchestrate Spec**: `.claude/skills/orchestrate-spec.md`

---

**Version**: 1.0.0
**Status**: Phase 1 - /execute skill implementation
**Last Updated**: 2026-01-05
