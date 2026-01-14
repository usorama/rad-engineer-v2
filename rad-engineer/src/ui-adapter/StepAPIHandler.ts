/**
 * StepAPIHandler - Step-Level Replay and Visibility
 * Phase 5: UI Integration Layer
 *
 * Implements 8 IPC channels for step-level visibility and replay:
 * 1. getStepsByTask - Get all steps for a task
 * 2. getStepStatus - Get single step status
 * 3. getStepEvidence - Get step execution evidence
 * 4. getCheckpoints - List available checkpoints
 * 5. createCheckpoint - Create step checkpoint
 * 6. restoreCheckpoint - Restore from checkpoint
 * 7. replayFromStep - Resume execution from specific step
 * 8. getVerificationDetails - Get pre/post condition details
 *
 * Real-time events:
 * - step-started: Step execution started
 * - step-progress: Step progress update
 * - step-phase-changed: Step phase changed (preconditions/executing/postconditions)
 * - step-completed: Step execution completed
 * - verification-result: Verification check result
 * - checkpoint-created: Checkpoint created
 */

import { EventEmitter } from "events";
import type { StateManager } from "@/advanced/StateManager.js";
import type { StepExecutor } from "@/advanced/StepExecutor.js";
import type { ResumeDecisionEngine } from "@/advanced/ResumeDecisionEngine.js";
import type {
  Step,
  StepCheckpoint,
  StepCheckpointSummary,
  ExecutionSession,
  ResumeOptions,
  ResumeResult,
  ResumeDecision,
  VerificationResult,
  DecisionLogEntry,
} from "@/advanced/types/step.js";

/**
 * Configuration for StepAPIHandler
 */
export interface StepAPIHandlerConfig {
  /** StateManager instance */
  stateManager: StateManager;
  /** StepExecutor instance (optional) */
  stepExecutor?: StepExecutor;
  /** ResumeDecisionEngine instance (optional) */
  resumeDecisionEngine?: ResumeDecisionEngine;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Step status for UI display
 */
export interface StepUIStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  phase: "pending" | "preconditions" | "executing" | "postconditions" | "completed" | "failed";
  progress: number;
  attemptNumber: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

/**
 * Step evidence for transparency
 */
export interface StepEvidence {
  stepId: string;
  preconditions: VerificationResult[];
  postconditions: VerificationResult[];
  decisions: DecisionLogEntry[];
  output?: Record<string, unknown>;
  error?: { code: string; message: string };
}

/**
 * Events emitted by StepAPIHandler
 */
export interface StepAPIEvents {
  "step-started": (event: StepEvent) => void;
  "step-progress": (event: StepProgressEvent) => void;
  "step-phase-changed": (event: StepPhaseEvent) => void;
  "step-completed": (event: StepEvent) => void;
  "verification-result": (event: VerificationEvent) => void;
  "checkpoint-created": (event: CheckpointEvent) => void;
}

export interface StepEvent {
  stepId: string;
  taskId: string;
  stepName: string;
  status: string;
  timestamp: string;
}

export interface StepProgressEvent {
  stepId: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface StepPhaseEvent {
  stepId: string;
  phase: string;
  timestamp: string;
}

export interface VerificationEvent {
  stepId: string;
  conditionName: string;
  conditionType: string;
  passed: boolean;
  message: string;
  timestamp: string;
}

export interface CheckpointEvent {
  checkpointId: string;
  stepId: string;
  label?: string;
  timestamp: string;
}

/**
 * StepAPIHandler - Provides IPC channels for step-level visibility and replay
 *
 * @example
 * ```ts
 * const handler = new StepAPIHandler({ stateManager, stepExecutor });
 *
 * // Get all steps for a task
 * const steps = await handler.getStepsByTask("task-123");
 *
 * // Get checkpoint recommendation
 * const decision = await handler.getResumeRecommendation("checkpoint-456");
 *
 * // Resume from checkpoint
 * const result = await handler.replayFromStep({
 *   checkpointId: "checkpoint-456",
 *   skipFailedStep: true,
 * });
 * ```
 */
export class StepAPIHandler extends EventEmitter {
  private readonly stateManager: StateManager;
  private readonly stepExecutor?: StepExecutor;
  private readonly resumeDecisionEngine?: ResumeDecisionEngine;
  private readonly debug: boolean;

  // In-memory step tracking (would be populated by StepExecutor events)
  private stepsByTask: Map<string, Step[]> = new Map();
  private stepEvidence: Map<string, StepEvidence> = new Map();

  constructor(config: StepAPIHandlerConfig) {
    super();
    this.stateManager = config.stateManager;
    this.stepExecutor = config.stepExecutor;
    this.resumeDecisionEngine = config.resumeDecisionEngine;
    this.debug = config.debug ?? false;
  }

  // ============================================================================
  // IPC Channel 1: getStepsByTask
  // ============================================================================

  /**
   * Get all steps for a task
   *
   * @param taskId - Task ID
   * @returns Array of steps
   */
  async getStepsByTask(taskId: string): Promise<StepUIStatus[]> {
    const steps = this.stepsByTask.get(taskId) ?? [];
    return steps.map(this.stepToUIStatus);
  }

  // ============================================================================
  // IPC Channel 2: getStepStatus
  // ============================================================================

  /**
   * Get status for a single step
   *
   * @param stepId - Step ID
   * @returns Step status
   */
  async getStepStatus(stepId: string): Promise<StepUIStatus | null> {
    // Find step across all tasks
    for (const steps of this.stepsByTask.values()) {
      const step = steps.find((s) => s.id === stepId);
      if (step) {
        return this.stepToUIStatus(step);
      }
    }
    return null;
  }

  // ============================================================================
  // IPC Channel 3: getStepEvidence
  // ============================================================================

  /**
   * Get execution evidence for a step
   *
   * @param stepId - Step ID
   * @returns Step evidence
   */
  async getStepEvidence(stepId: string): Promise<StepEvidence | null> {
    return this.stepEvidence.get(stepId) ?? null;
  }

  // ============================================================================
  // IPC Channel 4: getCheckpoints
  // ============================================================================

  /**
   * List available checkpoints for a session
   *
   * @param sessionId - Session ID
   * @returns Array of checkpoint summaries
   */
  async getCheckpoints(sessionId: string): Promise<StepCheckpointSummary[]> {
    return this.stateManager.listStepCheckpoints(sessionId);
  }

  // ============================================================================
  // IPC Channel 5: createCheckpoint
  // ============================================================================

  /**
   * Create a checkpoint for the current step
   *
   * @param stepId - Step ID to checkpoint
   * @param label - Optional label
   * @returns Created checkpoint ID
   */
  async createCheckpoint(stepId: string, label?: string): Promise<string | null> {
    if (!this.stepExecutor) {
      this.log("StepExecutor not available for checkpoint creation");
      return null;
    }

    // Find the step
    let step: Step | undefined;
    for (const steps of this.stepsByTask.values()) {
      step = steps.find((s) => s.id === stepId);
      if (step) break;
    }

    if (!step) {
      this.log(`Step not found: ${stepId}`);
      return null;
    }

    const checkpoint = await this.stepExecutor.createCheckpoint(step, label);

    this.emit("checkpoint-created", {
      checkpointId: checkpoint.id,
      stepId,
      label,
      timestamp: new Date().toISOString(),
    });

    return checkpoint.id;
  }

  // ============================================================================
  // IPC Channel 6: restoreCheckpoint
  // ============================================================================

  /**
   * Restore from a checkpoint (preview mode - doesn't execute)
   *
   * @param checkpointId - Checkpoint ID
   * @returns Checkpoint details and resume recommendation
   */
  async restoreCheckpoint(checkpointId: string): Promise<{
    checkpoint: StepCheckpoint;
    recommendation: ResumeDecision;
  } | null> {
    const checkpoint = await this.stateManager.loadStepCheckpoint(checkpointId);
    if (!checkpoint) {
      return null;
    }

    const recommendation = this.resumeDecisionEngine
      ? this.resumeDecisionEngine.analyzeCheckpoint(checkpoint)
      : {
          action: "resume" as const,
          reason: "Default recommendation: resume from checkpoint",
          fromStep: checkpoint.stepId,
          confidence: 0.7,
          alternatives: [],
        };

    return { checkpoint, recommendation };
  }

  // ============================================================================
  // IPC Channel 7: replayFromStep
  // ============================================================================

  /**
   * Resume execution from a specific checkpoint
   *
   * @param options - Resume options
   * @returns Resume result
   */
  async replayFromStep(options: ResumeOptions): Promise<ResumeResult | null> {
    if (!this.stepExecutor) {
      this.log("StepExecutor not available for replay");
      return null;
    }

    return this.stepExecutor.resumeFromCheckpoint(options);
  }

  // ============================================================================
  // IPC Channel 8: getVerificationDetails
  // ============================================================================

  /**
   * Get pre/post condition verification details for a step
   *
   * @param stepId - Step ID
   * @returns Verification results
   */
  async getVerificationDetails(stepId: string): Promise<{
    preconditions: VerificationResult[];
    postconditions: VerificationResult[];
  } | null> {
    const evidence = this.stepEvidence.get(stepId);
    if (!evidence) {
      return null;
    }

    return {
      preconditions: evidence.preconditions,
      postconditions: evidence.postconditions,
    };
  }

  // ============================================================================
  // Additional Query Methods
  // ============================================================================

  /**
   * Get resume recommendation for a checkpoint
   */
  async getResumeRecommendation(checkpointId: string): Promise<ResumeDecision | null> {
    const checkpoint = await this.stateManager.loadStepCheckpoint(checkpointId);
    if (!checkpoint || !this.resumeDecisionEngine) {
      return null;
    }

    return this.resumeDecisionEngine.analyzeCheckpoint(checkpoint);
  }

  /**
   * Get decision log for the current session
   */
  getDecisionLog(): DecisionLogEntry[] {
    return this.stepExecutor?.getDecisions() ?? [];
  }

  /**
   * Export decision log as markdown
   */
  exportDecisionLog(): string {
    return this.stepExecutor?.exportDecisionLog() ?? "# Decision Log\n\nNo decisions recorded.";
  }

  // ============================================================================
  // Event Broadcast Methods (called by StepExecutor)
  // ============================================================================

  /**
   * Broadcast step started event
   */
  broadcastStepStarted(step: Step): void {
    const event: StepEvent = {
      stepId: step.id,
      taskId: step.taskId,
      stepName: step.name,
      status: step.status,
      timestamp: new Date().toISOString(),
    };
    this.emit("step-started", event);
  }

  /**
   * Broadcast step progress event
   */
  broadcastStepProgress(stepId: string, progress: number, message: string): void {
    const event: StepProgressEvent = {
      stepId,
      progress,
      message,
      timestamp: new Date().toISOString(),
    };
    this.emit("step-progress", event);
  }

  /**
   * Broadcast step phase changed event
   */
  broadcastStepPhaseChanged(stepId: string, phase: string): void {
    const event: StepPhaseEvent = {
      stepId,
      phase,
      timestamp: new Date().toISOString(),
    };
    this.emit("step-phase-changed", event);
  }

  /**
   * Broadcast step completed event
   */
  broadcastStepCompleted(step: Step): void {
    const event: StepEvent = {
      stepId: step.id,
      taskId: step.taskId,
      stepName: step.name,
      status: step.status,
      timestamp: new Date().toISOString(),
    };
    this.emit("step-completed", event);
  }

  /**
   * Broadcast verification result event
   */
  broadcastVerificationResult(stepId: string, result: VerificationResult): void {
    const event: VerificationEvent = {
      stepId,
      conditionName: result.conditionName,
      conditionType: result.conditionType,
      passed: result.passed,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
    this.emit("verification-result", event);
  }

  // ============================================================================
  // Internal State Management
  // ============================================================================

  /**
   * Register steps for a task
   */
  registerSteps(taskId: string, steps: Step[]): void {
    this.stepsByTask.set(taskId, steps);
  }

  /**
   * Update step status
   */
  updateStep(step: Step): void {
    const steps = this.stepsByTask.get(step.taskId);
    if (steps) {
      const index = steps.findIndex((s) => s.id === step.id);
      if (index >= 0) {
        steps[index] = step;
      }
    }
  }

  /**
   * Store step evidence
   */
  storeEvidence(stepId: string, evidence: StepEvidence): void {
    this.stepEvidence.set(stepId, evidence);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private stepToUIStatus(step: Step): StepUIStatus {
    return {
      id: step.id,
      name: step.name,
      type: step.type,
      status: step.status,
      phase: this.getStepPhase(step),
      progress: this.getStepProgress(step),
      attemptNumber: step.attemptNumber ?? 1,
      maxAttempts: step.maxAttempts ?? 3,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      durationMs: step.durationMs,
      error: step.error?.message,
    };
  }

  private getStepPhase(step: Step): StepUIStatus["phase"] {
    if (step.status === "pending") return "pending";
    if (step.status === "completed") return "completed";
    if (step.status === "failed") return "failed";
    // Default to executing for in-progress steps
    return "executing";
  }

  private getStepProgress(step: Step): number {
    if (step.status === "pending") return 0;
    if (step.status === "completed") return 100;
    if (step.status === "failed") return 100;
    // Default 50% for executing
    return 50;
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[StepAPIHandler] ${message}`);
    }
  }
}
