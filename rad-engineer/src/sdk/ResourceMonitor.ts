/**
 * Resource Monitor for system resource tracking
 * Monitors kernel_task CPU, memory pressure, and process count
 */

import { execFileNoThrow } from "../utils/execFileNoThrow.js";
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
    const kernel_task_cpu = await this.getKernelTaskCPU();
    const memory_pressure = await this.getMemoryPressure();
    const process_count = await this.getProcessCount();

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
  private async getKernelTaskCPU(): Promise<number> {
    try {
      const result = await execFileNoThrow("ps", ["-A", "-o", "%cpu,comm"]);
      if (result.success) {
        const match = result.stdout.match(/kernel_task\s+(\d+\.?\d*)/m);
        return match ? parseFloat(match[1]) : 0;
      }
    } catch {
      // Fall through
    }
    return 0;
  }

  /**
   * Get memory pressure percentage
   *
   * FIXED BUGS:
   * - Parse actual page size from vm_stat header (not hardcoded 4096)
   * - Get actual total memory via sysctl hw.memsize (not hardcoded 16GB)
   * - Count all available pages (free + inactive + speculative + purgeable)
   */
  private async getMemoryPressure(): Promise<number> {
    try {
      // Get vm_stat output
      const vmStatResult = await execFileNoThrow("vm_stat", []);
      if (!vmStatResult.success) {
        return 50; // Conservative default
      }

      // Parse page size from vm_stat header (e.g., "page size of 16384 bytes")
      const pageSizeMatch = vmStatResult.stdout.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 16384;

      // Get actual total memory via sysctl hw.memsize
      const memSizeResult = await execFileNoThrow("sysctl", ["hw.memsize"]);
      if (!memSizeResult.success) {
        return 50;
      }

      const totalBytes = parseInt(memSizeResult.stdout.split(": ")[1], 10);
      const totalMB = totalBytes / (1024 * 1024);

      // Parse available memory pages (free + inactive + speculative + purgeable)
      const freeMatch = vmStatResult.stdout.match(/Pages free:\s+(\d+)/);
      const inactiveMatch = vmStatResult.stdout.match(/Pages inactive:\s+(\d+)/);
      const speculativeMatch = vmStatResult.stdout.match(/Pages speculative:\s+(\d+)/);
      const purgeableMatch = vmStatResult.stdout.match(/Pages purgeable:\s+(\d+)/);

      if (!freeMatch) {
        return 50;
      }

      const freePages = parseInt(freeMatch[1], 10);
      const inactivePages = inactiveMatch ? parseInt(inactiveMatch[1], 10) : 0;
      const speculativePages = speculativeMatch ? parseInt(speculativeMatch[1], 10) : 0;
      const purgeablePages = purgeableMatch ? parseInt(purgeableMatch[1], 10) : 0;

      // Calculate available memory
      const availablePages = freePages + inactivePages + speculativePages + purgeablePages;
      const availableMB = (availablePages * pageSize) / (1024 * 1024);

      // Calculate memory pressure as percentage used
      return 100 - (availableMB / totalMB) * 100;
    } catch {
      // Fallback on any error
      return 50; // Conservative default
    }
  }

  /**
   * Get total process count
   */
  private async getProcessCount(): Promise<number> {
    try {
      const result = await execFileNoThrow("ps", ["-A"]);
      if (result.success) {
        const lines = result.stdout.trim().split("\n");
        return lines.length;
      }
    } catch {
      // Fall through
    }
    return 200; // Conservative default
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
