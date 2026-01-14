/**
 * MetricsRegistry - Prometheus metrics collection singleton
 *
 * Provides centralized Prometheus metrics for the rad-engineer platform:
 * - agent_tasks_total: Counter for completed agent tasks
 * - agent_task_duration_seconds: Histogram for task execution time
 * - active_agents: Gauge for currently running agents
 * - resource_utilization_percent: Gauge for system resource usage
 *
 * Follows singleton pattern to ensure consistent metrics across the application.
 */

import * as promClient from "prom-client";

/**
 * Singleton registry for Prometheus metrics
 */
export class MetricsRegistry {
  private static instance: MetricsRegistry | null = null;
  private readonly registry: promClient.Registry;

  // Metrics
  public readonly agentTasksTotal: promClient.Counter<"task_id" | "status" | "wave_id">;
  public readonly agentTaskDuration: promClient.Histogram<"task_id" | "status" | "wave_id">;
  public readonly activeAgents: promClient.Gauge<"wave_id">;
  public readonly resourceUtilization: promClient.Gauge<"resource_type">;

  private constructor() {
    // Create a new registry instance
    this.registry = new promClient.Registry();

    // Counter: Total agent tasks completed
    this.agentTasksTotal = new promClient.Counter({
      name: "agent_tasks_total",
      help: "Total number of agent tasks completed",
      labelNames: ["task_id", "status", "wave_id"] as const,
      registers: [this.registry],
    });

    // Histogram: Task execution duration
    this.agentTaskDuration = new promClient.Histogram({
      name: "agent_task_duration_seconds",
      help: "Duration of agent task execution in seconds",
      labelNames: ["task_id", "status", "wave_id"] as const,
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300], // 0.1s to 5min
      registers: [this.registry],
    });

    // Gauge: Active agents
    this.activeAgents = new promClient.Gauge({
      name: "active_agents",
      help: "Number of currently active agents",
      labelNames: ["wave_id"] as const,
      registers: [this.registry],
    });

    // Gauge: Resource utilization
    this.resourceUtilization = new promClient.Gauge({
      name: "resource_utilization_percent",
      help: "System resource utilization percentage",
      labelNames: ["resource_type"] as const,
      registers: [this.registry],
    });

    // Enable default metrics (process stats, Node.js internals)
    promClient.collectDefaultMetrics({ register: this.registry });
  }

  /**
   * Get singleton instance of MetricsRegistry
   */
  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  /**
   * Get metrics in Prometheus exposition format
   */
  public async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get registry instance for custom metrics
   */
  public getRegistry(): promClient.Registry {
    return this.registry;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.registry.resetMetrics();
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    MetricsRegistry.instance = null;
  }
}
