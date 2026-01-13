/**
 * Tests for Drift Detection components
 *
 * Tests cover:
 * - ASTNormalizer: Code normalization
 * - ASTComparator: Semantic comparison
 * - ReproducibilityTest: Multi-run testing
 * - DriftDetector: Drift measurement
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  ASTNormalizer,
  NormalizationResult,
} from "../../src/verification/ASTNormalizer.js";
import {
  ASTComparator,
  ComparisonResult,
} from "../../src/verification/ASTComparator.js";
import {
  ReproducibilityTest,
  TestTask,
  TaskExecutor,
  ReproducibilityReport,
} from "../../src/verification/ReproducibilityTest.js";
import {
  DriftDetector,
  DriftMeasurement,
} from "../../src/verification/DriftDetector.js";

// Test helpers
function createTestTask(
  id: string,
  description: string,
  input: string = ""
): TestTask {
  return {
    id,
    description,
    input,
    expectedType: "code",
  };
}

function createDeterministicExecutor(): TaskExecutor {
  return async (task) => ({
    output: `function hello() {\n  console.log("Hello from ${task.id}");\n}`,
    success: true,
  });
}

function createNonDeterministicExecutor(): TaskExecutor {
  let counter = 0;
  return async (task) => ({
    // Vary actual code content, not just comments (which get normalized away)
    output: `function hello_${Date.now()}_${counter++}() {\n  console.log("Hello");\n  const id = "${Math.random()}";\n}`,
    success: true,
  });
}

// ================================
// ASTNormalizer Tests
// ================================
describe("ASTNormalizer", () => {
  let normalizer: ASTNormalizer;

  beforeEach(() => {
    normalizer = new ASTNormalizer();
  });

  describe("normalize", () => {
    it("should normalize code with comments", () => {
      const code = `
// This is a comment
function hello() {
  // Another comment
  return "world";
}`;

      const result = normalizer.normalize(code);

      expect(result.normalized).not.toContain("// This is a comment");
      expect(result.normalized).not.toContain("// Another comment");
      expect(result.normalized).toContain("function hello");
      expect(result.transformations).toContain("removeComments");
    });

    it("should normalize whitespace", () => {
      const code = `function   hello()  {
  return    "world";
}`;

      const result = normalizer.normalize(code);

      expect(result.normalized).not.toContain("   ");
      expect(result.transformations).toContain("normalizeWhitespace");
    });

    it("should remove empty lines", () => {
      const code = `function hello() {

  return "world";

}`;

      const result = normalizer.normalize(code);

      const emptyLines = result.normalized.split("\n").filter(
        (line) => line.trim() === ""
      );
      expect(emptyLines.length).toBeLessThanOrEqual(1); // At most one separator
      expect(result.transformations).toContain("removeEmptyLines");
    });

    it("should sort imports", () => {
      const code = `import { z } from "zod";
import { a } from "aaa";
import { m } from "mmm";

function test() {}`;

      const result = normalizer.normalize(code);
      const lines = result.normalized.split("\n");
      const importLines = lines.filter((l) => l.trim().startsWith("import"));

      // Imports should be sorted
      expect(importLines[0]).toContain("aaa");
      expect(importLines[1]).toContain("mmm");
      expect(importLines[2]).toContain("zod");
    });

    it("should return hash for comparison", () => {
      const code1 = "function hello() { return 1; }";
      const code2 = "function hello() { return 1; }";
      const code3 = "function hello() { return 2; }";

      const result1 = normalizer.normalize(code1);
      const result2 = normalizer.normalize(code2);
      const result3 = normalizer.normalize(code3);

      expect(result1.hash).toBe(result2.hash);
      expect(result1.hash).not.toBe(result3.hash);
    });

    it("should track line counts", () => {
      const code = `
function a() {}
function b() {}

function c() {}
`;

      const result = normalizer.normalize(code);

      expect(result.originalLineCount).toBe(6);
      expect(result.normalizedLineCount).toBeLessThan(result.originalLineCount);
    });
  });

  describe("compare", () => {
    it("should detect identical code", () => {
      const code1 = "function test() { return 1; }";
      const code2 = "function test() { return 1; }";

      const result = normalizer.compare(code1, code2);

      expect(result.identical).toBe(true);
      expect(result.similarity).toBe(1.0);
    });

    it("should detect differences", () => {
      const code1 = "function test() { return 1; }";
      const code2 = "function test() { return 2; }";

      const result = normalizer.compare(code1, code2);

      expect(result.identical).toBe(false);
      expect(result.similarity).toBeLessThan(1.0);
    });

    it("should ignore comment differences", () => {
      const code1 = "// Comment 1\nfunction test() { return 1; }";
      const code2 = "// Comment 2\nfunction test() { return 1; }";

      const result = normalizer.compare(code1, code2);

      expect(result.identical).toBe(true);
    });
  });

  describe("extractSections", () => {
    it("should extract imports", () => {
      const code = `import { a } from "a";
import { b } from "b";

function test() {}`;

      const sections = normalizer.extractSections(code);
      const imports = sections.filter((s) => s.type === "import");

      // At least one import should be detected
      expect(imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should extract functions", () => {
      const code = `function foo() { return 1; }
function bar() { return 2; }`;

      const sections = normalizer.extractSections(code);
      const functions = sections.filter((s) => s.type === "function");

      // At least one function should be detected
      expect(functions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("fingerprint", () => {
    it("should create consistent fingerprints", () => {
      const code1 = "function a() {}\nfunction b() {}";
      const code2 = "function a() {}\nfunction b() {}";

      const fp1 = normalizer.fingerprint(code1);
      const fp2 = normalizer.fingerprint(code2);

      expect(fp1).toBe(fp2);
    });
  });
});

// ================================
// ASTComparator Tests
// ================================
describe("ASTComparator", () => {
  let comparator: ASTComparator;

  beforeEach(() => {
    comparator = new ASTComparator();
  });

  describe("compare", () => {
    it("should identify identical code", () => {
      const code1 = "function hello() { return 1; }";
      const code2 = "function hello() { return 1; }";

      const result = comparator.compare(code1, code2);

      expect(result.identical).toBe(true);
      expect(result.similarity).toBe(1.0);
    });

    it("should calculate similarity for different code", () => {
      const code1 = "function a() {}\nfunction b() {}";
      const code2 = "function a() {}\nfunction c() {}";

      const result = comparator.compare(code1, code2);

      expect(result.identical).toBe(false);
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.similarity).toBeLessThan(1.0);
    });

    it("should detect differences", () => {
      const code1 = "function old() {}";
      const code2 = "function new() {}";

      const result = comparator.compare(code1, code2);

      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("should track comparison metadata", () => {
      const code1 = "line 1\nline 2\nline 3";
      const code2 = "line 1\nline 2";

      const result = comparator.compare(code1, code2);

      expect(result.metadata.linesA).toBe(3);
      expect(result.metadata.linesB).toBe(2);
      expect(result.metadata.comparisonTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findConsensus", () => {
    it("should find consensus from identical codes", () => {
      const codes = ["function a() {}", "function a() {}", "function a() {}"];

      const result = comparator.findConsensus(codes);

      expect(result.consensus).toBe("function a() {}");
      expect(result.agreementRate).toBe(1.0);
      expect(result.clusters.length).toBe(1);
    });

    it("should find majority consensus", () => {
      const codes = [
        "function a() {}",
        "function a() {}",
        "function a() {}",
        "function b() {}",
      ];

      const result = comparator.findConsensus(codes);

      expect(result.consensus).toBe("function a() {}");
      expect(result.agreementRate).toBe(0.75);
      expect(result.clusters.length).toBe(2);
    });

    it("should handle empty input", () => {
      const result = comparator.findConsensus([]);

      expect(result.consensus).toBeNull();
      expect(result.agreementRate).toBe(0);
    });

    it("should handle single code", () => {
      const result = comparator.findConsensus(["function x() {}"]);

      expect(result.consensus).toBe("function x() {}");
      expect(result.agreementRate).toBe(1.0);
    });
  });

  describe("calculateDrift", () => {
    it("should return 0% drift for identical samples", () => {
      const samples = ["code", "code", "code"];

      const result = comparator.calculateDrift(samples);

      expect(result.driftRate).toBe(0);
      expect(result.uniqueVariants).toBe(1);
    });

    it("should calculate drift for varying samples", () => {
      const samples = ["code1", "code2", "code3", "code1"];

      const result = comparator.calculateDrift(samples);

      expect(result.driftRate).toBeGreaterThan(0);
      expect(result.uniqueVariants).toBe(3);
    });
  });

  describe("getDiff", () => {
    it("should generate diff output", () => {
      const code1 = "line 1\nline 2\nline 3";
      const code2 = "line 1\nline X\nline 3";

      const diff = comparator.getDiff(code1, code2);

      expect(diff.some((l) => l.startsWith("+ "))).toBe(true);
      expect(diff.some((l) => l.startsWith("- "))).toBe(true);
      expect(diff.some((l) => l.startsWith("  "))).toBe(true);
    });
  });

  describe("areFunctionallyEquivalent", () => {
    it("should return true for equivalent code", () => {
      const code1 = "// Comment\nfunction a() {}";
      const code2 = "// Different\nfunction a() {}";

      const result = comparator.areFunctionallyEquivalent(code1, code2);

      expect(result).toBe(true);
    });

    it("should return false for different code", () => {
      const code1 = "function a() {}";
      const code2 = "function b() {}";

      const result = comparator.areFunctionallyEquivalent(code1, code2);

      expect(result).toBe(false);
    });
  });
});

// ================================
// ReproducibilityTest Tests
// ================================
describe("ReproducibilityTest", () => {
  describe("runTest", () => {
    it("should run task multiple times", async () => {
      const executor = createDeterministicExecutor();
      const test = new ReproducibilityTest(executor, { runs: 3, delayBetweenRuns: 0 });
      const task = createTestTask("test-1", "Test task");

      const report = await test.runTest(task);

      expect(report.results.length).toBe(3);
      expect(report.successfulRuns).toBe(3);
      expect(report.failedRuns).toBe(0);
    });

    it("should detect deterministic output", async () => {
      const executor = createDeterministicExecutor();
      const test = new ReproducibilityTest(executor, { runs: 5, delayBetweenRuns: 0 });
      const task = createTestTask("test-2", "Deterministic task");

      const report = await test.runTest(task);

      expect(report.reproducibilityRate).toBe(1.0);
      expect(report.driftRate).toBe(0);
      expect(report.uniqueVariants).toBe(1);
    });

    it("should detect non-deterministic output", async () => {
      const executor = createNonDeterministicExecutor();
      const test = new ReproducibilityTest(executor, { runs: 3, delayBetweenRuns: 10 });
      const task = createTestTask("test-3", "Non-deterministic task");

      const report = await test.runTest(task);

      // With timestamp in output, should have multiple variants
      expect(report.uniqueVariants).toBeGreaterThan(1);
    });

    it("should handle execution failures", async () => {
      let count = 0;
      const executor: TaskExecutor = async () => {
        count++;
        if (count === 2) {
          return { output: "", success: false, error: "Simulated failure" };
        }
        return { output: "success", success: true };
      };

      const test = new ReproducibilityTest(executor, { runs: 3, delayBetweenRuns: 0 });
      const task = createTestTask("test-4", "Failure task");

      const report = await test.runTest(task);

      expect(report.successfulRuns).toBe(2);
      expect(report.failedRuns).toBe(1);
    });

    it("should respect timeout", async () => {
      const slowExecutor: TaskExecutor = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { output: "done", success: true };
      };

      const test = new ReproducibilityTest(slowExecutor, {
        runs: 1,
        timeout: 100,
        delayBetweenRuns: 0,
      });
      const task = createTestTask("test-5", "Slow task");

      const report = await test.runTest(task);

      expect(report.results[0].success).toBe(false);
      expect(report.results[0].error).toContain("timeout");
    });
  });

  describe("isReproducible", () => {
    it("should return true for reproducible tasks", async () => {
      const executor = createDeterministicExecutor();
      const test = new ReproducibilityTest(executor, { runs: 3, delayBetweenRuns: 0 });
      const task = createTestTask("test-6", "Reproducible task");

      const result = await test.isReproducible(task);

      expect(result).toBe(true);
    });
  });

  describe("getAggregateStats", () => {
    it("should aggregate multiple reports", async () => {
      const executor = createDeterministicExecutor();
      const test = new ReproducibilityTest(executor, { runs: 2, delayBetweenRuns: 0 });

      const reports = await test.runTests([
        createTestTask("t1", "Task 1"),
        createTestTask("t2", "Task 2"),
      ]);

      const stats = test.getAggregateStats(reports);

      expect(stats.totalTasks).toBe(2);
      expect(stats.reproducibleTasks).toBe(2);
      expect(stats.avgReproducibilityRate).toBe(1.0);
    });
  });
});

// ================================
// DriftDetector Tests
// ================================
describe("DriftDetector", () => {
  describe("measureDriftRate", () => {
    it("should measure drift rate for task", async () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 3 });
      const task = createTestTask("drift-1", "Test task");

      const measurement = await detector.measureDriftRate(task);

      expect(measurement.taskId).toBe("drift-1");
      expect(measurement.runs).toBe(3);
      expect(measurement.driftRate).toBeDefined();
      expect(measurement.isDeterministic).toBeDefined();
    });

    it("should detect deterministic output (0% drift)", async () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor, {
        defaultRuns: 5,
        thresholds: { maxDriftRate: 5, minRuns: 3, confidenceThreshold: 0.8 },
      });
      const task = createTestTask("drift-2", "Deterministic task");

      const measurement = await detector.measureDriftRate(task);

      expect(measurement.driftRate).toBe(0);
      expect(measurement.isDeterministic).toBe(true);
      expect(measurement.uniqueVariants).toBe(1);
    });

    it("should detect non-deterministic output", async () => {
      const executor = createNonDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 3 });
      const task = createTestTask("drift-3", "Non-deterministic task");

      const measurement = await detector.measureDriftRate(task);

      expect(measurement.driftRate).toBeGreaterThan(0);
      expect(measurement.uniqueVariants).toBeGreaterThan(1);
    });

    it("should include drift analysis", async () => {
      const executor = createNonDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 3 });
      const task = createTestTask("drift-4", "Analysis task");

      const measurement = await detector.measureDriftRate(task);

      expect(measurement.analysis).toBeDefined();
      expect(measurement.analysis.recommendations).toBeDefined();
    });
  });

  describe("isDeterministic", () => {
    it("should return true for deterministic tasks", async () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 3 });
      const task = createTestTask("det-1", "Deterministic task");

      const result = await detector.isDeterministic(task);

      expect(result).toBe(true);
    });
  });

  describe("validateDeterminism", () => {
    it("should validate determinism requirements", async () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 3 });
      const task = createTestTask("val-1", "Validation task");

      const result = await detector.validateDeterminism(task, {
        maxDriftRate: 5,
        minConfidence: 0.7,
      });

      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("should report violations", async () => {
      const executor = createNonDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 3 });
      const task = createTestTask("val-2", "Violation task");

      const result = await detector.validateDeterminism(task, {
        maxDriftRate: 0,
        minConfidence: 0.99,
      });

      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe("compareOutputs", () => {
    it("should compare outputs directly", async () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor);

      const result = await detector.compareOutputs([
        "function a() {}",
        "function a() {}",
        "function a() {}",
      ]);

      expect(result.driftRate).toBe(0);
      expect(result.identical).toBe(true);
      expect(result.uniqueCount).toBe(1);
    });
  });

  describe("thresholds", () => {
    it("should get and set thresholds", () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor);

      const initial = detector.getThresholds();
      expect(initial.maxDriftRate).toBeDefined();

      detector.setThresholds({ maxDriftRate: 10 });
      const updated = detector.getThresholds();
      expect(updated.maxDriftRate).toBe(10);
    });
  });

  describe("caching", () => {
    it("should cache measurements", async () => {
      let callCount = 0;
      const executor: TaskExecutor = async () => {
        callCount++;
        return { output: "cached", success: true };
      };

      const detector = new DriftDetector(executor, {
        defaultRuns: 2,
        enableCaching: true,
        cacheTtl: 60000,
      });

      const task = createTestTask("cache-1", "Cached task");

      await detector.measureDriftRate(task);
      const firstCount = callCount;

      await detector.measureDriftRate(task);
      expect(callCount).toBe(firstCount); // Should use cache

      detector.clearCache();
      await detector.measureDriftRate(task);
      expect(callCount).toBeGreaterThan(firstCount); // Fresh execution
    });
  });

  describe("measureMultipleTasks", () => {
    it("should measure drift for multiple tasks", async () => {
      const executor = createDeterministicExecutor();
      const detector = new DriftDetector(executor, { defaultRuns: 2 });

      const report = await detector.measureMultipleTasks([
        createTestTask("multi-1", "Task 1"),
        createTestTask("multi-2", "Task 2"),
      ]);

      expect(report.measurements.length).toBe(2);
      expect(report.summary.totalTasks).toBe(2);
      expect(report.summary.deterministicCount).toBe(2);
      expect(report.summary.deterministicRate).toBe(1.0);
    });
  });
});

// ================================
// Integration Tests
// ================================
describe("Drift Detection Integration", () => {
  it("should support full drift detection workflow", async () => {
    // 1. Create deterministic executor
    const executor = createDeterministicExecutor();
    const detector = new DriftDetector(executor, { defaultRuns: 5 });

    // 2. Measure drift
    const task = createTestTask("integration-1", "Full workflow test");
    const measurement = await detector.measureDriftRate(task);

    // 3. Verify determinism
    expect(measurement.driftRate).toBe(0);
    expect(measurement.isDeterministic).toBe(true);

    // 4. Validate requirements
    const validation = await detector.validateDeterminism(task, {
      maxDriftRate: 5,
      minConfidence: 0.7,
    });

    expect(validation.valid).toBe(true);
  });

  it("should detect and analyze drift sources", async () => {
    // Create executor that introduces various types of drift in actual code
    let count = 0;
    const executor: TaskExecutor = async () => {
      count++;
      return {
        // Vary actual code content to cause detectable drift
        output: `import { a } from "a";\nimport { b } from "b";\n\nfunction test_${count}() {\n  const id = "${Date.now()}";\n  const counter = ${count};\n}`,
        success: true,
      };
    };

    const detector = new DriftDetector(executor, { defaultRuns: 3 });
    const task = createTestTask("drift-analysis", "Drift analysis test");

    const measurement = await detector.measureDriftRate(task);

    // Should detect drift from timestamp
    expect(measurement.driftRate).toBeGreaterThan(0);
    expect(measurement.analysis.driftSources.length).toBeGreaterThan(0);
    expect(measurement.analysis.recommendations.length).toBeGreaterThan(0);
  });

  it("should meet performance requirements", async () => {
    const executor = createDeterministicExecutor();
    const detector = new DriftDetector(executor, { defaultRuns: 10 });
    const task = createTestTask("perf-1", "Performance test");

    const start = performance.now();
    await detector.measureDriftRate(task);
    const elapsed = performance.now() - start;

    // Should complete within reasonable time
    expect(elapsed).toBeLessThan(5000); // 5 seconds for 10 runs
  });
});
