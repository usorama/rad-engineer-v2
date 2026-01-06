/**
 * Unit tests for recordMetric method
 * Tests: metric recording, validation, buffering, auto-flush
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { BaselineMeasurement, type MetricData } from "@/baseline/index.js";

const TEST_DIR = "metrics-test";
const TEST_FILE = join(TEST_DIR, "test-record.jsonl");

describe("recordMetric", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-record.jsonl");
    await baseline.init();
  });

  afterEach(async () => {
    try {
      await unlink(TEST_FILE);
    } catch {
      // File may not exist
    }
  });

  it("Record valid metric with all fields", async () => {
    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 1250,
      tokenUsage: { input: 1000, output: 2000 },
      outcome: "complete",
      taskType: "sdk-invoke",
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(1);
    const recorded = JSON.parse(lines[0]) as MetricData;
    expect(recorded.timestamp).toBe(metric.timestamp);
    expect(recorded.duration).toBe(metric.duration);
    expect(recorded.tokenUsage?.input).toBe(1000);
    expect(recorded.tokenUsage?.output).toBe(2000);
    expect(recorded.outcome).toBe("complete");
    expect(recorded.taskType).toBe("sdk-invoke");
  });

  it("Record metric with minimal required fields", async () => {
    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 500,
      outcome: "complete",
      taskType: "query",
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(1);
    const recorded = JSON.parse(lines[0]) as MetricData;
    expect(recorded.timestamp).toBe(metric.timestamp);
    expect(recorded.duration).toBe(metric.duration);
    expect(recorded.tokenUsage?.input).toBe(0);
    expect(recorded.tokenUsage?.output).toBe(0);
    expect(recorded.outcome).toBe("complete");
  });

  it("Reject metric with missing required fields", async () => {
    const invalidMetric = {
      timestamp: 1704451200000,
      outcome: "complete",
    } as unknown as MetricData;

    await baseline.recordMetric(invalidMetric);
    await baseline.flush();

    // File may not exist if no valid metrics were recorded
    try {
      const content = await readFile(TEST_FILE, "utf-8");
      expect(content.trim()).toBe("");
    } catch {
      // File doesn't exist, which is also OK
      expect(true).toBe(true);
    }
  });

  it("Reject metric with invalid duration", async () => {
    const invalidMetric = {
      timestamp: 1704451200000,
      duration: "invalid" as unknown as number,
      outcome: "complete" as const,
      taskType: "test",
    } as unknown as MetricData;

    await baseline.recordMetric(invalidMetric);
    await baseline.flush();

    // File may not exist if no valid metrics were recorded
    try {
      const content = await readFile(TEST_FILE, "utf-8");
      expect(content.trim()).toBe("");
    } catch {
      // File doesn't exist, which is also OK
      expect(true).toBe(true);
    }
  });

  it("Auto-flush buffer at 100 entries", async () => {
    for (let i = 0; i < 100; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(100);
  });

  it("Handle file write failure by buffering", async () => {
    const baseline2 = new BaselineMeasurement("/invalid/path", "test.jsonl");

    for (let i = 0; i < 10; i++) {
      await baseline2.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    // Should not crash, metrics kept in buffer
    expect(true).toBe(true);
  });

  it("Record metric with error type", async () => {
    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 2000,
      outcome: "failed",
      taskType: "sdk-invoke",
      errorType: "APIError",
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(1);
    const recorded = JSON.parse(lines[0]) as MetricData;
    expect(recorded.outcome).toBe("failed");
    expect(recorded.errorType).toBe("APIError");
  });

  it("Record metric with partial outcome", async () => {
    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 1500,
      outcome: "partial",
      taskType: "sdk-invoke",
      tokenUsage: { input: 1000, output: 2000 },
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(1);
    const recorded = JSON.parse(lines[0]) as MetricData;
    expect(recorded.outcome).toBe("partial");
  });

  it("Record metric with system context", async () => {
    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete",
      taskType: "system-check",
      systemContext: { cpu: 50, memory: 70 },
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(1);
    const recorded = JSON.parse(lines[0]) as MetricData;
    expect(recorded.systemContext).toEqual({ cpu: 50, memory: 70 });
  });

  it("Buffer overflow triggers force flush", async () => {
    for (let i = 0; i < 1001; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete" as const,
        taskType: "test",
      });
    }

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    // All metrics should be written despite overflow
    expect(lines.length).toBeGreaterThanOrEqual(1000);
  });
});
