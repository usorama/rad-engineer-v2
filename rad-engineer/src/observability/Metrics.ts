/**
 * Metrics - High-level interface for recording metrics
 *
 * Provides convenient methods for recording agent execution metrics
 * without directly exposing Prometheus implementation details.
 *
 * Usage:
 * ```typescript
 * const metrics = new Metrics();
 *
 * // Record task completion
 * metrics.recordTaskCompletion({
 *   taskId: "task-1",
 *   status: "success",
 *   durationSeconds: 12.5,
 *   waveId: "wave-1"
 * });
 *
 * // Track active agents
 * metrics.incrementActiveAgents("wave-1");
 * metrics.decrementActiveAgents("wave-1");
 *
 * // Record resource utilization
 * metrics.recordResourceUtilization("cpu", 45.2);
 * ```
 */

import { MetricsRegistry } from "./MetricsRegistry.js";

/**
 * Task completion parameters
 */
export interface TaskCompletionParams {
  /** Task identifier */
  taskId: string;
  /** Task status: success or failure */
  status: "success" | "failure";
  /** Task duration in seconds */
  durationSeconds: number;
  /** Wave identifier (optional) */
  waveId?: string;
}

/**
 * High-level metrics recording interface
 */
export class Metrics {
  private readonly registry: MetricsRegistry;

  constructor() {
    this.registry = MetricsRegistry.getInstance();
  }

  /**
   * Record completion of an agent task
   */
  public recordTaskCompletion(params: TaskCompletionParams): void {
    const { taskId, status, durationSeconds, waveId = "default" } = params;

    // Increment counter
    this.registry.agentTasksTotal.inc({
      task_id: taskId,
      status,
      wave_id: waveId,
    });

    // Record duration
    this.registry.agentTaskDuration.observe(
      {
        task_id: taskId,
        status,
        wave_id: waveId,
      },
      durationSeconds
    );
  }

  /**
   * Increment active agents count
   */
  public incrementActiveAgents(waveId: string = "default"): void {
    this.registry.activeAgents.inc({ wave_id: waveId });
  }

  /**
   * Decrement active agents count
   */
  public decrementActiveAgents(waveId: string = "default"): void {
    this.registry.activeAgents.dec({ wave_id: waveId });
  }

  /**
   * Set active agents count to a specific value
   */
  public setActiveAgents(count: number, waveId: string = "default"): void {
    this.registry.activeAgents.set({ wave_id: waveId }, count);
  }

  /**
   * Record resource utilization percentage
   */
  public recordResourceUtilization(resourceType: string, percent: number): void {
    this.registry.resourceUtilization.set({ resource_type: resourceType }, percent);
  }

  /**
   * Get metrics in Prometheus exposition format
   */
  public async getMetrics(): Promise<string> {
    return await this.registry.getMetrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.registry.reset();
  }
}
