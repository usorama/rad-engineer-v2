/**
 * Unit tests for ResourceManager
 * Tests: agent lifecycle, resource checking, threshold enforcement
 *
 * Coverage requirements:
 * - Unit tests: 12 tests
 * - Branches: 85%
 * - Functions: 90%
 * - Lines: 90%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ResourceManager, ResourceManagerError, ResourceManagerException } from "@/core/index.js";
import type { ResourceMetrics } from "@/sdk/types.js";

describe("ResourceManager: canSpawnAgent", () => {
  let manager: ResourceManager;

  beforeEach(() => {
    manager = new ResourceManager({ maxConcurrent: 2 });
  });

  it("Returns true when under limit and resources OK", async () => {
    // Mock ResourceMonitor to return OK metrics
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const managerWithMonitor = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const canSpawn = await managerWithMonitor.canSpawnAgent();

    expect(canSpawn).toBe(true);
  });

  it("Returns false when at concurrent limit", async () => {
    // Register 2 agents (at limit)
    await manager.registerAgent("agent-1");
    await manager.registerAgent("agent-2");

    const canSpawn = await manager.canSpawnAgent();

    expect(canSpawn).toBe(false);
    expect(manager.getActiveAgentCount()).toBe(2);
  });

  it("Returns false when kernel_task CPU > 50%", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 65, // Exceeds threshold
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const managerWithMonitor = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const canSpawn = await managerWithMonitor.canSpawnAgent();

    expect(canSpawn).toBe(false);
  });

  it("Returns false when memory < 20% free", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 85, // Only 15% free
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const managerWithMonitor = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const canSpawn = await managerWithMonitor.canSpawnAgent();

    expect(canSpawn).toBe(false);
  });

  it("Returns false when thread count > 300", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        thread_count: 350, // Exceeds threshold
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }) as ResourceMetrics,
      setBaseline: async () => {},
    };

    const managerWithMonitor = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const canSpawn = await managerWithMonitor.canSpawnAgent();

    expect(canSpawn).toBe(false);
  });
});

describe("ResourceManager: registerAgent", () => {
  let manager: ResourceManager;

  beforeEach(() => {
    manager = new ResourceManager({ maxConcurrent: 2 });
  });

  afterEach(() => {
    // Cleanup any registered agents
    const activeAgents = manager.getActiveAgents();
    for (const agentId of activeAgents) {
      manager.unregisterAgent(agentId);
    }
  });

  it("Successfully register agent under limit", async () => {
    await manager.registerAgent("agent-1");

    expect(manager.getActiveAgentCount()).toBe(1);
    expect(manager.getActiveAgents()).toContain("agent-1");
  });

  it("Throw error when exceeding concurrent limit", async () => {
    await manager.registerAgent("agent-1");
    await manager.registerAgent("agent-2");

    expect(manager.getActiveAgentCount()).toBe(2);

    expect(async () => {
      await manager.registerAgent("agent-3");
    }).toThrow(ResourceManagerException);

    try {
      await manager.registerAgent("agent-3");
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceManagerException);
      if (error instanceof ResourceManagerException) {
        expect(error.code).toBe(ResourceManagerError.AGENT_LIMIT_EXCEEDED);
        expect(error.context).toEqual({
          currentCount: 2,
          maxConcurrent: 2,
        });
      }
    }
  });

  it("Throw error for duplicate agent ID", async () => {
    await manager.registerAgent("agent-1");

    expect(async () => {
      await manager.registerAgent("agent-1");
    }).toThrow(ResourceManagerException);

    try {
      await manager.registerAgent("agent-1");
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceManagerException);
      if (error instanceof ResourceManagerException) {
        expect(error.code).toBe(ResourceManagerError.DUPLICATE_AGENT_ID);
        expect(error.context?.agentId).toBe("agent-1");
      }
    }
  });
});

describe("ResourceManager: unregisterAgent", () => {
  let manager: ResourceManager;

  beforeEach(() => {
    manager = new ResourceManager({ maxConcurrent: 2 });
  });

  it("Successfully unregister existing agent", async () => {
    await manager.registerAgent("agent-1");
    expect(manager.getActiveAgentCount()).toBe(1);

    await manager.unregisterAgent("agent-1");

    expect(manager.getActiveAgentCount()).toBe(0);
    expect(manager.getActiveAgents()).not.toContain("agent-1");
  });

  it("Log warning for non-existent agent (idempotent)", async () => {
    // Should not throw
    await manager.unregisterAgent("agent-999");

    expect(manager.getActiveAgentCount()).toBe(0);
  });
});

describe("ResourceManager: checkResources", () => {
  it("Return all metrics within thresholds", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const result = await manager.checkResources();

    expect(result.canSpawnAgent).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.metrics.kernel_task_cpu).toBe(30);
  });

  it("Return violations when CPU exceeds threshold", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 65, // Exceeds 50%
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const result = await manager.checkResources();

    expect(result.canSpawnAgent).toBe(false);
    expect(result.violations).toContain("kernel_task CPU (65% ≥ 50%)");
  });

  it("Return violations when memory low", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 85, // Only 15% free
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const result = await manager.checkResources();

    expect(result.canSpawnAgent).toBe(false);
    expect(result.violations).toContain("Memory free (15% < 20%)");
  });

  it("Return violations when threads high", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        thread_count: 350, // Exceeds 300
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }) as ResourceMetrics,
      setBaseline: async () => {},
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const result = await manager.checkResources();

    expect(result.canSpawnAgent).toBe(false);
    expect(result.violations).toContain("Thread count (350 ≥ 350)");
  });
});

describe("ResourceManager: getActiveAgentCount", () => {
  it("Return 0 when no agents active", () => {
    const manager = new ResourceManager({ maxConcurrent: 2 });

    expect(manager.getActiveAgentCount()).toBe(0);
  });

  it("Return correct count with active agents", async () => {
    const manager = new ResourceManager({ maxConcurrent: 3 });

    await manager.registerAgent("agent-1");
    await manager.registerAgent("agent-2");

    expect(manager.getActiveAgentCount()).toBe(2);

    await manager.unregisterAgent("agent-1");

    expect(manager.getActiveAgentCount()).toBe(1);
  });
});

describe("ResourceManager: setBaseline", () => {
  it("Successfully set baseline via ResourceMonitor", async () => {
    let setBaselineCalled = false;

    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {
        setBaselineCalled = true;
      },
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    await manager.setBaseline();

    expect(setBaselineCalled).toBe(true);
  });

  it("Handle ResourceMonitor.setBaseline() failure", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {
        throw new Error("Baseline set failed");
      },
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    // Should not throw - logs error and continues
    await manager.setBaseline();

    // Manager should still function
    expect(manager.getActiveAgentCount()).toBe(0);
  });

  it("Handle missing ResourceMonitor gracefully", async () => {
    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: null,
    });

    // Should not throw
    await manager.setBaseline();

    expect(manager.getActiveAgentCount()).toBe(0);
  });
});

describe("ResourceManager: configuration", () => {
  it("Throw error for invalid maxConcurrent", () => {
    expect(() => new ResourceManager({ maxConcurrent: 0 })).toThrow();
    expect(() => new ResourceManager({ maxConcurrent: 5 })).toThrow();
  });

  it("Accept valid maxConcurrent values", () => {
    expect(() => new ResourceManager({ maxConcurrent: 1 })).not.toThrow();
    expect(() => new ResourceManager({ maxConcurrent: 2 })).not.toThrow();
    expect(() => new ResourceManager({ maxConcurrent: 3 })).not.toThrow();
  });

  it("Use default maxConcurrent of 3", () => {
    const manager = new ResourceManager();

    expect(manager.getMaxConcurrent()).toBe(3);
  });

  it("Expose threshold values", () => {
    const manager = new ResourceManager();

    const thresholds = manager.getThresholds();

    expect(thresholds.kernel_task_cpu).toBe(50);
    expect(thresholds.memory_free_percent).toBe(20);
    expect(thresholds.process_count).toBe(400);
    expect(thresholds.thread_count_warning).toBe(300);
    expect(thresholds.thread_count_critical).toBe(350);
  });
});

describe("ResourceManager: agent lifecycle", () => {
  it("Allow register -> unregister -> register cycle", async () => {
    const manager = new ResourceManager({ maxConcurrent: 2 });

    await manager.registerAgent("agent-1");
    expect(manager.getActiveAgentCount()).toBe(1);

    await manager.unregisterAgent("agent-1");
    expect(manager.getActiveAgentCount()).toBe(0);

    // Should be able to register again
    await manager.registerAgent("agent-1");
    expect(manager.getActiveAgentCount()).toBe(1);
  });

  it("Track multiple agents independently", async () => {
    const manager = new ResourceManager({ maxConcurrent: 3 });

    await manager.registerAgent("agent-1");
    await manager.registerAgent("agent-2");
    await manager.registerAgent("agent-3");

    expect(manager.getActiveAgentCount()).toBe(3);
    expect(manager.getActiveAgents()).toEqual(
      expect.arrayContaining(["agent-1", "agent-2", "agent-3"])
    );

    await manager.unregisterAgent("agent-2");

    expect(manager.getActiveAgentCount()).toBe(2);
    expect(manager.getActiveAgents()).not.toContain("agent-2");
  });
});

describe("ResourceManager: resource check failures", () => {
  it("Handle ResourceMonitor getCurrentMetrics failure", async () => {
    const mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => {
        throw new Error("Metrics collection failed");
      },
      setBaseline: async () => {},
    };

    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const result = await manager.checkResources();

    // Conservative fallback: canSpawnAgent = false
    expect(result.canSpawnAgent).toBe(false);
    expect(result.violations).toContain("Resource check failed - using conservative fallback");
  });

  it("Use direct collection when ResourceMonitor not available", async () => {
    const manager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: null,
    });

    const result = await manager.checkResources();

    // Should return some metrics (even if defaults)
    expect(result.metrics).toBeDefined();
    expect(result.metrics.timestamp).toBeDefined();
  });
});
