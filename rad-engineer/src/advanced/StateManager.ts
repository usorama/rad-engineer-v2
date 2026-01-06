/**
 * StateManager - Advanced Orchestrator Component
 * Phase 2: Advanced Features
 *
 * Manages wave execution state persistence and checkpointing
 * Provides save/load/compact functionality for long-running orchestrations
 *
 * Responsibilities:
 * - Save wave execution state to disk as checkpoints
 * - Load checkpoints to resume execution
 * - Compact old checkpoints to save disk space
 * - List available checkpoints
 *
 * Failure Modes:
 * - CHECKPOINT_SAVE_FAILED: Unable to write checkpoint to disk
 * - CHECKPOINT_LOAD_FAILED: Unable to read checkpoint from disk
 * - CHECKPOINT_CORRUPT: Checksum validation failed
 */

import { promises as fs } from "fs";
import { join } from "path";

/**
 * Wave execution state for checkpointing
 */
export interface WaveState {
  /** Wave number (1-indexed) */
  waveNumber: number;
  /** IDs of completed tasks */
  completedTasks: string[];
  /** IDs of failed tasks */
  failedTasks: string[];
  /** ISO timestamp of checkpoint creation */
  timestamp: string;
}

/**
 * Checkpoint metadata stored with state
 */
interface CheckpointMetadata {
  /** Wave state data */
  state: WaveState;
  /** Checksum for data integrity (simple hash) */
  checksum: string;
  /** ISO timestamp when checkpoint was saved */
  savedAt: string;
}

/**
 * Error codes for StateManager operations
 */
export enum StateManagerError {
  CHECKPOINT_SAVE_FAILED = "CHECKPOINT_SAVE_FAILED",
  CHECKPOINT_LOAD_FAILED = "CHECKPOINT_LOAD_FAILED",
  CHECKPOINT_CORRUPT = "CHECKPOINT_CORRUPT",
  INVALID_CHECKPOINT_NAME = "INVALID_CHECKPOINT_NAME",
}

/**
 * Custom error for StateManager operations
 */
export class StateManagerException extends Error {
  constructor(
    public code: StateManagerError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "StateManagerException";
  }
}

/**
 * StateManager - Manages wave execution state persistence
 *
 * Checkpoints are stored as JSON files in rad-engineer/.checkpoints/
 * Each checkpoint includes:
 * - Wave state (waveNumber, completedTasks, failedTasks, timestamp)
 * - Checksum for data integrity
 * - Metadata (savedAt timestamp)
 *
 * @example
 * ```ts
 * const manager = new StateManager();
 *
 * // Save checkpoint
 * await manager.saveCheckpoint("wave-1", {
 *   waveNumber: 1,
 *   completedTasks: ["task-1", "task-2"],
 *   failedTasks: [],
 *   timestamp: new Date().toISOString(),
 * });
 *
 * // Load checkpoint
 * const state = await manager.loadCheckpoint("wave-1");
 *
 * // List all checkpoints
 * const checkpoints = manager.listCheckpoints();
 *
 * // Remove old checkpoints (older than 7 days)
 * await manager.compactState();
 * ```
 */
export class StateManager {
  private readonly checkpointsDir: string;
  private readonly checkpointRetentionDays: number;

  constructor(config?: { checkpointsDir?: string; checkpointRetentionDays?: number }) {
    this.checkpointsDir = config?.checkpointsDir || ".checkpoints";
    this.checkpointRetentionDays = config?.checkpointRetentionDays || 7;
  }

  /**
   * Calculate simple checksum for data integrity
   *
   * @param data - Object to checksum
   * @returns Simple hash string
   */
  private calculateChecksum(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate checkpoint name
   *
   * @param name - Checkpoint name to validate
   * @returns True if valid
   * @throws StateManagerException if invalid
   */
  private validateCheckpointName(name: string): boolean {
    if (!name || typeof name !== "string") {
      throw new StateManagerException(
        StateManagerError.INVALID_CHECKPOINT_NAME,
        "Checkpoint name must be a non-empty string",
        { name }
      );
    }

    // Prevent path traversal and invalid characters
    if (name.includes("..") || name.includes("/") || name.includes("\\")) {
      throw new StateManagerException(
        StateManagerError.INVALID_CHECKPOINT_NAME,
        "Checkpoint name cannot contain path separators",
        { name }
      );
    }

    if (name.length > 255) {
      throw new StateManagerException(
        StateManagerError.INVALID_CHECKPOINT_NAME,
        "Checkpoint name too long (max 255 characters)",
        { name, length: name.length }
      );
    }

    return true;
  }

  /**
   * Ensure checkpoints directory exists
   *
   * @throws StateManagerException if directory creation fails
   */
  private async ensureCheckpointsDir(): Promise<void> {
    try {
      await fs.mkdir(this.checkpointsDir, { recursive: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new StateManagerException(
        StateManagerError.CHECKPOINT_SAVE_FAILED,
        `Failed to create checkpoints directory: ${errorMsg}`,
        { checkpointsDir: this.checkpointsDir }
      );
    }
  }

  /**
   * Get full file path for a checkpoint
   *
   * @param name - Checkpoint name
   * @returns Full file path
   */
  private getCheckpointPath(name: string): string {
    return join(this.checkpointsDir, `${name}.json`);
  }

  /**
   * Save wave execution state to disk as a checkpoint
   *
   * Process:
   * 1. Validate checkpoint name
   * 2. Ensure checkpoints directory exists
   * 3. Calculate checksum of state
   * 4. Write checkpoint metadata to disk
   *
   * @param name - Checkpoint name (without .json extension)
   * @param state - Wave state to save
   * @throws StateManagerException if save fails
   */
  async saveCheckpoint(name: string, state: WaveState): Promise<void> {
    this.validateCheckpointName(name);
    await this.ensureCheckpointsDir();

    const checksum = this.calculateChecksum(state);
    const metadata: CheckpointMetadata = {
      state,
      checksum,
      savedAt: new Date().toISOString(),
    };

    try {
      const filePath = this.getCheckpointPath(name);
      await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf-8");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new StateManagerException(
        StateManagerError.CHECKPOINT_SAVE_FAILED,
        `Failed to save checkpoint: ${errorMsg}`,
        { name, state }
      );
    }
  }

  /**
   * Load wave execution state from disk
   *
   * Process:
   * 1. Validate checkpoint name
   * 2. Read checkpoint file from disk
   * 3. Verify checksum for data integrity
   * 4. Return wave state if valid
   *
   * @param name - Checkpoint name to load
   * @returns Wave state if found, null otherwise
   * @throws StateManagerException if load fails or checksum invalid
   */
  async loadCheckpoint(name: string): Promise<WaveState | null> {
    this.validateCheckpointName(name);

    try {
      const filePath = this.getCheckpointPath(name);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const metadata: CheckpointMetadata = JSON.parse(fileContent);

      // Verify checksum
      const expectedChecksum = this.calculateChecksum(metadata.state);
      if (metadata.checksum !== expectedChecksum) {
        throw new StateManagerException(
          StateManagerError.CHECKPOINT_CORRUPT,
          `Checksum mismatch: checkpoint data may be corrupted`,
          { name, expected: expectedChecksum, actual: metadata.checksum }
        );
      }

      return metadata.state;
    } catch (error) {
      if (error instanceof StateManagerException) {
        throw error;
      }

      // File not found is not an error - return null
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new StateManagerException(
        StateManagerError.CHECKPOINT_LOAD_FAILED,
        `Failed to load checkpoint: ${errorMsg}`,
        { name }
      );
    }
  }

  /**
   * Remove old checkpoints to save disk space
   *
   * Process:
   * 1. List all checkpoint files
   * 2. Check savedAt timestamp for each
   * 3. Delete checkpoints older than retention period (default: 7 days)
   *
   * @returns Number of checkpoints removed
   * @throws StateManagerException if compaction fails
   */
  async compactState(): Promise<void> {
    try {
      await this.ensureCheckpointsDir();
      const files = await fs.readdir(this.checkpointsDir);

      const now = Date.now();
      const retentionMs = this.checkpointRetentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith(".json")) {
          continue;
        }

        const filePath = join(this.checkpointsDir, file);

        try {
          const fileContent = await fs.readFile(filePath, "utf-8");
          const metadata: CheckpointMetadata = JSON.parse(fileContent);
          const savedAt = new Date(metadata.savedAt).getTime();
          const ageMs = now - savedAt;

          // Remove if older than retention period
          if (ageMs > retentionMs) {
            await fs.unlink(filePath);
          }
        } catch {
          // Skip files that can't be read or parsed
          // Log warning but continue compaction
          console.warn(`Skipping corrupt checkpoint file: ${file}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new StateManagerException(
        StateManagerError.CHECKPOINT_LOAD_FAILED,
        `Failed to compact checkpoints: ${errorMsg}`,
        { checkpointsDir: this.checkpointsDir }
      );
    }
  }

  /**
   * List all available checkpoint names
   *
   * Process:
   * 1. List all files in checkpoints directory
   * 2. Filter for .json files
   * 3. Return names without .json extension
   *
   * @returns Array of checkpoint names (sorted alphabetically)
   */
  listCheckpoints(): string[] {
    let files: string[] = [];

    try {
      files = require("fs").readdirSync(this.checkpointsDir);
    } catch {
      // Directory doesn't exist or isn't readable
      // Return empty array (no checkpoints available)
      return [];
    }

    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort();
  }
}
