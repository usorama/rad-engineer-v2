/**
 * Fallback platform monitor
 * Returns safe default values for unsupported platforms
 */

import type { IPlatformMonitor } from "./IPlatformMonitor.js";

export class FallbackMonitor implements IPlatformMonitor {
  constructor(private platform: string = "unknown") {}

  getPlatformName(): string {
    return this.platform;
  }

  /**
   * Return safe default for kernel CPU
   */
  async getKernelTaskCPU(): Promise<number> {
    return 30; // Conservative default
  }

  /**
   * Return safe default for memory pressure
   */
  async getMemoryPressure(): Promise<number> {
    return 60; // Conservative default
  }

  /**
   * Return safe default for process count
   */
  async getProcessCount(): Promise<number> {
    return 250; // Conservative default
  }
}
