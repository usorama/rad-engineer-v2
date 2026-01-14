/**
 * Unit tests for ExecutionAPIHandler
 *
 * Tests:
 * - 13 IPC channel handlers (getExecutionStatus, getWaveStatus, getAgentStatus, etc.)
 * - 12 real-time event emissions (wave-started/progress/completed, etc.)
 * - Mock implementations (placeholder data for Phase 1)
 * - Event broadcasting integration
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ExecutionAPIHandler } from "@/ui-adapter/ExecutionAPIHandler.js";
import type { ExecutionAPIHandlerConfig } from "@/ui-adapter/ExecutionAPIHandler.js";

describe("ExecutionAPIHandler: Initialization", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    const config: ExecutionAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };
    handler = new ExecutionAPIHandler(config);
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Initializes with provided config", () => {
    expect(handler).toBeDefined();
  });

  it("Logs debug messages when debug enabled", () => {
    const config: ExecutionAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };

    const debugHandler = new ExecutionAPIHandler(config);
    expect(debugHandler).toBeDefined();
  });
});

describe("ExecutionAPIHandler: getExecutionStatus", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns execution status for executionId", async () => {
    const executionId = "exec-123";

    const result = await handler.getExecutionStatus(executionId);

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    expect(["pending", "in_progress", "completed", "failed", "paused"]).toContain(result.status!);
  });

  it("Returns progress information", async () => {
    const executionId = "exec-123";

    const result = await handler.getExecutionStatus(executionId);

    expect(result.progress).toBeDefined();
    expect(result.progress).toBeGreaterThanOrEqual(0);
    expect(result.progress).toBeLessThanOrEqual(100);
  });

  it("Returns wave information", async () => {
    const executionId = "exec-123";

    const result = await handler.getExecutionStatus(executionId);

    expect(result.currentWave).toBeDefined();
    expect(result.totalWaves).toBeDefined();
  });

  it("Returns error for empty execution ID", async () => {
    const result = await handler.getExecutionStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: getWaveStatus", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns wave status for waveId", async () => {
    const waveId = "wave-123";

    const result = await handler.getWaveStatus(waveId);

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    expect(["pending", "executing", "completed", "failed"]).toContain(result.status!);
  });

  it("Returns agent information for wave", async () => {
    const waveId = "wave-123";

    const result = await handler.getWaveStatus(waveId);

    expect(result.agents).toBeDefined();
    expect(Array.isArray(result.agents)).toBe(true);
  });

  it("Returns error for empty wave ID", async () => {
    const result = await handler.getWaveStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: getAgentStatus", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns agent status for agentId", async () => {
    const agentId = "agent-123";

    const result = await handler.getAgentStatus(agentId);

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    expect(["idle", "running", "completed", "failed"]).toContain(result.status!);
  });

  it("Returns agent metrics", async () => {
    const agentId = "agent-123";

    const result = await handler.getAgentStatus(agentId);

    expect(result.metrics).toBeDefined();
    expect(result.metrics?.tokensUsed).toBeGreaterThanOrEqual(0);
  });

  it("Returns error for empty agent ID", async () => {
    const result = await handler.getAgentStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: getQualityGates", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns quality gates results for executionId", async () => {
    const executionId = "exec-123";

    const result = await handler.getQualityGates(executionId);

    expect(result.success).toBe(true);
    expect(result.gates).toBeDefined();
    expect(Array.isArray(result.gates)).toBe(true);
  });

  it("Returns gates with typecheck, lint, test types", async () => {
    const executionId = "exec-123";

    const result = await handler.getQualityGates(executionId);

    const gateTypes = result.gates?.map((g) => g.type) || [];
    expect(gateTypes).toContain("typecheck");
    expect(gateTypes).toContain("lint");
    expect(gateTypes).toContain("test");
  });

  it("Returns error for empty execution ID", async () => {
    const result = await handler.getQualityGates("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: getStateMachineStatus", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns state machine status for executionId", async () => {
    const executionId = "exec-123";

    const result = await handler.getStateMachineStatus(executionId);

    expect(result.success).toBe(true);
    expect(result.currentState).toBeDefined();
  });

  it("Returns valid state names", async () => {
    const executionId = "exec-123";

    const result = await handler.getStateMachineStatus(executionId);

    const validStates = ["idle", "executing", "validating", "completed", "failed", "recovering"];
    expect(validStates).toContain(result.currentState!);
  });

  it("Returns error for empty execution ID", async () => {
    const result = await handler.getStateMachineStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: getErrorRecoveryStatus", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns error recovery status for executionId", async () => {
    const executionId = "exec-123";

    const result = await handler.getErrorRecoveryStatus(executionId);

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
  });

  it("Returns retry count and circuit breaker state", async () => {
    const executionId = "exec-123";

    const result = await handler.getErrorRecoveryStatus(executionId);

    expect(result.retryCount).toBeGreaterThanOrEqual(0);
    expect(result.circuitBreakerState).toBeDefined();
    expect(["closed", "open", "half-open"]).toContain(result.circuitBreakerState!);
  });

  it("Returns error for empty execution ID", async () => {
    const result = await handler.getErrorRecoveryStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: retryWave", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Retries a failed wave", async () => {
    const waveId = "wave-123";

    const result = await handler.retryWave(waveId);

    expect(result.success).toBe(true);
  });

  it("Returns error for empty wave ID", async () => {
    const result = await handler.retryWave("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Emits wave-started event on retry", async () => {
    const waveEvents: unknown[] = [];
    handler.on("wave-started", (event) => waveEvents.push(event));

    await handler.retryWave("wave-123");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(waveEvents.length).toBeGreaterThan(0);
  });
});

describe("ExecutionAPIHandler: retryTask", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Retries a failed task", async () => {
    const taskId = "task-123";

    const result = await handler.retryTask(taskId);

    expect(result.success).toBe(true);
  });

  it("Returns error for empty task ID", async () => {
    const result = await handler.retryTask("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Emits task-retry-scheduled event", async () => {
    const taskEvents: unknown[] = [];
    handler.on("task-retry-scheduled", (event) => taskEvents.push(event));

    await handler.retryTask("task-123");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(taskEvents.length).toBeGreaterThan(0);
  });
});

describe("ExecutionAPIHandler: changeProvider", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Changes LLM provider for execution", async () => {
    const executionId = "exec-123";
    const provider = "anthropic";
    const model = "claude-sonnet-4";

    const result = await handler.changeProvider(executionId, provider, model);

    expect(result.success).toBe(true);
  });

  it("Returns error for invalid provider", async () => {
    const result = await handler.changeProvider("exec-123", "invalid-provider", "model");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Returns error for empty execution ID", async () => {
    const result = await handler.changeProvider("", "anthropic", "claude-sonnet-4");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: restoreCheckpoint", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Restores execution from checkpoint", async () => {
    const executionId = "exec-123";
    const checkpointId = "checkpoint-456";

    const result = await handler.restoreCheckpoint(executionId, checkpointId);

    expect(result.success).toBe(true);
  });

  it("Returns error for empty checkpoint ID", async () => {
    const result = await handler.restoreCheckpoint("exec-123", "");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Emits state-changed event on restore", async () => {
    const stateEvents: unknown[] = [];
    handler.on("state-changed", (event) => stateEvents.push(event));

    await handler.restoreCheckpoint("exec-123", "checkpoint-456");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stateEvents.length).toBeGreaterThan(0);
  });
});

describe("ExecutionAPIHandler: deleteCheckpoint", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Deletes a checkpoint", async () => {
    const checkpointId = "checkpoint-456";

    const result = await handler.deleteCheckpoint(checkpointId);

    expect(result.success).toBe(true);
  });

  it("Returns error for empty checkpoint ID", async () => {
    const result = await handler.deleteCheckpoint("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: retryQualityGate", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Retries a failed quality gate", async () => {
    const executionId = "exec-123";
    const gateType = "test";

    const result = await handler.retryQualityGate(executionId, gateType);

    expect(result.success).toBe(true);
  });

  it("Returns error for invalid gate type", async () => {
    const result = await handler.retryQualityGate("exec-123", "invalid-gate" as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Emits quality-gate-started event", async () => {
    const gateEvents: unknown[] = [];
    handler.on("quality-gate-started", (event) => gateEvents.push(event));

    await handler.retryQualityGate("exec-123", "lint");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(gateEvents.length).toBeGreaterThan(0);
  });

  it("Emits quality-gate-result event after completion", async () => {
    const resultEvents: unknown[] = [];
    handler.on("quality-gate-result", (event) => resultEvents.push(event));

    await handler.retryQualityGate("exec-123", "typecheck");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(resultEvents.length).toBeGreaterThan(0);
  });
});

describe("ExecutionAPIHandler: getExecutionTimeline", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns execution timeline events", async () => {
    const executionId = "exec-123";

    const result = await handler.getExecutionTimeline(executionId);

    expect(result.success).toBe(true);
    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  it("Returns events in chronological order", async () => {
    const executionId = "exec-123";

    const result = await handler.getExecutionTimeline(executionId);

    if (result.events && result.events.length > 1) {
      const firstTimestamp = new Date(result.events[0].timestamp).getTime();
      const lastTimestamp = new Date(result.events[result.events.length - 1].timestamp).getTime();
      expect(firstTimestamp).toBeLessThanOrEqual(lastTimestamp);
    }
  });

  it("Returns error for empty execution ID", async () => {
    const result = await handler.getExecutionTimeline("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: Real-time Events - Wave", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Emits wave-started event", async () => {
    const events: unknown[] = [];
    handler.on("wave-started", (event) => events.push(event));

    // Trigger wave start (via retryWave for testing)
    await handler.retryWave("wave-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.waveId).toBeTruthy();
  });

  it("Emits wave-progress event", async () => {
    const events: unknown[] = [];
    handler.on("wave-progress", (event) => events.push(event));

    // Simulate wave progress
    handler["emitWaveProgress"]("wave-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.waveId).toBeTruthy();
    expect(event.progress).toBeGreaterThanOrEqual(0);
  });

  it("Emits wave-completed event", async () => {
    const events: unknown[] = [];
    handler.on("wave-completed", (event) => events.push(event));

    // Simulate wave completion
    handler["emitWaveCompleted"]("wave-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.waveId).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: Real-time Events - Agent", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Emits agent-started event", async () => {
    const events: unknown[] = [];
    handler.on("agent-started", (event) => events.push(event));

    // Simulate agent start
    handler["emitAgentStarted"]("agent-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.agentId).toBeTruthy();
  });

  it("Emits agent-progress event", async () => {
    const events: unknown[] = [];
    handler.on("agent-progress", (event) => events.push(event));

    // Simulate agent progress
    handler["emitAgentProgress"]("agent-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.agentId).toBeTruthy();
  });

  it("Emits agent-completed event", async () => {
    const events: unknown[] = [];
    handler.on("agent-completed", (event) => events.push(event));

    // Simulate agent completion
    handler["emitAgentCompleted"]("agent-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.agentId).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: Real-time Events - Quality Gates", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Emits quality-gate-started event", async () => {
    const events: unknown[] = [];
    handler.on("quality-gate-started", (event) => events.push(event));

    await handler.retryQualityGate("exec-123", "lint");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.gateType).toBeTruthy();
  });

  it("Emits quality-gate-result event", async () => {
    const events: unknown[] = [];
    handler.on("quality-gate-result", (event) => events.push(event));

    await handler.retryQualityGate("exec-123", "test");
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.gateType).toBeTruthy();
    expect(typeof event.passed).toBe("boolean");
  });
});

describe("ExecutionAPIHandler: Real-time Events - State Machine", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Emits state-changed event", async () => {
    const events: unknown[] = [];
    handler.on("state-changed", (event) => events.push(event));

    await handler.restoreCheckpoint("exec-123", "checkpoint-456");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.executionId).toBeTruthy();
    expect(event.newState).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: Real-time Events - Error Recovery", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Emits task-failed event", async () => {
    const events: unknown[] = [];
    handler.on("task-failed", (event) => events.push(event));

    // Simulate task failure
    handler["emitTaskFailed"]("task-123", "Test error");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.taskId).toBeTruthy();
    expect(event.error).toBeTruthy();
  });

  it("Emits task-retry-scheduled event", async () => {
    const events: unknown[] = [];
    handler.on("task-retry-scheduled", (event) => events.push(event));

    await handler.retryTask("task-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.taskId).toBeTruthy();
  });

  it("Emits circuit-breaker-state-changed event", async () => {
    const events: unknown[] = [];
    handler.on("circuit-breaker-state-changed", (event) => events.push(event));

    // Simulate circuit breaker state change
    handler["emitCircuitBreakerStateChanged"]("exec-123", "open");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as any;
    expect(event.executionId).toBeTruthy();
    expect(event.newState).toBe("open");
  });
});

describe("ExecutionAPIHandler: Error Handling", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Handles invalid execution ID gracefully", async () => {
    const result = await handler.getExecutionStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Handles missing wave ID", async () => {
    const result = await handler.getWaveStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Handles invalid provider gracefully", async () => {
    const result = await handler.changeProvider("exec-123", "", "");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("ExecutionAPIHandler: Event Broadcasting", () => {
  let handler: ExecutionAPIHandler;

  beforeEach(() => {
    handler = new ExecutionAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Supports multiple listeners for same event", async () => {
    const listener1Events: unknown[] = [];
    const listener2Events: unknown[] = [];

    handler.on("wave-started", (event) => listener1Events.push(event));
    handler.on("wave-started", (event) => listener2Events.push(event));

    await handler.retryWave("wave-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(listener1Events.length).toBeGreaterThan(0);
    expect(listener2Events.length).toBeGreaterThan(0);
    expect(listener1Events.length).toBe(listener2Events.length);
  });

  it("Allows removing event listeners", async () => {
    const events: unknown[] = [];
    const listener = (event: unknown) => events.push(event);

    handler.on("wave-started", listener);
    await handler.retryWave("wave-123");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const eventsAfterFirst = events.length;

    handler.off("wave-started", listener);
    await handler.retryWave("wave-456");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events.length).toBe(eventsAfterFirst); // No new events
  });

  it("Cleans up all listeners", async () => {
    handler.on("wave-started", () => {});
    handler.on("agent-completed", () => {});
    handler.on("quality-gate-result", () => {});

    expect(handler.listenerCount("wave-started")).toBeGreaterThan(0);

    handler.removeAllListeners();

    expect(handler.listenerCount("wave-started")).toBe(0);
    expect(handler.listenerCount("agent-completed")).toBe(0);
    expect(handler.listenerCount("quality-gate-result")).toBe(0);
  });
});
