/**
 * Step-Level Replay Types
 * Phase 1: Core Types and Interfaces
 *
 * Provides step-level granularity for execution replay and checkpointing.
 * Steps are the atomic units within tasks, enabling fine-grained resume.
 *
 * Key concepts:
 * - Step: Atomic execution unit within a task
 * - StepCheckpoint: Snapshot of step state for replay
 * - ExecutionSession: Container for a complete execution run
 * - ResumeOptions: Configuration for resuming from a checkpoint
 */

/**
 * Step type classification
 * Each step serves a specific purpose in the execution flow
 */
export type StepType =
  | "validation"    // Pre-condition validation
  | "execution"     // Main task execution
  | "quality_gate"  // Quality verification (typecheck, lint, test)
  | "checkpoint"    // State checkpoint creation
  | "transition";   // Wave/task transition

/**
 * Step execution status
 */
export type StepStatus =
  | "pending"       // Not yet started
  | "executing"     // Currently running
  | "completed"     // Successfully finished
  | "failed"        // Failed with error
  | "skipped";      // Skipped (e.g., via resume option)

/**
 * Error information for failed steps
 */
export interface StepError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Whether this error is recoverable via retry */
  recoverable: boolean;
  /** Stack trace if available */
  stack?: string;
  /** Additional context for debugging */
  context?: Record<string, unknown>;
}

/**
 * Step - Atomic execution unit within a task
 *
 * Steps provide fine-grained execution control:
 * - Each task is broken into multiple steps
 * - Steps can be checkpointed individually
 * - Execution can resume from any step
 *
 * ID format: wave-{n}-task-{id}-step-{seq}
 */
export interface Step {
  /** Unique step identifier (wave-{n}-task-{id}-step-{seq}) */
  id: string;
  /** Parent task identifier */
  taskId: string;
  /** Wave number this step belongs to */
  waveNumber: number;
  /** Sequence number within the task (1-indexed) */
  sequence: number;
  /** Step type classification */
  type: StepType;
  /** Human-readable step name */
  name: string;
  /** Current execution status */
  status: StepStatus;
  /** Input data for this step */
  input?: Record<string, unknown>;
  /** Output data from step execution */
  output?: Record<string, unknown>;
  /** Error information if step failed */
  error?: StepError;
  /** ISO timestamp when step started */
  startedAt?: string;
  /** ISO timestamp when step completed */
  completedAt?: string;
  /** Execution duration in milliseconds */
  durationMs?: number;
  /** HierarchicalMemory scope reference */
  scopeId?: string;
  /** Retry attempt number (1-indexed, 1 = first attempt) */
  attemptNumber?: number;
  /** Maximum retry attempts allowed */
  maxAttempts?: number;
}

/**
 * Memory context snapshot for checkpoint restoration
 * Captures HierarchicalMemory state at checkpoint time
 */
export interface StepMemoryContext {
  /** Active scope IDs at checkpoint time */
  activeScopeIds: string[];
  /** Scope hierarchy (parent-child relationships) */
  scopeHierarchy: Record<string, string | null>;
  /** Token usage at checkpoint time */
  tokenUsage: {
    total: number;
    used: number;
    available: number;
  };
  /** Serialized scope data for restoration */
  scopeSnapshots: Array<{
    id: string;
    goal: string;
    level: string;
    summary: string | null;
    artifacts: Record<string, unknown>;
  }>;
}

/**
 * Environment state snapshot for checkpoint restoration
 * Captures file system and git state
 */
export interface EnvironmentState {
  /** Git commit hash at checkpoint time */
  gitCommit?: string;
  /** Git branch name */
  gitBranch?: string;
  /** Modified files since last commit */
  modifiedFiles: string[];
  /** Staged files */
  stagedFiles: string[];
  /** Untracked files */
  untrackedFiles: string[];
  /** Working directory path */
  workingDirectory: string;
  /** Environment variables (filtered for safety) */
  envVars?: Record<string, string>;
}

/**
 * StepCheckpoint - Snapshot of step state for replay
 *
 * Checkpoints capture complete state for reliable restoration:
 * - Step state and prior steps
 * - Memory context (HierarchicalMemory scopes)
 * - Environment state (git, files)
 * - Checksum for integrity validation
 *
 * ID format: checkpoint-{timestamp}-{random}
 */
export interface StepCheckpoint {
  /** Unique checkpoint identifier */
  id: string;
  /** Parent session identifier */
  sessionId: string;
  /** Wave number at checkpoint time */
  waveNumber: number;
  /** Task identifier at checkpoint time */
  taskId: string;
  /** Step identifier at checkpoint time */
  stepId: string;
  /** Step sequence number */
  stepSequence: number;
  /** Current step state */
  step: Step;
  /** Previously completed steps */
  priorSteps: Step[];
  /** Memory context snapshot */
  memoryContext: StepMemoryContext;
  /** Environment state snapshot */
  environmentState: EnvironmentState;
  /** Checksum for data integrity */
  checksum: string;
  /** ISO timestamp of checkpoint creation */
  createdAt: string;
  /** Optional human-readable label */
  label?: string;
  /** Size of checkpoint data in bytes */
  sizeBytes?: number;
}

/**
 * Checkpoint summary for listing (without full data)
 */
export interface StepCheckpointSummary {
  /** Checkpoint identifier */
  id: string;
  /** Session identifier */
  sessionId: string;
  /** Step identifier */
  stepId: string;
  /** Step name */
  stepName: string;
  /** Wave number */
  waveNumber: number;
  /** Created timestamp */
  createdAt: string;
  /** Optional label */
  label?: string;
  /** Size in bytes */
  sizeBytes: number;
}

/**
 * ExecutionSession status
 */
export type SessionStatus =
  | "active"        // Currently executing
  | "paused"        // Manually paused
  | "completed"     // Successfully finished
  | "failed"        // Failed with error
  | "abandoned";    // Abandoned by user

/**
 * ExecutionSession - Container for a complete execution run
 *
 * Sessions provide execution context:
 * - Track progress through waves and tasks
 * - Maintain checkpoint history
 * - Enable session resume/replay
 */
export interface ExecutionSession {
  /** Unique session identifier */
  id: string;
  /** Execution ID from plan/execute skill */
  executionId: string;
  /** Human-readable session name */
  name: string;
  /** Session status */
  status: SessionStatus;
  /** Total number of waves */
  totalWaves: number;
  /** Current wave number (1-indexed) */
  currentWave: number;
  /** Current task identifier (null if between tasks) */
  currentTaskId: string | null;
  /** Current step identifier (null if between steps) */
  currentStepId: string | null;
  /** Checkpoint history for this session */
  checkpoints: StepCheckpointSummary[];
  /** ISO timestamp when session started */
  startedAt: string;
  /** ISO timestamp of last activity */
  lastActivityAt: string;
  /** Parent session ID if this is a resumed session */
  parentSessionId?: string;
  /** Checkpoint ID this session was resumed from */
  replayFromCheckpoint?: string;
  /** Total steps completed across all waves */
  totalStepsCompleted: number;
  /** Total steps failed */
  totalStepsFailed: number;
  /** Plan file path */
  planFile?: string;
}

/**
 * Resume options for checkpoint restoration
 */
export interface ResumeOptions {
  /** Checkpoint ID to resume from */
  checkpointId: string;
  /** Skip the failed step and continue to next */
  skipFailedStep?: boolean;
  /** Override provider/model for resume */
  overrideProvider?: {
    provider: string;
    model: string;
  };
  /** Restore file system state from checkpoint */
  restoreFiles?: boolean;
  /** Restore git state from checkpoint */
  restoreGit?: boolean;
  /** New session name (defaults to "Resumed: {original}" */
  sessionName?: string;
}

/**
 * Result of resume operation
 */
export interface ResumeResult {
  /** Whether resume was successful */
  success: boolean;
  /** New session created for resumed execution */
  session: ExecutionSession;
  /** Step to resume from */
  resumeFromStep: Step;
  /** Steps that were restored */
  restoredSteps: Step[];
  /** Warnings during resume (non-fatal issues) */
  warnings: string[];
  /** Error message if resume failed */
  error?: string;
}

/**
 * Resume decision from ResumeDecisionEngine
 */
export interface ResumeDecision {
  /** Recommended action */
  action: "resume" | "restart" | "skip" | "abort";
  /** Reason for recommendation */
  reason: string;
  /** Step to resume from (if action is "resume") */
  fromStep?: string;
  /** Steps to skip (if action is "skip") */
  skipSteps?: string[];
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Alternative actions with reasons */
  alternatives: Array<{
    action: "resume" | "restart" | "skip" | "abort";
    reason: string;
    confidence: number;
  }>;
}

/**
 * Decision log entry for transparency
 */
export interface DecisionLogEntry {
  /** Decision identifier */
  id: string;
  /** Step ID this decision was made for */
  stepId: string;
  /** ISO timestamp */
  timestamp: string;
  /** Decision category */
  category: "RETRY" | "SKIP" | "APPROACH" | "RECOVERY" | "ABORT";
  /** Decision made */
  decision: string;
  /** Rationale for the decision */
  rationale: string;
  /** Alternatives considered */
  alternatives?: string[];
  /** Confidence level (0-100) */
  confidence?: number;
  /** Evidence supporting the decision */
  evidence?: Record<string, unknown>;
}

/**
 * Verification result for pre/post conditions
 */
export interface VerificationResult {
  /** Whether verification passed */
  passed: boolean;
  /** Condition name */
  conditionName: string;
  /** Condition type */
  conditionType: "precondition" | "postcondition";
  /** Actual value observed */
  actualValue?: unknown;
  /** Expected value */
  expectedValue?: unknown;
  /** Verification message */
  message: string;
  /** Duration of verification in ms */
  durationMs: number;
}

/**
 * Error codes for step operations
 */
export enum StepError_Code {
  STEP_EXECUTION_FAILED = "STEP_EXECUTION_FAILED",
  CHECKPOINT_CREATE_FAILED = "CHECKPOINT_CREATE_FAILED",
  CHECKPOINT_RESTORE_FAILED = "CHECKPOINT_RESTORE_FAILED",
  RESUME_FAILED = "RESUME_FAILED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  CHECKPOINT_NOT_FOUND = "CHECKPOINT_NOT_FOUND",
  CHECKPOINT_CORRUPT = "CHECKPOINT_CORRUPT",
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  MAX_RETRIES_EXCEEDED = "MAX_RETRIES_EXCEEDED",
}

/**
 * Custom error for step operations
 */
export class StepException extends Error {
  constructor(
    public code: StepError_Code,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "StepException";
  }
}
