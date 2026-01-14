/**
 * StateMachineExecutor - Deterministic state machine execution
 *
 * Implements the execution state machine:
 * IDLE → PLANNING → EXECUTING → VERIFYING → COMMITTING → COMPLETED
 *                       ↑           ↓
 *                       ←←← (retry if failed)
 * ANY → FAILED (on unrecoverable error)
 *
 * Features:
 * - Deterministic state sequences
 * - Guard-based transitions
 * - Automatic retry on verification failure
 * - Full execution history
 * - Rollback support
 */

import type { ExecutionContext, ExecutionState } from "./Condition.js";
import {
  Transition,
  StandardTransitions,
  type TransitionResult,
  type TransitionGuard,
} from "./Transition.js";
import { UndefinedStateError } from "./UndefinedStateError.js";

/**
 * State machine configuration
 */
export interface StateMachineConfig {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Custom transitions to add/override */
  customTransitions?: Transition[];
  /** Whether to allow transitions from any state to FAILED */
  allowFailFromAny?: boolean;
  /** Callback for state changes */
  onStateChange?: (
    fromState: ExecutionState,
    toState: ExecutionState,
    ctx: ExecutionContext
  ) => void;
  /** Callback for errors */
  onError?: (error: Error, ctx: ExecutionContext) => void;
  /** Timeout per transition in ms */
  transitionTimeout?: number;
}

/**
 * Execution history entry
 */
export interface HistoryEntry {
  /** Transition ID */
  transitionId: string;
  /** Transition name */
  transitionName: string;
  /** Source state */
  fromState: ExecutionState;
  /** Target state */
  toState: ExecutionState;
  /** Whether transition succeeded */
  success: boolean;
  /** Duration in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
  /** Error if failed */
  error?: string;
  /** Retry attempt number (0 = first attempt) */
  retryAttempt?: number;
}

/**
 * Execution result from state machine
 */
export interface ExecutionResult {
  /** Final state */
  finalState: ExecutionState;
  /** Whether execution completed successfully */
  success: boolean;
  /** Execution context after completion */
  context: ExecutionContext;
  /** Full transition history */
  history: HistoryEntry[];
  /** Total duration in ms */
  totalDurationMs: number;
  /** Number of retries performed */
  retryCount: number;
  /** Error if failed */
  error?: Error;
}

/**
 * Valid transitions map
 */
const VALID_TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
  IDLE: ["PLANNING", "FAILED"],
  PLANNING: ["EXECUTING", "FAILED"],
  EXECUTING: ["VERIFYING", "FAILED"],
  VERIFYING: ["COMMITTING", "EXECUTING", "FAILED"], // EXECUTING for retry
  COMMITTING: ["COMPLETED", "FAILED"],
  COMPLETED: [], // Terminal state
  FAILED: [], // Terminal state
};

/**
 * StateMachineExecutor - Executes tasks through state machine
 *
 * @example
 * ```ts
 * const executor = new StateMachineExecutor({
 *   maxRetries: 3,
 *   onStateChange: (from, to, ctx) => {
 *     console.log(`${from} → ${to}`);
 *   },
 * });
 *
 * const ctx = createExecutionContext({
 *   taskId: "task-001",
 *   inputs: { prompt: "Implement feature X" },
 * });
 *
 * const result = await executor.execute(ctx, {
 *   onPlanning: async (ctx) => { ... },
 *   onExecuting: async (ctx) => { ... },
 *   onVerifying: async (ctx) => { ... },
 *   onCommitting: async (ctx) => { ... },
 * });
 * ```
 */
export class StateMachineExecutor {
  private readonly config: Required<StateMachineConfig>;
  private readonly transitions: Map<string, Transition>;
  private readonly transitionsByState: Map<ExecutionState, Transition[]>;

  constructor(config: StateMachineConfig = {}) {
    this.config = {
      maxRetries: 3,
      customTransitions: [],
      allowFailFromAny: true,
      onStateChange: () => {},
      onError: () => {},
      transitionTimeout: 30000,
      ...config,
    };

    this.transitions = new Map();
    this.transitionsByState = new Map();

    // Initialize with standard transitions
    this.initializeTransitions();
  }

  /**
   * Initialize standard and custom transitions
   */
  private initializeTransitions(): void {
    // Add standard transitions
    const standardTransitions = [
      StandardTransitions.startPlanning(),
      StandardTransitions.startExecution(),
      StandardTransitions.startVerification(),
      StandardTransitions.startCommit(),
      StandardTransitions.complete(),
      StandardTransitions.retryFromVerification(),
    ];

    // Add fail transitions from all non-terminal states
    if (this.config.allowFailFromAny) {
      const nonTerminalStates: ExecutionState[] = [
        "IDLE",
        "PLANNING",
        "EXECUTING",
        "VERIFYING",
        "COMMITTING",
      ];
      for (const state of nonTerminalStates) {
        standardTransitions.push(StandardTransitions.fail(state));
      }
    }

    // Register all transitions
    for (const transition of standardTransitions) {
      this.registerTransition(transition);
    }

    // Add custom transitions
    for (const transition of this.config.customTransitions) {
      this.registerTransition(transition);
    }
  }

  /**
   * Register a transition
   */
  registerTransition(transition: Transition): void {
    this.transitions.set(transition.id, transition);

    if (!this.transitionsByState.has(transition.from)) {
      this.transitionsByState.set(transition.from, []);
    }
    this.transitionsByState.get(transition.from)!.push(transition);

    // Sort by priority (higher first)
    this.transitionsByState
      .get(transition.from)!
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get valid transitions from a state
   */
  getValidTransitions(state: ExecutionState): Transition[] {
    return this.transitionsByState.get(state) || [];
  }

  /**
   * Get valid target states from a state
   */
  getValidTargetStates(state: ExecutionState): ExecutionState[] {
    return VALID_TRANSITIONS[state] || [];
  }

  /**
   * Check if transition is valid
   */
  isValidTransition(from: ExecutionState, to: ExecutionState): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Find the best transition for target state
   */
  async findTransition(
    ctx: ExecutionContext,
    targetState: ExecutionState
  ): Promise<Transition | null> {
    const transitions = this.getValidTransitions(ctx.state);

    for (const transition of transitions) {
      if (transition.to === targetState) {
        const guardsPass = await transition.checkGuards(ctx);
        if (guardsPass) {
          return transition;
        }
      }
    }

    return null;
  }

  /**
   * Execute a single transition
   */
  async executeTransition(
    ctx: ExecutionContext,
    targetState: ExecutionState
  ): Promise<TransitionResult> {
    // Validate transition
    if (!this.isValidTransition(ctx.state, targetState)) {
      return {
        success: false,
        fromState: ctx.state,
        toState: ctx.state,
        durationMs: 0,
        timestamp: new Date(),
        error: new UndefinedStateError({
          fromState: ctx.state,
          toState: targetState,
          reason: "Invalid state transition",
          validTransitions: this.getValidTargetStates(ctx.state),
          taskId: ctx.taskId,
          timestamp: new Date(),
        }),
      };
    }

    // Find matching transition
    const transition = await this.findTransition(ctx, targetState);
    if (!transition) {
      return {
        success: false,
        fromState: ctx.state,
        toState: ctx.state,
        durationMs: 0,
        timestamp: new Date(),
        error: new Error(
          `No valid transition found from ${ctx.state} to ${targetState}`
        ),
      };
    }

    // Execute transition
    const result = await transition.execute(ctx);

    // Notify state change
    if (result.success) {
      this.config.onStateChange(result.fromState, result.toState, ctx);
    } else if (result.error) {
      this.config.onError(result.error, ctx);
    }

    return result;
  }

  /**
   * Execute task through the full state machine
   */
  async execute(
    ctx: ExecutionContext,
    handlers: {
      onPlanning?: (ctx: ExecutionContext) => Promise<void>;
      onExecuting?: (ctx: ExecutionContext) => Promise<void>;
      onVerifying?: (ctx: ExecutionContext) => Promise<boolean>;
      onCommitting?: (ctx: ExecutionContext) => Promise<void>;
    }
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    const history: HistoryEntry[] = [];
    let retryCount = 0;

    // Ensure we start from IDLE
    if (ctx.state !== "IDLE") {
      return {
        finalState: ctx.state,
        success: false,
        context: ctx,
        history,
        totalDurationMs: performance.now() - startTime,
        retryCount: 0,
        error: new Error(`Execution must start from IDLE state, not ${ctx.state}`),
      };
    }

    try {
      // IDLE → PLANNING
      const planResult = await this.executeTransition(ctx, "PLANNING");
      history.push(this.createHistoryEntry(planResult, "idle-to-planning", "Start Planning"));
      if (!planResult.success) {
        await this.transitionToFailed(ctx, planResult.error!, history);
        return this.buildResult(ctx, history, startTime, retryCount, planResult.error);
      }

      // Execute planning handler
      if (handlers.onPlanning) {
        try {
          await handlers.onPlanning(ctx);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          await this.transitionToFailed(ctx, err, history);
          return this.buildResult(ctx, history, startTime, retryCount, err);
        }
      }

      // PLANNING → EXECUTING
      const execResult = await this.executeTransition(ctx, "EXECUTING");
      history.push(this.createHistoryEntry(execResult, "planning-to-executing", "Start Execution"));
      if (!execResult.success) {
        await this.transitionToFailed(ctx, execResult.error!, history);
        return this.buildResult(ctx, history, startTime, retryCount, execResult.error);
      }

      // Execution/Verification loop with retries
      let verified = false;
      while (!verified && retryCount <= this.config.maxRetries) {
        // Execute handler
        if (handlers.onExecuting) {
          try {
            await handlers.onExecuting(ctx);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await this.transitionToFailed(ctx, err, history);
            return this.buildResult(ctx, history, startTime, retryCount, err);
          }
        }

        // EXECUTING → VERIFYING
        const verifyTransitionResult = await this.executeTransition(ctx, "VERIFYING");
        history.push(
          this.createHistoryEntry(
            verifyTransitionResult,
            "executing-to-verifying",
            "Start Verification",
            retryCount
          )
        );
        if (!verifyTransitionResult.success) {
          await this.transitionToFailed(ctx, verifyTransitionResult.error!, history);
          return this.buildResult(ctx, history, startTime, retryCount, verifyTransitionResult.error);
        }

        // Execute verification handler
        if (handlers.onVerifying) {
          try {
            verified = await handlers.onVerifying(ctx);
          } catch (error) {
            verified = false;
          }
        } else {
          // No verifier = auto-pass
          verified = true;
        }

        if (!verified) {
          if (retryCount >= this.config.maxRetries) {
            const maxRetriesError = new Error(
              `Max retries (${this.config.maxRetries}) exceeded`
            );
            await this.transitionToFailed(ctx, maxRetriesError, history);
            return this.buildResult(ctx, history, startTime, retryCount, maxRetriesError);
          }

          // VERIFYING → EXECUTING (retry)
          retryCount++;
          const retryResult = await this.executeTransition(ctx, "EXECUTING");
          history.push(
            this.createHistoryEntry(
              retryResult,
              "verifying-to-executing",
              "Retry Execution",
              retryCount
            )
          );
          if (!retryResult.success) {
            await this.transitionToFailed(ctx, retryResult.error!, history);
            return this.buildResult(ctx, history, startTime, retryCount, retryResult.error);
          }
        }
      }

      // VERIFYING → COMMITTING
      const commitTransitionResult = await this.executeTransition(ctx, "COMMITTING");
      history.push(
        this.createHistoryEntry(commitTransitionResult, "verifying-to-committing", "Start Commit")
      );
      if (!commitTransitionResult.success) {
        await this.transitionToFailed(ctx, commitTransitionResult.error!, history);
        return this.buildResult(ctx, history, startTime, retryCount, commitTransitionResult.error);
      }

      // Execute commit handler
      if (handlers.onCommitting) {
        try {
          await handlers.onCommitting(ctx);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          await this.transitionToFailed(ctx, err, history);
          return this.buildResult(ctx, history, startTime, retryCount, err);
        }
      }

      // COMMITTING → COMPLETED
      const completeResult = await this.executeTransition(ctx, "COMPLETED");
      history.push(
        this.createHistoryEntry(completeResult, "committing-to-completed", "Complete")
      );
      if (!completeResult.success) {
        await this.transitionToFailed(ctx, completeResult.error!, history);
        return this.buildResult(ctx, history, startTime, retryCount, completeResult.error);
      }

      return this.buildResult(ctx, history, startTime, retryCount);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.transitionToFailed(ctx, err, history);
      return this.buildResult(ctx, history, startTime, retryCount, err);
    }
  }

  /**
   * Transition to FAILED state
   */
  private async transitionToFailed(
    ctx: ExecutionContext,
    error: Error,
    history: HistoryEntry[]
  ): Promise<void> {
    if (ctx.state === "FAILED" || ctx.state === "COMPLETED") {
      return; // Already in terminal state
    }

    ctx.error = error;
    const failResult = await this.executeTransition(ctx, "FAILED");
    history.push(
      this.createHistoryEntry(failResult, `${ctx.state.toLowerCase()}-to-failed`, "Fail")
    );
  }

  /**
   * Create history entry from transition result
   */
  private createHistoryEntry(
    result: TransitionResult,
    transitionId: string,
    transitionName: string,
    retryAttempt?: number
  ): HistoryEntry {
    return {
      transitionId,
      transitionName,
      fromState: result.fromState,
      toState: result.toState,
      success: result.success,
      durationMs: result.durationMs,
      timestamp: result.timestamp,
      error: result.error?.message,
      retryAttempt,
    };
  }

  /**
   * Build execution result
   */
  private buildResult(
    ctx: ExecutionContext,
    history: HistoryEntry[],
    startTime: number,
    retryCount: number,
    error?: Error
  ): ExecutionResult {
    return {
      finalState: ctx.state,
      success: ctx.state === "COMPLETED",
      context: ctx,
      history,
      totalDurationMs: performance.now() - startTime,
      retryCount,
      error,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<StateMachineConfig> {
    return { ...this.config };
  }

  /**
   * Get all registered transitions
   */
  getAllTransitions(): Transition[] {
    return [...this.transitions.values()];
  }
}

/**
 * Create a basic execution context
 */
export function createExecutionContext(
  overrides: Partial<ExecutionContext>
): ExecutionContext {
  return {
    scopeId: overrides.scopeId || `scope-${Date.now()}`,
    taskId: overrides.taskId || `task-${Date.now()}`,
    inputs: overrides.inputs || {},
    outputs: overrides.outputs,
    state: overrides.state || "IDLE",
    artifacts: overrides.artifacts || new Map(),
    startTime: overrides.startTime || new Date(),
    endTime: overrides.endTime,
    error: overrides.error,
  };
}
