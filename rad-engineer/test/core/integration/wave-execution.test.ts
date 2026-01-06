/**
 * Integration tests: Wave-based execution pattern
 * Tests: Execute tasks in waves, enforce concurrent limits
 */

import { describe, it, expect } from "bun:test";
import { ResourceManager } from "@/core/index.js";
import type { ResourceMetrics } from "@/sdk/types.js";

describe("Integration: Wave-based execution pattern", () => {
  describe("Execute tasks in waves of 2", () => {
    it("Execute 10 tasks in waves of 2", async () => {
      const taskLog: string[] = [];
      let maxConcurrentObserved = 0;

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

      // Simulate executing 10 tasks in waves
      const tasks = Array.from({ length: 10 }, (_, i) => `task-${i}`);

      for (const task of tasks) {
        // Check if we can spawn
        const canSpawn = await manager.canSpawnAgent();
        expect(canSpawn).toBe(true);

        // Register agent
        await manager.registerAgent(`agent-${task}`);

        // Track max concurrent
        const currentCount = manager.getActiveAgentCount();
        if (currentCount > maxConcurrentObserved) {
          maxConcurrentObserved = currentCount;
        }

        taskLog.push(`${task} started (active: ${currentCount})`);

        // Simulate task completion (every 2 tasks)
        if (currentCount === 2) {
          await manager.unregisterAgent(`agent-${task}`);
          await manager.unregisterAgent(`agent-${tasks[tasks.indexOf(task) - 1]}`);
        }
      }

      // Verify constraints
      expect(maxConcurrentObserved).toBeLessThanOrEqual(2);
      expect(taskLog.length).toBe(10);
    });

    it("Verify no more than 2 agents active at once", async () => {
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

      const activeAgents: string[] = [];

      // Try to register 5 agents
      for (let i = 0; i < 5; i++) {
        const agentId = `agent-${i}`;
        const canSpawn = await manager.canSpawnAgent();

        if (canSpawn) {
          await manager.registerAgent(agentId);
          activeAgents.push(agentId);
        }

        // Verify never exceed limit
        expect(manager.getActiveAgentCount()).toBeLessThanOrEqual(2);
      }

      // Should only have 2 agents
      expect(activeAgents.length).toBe(2);
    });

    it("All tasks complete successfully", async () => {
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

      const completedTasks: string[] = [];
      const tasks = Array.from({ length: 10 }, (_, i) => `task-${i}`);

      // Execute in waves
      for (const task of tasks) {
        // Wait for available slot
        while (manager.getActiveAgentCount() >= 2) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const canSpawn = await manager.canSpawnAgent();
        if (canSpawn) {
          await manager.registerAgent(`agent-${task}`);

          // Simulate task completion
          setTimeout(async () => {
            await manager.unregisterAgent(`agent-${task}`);
            completedTasks.push(task);
          }, 50);
        }
      }

      // Wait for all tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(completedTasks.length).toBe(10);
    });
  });

  describe("Execute tasks in waves of 3", () => {
    it("Execute 6 tasks in waves of 3", async () => {
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
        maxConcurrent: 3,
        resourceMonitor: mockMonitor,
      });

      const tasks = Array.from({ length: 6 }, (_, i) => `task-${i}`);
      const activeCounts: number[] = [];

      for (const task of tasks) {
        const canSpawn = await manager.canSpawnAgent();
        expect(canSpawn).toBe(true);

        await manager.registerAgent(`agent-${task}`);
        activeCounts.push(manager.getActiveAgentCount());

        // Unregister after reaching wave size
        if (manager.getActiveAgentCount() === 3) {
          await manager.unregisterAgent(`agent-${task}`);
          await manager.unregisterAgent(`agent-${tasks[tasks.indexOf(task) - 1]}`);
          await manager.unregisterAgent(`agent-${tasks[tasks.indexOf(task) - 2]}`);
        }
      }

      // Verify never exceeded 3
      expect(Math.max(...activeCounts)).toBeLessThanOrEqual(3);
    });

    it("Verify no more than 3 agents active at once", async () => {
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
        maxConcurrent: 3,
        resourceMonitor: mockMonitor,
      });

      // Try to register 10 agents
      for (let i = 0; i < 10; i++) {
        const agentId = `agent-${i}`;
        const canSpawn = await manager.canSpawnAgent();

        if (canSpawn) {
          await manager.registerAgent(agentId);
        }

        // Verify never exceed limit
        expect(manager.getActiveAgentCount()).toBeLessThanOrEqual(3);
      }

      // Should have exactly 3 agents
      expect(manager.getActiveAgentCount()).toBe(3);
    });
  });

  describe("Wave execution with resource constraints", () => {
    it("Block new wave when resources constrained", async () => {
      let callCount = 0;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          callCount++;
          // Simulate resource constraint after 2 checks
          if (callCount > 2) {
            return {
              kernel_task_cpu: 65, // Exceeds threshold
              memory_pressure: 40,
              process_count: 200,
              can_spawn_agent: true,
              timestamp: new Date().toISOString(),
            };
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
        resourceMonitor: mockMonitor,
      });

      // First 2 agents should succeed
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-1");

      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-2");

      // At concurrent limit (doesn't check resources)
      expect(await manager.canSpawnAgent()).toBe(false);

      // Unregister one
      await manager.unregisterAgent("agent-1");

      // Now callCount=3 when checking resources, should be blocked by CPU
      expect(await manager.canSpawnAgent()).toBe(false);
    });
  });

  describe("Wave execution lifecycle", () => {
    it("Complete wave lifecycle: register -> execute -> unregister", async () => {
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

      // Wave 1: 2 tasks
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-1");
      await manager.registerAgent("agent-2");

      expect(manager.getActiveAgentCount()).toBe(2);

      // Complete wave 1
      await manager.unregisterAgent("agent-1");
      await manager.unregisterAgent("agent-2");

      expect(manager.getActiveAgentCount()).toBe(0);

      // Wave 2: 2 more tasks
      expect(await manager.canSpawnAgent()).toBe(true);
      await manager.registerAgent("agent-3");
      await manager.registerAgent("agent-4");

      expect(manager.getActiveAgentCount()).toBe(2);

      // Complete wave 2
      await manager.unregisterAgent("agent-3");
      await manager.unregisterAgent("agent-4");

      expect(manager.getActiveAgentCount()).toBe(0);
    });
  });
});
