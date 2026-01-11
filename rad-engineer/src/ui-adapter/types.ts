/**
 * UI Adapter Types - Auto-Claude Integration
 *
 * Defines interfaces for communication between Auto-Claude frontend
 * and rad-engineer backend via Electron IPC
 */

import type { Wave } from "@/plan/types.js";
import type { WaveState } from "@/advanced/StateManager.js";

/**
 * Auto-Claude task status enum
 * Maps to rad-engineer wave execution states
 */
export type AutoClaudeTaskStatus =
  | "pending"      // Task created, not started
  | "in_progress"  // Task executing
  | "completed"    // Task succeeded
  | "failed"       // Task failed
  | "cancelled";   // Task cancelled by user

/**
 * Auto-Claude task specification from frontend
 * User input for creating a new task
 */
export interface AutoClaudeTaskSpec {
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
 * Auto-Claude task representation
 * Full task object with metadata
 */
export interface AutoClaudeTask {
  /** Unique task ID */
  id: string;
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Current task status */
  status: AutoClaudeTaskStatus;
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
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * Internal mapping between Auto-Claude task and rad-engineer wave
 * Used by adapter to track conversions
 */
export interface TaskWaveMapping {
  /** Auto-Claude task ID */
  taskId: string;
  /** rad-engineer Wave object */
  wave: Wave;
  /** Current wave state (if executing) */
  waveState?: WaveState;
}
