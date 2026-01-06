/**
 * Integration tests for statistics and trend detection
 * Tests: percentile calculations, trend detection, real data
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink } from "node:fs/promises";
import { BaselineMeasurement } from "@/baseline/index.js";

const TEST_DIR = "metrics-test-integration";

describe("Integration: Statistics and Trends", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-stats.jsonl");
    await baseline.init();
  });

  afterEach(async () => {
    try {
      await unlink("metrics-test-integration/test-stats.jsonl");
    } catch {
      // File may not exist
    }
  });

  it("Calculate percentiles from real data", async () => {
    // Create 100 metrics with known distribution
    for (let i = 0; i < 100; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: i * 10, // 0, 10, 20, ... 990
        tokenUsage: { input: i * 5, output: i * 10 },
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const summary = await baseline.getMetrics();

    // P50 should be around 495 (median of 0-990)
    expect(summary.durationStats.p50).toBeGreaterThanOrEqual(490);
    expect(summary.durationStats.p50).toBeLessThanOrEqual(500);

    // P95 should be around 940
    expect(summary.durationStats.p95).toBeGreaterThanOrEqual(935);
    expect(summary.durationStats.p95).toBeLessThanOrEqual(945);

    // P99 should be around 980
    expect(summary.durationStats.p99).toBeGreaterThanOrEqual(975);
    expect(summary.durationStats.p99).toBeLessThanOrEqual(985);
  });

  it("Detect stable trend", async () => {
    // Create metrics with < 10% variance
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000 + (i % 5) * 10, // Varies between 1000-1040
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const summary = await baseline.getMetrics();

    expect(summary.trend).toBe("stable");
  });

  it("Detect increasing trend", async () => {
    // Create metrics with increasing values
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000 + i * 20, // Increases by 20 each time
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const summary = await baseline.getMetrics();

    expect(summary.trend).toBe("increasing");
  });

  it("Detect decreasing trend", async () => {
    // Create metrics with decreasing values
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 2000 - i * 15, // Decreases by 15 each time
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const summary = await baseline.getMetrics();

    expect(summary.trend).toBe("decreasing");
  });

  it("Handle small dataset", async () => {
    // Only 5 entries
    for (let i = 0; i < 5; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const summary = await baseline.getMetrics();

    expect(summary.count).toBe(5);
    expect(summary.durationStats.average).toBe(1000);
  });
});
