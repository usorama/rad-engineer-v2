/**
 * Unit tests for exportMetrics method
 * Tests: JSON and CSV export, format validation, error handling
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink } from "node:fs/promises";
import { BaselineMeasurement, type MetricData } from "@/baseline/index.js";

const TEST_DIR = "metrics-test";

describe("exportMetrics", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-export.jsonl");
    await baseline.init();

    const metrics: MetricData[] = [
      { timestamp: 1704451200000, duration: 1000, tokenUsage: { input: 1000, output: 2000 }, outcome: "complete", taskType: "sdk-invoke" },
      { timestamp: 1704451201000, duration: 2000, tokenUsage: { input: 1500, output: 2500 }, outcome: "complete", taskType: "sdk-invoke" },
      { timestamp: 1704451202000, duration: 3000, tokenUsage: { input: 2000, output: 3000 }, outcome: "failed", taskType: "query", errorType: "APIError" },
    ];

    for (const metric of metrics) {
      await baseline.recordMetric(metric);
    }
    await baseline.flush();
  });

  afterEach(async () => {
    try {
      await unlink("metrics-test/test-export.jsonl");
    } catch {
      // File may not exist
    }
  });

  it("Export to JSON format", async () => {
    const output = await baseline.exportMetrics("json");

    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output) as MetricData[];
    expect(parsed.length).toBe(3);
    expect(parsed[0].timestamp).toBe(1704451200000);
  });

  it("Export to CSV format", async () => {
    const output = await baseline.exportMetrics("csv");

    const lines = output.trim().split("\n");
    expect(lines.length).toBe(4); // Header + 3 data rows

    const headers = lines[0].split(",");
    expect(headers[0]).toContain("timestamp");
    expect(headers).toContain("duration");
    expect(headers).toContain("token_input");
  });

  it("Reject unsupported format", async () => {
    await expect(baseline.exportMetrics("xml" as "json")).rejects.toThrow();
  });

  it("Handle empty metrics file", async () => {
    const baseline2 = new BaselineMeasurement(TEST_DIR, "test-empty-export.jsonl");
    await baseline2.init();

    const output = await baseline2.exportMetrics("json");
    expect(output).toBe("[]");
  });

  it("CSV properly escapes special characters", async () => {
    const baseline2 = new BaselineMeasurement(TEST_DIR, "test-special.jsonl");
    await baseline2.init();

    await baseline2.recordMetric({
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete",
      taskType: "test with, comma",
    });
    await baseline2.flush();

    const output = await baseline2.exportMetrics("csv");
    expect(output).toContain('"test with, comma"');

    await unlink("metrics-test/test-special.jsonl");
  });

  it("JSON export includes all fields", async () => {
    const output = await baseline.exportMetrics("json");
    const parsed = JSON.parse(output) as MetricData[];

    expect(parsed[2].errorType).toBe("APIError");
    expect(parsed[0].tokenUsage?.input).toBe(1000);
  });

  it("CSV export includes error type", async () => {
    const output = await baseline.exportMetrics("csv");
    const lines = output.trim().split("\n");

    // Find the row with "failed" outcome
    const failedRow = lines.find((line) => line.includes(',"failed",'));
    expect(failedRow).toBeDefined();
    expect(failedRow).toContain(""); // errorType column should be empty string
  });
});
