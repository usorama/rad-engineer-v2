# rad-engineer-v2 Implementation Plan (Separated)

> **Version**: 2.0.0
> **Created**: 2026-01-13
> **Purpose**: rad-engineer-v2 specific tasks, with ESS tasks separated
> **Parallel Execution**: ESS develops in separate terminal
> **Focus**: Full features (not MVP)

---

## Executive Summary

This plan covers rad-engineer-v2 enhancements, focusing on:
- Hierarchical Memory (CCA pattern)
- Verifiable Agentic Contract (VAC)
- Meta-Agent Optimization Loop
- Integration with engg-support-system (via checkpoints)

**ESS-specific tasks are in**: `docs/platform-foundation/engg-support-system/IMPLEMENTATION-PLAN.md`

---

## Dependency Tracking

See `docs/platform-foundation/INTEGRATION-DEPENDENCIES.md` for cross-system dependencies.

| Phase | Independent? | ESS Checkpoint Required |
|-------|--------------|------------------------|
| Phase 1: Hierarchical Memory | **YES** | None |
| Phase 2: VAC Contracts | **YES** | None |
| Phase 3: ESS Integration | NO | Checkpoint 3 (HTTP Gateway) |
| Phase 4: Meta-Agent | **YES** | None |
| Phase 5: Drift Detection | Partial | Checkpoint 4 (Model Pinning) |
| Phase 6: Integration Testing | NO | All Checkpoints |

---

## Phase 1: Hierarchical Memory (Independent)

**Duration**: Week 1-2
**Blocking**: None - can start immediately
**Focus**: Implement CCA-style scope-based memory

### Task 1.1: Scope System

**Location**: `rad-engineer/src/memory/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 1.1.1 | `Scope.ts` | Scope class with parent/child relationships | 3h |
| 1.1.2 | `ScopeStack.ts` | Stack-based scope management | 3h |
| 1.1.3 | `ScopeCompressor.ts` | Compress closed scopes to summaries | 4h |
| 1.1.4 | `HierarchicalMemory.ts` | Main memory manager | 6h |
| 1.1.5 | `TokenBudgetManager.ts` | Adaptive token limits per scope | 4h |
| 1.1.6 | Tests | Full test coverage | 4h |

**Scope Interface**:
```typescript
interface Scope {
  id: string;
  parentId: string | null;
  goal: string;
  level: 'GLOBAL' | 'TASK' | 'LOCAL';
  events: ContextEvent[];
  summary: string | null;
  artifacts: Map<string, unknown>;
  createdAt: Date;
  closedAt: Date | null;
}
```

**Token Budgets** (adaptive, not fixed 500):
| Level | Budget | Compression |
|-------|--------|-------------|
| GLOBAL | 2000 tokens | Never |
| TASK | 4000 × complexity | On close |
| LOCAL | 2000 tokens | Aggressive |

**Success Criteria**:
- [ ] O(log n) token growth over 50 tasks
- [ ] Compression ratio ≥5:1
- [ ] All tests pass

### Task 1.2: WaveOrchestrator Integration

**Location**: `rad-engineer/src/advanced/WaveOrchestrator.ts` (modify)

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 1.2.1 | `WaveOrchestrator.ts` | Inject HierarchicalMemory | 4h |
| 1.2.2 | `WaveOrchestrator.ts` | Manage scopes per wave | 3h |
| 1.2.3 | Tests | Integration tests | 3h |

**Success Criteria**:
- [ ] Each wave creates LOCAL scope
- [ ] Wave completion closes scope and compresses
- [ ] Long-horizon tasks complete without context overflow

---

## Phase 2: Verifiable Agentic Contract (Independent)

**Duration**: Week 2-3
**Blocking**: None
**Focus**: Contract-first execution with formal verification

### Task 2.1: Contract System

**Location**: `rad-engineer/src/verification/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 2.1.1 | `AgentContract.ts` | Contract interface | 3h |
| 2.1.2 | `Condition.ts` | Pre/post/invariant conditions | 2h |
| 2.1.3 | `ContractValidator.ts` | Validate contract consistency | 4h |
| 2.1.4 | `ContractRegistry.ts` | Store and retrieve contracts | 3h |
| 2.1.5 | `PropertyTestRunner.ts` | Hypothesis-style testing | 6h |
| 2.1.6 | `VACHook.ts` | Pre-commit verification hook | 3h |
| 2.1.7 | Tests | Full coverage | 4h |

**AgentContract Interface**:
```typescript
interface AgentContract {
  id: string;
  taskType: 'implement_feature' | 'fix_bug' | 'refactor' | 'test';
  preconditions: Condition[];
  postconditions: Condition[];
  invariants: Condition[];
  verificationMethod: 'runtime' | 'property-test' | 'formal';
}

interface Condition {
  id: string;
  name: string;
  predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>;
  errorMessage: string;
  severity: 'error' | 'warning';
}
```

**Success Criteria**:
- [ ] Contract coverage 100% on code changes
- [ ] Precondition success rate ≥95%
- [ ] VACHook blocks commits without verification

### Task 2.2: State Machine Executor

**Location**: `rad-engineer/src/verification/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 2.2.1 | `StateMachineExecutor.ts` | Defined states and transitions | 8h |
| 2.2.2 | `Transition.ts` | Guards and rollback | 4h |
| 2.2.3 | `UndefinedStateError.ts` | Error for invalid transitions | 1h |
| 2.2.4 | Tests | All transitions tested | 4h |

**States**:
```
IDLE → PLANNING → EXECUTING → VERIFYING → COMMITTING → COMPLETED
                      ↑           ↓
                      ←←← (retry if failed)
ANY → FAILED (on unrecoverable error)
```

**Success Criteria**:
- [ ] 0 undefined state occurrences
- [ ] 100% rollback success rate
- [ ] Deterministic state sequences

---

## Phase 3: ESS Integration (Depends on ESS Checkpoint 3)

**Duration**: Week 3-4
**Blocking**: ESS HTTP Gateway must be complete
**Check**: `docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md`

### Task 3.1: Veracity Client

**Location**: `rad-engineer/src/veracity/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 3.1.1 | `VeracityClient.ts` | HTTP client for ESS | 4h |
| 3.1.2 | `EvidencePacketParser.ts` | Parse EvidencePacketV1 | 2h |
| 3.1.3 | `VeracityConfig.ts` | Configuration and thresholds | 1h |
| 3.1.4 | `CircuitBreaker.ts` | Fallback when ESS unavailable | 4h |
| 3.1.5 | `HealthChecker.ts` | Poll ESS /health | 2h |
| 3.1.6 | Tests | Integration tests | 4h |

**VeracityClient Interface**:
```typescript
class VeracityClient {
  async query(request: QueryRequest): Promise<EvidencePacket>;
  async getHealth(): Promise<HealthStatus>;
  async listProjects(): Promise<Project[]>;
  isAvailable(): boolean;
}
```

**Success Criteria**:
- [ ] Successful queries return EvidencePacket
- [ ] Circuit breaker opens after 3 failures
- [ ] Graceful degradation when ESS unavailable

### Task 3.2: Quality Gate Integration

**Location**: `rad-engineer/src/veracity/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 3.2.1 | `QualityGate.ts` | Veracity threshold enforcement | 3h |
| 3.2.2 | WaveOrchestrator integration | Score all agent outputs | 3h |
| 3.2.3 | DecisionLearningIntegration | Record veracity with decisions | 2h |
| 3.2.4 | Tests | Quality gate tests | 3h |

**QualityGate**:
```typescript
class QualityGate {
  constructor(private threshold: number = 80) {}

  async validate(output: AgentOutput): Promise<QualityResult> {
    const evidence = await this.veracityClient.query({
      query: `Validate: ${output.summary}`,
      project: this.project
    });

    if (evidence.veracity.confidenceScore < this.threshold) {
      return {
        passed: false,
        reason: `Veracity score ${evidence.veracity.confidenceScore} < ${this.threshold}`,
        faults: evidence.veracity.faults
      };
    }

    return { passed: true, score: evidence.veracity.confidenceScore };
  }
}
```

**Success Criteria**:
- [ ] All agent outputs scored
- [ ] Outputs below threshold rejected
- [ ] Decisions include veracity evidence

---

## Phase 4: Meta-Agent Optimization (Independent)

**Duration**: Week 4-5
**Blocking**: None (but benefits from Phase 1-3)
**Focus**: Build-Test-Improve cycle

### Task 4.1: MetaAgentLoop

**Location**: `rad-engineer/src/meta/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 4.1.1 | `MetaAgentLoop.ts` | Build-Test-Improve orchestration | 8h |
| 4.1.2 | `TraceAnalyzer.ts` | Analyze execution traces | 4h |
| 4.1.3 | `ConfigMutator.ts` | Mutate agent configurations | 4h |
| 4.1.4 | `BenchmarkRunner.ts` | Run evaluation tasks | 4h |
| 4.1.5 | `ImprovementStrategies.ts` | Prompt refinement, decomposition | 4h |
| 4.1.6 | Tests | Meta-agent tests | 4h |

**MetaAgentLoop**:
```typescript
class MetaAgentLoop {
  async executeWithImprovement(task: Task): Promise<Result> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      // BUILD
      const result = await this.execute(task);

      // TEST
      const quality = await this.evaluate(result);

      if (quality >= this.threshold) {
        return result;
      }

      // IMPROVE
      const analysis = await this.analyzeTrace(result.trace);
      task = await this.applyImprovement(task, analysis);
    }

    throw new Error('Max attempts reached without quality threshold');
  }
}
```

**Success Criteria**:
- [ ] Quality improves ≥10% per iteration
- [ ] 90% tasks reach threshold within 3 attempts
- [ ] ≥30% improvement patterns reused

### Task 4.2: Failure Index

**Location**: `rad-engineer/src/meta/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 4.2.1 | `FailureIndex.ts` | Searchable failure database | 4h |
| 4.2.2 | `FailureEmbedding.ts` | Error embeddings | 2h |
| 4.2.3 | `ResolutionMatcher.ts` | Match failures to resolutions | 3h |
| 4.2.4 | Tests | Failure index tests | 2h |

**Success Criteria**:
- [ ] Resolution hit rate ≥40%
- [ ] Search latency ≤100ms
- [ ] Index persists across sessions

---

## Phase 5: Drift Detection (Partial ESS dependency)

**Duration**: Week 5-6
**Blocking**: Partial - AST comparison needs ESS model pinning for full reproducibility
**Focus**: Determinism validation

### Task 5.1: Drift Detector

**Location**: `rad-engineer/src/verification/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 5.1.1 | `DriftDetector.ts` | Statistical drift detection | 6h |
| 5.1.2 | `ASTComparator.ts` | Semantic code comparison | 4h |
| 5.1.3 | `ReproducibilityTest.ts` | Run task N times | 3h |
| 5.1.4 | `ASTNormalizer.ts` | Normalize for comparison | 3h |
| 5.1.5 | Tests | Drift detection tests | 3h |

**DriftDetector**:
```typescript
class DriftDetector {
  async measureDriftRate(task: Task, runs: number = 10): Promise<number> {
    const outputs: string[] = [];

    for (let i = 0; i < runs; i++) {
      const result = await this.executor.execute(task);
      outputs.push(this.normalizeAST(result.code));
    }

    const uniqueOutputs = new Set(outputs);
    return (uniqueOutputs.size - 1) / runs * 100;  // 0% = perfect determinism
  }

  normalizeAST(code: string): string {
    // Remove comments, normalize whitespace, sort imports
    // Return canonical form for comparison
  }
}
```

**Success Criteria**:
- [ ] Drift rate 0% on 10 reference tasks
- [ ] 100% identical AST across 10 runs × 10 tasks
- [ ] False positive rate ≤5%

---

## Phase 6: Integration Testing (Depends on all ESS checkpoints)

**Duration**: Week 6-7
**Blocking**: All ESS phases complete
**Focus**: End-to-end validation

### Task 6.1: Integration Test Suite

**Location**: `rad-engineer/test/integration/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 6.1.1 | `ess-integration.test.ts` | ESS connectivity tests | 4h |
| 6.1.2 | `hierarchical-memory.test.ts` | Memory over long tasks | 4h |
| 6.1.3 | `vac-workflow.test.ts` | Contract-first execution | 4h |
| 6.1.4 | `meta-agent-loop.test.ts` | Improvement iterations | 4h |
| 6.1.5 | `determinism.test.ts` | Drift rate validation | 4h |

### Task 6.2: Performance Validation

**Location**: `rad-engineer/test/performance/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 6.2.1 | `benchmark-suite.ts` | Performance harness | 4h |
| 6.2.2 | `long-horizon.test.ts` | 50+ task sequences | 4h |
| 6.2.3 | `concurrent-agents.test.ts` | 3 parallel agents | 3h |

---

## Success Metrics Summary

### Determinism (Mathematical Certainty)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Drift Rate | 0% | Same task 10×, compare ASTs |
| Contract Coverage | 100% | All commits have verified contract |
| State Determinism | 100% | Same inputs → same state sequence |

### Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Veracity Score | ≥85 | EvidencePacket.veracity.confidenceScore |
| Precondition Success | ≥95% | pre_pass / pre_total |
| Postcondition Success | ≥90% | post_pass / post_total |

### Efficiency

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token Efficiency | ≤70% | HierarchicalMemory.getTokenUsage() |
| Compression Ratio | ≥5:1 | ScopeCompressor before/after |
| Context Growth | O(log n) | Plot tokens vs tasks |

---

## Execution Order

### Critical Path

```
Phase 1 (Memory) → Phase 2 (VAC) → [Wait for ESS Checkpoint 3]
                                           ↓
                                  Phase 3 (ESS Integration)
                                           ↓
Phase 4 (Meta-Agent) → Phase 5 (Drift) → Phase 6 (Integration Tests)
```

### Parallel Execution

| Can Run in Parallel | Rationale |
|---------------------|-----------|
| Phase 1 + Phase 2 | Independent modules |
| Phase 4 + Phase 5.1 | Meta-agent and drift detection are separate |

---

## Integration Checkpoint Protocol

Before starting Phase 3, verify ESS status:

```bash
# Check ESS integration status
cat docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md | grep "Phase 2"

# If COMPLETE, proceed with Phase 3
# If NOT STARTED or IN PROGRESS, continue with Phase 4 (independent)
```

---

**Document Version**: 2.0.0
**Last Updated**: 2026-01-13
**ESS Dependency**: See INTEGRATION-DEPENDENCIES.md
**Backlog**: See BACKLOG.md for deferred items
