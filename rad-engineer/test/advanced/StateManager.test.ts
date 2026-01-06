/**
 * Unit tests for StateManager
 * Tests: checkpoint save/load, compaction, listing
 *
 * Coverage requirements:
 * - Unit tests: 8 tests
 * - Overall coverage: 80%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { StateManager, StateManagerException } from "@/advanced/StateManager.js";
import type { WaveState } from "@/advanced/StateManager.js";
import { promises as fs } from "fs";
import { join } from "path";

describe("StateManager: saveCheckpoint and loadCheckpoint", () => {
  let manager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test checkpoints
    tempDir = join(process.cwd(), "test-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    manager = new StateManager({ checkpointsDir: tempDir });
  });

  afterEach(async () => {
    // Clean up test checkpoints
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Saves and loads checkpoint successfully", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1", "task-2", "task-3"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await manager.saveCheckpoint("wave-1", state);
    const loaded = await manager.loadCheckpoint("wave-1");

    expect(loaded).not.toBeNull();
    expect(loaded?.waveNumber).toBe(1);
    expect(loaded?.completedTasks).toEqual(["task-1", "task-2", "task-3"]);
    expect(loaded?.failedTasks).toEqual([]);
    expect(loaded?.timestamp).toBe(state.timestamp);
  });

  it("Returns null for missing checkpoint", async () => {
    const loaded = await manager.loadCheckpoint("nonexistent");

    expect(loaded).toBeNull();
  });

  it("Overwrites existing checkpoint", async () => {
    const state1: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    const state2: WaveState = {
      waveNumber: 2,
      completedTasks: ["task-1", "task-2"],
      failedTasks: ["task-3"],
      timestamp: new Date().toISOString(),
    };

    await manager.saveCheckpoint("wave-1", state1);
    await manager.saveCheckpoint("wave-1", state2);

    const loaded = await manager.loadCheckpoint("wave-1");

    expect(loaded).not.toBeNull();
    expect(loaded?.waveNumber).toBe(2);
    expect(loaded?.completedTasks).toEqual(["task-1", "task-2"]);
    expect(loaded?.failedTasks).toEqual(["task-3"]);
  });

  it("Throws error for invalid checkpoint name (empty string)", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: [],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await expect(manager.saveCheckpoint("", state)).rejects.toThrow(StateManagerException);
    await expect(manager.saveCheckpoint("", state)).rejects.toThrow(
      "Checkpoint name must be a non-empty string"
    );
  });

  it("Throws error for invalid checkpoint name (path traversal)", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: [],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await expect(manager.saveCheckpoint("../etc/passwd", state)).rejects.toThrow(
      "Checkpoint name cannot contain path separators"
    );
  });

  it("Detects corrupt checkpoint (checksum mismatch)", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await manager.saveCheckpoint("wave-1", state);

    // Manually corrupt the checkpoint file
    const filePath = join(tempDir, "wave-1.json");
    const content = await fs.readFile(filePath, "utf-8");
    const metadata = JSON.parse(content);
    metadata.checksum = "invalid_checksum";
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf-8");

    await expect(manager.loadCheckpoint("wave-1")).rejects.toThrow(StateManagerException);
    await expect(manager.loadCheckpoint("wave-1")).rejects.toThrow("Checksum mismatch");
  });
});

describe("StateManager: compactState", () => {
  let manager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    // Use 1 day retention for faster tests
    manager = new StateManager({ checkpointsDir: tempDir, checkpointRetentionDays: 1 });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Removes old checkpoints", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    // Create an old checkpoint by manually setting savedAt
    await manager.saveCheckpoint("old-wave", state);

    const filePath = join(tempDir, "old-wave.json");
    const content = await fs.readFile(filePath, "utf-8");
    const metadata = JSON.parse(content);

    // Set savedAt to 2 days ago (older than 1 day retention)
    const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    metadata.savedAt = oldDate;
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf-8");

    // Create a recent checkpoint
    await manager.saveCheckpoint("recent-wave", state);

    // Run compaction
    await manager.compactState();

    // Old checkpoint should be removed
    await expect(manager.loadCheckpoint("old-wave")).resolves.toBeNull();

    // Recent checkpoint should still exist
    const loaded = await manager.loadCheckpoint("recent-wave");
    expect(loaded).not.toBeNull();
  });

  it("Keeps recent checkpoints", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    // Create multiple recent checkpoints
    await manager.saveCheckpoint("wave-1", state);
    await manager.saveCheckpoint("wave-2", state);
    await manager.saveCheckpoint("wave-3", state);

    // Run compaction
    await manager.compactState();

    // All checkpoints should still exist
    await expect(manager.loadCheckpoint("wave-1")).resolves.not.toBeNull();
    await expect(manager.loadCheckpoint("wave-2")).resolves.not.toBeNull();
    await expect(manager.loadCheckpoint("wave-3")).resolves.not.toBeNull();
  });
});

describe("StateManager: listCheckpoints", () => {
  let manager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    manager = new StateManager({ checkpointsDir: tempDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns empty array when no checkpoints", () => {
    const checkpoints = manager.listCheckpoints();

    expect(checkpoints).toEqual([]);
    expect(checkpoints).toHaveLength(0);
  });

  it("Lists all checkpoint names", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await manager.saveCheckpoint("wave-3", state);
    await manager.saveCheckpoint("wave-1", state);
    await manager.saveCheckpoint("wave-2", state);

    const checkpoints = manager.listCheckpoints();

    expect(checkpoints).toHaveLength(3);
    // Should be sorted alphabetically
    expect(checkpoints).toEqual(["wave-1", "wave-2", "wave-3"]);
  });

  it("Ignores non-JSON files in checkpoint directory", async () => {
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    // Create checkpoint
    await manager.saveCheckpoint("wave-1", state);

    // Create non-JSON file
    await fs.writeFile(join(tempDir, "README.md"), "# Checkpoints", "utf-8");
    await fs.writeFile(join(tempDir, "backup.txt"), "old data", "utf-8");

    const checkpoints = manager.listCheckpoints();

    // Should only list JSON files
    expect(checkpoints).toEqual(["wave-1"]);
    expect(checkpoints).not.toContain("README");
    expect(checkpoints).not.toContain("backup");
  });

  it("Handles non-existent checkpoint directory", () => {
    // Create manager with non-existent directory
    const newManager = new StateManager({
      checkpointsDir: join(process.cwd(), "nonexistent-checkpoints"),
    });

    const checkpoints = newManager.listCheckpoints();

    // Should return empty array, not throw error
    expect(checkpoints).toEqual([]);
  });
});
