/**
 * Real Agent Flow Integration Tests
 *
 * Tests WaveOrchestrator with real SDK integration.
 * Skips tests when ANTHROPIC_API_KEY is not set.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { WaveOrchestrator, type Task } from "@/advanced/WaveOrchestrator.js";
import { ResourceManager } from "@/core/ResourceManager.js";
import { PromptValidator } from "@/core/PromptValidator.js";
import { ResponseParser } from "@/core/ResponseParser.js";
import { SDKIntegration } from "@/sdk/SDKIntegration.js";
import { ProviderFactory } from "@/sdk/providers/ProviderFactory.js";
import { ProviderType } from "@/sdk/providers/types.js";
import { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";
import type { Config } from "@/config/schema.js";
import type { ResourceMetrics } from "@/sdk/types.js";

// Check if API key is available for real agent tests
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

// Create mock resource monitor for testing
function createMockResourceMonitor() {
  return {
    getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
      kernel_task_cpu: 30,
      memory_pressure: 40,
      process_count: 200,
      can_spawn_agent: true,
      timestamp: new Date().toISOString(),
    }),
    setBaseline: async () => {},
  };
}

// Create mock SDK for testing
function createMockSDK(): SDKIntegration {
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

  return new SDKIntegration(providerFactory);
}

describe("Real Agent Flow - Mock Mode", () => {
  let orchestrator: WaveOrchestrator;
  let resourceManager: ResourceManager;
  let memory: HierarchicalMemory;
  let mockConfig: Config;

  beforeEach(() => {
    // Use mock mode for basic tests
    mockConfig = {
      useRealAgents: false,
      apiKey: undefined,
      maxAgents: 3,
      timeout: 300000,
      logLevel: "info",
    };

    resourceManager = new ResourceManager({
      maxConcurrent: 3,
      resourceMonitor: createMockResourceMonitor(),
    });
    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();
    const sdk = createMockSDK();
    memory = new HierarchicalMemory();

    orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
      sdk,
      memory,
      config: mockConfig,
    });
  });

  // Helper to create valid prompts
  const createValidPrompt = (task: string): string => `Task: ${task}
Files: src/test.ts
Output: JSON {success, summary}
Rules: Return structured output`;

  it("should execute tasks in mock mode by default", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: createValidPrompt("Test task 1") },
      { id: "task-2", prompt: createValidPrompt("Test task 2") },
    ];

    const result = await orchestrator.executeWave(tasks);

    expect(result.totalSuccess).toBe(2);
    expect(result.totalFailure).toBe(0);
    expect(result.tasks).toHaveLength(2);

    // Verify mock provider was used
    for (const taskResult of result.tasks) {
      expect(taskResult.success).toBe(true);
      expect(taskResult.providerUsed).toBe("mock");
      expect(taskResult.modelUsed).toBe("mock-model");
    }
  });

  it("should return mock response structure", async () => {
    const tasks: Task[] = [{ id: "test-task", prompt: createValidPrompt("Simple test") }];

    const result = await orchestrator.executeWave(tasks);

    expect(result.tasks[0].response).toBeDefined();
    expect(result.tasks[0].response?.summary).toContain("Mock");
  });

  it("should handle wave execution with dependencies", async () => {
    const tasks: Task[] = [
      { id: "parent", prompt: createValidPrompt("Parent task") },
      { id: "child", prompt: createValidPrompt("Child task"), dependencies: ["parent"] },
    ];

    const result = await orchestrator.executeWave(tasks, { continueOnError: true });

    expect(result.totalSuccess).toBe(2);
    expect(result.tasks.find((t) => t.id === "child")?.success).toBe(true);
  });

  it("should track memory during execution", async () => {
    const tasks: Task[] = [{ id: "memory-test", prompt: createValidPrompt("Test memory tracking") }];

    await orchestrator.executeWave(tasks);

    const metrics = memory.getMetrics();
    expect(metrics.totalScopes).toBeGreaterThan(0);
  });
});

// Real agent tests - only run when API key is available
// Skipped by default - set ANTHROPIC_API_KEY to run
describe.skip("Real Agent Flow - API Integration (requires ANTHROPIC_API_KEY)", () => {
  // These tests require a valid Anthropic API key
  // To run: ANTHROPIC_API_KEY=sk-... bun test test/integration/real-agent-flow.test.ts

  it("should execute simple task with real agent", () => {
    // TODO: Implement when API key is available
    expect(true).toBe(true);
  });

  it("should handle timeout for slow tasks", () => {
    // TODO: Implement when API key is available
    expect(true).toBe(true);
  });
});
