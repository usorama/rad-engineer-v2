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


---

## PLATFORM ARCHITECTURE: SPECIALIZED AGENTS FOR RAD-ENGINEER

**Created**: 2026-01-06
**Purpose**: Analyze whether rad-engineer needs specialized persistent agents (like BMAD/oh-my-opencode) or if on-demand spawning is sufficient
**Critical Question**: Should we build agent PERSONAS or just spawn agents ON-DEMAND?

---

## Current Rad-Engineer Architecture

### On-Demand Agent Spawning Model

**Pattern**: Spawn temporary agents via Task tool for specific tasks

```typescript
// Current approach in /plan and /execute
const result = await Task({
  prompt: "Task: Implement useQuizTimer hook",
  subagent_type: "developer",
  model: "sonnet"
});
// Agent exists, does task, dies
```

**Components that spawn agents**:
- `ResearchCoordinator` → 2-3 research agents (temporary)
- `/execute skill` → Story execution agents (temporary)
- `/plan skill` → Research agents (temporary)

**Characteristics**:
- ✅ Flexible - spawn right agent for each task
- ✅ Simple architecture
- ✅ Lower resource usage (agents only exist when needed)
- ❌ Stateless - no memory between sessions
- ❌ No consistent persona or expertise
- ❌ Can't maintain long-term context

---

## BMAD/oh-my-opencode Architecture

### Specialized Persistent Agents Model

**Pattern**: 7 specialized agents with defined personas, models, and capabilities

| Agent | Model | Purpose | Persona |
|-------|-------|---------|---------|
| **Sisyphus** | Claude Opus 4.5 | Primary orchestrator | Methodical, systematic |
| **oracle** | GPT-5.2 | Strategic advisor, code review | Wise, analytical |
| **librarian** | Claude Sonnet 4.5 | Multi-repo analysis, documentation | Organized, thorough |
| **explore** | Grok Code | Fast codebase exploration | Curious, quick |
| **frontend-ui-ux-engineer** | Gemini 3 Pro | UI generation | Creative, user-focused |
| **document-writer** | Claude Sonnet 4.5 | Technical writing | Clear, structured |
| **multimodal-looker** | Claude Sonnet 4.5 | Image analysis | Observant, detailed |

**Characteristics**:
- ✅ Consistent persona and expertise
- ✅ Can maintain state across sessions
- ✅ Specialized tools per agent
- ✅ Deep domain knowledge
- ❌ More complex architecture
- ❌ Higher resource usage
- ❌ Less flexible (agent bound to specialty)

---

## Analysis: Planning & Execution Requirements

### Planning Phase Agent Needs

| Phase | Tasks Required | Best Approach | Rationale |
|-------|----------------|---------------|-----------|
| **PRD Research** | Market analysis, domain expertise, user research | **Specialized Agent** | Requires consistent research methodology, web search patterns |
| **PRD Generation** | Collaborative Q&A, vision articulation | **Specialized Agent** | Needs product manager persona, facilitation skills |
| **Architecture** | Tech evaluation, decision rationale | **Specialized Agent** | Needs technical strategist persona, current tech knowledge |
| **Implementation Planning** | Gap analysis, epic breakdown, risk assessment | **Specialized Agent** | Needs technical architect persona, systems thinking |
| **Advanced Elicitation** | Apply reasoning methods, critical thinking | **Specialized Agent** | Needs philosophical reasoning persona |

### Execution Phase Agent Needs

| Phase | Tasks Required | Best Approach | Rationale |
|-------|----------------|---------------|-----------|
| **Story Implementation** | Write code, write tests | **On-Demand** | Standard dev task, no persistent persona needed |
| **Code Review** | Review for quality, security, patterns | **Specialized Agent** | Needs consistent review criteria, senior engineer persona |
| **Debugging** | Investigate issues, fix bugs | **On-Demand** | Task-specific, can spawn fresh each time |
| **Test Writing** | Write comprehensive tests | **On-Demand** | Standard QA task |
| **Documentation** | Write docs, maintain consistency | **Specialized Agent** | Needs technical writer persona |

---

## Recommendation: HYBRID MODEL

**Not "either/or" - use specialized agents where they add value, on-demand where they don't**

### Specialized Agents (Persistent Personas)

| Agent | Model | Purpose | Why Specialized |
|-------|-------|---------|-----------------|
| **ProductManager** (PRD Architect) | Sonnet | Lead PRD generation, facilitation, user collaboration | Needs consistent PM persona, elicitation skills |
| **TechStrategist** (Architecture) | Sonnet | Lead architecture decisions, tech evaluation | Needs technical strategist persona, web research patterns |
| **CodeReviewer** | Opus | Review all code before merge | Needs consistent review criteria, senior engineer persona |
| **PlanningOrchestrator** | Sonnet | Coordinate planning phases, A/P/C menus | Needs orchestrator persona, workflow management |

### On-Demand Agents (Task-Specific)

| Task | Agent Type | Model | Why On-Demand |
|------|-----------|-------|---------------|
| Story implementation | `developer` | Haiku/Sonnet | Standard coding task |
| Test writing | `test-writer` | Haiku | Standard QA task |
| Debugging | `debugger` | Sonnet | Task-specific investigation |
| Research waves | `research-agent` | Sonnet | Temporary research task |
| Documentation updates | `document-writer` | Sonnet | Can be on-demand with template |

---

## Proposed Agent Architecture

### File Structure

```
rad-engineer/src/agents/
├── specialized/                    # Persistent agent personas
│   ├── ProductManagerAgent.ts      # PRD generation specialist
│   ├── TechStrategistAgent.ts      # Architecture specialist
│   ├── CodeReviewerAgent.ts        # Code review specialist
│   └── PlanningOrchestratorAgent.ts # Planning coordination
├── on-demand/                      # Task factory (existing)
│   ├── DeveloperAgent.ts           # Story execution
│   ├── TestWriterAgent.ts          # Test writing
│   ├── DebuggerAgent.ts            # Debugging
│   └── ResearchAgent.ts            # Research tasks
├── types.ts                        # Agent type definitions
├── AgentFactory.ts                 # Create right agent for task
└── AgentOrchestrator.ts            # Coordinate specialized + on-demand
```

### Specialized Agent Interface

```typescript
// rad-engineer/src/agents/types.ts

export interface SpecializedAgent {
  id: string;
  name: string;
  model: 'haiku' | 'sonnet' | 'opus';
  persona: AgentPersona;
  capabilities: string[];
  tools: string[];
  temperature: number;
  systemPrompt: string;
}

export interface AgentPersona {
  role: string;
  tone: string;
  expertise: string[];
  behaviors: string[];
  constraints: string[];
}

export enum SpecializedAgentType {
  PRODUCT_MANAGER = 'product-manager',
  TECH_STRATEGIST = 'tech-strategist',
  CODE_REVIEWER = 'code-reviewer',
  PLANNING_ORCHESTRATOR = 'planning-orchestrator',
}

export enum OnDemandAgentType {
  DEVELOPER = 'developer',
  TEST_WRITER = 'test-writer',
  DEBUGGER = 'debugger',
  RESEARCHER = 'researcher',
}
```

### Specialized Agent Example

```typescript
// rad-engineer/src/agents/specialized/ProductManagerAgent.ts

export const ProductManagerAgent: SpecializedAgent = {
  id: 'product-manager',
  name: 'Product Manager',
  model: 'sonnet',
  persona: {
    role: 'Product Manager Facilitator',
    tone: 'Collaborative, inquisitive, structured',
    expertise: [
      'Requirements gathering',
      'User story writing',
      'Prioritization (MoSCoW)',
      'Stakeholder facilitation',
      'Product vision articulation'
    ],
    behaviors: [
      'Ask clarifying questions',
      'Probe for underlying needs',
      'Summarize and confirm understanding',
      'Present options with trade-offs',
      'Facilitate decision-making'
    ],
    constraints: [
      'Never generate requirements without user input',
      'Always present A/P/C menu after major phases',
      'Respect user expertise and domain knowledge',
      'Focus on WHAT and WHY, not HOW'
    ]
  },
  capabilities: [
    'prd-generation',
    'user-interviews',
    'persona-creation',
    'requirement-prioritization',
    'scope-definition'
  ],
  tools: ['ask-user-question', 'web-search', 'read-file', 'write-file'],
  temperature: 0.2, // Lower for consistent facilitation
  systemPrompt: `You are a Product Manager collaborating with an expert peer.

Your role is to facilitate product discovery through structured dialogue:
- Ask probing questions to understand user needs
- Help articulate product vision and objectives
- Guide requirement gathering without prescribing solutions
- Use MoSCoW prioritization (Must, Should, Could, Won't)
- Present options with trade-offs for user decisions

Key behaviors:
- Collaborative, not directive
- Inquisitive, not presumptuous
- Structured, but flexible
- Focus on outcomes, not features

After each major phase, present the A/P/C menu:
[A] Advanced Elicitation - explore deeper with reasoning methods
[P] Party Mode - bring in multiple perspectives (future)
[C] Continue - proceed to next phase

You are working together to build something great. Respect the user's expertise while bringing structured thinking to the conversation.`
};
```

```typescript
// rad-engineer/src/agents/specialized/TechStrategistAgent.ts

export const TechStrategistAgent: SpecializedAgent = {
  id: 'tech-strategist',
  name: 'Technology Strategist',
  model: 'sonnet',
  persona: {
    role: 'Technical Architecture Strategist',
    tone: 'Analytical, evidence-based, decisive',
    expertise: [
      'Technology stack evaluation',
      'Architecture decision records',
      'Performance optimization',
      'Scalability planning',
      'Security best practices',
      'Current tech trends (2025-2026)'
    ],
    behaviors: [
      'Search web for current tech versions (not LLM knowledge)',
      'Present 2-3 options with strong recommendation',
      'Provide evidence-based rationale',
      'Consider business objectives, team skills, performance'
    ],
    constraints: [
      'Never rely on LLM training data for tech versions',
      'Always search web for current information',
      'Provide sources with dates',
      'Explain trade-offs clearly'
    ]
  },
  capabilities: [
    'architecture-decisions',
    'tech-stack-selection',
    'performance-analysis',
    'security-review',
    'scalability-planning'
  ],
  tools: ['web-search', 'read-file', 'analyze-codebase'],
  temperature: 0.1, // Very low for consistent technical analysis
  systemPrompt: `You are a Technology Strategist helping make informed architecture decisions.

Your role is to recommend technology options based on:
- Current tech landscape (2025-2026), not LLM training data
- Business objectives and constraints
- Team capabilities and learning curve
- Performance requirements
- Ecosystem health and community support

Process:
1. Search web for CURRENT tech versions and benchmarks
2. Evaluate 2-3 best options for each category
3. Provide strong recommendation with rationale
4. Cite sources with dates (evidence-based)
5. Explain trade-offs clearly

Decision categories:
- Frontend: React, Vue, Svelte, Solid, Angular
- Backend: Express, Fastify, NestJS, Hono, Bun
- Database: PostgreSQL, MySQL, MongoDB, SQLite
- Infrastructure: Docker, Kubernetes, Serverless
- Monitoring: Prometheus, DataDog, New Relic

After presenting options, wait for user decision before proceeding.

Architecture matters. Choose wisely with current evidence.`
};
```

```typescript
// rad-engineer/src/agents/specialized/CodeReviewerAgent.ts

export const CodeReviewerAgent: SpecializedAgent = {
  id: 'code-reviewer',
  name: 'Senior Code Reviewer',
  model: 'opus',
  persona: {
    role: 'Senior Engineer Code Reviewer',
    tone: 'Thorough, constructive, standards-focused',
    expertise: [
      'TypeScript best practices',
      'Design patterns',
      'Security vulnerabilities',
      'Performance optimization',
      'Test coverage',
      'Documentation standards'
    ],
    behaviors: [
      'Review for correctness, security, performance',
      'Check adherence to coding standards',
      'Suggest improvements with rationale',
      'Verify test coverage',
      'Ensure documentation is complete'
    ],
    constraints: [
      'Never approve code without verification',
      'Always run typecheck and tests',
      'Check for security vulnerabilities',
      'Verify evidence of testing'
    ]
  },
  capabilities: [
    'code-review',
    'security-review',
    'performance-analysis',
    'standards-compliance',
    'test-verification'
  ],
  tools: ['grep', 'glob', 'read-file', 'bash', 'analyze-typescript'],
  temperature: 0.1, // Very low for consistent review criteria
  systemPrompt: `You are a Senior Engineer conducting thorough code reviews.

Your review checklist:
1. ✅ Correctness: Does code work as intended?
2. ✅ Security: Any vulnerabilities (OWASP Top 10)?
3. ✅ Performance: Any optimization opportunities?
4. ✅ Standards: Follows project conventions?
5. ✅ Tests: Adequate coverage, all passing?
6. ✅ Types: No `any` types, proper TypeScript?
7. ✅ Documentation: Clear comments where needed?

Evidence required:
- typecheck output (0 errors)
- test output (all passing)
- Files read for context
- Existing patterns checked

Review criteria:
- Approve: All checks pass, evidence provided
- Request changes: Critical issues found
- Comment: Suggestions for improvement (non-blocking)

Never approve without running verification. Quality matters.`
};
```

### Agent Factory

```typescript
// rad-engineer/src/agents/AgentFactory.ts

export class AgentFactory {
  private specializedAgents: Map<SpecializedAgentType, SpecializedAgent>;
  
  constructor() {
    this.specializedAgents = new Map([
      [SpecializedAgentType.PRODUCT_MANAGER, ProductManagerAgent],
      [SpecializedAgentType.TECH_STRATEGIST, TechStrategistAgent],
      [SpecializedAgentType.CODE_REVIEWER, CodeReviewerAgent],
      [SpecializedAgentType.PLANNING_ORCHESTRATOR, PlanningOrchestratorAgent],
    ]);
  }

  createAgent(type: SpecializedAgentType | OnDemandAgentType): AgentConfig {
    if (this.isSpecializedAgent(type)) {
      // Return persistent specialized agent
      return this.specializedAgents.get(type);
    } else {
      // Return on-demand agent config
      return this.createOnDemandAgent(type);
    }
  }

  private createOnDemandAgent(type: OnDemandAgentType): AgentConfig {
    // Standard on-demand agent configs
    const configs = {
      [OnDemandAgentType.DEVELOPER]: {
        subagent_type: 'developer',
        model: 'haiku',
        temperature: 0.3,
      },
      [OnDemandAgentType.TEST_WRITER]: {
        subagent_type: 'test-writer',
        model: 'haiku',
        temperature: 0.2,
      },
      [OnDemandAgentType.DEBUGGER]: {
        subagent_type: 'debugger',
        model: 'sonnet',
        temperature: 0.2,
      },
      [OnDemandAgentType.RESEARCHER]: {
        subagent_type: 'general-purpose',
        model: 'sonnet',
        temperature: 0.1,
      },
    };
    return configs[type];
  }
}
```

---

## Updated Workflow with Specialized Agents

### /plan Phase

```
User Query
  ↓
[ProductManager Agent] - Intake + PRD Generation
  ├─ Collaborative Q&A
  ├─ User personas, stories
  ├─ FRs, NFRs
  └─ A/P/C menu after PRD
  ↓
[On-Demand Research Agents] - 3 parallel (wave 1)
  ├─ Market Research
  ├─ Domain Expert
  └─ User Research
  ↓
[TechStrategist Agent] - Architecture Generation
  ├─ Web search for current tech
  ├─ Present 2-3 options with recommendation
  └─ A/P/C menu after architecture
  ↓
[PlanningOrchestrator Agent] - Implementation Planning
  ├─ Gap analysis
  ├─ Epic breakdown
  ├─ Milestones, dependencies
  └─ A/P/C menu after plan
  ↓
[On-Demand Developers] - Execution Plan Generation
  └─ Generate detailed stories
  ↓
[CodeReviewer Agent] - Validation
  └─ Review plan for completeness
```

### /execute Phase

```
GRANULAR_EXECUTION_PLAN.md
  ↓
For each wave:
  [On-Demand Developers] - 2-3 parallel stories
  ├─ TDD: Red → Green → Refactor
  ├─ Quality gates
  └─ Update progress
  ↓
[CodeReviewer Agent] - Review each story
  ├─ Verify typecheck, tests pass
  ├─ Check standards compliance
  └─ Approve or request changes
  ↓
Next wave
```

---

## Implementation Tasks

| Task | Effort | Priority |
|------|--------|----------|
| **1. Create specialized agent infrastructure** | 4-6h | HIGH |
| ├─ Agent types and interfaces | 1h | |
| ├─ SpecializedAgent interface | 1h | |
| ├─ AgentFactory | 2h | |
| └─ AgentOrchestrator | 2h | |
| **2. Implement ProductManager agent** | 3-4h | HIGH |
| ├─ Persona definition | 1h | |
| ├─ PRD generation workflow | 2h | |
| └─ A/P/C menu handling | 1h | |
| **3. Implement TechStrategist agent** | 3-4h | HIGH |
| ├─ Persona definition | 1h | |
| ├─ Web search integration | 1h | |
| └─ Decision template generation | 2h | |
| **4. Implement CodeReviewer agent** | 2-3h | MEDIUM |
| ├─ Persona definition | 1h | |
| ├─ Review criteria | 1h | |
| └─ Evidence verification | 1h | |
| **5. Implement PlanningOrchestrator agent** | 2-3h | MEDIUM |
| ├─ Workflow coordination | 1h | |
| ├─ Phase transitions | 1h | |
| └─ State management | 1h | |
| **6. Update /plan skill to use agents** | 4-6h | HIGH |
| ├─ Wire ProductManager for PRD | 2h | |
| ├─ Wire TechStrategist for Architecture | 2h | |
| └─ Wire PlanningOrchestrator for coordination | 2h | |
| **7. Update /execute skill to use agents** | 2-3h | MEDIUM |
| ├─ Wire CodeReviewer for each story | 2h | |
| └─ Approval workflow | 1h | |
| **8. Tests and integration** | 4-6h | HIGH |

**Total Effort**: ~24-35 hours (3-4 days)

---

## Decision Matrix

| Aspect | On-Demand Only | Specialized Only | **Hybrid (Recommended)** |
|--------|----------------|------------------|--------------------------|
| Flexibility | ✅ High | ❌ Low | ✅ High |
| Consistency | ❌ Low | ✅ High | ✅ High |
| Persona | ❌ None | ✅ Defined | ✅ Where it matters |
| Complexity | ✅ Simple | ❌ Complex | ⚠️ Medium |
| Resource usage | ✅ Low | ❌ High | ⚠️ Medium |
| Best for | Simple tasks | Complex workflows | **Planning + Review** |

---

## Final Recommendation

**HYBRID MODEL: Specialized agents for planning + review, on-demand for execution**

### Specialized Agents (4 persistent personas)
1. **ProductManager** - PRD generation (needs PM persona)
2. **TechStrategist** - Architecture decisions (needs technical strategist persona)
3. **CodeReviewer** - Code review (needs consistent review criteria)
4. **PlanningOrchestrator** - Workflow coordination (needs orchestrator persona)

### On-Demand Agents (existing model)
- Developer agents for story execution
- Test writers for testing
- Debuggers for debugging
- Research agents for research waves

### Effort Impact
- **Additional**: 24-35 hours (3-4 days)
- **Total project effort**: 91-125 hours (11-15 days)

### Value Proposition
- ✅ Consistent persona for user-facing phases (PRD, Architecture)
- ✅ Better quality for high-stakes decisions (architecture, code review)
- ✅ Maintains flexibility for execution phases
- ✅ Follows BMAD/oh-my-opencode proven patterns
- ⚠️ Adds moderate complexity

---

**Decision needed**: Should we implement the hybrid model with 4 specialized agents, or stay with on-demand only?


---

## DECISION CONFIRMED: HYBRID AGENT ARCHITECTURE

**Status**: ✅ CONFIRMED BY USER
**Rationale**: Determinism, repeatability, and reproducibility for core platform workflows

---

## Core Principle

> **"Specialized agents for planned workflows = Deterministic outcomes**
> **On-demand spawning for edge cases = Flexible adaptation**

---

## Specialized Agents (4 Persistent Personas)

### Decision Rationale

| Requirement | Specialized Agents Enable | On-Demand Spawning |
|-------------|--------------------------|-------------------|
| **Determinism** | ✅ Consistent persona, same process every time | ❌ Varies by agent prompt |
| **Repeatability** | ✅ Same input → same output (reliable) | ❌ Depends on agent instantiation |
| **Reproducibility** | ✅ Can trace decisions to specific agent persona | ❌ Harder to reproduce without context |
| **Quality** | ✅ Specialized expertise, consistent criteria | ❌ Variable quality |
| **Debugging** | ✅ Know which agent made which decision | ❌ Harder to trace |

**Conclusion**: Specialized agents are REQUIRED for the platform to work **accurately and reliably**.

---

### The 4 Core Specialized Agents

#### 1. ProductManager Agent (PRD Generation)

**Purpose**: Own the PRD generation workflow from start to finish

**Responsibilities**:
- Intake and requirements gathering (collaborative Q&A)
- User persona and user story creation
- Functional and non-functional requirements
- MVP vs backlog scoping
- A/P/C menu facilitation

**Why Specialized**:
- **Determinism**: Same PM persona = consistent PRD quality every time
- **Repeatability**: Follows same PRD template and process
- **User Experience**: Users build relationship with "their PM"

**File**: `rad-engineer/src/agents/specialized/ProductManagerAgent.ts`

---

#### 2. TechStrategist Agent (Architecture Decisions)

**Purpose**: Own architecture decision-making with current tech research

**Responsibilities**:
- Web search for current tech versions (2025-2026)
- Evaluate 2-3 options per category
- Provide strong recommendation with rationale
- Generate Architecture Decision Records (ADRs)
- Evidence sourcing with URLs and dates

**Why Specialized**:
- **Determinism**: Same evaluation criteria = consistent tech choices
- **Accuracy**: Always searches web, never relies on stale LLM knowledge
- **Reproducibility**: Can trace every decision to evidence sources

**File**: `rad-engineer/src/agents/specialized/TechStrategistAgent.ts`

---

#### 3. PlanningOrchestrator Agent (Workflow Coordination)

**Purpose**: Own the end-to-end planning workflow coordination

**Responsibilities**:
- Coordinate all planning phases
- Manage A/P/C menus between phases
- Track planning state and progress
- Hand off between specialized agents
- Ensure all planning artifacts are complete

**Why Specialized**:
- **Determinism**: Same workflow = predictable planning process
- **Repeatability**: Every project goes through same gates
- **Quality**: Ensures nothing is skipped or missed

**File**: `rad-engineer/src/agents/specialized/PlanningOrchestratorAgent.ts`

---

#### 4. CodeReviewer Agent (Quality Gates)

**Purpose**: Own code review standards and enforcement

**Responsibilities**:
- Review all code before merge
- Verify typecheck and tests pass
- Check security vulnerabilities
- Ensure coding standards compliance
- Approve or request changes

**Why Specialized**:
- **Determinism**: Same review criteria = consistent quality
- **Reproducibility**: Can trace approval to specific checks
- **Quality**: Prevents bad code from entering codebase

**File**: `rad-engineer/src/agents/specialized/CodeReviewerAgent.ts`

---

## On-Demand Agents (Edge Cases & One-Offs)

### Purpose

Handle scenarios that **cannot be planned for**:
- Unexpected debugging needs
- One-off research tasks
- Temporary analysis tasks
- Experimental features

### Pattern

```typescript
// Spawn on-demand for specific task
const result = await Task({
  prompt: "Task: Analyze this crash log",
  subagent_type: "general-purpose",  // Generic agent
  model: "sonnet",
});
// Agent does task, terminates
```

### Use Cases

| Scenario | Agent Type | Model | Rationale |
|----------|-----------|-------|-----------|
| Debug specific crash | `debugger` | Sonnet | One-off investigation |
| Research unfamiliar library | `researcher` | Sonnet | Temporary research |
| Quick file analysis | `general-purpose` | Haiku | Simple task |
| Experimental feature | `developer` | Sonnet | May fail, that's OK |

**Key**: These are NON-DETERMINISTIC by design - they handle the unknown.

---

## Architecture

### File Structure

```
rad-engineer/src/agents/
├── specialized/                           # 4 core agents (deterministic)
│   ├── ProductManagerAgent.ts            # PRD generation
│   ├── TechStrategistAgent.ts            # Architecture decisions
│   ├── PlanningOrchestratorAgent.ts      # Workflow coordination
│   ├── CodeReviewerAgent.ts              # Code review
│   └── types.ts                          # Specialized agent interfaces
├── on-demand/                             # Task factory (flexible)
│   ├── agents/
│   │   ├── DebuggerAgent.ts
│   │   ├── ResearchAgent.ts
│   │   └── GeneralPurposeAgent.ts
│   └── factory.ts                        # On-demand agent factory
├── AgentOrchestrator.ts                   # Coordinate specialized + on-demand
├── AgentRegistry.ts                       # Register all agents
└── types.ts                               # Unified type system
```

---

## Implementation Tasks (Updated)

### Phase 1: Agent Infrastructure (Week 1)

| Task | Effort | Status |
|------|--------|--------|
| **1.1 Create agent type system** | 2h | Pending |
| ├─ SpecializedAgent interface | | |
| ├─ OnDemandAgent interface | | |
| └─ AgentRegistry (register all agents) | | |
| **1.2 Create AgentOrchestrator** | 3h | Pending |
| ├─ Coordinate specialized agents | | |
| ├─ Spawn on-demand agents | | |
| └─ Hand-off between agents | | |
| **1.3 Create AgentFactory** | 2h | Pending |
| ├─ Create specialized agent instances | | |
| └─ Create on-demand agent configs | | |

**Subtotal**: 7 hours

---

### Phase 2: Specialized Agents (Week 1-2)

| Task | Effort | Dependencies | Status |
|------|--------|--------------|--------|
| **2.1 ProductManagerAgent** | 4-5h | 1.1 | Pending |
| ├─ Define PM persona | 1h | | |
| ├─ PRD generation workflow | 2h | | |
| ├─ A/P/C menu handling | 1h | | |
| └─ Tests | 1h | | |
| **2.2 TechStrategistAgent** | 4-5h | 1.1 | Pending |
| ├─ Define strategist persona | 1h | | |
| ├─ Web search integration | 1h | | |
| ├─ Decision template generation | 2h | | |
| └─ Tests | 1h | | |
| **2.3 PlanningOrchestratorAgent** | 3-4h | 1.1, 2.1, 2.2 | Pending |
| ├─ Define orchestrator persona | 1h | | |
| ├─ Phase coordination | 1h | | |
| ├─ State tracking | 1h | | |
| └─ Tests | 1h | | |
| **2.4 CodeReviewerAgent** | 3-4h | 1.1 | Pending |
| ├─ Define reviewer persona | 1h | | |
| ├─ Review criteria implementation | 1h | | |
| ├─ Evidence verification | 1h | | |
| └─ Tests | 1h | | |

**Subtotal**: 14-18 hours

---

### Phase 3: Integration with Skills (Week 2-3)

| Task | Effort | Dependencies | Status |
|------|--------|--------------|--------|
| **3.1 Update /plan skill** | 6-8h | 2.1, 2.2, 2.3 | Pending |
| ├─ Wire ProductManager for PRD phase | 2h | | |
| ├─ Wire TechStrategist for Architecture phase | 2h | | |
| ├─ Wire PlanningOrchestrator for coordination | 2h | | |
| └─ Integration tests | 2h | | |
| **3.2 Update /execute skill** | 4-5h | 2.4 | Pending |
| ├─ Wire CodeReviewer for each story | 2h | | |
| ├─ Approval workflow | 1h | | |
| └─ Integration tests | 2h | | |

**Subtotal**: 10-13 hours

---

### Phase 4: Testing & Verification (Week 3)

| Task | Effort | Dependencies | Status |
|------|--------|--------------|--------|
| **4.1 Determinism tests** | 4-5h | 3.1, 3.2 | Pending |
| ├─ Test: Same input → same output | 2h | | |
| ├─ Test: Same agent persona across sessions | 1h | | |
| └─ Test: Reproducible decisions | 2h | | |
| **4.2 End-to-end workflow tests** | 4-5h | All | Pending |
| ├─ Test: Simple project (greenfield) | 1h | | |
| ├─ Test: Complex project (brownfield) | 2h | | |
| └─ Test: Edge case with on-demand agent | 1h | | |

**Subtotal**: 8-10 hours

---

## Total Effort (With Specialized Agents)

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Agent Infrastructure | 7h | 7h |
| Specialized Agents | 14-18h | 21-25h |
| Skill Integration | 10-13h | 31-38h |
| Testing & Verification | 8-10h | **39-48h** |

**Total Specialized Agents**: ~39-48 hours (**5-6 days**)

---

## Grand Total Effort (All Components)

| Component | Effort |
|-----------|--------|
| Core Planning Components (PRD, Architecture, Implementation, Deployment) | 67-90h |
| Agent Coordinators (Research, Architecture, Elicitation) | 14-19h |
| **Specialized Agents (NEW)** | **39-48h** |
| **TOTAL** | **120-157h (15-20 days)** |

---

## Updated Implementation Sequence

```
Week 1: Agent Infrastructure + 2 Specialized Agents
├─ Agent type system, orchestrator, factory
├─ ProductManagerAgent
└─ TechStrategistAgent

Week 2: Remaining Specialized Agents + Integration
├─ PlanningOrchestratorAgent
├─ CodeReviewerAgent
├─ /plan skill integration
└─ /execute skill integration

Week 3: Testing + Verification
├─ Determinism tests
├─ End-to-end workflow tests
└─ Bug fixes

Week 4-5: Core Planning Components
├─ PRDGenerator (uses ProductManagerAgent)
├─ ArchitectureGenerator (uses TechStrategistAgent)
├─ ImplementationPlanGenerator (uses PlanningOrchestratorAgent)
└─ DeploymentPlanGenerator

Week 6: Integration & Documentation
├─ Full workflow integration
├─ Documentation
└─ Final verification
```

---

## Success Metrics (Determinism, Repeatability, Reproducibility)

### Determinism

**Definition**: Same input → Same output (within same session)

**Tests**:
```typescript
// Test: Same PRD input generates same PRD output
const input1 = { query: "build a notes app" };
const prd1 = await productManager.generatePRD(input1);
const prd2 = await productManager.generatePRD(input1);
assert.deepEquals(prd1, prd2); // Should be identical
```

**Metric**: 100% deterministic for same input in same session

---

### Repeatability

**Definition**: Same process → Same quality (across sessions)

**Tests**:
```typescript
// Test: PM persona produces consistent quality across sessions
const session1 = await runWithProductManager("build a notes app");
const session2 = await runWithProductManager("build a todo app");
assert.equal(session1.qualityScore, session2.qualityScore); // Should be equal
```

**Metric**: Quality variance < 10% across sessions

---

### Reproducibility

**Definition**: Can trace decisions to source (evidence-based)

**Tests**:
```typescript
// Test: Every architecture decision has evidence source
const architecture = await techStrategist.generateArchitecture(prd);
for (const decision of architecture.decisions) {
  assert.isNotEmpty(decision.evidence); // Each decision has source
  assert.isNotEmpty(decision.evidence[0].url); // Source has URL
  assert.isNotEmpty(decision.evidence[0].date); // Source has date
}
```

**Metric**: 100% of decisions have traceable evidence

---

## Final Decision Summary

✅ **CONFIRMED**: Hybrid Agent Architecture

**Core Principle**: Specialized agents for deterministic workflows, on-demand for edge cases

**The 4 Specialized Agents**:
1. ProductManagerAgent → PRD generation
2. TechStrategistAgent → Architecture decisions
3. PlanningOrchestratorAgent → Workflow coordination
4. CodeReviewerAgent → Code review

**Why**: Determinism, repeatability, and reproducibility REQUIRE consistent personas

**Effort**: +39-48 hours (5-6 days)

**Total Project**: 120-157 hours (15-20 days)

---

**Next**: Implement specialized agents alongside core planning components


---

## EXECUTION METADATA & ORDERING (SELF-EXECUTING PLAN)

**Created**: 2026-01-06
**Purpose**: Every planning item has execution metadata - no ambiguity about what to do next
**Rule**: Never ask "what to do next" - the plan determines order

---

## Execution Metadata Schema

Every item in this plan has:

```yaml
id: UNIQUE_IDENTIFIER
category: AGENTS | PLANNING | INTEGRATION | TESTING
priority: 1-10 (1 = FIRST, 10 = LAST)
execution:
  mode: sequential | parallel | barrier
  order: INTEGER
  dependencies: [ID1, ID2]
  blocks: [ID1, ID2]
effort:
  hours: INTEGER
  days: FLOAT
status: pending | in_progress | completed
assignedTo: senior-dev | mid-dev | junior-dev
definitionOfDone:
  - criterion 1
  - criterion 2
verification:
  type: test | review | manual
  command: verification command
evidence:
  - file: path/to/file
```

---

## MASTER EXECUTION ORDER (DAG)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: FOUNDATION (Week 1)                     │
│  Parallel: AGENT-INFRA (7h) + PRD-ARCH-AGENTS (8-10h)              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: SPECIALIZED AGENTS (Week 1-2)           │
│  Sequential: PM-AGENT → TS-AGENT → PO-AGENT → CR-AGENT             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: SKILL INTEGRATION (Week 2)              │
│  Parallel: PLAN-INTEGRATION + EXEC-INTEGRATION                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: PLANNING COMPONENTS (Week 2-4)          │
│  Parallel: PRD-GEN + ARCH-GEN + IMPL-GEN + DEPLOY-GEN             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: TESTING (Week 4-5)                     │
│  Sequential: UNIT-TESTS → E2E-TESTS → DETERMINISM-TESTS           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 6: DOCUMENTATION (Week 5)                 │
│  Parallel: DOCS + EXAMPLES                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DETAILED EXECUTION ITEMS

### PHASE 1: FOUNDATION (Week 1)

---

#### ITEM 1.1: Agent Type System

```yaml
id: AGENT-INFRA-001
title: Create agent type system and interfaces
category: AGENTS
priority: 1

execution:
  mode: parallel
  order: 1
  dependencies: []
  blocks: [AGENT-INFRA-002, AGENT-INFRA-003]
  
effort:
  hours: 2
  days: 0.25
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - SpecializedAgent interface defined with all fields
  - OnDemandAgent interface defined
  - AgentPersona type defined
  - AgentRegistry class created
  - All types exported from index.ts
  
verification:
  type: test
  command: bun test src/agents/specialized/types.test.ts
  
evidence:
  - file: rad-engineer/src/agents/specialized/types.ts
  - file: rad-engineer/src/agents/on-demand/types.ts
  - file: rad-engineer/src/agents/AgentRegistry.ts
  - file: rad-engineer/test/agents/types.test.ts
```

---

#### ITEM 1.2: Agent Orchestrator

```yaml
id: AGENT-INFRA-002
title: Create AgentOrchestrator for coordination
category: AGENTS
priority: 1

execution:
  mode: parallel
  order: 2
  dependencies: [AGENT-INFRA-001]
  blocks: [AGENT-SPEC-001, AGENT-SPEC-002]
  
effort:
  hours: 3
  days: 0.375
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - AgentOrchestrator class with coordinate() method
  - Handoff between specialized agents
  - Spawn on-demand agents
  - State tracking
  - Error handling
  
verification:
  type: test
  command: bun test src/agents/AgentOrchestrator.test.ts
  
evidence:
  - file: rad-engineer/src/agents/AgentOrchestrator.ts
  - file: rad-engineer/test/agents/AgentOrchestrator.test.ts
```

---

#### ITEM 1.3: Agent Factory

```yaml
id: AGENT-INFRA-003
title: Create AgentFactory for agent instantiation
category: AGENTS
priority: 1

execution:
  mode: parallel
  order: 3
  dependencies: [AGENT-INFRA-001]
  blocks: [PLAN-INTEG-001, EXEC-INTEG-001]
  
effort:
  hours: 2
  days: 0.25
  
status: pending
assignedTo: mid-dev

definitionOfDone:
  - AgentFactory with createAgent() method
  - Create specialized agent instances
  - Create on-demand agent configs
  - Model selection logic
  - Temperature config
  
verification:
  type: test
  command: bun test src/agents/AgentFactory.test.ts
  
evidence:
  - file: rad-engineer/src/agents/AgentFactory.ts
  - file: rad-engineer/test/agents/AgentFactory.test.ts
```

---

#### ITEM 1.4: ProductManagerAgent (Specialized)

```yaml
id: AGENT-SPEC-001
title: Implement ProductManager specialized agent
category: AGENTS
priority: 2

execution:
  mode: sequential
  order: 1
  dependencies: [AGENT-INFRA-001, AGENT-INFRA-002]
  blocks: [PLAN-COMP-001]
  
effort:
  hours: 5
  days: 0.625
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - ProductManagerAgent persona defined
  - PRD generation workflow implemented
  - A/P/C menu handling
  - Collaborative Q&A logic
  - Web search for market research
  - Tests passing
  
verification:
  type: test
  command: bun test src/agents/specialized/ProductManagerAgent.test.ts
  
evidence:
  - file: rad-engineer/src/agents/specialized/ProductManagerAgent.ts
  - file: rad-engineer/test/agents/specialized/ProductManagerAgent.test.ts
  - output: "Tests: 5 passed, 0 failed"
```

---

#### ITEM 1.5: TechStrategistAgent (Specialized)

```yaml
id: AGENT-SPEC-002
title: Implement TechStrategist specialized agent
category: AGENTS
priority: 2

execution:
  mode: sequential
  order: 2
  dependencies: [AGENT-INFRA-001, AGENT-INFRA-002]
  blocks: [PLAN-COMP-002]
  
effort:
  hours: 5
  days: 0.625
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - TechStrategistAgent persona defined
  - Web search integration for current tech
  - Decision template generation
  - Architecture Decision Records (ADRs)
  - Evidence sourcing with URLs/dates
  - Tests passing
  
verification:
  type: test
  command: bun test src/agents/specialized/TechStrategistAgent.test.ts
  
evidence:
  - file: rad-engineer/src/agents/specialized/TechStrategistAgent.ts
  - file: rad-engineer/test/agents/specialized/TechStrategistAgent.test.ts
  - output: "Tests: 5 passed, 0 failed"
```

---

### PHASE 2: REMAINING SPECIALIZED AGENTS (Week 1-2)

---

#### ITEM 2.1: PlanningOrchestratorAgent (Specialized)

```yaml
id: AGENT-SPEC-003
title: Implement PlanningOrchestrator specialized agent
category: AGENTS
priority: 3

execution:
  mode: sequential
  order: 1
  dependencies: [AGENT-SPEC-001, AGENT-SPEC-002]
  blocks: [PLAN-COMP-003]
  
effort:
  hours: 4
  days: 0.5
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - PlanningOrchestratorAgent persona defined
  - Phase coordination implemented
  - State tracking
  - A/P/C menu orchestration
  - Handoff between phases
  - Tests passing
  
verification:
  type: test
  command: bun test src/agents/specialized/PlanningOrchestratorAgent.test.ts
  
evidence:
  - file: rad-engineer/src/agents/specialized/PlanningOrchestratorAgent.ts
  - file: rad-engineer/test/agents/specialized/PlanningOrchestratorAgent.test.ts
  - output: "Tests: 4 passed, 0 failed"
```

---

#### ITEM 2.2: CodeReviewerAgent (Specialized)

```yaml
id: AGENT-SPEC-004
title: Implement CodeReviewer specialized agent
category: AGENTS
priority: 3

execution:
  mode: sequential
  order: 2
  dependencies: [AGENT-INFRA-001, AGENT-INFRA-002]
  blocks: [EXEC-INTEG-001]
  
effort:
  hours: 4
  days: 0.5
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - CodeReviewerAgent persona defined
  - Review criteria implemented
  - Evidence verification (typecheck, tests)
  - Security vulnerability checks
  - Standards compliance
  - Tests passing
  
verification:
  type: test
  command: bun test src/agents/specialized/CodeReviewerAgent.test.ts
  
evidence:
  - file: rad-engineer/src/agents/specialized/CodeReviewerAgent.ts
  - file: rad-engineer/test/agents/specialized/CodeReviewerAgent.test.ts
  - output: "Tests: 4 passed, 0 failed"
```

---

### PHASE 3: SKILL INTEGRATION (Week 2)

---

#### ITEM 3.1: /plan Skill Integration

```yaml
id: PLAN-INTEG-001
title: Wire specialized agents into /plan skill
category: INTEGRATION
priority: 4

execution:
  mode: parallel
  order: 1
  dependencies: [AGENT-SPEC-001, AGENT-SPEC-002, AGENT-SPEC-003, AGENT-INFRA-003]
  blocks: [PLAN-COMP-001, PLAN-COMP-002, PLAN-COMP-003]
  
effort:
  hours: 8
  days: 1.0
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - ProductManagerAgent wired for PRD phase
  - TechStrategistAgent wired for Architecture phase
  - PlanningOrchestratorAgent wired for coordination
  - A/P/C menu integration
  - Phase transitions working
  - Integration tests passing
  
verification:
  type: test
  command: bun test test/plan/plan-skill-integration.test.ts
  
evidence:
  - file: rad-engineer/.claude/skills/plan/SKILL.md (updated)
  - file: rad-engineer/src/plan/PlanOrchestrator.ts (updated)
  - file: rad-engineer/test/plan/plan-skill-integration.test.ts
  - output: "E2E: 3 scenarios passed"
```

---

#### ITEM 3.2: /execute Skill Integration

```yaml
id: EXEC-INTEG-001
title: Wire CodeReviewer into /execute skill
category: INTEGRATION
priority: 4

execution:
  mode: parallel
  order: 2
  dependencies: [AGENT-SPEC-004, AGENT-INFRA-003]
  blocks: [TEST-DET-001]
  
effort:
  hours: 5
  days: 0.625
  
status: pending
assignedTo: mid-dev

definitionOfDone:
  - CodeReviewerAgent wired for story review
  - Approval workflow implemented
  - Evidence verification (typecheck, tests)
  - Quality gate enforcement
  - Integration tests passing
  
verification:
  type: test
  command: bun test test/execute/execute-skill-integration.test.ts
  
evidence:
  - file: rad-engineer/.claude/skills/execute/SKILL.md (updated)
  - file: rad-engineer/test/execute/execute-skill-integration.test.ts
  - output: "E2E: 2 scenarios passed"
```

---

### PHASE 4: PLANNING COMPONENTS (Week 2-4)

---

#### ITEM 4.1: PRDGenerator Component

```yaml
id: PLAN-COMP-001
title: Implement PRDGenerator component
category: PLANNING
priority: 5

execution:
  mode: parallel
  order: 1
  dependencies: [AGENT-SPEC-001, PLAN-INTEG-001]
  blocks: [TEST-E2E-001]
  
effort:
  hours: 20
  days: 2.5
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - PRD types defined (from research)
  - PRD templates created
  - PRDGenerator.ts implemented
  - Step files (init, discovery, personas, requirements, scope, validation)
  - A/P/C menu handler
  - Integration with ProductManagerAgent
  - Tests passing
  - Example PRD generated
  
verification:
  type: test
  command: bun test test/plan/prd/PRDGenerator.test.ts
  
evidence:
  - file: rad-engineer/src/plan/prd/PRDGenerator.ts
  - file: rad-engineer/src/plan/prd/types.ts
  - file: rad-engineer/src/plan/prd/templates/prd-template.md
  - file: rad-engineer/test/plan/prd/PRDGenerator.test.ts
  - file: docs/planning/examples/sample-prd.md
  - output: "Tests: 10 passed, 0 failed"
```

---

#### ITEM 4.2: ArchitectureGenerator Component

```yaml
id: PLAN-COMP-002
title: Implement ArchitectureGenerator component
category: PLANNING
priority: 5

execution:
  mode: parallel
  order: 2
  dependencies: [AGENT-SPEC-002, PLAN-INTEG-001]
  blocks: [TEST-E2E-001]
  
effort:
  hours: 21
  days: 2.625
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - Architecture types defined
  - TechOption template created
  - ArchitectureDecisionRecord type
  - ArchitectureGenerator.ts implemented
  - Web search integration for current tech
  - Integration with TechStrategistAgent
  - A/P/C menu handler
  - Tests passing
  - Example ADRs generated
  
verification:
  type: test
  command: bun test test/plan/architecture/ArchitectureGenerator.test.ts
  
evidence:
  - file: rad-engineer/src/plan/architecture/ArchitectureGenerator.ts
  - file: rad-engineer/src/plan/architecture/types.ts
  - file: rad-engineer/src/plan/architecture/templates/tech-option.md
  - file: rad-engineer/test/plan/architecture/ArchitectureGenerator.test.ts
  - file: docs/planning/architecture/sample-adr.md
  - output: "Tests: 8 passed, 0 failed"
```

---

#### ITEM 4.3: ImplementationPlanGenerator Component

```yaml
id: PLAN-COMP-003
title: Implement ImplementationPlanGenerator component
category: PLANNING
priority: 5

execution:
  mode: parallel
  order: 3
  dependencies: [AGENT-SPEC-003, PLAN-INTEG-001]
  blocks: [TEST-E2E-001]
  
effort:
  hours: 26
  days: 3.25
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - Implementation plan types defined
  - GapAnalyzer implemented
  - EpicBreakdown implemented
  - MilestoneTracker implemented
  - DependencyMapper implemented
  - RiskAssessor implemented
  - ImplementationPlanGenerator.ts
  - Integration with PlanningOrchestratorAgent
  - Tests passing
  - Example implementation plan generated
  
verification:
  type: test
  command: bun test test/plan/implementation/ImplementationPlanGenerator.test.ts
  
evidence:
  - file: rad-engineer/src/plan/implementation/ImplementationPlanGenerator.ts
  - file: rad-engineer/src/plan/implementation/GapAnalyzer.ts
  - file: rad-engineer/src/plan/implementation/EpicBreakdown.ts
  - file: rad-engineer/test/plan/implementation/ImplementationPlanGenerator.test.ts
  - file: docs/planning/implementation/sample-implementation-plan.md
  - output: "Tests: 12 passed, 0 failed"
```

---

#### ITEM 4.4: DeploymentPlanGenerator Component

```yaml
id: PLAN-COMP-004
title: Implement DeploymentPlanGenerator component
category: PLANNING
priority: 6

execution:
  mode: parallel
  order: 4
  dependencies: [PLAN-COMP-002]  # Needs architecture decisions
  blocks: [TEST-E2E-001]
  
effort:
  hours: 12
  days: 1.5
  
status: pending
assignedTo: mid-dev

definitionOfDone:
  - Deployment plan types defined
  - DeploymentPlanGenerator implemented
  - DeploymentQuestioner implemented
  - CI/CD pipeline generator
  - Monitoring setup recommender
  - GitHub Actions workflow generator
  - Tests passing
  - Example deployment plan generated
  
verification:
  type: test
  command: bun test test/plan/deployment/DeploymentPlanGenerator.test.ts
  
evidence:
  - file: rad-engineer/src/plan/deployment/DeploymentPlanGenerator.ts
  - file: rad-engineer/src/plan/deployment/DeploymentQuestioner.ts
  - file: rad-engineer/src/plan/deployment/types.ts
  - file: rad-engineer/test/plan/deployment/DeploymentPlanGenerator.test.ts
  - file: .github/workflows/ci-cd.yml (generated example)
  - file: docs/planning/deployment/sample-deployment-plan.md
  - output: "Tests: 6 passed, 0 failed"
```

---

#### ITEM 4.5: DeterministicControls Component

```yaml
id: PLAN-COMP-005
title: Implement DeterministicControls component
category: PLANNING
priority: 6

execution:
  mode: parallel
  order: 5
  dependencies: []
  blocks: [TEST-E2E-001]
  
effort:
  hours: 11
  days: 1.375
  
status: pending
assignedTo: mid-dev

definitionOfDone:
  - Coding standards template created
  - DoDValidator implemented
  - CodePatternDetector implemented
  - CodingStandardsGenerator implemented
  - Tests passing
  - Example coding standards generated
  
verification:
  type: test
  command: bun test test/plan/validation/DeterministicControls.test.ts
  
evidence:
  - file: rad-engineer/src/plan/templates/CodingStandards.md
  - file: rad-engineer/src/plan/validation/DoDValidator.ts
  - file: rad-engineer/src/plan/validation/CodePatternDetector.ts
  - file: rad-engineer/src/plan/CodingStandardsGenerator.ts
  - file: test/plan/validation/DeterministicControls.test.ts
  - file: docs/CODING_STANDARDS.md (example)
  - output: "Tests: 6 passed, 0 failed"
```

---

#### ITEM 4.6: GitStrategy Component

```yaml
id: PLAN-COMP-006
title: Implement GitStrategy component
category: PLANNING
priority: 7

execution:
  mode: parallel
  order: 6
  dependencies: [PLAN-COMP-003]  # Needs implementation plan
  blocks: [TEST-E2E-001]
  
effort:
  hours: 7
  days: 0.875
  
status: pending
assignedTo: mid-dev

definitionOfDone:
  - Git strategy types defined
  - GitStrategyGenerator implemented
  - PR template generated
  - Branch protection rules documented
  - Tests passing
  - Example git strategy generated
  
verification:
  type: test
  command: bun test test/plan/git/GitStrategyGenerator.test.ts
  
evidence:
  - file: rad-engineer/src/plan/GitStrategyGenerator.ts
  - file: rad-engineer/src/plan/git/types.ts
  - file: .github/pull_request_template.md (generated)
  - file: test/plan/git/GitStrategyGenerator.test.ts
  - file: docs/planning/git/sample-git-strategy.md
  - output: "Tests: 4 passed, 0 failed"
```

---

### PHASE 5: TESTING (Week 4-5)

---

#### ITEM 5.1: Determinism Tests

```yaml
id: TEST-DET-001
title: Implement determinism, repeatability, reproducibility tests
category: TESTING
priority: 8

execution:
  mode: sequential
  order: 1
  dependencies: [PLAN-INTEG-001, EXEC-INTEG-001]
  blocks: [TEST-E2E-001]
  
effort:
  hours: 5
  days: 0.625
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - Determinism test: same input → same output
  - Repeatability test: same quality across sessions
  - Reproducibility test: traceable evidence
  - All specialized agents tested
  - 100% pass rate
  
verification:
  type: test
  command: bun test test/agents/determinism.test.ts
  
evidence:
  - file: rad-engineer/test/agents/determinism.test.ts
  - output: "Determinism: 100% - Same input produces same output"
  - output: "Repeatability: <10% variance across sessions"
  - output: "Reproducibility: 100% decisions have traceable evidence"
```

---

#### ITEM 5.2: End-to-End Tests

```yaml
id: TEST-E2E-001
title: Implement end-to-end workflow tests
category: TESTING
priority: 8

execution:
  mode: sequential
  order: 2
  dependencies: [PLAN-COMP-001, PLAN-COMP-002, PLAN-COMP-003, PLAN-COMP-004, PLAN-COMP-005, PLAN-COMP-006, TEST-DET-001]
  blocks: [DOC-001]
  
effort:
  hours: 5
  days: 0.625
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - Simple project test (greenfield)
  - Complex project test (brownfield)
  - Edge case with on-demand agent
  - Full planning workflow test
  - Full execution workflow test
  - 100% pass rate
  
verification:
  type: test
  command: bun test test/e2e/full-workflow.test.ts
  
evidence:
  - file: rad-engineer/test/e2e/full-workflow.test.ts
  - output: "Simple project: PASSED"
  - output: "Complex project: PASSED"
  - output: "Edge case: PASSED"
  - output: "Full workflow: PASSED"
```

---

### PHASE 6: DOCUMENTATION (Week 5)

---

#### ITEM 6.1: Documentation

```yaml
id: DOC-001
title: Update documentation and examples
category: DOCUMENTATION
priority: 9

execution:
  mode: parallel
  order: 1
  dependencies: [TEST-E2E-001]
  blocks: []
  
effort:
  hours: 8
  days: 1.0
  
status: pending
assignedTo: junior-dev

definitionOfDone:
  - CLAUDE.md updated with specialized agents
  - README updated with new workflow
  - Examples created for each component
  - Architecture diagrams updated
  - API documentation complete
  
verification:
  type: manual
  command: echo "Review documentation for completeness"
  
evidence:
  - file: CLAUDE.md (updated)
  - file: README.md (updated)
  - file: docs/architecture/specialized-agents.md
  - file: docs/examples/prd-example.md
  - file: docs/examples/architecture-example.md
  - file: docs/examples/implementation-plan-example.md
```

---

## EXECUTABLE ORDERING (ALGORITHM)

```typescript
// Execution algorithm - no ambiguity
function executePlan(items: PlanningItem[]): void {
  // 1. Sort by priority, then order
  const sorted = items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.execution.order - b.execution.order;
  });
  
  // 2. Group by execution mode
  const barriers = sorted.filter(item => item.execution.mode === 'barrier');
  const parallels = sorted.filter(item => item.execution.mode === 'parallel');
  const sequentials = sorted.filter(item => item.execution.mode === 'sequential');
  
  // 3. Execute in order
  for (const barrier of barriers) {
    executeBarrier(barrier, parallels, sequentials);
  }
}

function executeBarrier(
  barrier: PlanningItem,
  parallels: PlanningItem[],
  sequentials: PlanningItem[]
): void {
  // Execute all items at this barrier level
  const readyItems = getReadyItems(barrier, parallels, sequentials);
  
  // Parallel items can execute simultaneously
  const parallelItems = readyItems.filter(i => i.execution.mode === 'parallel');
  await Promise.all(parallelItems.map(executeItem));
  
  // Sequential items execute in order
  const sequentialItems = readyItems.filter(i => i.execution.mode === 'sequential');
  for (const item of sequentialItems) {
    await executeItem(item);
  }
}
```

---

## CURRENT EXECUTION POINTER

```yaml
nextItem: AGENT-INFRA-001
currentPhase: PHASE_1_FOUNDATION
progress: 0/31 items (0%)
startedAt: null
estimatedCompletion: null
```

---

## EXECUTION AGENTS: CURRENT STATE & GAPS

### Question: Do we have agents for execution, CI/CD, or deployment?

**Answer**: PARTIALLY

---

### Existing Execution Infrastructure

| Component | Exists | Type | Purpose |
|-----------|--------|------|---------|
| **WaveOrchestrator** | ✅ Yes | Core | Execute tasks in waves with resource management |
| **StateManager** | ✅ Yes | Core | Track execution state across sessions |
| **ErrorRecoveryEngine** | ✅ Yes | Core | Handle failures and retries |
| **ResourceManager** | ✅ Yes | Core | Enforce max 2-3 concurrent agents |
| **CodeReviewerAgent** | 🔄 Planned | Specialized | Review code before merge |
| **/execute skill** | ✅ Yes | Workflow | Consume GRANULAR_EXECUTION_PLAN.md |

---

### Execution Agents: What We Have

**Currently Implemented**:
- WaveOrchestrator: Executes tasks in waves, respects dependencies
- StateManager: Tracks progress, checkpoints, recovery
- ErrorRecoveryEngine: 3 retry attempts, fallback strategies

**What They Do**:
```
WaveExecution:
  For each wave in GRANULAR_EXECUTION_PLAN.md:
    1. Parse dependency layers
    2. Spawn 2-3 developer agents (Task tool)
    3. Each agent follows TDD: Red → Green → Refactor
    4. Run quality gates (typecheck, lint, test)
    5. Update PROGRESS.md and tasks.json
    6. Create checkpoint in memory-keeper
```

**Agents Spawned During Execution**:
- Developer agents (on-demand, via Task tool)
- Test writer agents (on-demand, via Task tool)
- Code reviewer agents (on-demand, via Task tool)
- Debugger agents (on-demand, via Task tool)

---

### Execution Agents: What's Missing

#### 1. CI/CD Agent (MISSING)

**Purpose**: Automate CI/CD pipeline execution, monitor builds, handle failures

**Responsibilities**:
- Trigger CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
- Monitor pipeline execution
- Handle build failures
- Rollback on deployment failure
- Notify on pipeline status

**Should it be Specialized?** **YES**
- **Rationale**: CI/CD requires consistent monitoring, failure handling, and rollback procedures
- **Persona**: DevOps Engineer, reliable, methodical
- **Determinism**: Same CI/CD process every time

**File**: `rad-engineer/src/agents/specialized/CICDAgent.ts`

```typescript
export const CICDAgent: SpecializedAgent = {
  id: 'cicd-agent',
  name: 'CI/CD Orchestrator',
  model: 'sonnet',
  persona: {
    role: 'DevOps Engineer',
    tone: 'Reliable, methodical, monitoring-focused',
    expertise: [
      'CI/CD pipelines',
      'Build automation',
      'Deployment monitoring',
      'Rollback procedures',
      'Infrastructure as Code'
    ]
  }
};
```

---

#### 2. DeploymentAgent (MISSING)

**Purpose**: Execute deployment plans, monitor deployments, handle rollbacks

**Responsibilities**:
- Execute deployment strategy
- Monitor deployment health
- Handle deployment failures
- Trigger rollback if needed
- Update deployment records

**Should it be Specialized?** **YES**
- **Rationale**: Deployment is critical, requires consistent process
- **Persona**: Deployment Engineer, careful, detail-oriented
- **Determinism**: Same deployment process, same safety checks

**File**: `rad-engineer/src/agents/specialized/DeploymentAgent.ts`

```typescript
export const DeploymentAgent: SpecializedAgent = {
  id: 'deployment-agent',
  name: 'Deployment Engineer',
  model: 'sonnet',
  persona: {
    role: 'Deployment Engineer',
    tone: 'Careful, methodical, safety-focused',
    expertise: [
      'Deployment strategies',
      'Health monitoring',
      'Rollback procedures',
      'Blue-green deployments',
      'Canary deployments'
    ]
  }
};
```

---

#### 3. MonitoringAgent (MISSING)

**Purpose**: Monitor system health, alert on issues, analyze metrics

**Responsibilities**:
- Monitor system metrics (CPU, memory, latency)
- Alert on threshold breaches
- Analyze logs for errors
- Generate incident reports
- Recommend scaling actions

**Should it be Specialized?** **YES** (for production systems)
- **Rationale**: Monitoring requires consistent analysis and alerting
- **Persona**: SRE (Site Reliability Engineer), vigilant, analytical
- **Determinism**: Same alerting thresholds, same analysis process

**File**: `rad-engineer/src/agents/specialized/MonitoringAgent.ts`

```typescript
export const MonitoringAgent: SpecializedAgent = {
  id: 'monitoring-agent',
  name: 'Site Reliability Engineer',
  model: 'sonnet',
  persona: {
    role: 'Site Reliability Engineer',
    tone: 'Vigilant, analytical, proactive',
    expertise: [
      'System monitoring',
      'Alert management',
      'Incident response',
      'Performance analysis',
      'Capacity planning'
    ]
  }
};
```

---

### Updated Specialized Agents List (7 Total)

| Agent | Phase | Status | Priority |
|-------|-------|--------|----------|
| **ProductManager** | Planning | Planned | 1 |
| **TechStrategist** | Planning | Planned | 1 |
| **PlanningOrchestrator** | Planning | Planned | 1 |
| **CodeReviewer** | Execution | Planned | 1 |
| **CICDAgent** | CI/CD | **NEW** | 2 |
| **DeploymentAgent** | Deployment | **NEW** | 2 |
| **MonitoringAgent** | Operations | **NEW** | 3 |

---

### Additional Effort for New Agents

| Agent | Effort | Priority |
|-------|--------|----------|
| CICDAgent | 4-5h | 2 (Phase 2) |
| DeploymentAgent | 4-5h | 2 (Phase 2) |
| MonitoringAgent | 3-4h | 3 (Phase 3) |

**Additional Total**: 11-14 hours (**1-2 days**)

---

### Updated Grand Total Effort

| Component | Effort |
|-----------|--------|
| Core Planning Components | 67-90h |
| Agent Coordinators | 14-19h |
| **Original Specialized Agents (4)** | 39-48h |
| **New Agents (CI/CD, Deployment, Monitoring)** | **11-14h** |
| **TOTAL** | **131-171h (16-21 days)** |

---

## FINAL ANSWER: EXECUTION AGENTS

**Q: Do we have agents for execution, CI/CD, or deployment?**

**A**: 
- ✅ **Execution**: YES (WaveOrchestrator + on-demand developer agents)
- ❌ **CI/CD**: NO (need CICDAgent)
- ❌ **Deployment**: NO (need DeploymentAgent)
- ❌ **Monitoring**: NO (need MonitoringAgent - for production)

**Recommendation**: Add 3 new specialized agents (CICDAgent, DeploymentAgent, MonitoringAgent) for complete platform coverage.

---


---

## AGENT ADOPTION PLAN: USE EXISTING `.claude/agents/` AS SPECIALIZED AGENTS

**Created**: 2026-01-06
**Purpose**: Adopt existing agent definitions as specialized agents for determinism
**Rationale**: "If we don't create specialized agents we know we'll use again and again, we can't improve them to be deterministic and logical over-time"

---

## Discovery: Existing Agents in `.claude/agents/`

**Total Found**: 12 well-defined agents

### Planning Side (3 agents)

| Agent | File | Purpose | Model | Can Replace? |
|-------|------|---------|-------|--------------|
| **planner** | planner.md | PRD, architecture, epic/story breakdown | opus | ✅ ProductManagerAgent + PlanningOrchestratorAgent |
| **architect** | architect.md | System design, tech selection, scalability | opus | ✅ TechStrategistAgent |
| **research-agent** | research-agent.md | Research complex stories (5+ pts) | sonnet | ✅ ResearchAgent (already exists) |

### Execution Side (4 agents)

| Agent | File | Purpose | Model | Can Replace? |
|-------|------|---------|-------|--------------|
| **developer** | developer.md | TDD-focused implementation | sonnet | ✅ DeveloperAgent (execution) |
| **test-writer** | test-writer.md | QA engineer, test coverage | sonnet | ✅ TestWriterAgent (execution) |
| **debugger** | debugger.md | Bug investigation, root cause | sonnet | ✅ DebuggerAgent (execution) |
| **code-reviewer** | code-reviewer.md | Security, quality, best practices | sonnet | ✅ CodeReviewerAgent (already planned) |

### PR/CI/CD Side (3 agents)

| Agent | File | Purpose | Model | Can Replace? |
|-------|------|---------|-------|--------------|
| **pr-reviewer** | pr-reviewer.md | Secondary PR review, architectural fit | sonnet | ✅ PRReviewerAgent (NEW) |
| **pr-tester** | pr-tester.md | Verify PR in fresh E2B sandbox | sonnet | ✅ PRTesterAgent (NEW) |
| **pr-fixer** | pr-fixer.md | Fix PR review issues | sonnet | ✅ PRFixerAgent (NEW) |

### Other (2 agents)

| Agent | File | Purpose | Model |
|-------|------|---------|-------|
| **e2b-implementer** | e2b-implementer.md | E2B sandbox implementation | - |
| **base-instructions** | base-instructions.md | Injected into all agents | - |

---

## Adoption Strategy

### Phase 1: Create Agent Loader (New Component)

**Purpose**: Convert `.claude/agents/*.md` files to SpecializedAgent interface

**File**: `rad-engineer/src/agents/AgentLoader.ts`

```typescript
/**
 * Load specialized agents from .claude/agents/*.md files
 * 
 * This keeps agent definitions in markdown (human-editable)
 * while providing TypeScript interface for runtime use.
 */
export class AgentLoader {
  /**
   * Load all agents from .claude/agents/
   */
  async loadAgents(): Promise<Map<string, SpecializedAgent>> {
    const agentsDir = '.claude/agents/';
    const files = await glob('*.md', { cwd: agentsDir });
    
    const agents = new Map<string, SpecializedAgent>();
    
    for (const file of files) {
      const content = await readFile(`${agentsDir}/${file}`, 'utf-8');
      const agent = this.parseAgentFile(content, file);
      agents.set(agent.id, agent);
    }
    
    return agents;
  }
  
  /**
   * Parse YAML frontmatter + markdown content
   */
  private parseAgentFile(content: string, filename: string): SpecializedAgent {
    // Parse YAML frontmatter (name, description, tools, model)
    const frontmatter = this.extractFrontmatter(content);
    const body = this.extractBody(content);
    
    return {
      id: frontmatter.name,
      name: this.formatName(frontmatter.name),
      model: frontmatter.model,
      persona: {
        role: this.extractRole(body),
        tone: this.extractTone(body),
        expertise: this.extractExpertise(body),
        behaviors: this.extractBehaviors(body),
        constraints: this.extractConstraints(body),
      },
      capabilities: this.extractCapabilities(body),
      tools: frontmatter.tools,
      temperature: this.determineTemperature(frontmatter.model),
      systemPrompt: this.buildSystemPrompt(frontmatter, body),
      sourceFile: filename,
      sourcePath: `.claude/agents/${filename}`,
    };
  }
}
```

---

### Phase 2: Map Existing Agents to Specialized Agent Interface

| Existing Agent | Maps To | Changes Needed |
|----------------|---------|----------------|
| `.claude/agents/planner.md` | ProductManagerAgent | Enhance with A/P/C menu handling |
| `.claude/agents/architect.md` | TechStrategistAgent | Add web search for current tech |
| `.claude/agents/developer.md` | DeveloperAgent | Already perfect |
| `.claude/agents/test-writer.md` | TestWriterAgent | Already perfect |
| `.claude/agents/debugger.md` | DebuggerAgent | Already perfect |
| `.claude/agents/code-reviewer.md` | CodeReviewerAgent | Already perfect |
| `.claude/agents/research-agent.md` | ResearchAgent | Already perfect |
| `.claude/agents/pr-reviewer.md` | PRReviewerAgent | Adopt as-is |
| `.claude/agents/pr-tester.md` | PRTesterAgent | Adopt as-is |
| `.claude/agents/pr-fixer.md` | PRFixerAgent | Adopt as-is |

---

### Phase 3: Identify Gaps (Still Need to Create)

| Agent | Purpose | Priority | Effort |
|-------|---------|----------|--------|
| **CICDAgent** | Pipeline monitoring, rollback | HIGH | 4-5h |
| **DeploymentAgent** | Safe deployment execution | HIGH | 4-5h |
| **MonitoringAgent** | System health, alerts | MEDIUM | 3-4h |

---

## Updated Specialized Agents List (12 Total)

### Planning (3 agents)

| ID | Name | Source | Status |
|----|------|--------|--------|
| PLANNER-001 | ProductManager | `.claude/agents/planner.md` | ✅ Adopt |
| ARCH-001 | TechStrategist | `.claude/agents/architect.md` | ✅ Adopt |
| RESEARCH-001 | ResearchAgent | `.claude/agents/research-agent.md` | ✅ Adopt |

### Execution (4 agents)

| ID | Name | Source | Status |
|----|------|--------|--------|
| EXEC-001 | Developer | `.claude/agents/developer.md` | ✅ Adopt |
| EXEC-002 | TestWriter | `.claude/agents/test-writer.md` | ✅ Adopt |
| EXEC-003 | Debugger | `.claude/agents/debugger.md` | ✅ Adopt |
| EXEC-004 | CodeReviewer | `.claude/agents/code-reviewer.md` | ✅ Adopt |

### PR/CI/CD (3 agents)

| ID | Name | Source | Status |
|----|------|--------|--------|
| PR-001 | PRReviewer | `.claude/agents/pr-reviewer.md` | ✅ Adopt |
| PR-002 | PRTester | `.claude/agents/pr-tester.md` | ✅ Adopt |
| PR-003 | PRFixer | `.claude/agents/pr-fixer.md` | ✅ Adopt |

### Operations (2 agents - NEW)

| ID | Name | Source | Status |
|----|------|--------|--------|
| OPS-001 | CICDAgent | **NEW** | ⚠️ Create |
| OPS-002 | DeploymentAgent | **NEW** | ⚠️ Create |
| OPS-003 | MonitoringAgent | **NEW** | ⚠️ Create |

---

## Implementation Tasks: Agent Adoption

### ITEM ADOPT-001: Create AgentLoader

```yaml
id: AGENT-A DOPT-001
title: Create AgentLoader to convert .md to SpecializedAgent interface
category: AGENTS
priority: 1

execution:
  mode: parallel
  order: 1
  dependencies: []
  blocks: [AGENT-A DOPT-002, AGENT-A DOPT-003]
  
effort:
  hours: 4
  days: 0.5
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - AgentLoader class with loadAgents() method
  - Parse YAML frontmatter (name, description, tools, model)
  - Parse markdown body (persona, expertise, behaviors)
  - Build systemPrompt from frontmatter + body
  - Load all 12 existing agents successfully
  - Tests passing
  
verification:
  type: test
  command: bun test src/agents/AgentLoader.test.ts
  
evidence:
  - file: rad-engineer/src/agents/AgentLoader.ts
  - file: rad-engineer/test/agents/AgentLoader.test.ts
  - output: "Loaded 12 agents from .claude/agents/"
```

---

### ITEM ADOPT-002: Enhance planner.md for PRD Generation

```yaml
id: AGENT-A DOPT-002
title: Enhance .claude/agents/planner.md with A/P/C menu workflow
category: AGENTS
priority: 2

execution:
  mode: parallel
  order: 2
  dependencies: [AGENT-A DOPT-001]
  blocks: [PLAN-INTEG-001]
  
effort:
  hours: 3
  days: 0.375
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - Add A/P/C menu instructions to planner.md
  - Add step-by-step PRD workflow
  - Add user collaboration patterns
  - Add MoSCoW prioritization
  - Test: Load via AgentLoader, verify metadata
  
verification:
  type: test
  command: bun test test/agents/planner-agent.test.ts
  
evidence:
  - file: .claude/agents/planner.md (updated)
  - file: test/agents/planner-agent.test.ts
  - output: "Planner agent loaded with A/P/C support"
```

---

### ITEM ADOPT-003: Enhance architect.md for Current Tech Research

```yaml
id: AGENT-A DOPT-003
title: Enhance .claude/agents/architect.md with web search for current tech
category: AGENTS
priority: 2

execution:
  mode: parallel
  order: 3
  dependencies: [AGENT-A DOPT-001]
  blocks: [PLAN-INTEG-001]
  
effort:
  hours: 2
  days: 0.25
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - Add mandatory web search for current tech versions
  - Add decision template format
  - Add evidence sourcing requirements (URL, date)
  - Add 2-3 options presentation pattern
  - Test: Load via AgentLoader, verify metadata
  
verification:
  type: test
  command: bun test test/agents/architect-agent.test.ts
  
evidence:
  - file: .claude/agents/architect.md (updated)
  - file: test/agents/architect-agent.test.ts
  - output: "Architect agent includes web search mandate"
```

---

### ITEM ADOPT-004: Create Remaining 3 Operations Agents

```yaml
id: AGENT-A DOPT-004
title: Create CICDAgent, DeploymentAgent, MonitoringAgent
category: AGENTS
priority: 3

execution:
  mode: parallel
  order: 4
  dependencies: [AGENT-A DOPT-001]
  blocks: [EXEC-INTEG-002]
  
effort:
  hours: 12
  days: 1.5
  
status: pending
assignedTo: mid-dev

definitionOfDone:
  - .claude/agents/cicd-agent.md created
  - .claude/agents/deployment-agent.md created
  - .claude/agents/monitoring-agent.md created
  - Follow same format as existing agents
  - Load via AgentLoader
  - Tests passing
  
verification:
  type: test
  command: bun test test/agents/operations-agents.test.ts
  
evidence:
  - file: .claude/agents/cicd-agent.md
  - file: .claude/agents/deployment-agent.md
  - file: .claude/agents/monitoring-agent.md
  - file: test/agents/operations-agents.test.ts
  - output: "3 new agents created and loaded"
```

---

### ITEM ADOPT-005: Wire Specialized Agents into Skills

```yaml
id: AGENT-A DOPT-005
title: Wire specialized agents into /plan and /execute skills
category: INTEGRATION
priority: 4

execution:
  mode: parallel
  order: 5
  dependencies: [AGENT-A DOPT-001, AGENT-A DOPT-002, AGENT-A DOPT-003, AGENT-A DOPT-004]
  blocks: [TEST-E2E-001]
  
effort:
  hours: 6
  days: 0.75
  
status: pending
assignedTo: senior-dev

definitionOfDone:
  - /plan skill uses planner agent for PRD
  - /plan skill uses architect agent for Architecture
  - /execute skill uses developer agent for stories
  - /execute skill uses test-writer agent for tests
  - /execute skill uses code-reviewer agent for review
  - PR workflow uses pr-reviewer, pr-tester, pr-fixer
  - Integration tests passing
  
verification:
  type: test
  command: bun test test/integration/specialized-agents-integration.test.ts
  
evidence:
  - file: .claude/skills/plan/SKILL.md (updated)
  - file: .claude/skills/execute/SKILL.md (updated)
  - file: test/integration/specialized-agents-integration.test.ts
  - output: "All specialized agents wired correctly"
```

---

## Updated Effort Estimate (With Agent Adoption)

### Before Adoption (Original Plan)

| Component | Effort |
|-----------|--------|
| Create 7 specialized agents from scratch | 39-48h |
| Total | 39-48h |

### After Adoption (Using Existing Agents)

| Component | Effort | Savings |
|-----------|--------|---------|
| AgentLoader (NEW) | 4h | - |
| Enhance 2 existing agents (planner, architect) | 5h | - |
| Create 3 NEW agents (CI/CD, Deploy, Monitor) | 12h | - |
| Wire agents into skills | 6h | - |
| **Total** | **27h** | **-12 to -21h (25-44% savings)** |

---

## Final Specialized Agents List (15 Total)

### Planning Phase (3)

| ID | Name | Source | Purpose |
|----|------|--------|---------|
| PLANNER-001 | ProductManager | `.claude/agents/planner.md` | PRD, requirements, collaboration |
| ARCH-001 | TechStrategist | `.claude/agents/architect.md` | Architecture, tech selection, ADRs |
| RESEARCH-001 | ResearchAgent | `.claude/agents/research-agent.md` | Research complex stories |

### Execution Phase (4)

| ID | Name | Source | Purpose |
|----|------|--------|---------|
| EXEC-001 | Developer | `.claude/agents/developer.md` | TDD implementation |
| EXEC-002 | TestWriter | `.claude/agents/test-writer.md` | Test coverage |
| EXEC-003 | Debugger | `.claude/agents/debugger.md` | Bug investigation |
| EXEC-004 | CodeReviewer | `.claude/agents/code-reviewer.md` | Code quality, security |

### PR/CI/CD Phase (3)

| ID | Name | Source | Purpose |
|----|------|--------|---------|
| PR-001 | PRReviewer | `.claude/agents/pr-reviewer.md` | Secondary PR review |
| PR-002 | PRTester | `.claude/agents/pr-tester.md` | Verify in fresh E2B |
| PR-003 | PRFixer | `.claude/agents/pr-fixer.md` | Fix review issues |

### Operations Phase (3 - NEW)

| ID | Name | Source | Purpose |
|----|------|--------|---------|
| OPS-001 | CICDAgent | **NEW** | Pipeline monitoring, rollback |
| OPS-002 | DeploymentAgent | **NEW** | Safe deployment execution |
| OPS-003 | MonitoringAgent | **NEW** | System health, alerts |

### Planning Orchestration (2)

| ID | Name | Source | Purpose |
|----|------|--------|---------|
| ORCH-001 | PlanningOrchestrator | **NEW** | Coordinate planning phases |
| ORCH-002 | ExecutionOrchestrator | WaveOrchestrator (existing) | Coordinate execution waves |

---

## Grand Total Effort (FINAL - With Agent Adoption)

| Component | Effort |
|-----------|--------|
| Core Planning Components (PRD, Architecture, Implementation, Deployment) | 67-90h |
| Agent Coordinators (Research waves) | 14-19h |
| **Specialized Agents (with adoption)** | **27h** (was 39-48h) |
| **TOTAL** | **108-136h (13-17 days)** |

**Savings**: 12-21 hours (25-44% reduction) by adopting existing agents

---

## Agent Maintenance Philosophy

### Source of Truth

**Agent Definitions**: `.claude/agents/*.md` (human-editable markdown)
**Runtime Interface**: `SpecializedAgent` TypeScript interface (loaded by AgentLoader)

**Why This Approach?**

1. **Human-Editable**: Agents can be updated in markdown (no recompilation)
2. **Version Control**: Changes tracked in git
3. **Separation of Concerns**: Definitions separate from runtime
4. **Improvement Over Time**: Same agents used repeatedly → can be refined for determinism
5. **Proven Patterns**: Build on existing well-designed agents

### Continuous Improvement Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  AGENT IMPROVEMENT CYCLE (Determinism Over Time)              │
└─────────────────────────────────────────────────────────────────┘

1. Use agent in production
   ↓
2. Collect feedback (where it failed, where it succeeded)
   ↓
3. Update .claude/agents/xxx.md (refine persona, add constraints)
   ↓
4. Test improved agent
   ↓
5. Deploy improved version
   ↓
6. Repeat (continuous improvement)
```

### Agent Metrics to Track

For each specialized agent, track:

```yaml
agentMetrics:
  agentId: PLANNER-001
  name: ProductManager
  
  usage:
    totalInvocations: 127
    successRate: 94.5%
    averageDuration: 8.3min
    
  quality:
    deterministicScore: 0.92  # Same input → same output
    repeatabilityScore: 0.89   # Consistent quality
    userSatisfaction: 4.6/5    # User feedback
    
  improvements:
    lastUpdated: "2026-01-06"
    version: 3
    changeLog:
      - version: 3
        date: "2026-01-05"
        change: "Added A/P/C menu workflow"
        impact: "+15% user approval rate"
      - version: 2
        date: "2025-12-20"
        change: "Enhanced MoSCoW prioritization"
        impact: "+10% requirement clarity"
```

---

## Summary

### Existing Agents We're Adopting (9)

✅ **planner.md** → ProductManagerAgent (PRD, requirements)
✅ **architect.md** → TechStrategistAgent (architecture, tech selection)
✅ **research-agent.md** → ResearchAgent (complex stories)
✅ **developer.md** → DeveloperAgent (TDD implementation)
✅ **test-writer.md** → TestWriterAgent (test coverage)
✅ **debugger.md** → DebuggerAgent (bug investigation)
✅ **code-reviewer.md** → CodeReviewerAgent (code quality)
✅ **pr-reviewer.md** → PRReviewerAgent (PR review)
✅ **pr-tester.md** → PRTesterAgent (fresh E2B verification)
✅ **pr-fixer.md** → PRFixerAgent (fix PR issues)

### New Agents We're Creating (3)

⚠️ **cicd-agent.md** → CICDAgent (pipeline monitoring)
⚠️ **deployment-agent.md** → DeploymentAgent (safe deployment)
⚠️ **monitoring-agent.md** → MonitoringAgent (system health)

### Total Specialized Agents: 12 (9 adopted + 3 new + orchestrators)

**Effort Saved**: 12-21 hours by adopting existing agents
**Total Effort**: 108-136 hours (13-17 days) for complete platform

---

## Q4 Research: Critical Reasoning + PRD Business Outcomes Injection

**Research Date**: 2026-01-06
**Research Question**: How far would injecting advanced elicitation and PRD business outcomes help make the platform deterministic, self-learning, and self-improving?

**User's Profound Insight**:
> "Advanced elicitation and documenting everything in PRD, including business outcomes, etc., and injecting that into Q&A process, thinking process, critical reasoning process and decision making process across every activity in the platform might be the best idea we've come up with so far - this is the only reason why we're calling this platform deterministic, self-learning, self-improving."

---

### Why This Matters: The Core Mechanism for Determinism

**The Problem**: Without structured critical reasoning, agents make decisions based on:
- **Convenience**: "What's easiest to implement?"
- **Pattern matching**: "What have I seen before?"
- **Context window**: "What's most recent in my memory?"

**The Solution**: Inject "critical reasoning from outcomes based on evidence" into **EVERY ACTIVITY**:

1. **Q&A Process**: Ask questions that reveal true business outcomes
2. **Thinking Process**: Apply reasoning methods before making decisions
3. **Critical Reasoning Process**: Challenge assumptions systematically
4. **Decision-Making Process**: Choose based on evidence, not convenience

**This is the ONLY mechanism that makes the platform truly**:
- **Deterministic**: Same input + same reasoning method = same decision
- **Self-learning**: Track outcomes → refine reasoning methods
- **Self-improving**: Learn which reasoning methods work best for which contexts

---

### How Far Would This Help? (Evidence-Based Analysis)

#### BMAD's 50 Elicitation Methods = Critical Thinking Framework

**Source**: `/Users/umasankr/Projects/rad-engineer-v2/bmad-research/src/core/workflows/advanced-elicitation/methods.csv`

**Key Methods** (10 categories):

| Category | Methods | Purpose |
|----------|---------|---------|
| **Core** | First Principles, 5 Whys, Socratic Questioning | Strip assumptions, find root causes |
| **Advanced** | Tree of Thoughts, Self-Consistency, Chain of Thought | Explore multiple reasoning paths |
| **Risk** | Pre-mortem Analysis, Failure Mode Analysis | Imagine failure → prevent it |
| **Competitive** | Red Team vs Blue Team, Devil's Advocate | Attack your own ideas |
| **Research** | Comparative Analysis Matrix, Thesis Defense | Evidence-based evaluation |

**Example**: First Principles Analysis

```
Input: "We should use PostgreSQL for the database"

Without First Principles:
→ "OK, I'll use PostgreSQL" (convenience-based)

With First Principles:
1. Strip assumptions: "What are fundamental truths about our data needs?"
2. Rebuild from truths: "We need ACID transactions + JSON storage + horizontal scaling"
3. New approach: "Consider CockroachDB (distributed SQL) instead of PostgreSQL"
```

#### PRD Business Outcomes = Decision Context for EVERY Activity

**When PRD includes business outcomes**:

```yaml
businessOutcomes:
  primary: "Increase user retention by 30% in 6 months"
  secondary:
    - "Reduce support tickets by 50%"
    - "Enable self-service onboarding"
  kpis:
    - metric: "DAU/MAU ratio"
      current: 0.15
      target: 0.25
      measurement: "Amplitude analytics"
```

**Then EVERY activity can reference outcomes**:

```typescript
// Agent: Should I add pagination to this API?

Decision Framework:
1. OUTCOME: Does this affect user retention?
   → Yes: Slow APIs cause churn
2. EVIDENCE: What does data say?
   → Analytics show 40% drop-off at 100+ items
3. REASONING: Apply First Principles
   → Fundamental truth: Users need fast access to all data
   → Conclusion: Pagination with infinite scroll (best UX)
4. DECISION: Implement pagination with infinite scroll

WITHOUT business outcomes:
→ "Pagination is best practice, I'll add it" (pattern matching, not outcome-based)
```

---

### How Much Already Exists? (Evidence-Based Codebase Analysis)

#### ✅ EXISTS: PerformanceStore with EWC Learning

**File**: `rad-engineer/src/adaptive/PerformanceStore.ts` (334 lines)

**What It Does**:
- Tracks provider/model performance with Beta distributions
- Applies Elastic Weight Consolidation (EWC) to prevent catastrophic forgetting
- Learns optimal routing over time

**Scope**: Provider routing ONLY (not general decision making)

```typescript
export class PerformanceStore {
  updateStats(
    provider: string,
    model: string,
    domain: Domain,
    complexityScore: number,
    success: boolean,
    cost: number,
    quality: number,
    latency: number
  ): PerformanceStore {
    // Update Beta distribution (success/failure tracking)
    // Update exponential moving averages (cost, latency, quality)
    // Create new version with EWC applied
  }
}
```

**Verdict**: Foundation exists, but needs generalization to all decisions.

---

#### ✅ EXISTS: Evidence-Based Outcome Reasoning Rule

**File**: `/Users/umasankr/Projects/rad-engineer-v2/CLAUDE.md` (79 new lines added 2026-01-06)

**What It Does**:
- Mandates "ALWAYS OPTIMIZE FOR OUTCOMES BASED ON EVIDENCE, NEVER CONVENIENCE"
- Provides 4-step decision framework:
  1. START WITH OUTCOMES
  2. GATHER EVIDENCE
  3. CRITICALLY REASON
  4. CHOOSE BEST PATH

**Scope**: Orchestrator-level guidance (not enforced in agents)

**Verdict**: Principle documented, but no enforcement mechanism.

---

#### ✅ EXISTS: Advanced Elicitation Planned (Not Implemented)

**File**: `PLAN_EXECUTE_CURRENT_STATE.md` (lines 1289-3425)

**What's Planned**:
- `ElicitationAgentCoordinator` (4-5 hours effort)
- A/P/C menu pattern (Advanced Elicitation / Party Mode / Continue)
- 50 elicitation methods from BMAD

**Scope**: Optional refinement when user selects "A" at specific checkpoints

**Verdict**: Planned but NOT implemented, and NOT injected into every activity.

---

#### ❌ MISSING: CriticalReasoningEngine

**What We Need**:
```typescript
interface CriticalReasoningEngine {
  // Apply elicitation method to any decision
  applyReasoningMethod(
    decision: Decision,
    method: ElicitationMethod,
    context: Context
  ): ReasonedDecision;

  // Select best reasoning method for context
  selectMethod(context: Context): ElicitationMethod;

  // Track decision outcomes for learning
  trackOutcome(decision: Decision, outcome: Outcome): void;
}
```

**Current State**: DOES NOT EXIST

---

#### ❌ MISSING: PRDBusinessOutcomes Injection System

**What We Need**:
```typescript
interface PRDBusinessOutcomes {
  // Extract business outcomes from PRD
  extractOutcomes(prd: PRD): BusinessOutcome[];

  // Inject outcomes into agent prompts
  injectIntoPrompt(prompt: string, outcomes: BusinessOutcome[]): string;

  // Validate decisions against outcomes
  validateDecision(decision: Decision, outcomes: BusinessOutcome[]): Validation;
}
```

**Current State**: DOES NOT EXIST

---

#### ❌ MISSING: DecisionTracker with Evidence Sources

**What We Need**:
```typescript
interface DecisionTracker {
  // Log every decision with full context
  logDecision(decision: {
    what: string;
    why: string;  // Outcome-based reasoning
    how: ElicitationMethod;
    evidence: Evidence[];
    alternativesConsidered: Alternative[];
    timestamp: ISO8601;
  }): DecisionID;

  // Retrieve decision for analysis
  getDecision(id: DecisionID): Decision;

  // Analyze outcomes to improve reasoning
  analyzeOutcomes(): DecisionPattern[];
}
```

**Current State**: DOES NOT EXIST

---

### What Else Must Be Built? (Gap Analysis)

#### Gap 1: No Critical Reasoning Infrastructure

**Impact**: Agents make decisions based on convenience, not outcomes

**Solution**: Build `CriticalReasoningEngine`

**Effort**: 8-12 hours

**Tasks**:
1. Create `rad-engineer/src/reasoning/CriticalReasoningEngine.ts`
2. Implement 5-10 core elicitation methods (First Principles, 5 Whys, Socratic Questioning, etc.)
3. Add method selection logic (context → best method)
4. Integrate with all agent coordinators

---

#### Gap 2: No Business Outcome Tracking

**Impact**: Decisions aren't traceable to business goals

**Solution**: Build `PRDBusinessOutcomes` system

**Effort**: 6-8 hours

**Tasks**:
1. Extend `types.ts` with `BusinessOutcome` interface
2. Create `rad-engineer/src/plan/BusinessOutcomeExtractor.ts`
3. Create `rad-engineer/src/reasoning/OutcomeInjector.ts`
4. Integrate with PRDGenerator and all agent prompts

---

#### Gap 3: No Decision Learning System

**Impact**: Can't improve reasoning methods over time

**Solution**: Extend `PerformanceStore` pattern to general decisions

**Effort**: 10-14 hours

**Tasks**:
1. Create `rad-engineer/src/reasoning/DecisionTracker.ts`
2. Create `rad-engineer/src/reasoning/DecisionLearningStore.ts` (like PerformanceStore)
3. Implement outcome analysis (which methods work best for which contexts)
4. Add feedback loop (improve method selection over time)

---

#### Gap 4: No Agent Prompt Enhancement

**Impact**: Agents don't know to apply critical reasoning

**Solution**: Enhance ALL agent prompts with outcome-based reasoning

**Effort**: 4-6 hours

**Tasks**:
1. Create `rad-engineer/src/agents/AgentPromptEnhancer.ts`
2. Add outcome injection to every agent spawn
3. Add reasoning method guidance to prompts
4. Test with all 12 specialized agents

---

### Total Additional Effort: 28-40 hours (4-5 days)

**Breakdown**:
- CriticalReasoningEngine: 8-12h
- BusinessOutcome system: 6-8h
- DecisionLearning: 10-14h
- AgentPromptEnhancement: 4-6h

**Updated Total Platform Effort**:
- Previous estimate: 108-136 hours
- Add critical reasoning: +28-40 hours
- **New total: 136-176 hours (17-22 days)**

---

### Recommended Implementation Order

**Phase 1: Foundation** (CriticalReasoningEngine - 8-12h)
1. Implement 5 core elicitation methods
2. Add method selection logic
3. Test with simple decisions

**Phase 2: PRD Integration** (BusinessOutcomes - 6-8h)
1. Extract outcomes from PRD
2. Inject into agent prompts
3. Validate decisions against outcomes

**Phase 3: Learning** (DecisionTracker + LearningStore - 10-14h)
1. Track all decisions with evidence
2. Analyze outcomes
3. Improve method selection

**Phase 4: Rollout** (AgentPromptEnhancer - 4-6h)
1. Enhance all 12 specialized agents
2. Test end-to-end
3. Measure improvement

---

### Success Metrics

**Determinism**:
- Same input + same reasoning method = same decision (≥95% consistency)

**Self-Learning**:
- Method selection improves over time (≥10% better outcomes after 100 decisions)

**Self-Improving**:
- Decision quality score increases (measured by outcome achievement)

---

### Updated TODOs

**Add to Implementation Plan**:

| Component | Priority | Effort | Dependencies |
|-----------|----------|--------|--------------|
| CriticalReasoningEngine | HIGH | 8-12h | None |
| BusinessOutcomeExtractor | HIGH | 6-8h | PRDGenerator |
| DecisionTracker | HIGH | 10-14h | CriticalReasoningEngine |
| AgentPromptEnhancer | MEDIUM | 4-6h | DecisionTracker |

---

## Summary: Critical Reasoning + PRD Outcomes Injection

### How Far Would This Help?

**Answer**: This is THE CORE MECHANISM that makes the platform deterministic, self-learning, and self-improving.

**Why**:
1. **Deterministic**: Structured reasoning methods → reproducible decisions
2. **Self-Learning**: Decision tracking + outcome analysis → better reasoning over time
3. **Self-Improving**: Learn which methods work best for which contexts

**Without This**: Platform is just "fancy automation" (agents following scripts)
**With This**: Platform is "intelligent system" (agents reasoning like humans)

### How Much Already Exists?

| Component | Status | Evidence |
|-----------|--------|----------|
| PerformanceStore (EWC learning) | ✅ EXISTS | `src/adaptive/PerformanceStore.ts` (334 lines) |
| Evidence-Based Reasoning Rule | ✅ EXISTS | `CLAUDE.md` (79 lines added 2026-01-06) |
| Advanced Elicitation (planned) | ⚠️ PLANNED | `PLAN_EXECUTE_CURRENT_STATE.md` (lines 1289-3425) |
| CriticalReasoningEngine | ❌ MISSING | Not implemented |
| BusinessOutcome system | ❌ MISSING | Not implemented |
| DecisionTracker | ❌ MISSING | Not implemented |
| AgentPromptEnhancer | ❌ MISSING | Not implemented |

### What Else Must Be Built?

**4 new components** (28-40 hours total):

1. **CriticalReasoningEngine** (8-12h) - Apply elicitation methods to decisions
2. **BusinessOutcome system** (6-8h) - Extract and inject business outcomes
3. **DecisionTracker + LearningStore** (10-14h) - Track and learn from decisions
4. **AgentPromptEnhancer** (4-6h) - Enhance all agent prompts with reasoning

**Updated Total Effort**: 136-176 hours (17-22 days)

---

**RESEARCH COMPLETED**: 2026-01-06

---

