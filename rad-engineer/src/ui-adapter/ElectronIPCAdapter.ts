/**
 * ElectronIPCAdapter - Bridge between Auto-Claude UI and rad-engineer backend
 *
 * P1 Implementation: Real StateManager integration via TaskAPIHandler
 *
 * Responsibilities:
 * - Handle IPC calls from Auto-Claude frontend
 * - Delegate CRUD operations to TaskAPIHandler
 * - Convert between Auto-Claude and rad-engineer formats
 * - Coordinate with WaveOrchestrator for task execution (P1-002)
 * - Emit progress events during execution
 *
 * IPC APIs:
 * - task:get-all → getAllTasks()
 * - task:create → createTask()
 * - task:start → startTask()
 * - task:update → updateTask()
 * - task:delete → deleteTask()
 */

import { EventEmitter } from "events";
import { FormatTranslator } from "./FormatTranslator.js";
import { TaskAPIHandler } from "./TaskAPIHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import type {
  IPCAdapterConfig,
  AutoClaudeTask,
  AutoClaudeTaskSpec,
  TaskProgressEvent,
  TaskWaveMapping,
} from "./types.js";

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
  private readonly taskHandler: TaskAPIHandler;
  private readonly taskMappings: Map<string, TaskWaveMapping>;

  constructor(config: IPCAdapterConfig) {
    super();
    this.config = config;
    this.translator = new FormatTranslator();
    this.taskMappings = new Map();

    // P1: Initialize StateManager and TaskAPIHandler
    const stateManager = new StateManager({
      checkpointsDir: `${config.projectDir}/.auto-claude-integration`,
    });
    this.taskHandler = new TaskAPIHandler({
      projectDir: config.projectDir,
      stateManager,
      debug: config.debug,
    });

    // P1: Forward task-updated events from TaskAPIHandler
    this.taskHandler.on("task-updated", (task: AutoClaudeTask) => {
      this.emit("task:updated", task);
    });

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Initialized with projectDir: ${config.projectDir}`);
    }
  }

  /**
   * Get all tasks
   * IPC: task:get-all
   *
   * P1: Delegates to TaskAPIHandler for persistent storage
   *
   * @returns Array of Auto-Claude tasks
   */
  async getAllTasks(): Promise<AutoClaudeTask[]> {
    if (this.config.debug) {
      console.log("[ElectronIPCAdapter] getAllTasks() called");
    }

    return this.taskHandler.getAllTasks();
  }

  /**
   * Create a new task
   * IPC: task:create
   *
   * P1: Delegates to TaskAPIHandler for persistent storage
   *
   * @param spec - Task specification from frontend
   * @returns Created Auto-Claude task
   */
  async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
    if (this.config.debug) {
      console.log("[ElectronIPCAdapter] createTask() called", spec);
    }

    // P1: Create task via TaskAPIHandler (persists to StateManager)
    const task = await this.taskHandler.createTask(spec);

    // Create stub Wave mapping via FormatTranslator
    const wave = this.translator.toRadEngineerWave(spec, task.id);
    this.taskMappings.set(task.id, {
      taskId: task.id,
      wave,
    });

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Created task: ${task.id}`);
    }

    return task;
  }

  /**
   * Start task execution
   * IPC: task:start
   *
   * P1: Delegates to TaskAPIHandler for state management
   * Future (P1-002): Execute wave via WaveOrchestrator, emit real progress
   *
   * @param taskId - Task ID to start
   * @throws Error if task not found or already executing
   */
  async startTask(taskId: string): Promise<void> {
    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] startTask() called for: ${taskId}`);
    }

    // P1: Start task via TaskAPIHandler (updates state, persists)
    await this.taskHandler.startTask(taskId);

    // P1: Emit fake progress events for demo
    // Future (P1-002): Real progress from WaveOrchestrator
    await this.emitFakeProgress(taskId);

    // P1: Mark task as completed
    await this.taskHandler.updateTask(taskId, {
      status: "completed",
      progress: 100,
    });

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
   * IPC: task:get
   *
   * P1: Delegates to TaskAPIHandler
   *
   * @param taskId - Task ID
   * @returns Task if found, null otherwise
   */
  async getTask(taskId: string): Promise<AutoClaudeTask | null> {
    return this.taskHandler.getTask(taskId);
  }

  /**
   * Update existing task
   * IPC: task:update
   *
   * P1: Delegates to TaskAPIHandler for persistent updates
   *
   * @param taskId - Task ID to update
   * @param updates - Partial task updates
   * @returns Updated task
   * @throws Error if task not found
   */
  async updateTask(
    taskId: string,
    updates: Partial<AutoClaudeTask>
  ): Promise<AutoClaudeTask> {
    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] updateTask() called for: ${taskId}`);
    }

    return this.taskHandler.updateTask(taskId, updates);
  }

  /**
   * Delete a task
   * IPC: task:delete
   *
   * P1: Delegates to TaskAPIHandler for persistent deletion
   *
   * @param taskId - Task ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteTask(taskId: string): Promise<boolean> {
    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] deleteTask() called for: ${taskId}`);
    }

    const deleted = await this.taskHandler.deleteTask(taskId);

    // Also remove wave mapping if exists
    if (deleted) {
      this.taskMappings.delete(taskId);
    }

    return deleted;
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
