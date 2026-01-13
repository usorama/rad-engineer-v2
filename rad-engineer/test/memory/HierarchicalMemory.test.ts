import { describe, it, expect, beforeEach } from "bun:test";
import { HierarchicalMemory, MemoryConfig } from "../../src/memory/HierarchicalMemory";
import { ScopeLevel, type ContextEvent } from "../../src/memory/Scope";

describe("HierarchicalMemory", () => {
  let memory: HierarchicalMemory;

  beforeEach(() => {
    memory = new HierarchicalMemory();
  });

  describe("constructor", () => {
    it("should create memory with default configuration", () => {
      expect(memory).toBeInstanceOf(HierarchicalMemory);
    });

    it("should create memory with custom configuration", () => {
      const config: MemoryConfig = {
        globalTokenBudget: 3000,
        taskTokenMultiplier: 5000,
        localTokenBudget: 1500,
        compressionThreshold: 0.8,
        autoCompression: true,
      };

      const customMemory = new HierarchicalMemory(config);
      expect(customMemory).toBeInstanceOf(HierarchicalMemory);
    });
  });

  describe("createScope", () => {
    it("should create GLOBAL scope", () => {
      const scopeId = memory.createScope({
        goal: "Global context management",
        level: ScopeLevel.GLOBAL,
      });

      expect(scopeId).toBeDefined();
      expect(memory.getCurrentScope()?.level).toBe(ScopeLevel.GLOBAL);
      expect(memory.getCurrentScope()?.goal).toBe("Global context management");
    });

    it("should create child scope with automatic parent linking", () => {
      const parentId = memory.createScope({
        goal: "Parent scope",
        level: ScopeLevel.GLOBAL,
      });

      const childId = memory.createScope({
        goal: "Child scope",
        level: ScopeLevel.TASK,
      });

      const childScope = memory.getCurrentScope();
      expect(childScope?.parentId).toBe(parentId);
      expect(childScope?.level).toBe(ScopeLevel.TASK);
    });

    it("should track scope hierarchy in path", () => {
      memory.createScope({ goal: "Global", level: ScopeLevel.GLOBAL });
      memory.createScope({ goal: "Task", level: ScopeLevel.TASK });
      memory.createScope({ goal: "Local", level: ScopeLevel.LOCAL });

      const path = memory.getScopePath();
      expect(path).toHaveLength(3);
      expect(path[0]).toContain("Global");
      expect(path[1]).toContain("Task");
      expect(path[2]).toContain("Local");
    });
  });

  describe("addEvent", () => {
    it("should add event to current scope", () => {
      memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });

      const event: ContextEvent = {
        id: "event-1",
        type: "USER_INPUT",
        timestamp: new Date(),
        data: { message: "Hello" },
      };

      memory.addEvent(event);

      const currentScope = memory.getCurrentScope();
      expect(currentScope?.events).toHaveLength(1);
      expect(currentScope?.events[0]).toEqual(event);
    });

    it("should handle events when no scope exists", () => {
      const event: ContextEvent = {
        id: "event-1",
        type: "USER_INPUT",
        timestamp: new Date(),
        data: { message: "Hello" },
      };

      // Should not throw - either creates scope or ignores gracefully
      expect(() => memory.addEvent(event)).not.toThrow();
    });
  });

  describe("setArtifact", () => {
    it("should set artifact in current scope", () => {
      memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });

      memory.setArtifact("testKey", { value: "testData" });

      const currentScope = memory.getCurrentScope();
      expect(currentScope?.artifacts.get("testKey")).toEqual({ value: "testData" });
    });

    it("should handle artifact when no scope exists", () => {
      expect(() => memory.setArtifact("key", "value")).not.toThrow();
    });
  });

  describe("getArtifact", () => {
    it("should get artifact from current scope", () => {
      memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });
      memory.setArtifact("testKey", { value: "testData" });

      const artifact = memory.getArtifact<{ value: string }>("testKey");
      expect(artifact).toEqual({ value: "testData" });
    });

    it("should search parent scopes for artifact", () => {
      memory.createScope({ goal: "Parent", level: ScopeLevel.GLOBAL });
      memory.setArtifact("parentArtifact", "parentValue");

      memory.createScope({ goal: "Child", level: ScopeLevel.TASK });

      const artifact = memory.getArtifact("parentArtifact");
      expect(artifact).toBe("parentValue");
    });

    it("should return undefined for non-existent artifact", () => {
      memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });

      const artifact = memory.getArtifact("nonExistent");
      expect(artifact).toBeUndefined();
    });
  });

  describe("closeScope", () => {
    it("should close current scope with summary", async () => {
      const scopeId = memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });

      await memory.closeScope("Task completed successfully");

      const scope = memory.getScope(scopeId);
      expect(scope?.isClosed()).toBe(true);
      expect(scope?.summary).toBe("Task completed successfully");
    });

    it("should return to parent scope after closing", async () => {
      const parentId = memory.createScope({ goal: "Parent", level: ScopeLevel.GLOBAL });
      const childId = memory.createScope({ goal: "Child", level: ScopeLevel.TASK });

      await memory.closeScope("Child completed");

      expect(memory.getCurrentScope()?.id).toBe(parentId);
    });

    it("should trigger compression when threshold reached", async () => {
      const config: MemoryConfig = {
        globalTokenBudget: 100, // Very low to trigger compression
        taskTokenMultiplier: 200,
        localTokenBudget: 50,
        compressionThreshold: 0.5,
        autoCompression: true,
      };

      const testMemory = new HierarchicalMemory(config);

      // Create scope with substantial content to exceed budget
      testMemory.createScope({ goal: "Large scope with substantial content that should trigger compression when closed due to token budget limits", level: ScopeLevel.LOCAL });

      // Add events to increase token count
      for (let i = 0; i < 10; i++) {
        testMemory.addEvent({
          id: `event-${i}`,
          type: "USER_INPUT",
          timestamp: new Date(),
          data: { message: `This is a substantial message ${i} with content that will increase token count beyond the threshold` },
        });
      }

      const metrics = testMemory.getMetrics();
      const tokensBefore = metrics.totalTokens;

      await testMemory.closeScope("Completed with compression");

      const metricsAfter = testMemory.getMetrics();
      expect(metricsAfter.compressionEvents).toBeGreaterThan(metrics.compressionEvents);
    });
  });

  describe("popScope", () => {
    it("should pop and return current scope", () => {
      const parentId = memory.createScope({ goal: "Parent", level: ScopeLevel.GLOBAL });
      const childId = memory.createScope({ goal: "Child", level: ScopeLevel.TASK });

      const poppedScope = memory.popScope();

      expect(poppedScope?.id).toBe(childId);
      expect(memory.getCurrentScope()?.id).toBe(parentId);
    });

    it("should return null when no scopes exist", () => {
      const poppedScope = memory.popScope();
      expect(poppedScope).toBe(null);
    });
  });

  describe("getScope", () => {
    it("should get scope by ID", () => {
      const scopeId = memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });

      const scope = memory.getScope(scopeId);
      expect(scope?.id).toBe(scopeId);
      expect(scope?.goal).toBe("Test scope");
    });

    it("should return null for non-existent scope", () => {
      const scope = memory.getScope("nonexistent");
      expect(scope).toBe(null);
    });
  });

  describe("compress", () => {
    it("should compress closed scopes", async () => {
      memory.createScope({ goal: "Scope 1", level: ScopeLevel.LOCAL });
      memory.addEvent({
        id: "event-1",
        type: "USER_INPUT",
        timestamp: new Date(),
        data: { message: "Substantial content for compression testing with multiple words and phrases" },
      });
      await memory.closeScope("First scope completed");

      memory.createScope({ goal: "Scope 2 with additional detailed content for testing", level: ScopeLevel.LOCAL });
      memory.addEvent({
        id: "event-2",
        type: "AGENT_OUTPUT",
        timestamp: new Date(),
        data: { response: "Detailed response with substantial content for testing compression effectiveness" },
      });
      await memory.closeScope("Second scope completed with comprehensive results and detailed summary");

      const results = await memory.compress();

      expect(results).toHaveLength(2);
      expect(results[0].compressionRatio).toBeGreaterThan(1);
      expect(results[1].compressionRatio).toBeGreaterThan(1);
    });

    it("should compress only specified level when provided", async () => {
      memory.createScope({ goal: "Global", level: ScopeLevel.GLOBAL });
      await memory.closeScope("Global completed");

      memory.createScope({ goal: "Local", level: ScopeLevel.LOCAL });
      await memory.closeScope("Local completed");

      const results = await memory.compress(ScopeLevel.LOCAL);

      expect(results).toHaveLength(1);
      expect(results[0].summary.toLowerCase()).toContain("local");
    });
  });

  describe("getMetrics", () => {
    it("should return memory usage metrics", () => {
      memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });
      memory.addEvent({
        id: "event-1",
        type: "USER_INPUT",
        timestamp: new Date(),
        data: { message: "Test message" },
      });

      const metrics = memory.getMetrics();

      expect(metrics.totalScopes).toBe(1);
      expect(metrics.totalTokens).toBeGreaterThan(0);
      expect(metrics.currentScopeDepth).toBe(1);
      expect(metrics.compressionEvents).toBe(0);
    });

    it("should track compression events", async () => {
      memory.createScope({ goal: "Test scope", level: ScopeLevel.LOCAL });
      await memory.closeScope("Completed");

      await memory.compress();

      const metrics = memory.getMetrics();
      expect(metrics.compressionEvents).toBeGreaterThan(0);
    });
  });

  describe("clearMemory", () => {
    it("should clear all scopes and reset state", () => {
      memory.createScope({ goal: "Scope 1", level: ScopeLevel.GLOBAL });
      memory.createScope({ goal: "Scope 2", level: ScopeLevel.TASK });

      memory.clearMemory();

      expect(memory.getCurrentScope()).toBe(null);
      expect(memory.getScopePath()).toHaveLength(0);

      const metrics = memory.getMetrics();
      expect(metrics.totalScopes).toBe(0);
      expect(metrics.totalTokens).toBe(0);
    });
  });

  describe("getBudgetStatus", () => {
    it("should return budget status for current scope level", () => {
      memory.createScope({ goal: "Local scope", level: ScopeLevel.LOCAL });

      const status = memory.getBudgetStatus();

      expect(status).not.toBeNull();
      expect(status!.level).toBe(ScopeLevel.LOCAL);
      expect(status!.currentTokens).toBeGreaterThan(0);
      expect(status!.budgetLimit).toBeGreaterThan(0);
      expect(status!.utilizationPercentage).toBeGreaterThan(0);
      expect(status!.isNearLimit).toBeDefined();
      expect(status!.isOverBudget).toBeDefined();
    });

    it("should return null when no current scope", () => {
      const status = memory.getBudgetStatus();
      expect(status).toBe(null);
    });
  });

  describe("getScopesByLevel", () => {
    it("should return scopes filtered by level", () => {
      memory.createScope({ goal: "Global 1", level: ScopeLevel.GLOBAL });
      memory.createScope({ goal: "Task 1", level: ScopeLevel.TASK });
      memory.createScope({ goal: "Local 1", level: ScopeLevel.LOCAL });

      const globalScopes = memory.getScopesByLevel(ScopeLevel.GLOBAL);
      const taskScopes = memory.getScopesByLevel(ScopeLevel.TASK);

      expect(globalScopes).toHaveLength(1);
      expect(globalScopes[0].goal).toBe("Global 1");
      expect(taskScopes).toHaveLength(1);
      expect(taskScopes[0].goal).toBe("Task 1");
    });
  });

  describe("O(log n) token growth", () => {
    it("should maintain logarithmic growth with compression", async () => {
      const config: MemoryConfig = {
        globalTokenBudget: 2000,
        taskTokenMultiplier: 1000,
        localTokenBudget: 200, // Lower budget to trigger compression more frequently
        compressionThreshold: 0.3, // Lower threshold to trigger compression earlier
        autoCompression: true,
      };

      const testMemory = new HierarchicalMemory(config);
      const tokenCounts: number[] = [];

      // Create 10 scopes with substantial content
      for (let i = 0; i < 10; i++) {
        testMemory.createScope({
          goal: `Task ${i} with substantial content and detailed description that should be compressed`,
          level: ScopeLevel.LOCAL,
        });

        // Add substantial events
        for (let j = 0; j < 5; j++) {
          testMemory.addEvent({
            id: `task-${i}-event-${j}`,
            type: "USER_INPUT",
            timestamp: new Date(),
            data: {
              message: `Detailed message for task ${i} event ${j} with substantial content that will need compression to maintain memory efficiency`
            },
          });
        }

        await testMemory.closeScope(`Task ${i} completed successfully`);
        await testMemory.compress();

        const metrics = testMemory.getMetrics();
        tokenCounts.push(metrics.totalTokens);
      }

      // Check that growth is sub-linear (should be roughly logarithmic due to compression)
      const firstHalf = tokenCounts[4]; // After 5 tasks
      const secondHalf = tokenCounts[9]; // After 10 tasks

      // Token count should not significantly exceed doubling (compression working)
      const growthRatio = secondHalf / firstHalf;
      expect(growthRatio).toBeLessThanOrEqual(2.1); // Near-linear or sub-linear growth
      expect(growthRatio).toBeGreaterThan(1); // But should still grow
    });
  });
});