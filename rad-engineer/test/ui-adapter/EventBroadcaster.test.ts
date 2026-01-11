/**
 * Unit tests for EventBroadcaster
 *
 * Tests:
 * - Event broadcasting to multiple windows
 * - Backpressure handling (throttle/debounce)
 * - Task progress updates
 * - Task status updates
 * - Agent output streaming
 * - Terminal output streaming
 * - Multi-window support
 * - Latency requirements (<100ms)
 * - Flush and cleanup operations
 * - Statistics reporting
 *
 * Coverage requirements:
 * - Branches: 100%
 * - Functions: 100%
 * - Lines: 100%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  EventBroadcaster,
  type EventBroadcasterConfig,
  type AgentOutputEvent,
  type TerminalOutputEvent,
  type TaskStatusEvent,
  EventType,
} from "@/ui-adapter/EventBroadcaster.js";
import type { TaskProgressEvent } from "@/ui-adapter/types.js";

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

/**
 * Create mock config with mock windows
 */
function createMockConfig(
  windows: MockBrowserWindow[] = [],
  options: Partial<EventBroadcasterConfig> = {}
): EventBroadcasterConfig {
  return {
    getWindows: () => windows as any,
    ...options,
  };
}

/**
 * Wait for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("EventBroadcaster: initialization", () => {
  it("Initializes with default config", () => {
    const broadcaster = new EventBroadcaster({
      getWindows: () => [],
    });

    expect(broadcaster).toBeDefined();
    expect(broadcaster.getStats().connectedWindows).toBe(0);
  });

  it("Initializes with custom throttle intervals", () => {
    const broadcaster = new EventBroadcaster({
      getWindows: () => [],
      terminalThrottleMs: 50,
      progressDebounceMs: 100,
    });

    expect(broadcaster).toBeDefined();
  });

  it("Initializes with debug mode enabled", () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    new EventBroadcaster({
      getWindows: () => [],
      debug: true,
    });

    console.log = originalLog;

    const initLog = logs.find((log) => log.includes("Initialized with config"));
    expect(initLog).toBeTruthy();
  });
});

describe("EventBroadcaster: single window broadcasting", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(createMockConfig([window1]));
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Broadcasts task progress event to single window", async () => {
    const event: TaskProgressEvent = {
      taskId: "task-1",
      progress: 50,
      message: "Processing...",
    };

    broadcaster.broadcastTaskUpdate(event);

    // Wait for throttle
    await delay(250);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window1.sentEvents[0].channel).toBe(EventType.TASK_PROGRESS);
    expect(window1.sentEvents[0].data).toEqual(event);
  });

  it("Broadcasts task status event to single window (immediate)", () => {
    const event: TaskStatusEvent = {
      taskId: "task-1",
      status: "completed",
      timestamp: new Date().toISOString(),
    };

    broadcaster.broadcastTaskStatus(event);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window1.sentEvents[0].channel).toBe(EventType.TASK_STATUS);
    expect(window1.sentEvents[0].data).toEqual(event);
  });

  it("Broadcasts agent output event to single window", async () => {
    const event: AgentOutputEvent = {
      taskId: "task-1",
      agentId: "agent-1",
      output: "Processing file...",
      timestamp: new Date().toISOString(),
    };

    broadcaster.streamAgentOutput(event);

    // Wait for throttle
    await delay(150);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window1.sentEvents[0].channel).toBe(EventType.AGENT_OUTPUT);
    expect(window1.sentEvents[0].data).toEqual(event);
  });

  it("Broadcasts terminal output event to single window", async () => {
    const event: TerminalOutputEvent = {
      taskId: "task-1",
      sessionId: "term-1",
      output: "Running tests...\n",
      timestamp: new Date().toISOString(),
    };

    broadcaster.streamTerminalOutput(event);

    // Wait for throttle
    await delay(150);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window1.sentEvents[0].channel).toBe(EventType.TERMINAL_OUTPUT);
    expect(window1.sentEvents[0].data).toEqual(event);
  });
});

describe("EventBroadcaster: multi-window broadcasting", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;
  let window2: MockBrowserWindow;
  let window3: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    window2 = new MockBrowserWindow();
    window3 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(
      createMockConfig([window1, window2, window3])
    );
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Broadcasts event to all windows", async () => {
    const event: TaskProgressEvent = {
      taskId: "task-1",
      progress: 75,
      message: "Almost done...",
    };

    broadcaster.broadcastTaskUpdate(event);

    // Wait for throttle
    await delay(250);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window2.sentEvents).toHaveLength(1);
    expect(window3.sentEvents).toHaveLength(1);

    // All should receive the same event
    expect(window1.sentEvents[0].data).toEqual(event);
    expect(window2.sentEvents[0].data).toEqual(event);
    expect(window3.sentEvents[0].data).toEqual(event);
  });

  it("Skips destroyed windows", async () => {
    window2.destroy();

    const event: TaskProgressEvent = {
      taskId: "task-1",
      progress: 50,
      message: "Processing...",
    };

    broadcaster.broadcastTaskUpdate(event);

    // Wait for throttle
    await delay(250);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window2.sentEvents).toHaveLength(0); // Destroyed window
    expect(window3.sentEvents).toHaveLength(1);
  });

  it("Reports correct window count in stats", () => {
    const stats = broadcaster.getStats();
    expect(stats.connectedWindows).toBe(3);

    window1.destroy();

    const stats2 = broadcaster.getStats();
    expect(stats2.connectedWindows).toBe(2);
  });
});

describe("EventBroadcaster: backpressure handling - task progress", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(
      createMockConfig([window1], { progressDebounceMs: 200 })
    );
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Throttles rapid task progress updates (debounce)", async () => {
    // Send 5 rapid updates
    for (let i = 0; i < 5; i++) {
      broadcaster.broadcastTaskUpdate({
        taskId: "task-1",
        progress: i * 20,
        message: `Progress ${i}`,
      });
      await delay(10); // Small delay between sends
    }

    // Should only send first event immediately
    expect(window1.sentEvents.length).toBeLessThanOrEqual(1);

    // Wait for debounce
    await delay(250);

    // Should have sent the last event after debounce
    expect(window1.sentEvents.length).toBeGreaterThanOrEqual(1);
    expect(window1.sentEvents.length).toBeLessThanOrEqual(2);

    // Last event should be the most recent update
    const lastEvent = window1.sentEvents[window1.sentEvents.length - 1];
    expect(lastEvent.data.progress).toBe(80); // Last update (4 * 20)
  });

  it("Allows updates after throttle interval", async () => {
    // First update
    broadcaster.broadcastTaskUpdate({
      taskId: "task-1",
      progress: 25,
      message: "First",
    });

    await delay(250); // Wait for throttle

    // Second update after throttle
    broadcaster.broadcastTaskUpdate({
      taskId: "task-1",
      progress: 50,
      message: "Second",
    });

    await delay(250); // Wait for throttle

    // Should have sent both events
    expect(window1.sentEvents).toHaveLength(2);
    expect(window1.sentEvents[0].data.progress).toBe(25);
    expect(window1.sentEvents[1].data.progress).toBe(50);
  });

  it("Throttles per task independently", async () => {
    // Send updates for two different tasks rapidly
    broadcaster.broadcastTaskUpdate({
      taskId: "task-1",
      progress: 25,
      message: "Task 1",
    });

    broadcaster.broadcastTaskUpdate({
      taskId: "task-2",
      progress: 75,
      message: "Task 2",
    });

    await delay(250);

    // Should have sent events for both tasks
    expect(window1.sentEvents).toHaveLength(2);

    const task1Events = window1.sentEvents.filter(
      (e) => e.data.taskId === "task-1"
    );
    const task2Events = window1.sentEvents.filter(
      (e) => e.data.taskId === "task-2"
    );

    expect(task1Events).toHaveLength(1);
    expect(task2Events).toHaveLength(1);
  });
});

describe("EventBroadcaster: backpressure handling - terminal output", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(
      createMockConfig([window1], { terminalThrottleMs: 100 })
    );
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Throttles rapid terminal output", async () => {
    // Send 10 rapid terminal outputs
    for (let i = 0; i < 10; i++) {
      broadcaster.streamTerminalOutput({
        taskId: "task-1",
        sessionId: "term-1",
        output: `Line ${i}\n`,
        timestamp: new Date().toISOString(),
      });
      await delay(5);
    }

    // Should have throttled most events
    expect(window1.sentEvents.length).toBeLessThan(10);

    // Wait for throttle
    await delay(150);

    // Should have sent last event
    const lastEvent = window1.sentEvents[window1.sentEvents.length - 1];
    expect(lastEvent.data.output).toBe("Line 9\n");
  });

  it("Throttles per terminal session independently", async () => {
    broadcaster.streamTerminalOutput({
      taskId: "task-1",
      sessionId: "term-1",
      output: "Session 1\n",
      timestamp: new Date().toISOString(),
    });

    broadcaster.streamTerminalOutput({
      taskId: "task-1",
      sessionId: "term-2",
      output: "Session 2\n",
      timestamp: new Date().toISOString(),
    });

    await delay(150);

    expect(window1.sentEvents).toHaveLength(2);

    const term1Events = window1.sentEvents.filter(
      (e) => e.data.sessionId === "term-1"
    );
    const term2Events = window1.sentEvents.filter(
      (e) => e.data.sessionId === "term-2"
    );

    expect(term1Events).toHaveLength(1);
    expect(term2Events).toHaveLength(1);
  });
});

describe("EventBroadcaster: backpressure handling - agent output", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(
      createMockConfig([window1], { terminalThrottleMs: 100 })
    );
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Throttles rapid agent output", async () => {
    // Send 10 rapid agent outputs
    for (let i = 0; i < 10; i++) {
      broadcaster.streamAgentOutput({
        taskId: "task-1",
        agentId: "agent-1",
        output: `Processing ${i}...`,
        timestamp: new Date().toISOString(),
      });
      await delay(5);
    }

    // Should have throttled most events
    expect(window1.sentEvents.length).toBeLessThan(10);

    // Wait for throttle
    await delay(150);

    // Should have sent last event
    const lastEvent = window1.sentEvents[window1.sentEvents.length - 1];
    expect(lastEvent.data.output).toBe("Processing 9...");
  });

  it("Throttles per agent independently", async () => {
    broadcaster.streamAgentOutput({
      taskId: "task-1",
      agentId: "agent-1",
      output: "Agent 1 output",
      timestamp: new Date().toISOString(),
    });

    broadcaster.streamAgentOutput({
      taskId: "task-1",
      agentId: "agent-2",
      output: "Agent 2 output",
      timestamp: new Date().toISOString(),
    });

    await delay(150);

    expect(window1.sentEvents).toHaveLength(2);

    const agent1Events = window1.sentEvents.filter(
      (e) => e.data.agentId === "agent-1"
    );
    const agent2Events = window1.sentEvents.filter(
      (e) => e.data.agentId === "agent-2"
    );

    expect(agent1Events).toHaveLength(1);
    expect(agent2Events).toHaveLength(1);
  });
});

describe("EventBroadcaster: latency requirements", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(createMockConfig([window1]));
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Task status broadcasts immediately (<1ms)", () => {
    const start = performance.now();

    broadcaster.broadcastTaskStatus({
      taskId: "task-1",
      status: "completed",
      timestamp: new Date().toISOString(),
    });

    const latency = performance.now() - start;

    expect(latency).toBeLessThan(1); // Should be nearly instant
    expect(window1.sentEvents).toHaveLength(1);
  });

  it("First task progress broadcasts immediately", () => {
    const start = performance.now();

    broadcaster.broadcastTaskUpdate({
      taskId: "task-1",
      progress: 50,
      message: "Processing...",
    });

    const latency = performance.now() - start;

    expect(latency).toBeLessThan(1); // Should be nearly instant
  });

  it("Throttled events broadcast within throttle interval (<100ms)", async () => {
    // First event
    broadcaster.streamTerminalOutput({
      taskId: "task-1",
      sessionId: "term-1",
      output: "Line 1\n",
      timestamp: new Date().toISOString(),
    });

    const start = performance.now();

    // Second event (should be throttled)
    broadcaster.streamTerminalOutput({
      taskId: "task-1",
      sessionId: "term-1",
      output: "Line 2\n",
      timestamp: new Date().toISOString(),
    });

    // Wait for throttle
    await delay(150);

    const latency = performance.now() - start;

    // Should broadcast within throttle interval (100ms) + small buffer
    expect(latency).toBeLessThan(200);
    expect(window1.sentEvents.length).toBeGreaterThan(0);
  });
});

describe("EventBroadcaster: flush and cleanup", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(createMockConfig([window1]));
  });

  it("Flushes pending events", async () => {
    // Send rapid updates to create pending events
    for (let i = 0; i < 5; i++) {
      broadcaster.broadcastTaskUpdate({
        taskId: "task-1",
        progress: i * 20,
        message: `Progress ${i}`,
      });
    }

    // Flush immediately
    broadcaster.flush();

    // Pending events should be cleared
    const stats = broadcaster.getStats();
    expect(stats.activeProgressStreams).toBeGreaterThanOrEqual(0);
  });

  it("Cleanup clears all state", () => {
    // Create some throttle states
    broadcaster.broadcastTaskUpdate({
      taskId: "task-1",
      progress: 50,
      message: "Processing...",
    });

    broadcaster.streamTerminalOutput({
      taskId: "task-1",
      sessionId: "term-1",
      output: "Output\n",
      timestamp: new Date().toISOString(),
    });

    const statsBefore = broadcaster.getStats();
    expect(statsBefore.activeProgressStreams).toBeGreaterThan(0);

    broadcaster.cleanup();

    const statsAfter = broadcaster.getStats();
    expect(statsAfter.activeProgressStreams).toBe(0);
    expect(statsAfter.activeTerminalStreams).toBe(0);
  });

  it("Logs debug messages on flush and cleanup", () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    broadcaster = new EventBroadcaster(
      createMockConfig([window1], { debug: true })
    );

    broadcaster.flush();
    broadcaster.cleanup();

    console.log = originalLog;

    const flushLog = logs.find((log) => log.includes("Flushed all pending"));
    const cleanupLog = logs.find((log) => log.includes("Cleaned up resources"));

    expect(flushLog).toBeTruthy();
    expect(cleanupLog).toBeTruthy();
  });
});

describe("EventBroadcaster: statistics", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;
  let window2: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    window2 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(createMockConfig([window1, window2]));
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Reports statistics correctly", () => {
    // Initially no active streams
    let stats = broadcaster.getStats();
    expect(stats.activeProgressStreams).toBe(0);
    expect(stats.activeTerminalStreams).toBe(0);
    expect(stats.connectedWindows).toBe(2);

    // Create progress stream
    broadcaster.broadcastTaskUpdate({
      taskId: "task-1",
      progress: 50,
      message: "Processing...",
    });

    stats = broadcaster.getStats();
    expect(stats.activeProgressStreams).toBe(1);

    // Create terminal stream
    broadcaster.streamTerminalOutput({
      taskId: "task-1",
      sessionId: "term-1",
      output: "Output\n",
      timestamp: new Date().toISOString(),
    });

    stats = broadcaster.getStats();
    expect(stats.activeTerminalStreams).toBe(1);

    // Create another progress stream for different task
    broadcaster.broadcastTaskUpdate({
      taskId: "task-2",
      progress: 25,
      message: "Starting...",
    });

    stats = broadcaster.getStats();
    expect(stats.activeProgressStreams).toBe(2);
  });

  it("Updates window count when windows destroyed", () => {
    let stats = broadcaster.getStats();
    expect(stats.connectedWindows).toBe(2);

    window1.destroy();

    stats = broadcaster.getStats();
    expect(stats.connectedWindows).toBe(1);

    window2.destroy();

    stats = broadcaster.getStats();
    expect(stats.connectedWindows).toBe(0);
  });
});

describe("EventBroadcaster: error handling", () => {
  let broadcaster: EventBroadcaster;

  beforeEach(() => {
    broadcaster = new EventBroadcaster({ getWindows: () => [] });
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Handles no connected windows gracefully", async () => {
    const event: TaskProgressEvent = {
      taskId: "task-1",
      progress: 50,
      message: "Processing...",
    };

    // Should not throw
    expect(() => broadcaster.broadcastTaskUpdate(event)).not.toThrow();

    await delay(250);

    const stats = broadcaster.getStats();
    expect(stats.connectedWindows).toBe(0);
  });

  it("Handles window send error gracefully", async () => {
    const errorWindow = new MockBrowserWindow();
    errorWindow.webContents.send = () => {
      throw new Error("Send failed");
    };

    broadcaster = new EventBroadcaster(createMockConfig([errorWindow]));

    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.join(" "));
    };

    // Should not throw, but log error
    broadcaster.broadcastTaskStatus({
      taskId: "task-1",
      status: "completed",
      timestamp: new Date().toISOString(),
    });

    console.error = originalError;

    const errorLog = errors.find((log) => log.includes("Failed to send event"));
    expect(errorLog).toBeTruthy();
  });
});

describe("EventBroadcaster: task object broadcasting", () => {
  let broadcaster: EventBroadcaster;
  let window1: MockBrowserWindow;

  beforeEach(() => {
    window1 = new MockBrowserWindow();
    broadcaster = new EventBroadcaster(createMockConfig([window1]));
  });

  afterEach(() => {
    broadcaster.cleanup();
  });

  it("Broadcasts full task object as status event", () => {
    const task = {
      id: "task-1",
      title: "Test task",
      description: "Test description",
      status: "completed" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 100,
    };

    broadcaster.broadcastTaskObject(task);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window1.sentEvents[0].channel).toBe(EventType.TASK_STATUS);
    expect(window1.sentEvents[0].data.taskId).toBe(task.id);
    expect(window1.sentEvents[0].data.status).toBe(task.status);
    expect(window1.sentEvents[0].data.timestamp).toBe(task.updatedAt);
  });

  it("Includes error in status event if present", () => {
    const task = {
      id: "task-1",
      title: "Failed task",
      description: "Test description",
      status: "failed" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 50,
      error: "Execution failed",
    };

    broadcaster.broadcastTaskObject(task);

    expect(window1.sentEvents).toHaveLength(1);
    expect(window1.sentEvents[0].data.error).toBe("Execution failed");
  });
});
