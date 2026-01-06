/**
 * StateManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { StateManager } from "../../src/adaptive/StateManager.js";
import { PerformanceStore } from "../../src/adaptive/PerformanceStore.js";
import { tmpdir } from "os";

describe("StateManager", () => {
  let store: PerformanceStore;
  let manager: StateManager;
  let tempPath: string;

  beforeEach(() => {
    store = new PerformanceStore();
    tempPath = `${tmpdir}/evals-test-${Date.now()}.json`;
    manager = new StateManager(store, {
      path: tempPath,
      autoSave: false,
    });
  });

  afterEach(() => {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  });

  it("should save state to disk", async () => {
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    await manager.save();

    expect(existsSync(tempPath)).toBe(true);
  });

  it("should load state from disk", async () => {
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    await manager.save();

    // Create new store and load
    const newStore = new PerformanceStore();
    const newManager = new StateManager(newStore, { path: tempPath });
    await newManager.load();

    const stats = newStore.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
    expect(stats).toBeDefined();
    expect(stats?.success).toBe(1);
  });

  it("should export to JSON file", async () => {
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    const exportPath = `${tmpdir}/export-test-${Date.now()}.json`;

    try {
      await manager.exportToFile(exportPath, "json");

      expect(existsSync(exportPath)).toBe(true);
    } finally {
      if (existsSync(exportPath)) {
        unlinkSync(exportPath);
      }
    }
  });

  it("should export to YAML file", async () => {
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    const exportPath = `${tmpdir}/export-test-${Date.now()}.yaml`;

    try {
      await manager.exportToFile(exportPath, "yaml");

      expect(existsSync(exportPath)).toBe(true);
    } finally {
      if (existsSync(exportPath)) {
        unlinkSync(exportPath);
      }
    }
  });

  it("should import from JSON file", async () => {
    // Create export file
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    const exportPath = `${tmpdir}/import-test-${Date.now()}.json`;

    try {
      await manager.exportToFile(exportPath, "json");

      // Create new store and import
      const newStore = new PerformanceStore();
      const newManager = new StateManager(newStore, { path: tempPath });
      await newManager.importFromFile(exportPath);

      const stats = newStore.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      expect(stats).toBeDefined();
      expect(stats?.success).toBe(1);
    } finally {
      if (existsSync(exportPath)) {
        unlinkSync(exportPath);
      }
    }
  });

  it("should reset state", async () => {
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    await manager.reset();

    const stats = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
    expect(stats).toBeUndefined();
  });

  it("should get state summary", async () => {
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code",
      0.5,
      true,
      0.003,
      0.9,
      1200
    );

    const summary = manager.getSummary();

    expect(summary.statsCount).toBe(1);
    expect(summary.providers).toContain("anthropic");
    expect(summary.domains).toContain("code");
  });

  it("should handle non-existent state file", async () => {
    // Remove temp file if it exists
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }

    // Should not throw, just return empty store
    await manager.load();

    const state = store.getState();
    expect(state.stats).toHaveLength(0);
  });

  it("should enable/disable auto-save", () => {
    manager.disableAutoSave();
    expect(manager.isAutoSaveEnabled()).toBe(false);

    manager.enableAutoSave();
    expect(manager.isAutoSaveEnabled()).toBe(true);
  });
});
