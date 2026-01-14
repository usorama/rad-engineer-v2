/**
 * Unit tests for ResourceMonitor with cross-platform support
 *
 * Tests:
 * - Platform detection and monitor selection
 * - DarwinMonitor (macOS) functionality
 * - LinuxMonitor functionality
 * - FallbackMonitor functionality
 * - ResourceMonitor integration with platform monitors
 * - Threshold evaluation
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ResourceMonitor } from "../ResourceMonitor.js";
import { DarwinMonitor } from "../monitors/DarwinMonitor.js";
import { LinuxMonitor } from "../monitors/LinuxMonitor.js";
import { FallbackMonitor } from "../monitors/FallbackMonitor.js";
import { MonitorFactory } from "../monitors/MonitorFactory.js";
import type { IPlatformMonitor } from "../monitors/IPlatformMonitor.js";

describe("MonitorFactory", () => {
  it("Creates appropriate monitor for darwin platform", () => {
    const monitor = MonitorFactory.createMonitorForPlatform("darwin");
    expect(monitor).toBeInstanceOf(DarwinMonitor);
    expect(monitor.getPlatformName()).toBe("darwin");
  });

  it("Creates appropriate monitor for linux platform", () => {
    const monitor = MonitorFactory.createMonitorForPlatform("linux");
    expect(monitor).toBeInstanceOf(LinuxMonitor);
    expect(monitor.getPlatformName()).toBe("linux");
  });

  it("Creates fallback monitor for unknown platform", () => {
    const monitor = MonitorFactory.createMonitorForPlatform("win32");
    expect(monitor).toBeInstanceOf(FallbackMonitor);
    expect(monitor.getPlatformName()).toBe("win32");
  });

  it("Creates monitor for current platform", () => {
    const monitor = MonitorFactory.createMonitor();
    expect(monitor).toBeDefined();
    expect(monitor.getPlatformName()).toBe(process.platform);
  });
});

describe("FallbackMonitor", () => {
  let monitor: FallbackMonitor;

  beforeEach(() => {
    monitor = new FallbackMonitor("test-platform");
  });

  it("Returns platform name", () => {
    expect(monitor.getPlatformName()).toBe("test-platform");
  });

  it("Returns safe default for kernel CPU", async () => {
    const cpu = await monitor.getKernelTaskCPU();
    expect(cpu).toBe(30);
  });

  it("Returns safe default for memory pressure", async () => {
    const memory = await monitor.getMemoryPressure();
    expect(memory).toBe(60);
  });

  it("Returns safe default for process count", async () => {
    const count = await monitor.getProcessCount();
    expect(count).toBe(250);
  });
});

describe("DarwinMonitor", () => {
  let monitor: DarwinMonitor;

  beforeEach(() => {
    monitor = new DarwinMonitor();
  });

  it("Returns darwin as platform name", () => {
    expect(monitor.getPlatformName()).toBe("darwin");
  });

  it("Gets kernel_task CPU usage", async () => {
    const cpu = await monitor.getKernelTaskCPU();
    expect(typeof cpu).toBe("number");
    expect(cpu).toBeGreaterThanOrEqual(0);
    expect(cpu).toBeLessThanOrEqual(100);
  });

  it("Gets memory pressure", async () => {
    const memory = await monitor.getMemoryPressure();
    expect(typeof memory).toBe("number");
    expect(memory).toBeGreaterThanOrEqual(0);
    expect(memory).toBeLessThanOrEqual(100);
  });

  it("Gets process count", async () => {
    const count = await monitor.getProcessCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0);
  });
});

describe("LinuxMonitor", () => {
  let monitor: LinuxMonitor;

  beforeEach(() => {
    monitor = new LinuxMonitor();
  });

  it("Returns linux as platform name", () => {
    expect(monitor.getPlatformName()).toBe("linux");
  });

  it("Gets kernel CPU usage", async () => {
    const cpu = await monitor.getKernelTaskCPU();
    expect(typeof cpu).toBe("number");
    expect(cpu).toBeGreaterThanOrEqual(0);
  });

  it("Gets memory pressure", async () => {
    const memory = await monitor.getMemoryPressure();
    expect(typeof memory).toBe("number");
    expect(memory).toBeGreaterThanOrEqual(0);
    expect(memory).toBeLessThanOrEqual(100);
  });

  it("Gets process count", async () => {
    const count = await monitor.getProcessCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0);
  });
});

describe("ResourceMonitor: Platform Integration", () => {
  it("Uses platform monitor when not provided", () => {
    const monitor = new ResourceMonitor();
    expect(monitor.getPlatformName()).toBe(process.platform);
  });

  it("Uses provided monitor", () => {
    const fallbackMonitor = new FallbackMonitor("custom");
    const monitor = new ResourceMonitor(fallbackMonitor);
    expect(monitor.getPlatformName()).toBe("custom");
  });

  it("Gets thresholds", () => {
    const monitor = new ResourceMonitor();
    const thresholds = monitor.getThresholds();
    expect(thresholds.kernel_task_cpu).toBe(50);
    expect(thresholds.memory_pressure).toBe(80);
    expect(thresholds.process_count).toBe(400);
  });
});

describe("ResourceMonitor: Resource Checks", () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    // Use fallback monitor for predictable tests
    const fallbackMonitor = new FallbackMonitor("test");
    monitor = new ResourceMonitor(fallbackMonitor);
  });

  it("Checks resources successfully", async () => {
    const result = await monitor.checkResources();
    expect(result).toBeDefined();
    expect(result.can_spawn_agent).toBe(true);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.kernel_task_cpu).toBe(30);
    expect(result.metrics.memory_pressure).toBe(60);
    expect(result.metrics.process_count).toBe(250);
  });

  it("Returns metrics with timestamp", async () => {
    const result = await monitor.checkResources();
    expect(result.metrics.timestamp).toBeDefined();
    expect(typeof result.metrics.timestamp).toBe("string");
  });
});

describe("ResourceMonitor: Threshold Evaluation", () => {
  it("Allows spawn when all metrics below threshold", async () => {
    const mockMonitor: IPlatformMonitor = {
      getPlatformName: () => "mock",
      getKernelTaskCPU: async () => 10,
      getMemoryPressure: async () => 20,
      getProcessCount: async () => 100,
    };

    const monitor = new ResourceMonitor(mockMonitor);
    const result = await monitor.checkResources();
    expect(result.can_spawn_agent).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("Blocks spawn when kernel CPU exceeds threshold", async () => {
    const mockMonitor: IPlatformMonitor = {
      getPlatformName: () => "mock",
      getKernelTaskCPU: async () => 60, // Above threshold of 50
      getMemoryPressure: async () => 20,
      getProcessCount: async () => 100,
    };

    const monitor = new ResourceMonitor(mockMonitor);
    const result = await monitor.checkResources();
    expect(result.can_spawn_agent).toBe(false);
    expect(result.reason).toContain("kernel_task CPU");
  });

  it("Blocks spawn when memory pressure exceeds threshold", async () => {
    const mockMonitor: IPlatformMonitor = {
      getPlatformName: () => "mock",
      getKernelTaskCPU: async () => 10,
      getMemoryPressure: async () => 85, // Above threshold of 80
      getProcessCount: async () => 100,
    };

    const monitor = new ResourceMonitor(mockMonitor);
    const result = await monitor.checkResources();
    expect(result.can_spawn_agent).toBe(false);
    expect(result.reason).toContain("Memory pressure");
  });

  it("Blocks spawn when process count exceeds threshold", async () => {
    const mockMonitor: IPlatformMonitor = {
      getPlatformName: () => "mock",
      getKernelTaskCPU: async () => 10,
      getMemoryPressure: async () => 20,
      getProcessCount: async () => 450, // Above threshold of 400
    };

    const monitor = new ResourceMonitor(mockMonitor);
    const result = await monitor.checkResources();
    expect(result.can_spawn_agent).toBe(false);
    expect(result.reason).toContain("Process count");
  });

  it("Blocks spawn when multiple thresholds exceeded", async () => {
    const mockMonitor: IPlatformMonitor = {
      getPlatformName: () => "mock",
      getKernelTaskCPU: async () => 60,
      getMemoryPressure: async () => 85,
      getProcessCount: async () => 450,
    };

    const monitor = new ResourceMonitor(mockMonitor);
    const result = await monitor.checkResources();
    expect(result.can_spawn_agent).toBe(false);
    expect(result.reason).toContain("kernel_task CPU");
    expect(result.reason).toContain("Memory pressure");
    expect(result.reason).toContain("Process count");
  });
});

describe("ResourceMonitor: Error Handling", () => {
  it("Returns default metrics on monitoring failure", async () => {
    const mockMonitor: IPlatformMonitor = {
      getPlatformName: () => "mock",
      getKernelTaskCPU: async () => {
        throw new Error("CPU check failed");
      },
      getMemoryPressure: async () => 20,
      getProcessCount: async () => 100,
    };

    const monitor = new ResourceMonitor(mockMonitor);
    const result = await monitor.checkResources();

    // Should return default metrics and allow spawn
    expect(result.can_spawn_agent).toBe(true);
    expect(result.metrics.kernel_task_cpu).toBe(30);
    expect(result.metrics.memory_pressure).toBe(60);
    expect(result.metrics.process_count).toBe(250);
    expect(result.reason).toContain("monitoring unavailable");
  });
});
