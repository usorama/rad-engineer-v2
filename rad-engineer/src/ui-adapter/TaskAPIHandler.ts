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
import type { WaveOrchestrator, Task as WaveTask, WaveResult } from "@/advanced/WaveOrchestrator.js";
import type { ResourceManager } from "@/core/ResourceManager.js";
import { FormatTranslator } from "./FormatTranslator.js";
import type { AutoClaudeTask, AutoClaudeTaskSpec, TaskProgressEvent, QualityGateResult, QualityGatesResults } from "./types.js";
import { execFileNoThrow } from "@/utils/execFileNoThrow.js";
import type { ExecFileResult } from "@/utils/execFileNoThrow.js";

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
  /** WaveOrchestrator instance for task execution */
  waveOrchestrator: Partial<WaveOrchestrator> | WaveOrchestrator;
  /** ResourceManager instance for concurrency control */
  resourceManager: Partial<ResourceManager> | ResourceManager;
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
  private readonly waveOrchestrator: Partial<WaveOrchestrator> | WaveOrchestrator;
  private readonly resourceManager: Partial<ResourceManager> | ResourceManager;
  private readonly formatTranslator: FormatTranslator;
  private readonly checkpointName = "auto-claude-tasks";
  private taskIdCounter = 0; // Counter for unique IDs within same millisecond
  private readonly runningWaves: Map<string, { waveId: string; abortController?: AbortController }> = new Map();

  constructor(config: TaskAPIHandlerConfig) {
    super();
    this.config = config;
    this.stateManager = config.stateManager;
    this.waveOrchestrator = config.waveOrchestrator;
    this.resourceManager = config.resourceManager;
    this.formatTranslator = new FormatTranslator();

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
    try {
      const checkpoint = await this.loadCheckpoint();

      // Sort by createdAt descending (newest first)
      return checkpoint.tasks.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (error) {
      this.emit('error', {
        code: 'LOAD_TASKS_ERROR',
        message: 'Failed to load tasks from storage',
        action: 'Check that project directory is writable and StateManager is initialized',
        details: error instanceof Error ? error.message : String(error)
      });
      // Graceful degradation: return empty array
      return [];
    }
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
    try {
      const checkpoint = await this.loadCheckpoint();
      const task = checkpoint.tasks.find((t) => t.id === taskId);
      return task || null;
    } catch (error) {
      this.emit('error', {
        code: 'LOAD_TASK_ERROR',
        message: `Failed to load task ${taskId}`,
        action: 'Check that project directory is accessible and storage is not corrupted',
        details: error instanceof Error ? error.message : String(error)
      });
      // Graceful degradation: return null
      return null;
    }
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
   * @throws Error if task creation fails (after emitting error event)
   */
  async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
    try {
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
    } catch (error) {
      this.emit('error', {
        code: 'CREATE_TASK_ERROR',
        message: 'Failed to create task',
        action: 'Check that project directory is writable and StateManager is initialized. Verify disk space is available.',
        details: error instanceof Error ? error.message : String(error)
      });
      throw error; // Re-throw as task creation is critical
    }
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
   * @throws Error if task not found or update fails
   */
  async updateTask(
    taskId: string,
    updates: Partial<AutoClaudeTask>
  ): Promise<AutoClaudeTask> {
    try {
      const checkpoint = await this.loadCheckpoint();
      const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

      if (taskIndex === -1) {
        const error = new Error(`Task not found: ${taskId}`);
        this.emit('error', {
          code: 'TASK_NOT_FOUND',
          message: `Cannot update task ${taskId} - task does not exist`,
          action: 'Verify the task ID is correct. The task may have been deleted.',
          details: error.message
        });
        throw error;
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
    } catch (error) {
      // Only emit error if not already emitted (task not found)
      if (!(error instanceof Error && error.message.includes('Task not found'))) {
        this.emit('error', {
          code: 'UPDATE_TASK_ERROR',
          message: `Failed to update task ${taskId}`,
          action: 'Check that project directory is writable and storage is not corrupted',
          details: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }
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
   * 3. Convert task to Wave via FormatTranslator
   * 4. Execute wave via WaveOrchestrator
   * 5. Stream progress events
   * 6. Update task status based on wave execution result
   * 7. Save final status to StateManager
   *
   * @param taskId - Task ID to start
   * @throws Error if task not found or invalid state
   */
  async startTask(taskId: string): Promise<void> {
    try {
      const checkpoint = await this.loadCheckpoint();
      const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

      if (taskIndex === -1) {
        const error = new Error(`Task not found: ${taskId}`);
        this.emit('error', {
          code: 'TASK_NOT_FOUND',
          message: `Cannot start task ${taskId} - task does not exist`,
          action: 'Verify the task ID is correct. The task may have been deleted.',
          details: error.message
        });
        throw error;
      }

      const task = checkpoint.tasks[taskIndex];

      // Validate task state
      if (task.status === "in_progress") {
        const error = new Error(`Task already in progress: ${taskId}`);
        this.emit('error', {
          code: 'TASK_ALREADY_RUNNING',
          message: `Task ${taskId} is already executing`,
          action: 'Wait for current execution to complete, or stop the task before restarting',
          details: error.message
        });
        throw error;
      }

      if (task.status === "completed") {
        const error = new Error(`Task already completed: ${taskId}`);
        this.emit('error', {
          code: 'TASK_ALREADY_COMPLETED',
          message: `Task ${taskId} has already completed`,
          action: 'Create a new task if you want to re-run this work',
          details: error.message
        });
        throw error;
      }

      // Validate WaveOrchestrator is available
      if (!this.waveOrchestrator.executeWave) {
        const error = new Error('WaveOrchestrator not available');
        this.emit('error', {
          code: 'ORCHESTRATOR_NOT_AVAILABLE',
          message: 'Cannot start task - execution engine is not initialized',
          action: 'Restart the application or check that WaveOrchestrator is properly configured',
          details: error.message
        });
        throw error;
      }

      // Update task status to in_progress
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
      }

      // Convert task to Wave
      const wave = this.formatTranslator.toRadEngineerWave(
        {
          title: task.title,
          description: task.description,
          priority: task.priority,
          tags: task.tags,
        },
        taskId
      );

      // Track running wave
      this.runningWaves.set(taskId, { waveId: wave.id });

      // Execute wave asynchronously (don't await - runs in background)
      this.executeWaveAsync(taskId, wave).catch(async (error) => {
        // Handle unexpected errors
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[TaskAPIHandler] Wave execution error for task ${taskId}: ${errorMsg}`);

        this.emit('error', {
          code: 'WAVE_EXECUTION_ERROR',
          message: `Task ${taskId} execution failed`,
          action: 'Check the task output for details. You may need to retry or fix task configuration.',
          details: errorMsg
        });

        // Update task to failed
        await this.updateTaskAfterExecution(taskId, {
          status: "failed",
          error: errorMsg,
          progress: 0,
        });
      });
    } catch (error) {
      // Emit error if not already emitted
      if (!(error instanceof Error && (
        error.message.includes('Task not found') ||
        error.message.includes('already in progress') ||
        error.message.includes('already completed') ||
        error.message.includes('WaveOrchestrator not available')
      ))) {
        this.emit('error', {
          code: 'START_TASK_ERROR',
          message: `Failed to start task ${taskId}`,
          action: 'Check that StateManager and WaveOrchestrator are initialized',
          details: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }
  }

  /**
   * Execute wave asynchronously with progress updates
   *
   * @param taskId - Task ID
   * @param wave - Wave to execute
   */
  private async executeWaveAsync(taskId: string, wave: any): Promise<void> {
    try {
      // Convert wave stories to WaveOrchestrator tasks
      const waveTasks: WaveTask[] = wave.stories.map((story: any) => ({
        id: story.id,
        prompt: story.description,
        dependencies: story.dependencies || [],
      }));

      // Emit initial progress
      this.emitProgress(taskId, {
        progress: 0,
        message: `Starting execution of ${waveTasks.length} task(s)`,
        totalWaves: 1,
        waveNumber: 1,
      });

      // Execute wave
      const result: WaveResult = await this.waveOrchestrator.executeWave!(waveTasks, {
        continueOnError: false,
      });

      // Calculate final progress based on results
      const totalTasks = result.tasks.length;
      const successTasks = result.totalSuccess;
      const progress = totalTasks > 0 ? Math.round((successTasks / totalTasks) * 100) : 0;

      // Determine final status
      let status: "completed" | "failed" = "completed";
      let errorMsg: string | undefined;

      if (result.totalFailure > 0) {
        status = "failed";
        const failedTasks = result.tasks.filter((t) => !t.success);
        errorMsg = failedTasks.map((t) => `${t.id}: ${t.error}`).join("; ");
      }

      // Emit final progress
      this.emitProgress(taskId, {
        progress,
        message: status === "completed"
          ? `Completed ${successTasks}/${totalTasks} task(s)`
          : `Failed: ${result.totalFailure}/${totalTasks} task(s) failed`,
        totalWaves: 1,
        waveNumber: 1,
      });

      // Run quality gates after successful execution
      let qualityGatesResults: QualityGatesResults | undefined;
      if (status === "completed") {
        qualityGatesResults = await this.runQualityGates(taskId);

        // If any required gate failed, mark task as failed
        if (!qualityGatesResults.passed) {
          status = "failed";
          errorMsg = "Quality gates failed: " +
            qualityGatesResults.gates
              .filter(g => !g.passed && g.severity === "required")
              .map(g => `${g.type} check failed`)
              .join(", ");
        }
      }

      // Update task with final status
      await this.updateTaskAfterExecution(taskId, {
        status,
        progress,
        error: errorMsg,
        qualityGates: qualityGatesResults,
      });

      if (this.config.debug) {
        console.log(`[TaskAPIHandler] Wave execution completed for task ${taskId}: ${status}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Emit error progress
      this.emitProgress(taskId, {
        progress: 0,
        message: `Execution failed: ${errorMsg}`,
        totalWaves: 1,
        waveNumber: 1,
      });

      // Update task to failed
      await this.updateTaskAfterExecution(taskId, {
        status: "failed",
        error: errorMsg,
        progress: 0,
      });

      throw error; // Re-throw for caller to handle
    } finally {
      // Clean up running wave tracking
      this.runningWaves.delete(taskId);
    }
  }

  /**
   * Update task after wave execution completes
   *
   * @param taskId - Task ID
   * @param updates - Updates to apply
   */
  private async updateTaskAfterExecution(
    taskId: string,
    updates: {
      status: "completed" | "failed" | "cancelled";
      progress: number;
      error?: string;
      qualityGates?: QualityGatesResults;
    }
  ): Promise<void> {
    const checkpoint = await this.loadCheckpoint();
    const taskIndex = checkpoint.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      console.warn(`[TaskAPIHandler] Task ${taskId} not found during post-execution update`);
      return;
    }

    const task = checkpoint.tasks[taskIndex];
    task.status = updates.status;
    task.progress = updates.progress;
    task.updatedAt = new Date().toISOString();
    if (updates.error) {
      task.error = updates.error;
    }
    if (updates.qualityGates) {
      task.qualityGates = updates.qualityGates;
    }

    checkpoint.tasks[taskIndex] = task;
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("task-updated", task);
  }

  /**
   * Emit progress event
   *
   * @param taskId - Task ID
   * @param event - Progress event data
   */
  private emitProgress(
    taskId: string,
    event: { progress: number; message: string; waveNumber?: number; totalWaves?: number }
  ): void {
    const progressEvent: TaskProgressEvent = {
      taskId,
      progress: event.progress,
      message: event.message,
      waveNumber: event.waveNumber,
      totalWaves: event.totalWaves,
    };

    this.emit("task-progress", progressEvent);

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Progress [${taskId}]: ${event.progress}% - ${event.message}`);
    }
  }

  /**
   * Run quality gates after task execution
   *
   * Executes three quality checks:
   * 1. typecheck (required) - pnpm typecheck must show 0 errors
   * 2. lint (warning) - pnpm lint should pass
   * 3. test (required) - pnpm test must pass with ≥80% coverage
   *
   * @param taskId - Task ID for progress events
   * @returns Quality gates results
   */
  private async runQualityGates(taskId: string): Promise<QualityGatesResults> {
    const startedAt = new Date().toISOString();
    const gates: QualityGateResult[] = [];
    let totalDuration = 0;

    try {
      // Emit progress
      this.emitProgress(taskId, {
        progress: 100,
        message: "Running quality gates...",
      });

      // 1. TypeCheck (required)
      try {
        const typecheckResult = await this.runQualityGate("typecheck", "pnpm typecheck", "required");
        gates.push(typecheckResult);
        totalDuration += typecheckResult.duration;
      } catch (error) {
        // Gate execution failed - add failed result
        gates.push({
          type: "typecheck",
          passed: false,
          severity: "required",
          output: "",
          duration: 0,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        this.emit('error', {
          code: 'QUALITY_GATE_EXECUTION_ERROR',
          message: 'TypeCheck quality gate failed to execute',
          action: 'Check that pnpm is installed and project dependencies are up to date',
          details: error instanceof Error ? error.message : String(error)
        });
      }

      // 2. Lint (warning)
      try {
        const lintResult = await this.runQualityGate("lint", "pnpm lint", "warning");
        gates.push(lintResult);
        totalDuration += lintResult.duration;
      } catch (error) {
        // Gate execution failed - add failed result
        gates.push({
          type: "lint",
          passed: false,
          severity: "warning",
          output: "",
          duration: 0,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        // Warning-level gates don't emit errors, just log
        if (this.config.debug) {
          console.warn(`[TaskAPIHandler] Lint quality gate failed to execute: ${error}`);
        }
      }

      // 3. Test (required)
      try {
        const testResult = await this.runQualityGate("test", "pnpm test", "required");
        gates.push(testResult);
        totalDuration += testResult.duration;
      } catch (error) {
        // Gate execution failed - add failed result
        gates.push({
          type: "test",
          passed: false,
          severity: "required",
          output: "",
          duration: 0,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        this.emit('error', {
          code: 'QUALITY_GATE_EXECUTION_ERROR',
          message: 'Test quality gate failed to execute',
          action: 'Check that test framework is installed and configured correctly',
          details: error instanceof Error ? error.message : String(error)
        });
      }

      const completedAt = new Date().toISOString();

      // Overall pass: all required gates must pass
      const passed = gates
        .filter(g => g.severity === "required")
        .every(g => g.passed);

      const results: QualityGatesResults = {
        passed,
        gates,
        totalDuration,
        startedAt,
        completedAt,
      };

      // Emit quality:completed event
      this.emit("quality:completed", { taskId, results });

      if (this.config.debug) {
        console.log(`[TaskAPIHandler] Quality gates for task ${taskId}: ${passed ? "PASSED" : "FAILED"}`);
        gates.forEach(gate => {
          const status = gate.passed ? "✓" : "✗";
          console.log(`  ${status} ${gate.type} (${gate.severity}): ${gate.duration}ms`);
        });
      }

      return results;
    } catch (error) {
      // Unexpected error in quality gates orchestration
      this.emit('error', {
        code: 'QUALITY_GATES_ERROR',
        message: 'Quality gates execution failed',
        action: 'Check system resources and verify project configuration',
        details: error instanceof Error ? error.message : String(error)
      });

      // Return failed results with what we have
      return {
        passed: false,
        gates,
        totalDuration,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Run a single quality gate
   *
   * @param type - Gate type
   * @param command - Command string (e.g., "pnpm typecheck")
   * @param severity - Gate severity
   * @returns Quality gate result
   */
  private async runQualityGate(
    type: "typecheck" | "lint" | "test",
    command: string,
    severity: "required" | "warning"
  ): Promise<QualityGateResult> {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    // Parse command into executable and args
    // Command format: "pnpm <script>"
    const parts = command.split(" ");
    const executable = parts[0];
    const args = parts.slice(1);

    // Execute command with no-throw semantics
    const result: ExecFileResult = await execFileNoThrow(
      executable,
      args,
      120000 // 2 minute timeout for quality gates
    );

    const duration = Date.now() - startTime;
    const output = result.stdout || result.stderr || "";

    if (result.success) {
      return {
        type,
        passed: true,
        severity,
        output,
        duration,
        timestamp,
      };
    } else {
      return {
        type,
        passed: false,
        severity,
        output,
        duration,
        error: result.stderr || "Command failed",
        timestamp,
      };
    }
  }

  /**
   * Stop task execution
   *
   * Process:
   * 1. Validate task exists and is executing
   * 2. Find running wave for task
   * 3. Signal stop (mark for cancellation)
   * 4. Update task status to cancelled
   * 5. Save checkpoint
   * 6. Emit task-updated event
   *
   * Note: WaveOrchestrator does not support mid-execution cancellation
   * This implementation marks the task as cancelled and cleans up tracking
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

    // Check if wave is running
    const runningWave = this.runningWaves.get(taskId);
    if (runningWave) {
      // Clean up running wave tracking
      this.runningWaves.delete(taskId);

      if (this.config.debug) {
        console.log(`[TaskAPIHandler] Stopped wave ${runningWave.waveId} for task ${taskId}`);
      }
    }

    // Update task status to cancelled
    task.status = "cancelled";
    task.updatedAt = new Date().toISOString();

    // Save checkpoint
    checkpoint.tasks[taskIndex] = task;
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("task-updated", task);

    // Emit progress event
    this.emitProgress(taskId, {
      progress: task.progress || 0,
      message: "Task cancelled by user",
    });

    if (this.config.debug) {
      console.log(`[TaskAPIHandler] Stopped task: ${taskId}`);
    }
  }
}
