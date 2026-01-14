/**
 * StepExecutor - Step-Level Execution with Checkpointing
 * Phase 3: Advanced Features
 *
 * Provides fine-grained step execution with automatic checkpointing,
 * decision logging, and resume capabilities.
 *
 * Responsibilities:
 * - Execute steps within tasks with checkpointing
 * - Record decisions for transparency (DECISION_LOG.md)
 * - Create checkpoints for step-level replay
 * - Manage execution sessions
 *
 * Failure Modes:
 * - STEP_EXECUTION_FAILED: Step execution failed
 * - CHECKPOINT_CREATE_FAILED: Failed to create checkpoint
 * - RESUME_FAILED: Failed to resume from checkpoint
 */

import { randomUUID } from "crypto";
import type { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";
import type { StateManager } from "./StateManager.js";
import type {
  Step,
  StepType,
  StepStatus,
  StepCheckpoint,
  StepMemoryContext,
  EnvironmentState,
  ExecutionSession,
  ResumeOptions,
  ResumeResult,
  DecisionLogEntry,
  VerificationResult,
  StepError,
} from "./types/step.js";
import { StepException, StepError_Code } from "./types/step.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Configuration for StepExecutor
 */
export interface StepExecutorConfig {
  /** HierarchicalMemory instance */
  memory: HierarchicalMemory;
  /** StateManager instance */
  stateManager: StateManager;
  /** Checkpoint interval (default: 1 = every step) */
  checkpointInterval?: number;
  /** Step types that trigger automatic checkpoints */
  autoCheckpointTypes?: StepType[];
  /** Maximum retry attempts per step */
  maxRetries?: number;
  /** Working directory for environment state */
  workingDirectory?: string;
}

/**
 * Step execution context
 */
interface StepExecutionContext {
  session: ExecutionSession;
  step: Step;
  priorSteps: Step[];
}

/**
 * StepExecutor - Executes steps with checkpointing and decision logging
 *
 * @example
 * ```ts
 * const executor = new StepExecutor({
 *   memory,
 *   stateManager,
 *   checkpointInterval: 1,
 *   autoCheckpointTypes: ["execution", "quality_gate"],
 * });
 *
 * // Start a new session
 * const session = await executor.startSession("exec-123", "Feature Implementation");
 *
 * // Execute a step
 * const result = await executor.executeStep(step, async () => {
 *   // Step logic here
 *   return { success: true };
 * });
 *
 * // Create manual checkpoint
 * const checkpoint = await executor.createCheckpoint(step, "Before refactoring");
 * ```
 */
export class StepExecutor {
  private readonly memory: HierarchicalMemory;
  private readonly stateManager: StateManager;
  private readonly checkpointInterval: number;
  private readonly autoCheckpointTypes: StepType[];
  private readonly maxRetries: number;
  private readonly workingDirectory: string;

  private currentSession: ExecutionSession | null = null;
  private decisions: DecisionLogEntry[] = [];
  private stepCounter: number = 0;

  constructor(config: StepExecutorConfig) {
    this.memory = config.memory;
    this.stateManager = config.stateManager;
    this.checkpointInterval = config.checkpointInterval ?? 1;
    this.autoCheckpointTypes = config.autoCheckpointTypes ?? ["execution", "quality_gate"];
    this.maxRetries = config.maxRetries ?? 3;
    this.workingDirectory = config.workingDirectory ?? process.cwd();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Start a new execution session
   *
   * @param executionId - Execution ID from plan/execute skill
   * @param name - Human-readable session name
   * @returns New execution session
   */
  async startSession(executionId: string, name?: string): Promise<ExecutionSession> {
    const sessionId = `session-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const session: ExecutionSession = {
      id: sessionId,
      executionId,
      name: name ?? `Execution ${executionId}`,
      status: "active",
      totalWaves: 0,
      currentWave: 0,
      currentTaskId: null,
      currentStepId: null,
      checkpoints: [],
      startedAt: now,
      lastActivityAt: now,
      totalStepsCompleted: 0,
      totalStepsFailed: 0,
    };

    await this.stateManager.saveSession(session);
    this.currentSession = session;
    this.decisions = [];
    this.stepCounter = 0;

    return session;
  }

  /**
   * Get the current session
   */
  getCurrentSession(): ExecutionSession | null {
    return this.currentSession;
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    status: ExecutionSession["status"],
    updates?: Partial<ExecutionSession>
  ): Promise<void> {
    if (!this.currentSession) {
      throw new StepException(
        StepError_Code.SESSION_NOT_FOUND,
        "No active session"
      );
    }

    this.currentSession = {
      ...this.currentSession,
      ...updates,
      status,
      lastActivityAt: new Date().toISOString(),
    };

    await this.stateManager.saveSession(this.currentSession);
  }

  /**
   * Resume execution from a checkpoint
   *
   * @param options - Resume options
   * @returns Resume result
   */
  async resumeFromCheckpoint(options: ResumeOptions): Promise<ResumeResult> {
    const warnings: string[] = [];

    // Load the checkpoint
    const checkpoint = await this.stateManager.loadStepCheckpoint(options.checkpointId);
    if (!checkpoint) {
      throw new StepException(
        StepError_Code.CHECKPOINT_NOT_FOUND,
        `Checkpoint not found: ${options.checkpointId}`,
        { checkpointId: options.checkpointId }
      );
    }

    // Create a new session for the resumed execution
    const now = new Date().toISOString();
    const sessionId = `session-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const sessionName = options.sessionName ?? `Resumed: ${checkpoint.sessionId}`;

    const session: ExecutionSession = {
      id: sessionId,
      executionId: checkpoint.sessionId, // Use original execution ID
      name: sessionName,
      status: "active",
      totalWaves: checkpoint.waveNumber + 1, // At least the wave we're resuming
      currentWave: checkpoint.waveNumber,
      currentTaskId: checkpoint.taskId,
      currentStepId: checkpoint.stepId,
      checkpoints: [],
      startedAt: now,
      lastActivityAt: now,
      parentSessionId: checkpoint.sessionId,
      replayFromCheckpoint: options.checkpointId,
      totalStepsCompleted: checkpoint.priorSteps.filter((s) => s.status === "completed").length,
      totalStepsFailed: checkpoint.priorSteps.filter((s) => s.status === "failed").length,
    };

    // Restore git state if requested
    if (options.restoreGit && checkpoint.environmentState.gitCommit) {
      try {
        await execAsync(`git checkout ${checkpoint.environmentState.gitCommit}`, {
          cwd: this.workingDirectory,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to restore git state: ${msg}`);
      }
    }

    // Determine the step to resume from
    let resumeFromStep = checkpoint.step;
    if (options.skipFailedStep && checkpoint.step.status === "failed") {
      // Create a new step after the failed one
      resumeFromStep = {
        ...checkpoint.step,
        id: `${checkpoint.step.id}-resumed`,
        status: "pending",
        error: undefined,
        startedAt: undefined,
        completedAt: undefined,
        durationMs: undefined,
      };
    }

    // Save the new session
    await this.stateManager.saveSession(session);
    this.currentSession = session;
    this.decisions = [];

    // Record the resume decision
    this.recordDecision(
      resumeFromStep.id,
      "RECOVERY",
      `Resumed from checkpoint ${options.checkpointId}`,
      `Checkpoint was at step ${checkpoint.step.name} in wave ${checkpoint.waveNumber}`,
      options.skipFailedStep ? ["Skip failed step", "Restart from beginning"] : ["Restart from beginning"],
      95
    );

    return {
      success: true,
      session,
      resumeFromStep,
      restoredSteps: checkpoint.priorSteps,
      warnings,
    };
  }

  // ============================================================================
  // Step Execution
  // ============================================================================

  /**
   * Execute a step with automatic checkpointing
   *
   * @param step - Step to execute
   * @param executor - Async function that performs the step
   * @returns Step result and updated step
   */
  async executeStep<T>(
    step: Step,
    executor: () => Promise<T>
  ): Promise<{ result: T; step: Step }> {
    if (!this.currentSession) {
      throw new StepException(
        StepError_Code.SESSION_NOT_FOUND,
        "No active session - call startSession first"
      );
    }

    const startTime = Date.now();
    const updatedStep: Step = {
      ...step,
      status: "executing",
      startedAt: new Date().toISOString(),
      attemptNumber: (step.attemptNumber ?? 0) + 1,
      maxAttempts: step.maxAttempts ?? this.maxRetries,
    };

    // Update session
    this.currentSession.currentStepId = step.id;
    this.currentSession.lastActivityAt = new Date().toISOString();

    try {
      // Execute the step
      const result = await executor();

      // Mark as completed
      updatedStep.status = "completed";
      updatedStep.completedAt = new Date().toISOString();
      updatedStep.durationMs = Date.now() - startTime;
      updatedStep.output = result as Record<string, unknown>;

      // Update session counts
      this.currentSession.totalStepsCompleted++;
      this.stepCounter++;

      // Create checkpoint if needed
      if (this.shouldCreateCheckpoint(updatedStep)) {
        await this.createCheckpoint(updatedStep);
      }

      await this.stateManager.saveSession(this.currentSession);

      return { result, step: updatedStep };
    } catch (error) {
      // Mark as failed
      updatedStep.status = "failed";
      updatedStep.completedAt = new Date().toISOString();
      updatedStep.durationMs = Date.now() - startTime;
      updatedStep.error = this.createStepError(error);

      // Update session counts
      this.currentSession.totalStepsFailed++;

      // Always checkpoint on failure for recovery
      await this.createCheckpoint(updatedStep, "Failure checkpoint");

      await this.stateManager.saveSession(this.currentSession);

      throw new StepException(
        StepError_Code.STEP_EXECUTION_FAILED,
        `Step execution failed: ${updatedStep.error.message}`,
        { stepId: step.id, error: updatedStep.error }
      );
    }
  }

  /**
   * Create a step error from an exception
   */
  private createStepError(error: unknown): StepError {
    if (error instanceof Error) {
      return {
        code: error.name,
        message: error.message,
        recoverable: this.isRecoverableError(error),
        stack: error.stack,
      };
    }
    return {
      code: "UNKNOWN_ERROR",
      message: String(error),
      recoverable: false,
    };
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    // Network errors, timeouts, and transient failures are recoverable
    const recoverablePatterns = [
      /timeout/i,
      /network/i,
      /ECONNREFUSED/,
      /ECONNRESET/,
      /ETIMEDOUT/,
      /rate.?limit/i,
      /429/,
      /503/,
    ];
    return recoverablePatterns.some((p) => p.test(error.message) || p.test(error.name));
  }

  /**
   * Check if a checkpoint should be created
   */
  private shouldCreateCheckpoint(step: Step): boolean {
    // Always checkpoint on configured types
    if (this.autoCheckpointTypes.includes(step.type)) {
      return true;
    }

    // Checkpoint at interval
    return this.stepCounter % this.checkpointInterval === 0;
  }

  // ============================================================================
  // Checkpointing
  // ============================================================================

  /**
   * Create a checkpoint for the current step
   *
   * @param step - Step to checkpoint
   * @param label - Optional label for the checkpoint
   * @returns Created checkpoint
   */
  async createCheckpoint(step: Step, label?: string): Promise<StepCheckpoint> {
    if (!this.currentSession) {
      throw new StepException(
        StepError_Code.SESSION_NOT_FOUND,
        "No active session"
      );
    }

    const checkpointId = `checkpoint-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Capture memory context
    const memoryContext = await this.captureMemoryContext();

    // Capture environment state
    const environmentState = await this.captureEnvironmentState();

    // Get prior steps from session (would need to track these)
    const priorSteps: Step[] = []; // In real impl, track executed steps

    // Create checkpoint data (without checksum)
    const checkpointData = {
      id: checkpointId,
      sessionId: this.currentSession.id,
      waveNumber: this.currentSession.currentWave,
      taskId: step.taskId,
      stepId: step.id,
      stepSequence: step.sequence,
      step,
      priorSteps,
      memoryContext,
      environmentState,
      createdAt: new Date().toISOString(),
      label,
    };

    // Calculate checksum
    const checksum = this.calculateChecksum(checkpointData);

    const checkpoint: StepCheckpoint = {
      ...checkpointData,
      checksum,
    };

    // Save checkpoint
    await this.stateManager.saveStepCheckpoint(checkpoint);

    // Update session
    const summary = {
      id: checkpointId,
      sessionId: this.currentSession.id,
      stepId: step.id,
      stepName: step.name,
      waveNumber: this.currentSession.currentWave,
      createdAt: checkpoint.createdAt,
      label,
      sizeBytes: JSON.stringify(checkpoint).length,
    };
    this.currentSession.checkpoints.push(summary);
    await this.stateManager.saveSession(this.currentSession);

    return checkpoint;
  }

  /**
   * Capture the current memory context
   */
  private async captureMemoryContext(): Promise<StepMemoryContext> {
    // Get active scopes from HierarchicalMemory
    // This is a simplified implementation - actual impl would use memory API
    return {
      activeScopeIds: [],
      scopeHierarchy: {},
      tokenUsage: {
        total: 0,
        used: 0,
        available: 0,
      },
      scopeSnapshots: [],
    };
  }

  /**
   * Capture the current environment state
   */
  private async captureEnvironmentState(): Promise<EnvironmentState> {
    const state: EnvironmentState = {
      modifiedFiles: [],
      stagedFiles: [],
      untrackedFiles: [],
      workingDirectory: this.workingDirectory,
    };

    try {
      // Get git status
      const { stdout: gitStatus } = await execAsync("git status --porcelain", {
        cwd: this.workingDirectory,
      });

      // Parse git status
      const lines = gitStatus.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const status = line.slice(0, 2);
        const file = line.slice(3);

        if (status.includes("M")) {
          state.modifiedFiles.push(file);
        }
        if (status[0] !== " " && status[0] !== "?") {
          state.stagedFiles.push(file);
        }
        if (status === "??") {
          state.untrackedFiles.push(file);
        }
      }

      // Get current commit
      const { stdout: commit } = await execAsync("git rev-parse HEAD", {
        cwd: this.workingDirectory,
      });
      state.gitCommit = commit.trim();

      // Get current branch
      const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.workingDirectory,
      });
      state.gitBranch = branch.trim();
    } catch {
      // Git commands may fail if not in a git repo
      // That's ok - return state without git info
    }

    return state;
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ============================================================================
  // Decision Logging
  // ============================================================================

  /**
   * Record a decision for transparency
   *
   * @param stepId - Step ID this decision was made for
   * @param category - Decision category
   * @param decision - The decision made
   * @param rationale - Reason for the decision
   * @param alternatives - Alternatives considered
   * @param confidence - Confidence level (0-100)
   */
  recordDecision(
    stepId: string,
    category: DecisionLogEntry["category"],
    decision: string,
    rationale: string,
    alternatives?: string[],
    confidence?: number
  ): void {
    const entry: DecisionLogEntry = {
      id: `decision-${Date.now()}-${randomUUID().slice(0, 8)}`,
      stepId,
      timestamp: new Date().toISOString(),
      category,
      decision,
      rationale,
      alternatives,
      confidence,
    };

    this.decisions.push(entry);
  }

  /**
   * Get all decisions for the current session
   */
  getDecisions(): DecisionLogEntry[] {
    return [...this.decisions];
  }

  /**
   * Export decisions as DECISION_LOG.md format
   */
  exportDecisionLog(): string {
    const lines: string[] = [
      "# Decision Log",
      "",
      `Session: ${this.currentSession?.id ?? "Unknown"}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "---",
      "",
    ];

    for (const entry of this.decisions) {
      lines.push(`## ${entry.timestamp.slice(0, 19).replace("T", " ")} | ${entry.category}`);
      lines.push("");
      lines.push(`**Step:** ${entry.stepId}`);
      lines.push("");
      lines.push(`**Decision:** ${entry.decision}`);
      lines.push("");
      lines.push(`**Rationale:** ${entry.rationale}`);
      lines.push("");

      if (entry.alternatives && entry.alternatives.length > 0) {
        lines.push("**Alternatives Considered:**");
        for (const alt of entry.alternatives) {
          lines.push(`- ${alt}`);
        }
        lines.push("");
      }

      if (entry.confidence !== undefined) {
        lines.push(`**Confidence:** ${entry.confidence}%`);
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }

    return lines.join("\n");
  }

  // ============================================================================
  // Verification
  // ============================================================================

  /**
   * Run a verification check
   *
   * @param name - Verification name
   * @param type - Precondition or postcondition
   * @param check - Async function that returns true if verification passes
   * @returns Verification result
   */
  async runVerification(
    name: string,
    type: "precondition" | "postcondition",
    check: () => Promise<boolean>
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      const passed = await check();
      return {
        passed,
        conditionName: name,
        conditionType: type,
        message: passed ? `${name}: Passed` : `${name}: Failed`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        conditionName: name,
        conditionType: type,
        message: `${name}: Error - ${msg}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Create a step with standard fields
   *
   * @param taskId - Parent task ID
   * @param waveNumber - Wave number
   * @param sequence - Step sequence
   * @param type - Step type
   * @param name - Step name
   * @returns New step
   */
  createStep(
    taskId: string,
    waveNumber: number,
    sequence: number,
    type: StepType,
    name: string
  ): Step {
    return {
      id: `wave-${waveNumber}-task-${taskId}-step-${sequence}`,
      taskId,
      waveNumber,
      sequence,
      type,
      name,
      status: "pending",
    };
  }
}
