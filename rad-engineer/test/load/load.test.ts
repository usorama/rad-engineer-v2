/**
 * Load Testing Framework Tests
 *
 * Verifies LoadTester behavior under various scenarios
 * Uses shorter durations for faster feedback
 *
 * NOTE: Tests are designed to run individually. Running all tests
 * together may cause resource exhaustion. Use test filters for CI/CD.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { LoadTester } from "./LoadTester.js";
import type { LoadTestConfig } from "./LoadTester.js";

describe("LoadTester", () => {
  // Add small delay between tests to prevent resource exhaustion
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  describe("Basic Load Test", () => {
    test("should run load test with synthetic tasks", async () => {
      const tester = new LoadTester();
      const config: LoadTestConfig = {
        concurrentUsers: 3,
        duration: 300,
        rampUpTime: 0,
        targetRPS: 10,
        mockMode: true,
      };

      const result = await tester.runTest(config);

      expect(result.config).toEqual(config);
      expect(result.metrics.totalRequests).toBeGreaterThan(0);
      expect(result.metrics.successCount).toBeGreaterThan(0);
      expect(result.metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.errorRate).toBeLessThanOrEqual(1);
      expect(result.metrics.throughput).toBeGreaterThan(0);
      expect(result.metrics.latency.p50).toBeGreaterThan(0);
      expect(result.metrics.latency.p95).toBeGreaterThan(0);
      expect(result.metrics.latency.p99).toBeGreaterThan(0);
    });

    test("should handle custom task function", async () => {
      let executionCount = 0;
      const customTask = async () => {
        executionCount++;
        await new Promise((resolve) => setTimeout(resolve, 5));
      };

      const tester = new LoadTester(customTask);
      const config: LoadTestConfig = {
        concurrentUsers: 2,
        duration: 200,
        rampUpTime: 0,
        targetRPS: 10,
        mockMode: false,
      };

      const result = await tester.runTest(config);

      expect(executionCount).toBeGreaterThan(0);
      expect(result.metrics.errorCount).toBe(0);
      expect(result.metrics.successCount).toBe(executionCount);
    });
  });

  describe("Warm-up Phase", () => {
    test("should execute warm-up before measurement", async () => {
      const tester = new LoadTester();
      const config: LoadTestConfig = {
        concurrentUsers: 2,
        duration: 200,
        rampUpTime: 100,
        targetRPS: 10,
        mockMode: true,
      };

      const result = await tester.runTest(config);

      expect(result.warmUpMetrics).toBeDefined();
      expect(result.warmUpMetrics!.requests).toBeGreaterThan(0);
      expect(result.warmUpMetrics!.duration).toBeGreaterThanOrEqual(100);
    });

    test("should skip warm-up when rampUpTime is 0", async () => {
      const tester = new LoadTester();
      const config: LoadTestConfig = {
        concurrentUsers: 2,
        duration: 200,
        rampUpTime: 0,
        targetRPS: 10,
        mockMode: true,
      };

      const result = await tester.runTest(config);

      expect(result.warmUpMetrics).toBeDefined();
      expect(result.warmUpMetrics!.requests).toBe(0);
      expect(result.warmUpMetrics!.duration).toBe(0);
    });
  });

  describe("Metrics Collection", () => {
    test("should calculate latency percentiles correctly", async () => {
      const tester = new LoadTester();
      const config: LoadTestConfig = {
        concurrentUsers: 5,
        duration: 400,
        rampUpTime: 0,
        targetRPS: 20,
        mockMode: true,
      };

      const result = await tester.runTest(config);

      expect(result.metrics.latency.min).toBeGreaterThan(0);
      expect(result.metrics.latency.p50).toBeGreaterThanOrEqual(result.metrics.latency.min);
      expect(result.metrics.latency.p95).toBeGreaterThanOrEqual(result.metrics.latency.p50);
      expect(result.metrics.latency.p99).toBeGreaterThanOrEqual(result.metrics.latency.p95);
      expect(result.metrics.latency.max).toBeGreaterThanOrEqual(result.metrics.latency.p99);
    });

    test("should track errors correctly", async () => {
      let callCount = 0;
      const flakyTask = async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error("Intentional error");
        }
      };

      const tester = new LoadTester(flakyTask);
      const config: LoadTestConfig = {
        concurrentUsers: 2,
        duration: 200,
        rampUpTime: 0,
        targetRPS: 10,
        mockMode: false,
      };

      const result = await tester.runTest(config);

      expect(result.metrics.errorCount).toBeGreaterThan(0);
      expect(result.metrics.successCount).toBeGreaterThan(0);
      expect(result.metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe("Threshold Validation", () => {
    test("should pass when all thresholds are met", async () => {
      const tester = new LoadTester();
      const config: LoadTestConfig = {
        concurrentUsers: 2,
        duration: 200,
        rampUpTime: 0,
        targetRPS: 10,
        mockMode: true,
        thresholds: {
          maxP50Latency: 100,
          maxP95Latency: 200,
          maxP99Latency: 300,
          maxErrorRate: 0.2,
          minThroughput: 1,
        },
      };

      const result = await tester.runTest(config);

      expect(result.metrics.passed).toBe(true);
      expect(result.metrics.violations).toEqual([]);
    });

    test("should fail when error rate threshold is exceeded", async () => {
      const errorTask = async () => {
        throw new Error("Always fails");
      };

      const tester = new LoadTester(errorTask);
      const config: LoadTestConfig = {
        concurrentUsers: 2,
        duration: 200,
        rampUpTime: 0,
        targetRPS: 5,
        mockMode: false,
        thresholds: {
          maxErrorRate: 0.5,
        },
      };

      const result = await tester.runTest(config);

      expect(result.metrics.passed).toBe(false);
      expect(result.metrics.violations.length).toBeGreaterThan(0);
      expect(result.metrics.violations[0]).toContain("Error rate");
    });
  });

  describe("Edge Cases", () => {
    test("should handle zero duration gracefully", async () => {
      const tester = new LoadTester();
      const config: LoadTestConfig = {
        concurrentUsers: 1,
        duration: 0,
        rampUpTime: 0,
        targetRPS: 1,
        mockMode: true,
      };

      const result = await tester.runTest(config);

      expect(result.metrics.totalRequests).toBe(0);
      expect(result.metrics.passed).toBe(true);
    });

    test("should handle task that never throws", async () => {
      const perfectTask = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      };

      const tester = new LoadTester(perfectTask);
      const config: LoadTestConfig = {
        concurrentUsers: 3,
        duration: 200,
        rampUpTime: 0,
        targetRPS: 10,
        mockMode: false,
      };

      const result = await tester.runTest(config);

      expect(result.metrics.errorCount).toBe(0);
      expect(result.metrics.errorRate).toBe(0);
      expect(result.metrics.successCount).toBe(result.metrics.totalRequests);
    });
  });
});
