/**
 * LoopAPIHandler - RepeatUntil Loop Visibility
 * Phase 5: UI Integration Layer
 *
 * Implements 5 IPC channels for loop visibility and control:
 * 1. getLoopStatus - Get loop execution status
 * 2. getIterations - Get iteration history
 * 3. getConditions - Get exit condition statuses
 * 4. forceExit - Force loop termination
 * 5. adjustConditions - Modify exit conditions mid-execution
 *
 * Real-time events:
 * - loop-started: Loop execution started
 * - loop-iteration-started: Iteration started
 * - loop-iteration-completed: Iteration completed
 * - loop-condition-evaluated: Exit condition evaluated
 * - loop-completed: Loop execution completed
 */

import { EventEmitter } from "events";
import type { StateManager } from "@/advanced/StateManager.js";
import type { RepeatUntilExecutor } from "@/primitives/RepeatUntilExecutor.js";
import type { ConditionEvaluator } from "@/primitives/ConditionEvaluator.js";
import type {
  RepeatUntilLoop,
  LoopState,
  IterationResult,
  ExitCondition,
  ConditionEvaluationResult,
  LoopEvent,
} from "@/primitives/types.js";

/**
 * Configuration for LoopAPIHandler
 */
export interface LoopAPIHandlerConfig {
  /** StateManager instance */
  stateManager: StateManager;
  /** RepeatUntilExecutor instance (optional) */
  repeatUntilExecutor?: RepeatUntilExecutor;
  /** ConditionEvaluator instance (optional) */
  conditionEvaluator?: ConditionEvaluator;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Loop status for UI display
 */
export interface LoopUIStatus {
  loopId: string;
  name: string;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  currentIteration: number;
  maxIterations: number;
  elapsedMs: number;
  exitConditionName: string;
  conditionSatisfied: boolean;
  progressPercent: number;
  estimatedRemainingIterations?: number;
  estimatedRemainingTime?: number;
}

/**
 * Iteration for UI display
 */
export interface IterationUIResult {
  iteration: number;
  success: boolean;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  conditionSatisfied: boolean;
  conditionMessage?: string;
  error?: string;
}

/**
 * Condition status for UI display
 */
export interface ConditionUIStatus {
  name: string;
  type: string;
  description: string;
  satisfied: boolean;
  progress: number;
  lastEvaluation?: {
    actualValue: unknown;
    expectedValue: unknown;
    message: string;
    durationMs: number;
    timestamp: string;
  };
}

/**
 * Events emitted by LoopAPIHandler
 */
export interface LoopAPIEvents {
  "loop-started": (event: LoopUIEvent) => void;
  "loop-iteration-started": (event: LoopIterationEvent) => void;
  "loop-iteration-completed": (event: LoopIterationEvent) => void;
  "loop-condition-evaluated": (event: LoopConditionEvent) => void;
  "loop-completed": (event: LoopUIEvent) => void;
}

export interface LoopUIEvent {
  loopId: string;
  loopName: string;
  status: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface LoopIterationEvent {
  loopId: string;
  iteration: number;
  maxIterations: number;
  success?: boolean;
  durationMs?: number;
  timestamp: string;
}

export interface LoopConditionEvent {
  loopId: string;
  conditionName: string;
  satisfied: boolean;
  message: string;
  timestamp: string;
}

/**
 * LoopAPIHandler - Provides IPC channels for loop visibility and control
 *
 * @example
 * ```ts
 * const handler = new LoopAPIHandler({ stateManager, repeatUntilExecutor });
 *
 * // Get loop status
 * const status = await handler.getLoopStatus("tdd-loop-123");
 *
 * // Get iteration history
 * const iterations = await handler.getIterations("tdd-loop-123");
 *
 * // Force exit a stuck loop
 * await handler.forceExit("tdd-loop-123");
 * ```
 */
export class LoopAPIHandler extends EventEmitter {
  private readonly stateManager: StateManager;
  private readonly repeatUntilExecutor?: RepeatUntilExecutor;
  private readonly conditionEvaluator?: ConditionEvaluator;
  private readonly debug: boolean;

  // In-memory condition tracking
  private conditionHistory: Map<string, ConditionEvaluationResult[]> = new Map();

  constructor(config: LoopAPIHandlerConfig) {
    super();
    this.stateManager = config.stateManager;
    this.repeatUntilExecutor = config.repeatUntilExecutor;
    this.conditionEvaluator = config.conditionEvaluator;
    this.debug = config.debug ?? false;

    // Listen to executor events if available
    if (this.repeatUntilExecutor) {
      this.setupExecutorListeners();
    }
  }

  /**
   * Set up listeners for RepeatUntilExecutor events
   */
  private setupExecutorListeners(): void {
    if (!this.repeatUntilExecutor) return;

    this.repeatUntilExecutor.on("loop_started", (event: LoopEvent) => {
      this.broadcastLoopStarted(event.loopId, event.loopName, event.data);
    });

    this.repeatUntilExecutor.on("iteration_started", (event: LoopEvent) => {
      this.broadcastIterationStarted(
        event.loopId,
        event.iteration ?? 0,
        (event.data?.maxIterations as number) ?? 0
      );
    });

    this.repeatUntilExecutor.on("iteration_completed", (event: LoopEvent) => {
      this.broadcastIterationCompleted(
        event.loopId,
        event.iteration ?? 0,
        (event.data?.maxIterations as number) ?? 0,
        (event.data?.success as boolean) ?? false,
        (event.data?.durationMs as number) ?? 0
      );
    });

    this.repeatUntilExecutor.on("condition_evaluated", (event: LoopEvent) => {
      this.broadcastConditionEvaluated(
        event.loopId,
        (event.data?.conditionName as string) ?? "",
        (event.data?.satisfied as boolean) ?? false,
        (event.data?.message as string) ?? ""
      );
    });

    this.repeatUntilExecutor.on("loop_completed", (event: LoopEvent) => {
      this.broadcastLoopCompleted(event.loopId, event.loopName, event.data);
    });
  }

  // ============================================================================
  // IPC Channel 1: getLoopStatus
  // ============================================================================

  /**
   * Get loop execution status
   *
   * @param loopId - Loop ID
   * @returns Loop status for UI
   */
  async getLoopStatus(loopId: string): Promise<LoopUIStatus | null> {
    // First check active loops from executor
    if (this.repeatUntilExecutor) {
      const activeState = this.repeatUntilExecutor.getLoopState(loopId);
      if (activeState) {
        return this.loopStateToUIStatus(activeState);
      }
    }

    // Check persisted loops
    const loop = await this.stateManager.loadLoopState(loopId);
    if (loop) {
      return this.loopToUIStatus(loop);
    }

    return null;
  }

  // ============================================================================
  // IPC Channel 2: getIterations
  // ============================================================================

  /**
   * Get iteration history for a loop
   *
   * @param loopId - Loop ID
   * @returns Array of iteration results
   */
  async getIterations(loopId: string): Promise<IterationUIResult[]> {
    const loop = await this.stateManager.loadLoopState(loopId);
    if (!loop) {
      return [];
    }

    return loop.iterations.map(this.iterationToUIResult);
  }

  // ============================================================================
  // IPC Channel 3: getConditions
  // ============================================================================

  /**
   * Get exit condition statuses for a loop
   *
   * @param loopId - Loop ID
   * @returns Array of condition statuses
   */
  async getConditions(loopId: string): Promise<ConditionUIStatus[]> {
    const loop = await this.stateManager.loadLoopState(loopId);
    if (!loop) {
      return [];
    }

    const history = this.conditionHistory.get(loopId) ?? [];
    const latestEvaluation = history[history.length - 1];

    // Return the main exit condition status
    return [
      {
        name: loop.exitConditionConfig.name,
        type: loop.exitConditionConfig.type,
        description: (loop.exitConditionConfig.description as string) ?? "",
        satisfied: latestEvaluation?.satisfied ?? false,
        progress: this.calculateConditionProgress(loop, latestEvaluation),
        lastEvaluation: latestEvaluation
          ? {
              actualValue: latestEvaluation.actualValue,
              expectedValue: latestEvaluation.expectedValue,
              message: latestEvaluation.message,
              durationMs: latestEvaluation.durationMs,
              timestamp: new Date().toISOString(),
            }
          : undefined,
      },
    ];
  }

  // ============================================================================
  // IPC Channel 4: forceExit
  // ============================================================================

  /**
   * Force a loop to exit
   *
   * @param loopId - Loop ID
   * @returns True if loop was cancelled
   */
  async forceExit(loopId: string): Promise<boolean> {
    if (!this.repeatUntilExecutor) {
      this.log("RepeatUntilExecutor not available for force exit");
      return false;
    }

    if (!this.repeatUntilExecutor.isRunning(loopId)) {
      this.log(`Loop ${loopId} is not running`);
      return false;
    }

    this.repeatUntilExecutor.cancel(loopId);
    return true;
  }

  // ============================================================================
  // IPC Channel 5: adjustConditions
  // ============================================================================

  /**
   * Adjust exit conditions mid-execution
   *
   * Note: This is a limited implementation that can only adjust max iterations.
   * Full condition adjustment would require serializable conditions.
   *
   * @param loopId - Loop ID
   * @param adjustments - Adjustments to make
   * @returns True if adjustments were applied
   */
  async adjustConditions(
    loopId: string,
    adjustments: {
      maxIterations?: number;
      timeoutMs?: number;
    }
  ): Promise<boolean> {
    // For running loops, we can't easily adjust conditions
    // This would require changes to the executor
    this.log(
      `Condition adjustment for loop ${loopId} requested but not fully supported`
    );
    return false;
  }

  // ============================================================================
  // Additional Query Methods
  // ============================================================================

  /**
   * Get all active loops
   */
  getActiveLoops(): LoopUIStatus[] {
    if (!this.repeatUntilExecutor) {
      return [];
    }

    return this.repeatUntilExecutor
      .getActiveLoops()
      .map(this.loopStateToUIStatus);
  }

  /**
   * Get all persisted loops
   */
  async getAllLoops(): Promise<LoopUIStatus[]> {
    const loops = await this.stateManager.listLoopStates();
    return loops.map(this.loopToUIStatus);
  }

  // ============================================================================
  // Event Broadcast Methods
  // ============================================================================

  /**
   * Broadcast loop started event
   */
  broadcastLoopStarted(
    loopId: string,
    loopName: string,
    data?: Record<string, unknown>
  ): void {
    const event: LoopUIEvent = {
      loopId,
      loopName,
      status: "running",
      timestamp: new Date().toISOString(),
      data,
    };
    this.emit("loop-started", event);
  }

  /**
   * Broadcast iteration started event
   */
  broadcastIterationStarted(
    loopId: string,
    iteration: number,
    maxIterations: number
  ): void {
    const event: LoopIterationEvent = {
      loopId,
      iteration,
      maxIterations,
      timestamp: new Date().toISOString(),
    };
    this.emit("loop-iteration-started", event);
  }

  /**
   * Broadcast iteration completed event
   */
  broadcastIterationCompleted(
    loopId: string,
    iteration: number,
    maxIterations: number,
    success: boolean,
    durationMs: number
  ): void {
    const event: LoopIterationEvent = {
      loopId,
      iteration,
      maxIterations,
      success,
      durationMs,
      timestamp: new Date().toISOString(),
    };
    this.emit("loop-iteration-completed", event);
  }

  /**
   * Broadcast condition evaluated event
   */
  broadcastConditionEvaluated(
    loopId: string,
    conditionName: string,
    satisfied: boolean,
    message: string
  ): void {
    const event: LoopConditionEvent = {
      loopId,
      conditionName,
      satisfied,
      message,
      timestamp: new Date().toISOString(),
    };
    this.emit("loop-condition-evaluated", event);
  }

  /**
   * Broadcast loop completed event
   */
  broadcastLoopCompleted(
    loopId: string,
    loopName: string,
    data?: Record<string, unknown>
  ): void {
    const event: LoopUIEvent = {
      loopId,
      loopName,
      status: (data?.exitReason as string) ?? "completed",
      timestamp: new Date().toISOString(),
      data,
    };
    this.emit("loop-completed", event);
  }

  // ============================================================================
  // Internal State Management
  // ============================================================================

  /**
   * Store condition evaluation result
   */
  storeConditionResult(loopId: string, result: ConditionEvaluationResult): void {
    const history = this.conditionHistory.get(loopId) ?? [];
    history.push(result);
    this.conditionHistory.set(loopId, history);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private loopStateToUIStatus(state: LoopState): LoopUIStatus {
    return {
      loopId: state.loopId,
      name: state.name,
      status: state.status,
      currentIteration: state.currentIteration,
      maxIterations: state.maxIterations,
      elapsedMs: state.elapsedMs,
      exitConditionName: state.exitConditionName,
      conditionSatisfied: state.conditionSatisfied,
      progressPercent: state.progressPercent,
      estimatedRemainingIterations: state.maxIterations - state.currentIteration,
    };
  }

  private loopToUIStatus(loop: RepeatUntilLoop): LoopUIStatus {
    const latestIteration = loop.iterations[loop.iterations.length - 1];
    const conditionSatisfied =
      latestIteration?.conditionResult?.satisfied ?? false;

    // Calculate elapsed from first iteration start to last iteration end
    let elapsedMs = 0;
    if (loop.iterations.length > 0) {
      const first = loop.iterations[0];
      const last = loop.iterations[loop.iterations.length - 1];
      elapsedMs =
        new Date(last.completedAt).getTime() -
        new Date(first.startedAt).getTime();
    }

    return {
      loopId: loop.loopId,
      name: loop.name,
      status: loop.status,
      currentIteration: loop.currentIteration,
      maxIterations: loop.maxIterations,
      elapsedMs,
      exitConditionName: loop.exitConditionConfig.name,
      conditionSatisfied,
      progressPercent: Math.round(
        (loop.currentIteration / loop.maxIterations) * 100
      ),
      estimatedRemainingIterations: loop.maxIterations - loop.currentIteration,
    };
  }

  private iterationToUIResult(iteration: IterationResult): IterationUIResult {
    return {
      iteration: iteration.iteration,
      success: iteration.success,
      durationMs: iteration.durationMs,
      startedAt: iteration.startedAt,
      completedAt: iteration.completedAt,
      conditionSatisfied: iteration.conditionResult?.satisfied ?? false,
      conditionMessage: iteration.conditionResult?.message,
      error: iteration.error?.message,
    };
  }

  private calculateConditionProgress(
    loop: RepeatUntilLoop,
    latestEvaluation?: ConditionEvaluationResult
  ): number {
    // Simple progress based on iteration count
    // A more sophisticated implementation would analyze condition-specific progress
    return Math.round((loop.currentIteration / loop.maxIterations) * 100);
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[LoopAPIHandler] ${message}`);
    }
  }
}
