# /plan and /execute Gap Analysis

> **Purpose**: Identify missing pieces in /plan and /execute skills to enable complete end-to-end flow from user query to delivered product
>
> **Generated**: 2026-01-06
> **Status**: ANALYSIS COMPLETE - AWAITING USER APPROVAL

---

## Executive Summary

### Current State

| Component | Status | Coverage | Gap |
|-----------|--------|----------|-----|
| /plan skill | Partially implemented | 60% | Missing PRD, Architecture, User Approval Gates, Progress Tracking |
| /execute skill | Concept only | 0% | Not yet implemented |
| orchestrate-spec | Fully implemented | 100% | Used for component specification only |

### The Problem

**User's Envisioned Workflow** (what they want):

```
User: "build me a notion type notes app"
  ↓
1. AI agent asks specific questions (product, problem, requirements, MVP)
  ↓
2. Present what will be built (MVP vs backlog)
  ↓
3. User approval (back and forth on scope)
  ↓
4. Architect agent defines architecture, tech stack
  ↓
5. User approval (back and forth)
  ↓
6. Write high-level MVP implementation plan
  ↓
7. Gap analysis
  ↓
8. High-level epics and user stories
  ↓
9. THEN execution (story-by-story with TDD)
  ↓
10. Each story: research → write spec → write tests → TDD → commit → update PROGRESS.md
  ↓
11. Rinse and repeat until complete
```

**Current /plan Implementation** (what we have):

```
User: "build me a notion type notes app"
  ↓
1. IntakeHandler: Q&A (5-10 questions) ✓
  ↓
2. ResearchCoordinator: 2-3 parallel agents ✓
  ↓
3. [MISSING] Component specifications (optional for complex features)
  ↓
4. ExecutionPlanGenerator: GRANULAR_EXECUTION_PLAN.md ✓
  ↓
5. ValidationUtils: Evidence, completeness, dependencies, parseability ✓
  ↓
6. User approval (final) ✓
  ↓
7. /execute skill (not yet implemented)
```

### The Gap

We're **jumping directly from user query to execution plan** without:

- ❌ Product Requirements Document (PRD) phase
- ❌ Architecture definition phase
- ❌ MVP vs backlog decision workflow
- ❌ Multiple user approval gates throughout planning
- ❌ High-level implementation plan before detailed execution plan
- ❌ Gap analysis of implementation plan
- ❌ Epic and user story breakdown
- ❌ Human-readable progress tracking (PROGRESS.md)
- ❌ Connection to orchestrate-spec's PROGRESS.md

---

## Detailed Gap Analysis

### Gap 1: Missing PRD (Product Requirements Document) Phase

#### Current Behavior

/plan skill directly converts user query → StructuredRequirements → Research → ExecutionPlan

```
User query → Intake (5-10 questions) → Research → Execution Plan
```

#### Missing Behavior

Should have a dedicated PRD phase that produces:

```markdown
# Product Requirements Document (PRD)
## Project: Notion-like Notes App

## 1. Problem Statement
[What problem are we solving?]

## 2. Goals & Success Criteria
[What does success look like?]

## 3. User Personas
[Who are we building for?]

## 4. User Stories
[As a [user], I want [feature], so that [benefit]]

## 5. Functional Requirements
[What must the product DO?]

## 6. Non-Functional Requirements
[Performance, security, scalability requirements]

## 7. MVP Definition
[What's in MVP vs backlog?]

## 8. Out of Scope
[What are we explicitly NOT building?]

## 9. Assumptions & Constraints
[What are we assuming? What limits us?]

## 10. Success Metrics
[How do we measure success?]
```

#### Required Changes

**NEW Phase in /plan skill**: `PRDGenerator`

```typescript
class PRDGenerator {
  /**
   * After IntakeHandler, BEFORE ResearchCoordinator
   * Generates PRD from StructuredRequirements
   */
  generatePRD(requirements: StructuredRequirements): PRDDocument {
    // 1. Extract problem statement from user query
    // 2. Define user personas (if not specified, ask user)
    // 3. Generate user stories from requirements
    // 4. Define functional/non-functional requirements
    // 5. Ask user: MVP or full feature?
    // 6. Create MVP vs backlog separation
    // 7. Define out-of-scope items explicitly
    // 8. Establish success metrics
  }
}
```

**File to create**: `src/plan/PRDGenerator.ts`

**Questions to add to IntakeHandler**:
- Who are the primary users of this feature?
- What problem does this solve for them?
- What's the minimum viable version (MVP)?
- What can we defer to later (backlog)?

---

### Gap 2: Missing Architecture Definition Phase

#### Current Behavior

ExecutionPlanGenerator directly creates detailed stories without architecture phase

#### Missing Behavior

Should have an architecture phase that produces:

```markdown
# Architecture Document
## System: Notion-like Notes App

## 1. High-Level Architecture
[Diagram showing components]

## 2. Technology Stack Decision
[Why this stack? Alternatives considered]

## 3. Component Architecture
[List of components and their responsibilities]

## 4. Data Model
[Entities and relationships]

## 5. API Design
[Endpoints, contracts]

## 6. State Management
[How is state managed?]

## 7. Security Considerations
[Auth, data protection]

## 8. Deployment Architecture
[How will this be deployed?]

## 9. Scaling Strategy
[How does this scale?]

## 10. Risk Assessment
[Technical risks and mitigations]
```

#### Required Changes

**NEW Phase in /plan skill**: `ArchitectureGenerator`

```typescript
class ArchitectureGenerator {
  /**
   * After PRDGenerator, AFTER ResearchCoordinator
   * Spawns architect agent to design system
   */
  generateArchitecture(
    prd: PRDDocument,
    research: ResearchFindings
  ): ArchitectureDocument {
    // 1. Spawn architect agent with PRD + research
    // 2. Design high-level architecture
    // 3. Select technology stack with rationale
    // 4. Define component boundaries
    // 5. Design data model
    // 6. Define API contracts
    // 7. Document security approach
    // 8. Ask user approval on architecture
  }
}
```

**File to create**: `src/plan/ArchitectureGenerator.ts`

**User approval gate at this point**:
- User reviews architecture
- User can adjust tech stack
- User can adjust component boundaries
- User approves → proceed to implementation planning

---

### Gap 3: Missing High-Level Implementation Plan

#### Current Behavior

ExecutionPlanGenerator directly creates detailed wave/story breakdown

#### Missing Behavior

Should have a high-level implementation plan that:

```markdown
# Implementation Plan
## Project: Notion-like Notes App

## 1. Implementation Phases
[High-level phases: Foundation → Core → Advanced → Polish]

## 2. Dependency Graph
[What depends on what?]

## 3. Risk Areas
[What's risky? How do we mitigate?]

## 4. Gap Analysis
[What skills/tools do we need? Do we have them?]

## 5. Epic Breakdown
[High-level epics, not yet stories]

## 6. Story Estimation
[Rough estimates for each epic]

## 7. Iteration Plan
[How many iterations? What's in each?]

## 8. Milestones
[What are the check-in points?]
```

#### Required Changes

**NEW Phase in /plan skill**: `ImplementationPlanGenerator`

```typescript
class ImplementationPlanGenerator {
  /**
   * After ArchitectureGenerator (user approved)
   * Creates high-level implementation plan
   */
  generateImplementationPlan(
    prd: PRDDocument,
    architecture: ArchitectureDocument,
    research: ResearchFindings
  ): ImplementationPlan {
    // 1. Define implementation phases
    // 2. Identify dependencies between epics
    // 3. Perform gap analysis (skills, tools, dependencies)
    // 4. Break down into epics (not yet stories)
    // 5. Estimate epic complexity
    // 6. Define milestones
    // 7. Ask user approval on implementation approach
  }
}
```

**File to create**: `src/plan/ImplementationPlanGenerator.ts`

**User approval gate at this point**:
- User reviews implementation phases
- User can adjust priorities
- User can adjust scope (MVP vs full)
- User approves → proceed to detailed execution plan

---

### Gap 4: Missing Epic → Story Breakdown

#### Current Behavior

ExecutionPlanGenerator directly creates stories from complexity estimate

#### Missing Behavior

Should have:

```markdown
# Epic Breakdown
## Epic: Rich Text Editor

### User Stories
- As a user, I want to create notes with rich text formatting
- As a user, I want to edit existing notes
- As a user, I want to delete notes I no longer need
- As a user, I want to format text (bold, italic, headers)
- As a user, I want to create lists (bullet, numbered)
- As a user, I want to add links to my notes

### Acceptance Criteria
[Per-story acceptance criteria]

### Technical Approach
[Tech stack, libraries to use]

### Dependencies
[What other stories/epics does this depend on?]
```

#### Required Changes

**NEW Phase in /plan skill**: `EpicBreakdown`

```typescript
class EpicBreakdown {
  /**
   * After ImplementationPlanGenerator (user approved)
   * Breaks epics into stories
   */
  breakIntoStories(
    implementationPlan: ImplementationPlan,
    architecture: ArchitectureDocument
  ): Epic[] {
    // 1. For each epic, identify user stories
    // 2. Define acceptance criteria per story
    // 3. Estimate story complexity
    // 4. Identify story dependencies
    // 5. Group stories into waves
    // 6. Ask user: prioritize stories (MoSCoW: Must, Should, Could, Won't)
  }
}
```

**File to modify**: `src/plan/ExecutionPlanGenerator.ts` (add epic breakdown before story generation)

---

### Gap 5: Missing User Approval Gates

#### Current Behavior

Only ONE user approval at the end (after execution plan is generated)

#### Missing Behavior

Should have MULTIPLE approval gates:

```
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL GATES                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Gate 1: After PRD                                          │
│    → User approves problem statement, goals, MVP scope     │
│    → User can adjust: personas, stories, MVP definition    │
│                                                             │
│  Gate 2: After Architecture                                 │
│    → User approves tech stack, component design             │
│    → User can adjust: technology choices, architecture      │
│                                                             │
│  Gate 3: After Implementation Plan                          │
│    → User approves phases, milestones, gap analysis        │
│    → User can adjust: priorities, scope, timeline           │
│                                                             │
│  Gate 4: After Story Breakdown                              │
│    → User approves epic/story prioritization               │
│    → User can adjust: story priorities, MoSCoW             │
│                                                             │
│  Gate 5: After Execution Plan (current)                     │
│    → User approves wave structure, story assignments       │
│    → User can adjust: wave ordering, model selections      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Required Changes

**MODIFY**: /plan skill SKILL.md
- Add approval gate phases
- Define what user can adjust at each gate
- Define what happens if user rejects (iteration loop)

**NEW File**: `src/plan/ApprovalGate.ts`

```typescript
class ApprovalGate {
  /**
   * Present output to user and request approval
   * Allows user to adjust before proceeding
   */
  async requestApproval(
    phase: 'prd' | 'architecture' | 'implementation' | 'stories' | 'execution',
    output: PRDDocument | ArchitectureDocument | ImplementationPlan | ExecutionPlan
  ): Promise<{ approved: boolean; adjustments?: any }> {
    // 1. Present output to user in readable format
    // 2. Ask: Approve or Adjust?
    // 3. If adjust: collect adjustments, regenerate output
    // 4. If approve: proceed to next phase
    // 5. Max 3 iterations per gate, then escalate
  }
}
```

---

### Gap 6: Missing Human-Readable Progress Tracking

#### Current Behavior

- `tasks.json` is machine-readable only
- `VALIDATION_SUMMARY.md` is validation-focused, not progress-focused
- No human-readable progress file during execution

#### Missing Behavior

Should have (like orchestrate-spec's PROGRESS.md):

```markdown
# Implementation Progress: Notion-like Notes App

> **Last Updated**: 2026-01-06 14:30:00Z
> **Overall Progress**: 4/12 stories complete (33%)

## Summary

| Metric | Value |
|--------|-------|
| Total Stories | 12 |
| Completed | 4 |
| In Progress | 2 |
| Pending | 6 |
| Blocked | 0 |

## Wave Progress

### Wave 0.1: Foundation Setup ✅ COMPLETE
- ✅ STORY-001-1: Initialize project structure
- ✅ STORY-001-2: Configure build tools
- ✅ STORY-001-3: Set up testing framework

### Wave 0.2: Core Feature Implementation 🟡 IN PROGRESS
- ✅ STORY-002-1: Data model design
- 🟡 STORY-002-2: CRUD operations (in progress - developer agent running)
- ⏳ STORY-002-3: Validation layer
- ⏳ STORY-002-4: Error handling

## Current Work

**Active Story**: STORY-002-2 - CRUD operations
- **Agent**: developer (sonnet)
- **Started**: 2026-01-06 14:15:00Z
- **Status**: Agent running
- **Files Modified**: `src/notes/NotesService.ts` (in progress)

## Next Steps

1. Wait for STORY-002-2 to complete
2. Start STORY-002-3: Validation layer
3. Run integration tests after all Wave 0.2 stories complete

## Blockers

None

## Issues

None

## Quality Gate Status

| Gate | Status | Last Run |
|------|--------|----------|
| TypeScript compilation | ✅ Pass | 2026-01-06 14:00:00Z |
| Lint | ✅ Pass | 2026-01-06 14:00:00Z |
| Tests | ✅ Pass (85% coverage) | 2026-01-06 14:00:00Z |
```

#### Required Changes

**NEW File**: `src/execute/ProgressTracker.ts`

```typescript
class ProgressTracker {
  /**
   * Tracks implementation progress in human-readable format
   * Updates PROGRESS.md throughout execution
   */
  updateProgress(storyId: string, status: 'pending' | 'in_progress' | 'complete' | 'blocked'): void {
    // 1. Read existing PROGRESS.md
    // 2. Update story status
    // 3. Recalculate overall progress
    // 4. Update current work section
    // 5. Write back to PROGRESS.md
  }

  generateProgressSummary(): ProgressSummary {
    // Generate human-readable summary
  }
}
```

**NEW File**: `docs/planning/PROGRESS.md` (created by /plan, updated by /execute)

---

### Gap 7: Missing /execute Skill Implementation

#### Current Behavior

/execute skill does not exist (concept only)

#### Missing Behavior

Should:

1. **Read GRANULAR_EXECUTION_PLAN.md**
   - Parse YAML metadata
   - Extract wave structure
   - Extract story dependencies

2. **Initialize Progress Tracking**
   - Create PROGRESS.md
   - Set initial state

3. **Execute Waves Sequentially**
   - For each wave:
     - Check dependencies complete
     - Check resources available (ResourceManager)
     - Spawn stories in parallel (respecting maxConcurrent)
     - Wait for all stories to complete
     - Run quality gates
     - Update PROGRESS.md

4. **Handle Each Story**
   - Select model (haiku/sonnet/opus)
   - Validate prompt (PromptValidator)
   - Spawn developer agent
   - Parse response (ResponseParser)
   - Verify output (evidence-based)
   - Commit changes (git)
   - Update PROGRESS.md

5. **Quality Gates**
   - TypeScript compilation (0 errors)
   - Lint (pass)
   - Tests (≥80% coverage)

6. **Error Recovery**
   - Retry failed stories
   - Circuit breaker for repeated failures
   - Checkpoint save/load for recovery

#### Required Changes

**NEW File**: `.claude/skills/execute/SKILL.md`

**NEW Implementation Files**:
- `src/execute/Executor.ts` - Main execution orchestrator
- `src/execute/WaveExecutor.ts` - Wave execution logic
- `src/execute/StoryExecutor.ts` - Single story execution
- `src/execute/ProgressTracker.ts` - Progress tracking (PROGRESS.md)
- `src/execute/QualityGate.ts` - Quality gate enforcement
- `src/execute/GitOperations.ts` - Git commit automation

---

### Gap 8: Missing Connection Between orchestrate-spec and /plan

#### Current Behavior

- `orchestrate-spec` has PROGRESS.md for **component specification** tracking
- `/plan` should have PROGRESS.md for **user project implementation** tracking
- No connection between the two

#### Missing Behavior

Should distinguish:

**orchestrate-spec PROGRESS.md**: Tracks Rad Engineer component development
- What: Smart Orchestrator components (ResourceManager, PromptValidator, etc.)
- Location: `.claude/orchestration/specs/PROGRESS.md`
- Purpose: Track platform development progress

**/plan PROGRESS.md**: Tracks user project implementation
- What: User's project (Notion notes app, etc.)
- Location: `docs/planning/PROGRESS.md` (within user's project)
- Purpose: Track user project development progress

#### Required Changes

**NO CHANGE NEEDED** - these are separate concerns:
- orchestrate-spec: Platform development
- /plan: User project development

**Document this distinction** in both skill files

---

## Complete End-to-End Workflow (Proposed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE USER PROJECT WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User: "build me a notion type notes app"                                   │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 1: INTAKE                                        │  │
│  │ Ask 5-10 clarifying questions:                                       │  │
│  │   • What problem are we solving?                                     │  │
│  │   • Who are the users?                                               │  │
│  │   • What's the MVP scope?                                            │  │
│  │   • What's the tech stack?                                           │  │
│  │   • What are success criteria?                                       │  │
│  │   • What's out of scope?                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 2: PRD GENERATION                                │  │
│  │ Generate PRD with:                                                   │  │
│  │   • Problem statement                                                │  │
│  │   • User personas & stories                                          │  │
│  │   • Functional/non-functional requirements                           │  │
│  │   • MVP definition vs backlog                                        │  │
│  │   • Success metrics                                                  │  │
│  │                                                                        │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │ │ APPROVAL GATE 1: User reviews PRD                                │  │  │
│  │ │   → Approve: proceed to architecture                            │  │  │
│  │ │   → Adjust: iterate on PRD (max 3x)                             │  │  │
│  │ └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 3: RESEARCH (parallel agents)                    │  │
│  │ Spawn 2-3 agents:                                                    │  │
│  │   • Agent 1: Technical feasibility & approaches                      │  │
│  │   • Agent 2: Codebase patterns (if applicable)                       │  │
│  │   • Agent 3: Best practices & security                               │  │
│  │                                                                        │  │
│  │ Output: RESEARCH_FINDINGS.md with verified evidence                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 4: ARCHITECTURE GENERATION                       │  │
│  │ Spawn architect agent with PRD + research:                           │  │
│  │   • High-level architecture design                                   │  │
│  │   • Technology stack selection with rationale                        │  │
│  │   • Component architecture                                          │  │
│  │   • Data model design                                                │  │
│  │   • API design                                                       │  │
│  │   • Security considerations                                          │  │
│  │                                                                        │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │ │ APPROVAL GATE 2: User reviews architecture                       │  │  │
│  │ │   → Approve: proceed to implementation planning                 │  │  │
│  │ │   → Adjust: iterate on architecture (max 3x)                    │  │  │
│  │ └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 5: IMPLEMENTATION PLANNING                       │  │
│  │ Generate implementation plan with:                                   │  │
│  │   • Implementation phases (Foundation → Core → Advanced → Polish)    │  │
│  │   • Dependency graph                                                  │  │
│  │   • Risk assessment & mitigation                                      │  │
│  │   • Gap analysis (skills, tools, dependencies)                       │  │
│  │   • Epic breakdown (high-level)                                      │  │
│  │   • Milestones                                                        │  │
│  │                                                                        │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │ │ APPROVAL GATE 3: User reviews implementation plan               │  │  │
│  │ │   → Approve: proceed to story breakdown                        │  │  │
│  │ │   → Adjust: iterate on plan (max 3x)                            │  │  │
│  │ └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 6: STORY BREAKDOWN                               │  │
│  │ Break epics into stories:                                            │  │
│  │   • User stories with acceptance criteria                            │  │
│  │   • Technical approach per story                                     │  │
│  │   • Story dependencies                                                │  │
│  │   • Story complexity estimation                                       │  │
│  │   • MoSCoW prioritization (Must, Should, Could, Won't)              │  │
│  │                                                                        │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │ │ APPROVAL GATE 4: User reviews story breakdown                   │  │  │
│  │ │   → Approve: proceed to execution plan generation              │  │  │
│  │ │   → Adjust: iterate on priorities (max 3x)                      │  │  │
│  │ └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 7: EXECUTION PLAN GENERATION (current impl)     │  │
│  │ Generate GRANULAR_EXECUTION_PLAN.md with:                            │  │
│  │   • Wave structure (sequential/parallel)                             │  │
│  │   • Story breakdown with dependencies                                │  │
│  │   • Model selection per story (cost optimization)                   │  │
│  │   • Integration test specifications                                  │  │
│  │   • Quality gate definitions                                         │  │
│  │   • tasks.json (machine-readable)                                    │  │
│  │                                                                        │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │ │ APPROVAL GATE 5: User reviews execution plan                    │  │  │
│  │ │   → Approve: proceed to execution                               │  │  │
│  │ │   → Adjust: iterate on plan (max 3x)                            │  │  │
│  │ └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /plan SKILL - Phase 8: VALIDATION                                    │  │
│  │ Validate execution plan:                                             │  │
│  │   ✓ Evidence alignment (all claims have sources)                     │  │
│  │   ✓ Completeness (all required fields present)                       │  │
│  │   ✓ Dependencies (no circular dependencies)                          │  │
│  │   ✓ Parseability (/execute must be able to parse)                   │  │
│  │                                                                        │  │
│  │ Output: VALIDATION_SUMMARY.md with PASS/FAIL result                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  Files generated:                                                          │
│    • docs/planning/PRD.md                                                 │
│    • docs/planning/ARCHITECTURE.md                                         │
│    • docs/planning/IMPLEMENTATION_PLAN.md                                  │
│    • docs/planning/EPICS.md                                                │
│    • docs/planning/execution/GRANULAR_EXECUTION_PLAN.md                    │
│    • docs/planning/tasks.json                                              │
│    • docs/planning/RESEARCH_FINDINGS.md                                    │
│    • docs/planning/VALIDATION_SUMMARY.md                                   │
│    • docs/planning/PROGRESS.md (initial: 0/12 stories complete)            │
│                                                                             │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /execute SKILL - Phase 1: INITIALIZATION                            │  │
│  │   • Read GRANULAR_EXECUTION_PLAN.md                                  │  │
│  │   • Parse YAML metadata                                               │  │
│  │   • Initialize PROGRESS.md tracking                                  │  │
│  │   • Verify rad-engineer components available                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /execute SKILL - Phase 2: WAVE EXECUTION (sequential)                │  │
│  │   FOR EACH WAVE in execution plan:                                    │  │
│  │     1. Check wave dependencies complete                              │  │
│  │     2. Check resources available (ResourceManager)                   │  │
│  │     3. Spawn stories in parallel (respecting maxConcurrent)          │  │
│  │     4. FOR EACH STORY:                                               │  │
│  │        • Validate prompt (PromptValidator)                           │  │
│  │        • Spawn developer agent with story task                       │  │
│  │        • Parse response (ResponseParser)                             │  │
│  │        • Verify evidence (files modified, tests written)            │  │
│  │        • Run quality gates (typecheck, lint, test)                  │  │
│  │        • Commit changes (git)                                        │  │
│  │        • Update PROGRESS.md                                           │  │
│  │     5. Wait for all stories in wave to complete                      │  │
│  │     6. Run wave-level integration tests                              │  │
│  │     7. Run wave-level quality gates                                  │  │
│  │     8. Update PROGRESS.md with wave completion                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /execute SKILL - Phase 3: COMPLETION                                 │  │
│  │   • All waves complete                                                │  │
│  │   • Final quality gates (all pass)                                   │  │
│  │   • Generate completion summary                                      │  │
│  │   • Present deliverables to user                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  ▼                                                                          │
│  User receives working software with:                                      │
│    • All tests passing (≥80% coverage)                                     │
│    • TypeScript compilation successful (0 errors)                          │
│    • Lint passing                                                           │
│    • Git history (commits per story)                                       │
│    • PROGRESS.md showing 12/12 stories complete                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Fill /plan Gaps (2-3 days)

| Task | File(s) | Description |
|------|---------|-------------|
| 1.1 | `src/plan/PRDGenerator.ts` | Generate PRD from requirements |
| 1.2 | `src/plan/ArchitectureGenerator.ts` | Generate architecture from PRD + research |
| 1.3 | `src/plan/ImplementationPlanGenerator.ts` | Generate high-level implementation plan |
| 1.4 | `src/plan/EpicBreakdown.ts` | Break epics into stories |
| 1.5 | `src/plan/ApprovalGate.ts` | Handle user approval gates |
| 1.6 | `src/plan/index.ts` | Export new components |
| 1.7 | `.claude/skills/plan/SKILL.md` | Update skill workflow with new phases |
| 1.8 | `test/plan/*.test.ts` | Add tests for new components |

### Phase 2: Implement /execute Skill (3-4 days)

| Task | File(s) | Description |
|------|---------|-------------|
| 2.1 | `.claude/skills/execute/SKILL.md` | Define execute skill |
| 2.2 | `src/execute/Executor.ts` | Main execution orchestrator |
| 2.3 | `src/execute/WaveExecutor.ts` | Wave execution logic |
| 2.4 | `src/execute/StoryExecutor.ts` | Single story execution |
| 2.5 | `src/execute/ProgressTracker.ts` | PROGRESS.md tracking |
| 2.6 | `src/execute/QualityGate.ts` | Quality gate enforcement |
| 2.7 | `src/execute/GitOperations.ts` | Git commit automation |
| 2.8 | `src/execute/index.ts` | Module exports |
| 2.9 | `test/execute/*.test.ts` | Add tests |
| 2.10 | End-to-end test | Test complete flow with "build me notion like notes app" |

### Phase 3: Integration & Testing (1-2 days)

| Task | Description |
|------|-------------|
| 3.1 | Update SYSTEM_ARCHITECTURE_COMPREHENSIVE.md with /plan and /execute |
| 3.2 | Test end-to-end flow: /plan → /execute with sample project |
| 3.3 | Verify PROGRESS.md updates correctly throughout execution |
| 3.4 | Verify all approval gates work correctly |
| 3.5 | Verify quality gates enforce standards |
| 3.6 | Document user workflow in README |

---

## File Structure (After Implementation)

```
rad-engineer/
├── src/
│   ├── plan/                              # /plan skill integration
│   │   ├── types.ts                       # ✅ Existing
│   │   ├── IntakeHandler.ts               # ✅ Existing
│   │   ├── ResearchCoordinator.ts         # ✅ Existing
│   │   ├── ExecutionPlanGenerator.ts      # ✅ Existing
│   │   ├── ValidationUtils.ts             # ✅ Existing
│   │   ├── PRDGenerator.ts                # 🆕 NEW - Generate PRD
│   │   ├── ArchitectureGenerator.ts       # 🆕 NEW - Generate architecture
│   │   ├── ImplementationPlanGenerator.ts # 🆕 NEW - Generate implementation plan
│   │   ├── EpicBreakdown.ts               # 🆕 NEW - Break epics into stories
│   │   ├── ApprovalGate.ts                # 🆕 NEW - Handle approval gates
│   │   └── index.ts                       # ✅ Existing (update exports)
│   │
│   ├── execute/                           # 🆕 NEW /execute skill
│   │   ├── types.ts                       # Type definitions
│   │   ├── Executor.ts                    # Main orchestrator
│   │   ├── WaveExecutor.ts                # Wave execution
│   │   ├── StoryExecutor.ts               # Story execution
│   │   ├── ProgressTracker.ts             # PROGRESS.md tracking
│   │   ├── QualityGate.ts                 # Quality gate enforcement
│   │   ├── GitOperations.ts               # Git automation
│   │   └── index.ts                       # Module exports
│   │
│   ├── sdk/                               # ✅ Existing (unchanged)
│   ├── baseline/                          # ✅ Existing (unchanged)
│   ├── core/                              # ✅ Existing (unchanged)
│   ├── advanced/                          # ✅ Existing (unchanged)
│   └── integration/                       # ✅ Existing (unchanged)
│
├── test/
│   ├── plan/                              # ✅ Existing (expand)
│   │   ├── plan-skill-e2e.test.ts         # ✅ Existing (update)
│   │   ├── PRDGenerator.test.ts           # 🆕 NEW
│   │   ├── ArchitectureGenerator.test.ts  # 🆕 NEW
│   │   ├── ImplementationPlanGenerator.test.ts # 🆕 NEW
│   │   ├── EpicBreakdown.test.ts          # 🆕 NEW
│   │   └── ApprovalGate.test.ts           # 🆕 NEW
│   │
│   └── execute/                           # 🆕 NEW
│       ├── execute-skill-e2e.test.ts      # End-to-end test
│       ├── Executor.test.ts               # Unit tests
│       ├── WaveExecutor.test.ts           # Unit tests
│       ├── StoryExecutor.test.ts          # Unit tests
│       ├── ProgressTracker.test.ts        # Unit tests
│       ├── QualityGate.test.ts            # Unit tests
│       └── GitOperations.test.ts          # Unit tests
│
└── .claude/
    └── skills/
        ├── plan/
        │   └── SKILL.md                    # ✅ Existing (update workflow)
        └── execute/
            └── SKILL.md                    # 🆕 NEW
```

**Generated Files** (in user's project):

```
docs/planning/
├── PRD.md                                  # 🆕 Product Requirements Document
├── ARCHITECTURE.md                         # 🆕 System Architecture
├── IMPLEMENTATION_PLAN.md                  # 🆕 High-level implementation plan
├── EPICS.md                                # 🆕 Epic breakdown
├── execution/
│   └── GRANULAR_EXECUTION_PLAN.md          # ✅ Existing (from ExecutionPlanGenerator)
├── tasks.json                              # ✅ Existing (from ExecutionPlanGenerator)
├── RESEARCH_FINDINGS.md                    # ✅ Existing (from ResearchCoordinator)
├── VALIDATION_SUMMARY.md                   # ✅ Existing (from ValidationUtils)
└── PROGRESS.md                             # 🆕 Human-readable progress (updated by /execute)
```

---

## Summary of Required Changes

### /plan Skill Changes

| Component | Status | Change Required |
|-----------|--------|-----------------|
| IntakeHandler | ✅ Existing | Add questions for PRD (personas, MVP definition) |
| ResearchCoordinator | ✅ Existing | No change (already works) |
| ExecutionPlanGenerator | ✅ Existing | Move after EpicBreakdown in workflow |
| ValidationUtils | ✅ Existing | No change (already works) |
| **PRDGenerator** | ❌ Missing | **NEW** - Generate PRD from requirements |
| **ArchitectureGenerator** | ❌ Missing | **NEW** - Generate architecture with approval gate |
| **ImplementationPlanGenerator** | ❌ Missing | **NEW** - Generate implementation plan with approval gate |
| **EpicBreakdown** | ❌ Missing | **NEW** - Break epics into stories with approval gate |
| **ApprovalGate** | ❌ Missing | **NEW** - Handle 5 approval gates with iteration |

### /execute Skill Changes

| Component | Status | Change Required |
|-----------|--------|-----------------|
| **SKILL.md** | ❌ Missing | **NEW** - Define execute skill workflow |
| **Executor** | ❌ Missing | **NEW** - Main execution orchestrator |
| **WaveExecutor** | ❌ Missing | **NEW** - Wave execution logic |
| **StoryExecutor** | ❌ Missing | **NEW** - Single story execution |
| **ProgressTracker** | ❌ Missing | **NEW** - PROGRESS.md tracking |
| **QualityGate** | ❌ Missing | **NEW** - Quality gate enforcement |
| **GitOperations** | ❌ Missing | **NEW** - Git commit automation |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| User rejects at approval gate | Medium | Allow iteration (max 3x per gate), provide clear adjustment options |
| /execute takes too long | High | Implement checkpoint recovery, allow pause/resume |
| Resource exhaustion | Medium | ResourceManager enforces 2-3 concurrent agents |
| Agent produces invalid code | High | Quality gates (typecheck, lint, test), retry on failure |
| PROGRESS.md conflicts | Low | Use file locking, single writer (ProgressTracker) |
| Git commit failures | Medium | Implement retry with backoff, fallback to manual commit |

---

## Questions for User

Before proceeding with implementation:

1. **Approval Gates**: Do you agree with 5 approval gates? Too many? Too few?

2. **File Locations**: Should generated files go in `docs/planning/` or somewhere else?

3. **PROGRESS.md**: Should this be in the user's project root or `docs/planning/`?

4. **Git Commits**: Should /execute auto-commit after each story, or batch commits?

5. **MoSCoW Prioritization**: Should we use Must/Should/Could/Won't prioritization for stories?

6. **Architecture Agent**: Should we spawn a specialized "architect" agent, or use general developer?

7. **Documentation Generation**: Should we generate inline documentation as part of /execute or separate?

---

## Next Steps

If this gap analysis is approved:

1. ✅ Implement Phase 1: Fill /plan gaps (PRD, Architecture, Implementation Plan, EpicBreakdown, ApprovalGate)
2. ✅ Implement Phase 2: Implement /execute skill
3. ✅ Implement Phase 3: Integration & testing
4. ✅ End-to-end test with "build me notion like notes app"

**Estimated Total Time**: 6-9 days

---

**END OF GAP ANALYSIS**

Status: ✅ COMPLETE - AWAITING USER APPROVAL

Next Action: User reviews gap analysis and provides feedback on:
- Approval gates (5 gates - too many/few?)
- File locations (docs/planning/ acceptable?)
- PROGRESS.md location (project root or docs/planning/?)
- Any other concerns or adjustments needed

Then: Proceed with implementation once approved
