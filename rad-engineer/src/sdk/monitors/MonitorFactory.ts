/**
 * Factory for creating platform-specific monitors
 */

import { DarwinMonitor } from "./DarwinMonitor.js";
import { LinuxMonitor } from "./LinuxMonitor.js";
import { FallbackMonitor } from "./FallbackMonitor.js";
import type { IPlatformMonitor } from "./IPlatformMonitor.js";

export class MonitorFactory {
  /**
   * Create a monitor for the current platform
   * @returns Platform-specific monitor
   */
  static createMonitor(): IPlatformMonitor {
    const platform = process.platform;

    switch (platform) {
      case "darwin":
        return new DarwinMonitor();
      case "linux":
        return new LinuxMonitor();
      default:
        return new FallbackMonitor(platform);
    }
  }

  /**
   * Create a monitor for a specific platform (useful for testing)
   * @param platform Platform name
   * @returns Platform-specific monitor
   */
  static createMonitorForPlatform(platform: string): IPlatformMonitor {
    switch (platform) {
      case "darwin":
        return new DarwinMonitor();
      case "linux":
        return new LinuxMonitor();
      default:
        return new FallbackMonitor(platform);
    }
  }
}
