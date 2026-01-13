/**
 * Condition - Foundation for pre/post/invariant conditions in VAC
 * Provides the building blocks for contract-first execution verification
 */

/**
 * Severity levels for condition violations
 */
export type ConditionSeverity = "error" | "warning";

/**
 * Condition types for classification
 */
export type ConditionType = "precondition" | "postcondition" | "invariant";

/**
 * Execution context passed to condition predicates
 */
export interface ExecutionContext {
  /** Current scope ID from HierarchicalMemory */
  scopeId: string;
  /** Task/action being executed */
  taskId: string;
  /** Input parameters */
  inputs: Record<string, unknown>;
  /** Output results (populated for postconditions) */
  outputs?: Record<string, unknown>;
  /** Current state of execution */
  state: ExecutionState;
  /** Artifacts from memory */
  artifacts: Map<string, unknown>;
  /** Start time of execution */
  startTime: Date;
  /** End time of execution (populated for postconditions) */
  endTime?: Date;
  /** Error if execution failed */
  error?: Error;
}

/**
 * Possible execution states
 */
export type ExecutionState =
  | "IDLE"
  | "PLANNING"
  | "EXECUTING"
  | "VERIFYING"
  | "COMMITTING"
  | "COMPLETED"
  | "FAILED";

/**
 * Result of evaluating a condition
 */
export interface ConditionResult {
  /** Whether the condition passed */
  passed: boolean;
  /** The condition that was evaluated */
  conditionId: string;
  /** Condition name */
  conditionName: string;
  /** Condition type */
  type: ConditionType;
  /** Error message if failed */
  errorMessage?: string;
  /** Severity if failed */
  severity?: ConditionSeverity;
  /** Evaluation timestamp */
  evaluatedAt: Date;
  /** Duration of evaluation in ms */
  evaluationDurationMs: number;
  /** Additional context from evaluation */
  context?: Record<string, unknown>;
}

/**
 * Condition definition for contract verification
 */
export interface ConditionDefinition {
  /** Unique condition identifier */
  id: string;
  /** Human-readable condition name */
  name: string;
  /** Condition type */
  type: ConditionType;
  /** Predicate function to evaluate condition */
  predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>;
  /** Error message when condition fails */
  errorMessage: string;
  /** Severity of violation */
  severity: ConditionSeverity;
  /** Optional description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Condition - Encapsulates a single verifiable condition
 *
 * @example
 * ```ts
 * const hasInputs = new Condition({
 *   id: "pre-001",
 *   name: "Has Required Inputs",
 *   type: "precondition",
 *   predicate: (ctx) => ctx.inputs.prompt !== undefined,
 *   errorMessage: "Missing required prompt input",
 *   severity: "error"
 * });
 *
 * const result = await hasInputs.evaluate(context);
 * ```
 */
export class Condition {
  readonly id: string;
  readonly name: string;
  readonly type: ConditionType;
  readonly errorMessage: string;
  readonly severity: ConditionSeverity;
  readonly description?: string;
  readonly tags: string[];

  private readonly predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>;

  constructor(definition: ConditionDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.type = definition.type;
    this.predicate = definition.predicate;
    this.errorMessage = definition.errorMessage;
    this.severity = definition.severity;
    this.description = definition.description;
    this.tags = definition.tags || [];
  }

  /**
   * Evaluate this condition against an execution context
   */
  async evaluate(ctx: ExecutionContext): Promise<ConditionResult> {
    const startTime = performance.now();

    try {
      const passed = await this.predicate(ctx);
      const endTime = performance.now();

      return {
        passed,
        conditionId: this.id,
        conditionName: this.name,
        type: this.type,
        errorMessage: passed ? undefined : this.errorMessage,
        severity: passed ? undefined : this.severity,
        evaluatedAt: new Date(),
        evaluationDurationMs: endTime - startTime,
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        passed: false,
        conditionId: this.id,
        conditionName: this.name,
        type: this.type,
        errorMessage: `Condition evaluation failed: ${errorMsg}`,
        severity: "error",
        evaluatedAt: new Date(),
        evaluationDurationMs: endTime - startTime,
        context: { evaluationError: errorMsg },
      };
    }
  }

  /**
   * Create a precondition
   */
  static precondition(
    id: string,
    name: string,
    predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>,
    errorMessage: string,
    severity: ConditionSeverity = "error"
  ): Condition {
    return new Condition({
      id,
      name,
      type: "precondition",
      predicate,
      errorMessage,
      severity,
    });
  }

  /**
   * Create a postcondition
   */
  static postcondition(
    id: string,
    name: string,
    predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>,
    errorMessage: string,
    severity: ConditionSeverity = "error"
  ): Condition {
    return new Condition({
      id,
      name,
      type: "postcondition",
      predicate,
      errorMessage,
      severity,
    });
  }

  /**
   * Create an invariant
   */
  static invariant(
    id: string,
    name: string,
    predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>,
    errorMessage: string,
    severity: ConditionSeverity = "error"
  ): Condition {
    return new Condition({
      id,
      name,
      type: "invariant",
      predicate,
      errorMessage,
      severity,
    });
  }
}

/**
 * Standard preconditions for common use cases
 */
export const StandardConditions = {
  /**
   * Ensure required input exists
   */
  hasInput: (inputName: string): Condition =>
    Condition.precondition(
      `pre-has-${inputName}`,
      `Has ${inputName} Input`,
      (ctx) => ctx.inputs[inputName] !== undefined,
      `Missing required input: ${inputName}`
    ),

  /**
   * Ensure input is not empty
   */
  inputNotEmpty: (inputName: string): Condition =>
    Condition.precondition(
      `pre-${inputName}-not-empty`,
      `${inputName} Not Empty`,
      (ctx) => {
        const value = ctx.inputs[inputName];
        if (typeof value === "string") return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined;
      },
      `Input ${inputName} must not be empty`
    ),

  /**
   * Ensure output exists
   */
  hasOutput: (outputName: string): Condition =>
    Condition.postcondition(
      `post-has-${outputName}`,
      `Has ${outputName} Output`,
      (ctx) => ctx.outputs?.[outputName] !== undefined,
      `Missing required output: ${outputName}`
    ),

  /**
   * Ensure execution succeeded (no error)
   */
  noError: (): Condition =>
    Condition.postcondition(
      "post-no-error",
      "Execution Succeeded",
      (ctx) => ctx.error === undefined,
      "Execution must complete without errors"
    ),

  /**
   * Ensure state is valid
   */
  validState: (allowedStates: ExecutionState[]): Condition =>
    Condition.invariant(
      "inv-valid-state",
      "Valid Execution State",
      (ctx) => allowedStates.includes(ctx.state),
      `State must be one of: ${allowedStates.join(", ")}`
    ),

  /**
   * Ensure execution completes within timeout
   */
  withinTimeout: (maxDurationMs: number): Condition =>
    Condition.postcondition(
      "post-within-timeout",
      `Completes Within ${maxDurationMs}ms`,
      (ctx) => {
        if (!ctx.endTime) return false;
        const duration = ctx.endTime.getTime() - ctx.startTime.getTime();
        return duration <= maxDurationMs;
      },
      `Execution exceeded timeout of ${maxDurationMs}ms`
    ),
};
