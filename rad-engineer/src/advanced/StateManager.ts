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
 * In-memory state tracking for buffers and allocations
 */
export interface MemoryState {
  /** Currently allocated bytes for in-memory buffers */
  allocatedBytes: number;
  /** Actually used bytes (subset of allocated) */
  usedBytes: number;
  /** Maximum allowed memory bytes */
  maxBytes: number;
  /** Fragmentation percentage (0-100) */
  fragmentationPercent: number;
  /** Memory utilization percentage (0-100) */
  utilizationPercent: number;
  /** Whether memory is under pressure (> 80% utilization) */
  isUnderPressure: boolean;
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
  MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED",
  INSUFFICIENT_MEMORY = "INSUFFICIENT_MEMORY",
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
  private readonly maxMemoryBytes: number;

  // In-memory state tracking
  private memoryAllocated: number = 0;
  private memoryUsed: number = 0;
  private memoryFragments: number = 0;

  constructor(config?: {
    checkpointsDir?: string;
    checkpointRetentionDays?: number;
    maxMemoryBytes?: number;
  }) {
    this.checkpointsDir = config?.checkpointsDir || ".checkpoints";
    this.checkpointRetentionDays = config?.checkpointRetentionDays || 7;
    this.maxMemoryBytes = config?.maxMemoryBytes || 100 * 1024 * 1024; // Default 100MB
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
      const content = JSON.stringify(metadata, null, 2);
      await fs.writeFile(filePath, content, "utf-8");

      // Track memory usage for checkpoint
      const checkpointSize = Buffer.byteLength(content, "utf-8");
      this.memoryUsed += checkpointSize;
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
            // Track memory release
            const checkpointSize = Buffer.byteLength(fileContent, "utf-8");
            this.memoryUsed = Math.max(0, this.memoryUsed - checkpointSize);

            await fs.unlink(filePath);
          }
        } catch {
          // Skip files that can't be read or parsed
          // Log warning but continue compaction
          console.warn(`Skipping corrupt checkpoint file: ${file}`);
        }
      }

      // Compact memory after checkpoint cleanup
      await this.compactMemory();
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

  /**
   * Allocate more memory for in-memory state buffers
   *
   * Process:
   * 1. Check if allocation would exceed maxMemoryBytes
   * 2. Increase allocated memory counter
   * 3. Track fragmentation
   *
   * @param bytes - Number of bytes to allocate
   * @throws StateManagerException if allocation would exceed maximum
   */
  growMemory(bytes: number): void {
    if (this.memoryAllocated + bytes > this.maxMemoryBytes) {
      throw new StateManagerException(
        StateManagerError.MEMORY_LIMIT_EXCEEDED,
        `Cannot grow memory: would exceed maximum (${this.maxMemoryBytes} bytes)`,
        {
          requested: bytes,
          current: this.memoryAllocated,
          max: this.maxMemoryBytes,
        }
      );
    }

    this.memoryAllocated += bytes;
    this.memoryFragments++;
  }

  /**
   * Release memory when idle
   *
   * Process:
   * 1. Check if sufficient memory is allocated
   * 2. Decrease allocated memory counter
   * 3. Track fragmentation
   *
   * @param bytes - Number of bytes to release
   * @throws StateManagerException if insufficient memory allocated
   */
  shrinkMemory(bytes: number): void {
    if (bytes > this.memoryAllocated) {
      throw new StateManagerException(
        StateManagerError.INSUFFICIENT_MEMORY,
        `Cannot shrink memory: insufficient allocated (${this.memoryAllocated} bytes available)`,
        {
          requested: bytes,
          available: this.memoryAllocated,
        }
      );
    }

    this.memoryAllocated -= bytes;
    this.memoryFragments++;
  }

  /**
   * Defragment and consolidate in-memory state
   *
   * Process:
   * 1. Analyze memory fragmentation
   * 2. Consolidate fragmented buffers
   * 3. Reset fragmentation counter
   *
   * @returns Promise that resolves when compaction is complete
   */
  async compactMemory(): Promise<void> {
    // Simulate memory defragmentation
    // In a real implementation, this would:
    // 1. Identify fragmented memory blocks
    // 2. Copy active data to contiguous regions
    // 3. Release fragmented blocks

    // Reset fragmentation
    this.memoryFragments = 0;

    // Compact used memory to match actual checkpoint data
    // This is a simplified implementation
    // In production, you'd scan checkpoints and recalculate precise memory usage
  }

  /**
   * Get current memory usage statistics
   *
   * @returns MemoryState with current statistics
   */
  getMemoryUsage(): MemoryState {
    const utilizationPercent =
      this.maxMemoryBytes > 0 ? (this.memoryAllocated / this.maxMemoryBytes) * 100 : 0;

    const fragmentationPercent =
      this.memoryAllocated > 0
        ? Math.min(100, (this.memoryFragments / (this.memoryAllocated / 1024)) * 100)
        : 0;

    return {
      allocatedBytes: this.memoryAllocated,
      usedBytes: this.memoryUsed,
      maxBytes: this.maxMemoryBytes,
      fragmentationPercent: Math.round(fragmentationPercent),
      utilizationPercent: Math.round(utilizationPercent),
      isUnderPressure: utilizationPercent > 80,
    };
  }
}
