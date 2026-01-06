/**
 * Integration tests for baseline report generation
 * Tests: end-to-end report generation, threshold comparisons, recommendations
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { BaselineMeasurement } from "@/baseline/index.js";

const TEST_DIR = "metrics-test-integration";
const REPORT_FILE = join(TEST_DIR, "baseline-report.json");

describe("Integration: Baseline Report Generation", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-report.jsonl");
    await baseline.init();
  });

  afterEach(async () => {
    try {
      await unlink("metrics-test-integration/test-report.jsonl");
    } catch {
      // File may not exist
    }
    try {
      await unlink(REPORT_FILE);
    } catch {
      // File may not exist
    }
  });

  it("Generate complete baseline report", async () => {
    // Create 100 diverse metrics
    for (let i = 0; i < 100; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000 + Math.random() * 5000,
        tokenUsage: { input: 1000 + Math.random() * 5000, output: 2000 + Math.random() * 8000 },
        outcome: Math.random() > 0.15 ? "complete" : "failed",
        taskType: i % 2 === 0 ? "sdk-invoke" : "query",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    // Verify report structure
    expect(report.summary).toBeDefined();
    expect(report.thresholds).toBeDefined();
    expect(report.recommendations).toBeDefined();
    expect(report.generatedAt).toBeInstanceOf(Date);

    // Write to file and verify
    await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));

    const fileContent = await readFile(REPORT_FILE, "utf-8");
    const parsedReport = JSON.parse(fileContent);

    expect(parsedReport.summary.count).toBe(100);
    expect(parsedReport.thresholds.token.total.warning).toBe(150000);
  });

  it("Report includes threshold comparisons", async () => {
    // Create metrics with known token usage
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        tokenUsage: { input: 80000, output: 85000 }, // 165K total
        outcome: "complete",
        taskType: "sdk-invoke",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.token.total.current).toBeCloseTo(165000, 0);
    expect(report.thresholds.token.total.status).toBe("warning");
    expect(report.thresholds.token.total.warning).toBe(150000);
  });

  it("Report includes actionable recommendations", async () => {
    // Create metrics with high failure rate
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: i < 30 ? "complete" : "failed", // 60% success
        taskType: "sdk-invoke",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(
      report.recommendations.some((r: string) => r.toLowerCase().includes("success rate")),
    ).toBe(true);
  });

  it("Report generated with warning for low sample size", async () => {
    // Only 20 metrics
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

    expect(report.warning).toBeDefined();
    expect(report.warning).toContain("less than 50");
  });

  it("Report all threshold status levels", async () => {
    // Test excellent success rate
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000,
        outcome: i < 48 ? "complete" : "failed", // 96%
        taskType: "test",
      });
    }
    await baseline.flush();

    const report = await baseline.generateBaseline();

    expect(report.thresholds.successRate.status).toBe("excellent");
    expect(report.thresholds.successRate.current).toBeCloseTo(0.96, 1);
  });
});
