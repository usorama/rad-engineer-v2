# RAD-ENGINEER COMPREHENSIVE REMEDIATION PLAN

> **Purpose**: Execution plan to fix all identified issues and establish deterministic safeguards
> **Date**: 2026-01-14
> **Source Documents**:
> - `RAD-ENGINEER-CODEBASE-ISSUES.md` (67 issues)
> - `DETERMINISTIC-SAFEGUARDS-FOR-IMPLEMENTATIONS.md` (6 safeguard mechanisms)
> **Approach**: Fix rad-engineer using its own verification infrastructure

---

## EXECUTIVE SUMMARY

This plan addresses two perspectives:

| Perspective | Goal | Waves | Stories |
|-------------|------|-------|---------|
| **Internal** | Fix rad-engineer's own implementation issues | 4 | 22 |
| **External** | Ensure rad-engineer produces verified systems | 2 | 8 |
| **Total** | | **6 Waves** | **30 Stories** |

**Key Principle**: Apply VAC (Verifiable Agentic Contracts) to rad-engineer itself before using it to generate external systems.

---

## PHASE 1: INTERNAL REMEDIATION (Waves 1-4)

### Wave 1: Critical Mock Implementations (Priority: CRITICAL)

**Objective**: Replace all Phase 1 mock implementations with real integrations

#### Story 1.1: VACAPIHandler Real Integration
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
  preconditions: [
    "ContractRegistry is initialized",
    "ContractValidator is available"
  ],
  postconditions: [
    "getAllContracts returns contracts from registry",
    "No mock data in responses",
    "All methods are tested with real data"
  ]
}
```

---

#### Story 1.2: ExecutionAPIHandler Real Integration
**File**: `src/ui-adapter/ExecutionAPIHandler.ts`
**Current State**: Returns mock status (45%), mock agents, mock metrics
**Target State**: Integrates with `WaveOrchestrator` and `StateManager`

**Tasks**:
- [ ] Import WaveOrchestrator from `src/advanced/WaveOrchestrator.ts`
- [ ] Import StateManager from `src/advanced/StateManager.ts`
- [ ] Replace `getExecutionStatus()` mock with `stateManager.getCurrentState()`
- [ ] Replace `getWaveStatus()` mock with `orchestrator.getWaveStatus()`
- [ ] Replace `getAgentStatus()` mock with real agent metrics
- [ ] Replace `getQualityGates()` mock with actual gate results
- [ ] Wire up all event emissions to real execution events

**Acceptance Criteria**:
- `getExecutionStatus()` returns actual progress percentage
- `getWaveStatus()` returns real agent states
- Events emit real execution data

**VAC Contract**:
```typescript
{
  id: "execution-api-handler-integration",
  preconditions: [
    "WaveOrchestrator is initialized",
    "StateManager is available"
  ],
  postconditions: [
    "Progress reflects actual task completion",
    "Agent status reflects real agent state",
    "No mock data (45%, hardcoded agents) remains"
  ]
}
```

---

#### Story 1.3: LearningAPIHandler Real Integration
**File**: `src/ui-adapter/LearningAPIHandler.ts`
**Current State**: Returns mock decision history, mock analytics, mock patterns
**Target State**: Integrates with `DecisionLearningStore` and `DecisionTracker`

**Tasks**:
- [ ] Import DecisionLearningStore from `src/decision/DecisionLearningStore.ts`
- [ ] Import DecisionTracker from `src/decision/DecisionTracker.ts`
- [ ] Replace `getDecisionHistory()` mock with `store.getDecisions()`
- [ ] Replace `getLearningAnalytics()` mock with calculated analytics
- [ ] Replace `getPatterns()` mock with `store.findSimilarDecisions()`
- [ ] Replace `getQualityTrends()` mock with actual trend data
- [ ] Replace `getEWCCurves()` mock with real EWC calculations

**Acceptance Criteria**:
- Decision history reflects actual tracked decisions
- Analytics are calculated from real data
- Patterns come from vector similarity search

---

#### Story 1.4: PlanningAPIHandler Real Integration
**File**: `src/ui-adapter/PlanningAPIHandler.ts`
**Current State**: Mock intake sessions, mock research agents, mock plans
**Target State**: Integrates with `IntakeHandler`, `ResearchCoordinator`, `ExecutionPlanGenerator`

**Tasks**:
- [ ] Import IntakeHandler from `src/plan/IntakeHandler.ts`
- [ ] Import ResearchCoordinator from `src/plan/ResearchCoordinator.ts`
- [ ] Import ExecutionPlanGenerator from `src/plan/ExecutionPlanGenerator.ts`
- [ ] Replace `startIntake()` mock with `intakeHandler.start()`
- [ ] Replace `processIntakeResponse()` mock with `intakeHandler.process()`
- [ ] Replace `startResearch()` mock with `researchCoordinator.coordinate()`
- [ ] Replace `generatePlan()` mock with `planGenerator.generate()`

**Acceptance Criteria**:
- Intake sessions are persisted and stateful
- Research agents execute real research tasks
- Generated plans follow ExecutionPlan schema

---

### Wave 2: Silent Failure Fixes (Priority: HIGH)

**Objective**: Replace all silent failures with proper error propagation

#### Story 2.1: DecisionLearningIntegration Error Handling
**File**: `src/execute/DecisionLearningIntegration.ts`
**Current State**: 8 catch blocks with `console.warn` and continue
**Target State**: Fail-fast with structured errors

**Tasks**:
- [ ] Create `DecisionLearningError` class with error codes
- [ ] Replace line 199 catch: propagate or return partial result with error
- [ ] Replace line 209 catch: propagate or use default with warning flag
- [ ] Replace line 227 catch: propagate tracking failure
- [ ] Replace line 285 catch: propagate ADR update failure
- [ ] Add `errors` field to return type for partial failures
- [ ] Log errors with structured logger, not console.warn

**VAC Contract**:
```typescript
{
  id: "decision-learning-error-handling",
  preconditions: ["Logger is available"],
  postconditions: [
    "No console.warn calls remain",
    "All errors are either propagated or included in response",
    "Partial failures are distinguishable from full failures"
  ],
  invariants: ["No silent data loss"]
}
```

---

#### Story 2.2: DecisionLearningStore Error Handling
**File**: `src/decision/DecisionLearningStore.ts`
**Current State**: Returns empty arrays on failure (lines 229, 246)
**Target State**: Returns error objects or throws

**Tasks**:
- [ ] Create `QueryResult<T>` type with `data`, `error`, `partial` fields
- [ ] Replace `return []` with `return { data: [], error: message, partial: true }`
- [ ] Add timeout handling that preserves partial results with warning
- [ ] Replace embedding failures with retry or error propagation

---

#### Story 2.3: DecisionTracker Error Handling
**File**: `src/decision/DecisionTracker.ts`
**Current State**: Silent failures on ADR operations
**Target State**: Explicit error handling

**Tasks**:
- [ ] Replace line 524 warn with proper validation error
- [ ] Replace line 594 warn with duplicate handling strategy
- [ ] Replace line 668-671 timeout with retry or explicit failure
- [ ] Add transaction-like semantics for multi-step operations

---

#### Story 2.4: OutcomeInjector Error Handling
**File**: `src/outcome/OutcomeInjector.ts`
**Current State**: 13 silent failure modes with console.warn
**Target State**: Structured error responses

**Tasks**:
- [ ] Create `InjectionResult` type with `success`, `warnings`, `errors`
- [ ] Replace all console.warn with structured warnings
- [ ] Ensure callers can distinguish warnings from errors
- [ ] Add telemetry for injection success rate

---

### Wave 3: Type Safety Fixes (Priority: HIGH)

**Objective**: Replace all `any` types with proper TypeScript types

#### Story 3.1: StateManager Type Safety
**File**: `src/adaptive/StateManager.ts`
**Current State**: `any` types in YAML serialization (lines 160, 190, 193, 197)

**Tasks**:
- [ ] Define `SerializedState` interface for YAML structure
- [ ] Replace `toYAML(state: any)` with `toYAML(state: AdaptiveState)`
- [ ] Replace `fromYAML(): any` with `fromYAML(): SerializedState`
- [ ] Add Zod schema for runtime validation
- [ ] Remove `currentStats: any` with proper type

---

#### Story 3.2: SDKIntegration Type Safety
**File**: `src/sdk/SDKIntegration.ts`
**Current State**: `as any` casts and untyped parameters (lines 445, 473-475)

**Tasks**:
- [ ] Define proper types for EVALS integration points
- [ ] Replace `return config as any` with typed config
- [ ] Type `banditRouter`, `featureExtractor`, `performanceStore` parameters
- [ ] Add type guards for conditional type narrowing

---

#### Story 3.3: EventBroadcaster Type Safety
**File**: `src/ui-adapter/EventBroadcaster.ts`
**Current State**: `any` event data (lines 85, 167, 205)

**Tasks**:
- [ ] Define `EventPayload` union type for all event types
- [ ] Replace `pendingEvent: any` with `pendingEvent: EventPayload | null`
- [ ] Replace `broadcast(eventType: string, data: any)` with typed overloads
- [ ] Add discriminated union for type-safe event handling

---

#### Story 3.4: TaskAPIHandler Type Safety
**File**: `src/ui-adapter/TaskAPIHandler.ts`
**Current State**: `any` in wave execution (lines 516, 519)

**Tasks**:
- [ ] Import `Wave` type from `src/plan/types.ts`
- [ ] Replace `wave: any` with `wave: Wave`
- [ ] Replace `story: any` with `story: Story`
- [ ] Add validation for wave structure before execution

---

### Wave 4: Test Coverage (Priority: MEDIUM)

**Objective**: Increase test coverage from 5.5% to 80%

#### Story 4.1: Core Module Tests
**Target**: `src/core/` (ResourceManager, PromptValidator, ResponseParser)

**Tasks**:
- [ ] Create `src/core/__tests__/ResourceManager.test.ts`
- [ ] Create `src/core/__tests__/PromptValidator.test.ts`
- [ ] Create `src/core/__tests__/ResponseParser.test.ts`
- [ ] Achieve 80% coverage per file

---

#### Story 4.2: Advanced Module Tests
**Target**: `src/advanced/` (WaveOrchestrator, StateManager, ErrorRecoveryEngine)

**Tasks**:
- [ ] Create `src/advanced/__tests__/WaveOrchestrator.test.ts`
- [ ] Create `src/advanced/__tests__/StateManager.test.ts`
- [ ] Create `src/advanced/__tests__/ErrorRecoveryEngine.test.ts`
- [ ] Test state machine transitions exhaustively

---

#### Story 4.3: Verification Module Tests
**Target**: `src/verification/` (12 files, 0% coverage)

**Tasks**:
- [ ] Create tests for ContractValidator
- [ ] Create tests for PropertyTestRunner
- [ ] Create tests for DriftDetector
- [ ] Create tests for StateMachineExecutor
- [ ] Create tests for ReproducibilityTest

---

#### Story 4.4: Decision Module Tests
**Target**: `src/decision/` (DecisionTracker, DecisionLearningStore)

**Tasks**:
- [ ] Create `src/decision/__tests__/DecisionTracker.test.ts`
- [ ] Create `src/decision/__tests__/DecisionLearningStore.test.ts`
- [ ] Test vector similarity search
- [ ] Test ADR lifecycle

---

---

## PHASE 2: EXTERNAL SAFEGUARDS (Waves 5-6)

### Wave 5: Verification Infrastructure Activation

**Objective**: Enable verification infrastructure for all generated code

#### Story 5.1: VAC Contract Templates
**New File**: `src/verification/templates/`

**Tasks**:
- [ ] Create contract template for API endpoints
- [ ] Create contract template for database operations
- [ ] Create contract template for external integrations
- [ ] Create contract template for state mutations
- [ ] Document contract creation process

---

#### Story 5.2: Reproducibility Gate
**New File**: `src/verification/ReproducibilityGate.ts`

**Tasks**:
- [ ] Create gate that runs reproducibility test before deployment
- [ ] Enforce drift rate < 5% threshold
- [ ] Block deployment if drift detected
- [ ] Generate drift report for failed gates

---

#### Story 5.3: Determinism Enforcement
**Enhancement**: `src/adaptive/SeededRandom.ts`

**Tasks**:
- [ ] Create lint rule to detect `Math.random()` usage
- [ ] Create lint rule to detect `Date.now()` in IDs
- [ ] Create lint rule to detect `crypto.randomUUID()`
- [ ] Add SeededRandom injection to agent prompts

---

#### Story 5.4: Property Test Generation
**Enhancement**: `src/verification/PropertyTestRunner.ts`

**Tasks**:
- [ ] Auto-generate property tests from contracts
- [ ] Add idempotency property for all mutations
- [ ] Add no-negative-balance property for financial ops
- [ ] Add audit-complete property for all operations

---

### Wave 6: Quality Gates Integration

**Objective**: Enforce quality gates before any code is shipped

#### Story 6.1: Pre-Deployment Gate
**New File**: `src/gates/PreDeploymentGate.ts`

**Tasks**:
- [ ] Run all VAC contracts
- [ ] Run reproducibility test (N=10)
- [ ] Run property tests
- [ ] Check test coverage ≥ 80%
- [ ] Block if any gate fails

---

#### Story 6.2: Contract Coverage Report
**New File**: `src/gates/ContractCoverageReport.ts`

**Tasks**:
- [ ] Calculate contract coverage per feature
- [ ] Identify features without contracts
- [ ] Generate coverage report
- [ ] Block deployment if coverage < 100%

---

#### Story 6.3: Drift Monitoring
**New File**: `src/monitoring/DriftMonitor.ts`

**Tasks**:
- [ ] Run drift detection on schedule
- [ ] Alert on drift regression
- [ ] Track drift trends over time
- [ ] Auto-generate fix recommendations

---

#### Story 6.4: Type Safety Gate
**Enhancement**: Build process

**Tasks**:
- [ ] Add `--strict` to tsconfig if not present
- [ ] Add lint rule for `any` type usage
- [ ] Add lint rule for `as any` casts
- [ ] Block build on type violations

---

---

## IMPLEMENTATION SCHEDULE

| Wave | Stories | Estimated Effort | Dependencies |
|------|---------|------------------|--------------|
| Wave 1 | 1.1-1.4 | 5 days | None |
| Wave 2 | 2.1-2.4 | 3 days | None |
| Wave 3 | 3.1-3.4 | 2 days | None |
| Wave 4 | 4.1-4.4 | 5 days | Waves 1-3 |
| Wave 5 | 5.1-5.4 | 3 days | Wave 4 |
| Wave 6 | 6.1-6.4 | 3 days | Wave 5 |

**Total**: ~21 days (3 weeks)

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- [ ] All 12 mock handlers replaced with real integrations
- [ ] All 15+ silent failures converted to explicit errors
- [ ] All 25+ `any` types replaced with proper types
- [ ] Test coverage ≥ 80%

### Phase 2 Complete When:
- [ ] VAC contracts defined for all features
- [ ] Reproducibility gate enforced (drift < 5%)
- [ ] Property tests generated for all contracts
- [ ] Quality gates block non-compliant code

### Full Success When:
- [ ] rad-engineer passes its own verification system
- [ ] rad-engineer can generate verified external systems
- [ ] All generated systems meet the same standards

---

## VERIFICATION

After completing this plan, run:

```bash
# 1. Type check
bun run typecheck  # Must show 0 errors

# 2. Lint
bun run lint  # Must pass

# 3. Tests
bun test  # All pass, coverage ≥ 80%

# 4. Reproducibility
bun run verify:reproducibility  # Drift < 5%

# 5. Contracts
bun run verify:contracts  # All pass
```

---

## APPENDIX: FILES TO MODIFY

### Wave 1 Files
- `src/ui-adapter/VACAPIHandler.ts`
- `src/ui-adapter/ExecutionAPIHandler.ts`
- `src/ui-adapter/LearningAPIHandler.ts`
- `src/ui-adapter/PlanningAPIHandler.ts`

### Wave 2 Files
- `src/execute/DecisionLearningIntegration.ts`
- `src/decision/DecisionLearningStore.ts`
- `src/decision/DecisionTracker.ts`
- `src/outcome/OutcomeInjector.ts`

### Wave 3 Files
- `src/adaptive/StateManager.ts`
- `src/sdk/SDKIntegration.ts`
- `src/ui-adapter/EventBroadcaster.ts`
- `src/ui-adapter/TaskAPIHandler.ts`

### Wave 4 Files (New)
- `src/core/__tests__/*.test.ts`
- `src/advanced/__tests__/*.test.ts`
- `src/verification/__tests__/*.test.ts`
- `src/decision/__tests__/*.test.ts`

### Wave 5 Files (New)
- `src/verification/templates/*.ts`
- `src/verification/ReproducibilityGate.ts`
- Lint rules in `.eslintrc`

### Wave 6 Files (New)
- `src/gates/PreDeploymentGate.ts`
- `src/gates/ContractCoverageReport.ts`
- `src/monitoring/DriftMonitor.ts`

---

**Document Version**: 1.0
**Status**: READY FOR EXECUTION
**Related Documents**:
- `RAD-ENGINEER-CODEBASE-ISSUES.md`
- `DETERMINISTIC-SAFEGUARDS-FOR-IMPLEMENTATIONS.md`
