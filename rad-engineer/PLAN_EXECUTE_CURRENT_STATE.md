# /plan & /execute Skills - Current State & Gaps

**Last Updated**: 2026-01-06
**Purpose**: Track current implementation state and gaps as we iterate on /plan and /execute skills

---

## What Exists (EVIDENCE-BASED)

### /plan Skill ✅ FULLY IMPLEMENTED

**Files**:
- `.claude/skills/plan/SKILL.md` (21,495 bytes, 815 lines)
- `rad-engineer/src/plan/IntakeHandler.ts` (341 lines)
- `rad-engineer/src/plan/ResearchCoordinator.ts` (298 lines)
- `rad-engineer/src/plan/ExecutionPlanGenerator.ts` (554 lines)
- `rad-engineer/src/plan/ValidationUtils.ts` (542 lines)
- `rad-engineer/src/plan/types.ts` (312 lines)
- `rad-engineer/src/plan/index.ts` (16 lines)
- `rad-engineer/test/plan/plan-skill-e2e.test.ts` (399 lines, 6 tests)

**Current Workflow**:
```
User Query
  ↓
Phase 1: INTAKE (IntakeHandler)
  - Receive query
  - Detect complexity (simple/medium/complex)
  - Ask 5 clarifying questions via AskUserQuestion
  - Build StructuredRequirements
  ↓
Phase 2: RESEARCH (ResearchCoordinator)
  - Calculate agent count (2-3 based on complexity)
  - Check ResourceManager (enforces max 2-3 concurrent)
  - Spawn 2-3 parallel research agents:
    * Agent 1: Technical Feasibility (Sonnet for complex, Haiku for simple/medium)
    * Agent 2: Codebase Patterns (Haiku)
    * Agent 3: Best Practices (Sonnet, complex only)
  - Consolidate findings into ResearchFindings
  ↓
Phase 3: SPECIFICATION (Optional)
  - Generate component specifications
  - Generate integration specifications
  - (Skipped for simple features)
  ↓
Phase 4: EXECUTION PLAN GENERATION (ExecutionPlanGenerator)
  - Build waves (2-5 waves based on complexity)
  - Generate stories (15 stories for complex)
  - Select models per story (haiku/sonnet/opus)
  - Generate GRANULAR_EXECUTION_PLAN.md (YAML)
  - Generate tasks.json (machine-readable)
  ↓
Phase 5: VALIDATION (ValidationUtils)
  - Evidence alignment check
  - Completeness check
  - Dependency validation (DFS cycle detection)
  - Parseability check (ensures /execute can consume)
  ↓
Phase 6: USER APPROVAL (Single gate)
  - Present plan summary
  - Ask for approval
  - If approved → proceed to /execute
```

**Generated Output Files**:
```
docs/planning/
├── execution/
│   └── GRANULAR_EXECUTION_PLAN.md
├── tasks.json
├── RESEARCH_FINDINGS.md
├── VALIDATION_SUMMARY.md
└── specs/
    ├── component-specs.md
    └── integration-specs.md
```

---

### /execute Skill ✅ FULLY IMPLEMENTED

**Files**:
- `.claude/skills/execute/SKILL.md` (42,956 bytes, 1,480 lines)

**Current Workflow**:
```
Read GRANULAR_EXECUTION_PLAN.md
  ↓
Parse wave structure and parallel execution groups
  ↓
Execute waves sequentially:
  For each wave:
    - Parse dependency layers
    - Spawn agents in parallel (max 2-3 concurrent enforced by ResourceManager)
    - Each agent follows TDD: 🔴 RED → 🟢 GREEN → 🔵 REFACTOR
    - Run quality gates (typecheck, lint, test)
    - Update PROGRESS.md and tasks.json
    - Create checkpoint in memory-keeper
  ↓
Run integration tests
  ↓
Complete
```

**Key Features**:
- Local execution mode (E2B disabled due to data transfer failures)
- TDD enforcement (Red → Green → Refactor)
- Parallel execution from GRANULAR_EXECUTION_PLAN.md
- Wave orchestration with dependency resolution
- Progress tracking (PROGRESS.md + tasks.json)
- Quality gates (typecheck, lint, test)
- Memory-keeper state persistence
- Error recovery (3 attempts max)

---

## What's Missing (GAPS)

### Gap 1: Missing PRD (Product Requirements Document) Phase

**Current**: Jumps directly from user query to research without defining the product properly

**Missing**:
- Problem statement definition
- User persona identification
- User story generation from requirements
- Functional vs non-functional requirements
- MVP vs backlog separation
- User approval gate for product direction

**Impact**: Implementation may start without clear product vision, leading to rework

---

### Gap 2: Missing Architecture Definition Phase

**Current**: Tech stack comes from user answer in intake, no architecture design

**Missing**:
- High-level architecture design
- Technology stack rationale
- Component boundary definition
- Data model design
- Integration point identification
- Architecture review with user approval

**Impact**: Tech decisions made without proper analysis, may lead to architectural issues

---

### Gap 3: Missing High-Level Implementation Plan

**Current**: Goes directly to detailed stories without high-level plan

**Missing**:
- Gap analysis (what exists vs what needs to be built)
- Epic breakdown before story breakdown
- Milestone definition
- Dependency mapping at epic level
- Risk assessment for implementation

**Impact**: Lose forest-for-trees perspective, may miss strategic dependencies

---

### Gap 4: Missing Epic → Story Breakdown

**Current**: Stories generated directly from requirements

**Missing**:
- Epic organization (grouping related stories)
- Epic-level dependencies
- Epic completion criteria
- Epic-level estimation

**Impact**: Harder to track progress at meaningful levels, loses context

---

### Gap 5: Missing User Approval Gates

**Current**: Only 1 approval gate at the very end (after execution plan)

**Missing**:
- Approval after PRD (Gate 1)
- Approval after Architecture (Gate 2)
- Approval after Implementation Plan (Gate 3)
- Approval after Epic Breakdown (Gate 4)
- Current approval after Execution Plan (Gate 5)

**Impact**: User can't steer direction early, may waste work on wrong direction

---

### Gap 6: Missing Human-Readable Progress Tracking

**Current**: tasks.json is machine-readable only, PROGRESS.md format not defined for /plan output

**Missing**:
- PROGRESS.md template for user projects
- Human-readable story tracking
- Visual progress indicators
- Current work context

**Impact**: Hard for humans to understand progress without digging into JSON

---

### Gap 7: Connection to orchestrate-spec

**Current**: /plan PROGRESS.md and orchestrate-spec PROGRESS.md are separate concerns

**Clarification Needed**:
- orchestrate-spec PROGRESS.md tracks platform development (building rad-engineer itself)
- /plan PROGRESS.md should track user project development (what user is building)

**Status**: These are correctly separate, need documentation

---

### Gap 8: Missing Deployment Planning

**Current**: /execute skill stops at code completion

**Missing**:
- Deployment strategy
- CI/CD pipeline setup
- Environment configuration
- Rollback planning
- Monitoring setup

**Impact**: Working code doesn't mean deployed system

---

## The User's Envisioned Workflow (What We Want)

```
User Query: "build me notion style notes app"
  ↓
Intake (Q&A - 5-10 questions max)
  ↓
PRD Generation → [APPROVAL GATE 1]
  - Problem statement
  - User personas
  - User stories
  - Functional/non-functional requirements
  - MVP vs backlog
  ↓
Research (2-3 parallel agents)
  - Technical feasibility
  - Codebase patterns
  - Best practices
  ↓
Architecture Generation → [APPROVAL GATE 2]
  - High-level architecture
  - Tech stack with rationale
  - Component boundaries
  - Data model
  - Integration points
  ↓
Implementation Planning → [APPROVAL GATE 3]
  - Gap analysis
  - Epic breakdown
  - Milestones
  - Dependencies
  - Risk assessment
  ↓
Epic Breakdown → [APPROVAL GATE 4]
  - Group stories into epics
  - Epic-level estimation
  - Epic dependencies
  ↓
Execution Plan Generation → [APPROVAL GATE 5]
  - Detailed stories
  - Wave structure
  - Parallel execution groups
  ↓
Validation
  - Evidence alignment
  - Completeness
  - Dependencies
  - Parseability
  ↓
/execute skill
  - Story-by-story TDD
  - PROGRESS.md tracking
  - Quality gates
  ↓
Deployment Planning → [APPROVAL GATE 6]
  - Deployment strategy
  - CI/CD setup
  - Environment config
  - Monitoring
  ↓
Deployed System
```

---

## Implementation Status

### Phase 1: /plan Skill Gaps

| Component | Status | Priority |
|-----------|--------|----------|
| PRDGenerator | ❌ Missing | HIGH |
| ArchitectureGenerator | ❌ Missing | HIGH |
| ImplementationPlanGenerator | ❌ Missing | MEDIUM |
| EpicBreakdown | ❌ Missing | MEDIUM |
| ApprovalGate system | ❌ Missing | HIGH |
| ProgressTracker (for PROGRESS.md) | ❌ Missing | MEDIUM |

### Phase 2: /execute Skill

| Component | Status | Priority |
|-----------|--------|----------|
| Executor orchestration | ✅ Complete | - |
| WaveExecutor | ✅ Complete | - |
| StoryExecutor | ✅ Complete | - |
| ProgressTracker | ✅ Complete | - |
| QualityGate | ✅ Complete | - |
| Deployment planning | ❌ Missing | HIGH |

---

## Next Steps

[To be updated as we iterate]

---

## Research Questions

**Q1**: What is truly required in planning phase for implementation to be 100% deterministic and complete? (from intake till deployment)

**Q2**: Should we adapt BMAD's advanced elicitation process?

---

## Q1 Research Findings: What's Required for Deterministic Implementation?

### Key Insight: "Great Plan = 99% Outcomes Achieved" May Be Overthinking

Based on research across multiple sources, the key finding is that **over-planning can be as harmful as under-planning**. The sweet spot is "just enough planning" with these critical elements:

### Critical Planning Artifacts (From Research)

#### 1. **Product Requirements Document (PRD)** - MOST CRITICAL
**Purpose**: Defines the WHAT and WHY before HOW

**Essential Elements**:
- Clear product vision and objectives
- User personas and user stories
- Functional requirements (what it does)
- Non-functional requirements (how it performs)
- Success metrics and KPIs
- Feature prioritization (MoSCoW: Must, Should, Could, Won't)
- MVP vs backlog separation

**Best Practices**:
- Start with vision and objectives
- Include acceptance criteria for each requirement
- Maintain traceability throughout project
- Keep as living document (updated as understanding deepens)

#### 2. **Architecture Document** - HIGH PRIORITY
**Purpose**: Describes system structure, components, and interactions

**Essential Elements**:
- High-level architecture before detailed design
- System boundaries and interfaces
- Architectural Decision Records (ADRs) with trade-offs
- Technology stack with justification
- Non-functional requirements (performance, security, scalability)
- Diagrams: C4 model, UML, or system architecture

#### 3. **Implementation Plan** - HIGH PRIORITY
**Purpose**: Translates architecture into working code

**Essential Elements**:
- Phases or sprints breakdown
- Milestones and deliverables
- Resource allocation and timeline
- Dependencies and critical path
- Risk mitigation strategies
- Definition of Done for each iteration

#### 4. **Additional Supporting Artifacts**
- **Project Charter**: Authorizes project and defines objectives
- **Work Breakdown Structure (WBS)**: Decomposes deliverables
- **Risk Register**: Identifies, assesses, and tracks risks
- **Test Strategy**: Testing approach and acceptance criteria
- **Deployment Plan**: Release and rollout procedures (GAP in our current system)

### Success Factors for Deterministic Implementation

From research across multiple sources ([SoftwareMind](https://softwaremind.com/blog/8-steps-for-successful-software-implementation/), [Seamgen](https://www.seamgen.com/blog/key-factors-software-project-success), [Atlassian](https://www.atlassian.com/agile/product-management/requirements)):

#### **Planning Phase Success Factors**:

1. **Clear Objectives and Goals**
   - Well-defined goals before implementation
   - End-user focus with early user testing

2. **Comprehensive Requirements Management**
   - Clear requirements and specifications
   - Traceability throughout project
   - Change and configuration management
   - Stakeholder collaboration

3. **Strategic Approach**
   - Six-phase strategy: **Plan → Design → Build → Test → Deploy → Optimize**
   - Realistic schedule and timeline
   - Proper documentation and knowledge transfer

### The Deterministic Implementation Formula

```
DETERMINISTIC = PRD (clear WHAT) +
                ARCHITECTURE (clear HOW) +
                IMPLEMENTATION PLAN (clear WHEN/WHO) +
                VALIDATION (evidence alignment) +
                QUALITY GATES (enforcement) +
                DEPLOYMENT PLAN (production readiness)
```

### Key Takeaway: What We're Missing

Based on current implementation vs research findings:

| Artifact | Research Says | Current State | Gap |
|----------|---------------|---------------|-----|
| PRD | ESSENTIAL | ❌ Missing | HIGH - Need PRDGenerator |
| Architecture | HIGH PRIORITY | ❌ Missing | HIGH - Need ArchitectureGenerator |
| Implementation Plan | HIGH PRIORITY | ❌ Missing | MEDIUM - Need ImplementationPlanGenerator |
| Epic Breakdown | BEST PRACTICE | ❌ Missing | MEDIUM - Need EpicBreakdown |
| Multiple Approval Gates | CRITICAL | ❌ Missing | HIGH - Only 1 gate at end |
| Deployment Plan | ESSENTIAL | ❌ Missing | HIGH - Stops at code completion |

### Sources:
- [Project Management Artifacts Guide](https://projectmanagementacademy.net/resources/blog/types-of-project-management-artifacts/)
- [Atlassian PRD Guide](https://www.atlassian.com/agile/product-management/requirements)
- [8 Steps for Successful Software Implementation](https://softwaremind.com/blog/8-steps-for-successful-software-implementation/)
- [10 Key Factors to Ensure Software Project Success](https://www.seamgen.com/blog/key-factors-software-project-success)
- [Deterministic LLM Workflow Framework (arXiv 2025)](https://www.arxiv.org/pdf/2508.02721)
- [Requirements Completeness: A Deterministic Approach](https://www.researchgate.net/publication/250075690_Requirements_Completeness_A_Deterministic_Approach)

---

## Q2 Research Findings: BMAD Advanced Elicitation Analysis

### What is BMAD?

**BMAD** (Business Methodology for AI Development) is a comprehensive business methodology framework for AI development with:
- 50+ elicitation methods organized by category
- Advanced elicitation workflow for LLM brainstorming
- Multi-phase planning workflows (Analysis → Plan → Solution)
- PRD generation with 11-step collaborative process

### Advanced Elicitation: The Core Innovation

**Concept**: "LLM brainstorming with itself" - The inverse of brainstorming

**How It Works**:
1. **Context Analysis**: LLM analyzes content type, complexity, stakeholder needs, risk level
2. **Smart Method Selection**: Intelligently selects 5 methods from 50+ based on context
3. **Iterative Enhancement**: Each method builds on previous improvements
4. **User Control**: Accept or discard each enhancement

### The 50+ Elicitation Methods (10 Categories)

| Category | Focus | Example Methods |
|----------|-------|-----------------|
| **Core** | Foundational reasoning | First Principles Analysis, 5 Whys, Socratic Questioning |
| **Collaboration** | Multiple perspectives | Stakeholder Round Table, Expert Panel Review, Debate Club |
| **Advanced** | Complex reasoning | Tree of Thoughts, Graph of Thoughts, Self-Consistency |
| **Competitive** | Adversarial stress-testing | Red Team vs Blue Team, Shark Tank Pitch, Code Review Gauntlet |
| **Technical** | Architecture & code | Architecture Decision Records, Rubber Duck Debugging |
| **Creative** | Innovation | SCAMPER, Reverse Engineering, Random Input Stimulus |
| **Research** | Evidence-based | Literature Review Personas, Thesis Defense, Comparative Matrix |
| **Risk** | Risk identification | Pre-mortem Analysis, Failure Mode Analysis, Chaos Monkey |
| **Learning** | Understanding verification | Feynman Technique, Active Recall Testing |
| **Philosophical** | Conceptual clarity | Occam's Razor, Ethical Dilemmas |
| **Retrospective** | Reflection | Hindsight Reflection, Lessons Learned |

### BMAD's PRD Workflow: 11-Step Collaborative Process

**Key Discovery**: BMAD's PRD workflow is exceptionally thorough:

1. **Step 1**: Product Brief Creation
2. **Step 2**: Project & Domain Discovery (with classification signals)
3. **Step 3**: Success Criteria Definition
4. **Step 4**: User Journeys & Personas
5. **Step 5**: Domain Modeling
6. **Step 6**: Innovation & Differentiation
7. **Step 7**: Project Type Classification
8. **Step 8**: Scoping & Prioritization
9. **Step 9**: Functional Requirements
10. **Step 10**: Non-Functional Requirements
11. **Step 11**: PRD Validation

**Critical Features**:
- **A/P/C Menu**: Advanced Elicitation / Party Mode / Continue
- **Smart Classification**: Auto-detects project type, domain, complexity
- **Greenfield vs Brownfield**: Different paths for new vs existing projects
- **Document Leverage**: Uses existing docs to accelerate discovery
- **Iterative Enhancement**: Each step offers A/P for refinement

### Should We Adapt BMAD's Approach?

**RECOMMENDATION: YES - But Selectively**

#### What to Adopt:

1. **Advanced Elicitation Methods** (HIGH VALUE)
   - Adapt 5-10 most relevant methods for our use case
   - Implement as optional refinement after each major phase
   - Focus on: Stakeholder Round Table, Red Team vs Blue Team, Pre-mortem Analysis, First Principles

2. **A/P/C Menu Pattern** (HIGH VALUE)
   - Replace single approval gate with A/P/C after each phase
   - A: Advanced Elicitation (refine with methods)
   - P: Party Mode (multiple perspectives - optional)
   - C: Continue (accept and proceed)

3. **Smart Classification** (MEDIUM VALUE)
   - Auto-detect project complexity and domain
   - Use to tailor questions and depth
   - Avoid over-engineering for simple projects

4. **Greenfield vs Brownfield Paths** (HIGH VALUE)
   - Different workflows for new features vs new projects
   - Leverage existing codebase analysis
   - Ask relevant questions based on context

#### What to Skip:

1. **Full 11-Step PRD Process** (Too heavy)
   - Our users want faster iteration
   - Compress to 5-6 critical steps
   - Keep advanced elicitation as optional depth

2. **Party Mode** (Optional/Later)
   - Requires multiple agent personas
   - Nice-to-have, not essential for MVP
   - Can add later if needed

3. **All 50+ Methods** (Overkill)
   - Focus on 5-10 most relevant
   - Add more as needed based on usage

### Proposed Integration: Enhanced /plan with BMAD-inspired Elements

```
User Query: "build me notion style notes app"
  ↓
Phase 1: INTAKE (Enhanced)
  - Smart classification (complexity, domain, project type)
  - Greenfield vs Brownfield detection
  - 5-10 clarifying questions (context-aware)
  ↓
Phase 2: PRD Generation (NEW)
  - Problem statement
  - User personas
  - User stories
  - Functional/non-functional requirements
  - MVP vs backlog
  → [A/P/C MENU]
     - A: Advanced Elicitation (5 methods for refinement)
     - P: (Future) Multiple perspectives
     - C: Continue to Research
  ↓
Phase 3: RESEARCH (2-3 parallel agents)
  - Technical feasibility
  - Codebase patterns
  - Best practices
  ↓
Phase 4: ARCHITECTURE (NEW)
  - High-level architecture
  - Tech stack rationale
  - Component boundaries
  - Data model
  - Integration points
  → [A/P/C MENU]
  ↓
Phase 5: IMPLEMENTATION PLAN (NEW)
  - Gap analysis
  - Epic breakdown
  - Milestones
  - Dependencies
  - Risk assessment
  → [A/P/C MENU]
  ↓
Phase 6: EXECUTION PLAN (Existing)
  - Detailed stories
  - Wave structure
  → [A/P/C MENU]
  ↓
Phase 7: VALIDATION (Existing)
  - Evidence alignment
  - Completeness
  - Dependencies
  ↓
Phase 8: /execute (Existing)
  - TDD implementation
  - Progress tracking
  ↓
Phase 9: DEPLOYMENT PLAN (NEW)
  - Deployment strategy
  - CI/CD setup
  - Monitoring
  → [A/P/C MENU]
```

### Sources:
- [BMAD GitHub Repository](https://github.com/bmad-code-org/BMAD-METHOD)
- [BMAD Advanced Elicitation Documentation](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/modules/core/advanced-elicitation.md)
- [Complete Business Analyst's Guide to BMAD](https://medium.com/@hieutrantrung.it/the-complete-business-analysts-guide-to-bmad-method-from-zero-to-expert-project-planning-in-30-3cf3995a0480)
- BMAD Methods CSV (50 methods across 10 categories)
- BMAD PRD Workflow (11-step collaborative process)

---

## Q3: Architecture Decision Framework - Evidence-Based Review

### Objective

Design an Architecture Generator that:
- Uses **web search** to find current technology options (not stale LLM knowledge)
- Presents **2-3 best options** with a clear recommendation
- Provides **strong rationale** (the "why") for informed decision-making
- Sources evidence from web search results
- Enables "doing the right thing to meet objectives and solve problems"

### Research Findings

#### BMAD Architecture Framework (HIGHLY ADAPTABLE)

**Source**: `bmad-research/src/modules/bmm/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md`

**Key Patterns We Can Adapt**:

1. **Mandatory Web Search for Current Tech** (Line 12, 19, 167-170):
```
🌐 ALWAYS search the web to verify current technology versions

Search the web: "{{technology}} latest stable version"
Search the web: "{{technology}} current LTS version"
Search the web: "{{technology}} production readiness"
```

2. **Decision Categories** (Lines 84-122):
   - Data Architecture
   - Authentication & Security
   - API & Communication
   - Frontend Architecture
   - Infrastructure & Deployment

3. **Collaborative Facilitation Modes** (Lines 130-161):
   - Expert Mode: Concise options with trade-offs
   - Intermediate Mode: Recommendation with rationale
   - Beginner Mode: Educational with analogies

4. **Decision Record Format** (Lines 182-189):
```markdown
- Category: {{category}}
- Decision: {{user_choice}}
- Version: {{verified_version_if_applicable}}
- Rationale: {{user_reasoning_or_default}}
- Affects: {{components_or_epics}}
- Provided by Starter: {{yes_if_from_starter}}
```

5. **A/P/C Menu Pattern** (Line 20, 27-31):
   - A: Advanced Elicitation (explore alternatives)
   - P: Party Mode (multiple perspectives)
   - C: Continue (accept and proceed)

#### Web Research: 2025 Tech Stack Selection Frameworks

**Key Sources**:
- [FullScale: How to Choose a Technology Stack in 2025](https://fullscale.io/blog/how-to-choose-tech-stack/)
- [Noos Digital: Decision Framework for 2025](https://noosdigital.com/blog/choosing-the-right-tech-stack-a-decision-framework-for-2025)
- [Dev.to: Choosing Tech Stack in 2025: A Practical Guide](https://dev.to/dimeloper/choosing-tech-stack-in-2025-a-practical-guide-4gll)
- [Vamenture: How to Choose the Right Tech Stack](https://www.vamenture.com/blog/how-to-choose-the-right-tech-stack-for-your-web-application)
- [AI-Driven Decision Support Systems for Software Architecture (ResearchGate 2025)](https://www.researchgate.net/publication/395841347_AI-Driven_Decision_Support_Systems_for_Software_Architecture_A_Framework_for_Intelligent_Design_Decision-Making_2025)

**Unified Decision Criteria for 2025**:

| Dimension | Criteria | Why It Matters |
|-----------|----------|-----------------|
| **Business Objectives** | Project goals, timeline, budget | Alignment with outcomes |
| **Team Capabilities** | Skills, expertise, learning curve | Implementation success |
| **Performance** | Real-time needs, data processing, scalability | Meets user requirements |
| **Ecosystem Health** | Community support, library availability, documentation | Long-term viability |
| **Cost** | Development cost, operational cost, TCO | Financial sustainability |
| **Maintainability** | Code quality, updates, technical debt | Future-proofing |

**6-Step Selection Framework** (from FullScale 2025):
1. Define project requirements
2. Assess team expertise
3. Evaluate technology options
4. Consider ecosystem and community
5. Analyze cost implications
6. Make decision with rationale

### Outcomes

**✅ BMAD Has What We Need** - We should adapt BMAD's architecture decision framework, not create our own from scratch.

**Key Adaptations Required**:
1. **Focus on 2-3 options** (not unlimited exploration)
2. **Strong recommendation with rationale** (BMAD is more facilitative, we need to be more directive)
3. **Evidence sourcing** (cite web search results as sources)
4. **Template for presenting options** (structured format for clarity)

### Task List

#### Phase 1: ArchitectureGenerator Implementation

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| **1.1 Create ArchitectureGenerator.ts** | HIGH | 4h | None |
| - Web search integration for current tech versions | | | |
| - Option research (2-3 best candidates per category) | | | |
| - Recommendation engine with rationale | | | |
| - Evidence sourcing (URLs, dates) | | | |
| **1.2 Create TechOption template** | HIGH | 2h | 1.1 |
| - Option name, version, description | | | |
| - Pros/cons with evidence | | | |
| - Fit scoring (business, team, performance) | | | |
| - Web search source URLs | | | |
| **1.3 Create ArchitectureDecisionRecord type** | HIGH | 1h | 1.1 |
| - Category, decision, version, rationale | | | |
| - Affects, trade-offs, alternatives | | | |
| - Evidence sources | | | |
| **1.4 Integrate A/P/C menu** | MEDIUM | 2h | 1.1 |
| - Advanced Elicitation for alternatives | | | |
| - Party Mode (optional/future) | | | |
| - Continue to accept | | | |
| **1.5 Add tests** | MEDIUM | 3h | 1.1-1.4 |
| - Unit tests for web search mocking | | | |
| - Integration tests for generator | | | |
| - E2E test for "notion notes app" scenario | | | |

**Total Effort**: ~12 hours (1.5-2 days)

#### Phase 2: Integration

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| **2.1 Update /plan skill** | HIGH | 2h | Phase 1 |
| - Add Architecture phase after Research | | | |
| - Wire A/P/C menu after Architecture | | | |
| **2.2 Update execution plan** | MEDIUM | 1h | 2.1 |
| - Include architecture decisions | | | |
| - Map decisions to stories | | | |
| **2.3 Update validation** | MEDIUM | 2h | 2.1 |
| - Validate architecture completeness | | | |
| - Validate decision traceability | | | |

**Total Effort**: ~5 hours

#### Grand Total: ~17 hours (2-3 days)

### Proposed ArchitectureDecision Template

```markdown
## Architecture Decision: {{Category}}

### Options Evaluated

#### Option 1: {{Name}} (RECOMMENDED) ⭐

**Version**: {{Current Version (from web search)}}
**Released**: {{Release Date}}

**Why This Option**:
{{Rationale aligned with business objectives, team skills, performance requirements}}

**Pros**:
- ✅ {{Pro 1 with evidence}}
- ✅ {{Pro 2 with evidence}}
- ✅ {{Pro 3 with evidence}}

**Cons**:
- ⚠️ {{Con 1 with mitigation}}
- ⚠️ {{Con 2 with mitigation}}

**Evidence**:
- [Source 1]({{URL}}) - {{Key finding}}
- [Source 2]({{URL}}) - {{Key finding}}

**Fit Score**: 9/10
- Business: 9/10 - {{why}}
- Team: 8/10 - {{why}}
- Performance: 10/10 - {{why}}

---

#### Option 2: {{Name}}

**Version**: {{Current Version (from web search)}}

**Pros**:
- ✅ {{Pro 1}}
- ✅ {{Pro 2}}

**Cons**:
- ⚠️ {{Con 1}}
- ⚠️ {{Con 2}}

**Evidence**:
- [Source]({{URL}}) - {{Key finding}}

**Fit Score**: 7/10
- Business: 7/10
- Team: 6/10
- Performance: 8/10

---

#### Option 3: {{Name}} (Alternative)

**Version**: {{Current Version (from web search)}}

**Best For**: {{Specific use case}}

**Fit Score**: 6/10

### Decision Record

**Selected**: Option 1 ({{Name}})
**Date**: {{Date}}
**Rationale**: {{Final reasoning}}
**Affects**: {{Components/Epics affected}}
**Trade-offs Accepted**: {{What we're giving up}}

---

### Implementation Notes

- **Version to Use**: {{Specific version}}
- **Installation**: `npm install {{package}}@{{version}}`
- **Migration Notes**: {{Any migration guidance}}
- **Known Issues**: {{From web search}}
```

### Sources

**BMAD Framework**:
- `bmad-research/src/modules/bmm/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md`
- `bmad-research/src/modules/bmm/workflows/3-solutioning/create-architecture/workflow.md`
- `bmad-research/src/modules/bmm/workflows/3-solutioning/create-architecture/architecture-decision-template.md`

**Web Research - Tech Stack Selection 2025**:
- [FullScale: How to Choose a Technology Stack in 2025](https://fullscale.io/blog/how-to-choose-tech-stack/)
- [Noos Digital: Decision Framework for 2025](https://noosdigital.com/blog/choosing-the-right-tech-stack-a-decision-framework-for-2025)
- [Dev.to: Choosing Tech Stack in 2025: A Practical Guide](https://dev.to/dimeloper/choosing-tech-stack-in-2025-a-practical-guide-4gll)
- [Vamenture: How to Choose the Right Tech Stack](https://www.vamenture.com/blog/how-to-choose-the-right-tech-stack-for-your-web-application)
- [ResearchGate: AI-Driven Decision Support Systems 2025](https://www.researchgate.net/publication/395841347_AI-Driven_Decision_Support_Systems_for_Software_Architecture_A_Framework_for_Intelligent_Design_Decision-Making_2025)

| Date | Change | Author |
|------|--------|--------|
| 2026-01-06 | Initial document - current state and gaps | Claude |
| 2026-01-06 | Added Q1 research: Planning artifacts for deterministic implementation | Claude |
| 2026-01-06 | Added Q2 research: BMAD advanced elicitation analysis + recommendations | Claude |

| 2026-01-06 | Added Q3: Architecture decision framework evidence-based review + task list | Claude |

---

## COMPREHENSIVE IMPLEMENTATION TODOs

**Created**: 2026-01-06
**Purpose**: Detailed task breakdown for implementing PRD, Implementation Planning, Deployment Planning, and Deterministic Controls
**Status**: READY FOR USER APPROVAL

---

## IMPLEMENTATION PRIORITY ORDER

Based on user requirements and dependencies:

```
1. PRDGenerator (HIGHEST - "please do this first")
2. ImplementationPlanGenerator (HIGH - depends on PRD)
3. EpicBreakdown (HIGH - depends on ImplementationPlan)
4. ArchitectureGenerator (HIGH - can parallel with above)
5. DeterministicControls (MEDIUM - iterative during execution)
6. GitStrategy (MEDIUM - integrates with ImplementationPlan)
7. DeploymentPlanGenerator (HIGH - but comes last in flow)
8. /plan Skill Integration (HIGH - ties everything together)
9. TestingStrategy (LOW - might be part of /execute)
```

---

## COMPONENT 1: PRDGenerator (HIGHEST PRIORITY)

**User Quote**: "please do this first" because "Architecture design depends on requirements documented in PRD" and "this is where most user engagement with back and forth Q&A happens for product vision, outcomes, problems being solved, FRs and NFRs, all get decided here."

### Evidence from Research

**BMAD PRD Workflow** (11 steps - we'll compress to 5-6):
- `bmad-research/src/modules/bmm/workflows/2-plan-workflows/prd/workflow.md` - Step-file architecture
- `bmad-research/src/modules/bmm/workflows/2-plan-workflows/prd/steps/step-01-init.md` - Initialization with brownfield/greenfield detection
- `bmad-research/src/modules/bmm/workflows/2-plan-workflows/prd/steps/step-02-discovery.md` - Discovery with classification
- `bmad-research/src/modules/bmm/workflows/2-plan-workflows/prd/prd-template.md` - Template structure

**Key Patterns to Adapt**:
1. Step-file architecture (sequential enforcement, no skipping)
2. A/P/C menu after each major phase
3. Greenfield vs Brownfield detection
4. Document leverage (discover existing docs)
5. Smart classification (project type, domain, complexity)

### File Structure

```
rad-engineer/src/plan/
├── PRDGenerator.ts          (NEW - main generator)
├── prd/
│   ├── steps/
│   │   ├── step-01-init.ts         (Initialization)
│   │   ├── step-02-discovery.ts    (Problem & Vision)
│   │   ├── step-03-personas.ts     (User Personas & Stories)
│   │   ├── step-04-requirements.ts (FRs & NFRs)
│   │   ├── step-05-scope.ts        (MVP vs Backlog)
│   │   └── step-06-validation.ts   (PRD Validation)
│   ├── templates/
│   │   ├── prd-template.md         (PRD output template)
│   │   └── greenfield.md           (Greenfield questions)
│   │   └── brownfield.md           (Brownfield questions)
│   ├── types.ts                    (PRD types)
│   └── utils.ts                    (Classification utilities)
```

### Detailed Tasks

#### 1.1 Create PRD Types (1-2 hours)

**File**: `rad-engineer/src/plan/prd/types.ts`

**Types to Define**:
```typescript
// Project classification
export enum ProjectType {
  GREENFIELD = 'greenfield',
  BROWNFIELD = 'brownfield'
}

export enum Domain {
  WEB_APP = 'web-app',
  MOBILE_APP = 'mobile-app',
  API_SERVICE = 'api-service',
  DATA_PIPELINE = 'data-pipeline',
  LIBRARY_SDK = 'library-sdk',
  DEVOPS_TOOL = 'devops-tool',
  OTHER = 'other'
}

export enum Complexity {
  SIMPLE = 'simple',      // 1-3 days
  MEDIUM = 'medium',      // 1-2 weeks
  COMPLEX = 'complex'     // 2-4 weeks
}

// PRD structure
export interface PRDDocument {
  metadata: PRDMetadata;
  problem: ProblemDefinition;
  vision: ProductVision;
  personas: Persona[];
  userStories: UserStory[];
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: NonFunctionalRequirement[];
  scope: ScopeDefinition;
  validation: ValidationResult;
}

export interface PRDMetadata {
  projectName: string;
  projectType: ProjectType;
  domain: Domain;
  complexity: Complexity;
  createdAt: string;
  updatedAt: string;
  stepsCompleted: string[];
  inputDocuments: string[];
}

export interface ProblemDefinition {
  currentPainPoints: string[];
  problemsToSolve: string[];
  targetAudience: string;
  valueProposition: string;
}

export interface ProductVision {
  vision: string;
  objectives: string[];
  successCriteria: string[];
  keyDifferentiators: string[];
}

export interface Persona {
  name: string;
  role: string;
  goals: string[];
  painPoints: string[];
  behaviors: string[];
  scenarios: string[];
}

export interface UserStory {
  id: string;
  asA: string;        // "As a <persona>"
  iWant: string;      // "I want <feature>"
  soThat: string;     // "So that <benefit>"
  priority: 'must' | 'should' | 'could' | 'wont';
  acceptanceCriteria: string[];
  estimatedComplexity: Complexity;
}

export interface FunctionalRequirement {
  id: string;
  category: string;
  description: string;
  rationale: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  dependencies: string[];
  acceptanceCriteria: string[];
  userStories: string[];  // Links to user story IDs
}

export interface NonFunctionalRequirement {
  id: string;
  category: 'performance' | 'security' | 'scalability' | 'maintainability' | 'usability' | 'accessibility';
  description: string;
  metric: string;
  targetValue: string;
  priority: 'must' | 'should';
  testMethod: string;
}

export interface ScopeDefinition {
  mvp: {
    features: string[];
    requirements: string[];
    userStories: string[];
  };
  backlog: {
    phase2: string[];
    phase3: string[];
    future: string[];
  };
  outOfScope: string[];
}
```

**Evidence**: BMAD uses similar classification at `step-02-discovery.md` lines 50-150

---

#### 1.2 Create PRD Templates (1-2 hours)

**File**: `rad-engineer/src/plan/prd/templates/prd-template.md`

```markdown
---
stepsCompleted: []
inputDocuments: []
projectType: 'greenfield'
domain: 'web-app'
complexity: 'medium'
createdAt: '{{date}}'
updatedAt: '{{date}}'
workflowType: 'prd'
---

# Product Requirements Document - {{projectName}}

**Author**: {{userName}}
**Created**: {{date}}
**Last Updated**: {{date}}
**Project Type**: {{projectType}}
**Domain**: {{domain}}
**Complexity**: {{complexity}}

---

## 1. Problem Definition

### Current Pain Points
{{painPoints}}

### Problems We're Solving
{{problemsToSolve}}

### Target Audience
{{targetAudience}}

### Value Proposition
{{valueProposition}}

---

## 2. Product Vision

### Vision Statement
{{vision}}

### Objectives
{{#each objectives}}
- {{this}}
{{/each}}

### Success Criteria
{{#each successCriteria}}
- {{this}}
{{/each}}

### Key Differentiators
{{#each differentiators}}
- {{this}}
{{/each}}

---

## 3. User Personas

{{#each personas}}
### {{name}}
- **Role**: {{role}}
- **Goals**: {{goals}}
- **Pain Points**: {{painPoints}}
- **Behaviors**: {{behaviors}}
- **Scenarios**: {{scenarios}}
{{/each}}

---

## 4. User Stories

{{#each userStories}}
### {{id}}: {{title}} [{{priority}}]

**As a** {{asA}}
**I want** {{iWant}}
**So that** {{soThat}}

**Acceptance Criteria**:
{{#each acceptanceCriteria}}
- [ ] {{this}}
{{/each}}

**Estimated Complexity**: {{complexity}}

---
{{/each}}

---

## 5. Functional Requirements

{{#each functionalReqs}}
### {{id}}: {{category}} - {{description}} [{{priority}}]

**Rationale**: {{rationale}}

**Dependencies**: {{dependencies}}

**Acceptance Criteria**:
{{#each acceptanceCriteria}}
- [ ] {{this}}
{{/each}}

**Related User Stories**: {{userStories}}

---
{{/each}}

---

## 6. Non-Functional Requirements

{{#each nonFunctionalReqs}}
### {{id}}: {{category}} - {{description}} [{{priority}}]

**Metric**: {{metric}}
**Target Value**: {{targetValue}}
**Test Method**: {{testMethod}}

---
{{/each}}

---

## 7. Scope Definition

### MVP (Minimum Viable Product)
**Features**:
{{#each mvp.features}}
- {{this}}
{{/each}}

**Requirements**:
{{#each mvp.requirements}}
- {{this}}
{{/each}}

**User Stories**:
{{#each mvp.userStories}}
- {{this}}
{{/each}}

### Phase 2
{{#each backlog.phase2}}
- {{this}}
{{/each}}

### Phase 3
{{#each backlog.phase3}}
- {{this}}
{{/each}}

### Future Considerations
{{#each backlog.future}}
- {{this}}
{{/each}}

### Out of Scope
{{#each outOfScope}}
- {{this}}
{{/each}}

---

## 8. Validation

**Completeness**: {{validation.completeness}}
**Clarity**: {{validation.clarity}}
**Feasibility**: {{validation.feasibility}}
**Traceability**: {{validation.traceability}}

**Issues**: {{validation.issues}}
**Recommendations**: {{validation.recommendations}}
```

---

#### 1.3 Create PRDGenerator.ts (4-6 hours)

**File**: `rad-engineer/src/plan/prd/PRDGenerator.ts`

**Responsibilities**:
1. Initialize PRD workflow (greenfield/brownfield detection)
2. Orchestrate step-by-step PRD creation
3. Manage A/P/C menu after each step
4. Save PRD document
5. Validate completeness

**Key Methods**:
```typescript
export class PRDGenerator {
  private currentStep: number = 0;
  private prdDocument: Partial<PRDDocument>;
  private projectType: ProjectType;

  async initialize(query: string): Promise<PRDInitResult> {
    // 1. Discover existing documents (greenfield/brownfield detection)
    // 2. Classify project (domain, complexity)
    // 3. Create initial PRD from template
    // 4. Return to user with [C] continue option
  }

  async executeStep(stepNumber: number, userInput: any): Promise<PRDStepResult> {
    // Execute specific step based on stepNumber
    // Update PRD document
    // Present A/P/C menu
    // Wait for user input
  }

  async step02Discovery(userInput: DiscoveryInput): Promise<PRDStepResult> {
    // Gather problem definition, vision, objectives
    // Use AskUserQuestion for interactive Q&A
    // Present [A] Advanced Elicitation / [P] Party Mode / [C] Continue
  }

  async step03Personas(userInput: PersonasInput): Promise<PRDStepResult> {
    // Generate user personas based on domain and complexity
    // Allow user to add/edit personas
    // Present A/P/C menu
  }

  async step04Requirements(userInput: RequirementsInput): Promise<PRDStepResult> {
    // Gather functional and non-functional requirements
    // Categorize by priority (MoSCoW)
    // Link to user stories
    // Present A/P/C menu
  }

  async step05Scope(userInput: ScopeInput): Promise<PRDStepResult> {
    // Define MVP vs backlog
    // Identify out-of-scope items
    // Present A/P/C menu
  }

  async step06Validation(): Promise<ValidationResult> {
    // Validate completeness
    // Check clarity and feasibility
    // Verify traceability (requirements -> user stories)
    // Return validation summary
  }

  async savePRD(): Promise<string> {
    // Save PRD to docs/planning/prd/PRD.md
    // Update frontmatter
    // Return file path
  }

  private async advancedElicitation(content: string): Promise<string> {
    // Load and execute 5 relevant elicitation methods
    // Methods selection based on content type and complexity
    // Return enhanced content
  }

  private async detectProjectType(): Promise<ProjectType> {
    // Check if existing codebase exists
    // Look for package.json, src/, etc.
    // Return GREENFIELD or BROWNFIELD
  }

  private classifyProject(query: string): ClassificationResult {
    // Analyze query for domain signals
    // Estimate complexity
    // Determine domain
    // Return classification
  }
}
```

**Evidence**: Follow BMAD's step-file pattern from `workflow.md` and `step-01-init.md`

---

#### 1.4 Create Step Files (6-8 hours)

**Files**: `rad-engineer/src/plan/prd/steps/step-*.ts`

**Pattern from BMAD**: Each step is self-contained with:
- Step number and description
- Input/output types
- Execution rules
- A/P/C menu handling

**Step 1: Init** (step-01-init.ts)
- Document discovery (greenfield/brownfield)
- Template initialization
- Frontmatter setup

**Step 2: Discovery** (step-02-discovery.ts)
- Problem definition
- Product vision
- Objectives and success criteria

**Step 3: Personas** (step-03-personas.ts)
- User persona generation
- User story creation
- Scenario mapping

**Step 4: Requirements** (step-04-requirements.ts)
- Functional requirements gathering
- Non-functional requirements gathering
- Priority categorization (MoSCoW)

**Step 5: Scope** (step-05-scope.ts)
- MVP definition
- Backlog prioritization
- Out-of-scope identification

**Step 6: Validation** (step-06-validation.ts)
- Completeness check
- Clarity assessment
- Traceability verification

---

#### 1.5 Create A/P/C Menu Handler (2-3 hours)

**File**: `rad-engineer/src/plan/prd/utils.ts`

**Function**: Handle A/P/C menu interactions

```typescript
export enum MenuOption {
  ADVANCED_ELCITATION = 'a',
  PARTY_MODE = 'p',
  CONTINUE = 'c'
}

export interface MenuResult {
  option: MenuOption;
  content?: string;  // Enhanced content from elicitation
  proceed: boolean;
}

export async function presentAPCMenu(
  context: string,
  currentContent: string
): Promise<MenuResult> {
  // Present menu:
  // [a] Advanced Elicitation - refine with reasoning methods
  // [p] Party Mode - explore multiple perspectives (future)
  // [c] Continue - accept and proceed

  // Handle user selection
  // Return result
}

export async function applyAdvancedElicitation(
  content: string,
  category: string
): Promise<string> {
  // Select 5 relevant methods from BMAD methods
  // Apply iteratively
  // Return enhanced content
}
```

**Evidence**: BMAD A/P/C pattern from workflow steps

---

#### 1.6 Add Tests (3-4 hours)

**File**: `rad-engineer/test/plan/prd/PRDGenerator.test.ts`

**Test Cases**:
- Greenfield project initialization
- Brownfield project with existing docs
- Simple complexity project (minimal Q&A)
- Complex project (deep exploration)
- A/P/C menu handling
- PRD validation

---

**Total Effort for PRDGenerator**: ~17-25 hours (3-4 days)

---

## COMPONENT 2: ImplementationPlanGenerator (HIGH PRIORITY)

**User Requirements**: "gap analysis, epic breakdown, milestones, dependencies, risk assessment"

**Dependencies**: PRD (needs requirements to plan implementation)

### File Structure

```
rad-engineer/src/plan/
├── ImplementationPlanGenerator.ts  (NEW - main generator)
├── implementation/
│   ├── types.ts                    (Implementation plan types)
│   ├── GapAnalyzer.ts              (Gap analysis)
│   ├── EpicBreakdown.ts            (Epic organization)
│   ├── MilestoneTracker.ts         (Milestone definition)
│   ├── DependencyMapper.ts         (Dependency mapping)
│   └── RiskAssessor.ts             (Risk assessment)
```

### Detailed Tasks

#### 2.1 Create ImplementationPlan Types (1-2 hours)

**File**: `rad-engineer/src/plan/implementation/types.ts`

```typescript
export interface ImplementationPlan {
  metadata: PlanMetadata;
  gapAnalysis: GapAnalysisResult;
  epics: Epic[];
  milestones: Milestone[];
  dependencies: DependencyGraph;
  risks: RiskAssessment[];
  timeline: TimelineEstimate;
}

export interface GapAnalysisResult {
  existingComponents: ComponentInventory[];
  missingComponents: ComponentSpec[];
  gaps Identified: Gap[];
  migrationNeeded: MigrationSpec[];
}

export interface ComponentInventory {
  name: string;
  path: string;
  capabilities: string[];
  gaps: string[];
}

export interface Gap {
  area: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  effort: number;  // in hours
  dependencies: string[];
}

export interface Epic {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  stories: string[];  // Story IDs
  dependencies: string[];  // Epic IDs
  estimatedHours: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'complete';
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  epicIds: string[];
  targetDate?: string;
  status: 'pending' | 'in-progress' | 'complete';
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
}

export interface DependencyNode {
  id: string;
  type: 'epic' | 'story' | 'milestone';
  name: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'blocks' | 'enables' | 'related';
}

export interface RiskAssessment {
  id: string;
  risk: string;
  category: 'technical' | 'resource' | 'timeline' | 'dependency';
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  severity: number;  // probability × impact
  mitigation: string;
  owner?: string;
  status: 'open' | 'mitigated' | 'accepted';
}

export interface TimelineEstimate {
  totalHours: number;
  totalDays: number;
  totalWeeks: number;
  phases: PhaseEstimate[];
  confidence: number;  // 0-1
}

export interface PhaseEstimate {
  phase: string;
  epicIds: string[];
  hours: number;
  days: number;
  startDate?: string;
  endDate?: string;
}
```

---

#### 2.2 Create GapAnalyzer.ts (3-4 hours)

**File**: `rad-engineer/src/plan/implementation/GapAnalyzer.ts`

```typescript
export class GapAnalyzer {
  async analyze(
    prd: PRDDocument,
    research: ResearchFindings,
    existingCodebase?: CodebaseInventory
  ): Promise<GapAnalysisResult> {
    // 1. Inventory existing components (if brownfield)
    // 2. Identify required components from PRD
    // 3. Map requirements to components
    // 4. Identify gaps
    // 5. Assess gap severity
    // 6. Estimate effort per gap
  }

  private async inventoryExistingCodebase(): Promise<CodebaseInventory> {
    // Scan src/ directory
    // Catalog components by capability
    // Identify patterns and conventions
    // Return inventory
  }

  private identifyRequiredComponents(prd: PRDDocument): ComponentSpec[] {
    // Extract functional requirements
    // Map to architectural components
    // Return required component list
  }

  private assessGaps(
    existing: ComponentInventory[],
    required: ComponentSpec[]
  ): Gap[] {
    // Compare existing vs required
    // Identify missing capabilities
    // Assess severity and effort
    // Return gaps
  }
}
```

---

#### 2.3 Create EpicBreakdown.ts (4-6 hours)

**File**: `rad-engineer/src/plan/implementation/EpicBreakdown.ts`

```typescript
export class EpicBreakdown {
  async createEpics(
    prd: PRDDocument,
    gapAnalysis: GapAnalysisResult,
    implementationPlan: ImplementationPlan
  ): Promise<Epic[]> {
    // 1. Group related user stories into epics
    // 2. Define epic objectives
    // 3. Map epics to gaps/components
    // 4. Estimate epic-level effort
    // 5. Define epic dependencies
    // 6. Prioritize epics
  }

  private groupStoriesIntoEpics(stories: UserStory[]): Epic[] {
    // Use clustering algorithm (theme-based)
    // 3-5 stories per epic (optimal)
    // Return epic list
  }

  private estimateEpicEffort(epic: Epic): number {
    // Sum story estimates
    // Add overhead for integration
    // Return total hours
  }

  private mapEpicDependencies(epics: Epic[]): DependencyEdge[] {
    // Analyze epic requirements
    // Identify blocking relationships
    // Return dependency edges
  }
}
```

---

#### 2.4 Create MilestoneTracker.ts (2-3 hours)

**File**: `rad-engineer/src/plan/implementation/MilestoneTracker.ts`

```typescript
export class MilestoneTracker {
  defineMilestones(
    epics: Epic[],
    timeline: TimelineEstimate
  ): Milestone[] {
    // 1. Define natural milestones (MVP, Alpha, Beta, v1)
    // 2. Group epics into milestones
    // 3. Define acceptance criteria per milestone
    // 4. Estimate target dates
    // Return milestones
  }

  private getDefaultMilestones(): MilestoneTemplate[] {
    return [
      {
        name: 'MVP Complete',
        description: 'Minimum viable product with core features',
        criteria: [
          'All MVP functional requirements met',
          'Critical user stories complete',
          'Basic testing complete',
          'Deployment ready'
        ]
      },
      {
        name: 'Alpha Release',
        description: 'Internal testing release',
        criteria: [
          'All Phase 2 epics complete',
          'Integration tests passing',
          'Performance benchmarks met'
        ]
      },
      {
        name: 'Beta Release',
        description: 'External testing release',
        criteria: [
          'All Phase 3 epics complete',
          'E2E tests passing',
          'Documentation complete'
        ]
      },
      {
        name: 'v1.0 Release',
        description: 'Production release',
        criteria: [
          'All committed features complete',
          'Quality gates passing',
          'Security review complete',
          'Monitoring in place'
        ]
      }
    ];
  }
}
```

---

#### 2.5 Create DependencyMapper.ts (2-3 hours)

**File**: `rad-engineer/src/plan/implementation/DependencyMapper.ts`

```typescript
export class DependencyMapper {
  mapDependencies(
    epics: Epic[],
    stories: Story[]
  ): DependencyGraph {
    // 1. Build dependency graph
    // 2. Detect cycles
    // 3. Calculate critical path
    // 4. Identify parallelizable work
    // Return dependency graph
  }

  private detectCycles(graph: DependencyGraph): string[][] {
    // Use DFS to detect cycles
    // Return cycle paths for resolution
  }

  private calculateCriticalPath(graph: DependencyGraph): string[] {
    // Use longest path algorithm
    // Return critical path nodes
  }
}
```

---

#### 2.6 Create RiskAssessor.ts (2-3 hours)

**File**: `rad-engineer/src/plan/implementation/RiskAssessor.ts`

```typescript
export class RiskAssessor {
  assessRisks(
    implementationPlan: ImplementationPlan,
    research: ResearchFindings
  ): RiskAssessment[] {
    // 1. Identify technical risks
    // 2. Identify resource risks
    // 3. Identify timeline risks
    // 4. Identify dependency risks
    // 5. Calculate severity (probability × impact)
    // 6. Propose mitigations
    // Return risk assessment
  }

  private identifyTechnicalRisks(
    gapAnalysis: GapAnalysisResult
  ): RiskAssessment[] {
    // Analyze gaps for technical risk
    // High complexity = high risk
    // New tech = high risk
    // Return technical risks
  }

  private identifyTimelineRisks(
    timeline: TimelineEstimate
  ): RiskAssessment[] {
    // Analyze timeline for risks
    // Tight timeline = high risk
    // Many dependencies = high risk
    // Return timeline risks
  }
}
```

---

#### 2.7 Create ImplementationPlanGenerator.ts (3-4 hours)

**File**: `rad-engineer/src/plan/ImplementationPlanGenerator.ts`

```typescript
export class ImplementationPlanGenerator {
  private gapAnalyzer: GapAnalyzer;
  private epicBreakdown: EpicBreakdown;
  private milestoneTracker: MilestoneTracker;
  private dependencyMapper: DependencyMapper;
  private riskAssessor: RiskAssessor;

  async generate(
    prd: PRDDocument,
    research: ResearchFindings,
    existingCodebase?: CodebaseInventory
  ): Promise<ImplementationPlan> {
    // 1. Analyze gaps
    const gapAnalysis = await this.gapAnalyzer.analyze(
      prd,
      research,
      existingCodebase
    );

    // 2. Create epics from PRD user stories
    const epics = await this.epicBreakdown.createEpics(
      prd,
      gapAnalysis,
      research
    );

    // 3. Define milestones
    const milestones = this.milestoneTracker.defineMilestones(
      epics,
      research
    );

    // 4. Map dependencies
    const dependencies = this.dependencyMapper.mapDependencies(
      epics,
      prd.userStories
    );

    // 5. Assess risks
    const risks = this.riskAssessor.assessRisks(
      { gapAnalysis, epics, milestones, dependencies },
      research
    );

    // 6. Calculate timeline
    const timeline = this.calculateTimeline(epics, milestones);

    // 7. Present to user with [A/P/C] menu
    // 8. Save implementation plan

    return {
      metadata: this.createMetadata(),
      gapAnalysis,
      epics,
      milestones,
      dependencies,
      risks,
      timeline
    };
  }

  private calculateTimeline(
    epics: Epic[],
    milestones: Milestone[]
  ): TimelineEstimate {
    // Sum epic hours
    // Add overhead (20% for integration, testing)
    // Calculate days/weeks
    // Estimate confidence interval
    // Return timeline
  }

  async saveImplementationPlan(
    plan: ImplementationPlan
  ): Promise<string> {
    // Save to docs/planning/implementation/IMPLEMENTATION_PLAN.md
    // Also save IMPLEMENTATION_PLAN.json for machine readability
    // Return file path
  }
}
```

---

#### 2.8 Add Tests (2-3 hours)

**File**: `rad-engineer/test/plan/implementation/ImplementationPlanGenerator.test.ts`

**Test Cases**:
- Gap analysis for greenfield project
- Gap analysis for brownfield project
- Epic breakdown from user stories
- Milestone definition
- Dependency mapping (including cycle detection)
- Risk assessment

---

**Total Effort for ImplementationPlanGenerator**: ~19-29 hours (3-4 days)

---

## COMPONENT 3: EpicBreakdown (HIGH PRIORITY)

**Note**: This is partially covered in ImplementationPlanGenerator, but may need refinement for story-level breakdown.

**Dependencies**: ImplementationPlan (needs epics to break down into stories)

### Detailed Tasks

#### 3.1 Enhance Existing Story Generation (2-3 hours)

**Current**: `ExecutionPlanGenerator.ts` already generates stories

**Enhancement Needed**:
- Link stories to epics
- Respect epic dependencies
- Story-level estimation
- Story acceptance criteria from PRD user stories

---

**Total Effort for EpicBreakdown**: ~2-3 hours (enhancement only)

---

## COMPONENT 4: ArchitectureGenerator (HIGH PRIORITY)

**User Requirements**: "choosing 2-3 best technology options that exist as of that date when planning is happening, not depending on what might LLM know (usually old knowledge), and ensuring 'doing the right thing to meet objectives and solving problems', and offer options to user with a recommendation, including the why so they know, a well informed decision has been made."

**Note**: Already documented in Q3 research section above. This TODO references that section.

### Evidence from Research

**BMAD Architecture Framework**:
- `bmad-research/src/modules/bmm/workflows/3-solutioning/create-architecture/`
- `steps/step-04-decisions.md` - Mandatory web search for current tech
- `architecture-decision-template.md` - Decision record template

### Detailed Tasks (Already in Q3 Section)

See **Q3: Architecture Decision Framework** section above (lines 625-863).

**Summary**:
- 1.1-1.5: Create ArchitectureGenerator.ts, templates, types
- 2.1-2.3: Integration with /plan skill
- **Total Effort**: ~17 hours (2-3 days)

---

## COMPONENT 5: DeterministicControls (MEDIUM PRIORITY)

**User Requirements**: "We also need to deeply research and determine in the planning process what other deterministic controls do we need? coding patterns for the project, specs, definitions, etc., however some of these could be done iteratively through the workflow during execution too....need you to decide and plan now so you can implement accordingly."

### Evidence from Research

**oh-my-opencode Patterns** (`~/Projects/useful-repos/oh-my-opencode/AGENTS.md`):
- Temperature control (0.1-0.3 for code agents)
- Tool structure conventions
- Anti-patterns documented
- Hook patterns

**Deterministic Controls from Web Research**:
- Definition of Done (DoD)
- Coding standards and patterns
- Code review guidelines
- Testing standards

### Detailed Tasks

#### 5.1 Create CodingStandards.md (1-2 hours)

**File**: `rad-engineer/src/plan/templates/CodingStandards.md`

**Template Structure**:
```markdown
# Coding Standards - {{projectName}}

**Generated**: {{date}}
**Based on**: Analysis of existing codebase

---

## Language-Specific Standards

### TypeScript
- Use strict mode
- No `any` types (use `unknown` with type guards)
- Explicit return types
- Interface-first for public APIs
- Type aliases for unions

### Naming Conventions
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private members: `_camelCase`

### File Organization
- One export per file (preferred)
- Barrel files for related exports
- Co-locate with tests
- Separate types from implementation

---

## Architectural Patterns

### Error Handling
- Never throw raw strings
- Use custom Error classes
- Include error context
- Log before throwing

### State Management
- Immutable state updates
- Single source of truth
- State machines for complex flows
- Event-driven for UI

### API Design
- RESTful conventions
- Consistent response formats
- Version endpoints
- Pagination for lists

---

## Testing Standards

### Unit Tests
- TDD: Red → Green → Refactor
- 80% coverage minimum
- Mock external dependencies
- Test edge cases

### Integration Tests
- Test component interactions
- Use test databases
- Clean up after tests
- Run in CI/CD

### E2E Tests
- Critical user flows
- Real browser (not headless only)
- Network conditions
- Accessibility checks

---

## Code Review Guidelines

### Before Submitting PR
- All tests pass
- Linting clean
- Self-review complete
- Documentation updated

### Review Criteria
- Correctness
- Performance
- Security
- Maintainability
- Test coverage

---

## Definition of Done (DoD)

### Story Level
- [ ] Code complete
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Linting clean
- [ ] Typescript compilation clean
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Acceptance criteria met

### Epic Level
- [ ] All stories complete
- [ ] Epic integration tests passing
- [ ] Epic documentation complete
- [ ] Demo ready
- [ ] Stakeholder sign-off

### Release Level
- [ ] All committed features complete
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Deployment ready
- [ ] Monitoring in place
- [ ] Rollback plan documented
```

---

#### 5.2 Create DoDValidator.ts (2-3 hours)

**File**: `rad-engineer/src/plan/validation/DoDValidator.ts`

```typescript
export class DoDValidator {
  validateStoryComplete(story: Story): DoDResult {
    // Check each DoD criterion
    // Return pass/fail with missing items
  }

  validateEpicComplete(epic: Epic): DoDResult {
    // Check all stories in epic
    // Check epic-level criteria
    // Return pass/fail
  }

  validateReleaseReady(plan: ImplementationPlan): DoDResult {
    // Check all epics
    // Check release-level criteria
    // Return pass/fail
  }
}
```

---

#### 5.3 Create CodePatternDetector.ts (2-3 hours)

**File**: `rad-engineer/src/plan/validation/CodePatternDetector.ts`

```typescript
export class CodePatternDetector {
  async detectPatterns(codebasePath: string): Promise<CodePatternReport> {
    // 1. Scan codebase for patterns
    // 2. Detect frameworks and libraries
    // 3. Identify architectural patterns
    // 4. Document conventions
    // Return pattern report
  }

  private async detectFrameworkPatterns(): Promise<FrameworkPattern[]> {
    // Detect React, Vue, Angular, Express, etc.
    // Identify component patterns
    // Return framework patterns
  }

  private async detectCodeStyle(): Promise<CodeStyle> {
    // Analyze naming conventions
    // Detect formatting style
    // Identify code organization
    // Return code style
  }
}
```

---

#### 5.4 Create CodingStandardsGenerator.ts (2-3 hours)

**File**: `rad-engineer/src/plan/CodingStandardsGenerator.ts`

```typescript
export class CodingStandardsGenerator {
  async generate(
    research: ResearchFindings,
    patternReport: CodePatternReport
  ): Promise<CodingStandardsDocument> {
    // 1. Analyze existing patterns (if brownfield)
    // 2. Incorporate best practices from research
    // 3. Generate standards document
    // 4. Include project-specific rules
    // Return standards document
  }

  async saveStandards(
    standards: CodingStandardsDocument
  ): Promise<string> {
    // Save to docs/CODING_STANDARDS.md
    // Return file path
  }
}
```

---

#### 5.5 Add Tests (1-2 hours)

**File**: `rad-engineer/test/plan/validation/DoDValidator.test.ts`

**Test Cases**:
- Story DoD validation
- Epic DoD validation
- Release DoD validation
- Pattern detection

---

**Total Effort for DeterministicControls**: ~8-13 hours (1-2 days)

---

## COMPONENT 6: GitStrategy (MEDIUM PRIORITY)

**User Requirements**: "If we have git strategy (repo, branches, commits, PRs, PR Reviews, Merges basis epics or stories or whatever ...), testing strategy which might be part of next execute skill in which case you can ignore this."

### Evidence from Research

**Best Practices** (2025):
- Trunk-based development for fast iteration
- Feature branches for larger features
- Epic-level branches for coordinated work
- Semantic commit messages
- PR templates with checklists

### Detailed Tasks

#### 6.1 Create GitStrategyGenerator.ts (3-4 hours)

**File**: `rad-engineer/src/plan/GitStrategyGenerator.ts`

```typescript
export interface GitStrategy {
  repository: RepositoryConfig;
  branching: BranchingStrategy;
  commits: CommitConvention;
  pullRequests: PRWorkflow;
  reviews: ReviewProcess;
}

export interface RepositoryConfig {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  initialBranch: string;
  protectedBranches: string[];
}

export interface BranchingStrategy {
  type: 'trunk-based' | 'feature-branch' | 'epic-based' | 'gitflow';
  trunkBranch: string;
  featureBranchPattern: string;  // e.g., "feature/{story-id}" or "feature/{epic-id}"
  releaseBranchPattern: string;
  hotfixBranchPattern: string;
}

export interface CommitConvention {
  format: 'conventional-commits' | 'custom';
  rules: CommitRule[];
  examples: CommitExample[];
}

export interface PRWorkflow {
  template: string;
  requiredChecks: string[];
  requiredReviewers: number;
  autoMerge: boolean;
  mergeMethod: 'merge' | 'squash' | 'rebase';
}

export interface ReviewProcess {
  criteria: string[];
  minimumApprovals: number;
  canAuthorApprove: boolean;
  draftMode: boolean;
}

export class GitStrategyGenerator {
  async generate(
    implementationPlan: ImplementationPlan,
    projectComplexity: Complexity
  ): Promise<GitStrategy> {
    // 1. Determine branching strategy based on complexity
    //    - Simple: Trunk-based
    //    - Medium: Feature branches
    //    - Complex: Epic-based branches
    // 2. Configure repository
    // 3. Define commit conventions
    // 4. Set up PR workflow
    // 5. Define review process
    // Return git strategy
  }

  private determineBranchingStrategy(
    complexity: Complexity
  ): BranchingStrategy {
    switch (complexity) {
      case 'simple':
        return {
          type: 'trunk-based',
          trunkBranch: 'main',
          featureBranchPattern: 'feature/{story-id}',
          releaseBranchPattern: null,
          hotfixBranchPattern: 'hotfix/{issue-id}'
        };
      case 'medium':
        return {
          type: 'feature-branch',
          trunkBranch: 'main',
          featureBranchPattern: 'feature/{story-id}',
          releaseBranchPattern: 'release/v{version}',
          hotfixBranchPattern: 'hotfix/{issue-id}'
        };
      case 'complex':
        return {
          type: 'epic-based',
          trunkBranch: 'main',
          featureBranchPattern: 'epic/{epic-id}/story/{story-id}',
          releaseBranchPattern: 'release/v{version}',
          hotfixBranchPattern: 'hotfix/{issue-id}'
        };
    }
  }

  async saveGitStrategy(
    strategy: GitStrategy
  ): Promise<string> {
    // Save to docs/planning/GIT_STRATEGY.md
    // Return file path
  }

  generatePRTemplate(): string {
    return `## Pull Request Template

### Description
<!-- Brief description of changes -->

### Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactor
- [ ] Documentation

### Related Story/Epic
- Story: {story-id}
- Epic: {epic-id}

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

### Checklist
- [ ] Code follows coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Commit messages follow convention

### Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

### Additional Notes
<!-- Any additional context -->
`;
  }
}
```

---

#### 6.2 Generate .github Configuration (1-2 hours)

**Files**:
- `.github/pull_request_template.md`
- `.github/CODEOWNERS` (if applicable)
- Branch protection rules documentation

---

#### 6.3 Add Tests (1-2 hours)

**File**: `rad-engineer/test/plan/GitStrategyGenerator.test.ts`

**Test Cases**:
- Trunk-based strategy for simple projects
- Feature-branch strategy for medium projects
- Epic-based strategy for complex projects

---

**Total Effort for GitStrategy**: ~5-8 hours (1 day)

---

## COMPONENT 7: DeploymentPlanGenerator (HIGH PRIORITY)

**User Requirements**: "Then comes deployment readiness - this is where user inputs and preferences are required as well..."

**Dependencies**: ImplementationPlan (needs to know what to deploy)

### Evidence from Research

**Best Practices**:
- Infrastructure as Code (IaC)
- CI/CD pipeline automation
- Environment parity (dev/staging/prod)
- Monitoring and observability
- Rollback planning

### Detailed Tasks

#### 7.1 Create Deployment Types (1 hour)

**File**: `rad-engineer/src/plan/deployment/types.ts`

```typescript
export interface DeploymentPlan {
  metadata: PlanMetadata;
  strategy: DeploymentStrategy;
  environments: Environment[];
  pipeline: CICDPipeline;
  monitoring: MonitoringSetup;
  rollback: RollbackPlan;
}

export interface DeploymentStrategy {
  type: 'local' | 'cloud' | 'hybrid' | 'containers';
  target: DeploymentTarget;
  method: DeploymentMethod;
}

export interface DeploymentTarget {
  provider?: 'aws' | 'azure' | 'gcp' | 'vercel' | 'netlify' | 'custom';
  region?: string;
  services: ServiceSpec[];
}

export interface DeploymentMethod {
  approach: 'git-push' | 'pipeline' | 'manual' | 'blue-green' | 'canary';
  automation: boolean;
  schedules?: ScheduleSpec[];
}

export interface Environment {
  name: 'dev' | 'staging' | 'prod';
  purpose: string;
  url?: string;
  variables: EnvironmentVariable[];
  resources: ResourceSpec[];
}

export interface CICDPipeline {
  platform: 'github-actions' | 'gitlab-ci' | 'circleci' | 'custom';
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  secrets: SecretSpec[];
}

export interface PipelineStage {
  name: string;
  jobs: JobSpec[];
  condition?: string;
}

export interface MonitoringSetup {
  logging: LoggingSpec;
  metrics: MetricsSpec;
  alerts: AlertSpec[];
  dashboards: DashboardSpec[];
}

export interface RollbackPlan {
  strategy: 'automatic' | 'manual';
  triggers: RollbackTrigger[];
  procedure: string[];
  dataMigration?: DataMigrationSpec;
}
```

---

#### 7.2 Create DeploymentPlanGenerator.ts (4-6 hours)

**File**: `rad-engineer/src/plan/DeploymentPlanGenerator.ts`

```typescript
export class DeploymentPlanGenerator {
  async generate(
    implementationPlan: ImplementationPlan,
    architecture: ArchitectureDocument,
    userPreferences?: DeploymentPreferences
  ): Promise<DeploymentPlan> {
    // 1. Determine deployment strategy (ask user if not provided)
    // 2. Configure environments (dev/staging/prod)
    // 3. Design CI/CD pipeline
    // 4. Set up monitoring
    // 5. Plan rollback strategy
    // 6. Present [A/P/C] menu
    // 7. Save deployment plan
    // Return deployment plan
  }

  private async determineStrategy(
    userPreferences?: DeploymentPreferences
  ): Promise<DeploymentStrategy> {
    // If no preferences, ask user via AskUserQuestion:
    // - Where do you want to deploy? (local/cloud/containers)
    // - Cloud provider preference?
    // - Budget constraints?
    // - Team expertise?
    // Return strategy
  }

  private designPipeline(
    strategy: DeploymentStrategy,
    projectType: ProjectType
  ): CICDPipeline {
    // Design GitHub Actions workflow (default)
    // Stages: build → test → deploy
    // Return pipeline
  }

  private setupMonitoring(
    architecture: ArchitectureDocument
  ): MonitoringSetup {
    // Recommend monitoring stack based on architecture
    // - Logging (Winston, Pino)
    // - Metrics (Prometheus, DataDog)
    // - Alerts (PagerDuty, Slack)
    // - Dashboards (Grafana)
    // Return monitoring setup
  }

  async saveDeploymentPlan(
    plan: DeploymentPlan
  ): Promise<string> {
    // Save to docs/planning/deployment/DEPLOYMENT_PLAN.md
    // Generate CI/CD config files (.github/workflows/)
    // Return file path
  }

  generateGitHubActionsWorkflow(pipeline: CICDPipeline): string {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy
        run: |
          # Deployment commands here
`;
  }
}
```

---

#### 7.3 Create Deployment Questioner (2-3 hours)

**File**: `rad-engineer/src/plan/deployment/DeploymentQuestioner.ts`

```typescript
export class DeploymentQuestioner {
  async askDeploymentPreferences(): Promise<DeploymentPreferences> {
    // Use AskUserQuestion for:
    // 1. Deployment target (local/cloud/hybrid)
    // 2. Cloud provider (if cloud)
    // 3. CI/CD platform preference
    // 4. Monitoring needs
    // 5. Budget constraints
    // 6. Team expertise
    // Return preferences
  }
}
```

---

#### 7.4 Add Tests (2-3 hours)

**File**: `rad-engineer/test/plan/deployment/DeploymentPlanGenerator.test.ts`

**Test Cases**:
- Local deployment strategy
- Cloud deployment strategy
- CI/CD pipeline generation
- Monitoring setup

---

**Total Effort for DeploymentPlanGenerator**: ~9-13 hours (1-2 days)

---

## COMPONENT 8: /plan Skill Integration (HIGH PRIORITY)

**Purpose**: Wire all generators together into the enhanced /plan skill workflow

### Detailed Tasks

#### 8.1 Update /plan Skill SKILL.md (2-3 hours)

**File**: `.claude/skills/plan/SKILL.md`

**Changes**:
1. Add PRD phase after Intake
2. Add Research phase (existing)
3. Add Architecture phase
4. Add Implementation Planning phase
5. Add Epic Breakdown phase
6. Add Execution Plan generation (existing)
7. Add Deployment Planning phase
8. Wire A/P/C menus after each phase

**New Workflow**:
```markdown
# Enhanced /plan Skill Workflow

## Phase 0: INTAKE (Existing - Enhanced)
- Receive query
- Classify project (greenfield/brownfield, domain, complexity)
- Ask 5-10 clarifying questions (context-aware)
- Build StructuredRequirements

## Phase 1: PRD GENERATION (NEW)
- Execute PRDGenerator
- Step-by-step PRD creation
- → [A/P/C MENU] after PRD complete

## Phase 2: RESEARCH (Existing)
- 2-3 parallel research agents
- Consolidate findings

## Phase 3: ARCHITECTURE (NEW)
- Execute ArchitectureGenerator
- Web search for current tech versions
- Present 2-3 options with recommendation
- → [A/P/C MENU] after architecture complete

## Phase 4: IMPLEMENTATION PLANNING (NEW)
- Execute ImplementationPlanGenerator
- Gap analysis
- Epic breakdown
- Milestones
- Dependencies
- Risk assessment
- → [A/P/C MENU] after implementation plan complete

## Phase 5: EPIC BREAKDOWN (Enhanced)
- Link stories to epics
- Respect epic dependencies
- → [A/P/C MENU] after epic breakdown complete

## Phase 6: EXECUTION PLAN GENERATION (Existing - Enhanced)
- Generate detailed stories
- Build wave structure
- Include architecture decisions
- Include implementation plan
- → [A/P/C MENU] after execution plan complete

## Phase 7: VALIDATION (Existing)
- Evidence alignment
- Completeness
- Dependencies
- Parseability

## Phase 8: DEPLOYMENT PLANNING (NEW)
- Execute DeploymentPlanGenerator
- Ask deployment preferences
- Generate CI/CD pipeline
- Setup monitoring
- → [A/P/C MENU] after deployment plan complete

## Phase 9: FINAL APPROVAL
- Present complete planning package
- User approval
- Proceed to /execute
```

---

#### 8.2 Update /plan Types (1 hour)

**File**: `rad-engineer/src/plan/types.ts`

**Add**:
```typescript
export interface PlanningPackage {
  intake: StructuredRequirements;
  prd: PRDDocument;
  research: ResearchFindings;
  architecture: ArchitectureDocument;
  implementationPlan: ImplementationPlan;
  executionPlan: ExecutionPlan;
  deploymentPlan: DeploymentPlan;
  codingStandards: CodingStandardsDocument;
  gitStrategy: GitStrategy;
}
```

---

#### 8.3 Create PlanOrchestrator.ts (4-6 hours)

**File**: `rad-engineer/src/plan/PlanOrchestrator.ts`

```typescript
export class PlanOrchestrator {
  private intakeHandler: IntakeHandler;
  private prdGenerator: PRDGenerator;
  private researchCoordinator: ResearchCoordinator;
  private architectureGenerator: ArchitectureGenerator;
  private implementationPlanGenerator: ImplementationPlanGenerator;
  private executionPlanGenerator: ExecutionPlanGenerator;
  private deploymentPlanGenerator: DeploymentPlanGenerator;
  private codingStandardsGenerator: CodingStandardsGenerator;
  private gitStrategyGenerator: GitStrategyGenerator;

  async executePlan(query: string): Promise<PlanningPackage> {
    // Phase 0: Intake
    const intake = await this.intakeHandler.processQuery(query);

    // Phase 1: PRD
    const prd = await this.prdGenerator.initialize(query);
    // ... step-by-step PRD creation with A/P/C menus

    // Phase 2: Research
    const research = await this.researchCoordinator.executeResearch(
      intake,
      this.spawnAgent.bind(this)
    );

    // Phase 3: Architecture
    const architecture = await this.architectureGenerator.generate(
      prd,
      research
    );
    // ... A/P/C menu

    // Phase 4: Implementation Planning
    const implementationPlan = await this.implementationPlanGenerator.generate(
      prd,
      research
    );
    // ... A/P/C menu

    // Phase 5: Epic Breakdown (handled in ImplementationPlanGenerator)

    // Phase 6: Execution Plan
    const executionPlan = await this.executionPlanGenerator.generate(
      intake,
      research,
      implementationPlan.epics,
      architecture.decisions
    );
    // ... A/P/C menu

    // Phase 7: Validation (existing)
    const validation = await this.validatePlan(executionPlan);

    // Phase 8: Deployment Planning
    const deploymentPlan = await this.deploymentPlanGenerator.generate(
      implementationPlan,
      architecture
    );
    // ... A/P/C menu

    // Phase 9: Coding Standards (generate if not exists)
    const codingStandards = await this.codingStandardsGenerator.generate(
      research,
      patternReport
    );

    // Phase 10: Git Strategy
    const gitStrategy = await this.gitStrategyGenerator.generate(
      implementationPlan,
      intake.complexity
    );

    // Return complete package
    return {
      intake,
      prd,
      research,
      architecture,
      implementationPlan,
      executionPlan,
      deploymentPlan,
      codingStandards,
      gitStrategy
    };
  }

  private async presentAPCMenu(
    phase: string,
    content: any
  ): Promise<MenuResult> {
    // Present A/P/C menu
    // Handle user selection
    // Return result
  }
}
```

---

#### 8.4 Add Integration Tests (3-4 hours)

**File**: `rad-engineer/test/plan/plan-skill-e2e-enhanced.test.ts`

**Test Scenarios**:
- Simple greenfield project (fast path)
- Complex brownfield project (full path)
- User selects "A" (Advanced Elicitation) at various phases
- User selects "P" (Party Mode) at various phases
- User provides custom preferences at each phase

---

**Total Effort for /plan Skill Integration**: ~10-14 hours (1-2 days)

---

## COMPONENT 9: TestingStrategy (LOW PRIORITY - MIGHT BE PART OF /execute)

**User Note**: "testing strategy which might be part of next execute skill in which case you can ignore this."

**Decision**: Testing strategy is part of:
- **DeterministicControls**: Definition of Done, testing standards (documented above)
- **/execute skill**: TDD enforcement, test execution (already implemented)

**Action**: SKIP for now, /execute already handles TDD and test execution

---

## IMPLEMENTATION SEQUENCE & ESTIMATES

### Phase 1: Foundation (Week 1-2)
```
1. PRDGenerator (3-4 days)
   ├─ Types and templates (1 day)
   ├─ PRDGenerator.ts (2 days)
   └─ Tests and integration (1 day)

2. ArchitectureGenerator (2-3 days)
   ├─ Web search integration (1 day)
   ├─ Decision templates (0.5 day)
   └─ Generator and tests (1.5 days)
```

### Phase 2: Planning Components (Week 3-4)
```
3. ImplementationPlanGenerator (3-4 days)
   ├─ Gap analysis (1 day)
   ├─ Epic breakdown (1 day)
   ├─ Milestones and dependencies (1 day)
   └─ Risk assessment and tests (1 day)

4. DeploymentPlanGenerator (1-2 days)
   ├─ Types and templates (0.5 day)
   ├─ Generator and questions (1 day)
   └─ Tests (0.5 day)

5. DeterministicControls (1-2 days)
   ├─ Coding standards template (0.5 day)
   ├─ DoD validator (0.5 day)
   └─ Pattern detector (0.5 day)
```

### Phase 3: Integration (Week 5)
```
6. GitStrategy (1 day)
   ├─ Strategy generator (0.5 day)
   └─ Templates and tests (0.5 day)

7. /plan Skill Integration (1-2 days)
   ├─ Update skill workflow (0.5 day)
   ├─ PlanOrchestrator (1 day)
   └─ Integration tests (0.5 day)
```

### Phase 4: Verification (Week 5-6)
```
8. End-to-End Testing (2-3 days)
   ├─ Test simple project (0.5 day)
   ├─ Test complex project (1 day)
   └─ Test brownfield project (0.5 day)

9. Documentation (1 day)
   ├─ Update CLAUDE.md
   ├─ Update README
   └─ Create usage examples
```

---

## TOTAL EFFORT SUMMARY

| Component | Effort | Dependencies |
|-----------|--------|--------------|
| PRDGenerator | 17-25 hours (3-4 days) | None |
| ArchitectureGenerator | 17 hours (2-3 days) | None (parallel with PRD) |
| ImplementationPlanGenerator | 19-29 hours (3-4 days) | PRD |
| EpicBreakdown | 2-3 hours | ImplementationPlan |
| DeploymentPlanGenerator | 9-13 hours (1-2 days) | ImplementationPlan, Architecture |
| DeterministicControls | 8-13 hours (1-2 days) | None (iterative) |
| GitStrategy | 5-8 hours (1 day) | ImplementationPlan |
| /plan Integration | 10-14 hours (1-2 days) | All above |
| Testing & Verification | 16-24 hours (2-3 days) | All above |

**Total**: ~103-143 hours (**13-18 working days** or **3-4 weeks**)

**Recommended Team Structure**:
- 1 Senior Developer: PRD, Architecture, Integration
- 1 Mid Developer: Implementation Planning, Git Strategy
- 1 Junior Developer: Testing, Documentation

**With 1 Developer**: **4-5 weeks**

---

## USER APPROVAL REQUIRED

**Status**: READY FOR IMPLEMENTATION

**Questions for User**:
1. Does this TODO breakdown align with your vision?
2. Should we adjust priority order?
3. Any components missing or over-specified?
4. Should we start with PRDGenerator as planned?
5. Any changes to effort estimates?

**Next Steps**:
1. User approval
2. Begin PRDGenerator implementation
3. Parallel work on ArchitectureGenerator
4. Weekly progress updates

---


---

## ADDITIONAL AGENTS ANALYSIS FOR /plan PHASE

**Created**: 2026-01-06
**Purpose**: Analyze where additional parallel agents would improve planning quality and speed
**Constraint**: MAX 2-3 CONCURRENT AGENTS (hard system limit to prevent crash)

---

## Current Agents (Existing)

### Research Phase: ResearchCoordinator.ts
**Spawns**: 2-3 parallel agents

| Agent | Task Type | Model | Purpose | When Used |
|-------|-----------|-------|---------|-----------|
| **Agent 1** | `feasibility` | Sonnet (complex) / Haiku (simple/medium) | Technical feasibility analysis | Always |
| **Agent 2** | `codebase` | Haiku | Codebase pattern discovery | Always (unless new project) |
| **Agent 3** | `best-practices` | Sonnet | Best practices research | Complex only |

**Total**: 2-3 agents (based on complexity)
**Resource Management**: ResourceManager enforces max 2-3 concurrent

---

## Additional Agents Needed (By Phase)

### Phase 1: PRD Research Phase (Before PRD Generation)

**NEW: PRDResearchCoordinator**

Rationale: Before creating PRD, gather context about:
- Market landscape (competitors)
- Domain-specific requirements
- User behavior patterns
- Industry standards

| Agent | Task Type | Model | Purpose | Parallel Group |
|-------|-----------|-------|---------|----------------|
| **Agent 1** | `market-research` | Sonnet | Analyze competitor products, market positioning | 1 |
| **Agent 2** | `domain-expert` | Sonnet | Provide domain-specific insights and requirements | 1 |
| **Agent 3** | `user-research` | Haiku | Synthesize user behavior patterns and needs | 1 |

**Total**: 3 agents (sequential waves if system at capacity)
**When to Run**: After Intake, before PRD Generation

**Implementation**:
```typescript
// rad-engineer/src/plan/prd/PRDResearchCoordinator.ts
export class PRDResearchCoordinator {
  async executePRDResearch(
    requirements: StructuredRequirements,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<PRDResearchFindings> {
    // Spawn 3 agents in parallel (if capacity allows)
    // Market Research + Domain Expert + User Research
  }
}
```

---

### Phase 2: Architecture Research Phase (Before Architecture Generation)

**NEW: ArchitectureResearchCoordinator**

Rationale: Research current tech options for each category:

| Agent | Task Type | Model | Purpose | Parallel Group |
|-------|-----------|-------|---------|----------------|
| **Agent 1** | `frontend-tech` | Sonnet | Research frontend frameworks (React, Vue, Svelte, etc.) | 1 |
| **Agent 2** | `backend-tech` | Sonnet | Research backend frameworks (Express, Fastify, NestJS, etc.) | 1 |
| **Agent 3** | `database-tech` | Sonnet | Research databases (PostgreSQL, MongoDB, etc.) | 1 |
| **Agent 4** | `infra-tech` | Haiku | Research infrastructure (Docker, K8s, Serverless) | 2 |
| **Agent 5** | `monitoring-tech` | Haiku | Research monitoring (Prometheus, DataDog, etc.) | 2 |

**Total**: 5 agents (2 waves of 2-3 agents each due to system limit)
**When to Run**: After PRD, before Architecture Generation

**Wave Strategy**:
```
Wave 1 (Agents 1-3): Frontend + Backend + Database → Consolidate
Wave 2 (Agents 4-5): Infrastructure + Monitoring → Consolidate
```

**Implementation**:
```typescript
// rad-engineer/src/plan/architecture/ArchitectureResearchCoordinator.ts
export class ArchitectureResearchCoordinator {
  async executeArchitectureResearch(
    prd: PRDDocument,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<ArchitectureResearchFindings> {
    // Wave 1: Frontend + Backend + Database (parallel)
    const wave1 = await this.executeWave1(prd, spawnAgentFn);
    
    // Wave 2: Infrastructure + Monitoring (parallel)
    const wave2 = await this.executeWave2(prd, spawnAgentFn);
    
    return { ...wave1, ...wave2 };
  }
}
```

---

### Phase 3: Advanced Elicitation (A/P/C Menu - "A" Option)

**NEW: ElicitationAgentCoordinator**

Rationale: When user selects "A" (Advanced Elicitation), apply reasoning methods to enhance content

| Agent | Task Type | Model | Purpose | Parallel Group |
|-------|-----------|-------|---------|----------------|
| **Agent 1** | `critical-thinking` | Sonnet | Apply First Principles, 5 Whys, Socratic Questioning | 1 |
| **Agent 2** | `risk-analysis` | Sonnet | Apply Pre-mortem, Failure Mode Analysis | 1 |
| **Agent 3** | `competitive` | Sonnet | Apply Red Team vs Blue Team, Devil's Advocate | 1 |

**Total**: 3 agents (parallel)
**When to Run**: When user selects "A" at any A/P/C menu

**Implementation**:
```typescript
// rad-engineer/src/plan/elicitation/ElicitationAgentCoordinator.ts
export class ElicitationAgentCoordinator {
  async applyAdvancedElicitation(
    content: string,
    category: string,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<EnhancedContent> {
    // Select 3 elicitation methods based on content
    // Apply in parallel
    // Consolidate enhancements
  }
}
```

---

### Phase 4: Implementation Planning (Optional Deep Analysis)

**NEW: ImplementationResearchCoordinator**

Rationale: For complex projects, deep analysis before implementation planning

| Agent | Task Type | Model | Purpose | Parallel Group |
|-------|-----------|-------|---------|----------------|
| **Agent 1** | `gap-analysis` | Sonnet | Deep codebase analysis for gaps | 1 |
| **Agent 2** | `dependency-analysis` | Sonnet | Analyze dependency landscape | 1 |
| **Agent 3** | `risk-assessment` | Sonnet | Identify technical and timeline risks | 1 |

**Total**: 3 agents (parallel)
**When to Run**: Before Implementation Plan generation (complex projects only)

---

## Agent Coordination Strategy

### Wave-Based Execution (Respecting System Limits)

```
┌─────────────────────────────────────────────────────────────────┐
│  SYSTEM CONSTRAINT: MAX 2-3 CONCURRENT AGENTS                   │
│                                                                 │
│  Solution: Wave-based agent execution                           │
│  - Wave 1: Spawn 2-3 agents → Wait for completion → /compact    │
│  - Wave 2: Spawn next 2-3 agents → Wait for completion → /compact│
│  - Repeat until all research complete                           │
└─────────────────────────────────────────────────────────────────┘
```

### Example: Complex Project Planning

```
PHASE 0: INTAKE
  └─ User query → StructuredRequirements

PHASE 1: PRD RESEARCH (Wave 1 of 1)
  ├─ Agent 1: Market Research
  ├─ Agent 2: Domain Expert
  └─ Agent 3: User Research
  └─ /compact (clear context)
  └─ PRD Generation (with user collaboration)

PHASE 2: EXISTING RESEARCH (Wave 2 of 4)
  ├─ Agent 1: Technical Feasibility
  ├─ Agent 2: Codebase Patterns
  └─ Agent 3: Best Practices
  └─ /compact

PHASE 3: ARCHITECTURE RESEARCH (Waves 3-4)
  Wave 3:
    ├─ Agent 1: Frontend Tech
    ├─ Agent 2: Backend Tech
    └─ Agent 3: Database Tech
  └─ /compact
  Wave 4:
    ├─ Agent 4: Infrastructure Tech
    └─ Agent 5: Monitoring Tech
  └─ /compact
  └─ Architecture Generation (with A/P/C menu)

PHASE 4: IMPLEMENTATION RESEARCH (Wave 5 of 5 - complex only)
  ├─ Agent 1: Gap Analysis
  ├─ Agent 2: Dependency Analysis
  └─ Agent 3: Risk Assessment
  └─ /compact
  └─ Implementation Planning

PHASE 5: EXECUTION PLAN GENERATION
  └─ Generate stories, waves, quality gates

PHASE 6: DEPLOYMENT PLANNING
  └─ Generate deployment strategy, CI/CD, monitoring
```

**Total Agent Waves**: 5 waves (for complex project)
**Total Agents Spawned**: ~14 agents (across all waves)
**Max Concurrent**: 3 agents (never exceeds limit)

---

## New Coordinators to Implement

### 1. PRDResearchCoordinator (3 agents, 1 wave)
**File**: `rad-engineer/src/plan/prd/PRDResearchCoordinator.ts`
**Effort**: 3-4 hours
**Dependencies**: None

```typescript
export interface PRDResearchFindings {
  market: MarketResearch;
  domain: DomainInsights;
  users: UserResearchPatterns;
  evidence: Evidence[];
}

export class PRDResearchCoordinator {
  async executePRDResearch(
    requirements: StructuredRequirements,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<PRDResearchFindings> {
    const tasks = [
      {
        agentId: `prd-market-${Date.now()}`,
        taskType: 'market-research',
        prompt: this.buildMarketResearchPrompt(requirements),
        model: 'sonnet'
      },
      {
        agentId: `prd-domain-${Date.now()}`,
        taskType: 'domain-expert',
        prompt: this.buildDomainExpertPrompt(requirements),
        model: 'sonnet'
      },
      {
        agentId: `prd-user-${Date.now()}`,
        taskType: 'user-research',
        prompt: this.buildUserResearchPrompt(requirements),
        model: 'haiku'
      }
    ];

    const results = await this.executeAgents(tasks, spawnAgentFn);
    return this.consolidateFindings(results);
  }
}
```

---

### 2. ArchitectureResearchCoordinator (5 agents, 2 waves)
**File**: `rad-engineer/src/plan/architecture/ArchitectureResearchCoordinator.ts`
**Effort**: 4-6 hours
**Dependencies**: None

```typescript
export interface ArchitectureResearchFindings {
  frontend: TechOptions[];
  backend: TechOptions[];
  database: TechOptions[];
  infrastructure: TechOptions[];
  monitoring: TechOptions[];
  evidence: Evidence[];
}

export class ArchitectureResearchCoordinator {
  async executeArchitectureResearch(
    prd: PRDDocument,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<ArchitectureResearchFindings> {
    // Wave 1: Frontend + Backend + Database
    const wave1Tasks = [
      {
        agentId: `arch-frontend-${Date.now()}`,
        taskType: 'frontend-tech',
        prompt: this.buildFrontendPrompt(prd),
        model: 'sonnet'
      },
      {
        agentId: `arch-backend-${Date.now()}`,
        taskType: 'backend-tech',
        prompt: this.buildBackendPrompt(prd),
        model: 'sonnet'
      },
      {
        agentId: `arch-database-${Date.now()}`,
        taskType: 'database-tech',
        prompt: this.buildDatabasePrompt(prd),
        model: 'sonnet'
      }
    ];

    const wave1Results = await this.executeAgents(wave1Tasks, spawnAgentFn);

    // Context management: /compact between waves
    await this.compactContext();

    // Wave 2: Infrastructure + Monitoring
    const wave2Tasks = [
      {
        agentId: `arch-infra-${Date.now()}`,
        taskType: 'infra-tech',
        prompt: this.buildInfraPrompt(prd),
        model: 'haiku'
      },
      {
        agentId: `arch-monitoring-${Date.now()}`,
        taskType: 'monitoring-tech',
        prompt: this.buildMonitoringPrompt(prd),
        model: 'haiku'
      }
    ];

    const wave2Results = await this.executeAgents(wave2Tasks, spawnAgentFn);

    return this.consolidateFindings(wave1Results, wave2Results);
  }

  private async compactContext(): Promise<void> {
    // Trigger /compact to clear context between waves
    // Preserve only research findings, discard agent outputs
  }
}
```

---

### 3. ElicitationAgentCoordinator (3 agents, 1 wave, on-demand)
**File**: `rad-engineer/src/plan/elicitation/ElicitationAgentCoordinator.ts`
**Effort**: 4-5 hours
**Dependencies**: BMAD methods CSV

```typescript
export interface EnhancedContent {
  original: string;
  enhanced: string;
  methodsApplied: string[];
  improvements: string[];
}

export class ElicitationAgentCoordinator {
  async applyAdvancedElicitation(
    content: string,
    category: string,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<EnhancedContent> {
    // Select 3 relevant methods from BMAD methods.csv
    const methods = this.selectMethods(category);

    const tasks = methods.map(method => ({
      agentId: `elicit-${method.id}-${Date.now()}`,
      taskType: 'elicitation',
      prompt: this.buildElicitationPrompt(content, method),
      model: 'sonnet'
    }));

    const results = await this.executeAgents(tasks, spawnAgentFn);
    return this.consolidateEnhancements(content, results, methods);
  }

  private selectMethods(category: string): ElicitationMethod[] {
    // Select 3 most relevant methods from BMAD
    // Example categories: 'prd', 'architecture', 'implementation'
    // Returns: First Principles, 5 Whys, Pre-mortem (for PRD)
  }
}
```

---

### 4. ImplementationResearchCoordinator (3 agents, 1 wave, complex only)
**File**: `rad-engineer/src/plan/implementation/ImplementationResearchCoordinator.ts`
**Effort**: 3-4 hours
**Dependencies**: PRD, ResearchFindings

```typescript
export interface ImplementationResearchFindings {
  gaps: DetailedGapAnalysis[];
  dependencies: DependencyMap[];
  risks: RiskWithMitigation[];
  evidence: Evidence[];
}

export class ImplementationResearchCoordinator {
  async executeImplementationResearch(
    prd: PRDDocument,
    research: ResearchFindings,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<ImplementationResearchFindings> {
    // Only for complex projects
    if (prd.complexity !== 'complex') {
      return this.skipAnalysis();
    }

    const tasks = [
      {
        agentId: `impl-gap-${Date.now()}`,
        taskType: 'gap-analysis',
        prompt: this.buildGapAnalysisPrompt(prd, research),
        model: 'sonnet'
      },
      {
        agentId: `impl-deps-${Date.now()}`,
        taskType: 'dependency-analysis',
        prompt: this.buildDependencyPrompt(prd, research),
        model: 'sonnet'
      },
      {
        agentId: `impl-risk-${Date.now()}`,
        taskType: 'risk-assessment',
        prompt: this.buildRiskPrompt(prd, research),
        model: 'sonnet'
      }
    ];

    const results = await this.executeAgents(tasks, spawnAgentFn);
    return this.consolidateFindings(results);
  }
}
```

---

## Updated Effort Estimates (With Agent Coordinators)

| Component | Original | + Agents | Total |
|-----------|----------|---------|-------|
| PRDGenerator | 17-25h | +3-4h | 20-29h |
| ArchitectureGenerator | 17h | +4-6h | 21-23h |
| ImplementationPlanGenerator | 19-29h | +3-4h | 22-33h |
| ElicitationCoordinator | 0h | +4-5h | 4-5h |
| **Total** | **53-71h** | **+14-19h** | **67-90h** |

**Additional effort**: ~14-19 hours (2-3 days)

---

## Agent Prompt Templates

### PRD Research Agent Prompts

**Market Research Agent**:
```typescript
private buildMarketResearchPrompt(requirements: StructuredRequirements): string {
  return `
Task: Market Research for Product Requirements

Project: ${requirements.query}
Core Feature: ${requirements.coreFeature}

Instructions:
1. Search the web for competitor products in this space
2. Analyze 3-5 main competitors' positioning and features
3. Identify market gaps and opportunities
4. Recommend differentiation strategies

Output Format (JSON):
{
  "competitors": [
    { "name": "...", "url": "...", "features": [...], "pricing": "..." }
  ],
  "marketGaps": ["gap1", "gap2"],
  "differentiationOpportunities": ["opportunity1", "opportunity2"],
  "evidence": [{"claim": "...", "source": "URL", "confidence": 0.9}]
}
`;
}
```

**Domain Expert Agent**:
```typescript
private buildDomainExpertPrompt(requirements: StructuredRequirements): string {
  return `
Task: Domain Expert Analysis for Product Requirements

Project: ${requirements.query}
Domain: ${this.detectDomain(requirements)}

Instructions:
1. Apply domain expertise to identify critical requirements
2. Identify domain-specific constraints and considerations
3. Recommend industry standards and best practices
4. Highlight common pitfalls in this domain

Output Format (JSON):
{
  "domainRequirements": ["requirement1", "requirement2"],
  "constraints": ["constraint1", "constraint2"],
  "industryStandards": ["standard1", "standard2"],
  "commonPitfalls": ["pitfall1", "pitfall2"],
  "evidence": [{"claim": "...", "source": "URL", "confidence": 0.9}]
}
`;
}
```

**User Research Agent**:
```typescript
private buildUserResearchPrompt(requirements: StructuredRequirements): string {
  return `
Task: User Behavior Pattern Analysis

Project: ${requirements.query}

Instructions:
1. Analyze typical user behavior patterns for this type of product
2. Identify user needs and pain points
3. Recommend user experience considerations
4. Suggest user personas based on behavior patterns

Output Format (JSON):
{
  "userBehaviors": ["behavior1", "behavior2"],
  "userNeeds": ["need1", "need2"],
  "painPoints": ["pain1", "pain2"],
  "recommendedPersonas": [
    { "name": "...", "role": "...", "goals": [...], "behaviors": [...] }
  ],
  "evidence": [{"claim": "...", "source": "URL", "confidence": 0.9}]
}
`;
}
```

---

### Architecture Research Agent Prompts

**Frontend Tech Agent**:
```typescript
private buildFrontendPrompt(prd: PRDDocument): string {
  return `
Task: Frontend Technology Research (Current: 2026)

Project: ${prd.metadata.projectName}

Requirements:
- Functional Requirements: ${prd.functionalRequirements.length}
- User Types: ${prd.personas.length}
- Complexity: ${prd.metadata.complexity}

Instructions:
1. Search the web for CURRENT (2025-2026) frontend frameworks
2. Evaluate React, Vue, Svelte, Solid, Angular based on:
   - Performance benchmarks (2025)
   - Developer experience (2025 reviews)
   - Ecosystem health (npm downloads, GitHub stars)
   - Learning curve
   - Community support
3. Provide 2-3 options with strong recommendation

Output Format (JSON):
{
  "options": [
    {
      "name": "React",
      "version": "19.0.0",
      "released": "2025-01",
      "pros": ["pro1", "pro2"],
      "cons": ["con1", "con2"],
      "fitScore": 9,
      "evidence": [{"claim": "...", "source": "URL", "date": "2025-XX"}]
    }
  ],
  "recommended": "React",
  "rationale": "..."
}
`;
}
```

**Backend Tech Agent**:
```typescript
private buildBackendPrompt(prd: PRDDocument): string {
  return `
Task: Backend Technology Research (Current: 2026)

Project: ${prd.metadata.projectName}

Instructions:
1. Search the web for CURRENT (2025-2026) backend frameworks
2. Evaluate Express, Fastify, NestJS, Hono, Bun based on:
   - Performance benchmarks (2025)
   - Developer experience
   - TypeScript support
   - Ecosystem maturity
3. Provide 2-3 options with strong recommendation

Output Format (JSON): Same as frontend
`;
}
```

---

## Context Management Between Agent Waves

### Critical: /compact Strategy

```typescript
private async compactContext(preserve: string[]): Promise<void> {
  // Trigger /compact with specific preservation
  // Preserve only:
  // - Consolidated research findings (JSON)
  // - Current planning state
  // Discard:
  // - Individual agent outputs
  // - Research agent prompts
  // - Intermediate results
}
```

### Before Each Wave:

```typescript
// Before Wave 1
await this.compactContext(['requirements', 'prd']);

// Execute Wave 1 agents
const wave1Results = await this.executeAgents(wave1Tasks, spawnAgentFn);

// Consolidate and preserve findings
const wave1Consolidated = this.consolidate(wave1Results);

// Between waves
await this.compactContext(['requirements', 'prd', 'wave1Findings']);

// Execute Wave 2 agents
const wave2Results = await this.executeAgents(wave2Tasks, spawnAgentFn);
```

---

## Summary: Additional Agents Required

| Coordinator | Agents | Waves | When to Run | Effort |
|-------------|--------|-------|-------------|--------|
| **PRDResearchCoordinator** | 3 | 1 | After Intake, before PRD | 3-4h |
| **ArchitectureResearchCoordinator** | 5 | 2 | After PRD, before Architecture | 4-6h |
| **ElicitationAgentCoordinator** | 3 | 1 | On-demand (A/P/C "A" selection) | 4-5h |
| **ImplementationResearchCoordinator** | 3 | 1 | Complex projects only | 3-4h |

**Total Additional Effort**: 14-19 hours (2-3 days)
**Updated Total Effort**: 67-90 hours (core components + agents) = **8-11 days**

---

## Recommendation

**YES, we need additional agents for the planning phase.** Specifically:

1. **PRDResearchCoordinator** (HIGH VALUE) - Informs PRD with market, domain, user context
2. **ArchitectureResearchCoordinator** (HIGH VALUE) - Researches current tech options for sound decisions
3. **ElicitationAgentCoordinator** (MEDIUM VALUE) - Optional refinement when user selects "A"
4. **ImplementationResearchCoordinator** (MEDIUM VALUE) - Deep analysis for complex projects only

All coordinators respect the **max 2-3 concurrent agent limit** through wave-based execution with **/compact** between waves.

---

