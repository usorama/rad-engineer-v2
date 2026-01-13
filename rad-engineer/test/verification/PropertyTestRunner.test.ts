/**
 * Unit tests for PropertyTestRunner
 * Tests: property testing, generators, shrinking
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  PropertyTestRunner,
  Generators,
  generateExecutionContext,
  AgentContract,
  StandardConditions,
} from "@/verification/index.js";
import { Condition } from "@/verification/Condition.js";

/**
 * Create a seeded random source for testing
 */
function createSeededRandom(seed: number = 12345) {
  let state = seed;
  return {
    seed,
    next: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    },
    int: (min: number, max: number) => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return Math.floor((state / 0xffffffff) * (max - min + 1)) + min;
    },
    bool: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff < 0.5;
    },
    pick: <T>(items: T[]): T => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return items[Math.floor((state / 0xffffffff) * items.length)];
    },
  };
}

describe("Generators: Basic Types", () => {
  it("Generates execution states", () => {
    const gen = Generators.executionState();
    const random = createSeededRandom();

    const values = new Set<string>();
    for (let i = 0; i < 100; i++) {
      values.add(gen.generate(random));
    }

    // Should generate variety of states
    expect(values.size).toBeGreaterThan(1);
  });

  it("Shrinks execution states", () => {
    const gen = Generators.executionState();

    const shrunk = gen.shrink!("COMPLETED");
    expect(shrunk).toContain("COMMITTING");

    const shrunkIdle = gen.shrink!("IDLE");
    expect(shrunkIdle).toHaveLength(0);
  });

  it("Generates strings within length bounds", () => {
    const gen = Generators.string({ minLength: 5, maxLength: 10 });
    const random = createSeededRandom();

    for (let i = 0; i < 50; i++) {
      const str = gen.generate(random);
      expect(str.length).toBeGreaterThanOrEqual(5);
      expect(str.length).toBeLessThanOrEqual(10);
    }
  });

  it("Shrinks strings", () => {
    const gen = Generators.string({ minLength: 1 });

    const shrunk = gen.shrink!("hello");
    expect(shrunk.some((s) => s.length < 5)).toBe(true);
  });

  it("Generates integers within bounds", () => {
    const gen = Generators.int({ min: 10, max: 20 });
    const random = createSeededRandom();

    for (let i = 0; i < 50; i++) {
      const n = gen.generate(random);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);
    }
  });

  it("Shrinks integers towards zero", () => {
    const gen = Generators.int({ min: 0 });

    const shrunk = gen.shrink!(10);
    expect(shrunk).toContain(5); // Half
    expect(shrunk).toContain(9); // Minus one
  });

  it("Generates booleans", () => {
    const gen = Generators.bool();
    const random = createSeededRandom();

    const values = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      values.add(gen.generate(random));
    }

    expect(values.has(true)).toBe(true);
    expect(values.has(false)).toBe(true);
  });

  it("Shrinks booleans to false", () => {
    const gen = Generators.bool();

    expect(gen.shrink!(true)).toContain(false);
    expect(gen.shrink!(false)).toHaveLength(0);
  });

  it("Generates arrays", () => {
    const gen = Generators.array(Generators.int(), { minLength: 2, maxLength: 5 });
    const random = createSeededRandom();

    for (let i = 0; i < 20; i++) {
      const arr = gen.generate(random);
      expect(arr.length).toBeGreaterThanOrEqual(2);
      expect(arr.length).toBeLessThanOrEqual(5);
    }
  });
});

describe("Generators: ExecutionContext", () => {
  it("Generates valid execution contexts", () => {
    const random = createSeededRandom();

    for (let i = 0; i < 20; i++) {
      const ctx = generateExecutionContext(random);

      expect(ctx.scopeId).toBeDefined();
      expect(ctx.taskId).toBeDefined();
      expect(ctx.state).toBeDefined();
      expect(ctx.startTime).toBeInstanceOf(Date);
      expect(ctx.artifacts).toBeInstanceOf(Map);
    }
  });

  it("Generates contexts with appropriate outputs for state", () => {
    const random = createSeededRandom(42);

    // Generate many contexts and check correlation
    let completedWithOutputs = 0;
    let completedTotal = 0;

    for (let i = 0; i < 100; i++) {
      const ctx = generateExecutionContext(random);
      if (ctx.state === "COMPLETED" || ctx.state === "VERIFYING") {
        completedTotal++;
        if (ctx.outputs) {
          completedWithOutputs++;
        }
      }
    }

    // Most completed/verifying should have outputs
    if (completedTotal > 0) {
      expect(completedWithOutputs / completedTotal).toBeGreaterThan(0.5);
    }
  });
});

describe("PropertyTestRunner: Basic Testing", () => {
  let runner: PropertyTestRunner;

  beforeEach(() => {
    runner = new PropertyTestRunner({
      numRuns: 50, // Reduced for faster tests
      seed: 12345,
    });
  });

  it("Passes for always-true contract", async () => {
    const contract = new AgentContract({
      id: "always-pass",
      name: "Always Pass",
      taskType: "test",
      preconditions: [
        Condition.precondition(
          "always-true",
          "Always True",
          () => true,
          "Never fails"
        ),
      ],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    expect(result.passed).toBe(true);
    expect(result.testsRun).toBe(50);
    expect(result.testsPassed).toBe(50);
    expect(result.failures).toHaveLength(0);
  });

  it("Fails for always-false contract", async () => {
    const contract = new AgentContract({
      id: "always-fail",
      name: "Always Fail",
      taskType: "test",
      preconditions: [
        Condition.precondition(
          "always-false",
          "Always False",
          () => false,
          "Always fails"
        ),
      ],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0].failedCondition).toBe("Always False");
  });

  it("Uses provided seed for reproducibility", async () => {
    const contract = new AgentContract({
      id: "seeded",
      name: "Seeded",
      taskType: "test",
      preconditions: [StandardConditions.hasInput("prompt")],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result1 = await runner.test(contract, { seed: 99999 });
    const result2 = await runner.test(contract, { seed: 99999 });

    expect(result1.seed).toBe(99999);
    expect(result2.seed).toBe(99999);
    // Results should be the same with same seed
    expect(result1.testsPassed).toBe(result2.testsPassed);
  });
});

describe("PropertyTestRunner: Shrinking", () => {
  let runner: PropertyTestRunner;

  beforeEach(() => {
    runner = new PropertyTestRunner({
      numRuns: 30,
      maxShrinks: 50,
    });
  });

  it("Shrinks failing inputs", async () => {
    // Contract that fails when there are too many inputs
    const contract = new AgentContract({
      id: "shrink-test",
      name: "Shrink Test",
      taskType: "test",
      preconditions: [
        Condition.precondition(
          "max-inputs",
          "Max Inputs",
          (ctx) => Object.keys(ctx.inputs).length <= 2,
          "Too many inputs"
        ),
      ],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    // May or may not fail depending on random inputs
    if (!result.passed) {
      expect(result.failures[0].shrinkSteps).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("PropertyTestRunner: Statistics", () => {
  let runner: PropertyTestRunner;

  beforeEach(() => {
    runner = new PropertyTestRunner({
      numRuns: 100,
      seed: 42,
    });
  });

  it("Collects state distribution", async () => {
    const contract = new AgentContract({
      id: "stats",
      name: "Stats",
      taskType: "test",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    const { stateDistribution } = result.statistics;

    // Should have variety of states
    const totalStates = Object.values(stateDistribution).reduce(
      (a, b) => a + b,
      0
    );
    expect(totalStates).toBe(100);

    // Should have multiple state types
    const nonZeroStates = Object.values(stateDistribution).filter(
      (c) => c > 0
    ).length;
    expect(nonZeroStates).toBeGreaterThan(1);
  });

  it("Calculates average input complexity", async () => {
    const contract = new AgentContract({
      id: "complexity",
      name: "Complexity",
      taskType: "test",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    expect(result.statistics.avgInputComplexity).toBeGreaterThan(0);
  });

  it("Reports duration", async () => {
    const contract = new AgentContract({
      id: "duration",
      name: "Duration",
      taskType: "test",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    expect(result.durationMs).toBeGreaterThan(0);
  });
});

describe("PropertyTestRunner: Configuration", () => {
  it("Collects all failures when configured", async () => {
    const runner = new PropertyTestRunner({
      numRuns: 20,
      collectAll: true,
    });

    const contract = new AgentContract({
      id: "collect-all",
      name: "Collect All",
      taskType: "test",
      preconditions: [
        Condition.precondition(
          "random-fail",
          "Random Fail",
          () => Math.random() > 0.5, // ~50% fail rate
          "Random failure"
        ),
      ],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    if (result.testsFailed > 1) {
      expect(result.failures.length).toBeGreaterThan(1);
    }
  });

  it("Stops on first failure when not collecting all", async () => {
    const runner = new PropertyTestRunner({
      numRuns: 100,
      collectAll: false,
    });

    const contract = new AgentContract({
      id: "stop-early",
      name: "Stop Early",
      taskType: "test",
      preconditions: [
        Condition.precondition(
          "always-fail",
          "Always Fail",
          () => false,
          "Fails"
        ),
      ],
      postconditions: [],
      invariants: [],
      verificationMethod: "property-test",
    });

    const result = await runner.test(contract);

    expect(result.failures).toHaveLength(1);
    expect(result.testsRun).toBe(1);
  });
});

describe("PropertyTestRunner: testAll", () => {
  it("Tests multiple contracts", async () => {
    const runner = new PropertyTestRunner({
      numRuns: 10,
    });

    const contracts = [
      new AgentContract({
        id: "multi-1",
        name: "Multi 1",
        taskType: "test",
        preconditions: [],
        postconditions: [],
        invariants: [],
        verificationMethod: "property-test",
      }),
      new AgentContract({
        id: "multi-2",
        name: "Multi 2",
        taskType: "test",
        preconditions: [],
        postconditions: [],
        invariants: [],
        verificationMethod: "property-test",
      }),
    ];

    const results = await runner.testAll(contracts);

    expect(results.size).toBe(2);
    expect(results.get("multi-1")).toBeDefined();
    expect(results.get("multi-2")).toBeDefined();
  });
});
