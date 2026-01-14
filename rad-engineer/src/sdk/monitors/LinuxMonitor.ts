/**
 * Linux platform monitor
 * Uses /proc/meminfo and ps commands
 */

import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import type { IPlatformMonitor } from "./IPlatformMonitor.js";

export class LinuxMonitor implements IPlatformMonitor {
  getPlatformName(): string {
    return "linux";
  }

  /**
   * Get system CPU usage on Linux
   * Note: Linux doesn't have kernel_task, so we monitor overall system CPU
   */
  async getKernelTaskCPU(): Promise<number> {
    try {
      // On Linux, we look for high CPU kworker or ksoftirqd processes
      const result = await execFileNoThrow("ps", ["aux", "--sort=-%cpu"]);
      if (result.success) {
        // Get top CPU processes that are kernel threads (kworker, ksoftirqd, etc.)
        const lines = result.stdout.split("\n").slice(1); // Skip header
        let totalKernelCpu = 0;

        for (const line of lines.slice(0, 20)) { // Check top 20 processes
          const match = line.match(/\s+(\d+\.\d+)\s+\d+\.\d+\s+.*?\[?(kworker|ksoftirqd|migration|watchdog|cpuhp)\]?/);
          if (match) {
            totalKernelCpu += parseFloat(match[1]);
          }
        }

        return totalKernelCpu;
      }
    } catch {
      // Fall through
    }
    return 0;
  }

  /**
   * Get memory pressure percentage using /proc/meminfo
   */
  async getMemoryPressure(): Promise<number> {
    try {
      const result = await execFileNoThrow("cat", ["/proc/meminfo"]);
      if (!result.success) {
        return 50; // Conservative default
      }

      // Parse memory values from /proc/meminfo
      const memTotalMatch = result.stdout.match(/MemTotal:\s+(\d+)\s+kB/);
      const memAvailableMatch = result.stdout.match(/MemAvailable:\s+(\d+)\s+kB/);

      if (!memTotalMatch || !memAvailableMatch) {
        return 50;
      }

      const totalKB = parseInt(memTotalMatch[1], 10);
      const availableKB = parseInt(memAvailableMatch[1], 10);

      // Calculate memory pressure as percentage used
      const usedKB = totalKB - availableKB;
      return (usedKB / totalKB) * 100;
    } catch {
      return 50; // Conservative default
    }
  }

  /**
   * Get total process count
   */
  async getProcessCount(): Promise<number> {
    try {
      const result = await execFileNoThrow("ps", ["aux"]);
      if (result.success) {
        const lines = result.stdout.trim().split("\n");
        // Subtract header line
        return lines.length - 1;
      }
    } catch {
      // Fall through
    }
    return 200; // Conservative default
  }
}
