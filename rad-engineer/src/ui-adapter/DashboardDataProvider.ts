/**
 * DashboardDataProvider - Single Source of Truth for UI Dashboard
 * Phase 6: Unified UI Transparency Layer
 *
 * Aggregates data from all handlers into a unified dashboard view.
 * This is the primary data source for the rad-engineer UI dashboard.
 *
 * Key responsibilities:
 * - Aggregate task, step, loop, and metrics data
 * - Provide real-time dashboard state
 * - Track recent events and decisions
 * - Manage checkpoint visibility
 */

import { EventEmitter } from "events";
import type { StateManager } from "@/advanced/StateManager.js";
import type { StepAPIHandler, StepUIStatus } from "./StepAPIHandler.js";
import type { LoopAPIHandler, LoopUIStatus } from "./LoopAPIHandler.js";
import type { MetricsAPIHandler } from "./MetricsAPIHandler.js";
import type { DecisionLogEntry, StepCheckpointSummary } from "@/advanced/types/step.js";
import type { VerificationResult } from "@/advanced/types/step.js";

/**
 * Configuration for DashboardDataProvider
 */
export interface DashboardDataProviderConfig {
  /** StateManager instance */
  stateManager: StateManager;
  /** StepAPIHandler instance */
  stepAPIHandler?: StepAPIHandler;
  /** LoopAPIHandler instance */
  loopAPIHandler?: LoopAPIHandler;
  /** MetricsAPIHandler instance */
  metricsAPIHandler?: MetricsAPIHandler;
  /** Maximum recent events to track */
  maxRecentEvents?: number;
  /** Maximum recent decisions to track */
  maxRecentDecisions?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Current step details for dashboard
 */
export interface CurrentStepInfo {
  id: string;
  name: string;
  status: string;
  phase: string;
  progress: number;
  attemptNumber: number;
  maxAttempts: number;
  elapsedMs: number;
}

/**
 * Step timeline entry
 */
export interface StepTimelineEntry {
  id: string;
  name: string;
  status: string;
  durationMs: number | null;
  hasCheckpoint: boolean;
}

/**
 * Active loop info
 */
export interface ActiveLoopInfo {
  id: string;
  name: string;
  currentIteration: number;
  maxIterations: number;
  exitConditions: Array<{
    type: string;
    progress: number;
    satisfied: boolean;
  }>;
}

/**
 * Verification status
 */
export interface VerificationStatus {
  lastChecked: string;
  preconditions: Array<{ name: string; passed: boolean }>;
  postconditions: Array<{ name: string; passed: boolean }>;
}

/**
 * Dashboard metrics summary
 */
export interface DashboardMetrics {
  totalSteps: number;
  completedSteps: number;
  firstPassRate: number;
  avgStepDuration: number;
}

/**
 * Recent event for dashboard
 */
export interface RecentEvent {
  type: string;
  message: string;
  timestamp: string;
}

/**
 * Recent decision for dashboard
 */
export interface RecentDecision {
  timestamp: string;
  decision: string;
  rationale: string;
}

/**
 * Checkpoint entry for dashboard
 */
export interface CheckpointEntry {
  id: string;
  name: string;
  stepId: string;
  createdAt: string;
}

/**
 * Full execution dashboard data
 */
export interface ExecutionDashboard {
  /** Task overview */
  task: {
    id: string;
    title: string;
    status: string;
    progress: number;
  };

  /** Current step details */
  currentStep: CurrentStepInfo | null;

  /** Step timeline (all steps with status) */
  steps: StepTimelineEntry[];

  /** Active loop (if any) */
  activeLoop: ActiveLoopInfo | null;

  /** Verification status (pre/post conditions) */
  verification: VerificationStatus;

  /** Metrics summary */
  metrics: DashboardMetrics;

  /** Recent decisions (for transparency) */
  recentDecisions: RecentDecision[];

  /** Available checkpoints for replay */
  checkpoints: CheckpointEntry[];

  /** Live events (last N) */
  recentEvents: RecentEvent[];

  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * DashboardDataProvider - Unified data provider for the dashboard UI
 *
 * @example
 * ```ts
 * const provider = new DashboardDataProvider({
 *   stateManager,
 *   stepAPIHandler,
 *   loopAPIHandler,
 *   metricsAPIHandler,
 * });
 *
 * // Get full dashboard data
 * const dashboard = await provider.getExecutionDashboard("task-123");
 * ```
 */
export class DashboardDataProvider extends EventEmitter {
  private readonly stateManager: StateManager;
  private readonly stepAPIHandler?: StepAPIHandler;
  private readonly loopAPIHandler?: LoopAPIHandler;
  private readonly metricsAPIHandler?: MetricsAPIHandler;
  private readonly maxRecentEvents: number;
  private readonly maxRecentDecisions: number;
  private readonly debug: boolean;

  // In-memory event tracking
  private recentEvents: RecentEvent[] = [];

  constructor(config: DashboardDataProviderConfig) {
    super();
    this.stateManager = config.stateManager;
    this.stepAPIHandler = config.stepAPIHandler;
    this.loopAPIHandler = config.loopAPIHandler;
    this.metricsAPIHandler = config.metricsAPIHandler;
    this.maxRecentEvents = config.maxRecentEvents ?? 50;
    this.maxRecentDecisions = config.maxRecentDecisions ?? 20;
    this.debug = config.debug ?? false;
  }

  /**
   * Get full execution dashboard data
   *
   * @param taskId - Task ID
   * @returns Execution dashboard data
   */
  async getExecutionDashboard(taskId: string): Promise<ExecutionDashboard> {
    // Get steps
    const steps = this.stepAPIHandler
      ? await this.stepAPIHandler.getStepsByTask(taskId)
      : [];

    // Get metrics
    const metrics = this.metricsAPIHandler
      ? await this.metricsAPIHandler.getStepMetrics(taskId)
      : null;

    // Get active loops
    const activeLoops = this.loopAPIHandler
      ? this.loopAPIHandler.getActiveLoops()
      : [];

    // Get checkpoints from session (would need session ID)
    const checkpoints: CheckpointEntry[] = [];

    // Get decisions
    const decisions = this.stepAPIHandler?.getDecisionLog() ?? [];

    // Find current step (executing)
    const executingStep = steps.find((s) => s.status === "executing");

    // Calculate task progress
    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const taskProgress =
      steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

    // Build dashboard
    const dashboard: ExecutionDashboard = {
      task: {
        id: taskId,
        title: `Task ${taskId}`,
        status: this.calculateTaskStatus(steps),
        progress: taskProgress,
      },

      currentStep: executingStep
        ? {
            id: executingStep.id,
            name: executingStep.name,
            status: executingStep.status,
            phase: executingStep.phase,
            progress: executingStep.progress,
            attemptNumber: executingStep.attemptNumber,
            maxAttempts: executingStep.maxAttempts,
            elapsedMs: executingStep.durationMs ?? 0,
          }
        : null,

      steps: steps.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        durationMs: s.durationMs ?? null,
        hasCheckpoint: false, // Would check checkpoints list
      })),

      activeLoop:
        activeLoops.length > 0
          ? {
              id: activeLoops[0].loopId,
              name: activeLoops[0].name,
              currentIteration: activeLoops[0].currentIteration,
              maxIterations: activeLoops[0].maxIterations,
              exitConditions: [
                {
                  type: "command",
                  progress: activeLoops[0].progressPercent,
                  satisfied: activeLoops[0].conditionSatisfied,
                },
              ],
            }
          : null,

      verification: {
        lastChecked: new Date().toISOString(),
        preconditions: [],
        postconditions: [],
      },

      metrics: {
        totalSteps: metrics?.totalSteps ?? steps.length,
        completedSteps: metrics?.completedSteps ?? completedSteps,
        firstPassRate: metrics?.firstPassRate ?? 0,
        avgStepDuration: metrics?.averageStepDuration ?? 0,
      },

      recentDecisions: decisions
        .slice(-this.maxRecentDecisions)
        .map((d) => ({
          timestamp: d.timestamp,
          decision: d.decision,
          rationale: d.rationale,
        })),

      checkpoints,

      recentEvents: this.recentEvents.slice(-this.maxRecentEvents),

      lastUpdated: new Date().toISOString(),
    };

    return dashboard;
  }

  /**
   * Get quick status for a task (lightweight)
   */
  async getQuickStatus(taskId: string): Promise<{
    status: string;
    progress: number;
    currentStep: string | null;
  }> {
    const steps = this.stepAPIHandler
      ? await this.stepAPIHandler.getStepsByTask(taskId)
      : [];

    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const executingStep = steps.find((s) => s.status === "executing");

    return {
      status: this.calculateTaskStatus(steps),
      progress:
        steps.length > 0
          ? Math.round((completedSteps / steps.length) * 100)
          : 0,
      currentStep: executingStep?.name ?? null,
    };
  }

  /**
   * Add a recent event
   */
  addEvent(type: string, message: string): void {
    const event: RecentEvent = {
      type,
      message,
      timestamp: new Date().toISOString(),
    };

    this.recentEvents.push(event);

    // Trim to max
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(-this.maxRecentEvents);
    }

    // Emit for real-time subscribers
    this.emit("event", event);
  }

  /**
   * Clear recent events
   */
  clearEvents(): void {
    this.recentEvents = [];
  }

  /**
   * Calculate task status from steps
   */
  private calculateTaskStatus(steps: StepUIStatus[]): string {
    if (steps.length === 0) return "pending";

    const hasExecuting = steps.some((s) => s.status === "executing");
    if (hasExecuting) return "in_progress";

    const hasFailed = steps.some((s) => s.status === "failed");
    if (hasFailed) return "failed";

    const allCompleted = steps.every(
      (s) => s.status === "completed" || s.status === "skipped"
    );
    if (allCompleted) return "completed";

    const hasPending = steps.some((s) => s.status === "pending");
    if (hasPending) return "pending";

    return "unknown";
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[DashboardDataProvider] ${message}`);
    }
  }
}
