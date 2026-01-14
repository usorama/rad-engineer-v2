/**
 * Unit tests for Condition
 * Tests: condition creation, evaluation, standard conditions
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  Condition,
  StandardConditions,
  type ExecutionContext,
  type ExecutionState,
} from "@/verification/Condition.js";

/**
 * Create a basic test context
 */
function createTestContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    scopeId: "test-scope",
    taskId: "test-task",
    inputs: {},
    state: "EXECUTING" as ExecutionState,
    artifacts: new Map(),
    startTime: new Date(),
    ...overrides,
  };
}

describe("Condition: Basic Creation", () => {
  it("Creates a precondition with required fields", () => {
    const condition = Condition.precondition(
      "pre-001",
      "Has Input",
      (ctx) => ctx.inputs.value !== undefined,
      "Missing input"
    );

    expect(condition.id).toBe("pre-001");
    expect(condition.name).toBe("Has Input");
    expect(condition.type).toBe("precondition");
    expect(condition.severity).toBe("error");
    expect(condition.errorMessage).toBe("Missing input");
  });

  it("Creates a postcondition with custom severity", () => {
    const condition = Condition.postcondition(
      "post-001",
      "Has Output",
      (ctx) => ctx.outputs?.result !== undefined,
      "Missing output",
      "warning"
    );

    expect(condition.type).toBe("postcondition");
    expect(condition.severity).toBe("warning");
  });

  it("Creates an invariant", () => {
    const condition = Condition.invariant(
      "inv-001",
      "Valid State",
      (ctx) => ctx.state !== "FAILED",
      "State is failed"
    );

    expect(condition.type).toBe("invariant");
  });

  it("Stores tags and description", () => {
    const condition = new Condition({
      id: "test-001",
      name: "Test Condition",
      type: "precondition",
      predicate: () => true,
      errorMessage: "Test failed",
      severity: "error",
      description: "A test condition",
      tags: ["test", "example"],
    });

    expect(condition.description).toBe("A test condition");
    expect(condition.tags).toEqual(["test", "example"]);
  });
});

describe("Condition: Evaluation", () => {
  it("Returns passed=true for successful predicate", async () => {
    const condition = Condition.precondition(
      "pre-001",
      "Always Pass",
      () => true,
      "Should not fail"
    );

    const ctx = createTestContext();
    const result = await condition.evaluate(ctx);

    expect(result.passed).toBe(true);
    expect(result.conditionId).toBe("pre-001");
    expect(result.conditionName).toBe("Always Pass");
    expect(result.type).toBe("precondition");
    expect(result.errorMessage).toBeUndefined();
    expect(result.severity).toBeUndefined();
    expect(result.evaluatedAt).toBeInstanceOf(Date);
    expect(result.evaluationDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("Returns passed=false with error details for failed predicate", async () => {
    const condition = Condition.precondition(
      "pre-002",
      "Always Fail",
      () => false,
      "Expected failure"
    );

    const ctx = createTestContext();
    const result = await condition.evaluate(ctx);

    expect(result.passed).toBe(false);
    expect(result.errorMessage).toBe("Expected failure");
    expect(result.severity).toBe("error");
  });

  it("Handles async predicates", async () => {
    const condition = Condition.precondition(
      "pre-async",
      "Async Check",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true;
      },
      "Async failed"
    );

    const ctx = createTestContext();
    const result = await condition.evaluate(ctx);

    expect(result.passed).toBe(true);
    expect(result.evaluationDurationMs).toBeGreaterThanOrEqual(10);
  });

  it("Handles predicate errors gracefully", async () => {
    const condition = Condition.precondition(
      "pre-error",
      "Error Check",
      () => {
        throw new Error("Predicate error");
      },
      "Should not show"
    );

    const ctx = createTestContext();
    const result = await condition.evaluate(ctx);

    expect(result.passed).toBe(false);
    expect(result.errorMessage).toContain("Predicate error");
    expect(result.severity).toBe("error");
    expect(result.context?.evaluationError).toBe("Predicate error");
  });

  it("Evaluates condition with context inputs", async () => {
    const condition = Condition.precondition(
      "pre-input",
      "Check Input",
      (ctx) => ctx.inputs.prompt === "test prompt",
      "Input mismatch"
    );

    const ctx = createTestContext({
      inputs: { prompt: "test prompt" },
    });
    const result = await condition.evaluate(ctx);

    expect(result.passed).toBe(true);
  });
});

describe("Condition: StandardConditions", () => {
  describe("hasInput", () => {
    it("Passes when input exists", async () => {
      const condition = StandardConditions.hasInput("prompt");
      const ctx = createTestContext({ inputs: { prompt: "test" } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails when input missing", async () => {
      const condition = StandardConditions.hasInput("prompt");
      const ctx = createTestContext({ inputs: {} });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain("prompt");
    });
  });

  describe("inputNotEmpty", () => {
    it("Passes for non-empty string", async () => {
      const condition = StandardConditions.inputNotEmpty("name");
      const ctx = createTestContext({ inputs: { name: "John" } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails for empty string", async () => {
      const condition = StandardConditions.inputNotEmpty("name");
      const ctx = createTestContext({ inputs: { name: "" } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });

    it("Fails for whitespace-only string", async () => {
      const condition = StandardConditions.inputNotEmpty("name");
      const ctx = createTestContext({ inputs: { name: "   " } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });

    it("Passes for non-empty array", async () => {
      const condition = StandardConditions.inputNotEmpty("items");
      const ctx = createTestContext({ inputs: { items: [1, 2, 3] } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails for empty array", async () => {
      const condition = StandardConditions.inputNotEmpty("items");
      const ctx = createTestContext({ inputs: { items: [] } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });
  });

  describe("hasOutput", () => {
    it("Passes when output exists", async () => {
      const condition = StandardConditions.hasOutput("code");
      const ctx = createTestContext({ outputs: { code: "const x = 1;" } });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails when output missing", async () => {
      const condition = StandardConditions.hasOutput("code");
      const ctx = createTestContext({ outputs: {} });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });

    it("Fails when outputs undefined", async () => {
      const condition = StandardConditions.hasOutput("code");
      const ctx = createTestContext();

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });
  });

  describe("noError", () => {
    it("Passes when no error", async () => {
      const condition = StandardConditions.noError();
      const ctx = createTestContext();

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails when error present", async () => {
      const condition = StandardConditions.noError();
      const ctx = createTestContext({ error: new Error("Test error") });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });
  });

  describe("validState", () => {
    it("Passes when state is in allowed list", async () => {
      const condition = StandardConditions.validState([
        "EXECUTING",
        "VERIFYING",
      ]);
      const ctx = createTestContext({ state: "EXECUTING" });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails when state not in allowed list", async () => {
      const condition = StandardConditions.validState([
        "EXECUTING",
        "VERIFYING",
      ]);
      const ctx = createTestContext({ state: "FAILED" });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });
  });

  describe("withinTimeout", () => {
    it("Passes when execution within timeout", async () => {
      const condition = StandardConditions.withinTimeout(5000);
      const startTime = new Date();
      const ctx = createTestContext({
        startTime,
        endTime: new Date(startTime.getTime() + 1000),
      });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(true);
    });

    it("Fails when execution exceeds timeout", async () => {
      const condition = StandardConditions.withinTimeout(1000);
      const startTime = new Date();
      const ctx = createTestContext({
        startTime,
        endTime: new Date(startTime.getTime() + 5000),
      });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });

    it("Fails when endTime not set", async () => {
      const condition = StandardConditions.withinTimeout(5000);
      const ctx = createTestContext({ endTime: undefined });

      const result = await condition.evaluate(ctx);
      expect(result.passed).toBe(false);
    });
  });
});
