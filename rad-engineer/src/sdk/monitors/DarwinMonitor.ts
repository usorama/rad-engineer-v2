/**
 * Darwin (macOS) platform monitor
 * Uses vm_stat, sysctl, and ps commands
 */

import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import type { IPlatformMonitor } from "./IPlatformMonitor.js";

export class DarwinMonitor implements IPlatformMonitor {
  getPlatformName(): string {
    return "darwin";
  }

  /**
   * Get kernel_task CPU usage on macOS
   */
  async getKernelTaskCPU(): Promise<number> {
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
  async getMemoryPressure(): Promise<number> {
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
  async getProcessCount(): Promise<number> {
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
}
