/**
 * Integration tests for WaveOrchestrator with ResourceManager
 * Tests: resource checking during wave execution, wave waiting behavior
 *
 * Coverage requirements:
 * - Integration tests: 2 tests
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

describe("WaveOrchestrator: ResourceManager Integration", () => {
  let orchestrator: WaveOrchestrator;
  let resourceManager: ResourceManager;
  let mockMonitor: {
    getCurrentMetrics: () => Promise<ResourceMetrics>;
    setBaseline: () => Promise<void>;
  };

  beforeEach(() => {
    mockMonitor = {
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
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });

    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();
    const sdk = createMockSDK();

    orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
      sdk,
    });
  });

  it("Checks canSpawnAgent before each task", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-2", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-3", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
    ];

    // Register agents to test resource checking
    await resourceManager.registerAgent("task-1");
    await resourceManager.registerAgent("task-2");

    // At this point, we're at the limit (2/2)
    expect(await resourceManager.canSpawnAgent()).toBe(false);

    // Unregister one to make room
    await resourceManager.unregisterAgent("task-1");
    expect(await resourceManager.canSpawnAgent()).toBe(true);

    // Now execute wave - it should check resources before each task
    const result = await orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: true,
    });

    // All tasks should execute successfully
    expect(result.tasks).toHaveLength(3);
    expect(result.totalSuccess).toBe(3);
  });

  it("Waits when wave size reached", async () => {
    const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
      id: `task-${i}`,
      prompt: `Task: Test ${i}\nFiles: test.ts\nOutput: JSON\nRules: test`,
    }));

    // Fill resource manager to capacity
    await resourceManager.registerAgent("blocking-agent-1");
    await resourceManager.registerAgent("blocking-agent-2");

    // Start wave execution in background
    const executionPromise = orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: true,
    });

    // After a short delay, free up resources
    setTimeout(async () => {
      await resourceManager.unregisterAgent("blocking-agent-1");
      await resourceManager.unregisterAgent("blocking-agent-2");
    }, 50);

    // Wave execution should complete after resources are freed
    const result = await executionPromise;

    expect(result.tasks).toHaveLength(5);
    expect(result.totalSuccess).toBe(5);
    expect(result.waves).toHaveLength(3); // 5 tasks / 2 per wave = 3 waves
  });
});
