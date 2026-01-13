/**
 * PropertyTestRunner - Hypothesis-style property testing for contracts
 *
 * Implements property-based testing to verify that contracts hold
 * across a wide range of generated inputs. Inspired by Hypothesis (Python)
 * and fast-check (JavaScript).
 *
 * Features:
 * - Random input generation with configurable strategies
 * - Shrinking to find minimal failing cases
 * - Reproducible tests with seed control
 * - Statistical analysis of test results
 */

import type { AgentContract } from "./AgentContract.js";
import type { ExecutionContext, ExecutionState } from "./Condition.js";

/**
 * Generator strategy for a specific type
 */
export interface Generator<T> {
  /** Generate a random value */
  generate: (random: RandomSource) => T;
  /** Shrink a value to simpler forms */
  shrink?: (value: T) => T[];
}

/**
 * Random source for reproducible generation
 */
export interface RandomSource {
  /** Get next random number [0, 1) */
  next(): number;
  /** Get random integer in range [min, max] */
  int(min: number, max: number): number;
  /** Get random boolean */
  bool(): boolean;
  /** Pick random element from array */
  pick<T>(items: T[]): T;
  /** Get current seed */
  seed: number;
}

/**
 * Property test configuration
 */
export interface PropertyTestConfig {
  /** Number of test cases to run */
  numRuns?: number;
  /** Seed for reproducibility */
  seed?: number;
  /** Maximum shrink attempts */
  maxShrinks?: number;
  /** Timeout per test in ms */
  timeout?: number;
  /** Whether to continue on failure */
  collectAll?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Property test result
 */
export interface PropertyTestResult {
  /** Whether all tests passed */
  passed: boolean;
  /** Number of tests run */
  testsRun: number;
  /** Number of tests passed */
  testsPassed: number;
  /** Number of tests failed */
  testsFailed: number;
  /** Failing examples (shrunk to minimal) */
  failures: FailingExample[];
  /** Seed used for this run */
  seed: number;
  /** Total duration in ms */
  durationMs: number;
  /** Statistics about generated inputs */
  statistics: TestStatistics;
}

/**
 * A failing test example
 */
export interface FailingExample {
  /** The input that caused failure */
  input: ExecutionContext;
  /** The shrunk (minimal) input */
  shrunkInput?: ExecutionContext;
  /** Error message */
  error: string;
  /** Which condition failed */
  failedCondition: string;
  /** Number of shrink steps */
  shrinkSteps: number;
}

/**
 * Test statistics
 */
export interface TestStatistics {
  /** Distribution of execution states tested */
  stateDistribution: Record<ExecutionState, number>;
  /** Average input complexity */
  avgInputComplexity: number;
  /** Shrink success rate */
  shrinkSuccessRate: number;
  /** Average shrink steps for failures */
  avgShrinkSteps: number;
}

/**
 * Simple seeded random number generator (LCG)
 */
class SeededRandom implements RandomSource {
  private state: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }

  next(): number {
    // LCG parameters from Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(): boolean {
    return this.next() < 0.5;
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

/**
 * Built-in generators
 */
export const Generators = {
  /**
   * Generate execution states
   */
  executionState: (): Generator<ExecutionState> => ({
    generate: (r) =>
      r.pick<ExecutionState>([
        "IDLE",
        "PLANNING",
        "EXECUTING",
        "VERIFYING",
        "COMMITTING",
        "COMPLETED",
        "FAILED",
      ]),
    shrink: (s) => {
      // Shrink towards simpler states
      const order: ExecutionState[] = [
        "IDLE",
        "PLANNING",
        "EXECUTING",
        "VERIFYING",
        "COMMITTING",
        "COMPLETED",
        "FAILED",
      ];
      const idx = order.indexOf(s);
      return idx > 0 ? [order[idx - 1]] : [];
    },
  }),

  /**
   * Generate strings
   */
  string: (options?: {
    minLength?: number;
    maxLength?: number;
    chars?: string;
  }): Generator<string> => {
    const { minLength = 0, maxLength = 20, chars = "abcdefghijklmnopqrstuvwxyz0123456789" } =
      options || {};
    return {
      generate: (r) => {
        const length = r.int(minLength, maxLength);
        let result = "";
        for (let i = 0; i < length; i++) {
          result += chars[r.int(0, chars.length - 1)];
        }
        return result;
      },
      shrink: (s) => {
        const shrunk: string[] = [];
        // Try shorter strings
        if (s.length > minLength) {
          shrunk.push(s.slice(0, -1));
          shrunk.push(s.slice(1));
        }
        // Try simpler characters
        if (s.length > 0 && s[0] !== "a") {
          shrunk.push("a" + s.slice(1));
        }
        return shrunk;
      },
    };
  },

  /**
   * Generate integers
   */
  int: (options?: { min?: number; max?: number }): Generator<number> => {
    const { min = 0, max = 100 } = options || {};
    return {
      generate: (r) => r.int(min, max),
      shrink: (n) => {
        const shrunk: number[] = [];
        // Shrink towards zero
        if (n > min) {
          shrunk.push(Math.max(min, Math.floor(n / 2)));
          shrunk.push(n - 1);
        }
        if (n < max && n > 0) {
          shrunk.push(n + 1);
        }
        return shrunk;
      },
    };
  },

  /**
   * Generate booleans
   */
  bool: (): Generator<boolean> => ({
    generate: (r) => r.bool(),
    shrink: (b) => (b ? [false] : []),
  }),

  /**
   * Generate objects with shape
   */
  object: <T extends Record<string, unknown>>(
    shape: Record<keyof T, Generator<unknown>>
  ): Generator<T> => ({
    generate: (r) => {
      const result: Record<string, unknown> = {};
      for (const [key, gen] of Object.entries(shape)) {
        result[key] = (gen as Generator<unknown>).generate(r);
      }
      return result as T;
    },
    shrink: (obj) => {
      const shrunk: T[] = [];
      for (const [key, gen] of Object.entries(shape)) {
        const shrinker = (gen as Generator<unknown>).shrink;
        if (shrinker) {
          const shrunkenValues = shrinker(obj[key as keyof T] as unknown);
          for (const v of shrunkenValues) {
            shrunk.push({ ...obj, [key]: v });
          }
        }
      }
      return shrunk;
    },
  }),

  /**
   * Generate arrays
   */
  array: <T>(
    elementGen: Generator<T>,
    options?: { minLength?: number; maxLength?: number }
  ): Generator<T[]> => {
    const { minLength = 0, maxLength = 10 } = options || {};
    return {
      generate: (r) => {
        const length = r.int(minLength, maxLength);
        const result: T[] = [];
        for (let i = 0; i < length; i++) {
          result.push(elementGen.generate(r));
        }
        return result;
      },
      shrink: (arr) => {
        const shrunk: T[][] = [];
        // Try shorter arrays
        if (arr.length > minLength) {
          shrunk.push(arr.slice(0, -1));
          shrunk.push(arr.slice(1));
        }
        // Try shrinking elements
        if (elementGen.shrink) {
          for (let i = 0; i < arr.length; i++) {
            const shrunkElements = elementGen.shrink(arr[i]);
            for (const el of shrunkElements) {
              const newArr = [...arr];
              newArr[i] = el;
              shrunk.push(newArr);
            }
          }
        }
        return shrunk;
      },
    };
  },
};

/**
 * Generate ExecutionContext for testing
 */
export function generateExecutionContext(random: RandomSource): ExecutionContext {
  const stateGen = Generators.executionState();
  const state = stateGen.generate(random);

  const hasError = state === "FAILED" && random.bool();
  const hasOutputs = ["COMPLETED", "VERIFYING", "COMMITTING"].includes(state);
  const hasEndTime = state === "COMPLETED" || state === "FAILED";

  const startTime = new Date(Date.now() - random.int(0, 10000));
  const endTime = hasEndTime ? new Date(startTime.getTime() + random.int(0, 5000)) : undefined;

  return {
    scopeId: `scope-${random.int(1, 100)}`,
    taskId: `task-${random.int(1, 1000)}`,
    inputs: generateInputs(random),
    outputs: hasOutputs ? generateOutputs(random) : undefined,
    state,
    artifacts: new Map(),
    startTime,
    endTime,
    error: hasError ? new Error(`Test error ${random.int(1, 100)}`) : undefined,
  };
}

/**
 * Generate random inputs
 */
function generateInputs(random: RandomSource): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  const numInputs = random.int(0, 5);

  for (let i = 0; i < numInputs; i++) {
    const key = `input${i}`;
    const type = random.int(0, 3);

    switch (type) {
      case 0:
        inputs[key] = Generators.string().generate(random);
        break;
      case 1:
        inputs[key] = random.int(0, 1000);
        break;
      case 2:
        inputs[key] = random.bool();
        break;
      case 3:
        inputs[key] = null;
        break;
    }
  }

  // Sometimes add common input names
  if (random.bool()) {
    inputs.prompt = Generators.string({ minLength: 5, maxLength: 50 }).generate(random);
  }
  if (random.bool()) {
    inputs.specification = random.bool() ? "Some specification" : "";
  }

  return inputs;
}

/**
 * Generate random outputs
 */
function generateOutputs(random: RandomSource): Record<string, unknown> {
  const outputs: Record<string, unknown> = {};

  if (random.bool()) {
    outputs.code = `const result = ${random.int(0, 100)};`;
  }
  if (random.bool()) {
    outputs.tests = `describe('test', () => { it('works', () => {}); });`;
  }
  if (random.bool()) {
    outputs.summary = Generators.string({ minLength: 10, maxLength: 100 }).generate(random);
  }

  return outputs;
}

/**
 * Shrink an ExecutionContext to a simpler form
 */
function shrinkExecutionContext(ctx: ExecutionContext): ExecutionContext[] {
  const shrunk: ExecutionContext[] = [];

  // Shrink inputs
  const inputKeys = Object.keys(ctx.inputs);
  if (inputKeys.length > 0) {
    for (const key of inputKeys) {
      const newInputs = { ...ctx.inputs };
      delete newInputs[key];
      shrunk.push({ ...ctx, inputs: newInputs });
    }
  }

  // Shrink outputs
  if (ctx.outputs) {
    const outputKeys = Object.keys(ctx.outputs);
    if (outputKeys.length > 0) {
      for (const key of outputKeys) {
        const newOutputs = { ...ctx.outputs };
        delete newOutputs[key];
        shrunk.push({ ...ctx, outputs: newOutputs });
      }
    }
    // Try without outputs
    shrunk.push({ ...ctx, outputs: undefined });
  }

  // Try without error
  if (ctx.error) {
    shrunk.push({ ...ctx, error: undefined });
  }

  // Shrink state towards IDLE
  const stateOrder: ExecutionState[] = [
    "IDLE",
    "PLANNING",
    "EXECUTING",
    "VERIFYING",
    "COMMITTING",
    "COMPLETED",
    "FAILED",
  ];
  const stateIdx = stateOrder.indexOf(ctx.state);
  if (stateIdx > 0) {
    shrunk.push({ ...ctx, state: stateOrder[stateIdx - 1] });
  }

  return shrunk;
}

/**
 * PropertyTestRunner - Runs property tests on contracts
 *
 * @example
 * ```ts
 * const runner = new PropertyTestRunner();
 *
 * const result = await runner.test(myContract, {
 *   numRuns: 100,
 *   seed: 12345, // For reproducibility
 * });
 *
 * if (!result.passed) {
 *   console.log("Failed with input:", result.failures[0].shrunkInput);
 * }
 * ```
 */
export class PropertyTestRunner {
  private config: PropertyTestConfig;

  constructor(config: PropertyTestConfig = {}) {
    this.config = {
      numRuns: 100,
      seed: Date.now(),
      maxShrinks: 100,
      timeout: 5000,
      collectAll: false,
      verbose: false,
      ...config,
    };
  }

  /**
   * Run property tests on a contract
   */
  async test(
    contract: AgentContract,
    config?: Partial<PropertyTestConfig>
  ): Promise<PropertyTestResult> {
    const mergedConfig = { ...this.config, ...config };
    const {
      numRuns = 100,
      seed = Date.now(),
      maxShrinks = 100,
      collectAll = false,
      verbose = false,
    } = mergedConfig;

    const startTime = performance.now();
    const random = new SeededRandom(seed);

    let testsRun = 0;
    let testsPassed = 0;
    const failures: FailingExample[] = [];
    const stateDistribution: Record<ExecutionState, number> = {
      IDLE: 0,
      PLANNING: 0,
      EXECUTING: 0,
      VERIFYING: 0,
      COMMITTING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };
    let totalShrinkSteps = 0;

    for (let i = 0; i < numRuns; i++) {
      testsRun++;
      const ctx = generateExecutionContext(random);
      stateDistribution[ctx.state]++;

      if (verbose) {
        console.log(`Test ${i + 1}/${numRuns}: state=${ctx.state}`);
      }

      try {
        const result = await contract.evaluateAll(ctx);

        if (result.success) {
          testsPassed++;
        } else {
          // Find the first failing condition
          const failedCondition =
            result.failures[0]?.conditionName || "Unknown";

          // Attempt to shrink
          const shrinkResult = await this.shrink(
            contract,
            ctx,
            failedCondition,
            maxShrinks
          );

          failures.push({
            input: ctx,
            shrunkInput: shrinkResult.shrunkInput,
            error: result.failures[0]?.errorMessage || "Contract evaluation failed",
            failedCondition,
            shrinkSteps: shrinkResult.steps,
          });

          totalShrinkSteps += shrinkResult.steps;

          if (!collectAll) {
            break;
          }
        }
      } catch (error) {
        failures.push({
          input: ctx,
          error: error instanceof Error ? error.message : String(error),
          failedCondition: "evaluation",
          shrinkSteps: 0,
        });

        if (!collectAll) {
          break;
        }
      }
    }

    const endTime = performance.now();

    return {
      passed: failures.length === 0,
      testsRun,
      testsPassed,
      testsFailed: failures.length,
      failures,
      seed,
      durationMs: endTime - startTime,
      statistics: {
        stateDistribution,
        avgInputComplexity: this.calculateAvgComplexity(stateDistribution),
        shrinkSuccessRate:
          failures.length > 0
            ? failures.filter((f) => f.shrunkInput !== undefined).length /
              failures.length
            : 1,
        avgShrinkSteps:
          failures.length > 0 ? totalShrinkSteps / failures.length : 0,
      },
    };
  }

  /**
   * Shrink a failing input to a minimal case
   */
  private async shrink(
    contract: AgentContract,
    originalCtx: ExecutionContext,
    failedCondition: string,
    maxShrinks: number
  ): Promise<{ shrunkInput?: ExecutionContext; steps: number }> {
    let current = originalCtx;
    let steps = 0;

    while (steps < maxShrinks) {
      const candidates = shrinkExecutionContext(current);
      let foundSmaller = false;

      for (const candidate of candidates) {
        steps++;
        if (steps >= maxShrinks) break;

        try {
          const result = await contract.evaluateAll(candidate);

          // If still fails with same condition, use this smaller input
          if (
            !result.success &&
            result.failures.some((f) => f.conditionName === failedCondition)
          ) {
            current = candidate;
            foundSmaller = true;
            break;
          }
        } catch {
          // If evaluation throws, consider it a failure and try to shrink further
          current = candidate;
          foundSmaller = true;
          break;
        }
      }

      if (!foundSmaller) {
        break;
      }
    }

    return {
      shrunkInput: current !== originalCtx ? current : undefined,
      steps,
    };
  }

  /**
   * Calculate average input complexity
   */
  private calculateAvgComplexity(
    stateDistribution: Record<ExecutionState, number>
  ): number {
    const stateComplexity: Record<ExecutionState, number> = {
      IDLE: 1,
      PLANNING: 2,
      EXECUTING: 3,
      VERIFYING: 4,
      COMMITTING: 5,
      COMPLETED: 5,
      FAILED: 4,
    };

    let totalComplexity = 0;
    let totalCount = 0;

    for (const [state, count] of Object.entries(stateDistribution)) {
      totalComplexity += stateComplexity[state as ExecutionState] * count;
      totalCount += count;
    }

    return totalCount > 0 ? totalComplexity / totalCount : 0;
  }

  /**
   * Run property tests on multiple contracts
   */
  async testAll(
    contracts: AgentContract[],
    config?: Partial<PropertyTestConfig>
  ): Promise<Map<string, PropertyTestResult>> {
    const results = new Map<string, PropertyTestResult>();

    for (const contract of contracts) {
      results.set(contract.id, await this.test(contract, config));
    }

    return results;
  }
}
