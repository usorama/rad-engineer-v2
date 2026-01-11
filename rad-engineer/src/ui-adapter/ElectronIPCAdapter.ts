/**
 * ElectronIPCAdapter - Bridge between Auto-Claude UI and rad-engineer backend
 *
 * P0 Implementation: Stub APIs for demo with dummy data
 *
 * Responsibilities:
 * - Handle IPC calls from Auto-Claude frontend
 * - Convert between Auto-Claude and rad-engineer formats
 * - Coordinate with WaveOrchestrator for task execution
 * - Emit progress events during execution
 *
 * IPC APIs:
 * - task:get-all → getAllTasks()
 * - task:create → createTask()
 * - task:start → startTask()
 */

import { EventEmitter } from "events";
import { FormatTranslator } from "./FormatTranslator.js";
import type {
  IPCAdapterConfig,
  AutoClaudeTask,
  AutoClaudeTaskSpec,
  TaskProgressEvent,
  TaskWaveMapping,
} from "./types.js";
import type { Wave } from "@/plan/types.js";

/**
 * ElectronIPCAdapter - Main adapter class
 *
 * @example
 * ```ts
 * const adapter = new ElectronIPCAdapter({
 *   projectDir: "/path/to/project",
 *   debug: true,
 * });
 *
 * // Get all tasks
 * const tasks = await adapter.getAllTasks();
 *
 * // Create new task
 * const task = await adapter.createTask({
 *   title: "Implement feature X",
 *   description: "Add authentication to API",
 *   priority: 5,
 * });
 *
 * // Start task execution
 * adapter.on("task:progress", (event) => {
 *   console.log(`Task ${event.taskId}: ${event.progress}%`);
 * });
 * await adapter.startTask(task.id);
 * ```
 */
export class ElectronIPCAdapter extends EventEmitter {
  private readonly config: IPCAdapterConfig;
  private readonly translator: FormatTranslator;
  private readonly taskMappings: Map<string, TaskWaveMapping>;
  private readonly tasks: Map<string, AutoClaudeTask>;

  constructor(config: IPCAdapterConfig) {
    super();
    this.config = config;
    this.translator = new FormatTranslator();
    this.taskMappings = new Map();
    this.tasks = new Map();

    // P0: Initialize with dummy tasks
    this.initializeDummyTasks();

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Initialized with projectDir: ${config.projectDir}`);
    }
  }

  /**
   * P0: Initialize with 2 dummy tasks for demo
   * Future: Load from StateManager or database
   */
  private initializeDummyTasks(): void {
    const dummyTasks: AutoClaudeTask[] = [
      {
        id: "demo-1",
        title: "Demo Task 1",
        description: "This is a demo task for testing the UI integration",
        status: "pending",
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        priority: 4,
        tags: ["demo", "ui-integration"],
        progress: 0,
      },
      {
        id: "demo-2",
        title: "Demo Task 2",
        description: "This is a completed demo task showing successful execution",
        status: "completed",
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        updatedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        priority: 3,
        tags: ["demo", "completed"],
        progress: 100,
      },
    ];

    for (const task of dummyTasks) {
      this.tasks.set(task.id, task);
    }
  }

  /**
   * Get all tasks
   * IPC: task:get-all
   *
   * P0: Returns dummy tasks from in-memory store
   * Future: Query StateManager for persisted tasks
   *
   * @returns Array of Auto-Claude tasks
   */
  async getAllTasks(): Promise<AutoClaudeTask[]> {
    if (this.config.debug) {
      console.log("[ElectronIPCAdapter] getAllTasks() called");
    }

    // P0: Return all tasks from in-memory store
    return Array.from(this.tasks.values()).sort((a, b) => {
      // Sort by createdAt descending (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Create a new task
   * IPC: task:create
   *
   * P0: Creates task stub with generated ID
   * Future: Create full Wave via PlanSkill, persist to StateManager
   *
   * @param spec - Task specification from frontend
   * @returns Created Auto-Claude task
   */
  async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
    if (this.config.debug) {
      console.log("[ElectronIPCAdapter] createTask() called", spec);
    }

    // Generate unique task ID
    const taskId = `task-${Date.now()}`;

    // P0: Create stub Wave via FormatTranslator
    const wave = this.translator.toRadEngineerWave(spec, taskId);

    // Create Auto-Claude task
    const task: AutoClaudeTask = {
      id: taskId,
      title: spec.title,
      description: spec.description,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: spec.priority,
      tags: spec.tags,
      progress: 0,
    };

    // Store task and mapping
    this.tasks.set(taskId, task);
    this.taskMappings.set(taskId, {
      taskId,
      wave,
    });

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Created task: ${taskId}`);
    }

    return task;
  }

  /**
   * Start task execution
   * IPC: task:start
   *
   * P0: Stub implementation - logs and emits fake progress
   * Future: Execute wave via WaveOrchestrator, emit real progress
   *
   * @param taskId - Task ID to start
   * @throws Error if task not found or already executing
   */
  async startTask(taskId: string): Promise<void> {
    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] startTask() called for: ${taskId}`);
    }

    // Validate task exists
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate task is not already executing
    if (task.status === "in_progress") {
      throw new Error(`Task already in progress: ${taskId}`);
    }

    // Validate task is not already completed
    if (task.status === "completed") {
      throw new Error(`Task already completed: ${taskId}`);
    }

    // Update task status
    task.status = "in_progress";
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    // P0: Log stub execution
    console.log(`[ElectronIPCAdapter] WaveOrchestrator stub called for task: ${taskId}`);

    // P0: Emit fake progress events
    await this.emitFakeProgress(taskId);

    // P0: Mark task as completed
    task.status = "completed";
    task.progress = 100;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Task completed: ${taskId}`);
    }
  }

  /**
   * P0: Emit fake progress events for demo
   * Future: Real progress events from WaveOrchestrator
   *
   * @param taskId - Task ID
   */
  private async emitFakeProgress(taskId: string): Promise<void> {
    const progressSteps = [0, 25, 50, 75, 100];

    for (const progress of progressSteps) {
      // Wait 500ms between updates
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Emit progress event
      const event: TaskProgressEvent = {
        taskId,
        progress,
        message: `Processing... ${progress}%`,
        waveNumber: 1,
        totalWaves: 1,
      };

      this.emit("task:progress", event);

      if (this.config.debug) {
        console.log(`[ElectronIPCAdapter] Progress: ${taskId} - ${progress}%`);
      }
    }
  }

  /**
   * Get specific task by ID
   *
   * @param taskId - Task ID
   * @returns Task if found, null otherwise
   */
  async getTask(taskId: string): Promise<AutoClaudeTask | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get Wave mapping for a task
   *
   * @param taskId - Task ID
   * @returns Wave mapping if found, null otherwise
   */
  getWaveMapping(taskId: string): TaskWaveMapping | null {
    return this.taskMappings.get(taskId) || null;
  }

  /**
   * Get project directory
   *
   * @returns Project directory path
   */
  getProjectDir(): string {
    return this.config.projectDir;
  }
}
