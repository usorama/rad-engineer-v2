/**
 * BanditRouter Tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { BanditRouter } from "../../src/adaptive/BanditRouter.js";
import { PerformanceStore } from "../../src/adaptive/PerformanceStore.js";

describe("BanditRouter", () => {
  let store: PerformanceStore;
  let router: BanditRouter;

  beforeEach(() => {
    store = new PerformanceStore();
    router = new BanditRouter(store);
  });

  it("should route query to provider", async () => {
    // Add some stats with multiple updates to ensure exploitation
    for (let i = 0; i < 15; i++) {
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

    const decision = await router.route(features);

    expect(decision.provider).toBe("anthropic");
    expect(decision.model).toBe("claude-3-5-sonnet-20241022");
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    // With enough data, should exploit (not explore)
    expect(decision.exploration).toBe(false);
  });

  it("should be deterministic", async () => {
    // Add stats with multiple updates to ensure exploitation
    for (let i = 0; i < 15; i++) {
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

    const decision1 = await router.route(features);
    const decision2 = await router.route(features);

    expect(decision1.provider).toBe(decision2.provider);
    expect(decision1.model).toBe(decision2.model);
    expect(decision1.confidence).toBe(decision2.confidence);
    expect(decision1.exploration).toBe(decision2.exploration);
  });

  it("should explore with probability", async () => {
    // Add stats with low sample count (should explore more)
    for (let i = 0; i < 5; i++) {
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

    // Run routing with different queries to test exploration
    // Each query has different complexity, which changes the seed
    let explorationCount = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      const features = {
        tokenCount: 100 + i,
        lineCount: 5,
        maxDepth: 2,
        hasCodeBlock: false,
        hasMath: false,
        domain: "code" as const,
        complexityScore: 0.5 + (i * 0.001), // Vary complexity to change seed
      };

      const decision = await router.route(features);
      if (decision.exploration) {
        explorationCount++;
      }
    }

    // Should explore roughly 10% of the time
    expect(explorationCount).toBeGreaterThan(0);
    expect(explorationCount).toBeLessThan(trials * 0.3); // Allow variance
  });

  it("should throw error if no candidates", async () => {
    const features = {
      tokenCount: 100,
      lineCount: 5,
      maxDepth: 2,
      hasCodeBlock: false,
      hasMath: false,
      domain: "code" as const,
      complexityScore: 0.5,
    };

    await expect(router.route(features)).rejects.toThrow("No candidates available");
  });

  it("should respect cost constraints", async () => {
    // Add expensive provider (multiple updates for EMA to converge)
    for (let i = 0; i < 10; i++) {
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code",
        0.5,
        true,
        0.01, // Expensive
        0.9,
        1200
      );
    }

    // Add cheap provider (multiple updates for EMA to converge)
    for (let i = 0; i < 10; i++) {
      store.updateStats(
        "glm",
        "glm-4.7",
        "code",
        0.5,
        true,
        0.001, // Cheap
        0.8,
        1500
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
      maxCost: 0.005, // Low cost budget
    };

    const decision = await router.route(features);

    // Should choose cheap provider
    expect(decision.provider).toBe("glm");
  });

  it("should respect quality constraints", async () => {
    // Add low quality provider (multiple updates for EMA to converge)
    for (let i = 0; i < 15; i++) {
      store.updateStats(
        "glm",
        "glm-4.7",
        "code",
        0.5,
        true,
        0.001,
        0.6, // Low quality
        1500
      );
    }

    // Add high quality provider (multiple updates for EMA to converge)
    for (let i = 0; i < 15; i++) {
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code",
        0.5,
        true,
        0.01,
        0.9, // High quality
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
      minQuality: 0.85, // High quality requirement
    };

    // With high quality requirement and enough data, should choose high quality provider
    // But Thompson Sampling is probabilistic, so we run multiple times
    let anthropicCount = 0;
    let glmCount = 0;
    const trials = 30;

    for (let i = 0; i < trials; i++) {
      const d = await router.route(features);
      if (d.provider === "anthropic") anthropicCount++;
      if (d.provider === "glm") glmCount++;
    }

    // Anthropic (higher quality) should be chosen more often due to quality constraint
    expect(anthropicCount).toBeGreaterThan(glmCount);
  });

  it("should compare providers", () => {
    // Add stats for both providers
    store.updateStats(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "general",
      0.5,
      true,
      0.01,
      0.9,
      1200
    );

    store.updateStats(
      "glm",
      "glm-4.7",
      "general",
      0.5,
      true,
      0.001,
      0.8,
      1500
    );

    const comparison = router.compareProviders(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "glm",
      "glm-4.7"
    );

    expect(comparison.provider1.avgQuality).toBeGreaterThan(
      comparison.provider2.avgQuality
    );
    expect(comparison.provider1.avgCost).toBeGreaterThan(
      comparison.provider2.avgCost
    );
  });

  it("should recommend whether to explore", () => {
    const features = {
      tokenCount: 100,
      lineCount: 5,
      maxDepth: 2,
      hasCodeBlock: false,
      hasMath: false,
      domain: "code" as const,
      complexityScore: 0.5,
    };

    // No data yet, should explore
    expect(router.shouldExplore(features)).toBe(true);

    // Add some data
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

    // With enough data, should exploit
    expect(router.shouldExplore(features)).toBe(false);
  });

  it("should set exploration rate", () => {
    router.setExplorationRate(0.2);
    expect(router.getExplorationRate()).toBe(0.2);

    router.setExplorationRate(0.05);
    expect(router.getExplorationRate()).toBe(0.05);
  });

  it("should reject invalid exploration rate", () => {
    expect(() => router.setExplorationRate(-1)).toThrow();
    expect(() => router.setExplorationRate(1.5)).toThrow();
  });
});
