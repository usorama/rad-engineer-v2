/**
 * UndefinedStateError - Error for invalid state transitions
 *
 * Thrown when:
 * - Transition to undefined state is attempted
 * - Invalid state transition is requested
 * - State machine encounters unknown state
 */

import type { ExecutionState } from "./Condition.js";

/**
 * Error context for state transition failures
 */
export interface TransitionErrorContext {
  /** Current state */
  fromState: ExecutionState;
  /** Attempted target state */
  toState: ExecutionState | undefined;
  /** Reason for failure */
  reason: string;
  /** Available valid transitions from current state */
  validTransitions?: ExecutionState[];
  /** Task ID if available */
  taskId?: string;
  /** Timestamp of failure */
  timestamp: Date;
}

/**
 * UndefinedStateError - Thrown for invalid state transitions
 *
 * @example
 * ```ts
 * throw new UndefinedStateError({
 *   fromState: "IDLE",
 *   toState: "COMPLETED", // Invalid - can't skip states
 *   reason: "Cannot transition directly from IDLE to COMPLETED",
 *   validTransitions: ["PLANNING"],
 * });
 * ```
 */
export class UndefinedStateError extends Error {
  readonly fromState: ExecutionState;
  readonly toState: ExecutionState | undefined;
  readonly reason: string;
  readonly validTransitions?: ExecutionState[];
  readonly taskId?: string;
  readonly timestamp: Date;

  constructor(context: TransitionErrorContext) {
    const targetState = context.toState || "undefined";
    const message = `Invalid state transition: ${context.fromState} → ${targetState}. ${context.reason}`;
    super(message);

    this.name = "UndefinedStateError";
    this.fromState = context.fromState;
    this.toState = context.toState;
    this.reason = context.reason;
    this.validTransitions = context.validTransitions;
    this.taskId = context.taskId;
    this.timestamp = context.timestamp;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UndefinedStateError);
    }
  }

  /**
   * Get formatted error with context
   */
  getDetailedMessage(): string {
    const lines = [
      `UndefinedStateError: ${this.message}`,
      `  From State: ${this.fromState}`,
      `  To State: ${this.toState || "undefined"}`,
      `  Reason: ${this.reason}`,
    ];

    if (this.validTransitions && this.validTransitions.length > 0) {
      lines.push(`  Valid Transitions: ${this.validTransitions.join(", ")}`);
    }

    if (this.taskId) {
      lines.push(`  Task ID: ${this.taskId}`);
    }

    lines.push(`  Timestamp: ${this.timestamp.toISOString()}`);

    return lines.join("\n");
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      fromState: this.fromState,
      toState: this.toState,
      reason: this.reason,
      validTransitions: this.validTransitions,
      taskId: this.taskId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Check if error is UndefinedStateError
 */
export function isUndefinedStateError(error: unknown): error is UndefinedStateError {
  return error instanceof UndefinedStateError;
}
