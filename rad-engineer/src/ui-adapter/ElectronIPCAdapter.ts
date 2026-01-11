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
import { EventBroadcaster } from "./EventBroadcaster.js";
import { StateManager } from "@/advanced/StateManager.js";
import { WaveOrchestrator } from "@/advanced/WaveOrchestrator.js";
import { ResourceManager } from "@/core/ResourceManager.js";
import { PromptValidator } from "@/core/PromptValidator.js";
import { ResponseParser } from "@/core/ResponseParser.js";
import { SDKIntegration } from "@/sdk/SDKIntegration.js";
import { ProviderFactory } from "@/sdk/providers/ProviderFactory.js";
import { ProviderType } from "@/sdk/providers/types.js";
import type {
  IPCAdapterConfig,
  AutoClaudeTask,
  AutoClaudeTaskSpec,
  TaskProgressEvent,
  TaskWaveMapping,
} from "./types.js";
import type { BrowserWindow } from "electron";

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
  private readonly eventBroadcaster?: EventBroadcaster;

  constructor(config: IPCAdapterConfig) {
    super();
    this.config = config;
    this.translator = new FormatTranslator();
    this.taskMappings = new Map();

    // P1: Initialize StateManager and TaskAPIHandler
    const stateManager = new StateManager({
      checkpointsDir: `${config.projectDir}/.auto-claude-integration`,
    });

    // Create default WaveOrchestrator and ResourceManager if not provided
    const resourceManager = config.resourceManager || new ResourceManager({ maxConcurrent: 2 });

    const waveOrchestrator = config.waveOrchestrator || (() => {
      // Create default provider factory with Anthropic (most likely to be available)
      const providerFactory = new ProviderFactory({
        defaultProvider: ProviderType.ANTHROPIC,
        providers: {},
        enableFallback: true,
      });

      const sdk = new SDKIntegration(providerFactory);
      const promptValidator = new PromptValidator();
      const responseParser = new ResponseParser();

      return new WaveOrchestrator({
        resourceManager,
        promptValidator,
        responseParser,
        sdk,
      });
    })();

    this.taskHandler = new TaskAPIHandler({
      projectDir: config.projectDir,
      stateManager,
      waveOrchestrator,
      resourceManager,
      debug: config.debug,
    });

    // Initialize EventBroadcaster if getWindows provided
    if (config.getWindows) {
      this.eventBroadcaster = new EventBroadcaster({
        getWindows: config.getWindows,
        debug: config.debug,
      });

      // Forward task-updated events to EventBroadcaster
      this.taskHandler.on("task-updated", (task: AutoClaudeTask) => {
        this.emit("task:updated", task);
        this.eventBroadcaster?.broadcastTaskObject(task);
      });

      // Forward task-progress events to EventBroadcaster
      this.taskHandler.on("task-progress", (event: TaskProgressEvent) => {
        this.emit("task:progress", event);
        this.eventBroadcaster?.broadcastTaskUpdate(event);
      });
    } else {
      // Fallback: Just forward events without broadcasting
      this.taskHandler.on("task-updated", (task: AutoClaudeTask) => {
        this.emit("task:updated", task);
      });

      this.taskHandler.on("task-progress", (event: TaskProgressEvent) => {
        this.emit("task:progress", event);
      });
    }

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Initialized with projectDir: ${config.projectDir}`);
      if (this.eventBroadcaster) {
        console.log("[ElectronIPCAdapter] EventBroadcaster enabled for multi-window support");
      }
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
   * P1-002: Executes wave via WaveOrchestrator with real progress events
   *
   * @param taskId - Task ID to start
   * @throws Error if task not found or already executing
   */
  async startTask(taskId: string): Promise<void> {
    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] startTask() called for: ${taskId}`);
    }

    // Start task via TaskAPIHandler (updates state, executes wave asynchronously)
    // Progress events are forwarded automatically via event listeners
    await this.taskHandler.startTask(taskId);

    if (this.config.debug) {
      console.log(`[ElectronIPCAdapter] Task started (executing in background): ${taskId}`);
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

  /**
   * Get EventBroadcaster instance (for testing)
   *
   * @returns EventBroadcaster if initialized, null otherwise
   */
  getEventBroadcaster(): EventBroadcaster | null {
    return this.eventBroadcaster || null;
  }

  /**
   * Cleanup resources
   *
   * Should be called before destroying the adapter
   */
  cleanup(): void {
    if (this.eventBroadcaster) {
      this.eventBroadcaster.cleanup();
    }
  }
}
