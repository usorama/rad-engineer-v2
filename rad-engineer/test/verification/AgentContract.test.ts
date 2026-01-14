/**
 * Unit tests for AgentContract
 * Tests: contract creation, evaluation, builder pattern
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  AgentContract,
  ContractBuilder,
  type ExecutionContext,
  type ExecutionState,
} from "@/verification/index.js";
import { Condition, StandardConditions } from "@/verification/Condition.js";

/**
 * Create a basic test context
 */
function createTestContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    scopeId: "test-scope",
    taskId: "test-task",
    inputs: { prompt: "test prompt", specification: "test spec" },
    outputs: { code: "const x = 1;", tests: "test('x', () => {});" },
    state: "COMPLETED" as ExecutionState,
    artifacts: new Map(),
    startTime: new Date(),
    endTime: new Date(),
    ...overrides,
  };
}

describe("AgentContract: Basic Creation", () => {
  it("Creates contract with required fields", () => {
    const contract = new AgentContract({
      id: "contract-001",
      name: "Test Contract",
      taskType: "implement_feature",
      preconditions: [StandardConditions.hasInput("prompt")],
      postconditions: [StandardConditions.hasOutput("code")],
      invariants: [],
      verificationMethod: "runtime",
    });

    expect(contract.id).toBe("contract-001");
    expect(contract.name).toBe("Test Contract");
    expect(contract.taskType).toBe("implement_feature");
    expect(contract.verificationMethod).toBe("runtime");
    expect(contract.enabled).toBe(true);
  });

  it("Creates contract with optional fields", () => {
    const contract = new AgentContract({
      id: "contract-002",
      name: "Full Contract",
      taskType: "fix_bug",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
      description: "A test contract",
      tags: ["test", "example"],
      enabled: false,
    });

    expect(contract.description).toBe("A test contract");
    expect(contract.tags).toEqual(["test", "example"]);
    expect(contract.enabled).toBe(false);
  });
});

describe("AgentContract: Condition Accessors", () => {
  let contract: AgentContract;

  beforeEach(() => {
    contract = new AgentContract({
      id: "test-contract",
      name: "Test",
      taskType: "implement_feature",
      preconditions: [
        StandardConditions.hasInput("prompt"),
        StandardConditions.hasInput("specification"),
      ],
      postconditions: [
        StandardConditions.hasOutput("code"),
        StandardConditions.noError(),
      ],
      invariants: [
        StandardConditions.validState(["EXECUTING", "VERIFYING", "COMPLETED"]),
      ],
      verificationMethod: "runtime",
    });
  });

  it("Returns copy of preconditions", () => {
    const preconditions = contract.getPreconditions();
    expect(preconditions).toHaveLength(2);

    // Verify it's a copy
    preconditions.pop();
    expect(contract.getPreconditions()).toHaveLength(2);
  });

  it("Returns copy of postconditions", () => {
    const postconditions = contract.getPostconditions();
    expect(postconditions).toHaveLength(2);
  });

  it("Returns copy of invariants", () => {
    const invariants = contract.getInvariants();
    expect(invariants).toHaveLength(1);
  });
});

describe("AgentContract: Evaluation", () => {
  let contract: AgentContract;

  beforeEach(() => {
    contract = new AgentContract({
      id: "eval-contract",
      name: "Evaluation Test",
      taskType: "implement_feature",
      preconditions: [
        StandardConditions.hasInput("prompt"),
        StandardConditions.inputNotEmpty("prompt"),
      ],
      postconditions: [
        StandardConditions.hasOutput("code"),
        StandardConditions.noError(),
      ],
      invariants: [
        StandardConditions.validState(["EXECUTING", "VERIFYING", "COMPLETED"]),
      ],
      verificationMethod: "runtime",
    });
  });

  it("Evaluates preconditions successfully", async () => {
    const ctx = createTestContext();
    const result = await contract.evaluatePreconditions(ctx);

    expect(result.success).toBe(true);
    expect(result.contractId).toBe("eval-contract");
    expect(result.preconditionResults).toHaveLength(2);
    expect(result.postconditionResults).toHaveLength(0);
    expect(result.invariantResults).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  it("Fails preconditions when input missing", async () => {
    const ctx = createTestContext({ inputs: {} });
    const result = await contract.evaluatePreconditions(ctx);

    expect(result.success).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0].type).toBe("precondition");
  });

  it("Evaluates postconditions successfully", async () => {
    const ctx = createTestContext();
    const result = await contract.evaluatePostconditions(ctx);

    expect(result.success).toBe(true);
    expect(result.postconditionResults).toHaveLength(2);
    expect(result.preconditionResults).toHaveLength(0);
  });

  it("Fails postconditions when output missing", async () => {
    const ctx = createTestContext({ outputs: {} });
    const result = await contract.evaluatePostconditions(ctx);

    expect(result.success).toBe(false);
    expect(result.failures.some((f) => f.type === "postcondition")).toBe(true);
  });

  it("Evaluates invariants successfully", async () => {
    const ctx = createTestContext({ state: "EXECUTING" });
    const result = await contract.evaluateInvariants(ctx);

    expect(result.success).toBe(true);
    expect(result.invariantResults).toHaveLength(1);
  });

  it("Fails invariants when state invalid", async () => {
    const ctx = createTestContext({ state: "FAILED" });
    const result = await contract.evaluateInvariants(ctx);

    expect(result.success).toBe(false);
    expect(result.failures.some((f) => f.type === "invariant")).toBe(true);
  });

  it("Evaluates all conditions", async () => {
    const ctx = createTestContext();
    const result = await contract.evaluateAll(ctx);

    expect(result.success).toBe(true);
    expect(result.preconditionResults).toHaveLength(2);
    expect(result.postconditionResults).toHaveLength(2);
    expect(result.invariantResults).toHaveLength(1);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("Stops on first failure when configured", async () => {
    const ctx = createTestContext({ inputs: {}, outputs: {} });
    const result = await contract.evaluateAll(ctx, { stopOnFirstFailure: true });

    expect(result.success).toBe(false);
    // Should stop after first precondition fails
    expect(result.failures).toHaveLength(1);
  });

  it("Collects all failures when not stopping on first", async () => {
    const ctx = createTestContext({
      inputs: {},
      outputs: {},
      state: "FAILED",
    });
    const result = await contract.evaluateAll(ctx, {
      stopOnFirstFailure: false,
    });

    expect(result.success).toBe(false);
    // Should have multiple failures
    expect(result.failures.length).toBeGreaterThan(1);
  });
});

describe("AgentContract: Composition", () => {
  let baseContract: AgentContract;

  beforeEach(() => {
    baseContract = new AgentContract({
      id: "base-contract",
      name: "Base",
      taskType: "implement_feature",
      preconditions: [StandardConditions.hasInput("prompt")],
      postconditions: [StandardConditions.hasOutput("code")],
      invariants: [],
      verificationMethod: "runtime",
    });
  });

  it("Creates new contract with additional preconditions", () => {
    const extended = baseContract.withPreconditions([
      StandardConditions.hasInput("specification"),
    ]);

    expect(extended.getPreconditions()).toHaveLength(2);
    expect(baseContract.getPreconditions()).toHaveLength(1);
  });

  it("Creates new contract with additional postconditions", () => {
    const extended = baseContract.withPostconditions([
      StandardConditions.hasOutput("tests"),
    ]);

    expect(extended.getPostconditions()).toHaveLength(2);
    expect(baseContract.getPostconditions()).toHaveLength(1);
  });

  it("Creates new contract with additional invariants", () => {
    const extended = baseContract.withInvariants([
      StandardConditions.validState(["EXECUTING"]),
    ]);

    expect(extended.getInvariants()).toHaveLength(1);
    expect(baseContract.getInvariants()).toHaveLength(0);
  });
});

describe("AgentContract: Builder Pattern", () => {
  it("Builds contract with builder", () => {
    const contract = new ContractBuilder()
      .withId("builder-001")
      .withName("Built Contract")
      .forTaskType("refactor")
      .addPrecondition(StandardConditions.hasInput("code"))
      .addPostcondition(StandardConditions.hasOutput("code"))
      .withVerificationMethod("property-test")
      .withDescription("A built contract")
      .withTags(["builder", "test"])
      .setEnabled(true)
      .build();

    expect(contract.id).toBe("builder-001");
    expect(contract.name).toBe("Built Contract");
    expect(contract.taskType).toBe("refactor");
    expect(contract.verificationMethod).toBe("property-test");
    expect(contract.description).toBe("A built contract");
    expect(contract.tags).toEqual(["builder", "test"]);
    expect(contract.getPreconditions()).toHaveLength(1);
    expect(contract.getPostconditions()).toHaveLength(1);
  });

  it("Adds multiple conditions at once", () => {
    const contract = new ContractBuilder()
      .withId("multi-001")
      .withName("Multi Conditions")
      .forTaskType("test")
      .addPreconditions([
        StandardConditions.hasInput("code"),
        StandardConditions.hasInput("testFile"),
      ])
      .addPostconditions([
        StandardConditions.hasOutput("tests"),
        StandardConditions.noError(),
      ])
      .addInvariants([StandardConditions.validState(["EXECUTING", "COMPLETED"])])
      .build();

    expect(contract.getPreconditions()).toHaveLength(2);
    expect(contract.getPostconditions()).toHaveLength(2);
    expect(contract.getInvariants()).toHaveLength(1);
  });

  it("Throws when ID missing", () => {
    const builder = new ContractBuilder().withName("No ID");

    expect(() => builder.build()).toThrow("Contract ID is required");
  });

  it("Throws when name missing", () => {
    const builder = new ContractBuilder().withId("no-name");

    expect(() => builder.build()).toThrow("Contract name is required");
  });
});

describe("AgentContract: Utility Methods", () => {
  it("Checks task type applicability", () => {
    const contract = new AgentContract({
      id: "feature-contract",
      name: "Feature",
      taskType: "implement_feature",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    expect(contract.appliesTo("implement_feature")).toBe(true);
    expect(contract.appliesTo("fix_bug")).toBe(false);
  });

  it("Custom task type applies to all", () => {
    const contract = new AgentContract({
      id: "custom-contract",
      name: "Custom",
      taskType: "custom",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    expect(contract.appliesTo("implement_feature")).toBe(true);
    expect(contract.appliesTo("fix_bug")).toBe(true);
    expect(contract.appliesTo("custom")).toBe(true);
  });

  it("Converts to JSON", () => {
    const contract = new AgentContract({
      id: "json-contract",
      name: "JSON Test",
      taskType: "test",
      preconditions: [StandardConditions.hasInput("code")],
      postconditions: [
        StandardConditions.hasOutput("tests"),
        StandardConditions.noError(),
      ],
      invariants: [],
      verificationMethod: "runtime",
      description: "Test JSON conversion",
      tags: ["json", "test"],
    });

    const json = contract.toJSON();

    expect(json.id).toBe("json-contract");
    expect(json.name).toBe("JSON Test");
    expect(json.taskType).toBe("test");
    expect(json.verificationMethod).toBe("runtime");
    expect(json.preconditionCount).toBe(1);
    expect(json.postconditionCount).toBe(2);
    expect(json.invariantCount).toBe(0);
    expect(json.tags).toEqual(["json", "test"]);
  });
});
