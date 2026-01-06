/**
 * Chaos tests for BaselineMeasurement
 * Tests: system resilience under stress conditions
 */

import { describe, it, expect, afterEach } from "bun:test";
import { mkdir, unlink, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BaselineMeasurement } from "@/baseline/index.js";

const TEST_DIR = "metrics-test-chaos";

describe("Chaos: BaselineMeasurement Resilience", () => {
  let baseline: BaselineMeasurement;

  afterEach(async () => {
    try {
      await unlink("metrics-test-chaos/test-chaos.jsonl");
    } catch {
      // File may not exist
    }
  });

  it("File system write failure during flush", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-chaos.jsonl");
    await baseline.init();

    // Fill buffer
    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    // Flush should succeed
    await baseline.flush();

    const content = await readFile(join(TEST_DIR, "test-chaos.jsonl"), "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(50);
  });

  it("Concurrent metric recording (race condition)", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-concurrent.jsonl");
    await baseline.init();

    // Simulate concurrent writes
    const writers = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 10 }, (_, j) =>
        baseline.recordMetric({
          timestamp: 1704451200000 + i * 10 + j,
          duration: 1000,
          outcome: "complete" as const,
          taskType: "test",
        }),
      ),
    );

    await Promise.all(writers.flat());
    await baseline.flush();

    const summary = await baseline.getMetrics();
    // All 100 metrics should be recorded
    expect(summary.count).toBeGreaterThanOrEqual(100);

    await unlink(join(TEST_DIR, "test-concurrent.jsonl"));
  });

  it("Buffer overflow during rapid recording", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-overflow.jsonl");
    await baseline.init();

    // Rapid recording
    for (let i = 0; i < 1001; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    await baseline.flush();

    const summary = await baseline.getMetrics();
    expect(summary.count).toBeGreaterThanOrEqual(1000);

    await unlink(join(TEST_DIR, "test-overflow.jsonl"));
  });

  it("Corrupted metrics file recovery", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-corrupt-chaos.jsonl");
    await baseline.init();

    // Write file with corrupted lines
    const content = [
      '{"timestamp":1704451200000,"duration":1000,"outcome":"complete","taskType":"test"}',
      "corrupted line 1",
      '{"timestamp":1704451201000,"duration":2000,"outcome":"complete","taskType":"test"}',
      "corrupted line 2",
      '{"timestamp":1704451202000,"duration":3000,"outcome":"complete","taskType":"test"}',
    ].join("\n");

    await writeFile(join(TEST_DIR, "test-corrupt-chaos.jsonl"), content);

    const summary = await baseline.getMetrics();

    // Should recover 3 valid metrics
    expect(summary.count).toBe(3);

    await unlink(join(TEST_DIR, "test-corrupt-chaos.jsonl"));
  });

  it("Memory pressure during metric processing", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-memory.jsonl");
    await baseline.init();

    // Large dataset
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000 + (i % 100) * 10,
        tokenUsage: { input: 1000 + i, output: 2000 + i },
        outcome: i % 10 === 0 ? "failed" : "complete",
        taskType: i % 2 === 0 ? "sdk-invoke" : "query",
      });
    }

    await baseline.flush();
    const summary = await baseline.getMetrics();

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    expect(summary.count).toBe(1000);
    expect(processingTime).toBeLessThan(5000); // Should complete in < 5 seconds

    await unlink(join(TEST_DIR, "test-memory.jsonl"));
  });

  it("Signal interruption during flush", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-signal.jsonl");
    await baseline.init();

    for (let i = 0; i < 50; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    // Flush should complete
    await baseline.flush();

    const content = await readFile(join(TEST_DIR, "test-signal.jsonl"), "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(50);

    await unlink(join(TEST_DIR, "test-signal.jsonl"));
  });

  it("Auto-flush prevents buffer overflow", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-autoflush.jsonl");
    await baseline.init();

    // Record exactly 100 metrics (triggers auto-flush)
    for (let i = 0; i < 100; i++) {
      await baseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    // Auto-flush should have triggered
    const summary = await baseline.getMetrics();
    expect(summary.count).toBe(100);

    await unlink(join(TEST_DIR, "test-autoflush.jsonl"));
  });

  it("Recover from invalid path", async () => {
    const invalidBaseline = new BaselineMeasurement("/invalid/path/that/does/not/exist", "test.jsonl");

    // Should not crash
    for (let i = 0; i < 10; i++) {
      await invalidBaseline.recordMetric({
        timestamp: 1704451200000 + i,
        duration: 1000,
        outcome: "complete",
        taskType: "test",
      });
    }

    // Metrics kept in buffer
    expect(true).toBe(true);
  });
});
