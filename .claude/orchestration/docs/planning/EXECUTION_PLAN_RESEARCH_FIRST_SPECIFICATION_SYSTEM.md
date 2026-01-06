# Critical Reasoning Analysis: Implementation Planning Approach

## LAYER 1: Integration Verification

### Q1: USER END STATE
Every component of the 16-week Smart Orchestrator plan has unambiguous, evidence-backed specifications that enable deterministic autonomous implementation without clarification questions or guesswork.

### Q2: TRIGGER
The plan is revised and approved, but needs detailed breakdown. Current state: 1,230-line overview with phases and high-level deliverables.

### Q3: COMPONENT CONNECTIONS

```
Phase 0 (PoC + Baseline) → Phase 1 (Core) → Phase 2 (Advanced) → Phase 3 (Integration)
     ↓                        ↓                  ↓                    ↓
  Real SDK Evidence     Resource Manager    Error Recovery     Skill Integration
  Baseline Metrics      PromptValidator     Progressive        Load Testing
  Risk Register         ResponseParser      Context            Security Review
```

### Q4: PROOF
Implementation agents execute from specs with 0 clarification requests, all quality gates pass, integration works end-to-end.

### Q5: VALIDATION
Each spec has measurable success criteria, evidence requirements, and verification commands.

### Q6: BREAK MODES
- Vague specs → agent confusion
- Missing dependencies → integration failures
- Unverified claims → wrong implementation

---

## LAYER 2: Chain-of-Thought Decomposition

### Step 1: Define what "detailing" means for this plan
- **Current**: 16-week overview with phases
- **Need**: Granular, implementation-ready specifications
- **Each of 6 main components needs**: interface, dependencies, tests, evidence, failures

### Step 2: Identify the fundamental challenge
- **Critical review finding**: "Current implementation is SIMULATION"
- **This means**: NO ONE has actually built this yet
- **Implication**: Specs must enable FIRST-TIME-RIGHT implementation
- **Requirement**: Evidence-based, not assumption-based

### Step 3: What proven patterns exist?
- **NASA**: Software Specification Sheets (SSS) for critical systems
- **Aerospace**: Interface Control Documents (ICD) between components
- **Medical Device**: Design Input → Design Output → Verification
- **Pattern**: Structured specifications with evidence requirements

### Step 4: Evaluate approaches systematically
- **Epics/Stories**: Too narrative, hard to verify determinism
- **Pure YAML**: Too rigid, hard to capture rationale
- **/plan skill**: Good for initial planning, not for detailed specs
- **Hybrid**: Structured YAML + Evidence documentation + Test specs

### Step 5: Recommended approach
**Research-First Specification System**:
1. Research Specification (YAML) - Evidence gathering
2. Component Specification (YAML) - Implementation contract
3. Test Specification (YAML) - Verification contract
4. Integration Specification (YAML) - Connection contracts

---

## LAYER 3: Socratic Questioning

### Q9: CLARIFY
I believe a structured, evidence-first specification system is optimal because:
- The critical review showed that unverified assumptions led to problems
- The plan requires 16 weeks with 4 phases - too complex for narrative specs
- Each component has 3+ failure modes that must be documented
- Evidence must be gathered BEFORE implementation (Model B execution)

### Q10: CHALLENGE ASSUMPTIONS

**Assumption 1**: "YAML is machine-readable" → Is it human-readable for rationale?
- **Mitigation**: Use YAML for structure, markdown for rationale

**Assumption 2**: "Research before implementation" → What if research takes too long?
- **Mitigation**: Parallel research streams, time-boxed to 1 week

**Assumption 3**: "Structured specs enable autonomous implementation" → What if agents still ask questions?
- **Mitigation**: Include "Clarification Prevention" section in spec template

### Q11: DEMAND EVIDENCE

**Supporting evidence**:
- Critical review explicitly called for "detailed specifications with evidence"
- NASA Software Specification Sheets used for critical systems (verified pattern)
- The revised plan has "Implementation Readiness Checklist" requiring detailed specs

**Can I cite**: Yes, the critical review and the plan itself

**Have I seen this work**: Research-then-Implement pattern is proven (Model A vs Model B from original plan)

---

## LAYER 4: First Principles

### Q15: FUNDAMENTAL TRUTHS
1. No one has built this before - Current code is simulation, not production
2. Claude Agent SDK capabilities are limited - Must be verified, not assumed
3. 16-week timeline requires precision - Cannot afford "figure it out as we go"
4. Quality gates are binary PASS/FAIL - Specs must enable passing

### Q16: REBUILD FROM SCRATCH
If starting fresh with this knowledge:
1. Research first, never assume - Every claim needs source
2. Structure over narrative - YAML for contracts, markdown for rationale
3. Testable by design - Every spec includes verification method
4. Failure-aware - Every component has failure mode documentation

---

## LAYER 5: Cognitive Bias Check

### Q17: BIASES TO AVOID

**1. Confirmation Bias**: "YAML specs worked before" → Are they optimal for THIS use case?
- **Correction**: Evaluate against the specific constraints identified

**2. Anchoring Bias**: "The existing plan structure" → Is it the right granularity?
- **Correction**: Break down further to component level

**3. Availability Bias**: "Use what we have" (/plan skill, stories) → Is there something better?
- **Correction**: Design custom approach for this specific need

### Q18: RED TEAM ATTACK

**Critique**: "This is over-engineered, too much documentation"
- **Response**: The critical review showed that under-specification led to 5-week timeline being unrealistic. Precision prevents rework.

**Critique**: "No one will read all these YAML files"
- **Response**: Agents will parse them programmatically. Humans read the markdown summaries.

**Critique**: "Research-first is too slow"
- **Response**: Model A (≤4 points, no external APIs) can skip research. Model B (this plan) requires it.

---

## LAYER 6: Confidence Calibration

### Q19: CONFIDENCE: 85%

**Why high**:
- Pattern is proven (NASA, aerospace, medical device)
- Addresses all identified gaps from critical review
- Aligns with Model B execution (research → spec → implement)

**What would increase**: Building a small PoC with this approach to validate

**What decreases**: If the research phase doesn't yield useful results

### Q20: KNOWLEDGE GAPS

**Technical**: Optimal YAML structure for this use case?
- **Action**: Design and validate spec template

**Domain**: How much detail is "enough"?
- **Action**: Start with one component, iterate

**Context**: What's the balance between detail and speed?
- **Action**: Time-box research, adjust based on outcomes

---

## 🎯 RECOMMENDED APPROACH: Research-First Specification System

Based on the critical reasoning analysis, here's the optimal approach:

### Three-Document Architecture per Component

#### Directory Structure

```
.claude/orchestration/
├── specs/
│   ├── phase-0-poc/
│   │   ├── research-spec.yaml        # Evidence gathering
│   │   ├── component-spec.yaml       # Implementation contract
│   │   └── test-spec.yaml            # Verification contract
│   ├── phase-1-core/
│   │   ├── resource-manager/
│   │   │   ├── research-spec.yaml
│   │   │   ├── component-spec.yaml
│   │   │   └── test-spec.yaml
│   │   ├── prompt-validator/
│   │   └── response-parser/
│   └── phase-2-advanced/
│       ├── progressive-context/
│       └── error-recovery/
```

### Document Templates

#### 1. RESEARCH-SPEC.YAML (Evidence Gathering)

```yaml
spec_id: "RES-001-ResourceManager"
component: "ResourceManager"
phase: 1
priority: "CRITICAL"

research_questions:
  - id: "RQ-001"
    question: "What are the exact system monitoring APIs available on macOS?"
    assumptions:
      - "psutil Python library works on macOS"
      - "kernel_task is trackable via process list"
    evidence_sources:
      - type: "official_documentation"
        url: "https://psutil.readthedocs.io/"
      - type: "context7"
        library_id: "/psutil/psutil"
    verification_method: "Write test script that monitors CPU/memory for 60s"

  - id: "RQ-002"
    question: "What are the actual resource limits that prevent crashes?"
    assumptions:
      - "kernel_task > 50% causes crashes (from critical review)"
      - "Memory pressure > 80% causes issues"
    evidence_sources:
      - type: "empirical_testing"
        method: "Run load tests incrementing agents until crash"
    verification_method: "Document exact crash point with evidence"

claims_to_validate:
  - claim: "ResourceManager can prevent system crashes"
    validation_method: "Load test with 100 concurrent agents"
    success_criteria: "Zero kernel_task spikes >50%, zero crashes"

deliverables:
  - type: "evidence_document"
    format: "markdown"
    content: "Verified system monitoring APIs with code examples"
  - type: "baseline_metrics"
    format: "json"
    content: "Current resource usage under various loads"
```

#### 2. COMPONENT-SPEC.YAML (Implementation Contract)

```yaml
spec_id: "COMP-001-ResourceManager"
component: "ResourceManager"
phase: 1
depends_on:
  - "RES-001-ResourceManager"  # Research must complete first

interface:
  class_name: "ResourceManager"
  file_path: ".claude/orchestration/resource-manager.ts"

  public_methods:
    - name: "calculateOptimalConcurrency"
      inputs:
        - name: "systemMetrics"
          type: "SystemMetrics"
      outputs:
        type: "number"
        description: "Optimal concurrent agent count (1-5)"
      failure_modes:
        - error: "Metrics unavailable"
          mitigation: "Return conservative value of 1"
          test: "Unit test with mocked unavailable metrics"

    - name: "monitorResources"
      inputs:
        - name: "interval"
          type: "number"
          constraints: ">= 1000, <= 60000"
      outputs:
        type: "Observable<SystemMetrics>"
      failure_modes:
        - error: "Monitoring thread crashes"
          mitigation: "Restart monitoring, log incident"
          test: "Chaos test: kill monitoring process"

integration_points:
  - component: "PromptValidator"
    interface: "IResourceLimits"
    methods: ["getMaxPromptSize", "canAcceptAgent"]
  - component: "WaveOrchestrator"
    interface: "IConcurrencyControl"
    methods: ["requestSlot", "releaseSlot"]

evidence_requirements:
  - claim: "Can accurately track kernel_task CPU"
    source: "RES-001-ResourceManager"
    evidence_id: "EV-001"
  - claim: "Can detect memory pressure"
    source: "RES-001-ResourceManager"
    evidence_id: "EV-002"

success_criteria:
  - criterion: "Prevents all kernel_task spikes >50%"
    measurement: "Load test with 100 agents, monitor CPU"
    threshold: "Zero spikes >50%"
  - criterion: "Accurate concurrency calculation"
    measurement: "Compare calculated vs actual optimal"
    threshold: "Within 1 agent of true optimal"

implementation_notes:
  constraints:
    - "MUST use psutil for system monitoring"
    - "MUST update metrics every 5s minimum"
    - "MUST log all resource decisions"

  prohibited:
    - "DO NOT use exec() for process monitoring (use psutil)"
    - "DO NOT allow negative concurrency values"
    - "DO NOT hardcode any limits (use config)"
```

#### 3. TEST-SPEC.YAML (Verification Contract)

```yaml
spec_id: "TEST-001-ResourceManager"
component: "ResourceManager"
phase: 1

test_requirements:
  unit_tests:
    - name: "calculateOptimalConcurrency returns valid range"
      given: "System with 40% CPU, 50% memory, 200 processes"
      when: "calculateOptimalConcurrency() called"
      then: "Returns value between 1 and 5"
      evidence_required: true

    - name: "monitorResources emits metrics"
      given: "Monitoring started with 5s interval"
      when: "10 seconds elapsed"
      then: "At least 2 metric updates emitted"
      evidence_required: true

  integration_tests:
    - name: "ResourceManager prevents crashes under load"
      given: "System with ResourceManager active"
      when: "Spawn 50 agents concurrently"
      then: "Zero crashes, kernel_task < 50%"
      evidence_required: true
      duration: "5 minutes"

  chaos_tests:
    - name: "Handles monitoring failure gracefully"
      given: "Monitoring process crashes"
      when: "New agent request arrives"
      then: "Falls back to concurrency=1, logs incident"
      evidence_required: true

coverage_requirements:
  minimum: 0.80  # 80% coverage required
  branches: true
  functions: true
  lines: true

verification_commands:
  - "bun test .claude/orchestration/resource-manager.test.ts"
  - "bun test --coverage .claude/orchestration/"
  - "Load test: scripts/load-test-resource-manager.sh"

evidence_collection:
  - metric: "kernel_task_cpu"
    collection_method: "psutil.cpu_percent(interval=0.1)"
    frequency: "Every 1s during test"
  - metric: "memory_pressure"
    collection_method: "psutil.virtual_memory().percent"
    frequency: "Every 1s during test"
```

### Execution Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RESEARCH-FIRST SPECIFICATION                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FOR EACH COMPONENT (6 main components + subcomponents):           │
│                                                                     │
│  1. RESEARCH PHASE (Research Agent)                                 │
│     ├─ Read research-spec.yaml                                     │
│     ├─ Execute evidence gathering (context7, official docs, tests) │
│     ├─ Document findings in evidence/ folder                        │
│     ├─ Update research-spec.yaml with actual evidence               │
│     └─ OUTPUT: research-complete marker                            │
│                                                                     │
│  2. SPECIFICATION PHASE (Architecture Agent)                       │
│     ├─ Read research-spec.yaml (evidence included)                 │
│     ├─ Write component-spec.yaml with actual capabilities           │
│     ├─ Define interfaces with evidence-backed claims               │
│     ├─ Document failure modes with mitigations                      │
│     └─ OUTPUT: spec-complete marker                                 │
│                                                                     │
│  3. TEST SPECIFICATION PHASE (Test Engineer Agent)                 │
│     ├─ Read component-spec.yaml                                    │
│     ├─ Write test-spec.yaml with verifiable criteria               │
│     ├─ Define evidence collection methods                           │
│     ├─ Include chaos tests for failure modes                       │
│     └─ OUTPUT: test-complete marker                                 │
│                                                                     │
│  4. IMPLEMENTATION PHASE (Developer Agent)                          │
│     ├─ Read all three specs (research, component, test)           │
│     ├─ Implement according to spec                                  │
│     ├─ NO clarification requests needed (by design)                │
│     └─ OUTPUT: Implementation                                      │
│                                                                     │
│  5. VERIFICATION PHASE (QA Agent)                                  │
│     ├─ Run verification commands from test-spec.yaml               │
│     ├─ Collect evidence as specified                               │
│     ├─ Validate against success criteria                           │
│     └─ OUTPUT: Pass/Fail + Evidence                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Innovations

1. **Evidence-Backed Claims**: Every claim in component-spec references evidence_id from research-spec
2. **Failure Mode Documentation**: Every component has explicit failure modes with mitigations
3. **Deterministic Success Criteria**: Binary PASS/FAIL with measurement methods
4. **Parallelizable**: Research for different components can happen in parallel
5. **Traceability**: From evidence → claim → implementation → test

### File Organization

```
.claude/orchestration/
├── specs/
│   ├── _templates/           # Spec templates
│   │   ├── research-spec.yaml.template
│   │   ├── component-spec.yaml.template
│   │   └── test-spec.yaml.template
│   │
│   ├── phase-0-poc/           # Phase 0 specifications
│   │   ├── sdk-integration/
│   │   │   ├── research-spec.yaml
│   │   │   ├── component-spec.yaml
│   │   │   ├── test-spec.yaml
│   │   │   └── evidence/         # Collected evidence
│   │   │       ├── sdk-capabilities.md
│   │   │       └── baseline-metrics.json
│   │   └── baseline/
│   │
│   ├── phase-1-core/          # Phase 1 specifications
│   │   ├── resource-manager/
│   │   ├── prompt-validator/
│   │   ├── response-parser/
│   │   └── orchestration-loop/
│   │
│   ├── phase-2-advanced/      # Phase 2 specifications
│   │   ├── progressive-context/
│   │   └── error-recovery/
│   │
│   └── phase-3-integration/   # Phase 3 specifications
│       ├── skill-integration/
│       ├── load-testing/
│       └── security-review/
│
├── _scripts/
│   ├── generate-specs.sh     # Generate spec files from templates
│   ├── validate-specs.sh     # Validate spec completeness
│   └── research-agent.sh     # Spawn research agents in parallel
│
└── docs/
    └── spec-methodology.md   # This document
```

### Quality Gates

#### Gate 1: Research Complete
- All research questions answered
- All evidence sources consulted
- All claims validated or marked as targets
- research-complete marker set

#### Gate 2: Specification Complete
- All interfaces defined with evidence backing
- All failure modes documented with mitigations
- All success criteria measurable
- spec-complete marker set

#### Gate 3: Test Specification Complete
- All unit tests specified
- All integration tests specified
- Evidence collection methods defined
- test-complete marker set

#### Gate 4: Implementation Complete
- All tests pass
- All success criteria met
- All evidence collected
- Gate decision: Go/No-Go

---

## 🚀 NEXT STEPS: Start with Phase 0

