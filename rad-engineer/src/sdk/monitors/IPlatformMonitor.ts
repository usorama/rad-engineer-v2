/**
 * Platform monitor interface
 * Defines contract for platform-specific resource monitoring
 */

export interface IPlatformMonitor {
  /**
   * Get kernel/system task CPU usage
   * @returns CPU percentage (0-100)
   */
  getKernelTaskCPU(): Promise<number>;

  /**
   * Get memory pressure percentage
   * @returns Memory pressure percentage (0-100)
   */
  getMemoryPressure(): Promise<number>;

  /**
   * Get total process count
   * @returns Number of running processes
   */
  getProcessCount(): Promise<number>;

  /**
   * Get platform name
   * @returns Platform identifier
   */
  getPlatformName(): string;
}
