/**
 * Determinism Verification Tests
 *
 * Critical tests to verify the system is 100% deterministic
 */

import { describe, it, expect } from "bun:test";
import { SeededRandom, deterministicHash, createSeededRNG } from "../../src/adaptive/SeededRandom.js";
import { QueryFeatureExtractor } from "../../src/adaptive/QueryFeatureExtractor.js";
import { BanditRouter } from "../../src/adaptive/BanditRouter.js";
import { PerformanceStore } from "../../src/adaptive/PerformanceStore.js";

describe("Determinism Verification", () => {
  describe("SeededRandom", () => {
    it("should produce same sequence from same seed", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it("should produce different sequences from different seeds", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(43);

      expect(rng1.next()).not.toBe(rng2.next());
    });

    it("should be deterministic fornextInt", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100));
      }
    });

    it("should be deterministic for nextBeta", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      for (let i = 0; i < 50; i++) {
        expect(rng1.nextBeta(2, 5)).toBe(rng2.nextBeta(2, 5));
      }
    });

    it("should be deterministic for shuffle", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const array1 = [1, 2, 3, 4, 5];
      const array2 = [1, 2, 3, 4, 5];

      const shuffled1 = rng1.shuffle(array1);
      const shuffled2 = rng2.shuffle(array2);

      expect(shuffled1).toEqual(shuffled2);
    });
  });

  describe("deterministicHash", () => {
    it("should produce same hash for same input", () => {
      const input = "test query";
      const hash1 = deterministicHash(input);
      const hash2 = deterministicHash(input);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = deterministicHash("query 1");
      const hash2 = deterministicHash("query 2");

      expect(hash1).not.toBe(hash2);
    });

    it("should be deterministic across calls", () => {
      const input = "consistent input";

      const hashes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        hashes.add(deterministicHash(input));
      }

      // All hashes should be the same
      expect(hashes.size).toBe(1);
    });
  });

  describe("createSeededRNG", () => {
    it("should create deterministic RNG from input", () => {
      const input = "test input";

      const rng1 = createSeededRNG(input);
      const rng2 = createSeededRNG(input);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it("should create different RNGs from different inputs", () => {
      const rng1 = createSeededRNG("input 1");
      const rng2 = createSeededRNG("input 2");

      expect(rng1.next()).not.toBe(rng2.next());
    });
  });

  describe("QueryFeatureExtractor", () => {
    const extractor = new QueryFeatureExtractor();

    it("should be deterministic for feature extraction", () => {
      const query = "Write a function to sort an array";

      const features1 = extractor.extract(query);
      const features2 = extractor.extract(query);

      expect(JSON.stringify(features1)).toBe(JSON.stringify(features2));
    });

    it("should be deterministic across multiple runs", () => {
      const query = "Calculate fibonacci sequence";

      const allFeatures = [];
      for (let i = 0; i < 100; i++) {
        allFeatures.push(extractor.extract(query));
      }

      // All extractions should be identical
      const first = JSON.stringify(allFeatures[0]);
      for (const features of allFeatures) {
        expect(JSON.stringify(features)).toBe(first);
      }
    });

    it("should be deterministic for batch extraction", () => {
      const queries = ["query 1", "query 2", "query 3"];

      const batch1 = extractor.extractBatch(queries);
      const batch2 = extractor.extractBatch(queries);

      expect(JSON.stringify(batch1)).toBe(JSON.stringify(batch2));
    });

    it("should be deterministic for similarity calculation", () => {
      const query1 = "Write a function";
      const query2 = "Write a class";

      const sim1 = extractor.similarity(query1, query2);
      const sim2 = extractor.similarity(query1, query2);

      expect(sim1).toBe(sim2);
    });
  });

  describe("BanditRouter", () => {
    it("should be deterministic for routing decisions", async () => {
      const store = new PerformanceStore();
      const router = new BanditRouter(store);

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

      const features = {
        tokenCount: 100,
        lineCount: 5,
        maxDepth: 2,
        hasCodeBlock: false,
        hasMath: false,
        domain: "code" as const,
        complexityScore: 0.5,
      };

      const decisions = [];
      for (let i = 0; i < 100; i++) {
        const decision = await router.route(features);
        decisions.push({
          provider: decision.provider,
          model: decision.model,
          confidence: decision.confidence,
          exploration: decision.exploration,
        });
      }

      // All decisions should be identical
      const first = decisions[0];
      for (const decision of decisions) {
        expect(decision.provider).toBe(first.provider);
        expect(decision.model).toBe(first.model);
        expect(decision.confidence).toBe(first.confidence);
        expect(decision.exploration).toBe(first.exploration);
      }
    });

    it("should be deterministic with different state versions", async () => {
      const store = new PerformanceStore();
      const router = new BanditRouter(store);

      // Add stats first so routing works
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

      const features = {
        tokenCount: 100,
        lineCount: 5,
        maxDepth: 2,
        hasCodeBlock: false,
        hasMath: false,
        domain: "code" as const,
        complexityScore: 0.5,
      };

      // Get initial decision and save version
      const versionBefore = store.getCurrentVersion();
      const decision1 = await router.route(features);

      // Add more stats (new version)
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code",
        0.5,
        false,
        0.003,
        0.5,
        1200
      );

      // Load back to previous version
      store.loadVersion(versionBefore);

      const decision2 = await router.route(features);

      // Should be same because we loaded same version
      expect(decision2.provider).toBe(decision1.provider);
      expect(decision2.model).toBe(decision1.model);
    });
  });

  describe("PerformanceStore", () => {
    it("should be deterministic for updates", () => {
      const store1 = new PerformanceStore();
      const store2 = new PerformanceStore();

      // Same updates
      for (let i = 0; i < 10; i++) {
        store1.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "code",
          0.5,
          i < 5,
          0.003,
          0.9,
          1200
        );

        store2.updateStats(
          "anthropic",
          "claude-3-5-sonnet-20241022",
          "code",
          0.5,
          i < 5,
          0.003,
          0.9,
          1200
        );
      }

      const stats1 = store1.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      const stats2 = store2.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");

      expect(JSON.stringify(stats1)).toBe(JSON.stringify(stats2));
    });

    it("should be deterministic for version loading", () => {
      const store = new PerformanceStore();

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

      const version = store.getCurrentVersion();

      // Load same version multiple times
      const stats1 = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      store.loadVersion(version);
      const stats2 = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");
      store.loadVersion(version);
      const stats3 = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "code");

      expect(JSON.stringify(stats1)).toBe(JSON.stringify(stats2));
      expect(JSON.stringify(stats2)).toBe(JSON.stringify(stats3));
    });
  });

  describe("End-to-End Determinism", () => {
    it("should be 100% deterministic across full pipeline", async () => {
      const extractor = new QueryFeatureExtractor();
      const store = new PerformanceStore();
      const router = new BanditRouter(store);

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

      const query = "Write a function to sort an array";

      // Run full pipeline 100 times
      const results = [];
      for (let i = 0; i < 100; i++) {
        const features = extractor.extract(query);
        const decision = await router.route(features);
        results.push({
          features: JSON.stringify(features),
          provider: decision.provider,
          model: decision.model,
          confidence: decision.confidence,
          exploration: decision.exploration,
        });
      }

      // All results should be identical
      const first = results[0];
      for (const result of results) {
        expect(result.features).toBe(first.features);
        expect(result.provider).toBe(first.provider);
        expect(result.model).toBe(first.model);
        expect(result.confidence).toBe(first.confidence);
        expect(result.exploration).toBe(first.exploration);
      }
    });

    it("should maintain determinism after state updates", async () => {
      const extractor = new QueryFeatureExtractor();
      const store = new PerformanceStore();
      const router = new BanditRouter(store);

      const query = "Write a function to sort an array"; // Code domain query
      const features = extractor.extract(query);

      // Add initial stats for the same domain as the query
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        features.domain,
        features.complexityScore,
        true,
        0.003,
        0.9,
        1200
      );

      // Get decision before more updates
      const decisionsBefore = [];
      for (let i = 0; i < 10; i++) {
        const decision = await router.route(features);
        decisionsBefore.push({
          provider: decision.provider,
          model: decision.model,
        });
      }

      // Add more updates for the same domain
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        features.domain,
        features.complexityScore,
        true,
        0.003,
        0.9,
        1200
      );

      // Get decision after updates
      const decisionsAfter = [];
      for (let i = 0; i < 10; i++) {
        const decision = await router.route(features);
        decisionsAfter.push({
          provider: decision.provider,
          model: decision.model,
        });
      }

      // Before updates, all decisions should be identical
      const firstBefore = decisionsBefore[0];
      for (const decision of decisionsBefore) {
        expect(decision.provider).toBe(firstBefore.provider);
        expect(decision.model).toBe(firstBefore.model);
      }

      // After updates, all decisions should be identical
      const firstAfter = decisionsAfter[0];
      for (const decision of decisionsAfter) {
        expect(decision.provider).toBe(firstAfter.provider);
        expect(decision.model).toBe(firstAfter.model);
      }
    });
  });

  describe("SeededRandom reproducibility", () => {
    it("should maintain reproducibility across sessions", () => {
      const seed = "test-seed-12345";

      // First "session"
      const session1 = new SeededRandom(seed);
      const values1: number[] = [];
      for (let i = 0; i < 50; i++) {
        values1.push(session1.next());
      }

      // Second "session" (simulating restart)
      const session2 = new SeededRandom(seed);
      const values2: number[] = [];
      for (let i = 0; i < 50; i++) {
        values2.push(session2.next());
      }

      // Should be identical
      expect(values1).toEqual(values2);
    });

    it("should maintain determinism for Beta sampling", () => {
      const seed = "beta-test-seed";
      const alpha = 2.5;
      const beta = 3.5;

      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      for (let i = 0; i < 100; i++) {
        const sample1 = rng1.nextBeta(alpha, beta);
        const sample2 = rng2.nextBeta(alpha, beta);
        expect(sample1).toBe(sample2);
      }
    });
  });
});
