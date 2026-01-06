# Phase Gate Iteration Pattern

## Go/No-Go Decision Flow

```typescript
interface PhaseGateDecision {
  phaseNumber: number;
  phaseName: string;
  criteria: GateCriteria[];
  decision: "go" | "no-go" | "conditional-go";
  approver: string;
  timestamp: string;
  rationale: string;
}

interface GateIterationLoop {
  maxIterations: 3;  // Prevent infinite loops
  currentIteration: number;
  iterationHistory: IterationRecord[];
}

interface IterationRecord {
  iterationNumber: number;
  decision: "no-go" | "conditional-go";
  blockingCriteria: string[];
  requiredActions: string[];
  responsible: string;
  deadline: string;
}

onGateDecision(gate: PhaseGateDecision): void {
  if (gate.decision === "go") {
    proceedToNextPhase(gate.phaseNumber);
    return;
  }

  // No-Go or Conditional-Go: Enter Iteration Loop
  const iteration = initializeIteration(gate);

  while (iteration.currentIteration <= iteration.maxIterations) {
    const record = iteration.iterationHistory[iteration.currentIteration - 1];

    console.log(`Iteration ${iteration.currentIteration}:`);
    console.log(`  Blocking: ${record.blockingCriteria.join(", ")}`);
    console.log(`  Actions: ${record.requiredActions.join(", ")}`);
    console.log(`  Owner: ${record.responsible}`);
    console.log(`  Deadline: ${record.deadline}`);

    // Execute required actions
    const actionsComplete = await executeRequiredActions(record);

    if (actionsComplete) {
      // Re-evaluate gate
      const newDecision = await reEvaluateGate(gate);

      if (newDecision.decision === "go") {
        console.log(`Gate PASSED after ${iteration.currentIteration} iterations`);
        proceedToNextPhase(gate.phaseNumber);
        return;
      }
    }

    iteration.currentIteration++;

    if (iteration.currentIteration > iteration.maxIterations) {
      // Escalate
      console.error(`MAX ITERATIONS (${iteration.maxIterations}) EXCEEDED`);
      console.error(`Phase ${gate.phaseNumber} blocked. Escalation required.`);
      escalateToStakeholder(gate);
      return;
    }
  }
}
```

## Example: Phase 0 Gate Scenarios

### Scenario 1: Go (Success)

```
Phase 0 Gate Evaluation:
✅ Actual SDK integration working (not simulation)
✅ Baseline metrics documented
✅ Risk register complete
✅ Go/no-go decision made

Decision: GO
Action: Proceed to Phase 1
```

### Scenario 2: No-Go with Iteration (Recoverable)

```
Phase 0 Gate Evaluation (Iteration 1):
❌ Actual SDK integration working - FAILED
   Reason: SDK not installed, still using simulation
❌ Baseline metrics documented - PASSED
✅ Risk register complete - PASSED

Decision: NO-GO

Iteration 1 Actions:
- [ ] Install Claude Agent SDK (Owner: Dev, Deadline: +2 days)
- [ ] Replace simulation with actual SDK calls (Owner: Dev, Deadline: +3 days)
- [ ] Verify with integration test (Owner: QA, Deadline: +1 day)

Total estimated time: 6 days

--- After 6 days ---

Phase 0 Gate Re-evaluation (Iteration 2):
✅ Actual SDK integration working - PASSED
   Evidence: Integration test passed, real SDK calls verified
❌ Baseline metrics documented - FAILED
   Reason: Only measured 2 waves, need 5 waves for statistical significance

Decision: NO-GO

Iteration 2 Actions:
- [ ] Execute 3 more baseline waves (Owner: QA, Deadline: +3 days)
- [ ] Calculate statistical confidence (Owner: Data, Deadline: +1 day)

Total additional time: 4 days

--- After 4 days ---

Phase 0 Gate Re-evaluation (Iteration 3):
✅ Actual SDK integration working - PASSED
✅ Baseline metrics documented - PASSED
   Evidence: 5 waves executed, 95% confidence interval
✅ Risk register complete - PASSED

Decision: GO
Action: Proceed to Phase 1

Total delay: 10 days (within acceptable range)
```

### Scenario 3: No-Go Escalation (Blocker)

```
Phase 0 Gate Evaluation (Iteration 1):
❌ Actual SDK integration working - FAILED
   Reason: Claude Agent SDK not compatible with target environment

Decision: NO-GO

Iteration 1 Actions:
- [ ] Investigate alternative SDKs (Owner: Research, Deadline: +5 days)
- [ ] Test compatibility with different Python version (Owner: Dev, Deadline: +2 days)

--- After 7 days ---

Phase 0 Gate Re-evaluation (Iteration 2):
❌ Actual SDK integration working - FAILED
   Reason: No compatible SDK found, fundamental incompatibility

Decision: NO-GO - ESCALATE

Iteration 2 Actions:
- [ ] All workaround attempts exhausted
- [ ] Recommend architecture change (remove SDK dependency)

ESCALATION:
To: Stakeholder Committee
Subject: Phase 0 Gate Blocked - Architecture Change Required
Impact: Timeline unknown, replanning required
Recommendation: Review alternative architectures in critical review
```

## Key Principles

1. **No-Go is not failure** - It's quality control preventing bad code from proceeding
2. **Iterations are time-boxed** - Max 3 iterations prevents infinite loops
3. **Every iteration has owner and deadline** - Clear accountability
4. **Escalation after max iterations** - Prevents blocked phases forever
5. **Document everything** - Iteration history shows what was tried and why

## Integration with Smart Orchestrator Plan

This pattern should be implemented in the **WaveOrchestrator** component:

```typescript
class PhaseGateManager {
  async evaluatePhaseGate(phase: number): Promise<GateResult> {
    const criteria = await this.loadGateCriteria(phase);
    const evaluation = await this.evaluateAllCriteria(criteria);

    if (evaluation.decision === "go") {
      return { decision: "go", phase };
    }

    // Enter iteration loop
    return await this.iterateUntilGo(phase, evaluation);
  }

  private async iterateUntilGo(
    phase: number,
    initialEvaluation: GateEvaluation,
  ): Promise<GateResult> {
    const iteration: GateIteration = {
      maxIterations: 3,
      currentIteration: 1,
      iterationHistory: [],
    };

    while (iteration.currentIteration <= iteration.maxIterations) {
      const actions = this.createActionPlan(initialEvaluation);
      iteration.iterationHistory.push({
        iterationNumber: iteration.currentIteration,
        decision: initialEvaluation.decision,
        blockingCriteria: initialEvaluation.failedCriteria,
        requiredActions: actions,
        responsible: this.assignOwner(actions),
        deadline: this.calculateDeadline(actions),
      });

      await this.executeActions(actions);
      const reEvaluation = await this.reEvaluateGate(phase);

      if (reEvaluation.decision === "go") {
        return {
          decision: "go",
          phase,
          iterations: iteration.currentIteration,
        };
      }

      iteration.currentIteration++;
    }

    // Max iterations exceeded - escalate
    return await this.escalateGate(phase, initialEvaluation);
  }
}
```

## References

- **Critical Review**: Already identified that current implementation is simulation
- **Revised Plan**: 16-week timeline with phase gates
- **Implementation**: This pattern will be part of Phase 1 (ErrorRecoveryEngine)

---

**Status**: Pattern documented, ready for implementation in Phase 1
**Created**: 2026-01-05
**Next**: Document this in the Error Recovery Architecture section
