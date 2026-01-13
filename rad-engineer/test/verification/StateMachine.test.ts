/**
 * Unit tests for State Machine components
 * Tests: UndefinedStateError, Transition, StateMachineExecutor
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  StateMachineExecutor,
  createExecutionContext,
  Transition,
  StandardTransitions,
  UndefinedStateError,
  isUndefinedStateError,
  type ExecutionContext,
  type ExecutionState,
} from "@/verification/index.js";

describe("UndefinedStateError", () => {
  it("Creates error with full context", () => {
    const error = new UndefinedStateError({
      fromState: "IDLE",
      toState: "COMPLETED",
      reason: "Cannot skip states",
      validTransitions: ["PLANNING"],
      taskId: "task-001",
      timestamp: new Date(),
    });

    expect(error.name).toBe("UndefinedStateError");
    expect(error.fromState).toBe("IDLE");
    expect(error.toState).toBe("COMPLETED");
    expect(error.reason).toBe("Cannot skip states");
    expect(error.validTransitions).toEqual(["PLANNING"]);
    expect(error.taskId).toBe("task-001");
    expect(error.message).toContain("IDLE → COMPLETED");
  });

  it("Handles undefined target state", () => {
    const error = new UndefinedStateError({
      fromState: "IDLE",
      toState: undefined,
      reason: "Invalid target",
      timestamp: new Date(),
    });

    expect(error.message).toContain("undefined");
  });

  it("Provides detailed message", () => {
    const error = new UndefinedStateError({
      fromState: "EXECUTING",
      toState: "IDLE",
      reason: "Cannot go backwards",
      validTransitions: ["VERIFYING", "FAILED"],
      taskId: "task-002",
      timestamp: new Date(),
    });

    const detailed = error.getDetailedMessage();

    expect(detailed).toContain("EXECUTING");
    expect(detailed).toContain("IDLE");
    expect(detailed).toContain("Cannot go backwards");
    expect(detailed).toContain("VERIFYING, FAILED");
    expect(detailed).toContain("task-002");
  });

  it("Converts to JSON", () => {
    const now = new Date();
    const error = new UndefinedStateError({
      fromState: "PLANNING",
      toState: "COMPLETED",
      reason: "Test reason",
      timestamp: now,
    });

    const json = error.toJSON();

    expect(json.name).toBe("UndefinedStateError");
    expect(json.fromState).toBe("PLANNING");
    expect(json.toState).toBe("COMPLETED");
    expect(json.timestamp).toBe(now.toISOString());
  });

  it("isUndefinedStateError type guard works", () => {
    const error = new UndefinedStateError({
      fromState: "IDLE",
      toState: "FAILED",
      reason: "Test",
      timestamp: new Date(),
    });

    expect(isUndefinedStateError(error)).toBe(true);
    expect(isUndefinedStateError(new Error("Regular error"))).toBe(false);
    expect(isUndefinedStateError(null)).toBe(false);
  });
});

describe("Transition", () => {
  describe("Basic Creation", () => {
    it("Creates transition with required fields", () => {
      const transition = new Transition({
        id: "test-transition",
        name: "Test Transition",
        from: "IDLE",
        to: "PLANNING",
      });

      expect(transition.id).toBe("test-transition");
      expect(transition.name).toBe("Test Transition");
      expect(transition.from).toBe("IDLE");
      expect(transition.to).toBe("PLANNING");
      expect(transition.priority).toBe(0);
      expect(transition.isRetry).toBe(false);
    });

    it("Creates transition with optional fields", () => {
      const transition = new Transition({
        id: "full-transition",
        name: "Full Transition",
        from: "VERIFYING",
        to: "EXECUTING",
        description: "Retry execution",
        priority: 10,
        isRetry: true,
      });

      expect(transition.description).toBe("Retry execution");
      expect(transition.priority).toBe(10);
      expect(transition.isRetry).toBe(true);
    });
  });

  describe("Guard Checking", () => {
    it("Passes when all guards pass", async () => {
      const transition = new Transition({
        id: "guarded",
        name: "Guarded",
        from: "IDLE",
        to: "PLANNING",
        guards: [(ctx) => ctx.inputs.prompt !== undefined, (ctx) => ctx.taskId.length > 0],
      });

      const ctx = createExecutionContext({
        inputs: { prompt: "test" },
        taskId: "task-001",
      });

      const result = await transition.checkGuards(ctx);
      expect(result).toBe(true);
    });

    it("Fails when any guard fails", async () => {
      const transition = new Transition({
        id: "guarded",
        name: "Guarded",
        from: "IDLE",
        to: "PLANNING",
        guards: [(ctx) => ctx.inputs.prompt !== undefined, (ctx) => false],
      });

      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await transition.checkGuards(ctx);
      expect(result).toBe(false);
    });

    it("Handles async guards", async () => {
      const transition = new Transition({
        id: "async-guarded",
        name: "Async Guarded",
        from: "IDLE",
        to: "PLANNING",
        guards: [
          async (ctx) => {
            await new Promise((r) => setTimeout(r, 10));
            return true;
          },
        ],
      });

      const ctx = createExecutionContext({});

      const result = await transition.checkGuards(ctx);
      expect(result).toBe(true);
    });
  });

  describe("Execution", () => {
    it("Executes transition successfully", async () => {
      const transition = new Transition({
        id: "simple",
        name: "Simple",
        from: "IDLE",
        to: "PLANNING",
      });

      const ctx = createExecutionContext({});
      const result = await transition.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.fromState).toBe("IDLE");
      expect(result.toState).toBe("PLANNING");
      expect(ctx.state).toBe("PLANNING");
    });

    it("Fails when in wrong state", async () => {
      const transition = new Transition({
        id: "from-planning",
        name: "From Planning",
        from: "PLANNING",
        to: "EXECUTING",
      });

      const ctx = createExecutionContext({ state: "IDLE" });
      const result = await transition.execute(ctx);

      expect(result.success).toBe(false);
      expect(ctx.state).toBe("IDLE"); // Unchanged
      expect(isUndefinedStateError(result.error)).toBe(true);
    });

    it("Fails when guard fails", async () => {
      const transition = new Transition({
        id: "guarded-fail",
        name: "Guarded Fail",
        from: "IDLE",
        to: "PLANNING",
        guards: [(ctx) => false],
      });

      const ctx = createExecutionContext({});
      const result = await transition.execute(ctx);

      expect(result.success).toBe(false);
      expect(ctx.state).toBe("IDLE");
      expect(result.error?.message).toContain("Guard conditions not met");
    });

    it("Executes pre-actions", async () => {
      let preActionCalled = false;

      const transition = new Transition({
        id: "with-pre",
        name: "With Pre",
        from: "IDLE",
        to: "PLANNING",
        preActions: [
          () => {
            preActionCalled = true;
          },
        ],
      });

      const ctx = createExecutionContext({});
      await transition.execute(ctx);

      expect(preActionCalled).toBe(true);
    });

    it("Executes post-actions", async () => {
      let postActionCalled = false;

      const transition = new Transition({
        id: "with-post",
        name: "With Post",
        from: "IDLE",
        to: "PLANNING",
        postActions: [
          () => {
            postActionCalled = true;
          },
        ],
      });

      const ctx = createExecutionContext({});
      await transition.execute(ctx);

      expect(postActionCalled).toBe(true);
    });

    it("Rolls back on pre-action failure", async () => {
      let rollbackCalled = false;

      const transition = new Transition({
        id: "rollback-test",
        name: "Rollback Test",
        from: "IDLE",
        to: "PLANNING",
        preActions: [
          () => {
            throw new Error("Pre-action failed");
          },
        ],
        rollback: () => {
          rollbackCalled = true;
        },
      });

      const ctx = createExecutionContext({});
      const result = await transition.execute(ctx);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(rollbackCalled).toBe(true);
      expect(ctx.state).toBe("IDLE"); // Unchanged
    });

    it("Rolls back on post-action failure", async () => {
      let rollbackCalled = false;

      const transition = new Transition({
        id: "post-rollback",
        name: "Post Rollback",
        from: "IDLE",
        to: "PLANNING",
        postActions: [
          () => {
            throw new Error("Post-action failed");
          },
        ],
        rollback: () => {
          rollbackCalled = true;
        },
      });

      const ctx = createExecutionContext({});
      const result = await transition.execute(ctx);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(rollbackCalled).toBe(true);
      expect(ctx.state).toBe("IDLE"); // Rolled back
    });
  });

  describe("StandardTransitions", () => {
    it("Creates start planning transition", () => {
      const transition = StandardTransitions.startPlanning();

      expect(transition.from).toBe("IDLE");
      expect(transition.to).toBe("PLANNING");
    });

    it("Creates start execution transition", () => {
      const transition = StandardTransitions.startExecution();

      expect(transition.from).toBe("PLANNING");
      expect(transition.to).toBe("EXECUTING");
    });

    it("Creates start verification transition", () => {
      const transition = StandardTransitions.startVerification();

      expect(transition.from).toBe("EXECUTING");
      expect(transition.to).toBe("VERIFYING");
    });

    it("Creates retry transition", () => {
      const transition = StandardTransitions.retryFromVerification();

      expect(transition.from).toBe("VERIFYING");
      expect(transition.to).toBe("EXECUTING");
      expect(transition.isRetry).toBe(true);
    });

    it("Creates fail transition from any state", () => {
      const states: ExecutionState[] = ["IDLE", "PLANNING", "EXECUTING", "VERIFYING"];

      for (const state of states) {
        const transition = StandardTransitions.fail(state);
        expect(transition.from).toBe(state);
        expect(transition.to).toBe("FAILED");
      }
    });
  });
});

describe("StateMachineExecutor", () => {
  let executor: StateMachineExecutor;

  beforeEach(() => {
    executor = new StateMachineExecutor({
      maxRetries: 3,
    });
  });

  describe("Initialization", () => {
    it("Creates executor with default config", () => {
      const exec = new StateMachineExecutor();
      const config = exec.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.allowFailFromAny).toBe(true);
    });

    it("Creates executor with custom config", () => {
      const exec = new StateMachineExecutor({
        maxRetries: 5,
        allowFailFromAny: false,
      });
      const config = exec.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.allowFailFromAny).toBe(false);
    });

    it("Registers standard transitions", () => {
      const transitions = executor.getAllTransitions();

      // Should have standard transitions + fail transitions
      expect(transitions.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("Valid Transitions", () => {
    it("Returns valid transitions from IDLE", () => {
      const transitions = executor.getValidTransitions("IDLE");
      expect(transitions.some((t) => t.to === "PLANNING")).toBe(true);
      expect(transitions.some((t) => t.to === "FAILED")).toBe(true);
    });

    it("Returns valid target states", () => {
      expect(executor.getValidTargetStates("IDLE")).toContain("PLANNING");
      expect(executor.getValidTargetStates("PLANNING")).toContain("EXECUTING");
      expect(executor.getValidTargetStates("VERIFYING")).toContain("EXECUTING"); // Retry
      expect(executor.getValidTargetStates("COMPLETED")).toEqual([]); // Terminal
    });

    it("Validates transition combinations", () => {
      expect(executor.isValidTransition("IDLE", "PLANNING")).toBe(true);
      expect(executor.isValidTransition("IDLE", "COMPLETED")).toBe(false);
      expect(executor.isValidTransition("EXECUTING", "VERIFYING")).toBe(true);
    });
  });

  describe("Single Transition Execution", () => {
    it("Executes valid transition", async () => {
      const ctx = createExecutionContext({ inputs: { prompt: "test" } });
      const result = await executor.executeTransition(ctx, "PLANNING");

      expect(result.success).toBe(true);
      expect(ctx.state).toBe("PLANNING");
    });

    it("Rejects invalid transition", async () => {
      const ctx = createExecutionContext({});
      const result = await executor.executeTransition(ctx, "COMPLETED");

      expect(result.success).toBe(false);
      expect(ctx.state).toBe("IDLE"); // Unchanged
    });
  });

  describe("Full Execution", () => {
    it("Executes full workflow successfully", async () => {
      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onPlanning: async (ctx) => {
          ctx.artifacts.set("plan", "test plan");
        },
        onExecuting: async (ctx) => {
          ctx.outputs = { code: "console.log('hello');" };
        },
        onVerifying: async (ctx) => {
          return true; // Verification passed
        },
        onCommitting: async (ctx) => {
          ctx.artifacts.set("committed", true);
        },
      });

      expect(result.success).toBe(true);
      expect(result.finalState).toBe("COMPLETED");
      expect(result.history.length).toBeGreaterThan(0);
      expect(result.retryCount).toBe(0);
    });

    it("Fails when starting from non-IDLE state", async () => {
      const ctx = createExecutionContext({ state: "PLANNING" });

      const result = await executor.execute(ctx, {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("IDLE");
    });

    it("Retries on verification failure", async () => {
      let execCount = 0;
      let verifyCount = 0;

      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onExecuting: async (ctx) => {
          execCount++;
          ctx.outputs = { result: execCount };
        },
        onVerifying: async (ctx) => {
          verifyCount++;
          return verifyCount >= 2; // Pass on second attempt
        },
      });

      expect(result.success).toBe(true);
      expect(execCount).toBe(2);
      expect(verifyCount).toBe(2);
      expect(result.retryCount).toBe(1);
    });

    it("Fails after max retries exceeded", async () => {
      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onExecuting: async (ctx) => {
          ctx.outputs = { result: "test" };
        },
        onVerifying: async () => {
          return false; // Always fail
        },
      });

      expect(result.success).toBe(false);
      expect(result.finalState).toBe("FAILED");
      expect(result.retryCount).toBe(3); // maxRetries
      expect(result.error?.message).toContain("Max retries");
    });

    it("Transitions to FAILED on handler error", async () => {
      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onExecuting: async () => {
          throw new Error("Execution error");
        },
      });

      expect(result.success).toBe(false);
      expect(result.finalState).toBe("FAILED");
      expect(result.error?.message).toBe("Execution error");
    });

    it("Tracks state change callbacks", async () => {
      const stateChanges: Array<{ from: ExecutionState; to: ExecutionState }> = [];

      const exec = new StateMachineExecutor({
        onStateChange: (from, to) => {
          stateChanges.push({ from, to });
        },
      });

      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      await exec.execute(ctx, {
        onVerifying: async () => true,
      });

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[0]).toEqual({ from: "IDLE", to: "PLANNING" });
    });
  });

  describe("History Tracking", () => {
    it("Records all transitions in history", async () => {
      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onExecuting: async (ctx) => {
          ctx.outputs = { result: "test" }; // Required for EXECUTING → VERIFYING guard
        },
        onVerifying: async () => true,
      });

      expect(result.success).toBe(true);
      expect(result.history.length).toBe(5); // IDLE→PLAN→EXEC→VERIFY→COMMIT→COMPLETE
      expect(result.history[0].fromState).toBe("IDLE");
      expect(result.history[0].toState).toBe("PLANNING");
      expect(result.history[result.history.length - 1].toState).toBe("COMPLETED");
    });

    it("Records retry attempts in history", async () => {
      let verifyCount = 0;

      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onExecuting: async (ctx) => {
          ctx.outputs = { result: "test" };
        },
        onVerifying: async () => {
          verifyCount++;
          return verifyCount >= 2;
        },
      });

      // Should have retry entry
      const retryEntry = result.history.find(
        (h) => h.transitionName === "Retry Execution"
      );
      expect(retryEntry).toBeDefined();
      expect(retryEntry?.retryAttempt).toBe(1);
    });

    it("Records failure in history", async () => {
      const ctx = createExecutionContext({ inputs: { prompt: "test" } });

      const result = await executor.execute(ctx, {
        onExecuting: async () => {
          throw new Error("Fail");
        },
      });

      const failEntry = result.history.find((h) => h.toState === "FAILED");
      expect(failEntry).toBeDefined();
    });
  });

  describe("createExecutionContext", () => {
    it("Creates context with defaults", () => {
      const ctx = createExecutionContext({});

      expect(ctx.scopeId).toBeDefined();
      expect(ctx.taskId).toBeDefined();
      expect(ctx.state).toBe("IDLE");
      expect(ctx.inputs).toEqual({});
      expect(ctx.artifacts).toBeInstanceOf(Map);
      expect(ctx.startTime).toBeInstanceOf(Date);
    });

    it("Applies overrides", () => {
      const ctx = createExecutionContext({
        scopeId: "custom-scope",
        taskId: "custom-task",
        inputs: { prompt: "test" },
        state: "PLANNING",
      });

      expect(ctx.scopeId).toBe("custom-scope");
      expect(ctx.taskId).toBe("custom-task");
      expect(ctx.inputs).toEqual({ prompt: "test" });
      expect(ctx.state).toBe("PLANNING");
    });
  });
});
