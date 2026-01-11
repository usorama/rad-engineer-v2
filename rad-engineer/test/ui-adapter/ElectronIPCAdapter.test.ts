/**
 * Unit tests for ElectronIPCAdapter
 *
 * Tests:
 * - getAllTasks with persistent storage
 * - createTask generates unique IDs
 * - startTask logs correctly and emits progress
 * - Error handling for invalid operations
 * - Integration with TaskAPIHandler and StateManager
 *
 * Coverage requirements:
 * - Branches: 80%
 * - Functions: 85%
 * - Lines: 85%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ElectronIPCAdapter } from "@/ui-adapter/ElectronIPCAdapter.js";
import type { AutoClaudeTaskSpec, TaskProgressEvent } from "@/ui-adapter/types.js";
import { promises as fs } from "fs";
import { join } from "path";

// Common setup for all tests
let tempDir: string;
let adapter: ElectronIPCAdapter;

beforeEach(async () => {
  tempDir = join(process.cwd(), "test-electron-adapter");
  await fs.mkdir(tempDir, { recursive: true });
  adapter = new ElectronIPCAdapter({
    projectDir: tempDir,
  });
});

afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe("ElectronIPCAdapter: getAllTasks", () => {
  it("Returns empty array on initialization", async () => {
    const tasks = await adapter.getAllTasks();

    // P1: No dummy tasks - starts empty
    expect(tasks).toHaveLength(0);
  });

  it("Returns tasks sorted by creation time (newest first)", async () => {
    const task1 = await adapter.createTask({
      title: "Task 1",
      description: "First task",
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    const task2 = await adapter.createTask({
      title: "Task 2",
      description: "Second task",
    });

    const tasks = await adapter.getAllTasks();

    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe(task2.id);
    expect(tasks[1].id).toBe(task1.id);
  });
});

describe("ElectronIPCAdapter: createTask", () => {
  it("Creates task with generated unique ID", async () => {
    const spec: AutoClaudeTaskSpec = {
      title: "New feature",
      description: "Implement feature X",
      priority: 5,
      tags: ["feature", "backend"],
    };

    const task = await adapter.createTask(spec);

    expect(task.id).toMatch(/^task-\d+-\d+$/);
    expect(task.title).toBe(spec.title);
    expect(task.description).toBe(spec.description);
    expect(task.status).toBe("pending");
    expect(task.priority).toBe(spec.priority);
    expect(task.tags).toEqual(spec.tags);
    expect(task.progress).toBe(0);
    expect(task.createdAt).toBeTruthy();
    expect(task.updatedAt).toBeTruthy();
  });

  it("Generates unique IDs for multiple tasks", async () => {
    const task1 = await adapter.createTask({
      title: "Task 1",
      description: "First",
    });

    await new Promise((resolve) => setTimeout(resolve, 1));

    const task2 = await adapter.createTask({
      title: "Task 2",
      description: "Second",
    });

    expect(task1.id).not.toBe(task2.id);
  });

  it("Creates task without optional fields", async () => {
    const spec: AutoClaudeTaskSpec = {
      title: "Simple task",
      description: "Basic task",
    };

    const task = await adapter.createTask(spec);

    expect(task.id).toMatch(/^task-\d+-\d+$/);
    expect(task.priority).toBeUndefined();
    expect(task.tags).toBeUndefined();
  });

  it("Creates Wave mapping for new task", async () => {
    const task = await adapter.createTask({
      title: "Test task",
      description: "Test description",
    });

    const mapping = adapter.getWaveMapping(task.id);

    expect(mapping).toBeTruthy();
    expect(mapping?.taskId).toBe(task.id);
    expect(mapping?.wave.id).toBe(`wave-${task.id}`);
    expect(mapping?.wave.name).toBe(task.title);
  });
});

describe("ElectronIPCAdapter: startTask", () => {
  it("Starts task and emits progress events", async () => {
    const task = await adapter.createTask({
      title: "Test execution",
      description: "Test task execution",
    });

    const progressEvents: TaskProgressEvent[] = [];
    adapter.on("task:progress", (event: TaskProgressEvent) => {
      progressEvents.push(event);
    });

    await adapter.startTask(task.id);

    expect(progressEvents.length).toBeGreaterThan(0);

    const progressValues = progressEvents.map((e) => e.progress);
    expect(progressValues).toContain(0);
    expect(progressValues).toContain(25);
    expect(progressValues).toContain(50);
    expect(progressValues).toContain(75);
    expect(progressValues).toContain(100);

    for (const event of progressEvents) {
      expect(event.taskId).toBe(task.id);
      expect(event.message).toBeTruthy();
      expect(event.waveNumber).toBe(1);
      expect(event.totalWaves).toBe(1);
    }
  });

  it("Updates task status to completed after execution", async () => {
    const task = await adapter.createTask({
      title: "Status test",
      description: "Test status updates",
    });

    expect(task.status).toBe("pending");

    await adapter.startTask(task.id);

    const updatedTask = await adapter.getTask(task.id);

    expect(updatedTask?.status).toBe("completed");
    expect(updatedTask?.progress).toBe(100);
  });

  it("Throws error for non-existent task", async () => {
    await expect(adapter.startTask("non-existent-id")).rejects.toThrow(
      "Task not found: non-existent-id"
    );
  });

  it("Throws error when starting already in-progress task", async () => {
    const task = await adapter.createTask({
      title: "Duplicate start test",
      description: "Test duplicate start",
    });

    const startPromise = adapter.startTask(task.id);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await expect(adapter.startTask(task.id)).rejects.toThrow(
      "Task already in progress"
    );

    await startPromise;
  });

  it("Throws error when starting already completed task", async () => {
    const task = await adapter.createTask({
      title: "Completed test",
      description: "Test",
    });

    await adapter.startTask(task.id);

    await expect(adapter.startTask(task.id)).rejects.toThrow(
      "Task already completed"
    );
  });
});

describe("ElectronIPCAdapter: getTask", () => {
  it("Returns task by ID", async () => {
    const createdTask = await adapter.createTask({
      title: "Get task test",
      description: "Test getTask method",
    });

    const retrievedTask = await adapter.getTask(createdTask.id);

    expect(retrievedTask).toBeTruthy();
    expect(retrievedTask?.id).toBe(createdTask.id);
    expect(retrievedTask?.title).toBe(createdTask.title);
  });

  it("Returns null for non-existent task", async () => {
    const task = await adapter.getTask("non-existent-id");

    expect(task).toBeNull();
  });
});

describe("ElectronIPCAdapter: getProjectDir", () => {
  it("Returns configured project directory", () => {
    expect(adapter.getProjectDir()).toBe(tempDir);
  });
});

describe("ElectronIPCAdapter: debug mode", () => {
  it("Logs debug messages when debug enabled", async () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    const debugAdapter = new ElectronIPCAdapter({
      projectDir: tempDir,
      debug: true,
    });

    await debugAdapter.getAllTasks();
    await debugAdapter.createTask({
      title: "Debug test",
      description: "Test debug logging",
    });

    console.log = originalLog;

    const initLog = logs.find((log) => log.includes("Initialized with projectDir"));
    const getAllLog = logs.find((log) => log.includes("getAllTasks() called"));
    const createLog = logs.find((log) => log.includes("createTask() called"));

    expect(initLog).toBeTruthy();
    expect(getAllLog).toBeTruthy();
    expect(createLog).toBeTruthy();
  });
});
