/**
 * Unit tests for ContextAPIHandler
 *
 * Tests:
 * - Get all memories from DecisionLearningStore
 * - Search memories with filters (component, activity, domain, reasoning method)
 * - Get specific ADR by decision ID
 * - Get store statistics
 * - Event emissions (memories-updated, learning-updated)
 * - Error handling (not found, invalid queries)
 * - Memory item conversion
 * - ADR display formatting
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ContextAPIHandler } from "@/ui-adapter/ContextAPIHandler.js";
import type {
  ContextAPIHandlerConfig,
  MemorySearchQuery,
} from "@/ui-adapter/ContextAPIHandler.js";
import { DecisionLearningStore } from "@/decision/DecisionLearningStore.js";
import type {
  DecisionRecord,
  DecisionContext,
  DecisionOutcome,
  LearningUpdate,
} from "@/decision/DecisionLearningStore.js";

describe("ContextAPIHandler: getMemories", () => {
  let handler: ContextAPIHandler;
  let decisionStore: DecisionLearningStore;

  beforeEach(() => {
    decisionStore = new DecisionLearningStore();
    const config: ContextAPIHandlerConfig = {
      decisionStore,
      debug: false,
    };
    handler = new ContextAPIHandler(config);
  });

  it("Returns empty array when no decisions exist", async () => {
    const memories = await handler.getMemories();

    expect(memories).toEqual([]);
  });

  it("Returns all decisions as memory items", async () => {
    // Add test decisions with explicit timestamps
    const now = Date.now();
    const decision1: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decision1.timestamp = now - 1000; // 1 second ago

    const decision2: DecisionRecord = createTestDecision("decision-2", "execute", "validation");
    decision2.timestamp = now; // now (newest)

    decisionStore.storeDecision(decision1);
    decisionStore.storeDecision(decision2);

    const memories = await handler.getMemories();

    expect(memories).toHaveLength(2);
    expect(memories[0].id).toBe("decision-2"); // Newest first
    expect(memories[1].id).toBe("decision-1");
  });

  it("Memory items have correct structure", async () => {
    const decision: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decisionStore.storeDecision(decision);

    const memories = await handler.getMemories();

    const memory = memories[0];
    expect(memory.id).toBe("decision-1");
    expect(memory.component).toBe("plan");
    expect(memory.activity).toBe("requirements");
    expect(memory.decision).toBe("Test decision");
    expect(memory.domain).toBe("code");
    expect(memory.reasoningMethod).toBe("First Principles");
    expect(memory.methodCategory).toBe("Core");
    expect(memory.confidence).toBe(0.8);
    expect(memory.hasOutcome).toBe(false);
    expect(memory.complexity).toBe(0.5);
    expect(memory.constraints).toEqual(["time", "resources"]);
  });

  it("Memory items include outcome data when available", async () => {
    const decision: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decisionStore.storeDecision(decision);

    // Add outcome
    const outcome: DecisionOutcome = {
      success: true,
      quality: 0.9,
      latency: 100,
      cost: 0.05,
      errors: [],
      userFeedback: "Great decision",
      decisionId: "decision-1",
    };
    decisionStore.learnFromOutcome(outcome);

    const memories = await handler.getMemories();

    const memory = memories[0];
    expect(memory.hasOutcome).toBe(true);
    expect(memory.success).toBe(true);
    expect(memory.quality).toBe(0.9);
  });

  it("Sorts memories by timestamp descending (newest first)", async () => {
    const decision1: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decision1.timestamp = 1000;

    const decision2: DecisionRecord = createTestDecision("decision-2", "execute", "validation");
    decision2.timestamp = 3000;

    const decision3: DecisionRecord = createTestDecision("decision-3", "monitor", "analysis");
    decision3.timestamp = 2000;

    decisionStore.storeDecision(decision1);
    decisionStore.storeDecision(decision2);
    decisionStore.storeDecision(decision3);

    const memories = await handler.getMemories();

    expect(memories[0].id).toBe("decision-2"); // 3000
    expect(memories[1].id).toBe("decision-3"); // 2000
    expect(memories[2].id).toBe("decision-1"); // 1000
  });

  it("Throws error on store failure", async () => {
    // Create broken store
    const brokenStore = new DecisionLearningStore();
    // Intentionally break store for error testing
    (brokenStore as unknown as { getDecisions: () => void }).getDecisions = () => {
      throw new Error("Store failure");
    };

    const brokenHandler = new ContextAPIHandler({
      decisionStore: brokenStore,
    });

    await expect(brokenHandler.getMemories()).rejects.toThrow("Failed to retrieve memories");
  });
});

describe("ContextAPIHandler: searchMemories", () => {
  let handler: ContextAPIHandler;
  let decisionStore: DecisionLearningStore;

  beforeEach(() => {
    decisionStore = new DecisionLearningStore();
    const config: ContextAPIHandlerConfig = {
      decisionStore,
    };
    handler = new ContextAPIHandler(config);

    // Seed with test data
    const decisions: DecisionRecord[] = [
      createTestDecision("decision-1", "plan", "requirements"),
      createTestDecision("decision-2", "execute", "validation"),
      createTestDecision("decision-3", "plan", "architecture"),
      createTestDecision("decision-4", "monitor", "analysis"),
    ];

    decisions.forEach((d) => decisionStore.storeDecision(d));

    // Add outcome to decision-2
    const outcome: DecisionOutcome = {
      success: true,
      quality: 0.85,
      errors: [],
      decisionId: "decision-2",
    };
    decisionStore.learnFromOutcome(outcome);
  });

  it("Filters by component", async () => {
    const query: MemorySearchQuery = {
      component: "plan",
    };

    const results = await handler.searchMemories(query);

    expect(results).toHaveLength(2);
    expect(results[0].component).toBe("plan");
    expect(results[1].component).toBe("plan");
  });

  it("Filters by activity", async () => {
    const query: MemorySearchQuery = {
      activity: "validation",
    };

    const results = await handler.searchMemories(query);

    expect(results).toHaveLength(1);
    expect(results[0].activity).toBe("validation");
  });

  it("Filters by domain", async () => {
    const query: MemorySearchQuery = {
      domain: "code",
    };

    const results = await handler.searchMemories(query);

    // All test decisions use "code" domain
    expect(results).toHaveLength(4);
  });

  it("Filters by reasoning method", async () => {
    const query: MemorySearchQuery = {
      reasoningMethod: "First Principles",
    };

    const results = await handler.searchMemories(query);

    // All test decisions use "First Principles" method
    expect(results).toHaveLength(4);
  });

  it("Filters by hasOutcome", async () => {
    const query: MemorySearchQuery = {
      hasOutcome: true,
    };

    const results = await handler.searchMemories(query);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("decision-2");
  });

  it("Filters by date range", async () => {
    const now = Date.now();

    // Update timestamps
    const decisions = decisionStore.getDecisions();
    decisions[0].timestamp = now - 3000; // 3 seconds ago
    decisions[1].timestamp = now - 2000; // 2 seconds ago
    decisions[2].timestamp = now - 1000; // 1 second ago
    decisions[3].timestamp = now; // now

    const query: MemorySearchQuery = {
      dateRange: {
        start: now - 2500,
        end: now - 500,
      },
    };

    const results = await handler.searchMemories(query);

    // Should match decisions within range (2 and 1 seconds ago)
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("Combines multiple filters", async () => {
    const query: MemorySearchQuery = {
      component: "plan",
      hasOutcome: false,
    };

    const results = await handler.searchMemories(query);

    expect(results).toHaveLength(2);
    expect(results.every((m) => m.component === "plan")).toBe(true);
    expect(results.every((m) => !m.hasOutcome)).toBe(true);
  });

  it("Applies limit to results", async () => {
    const query: MemorySearchQuery = {
      limit: 2,
    };

    const results = await handler.searchMemories(query);

    expect(results).toHaveLength(2);
  });

  it("Returns empty array when no matches", async () => {
    const query: MemorySearchQuery = {
      component: "nonexistent",
    };

    const results = await handler.searchMemories(query);

    expect(results).toEqual([]);
  });

  it("Sorts results by timestamp descending", async () => {
    const now = Date.now();

    const decisions = decisionStore.getDecisions();
    decisions[0].timestamp = now - 3000;
    decisions[1].timestamp = now - 1000;
    decisions[2].timestamp = now - 2000;
    decisions[3].timestamp = now;

    const query: MemorySearchQuery = {};

    const results = await handler.searchMemories(query);

    // Verify descending order
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].timestamp).toBeGreaterThanOrEqual(results[i].timestamp);
    }
  });

  it("Throws error on store failure", async () => {
    const brokenStore = new DecisionLearningStore();
    // Intentionally break store for error testing
    (brokenStore as unknown as { getDecisions: () => void }).getDecisions = () => {
      throw new Error("Store failure");
    };

    const brokenHandler = new ContextAPIHandler({
      decisionStore: brokenStore,
    });

    await expect(brokenHandler.searchMemories({})).rejects.toThrow("Failed to search memories");
  });
});

describe("ContextAPIHandler: getADR", () => {
  let handler: ContextAPIHandler;
  let decisionStore: DecisionLearningStore;

  beforeEach(() => {
    decisionStore = new DecisionLearningStore();
    const config: ContextAPIHandlerConfig = {
      decisionStore,
    };
    handler = new ContextAPIHandler(config);
  });

  it("Returns ADR with full details", async () => {
    const decision: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decisionStore.storeDecision(decision);

    const adr = await handler.getADR("decision-1");

    expect(adr).not.toBeNull();
    expect(adr!.decision.id).toBe("decision-1");
    expect(adr!.context.domain).toBe("code");
    expect(adr!.context.complexity).toBe(0.5);
    expect(adr!.context.constraints).toEqual(["time", "resources"]);
    expect(adr!.context.stakeholders).toEqual(["team", "users"]);
  });

  it("Includes outcome when available", async () => {
    const decision: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decisionStore.storeDecision(decision);

    const outcome: DecisionOutcome = {
      success: true,
      quality: 0.9,
      latency: 100,
      cost: 0.05,
      errors: [],
      userFeedback: "Excellent",
      decisionId: "decision-1",
    };
    decisionStore.learnFromOutcome(outcome);

    const adr = await handler.getADR("decision-1");

    expect(adr!.outcome).toBeDefined();
    expect(adr!.outcome!.success).toBe(true);
    expect(adr!.outcome!.quality).toBe(0.9);
    expect(adr!.outcome!.latency).toBe(100);
    expect(adr!.outcome!.cost).toBe(0.05);
    expect(adr!.outcome!.userFeedback).toBe("Excellent");
  });

  it("Includes learning insights when outcome available", async () => {
    const decision: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decisionStore.storeDecision(decision);

    const outcome: DecisionOutcome = {
      success: true,
      quality: 0.9,
      errors: [],
      decisionId: "decision-1",
    };
    decisionStore.learnFromOutcome(outcome);

    const adr = await handler.getADR("decision-1");

    expect(adr!.learning).toBeDefined();
    expect(adr!.learning!.methodEffectiveness).toBeGreaterThan(0);
    expect(adr!.learning!.contextPatterns).toBeDefined();
    expect(adr!.learning!.recommendation).toBeDefined();
  });

  it("Returns null when decision not found", async () => {
    const adr = await handler.getADR("nonexistent");

    expect(adr).toBeNull();
  });

  it("Throws error on store failure", async () => {
    const brokenStore = new DecisionLearningStore();
    // Intentionally break store for error testing
    (brokenStore as unknown as { getDecisions: () => void }).getDecisions = () => {
      throw new Error("Store failure");
    };

    const brokenHandler = new ContextAPIHandler({
      decisionStore: brokenStore,
    });

    await expect(brokenHandler.getADR("decision-1")).rejects.toThrow("Failed to retrieve ADR");
  });
});

describe("ContextAPIHandler: getStatistics", () => {
  let handler: ContextAPIHandler;
  let decisionStore: DecisionLearningStore;

  beforeEach(() => {
    decisionStore = new DecisionLearningStore();
    const config: ContextAPIHandlerConfig = {
      decisionStore,
    };
    handler = new ContextAPIHandler(config);
  });

  it("Returns store statistics", async () => {
    // Add test decisions
    const decision1: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    const decision2: DecisionRecord = createTestDecision("decision-2", "execute", "validation");

    decisionStore.storeDecision(decision1);
    decisionStore.storeDecision(decision2);

    // Add outcome to decision-1
    const outcome: DecisionOutcome = {
      success: true,
      quality: 0.85,
      errors: [],
      decisionId: "decision-1",
    };
    decisionStore.learnFromOutcome(outcome);

    const stats = await handler.getStatistics();

    expect(stats.totalDecisions).toBe(2);
    expect(stats.decisionsWithOutcomes).toBe(1);
    expect(stats.averageQuality).toBeGreaterThan(0);
    expect(stats.successRate).toBe(1.0); // 100% success
    expect(stats.version).toBeDefined();
    expect(stats.lastUpdated).toBeGreaterThan(0);
  });

  it("Includes best methods", async () => {
    const decision: DecisionRecord = createTestDecision("decision-1", "plan", "requirements");
    decisionStore.storeDecision(decision);

    const outcome: DecisionOutcome = {
      success: true,
      quality: 0.9,
      errors: [],
      decisionId: "decision-1",
    };
    decisionStore.learnFromOutcome(outcome);

    const stats = await handler.getStatistics();

    expect(stats.bestMethods).toBeDefined();
    expect(typeof stats.bestMethods).toBe("object");
  });

  it("Throws error on store failure", async () => {
    const brokenStore = new DecisionLearningStore();
    // Intentionally break store for error testing
    (brokenStore as unknown as { getState: () => void }).getState = () => {
      throw new Error("Store failure");
    };

    const brokenHandler = new ContextAPIHandler({
      decisionStore: brokenStore,
    });

    await expect(brokenHandler.getStatistics()).rejects.toThrow("Failed to retrieve statistics");
  });
});

describe("ContextAPIHandler: Event Emissions", () => {
  let handler: ContextAPIHandler;
  let decisionStore: DecisionLearningStore;

  beforeEach(() => {
    decisionStore = new DecisionLearningStore();
    const config: ContextAPIHandlerConfig = {
      decisionStore,
    };
    handler = new ContextAPIHandler(config);
  });

  it("Emits memories-updated event", (done) => {
    handler.on("memories-updated", () => {
      done();
    });

    handler.notifyMemoriesUpdated();
  });

  it("Emits learning-updated event with update data", (done) => {
    const update: LearningUpdate = {
      decisionId: "decision-1",
      methodEffectiveness: 0.85,
      contextPatterns: { domain: 1, complexity: 0.5 },
      recommendation: "Continue using this method",
    };

    handler.on("learning-updated", (receivedUpdate) => {
      expect(receivedUpdate).toEqual(update);
      done();
    });

    handler.notifyLearningUpdate(update);
  });

  it("Supports multiple listeners", () => {
    let listener1Called = false;
    let listener2Called = false;

    handler.on("memories-updated", () => {
      listener1Called = true;
    });

    handler.on("memories-updated", () => {
      listener2Called = true;
    });

    handler.notifyMemoriesUpdated();

    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
  });
});

describe("ContextAPIHandler: Debug Logging", () => {
  it("Logs debug messages when enabled", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => {
      logs.push(msg);
    };

    const decisionStore = new DecisionLearningStore();
    const handler = new ContextAPIHandler({
      decisionStore,
      debug: true,
    });

    await handler.getMemories();
    await handler.searchMemories({});
    await handler.getStatistics();
    handler.notifyMemoriesUpdated();

    console.log = originalLog;

    expect(logs.some((log) => log.includes("[ContextAPIHandler]"))).toBe(true);
  });

  it("Does not log when debug disabled", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => {
      logs.push(msg);
    };

    const decisionStore = new DecisionLearningStore();
    const handler = new ContextAPIHandler({
      decisionStore,
      debug: false,
    });

    await handler.getMemories();

    console.log = originalLog;

    const debugLogs = logs.filter((log) => log.includes("[ContextAPIHandler]"));
    expect(debugLogs).toHaveLength(0);
  });
});

// Helper function to create test decision
function createTestDecision(id: string, component: string, activity: string): DecisionRecord {
  const context: DecisionContext = {
    domain: "code",
    complexity: 0.5,
    constraints: ["time", "resources"],
    stakeholders: ["team", "users"],
  };

  return {
    id,
    timestamp: Date.now(),
    component,
    activity,
    decision: "Test decision",
    context,
    reasoningMethod: {
      name: "First Principles",
      category: "Core",
      parameters: {},
    },
    confidence: 0.8,
    importanceWeights: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  };
}
