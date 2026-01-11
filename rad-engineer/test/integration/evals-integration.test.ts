/**
 * EVALS System Integration Tests
 *
 * End-to-end tests for the entire EVALS pipeline:
 * - Cold start: Empty store → exploration → learning
 * - Warm start: Loaded state → exploitation → refinement
 * - Catastrophic forgetting: Learn A, then B, verify A still works
 * - Full pipeline: query → routing → provider → response → evaluation → update
 * - EVALS factory initialization with ProviderFactory
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";

// Import EVALS components
import { PerformanceStore } from "../../src/adaptive/PerformanceStore.js";
import { QueryFeatureExtractor } from "../../src/adaptive/QueryFeatureExtractor.js";
import { BanditRouter } from "../../src/adaptive/BanditRouter.js";
import { EvaluationLoop } from "../../src/adaptive/EvaluationLoop.js";
import { StateManager } from "../../src/adaptive/StateManager.js";
import { EvalsFactory } from "../../src/adaptive/EvalsFactory.js";
import type { EvalsSystem } from "../../src/adaptive/EvalsFactory.js";

// Import ProviderFactory
import { ProviderFactory } from "../../src/sdk/providers/ProviderFactory.js";
import type { ProviderType } from "../../src/sdk/providers/types.js";

describe("EVALS Integration Tests", () => {
  let store: PerformanceStore;
  let router: BanditRouter;
  let extractor: QueryFeatureExtractor;
  let evaluation: EvaluationLoop;
  let stateManager: StateManager;
  let tempPath: string;

  beforeEach(() => {
    store = new PerformanceStore();
    router = new BanditRouter(store, 0.1); // 10% exploration
    extractor = new QueryFeatureExtractor();
    evaluation = new EvaluationLoop(store);
    tempPath = `${tmpdir}/evals-integration-${Date.now()}.json`;
    stateManager = new StateManager(store, {
      path: tempPath,
      autoSave: false,
    });
  });

  afterEach(() => {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  });

  describe("Cold Start: Empty Store", () => {
    it("should explore with no prior data", async () => {
      const query = "Write a function to sort an array";
      const features = extractor.extract(query);

      // With no data, router should recommend exploration
      const shouldExplore = router.shouldExplore(features);
      expect(shouldExplore).toBe(true);
    });

    it("should learn from initial queries", async () => {
      // Simulate 10 queries with 80% success rate
      for (let i = 0; i < 10; i++) {
        const success = i < 8; // First 8 succeed
        store.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "code",
          0.5,
          success,
          0.003,
          success ? 0.9 : 0.5,
          1200
        );
      }

      const stats = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      expect(stats).toBeDefined();
      expect(stats?.success).toBe(8);
      expect(stats?.failure).toBe(2);
      expect(stats?.mean).toBeGreaterThan(0.7); // 80% success rate
    });

    it("should converge to best provider after learning", async () => {
      // Add stats for two providers
      // Provider 1: 70% success rate, cheaper
      for (let i = 0; i < 20; i++) {
        store.updateStats(
          "glm",
          "glm-4.7",
          "code",
          0.5,
          i < 14, // 70% success
          0.001, // Cheaper
          0.8,
          1500
        );
      }

      // Provider 2: 90% success rate, more expensive
      for (let i = 0; i < 20; i++) {
        store.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "code",
          0.5,
          i < 18, // 90% success
          0.003, // More expensive
          0.9,
          1200
        );
      }

      const features = {
        tokenCount: 100,
        lineCount: 5,
        maxDepth: 2,
        hasCodeBlock: false,
        hasMath: false,
        domain: "code" as const,
        complexityScore: 0.5,
      };

      // Run multiple routing decisions
      let anthropicCount = 0;
      let glmCount = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        const decision = await router.route(features);
        if (decision.provider === "anthropic") anthropicCount++;
        if (decision.provider === "glm") glmCount++;
      }

      // Should prefer Anthropic (higher quality) most of the time
      // But allow some exploration (10%)
      expect(anthropicCount).toBeGreaterThan(trials * 0.7);
    });
  });

  describe("Warm Start: Loaded State", () => {
    it("should load state and continue learning", async () => {
      // Add initial stats
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

      // Save state
      await stateManager.save();
      expect(existsSync(tempPath)).toBe(true);

      // Create new store and load
      const newStore = new PerformanceStore();
      const newStateManager = new StateManager(newStore, { path: tempPath });
      await newStateManager.load();

      // Verify state loaded
      const stats = newStore.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      expect(stats).toBeDefined();
      expect(stats?.success).toBe(1);
    });

    it("should exploit based on loaded state", async () => {
      // Add lots of data for high confidence
      for (let i = 0; i < 50; i++) {
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
      }

      const features = {
        tokenCount: 100,
        lineCount: 5,
        maxDepth: 2,
        hasCodeBlock: false,
        hasMath: false,
        domain: "code" as const,
        complexityScore: 0.5,
      };

      // With high confidence, should exploit
      const shouldExplore = router.shouldExplore(features);
      expect(shouldExplore).toBe(false);
    });
  });

  describe("Catastrophic Forgetting Prevention", () => {
    it("should detect catastrophic forgetting", () => {
      // Learn task A with high performance
      for (let i = 0; i < 20; i++) {
        store.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "code",
          0.5,
          true, // All success initially
          0.003,
          0.9,
          1200
        );
      }

      // Now simulate forgetting (performance drops)
      for (let i = 0; i < 20; i++) {
        store.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "code",
          0.5,
          false, // All failures now
          0.003,
          0.3,
          1200
        );
      }

      // Detect forgetting
      const hasForgetting = evaluation.detectCatastrophicForgetting(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code"
      );

      expect(hasForgetting).toBe(true);
    });

    it("should maintain performance on old tasks after learning new tasks", () => {
      // Learn task A (code domain)
      for (let i = 0; i < 20; i++) {
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
      }

      const codeStats = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      const codeMeanBefore = codeStats?.mean || 0;

      // Learn task B (creative domain) - shouldn't affect task A
      for (let i = 0; i < 20; i++) {
        store.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "creative",
          0.5,
          true,
          0.003,
          0.85,
          1000
        );
      }

      const codeStatsAfter = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      const codeMeanAfter = codeStatsAfter?.mean || 0;

      // Code domain performance should be maintained
      expect(codeMeanAfter).toBeCloseTo(codeMeanBefore, 1);

      // Creative domain should have its own stats
      const creativeStats = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "creative");
      expect(creativeStats).toBeDefined();
      expect(creativeStats?.success).toBe(20);
    });
  });

  describe("Full Pipeline", () => {
    it("should route query through full pipeline", async () => {
      const query = "Write a function to calculate fibonacci";

      // 1. Extract features
      const features = extractor.extract(query);
      expect(features.domain).toBe("code");
      expect(features.complexityScore).toBeGreaterThan(0);

      // 2. Add some stats so routing works
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code",
        features.complexityScore,
        true,
        0.003,
        0.9,
        1200
      );

      // 3. Route query
      const decision = await router.route(features);
      expect(decision.provider).toBeDefined();
      expect(decision.model).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);

      // 4. Simulate response and evaluate
      const response = "Here's a fibonacci function...";

      const evalResult = await evaluation.evaluate(
        query,
        response,
        decision.provider,
        decision.model
      );

      expect(evalResult.metrics.overall).toBeGreaterThanOrEqual(0);
      expect(evalResult.metrics.overall).toBeLessThanOrEqual(1);

      // 5. Update store
      const success = evalResult.metrics.overall >= 0.7;
      store.updateStats(
        decision.provider,
        decision.model,
        features.domain,
        features.complexityScore,
        success,
        0.003,
        evalResult.metrics.overall,
        1200
      );

      // 6. Verify stats updated
      const stats = store.getStats(decision.provider, decision.model, features.domain);
      expect(stats?.success).toBeGreaterThan(0);
    });

    it("should evaluate and update in one step", async () => {
      const query = "What is 2 + 2?";
      const response = "2 + 2 equals 4.";
      const provider = "anthropic";
      const model = "claude-3-5-sonnet-20241022";

      const result = await evaluation.evaluateAndUpdate(
        query,
        response,
        provider,
        model,
        [],
        0.003,
        1200
      );

      expect(result.success).toBeDefined();

      // Check store was updated
      // Note: The domain is extracted from the query by QueryFeatureExtractor
      // "What is 2 + 2?" has no domain keywords, so it's classified as "general"
      const stats = store.getStats(provider, model, "general");
      expect(stats).toBeDefined();
      // Check that stats were recorded (either success or failure)
      const totalSamples = (stats?.success || 0) + (stats?.failure || 0);
      expect(totalSamples).toBeGreaterThan(0);
    });
  });

  describe("EvalsFactory Integration", () => {
    it("should initialize EVALS system with ProviderFactory", async () => {
      // Set environment variable for availability validation
      // ProviderAvailability checks env vars, not the provider config
      process.env.ANTHROPIC_API_KEY = "sk-ant-test123";

      // Create a mock provider factory
      const factory = new ProviderFactory({
        defaultProvider: "anthropic" as ProviderType,
        providers: {
          anthropic: {
            providerType: "anthropic" as ProviderType,
            apiKey: "sk-ant-test123",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      // Initialize EVALS system
      const evals = await EvalsFactory.initialize(factory, {
        enabled: true,
        explorationRate: 0.1,
        qualityThreshold: 0.7,
        ewc: {
          enabled: true,
          lambda: 0.5,
        },
        state: {
          path: tempPath,
          autoSave: false,
          versionsToKeep: 100,
        },
        evaluation: {
          timeout: 5000,
          useLocalModel: false,
          localModel: "llama3.2",
        },
      });

      // Verify all components initialized
      expect(evals.router).toBeDefined();
      expect(evals.store).toBeDefined();
      expect(evals.featureExtractor).toBeDefined();
      expect(evals.evaluation).toBeDefined();
      expect(evals.stateManager).toBeDefined();

      // Verify routing enabled in factory
      expect(factory.isEvalsRoutingEnabled()).toBe(true);

      // Seed the store with some stats so routing works
      // The query "Write a function" will be classified as "code" domain
      evals.store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code",
        0.5, // complexity score
        true, // success
        0.003, // cost
        0.9, // quality
        1200 // latency
      );

      // Test routing through factory
      const query = "Write a function";
      const result = await factory.routeProvider(query);
      expect(result.provider).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(result.decision.provider).toBeDefined();

      // Disconnect and verify
      EvalsFactory.disconnect(factory, evals);
      expect(factory.isEvalsRoutingEnabled()).toBe(false);
    });

    it("should get system statistics", async () => {
      // Set environment variable for availability validation
      process.env.ANTHROPIC_API_KEY = "sk-ant-test123";

      const factory = new ProviderFactory({
        defaultProvider: "anthropic" as ProviderType,
        providers: {
          anthropic: {
            providerType: "anthropic" as ProviderType,
            apiKey: "sk-ant-test123",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      const evals = await EvalsFactory.initialize(factory, {
        state: {
          path: tempPath,
          autoSave: false,
          versionsToKeep: 100,
        },
      });

      // Add some data
      await evaluation.evaluateAndUpdate(
        "test",
        "response",
        "anthropic",
        "claude-3-5-sonnet-20241022",
        [],
        0.003,
        1200
      );

      const stats = EvalsFactory.getStats(evals);

      expect(stats.store).toBeDefined();
      expect(stats.evaluation).toBeDefined();
      expect(stats.routing).toBeDefined();
      expect(stats.routing.explorationRate).toBe(0.1);
    });
  });

  describe("State Persistence", () => {
    it("should save and load state correctly", async () => {
      // Add some stats
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

      // Save state
      await stateManager.save();
      expect(existsSync(tempPath)).toBe(true);

      // Create new store and load
      const newStore = new PerformanceStore();
      const newManager = new StateManager(newStore, { path: tempPath });
      await newManager.load();

      // Verify data loaded
      const stats = newStore.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      expect(stats).toBeDefined();
      expect(stats?.success).toBe(1);
      // Note: avgQuality uses EMA with alpha=0.1
      // Initial value is 0.5, so after first update with 0.9:
      // avgQuality = 0.9 * 0.5 + 0.1 * 0.9 = 0.54
      expect(stats?.avgQuality).toBeCloseTo(0.54, 1);
    });

    it("should export to JSON and import back", async () => {
      // Add stats
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

      // Export
      const exportPath = `${tmpdir}/export-${Date.now()}.json`;
      try {
        await stateManager.exportToFile(exportPath, "json");
        expect(existsSync(exportPath)).toBe(true);

        // Import to new store
        const newStore = new PerformanceStore();
        const newManager = new StateManager(newStore, { path: tempPath });
        await newManager.importFromFile(exportPath);

        // Verify
        const stats = newStore.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
        expect(stats).toBeDefined();
        expect(stats?.success).toBe(1);
      } finally {
        if (existsSync(exportPath)) {
          unlinkSync(exportPath);
        }
      }
    });
  });

  describe("Provider Comparison", () => {
    it("should compare two providers", () => {
      // Add stats for both providers
      for (let i = 0; i < 10; i++) {
        store.updateStats("anthropic", "claude-3-5-sonnet-20241022", "code", 0.5, true, 0.01, 0.9, 1200);
        store.updateStats("glm", "glm-4.7", "code", 0.5, true, 0.001, 0.8, 1500);
      }

      const comparison = router.compareProviders(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "glm",
        "glm-4.7"
      );

      expect(comparison.provider1.avgQuality).toBeGreaterThan(comparison.provider2.avgQuality);
      expect(comparison.provider1.avgCost).toBeGreaterThan(comparison.provider2.avgCost);
    });

    it("should evaluate and compare multiple providers", () => {
      const providers = [
        { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
        { provider: "glm", model: "glm-4.7" },
      ];

      // Add stats
      for (let i = 0; i < 10; i++) {
        store.updateStats("anthropic", "claude-3-5-sonnet-20241022", "code", 0.5, true, 0.01, 0.9, 1200);
        store.updateStats("glm", "glm-4.7", "code", 0.5, true, 0.001, 0.8, 1500);
      }

      const comparison = evaluation.compareProviders(providers);

      expect(comparison).toHaveLength(2);
      expect(comparison[0].avgQuality).toBeGreaterThan(0);
      expect(comparison[0].avgCost).toBeGreaterThan(0);
    });
  });

  describe("End-to-End Scenario", () => {
    it("should handle complete workflow: query → route → evaluate → learn", async () => {
      const queries = [
        "Write a function to sort an array",
        "Calculate fibonacci sequence",
        "Implement binary search",
        "Create a linked list",
        "Design a hash table",
      ];

      // Initial state: no data
      expect(router.shouldExplore(extractor.extract(queries[0]))).toBe(true);

      // Seed the store with initial stats so routing works
      // Seed stats for all domains to cover different query types
      // Need at least 10 samples per domain to pass shouldExplore threshold
      const domains = ["code", "analysis", "reasoning", "creative", "general"];
      for (const domain of domains) {
        for (let i = 0; i < 10; i++) {
          store.updateStats(
            "anthropic",
            "claude-3-5-sonnet-20241022",
            domain,
            0.5, // complexity (creates range [0.3, 0.7])
            true, // success
            0.003, // cost
            0.9, // quality
            1200 // latency
          );
        }
      }

      // Process all queries
      for (const query of queries) {
        const features = extractor.extract(query);

        // Route (will explore initially)
        const decision = await router.route(features);

        // Simulate response
        const response = `Here's how to ${query.toLowerCase()}...`;

        // Evaluate and update
        const result = await evaluation.evaluateAndUpdate(
          query,
          response,
          decision.provider,
          decision.model,
          [],
          0.003,
          1200
        );

        expect(result.success).toBeDefined();
      }

      // After learning, should have data
      const stats = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      expect(stats).toBeDefined();
      expect(stats?.success).toBeGreaterThan(0);

      // Should now exploit rather than explore
      const shouldExplore = router.shouldExplore(extractor.extract(queries[0]));
      expect(shouldExplore).toBe(false);
    });
  });
});
