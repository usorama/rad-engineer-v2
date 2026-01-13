/**
 * AgentContract - Defines verifiable contracts for agent execution
 *
 * Part of the Verifiable Agentic Contract (VAC) system that ensures
 * deterministic, reproducible execution through formal contracts.
 *
 * Each contract specifies:
 * - Preconditions that must hold before execution
 * - Postconditions that must hold after execution
 * - Invariants that must hold throughout execution
 * - Verification method (runtime, property-test, or formal)
 */

import type {
  Condition,
  ConditionResult,
  ExecutionContext,
  ExecutionState,
} from "./Condition.js";

/**
 * Task types supported by the contract system
 */
export type TaskType =
  | "implement_feature"
  | "fix_bug"
  | "refactor"
  | "test"
  | "review"
  | "deploy"
  | "custom";

/**
 * Verification methods for contracts
 */
export type VerificationMethod =
  | "runtime"
  | "property-test"
  | "formal"
  | "hybrid";

/**
 * Contract evaluation result
 */
export interface ContractEvaluationResult {
  /** Whether all conditions passed */
  success: boolean;
  /** Contract that was evaluated */
  contractId: string;
  /** Contract name */
  contractName: string;
  /** Precondition results */
  preconditionResults: ConditionResult[];
  /** Postcondition results */
  postconditionResults: ConditionResult[];
  /** Invariant results */
  invariantResults: ConditionResult[];
  /** Failed conditions */
  failures: ConditionResult[];
  /** Warnings (passed but with severity warning) */
  warnings: ConditionResult[];
  /** Evaluation timestamp */
  evaluatedAt: Date;
  /** Total evaluation duration in ms */
  totalDurationMs: number;
}

/**
 * Contract definition
 */
export interface AgentContractDefinition {
  /** Unique contract identifier */
  id: string;
  /** Human-readable contract name */
  name: string;
  /** Task type this contract applies to */
  taskType: TaskType;
  /** Preconditions that must hold before execution */
  preconditions: Condition[];
  /** Postconditions that must hold after execution */
  postconditions: Condition[];
  /** Invariants that must hold throughout execution */
  invariants: Condition[];
  /** Verification method to use */
  verificationMethod: VerificationMethod;
  /** Optional description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Whether this contract is enabled */
  enabled?: boolean;
}

/**
 * Contract evaluation options
 */
export interface EvaluationOptions {
  /** Whether to evaluate preconditions */
  checkPreconditions?: boolean;
  /** Whether to evaluate postconditions */
  checkPostconditions?: boolean;
  /** Whether to evaluate invariants */
  checkInvariants?: boolean;
  /** Whether to stop on first failure */
  stopOnFirstFailure?: boolean;
  /** Maximum evaluation timeout in ms */
  timeout?: number;
}

/**
 * AgentContract - Encapsulates a verifiable contract for agent execution
 *
 * @example
 * ```ts
 * const implementFeatureContract = new AgentContract({
 *   id: "contract-001",
 *   name: "Implement Feature Contract",
 *   taskType: "implement_feature",
 *   preconditions: [
 *     StandardConditions.hasInput("specification"),
 *     StandardConditions.inputNotEmpty("specification"),
 *   ],
 *   postconditions: [
 *     StandardConditions.hasOutput("code"),
 *     StandardConditions.hasOutput("tests"),
 *     StandardConditions.noError(),
 *   ],
 *   invariants: [
 *     StandardConditions.validState(["EXECUTING", "VERIFYING"]),
 *   ],
 *   verificationMethod: "runtime",
 * });
 *
 * // Evaluate preconditions
 * const preResult = await implementFeatureContract.evaluatePreconditions(ctx);
 * if (!preResult.success) {
 *   throw new Error("Preconditions failed");
 * }
 *
 * // Execute task...
 *
 * // Evaluate postconditions
 * const postResult = await implementFeatureContract.evaluatePostconditions(ctx);
 * ```
 */
export class AgentContract {
  readonly id: string;
  readonly name: string;
  readonly taskType: TaskType;
  readonly verificationMethod: VerificationMethod;
  readonly description?: string;
  readonly tags: string[];
  readonly enabled: boolean;

  private readonly preconditions: Condition[];
  private readonly postconditions: Condition[];
  private readonly invariants: Condition[];

  constructor(definition: AgentContractDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.taskType = definition.taskType;
    this.preconditions = definition.preconditions;
    this.postconditions = definition.postconditions;
    this.invariants = definition.invariants;
    this.verificationMethod = definition.verificationMethod;
    this.description = definition.description;
    this.tags = definition.tags || [];
    this.enabled = definition.enabled !== false; // Default true
  }

  /**
   * Get preconditions
   */
  getPreconditions(): Condition[] {
    return [...this.preconditions];
  }

  /**
   * Get postconditions
   */
  getPostconditions(): Condition[] {
    return [...this.postconditions];
  }

  /**
   * Get invariants
   */
  getInvariants(): Condition[] {
    return [...this.invariants];
  }

  /**
   * Evaluate preconditions
   */
  async evaluatePreconditions(
    ctx: ExecutionContext
  ): Promise<ContractEvaluationResult> {
    return this.evaluateConditions(ctx, {
      checkPreconditions: true,
      checkPostconditions: false,
      checkInvariants: false,
    });
  }

  /**
   * Evaluate postconditions
   */
  async evaluatePostconditions(
    ctx: ExecutionContext
  ): Promise<ContractEvaluationResult> {
    return this.evaluateConditions(ctx, {
      checkPreconditions: false,
      checkPostconditions: true,
      checkInvariants: false,
    });
  }

  /**
   * Evaluate invariants
   */
  async evaluateInvariants(
    ctx: ExecutionContext
  ): Promise<ContractEvaluationResult> {
    return this.evaluateConditions(ctx, {
      checkPreconditions: false,
      checkPostconditions: false,
      checkInvariants: true,
    });
  }

  /**
   * Evaluate all conditions
   */
  async evaluateAll(
    ctx: ExecutionContext,
    options: EvaluationOptions = {}
  ): Promise<ContractEvaluationResult> {
    const opts: EvaluationOptions = {
      checkPreconditions: true,
      checkPostconditions: true,
      checkInvariants: true,
      ...options,
    };
    return this.evaluateConditions(ctx, opts);
  }

  /**
   * Internal condition evaluation
   */
  private async evaluateConditions(
    ctx: ExecutionContext,
    options: EvaluationOptions
  ): Promise<ContractEvaluationResult> {
    const startTime = performance.now();
    const {
      checkPreconditions = true,
      checkPostconditions = true,
      checkInvariants = true,
      stopOnFirstFailure = false,
    } = options;

    const preconditionResults: ConditionResult[] = [];
    const postconditionResults: ConditionResult[] = [];
    const invariantResults: ConditionResult[] = [];
    const failures: ConditionResult[] = [];
    const warnings: ConditionResult[] = [];

    // Helper to evaluate a condition set
    const evaluateSet = async (
      conditions: Condition[],
      results: ConditionResult[]
    ): Promise<boolean> => {
      for (const condition of conditions) {
        const result = await condition.evaluate(ctx);
        results.push(result);

        if (!result.passed) {
          if (result.severity === "error") {
            failures.push(result);
            if (stopOnFirstFailure) {
              return false;
            }
          } else {
            warnings.push(result);
          }
        }
      }
      return true;
    };

    // Evaluate each set in order
    if (checkPreconditions) {
      const continueEval = await evaluateSet(
        this.preconditions,
        preconditionResults
      );
      if (!continueEval && stopOnFirstFailure) {
        return this.buildResult(
          startTime,
          preconditionResults,
          postconditionResults,
          invariantResults,
          failures,
          warnings
        );
      }
    }

    if (checkPostconditions) {
      const continueEval = await evaluateSet(
        this.postconditions,
        postconditionResults
      );
      if (!continueEval && stopOnFirstFailure) {
        return this.buildResult(
          startTime,
          preconditionResults,
          postconditionResults,
          invariantResults,
          failures,
          warnings
        );
      }
    }

    if (checkInvariants) {
      await evaluateSet(this.invariants, invariantResults);
    }

    return this.buildResult(
      startTime,
      preconditionResults,
      postconditionResults,
      invariantResults,
      failures,
      warnings
    );
  }

  /**
   * Build evaluation result
   */
  private buildResult(
    startTime: number,
    preconditionResults: ConditionResult[],
    postconditionResults: ConditionResult[],
    invariantResults: ConditionResult[],
    failures: ConditionResult[],
    warnings: ConditionResult[]
  ): ContractEvaluationResult {
    const endTime = performance.now();

    return {
      success: failures.length === 0,
      contractId: this.id,
      contractName: this.name,
      preconditionResults,
      postconditionResults,
      invariantResults,
      failures,
      warnings,
      evaluatedAt: new Date(),
      totalDurationMs: endTime - startTime,
    };
  }

  /**
   * Create a copy of this contract with additional preconditions
   */
  withPreconditions(conditions: Condition[]): AgentContract {
    return new AgentContract({
      id: this.id,
      name: this.name,
      taskType: this.taskType,
      preconditions: [...this.preconditions, ...conditions],
      postconditions: this.postconditions,
      invariants: this.invariants,
      verificationMethod: this.verificationMethod,
      description: this.description,
      tags: this.tags,
      enabled: this.enabled,
    });
  }

  /**
   * Create a copy of this contract with additional postconditions
   */
  withPostconditions(conditions: Condition[]): AgentContract {
    return new AgentContract({
      id: this.id,
      name: this.name,
      taskType: this.taskType,
      preconditions: this.preconditions,
      postconditions: [...this.postconditions, ...conditions],
      invariants: this.invariants,
      verificationMethod: this.verificationMethod,
      description: this.description,
      tags: this.tags,
      enabled: this.enabled,
    });
  }

  /**
   * Create a copy of this contract with additional invariants
   */
  withInvariants(conditions: Condition[]): AgentContract {
    return new AgentContract({
      id: this.id,
      name: this.name,
      taskType: this.taskType,
      preconditions: this.preconditions,
      postconditions: this.postconditions,
      invariants: [...this.invariants, ...conditions],
      verificationMethod: this.verificationMethod,
      description: this.description,
      tags: this.tags,
      enabled: this.enabled,
    });
  }

  /**
   * Check if this contract is applicable to a task type
   */
  appliesTo(taskType: TaskType): boolean {
    return this.taskType === taskType || this.taskType === "custom";
  }

  /**
   * Convert to JSON-serializable format
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      taskType: this.taskType,
      verificationMethod: this.verificationMethod,
      description: this.description,
      tags: this.tags,
      enabled: this.enabled,
      preconditionCount: this.preconditions.length,
      postconditionCount: this.postconditions.length,
      invariantCount: this.invariants.length,
    };
  }
}

/**
 * Builder for creating contracts fluently
 */
export class ContractBuilder {
  private id: string = "";
  private name: string = "";
  private taskType: TaskType = "custom";
  private preconditions: Condition[] = [];
  private postconditions: Condition[] = [];
  private invariants: Condition[] = [];
  private verificationMethod: VerificationMethod = "runtime";
  private description?: string;
  private tags: string[] = [];
  private enabled: boolean = true;

  /**
   * Set contract ID
   */
  withId(id: string): ContractBuilder {
    this.id = id;
    return this;
  }

  /**
   * Set contract name
   */
  withName(name: string): ContractBuilder {
    this.name = name;
    return this;
  }

  /**
   * Set task type
   */
  forTaskType(taskType: TaskType): ContractBuilder {
    this.taskType = taskType;
    return this;
  }

  /**
   * Add precondition
   */
  addPrecondition(condition: Condition): ContractBuilder {
    this.preconditions.push(condition);
    return this;
  }

  /**
   * Add preconditions
   */
  addPreconditions(conditions: Condition[]): ContractBuilder {
    this.preconditions.push(...conditions);
    return this;
  }

  /**
   * Add postcondition
   */
  addPostcondition(condition: Condition): ContractBuilder {
    this.postconditions.push(condition);
    return this;
  }

  /**
   * Add postconditions
   */
  addPostconditions(conditions: Condition[]): ContractBuilder {
    this.postconditions.push(...conditions);
    return this;
  }

  /**
   * Add invariant
   */
  addInvariant(condition: Condition): ContractBuilder {
    this.invariants.push(condition);
    return this;
  }

  /**
   * Add invariants
   */
  addInvariants(conditions: Condition[]): ContractBuilder {
    this.invariants.push(...conditions);
    return this;
  }

  /**
   * Set verification method
   */
  withVerificationMethod(method: VerificationMethod): ContractBuilder {
    this.verificationMethod = method;
    return this;
  }

  /**
   * Set description
   */
  withDescription(description: string): ContractBuilder {
    this.description = description;
    return this;
  }

  /**
   * Add tags
   */
  withTags(tags: string[]): ContractBuilder {
    this.tags = tags;
    return this;
  }

  /**
   * Set enabled status
   */
  setEnabled(enabled: boolean): ContractBuilder {
    this.enabled = enabled;
    return this;
  }

  /**
   * Build the contract
   */
  build(): AgentContract {
    if (!this.id) {
      throw new Error("Contract ID is required");
    }
    if (!this.name) {
      throw new Error("Contract name is required");
    }

    return new AgentContract({
      id: this.id,
      name: this.name,
      taskType: this.taskType,
      preconditions: this.preconditions,
      postconditions: this.postconditions,
      invariants: this.invariants,
      verificationMethod: this.verificationMethod,
      description: this.description,
      tags: this.tags,
      enabled: this.enabled,
    });
  }
}

/**
 * Standard contracts for common task types
 */
export const StandardContracts = {
  /**
   * Create a new contract builder
   */
  builder: () => new ContractBuilder(),
};
