/**
 * Smoke Test Suite - Production Validation
 *
 * Fast validation of critical system paths before deployment.
 * Runs in under 30 seconds with no external dependencies.
 *
 * Critical Paths Tested:
 * - Configuration loading
 * - Health check endpoints
 * - Metrics collection
 * - Core module imports
 * - Observability exports
 * - Basic wave execution (mock mode)
 *
 * Usage:
 *   bun test test/smoke/smoke.test.ts
 */

import { describe, it, expect } from "bun:test";
import { SmokeTestRunner } from "./SmokeTestRunner.js";

describe("Smoke Tests - Production Validation", () => {
  it("should pass all smoke tests", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    // Assert all tests passed
    expect(summary.success).toBe(true);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(summary.totalTests);

    // Assert reasonable duration (under 30 seconds)
    expect(summary.totalDurationMs).toBeLessThan(30000);
  }, 35000); // Set timeout to 35 seconds (5 second buffer)

  it("should validate config loading", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    const configTest = summary.results.find((r) => r.name === "Config Load");

    expect(configTest).toBeDefined();
    expect(configTest?.passed).toBe(true);
    expect(configTest?.metadata).toBeDefined();
  }, 35000);

  it("should validate health check system", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    const healthTest = summary.results.find((r) => r.name === "Health Check");

    expect(healthTest).toBeDefined();
    expect(healthTest?.passed).toBe(true);
    expect(healthTest?.metadata).toBeDefined();
    expect(healthTest?.metadata?.livenessStatus).toBe("healthy");
    expect(healthTest?.metadata?.readinessStatus).toBe("healthy");
  }, 35000);

  it("should validate metrics collection", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    const metricsTest = summary.results.find(
      (r) => r.name === "Metrics Collection"
    );

    expect(metricsTest).toBeDefined();
    expect(metricsTest?.passed).toBe(true);
    expect(metricsTest?.metadata).toBeDefined();
    expect(metricsTest?.metadata?.hasTaskMetric).toBe(true);
    expect(metricsTest?.metadata?.hasResourceMetric).toBe(true);
  }, 35000);

  it("should validate core module imports", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    const importsTest = summary.results.find(
      (r) => r.name === "Core Module Imports"
    );

    expect(importsTest).toBeDefined();
    expect(importsTest?.passed).toBe(true);
    expect(importsTest?.metadata).toBeDefined();
  }, 35000);

  it("should validate observability exports", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    const observabilityTest = summary.results.find(
      (r) => r.name === "Observability Exports"
    );

    expect(observabilityTest).toBeDefined();
    expect(observabilityTest?.passed).toBe(true);
    expect(observabilityTest?.metadata).toBeDefined();
  }, 35000);

  it("should validate basic wave orchestrator", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    const waveTest = summary.results.find(
      (r) => r.name === "Basic Wave Execution"
    );

    expect(waveTest).toBeDefined();
    expect(waveTest?.passed).toBe(true);
    expect(waveTest?.metadata).toBeDefined();
    expect(waveTest?.metadata?.splitIntoWavesVerified).toBe(true);
    expect(waveTest?.metadata?.componentsInitialized).toBeDefined();
  }, 35000);

  it("should complete all tests in under 30 seconds", async () => {
    const startTime = Date.now();

    const runner = new SmokeTestRunner();
    await runner.runSmokeTests();

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30000);
  }, 35000);

  it("should return structured results", async () => {
    const runner = new SmokeTestRunner();
    const summary = await runner.runSmokeTests();

    // Verify structure
    expect(summary).toHaveProperty("totalTests");
    expect(summary).toHaveProperty("passed");
    expect(summary).toHaveProperty("failed");
    expect(summary).toHaveProperty("totalDurationMs");
    expect(summary).toHaveProperty("results");
    expect(summary).toHaveProperty("success");

    // Verify results array
    expect(Array.isArray(summary.results)).toBe(true);
    expect(summary.results.length).toBeGreaterThan(0);

    // Verify each result has required fields
    for (const result of summary.results) {
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("durationMs");

      if (!result.passed) {
        expect(result).toHaveProperty("error");
      }
    }
  }, 35000);
});
