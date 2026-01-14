/**
 * MetricsAPIHandler - Unified Metrics API for UI
 * Phase 6: Unified UI Transparency Layer
 *
 * All metrics exposed via IPC for the rad-engineer UI.
 * No external dashboards (Prometheus/Grafana) - everything through IPC.
 *
 * Implements 4 IPC channels:
 * 1. getStepMetrics - Get step execution metrics for a task
 * 2. getLoopMetrics - Get loop execution metrics
 * 3. getSessionSummary - Get session summary
 * 4. getPerformanceTimeline - Get performance timeline data
 */

import { EventEmitter } from "events";
import type { StateManager } from "@/advanced/StateManager.js";
import type { StepAPIHandler } from "./StepAPIHandler.js";
import type { LoopAPIHandler } from "./LoopAPIHandler.js";

/**
 * Configuration for MetricsAPIHandler
 */
export interface MetricsAPIHandlerConfig {
  /** StateManager instance */
  stateManager: StateManager;
  /** StepAPIHandler instance (optional) */
  stepAPIHandler?: StepAPIHandler;
  /** LoopAPIHandler instance (optional) */
  loopAPIHandler?: LoopAPIHandler;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Step execution metrics
 */
export interface StepMetrics {
  /** Total steps in task */
  totalSteps: number;
  /** Completed steps */
  completedSteps: number;
  /** Failed steps */
  failedSteps: number;
  /** Retried steps */
  retriedSteps: number;
  /** First pass success rate (percentage) */
  firstPassRate: number;
  /** Average step duration in ms */
  averageStepDuration: number;
  /** Step durations breakdown */
  stepDurations: Array<{ stepId: string; stepName: string; durationMs: number }>;
  /** Verification results summary */
  verificationResults: {
    preconditions: { total: number; passed: number };
    postconditions: { total: number; passed: number };
  };
}

/**
 * Loop execution metrics
 */
export interface LoopMetrics {
  /** Loop identifier */
  loopId: string;
  /** Loop name */
  loopName: string;
  /** Total iterations executed */
  totalIterations: number;
  /** Current iteration */
  currentIteration: number;
  /** Duration of each iteration in ms */
  iterationDurations: number[];
  /** Average iteration duration */
  averageIterationDuration: number;
  /** Condition progress */
  conditionProgress: Array<{
    type: string;
    name: string;
    progress: number;
    satisfied: boolean;
  }>;
  /** Estimated remaining iterations */
  estimatedRemainingIterations: number;
  /** Estimated remaining time in ms */
  estimatedRemainingTime: number;
}

/**
 * Session summary
 */
export interface SessionSummary {
  /** Session identifier */
  sessionId: string;
  /** Session name */
  sessionName: string;
  /** Session status */
  status: string;
  /** Total tasks in session */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Total steps across all tasks */
  totalSteps: number;
  /** Completed steps */
  completedSteps: number;
  /** Checkpoints created */
  checkpointsCreated: number;
  /** Total duration in ms */
  totalDuration: number;
  /** Quality gates passed */
  qualityGatesPassed: boolean;
  /** Started timestamp */
  startedAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
}

/**
 * Performance timeline data point
 */
export interface TimelineDataPoint {
  /** Timestamp */
  timestamp: string;
  /** Step or iteration ID */
  id: string;
  /** Label */
  label: string;
  /** Duration in ms */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Type (step, iteration, quality_gate) */
  type: "step" | "iteration" | "quality_gate" | "checkpoint";
}

/**
 * Performance timeline data
 */
export interface TimelineData {
  /** Task ID */
  taskId: string;
  /** Data points */
  dataPoints: TimelineDataPoint[];
  /** Total duration */
  totalDurationMs: number;
  /** Start time */
  startTime: string;
  /** End time (or current time if ongoing) */
  endTime: string;
}

/**
 * MetricsAPIHandler - Provides unified metrics API for the UI
 *
 * @example
 * ```ts
 * const handler = new MetricsAPIHandler({ stateManager, stepAPIHandler });
 *
 * // Get step metrics
 * const stepMetrics = await handler.getStepMetrics("task-123");
 *
 * // Get session summary
 * const summary = await handler.getSessionSummary("session-456");
 * ```
 */
export class MetricsAPIHandler extends EventEmitter {
  private readonly stateManager: StateManager;
  private readonly stepAPIHandler?: StepAPIHandler;
  private readonly loopAPIHandler?: LoopAPIHandler;
  private readonly debug: boolean;

  // In-memory metrics tracking
  private stepMetricsCache: Map<string, StepMetrics> = new Map();
  private loopMetricsCache: Map<string, LoopMetrics> = new Map();

  constructor(config: MetricsAPIHandlerConfig) {
    super();
    this.stateManager = config.stateManager;
    this.stepAPIHandler = config.stepAPIHandler;
    this.loopAPIHandler = config.loopAPIHandler;
    this.debug = config.debug ?? false;
  }

  // ============================================================================
  // IPC Channel 1: getStepMetrics
  // ============================================================================

  /**
   * Get step execution metrics for a task
   *
   * @param taskId - Task ID
   * @returns Step metrics
   */
  async getStepMetrics(taskId: string): Promise<StepMetrics> {
    // Check cache first
    const cached = this.stepMetricsCache.get(taskId);
    if (cached) {
      return cached;
    }

    // Get steps from StepAPIHandler
    const steps = this.stepAPIHandler
      ? await this.stepAPIHandler.getStepsByTask(taskId)
      : [];

    // Calculate metrics
    const totalSteps = steps.length;
    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const failedSteps = steps.filter((s) => s.status === "failed").length;
    const retriedSteps = steps.filter((s) => s.attemptNumber > 1).length;
    const firstPassRate =
      totalSteps > 0
        ? Math.round(((completedSteps - retriedSteps) / totalSteps) * 100)
        : 0;

    const stepDurations = steps
      .filter((s) => s.durationMs !== undefined)
      .map((s) => ({
        stepId: s.id,
        stepName: s.name,
        durationMs: s.durationMs!,
      }));

    const averageStepDuration =
      stepDurations.length > 0
        ? Math.round(
            stepDurations.reduce((sum, s) => sum + s.durationMs, 0) /
              stepDurations.length
          )
        : 0;

    const metrics: StepMetrics = {
      totalSteps,
      completedSteps,
      failedSteps,
      retriedSteps,
      firstPassRate,
      averageStepDuration,
      stepDurations,
      verificationResults: {
        preconditions: { total: 0, passed: 0 },
        postconditions: { total: 0, passed: 0 },
      },
    };

    // Cache the result
    this.stepMetricsCache.set(taskId, metrics);

    return metrics;
  }

  // ============================================================================
  // IPC Channel 2: getLoopMetrics
  // ============================================================================

  /**
   * Get loop execution metrics
   *
   * @param loopId - Loop ID
   * @returns Loop metrics
   */
  async getLoopMetrics(loopId: string): Promise<LoopMetrics | null> {
    // Check cache first
    const cached = this.loopMetricsCache.get(loopId);
    if (cached) {
      return cached;
    }

    // Get loop status from LoopAPIHandler
    const loopStatus = this.loopAPIHandler
      ? await this.loopAPIHandler.getLoopStatus(loopId)
      : null;

    if (!loopStatus) {
      return null;
    }

    // Get iterations
    const iterations = this.loopAPIHandler
      ? await this.loopAPIHandler.getIterations(loopId)
      : [];

    // Get conditions
    const conditions = this.loopAPIHandler
      ? await this.loopAPIHandler.getConditions(loopId)
      : [];

    // Calculate durations
    const iterationDurations = iterations.map((i) => i.durationMs);
    const averageIterationDuration =
      iterationDurations.length > 0
        ? Math.round(
            iterationDurations.reduce((sum, d) => sum + d, 0) /
              iterationDurations.length
          )
        : 0;

    // Estimate remaining
    const remainingIterations =
      loopStatus.maxIterations - loopStatus.currentIteration;
    const estimatedRemainingTime = remainingIterations * averageIterationDuration;

    const metrics: LoopMetrics = {
      loopId,
      loopName: loopStatus.name,
      totalIterations: iterations.length,
      currentIteration: loopStatus.currentIteration,
      iterationDurations,
      averageIterationDuration,
      conditionProgress: conditions.map((c) => ({
        type: c.type,
        name: c.name,
        progress: c.progress,
        satisfied: c.satisfied,
      })),
      estimatedRemainingIterations: remainingIterations,
      estimatedRemainingTime,
    };

    // Cache the result
    this.loopMetricsCache.set(loopId, metrics);

    return metrics;
  }

  // ============================================================================
  // IPC Channel 3: getSessionSummary
  // ============================================================================

  /**
   * Get session summary
   *
   * @param sessionId - Session ID
   * @returns Session summary
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    const session = await this.stateManager.loadSession(sessionId);
    if (!session) {
      return null;
    }

    // Calculate total duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.lastActivityAt).getTime();
    const totalDuration = endTime - startTime;

    return {
      sessionId: session.id,
      sessionName: session.name,
      status: session.status,
      totalTasks: session.totalWaves, // Approximate
      completedTasks: session.currentWave,
      totalSteps: session.totalStepsCompleted + session.totalStepsFailed,
      completedSteps: session.totalStepsCompleted,
      checkpointsCreated: session.checkpoints.length,
      totalDuration,
      qualityGatesPassed: session.status === "completed",
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  // ============================================================================
  // IPC Channel 4: getPerformanceTimeline
  // ============================================================================

  /**
   * Get performance timeline data for visualization
   *
   * @param taskId - Task ID
   * @returns Timeline data
   */
  async getPerformanceTimeline(taskId: string): Promise<TimelineData | null> {
    // Get steps from StepAPIHandler
    const steps = this.stepAPIHandler
      ? await this.stepAPIHandler.getStepsByTask(taskId)
      : [];

    if (steps.length === 0) {
      return null;
    }

    // Convert steps to timeline data points
    const dataPoints: TimelineDataPoint[] = steps
      .filter((s) => s.startedAt && s.completedAt)
      .map((s) => ({
        timestamp: s.startedAt!,
        id: s.id,
        label: s.name,
        durationMs: s.durationMs ?? 0,
        success: s.status === "completed",
        type: s.type === "quality_gate" ? "quality_gate" : "step",
      }));

    // Sort by timestamp
    dataPoints.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate totals
    const totalDurationMs = dataPoints.reduce((sum, p) => sum + p.durationMs, 0);
    const startTime =
      dataPoints.length > 0 ? dataPoints[0].timestamp : new Date().toISOString();
    const endTime =
      dataPoints.length > 0
        ? dataPoints[dataPoints.length - 1].timestamp
        : new Date().toISOString();

    return {
      taskId,
      dataPoints,
      totalDurationMs,
      startTime,
      endTime,
    };
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear metrics cache for a task
   */
  clearStepMetricsCache(taskId: string): void {
    this.stepMetricsCache.delete(taskId);
  }

  /**
   * Clear metrics cache for a loop
   */
  clearLoopMetricsCache(loopId: string): void {
    this.loopMetricsCache.delete(loopId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.stepMetricsCache.clear();
    this.loopMetricsCache.clear();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private log(message: string): void {
    if (this.debug) {
      console.log(`[MetricsAPIHandler] ${message}`);
    }
  }
}
