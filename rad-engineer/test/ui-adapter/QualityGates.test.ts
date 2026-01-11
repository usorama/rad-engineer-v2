/**
 * Unit tests for Quality Gates in TaskAPIHandler
 *
 * Tests:
 * - Quality gate execution after task completion
 * - TypeCheck gate (required)
 * - Lint gate (warning)
 * - Test gate (required)
 * - Quality gates results storage
 * - Quality:completed event emission
 * - Pass/fail logic (required gates must pass)
 * - Warning gates can fail without blocking completion
 *
 * Coverage requirements:
 * - Branches: 100%
 * - Functions: 100%
 * - Lines: 100%
 */

import { describe, it, expect, beforeEach, afterEach, mock as bunMock } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Mock execFileNoThrow results
 */
let mockExecFileResults: Map<string, { success: boolean; stdout?: string; stderr?: string }> = new Map();

// Mock execFileNoThrow before importing TaskAPIHandler
bunMock.module("@/utils/execFileNoThrow.js", () => ({
  execFileNoThrow: async (file: string, args: string[] = []) => {
    const commandKey = `${file} ${args.join(" ")}`;
    const result = mockExecFileResults.get(commandKey);

    if (result) {
      return result;
    }

    // Default: command succeeds
    return {
      success: true,
      stdout: "Command succeeded",
      stderr: "",
    };
  },
}));

// Now import TaskAPIHandler after mock is set up
import { TaskAPIHandler } from "@/ui-adapter/TaskAPIHandler.js";
import type { TaskAPIHandlerConfig } from "@/ui-adapter/TaskAPIHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import type { WaveOrchestrator, WaveResult } from "@/advanced/WaveOrchestrator.js";
import type { ResourceManager } from "@/core/ResourceManager.js";
import type { QualityGatesResults } from "@/ui-adapter/types.js";

/**
 * Create mock WaveOrchestrator for testing
 */
function createMockWaveOrchestrator(): Partial<WaveOrchestrator> {
  return {
    executeWave: async (): Promise<WaveResult> => ({
      tasks: [
        {
          id: "story-test-1",
          success: true,
          response: {
            success: true,
            filesModified: ["/test/file.ts"],
            testsWritten: ["/test/file.test.ts"],
            summary: "Task completed",
            errors: [],
            nextSteps: [],
          },
        },
      ],
      waves: [
        {
          waveNumber: 1,
          taskCount: 1,
          successCount: 1,
          failureCount: 0,
        },
      ],
      totalSuccess: 1,
      totalFailure: 0,
    }),
  } as unknown as WaveOrchestrator;
}

/**
 * Create mock ResourceManager for testing
 */
function createMockResourceManager(): Partial<ResourceManager> {
  return {
    canSpawnAgent: async () => true,
    registerAgent: async () => {},
    unregisterAgent: async () => {},
    getActiveAgentCount: () => 0,
    getMaxConcurrent: () => 2,
  } as unknown as ResourceManager;
}

describe("Quality Gates: Successful execution", () => {
  let handler: TaskAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-quality-gates-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    // Clear mock results and set up defaults for this test suite
    mockExecFileResults.clear();

    // All gates pass
    mockExecFileResults.set("pnpm typecheck", { success: true, stdout: "✓ No TypeScript errors" });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ All tests passed (85% coverage)" });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
      debug: false,
    };
    handler = new TaskAPIHandler(config);
  });

  afterEach(async () => {
    mockExecFileResults.clear();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Runs quality gates after successful wave execution", async () => {
    const task = await handler.createTask({
      title: "Quality gates test",
      description: "Test quality gates execution",
    });

    await handler.startTask(task.id);

    // Wait for async execution and quality gates
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    expect(updatedTask?.status).toBe("completed");
    expect(updatedTask?.qualityGates).toBeDefined();
    expect(updatedTask?.qualityGates?.passed).toBe(true);
    expect(updatedTask?.qualityGates?.gates).toHaveLength(3);
  });

  it("Runs typecheck gate (required)", async () => {
    const task = await handler.createTask({
      title: "TypeCheck test",
      description: "Test typecheck gate",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);
    const typecheckGate = updatedTask?.qualityGates?.gates.find(g => g.type === "typecheck");

    expect(typecheckGate).toBeDefined();
    expect(typecheckGate?.passed).toBe(true);
    expect(typecheckGate?.severity).toBe("required");
    expect(typecheckGate?.output).toContain("No TypeScript errors");
    expect(typecheckGate?.duration).toBeGreaterThanOrEqual(0);
    expect(typecheckGate?.timestamp).toBeTruthy();
  });

  it("Runs lint gate (warning)", async () => {
    const task = await handler.createTask({
      title: "Lint test",
      description: "Test lint gate",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);
    const lintGate = updatedTask?.qualityGates?.gates.find(g => g.type === "lint");

    expect(lintGate).toBeDefined();
    expect(lintGate?.passed).toBe(true);
    expect(lintGate?.severity).toBe("warning");
    expect(lintGate?.output).toContain("Lint passed");
  });

  it("Runs test gate (required)", async () => {
    const task = await handler.createTask({
      title: "Test gate test",
      description: "Test test gate",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);
    const testGate = updatedTask?.qualityGates?.gates.find(g => g.type === "test");

    expect(testGate).toBeDefined();
    expect(testGate?.passed).toBe(true);
    expect(testGate?.severity).toBe("required");
    expect(testGate?.output).toContain("All tests passed");
  });

  it("Stores quality gates results in task metadata", async () => {
    const task = await handler.createTask({
      title: "Metadata test",
      description: "Test metadata storage",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    expect(updatedTask?.qualityGates).toBeDefined();
    expect(updatedTask?.qualityGates?.passed).toBe(true);
    expect(updatedTask?.qualityGates?.totalDuration).toBeGreaterThanOrEqual(0);
    expect(updatedTask?.qualityGates?.startedAt).toBeTruthy();
    expect(updatedTask?.qualityGates?.completedAt).toBeTruthy();

    // Verify startedAt < completedAt
    const startedAt = new Date(updatedTask!.qualityGates!.startedAt).getTime();
    const completedAt = new Date(updatedTask!.qualityGates!.completedAt).getTime();
    expect(completedAt).toBeGreaterThanOrEqual(startedAt);
  });

  it("Emits quality:completed event with results", async () => {
    const task = await handler.createTask({
      title: "Event test",
      description: "Test event emission",
    });

    let qualityEvent: any = null;
    handler.on("quality:completed", (event) => {
      qualityEvent = event;
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(qualityEvent).not.toBeNull();
    expect(qualityEvent.taskId).toBe(task.id);
    expect(qualityEvent.results).toBeDefined();
    expect(qualityEvent.results.passed).toBe(true);
  });

  it("Persists quality gates results to StateManager", async () => {
    const task = await handler.createTask({
      title: "Persistence test",
      description: "Test persistence",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create new handler to verify persistence
    const newHandler = new TaskAPIHandler({
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    });

    const retrievedTask = await newHandler.getTask(task.id);

    expect(retrievedTask?.qualityGates).toBeDefined();
    expect(retrievedTask?.qualityGates?.passed).toBe(true);
  });
});

describe("Quality Gates: Failures", () => {
  let handler: TaskAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-quality-gates-failures");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    mockExecFileResults.clear();
  });

  afterEach(async () => {
    mockExecFileResults.clear();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Marks task as failed when required typecheck gate fails", async () => {
    // TypeCheck fails
    mockExecFileResults.set("pnpm typecheck", {
      success: false,
      stderr: "Error: Type 'any' is not assignable",
    });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ Tests passed" });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "TypeCheck failure test",
      description: "Test typecheck failure",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    expect(updatedTask?.status).toBe("failed");
    expect(updatedTask?.error).toContain("typecheck check failed");
    expect(updatedTask?.qualityGates?.passed).toBe(false);

    const typecheckGate = updatedTask?.qualityGates?.gates.find(g => g.type === "typecheck");
    expect(typecheckGate?.passed).toBe(false);
    expect(typecheckGate?.error).toBeTruthy();
  });

  it("Marks task as failed when required test gate fails", async () => {
    mockExecFileResults.set("pnpm typecheck", { success: true, stdout: "✓ No errors" });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", {
      success: false,
      stderr: "FAIL test/file.test.ts",
    });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "Test failure test",
      description: "Test test failure",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    expect(updatedTask?.status).toBe("failed");
    expect(updatedTask?.error).toContain("test check failed");
    expect(updatedTask?.qualityGates?.passed).toBe(false);

    const testGate = updatedTask?.qualityGates?.gates.find(g => g.type === "test");
    expect(testGate?.passed).toBe(false);
    expect(testGate?.error).toBeTruthy();
  });

  it("Allows warning lint gate to fail without blocking completion", async () => {
    mockExecFileResults.set("pnpm typecheck", { success: true, stdout: "✓ No errors" });
    mockExecFileResults.set("pnpm lint", {
      success: false,
      stdout: "Warning: Unused variable",
    });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ Tests passed" });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "Lint warning test",
      description: "Test lint warning",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    // Task still completes despite lint failure (warning severity)
    expect(updatedTask?.status).toBe("completed");
    expect(updatedTask?.qualityGates?.passed).toBe(true);

    const lintGate = updatedTask?.qualityGates?.gates.find(g => g.type === "lint");
    expect(lintGate?.passed).toBe(false);
    expect(lintGate?.severity).toBe("warning");
  });

  it("Marks task as failed when multiple required gates fail", async () => {
    mockExecFileResults.set("pnpm typecheck", {
      success: false,
      stderr: "Error: Type errors",
    });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", {
      success: false,
      stderr: "FAIL",
    });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "Multiple failures test",
      description: "Test multiple failures",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    expect(updatedTask?.status).toBe("failed");
    expect(updatedTask?.error).toContain("typecheck check failed");
    expect(updatedTask?.error).toContain("test check failed");
    expect(updatedTask?.qualityGates?.passed).toBe(false);

    const failedGates = updatedTask?.qualityGates?.gates.filter(g => !g.passed);
    expect(failedGates?.length).toBe(2);
  });

  it("Captures command output for failed gates", async () => {
    mockExecFileResults.set("pnpm typecheck", {
      success: false,
      stdout: "Checking files...",
      stderr: "Error: Type 'string' is not assignable to type 'number'",
    });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ Tests passed" });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "Output capture test",
      description: "Test output capture",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);
    const typecheckGate = updatedTask?.qualityGates?.gates.find(g => g.type === "typecheck");

    // Output should contain stderr content
    expect(typecheckGate?.output).toBeTruthy();
    // Check that it contains at least some of the error output
    expect(typecheckGate?.output.includes("Checking files") || typecheckGate?.output.includes("Type 'string'")).toBe(true);
  });
});

describe("Quality Gates: Edge cases", () => {
  let handler: TaskAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-quality-gates-edge");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    mockExecFileResults.clear();
  });

  afterEach(async () => {
    mockExecFileResults.clear();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Does not run quality gates if wave execution fails", async () => {
    mockExecFileResults.set("pnpm typecheck", { success: true, stdout: "✓ No errors" });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ Tests passed" });

    // Mock failing wave execution
    const failingOrchestrator: Partial<WaveOrchestrator> = {
      executeWave: async (): Promise<WaveResult> => ({
        tasks: [{ id: "story-1", success: false, error: "Wave failed" }],
        waves: [{ waveNumber: 1, taskCount: 1, successCount: 0, failureCount: 1 }],
        totalSuccess: 0,
        totalFailure: 1,
      }),
    } as unknown as WaveOrchestrator;

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: failingOrchestrator,
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "No quality gates on failure",
      description: "Test no quality gates",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    expect(updatedTask?.status).toBe("failed");
    expect(updatedTask?.qualityGates).toBeUndefined();
  });

  it("Records duration for each gate", async () => {
    mockExecFileResults.set("pnpm typecheck", { success: true, stdout: "✓ No errors" });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ Tests passed" });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "Duration test",
      description: "Test duration recording",
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedTask = await handler.getTask(task.id);

    updatedTask?.qualityGates?.gates.forEach(gate => {
      expect(gate.duration).toBeGreaterThanOrEqual(0);
      expect(gate.duration).toBeLessThan(10000); // Reasonable upper bound
    });

    expect(updatedTask?.qualityGates?.totalDuration).toBeGreaterThanOrEqual(0);
  });

  it("Emits progress event when starting quality gates", async () => {
    mockExecFileResults.set("pnpm typecheck", { success: true, stdout: "✓ No errors" });
    mockExecFileResults.set("pnpm lint", { success: true, stdout: "✓ Lint passed" });
    mockExecFileResults.set("pnpm test", { success: true, stdout: "✓ Tests passed" });

    const config: TaskAPIHandlerConfig = {
      projectDir: tempDir,
      stateManager,
      waveOrchestrator: createMockWaveOrchestrator(),
      resourceManager: createMockResourceManager(),
    };
    handler = new TaskAPIHandler(config);

    const task = await handler.createTask({
      title: "Progress event test",
      description: "Test progress event",
    });

    const progressEvents: any[] = [];
    handler.on("task-progress", (event) => {
      progressEvents.push(event);
    });

    await handler.startTask(task.id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const qualityGatesEvent = progressEvents.find(e => e.message.includes("quality gates"));
    expect(qualityGatesEvent).toBeDefined();
    expect(qualityGatesEvent?.taskId).toBe(task.id);
  });
});
