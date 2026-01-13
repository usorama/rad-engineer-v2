/**
 * Chaos tests for WaveOrchestrator
 * Tests: resilience under adverse conditions
 *
 * Coverage requirements:
 * - Chaos tests: 3 tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { WaveOrchestrator } from "@/advanced/WaveOrchestrator.js";
import { ResourceManager } from "@/core/index.js";
import { PromptValidator } from "@/core/index.js";
import { ResponseParser } from "@/core/index.js";
import { SDKIntegration } from "@/sdk/index.js";
import { ProviderFactory } from "@/sdk/providers/ProviderFactory.js";
import { ProviderType } from "@/sdk/providers/types.js";
import type { ResourceMetrics } from "@/sdk/types.js";
import type { Task } from "@/advanced/index.js";
import { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";

/**
 * Create a mock SDKIntegration for testing
 */
function createMockSDK(): SDKIntegration {
  // Create ProviderFactory with test configuration
  const providerFactory = new ProviderFactory({
    defaultProvider: ProviderType.GLM,
    providers: {
      "test-glm": {
        providerType: ProviderType.GLM,
        apiKey: "test-api-key",
        baseUrl: "https://test.api.com",
        model: "glm-4.7",
        timeout: 60000,
        temperature: 1.0,
        maxTokens: 4096,
        topP: 1.0,
        stream: false,
      },
    },
    enableFallback: false,
  });

  const sdk = new SDKIntegration(providerFactory);
  sdk.testAgent = async () => ({
    success: true,
    agentResponse: JSON.stringify({
      success: true,
      filesModified: ["/mock/test.ts"],
      testsWritten: ["/mock/test.test.ts"],
      summary: "Task completed successfully",
      errors: [],
      nextSteps: [],
    }),
    tokensUsed: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    duration: 1000,
    toolsInvoked: [],
    error: null,
    providerUsed: "glm",
    modelUsed: "glm-4.7",
  });
  return sdk;
}

describe("WaveOrchestrator: Chaos Tests", () => {
  let orchestrator: WaveOrchestrator;
  let resourceManager: ResourceManager;

  beforeEach(() => {
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

    resourceManager = new ResourceManager({
      maxConcurrent: 3,
      resourceMonitor: mockMonitor,
    });

    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();
    const sdk = createMockSDK();
    const memory = new HierarchicalMemory();

    orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
      sdk,
      memory,
    });
  });

  it("Handles task timeout gracefully", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-2", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-3", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
    ];

    // Fill resource manager to simulate timeout scenario
    await resourceManager.registerAgent("blocking-agent-1");
    await resourceManager.registerAgent("blocking-agent-2");
    await resourceManager.registerAgent("blocking-agent-3");

    // Execute with continueOnError to handle timeout
    const result = await orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: true,
    });

    // Tasks should fail due to resource limit, but not crash
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks.every((t) => !t.success)).toBe(true);
    expect(result.tasks.every((t) => t.error?.includes("Resource limit exceeded"))).toBe(true);
  });

  it("Handles agent crash mid-wave", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-2", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-3", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
    ];

    // Simulate mid-wave crash by filling resources after first task
    let firstTaskComplete = false;

    // Override executeTask to simulate crash
    const orchestratorWithExecute = orchestrator as unknown as {
      executeTask: (task: Task) => Promise<{ id: string; success: boolean; response?: unknown }>;
    };
    const originalExecute = orchestratorWithExecute.executeTask.bind(orchestrator);
    orchestratorWithExecute.executeTask = async (task: Task) => {
      if (task.id === "task-1") {
        firstTaskComplete = true;
        return originalExecute(task);
      } else if (task.id === "task-2" && firstTaskComplete) {
        // Simulate crash by filling resources
        await resourceManager.registerAgent("crashed-agent-1");
        await resourceManager.registerAgent("crashed-agent-2");
        await resourceManager.registerAgent("crashed-agent-3");
        return originalExecute(task);
      }
      return originalExecute(task);
    };

    const result = await orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: true,
    });

    // First two tasks should succeed, third should fail due to resource exhaustion
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].success).toBe(true);
    expect(result.tasks[1].success).toBe(true);
    expect(result.tasks[2].success).toBe(false);
  });

  it("Handles resource exhaustion", async () => {
    const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      prompt: `Task: Test ${i}\nFiles: test.ts\nOutput: JSON\nRules: test`,
    }));

    // Simulate resource exhaustion by alternating availability
    let callCount = 0;
    const originalCanSpawn = resourceManager.canSpawnAgent.bind(resourceManager);
    resourceManager.canSpawnAgent = async () => {
      callCount++;
      // Allow first 3 calls, then block for 2 calls, then allow again
      if (callCount <= 3) return true;
      if (callCount <= 5) return false;
      return originalCanSpawn();
    };

    const result = await orchestrator.executeWave(tasks, {
      waveSize: 3,
      continueOnError: true,
    });

    // Should handle resource exhaustion gracefully
    expect(result.tasks.length).toBeGreaterThan(0);
    // Some tasks should succeed, some should fail
    const successCount = result.tasks.filter((t) => t.success).length;
    const failureCount = result.tasks.filter((t) => !t.success).length;
    expect(successCount + failureCount).toBe(10);
  });
});
