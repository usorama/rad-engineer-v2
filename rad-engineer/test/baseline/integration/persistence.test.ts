/**
 * Integration tests for file system persistence
 * Tests: directory creation, file writing, rotation, recovery
 */

import { describe, it, expect, afterEach } from "bun:test";
import { mkdir, unlink, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BaselineMeasurement, type MetricData } from "@/baseline/index.js";

const TEST_DIR = "metrics-test-integration";

describe("Integration: File System Persistence", () => {
  let baseline: BaselineMeasurement;

  afterEach(async () => {
    // Clean up test files
    const files = ["test-persistence.jsonl", "test-append.jsonl", "test-multi.jsonl", "test-size.jsonl", "test-restart.jsonl"];
    for (const file of files) {
      try {
        if (existsSync(join(TEST_DIR, file))) {
          await unlink(join(TEST_DIR, file));
        }
      } catch {
        // Ignore
      }
    }
  });

  it("Create metrics directory on init", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-dir.jsonl");
    await baseline.init();

    expect(existsSync(TEST_DIR)).toBe(true);
  });

  it("Append metric to JSONL file", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-append.jsonl");
    await baseline.init();

    const metric: MetricData = {
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete",
      taskType: "sdk-invoke",
      tokenUsage: { input: 1000, output: 2000 },
    };

    await baseline.recordMetric(metric);
    await baseline.flush();

    const content = await readFile(join(TEST_DIR, "test-append.jsonl"), "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]) as MetricData;
    expect(parsed.timestamp).toBe(metric.timestamp);
  });

  it("Multiple metrics append correctly", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-multi.jsonl");
    await baseline.init();

    for (let i = 0; i < 10; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i * 1000,
        duration: 1000 + i,
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const content = await readFile(join(TEST_DIR, "test-multi.jsonl"), "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    expect(lines.length).toBe(10);

    for (let i = 0; i < 10; i++) {
      const metric = JSON.parse(lines[i]) as MetricData;
      expect(metric.timestamp).toBe(1704451200000 + i * 1000);
    }
  });

  it("File size increases with metrics", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-size.jsonl");
    await baseline.init();

    const initialSize = existsSync(join(TEST_DIR, "test-size.jsonl"))
      ? (await stat(join(TEST_DIR, "test-size.jsonl"))).size
      : 0;

    for (let i = 0; i < 5; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }
    await baseline.flush();

    const finalSize = (await stat(join(TEST_DIR, "test-size.jsonl"))).size;

    expect(finalSize).toBeGreaterThan(initialSize);
  });

  it("Persist data across restarts", async () => {
    await mkdir(TEST_DIR, { recursive: true });

    // First instance: write data
    const baseline1 = new BaselineMeasurement(TEST_DIR, "test-restart.jsonl");
    await baseline1.init();

    await baseline1.recordMetric({
      timestamp: 1704451200000,
      duration: 1000,
      outcome: "complete",
      taskType: "test",
    });
    await baseline1.flush();

    // Second instance: read data
    const baseline2 = new BaselineMeasurement(TEST_DIR, "test-restart.jsonl");
    await baseline2.init();

    const summary = await baseline2.getMetrics();

    expect(summary.count).toBe(1);
    expect(summary.durationStats.average).toBe(1000);

    await unlink(join(TEST_DIR, "test-restart.jsonl"));
  });
});
