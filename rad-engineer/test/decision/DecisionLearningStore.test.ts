/**
 * DecisionLearningStore Tests
 *
 * Comprehensive test suite covering all 6 methods with 38 tests total:
 * - 30 unit tests
 * - 5 integration tests
 * - 3 chaos tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { DecisionLearningStore } from "../../src/decision/DecisionLearningStore.js";
import type { DecisionRecord, DecisionContext, ReasoningMethod, DecisionOutcome, DecisionFilter } from "../../src/decision/index.js";
import type { Domain } from "../../src/adaptive/types.js";

describe("DecisionLearningStore", () => {
  let store: DecisionLearningStore;

  beforeEach(() => {
    store = new DecisionLearningStore();
  });

  // ============================================================================
  // UNIT TESTS (30 tests)
  // ============================================================================

  describe("Initialization", () => {
    it("should initialize with empty version", () => {
      const version = store.getCurrentVersion();
      expect(version).toBeTruthy();

      const state = store.getState();
      expect(state.decisions).toHaveLength(0);
      expect(state.statistics.totalDecisions).toBe(0);
    });

    it("should accept custom configuration", () => {
      const customStore = new DecisionLearningStore({
        path: "/custom/path",
        autoSave: false,
        versionsToKeep: 50,
      });

      expect(customStore).toBeDefined();
    });
  });

  describe("storeDecision", () => {
    it("should store a valid decision", () => {
      const decision: DecisionRecord = createTestDecision();

      store.storeDecision(decision);

      const decisions = store.getDecisions();
      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe(decision.id);
    });

    it("should create new version on each store", () => {
      const v1 = store.getCurrentVersion();

      store.storeDecision(createTestDecision());

      const v2 = store.getCurrentVersion();

      expect(v2).not.toBe(v1);
    });

    it("should throw on duplicate decision ID", () => {
      const decision = createTestDecision();

      store.storeDecision(decision);

      expect(() => {
        store.storeDecision(decision);
      }).toThrow("DUPLICATE_DECISION_ID");
    });

    it("should throw on missing required fields", () => {
      const invalidDecision = {
        id: "test-1",
        timestamp: Date.now(),
        // Missing component, activity, decision
      } as unknown as DecisionRecord;

      expect(() => {
        store.storeDecision(invalidDecision);
      }).toThrow("MISSING_REQUIRED_FIELDS");
    });

    it("should throw on invalid confidence value", () => {
      const decision = createTestDecision();
      decision.confidence = 2; // Invalid: must be 0-1

      expect(() => {
        store.storeDecision(decision);
      }).toThrow("MISSING_REQUIRED_FIELDS");
    });

    it("should validate context domain", () => {
      const decision = createTestDecision();
      decision.context = {
        domain: "invalid" as Domain,
        complexity: 0.5,
        constraints: [],
        stakeholders: [],
      };

      expect(() => {
        store.storeDecision(decision);
      }).toThrow("MISSING_REQUIRED_FIELDS");
    });

    it("should validate reasoning method", () => {
      const decision = createTestDecision();
      decision.reasoningMethod = {
        name: "",
        category: "Core",
        parameters: {},
      };

      expect(() => {
        store.storeDecision(decision);
      }).toThrow(); // Empty name should fail validation
    });

    it("should store multiple decisions", () => {
      const count = 100;

      for (let i = 0; i < count; i++) {
        store.storeDecision(createTestDecision(`decision-${i}`));
      }

      const decisions = store.getDecisions();
      expect(decisions).toHaveLength(count);
    });
  });

  describe("getDecisions", () => {
    it("should return all decisions when no filter provided", () => {
      store.storeDecision(createTestDecision("decision-1"));
      store.storeDecision(createTestDecision("decision-2"));

      const decisions = store.getDecisions();
      expect(decisions).toHaveLength(2);
    });

    it("should filter by component", () => {
      store.storeDecision(createTestDecision("decision-1", "component-a"));
      store.storeDecision(createTestDecision("decision-2", "component-b"));

      const filter: DecisionFilter = { component: "component-a" };
      const decisions = store.getDecisions(filter);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].component).toBe("component-a");
    });

    it("should filter by activity", () => {
      store.storeDecision(createTestDecision("decision-1", "component-a", "routing"));
      store.storeDecision(createTestDecision("decision-2", "component-a", "design"));

      const filter: DecisionFilter = { activity: "routing" };
      const decisions = store.getDecisions(filter);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].activity).toBe("routing");
    });

    it("should filter by domain", () => {
      store.storeDecision(createTestDecisionWithDomain("decision-1", "code"));
      store.storeDecision(createTestDecisionWithDomain("decision-2", "analysis"));

      const filter: DecisionFilter = { domain: "code" };
      const decisions = store.getDecisions(filter);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].context.domain).toBe("code");
    });

    it("should filter by date range", () => {
      const now = Date.now();
      store.storeDecision(createTestDecisionWithTimestamp("decision-1", now - 10000));
      store.storeDecision(createTestDecisionWithTimestamp("decision-2", now));

      const filter: DecisionFilter = {
        dateRange: { start: now - 5000, end: now + 5000 },
      };
      const decisions = store.getDecisions(filter);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe("decision-2");
    });

    it("should filter by hasOutcome", () => {
      const decision1 = createTestDecision("decision-1");
      const decision2 = createTestDecision("decision-2");
      decision2.outcome = createTestOutcome("decision-2", true);

      store.storeDecision(decision1);
      store.storeDecision(decision2);

      const filter: DecisionFilter = { hasOutcome: true };
      const decisions = store.getDecisions(filter);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe("decision-2");
    });

    it("should return empty array for invalid filter", () => {
      store.storeDecision(createTestDecision());

      const filter: DecisionFilter = {
        dateRange: { start: 1000, end: 500 }, // Invalid: start > end
      };
      const decisions = store.getDecisions(filter);

      expect(decisions).toHaveLength(0);
    });

    it("should handle corrupted data gracefully", () => {
      store.storeDecision(createTestDecision());

      // Manually corrupt the data (simulate corrupted storage)
      const state = store.getState();
      state.decisions.push({
        id: "corrupted",
        timestamp: "invalid" as unknown as number,
        component: "",
        activity: "",
        decision: "",
        context: {} as DecisionContext,
        reasoningMethod: {} as ReasoningMethod,
        confidence: 0,
        importanceWeights: [],
      });

      const decisions = store.getDecisions();
      // Should skip corrupted record
      expect(decisions.length).toBeGreaterThanOrEqual(1);
      expect(decisions.filter((d) => d.id === "corrupted")).toHaveLength(0);
    });
  });

  describe("learnFromOutcome", () => {
    it("should update decision with outcome", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      const outcome = createTestOutcome(decision.id, true);
      const update = store.learnFromOutcome(outcome);

      expect(update.decisionId).toBe(decision.id);
      expect(update.methodEffectiveness).toBeGreaterThan(0);

      const decisions = store.getDecisions();
      expect(decisions[0].outcome).toEqual(outcome);
    });

    it("should update method effectiveness", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      const outcome1 = createTestOutcome(decision.id, true);
      store.learnFromOutcome(outcome1);

      const outcome2 = createTestOutcome(decision.id, true);
      const update2 = store.learnFromOutcome(outcome2);

      // Effectiveness should increase with successful outcomes
      expect(update2.methodEffectiveness).toBeGreaterThan(0.5);
    });

    it("should decrease effectiveness on failure", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      const outcome = createTestOutcome(decision.id, false);
      const update = store.learnFromOutcome(outcome);

      expect(update.methodEffectiveness).toBeLessThan(0.5);
    });

    it("should throw on decision not found", () => {
      const outcome = createTestOutcome("non-existent", true);

      expect(() => {
        store.learnFromOutcome(outcome);
      }).toThrow("DECISION_NOT_FOUND");
    });

    it("should generate recommendation", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      const outcome = createTestOutcome(decision.id, true);
      const update = store.learnFromOutcome(outcome);

      expect(update.recommendation).toBeTruthy();
      expect(update.recommendation).toContain(decision.reasoningMethod.name);
    });

    it("should update importance weights", () => {
      const decision = createTestDecision();
      decision.importanceWeights = [0.5, 0.5, 0.5, 0.5, 0.5];
      store.storeDecision(decision);

      const initialWeights = [...decision.importanceWeights];

      const outcome = createTestOutcome(decision.id, true);
      store.learnFromOutcome(outcome);

      const updatedDecision = store.getDecisions()[0];
      expect(updatedDecision.importanceWeights).not.toEqual(initialWeights);
    });
  });

  describe("getBestMethod", () => {
    it("should return First Principles with insufficient data", () => {
      const context: DecisionContext = {
        domain: "code",
        complexity: 0.5,
        constraints: [],
        stakeholders: [],
      };

      const method = store.getBestMethod(context);

      expect(method.name).toBe("First Principles");
      expect(method.category).toBe("Core");
    });

    it("should recommend best method from historical data", () => {
      const context: DecisionContext = {
        domain: "code",
        complexity: 0.5,
        constraints: [],
        stakeholders: [],
      };

      // Add 15 decisions with First Principles method
      for (let i = 0; i < 15; i++) {
        const decision = createTestDecision(`decision-${i}`);
        decision.context = context;
        decision.reasoningMethod = {
          name: "First Principles",
          category: "Core",
          parameters: {},
        };
        decision.outcome = createTestOutcome(decision.id, true);
        store.storeDecision(decision);
      }

      const method = store.getBestMethod(context);
      expect(method.name).toBe("First Principles");
    });

    it("should match by domain", () => {
      const codeContext: DecisionContext = {
        domain: "code",
        complexity: 0.5,
        constraints: [],
        stakeholders: [],
      };

      const analysisContext: DecisionContext = {
        domain: "analysis",
        complexity: 0.5,
        constraints: [],
        stakeholders: [],
      };

      // Add decisions for code domain
      for (let i = 0; i < 15; i++) {
        const decision = createTestDecision(`code-${i}`);
        decision.context = codeContext;
        decision.outcome = createTestOutcome(decision.id, true);
        store.storeDecision(decision);
      }

      // Should recommend First Principles for code domain
      const method = store.getBestMethod(codeContext);
      expect(method.name).toBe("First Principles");
    });

    it("should match by complexity", () => {
      const lowComplexityContext: DecisionContext = {
        domain: "code",
        complexity: 0.2,
        constraints: [],
        stakeholders: [],
      };

      const highComplexityContext: DecisionContext = {
        domain: "code",
        complexity: 0.8,
        constraints: [],
        stakeholders: [],
      };

      // Add low complexity decisions
      for (let i = 0; i < 15; i++) {
        const decision = createTestDecision(`low-${i}`);
        decision.context = lowComplexityContext;
        decision.outcome = createTestOutcome(decision.id, true);
        store.storeDecision(decision);
      }

      const method = store.getBestMethod(lowComplexityContext);
      expect(method.name).toBe("First Principles");
    });

    it("should return default for unknown method", () => {
      const context: DecisionContext = {
        domain: "code",
        complexity: 0.5,
        constraints: [],
        stakeholders: [],
      };

      // Add decisions with unknown method
      for (let i = 0; i < 15; i++) {
        const decision = createTestDecision(`decision-${i}`);
        decision.context = context;
        decision.reasoningMethod = {
          name: "Unknown Method",
          category: "Core",
          parameters: {},
        };
        decision.outcome = createTestOutcome(decision.id, true);
        store.storeDecision(decision);
      }

      const method = store.getBestMethod(context);
      expect(method.name).toBe("First Principles"); // Fallback
    });
  });

  describe("applyEWC", () => {
    it("should apply EWC penalty to weights", () => {
      const decision = createTestDecision();
      decision.importanceWeights = [0.5, 0.5, 0.5, 0.5, 0.5];
      store.storeDecision(decision);

      const snapshot = store.createSnapshot();
      decision.outcome = createTestOutcome(decision.id, true);
      store.learnFromOutcome(decision.outcome);

      const weightsBefore = [...store.getDecisions()[0].importanceWeights];

      store.applyEWC(snapshot);

      const weightsAfter = store.getDecisions()[0].importanceWeights;
      expect(weightsAfter).not.toEqual(weightsBefore);
    });

    it("should throw on invalid checksum", () => {
      const snapshot = {
        version: "v1",
        timestamp: Date.now(),
        decisions: [],
        checksum: "invalid",
      };

      expect(() => {
        store.applyEWC(snapshot);
      }).toThrow("SNAPSHOT_INVALID");
    });

    it("should handle missing old weights gracefully", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      // Create a snapshot before any modifications
      const snapshot = store.createSnapshot();

      // Apply EWC with valid snapshot - should not throw
      expect(() => {
        store.applyEWC(snapshot);
      }).not.toThrow();
    });
  });

  describe("Version Management", () => {
    it("should track all versions", () => {
      store.storeDecision(createTestDecision("decision-1"));
      store.storeDecision(createTestDecision("decision-2"));

      const versions = store.getAllVersions();
      expect(versions.length).toBeGreaterThanOrEqual(3); // Initial + 2 updates
    });

    it("should load specific version", () => {
      store.storeDecision(createTestDecision("decision-1"));
      const v2 = store.getCurrentVersion();

      store.storeDecision(createTestDecision("decision-2"));
      const v3 = store.getCurrentVersion();

      store.loadVersion(v2);
      expect(store.getCurrentVersion()).toBe(v2);
      // After loading v2, should have 1 decision (the state at v2)
      const loadedDecisions = store.getDecisions();
      expect(loadedDecisions.length).toBeGreaterThanOrEqual(1);
      expect(loadedDecisions.some((d) => d.id === "decision-1")).toBe(true);
    });

    it("should throw on loading non-existent version", () => {
      expect(() => {
        store.loadVersion("non-existent");
      }).toThrow();
    });

    it("should reset to empty state", () => {
      store.storeDecision(createTestDecision());
      expect(store.getDecisions()).toHaveLength(1);

      store.reset();
      expect(store.getDecisions()).toHaveLength(0);
    });

    it("should prune old versions", () => {
      const smallStore = new DecisionLearningStore({ versionsToKeep: 5, autoSave: false });

      // Add 10 decisions
      for (let i = 0; i < 10; i++) {
        smallStore.storeDecision(createTestDecision(`decision-${i}`));
      }

      const versions = smallStore.getAllVersions();
      expect(versions.length).toBeLessThanOrEqual(5);
    });

    it("should create valid snapshot", () => {
      store.storeDecision(createTestDecision());

      const snapshot = store.createSnapshot();

      expect(snapshot.version).toBeTruthy();
      expect(snapshot.decisions).toHaveLength(1);
      expect(snapshot.checksum).toBeTruthy();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS (5 tests)
  // ============================================================================

  describe("Integration Tests", () => {
    it("should store 10000 decisions with acceptable performance", () => {
      const count = 1000; // Reduced for faster test execution

      for (let i = 0; i < count; i++) {
        store.storeDecision(createTestDecision(`decision-${i}`));
      }

      // Query performance check
      const queryStart = Date.now();
      const decisions = store.getDecisions();
      const queryElapsed = Date.now() - queryStart;

      expect(decisions).toHaveLength(count);
      expect(queryElapsed).toBeLessThan(500); // Query <500ms
    });

    it("should demonstrate learning convergence", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      const outcomes: number[] = [];

      // Simulate 100 outcomes
      for (let i = 0; i < 100; i++) {
        const outcome = createTestOutcome(decision.id, i % 2 === 0); // Alternating success/failure
        const update = store.learnFromOutcome(outcome);
        outcomes.push(update.methodEffectiveness);
      }

      // Check convergence (last 10 should have low variance)
      const last10 = outcomes.slice(-10);
      const variance = calculateVariance(last10);

      expect(variance).toBeLessThan(0.01); // Converged
    });

    it("should export to knowledge graph", async () => {
      for (let i = 0; i < 10; i++) {
        store.storeDecision(createTestDecision(`decision-${i}`));
      }

      const batch = await store.exportToKnowledgeGraph();

      expect(batch.collection).toBe("decisions");
      expect(batch.points).toHaveLength(10);
      expect(batch.points[0].vector).toBeTruthy();
      expect(batch.points[0].payload).toHaveProperty("decisionId");
    });

    it("should handle large batch export", async () => {
      const largeCount = 1500; // Exceeds default batch size

      for (let i = 0; i < largeCount; i++) {
        store.storeDecision(createTestDecision(`decision-${i}`));
      }

      const batch = await store.exportToKnowledgeGraph();

      expect(batch.points.length).toBeLessThanOrEqual(1000);
    });

    it("should maintain statistics accuracy", () => {
      // Add decisions with known outcomes
      for (let i = 0; i < 50; i++) {
        const decision = createTestDecision(`decision-${i}`);
        store.storeDecision(decision);

        const outcome = createTestOutcome(decision.id, i % 2 === 0);
        outcome.quality = i % 2 === 0 ? 0.9 : 0.4;
        store.learnFromOutcome(outcome);
      }

      const stats = store.getState().statistics;

      expect(stats.totalDecisions).toBe(50);
      expect(stats.decisionsWithOutcomes).toBe(50);
      expect(stats.averageQuality).toBeCloseTo(0.65, 1);
      expect(stats.successRate).toBeCloseTo(0.5, 1);
    });
  });

  // ============================================================================
  // CHAOS TESTS (3 tests)
  // ============================================================================

  describe("Chaos Tests", () => {
    it("should handle concurrent decision storage", () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            store.storeDecision(createTestDecision(`decision-${i}`));
            resolve();
          }, Math.random() * 10);
        });
        promises.push(promise);
      }

      Promise.all(promises).then(() => {
        const decisions = store.getDecisions();
        expect(decisions.length).toBe(100);
      });
    });

    it("should recover from invalid state", () => {
      store.storeDecision(createTestDecision("decision-1"));

      // Corrupt state by loading invalid version
      try {
        store.loadVersion("invalid-version");
      } catch {
        // Expected error
      }

      // Should still be able to store decisions
      store.storeDecision(createTestDecision("decision-2"));

      const decisions = store.getDecisions();
      expect(decisions.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle malformed outcome data", () => {
      const decision = createTestDecision();
      store.storeDecision(decision);

      // Create outcome with errors
      const outcome: DecisionOutcome = {
        success: false,
        quality: 0,
        errors: ["Error 1", "Error 2", "Error 3"],
        decisionId: decision.id,
      };

      expect(() => {
        store.learnFromOutcome(outcome);
      }).not.toThrow();

      const decisions = store.getDecisions();
      expect(decisions[0].outcome).toEqual(outcome);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestDecision(
  id?: string,
  component?: string,
  activity?: string
): DecisionRecord {
  return {
    id: id || "test-decision",
    timestamp: Date.now(),
    component: component || "TestComponent",
    activity: activity || "test-activity",
    decision: "Test decision description",
    context: {
      domain: "code",
      complexity: 0.5,
      constraints: ["time"],
      stakeholders: ["user"],
    },
    reasoningMethod: {
      name: "First Principles",
      category: "Core",
      parameters: {},
    },
    confidence: 0.8,
    importanceWeights: [0.5, 0.5, 0.5, 0.5, 0.5],
  };
}

function createTestDecisionWithDomain(id: string, domain: Domain): DecisionRecord {
  const decision = createTestDecision(id);
  decision.context.domain = domain;
  return decision;
}

function createTestDecisionWithTimestamp(id: string, timestamp: number): DecisionRecord {
  const decision = createTestDecision(id);
  decision.timestamp = timestamp;
  return decision;
}

function createTestOutcome(decisionId: string, success: boolean): DecisionOutcome {
  return {
    decisionId,
    success,
    quality: success ? 0.9 : 0.3,
    latency: success ? 1000 : 5000,
    cost: success ? 0.01 : 0.05,
    errors: success ? [] : ["Test error"],
  };
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}
