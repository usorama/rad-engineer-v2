/**
 * Integration tests: SDK + ResourceManager
 * Tests: SDK createAgent() wrapped with resource checks
 */

import { describe, it, expect } from "bun:test";
import { ResourceManager, ResourceManagerException, ResourceManagerError } from "@/core/index.js";
import type { ResourceMetrics } from "@/sdk/types.js";

// Mock SDK Integration
class MockSDKIntegration {
  constructor(private resourceManager: ResourceManager) {}

  async createAgent(config: { agentId: string }): Promise<{ success: boolean; agentId?: string; error?: string }> {
    // Check concurrent limit first
    const currentCount = this.resourceManager.getActiveAgentCount();
    const maxConcurrent = this.resourceManager.getMaxConcurrent();

    if (currentCount >= maxConcurrent) {
      return {
        success: false,
        error: `${ResourceManagerError.AGENT_LIMIT_EXCEEDED}: Cannot register agent: at concurrent limit (${currentCount}/${maxConcurrent})`,
      };
    }

    // Check resources
    const canSpawn = await this.resourceManager.canSpawnAgent();

    if (!canSpawn) {
      const checkResult = await this.resourceManager.checkResources();
      return {
        success: false,
        error: `Cannot spawn agent: ${checkResult.violations.join(", ")}`,
      };
    }

    // Register agent
    try {
      await this.resourceManager.registerAgent(config.agentId);

      // Simulate agent creation
      return {
        success: true,
        agentId: config.agentId,
      };
    } catch (error) {
      if (error instanceof ResourceManagerException) {
        return {
          success: false,
          error: `${error.code}: ${error.message}`,
        };
      }
      throw error;
    }
  }

  async destroyAgent(agentId: string): Promise<void> {
    await this.resourceManager.unregisterAgent(agentId);
  }
}

describe("Integration: SDK + ResourceManager", () => {
  describe("Wrap SDK createAgent() with resource check", () => {
    it("Call canSpawnAgent() before createAgent()", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      const result = await sdk.createAgent({ agentId: "agent-1" });

      expect(result.success).toBe(true);
      expect(result.agentId).toBe("agent-1");
      expect(resourceManager.getActiveAgentCount()).toBe(1);
    });

    it("Register agent after successful spawn", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      await sdk.createAgent({ agentId: "agent-1" });
      await sdk.createAgent({ agentId: "agent-2" });

      expect(resourceManager.getActiveAgentCount()).toBe(2);
      expect(resourceManager.getActiveAgents()).toEqual(expect.arrayContaining(["agent-1", "agent-2"]));
    });
  });

  describe("Block agent spawn when limit reached", () => {
    it("Block 4th agent when maxConcurrent=3", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 3,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      // Create 3 agents
      expect(await sdk.createAgent({ agentId: "agent-1" })).toMatchObject({ success: true });
      expect(await sdk.createAgent({ agentId: "agent-2" })).toMatchObject({ success: true });
      expect(await sdk.createAgent({ agentId: "agent-3" })).toMatchObject({ success: true });

      // 4th should fail
      const result4 = await sdk.createAgent({ agentId: "agent-4" });

      expect(result4.success).toBe(false);
      expect(result4.error).toContain(ResourceManagerError.AGENT_LIMIT_EXCEEDED);
      expect(resourceManager.getActiveAgentCount()).toBe(3);
    });

    it("Error includes current count", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      // Create 2 agents
      await sdk.createAgent({ agentId: "agent-1" });
      await sdk.createAgent({ agentId: "agent-2" });

      // 3rd should fail
      const result3 = await sdk.createAgent({ agentId: "agent-3" });

      expect(result3.success).toBe(false);
      expect(result3.error).toContain("2/2");
    });

    it("Allow new agents after unregistering", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      // Create 2 agents
      await sdk.createAgent({ agentId: "agent-1" });
      await sdk.createAgent({ agentId: "agent-2" });

      expect(resourceManager.getActiveAgentCount()).toBe(2);

      // Destroy one
      await sdk.destroyAgent("agent-1");

      expect(resourceManager.getActiveAgentCount()).toBe(1);

      // Should be able to create new one
      const result3 = await sdk.createAgent({ agentId: "agent-3" });

      expect(result3.success).toBe(true);
      expect(resourceManager.getActiveAgentCount()).toBe(2);
    });
  });

  describe("Block agent spawn when resources constrained", () => {
    it("Block when kernel_task CPU > 50%", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 3,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      const result = await sdk.createAgent({ agentId: "agent-1" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("kernel_task CPU");
    });

    it("Block when memory < 20% free", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 3,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      const result = await sdk.createAgent({ agentId: "agent-1" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Memory");
    });

    it("Block when thread count > 300", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 3,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      const result = await sdk.createAgent({ agentId: "agent-1" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Thread count");
    });
  });

  describe("SDK integration lifecycle", () => {
    it("Complete lifecycle: create -> execute -> destroy", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      // Create
      const createResult = await sdk.createAgent({ agentId: "agent-1" });
      expect(createResult.success).toBe(true);

      // Execute (simulated)
      expect(resourceManager.getActiveAgents()).toContain("agent-1");

      // Destroy
      await sdk.destroyAgent("agent-1");
      expect(resourceManager.getActiveAgents()).not.toContain("agent-1");
    });

    it("Handle multiple agent lifecycles", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      // First wave
      await sdk.createAgent({ agentId: "agent-1" });
      await sdk.createAgent({ agentId: "agent-2" });

      expect(resourceManager.getActiveAgentCount()).toBe(2);

      // Complete first wave
      await sdk.destroyAgent("agent-1");
      await sdk.destroyAgent("agent-2");

      expect(resourceManager.getActiveAgentCount()).toBe(0);

      // Second wave
      await sdk.createAgent({ agentId: "agent-3" });
      await sdk.createAgent({ agentId: "agent-4" });

      expect(resourceManager.getActiveAgentCount()).toBe(2);
    });
  });

  describe("Error handling", () => {
    it("Return proper error for duplicate agent ID", async () => {
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

      const resourceManager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const sdk = new MockSDKIntegration(resourceManager);

      // Create agent
      expect(await sdk.createAgent({ agentId: "agent-1" })).toMatchObject({ success: true });

      // Try to create duplicate
      const duplicateResult = await sdk.createAgent({ agentId: "agent-1" });

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain(ResourceManagerError.DUPLICATE_AGENT_ID);
    });
  });
});
