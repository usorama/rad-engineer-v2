/**
 * RepeatUntil Primitive Types
 * Phase 1: Core Types and Interfaces
 *
 * Provides declarative verification loops for TDD and quality gate workflows.
 * RepeatUntil executes until exit conditions are met or max iterations reached.
 *
 * Key concepts:
 * - ExitCondition: Declarative condition for loop termination
 * - LoopContext: Runtime context passed to each iteration
 * - RepeatUntilResult: Final result of loop execution
 *
 * Use cases:
 * - TDD: Repeat until all tests pass
 * - Quality gates: Repeat until coverage threshold met
 * - Drift correction: Repeat until 0% drift achieved
 */

import type { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";

/**
 * Boolean condition - TypeScript predicate function
 * Returns true when condition is met
 */
export interface BooleanCondition {
  type: "boolean";
  /** Name for logging/display */
  name: string;
  /** Predicate function that evaluates the condition */
  predicate: (context: LoopContext) => boolean | Promise<boolean>;
  /** Description of what this condition checks */
  description?: string;
}

/**
 * Command condition - Shell command execution
 * Exit code 0 = success/condition met
 */
export interface CommandCondition {
  type: "command";
  /** Name for logging/display */
  name: string;
  /** Shell command to execute */
  command: string;
  /** Expected exit code for success (default: 0) */
  expectedExitCode?: number;
  /** Working directory for command */
  cwd?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Description of what this command checks */
  description?: string;
}

/**
 * Step reference condition - Check step/artifact output
 * Looks up a step or artifact and evaluates its value
 */
export interface StepReferenceCondition {
  type: "step_reference";
  /** Name for logging/display */
  name: string;
  /** Step ID or artifact key to look up */
  reference: string;
  /** Expected value (uses deep equality) */
  expectedValue: unknown;
  /** Path within step output to check (e.g., "result.success") */
  path?: string;
  /** Description of what this reference checks */
  description?: string;
}

/**
 * Drift condition - Check for code drift
 * Based on DriftDetector analysis
 */
export interface DriftCondition {
  type: "drift";
  /** Name for logging/display */
  name: string;
  /** Target drift percentage (default: 0) */
  targetDriftPercent?: number;
  /** Files or patterns to check for drift */
  scope?: string[];
  /** Description of what this drift check covers */
  description?: string;
}

/**
 * Composite condition - Combine multiple conditions with AND/OR logic
 */
export interface CompositeCondition {
  type: "composite";
  /** Name for logging/display */
  name: string;
  /** Logical operator */
  operator: "AND" | "OR";
  /** Child conditions */
  conditions: ExitCondition[];
  /** Description of this composite condition */
  description?: string;
}

/**
 * Union type for all exit condition types
 */
export type ExitCondition =
  | BooleanCondition
  | CommandCondition
  | StepReferenceCondition
  | DriftCondition
  | CompositeCondition;

/**
 * Result of evaluating a single iteration
 */
export interface IterationResult {
  /** Iteration number (1-indexed) */
  iteration: number;
  /** Whether the iteration executed successfully */
  success: boolean;
  /** Output from the iteration function */
  output?: unknown;
  /** Error if iteration failed */
  error?: Error;
  /** ISO timestamp when iteration started */
  startedAt: string;
  /** ISO timestamp when iteration completed */
  completedAt: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Exit condition evaluation result */
  conditionResult?: ConditionEvaluationResult;
}

/**
 * Result of evaluating an exit condition
 */
export interface ConditionEvaluationResult {
  /** Whether the condition was satisfied */
  satisfied: boolean;
  /** Condition name */
  conditionName: string;
  /** Condition type */
  conditionType: ExitCondition["type"];
  /** Actual value observed */
  actualValue?: unknown;
  /** Expected value */
  expectedValue?: unknown;
  /** Evaluation message */
  message: string;
  /** Evaluation duration in ms */
  durationMs: number;
  /** Child results for composite conditions */
  childResults?: ConditionEvaluationResult[];
}

/**
 * Runtime context passed to each iteration
 */
export interface LoopContext {
  /** Current iteration number (1-indexed) */
  iteration: number;
  /** Total completed iterations */
  completedIterations: number;
  /** Maximum iterations allowed */
  maxIterations: number;
  /** Results from previous iterations */
  previousResults: IterationResult[];
  /** Result from the last iteration */
  lastResult: IterationResult | null;
  /** Loop start time */
  startTime: Date;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Reference to HierarchicalMemory */
  memory: HierarchicalMemory;
  /** Memory scope ID for this loop */
  scopeId: string;
  /** User-defined data store for cross-iteration state */
  userData: Map<string, unknown>;
  /** Whether loop cancellation has been requested */
  cancellationRequested: boolean;
}

/**
 * Configuration options for RepeatUntil execution
 */
export interface RepeatUntilOptions {
  /** Unique loop identifier */
  loopId: string;
  /** Human-readable loop name */
  name: string;
  /** Exit condition that must be satisfied */
  exitCondition: ExitCondition;
  /** Maximum iterations (safety limit) */
  maxIterations: number;
  /** Total timeout in milliseconds (optional) */
  timeoutMs?: number;
  /** Delay between iterations in milliseconds */
  iterationDelayMs?: number;
  /** Whether loop state should be resumable */
  resumable?: boolean;
  /** Goal description for memory scope */
  memoryGoal?: string;
  /** Create checkpoints during execution */
  enableCheckpoints?: boolean;
  /** Checkpoint frequency (every N iterations) */
  checkpointFrequency?: number;
}

/**
 * Reason for loop exit
 */
export type LoopExitReason =
  | "condition_met"        // Exit condition satisfied
  | "max_iterations"       // Hit maxIterations limit
  | "timeout"              // Hit timeout limit
  | "error"                // Unrecoverable error
  | "cancelled";           // User/system cancellation

/**
 * Final result of RepeatUntil execution
 */
export interface RepeatUntilResult {
  /** Loop identifier */
  loopId: string;
  /** Loop name */
  loopName: string;
  /** Whether loop completed successfully (condition met) */
  success: boolean;
  /** Reason for loop exit */
  exitReason: LoopExitReason;
  /** Total iterations executed */
  totalIterations: number;
  /** Total execution duration in milliseconds */
  totalDurationMs: number;
  /** All iteration results */
  iterations: IterationResult[];
  /** Final condition evaluation (when exit) */
  finalConditionEvaluation?: ConditionEvaluationResult;
  /** Error if loop failed */
  error?: Error;
  /** Memory scope ID used */
  scopeId: string;
  /** User data state at loop end */
  finalUserData: Record<string, unknown>;
}

/**
 * Loop state for persistence (resumable loops)
 */
export interface RepeatUntilLoop {
  /** Loop identifier */
  loopId: string;
  /** Loop name */
  name: string;
  /** Current status */
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  /** Current iteration (1-indexed) */
  currentIteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** Loop options */
  options: RepeatUntilOptions;
  /** Iteration results so far */
  iterations: IterationResult[];
  /** ISO timestamp when loop started */
  startedAt: string;
  /** ISO timestamp of last activity */
  lastActivityAt: string;
  /** User data for cross-iteration state */
  userData: Record<string, unknown>;
  /** Exit condition (serialized) */
  exitConditionConfig: {
    type: ExitCondition["type"];
    name: string;
    description?: string;
    // Other serializable properties
    [key: string]: unknown;
  };
}

/**
 * Loop state for UI display (lightweight)
 */
export interface LoopState {
  /** Loop identifier */
  loopId: string;
  /** Loop name */
  name: string;
  /** Current status */
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  /** Current iteration */
  currentIteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** Elapsed time in ms */
  elapsedMs: number;
  /** Exit condition name */
  exitConditionName: string;
  /** Whether condition is currently satisfied */
  conditionSatisfied: boolean;
  /** Progress percentage (iterations / max * 100) */
  progressPercent: number;
}

/**
 * Event types for loop execution
 */
export type LoopEventType =
  | "loop_started"
  | "iteration_started"
  | "iteration_completed"
  | "condition_evaluated"
  | "loop_completed"
  | "loop_cancelled"
  | "loop_error";

/**
 * Loop event for event broadcasting
 */
export interface LoopEvent {
  /** Event type */
  type: LoopEventType;
  /** Loop identifier */
  loopId: string;
  /** Loop name */
  loopName: string;
  /** ISO timestamp */
  timestamp: string;
  /** Iteration number (if applicable) */
  iteration?: number;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Error codes for RepeatUntil operations
 */
export enum RepeatUntilError {
  LOOP_EXECUTION_FAILED = "LOOP_EXECUTION_FAILED",
  CONDITION_EVALUATION_FAILED = "CONDITION_EVALUATION_FAILED",
  MAX_ITERATIONS_EXCEEDED = "MAX_ITERATIONS_EXCEEDED",
  TIMEOUT_EXCEEDED = "TIMEOUT_EXCEEDED",
  LOOP_CANCELLED = "LOOP_CANCELLED",
  LOOP_NOT_FOUND = "LOOP_NOT_FOUND",
  LOOP_ALREADY_RUNNING = "LOOP_ALREADY_RUNNING",
  INVALID_CONDITION = "INVALID_CONDITION",
  SERIALIZATION_FAILED = "SERIALIZATION_FAILED",
}

/**
 * Custom error for RepeatUntil operations
 */
export class RepeatUntilException extends Error {
  constructor(
    public code: RepeatUntilError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RepeatUntilException";
  }
}

/**
 * Predefined exit conditions for common use cases
 */
export const CommonConditions = {
  /**
   * Tests pass condition - runs `bun test` and checks exit code
   */
  testsPassing: (options?: { cwd?: string; timeout?: number }): CommandCondition => ({
    type: "command",
    name: "Tests Passing",
    command: "bun test",
    expectedExitCode: 0,
    cwd: options?.cwd,
    timeoutMs: options?.timeout ?? 120000,
    description: "All tests must pass (exit code 0)",
  }),

  /**
   * TypeScript compiles condition - runs `bun run typecheck`
   */
  typescriptCompiles: (options?: { cwd?: string }): CommandCondition => ({
    type: "command",
    name: "TypeScript Compiles",
    command: "bun run typecheck",
    expectedExitCode: 0,
    cwd: options?.cwd,
    timeoutMs: 60000,
    description: "TypeScript compilation must succeed with 0 errors",
  }),

  /**
   * Lint passes condition - runs `bun run lint`
   */
  lintPasses: (options?: { cwd?: string }): CommandCondition => ({
    type: "command",
    name: "Lint Passes",
    command: "bun run lint",
    expectedExitCode: 0,
    cwd: options?.cwd,
    timeoutMs: 60000,
    description: "ESLint must pass with no errors",
  }),

  /**
   * Quality gates pass condition - all three: typecheck, lint, test
   */
  qualityGatesPass: (options?: { cwd?: string }): CompositeCondition => ({
    type: "composite",
    name: "Quality Gates",
    operator: "AND",
    conditions: [
      CommonConditions.typescriptCompiles(options),
      CommonConditions.lintPasses(options),
      CommonConditions.testsPassing(options),
    ],
    description: "TypeScript, ESLint, and all tests must pass",
  }),

  /**
   * Zero drift condition
   */
  zeroDrift: (scope?: string[]): DriftCondition => ({
    type: "drift",
    name: "Zero Drift",
    targetDriftPercent: 0,
    scope,
    description: "No code drift detected in specified scope",
  }),
} as const;
