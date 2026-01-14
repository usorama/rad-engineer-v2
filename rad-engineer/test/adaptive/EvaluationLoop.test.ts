/**
 * EvaluationLoop Tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { EvaluationLoop } from "../../src/adaptive/EvaluationLoop.js";
import { PerformanceStore } from "../../src/adaptive/PerformanceStore.js";

describe("EvaluationLoop", () => {
  let store: PerformanceStore;
  let evaluation: EvaluationLoop;

  beforeEach(() => {
    store = new PerformanceStore();
    evaluation = new EvaluationLoop(store);
  });

  it("should evaluate response", async () => {
    const result = await evaluation.evaluate(
      "What is 2 + 2?",
      "2 + 2 equals 4.",
      "anthropic",
      "claude-3-5-sonnet-20241022"
    );

    expect(result.query).toBe("What is 2 + 2?");
    expect(result.response).toBe("2 + 2 equals 4.");
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-3-5-sonnet-20241022");
    expect(result.metrics.answerRelevancy).toBeGreaterThanOrEqual(0);
    expect(result.metrics.answerRelevancy).toBeLessThanOrEqual(1);
    expect(result.metrics.faithfulness).toBeGreaterThanOrEqual(0);
    expect(result.metrics.faithfulness).toBeLessThanOrEqual(1);
    expect(result.metrics.overall).toBeGreaterThanOrEqual(0);
    expect(result.metrics.overall).toBeLessThanOrEqual(1);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("should evaluate and update store", async () => {
    const result = await evaluation.evaluateAndUpdate(
      "What is 2 + 2?",
      "2 + 2 equals 4.",
      "anthropic",
      "claude-3-5-sonnet-20241022",
      [],
      0.003,
      1200
    );

    expect(result.success).toBeDefined();

    // Check store was updated - use "general" domain since that's what "What is 2 + 2?" classifies as
    const stats = store.getStats("anthropic", "claude-3-5-sonnet-20241022", "general");
    expect(stats).toBeDefined();
  });

  it("should batch evaluate", async () => {
    const evaluations = [
      {
        query: "What is 2 + 2?",
        response: "2 + 2 equals 4.",
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
      },
      {
        query: "What is 3 + 3?",
        response: "3 + 3 equals 6.",
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
      },
    ];

    const results = await evaluation.evaluateBatch(evaluations);

    expect(results).toHaveLength(2);
    expect(results[0].query).toBe("What is 2 + 2?");
    expect(results[1].query).toBe("What is 3 + 3?");
  });

  it("should calculate correct overall score", async () => {
    const result = await evaluation.evaluate(
      "Write a function",
      "function test() { return true; }",
      "anthropic",
      "claude-3-5-sonnet-20241022",
      ["function test() { return true; }"] // Context
    );

    expect(result.metrics.overall).toBeGreaterThanOrEqual(0);
    expect(result.metrics.overall).toBeLessThanOrEqual(1);
  });

  it("should detect catastrophic forgetting", () => {
    // Add some initial data
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

    // Now add failures (simulating forgetting)
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

    const hasForgetting = evaluation.detectCatastrophicForgetting(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "code"
    );

    expect(hasForgetting).toBe(true);
  });

  it("should get evaluation statistics", () => {
    // Add some data
    for (let i = 0; i < 10; i++) {
      store.updateStats(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "code",
        0.5,
        i < 7, // 70% success
        0.003,
        i < 7 ? 0.9 : 0.5,
        1200
      );
    }

    const stats = evaluation.getStats();

    expect(stats.totalEvaluations).toBe(10);
    expect(stats.averageQuality).toBeGreaterThan(0);
    expect(stats.successRate).toBeGreaterThan(0);
    expect(stats.successRate).toBeLessThanOrEqual(1);
  });

  it("should compare providers", () => {
    // Add stats for both providers
    for (let i = 0; i < 10; i++) {
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
    }

    const comparison = evaluation.compareProviders([
      { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
      { provider: "glm", model: "glm-4.7" },
    ]);

    expect(comparison).toHaveLength(2);
    expect(comparison[0].avgQuality).toBeGreaterThan(0);
    expect(comparison[0].avgCost).toBeGreaterThan(0);
  });

  it("should update config", () => {
    evaluation.updateConfig({
      timeout: 10000,
      weights: {
        relevancy: 0.4,
        faithfulness: 0.3,
        precision: 0.2,
        recall: 0.1,
      },
    });

    const config = evaluation.getConfig();

    expect(config.timeout).toBe(10000);
    expect(config.weights.relevancy).toBe(0.4);
    expect(config.weights.recall).toBe(0.1);
  });

  it("should handle empty context", async () => {
    const result = await evaluation.evaluate(
      "What is 2 + 2?",
      "2 + 2 equals 4.",
      "anthropic",
      "claude-3-5-sonnet-20241022",
      [] // No context
    );

    expect(result.metrics.faithfulness).toBe(0.5); // Default when no context
  });

  it("should handle code domain queries", async () => {
    const result = await evaluation.evaluate(
      "Write a function",
      "function test() { return true; }",
      "anthropic",
      "claude-3-5-sonnet-20241022"
    );

    // Relevancy should be high for code
    expect(result.metrics.answerRelevancy).toBeGreaterThan(0.3);
  });
});
