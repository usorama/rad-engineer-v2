/**
 * Transition - State transition definitions with guards and rollback
 *
 * Provides:
 * - Guard conditions for transitions
 * - Pre/post actions
 * - Rollback support for failed transitions
 * - Transition metadata and logging
 */

import type { ExecutionContext, ExecutionState } from "./Condition.js";
import { UndefinedStateError } from "./UndefinedStateError.js";

/**
 * Guard function type
 */
export type TransitionGuard = (ctx: ExecutionContext) => boolean | Promise<boolean>;

/**
 * Action function type (side effects)
 */
export type TransitionAction = (ctx: ExecutionContext) => void | Promise<void>;

/**
 * Rollback function type
 */
export type RollbackAction = (
  ctx: ExecutionContext,
  error: Error
) => void | Promise<void>;

/**
 * Transition result
 */
export interface TransitionResult {
  /** Whether transition succeeded */
  success: boolean;
  /** Source state */
  fromState: ExecutionState;
  /** Target state (actual state after transition) */
  toState: ExecutionState;
  /** Duration in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
  /** Error if failed */
  error?: Error;
  /** Whether rollback was performed */
  rolledBack?: boolean;
  /** Rollback error if rollback failed */
  rollbackError?: Error;
}

/**
 * Transition definition
 */
export interface TransitionDefinition {
  /** Unique transition ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Source state */
  from: ExecutionState;
  /** Target state */
  to: ExecutionState;
  /** Guard conditions (all must pass) */
  guards?: TransitionGuard[];
  /** Pre-transition actions */
  preActions?: TransitionAction[];
  /** Post-transition actions */
  postActions?: TransitionAction[];
  /** Rollback action if transition fails */
  rollback?: RollbackAction;
  /** Description */
  description?: string;
  /** Priority (higher = evaluated first) */
  priority?: number;
  /** Whether this is an automatic retry transition */
  isRetry?: boolean;
}

/**
 * Transition - Represents a single state transition
 *
 * @example
 * ```ts
 * const startPlanning = new Transition({
 *   id: "idle-to-planning",
 *   name: "Start Planning",
 *   from: "IDLE",
 *   to: "PLANNING",
 *   guards: [(ctx) => ctx.inputs.prompt !== undefined],
 *   preActions: [(ctx) => console.log(`Starting task ${ctx.taskId}`)],
 *   rollback: async (ctx, error) => {
 *     console.log(`Rollback: ${error.message}`);
 *   },
 * });
 *
 * const result = await startPlanning.execute(ctx);
 * ```
 */
export class Transition {
  readonly id: string;
  readonly name: string;
  readonly from: ExecutionState;
  readonly to: ExecutionState;
  readonly description?: string;
  readonly priority: number;
  readonly isRetry: boolean;

  private readonly guards: TransitionGuard[];
  private readonly preActions: TransitionAction[];
  private readonly postActions: TransitionAction[];
  private readonly rollback?: RollbackAction;

  constructor(definition: TransitionDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.from = definition.from;
    this.to = definition.to;
    this.guards = definition.guards || [];
    this.preActions = definition.preActions || [];
    this.postActions = definition.postActions || [];
    this.rollback = definition.rollback;
    this.description = definition.description;
    this.priority = definition.priority ?? 0;
    this.isRetry = definition.isRetry ?? false;
  }

  /**
   * Check if transition is valid from current state
   */
  canTransitionFrom(state: ExecutionState): boolean {
    return this.from === state;
  }

  /**
   * Check all guard conditions
   */
  async checkGuards(ctx: ExecutionContext): Promise<boolean> {
    for (const guard of this.guards) {
      const result = await guard(ctx);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Execute the transition
   *
   * @param ctx - Execution context (will be mutated with new state)
   * @returns Transition result
   */
  async execute(ctx: ExecutionContext): Promise<TransitionResult> {
    const startTime = performance.now();
    const fromState = ctx.state;

    // Verify we're in the correct source state
    if (!this.canTransitionFrom(fromState)) {
      return {
        success: false,
        fromState,
        toState: fromState, // Unchanged
        durationMs: performance.now() - startTime,
        timestamp: new Date(),
        error: new UndefinedStateError({
          fromState,
          toState: this.to,
          reason: `Transition '${this.name}' requires state '${this.from}'`,
          validTransitions: [this.from],
          taskId: ctx.taskId,
          timestamp: new Date(),
        }),
      };
    }

    // Check guards
    try {
      const guardsPass = await this.checkGuards(ctx);
      if (!guardsPass) {
        return {
          success: false,
          fromState,
          toState: fromState,
          durationMs: performance.now() - startTime,
          timestamp: new Date(),
          error: new Error(`Guard conditions not met for transition '${this.name}'`),
        };
      }
    } catch (error) {
      return {
        success: false,
        fromState,
        toState: fromState,
        durationMs: performance.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    // Execute pre-actions
    try {
      for (const action of this.preActions) {
        await action(ctx);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const result = await this.performRollback(ctx, err);
      return {
        success: false,
        fromState,
        toState: fromState,
        durationMs: performance.now() - startTime,
        timestamp: new Date(),
        error: err,
        rolledBack: result.rolledBack,
        rollbackError: result.rollbackError,
      };
    }

    // Perform state transition
    ctx.state = this.to;

    // Execute post-actions
    try {
      for (const action of this.postActions) {
        await action(ctx);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // Rollback state change
      ctx.state = fromState;
      const result = await this.performRollback(ctx, err);
      return {
        success: false,
        fromState,
        toState: fromState,
        durationMs: performance.now() - startTime,
        timestamp: new Date(),
        error: err,
        rolledBack: result.rolledBack,
        rollbackError: result.rollbackError,
      };
    }

    return {
      success: true,
      fromState,
      toState: this.to,
      durationMs: performance.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Perform rollback
   */
  private async performRollback(
    ctx: ExecutionContext,
    error: Error
  ): Promise<{ rolledBack: boolean; rollbackError?: Error }> {
    if (!this.rollback) {
      return { rolledBack: false };
    }

    try {
      await this.rollback(ctx, error);
      return { rolledBack: true };
    } catch (rollbackError) {
      return {
        rolledBack: false,
        rollbackError:
          rollbackError instanceof Error
            ? rollbackError
            : new Error(String(rollbackError)),
      };
    }
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      from: this.from,
      to: this.to,
      description: this.description,
      priority: this.priority,
      isRetry: this.isRetry,
      guardCount: this.guards.length,
      preActionCount: this.preActions.length,
      postActionCount: this.postActions.length,
      hasRollback: this.rollback !== undefined,
    };
  }
}

/**
 * Standard transitions for the execution state machine
 *
 * State flow:
 * IDLE → PLANNING → EXECUTING → VERIFYING → COMMITTING → COMPLETED
 *                       ↑           ↓
 *                       ←←← (retry if failed)
 * ANY → FAILED (on unrecoverable error)
 */
export const StandardTransitions = {
  /**
   * Start planning from idle
   */
  startPlanning: (guards?: TransitionGuard[]): Transition =>
    new Transition({
      id: "idle-to-planning",
      name: "Start Planning",
      from: "IDLE",
      to: "PLANNING",
      guards: guards || [
        (ctx) => ctx.inputs.prompt !== undefined || ctx.inputs.task !== undefined,
      ],
      description: "Begin planning phase",
    }),

  /**
   * Start execution after planning
   */
  startExecution: (guards?: TransitionGuard[]): Transition =>
    new Transition({
      id: "planning-to-executing",
      name: "Start Execution",
      from: "PLANNING",
      to: "EXECUTING",
      guards: guards || [],
      description: "Begin execution phase",
    }),

  /**
   * Start verification after execution
   */
  startVerification: (guards?: TransitionGuard[]): Transition =>
    new Transition({
      id: "executing-to-verifying",
      name: "Start Verification",
      from: "EXECUTING",
      to: "VERIFYING",
      guards: guards || [(ctx) => ctx.outputs !== undefined],
      description: "Begin verification phase",
    }),

  /**
   * Start committing after verification
   */
  startCommit: (guards?: TransitionGuard[]): Transition =>
    new Transition({
      id: "verifying-to-committing",
      name: "Start Commit",
      from: "VERIFYING",
      to: "COMMITTING",
      guards: guards || [(ctx) => ctx.error === undefined],
      description: "Begin commit phase",
    }),

  /**
   * Complete execution
   */
  complete: (guards?: TransitionGuard[]): Transition =>
    new Transition({
      id: "committing-to-completed",
      name: "Complete",
      from: "COMMITTING",
      to: "COMPLETED",
      guards: guards || [],
      postActions: [
        (ctx) => {
          if (!ctx.endTime) {
            ctx.endTime = new Date();
          }
        },
      ],
      description: "Mark execution as complete",
    }),

  /**
   * Retry from verification failure
   */
  retryFromVerification: (guards?: TransitionGuard[]): Transition =>
    new Transition({
      id: "verifying-to-executing",
      name: "Retry Execution",
      from: "VERIFYING",
      to: "EXECUTING",
      guards: guards || [],
      isRetry: true,
      description: "Retry execution after verification failure",
    }),

  /**
   * Transition to failed state
   */
  fail: (fromState: ExecutionState): Transition =>
    new Transition({
      id: `${fromState.toLowerCase()}-to-failed`,
      name: `Fail from ${fromState}`,
      from: fromState,
      to: "FAILED",
      guards: [],
      postActions: [
        (ctx) => {
          if (!ctx.endTime) {
            ctx.endTime = new Date();
          }
        },
      ],
      description: `Transition to failed state from ${fromState}`,
    }),
};
