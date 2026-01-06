/**
 * Unit tests for getMetrics method
 * Tests: metric retrieval, filtering, statistics, trend detection
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { BaselineMeasurement, type MetricData } from "@/baseline/index.js";

const TEST_DIR = "metrics-test";
const TEST_FILE = join(TEST_DIR, "test-get.jsonl");

describe("getMetrics", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-get.jsonl");
    await baseline.init();

    // Create sample metrics
    const metrics: MetricData[] = [
      { timestamp: 1704451200000, duration: 1000, tokenUsage: { input: 1000, output: 2000 }, outcome: "complete", taskType: "sdk-invoke" },
      { timestamp: 1704451201000, duration: 2000, tokenUsage: { input: 1500, output: 2500 }, outcome: "complete", taskType: "sdk-invoke" },
      { timestamp: 1704451202000, duration: 3000, tokenUsage: { input: 2000, output: 3000 }, outcome: "failed", taskType: "sdk-invoke" },
      { timestamp: 1704451203000, duration: 4000, tokenUsage: { input: 2500, output: 3500 }, outcome: "complete", taskType: "query" },
      { timestamp: 1704451204000, duration: 5000, tokenUsage: { input: 3000, output: 4000 }, outcome: "complete", taskType: "query" },
      { timestamp: 1704451205000, duration: 6000, tokenUsage: { input: 3500, output: 4500 }, outcome: "failed", taskType: "query" },
      { timestamp: 1704451206000, duration: 7000, tokenUsage: { input: 4000, output: 5000 }, outcome: "partial", taskType: "sdk-invoke" },
      { timestamp: 1704451207000, duration: 8000, tokenUsage: { input: 4500, output: 5500 }, outcome: "complete", taskType: "sdk-invoke" },
    ];

    for (const metric of metrics) {
      await baseline.recordMetric(metric);
    }
    await baseline.flush();
  });

  afterEach(async () => {
    try {
      await unlink(TEST_FILE);
    } catch {
      // File may not exist
    }
  });

  it("Get all metrics without filter", async () => {
    const summary = await baseline.getMetrics();

    expect(summary.count).toBe(8);
    expect(summary.tokenStats.average).toBeGreaterThan(0);
    expect(summary.durationStats.average).toBeGreaterThan(0);
  });

  it("Filter metrics by time range", async () => {
    const summary = await baseline.getMetrics({
      startTime: 1704451202000,
      endTime: 1704451205000,
    });

    expect(summary.count).toBe(4);
  });

  it("Filter metrics by task type", async () => {
    const summary = await baseline.getMetrics({
      taskType: "sdk-invoke",
    });

    expect(summary.count).toBe(5);
  });

  it("Filter metrics by outcome", async () => {
    const summary = await baseline.getMetrics({
      outcome: "complete",
    });

    expect(summary.count).toBe(5);
  });

  it("Calculate success rate correctly", async () => {
    const summary = await baseline.getMetrics();

    // 5 complete out of 8 total
    expect(summary.successRate).toBeCloseTo(0.625, 2);
  });

  it("Detect increasing trend", async () => {
    const baseline2 = new BaselineMeasurement(TEST_DIR, "test-increasing.jsonl");
    await baseline2.init();

    // Create metrics with increasing durations
    for (let i = 0; i < 20; i++) {
      await baseline2.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000 + i * 100,
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline2.flush();

    const summary = await baseline2.getMetrics();
    expect(summary.trend).toBe("increasing");

    await unlink(join(TEST_DIR, "test-increasing.jsonl"));
  });

  it("Handle corrupted JSON lines", async () => {
    const baseline2 = new BaselineMeasurement(TEST_DIR, "test-corrupt.jsonl");
    await baseline2.init();

    // Write corrupted file
    const content = [
      '{"timestamp":1704451200000,"duration":1000,"outcome":"complete","taskType":"test"}',
      "invalid json line",
      '{"timestamp":1704451201000,"duration":2000,"outcome":"complete","taskType":"test"}',
      "another invalid line",
      '{"timestamp":1704451202000,"duration":3000,"outcome":"complete","taskType":"test"}',
    ].join("\n");

    await writeFile(join(TEST_DIR, "test-corrupt.jsonl"), content);

    const summary = await baseline2.getMetrics();
    expect(summary.count).toBe(3); // Only valid lines

    await unlink(join(TEST_DIR, "test-corrupt.jsonl"));
  });

  it("Return empty summary for insufficient data", async () => {
    const baseline2 = new BaselineMeasurement(TEST_DIR, "test-empty.jsonl");
    await baseline2.init();

    const summary = await baseline2.getMetrics({
      taskType: "nonexistent",
    });

    expect(summary.count).toBe(0);
    expect(summary.tokenStats.average).toBe(0);
    expect(summary.durationStats.average).toBe(0);
  });
});
