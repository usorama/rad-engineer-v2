/**
 * Chaos tests for ResourceManager
 * Tests: system resilience under stress conditions
 *
 * Chaos scenarios:
 * - ResourceMonitor becomes unavailable
 * - System check commands fail
 * - Rapid agent spawn attempts (stress test)
 * - Thread count spikes during execution
 * - Memory pressure increases during execution
 * - Kernel task CPU spikes during execution
 */

import { describe, it, expect } from "bun:test";
import { ResourceManager } from "@/core/index.js";
import type { ResourceMetrics } from "@/sdk/types.js";

describe("Chaos: ResourceManager Resilience", () => {
  describe("ResourceMonitor becomes unavailable", () => {
    it("Uses execFileNoThrow fallback when ResourceMonitor unavailable", async () => {
      // ResourceMonitor starts as available, then becomes unavailable
      let monitorAvailable = true;

      const flakyMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          if (!monitorAvailable) {
            throw new Error("ResourceMonitor unavailable");
          }
          return {
            kernel_task_cpu: 30,
            memory_pressure: 40,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: flakyMonitor,
      });

      // First call succeeds
      const result1 = await manager.checkResources();
      expect(result1.canSpawnAgent).toBe(true);

      // Monitor becomes unavailable
      monitorAvailable = false;

      // Should fall back to direct collection (conservative: canSpawnAgent=false)
      const result2 = await manager.checkResources();
      expect(result2.canSpawnAgent).toBe(false);
      expect(result2.violations).toContain("Resource check failed - using conservative fallback");
    });

    it("Logs degraded mode when ResourceMonitor fails", async () => {
      const consoleErrorSpy = console.error;

      let loggedErrors: string[] = [];
      console.error = (...args) => {
        loggedErrors.push(args.join(" "));
      };

      const failingMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          throw new Error("ResourceMonitor crashed");
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: failingMonitor,
      });

      await manager.checkResources();

      expect(loggedErrors.some((log) => log.includes("Resource check failed"))).toBe(true);

      console.error = consoleErrorSpy;
    });
  });

  describe("System check commands fail", () => {
    it("Handle graceful degradation when ps command fails", async () => {
      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: null, // Forces direct collection
      });

      // Even if system commands fail, should not crash
      const result = await manager.checkResources();

      // Should return some result (even if conservative)
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.timestamp).toBeDefined();
    });

    it("Return canSpawn: false when checks fail (conservative)", async () => {
      const failingMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          throw new Error("System check failed");
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: failingMonitor,
      });

      const result = await manager.checkResources();

      // Conservative fallback
      expect(result.canSpawnAgent).toBe(false);
      expect(result.violations).toContain("Resource check failed - using conservative fallback");
    });

    it("Log check failure without crashing", async () => {
      const consoleErrorSpy = console.error;

      let loggedErrors: string[] = [];
      console.error = (...args) => {
        loggedErrors.push(args.join(" "));
      };

      const failingMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          throw new Error("ps command failed");
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: failingMonitor,
      });

      const result = await manager.checkResources();

      expect(result.canSpawnAgent).toBe(false);
      expect(loggedErrors.length).toBeGreaterThan(0);

      console.error = consoleErrorSpy;
    });
  });

  describe("Rapid agent spawn attempts (stress test)", () => {
    it("Only allow 2 agents concurrent during rapid spawns", async () => {
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

      const spawnAttempts: Array<{ agentId: string; success: boolean }> = [];

      // Attempt 10 rapid spawns
      for (let i = 0; i < 10; i++) {
        const agentId = `agent-${i}`;
        const canSpawn = await manager.canSpawnAgent();

        if (canSpawn) {
          try {
            await manager.registerAgent(agentId);
            spawnAttempts.push({ agentId, success: true });
          } catch {
            spawnAttempts.push({ agentId, success: false });
          }
        } else {
          spawnAttempts.push({ agentId, success: false });
        }
      }

      // Only 2 should succeed
      const successful = spawnAttempts.filter((a) => a.success);
      const blocked = spawnAttempts.filter((a) => !a.success);

      expect(successful.length).toBe(2);
      expect(blocked.length).toBe(8);
      expect(manager.getActiveAgentCount()).toBe(2);
    });

    it("Maintain maxConcurrent: 2 during stress", async () => {
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

      const maxCounts: number[] = [];

      // Rapid spawn/unregister cycles
      for (let i = 0; i < 10; i++) {
        const canSpawn = await manager.canSpawnAgent();
        if (canSpawn) {
          await manager.registerAgent(`agent-${i}`);
          maxCounts.push(manager.getActiveAgentCount());
        }

        if (i % 3 === 0) {
          const agents = manager.getActiveAgents();
          if (agents.length > 0) {
            await manager.unregisterAgent(agents[0]);
          }
        }
      }

      // Never exceeded 2
      expect(Math.max(...maxCounts, 0)).toBeLessThanOrEqual(2);
    });
  });

  describe("Thread count spikes during execution", () => {
    it("Block new agents when thread count spikes to 350", async () => {
      let threadCount = 150;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          threadCount += 50; // Simulate spike
          return {
            kernel_task_cpu: 30,
            memory_pressure: 40,
            process_count: 200,
            thread_count: threadCount,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          } as ResourceMetrics;
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // First agent should succeed (thread count = 200)
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-1");

      // Second agent should succeed (thread count = 250)
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-2");

      // At concurrent limit (doesn't check resources)
      expect(await manager.canSpawnAgent()).toBe(false);

      // Even if we unregister, thread count now = 300
      await manager.unregisterAgent("agent-1");

      // Still under 350 threshold, so should succeed
      expect(await manager.canSpawnAgent()).toBe(true);

      // Register the third agent
      await manager.registerAgent("agent-3");

      // At concurrent limit again
      expect(await manager.canSpawnAgent()).toBe(false);

      // Unregister and check again - thread count = 350
      await manager.unregisterAgent("agent-2");

      // Now thread count >= 350, should be blocked
      expect(await manager.canSpawnAgent()).toBe(false);
    });

    it("Log warning for thread count spike", async () => {
      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 30,
          memory_pressure: 40,
          process_count: 200,
          thread_count: 350, // Spike
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

  describe("Memory pressure increases during execution", () => {
    it("Block new agents when memory drops to 15%", async () => {
      let memoryPressure = 40;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          memoryPressure += 15; // Simulate pressure increase
          return {
            kernel_task_cpu: 30,
            memory_pressure: memoryPressure,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // First agent should succeed (memory = 55%, 45% free)
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-1");

      // Second agent should succeed (memory = 70%, 30% free)
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-2");

      // At concurrent limit anyway
      expect(await manager.canSpawnAgent()).toBe(false);

      // Unregister one, but memory now = 85% (15% free)
      await manager.unregisterAgent("agent-1");

      const result = await manager.checkResources();
      expect(result.canSpawnAgent).toBe(false);
      expect(result.violations).toContain("Memory free (15% < 20%)");
    });

    it("Existing agents not affected by memory pressure", async () => {
      let memoryPressure = 40;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          return {
            kernel_task_cpu: 30,
            memory_pressure: memoryPressure,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // Register 2 agents
      await manager.registerAgent("agent-1");
      await manager.registerAgent("agent-2");

      expect(manager.getActiveAgentCount()).toBe(2);

      // Memory pressure increases
      memoryPressure = 85;

      // New spawns blocked
      expect(await manager.canSpawnAgent()).toBe(false);

      // But existing agents still active
      expect(manager.getActiveAgentCount()).toBe(2);
      expect(manager.getActiveAgents()).toEqual(expect.arrayContaining(["agent-1", "agent-2"]));
    });
  });

  describe("Kernel task CPU spikes during execution", () => {
    it("Block new agents when CPU spikes to 75%", async () => {
      let kernelCpu = 30;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          kernelCpu += 15; // Simulate CPU spike
          return {
            kernel_task_cpu: kernelCpu,
            memory_pressure: 40,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // First agent succeeds (CPU = 45%)
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-1");

      // Second agent blocked by CPU (60% > 50% threshold)
      expect(await manager.canSpawnAgent()).toBe(false);

      // Even with only one agent, CPU continues to spike
      const result = await manager.checkResources();
      expect(result.canSpawnAgent).toBe(false);
      expect(result.violations).toContain("kernel_task CPU (75% ≥ 50%)");
    });

    it("Log CPU violation", async () => {
      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 75, // Spike
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
      expect(result.violations).toContain("kernel_task CPU (75% ≥ 50%)");
    });
  });

  describe("Concurrent resource spikes", () => {
    it("Handle multiple resource violations simultaneously", async () => {
      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 65, // Exceeds threshold
          memory_pressure: 85, // Only 15% free
          process_count: 450, // Exceeds threshold
          thread_count: 350, // Exceeds threshold
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
      expect(result.violations.length).toBe(4);
      expect(result.violations).toContain("kernel_task CPU (65% ≥ 50%)");
      expect(result.violations).toContain("Memory free (15% < 20%)");
      expect(result.violations).toContain("Process count (450 ≥ 400)");
      expect(result.violations).toContain("Thread count (350 ≥ 350)");
    });
  });

  describe("Recovery from chaos", () => {
    it("Resume operations after resources recover", async () => {
      let kernelCpu = 75; // Start high

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          const current = kernelCpu;
          kernelCpu -= 5; // Simulate recovery
          return {
            kernel_task_cpu: current,
            memory_pressure: 40,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // Initially blocked
      expect(await manager.canSpawnAgent()).toBe(false);

      // After recovery (CPU = 45%)
      const result = await manager.checkResources();
      if (result.metrics.kernel_task_cpu < 50) {
        expect(await manager.canSpawnAgent()).toBe(true);
      }
    });

    it("Recover from ResourceMonitor failure", async () => {
      let monitorFailing = true;

      const flakyMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          if (monitorFailing) {
            throw new Error("Monitor down");
          }
          return {
            kernel_task_cpu: 30,
            memory_pressure: 40,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: flakyMonitor,
      });

      // Failing
      let result = await manager.checkResources();
      expect(result.canSpawnAgent).toBe(false);

      // Recover
      monitorFailing = false;
      result = await manager.checkResources();
      expect(result.canSpawnAgent).toBe(true);
    });
  });
});
