/**
 * Unit tests for TerminalAPIHandler
 *
 * Tests:
 * - Terminal creation with task association
 * - Terminal destruction and cleanup
 * - Terminal write operations
 * - Terminal resize operations
 * - Session restore with task association
 * - Session management (get/clear)
 * - Task-terminal association mapping
 * - Terminal output streaming via EventBroadcaster
 * - Terminal lifecycle (alive checks)
 * - Statistics reporting
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 100%
 * - Functions: 100%
 * - Lines: 100%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  TerminalAPIHandler,
  type TerminalAPIHandlerConfig,
  type TerminalCreateOptions,
  type TerminalOperationResult,
  type TerminalSession,
  type TerminalManager,
} from "@/ui-adapter/TerminalAPIHandler.js";
import type { EventBroadcaster, TerminalOutputEvent } from "@/ui-adapter/EventBroadcaster.js";

/**
 * Mock TerminalManager
 */
class MockTerminalManager implements TerminalManager {
  public terminals: Map<string, { options: TerminalCreateOptions; alive: boolean }> = new Map();
  public sessions: Map<string, TerminalSession[]> = new Map();
  public writes: Array<{ terminalId: string; data: string }> = [];
  public resizes: Array<{ terminalId: string; cols: number; rows: number }> = [];

  async create(options: TerminalCreateOptions): Promise<TerminalOperationResult> {
    if (this.terminals.has(options.id)) {
      return { success: false, error: "Terminal already exists" };
    }

    this.terminals.set(options.id, { options, alive: true });
    return { success: true };
  }

  async destroy(id: string): Promise<TerminalOperationResult> {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      return { success: false, error: "Terminal not found" };
    }

    terminal.alive = false;
    this.terminals.delete(id);
    return { success: true };
  }

  write(id: string, data: string): void {
    this.writes.push({ terminalId: id, data });
  }

  resize(id: string, cols: number, rows: number): void {
    this.resizes.push({ terminalId: id, cols, rows });
  }

  async restore(
    session: TerminalSession,
    cols?: number,
    rows?: number
  ): Promise<TerminalOperationResult> {
    if (this.terminals.has(session.id)) {
      return { success: false, error: "Terminal already exists" };
    }

    this.terminals.set(session.id, {
      options: {
        id: session.id,
        cwd: session.cwd,
        cols,
        rows,
        projectPath: session.projectPath,
      },
      alive: true,
    });

    return {
      success: true,
      outputBuffer: session.outputBuffer,
    };
  }

  getSavedSessions(projectPath: string): TerminalSession[] {
    return this.sessions.get(projectPath) || [];
  }

  clearSavedSessions(projectPath: string): void {
    this.sessions.delete(projectPath);
  }

  getActiveTerminalIds(): string[] {
    return Array.from(this.terminals.keys());
  }

  isTerminalAlive(terminalId: string): boolean {
    const terminal = this.terminals.get(terminalId);
    return terminal?.alive ?? false;
  }
}

/**
 * Mock EventBroadcaster
 */
class MockEventBroadcaster implements Partial<EventBroadcaster> {
  public terminalOutputEvents: TerminalOutputEvent[] = [];

  streamTerminalOutput(event: TerminalOutputEvent): void {
    this.terminalOutputEvents.push(event);
  }
}

/**
 * Create mock config
 */
function createMockConfig(
  terminalManager?: MockTerminalManager,
  eventBroadcaster?: MockEventBroadcaster,
  options: Partial<TerminalAPIHandlerConfig> = {}
): TerminalAPIHandlerConfig {
  return {
    terminalManager: terminalManager || new MockTerminalManager(),
    eventBroadcaster: (eventBroadcaster || new MockEventBroadcaster()) as unknown as EventBroadcaster,
    ...options,
  };
}

/**
 * Create mock terminal session
 */
function createMockSession(id: string, projectPath: string): TerminalSession {
  return {
    id,
    title: `Terminal ${id}`,
    cwd: "/project",
    projectPath,
    isClaudeMode: false,
    outputBuffer: "Previous output...\n",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}

describe("TerminalAPIHandler: initialization", () => {
  it("Initializes with default config", () => {
    const handler = new TerminalAPIHandler(createMockConfig());

    expect(handler).toBeDefined();
    expect(handler.getStats().totalTerminals).toBe(0);
  });

  it("Initializes with debug mode enabled", () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    new TerminalAPIHandler(createMockConfig(undefined, undefined, { debug: true }));

    console.log = originalLog;

    const initLog = logs.find((log) => log.includes("Initialized"));
    expect(initLog).toBeTruthy();
  });
});

describe("TerminalAPIHandler: terminal creation", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;
  let eventBroadcaster: MockEventBroadcaster;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    eventBroadcaster = new MockEventBroadcaster();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager, eventBroadcaster));
  });

  it("Creates terminal without task association", async () => {
    const result = await handler.createTerminal(null, {
      id: "term-1",
      cwd: "/project",
    });

    expect(result.success).toBe(true);
    expect(terminalManager.terminals.has("term-1")).toBe(true);
    expect(handler.getTaskForTerminal("term-1")).toBeUndefined();
  });

  it("Creates terminal with task association", async () => {
    const result = await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    expect(result.success).toBe(true);
    expect(terminalManager.terminals.has("term-1")).toBe(true);
    expect(handler.getTaskForTerminal("term-1")).toBe("task-123");
    expect(handler.getTerminalsForTask("task-123").has("term-1")).toBe(true);
  });

  it("Emits terminal-associated event on creation", async () => {
    let taskIdReceived = "";
    let terminalIdReceived = "";

    handler.on("terminal-associated", (event: { taskId: string; terminalId: string }) => {
      taskIdReceived = event.taskId;
      terminalIdReceived = event.terminalId;
    });

    await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    expect(taskIdReceived).toBe("task-123");
    expect(terminalIdReceived).toBe("term-1");
  });

  it("Handles creation failure gracefully", async () => {
    // Create terminal first
    await handler.createTerminal(null, {
      id: "term-1",
      cwd: "/project",
    });

    // Try to create again (should fail)
    const result = await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Terminal already exists");
    expect(handler.getTaskForTerminal("term-1")).toBeUndefined();
  });

  it("Logs debug messages on creation", async () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, eventBroadcaster, { debug: true })
    );

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    console.log = originalLog;

    const createLog = logs.find((log) => log.includes("Created terminal"));
    expect(createLog).toBeTruthy();
    expect(createLog?.includes("task-123")).toBe(true);
  });
});

describe("TerminalAPIHandler: terminal destruction", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;
  let eventBroadcaster: MockEventBroadcaster;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    eventBroadcaster = new MockEventBroadcaster();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager, eventBroadcaster));
  });

  it("Destroys terminal and removes associations", async () => {
    // Create terminal with task association
    await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    // Destroy terminal
    const result = await handler.destroyTerminal("term-1");

    expect(result.success).toBe(true);
    expect(terminalManager.terminals.has("term-1")).toBe(false);
    expect(handler.getTaskForTerminal("term-1")).toBeUndefined();
    expect(handler.getTerminalsForTask("task-123").size).toBe(0);
  });

  it("Emits terminal-disassociated event on destruction", async () => {
    await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    let taskIdReceived = "";
    let terminalIdReceived = "";

    handler.on("terminal-disassociated", (event: { taskId: string; terminalId: string }) => {
      taskIdReceived = event.taskId;
      terminalIdReceived = event.terminalId;
    });

    await handler.destroyTerminal("term-1");

    expect(taskIdReceived).toBe("task-123");
    expect(terminalIdReceived).toBe("term-1");
  });

  it("Handles destruction of terminal without task association", async () => {
    await handler.createTerminal(null, {
      id: "term-1",
      cwd: "/project",
    });

    const result = await handler.destroyTerminal("term-1");

    expect(result.success).toBe(true);
    expect(terminalManager.terminals.has("term-1")).toBe(false);
  });

  it("Handles destruction failure gracefully", async () => {
    const result = await handler.destroyTerminal("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Terminal not found");
  });

  it("Logs debug messages on destruction", async () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, eventBroadcaster, { debug: true })
    );

    await handler.createTerminal(null, {
      id: "term-1",
      cwd: "/project",
    });

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    await handler.destroyTerminal("term-1");

    console.log = originalLog;

    const destroyLog = logs.find((log) => log.includes("Destroyed terminal"));
    expect(destroyLog).toBeTruthy();
  });
});

describe("TerminalAPIHandler: terminal write operations", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;
  let eventBroadcaster: MockEventBroadcaster;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    eventBroadcaster = new MockEventBroadcaster();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager, eventBroadcaster));
  });

  it("Writes data to terminal without task association", () => {
    handler.writeToTerminal("term-1", "npm test\r");

    expect(terminalManager.writes).toHaveLength(1);
    expect(terminalManager.writes[0]).toEqual({
      terminalId: "term-1",
      data: "npm test\r",
    });

    // No event should be streamed (no task association)
    expect(eventBroadcaster.terminalOutputEvents).toHaveLength(0);
  });

  it("Writes data to terminal with task association and streams output", async () => {
    await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    handler.writeToTerminal("term-1", "npm test\r");

    expect(terminalManager.writes).toHaveLength(1);
    expect(terminalManager.writes[0].data).toBe("npm test\r");

    // Output event should be streamed
    expect(eventBroadcaster.terminalOutputEvents).toHaveLength(1);
    expect(eventBroadcaster.terminalOutputEvents[0]).toMatchObject({
      taskId: "task-123",
      sessionId: "term-1",
      output: "npm test\r",
    });
    expect(eventBroadcaster.terminalOutputEvents[0].timestamp).toBeDefined();
  });

  it("Logs debug messages on write", async () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, eventBroadcaster, { debug: true })
    );

    await handler.createTerminal("task-123", {
      id: "term-1",
      cwd: "/project",
    });

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    handler.writeToTerminal("term-1", "test data");

    console.log = originalLog;

    const writeLog = logs.find((log) => log.includes("Wrote"));
    expect(writeLog).toBeTruthy();
    expect(writeLog?.includes("9 bytes")).toBe(true);
    expect(writeLog?.includes("task-123")).toBe(true);
  });
});

describe("TerminalAPIHandler: terminal resize operations", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager));
  });

  it("Resizes terminal", () => {
    handler.resizeTerminal("term-1", 120, 40);

    expect(terminalManager.resizes).toHaveLength(1);
    expect(terminalManager.resizes[0]).toEqual({
      terminalId: "term-1",
      cols: 120,
      rows: 40,
    });
  });

  it("Logs debug messages on resize", () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, undefined, { debug: true })
    );

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    handler.resizeTerminal("term-1", 120, 40);

    console.log = originalLog;

    const resizeLog = logs.find((log) => log.includes("Resized terminal"));
    expect(resizeLog).toBeTruthy();
    expect(resizeLog?.includes("120x40")).toBe(true);
  });
});

describe("TerminalAPIHandler: session restore", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;
  let eventBroadcaster: MockEventBroadcaster;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    eventBroadcaster = new MockEventBroadcaster();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager, eventBroadcaster));
  });

  it("Restores terminal session without task association", async () => {
    const session = createMockSession("term-1", "/project");

    const result = await handler.restoreTerminal(null, session, 100, 30);

    expect(result.success).toBe(true);
    expect(result.outputBuffer).toBe("Previous output...\n");
    expect(terminalManager.terminals.has("term-1")).toBe(true);
    expect(handler.getTaskForTerminal("term-1")).toBeUndefined();
  });

  it("Restores terminal session with task association", async () => {
    const session = createMockSession("term-1", "/project");

    const result = await handler.restoreTerminal("task-123", session);

    expect(result.success).toBe(true);
    expect(terminalManager.terminals.has("term-1")).toBe(true);
    expect(handler.getTaskForTerminal("term-1")).toBe("task-123");
    expect(handler.getTerminalsForTask("task-123").has("term-1")).toBe(true);
  });

  it("Emits terminal-associated event on restore with task", async () => {
    const session = createMockSession("term-1", "/project");

    let taskIdReceived = "";
    let terminalIdReceived = "";

    handler.on("terminal-associated", (event: { taskId: string; terminalId: string }) => {
      taskIdReceived = event.taskId;
      terminalIdReceived = event.terminalId;
    });

    await handler.restoreTerminal("task-123", session);

    expect(taskIdReceived).toBe("task-123");
    expect(terminalIdReceived).toBe("term-1");
  });

  it("Uses default cols/rows when not specified", async () => {
    const session = createMockSession("term-1", "/project");

    await handler.restoreTerminal(null, session);

    const restored = terminalManager.terminals.get("term-1");
    expect(restored?.options.cols).toBe(80);
    expect(restored?.options.rows).toBe(24);
  });

  it("Handles restore failure gracefully", async () => {
    const session = createMockSession("term-1", "/project");

    // Restore once (should succeed)
    await handler.restoreTerminal(null, session);

    // Try to restore again (should fail)
    const result = await handler.restoreTerminal("task-123", session);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Terminal already exists");
    expect(handler.getTaskForTerminal("term-1")).toBeUndefined();
  });

  it("Logs debug messages on restore", async () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, eventBroadcaster, { debug: true })
    );

    const session = createMockSession("term-1", "/project");

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    await handler.restoreTerminal("task-123", session);

    console.log = originalLog;

    const restoreLog = logs.find((log) => log.includes("Restored terminal"));
    expect(restoreLog).toBeTruthy();
    expect(restoreLog?.includes("task-123")).toBe(true);
  });
});

describe("TerminalAPIHandler: session management", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager));
  });

  it("Gets saved sessions for project", () => {
    const sessions = [
      createMockSession("term-1", "/project"),
      createMockSession("term-2", "/project"),
    ];

    terminalManager.sessions.set("/project", sessions);

    const result = handler.getSavedSessions("/project");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("term-1");
    expect(result[1].id).toBe("term-2");
  });

  it("Returns empty array for project with no sessions", () => {
    const result = handler.getSavedSessions("/project");

    expect(result).toHaveLength(0);
  });

  it("Clears saved sessions for project", () => {
    const sessions = [createMockSession("term-1", "/project")];
    terminalManager.sessions.set("/project", sessions);

    handler.clearSavedSessions("/project");

    expect(terminalManager.sessions.has("/project")).toBe(false);
  });

  it("Logs debug messages on clear sessions", () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, undefined, { debug: true })
    );

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    handler.clearSavedSessions("/project");

    console.log = originalLog;

    const clearLog = logs.find((log) => log.includes("Cleared sessions"));
    expect(clearLog).toBeTruthy();
  });
});

describe("TerminalAPIHandler: task-terminal association", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;

  beforeEach(async () => {
    terminalManager = new MockTerminalManager();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager));
  });

  it("Associates multiple terminals with same task", async () => {
    await handler.createTerminal("task-123", { id: "term-1", cwd: "/" });
    await handler.createTerminal("task-123", { id: "term-2", cwd: "/" });

    const terminals = handler.getTerminalsForTask("task-123");
    expect(terminals.size).toBe(2);
    expect(terminals.has("term-1")).toBe(true);
    expect(terminals.has("term-2")).toBe(true);
  });

  it("Associates terminal with task after creation", async () => {
    await handler.createTerminal(null, { id: "term-1", cwd: "/" });

    handler.associateTerminalWithTask("task-123", "term-1");

    expect(handler.getTaskForTerminal("term-1")).toBe("task-123");
    expect(handler.getTerminalsForTask("task-123").has("term-1")).toBe(true);
  });

  it("Emits terminal-associated event on manual association", () => {
    let taskIdReceived = "";
    let terminalIdReceived = "";

    handler.on("terminal-associated", (event: { taskId: string; terminalId: string }) => {
      taskIdReceived = event.taskId;
      terminalIdReceived = event.terminalId;
    });

    handler.associateTerminalWithTask("task-123", "term-1");

    expect(taskIdReceived).toBe("task-123");
    expect(terminalIdReceived).toBe("term-1");
  });

  it("Returns empty set for task with no terminals", () => {
    const terminals = handler.getTerminalsForTask("task-999");
    expect(terminals.size).toBe(0);
  });

  it("Returns undefined for terminal with no task", () => {
    const taskId = handler.getTaskForTerminal("term-999");
    expect(taskId).toBeUndefined();
  });

  it("Logs debug messages on association", () => {
    handler = new TerminalAPIHandler(
      createMockConfig(terminalManager, undefined, { debug: true })
    );

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    handler.associateTerminalWithTask("task-123", "term-1");

    console.log = originalLog;

    const assocLog = logs.find((log) => log.includes("Associated terminal"));
    expect(assocLog).toBeTruthy();
  });
});

describe("TerminalAPIHandler: terminal lifecycle", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager));
  });

  it("Checks if terminal is alive", async () => {
    await handler.createTerminal(null, { id: "term-1", cwd: "/" });

    expect(handler.isTerminalAlive("term-1")).toBe(true);
    expect(handler.isTerminalAlive("nonexistent")).toBe(false);
  });

  it("Returns false for destroyed terminal", async () => {
    await handler.createTerminal(null, { id: "term-1", cwd: "/" });
    await handler.destroyTerminal("term-1");

    expect(handler.isTerminalAlive("term-1")).toBe(false);
  });

  it("Gets active terminal IDs", async () => {
    await handler.createTerminal(null, { id: "term-1", cwd: "/" });
    await handler.createTerminal(null, { id: "term-2", cwd: "/" });

    const activeIds = handler.getActiveTerminalIds();
    expect(activeIds).toHaveLength(2);
    expect(activeIds).toContain("term-1");
    expect(activeIds).toContain("term-2");
  });

  it("Returns empty array when no terminals active", () => {
    const activeIds = handler.getActiveTerminalIds();
    expect(activeIds).toHaveLength(0);
  });
});

describe("TerminalAPIHandler: statistics", () => {
  let handler: TerminalAPIHandler;
  let terminalManager: MockTerminalManager;

  beforeEach(() => {
    terminalManager = new MockTerminalManager();
    handler = new TerminalAPIHandler(createMockConfig(terminalManager));
  });

  it("Reports correct statistics with no terminals", () => {
    const stats = handler.getStats();

    expect(stats.totalTerminals).toBe(0);
    expect(stats.associatedTerminals).toBe(0);
    expect(stats.tasksWithTerminals).toBe(0);
  });

  it("Reports correct statistics with terminals and tasks", async () => {
    await handler.createTerminal("task-1", { id: "term-1", cwd: "/" });
    await handler.createTerminal("task-1", { id: "term-2", cwd: "/" });
    await handler.createTerminal("task-2", { id: "term-3", cwd: "/" });
    await handler.createTerminal(null, { id: "term-4", cwd: "/" });

    const stats = handler.getStats();

    expect(stats.totalTerminals).toBe(4);
    expect(stats.associatedTerminals).toBe(3); // term-1, term-2, term-3
    expect(stats.tasksWithTerminals).toBe(2); // task-1, task-2
  });

  it("Updates statistics after terminal destruction", async () => {
    await handler.createTerminal("task-1", { id: "term-1", cwd: "/" });
    await handler.createTerminal("task-2", { id: "term-2", cwd: "/" });

    await handler.destroyTerminal("term-1");

    const stats = handler.getStats();

    expect(stats.totalTerminals).toBe(1);
    expect(stats.associatedTerminals).toBe(1);
    expect(stats.tasksWithTerminals).toBe(1);
  });

  it("Updates statistics when all terminals for task destroyed", async () => {
    await handler.createTerminal("task-1", { id: "term-1", cwd: "/" });
    await handler.createTerminal("task-1", { id: "term-2", cwd: "/" });

    await handler.destroyTerminal("term-1");
    await handler.destroyTerminal("term-2");

    const stats = handler.getStats();

    expect(stats.totalTerminals).toBe(0);
    expect(stats.associatedTerminals).toBe(0);
    expect(stats.tasksWithTerminals).toBe(0);
  });
});
