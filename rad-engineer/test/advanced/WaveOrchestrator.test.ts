/**
 * Unit tests for WaveOrchestrator
 * Tests: wave size calculation, wave splitting, wave execution
 *
 * Coverage requirements:
 * - Unit tests: 10 tests
 * - Branches: 80%
 * - Functions: 85%
 * - Lines: 85%
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { WaveOrchestrator } from "@/advanced/WaveOrchestrator.js";
import { ResourceManager } from "@/core/index.js";
import { PromptValidator } from "@/core/index.js";
import { ResponseParser } from "@/core/index.js";
import type { ResourceMetrics } from "@/sdk/types.js";
import type { Task } from "@/advanced/index.js";

describe("WaveOrchestrator: calculateWaveSize", () => {
  it("Returns maxConcurrent from ResourceManager", async () => {
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

    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();

    const orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
    });

    const waveSize = await orchestrator.calculateWaveSize();

    expect(waveSize).toBe(3);
  });

  it("Respects custom waveSize option", async () => {
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

    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();

    const orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
    });

    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-2", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
    ];

    const result = await orchestrator.executeWave(tasks, { waveSize: 5 });

    expect(result.waves.length).toBe(1);
    expect(result.waves[0].taskCount).toBe(2);
  });
});

describe("WaveOrchestrator: splitIntoWaves", () => {
  let orchestrator: WaveOrchestrator;

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

    const resourceManager = new ResourceManager({
      maxConcurrent: 3,
      resourceMonitor: mockMonitor,
    });

    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();

    orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
    });
  });

  it("Splits 10 tasks into 5 waves of 2", () => {
    const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      prompt: `Task: Test ${i}\nFiles: test.ts\nOutput: JSON\nRules: test`,
    }));

    const waves = orchestrator.splitIntoWaves(tasks, 2);

    expect(waves).toHaveLength(5);
    expect(waves[0]).toHaveLength(2);
    expect(waves[4]).toHaveLength(2);
  });

  it("Handles remainder in last wave", () => {
    const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
      id: `task-${i}`,
      prompt: `Task: Test ${i}\nFiles: test.ts\nOutput: JSON\nRules: test`,
    }));

    const waves = orchestrator.splitIntoWaves(tasks, 2);

    expect(waves).toHaveLength(3);
    expect(waves[0]).toHaveLength(2);
    expect(waves[1]).toHaveLength(2);
    expect(waves[2]).toHaveLength(1);
  });

  it("Throws error for waveSize < 1", () => {
    const tasks: Task[] = [{ id: "task-1", prompt: "test" }];

    expect(() => orchestrator.splitIntoWaves(tasks, 0)).toThrow("waveSize must be at least 1");
  });
});

describe("WaveOrchestrator: executeWave", () => {
  let orchestrator: WaveOrchestrator;

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

    const resourceManager = new ResourceManager({
      maxConcurrent: 3,
      resourceMonitor: mockMonitor,
    });

    const promptValidator = new PromptValidator();
    const responseParser = new ResponseParser();

    orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
    });
  });

  it("Executes 10 tasks in waves of 2", async () => {
    const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      prompt: `Task: Test ${i}\nFiles: test.ts\nOutput: JSON\nRules: test`,
    }));

    const result = await orchestrator.executeWave(tasks, { waveSize: 2 });

    expect(result.waves).toHaveLength(5);
    expect(result.tasks).toHaveLength(10);
    expect(result.totalSuccess).toBe(10);
    expect(result.totalFailure).toBe(0);

    // Verify each wave has correct task count
    expect(result.waves[0].taskCount).toBe(2);
    expect(result.waves[0].successCount).toBe(2);

    expect(result.waves[4].taskCount).toBe(2);
    expect(result.waves[4].successCount).toBe(2);
  });

  it("Stops on first error when continueOnError=false", async () => {
    // Create a task with invalid prompt (exceeds 500 chars)
    const longPrompt = "Task: " + "x".repeat(600) + "\nFiles: test.ts\nOutput: JSON\nRules: test";

    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-2", prompt: longPrompt }, // This will fail validation
      { id: "task-3", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
    ];

    const result = await orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: false,
    });

    // First task should succeed, second should fail, third should not execute
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].success).toBe(true);
    expect(result.tasks[1].success).toBe(false);
    expect(result.tasks[1].error).toContain("PROMPT_TOO_LARGE");
  });

  it("Continues on error when continueOnError=true", async () => {
    // Create tasks with mixed valid/invalid prompts
    const longPrompt = "Task: " + "x".repeat(600) + "\nFiles: test.ts\nOutput: JSON\nRules: test";

    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      { id: "task-2", prompt: longPrompt }, // This will fail validation
      { id: "task-3", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
    ];

    const result = await orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: true,
    });

    // All tasks should be attempted
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].success).toBe(true);
    expect(result.tasks[1].success).toBe(false);
    expect(result.tasks[2].success).toBe(true);

    expect(result.totalSuccess).toBe(2);
    expect(result.totalFailure).toBe(1);
  });

  it("Respects task dependencies", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" },
      {
        id: "task-2",
        prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test",
        dependencies: ["task-1"],
      },
      {
        id: "task-3",
        prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test",
        dependencies: ["task-1", "task-2"],
      },
    ];

    const result = await orchestrator.executeWave(tasks, { waveSize: 2 });

    // All tasks should succeed (dependencies met)
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks.every((t) => t.success)).toBe(true);

    // Tasks should execute in order respecting dependencies
    expect(result.tasks[0].id).toBe("task-1");
    expect(result.tasks[1].id).toBe("task-2");
    expect(result.tasks[2].id).toBe("task-3");
  });

  it("Handles failed dependencies", async () => {
    const tasks: Task[] = [
      { id: "task-1", prompt: "Task: " + "x".repeat(600) + "\nFiles: test.ts\nOutput: JSON\nRules: test" }, // Invalid
      {
        id: "task-2",
        prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test",
        dependencies: ["task-1"],
      },
      { id: "task-3", prompt: "Task: Test\nFiles: test.ts\nOutput: JSON\nRules: test" }, // No dependencies
    ];

    const result = await orchestrator.executeWave(tasks, {
      waveSize: 2,
      continueOnError: true,
    });

    // task-1 fails, task-2 fails due to dependency, task-3 succeeds
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].success).toBe(false);
    expect(result.tasks[1].success).toBe(false);
    expect(result.tasks[1].error).toContain("Dependencies not satisfied");
    expect(result.tasks[2].success).toBe(true);
  });
});
