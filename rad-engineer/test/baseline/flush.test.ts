/**
 * Unit tests for flush method
 * Tests: buffer flushing, empty buffer, error handling
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { BaselineMeasurement, type MetricData } from "@/baseline/index.js";

const TEST_DIR = "metrics-test";
const TEST_FILE = join(TEST_DIR, "test-flush.jsonl");

describe("flush", () => {
  let baseline: BaselineMeasurement;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-flush.jsonl");
    await baseline.init();
  });

  afterEach(async () => {
    try {
      await unlink(TEST_FILE);
    } catch {
      // File may not exist
    }
  });

  it("Flush non-empty buffer", async () => {
    await baseline.recordMetric({
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete",
      taskType: "test",
    });

    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(1);
  });

  it("Flush empty buffer (no-op)", async () => {
    // Should not throw
    await baseline.flush();
    expect(true).toBe(true);
  });

  it("Flush after 50 metrics", async () => {
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(50);
  });

  it("Handle flush failure gracefully", async () => {
    const invalidBaseline = new BaselineMeasurement("/invalid/path/that/does/not/exist", "test.jsonl");

    await invalidBaseline.recordMetric({
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete" as const,
      taskType: "test",
    });

    // Should throw BaselineError
    await expect(invalidBaseline.flush()).rejects.toThrow();
  });

  it("Multiple flushes don't duplicate data", async () => {
    await baseline.recordMetric({
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete",
      taskType: "test",
    });

    await baseline.flush();
    await baseline.flush();
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(1);
  });

  it("Flush clears buffer", async () => {
    for (let i = 0; i < 10; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    await baseline.flush();

    // Buffer should be clear, add more and flush again
    await baseline.recordMetric({
      timestamp: 1704451210000,
      duration: 2000,
      outcome: "complete",
      taskType: "test",
    });

    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(11);
  });

  it("Flush preserves metric data integrity", async () => {
    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 1234,
      tokenUsage: { input: 5678, output: 9012 },
      outcome: "complete",
      taskType: "sdk-invoke",
      errorType: undefined,
      systemContext: { cpu: 50, memory: 70 },
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(TEST_FILE, "utf-8");
    const recovered = JSON.parse(content.trim()) as MetricData;

    expect(recovered.timestamp).toBe(metric.timestamp);
    expect(recovered.duration).toBe(metric.duration);
    expect(recovered.tokenUsage?.input).toBe(metric.tokenUsage?.input);
    expect(recovered.tokenUsage?.output).toBe(metric.tokenUsage?.output);
    expect(recovered.outcome).toBe(metric.outcome);
    expect(recovered.taskType).toBe(metric.taskType);
    expect(recovered.systemContext).toEqual(metric.systemContext);
  });
});
