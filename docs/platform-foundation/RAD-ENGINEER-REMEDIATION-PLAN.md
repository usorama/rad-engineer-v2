# RAD-ENGINEER REMEDIATION PLAN (Non-Overlapping Issues)

> **Purpose**: Execution plan for issues NOT covered by PRODUCTION_READINESS_ACTION_PLAN.md
> **Date**: 2026-01-14
> **Companion Plan**: `.claude/orchestration/docs/planning/PRODUCTION_READINESS_ACTION_PLAN.md`
> **Source Documents**:
> - `RAD-ENGINEER-CODEBASE-ISSUES.md` (67 issues identified)
> - `DETERMINISTIC-SAFEGUARDS-FOR-IMPLEMENTATIONS.md` (6 safeguard mechanisms)

---

## SCOPE CLARIFICATION

This plan covers issues **NOT addressed** by the existing PRODUCTION_READINESS_ACTION_PLAN.md:

| Already Covered (Skip) | NEW - This Plan |
|------------------------|-----------------|
| Mock agent in WaveOrchestrator | UI-adapter mock handlers (4 files) |
| Cross-platform ResourceMonitor | Silent failure patterns (4 files) |
| Centralized config system | Type safety violations (4 files) |
| Structured logging (pino) | Test coverage for uncovered modules |
| Prometheus metrics | VAC self-verification |
| Health checks | Determinism enforcement |
| Rate limiting | Contract templates |
| StateManager.compact() | Property test generation |
| File locking | Drift monitoring |
| Graceful shutdown | - |
| Distributed tracing | - |
| Integration/Load/Chaos testing | - |

**This plan: 4 Waves, 22 Stories, ~2 weeks**

---

## WAVE 1: UI-ADAPTER MOCK IMPLEMENTATIONS (Priority: CRITICAL)

**Objective**: Replace Phase 1 mock implementations in UI-adapter handlers

> Note: WaveOrchestrator mock→real is covered by W2-S1 in PRODUCTION_READINESS_ACTION_PLAN.md

### Story 1.1: VACAPIHandler Real Integration
**File**: `src/ui-adapter/VACAPIHandler.ts`
**Current State**: Returns hardcoded mock contracts (lines 224-261)
**Target State**: Integrates with `ContractRegistry` from `src/verification/ContractRegistry.ts`

**Tasks**:
- [ ] Import ContractRegistry and ContractValidator
- [ ] Replace `getAllContracts()` mock with `registry.getAllContracts()`
- [ ] Replace `getContract()` mock with `registry.getContract(id)`
- [ ] Replace `createContract()` mock with `registry.registerContract()`
- [ ] Replace `updateContract()` mock with `registry.updateContract()`
- [ ] Replace `deleteContract()` mock with `registry.unregisterContract()`
- [ ] Replace `runVerification()` mock with `ContractValidator.evaluate()`
- [ ] Replace `checkDrift()` mock with `DriftDetector.measureDrift()`
- [ ] Replace `compareAST()` mock with `ASTComparator.compare()`

**Acceptance Criteria**:
- All 10 methods return real data from verification system
- No hardcoded mock data remains
- Unit tests pass with real integrations

**VAC Contract**:
```typescript
{
  id: "vac-api-handler-integration",
  preconditions: ["ContractRegistry is initialized", "ContractValidator is available"],
  postconditions: ["getAllContracts returns contracts from registry", "No mock data in responses"]
}
```

---

### Story 1.2: ExecutionAPIHandler Real Integration
**File**: `src/ui-adapter/ExecutionAPIHandler.ts`
**Current State**: Returns mock status (45%), mock agents, mock metrics (lines 173-285)
**Target State**: Integrates with `WaveOrchestrator` and `StateManager`

**Tasks**:
- [ ] Import WaveOrchestrator from `src/advanced/WaveOrchestrator.ts`
- [ ] Import StateManager from `src/advanced/StateManager.ts`
- [ ] Replace `getExecutionStatus()` mock with `stateManager.getCurrentState()`
- [ ] Replace `getWaveStatus()` mock with `orchestrator.getWaveStatus()`
- [ ] Replace `getAgentStatus()` mock with real agent metrics
- [ ] Replace `getQualityGates()` mock with actual gate results
- [ ] Replace `startExecution()` mock with `orchestrator.execute()`
- [ ] Replace `pauseExecution()` mock with `orchestrator.pause()`
- [ ] Replace `resumeExecution()` mock with `orchestrator.resume()`
- [ ] Replace `cancelExecution()` mock with `orchestrator.cancel()`
- [ ] Replace `retryTask()` mock with `orchestrator.retryTask()`
- [ ] Replace `getTimeline()` mock with real execution events
- [ ] Wire up all event emissions to real execution events

**Acceptance Criteria**:
- `getExecutionStatus()` returns actual progress percentage (not hardcoded 45%)
- `getWaveStatus()` returns real agent states
- Events emit real execution data

---

### Story 1.3: LearningAPIHandler Real Integration
**File**: `src/ui-adapter/LearningAPIHandler.ts`
**Current State**: Returns mock decision history, mock analytics, mock patterns (lines 254-693)
**Target State**: Integrates with `DecisionLearningStore` and `DecisionTracker`

**Tasks**:
- [ ] Import DecisionLearningStore from `src/decision/DecisionLearningStore.ts`
- [ ] Import DecisionTracker from `src/decision/DecisionTracker.ts`
- [ ] Replace `getDecisionHistory()` mock with `store.getDecisions()`
- [ ] Replace `getLearningAnalytics()` mock with calculated analytics from store
- [ ] Replace `getPatterns()` mock with `store.findSimilarDecisions()`
- [ ] Replace `getQualityTrends()` mock with actual trend data from store
- [ ] Replace `getEWCCurves()` mock with real EWC calculations
- [ ] Replace `searchDecisions()` mock with `store.searchByEmbedding()`
- [ ] Replace `getRecommendations()` mock with pattern-based recommendations
- [ ] Replace `getConfidenceDistribution()` mock with real distribution

**Acceptance Criteria**:
- Decision history reflects actual tracked decisions
- Analytics are calculated from real data
- Patterns come from vector similarity search

---

### Story 1.4: PlanningAPIHandler Real Integration
**File**: `src/ui-adapter/PlanningAPIHandler.ts`
**Current State**: Mock intake sessions, mock research agents, mock plans (lines 159-737)
**Target State**: Integrates with `IntakeHandler`, `ResearchCoordinator`, `ExecutionPlanGenerator`

**Tasks**:
- [ ] Import IntakeHandler from `src/plan/IntakeHandler.ts`
- [ ] Import ResearchCoordinator from `src/plan/ResearchCoordinator.ts`
- [ ] Import ExecutionPlanGenerator from `src/plan/ExecutionPlanGenerator.ts`
- [ ] Replace `startIntake()` mock with `intakeHandler.start()`
- [ ] Replace `processIntakeResponse()` mock with `intakeHandler.process()`
- [ ] Replace `getIntakeStatus()` mock with `intakeHandler.getStatus()`
- [ ] Replace `startResearch()` mock with `researchCoordinator.coordinate()`
- [ ] Replace `getResearchStatus()` mock with `researchCoordinator.getStatus()`
- [ ] Replace `generatePlan()` mock with `planGenerator.generate()`
- [ ] Replace `validatePlan()` mock with actual validation
- [ ] Replace `savePlan()` mock with persistence layer

**Acceptance Criteria**:
- Intake sessions are persisted and stateful
- Research agents execute real research tasks
- Generated plans follow ExecutionPlan schema

---

## WAVE 2: SILENT FAILURE FIXES (Priority: HIGH)

**Objective**: Replace all silent failures with proper error propagation

> Note: Structured logging replacement is covered by W3-S1 in PRODUCTION_READINESS_ACTION_PLAN.md.
> This wave focuses on the **error handling logic**, not the logging mechanism.

### Story 2.1: DecisionLearningIntegration Error Handling
**File**: `src/execute/DecisionLearningIntegration.ts`
**Current State**: 8 catch blocks with `console.warn` and continue (lines 199, 209, 227, 285, 290, 293, 370, 474)
**Target State**: Fail-fast with structured errors or explicit partial results

**Tasks**:
- [ ] Create `DecisionLearningError` class with error codes:
  - `OUTCOME_EXTRACTION_FAILED`
  - `METHOD_SELECTION_FAILED`
  - `DECISION_TRACKING_FAILED`
  - `ADR_UPDATE_FAILED`
- [ ] Replace line 199 catch: return partial result with `errors` field
- [ ] Replace line 209 catch: use default method with `warnings` field
- [ ] Replace line 227 catch: propagate tracking failure or mark as untracked
- [ ] Replace line 285 catch: propagate ADR update failure
- [ ] Add `errors` and `warnings` fields to `EnhancedPromptResult` type
- [ ] Callers can check `result.errors.length > 0` for partial failures

**VAC Contract**:
```typescript
{
  id: "decision-learning-error-handling",
  preconditions: [],
  postconditions: [
    "No silent data loss",
    "All errors included in result.errors array",
    "Partial failures distinguishable from full failures"
  ],
  invariants: ["No console.warn calls in production code paths"]
}
```

---

### Story 2.2: DecisionLearningStore Error Handling
**File**: `src/decision/DecisionLearningStore.ts`
**Current State**: Returns empty arrays on failure (lines 229, 246, 721, 801)
**Target State**: Returns error objects with data

**Tasks**:
- [ ] Create `QueryResult<T>` type:
  ```typescript
  type QueryResult<T> = {
    data: T;
    error?: string;
    partial?: boolean;
    truncated?: boolean;
  }
  ```
- [ ] Replace line 229 `return []` with `return { data: [], error: "INVALID_FILTER" }`
- [ ] Replace line 246 `return []` with `return { data: partial, error: "QUERY_TIMEOUT", partial: true }`
- [ ] Replace line 721 embedding failure with retry logic (max 3)
- [ ] Replace line 801 null return with explicit `{ data: null, error: "NOT_FOUND" }`

**Acceptance Criteria**:
- Callers can distinguish "no results" from "query failed"
- Timeouts return partial results with warning
- Embedding failures retry before failing

---

### Story 2.3: DecisionTracker Error Handling
**File**: `src/decision/DecisionTracker.ts`
**Current State**: Silent failures on ADR operations (lines 434, 492, 497, 524, 594, 668, 671, 721, 789, 794)
**Target State**: Explicit error handling with transaction semantics

**Tasks**:
- [ ] Replace line 524 warn with `ValidationError` throw
- [ ] Replace line 594 warn with duplicate handling strategy (update vs ignore)
- [ ] Replace line 668-671 timeout with configurable retry (default 3)
- [ ] Add transaction wrapper for multi-step operations:
  ```typescript
  async recordWithRollback(adr: ADR): Promise<void> {
    const checkpoint = await this.checkpoint();
    try {
      await this.store(adr);
      await this.syncToDecisionStore(adr);
    } catch (error) {
      await this.restore(checkpoint);
      throw error;
    }
  }
  ```
- [ ] Expose `lastError` property for debugging

---

### Story 2.4: OutcomeInjector Error Handling
**File**: `src/outcome/OutcomeInjector.ts`
**Current State**: 13 silent failure modes with console.warn (lines 133, 140, 153, 159, 182, 189, 193, 212, 221, 226, 246, 277, 280)
**Target State**: Structured error responses

**Tasks**:
- [ ] Create `InjectionResult` type:
  ```typescript
  type InjectionResult = {
    success: boolean;
    enhancedPrompt: string;
    warnings: InjectionWarning[];
    errors: InjectionError[];
    metrics: { injectionTimeMs: number };
  }
  ```
- [ ] Replace line 133 `NO_OUTCOMES_PROVIDED` as warning, not silent continue
- [ ] Replace line 140 `INVALID_OUTCOME_FORMAT` as error with invalid items listed
- [ ] Replace line 182 `METHOD_SELECTION_TIMEOUT` with configurable fallback
- [ ] Replace line 193 `STORE_UNAVAILABLE` with circuit breaker pattern
- [ ] Add telemetry: `injection_success_rate`, `injection_warning_count`

---

## WAVE 3: TYPE SAFETY FIXES (Priority: HIGH)

**Objective**: Replace all `any` types with proper TypeScript types

### Story 3.1: StateManager Type Safety
**File**: `src/adaptive/StateManager.ts`
**Current State**: `any` types in YAML serialization (lines 160, 190, 193, 197)

**Tasks**:
- [ ] Define `SerializedState` interface:
  ```typescript
  interface SerializedState {
    version: string;
    timestamp: string;
    bandits: Record<string, BanditState>;
    performance: Record<string, PerformanceMetrics>;
    decisions: DecisionRecord[];
  }
  ```
- [ ] Replace `toYAML(state: any)` with `toYAML(state: AdaptiveState)`
- [ ] Replace `fromYAML(): any` with `fromYAML(): SerializedState | null`
- [ ] Add Zod schema for runtime validation of loaded state
- [ ] Replace `currentStats: any` with `currentStats: PerformanceStats | null`
- [ ] Add migration logic for old state versions

---

### Story 3.2: SDKIntegration Type Safety
**File**: `src/sdk/SDKIntegration.ts`
**Current State**: `as any` casts and untyped parameters (lines 445, 473-475)

**Tasks**:
- [ ] Define `EVALSConfig` type:
  ```typescript
  interface EVALSConfig {
    banditRouter: BanditRouter;
    featureExtractor: QueryFeatureExtractor;
    performanceStore: PerformanceStore;
    enabled: boolean;
  }
  ```
- [ ] Replace line 445 `return config as any` with typed return
- [ ] Replace lines 473-475 untyped parameters with proper types
- [ ] Add type guard for EVALS availability:
  ```typescript
  isEvalsAvailable(): this is { evalsConfig: EVALSConfig } { ... }
  ```

---

### Story 3.3: EventBroadcaster Type Safety
**File**: `src/ui-adapter/EventBroadcaster.ts`
**Current State**: `any` event data (lines 85, 167, 205)

**Tasks**:
- [ ] Define event payload types:
  ```typescript
  type EventPayload =
    | { type: 'wave-started'; data: WaveStartedEvent }
    | { type: 'task-completed'; data: TaskCompletedEvent }
    | { type: 'quality-gate-result'; data: QualityGateEvent }
    | { type: 'error'; data: ErrorEvent };
  ```
- [ ] Replace `pendingEvent: any` with `pendingEvent: EventPayload | null`
- [ ] Replace `broadcast(eventType: string, data: any)` with typed overloads
- [ ] Add discriminated union for type-safe event handling in consumers

---

### Story 3.4: TaskAPIHandler Type Safety
**File**: `src/ui-adapter/TaskAPIHandler.ts`
**Current State**: `any` in wave execution (lines 516, 519)

**Tasks**:
- [ ] Import `Wave` and `Story` types from `src/plan/types.ts`
- [ ] Replace `wave: any` with `wave: Wave`
- [ ] Replace `story: any` with `story: Story`
- [ ] Add runtime validation with Zod before execution:
  ```typescript
  const validated = WaveSchema.parse(wave);
  ```

---

## WAVE 4: SELF-VERIFICATION & DETERMINISM (Priority: MEDIUM)

**Objective**: Apply rad-engineer's verification tools to itself

> Note: Test coverage for new code is covered by PRODUCTION_READINESS_ACTION_PLAN.md.
> This wave focuses on **verification infrastructure** and **determinism enforcement**.

### Story 4.1: VAC Self-Contracts
**New Files**: `src/verification/self-contracts/`

**Tasks**:
- [ ] Create contract for VACAPIHandler:
  ```typescript
  // src/verification/self-contracts/vac-api-handler.contract.ts
  export const VACAPIHandlerContract: AgentContractDefinition = {
    id: "self-vac-api-handler",
    taskType: "implement_feature",
    preconditions: [{ id: "registry-available", check: ... }],
    postconditions: [{ id: "no-mock-data", check: ... }],
  };
  ```
- [ ] Create contract for ExecutionAPIHandler
- [ ] Create contract for LearningAPIHandler
- [ ] Create contract for PlanningAPIHandler
- [ ] Add CI step: `bun run verify:self-contracts`

---

### Story 4.2: Reproducibility Gate for UI-Adapters
**New File**: `src/verification/gates/UIAdapterReproducibilityGate.ts`

**Tasks**:
- [ ] Create reproducibility tests for UI-adapter handlers:
  ```typescript
  const gate = new ReproducibilityGate({
    targets: [
      { handler: 'VACAPIHandler', method: 'getAllContracts', runs: 10 },
      { handler: 'ExecutionAPIHandler', method: 'getExecutionStatus', runs: 10 },
    ],
    maxDriftRate: 0.05, // 5%
  });
  ```
- [ ] Enforce drift < 5% for all public methods
- [ ] Generate drift report on failure
- [ ] Add to quality gate: `bun run verify:ui-adapter-reproducibility`

---

### Story 4.3: Determinism Lint Rules
**File**: `.eslintrc.js` or `eslint.config.js`

**Tasks**:
- [ ] Create custom ESLint rule `no-math-random`:
  ```javascript
  // Disallow Math.random() - use SeededRandom instead
  'no-restricted-syntax': [
    'error',
    { selector: 'CallExpression[callee.object.name="Math"][callee.property.name="random"]' }
  ]
  ```
- [ ] Create rule `no-date-now-in-id`:
  ```javascript
  // Disallow Date.now() in ID generation
  ```
- [ ] Create rule `no-crypto-random-uuid`:
  ```javascript
  // Disallow crypto.randomUUID() - use deterministicHash instead
  ```
- [ ] Add to CI: `bun run lint:determinism`

---

### Story 4.4: Contract Templates for Generated Code
**New Files**: `src/verification/templates/`

**Tasks**:
- [ ] Create `api-endpoint.contract.template.ts`:
  ```typescript
  export function createAPIEndpointContract(config: {
    endpoint: string;
    method: string;
    inputSchema: ZodSchema;
    outputSchema: ZodSchema;
  }): AgentContractDefinition { ... }
  ```
- [ ] Create `database-operation.contract.template.ts`
- [ ] Create `state-mutation.contract.template.ts`
- [ ] Create `external-integration.contract.template.ts`
- [ ] Document usage in `src/verification/templates/README.md`

---

## IMPLEMENTATION SCHEDULE

| Wave | Stories | Estimated Effort | Dependencies |
|------|---------|------------------|--------------|
| Wave 1 | 1.1-1.4 | 4 days | PRODUCTION_READINESS W2-S1 (real agents) |
| Wave 2 | 2.1-2.4 | 3 days | PRODUCTION_READINESS W3-S1 (logging) |
| Wave 3 | 3.1-3.4 | 2 days | None |
| Wave 4 | 4.1-4.4 | 3 days | Waves 1-3 |

**Total**: ~12 days (2 weeks)

---

## DEPENDENCY ON PRODUCTION_READINESS_ACTION_PLAN.md

This plan should be executed **after** or **in parallel with** certain waves from the existing plan:

| This Plan | Depends On |
|-----------|-----------|
| Wave 1 (UI-Adapter Mocks) | W2-S1 (Real agent spawning) - so handlers can use real orchestrator |
| Wave 2 (Silent Failures) | W3-S1 (Structured logging) - so we can log errors properly |
| Wave 3 (Type Safety) | None - can run independently |
| Wave 4 (Self-Verification) | Waves 1-3 of this plan |

**Recommended Execution Order**:
1. PRODUCTION_READINESS Waves 1-3 (Foundation, Real Agent, Observability)
2. This Plan Waves 1-3 (UI-Adapters, Silent Failures, Type Safety)
3. PRODUCTION_READINESS Waves 4-6 (Reliability, Security, Integration)
4. This Plan Wave 4 (Self-Verification)

---

## SUCCESS CRITERIA

### This Plan Complete When:
- [ ] All 4 UI-adapter handlers return real data (0 mock implementations)
- [ ] All 15+ silent failures converted to explicit errors with result types
- [ ] All 25+ `any` types replaced with proper types
- [ ] Self-contracts pass for all UI-adapters
- [ ] Determinism lint rules active in CI
- [ ] Reproducibility gate enforced (drift < 5%)

### Combined Success (Both Plans):
- [ ] rad-engineer passes its own verification system
- [ ] rad-engineer can generate verified external systems
- [ ] All generated systems meet the same standards

---

## VERIFICATION

After completing this plan, run:

```bash
# 1. Type check (should be 0 errors after Wave 3)
bun run typecheck

# 2. Lint including determinism rules (after Story 4.3)
bun run lint

# 3. Self-contracts (after Story 4.1)
bun run verify:self-contracts

# 4. Reproducibility gate (after Story 4.2)
bun run verify:ui-adapter-reproducibility

# 5. Integration with PRODUCTION_READINESS tests
bun test
```

---

## FILES TO MODIFY

### Wave 1 Files (UI-Adapter Mocks)
- `src/ui-adapter/VACAPIHandler.ts`
- `src/ui-adapter/ExecutionAPIHandler.ts`
- `src/ui-adapter/LearningAPIHandler.ts`
- `src/ui-adapter/PlanningAPIHandler.ts`

### Wave 2 Files (Silent Failures)
- `src/execute/DecisionLearningIntegration.ts`
- `src/decision/DecisionLearningStore.ts`
- `src/decision/DecisionTracker.ts`
- `src/outcome/OutcomeInjector.ts`

### Wave 3 Files (Type Safety)
- `src/adaptive/StateManager.ts`
- `src/sdk/SDKIntegration.ts`
- `src/ui-adapter/EventBroadcaster.ts`
- `src/ui-adapter/TaskAPIHandler.ts`

### Wave 4 Files (New)
- `src/verification/self-contracts/*.contract.ts`
- `src/verification/gates/UIAdapterReproducibilityGate.ts`
- `.eslintrc.js` or `eslint.config.js`
- `src/verification/templates/*.template.ts`

---

**Document Version**: 2.0 (Non-Overlapping)
**Status**: READY FOR EXECUTION
**Companion Plan**: `.claude/orchestration/docs/planning/PRODUCTION_READINESS_ACTION_PLAN.md`
**Related Documents**:
- `RAD-ENGINEER-CODEBASE-ISSUES.md`
- `DETERMINISTIC-SAFEGUARDS-FOR-IMPLEMENTATIONS.md`
