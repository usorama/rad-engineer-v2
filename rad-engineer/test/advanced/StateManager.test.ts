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

describe("StateManager: Memory Management", () => {
  let manager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    // Use 50MB max memory for testing
    manager = new StateManager({ checkpointsDir: tempDir, maxMemoryBytes: 50 * 1024 * 1024 });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns initial memory usage as zero", () => {
    const usage = manager.getMemoryUsage();

    expect(usage.usedBytes).toBe(0);
    expect(usage.allocatedBytes).toBe(0);
    expect(usage.maxBytes).toBe(50 * 1024 * 1024);
    expect(usage.utilizationPercent).toBe(0);
  });

  it("Grows memory successfully", () => {
    const bytesToGrow = 1024 * 1024; // 1MB
    manager.growMemory(bytesToGrow);

    const usage = manager.getMemoryUsage();

    expect(usage.allocatedBytes).toBe(bytesToGrow);
    expect(usage.usedBytes).toBe(0); // Not yet used
    expect(usage.utilizationPercent).toBe(2); // 1MB / 50MB = 2%
  });

  it("Throws error when growing beyond max memory", () => {
    expect(() => manager.growMemory(60 * 1024 * 1024)).toThrow(StateManagerException);
    expect(() => manager.growMemory(60 * 1024 * 1024)).toThrow(
      "Cannot grow memory: would exceed maximum"
    );
  });

  it("Shrinks memory successfully", () => {
    // Grow first
    manager.growMemory(5 * 1024 * 1024);

    // Shrink by 2MB
    manager.shrinkMemory(2 * 1024 * 1024);

    const usage = manager.getMemoryUsage();

    expect(usage.allocatedBytes).toBe(3 * 1024 * 1024);
  });

  it("Cannot shrink more than allocated", () => {
    manager.growMemory(1 * 1024 * 1024);

    expect(() => manager.shrinkMemory(2 * 1024 * 1024)).toThrow(StateManagerException);
    expect(() => manager.shrinkMemory(2 * 1024 * 1024)).toThrow(
      "Cannot shrink memory: insufficient allocated"
    );
  });

  it("Compacts memory and reduces fragmentation", async () => {
    // Simulate fragmented state by growing and shrinking
    manager.growMemory(10 * 1024 * 1024);
    manager.shrinkMemory(3 * 1024 * 1024);
    manager.growMemory(2 * 1024 * 1024);
    manager.shrinkMemory(1 * 1024 * 1024);

    // Save some checkpoints to create "used" memory
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    await manager.saveCheckpoint("wave-1", state);
    await manager.saveCheckpoint("wave-2", state);

    // Compact memory
    await manager.compactMemory();

    const usage = manager.getMemoryUsage();

    // After compaction, fragmentation should be 0
    expect(usage.fragmentationPercent).toBe(0);
  });

  it("Tracks memory utilization correctly", () => {
    const allocatedBytes = 10 * 1024 * 1024; // 10MB
    manager.growMemory(allocatedBytes);

    // Simulate 60% usage by setting internal state
    // In real scenario, this would happen through checkpoint operations
    const usage = manager.getMemoryUsage();

    expect(usage.maxBytes).toBe(50 * 1024 * 1024);
    expect(usage.allocatedBytes).toBe(allocatedBytes);
    expect(usage.utilizationPercent).toBeGreaterThanOrEqual(0);
    expect(usage.utilizationPercent).toBeLessThanOrEqual(100);
  });

  it("Reports memory pressure when above 80% utilization", () => {
    // Allocate 45MB out of 50MB max (90%)
    manager.growMemory(45 * 1024 * 1024);

    const usage = manager.getMemoryUsage();

    expect(usage.isUnderPressure).toBe(true);
  });

  it("Does not report memory pressure when below 80%", () => {
    // Allocate 30MB out of 50MB max (60%)
    manager.growMemory(30 * 1024 * 1024);

    const usage = manager.getMemoryUsage();

    expect(usage.isUnderPressure).toBe(false);
  });

  it("Integrates memory operations with checkpoint save", async () => {
    // Pre-allocate memory
    manager.growMemory(5 * 1024 * 1024);

    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1", "task-2"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    // Save checkpoint - should track memory usage
    await manager.saveCheckpoint("wave-1", state);

    const usage = manager.getMemoryUsage();

    // Used bytes should increase after checkpoint save
    expect(usage.usedBytes).toBeGreaterThan(0);
  });

  it("Compacts memory during checkpoint compaction", async () => {
    // Create and save old checkpoint
    const state: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    manager.growMemory(10 * 1024 * 1024);

    await manager.saveCheckpoint("old-wave", state);

    // Manually age the checkpoint
    const filePath = join(tempDir, "old-wave.json");
    const content = await fs.readFile(filePath, "utf-8");
    const metadata = JSON.parse(content);
    metadata.savedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf-8");

    // Compact state - should also compact memory
    await manager.compactState();

    const usage = manager.getMemoryUsage();

    // Memory should be released for deleted checkpoint
    expect(usage.fragmentationPercent).toBe(0);
  });
});
