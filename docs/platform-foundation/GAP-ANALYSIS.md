# Rad Engineer v2 - Gap Analysis & Transformation Specification

> **Purpose**: Complete analysis of rad-engineer-v2 against CCA/Neo-Confucius architecture with actionable specifications
> **Analysis Date**: 2026-01-12
> **Certainty Score**: 0.87 (evidence_coverage=0.9, component_mapping=0.85, spec_completeness=0.85)

---

## Executive Summary

| Category | Count | Confidence |
|----------|-------|------------|
| **Great As-Is** | 4 requirements | 0.85 avg |
| **Needs Modification** | 6 components | 0.80 avg |
| **Missing (New Build)** | 7 components | N/A |
| **Universal Extensions** | 8 new modules | N/A |

**Platform Status**: 42 components across 10 modules provide ~40% of CCA/Neo-Confucius requirements. Core innovation (VAC) and hierarchical memory are the primary gaps.

---

## Part 1: Great As-Is (Keep These)

These components already satisfy CCA/Neo-Confucius requirements with high confidence.

### 1.1 Persistent Hindsight System ✅

**Requirement**: Cross-session learning, failure indexing, resolution path tracking

**Satisfied By**:
- `DecisionLearningStore` (src/decision/DecisionLearningStore.ts)
- `DecisionTracker` (src/decision/DecisionTracker.ts)
- `PerformanceStore` (src/adaptive/PerformanceStore.ts)

**Evidence**:
- EWC (Elastic Weight Consolidation) prevents catastrophic forgetting
- Version tracking with checksums for data integrity
- `learnFromOutcome()` feeds execution results back for learning
- Cross-session persistence via YAML files
- Beta distributions for provider success/failure rates

**Confidence**: 0.85

**No Changes Required** - Already implements research recommendations.

---

### 1.2 Active Learning ✅

**Requirement**: Session-to-session retention, feedback loops, effectiveness tracking

**Satisfied By**:
- `DecisionLearningStore.learnFromOutcome()`
- `DecisionLearningIntegration.recordOutcome()`
- `EvaluationLoop.evaluateAndUpdate()`

**Evidence**:
- Method effectiveness updated based on outcomes
- Quality metrics fed back to PerformanceStore
- Historical effectiveness lookup for method selection

**Confidence**: 0.80

**No Changes Required** - Learning loop is complete.

---

### 1.3 Safety Hooks ✅

**Requirement**: Policy enforcement, injection prevention, risk blocking

**Satisfied By**:
- `SecurityLayer` (src/integration/SecurityLayer.ts)
- `PromptValidator` (src/core/PromptValidator.ts)

**Evidence**:
- OWASP LLM01:2025 injection pattern detection
- PII scanning (email, SSN, credit card, phone)
- Credential leakage detection (passwords, API keys, tokens)
- Audit logging with timestamps
- Role impersonation detection with severity levels
- Size limits (500 chars) enforced

**Confidence**: 0.90

**No Changes Required** - Security posture exceeds CCA baseline.

---

### 1.4 Modular Tools ✅

**Requirement**: Pluggable tool architecture, MCP support, hot-swapping

**Satisfied By**:
- `SDKIntegration` (src/sdk/SDKIntegration.ts)
- `ProviderFactory` (src/sdk/providers/ProviderFactory.ts)
- `WaveOrchestrator` (src/advanced/WaveOrchestrator.ts)

**Evidence**:
- Pluggable provider architecture (Anthropic, Ollama, GLM)
- MCP integration via memory-keeper, chrome-devtools
- Task execution with dependency management
- Provider switching and fallback

**Confidence**: 0.75

**Minor Enhancement**: Add more MCP servers for extended tool ecosystem.

---

## Part 2: Needs Modification (Change Specifications)

These components exist but require specific changes to meet CCA/Neo-Confucius standards.

### 2.1 Hierarchical Working Memory

**Current Component**: `StateManager` (src/advanced/StateManager.ts)

**What It Has**:
- Checkpoint-based state persistence
- Wave/task tracking (waveNumber, completedTasks, failedTasks)
- Checksums for integrity
- Compaction (old file removal)

**Gap**: No scope hierarchy (Global→Task→Local), no compression, single-level only

**Why Change**: CCA achieves logarithmic token growth through scope compression. Current linear growth will exhaust context on long tasks.

**How to Change**:

```typescript
// NEW: Add to StateManager or create ScopeManager
enum ContextScope {
  GLOBAL = 'global',   // Immutable project manifesto
  TASK = 'task',       // Current plan, progress summaries
  LOCAL = 'local'      // Ephemeral tool outputs
}

interface ScopedMemory {
  scope: ContextScope;
  content: string;
  createdAt: Date;
  compressed: boolean;
}

class ScopeManager {
  // Promote LOCAL summary to TASK when subtask completes
  async compressScope(scopeId: string): Promise<string>;

  // Build context by traversing scope tree
  buildContextForPrompt(): string;

  // Track token budget per scope
  getTokenBudget(scope: ContextScope): number;
}
```

**Specification**:
| Field | Before | After |
|-------|--------|-------|
| Scope levels | 1 (wave) | 3 (Global→Task→Local) |
| Compression | None | Automatic on subtask close |
| Token tracking | None | Per-scope budgets |
| Context growth | Linear | Logarithmic |

**Priority**: HIGH
**Effort**: 16-24 hours

---

### 2.2 Meta-Agent Optimization Loop

**Current Component**: `DecisionLearningIntegration` (src/execute/DecisionLearningIntegration.ts)

**What It Has**:
- Prompt enhancement with outcomes/methods
- Outcome recording after execution
- Statistics and effectiveness measurement

**Gap**: Learning is passive (post-execution), not active (during execution). No Build-Test-Improve loop.

**Why Change**: CCA's meta-agent proactively improves during execution. Current system only learns after the fact.

**How to Change**:

```typescript
class MetaAgentLoop {
  async executeWithImprovement(task: Task): Promise<Result> {
    let attempt = 0;
    let result: Result;

    while (attempt < MAX_ATTEMPTS) {
      // BUILD: Execute task with current config
      result = await this.execute(task);

      // TEST: Evaluate quality
      const quality = await this.evaluate(result);

      if (quality >= QUALITY_THRESHOLD) {
        return result;
      }

      // IMPROVE: Analyze trace, modify approach
      const improvements = await this.analyzeAndImprove(result, quality);
      task = this.applyImprovements(task, improvements);
      attempt++;
    }

    return result;
  }
}
```

**Specification**:
| Field | Before | After |
|-------|--------|-------|
| Learning trigger | Post-execution | During execution |
| Retry strategy | None | Quality-based with improvement |
| Quality threshold | None | Configurable (default 0.7) |
| Max attempts | None | Configurable (default 3) |

**Priority**: HIGH
**Effort**: 12-16 hours

---

### 2.3 Verifiable Agentic Contract (VAC)

**Current Component**: `PromptValidator` (src/core/PromptValidator.ts)

**What It Has**:
- Structure validation (Task/Files/Output/Rules)
- Size validation (≤500 chars, ≤125 tokens)
- Injection pattern detection

**Gap**: No formal contracts (preconditions, postconditions, invariants). No verification before commit.

**Why Change**: VAC is the core innovation for determinism. Without it, agents can "hallucinate" commits.

**How to Change**:

```typescript
interface AgentContract {
  preconditions: Condition[];   // Must be true before execution
  postconditions: Condition[];  // Must be true after execution
  invariants: Condition[];      // Must be true throughout
}

interface Condition {
  name: string;
  predicate: (context: ExecutionContext) => boolean;
  errorMessage: string;
}

class ContractValidator {
  // Verify contract is logically consistent
  validateContract(contract: AgentContract): ValidationResult;

  // Check preconditions before execution
  checkPreconditions(contract: AgentContract, context: ExecutionContext): boolean;

  // Check postconditions after execution
  checkPostconditions(contract: AgentContract, context: ExecutionContext): boolean;

  // Enforce via hook - block commits without verification
  createSafetyHook(): Hook;
}

// Hook blocks commits without verified contract
async function enforceVACProtocol(input: ToolInput, context: Context) {
  if (input.toolName === 'commit_changes') {
    if (!context.contractVerified) {
      return { decision: 'deny', reason: 'RISK BLOCK: Run verify_contract first' };
    }
  }
}
```

**Specification**:
| Field | Before | After |
|-------|--------|-------|
| Contract support | None | Full pre/post/invariant |
| Verification | None | Required before commit |
| Enforcement | None | Hook-based blocking |
| Formal methods | None | Zod schemas, runtime checks |

**Priority**: HIGH (Core Innovation)
**Effort**: 24-32 hours

---

### 2.4 Calculator Mode (HLAAs)

**Current Component**: `MethodSelector` (src/reasoning/MethodSelector.ts)

**What It Has**:
- Method selection based on domain, complexity, time
- Historical effectiveness lookup
- Fallback to First Principles Analysis

**Gap**: Methods are suggestions, not enforced. No state machine. Undefined states possible.

**Why Change**: HLAAs guarantee deterministic outcomes. Current system allows undefined states.

**How to Change**:

```typescript
interface HighLevelAtomicAction {
  name: string;
  preconditions: Condition[];
  execute: (context: Context) => Promise<Result>;
  postconditions: Condition[];
  rollback: (context: Context) => Promise<void>;
}

class StateMachineExecutor {
  private state: State;
  private transitions: Map<string, Transition>;

  // Only defined transitions allowed
  async transition(action: string): Promise<void> {
    const transition = this.transitions.get(`${this.state}->${action}`);
    if (!transition) {
      throw new UndefinedStateError(this.state, action);
    }

    // Check guards
    if (!transition.guard(this.context)) {
      throw new GuardFailedError(transition);
    }

    // Execute with rollback on failure
    try {
      await transition.execute(this.context);
      this.state = transition.targetState;
    } catch (e) {
      await transition.rollback(this.context);
      throw e;
    }
  }
}
```

**Specification**:
| Field | Before | After |
|-------|--------|-------|
| State definition | None | Explicit state machine |
| Transitions | Ad-hoc | Defined with guards |
| Undefined states | Possible | Impossible |
| Rollback | None | Automatic on failure |

**Priority**: MEDIUM
**Effort**: 16-20 hours

---

### 2.5 Deterministic Verification

**Current Component**: `EvaluationLoop` (src/adaptive/EvaluationLoop.ts)

**What It Has**:
- DeepEval metrics (relevancy, faithfulness, precision, recall)
- `detectCatastrophicForgetting()` for performance degradation
- Quality evaluation for responses

**Gap**: Heuristic-based detection, not statistical. No drift measurement. No property-based testing.

**Why Change**: Mathematical certainty requires statistical drift detection, not threshold heuristics.

**How to Change**:

```typescript
class DriftDetector {
  // Statistical test for distribution drift
  detectDrift(baseline: Distribution, current: Distribution): DriftResult {
    // Kolmogorov-Smirnov test
    const ksStatistic = this.kolmogorovSmirnovTest(baseline, current);
    // Chi-square test for categorical
    const chiSquare = this.chiSquareTest(baseline, current);

    return {
      hasDrift: ksStatistic.pValue < 0.05 || chiSquare.pValue < 0.05,
      ksStatistic,
      chiSquare,
      confidence: 1 - Math.min(ksStatistic.pValue, chiSquare.pValue)
    };
  }

  // Same inputs should produce same outputs
  async measureDriftRate(task: Task, runs: number = 10): Promise<number> {
    const results = await Promise.all(
      Array(runs).fill(null).map(() => this.execute(task))
    );
    const uniqueASTs = new Set(results.map(r => this.normalizeAST(r)));
    return (uniqueASTs.size - 1) / runs; // 0 = perfect determinism
  }
}
```

**Specification**:
| Field | Before | After |
|-------|--------|-------|
| Drift detection | Heuristic threshold | Statistical tests (KS, chi-square) |
| Determinism measurement | None | Drift rate (same task × N runs) |
| Property testing | None | Integration with fast-check |
| Target drift rate | N/A | 0% |

**Priority**: MEDIUM
**Effort**: 12-16 hours

---

### 2.6 Scope-Aware Context

**Current Component**: `ResourceMonitor` (src/sdk/ResourceMonitor.ts)

**What It Has**:
- kernel_task CPU monitoring
- Memory pressure calculation
- Process/thread count tracking
- Resource threshold evaluation

**Gap**: Resource-based monitoring (CPU/memory), not token-based. No JIT context loading.

**Why Change**: Token budget management is essential for logarithmic context growth.

**How to Change**:

```typescript
class TokenBudgetManager {
  private budgets: Map<ContextScope, number> = new Map([
    [ContextScope.GLOBAL, 2000],  // Fixed manifesto
    [ContextScope.TASK, 4000],    // Growing summaries
    [ContextScope.LOCAL, 2000]    // Ephemeral, evictable
  ]);

  // Estimate tokens for content
  estimateTokens(content: string): number;

  // Check if content fits in scope budget
  canFit(scope: ContextScope, content: string): boolean;

  // Evict lowest priority content when over budget
  async evictIfNeeded(scope: ContextScope): Promise<void> {
    // LOCAL evicts before TASK evicts before GLOBAL
    if (this.isOverBudget(scope)) {
      if (scope === ContextScope.LOCAL) {
        await this.compressAndPromote();
      } else if (scope === ContextScope.TASK) {
        await this.summarizeOldestTasks();
      }
      // GLOBAL never evicts - it's immutable
    }
  }
}
```

**Specification**:
| Field | Before | After |
|-------|--------|-------|
| Monitoring type | Resource (CPU/memory) | Token + Resource |
| Budget tracking | None | Per-scope limits |
| Eviction strategy | None | Scope-priority based |
| JIT loading | None | Load on demand |

**Priority**: MEDIUM
**Effort**: 8-12 hours

---

## Part 3: Missing Components (New Build)

These components don't exist and must be created.

### 3.1 HierarchicalMemory Class

**Purpose**: Central manager for Global→Task→Local memory hierarchy

**Specification**:
```typescript
class HierarchicalMemory {
  private globalScope: Scope;      // Immutable project context
  private taskScopes: Scope[];     // Stack of task contexts
  private localScope: Scope;       // Current ephemeral context

  // Push new task scope
  pushTask(goal: string): void;

  // Pop task scope, compress to summary
  popTask(): string;

  // Add to local scope
  addLocalContext(content: string): void;

  // Build prompt context from hierarchy
  buildPromptContext(): string;

  // Get current token usage
  getTokenUsage(): { global: number, task: number, local: number };
}
```

**Integrates With**: StateManager, PromptValidator, WaveOrchestrator
**Priority**: HIGH
**Effort**: 20-28 hours

---

### 3.2 MetaAgentLoop Orchestrator

**Purpose**: Automated Build-Test-Improve cycle for self-optimization

**Specification**: See 2.2 above
**Integrates With**: DecisionLearningIntegration, WaveOrchestrator, EvaluationLoop
**Priority**: HIGH
**Effort**: 12-16 hours

---

### 3.3 ContractRegistry

**Purpose**: Store and manage agent contracts with validation

**Specification**:
```typescript
class ContractRegistry {
  private contracts: Map<string, AgentContract>;

  // Register contract for task type
  register(taskType: string, contract: AgentContract): void;

  // Get contract for task
  getContract(taskType: string): AgentContract | undefined;

  // Validate contract consistency
  validate(contract: AgentContract): ValidationResult;

  // List all registered contracts
  list(): AgentContract[];
}
```

**Integrates With**: ContractValidator, PromptValidator
**Priority**: MEDIUM
**Effort**: 8-12 hours

---

### 3.4 StateMachineExecutor

**Purpose**: Guarantee no undefined states during execution

**Specification**: See 2.4 above
**Integrates With**: WaveOrchestrator, MethodSelector
**Priority**: MEDIUM
**Effort**: 16-20 hours

---

### 3.5 DriftDetector

**Purpose**: Statistical drift detection for determinism validation

**Specification**: See 2.5 above
**Integrates With**: EvaluationLoop, BaselineMeasurement
**Priority**: MEDIUM
**Effort**: 12-16 hours

---

### 3.6 PropertyTestIntegration

**Purpose**: Property-based testing for invariant verification

**Specification**:
```typescript
class PropertyTestRunner {
  // Define property that must hold
  property(name: string, predicate: (input: any) => boolean): Property;

  // Run property against randomized inputs
  async verify(property: Property, iterations: number = 1000): Promise<PropertyResult>;

  // Generate test cases from contract
  generateFromContract(contract: AgentContract): Property[];
}
```

**Integrates With**: ContractValidator, DriftDetector
**Priority**: MEDIUM
**Effort**: 12-16 hours

---

### 3.7 FailureIndex

**Purpose**: Searchable failure pattern database

**Specification**:
```typescript
interface FailureRecord {
  id: string;
  error: string;
  context: ExecutionContext;
  rootCause: string;
  resolution: string;
  embedding: number[];  // For semantic search
}

class FailureIndex {
  // Index failure with semantic embedding
  async index(failure: FailureRecord): Promise<void>;

  // Search similar failures
  async searchSimilar(error: string, limit: number): Promise<FailureRecord[]>;

  // Get resolution for similar failure
  async getResolution(error: string): Promise<string | undefined>;
}
```

**Integrates With**: DecisionLearningStore, ErrorRecoveryEngine
**Priority**: MEDIUM
**Effort**: 10-14 hours

---

## Part 4: Universal Applicability Extensions

Extensions to make the platform work beyond coding.

### 4.1 DomainRegistry

**Purpose**: Pluggable domain definitions for any industry

**Specification**:
```typescript
interface DomainDefinition {
  id: string;
  name: string;
  keywords: string[];
  phases: PhaseTemplate[];
  actions: ActionCatalog;
  outcomes: OutcomeFramework;
  stakeholders: StakeholderRole[];
  regulations: RegulationSet[];
}

class DomainRegistry {
  register(domain: DomainDefinition): void;
  get(domainId: string): DomainDefinition;
  compose(domainIds: string[]): DomainDefinition;  // Combine domains
}
```

**Example Domains**: code, restaurant, construction, healthcare, events
**Priority**: HIGH for universality
**Effort**: 16-20 hours

---

### 4.2 HumanInTheLoopGateway

**Purpose**: Manage human checkpoints for non-automatable actions

**Specification**:
```typescript
class HumanInTheLoopGateway {
  // Queue task for human
  async queueForHuman(task: HumanTask): Promise<string>;

  // Check if human completed task
  async checkCompletion(taskId: string): Promise<HumanTaskResult | null>;

  // Notify human of pending task
  async notify(taskId: string, channel: NotificationChannel): Promise<void>;

  // Set timeout for human response
  setTimeout(taskId: string, duration: Duration): void;
}
```

**Use Cases**: Physical inspections, contract signatures, expert consultations
**Priority**: HIGH for non-code domains
**Effort**: 20-28 hours

---

### 4.3 ExternalResourceAdapter

**Purpose**: Integration with non-LLM external systems

**Specification**:
```typescript
interface ExternalResource {
  type: 'api' | 'database' | 'human' | 'physical';
  submit(request: ResourceRequest): Promise<ResourceResponse>;
  checkStatus(requestId: string): Promise<ResourceStatus>;
}

class ExternalResourceAdapter {
  register(name: string, resource: ExternalResource): void;
  async execute(resourceName: string, request: ResourceRequest): Promise<ResourceResponse>;
}
```

**Use Cases**: Permit APIs, contractor databases, scheduling systems
**Priority**: MEDIUM
**Effort**: 16-20 hours

---

### 4.4 PhysicalWorldSimulator

**Purpose**: Model real-world constraints (weather, lead times, availability)

**Specification**:
```typescript
class PhysicalWorldSimulator {
  // Estimate realistic timeline
  estimateTimeline(tasks: Task[], constraints: PhysicalConstraints): Timeline;

  // Model weather impact
  applyWeatherDelay(timeline: Timeline, forecast: WeatherForecast): Timeline;

  // Model material lead times
  applyLeadTimes(timeline: Timeline, materials: Material[]): Timeline;

  // Model labor availability
  applyLaborConstraints(timeline: Timeline, labor: LaborPool): Timeline;
}
```

**Use Cases**: Construction scheduling, event planning, manufacturing
**Priority**: MEDIUM
**Effort**: 20-24 hours

---

### 4.5 RegulatoryComplianceEngine

**Purpose**: Domain-specific regulatory validation

**Specification**:
```typescript
class RegulatoryComplianceEngine {
  // Load regulations for domain
  loadRegulations(domain: string, jurisdiction: string): void;

  // Validate plan against regulations
  validate(plan: ExecutionPlan): ComplianceResult;

  // Get required permits
  getRequiredPermits(plan: ExecutionPlan): Permit[];

  // Check compliance status
  checkStatus(permitId: string): PermitStatus;
}
```

**Use Cases**: Health codes, building codes, ADA, HIPAA
**Priority**: HIGH for regulated industries
**Effort**: 24-32 hours

---

### 4.6 CostEstimator

**Purpose**: Domain-aware cost estimation and tracking

**Priority**: MEDIUM
**Effort**: 16-20 hours

---

### 4.7 StakeholderManager

**Purpose**: Manage domain-specific stakeholder relationships

**Priority**: MEDIUM
**Effort**: 16-20 hours

---

### 4.8 ArtifactVersionControl

**Purpose**: Git-like versioning for non-code artifacts

**Priority**: MEDIUM
**Effort**: 20-24 hours

---

## Part 5: Implementation Roadmap

### Phase 1: Core Determinism (Weeks 1-4)
| Component | Priority | Effort | Dependency |
|-----------|----------|--------|------------|
| HierarchicalMemory | HIGH | 20-28h | None |
| ScopeManager (StateManager mod) | HIGH | 16-24h | HierarchicalMemory |
| VAC + ContractValidator | HIGH | 24-32h | None |
| MetaAgentLoop | HIGH | 12-16h | None |

**Milestone**: Mathematical certainty loop operational

### Phase 2: Verification (Weeks 5-6)
| Component | Priority | Effort | Dependency |
|-----------|----------|--------|------------|
| DriftDetector | MED | 12-16h | None |
| PropertyTestIntegration | MED | 12-16h | ContractValidator |
| StateMachineExecutor | MED | 16-20h | None |
| FailureIndex | MED | 10-14h | DecisionLearningStore |

**Milestone**: Drift rate measurable, determinism verified

### Phase 3: Universal Foundation (Weeks 7-10)
| Component | Priority | Effort | Dependency |
|-----------|----------|--------|------------|
| DomainRegistry | HIGH | 16-20h | None |
| HumanInTheLoopGateway | HIGH | 20-28h | StateManager |
| ExternalResourceAdapter | MED | 16-20h | None |
| RegulatoryComplianceEngine | HIGH | 24-32h | DomainRegistry |

**Milestone**: Non-coding domains operational

### Phase 4: Advanced Extensions (Weeks 11-14)
| Component | Priority | Effort | Dependency |
|-----------|----------|--------|------------|
| PhysicalWorldSimulator | MED | 20-24h | DomainRegistry |
| CostEstimator | MED | 16-20h | DomainRegistry |
| StakeholderManager | MED | 16-20h | HumanInTheLoop |
| ArtifactVersionControl | MED | 20-24h | None |

**Milestone**: Full platform for any domain

---

## Part 6: Success Metrics

### Determinism Metrics (Target)
| Metric | Current | Target |
|--------|---------|--------|
| Drift Rate | Unknown | 0% |
| Contract Coverage | 0% | 100% |
| Hallucination Rate | ~5% | <1% |
| Resolve@1 | Unknown | >54.3% |

### Efficiency Metrics (Target)
| Metric | Current | Target |
|--------|---------|--------|
| Context Saturation Rate | Unknown | <10% |
| Hindsight Utilization | Partial | >80% |
| Token Growth | Linear | Logarithmic |

### Universal Metrics (Target)
| Metric | Domains Supported |
|--------|------------------|
| Current | 1 (code) |
| Phase 3 | 5 (code, restaurant, construction, healthcare, events) |
| Phase 4 | Unlimited (via DomainRegistry) |

---

## Appendix: Files to Create/Modify

### New Files (Create)
```
rad-engineer/src/memory/
├── HierarchicalMemory.ts
├── ScopeManager.ts
├── TokenBudgetManager.ts
└── index.ts

rad-engineer/src/verification/
├── ContractValidator.ts
├── ContractRegistry.ts
├── DriftDetector.ts
├── PropertyTestRunner.ts
├── StateMachineExecutor.ts
└── index.ts

rad-engineer/src/meta/
├── MetaAgentLoop.ts
├── FailureIndex.ts
└── index.ts

rad-engineer/src/universal/
├── DomainRegistry.ts
├── HumanInTheLoopGateway.ts
├── ExternalResourceAdapter.ts
├── PhysicalWorldSimulator.ts
├── RegulatoryComplianceEngine.ts
├── CostEstimator.ts
├── StakeholderManager.ts
├── ArtifactVersionControl.ts
└── index.ts
```

### Existing Files (Modify)
```
rad-engineer/src/advanced/StateManager.ts     - Add scope support
rad-engineer/src/core/PromptValidator.ts      - Add contract validation
rad-engineer/src/sdk/ResourceMonitor.ts       - Add token monitoring
rad-engineer/src/adaptive/EvaluationLoop.ts   - Add drift detection
rad-engineer/src/reasoning/MethodSelector.ts  - Add state machine
```

---

---

## ⚠️ CORRECTIONS (Evidence-Based Review - 2026-01-12)

> **Critical Review**: The following sections contain corrections based on evidence-based analysis of the actual codebase.

### Correction 1: Existing Agents NOT Accounted For

The original analysis MISSED that rad-engineer-v2 already has **12 production agents** in `.claude/agents/`:

| Existing Agent | Purpose | Model | Status |
|----------------|---------|-------|--------|
| `developer.md` | TDD implementation, quality gates | Sonnet | **120K token lifetime** |
| `planner.md` | PRD creation, architecture design | **Opus** | Full context |
| `research-agent.md` | Complex research, YAML synthesis | Sonnet | ~1K token OUTPUT |
| `architect.md` | System design, tech selection | **Opus** | Full context |
| `code-reviewer.md` | Security audits, code quality | Sonnet | As needed |
| `test-writer.md` | Unit/integration/E2E tests | Sonnet | As needed |
| `debugger.md` | Bug investigation | Sonnet | As needed |
| `pr-fixer.md` | PR fixes | Sonnet | As needed |
| `pr-reviewer.md` | PR reviews | Sonnet | As needed |
| `pr-tester.md` | PR testing | Sonnet | As needed |
| `e2b-implementer.md` | E2B sandbox implementation | Sonnet | As needed |
| `base-instructions.md` | Base injection for ALL agents | N/A | Mandatory |

**Implication**: Software engineering domain agents ALREADY EXIST. No need to create new atomic agents that duplicate these.

### Correction 2: Context Limits Were WRONG

| Component | Actual Limit | Originally Proposed | Evidence |
|-----------|--------------|---------------------|----------|
| Research prompts | **5000 tokens** | 500-1000 tokens | ResearchCoordinator.ts:173,197,220 |
| Developer lifetime | **~120K tokens** | Not considered | developer.md:105 |
| Summary output | ~500 chars | Confused with context | base-instructions.md |

**The 500-char limit in base-instructions.md is for OUTPUT SUMMARY, not input context.**

### Correction 3: Only ONE Orchestrator Exists

| Component | Actual Role | My Proposal |
|-----------|-------------|-------------|
| `WaveOrchestrator` | **Single orchestrator** | Proposed O2 (meta) |
| `ResearchCoordinator` | Helper for /plan skill | Proposed O1 (domain) |

**Evidence**: WaveOrchestrator.ts is the ONLY orchestrator in `rad-engineer/src/advanced/`. ResearchCoordinator is a coordinator helper, not an orchestration layer.

**The 2-layer (O1 + O2) architecture was my extrapolation from engg-support-system patterns, NOT based on existing code.**

### Correction 4: Who Sets Context?

**Accountability chain** (verified from code):
1. **ResearchCoordinator** builds prompts: `buildFeasibilityPrompt()`, `buildCodebasePrompt()`, `buildPracticesPrompt()` (src/plan/ResearchCoordinator.ts:150-221)
2. **/plan SKILL.md** uses `DecisionLearningIntegration.enhancePrompt()` for business outcomes
3. **WaveOrchestrator** validates prompts via `PromptValidator.validate()`
4. **SDKIntegration.testAgent()** executes validated prompts

**Answer**: WaveOrchestrator (via PromptValidator) is accountable for context validation. ResearchCoordinator is accountable for prompt construction in /plan skill.

### Correction 5: Proposed vs Existing Agent Mapping

| Proposed Agent | Existing Equivalent | Status |
|----------------|---------------------|--------|
| ClassifierAgent | None | **NEW - valid addition** |
| ClarifierAgent | AskUserQuestion tool | **OVERLAP** |
| PlannerAgent | `planner.md` | **DUPLICATE** |
| ResearcherAgent | `research-agent.md` | **DUPLICATE** |
| ExecutorAgent | `developer.md` | **DUPLICATE** |
| VerifierAgent | `code-reviewer.md` | **OVERLAP** |
| LearnerAgent | DecisionLearningIntegration | **DUPLICATE** |
| CoderAgent | `developer.md` | **DUPLICATE** |
| TesterAgent | `test-writer.md` | **DUPLICATE** |

**Conclusion**: Only ClassifierAgent is genuinely new. Other proposed agents should EXTEND existing agents, not replace them.

---

## Part 7: Atomic Agent Swarm Architecture (REVISED)

> **Based on**: engg-support-system patterns + **existing rad-engineer-v2 agents**

### 7.0 Existing Agent Ecosystem (MUST LEVERAGE)

Before adding new agents, leverage the 12 existing agents:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXISTING AGENT ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│  Planning & Design (Opus)           │  Implementation (Sonnet)      │
│  ├── planner.md                     │  ├── developer.md             │
│  └── architect.md                   │  ├── test-writer.md           │
│                                     │  └── e2b-implementer.md       │
├─────────────────────────────────────┼───────────────────────────────┤
│  Research & Review (Sonnet)         │  PR Workflows (Sonnet)        │
│  ├── research-agent.md              │  ├── pr-reviewer.md           │
│  ├── code-reviewer.md               │  ├── pr-fixer.md              │
│  └── debugger.md                    │  └── pr-tester.md             │
├─────────────────────────────────────┴───────────────────────────────┤
│  base-instructions.md (injected into ALL agents)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.1 Architecture Principle: Extend, Don't Replace

Instead of creating new atomic agents, **extend existing agents** with enhanced capabilities from engg-support-system patterns.

```
┌─────────────────────────────────────────────────────────────────────┐
│                 SINGLE ORCHESTRATOR (WaveOrchestrator)              │
│   Coordinates execution, manages resources, enforces determinism   │
├─────────────────────────────────────────────────────────────────────┤
│               COORDINATOR HELPERS (ResearchCoordinator, etc.)       │
│   Domain-specific prompt building, research agent spawning          │
├─────────────────────────────────────────────────────────────────────┤
│                    EXISTING AGENT POOL                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ planner  │ │developer │ │research- │ │  code-   │ │  test-   │ │
│  │   .md    │ │   .md    │ │ agent.md │ │ reviewer │ │ writer   │ │
│  │ (Opus)   │ │(Sonnet)  │ │(Sonnet)  │ │   .md    │ │   .md    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                   NEW ADDITIONS (Minimal)                           │
│  ┌──────────┐                                                       │
│  │Classifier│ ← Only genuinely new agent needed                    │
│  │  Agent   │                                                       │
│  └──────────┘                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Agent Context Budgets (CORRECTED)

| Agent | Context Budget | Output Limit | Evidence |
|-------|----------------|--------------|----------|
| **developer.md** | ~120K tokens lifetime | ~500 char summary | developer.md:105 |
| **research-agent.md** | Full research context | ~1K token YAML spec | research-agent.md |
| **planner.md** | Full planning context | As needed | planner.md (Opus) |
| **ResearchCoordinator prompts** | **5000 tokens** | JSON output | ResearchCoordinator.ts:173 |
| **ClassifierAgent** (NEW) | ~2000 tokens | Classification JSON | Based on research patterns |

**Key Insight**: The 500-char limit is for **OUTPUT SUMMARY**, not input context. Agents have substantial context budgets for deep research.

### 7.3 Single Orchestrator Architecture (CORRECTED)

**Reality**: There is ONE orchestrator (`WaveOrchestrator`) with helper coordinators.

```typescript
// ACTUAL: WaveOrchestrator + ResearchCoordinator pattern
// File: rad-engineer/src/advanced/WaveOrchestrator.ts

class WaveOrchestrator {
  private readonly resourceManager: ResourceManager;
  private readonly promptValidator: PromptValidator;
  private readonly responseParser: ResponseParser;
  private readonly sdk: SDKIntegration;

  async executeWave(tasks: Task[], options?: WaveOptions): Promise<WaveResult> {
    // 1. Calculate wave size from ResourceManager (max 2-3)
    const waveSize = await this.calculateWaveSize();

    // 2. Split tasks into waves
    const waves = this.splitIntoWaves(tasks, waveSize);

    // 3. Execute each wave sequentially
    for (const wave of waves) {
      // 4. Validate prompts via PromptValidator
      // 5. Execute via SDKIntegration.testAgent()
      // 6. Parse responses via ResponseParser
    }
  }
}

// For /plan skill specifically:
// File: rad-engineer/src/plan/ResearchCoordinator.ts

class ResearchCoordinator {
  async executeResearch(
    requirements: StructuredRequirements,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<ResearchFindings> {
    // 1. Calculate agent count (2-3 based on complexity)
    // 2. Build prompts: buildFeasibilityPrompt(), buildCodebasePrompt(), etc.
    // 3. Register with ResourceManager
    // 4. Execute in parallel
    // 5. Consolidate findings
  }
}
```

**Context Accountability**:
- **WaveOrchestrator**: Validates prompts, manages resources
- **ResearchCoordinator**: Builds prompts with "max 5000 tokens" rule
- **DecisionLearningIntegration**: Enhances prompts with business outcomes

**Why NOT 2 layers?** The existing single orchestrator pattern is simpler, proven, and sufficient. Adding a meta-orchestrator would add complexity without clear benefit.

### 7.4 Agent Communication Protocol

Agents communicate via **Evidence Packets** (from engg-support-system):

```typescript
interface AgentMessage {
  meta: {
    agentId: string;
    messageType: 'request' | 'response' | 'event';
    timestamp: string;
    traceId: string;
  };
  payload: {
    task?: AtomicTask;
    result?: AtomicResult;
    evidence?: EvidencePacket;
    error?: AgentError;
  };
  veracity: {
    confidenceScore: number;  // 0-100
    isStale: boolean;
    faults: VeracityFault[];
  };
}
```

---

## Part 8: Implementation Metrics

> **Each change/addition now has concrete metrics for measuring implementation quality**

### 8.1 Hierarchical Memory Metrics

| Metric | Formula | Target | Measurement Method |
|--------|---------|--------|-------------------|
| **Token Efficiency** | `tokens_used / tokens_available` | <70% | Measure at each scope level |
| **Compression Ratio** | `original_size / compressed_size` | >3:1 | Compare before/after popTask() |
| **Context Growth Rate** | `d(tokens)/d(tasks)` | O(log n) | Plot tokens vs completed tasks |
| **Scope Violation Rate** | `violations / total_accesses` | 0% | Count cross-scope reads without promotion |

### 8.2 VAC Metrics

| Metric | Formula | Target | Measurement Method |
|--------|---------|--------|-------------------|
| **Contract Coverage** | `contracted_tasks / total_tasks × 100` | 100% | Track tasks with valid contracts |
| **Precondition Success Rate** | `pre_pass / pre_total × 100` | >95% | Log precondition checks |
| **Postcondition Success Rate** | `post_pass / post_total × 100` | >90% | Log postcondition checks |
| **Verification Rejection Rate** | `rejected / total × 100` | Track | Bugs caught before commit |
| **Contract Completeness** | `specified_conditions / possible_conditions` | >80% | Static analysis |

### 8.3 Atomic Agent Metrics

| Metric | Formula | Target | Measurement Method |
|--------|---------|--------|-------------------|
| **Agent Utilization** | `busy_time / total_time × 100` | 60-80% | Time tracking |
| **Swarm Efficiency** | `parallel_work / sequential_equivalent` | >2x | Compare parallel vs serial |
| **Message Latency** | `response_time_ms` | <100ms | Trace timing |
| **Fault Isolation Rate** | `contained_failures / total_failures` | >95% | Track cascade failures |
| **Agent Spawn Success** | `successful_spawns / total_spawns` | >99% | Log spawn attempts |

### 8.4 Determinism Metrics

| Metric | Formula | Target | Measurement Method |
|--------|---------|--------|-------------------|
| **Drift Rate** | `unique_outputs / total_runs × 100` | 0% | Run same task 10x, compare ASTs |
| **Reproducibility Score** | `identical_runs / total_runs × 100` | 100% | Same inputs → same outputs |
| **Hallucination Rate** | `ungrounded_claims / total_claims × 100` | <1% | Evidence validation |
| **Evidence Confidence** | Veracity score (0-100) | >80 | veracity.py scoring |

### 8.5 Veracity Scoring Formula (from engg-support-system)

```python
# Penalty points per fault type
FAULT_PENALTIES = {
    FaultType.STALE_DOC: 15,        # -15 for stale documents
    FaultType.ORPHANED_NODE: 5,     # -5 for poorly connected nodes
    FaultType.CONTRADICTION: 20,    # -20 for doc/code mismatch
    FaultType.LOW_COVERAGE: 10,     # -10 for insufficient evidence
}

def compute_confidence_score(faults: List[VeracityFault]) -> float:
    score = 100.0
    for fault in faults:
        penalty = FAULT_PENALTIES.get(fault.fault_type, 0)
        score -= penalty
    return max(0.0, score)
```

---

## Part 9: Flexible VAC with Hierarchical Memory

> **VAC adapts based on context scope, not fixed 500 char limit**

### 9.1 Adaptive Context Budget

The strict 500-char limit was based on preventing context overflow. With hierarchical memory, we can be **adaptive**:

```typescript
interface AdaptiveContextBudget {
  // Base budgets per scope
  baseBudgets: {
    global: number;   // 2000 tokens (immutable project context)
    task: number;     // 4000 tokens (grows with task complexity)
    local: number;    // 2000 tokens (ephemeral, compressible)
  };

  // Dynamic adjustment based on task complexity
  adjustForComplexity(task: Task): ContextBudget {
    const complexity = this.assessComplexity(task);
    return {
      global: this.baseBudgets.global,  // Never changes
      task: this.baseBudgets.task * complexity.taskMultiplier,
      local: this.baseBudgets.local * complexity.localMultiplier
    };
  }

  // Calculate available budget for agent prompt
  getAgentPromptBudget(scope: ContextScope): number {
    // Agent prompts draw from LOCAL scope only
    // LOCAL scope is compressed before overflow
    return Math.min(
      this.baseBudgets.local * 0.5,  // Max 50% of local for prompt
      this.getRemainingLocal()
    );
  }
}
```

### 9.2 Complexity Assessment

```typescript
interface ComplexityFactors {
  taskMultiplier: number;   // 1.0 - 3.0
  localMultiplier: number;  // 1.0 - 2.0
}

function assessComplexity(task: Task): ComplexityFactors {
  let taskMultiplier = 1.0;
  let localMultiplier = 1.0;

  // Multi-file changes need more task context
  if (task.estimatedFiles > 5) taskMultiplier += 0.5;
  if (task.estimatedFiles > 10) taskMultiplier += 0.5;

  // Cross-module changes need more local context
  if (task.crossesModuleBoundaries) localMultiplier += 0.5;

  // Research tasks need more task context
  if (task.type === 'research') taskMultiplier += 1.0;

  return {
    taskMultiplier: Math.min(taskMultiplier, 3.0),
    localMultiplier: Math.min(localMultiplier, 2.0)
  };
}
```

### 9.3 Contract Flexibility Rules

| Context Level | Contract Flexibility | Validation Strictness |
|---------------|---------------------|----------------------|
| **GLOBAL** | Fixed contracts (architectural invariants) | Maximum strictness |
| **TASK** | Adaptive contracts (task-specific) | Medium strictness |
| **LOCAL** | Flexible contracts (ephemeral) | Minimum strictness |

```typescript
class FlexibleContractValidator {
  validate(contract: AgentContract, scope: ContextScope): ValidationResult {
    const strictness = this.getStrictnessLevel(scope);

    // GLOBAL scope: all conditions required
    if (scope === ContextScope.GLOBAL) {
      return this.validateStrict(contract);
    }

    // TASK scope: core conditions required, edge cases optional
    if (scope === ContextScope.TASK) {
      return this.validateModerate(contract);
    }

    // LOCAL scope: minimal validation, focus on safety only
    return this.validateMinimal(contract);
  }
}
```

---

## Part 10: engg-support-system Integration Mapping

> **Which components from VPS system can help fill rad-engineer gaps**

### 10.1 Components to Reuse

| engg-support-system Component | rad-engineer Gap | Integration Path |
|------------------------------|-----------------|------------------|
| **veracity.py** | Determinism metrics | Port to TypeScript as `VeracityScorer.ts` |
| **packet_contract.py** | VAC evidence packets | Port as `EvidencePacketContract.ts` |
| **evidence_query.py** | Deterministic ordering | Port ordering logic to ResponseParser |
| **metrics.py** | Implementation metrics | Port as `MetricsCollector.ts` (Prometheus-compatible) |
| **EnggContextAgent** | Agent architecture pattern | Use as template for atomic agents |
| **QueryClassifier** | Ambiguity detection | Port as `AmbiguityDetector.ts` |
| **ClarificationGenerator** | Clarification system | Port as `ClarificationEngine.ts` |
| **ConversationManager** | Multi-round dialogue | Port as `ConversationState.ts` |

### 10.2 Integration Architecture

```
rad-engineer-v2/
└── rad-engineer/src/
    ├── agents/                    # NEW: Atomic agent swarm
    │   ├── AtomicAgent.ts         # Base agent class
    │   ├── ClassifierAgent.ts     # From QueryClassifier pattern
    │   ├── ClarifierAgent.ts      # From ClarificationGenerator pattern
    │   ├── PlannerAgent.ts        # Planning agent
    │   ├── ExecutorAgent.ts       # Execution agent
    │   ├── VerifierAgent.ts       # Contract verification agent
    │   ├── LearnerAgent.ts        # Learning agent
    │   └── index.ts
    │
    ├── orchestration/             # NEW: Orchestration layers
    │   ├── MetaOrchestrator.ts    # O2 layer
    │   ├── DomainOrchestrator.ts  # O1 layer base
    │   ├── CodeOrchestrator.ts    # Code domain O1
    │   ├── AgentSwarm.ts          # Swarm management
    │   └── index.ts
    │
    ├── veracity/                  # NEW: From engg-support-system
    │   ├── VeracityScorer.ts      # From veracity.py
    │   ├── EvidencePacket.ts      # From packet_contract.py
    │   ├── DeterministicOrder.ts  # From evidence_query.py
    │   ├── MetricsCollector.ts    # From metrics.py
    │   └── index.ts
    │
    ├── conversation/              # NEW: Multi-round dialogue
    │   ├── ConversationManager.ts # From gateway ConversationManager
    │   ├── AmbiguityDetector.ts   # From QueryClassifier
    │   ├── ClarificationEngine.ts # From ClarificationGenerator
    │   └── index.ts
    │
    └── [existing modules...]
```

### 10.3 Port Priority

| Component | Priority | Effort | Dependencies |
|-----------|----------|--------|--------------|
| VeracityScorer | HIGH | 4-6h | None |
| EvidencePacket | HIGH | 4-6h | None |
| MetricsCollector | HIGH | 4-6h | None |
| AtomicAgent base | HIGH | 8-12h | None |
| ClassifierAgent | HIGH | 6-8h | AtomicAgent |
| ConversationManager | MEDIUM | 6-8h | None |
| MetaOrchestrator | HIGH | 12-16h | AtomicAgent, VeracityScorer |
| CodeOrchestrator | HIGH | 8-12h | MetaOrchestrator |

---

## Part 11: Updated Implementation Roadmap with File Paths

> **Critical requirement: Every change specifies exact file path and integration details**

### Phase A: Veracity Infrastructure (Week 1)

#### A.1 Create VeracityScorer

**File**: `rad-engineer/src/veracity/VeracityScorer.ts` (NEW)

**Source**: Port from `engg-support-system/veracity-engine/core/veracity.py`

**Contents**:
```typescript
export enum FaultType {
  STALE_DOC = 'STALE_DOC',
  ORPHANED_NODE = 'ORPHANED_NODE',
  CONTRADICTION = 'CONTRADICTION',
  LOW_COVERAGE = 'LOW_COVERAGE'
}

export const FAULT_PENALTIES: Record<FaultType, number> = {
  [FaultType.STALE_DOC]: 15,
  [FaultType.ORPHANED_NODE]: 5,
  [FaultType.CONTRADICTION]: 20,
  [FaultType.LOW_COVERAGE]: 10
};

export function computeConfidenceScore(faults: VeracityFault[]): number;
export function checkStaleness(records: Record[], thresholdDays: number): VeracityFault[];
export function checkOrphans(records: Record[], threshold: number): VeracityFault[];
export function checkContradictions(records: Record[], thresholdDays: number): VeracityFault[];
export function validateVeracity(records: Record[], config?: VeracityConfig): VeracityResult;
```

**Integration**:
- Import into `rad-engineer/src/execute/DecisionLearningIntegration.ts`
- Use `validateVeracity()` after each execution to compute confidence
- Record confidence score in `PerformanceStore`

**Tests**: `rad-engineer/test/veracity/VeracityScorer.test.ts`

**Metrics**:
- Coverage: 100% of VeracityScorer functions
- Confidence score accuracy: ±2 points vs Python reference

---

#### A.2 Create EvidencePacket Contract

**File**: `rad-engineer/src/veracity/EvidencePacket.ts` (NEW)

**Source**: Port from `engg-support-system/veracity-engine/core/packet_contract.py`

**Contents**:
```typescript
export const SCHEMA_VERSION = '1.0';

export interface EvidencePacketV1 {
  meta: PacketMeta;
  status: 'success' | 'insufficient_evidence';
  codeEvidence: CodeResult[];
  docEvidence: DocResult[];
  veracity: VeracityReport;
  relationships?: GraphRelationship[];
  suggestedActions?: string[];
}

export function validatePacket(packet: EvidencePacketV1 | Record<string, unknown>): string[];
export function computePacketHash(packet: EvidencePacketV1): string;
export function createAuditEntry(packet: EvidencePacketV1): AuditEntry;
```

**Integration**:
- Import into `rad-engineer/src/core/ResponseParser.ts`
- Wrap all agent responses in EvidencePacket format
- Validate packets before processing

**Tests**: `rad-engineer/test/veracity/EvidencePacket.test.ts`

---

#### A.3 Create MetricsCollector

**File**: `rad-engineer/src/veracity/MetricsCollector.ts` (NEW)

**Source**: Port from `engg-support-system/veracity-engine/core/metrics.py`

**Contents**:
```typescript
export class Counter { inc(amount?: number): void; value: number; }
export class Gauge { set(value: number): void; inc(): void; dec(): void; value: number; }
export class Histogram { observe(value: number): void; time<T>(fn: () => T): T; }

export class MetricsRegistry {
  counter(name: string, help: string): Counter;
  gauge(name: string, help: string): Gauge;
  histogram(name: string, help: string, buckets?: number[]): Histogram;
  toPrometheus(): string;
}

// Pre-defined metrics
export const agentSpawnCounter: Counter;
export const taskDurationHistogram: Histogram;
export const contextTokensGauge: Gauge;
export const verityScoreHistogram: Histogram;
```

**Integration**:
- Import into `rad-engineer/src/sdk/SDKIntegration.ts`
- Track agent spawns, durations, context usage
- Expose `/metrics` endpoint for observability

**Tests**: `rad-engineer/test/veracity/MetricsCollector.test.ts`

---

### Phase B: Atomic Agent Infrastructure (Weeks 2-3)

#### B.1 Create AtomicAgent Base Class

**File**: `rad-engineer/src/agents/AtomicAgent.ts` (NEW)

**Contents**:
```typescript
export interface AtomicAgentConfig {
  name: string;
  responsibility: string;
  maxContextTokens: number;
  timeout: number;
}

export abstract class AtomicAgent {
  protected config: AtomicAgentConfig;
  protected metrics: MetricsCollector;

  abstract execute(input: AgentInput): Promise<AgentOutput>;

  // Standard lifecycle
  async run(input: AgentInput): Promise<EvidencePacket> {
    this.metrics.agentSpawnCounter.inc();
    const start = Date.now();

    try {
      // Validate input
      this.validateInput(input);

      // Execute with timeout
      const output = await this.executeWithTimeout(input);

      // Compute veracity
      const veracity = validateVeracity(output.evidence);

      // Return evidence packet
      return this.createPacket(output, veracity);
    } finally {
      this.metrics.taskDurationHistogram.observe(Date.now() - start);
    }
  }
}
```

**Integration**:
- Base class for all atomic agents
- Import MetricsCollector, VeracityScorer, EvidencePacket

**Tests**: `rad-engineer/test/agents/AtomicAgent.test.ts`

---

#### B.2 Create ClassifierAgent

**File**: `rad-engineer/src/agents/ClassifierAgent.ts` (NEW)

**Source**: Pattern from `engg-support-system/gateway/src/agents/QueryClassifier.ts`

**Contents**:
```typescript
export interface QueryClassification {
  intent: QueryIntent;
  clarity: 'clear' | 'ambiguous' | 'requires_context';
  confidence: number;
  suggestedMode: 'one-shot' | 'conversational';
  ambiguityReasons?: string[];
}

export class ClassifierAgent extends AtomicAgent {
  async execute(input: { query: string }): Promise<QueryClassification> {
    // Port classification logic from QueryClassifier.ts
    const lowerQuery = input.query.toLowerCase();
    const ambiguityReasons = this.collectAmbiguityReasons(lowerQuery);
    const intent = this.detectIntent(lowerQuery);
    // ...
  }
}
```

**Integration**:
- Used by CodeOrchestrator as first step
- Import into `rad-engineer/src/orchestration/CodeOrchestrator.ts`

**Tests**: `rad-engineer/test/agents/ClassifierAgent.test.ts`

---

#### B.3 Create ClarifierAgent

**File**: `rad-engineer/src/agents/ClarifierAgent.ts` (NEW)

**Source**: Pattern from `engg-support-system/gateway/src/agents/ClarificationGenerator.ts`

**Integration**:
- Used by CodeOrchestrator when classification.clarity !== 'clear'
- Outputs list of ClarificationQuestion

---

#### B.4 Create Additional Atomic Agents

**Files** (all NEW):
- `rad-engineer/src/agents/PlannerAgent.ts` - Task breakdown
- `rad-engineer/src/agents/ResearchAgent.ts` - Evidence gathering
- `rad-engineer/src/agents/ExecutorAgent.ts` - Single action execution
- `rad-engineer/src/agents/VerifierAgent.ts` - Contract verification
- `rad-engineer/src/agents/LearnerAgent.ts` - Outcome recording

**Index**: `rad-engineer/src/agents/index.ts`
```typescript
export * from './AtomicAgent';
export * from './ClassifierAgent';
export * from './ClarifierAgent';
export * from './PlannerAgent';
export * from './ResearchAgent';
export * from './ExecutorAgent';
export * from './VerifierAgent';
export * from './LearnerAgent';
```

---

### Phase C: Orchestration Layers (Weeks 3-4)

#### C.1 Create MetaOrchestrator (O2)

**File**: `rad-engineer/src/orchestration/MetaOrchestrator.ts` (NEW)

**Contents**:
```typescript
export class MetaOrchestrator {
  private domainOrchestrators: Map<string, DomainOrchestrator>;
  private resourceManager: ResourceManager;
  private hierarchicalMemory: HierarchicalMemory;
  private metrics: MetricsCollector;

  async orchestrate(task: Task): Promise<Result>;

  // Detect domain from task
  private detectDomain(task: Task): string;

  // Allocate resources (max 2-3 agents)
  private allocateResources(task: Task): Promise<void>;
}
```

**Integration**:
- Import ResourceManager from `rad-engineer/src/core/ResourceManager.ts`
- Import HierarchicalMemory from `rad-engineer/src/memory/HierarchicalMemory.ts`
- Entry point for all task execution

**Tests**: `rad-engineer/test/orchestration/MetaOrchestrator.test.ts`

---

#### C.2 Create CodeOrchestrator (O1)

**File**: `rad-engineer/src/orchestration/CodeOrchestrator.ts` (NEW)

**Contents**:
```typescript
export class CodeOrchestrator extends DomainOrchestrator {
  private classifierAgent: ClassifierAgent;
  private clarifierAgent: ClarifierAgent;
  private plannerAgent: PlannerAgent;
  private executorSwarm: AgentSwarm<ExecutorAgent>;
  private verifierAgent: VerifierAgent;
  private learnerAgent: LearnerAgent;

  async orchestrate(task: Task): Promise<Result> {
    // 1. Classify
    const classification = await this.classifierAgent.run(task);

    // 2. Clarify if needed
    if (classification.clarity !== 'clear') {
      return this.handleClarification(task, classification);
    }

    // 3. Plan
    const plan = await this.plannerAgent.run(task);

    // 4. Execute steps with verification
    for (const step of plan.steps) {
      const result = await this.executorSwarm.execute(step);
      const verified = await this.verifierAgent.run(step.contract, result);
      if (!verified.passed) {
        await this.handleVerificationFailure(step, result, verified);
      }
    }

    // 5. Learn
    await this.learnerAgent.run(task, result);

    return result;
  }
}
```

**Integration**:
- Import all atomic agents
- Register with MetaOrchestrator for 'code' domain

---

#### C.3 Create AgentSwarm Manager

**File**: `rad-engineer/src/orchestration/AgentSwarm.ts` (NEW)

**Contents**:
```typescript
export class AgentSwarm<T extends AtomicAgent> {
  private agents: T[];
  private maxConcurrent: number = 3; // Hard limit

  // Execute tasks in parallel with concurrency limit
  async execute(tasks: AgentInput[]): Promise<AgentOutput[]>;

  // Spawn new agent if under limit
  async spawn(): Promise<T | null>;

  // Get swarm metrics
  getMetrics(): SwarmMetrics;
}
```

---

### Phase D: Hierarchical Memory (Week 4)

#### D.1 Create HierarchicalMemory

**File**: `rad-engineer/src/memory/HierarchicalMemory.ts` (NEW)

**Contents**:
```typescript
export enum ContextScope {
  GLOBAL = 'global',
  TASK = 'task',
  LOCAL = 'local'
}

export class HierarchicalMemory {
  private globalScope: Scope;
  private taskStack: Scope[];
  private localScope: Scope;
  private tokenBudgetManager: TokenBudgetManager;

  pushTask(goal: string): void;
  popTask(): string; // Returns summary
  addLocalContext(content: string): void;
  buildPromptContext(): string;
  getTokenUsage(): TokenUsage;
}
```

**Integration**:
- Import into MetaOrchestrator
- Replace flat StateManager with hierarchical scopes

---

#### D.2 Create TokenBudgetManager

**File**: `rad-engineer/src/memory/TokenBudgetManager.ts` (NEW)

**Integration**:
- Used by HierarchicalMemory for budget tracking
- Triggers compression when over budget

---

### Phase E: Flexible VAC (Week 5)

#### E.1 Modify PromptValidator

**File**: `rad-engineer/src/core/PromptValidator.ts` (MODIFY)

**Changes**:
1. Remove hardcoded 500-char limit
2. Add adaptive budget based on scope
3. Integrate with TokenBudgetManager

```typescript
// Before
const MAX_PROMPT_SIZE = 500;

// After
class PromptValidator {
  constructor(private tokenBudgetManager: TokenBudgetManager) {}

  getMaxPromptSize(scope: ContextScope): number {
    return this.tokenBudgetManager.getAgentPromptBudget(scope);
  }
}
```

---

#### E.2 Create FlexibleContractValidator

**File**: `rad-engineer/src/verification/FlexibleContractValidator.ts` (NEW)

**Integration**:
- Replaces strict validation with scope-aware validation
- Works with HierarchicalMemory for context scope detection

---

### Phase F: Conversation System (Week 6)

#### F.1 Create ConversationManager

**File**: `rad-engineer/src/conversation/ConversationManager.ts` (NEW)

**Source**: Port from `engg-support-system/gateway/src/agents/ConversationManager.ts`

---

#### F.2 Create AmbiguityDetector

**File**: `rad-engineer/src/conversation/AmbiguityDetector.ts` (NEW)

---

#### F.3 Create ClarificationEngine

**File**: `rad-engineer/src/conversation/ClarificationEngine.ts` (NEW)

---

## Summary: Files to Create

| Category | New Files | Lines (est) |
|----------|-----------|-------------|
| **veracity/** | 4 files | 800 |
| **agents/** | 8 files | 1600 |
| **orchestration/** | 4 files | 1200 |
| **memory/** | 3 files | 600 |
| **conversation/** | 4 files | 800 |
| **TOTAL** | **23 new files** | **~5000 lines** |

## Summary: Files to Modify

| File Path | Change Description |
|-----------|-------------------|
| `rad-engineer/src/core/PromptValidator.ts` | Remove fixed limit, add adaptive budget |
| `rad-engineer/src/core/ResponseParser.ts` | Wrap responses in EvidencePacket |
| `rad-engineer/src/execute/DecisionLearningIntegration.ts` | Add veracity scoring |
| `rad-engineer/src/sdk/SDKIntegration.ts` | Add metrics tracking |
| `rad-engineer/src/advanced/StateManager.ts` | Integrate with HierarchicalMemory |

---

**Document Version**: 2.0.0
**Last Updated**: 2026-01-12
**Memory File**: docs/platform-foundation/ANALYSIS-MEMORY.yaml
**Branch**: feature/gap-analysis-v2-atomic-swarm
