/**
 * TaskAPIHandler - Task CRUD operations with StateManager persistence
 *
 * Phase 1: Replace stub implementations with real StateManager integration
 *
 * Responsibilities:
 * - CRUD operations for Auto-Claude tasks
 * - Persistent storage via StateManager
 * - Event broadcasting for UI updates
 * - Task execution lifecycle (stub for P1-002 WaveOrchestrator integration)
 *
 * StateManager Integration:
 * - Checkpoint format: { tasks: AutoClaudeTask[], metadata: { version: string } }
 * - Checkpoint file: .auto-claude-integration/tasks-checkpoint.json
 * - Auto-save on all mutations (create, update, delete)
 */

import { EventEmitter } from "events";
import { StateManager } from "@/advanced/StateManager.js";
import type { WaveState } from "@/advanced/StateManager.js";
import type { AutoClaudeTask, AutoClaudeTaskSpec } from "./types.js";

/**
 * Task checkpoint format stored in StateManager
 * Extends WaveState to include task data
 */
interface TaskCheckpoint extends WaveState {
  /** Array of all tasks */
  tasks: AutoClaudeTask[];
  /** Checkpoint metadata */
  metadata: {
    /** Checkpoint format version */
    version: string;
    /** Last checkpoint update timestamp */
    lastUpdated: string;
  };
}

/**
 * Configuration for TaskAPIHandler
 */
export interface TaskAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** StateManager instance for persistence */
  stateManager: StateManager;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * TaskAPIHandler - Manages task CRUD operations with persistence
 *
 * @example
 * ```ts
 * const handler = new TaskAPIHandler({
 *   projectDir: "/path/to/project",
 *   stateManager: new StateManager(),
 * });
 *
 * // Create task
 * const task = await handler.createTask({
 *   title: "Implement feature X",
 *   description: "Add authentication to API",
 * });
 *
 * // Get all tasks
 * const tasks = await handler.getAllTasks();
 *
 * // Update task
 * await handler.updateTask(task.id, { status: "in_progress" });
 *
 * // Start task execution
 * await handler.startTask(task.id);
 *
 * // Listen for updates
 * handler.on("task-updated", (task) => {
 *   console.log(`Task ${task.id} updated`);
 * });
 * ```
 */
export class TaskAPIHandler extends EventEmitter {
  private readonly config: TaskAPIHandlerConfig;
  private readonly stateManager: StateManager;
  private readonly checkpointName = "auto-claude-tasks";
  private taskIdCounter = 0; // Counter for unique IDs within same millisecond

  constructor(config: TaskAPIHandlerConfig) {
    super();
    this.config = config;
    this.stateManager = config.stateManager;

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Initialized for project: ${config.projectDir}`);
    }
  }

  /**
   * Load task checkpoint from StateManager
   *
   * @returns Task checkpoint or empty state if not found
   */
  private async loadCheckpoint(): Promise<TaskCheckpoint> {
    const state = await this.stateManager.loadCheckpoint(this.checkpointName);

    if (!state) {
      // Return empty checkpoint if none exists
      return {
        waveNumber: 0,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
        tasks: [],
        metadata: {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    // Cast to TaskCheckpoint (StateManager stores as WaveState)
    return state as unknown as TaskCheckpoint;
  }

  /**
   * Save task checkpoint to StateManager
   *
   * @param checkpoint - Task checkpoint to save
   */
  private async saveCheckpoint(checkpoint: TaskCheckpoint): Promise<void> {
    // Update metadata
    checkpoint.metadata.lastUpdated = new Date().toISOString();
    checkpoint.timestamp = new Date().toISOString();

    // Save to StateManager (cast to WaveState for compatibility)
    await this.stateManager.saveCheckpoint(
      this.checkpointName,
      checkpoint as unknown as WaveState
    );

    if (this.config.debug) {
      console.log(
        `[TaskAPIHandler] Saved checkpoint: ${checkpoint.tasks.length} tasks`
      );
    }
  }

  /**
   * Get all tasks
   *
   * Process:
   * 1. Load checkpoint from StateManager
   * 2. Return all tasks sorted by creation time (newest first)
   *
   * @returns Array of Auto-Claude tasks
   */
  async getAllTasks(): Promise<AutoClaudeTask[]> {
    const checkpoint = await this.loadCheckpoint();

    // Sort by createdAt descending (newest first)
    return checkpoint.tasks.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Get specific task by ID
   *
   * Process:
   * 1. Load checkpoint from StateManager
   * 2. Find task by ID
   *
   * @param taskId - Task ID to retrieve
   * @returns Task if found, null otherwise
   */
  async getTask(taskId: string): Promise<AutoClaudeTask | null> {
    const checkpoint = await this.loadCheckpoint();
    const task = checkpoint.tasks.find((t) => t.id === taskId);
    return task || null;
  }

  /**
   * Create a new task
   *
   * Process:
   * 1. Generate unique task ID
   * 2. Create task object with initial state
   * 3. Load checkpoint
   * 4. Add task to checkpoint
   * 5. Save checkpoint
   * 6. Emit task-updated event
   *
   * @param spec - Task specification from frontend
   * @returns Created Auto-Claude task
   */
  async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
    // Generate unique task ID with counter to avoid collisions within same millisecond
    const taskId = `task-${Date.now()}-${this.taskIdCounter++}`;

    // Create task object
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

    // Load checkpoint, add task, save
    const checkpoint = await this.loadCheckpoint();
    checkpoint.tasks.push(task);
    await this.saveCheckpoint(checkpoint);

    // Emit event for UI updates
    this.emit("task-updated", task);

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Created task: ${taskId}`);
    }

    return task;
  }

  /**
   * Update an existing task
   *
   * Process:
   * 1. Load checkpoint
   * 2. Find task by ID
   * 3. Apply updates
   * 4. Update updatedAt timestamp
   * 5. Save checkpoint
   * 6. Emit task-updated event
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
    const checkpoint = await this.loadCheckpoint();
    const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Apply updates
    const task = checkpoint.tasks[taskIndex];
    Object.assign(task, updates);
    task.updatedAt = new Date().toISOString();

    // Save checkpoint
    checkpoint.tasks[taskIndex] = task;
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("task-updated", task);

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Updated task: ${taskId}`);
    }

    return task;
  }

  /**
   * Delete a task
   *
   * Process:
   * 1. Load checkpoint
   * 2. Find and remove task by ID
   * 3. Save checkpoint
   *
   * @param taskId - Task ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const checkpoint = await this.loadCheckpoint();
    const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      return false;
    }

    // Remove task
    checkpoint.tasks.splice(taskIndex, 1);
    await this.saveCheckpoint(checkpoint);

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Deleted task: ${taskId}`);
    }

    return true;
  }

  /**
   * Start task execution
   *
   * Process:
   * 1. Validate task exists and is not already executing
   * 2. Update task status to in_progress
   * 3. Save checkpoint
   * 4. Emit task-updated event
   * 5. [STUB] Future: Integrate with WaveOrchestrator (P1-002)
   *
   * @param taskId - Task ID to start
   * @throws Error if task not found or invalid state
   */
  async startTask(taskId: string): Promise<void> {
    const checkpoint = await this.loadCheckpoint();
    const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = checkpoint.tasks[taskIndex];

    // Validate task state
    if (task.status === "in_progress") {
      throw new Error(`Task already in progress: ${taskId}`);
    }

    if (task.status === "completed") {
      throw new Error(`Task already completed: ${taskId}`);
    }

    // Update task status
    task.status = "in_progress";
    task.updatedAt = new Date().toISOString();
    task.progress = 0;

    // Save checkpoint
    checkpoint.tasks[taskIndex] = task;
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("task-updated", task);

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Started task: ${taskId}`);
      console.log(
        `[TaskAPIHandler] STUB: WaveOrchestrator integration pending (P1-002)`
      );
    }

    // STUB: WaveOrchestrator integration
    // Future: await this.waveOrchestrator.execute(task)
  }

  /**
   * Stop task execution
   *
   * Process:
   * 1. Validate task exists and is executing
   * 2. Update task status based on progress
   * 3. Save checkpoint
   * 4. Emit task-updated event
   * 5. [STUB] Future: Signal WaveOrchestrator to stop (P1-002)
   *
   * @param taskId - Task ID to stop
   * @throws Error if task not found or not executing
   */
  async stopTask(taskId: string): Promise<void> {
    const checkpoint = await this.loadCheckpoint();
    const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = checkpoint.tasks[taskIndex];

    // Validate task is executing
    if (task.status !== "in_progress") {
      throw new Error(`Task not in progress: ${taskId}`);
    }

    // Update task status based on progress
    if (task.progress === 100) {
      task.status = "completed";
    } else if (task.progress && task.progress > 0) {
      task.status = "cancelled";
    } else {
      task.status = "cancelled";
    }

    task.updatedAt = new Date().toISOString();

    // Save checkpoint
    checkpoint.tasks[taskIndex] = task;
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("task-updated", task);

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Stopped task: ${taskId}`);
      console.log(
        `[TaskAPIHandler] STUB: WaveOrchestrator stop signal pending (P1-002)`
      );
    }

    // STUB: WaveOrchestrator stop signal
    // Future: await this.waveOrchestrator.stop(taskId)
  }
}
