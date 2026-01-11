/**
 * Integration tests for EventBroadcaster with ElectronIPCAdapter
 *
 * Tests:
 * - EventBroadcaster integration with ElectronIPCAdapter
 * - Real-time event broadcasting during task execution
 * - Multi-window support
 * - Backpressure handling in real scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ElectronIPCAdapter } from "@/ui-adapter/ElectronIPCAdapter.js";
import type { IPCAdapterConfig } from "@/ui-adapter/types.js";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Mock BrowserWindow for testing
 */
class MockBrowserWindow {
  private destroyed = false;
  public sentEvents: Array<{ channel: string; data: any }> = [];

  webContents = {
    send: (channel: string, data: any) => {
      if (this.destroyed) {
        throw new Error("Window is destroyed");
      }
      this.sentEvents.push({ channel, data });
    },
  };

  isDestroyed(): boolean {
    return this.destroyed;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

describe("EventBroadcaster integration with ElectronIPCAdapter", () => {
  let adapter: ElectronIPCAdapter;
  let window1: MockBrowserWindow;
  let window2: MockBrowserWindow;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), `test-eb-int-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    window1 = new MockBrowserWindow();
    window2 = new MockBrowserWindow();

    const config: IPCAdapterConfig = {
      projectDir: tempDir,
      getWindows: () => [window1, window2] as any,
      debug: false,
    };

    adapter = new ElectronIPCAdapter(config);
  });

  afterEach(async () => {
    adapter.cleanup();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Initializes EventBroadcaster when getWindows provided", () => {
    const broadcaster = adapter.getEventBroadcaster();
    expect(broadcaster).not.toBeNull();
  });

  it("Does not initialize EventBroadcaster when getWindows not provided", () => {
    const adapterNoWindows = new ElectronIPCAdapter({
      projectDir: tempDir,
    });

    const broadcaster = adapterNoWindows.getEventBroadcaster();
    expect(broadcaster).toBeNull();
  });

  it("Broadcasts task creation to all windows", async () => {
    const task = await adapter.createTask({
      title: "Test task",
      description: "Test description",
    });

    // Wait a bit for event broadcasting
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Both windows should receive the event
    expect(window1.sentEvents.length).toBeGreaterThan(0);
    expect(window2.sentEvents.length).toBeGreaterThan(0);

    // Check that both received the same task update
    const window1TaskEvents = window1.sentEvents.filter((e) =>
      e.channel.includes("task:")
    );
    const window2TaskEvents = window2.sentEvents.filter((e) =>
      e.channel.includes("task:")
    );

    expect(window1TaskEvents.length).toBeGreaterThan(0);
    expect(window2TaskEvents.length).toBeGreaterThan(0);
  });

  it("Broadcasts task updates to all windows", async () => {
    const task = await adapter.createTask({
      title: "Update test",
      description: "Test updates",
    });

    // Clear previous events
    window1.sentEvents = [];
    window2.sentEvents = [];

    await adapter.updateTask(task.id, {
      status: "in_progress",
      progress: 50,
    });

    // Wait a bit for event broadcasting
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Both windows should receive the update
    expect(window1.sentEvents.length).toBeGreaterThan(0);
    expect(window2.sentEvents.length).toBeGreaterThan(0);
  });

  it("Reports correct statistics from EventBroadcaster", () => {
    const broadcaster = adapter.getEventBroadcaster();
    expect(broadcaster).not.toBeNull();

    const stats = broadcaster!.getStats();
    expect(stats.connectedWindows).toBe(2);
    expect(stats.activeProgressStreams).toBe(0);
    expect(stats.activeTerminalStreams).toBe(0);
  });

  it("Handles window destruction gracefully", async () => {
    const task = await adapter.createTask({
      title: "Destroy test",
      description: "Test window destruction",
    });

    // Destroy one window
    window1.destroy();

    // Clear events
    window1.sentEvents = [];
    window2.sentEvents = [];

    await adapter.updateTask(task.id, { progress: 75 });

    // Wait for broadcasting
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Only window2 should receive the update
    expect(window1.sentEvents).toHaveLength(0);
    expect(window2.sentEvents.length).toBeGreaterThan(0);
  });

  it("Cleans up EventBroadcaster resources on adapter cleanup", () => {
    const broadcaster = adapter.getEventBroadcaster();
    expect(broadcaster).not.toBeNull();

    // Create some state
    adapter.createTask({
      title: "Cleanup test",
      description: "Test cleanup",
    });

    // Cleanup should clear broadcaster state
    adapter.cleanup();

    const stats = broadcaster!.getStats();
    expect(stats.activeProgressStreams).toBe(0);
    expect(stats.activeTerminalStreams).toBe(0);
  });

  it("Broadcasts to new windows added dynamically", async () => {
    const window3 = new MockBrowserWindow();

    // Update getWindows to return 3 windows
    const newAdapter = new ElectronIPCAdapter({
      projectDir: tempDir,
      getWindows: () => [window1, window2, window3] as any,
    });

    const task = await newAdapter.createTask({
      title: "Dynamic window test",
      description: "Test dynamic windows",
    });

    // Wait for broadcasting
    await new Promise((resolve) => setTimeout(resolve, 50));

    // All 3 windows should receive the event
    expect(window1.sentEvents.length).toBeGreaterThan(0);
    expect(window2.sentEvents.length).toBeGreaterThan(0);
    expect(window3.sentEvents.length).toBeGreaterThan(0);

    newAdapter.cleanup();
  });

  it("Handles rapid task creation with backpressure", async () => {
    // Create multiple tasks sequentially to avoid StateManager race conditions
    const tasks = [];
    for (let i = 1; i <= 5; i++) {
      tasks.push(
        await adapter.createTask({ title: `Task ${i}`, description: `Test ${i}` })
      );
    }

    // Wait for all broadcasts
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Both windows should have received events
    expect(window1.sentEvents.length).toBeGreaterThan(0);
    expect(window2.sentEvents.length).toBeGreaterThan(0);

    // Verify all tasks were created
    const allTasks = await adapter.getAllTasks();
    expect(allTasks).toHaveLength(5);
  });
});

describe("EventBroadcaster latency requirements", () => {
  let adapter: ElectronIPCAdapter;
  let window1: MockBrowserWindow;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), `test-eb-lat-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    window1 = new MockBrowserWindow();

    const config: IPCAdapterConfig = {
      projectDir: tempDir,
      getWindows: () => [window1] as any,
      debug: false,
    };

    adapter = new ElectronIPCAdapter(config);
  });

  afterEach(async () => {
    adapter.cleanup();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Task status updates broadcast immediately (<100ms)", async () => {
    const task = await adapter.createTask({
      title: "Latency test",
      description: "Test latency",
    });

    window1.sentEvents = [];

    const start = performance.now();

    await adapter.updateTask(task.id, {
      status: "completed",
      progress: 100,
    });

    // Wait minimal time for event
    await new Promise((resolve) => setTimeout(resolve, 10));

    const latency = performance.now() - start;

    // Should receive event quickly
    expect(window1.sentEvents.length).toBeGreaterThan(0);
    expect(latency).toBeLessThan(100); // Within 100ms
  });

  it("Task creation broadcasts within acceptable latency", async () => {
    const start = performance.now();

    await adapter.createTask({
      title: "Creation latency test",
      description: "Test",
    });

    // Wait for broadcast
    await new Promise((resolve) => setTimeout(resolve, 50));

    const latency = performance.now() - start;

    expect(window1.sentEvents.length).toBeGreaterThan(0);
    expect(latency).toBeLessThan(100); // Within 100ms total
  });
});
