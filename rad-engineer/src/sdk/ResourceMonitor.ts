/**
 * Resource Monitor for system resource tracking
 * Monitors kernel_task CPU, memory pressure, and process count
 * Cross-platform support via platform-specific monitors
 */

import type { ResourceCheckResult, ResourceMetrics } from "./types";
import { MonitorFactory } from "./monitors/MonitorFactory.js";
import type { IPlatformMonitor } from "./monitors/IPlatformMonitor.js";

/**
 * Resource Monitor class
 * Checks system resources before agent spawns to prevent crashes
 */
export class ResourceMonitor {
  private readonly thresholds = {
    kernel_task_cpu: 50, // percent
    memory_pressure: 80, // percent
    process_count: 400, // count
  };

  private monitor: IPlatformMonitor;

  constructor(monitor?: IPlatformMonitor) {
    this.monitor = monitor || MonitorFactory.createMonitor();
  }

  /**
   * Check system resources before spawning an agent
   * @returns Resource check result with spawn decision
   */
  async checkResources(): Promise<ResourceCheckResult> {
    try {
      const metrics = await this.collectMetrics();
      const canSpawn = this.evaluateThresholds(metrics);

      return {
        can_spawn_agent: canSpawn,
        metrics,
        reason: canSpawn ? undefined : this.explainThresholdExceeded(metrics),
      };
    } catch {
      // If monitoring fails, be conservative and allow spawn
      return {
        can_spawn_agent: true,
        metrics: this.getDefaultMetrics(),
        reason: "Resource monitoring unavailable, proceeding with caution",
      };
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<ResourceMetrics> {
    const timestamp = new Date().toISOString();
    const kernel_task_cpu = await this.monitor.getKernelTaskCPU();
    const memory_pressure = await this.monitor.getMemoryPressure();
    const process_count = await this.monitor.getProcessCount();

    return {
      kernel_task_cpu,
      memory_pressure,
      process_count,
      can_spawn_agent: false, // Will be evaluated by evaluateThresholds
      timestamp,
    };
  }

  /**
   * Evaluate if metrics are within safe thresholds
   */
  private evaluateThresholds(metrics: ResourceMetrics): boolean {
    return (
      metrics.kernel_task_cpu < this.thresholds.kernel_task_cpu &&
      metrics.memory_pressure < this.thresholds.memory_pressure &&
      metrics.process_count < this.thresholds.process_count
    );
  }

  /**
   * Explain which threshold was exceeded
   */
  private explainThresholdExceeded(metrics: ResourceMetrics): string {
    const reasons: string[] = [];

    if (metrics.kernel_task_cpu >= this.thresholds.kernel_task_cpu) {
      reasons.push(
        `kernel_task CPU (${metrics.kernel_task_cpu}% ≥ ${this.thresholds.kernel_task_cpu}%)`
      );
    }
    if (metrics.memory_pressure >= this.thresholds.memory_pressure) {
      reasons.push(
        `Memory pressure (${metrics.memory_pressure}% ≥ ${this.thresholds.memory_pressure}%)`
      );
    }
    if (metrics.process_count >= this.thresholds.process_count) {
      reasons.push(
        `Process count (${metrics.process_count} ≥ ${this.thresholds.process_count})`
      );
    }

    return `Thresholds exceeded: ${reasons.join(", ")}`;
  }

  /**
   * Get default metrics when monitoring is unavailable
   */
  private getDefaultMetrics(): ResourceMetrics {
    return {
      kernel_task_cpu: 30,
      memory_pressure: 60,
      process_count: 250,
      can_spawn_agent: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current threshold values
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Get platform name from current monitor
   */
  getPlatformName(): string {
    return this.monitor.getPlatformName();
  }
}
