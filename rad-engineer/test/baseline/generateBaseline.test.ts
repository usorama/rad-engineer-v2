/**
 * Unit tests for generateBaseline method
 * Tests: baseline report generation, thresholds, recommendations
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink } from "node:fs/promises";
import { BaselineMeasurement } from "@/baseline/index.js";

const TEST_DIR = "metrics-test";

describe("generateBaseline", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-baseline.jsonl");
    await baseline.init();
  });

  afterEach(async () => {
    try {
      await unlink("metrics-test/test-baseline.jsonl");
    } catch {
      // File may not exist
    }
  });

  it("Generate report with 50 metrics", async () => {
    // Create 50 diverse metrics
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000 + Math.random() * 2000,
        tokenUsage: { input: 1000 + Math.random() * 1000, output: 2000 + Math.random() * 2000 },
        outcome: Math.random() > 0.1 ? "complete" : "failed",
        taskType: i % 2 === 0 ? "sdk-invoke" : "query",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.summary.count).toBe(50);
    expect(report.thresholds).toBeDefined();
    expect(report.recommendations).toBeDefined();
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.warning).toBeUndefined();
  });

  it("Warn on insufficient data", async () => {
    // Create only 20 metrics
    for (let i = 0; i < 20; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.warning).toContain("Low sample size");
    expect(report.warning).toContain("less than 50");
  });

  it("Compare metrics against token thresholds", async () => {
    // Create metrics with high token usage
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        tokenUsage: { input: 80000, output: 85000 }, // Total 165K - exceeds warning
        outcome: "complete",
        taskType: "sdk-invoke",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.token.total.status).toBe("warning");
    expect(report.thresholds.token.total.current).toBeGreaterThan(report.thresholds.token.total.warning);
  });

  it("Compare success rate against thresholds", async () => {
    // Create metrics with 92% success rate
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: i < 46 ? "complete" : "failed", // 46/50 = 92%
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.successRate.current).toBeCloseTo(0.92, 1);
    expect(report.thresholds.successRate.status).toBe("target");
  });

  it("Generate recommendations for improvement", async () => {
    // Create metrics with high failure rate
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: i < 30 ? "complete" : "failed", // 60% success rate - below target
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.toLowerCase().includes("success rate"))).toBe(true);
  });

  it("Generate critical status for low success rate", async () => {
    // Create metrics with 65% success rate - below minimum
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: i < 33 ? "complete" : "failed", // 33/50 = 66%
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.successRate.status).toBe("critical");
    expect(report.recommendations.some((r) => r.toLowerCase().includes("critical"))).toBe(true);
  });

  it("Generate excellent status for high success rate", async () => {
    // Create metrics with 96% success rate
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: i < 48 ? "complete" : "failed", // 48/50 = 96%
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.successRate.status).toBe("excellent");
  });

  it("Include all threshold values", async () => {
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.token.total.warning).toBe(150000);
    expect(report.thresholds.token.total.critical).toBe(175000);
    expect(report.thresholds.token.total.maximum).toBe(190000);
    expect(report.thresholds.successRate.minimum).toBe(0.7);
    expect(report.thresholds.successRate.target).toBe(0.9);
    expect(report.thresholds.successRate.excellent).toBe(0.95);
  });

  it("Generate timeout threshold comparisons", async () => {
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 25000, // Below normal, above quick
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.timeout.quick.current).toBe(25000);
    expect(report.thresholds.timeout.normal.current).toBe(25000);
  });
});
