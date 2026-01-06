/**
 * Resource Monitor for system resource tracking
 * Monitors kernel_task CPU, memory pressure, and process count
 */

import { execSync } from "node:child_process";
import type { ResourceCheckResult, ResourceMetrics } from "./types";

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
    const kernel_task_cpu = this.getKernelTaskCPU();
    const memory_pressure = this.getMemoryPressure();
    const process_count = this.getProcessCount();

    return {
      kernel_task_cpu,
      memory_pressure,
      process_count,
      can_spawn_agent: false, // Will be evaluated by evaluateThresholds
      timestamp,
    };
  }

  /**
   * Get kernel_task CPU usage on macOS
   */
  private getKernelTaskCPU(): number {
    try {
      const output = execSync("ps -A -o %cpu,comm | grep kernel_task", {
        encoding: "utf-8",
      });
      const match = output.match(/^(\d+\.?\d*)/m);
      return match ? parseFloat(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get memory pressure percentage
   */
  private getMemoryPressure(): number {
    try {
      const output = execSync("vm_stat | grep Pages_free", {
        encoding: "utf-8",
      });
      const match = output.match(/(\d+)/);
      if (match) {
        const freePages = parseInt(match[1], 10);
        const pageSize = 4096; // 4KB pages on macOS
        const freeMB = (freePages * pageSize) / (1024 * 1024);
        const totalMB = 16384; // Assume 16GB total
        return 100 - (freeMB / totalMB) * 100;
      }
    } catch {
      // Fallback
    }
    return 50; // Conservative default
  }

  /**
   * Get total process count
   */
  private getProcessCount(): number {
    try {
      const output = execSync("ps -A | wc -l", { encoding: "utf-8" });
      return parseInt(output.trim(), 10);
    } catch {
      return 200; // Conservative default
    }
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
}
