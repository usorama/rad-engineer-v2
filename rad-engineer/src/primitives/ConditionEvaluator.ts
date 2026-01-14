/**
 * ConditionEvaluator - Exit Condition Evaluation
 * Phase 4: Primitives
 *
 * Evaluates exit conditions for RepeatUntil loops.
 * Supports boolean, command, step reference, drift, and composite conditions.
 *
 * Responsibilities:
 * - Evaluate all types of exit conditions
 * - Provide detailed evaluation results
 * - Handle timeouts and errors gracefully
 */

import { exec } from "child_process";
import { promisify } from "util";
import type { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";
import type {
  ExitCondition,
  BooleanCondition,
  CommandCondition,
  StepReferenceCondition,
  DriftCondition,
  CompositeCondition,
  ConditionEvaluationResult,
  LoopContext,
} from "./types.js";
import { RepeatUntilException, RepeatUntilError } from "./types.js";

const execAsync = promisify(exec);

/**
 * Configuration for ConditionEvaluator
 */
export interface ConditionEvaluatorConfig {
  /** HierarchicalMemory instance for step references */
  memory: HierarchicalMemory;
  /** Default timeout for command conditions (ms) */
  defaultCommandTimeout?: number;
  /** Working directory for commands */
  workingDirectory?: string;
}

/**
 * ConditionEvaluator - Evaluates exit conditions for RepeatUntil loops
 *
 * @example
 * ```ts
 * const evaluator = new ConditionEvaluator({
 *   memory,
 *   defaultCommandTimeout: 60000,
 * });
 *
 * const condition: CommandCondition = {
 *   type: "command",
 *   name: "Tests Pass",
 *   command: "bun test",
 *   expectedExitCode: 0,
 * };
 *
 * const result = await evaluator.evaluate(condition, loopContext);
 * if (result.satisfied) {
 *   console.log("Loop can exit");
 * }
 * ```
 */
export class ConditionEvaluator {
  private readonly memory: HierarchicalMemory;
  private readonly defaultCommandTimeout: number;
  private readonly workingDirectory: string;

  constructor(config: ConditionEvaluatorConfig) {
    this.memory = config.memory;
    this.defaultCommandTimeout = config.defaultCommandTimeout ?? 120000;
    this.workingDirectory = config.workingDirectory ?? process.cwd();
  }

  /**
   * Evaluate an exit condition
   *
   * @param condition - Condition to evaluate
   * @param context - Loop context
   * @returns Evaluation result
   */
  async evaluate(
    condition: ExitCondition,
    context: LoopContext
  ): Promise<ConditionEvaluationResult> {
    const startTime = Date.now();

    try {
      switch (condition.type) {
        case "boolean":
          return this.evaluateBoolean(condition, context, startTime);
        case "command":
          return this.evaluateCommand(condition, context, startTime);
        case "step_reference":
          return this.evaluateStepReference(condition, context, startTime);
        case "drift":
          return this.evaluateDrift(condition, context, startTime);
        case "composite":
          return this.evaluateComposite(condition, context, startTime);
        default:
          throw new RepeatUntilException(
            RepeatUntilError.INVALID_CONDITION,
            `Unknown condition type: ${(condition as ExitCondition).type}`,
            { condition }
          );
      }
    } catch (error) {
      if (error instanceof RepeatUntilException) {
        throw error;
      }

      const msg = error instanceof Error ? error.message : String(error);
      return {
        satisfied: false,
        conditionName: condition.name,
        conditionType: condition.type,
        message: `Evaluation error: ${msg}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate a boolean condition (TypeScript predicate)
   */
  private async evaluateBoolean(
    condition: BooleanCondition,
    context: LoopContext,
    startTime: number
  ): Promise<ConditionEvaluationResult> {
    try {
      const result = await condition.predicate(context);

      return {
        satisfied: result,
        conditionName: condition.name,
        conditionType: "boolean",
        actualValue: result,
        expectedValue: true,
        message: result
          ? `${condition.name}: Condition satisfied`
          : `${condition.name}: Condition not yet satisfied`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        satisfied: false,
        conditionName: condition.name,
        conditionType: "boolean",
        message: `${condition.name}: Predicate error - ${msg}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate a command condition (shell command)
   */
  private async evaluateCommand(
    condition: CommandCondition,
    _context: LoopContext,
    startTime: number
  ): Promise<ConditionEvaluationResult> {
    const timeout = condition.timeoutMs ?? this.defaultCommandTimeout;
    const expectedExitCode = condition.expectedExitCode ?? 0;
    const cwd = condition.cwd ?? this.workingDirectory;

    try {
      const { stdout, stderr } = await execAsync(condition.command, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      // Command succeeded (exit code 0)
      const satisfied = expectedExitCode === 0;

      return {
        satisfied,
        conditionName: condition.name,
        conditionType: "command",
        actualValue: 0,
        expectedValue: expectedExitCode,
        message: satisfied
          ? `${condition.name}: Command succeeded`
          : `${condition.name}: Expected exit code ${expectedExitCode}, got 0`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      // Command failed
      let exitCode: number | undefined;
      let message: string;

      if (error instanceof Error && "code" in error) {
        exitCode = typeof error.code === "number" ? error.code : undefined;
        message = error.message;
      } else {
        message = String(error);
      }

      const satisfied = exitCode === expectedExitCode;

      return {
        satisfied,
        conditionName: condition.name,
        conditionType: "command",
        actualValue: exitCode,
        expectedValue: expectedExitCode,
        message: satisfied
          ? `${condition.name}: Command returned expected exit code ${expectedExitCode}`
          : `${condition.name}: Command failed - ${message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate a step reference condition
   */
  private async evaluateStepReference(
    condition: StepReferenceCondition,
    context: LoopContext,
    startTime: number
  ): Promise<ConditionEvaluationResult> {
    // Look up the step or artifact in the loop's user data
    let actualValue: unknown;

    // Try to get from user data first
    if (context.userData.has(condition.reference)) {
      actualValue = context.userData.get(condition.reference);
    } else {
      // Not found
      return {
        satisfied: false,
        conditionName: condition.name,
        conditionType: "step_reference",
        message: `${condition.name}: Reference "${condition.reference}" not found`,
        durationMs: Date.now() - startTime,
      };
    }

    // Navigate to path if specified
    if (condition.path && actualValue !== undefined) {
      const pathParts = condition.path.split(".");
      for (const part of pathParts) {
        if (actualValue && typeof actualValue === "object" && part in actualValue) {
          actualValue = (actualValue as Record<string, unknown>)[part];
        } else {
          actualValue = undefined;
          break;
        }
      }
    }

    // Compare values
    const satisfied = this.deepEqual(actualValue, condition.expectedValue);

    return {
      satisfied,
      conditionName: condition.name,
      conditionType: "step_reference",
      actualValue,
      expectedValue: condition.expectedValue,
      message: satisfied
        ? `${condition.name}: Value matches expected`
        : `${condition.name}: Value mismatch`,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Evaluate a drift condition
   */
  private async evaluateDrift(
    condition: DriftCondition,
    _context: LoopContext,
    startTime: number
  ): Promise<ConditionEvaluationResult> {
    // For now, drift detection would integrate with DriftDetector
    // This is a placeholder that assumes no drift (for basic implementation)
    const targetDrift = condition.targetDriftPercent ?? 0;

    // TODO: Integrate with actual DriftDetector
    const actualDrift = 0; // Placeholder

    const satisfied = actualDrift <= targetDrift;

    return {
      satisfied,
      conditionName: condition.name,
      conditionType: "drift",
      actualValue: actualDrift,
      expectedValue: targetDrift,
      message: satisfied
        ? `${condition.name}: Drift ${actualDrift}% within target ${targetDrift}%`
        : `${condition.name}: Drift ${actualDrift}% exceeds target ${targetDrift}%`,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Evaluate a composite condition (AND/OR of multiple conditions)
   */
  private async evaluateComposite(
    condition: CompositeCondition,
    context: LoopContext,
    startTime: number
  ): Promise<ConditionEvaluationResult> {
    const childResults: ConditionEvaluationResult[] = [];

    // Evaluate all child conditions
    for (const child of condition.conditions) {
      const result = await this.evaluate(child, context);
      childResults.push(result);

      // Short-circuit for AND (if any fails, whole condition fails)
      if (condition.operator === "AND" && !result.satisfied) {
        return {
          satisfied: false,
          conditionName: condition.name,
          conditionType: "composite",
          message: `${condition.name}: AND condition not satisfied - ${result.conditionName} failed`,
          durationMs: Date.now() - startTime,
          childResults,
        };
      }

      // Short-circuit for OR (if any succeeds, whole condition succeeds)
      if (condition.operator === "OR" && result.satisfied) {
        return {
          satisfied: true,
          conditionName: condition.name,
          conditionType: "composite",
          message: `${condition.name}: OR condition satisfied - ${result.conditionName} passed`,
          durationMs: Date.now() - startTime,
          childResults,
        };
      }
    }

    // All conditions evaluated
    const allSatisfied = childResults.every((r) => r.satisfied);
    const anySatisfied = childResults.some((r) => r.satisfied);

    const satisfied = condition.operator === "AND" ? allSatisfied : anySatisfied;

    return {
      satisfied,
      conditionName: condition.name,
      conditionType: "composite",
      message: satisfied
        ? `${condition.name}: All ${condition.operator} conditions satisfied`
        : `${condition.name}: ${condition.operator} conditions not satisfied`,
      durationMs: Date.now() - startTime,
      childResults,
    };
  }

  /**
   * Deep equality comparison
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;

    if (typeof a !== "object") return a === b;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      this.deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  /**
   * Get a human-readable description of a condition
   */
  describeCondition(condition: ExitCondition): string {
    switch (condition.type) {
      case "boolean":
        return condition.description ?? `Boolean: ${condition.name}`;
      case "command":
        return condition.description ?? `Command: ${condition.command}`;
      case "step_reference":
        return (
          condition.description ??
          `Step Reference: ${condition.reference}${condition.path ? `.${condition.path}` : ""} = ${JSON.stringify(condition.expectedValue)}`
        );
      case "drift":
        return condition.description ?? `Drift: ${condition.targetDriftPercent ?? 0}%`;
      case "composite":
        return (
          condition.description ??
          `${condition.operator}: [${condition.conditions.map((c) => c.name).join(", ")}]`
        );
      default:
        return "Unknown condition";
    }
  }
}
