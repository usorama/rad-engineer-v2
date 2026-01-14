/**
 * RepeatUntilExecutor - Declarative Verification Loops
 * Phase 4: Primitives
 *
 * Executes iteration functions until exit conditions are met.
 * Designed for TDD workflows, quality gates, and verification loops.
 *
 * Responsibilities:
 * - Execute iteration functions repeatedly
 * - Evaluate exit conditions after each iteration
 * - Track iteration history and state
 * - Support cancellation and resumable loops
 *
 * Use cases:
 * - TDD: Repeat until all tests pass
 * - Quality gates: Repeat until coverage threshold met
 * - Drift correction: Repeat until 0% drift
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";
import { ScopeLevel } from "@/memory/Scope.js";
import { ConditionEvaluator } from "./ConditionEvaluator.js";
import type {
  RepeatUntilOptions,
  RepeatUntilResult,
  LoopContext,
  IterationResult,
  LoopState,
  LoopEvent,
  RepeatUntilLoop,
  ExitCondition,
} from "./types.js";
import { RepeatUntilException, RepeatUntilError } from "./types.js";

/**
 * Configuration for RepeatUntilExecutor
 */
export interface RepeatUntilExecutorConfig {
  /** HierarchicalMemory instance */
  memory: HierarchicalMemory;
  /** Condition evaluator (optional - will create one if not provided) */
  conditionEvaluator?: ConditionEvaluator;
  /** Working directory for commands */
  workingDirectory?: string;
}

/**
 * Events emitted by RepeatUntilExecutor
 */
export interface RepeatUntilEvents {
  loop_started: (event: LoopEvent) => void;
  iteration_started: (event: LoopEvent) => void;
  iteration_completed: (event: LoopEvent) => void;
  condition_evaluated: (event: LoopEvent) => void;
  loop_completed: (event: LoopEvent) => void;
  loop_cancelled: (event: LoopEvent) => void;
  loop_error: (event: LoopEvent) => void;
}

/**
 * RepeatUntilExecutor - Executes declarative verification loops
 *
 * @example
 * ```ts
 * const executor = new RepeatUntilExecutor({ memory });
 *
 * // TDD loop - repeat until tests pass
 * const result = await executor.execute(
 *   async (ctx) => {
 *     // Implement code
 *     return runImplementation();
 *   },
 *   {
 *     loopId: "tdd-auth",
 *     name: "TDD: Implement Auth",
 *     exitCondition: CommonConditions.testsPassing(),
 *     maxIterations: 5,
 *   }
 * );
 *
 * if (result.success) {
 *   console.log("Tests pass! Loop completed in", result.totalIterations, "iterations");
 * }
 * ```
 */
export class RepeatUntilExecutor extends EventEmitter {
  private readonly memory: HierarchicalMemory;
  private readonly conditionEvaluator: ConditionEvaluator;
  private readonly workingDirectory: string;

  private activeLoops: Map<string, LoopState> = new Map();
  private cancellationRequests: Set<string> = new Set();

  constructor(config: RepeatUntilExecutorConfig) {
    super();
    this.memory = config.memory;
    this.workingDirectory = config.workingDirectory ?? process.cwd();
    this.conditionEvaluator =
      config.conditionEvaluator ??
      new ConditionEvaluator({
        memory: this.memory,
        workingDirectory: this.workingDirectory,
      });
  }

  /**
   * Execute a repeat-until loop
   *
   * @param iterationFn - Function to execute each iteration
   * @param options - Loop configuration
   * @returns Loop result
   */
  async execute<T>(
    iterationFn: (ctx: LoopContext) => Promise<T>,
    options: RepeatUntilOptions
  ): Promise<RepeatUntilResult> {
    // Check if loop is already running
    if (this.activeLoops.has(options.loopId)) {
      throw new RepeatUntilException(
        RepeatUntilError.LOOP_ALREADY_RUNNING,
        `Loop ${options.loopId} is already running`,
        { loopId: options.loopId }
      );
    }

    const startTime = Date.now();
    const iterations: IterationResult[] = [];
    const userData = new Map<string, unknown>();

    // Create memory scope for this loop
    const scopeId = this.memory.createScope({
      goal: options.memoryGoal ?? `RepeatUntil: ${options.name}`,
      level: ScopeLevel.TASK,
    });

    // Initialize loop state
    const loopState: LoopState = {
      loopId: options.loopId,
      name: options.name,
      status: "running",
      currentIteration: 0,
      maxIterations: options.maxIterations,
      elapsedMs: 0,
      exitConditionName: options.exitCondition.name,
      conditionSatisfied: false,
      progressPercent: 0,
    };
    this.activeLoops.set(options.loopId, loopState);

    // Emit loop started event
    this.emitEvent("loop_started", options.loopId, options.name, {
      maxIterations: options.maxIterations,
      exitCondition: options.exitCondition.name,
    });

    let exitReason: RepeatUntilResult["exitReason"] = "max_iterations";
    let finalConditionEvaluation;
    let error: Error | undefined;

    try {
      // Main loop
      for (let iteration = 1; iteration <= options.maxIterations; iteration++) {
        // Check for cancellation
        if (this.cancellationRequests.has(options.loopId)) {
          exitReason = "cancelled";
          break;
        }

        // Check for timeout
        const elapsedMs = Date.now() - startTime;
        if (options.timeoutMs && elapsedMs >= options.timeoutMs) {
          exitReason = "timeout";
          break;
        }

        // Update loop state
        loopState.currentIteration = iteration;
        loopState.elapsedMs = elapsedMs;
        loopState.progressPercent = Math.round(
          (iteration / options.maxIterations) * 100
        );

        // Create loop context
        const context: LoopContext = {
          iteration,
          completedIterations: iteration - 1,
          maxIterations: options.maxIterations,
          previousResults: [...iterations],
          lastResult: iterations[iterations.length - 1] ?? null,
          startTime: new Date(startTime),
          elapsedMs,
          memory: this.memory,
          scopeId,
          userData,
          cancellationRequested: this.cancellationRequests.has(options.loopId),
        };

        // Emit iteration started
        this.emitEvent("iteration_started", options.loopId, options.name, {
          iteration,
          maxIterations: options.maxIterations,
        });

        // Execute iteration
        const iterationResult = await this.executeIteration(
          iterationFn,
          context,
          options.exitCondition
        );
        iterations.push(iterationResult);

        // Update loop state
        loopState.conditionSatisfied =
          iterationResult.conditionResult?.satisfied ?? false;

        // Emit iteration completed
        this.emitEvent("iteration_completed", options.loopId, options.name, {
          iteration,
          success: iterationResult.success,
          conditionSatisfied: loopState.conditionSatisfied,
          durationMs: iterationResult.durationMs,
        });

        // Check if exit condition is satisfied
        if (iterationResult.conditionResult?.satisfied) {
          exitReason = "condition_met";
          finalConditionEvaluation = iterationResult.conditionResult;
          break;
        }

        // Apply iteration delay
        if (options.iterationDelayMs && iteration < options.maxIterations) {
          await this.delay(options.iterationDelayMs);
        }
      }
    } catch (err) {
      exitReason = "error";
      error = err instanceof Error ? err : new Error(String(err));

      // Emit error event
      this.emitEvent("loop_error", options.loopId, options.name, {
        error: error.message,
        iteration: loopState.currentIteration,
      });
    } finally {
      // Clean up
      this.activeLoops.delete(options.loopId);
      this.cancellationRequests.delete(options.loopId);

      // Close memory scope with summary
      await this.memory.closeScope(`Loop ${options.name} completed: ${exitReason}`);
    }

    const totalDurationMs = Date.now() - startTime;
    const success = exitReason === "condition_met";

    // Update final loop state
    loopState.status = success ? "completed" : exitReason === "cancelled" ? "cancelled" : "failed";
    loopState.elapsedMs = totalDurationMs;

    // Emit loop completed event
    this.emitEvent(
      exitReason === "cancelled" ? "loop_cancelled" : "loop_completed",
      options.loopId,
      options.name,
      {
        success,
        exitReason,
        totalIterations: iterations.length,
        totalDurationMs,
      }
    );

    // Convert userData Map to Record for result
    const finalUserData: Record<string, unknown> = {};
    userData.forEach((value, key) => {
      finalUserData[key] = value;
    });

    return {
      loopId: options.loopId,
      loopName: options.name,
      success,
      exitReason,
      totalIterations: iterations.length,
      totalDurationMs,
      iterations,
      finalConditionEvaluation,
      error,
      scopeId,
      finalUserData,
    };
  }

  /**
   * Execute a single iteration
   */
  private async executeIteration<T>(
    iterationFn: (ctx: LoopContext) => Promise<T>,
    context: LoopContext,
    exitCondition: ExitCondition
  ): Promise<IterationResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    let success = true;
    let output: unknown;
    let error: Error | undefined;

    try {
      output = await iterationFn(context);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err : new Error(String(err));
    }

    // Evaluate exit condition
    const conditionResult = await this.conditionEvaluator.evaluate(
      exitCondition,
      context
    );

    // Emit condition evaluated event
    this.emitEvent("condition_evaluated", context.scopeId, "", {
      iteration: context.iteration,
      conditionName: exitCondition.name,
      satisfied: conditionResult.satisfied,
      message: conditionResult.message,
    });

    return {
      iteration: context.iteration,
      success,
      output,
      error,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      conditionResult,
    };
  }

  /**
   * Cancel a running loop
   *
   * @param loopId - ID of the loop to cancel
   */
  cancel(loopId: string): void {
    if (this.activeLoops.has(loopId)) {
      this.cancellationRequests.add(loopId);
    }
  }

  /**
   * Get the state of a specific loop
   *
   * @param loopId - Loop ID
   * @returns Loop state or null if not found
   */
  getLoopState(loopId: string): LoopState | null {
    return this.activeLoops.get(loopId) ?? null;
  }

  /**
   * Get all active loops
   *
   * @returns Array of active loop states
   */
  getActiveLoops(): LoopState[] {
    return Array.from(this.activeLoops.values());
  }

  /**
   * Check if a loop is running
   */
  isRunning(loopId: string): boolean {
    return this.activeLoops.has(loopId);
  }

  /**
   * Emit a loop event
   */
  private emitEvent(
    type: LoopEvent["type"],
    loopId: string,
    loopName: string,
    data: Record<string, unknown>
  ): void {
    const event: LoopEvent = {
      type,
      loopId,
      loopName,
      timestamp: new Date().toISOString(),
      data,
    };
    this.emit(type, event);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a serializable loop state for persistence
   */
  createPersistableLoop(
    options: RepeatUntilOptions,
    iterations: IterationResult[]
  ): RepeatUntilLoop {
    return {
      loopId: options.loopId,
      name: options.name,
      status: "running",
      currentIteration: iterations.length,
      maxIterations: options.maxIterations,
      options,
      iterations,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      userData: {},
      exitConditionConfig: {
        type: options.exitCondition.type,
        name: options.exitCondition.name,
        description: options.exitCondition.description,
      },
    };
  }
}

// Re-export types for convenience
export type {
  RepeatUntilOptions,
  RepeatUntilResult,
  LoopContext,
  IterationResult,
  LoopState,
  LoopEvent,
};
