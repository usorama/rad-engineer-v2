/**
 * UI Adapter Types - rad-engineer Integration
 *
 * Defines interfaces for communication between rad-engineer frontend
 * and rad-engineer backend via Electron IPC
 */

import type { Wave } from "@/plan/types.js";
import type { WaveState } from "@/advanced/StateManager.js";

/**
 * rad-engineer task status enum
 * Maps to rad-engineer wave execution states
 */
export type RadEngineerTaskStatus =
  | "pending"      // Task created, not started
  | "in_progress"  // Task executing
  | "completed"    // Task succeeded
  | "failed"       // Task failed
  | "cancelled";   // Task cancelled by user

/**
 * rad-engineer task specification from frontend
 * User input for creating a new task
 */
export interface RadEngineerTaskSpec {
  /** Task title/name */
  title: string;
  /** Task description/prompt */
  description: string;
  /** Optional priority (1-5, 5 is highest) */
  priority?: number;
  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * rad-engineer task representation
 * Full task object with metadata
 */
export interface RadEngineerTask {
  /** Unique task ID */
  id: string;
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Current task status */
  status: RadEngineerTaskStatus;
  /** Creation timestamp (ISO) */
  createdAt: string;
  /** Last updated timestamp (ISO) */
  updatedAt: string;
  /** Optional priority */
  priority?: number;
  /** Optional tags */
  tags?: string[];
  /** Optional progress percentage (0-100) */
  progress?: number;
  /** Optional error message if failed */
  error?: string;
  /** Optional quality gates results (set after execution completes) */
  qualityGates?: QualityGatesResults;
}

/**
 * Progress event emitted during task execution
 */
export interface TaskProgressEvent {
  /** Task ID */
  taskId: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message */
  message: string;
  /** Current wave number (if applicable) */
  waveNumber?: number;
  /** Total waves (if applicable) */
  totalWaves?: number;
}

/**
 * Configuration for ElectronIPCAdapter
 */
export interface IPCAdapterConfig {
  /** Project directory path */
  projectDir: string;
  /** WaveOrchestrator instance (optional - creates default if not provided) */
  waveOrchestrator?: import("@/advanced/WaveOrchestrator.js").WaveOrchestrator;
  /** ResourceManager instance (optional - creates default if not provided) */
  resourceManager?: import("@/core/ResourceManager.js").ResourceManager;
  /** Function to get all renderer windows for event broadcasting */
  getWindows?: () => import("electron").BrowserWindow[];
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * Internal mapping between rad-engineer task and rad-engineer wave
 * Used by adapter to track conversions
 */
export interface TaskWaveMapping {
  /** rad-engineer task ID */
  taskId: string;
  /** rad-engineer Wave object */
  wave: Wave;
  /** Current wave state (if executing) */
  waveState?: WaveState;
}

/**
 * Quality gate type
 * Defines different types of quality checks
 */
export type QualityGateType = "typecheck" | "lint" | "test";

/**
 * Quality gate severity
 * Determines whether a failure blocks completion
 */
export type QualityGateSeverity = "required" | "warning";

/**
 * Individual quality gate result
 */
export interface QualityGateResult {
  /** Type of quality gate */
  type: QualityGateType;
  /** Whether the check passed */
  passed: boolean;
  /** Severity level */
  severity: QualityGateSeverity;
  /** Command output */
  output: string;
  /** Duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp when check was run */
  timestamp: string;
}

/**
 * Combined quality gates results
 */
export interface QualityGatesResults {
  /** Overall pass/fail status (all required gates must pass) */
  passed: boolean;
  /** Individual gate results */
  gates: QualityGateResult[];
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Timestamp when checks started */
  startedAt: string;
  /** Timestamp when checks completed */
  completedAt: string;
}

/**
 * Error event emitted by handlers
 * Provides user-friendly error information with actionable guidance
 */
export interface HandlerErrorEvent {
  /** Error code for categorization */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Actionable guidance for the user */
  action: string;
  /** Technical details (error message, stack trace, etc.) */
  details: string;
}
