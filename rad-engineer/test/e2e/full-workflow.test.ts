/**
 * E2E Tests: Full Agent Workflow
 *
 * Tests complete agent workflow from task creation to verification
 * Covers: validation -> wave execution -> error recovery -> checkpoint save/restore
 *
 * Uses mock mode (useRealAgents: false) for fast, deterministic tests
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { WaveOrchestrator, type Task } from "@/advanced/WaveOrchestrator";
import { StateManager, type WaveState } from "@/advanced/StateManager";
import { ErrorRecoveryEngine } from "@/advanced/ErrorRecoveryEngine";
import { ResourceManager } from "@/core/ResourceManager";
import { PromptValidator } from "@/core/PromptValidator";
import { ResponseParser } from "@/core/ResponseParser";
import { SDKIntegration } from "@/sdk/SDKIntegration";
import { ProviderFactory } from "@/sdk/providers/ProviderFactory";
import { ProviderType } from "@/sdk/providers/types";
import { HierarchicalMemory } from "@/memory/HierarchicalMemory";
import type { Config } from "@/config/schema";
import type { ResourceMetrics } from "@/sdk/types";
import { rmSync } from "fs";
import { existsSync } from "fs";

/**
 * Helper: Create mock resource monitor
 */
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

/**
 * Helper: Create mock SDK for testing
 */
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

/**
 * Helper: Create valid task prompt
 */
function createValidPrompt(taskDescription: string): string {
  return `Task: ${taskDescription}
Files: src/test.ts
Output: JSON {success, filesModified, summary}
Rules: Return structured output`;
}

/**
 * Helper: Create invalid task prompt (too large)
 */
function createInvalidPrompt(): string {
  return "a".repeat(501); // Exceeds 500 char limit
}

/**
 * Helper: Setup test environment with all components
 */
function setupTestEnvironment(config?: Partial<Config>) {
  const testCheckpointsDir = `.test-checkpoints-${Date.now()}`;

  const mockConfig: Config = {
    useRealAgents: false,
    apiKey: undefined,
    maxAgents: 3,
    timeout: 300000,
    logLevel: "error", // Reduce noise in tests
    ...config,
  };

  const resourceManager = new ResourceManager({
    maxConcurrent: 3,
    resourceMonitor: createMockResourceMonitor(),
  });

  const promptValidator = new PromptValidator();
  const responseParser = new ResponseParser();
  const sdk = createMockSDK();
  const memory = new HierarchicalMemory();
  const stateManager = new StateManager({
    checkpointsDir: testCheckpointsDir,
    checkpointRetentionDays: 7,
  });

  const orchestrator = new WaveOrchestrator({
    resourceManager,
    promptValidator,
    responseParser,
    sdk,
    memory,
    config: mockConfig,
  });

  const errorRecovery = new ErrorRecoveryEngine({
    stateManager,
  });

  return {
    orchestrator,
    stateManager,
    errorRecovery,
    resourceManager,
    promptValidator,
    responseParser,
    memory,
    testCheckpointsDir,
    config: mockConfig,
  };
}

/**
 * Helper: Cleanup test checkpoints directory
 */
function cleanupTestCheckpoints(dir: string) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("E2E: Full Agent Workflow - Happy Path", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should complete full workflow: create -> validate -> execute -> verify", async () => {
    // Step 1: Create tasks
    const tasks: Task[] = [
      { id: "task-1", prompt: createValidPrompt("Implement UserService") },
      { id: "task-2", prompt: createValidPrompt("Write UserService tests") },
    ];

    // Step 2: Validate prompts (happens internally in orchestrator)
    for (const task of tasks) {
      const validation = await env.promptValidator.validate(task.prompt);
      expect(validation.valid).toBe(true);
    }

    // Step 3: Execute wave
    const result = await env.orchestrator.executeWave(tasks);

    // Step 4: Verify results
    expect(result.totalSuccess).toBe(2);
    expect(result.totalFailure).toBe(0);
    expect(result.tasks).toHaveLength(2);

    // Verify each task succeeded
    for (const taskResult of result.tasks) {
      expect(taskResult.success).toBe(true);
      expect(taskResult.response).toBeDefined();
      expect(taskResult.response?.summary).toContain("Mock");
      expect(taskResult.providerUsed).toBe("mock");
    }

    // Verify waves summary
    expect(result.waves).toHaveLength(1); // 2 tasks, wave size 3
    expect(result.waves[0].successCount).toBe(2);
    expect(result.waves[0].failureCount).toBe(0);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should execute multiple waves when tasks exceed wave size", async () => {
    // Create 7 tasks with wave size of 3
    const tasks: Task[] = Array.from({ length: 7 }, (_, i) => ({
      id: `task-${i + 1}`,
      prompt: createValidPrompt(`Task ${i + 1}`),
    }));

    const result = await env.orchestrator.executeWave(tasks, {
      waveSize: 3,
    });

    // Verify all tasks succeeded
    expect(result.totalSuccess).toBe(7);
    expect(result.totalFailure).toBe(0);

    // Verify waves: 3 waves (3, 3, 1)
    expect(result.waves).toHaveLength(3);
    expect(result.waves[0].taskCount).toBe(3);
    expect(result.waves[1].taskCount).toBe(3);
    expect(result.waves[2].taskCount).toBe(1);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should track memory usage during execution", async () => {
    const tasks: Task[] = [
      { id: "memory-task", prompt: createValidPrompt("Test memory tracking") },
    ];

    await env.orchestrator.executeWave(tasks);

    const metrics = env.memory.getMetrics();

    // Verify memory tracking
    expect(metrics.totalScopes).toBeGreaterThan(0);
    expect(metrics.totalTokens).toBeGreaterThanOrEqual(0);
    expect(metrics.compressionEvents).toBeGreaterThanOrEqual(0);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Full Agent Workflow - Error Paths", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should fail validation for invalid prompts", async () => {
    const tasks: Task[] = [
      { id: "invalid-task", prompt: createInvalidPrompt() },
    ];

    const result = await env.orchestrator.executeWave(tasks);

    // Verify task failed at validation
    expect(result.totalSuccess).toBe(0);
    expect(result.totalFailure).toBe(1);
    expect(result.tasks[0].success).toBe(false);
    expect(result.tasks[0].error).toContain("validation failed");

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should stop on first error when continueOnError is false", async () => {
    const tasks: Task[] = [
      { id: "valid-task", prompt: createValidPrompt("Valid task") },
      { id: "invalid-task", prompt: createInvalidPrompt() },
      { id: "another-valid-task", prompt: createValidPrompt("Another valid task") },
    ];

    const result = await env.orchestrator.executeWave(tasks, {
      continueOnError: false,
    });

    // Verify execution stopped after first failure
    expect(result.totalSuccess).toBe(1); // First task succeeded
    expect(result.totalFailure).toBe(1); // Second task failed
    expect(result.tasks).toHaveLength(2); // Third task was never executed

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should continue on error when continueOnError is true", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: createValidPrompt("Task 1") },
      { id: "task-2", prompt: createInvalidPrompt() },
      { id: "task-3", prompt: createValidPrompt("Task 3") },
    ];

    const result = await env.orchestrator.executeWave(tasks, {
      continueOnError: true,
    });

    // Verify all tasks were executed
    expect(result.tasks).toHaveLength(3);
    expect(result.totalSuccess).toBe(2);
    expect(result.totalFailure).toBe(1);

    // Verify task 3 succeeded despite task 2 failure
    expect(result.tasks[2].success).toBe(true);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should handle dependency failures", async () => {
    const tasks: Task[] = [
      { id: "parent", prompt: createInvalidPrompt() }, // Parent will fail
      { id: "child", prompt: createValidPrompt("Child task"), dependencies: ["parent"] },
    ];

    const result = await env.orchestrator.executeWave(tasks, {
      continueOnError: true,
    });

    // Verify parent failed
    expect(result.tasks[0].success).toBe(false);

    // Verify child also failed due to unmet dependency
    expect(result.tasks[1].success).toBe(false);
    expect(result.tasks[1].error).toContain("Dependencies not satisfied");

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Wave Execution with Dependencies", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should execute tasks respecting dependencies", async () => {
    const tasks: Task[] = [
      { id: "setup", prompt: createValidPrompt("Setup database") },
      { id: "create-schema", prompt: createValidPrompt("Create schema"), dependencies: ["setup"] },
      { id: "seed-data", prompt: createValidPrompt("Seed data"), dependencies: ["create-schema"] },
    ];

    const result = await env.orchestrator.executeWave(tasks);

    // Verify all tasks succeeded in order
    expect(result.totalSuccess).toBe(3);
    expect(result.totalFailure).toBe(0);

    // Verify execution order (all tasks should have results)
    const setupResult = result.tasks.find(t => t.id === "setup");
    const schemaResult = result.tasks.find(t => t.id === "create-schema");
    const seedResult = result.tasks.find(t => t.id === "seed-data");

    expect(setupResult?.success).toBe(true);
    expect(schemaResult?.success).toBe(true);
    expect(seedResult?.success).toBe(true);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should handle parallel tasks without dependencies", async () => {
    const tasks: Task[] = [
      { id: "task-a", prompt: createValidPrompt("Task A") },
      { id: "task-b", prompt: createValidPrompt("Task B") },
      { id: "task-c", prompt: createValidPrompt("Task C") },
    ];

    const result = await env.orchestrator.executeWave(tasks, {
      waveSize: 3, // All in one wave
    });

    // Verify all tasks succeeded
    expect(result.totalSuccess).toBe(3);
    expect(result.waves).toHaveLength(1);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Checkpoint Save/Restore", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should save checkpoint after wave execution", async () => {
    const checkpointName = "test-checkpoint";

    // Create wave state
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1", "task-2"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    // Save checkpoint
    await env.stateManager.saveCheckpoint(checkpointName, state);

    // Verify checkpoint exists
    const checkpoints = env.stateManager.listCheckpoints();
    expect(checkpoints).toContain(checkpointName);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should restore checkpoint and resume execution", async () => {
    const checkpointName = "resume-test";

    // Save checkpoint with partial completion
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await env.stateManager.saveCheckpoint(checkpointName, state);

    // Load checkpoint
    const loadedState = await env.stateManager.loadCheckpoint(checkpointName);

    // Verify state was restored
    expect(loadedState).not.toBeNull();
    expect(loadedState?.waveNumber).toBe(1);
    expect(loadedState?.completedTasks).toContain("task-1");
    expect(loadedState?.failedTasks).toHaveLength(0);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should return null for non-existent checkpoint", async () => {
    const result = await env.stateManager.loadCheckpoint("non-existent");
    expect(result).toBeNull();

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should list all available checkpoints", async () => {
    // Save multiple checkpoints
    const checkpoints = ["checkpoint-1", "checkpoint-2", "checkpoint-3"];

    for (const name of checkpoints) {
      await env.stateManager.saveCheckpoint(name, {
        waveNumber: 1,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
      });
    }

    // List checkpoints
    const listed = env.stateManager.listCheckpoints();

    // Verify all checkpoints are listed
    expect(listed).toHaveLength(3);
    for (const name of checkpoints) {
      expect(listed).toContain(name);
    }

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should detect and reject corrupted checkpoint", async () => {
    const checkpointName = "corrupt-test";

    // Save valid checkpoint
    await env.stateManager.saveCheckpoint(checkpointName, {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    });

    // Manually corrupt the checkpoint by modifying file
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(env.testCheckpointsDir, `${checkpointName}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const metadata = JSON.parse(content);

    // Corrupt the checksum
    metadata.checksum = "invalid-checksum";
    await fs.writeFile(filePath, JSON.stringify(metadata), "utf-8");

    // Attempt to load corrupted checkpoint
    await expect(env.stateManager.loadCheckpoint(checkpointName)).rejects.toThrow();

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Error Recovery with Retry", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should retry failed operation with exponential backoff", async () => {
    let attempts = 0;
    const maxAttempts = 3;

    // Operation that fails twice then succeeds
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("Temporary failure");
      }
      return "success";
    };

    const result = await env.errorRecovery.retryWithBackoff(operation, {
      maxAttempts,
      baseDelay: 100, // Faster for testing
      maxDelay: 500,
    });

    expect(result).toBe("success");
    expect(attempts).toBe(3);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should throw after exhausting retry attempts", async () => {
    let attempts = 0;

    // Operation that always fails
    const operation = async () => {
      attempts++;
      throw new Error("Permanent failure");
    };

    await expect(
      env.errorRecovery.retryWithBackoff(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 500,
      })
    ).rejects.toThrow(); // Just check that it throws, don't check message

    expect(attempts).toBe(3);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should implement exponential backoff delay", async () => {
    const delays: number[] = [];
    let lastTime = Date.now();

    const operation = async () => {
      const now = Date.now();
      const delay = now - lastTime;
      delays.push(delay);
      lastTime = now;
      throw new Error("Test failure");
    };

    try {
      await env.errorRecovery.retryWithBackoff(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
      });
    } catch {
      // Expected to fail
    }

    // Verify delays are increasing (exponential backoff)
    // First delay is ~0 (initial attempt)
    // Second delay should be close to baseDelay (allow 25% tolerance for timing variance)
    // Third delay should be >= second delay
    expect(delays[1]).toBeGreaterThanOrEqual(75); // 75ms = 100ms - 25% tolerance
    expect(delays[2]).toBeGreaterThanOrEqual(delays[1]);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Resource Management", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should respect maxConcurrent limit during wave execution", async () => {
    // Create more tasks than maxConcurrent (3)
    const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
      id: `task-${i + 1}`,
      prompt: createValidPrompt(`Task ${i + 1}`),
    }));

    const result = await env.orchestrator.executeWave(tasks, {
      waveSize: 2, // Force multiple waves
    });

    // Verify all tasks completed
    expect(result.totalSuccess).toBe(5);

    // Verify waves: 3 waves (2, 2, 1)
    expect(result.waves).toHaveLength(3);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should track active agent count", async () => {
    // Initially no active agents
    expect(env.resourceManager.getActiveAgentCount()).toBe(0);

    // Register agent
    await env.resourceManager.registerAgent("agent-1");
    expect(env.resourceManager.getActiveAgentCount()).toBe(1);
    expect(env.resourceManager.getActiveAgents()).toContain("agent-1");

    // Unregister agent
    await env.resourceManager.unregisterAgent("agent-1");
    expect(env.resourceManager.getActiveAgentCount()).toBe(0);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should calculate wave size based on memory constraints", async () => {
    const waveSize = await env.orchestrator.calculateWaveSize(true);

    // Should return a reasonable wave size (1-3 based on config)
    expect(waveSize).toBeGreaterThan(0);
    expect(waveSize).toBeLessThanOrEqual(3);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Memory State Management", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should track memory allocation and usage", async () => {
    const initialUsage = env.stateManager.getMemoryUsage();

    // Initial state should be empty
    expect(initialUsage.allocatedBytes).toBe(0);
    expect(initialUsage.usedBytes).toBe(0);

    // Grow memory
    env.stateManager.growMemory(1024 * 1024); // 1MB

    const afterGrowth = env.stateManager.getMemoryUsage();
    expect(afterGrowth.allocatedBytes).toBe(1024 * 1024);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should compact memory when fragmented", async () => {
    // Allocate and deallocate memory to create fragmentation
    env.stateManager.growMemory(1024);
    env.stateManager.shrinkMemory(512);
    env.stateManager.growMemory(256);

    const beforeCompact = env.stateManager.getMemoryUsage();
    expect(beforeCompact.fragmentationPercent).toBeGreaterThan(0);

    // Compact memory
    await env.stateManager.compactMemory();

    const afterCompact = env.stateManager.getMemoryUsage();
    expect(afterCompact.fragmentationPercent).toBe(0);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });

  test("should detect memory pressure", async () => {
    const initialUsage = env.stateManager.getMemoryUsage();
    const maxBytes = initialUsage.maxBytes;

    // Allocate > 80% to trigger pressure (StateManager threshold is 80%)
    const targetAllocation = Math.ceil(maxBytes * 0.81);
    env.stateManager.growMemory(targetAllocation);

    const usage = env.stateManager.getMemoryUsage();
    expect(usage.isUnderPressure).toBe(true);
    expect(usage.utilizationPercent).toBeGreaterThan(80);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});

describe("E2E: Integration - Complete Workflow", () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test("should complete complex workflow with checkpointing and recovery", async () => {
    const checkpointName = "complex-workflow";

    // Phase 1: Execute first wave
    const wave1Tasks: Task[] = [
      { id: "setup-db", prompt: createValidPrompt("Setup database") },
      { id: "create-tables", prompt: createValidPrompt("Create tables"), dependencies: ["setup-db"] },
    ];

    const wave1Result = await env.orchestrator.executeWave(wave1Tasks);
    expect(wave1Result.totalSuccess).toBe(2);

    // Save checkpoint after wave 1
    const state1: WaveState = {
      waveNumber: 1,
      completedTasks: wave1Result.tasks.filter(t => t.success).map(t => t.id),
      failedTasks: wave1Result.tasks.filter(t => !t.success).map(t => t.id),
      timestamp: new Date().toISOString(),
    };
    await env.stateManager.saveCheckpoint(checkpointName, state1);

    // Phase 2: Simulate recovery - load checkpoint
    const loadedState = await env.stateManager.loadCheckpoint(checkpointName);
    expect(loadedState).not.toBeNull();
    expect(loadedState?.completedTasks).toHaveLength(2);

    // Phase 3: Execute next wave
    const wave2Tasks: Task[] = [
      { id: "seed-data", prompt: createValidPrompt("Seed data") },
      { id: "run-migrations", prompt: createValidPrompt("Run migrations") },
    ];

    const wave2Result = await env.orchestrator.executeWave(wave2Tasks);
    expect(wave2Result.totalSuccess).toBe(2);

    // Save final checkpoint
    const state2: WaveState = {
      waveNumber: 2,
      completedTasks: [
        ...loadedState!.completedTasks,
        ...wave2Result.tasks.filter(t => t.success).map(t => t.id),
      ],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };
    await env.stateManager.saveCheckpoint(`${checkpointName}-final`, state2);

    // Verify final state
    const finalState = await env.stateManager.loadCheckpoint(`${checkpointName}-final`);
    expect(finalState?.completedTasks).toHaveLength(4);
    expect(finalState?.waveNumber).toBe(2);

    // Cleanup
    cleanupTestCheckpoints(env.testCheckpointsDir);
  });
});
