/**
 * SmokeTestRunner - Production Validation Test Suite
 *
 * Validates critical paths for production deployment:
 * - Configuration loading and validation
 * - Health check endpoints
 * - Metrics collection
 * - Core module imports
 * - Basic wave execution in mock mode
 * - Observability endpoints
 *
 * Design Goals:
 * - Complete in under 30 seconds
 * - No external dependencies required
 * - Fast-fail on critical issues
 * - Structured pass/fail results
 */

import { HealthChecker } from "@/observability/HealthChecker.js";
import { Metrics } from "@/observability/Metrics.js";
import { loadProviderConfig } from "@/config/ProviderConfig.js";
import type { Config } from "@/config/schema.js";

/**
 * Result of a single smoke test
 */
export interface SmokeTestResult {
  /** Test name */
  name: string;
  /** Whether test passed */
  passed: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Summary of smoke test run
 */
export interface SmokeTestSummary {
  /** Total tests run */
  totalTests: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Individual test results */
  results: SmokeTestResult[];
  /** Overall success (all tests passed) */
  success: boolean;
}

/**
 * Smoke test suite for production validation
 */
export class SmokeTestRunner {
  private results: SmokeTestResult[] = [];

  /**
   * Run all smoke tests
   * @returns Summary of test results
   */
  async runSmokeTests(): Promise<SmokeTestSummary> {
    const startTime = Date.now();

    console.log("🔥 Starting smoke tests...\n");

    // Run tests in sequence for simplicity
    await this.runTest("Config Load", () => this.testConfigLoad());
    await this.runTest("Health Check", () => this.testHealthCheck());
    await this.runTest("Metrics Collection", () => this.testMetricsCollection());
    await this.runTest("Core Module Imports", () => this.testCoreModuleImports());
    await this.runTest("Observability Exports", () => this.testObservabilityExports());
    await this.runTest("Basic Wave Execution", () => this.testBasicWaveExecution());

    const totalDurationMs = Date.now() - startTime;

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    const summary: SmokeTestSummary = {
      totalTests: this.results.length,
      passed,
      failed,
      totalDurationMs,
      results: this.results,
      success: failed === 0,
    };

    this.printSummary(summary);

    return summary;
  }

  /**
   * Run a single test and record result
   * @param name - Test name
   * @param testFn - Test function
   */
  private async runTest(
    name: string,
    testFn: () => Promise<SmokeTestResult>
  ): Promise<void> {
    console.log(`  Running: ${name}...`);

    try {
      const result = await testFn();
      this.results.push(result);

      if (result.passed) {
        console.log(`    ✓ PASS (${result.durationMs}ms)`);
      } else {
        console.log(`    ✗ FAIL (${result.durationMs}ms)`);
        console.log(`      Error: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`    ✗ FAIL (error thrown)`);
      console.log(`      Error: ${errorMsg}`);

      this.results.push({
        name,
        passed: false,
        durationMs: 0,
        error: `Test threw exception: ${errorMsg}`,
      });
    }
  }

  /**
   * Test: Configuration loading
   */
  private async testConfigLoad(): Promise<SmokeTestResult> {
    const startTime = Date.now();

    try {
      // Attempt to load provider config (should not throw even if file doesn't exist)
      const config = loadProviderConfig();

      // Verify it returns a valid structure
      if (!config || typeof config !== "object") {
        return {
          name: "Config Load",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Config did not return valid object",
        };
      }

      // Verify required fields exist
      if (!("version" in config) || !("providers" in config)) {
        return {
          name: "Config Load",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Config missing required fields (version, providers)",
        };
      }

      return {
        name: "Config Load",
        passed: true,
        durationMs: Date.now() - startTime,
        metadata: {
          version: config.version,
          providerCount: Object.keys(config.providers).length,
        },
      };
    } catch (error) {
      return {
        name: "Config Load",
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test: Health check system
   */
  private async testHealthCheck(): Promise<SmokeTestResult> {
    const startTime = Date.now();

    try {
      const healthChecker = new HealthChecker({ timeout: 2000 });

      // Register a simple health check
      healthChecker.registerCheck("smoke_test", async () => {
        return { status: "healthy", message: "Smoke test check" };
      });

      // Test liveness endpoint
      const livenessResult = await healthChecker.liveness();

      if (livenessResult.status !== "healthy") {
        return {
          name: "Health Check",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Liveness check returned unhealthy",
        };
      }

      // Test readiness endpoint
      const readinessResult = await healthChecker.readiness();

      if (readinessResult.status !== "healthy") {
        return {
          name: "Health Check",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Readiness check returned unhealthy",
        };
      }

      // Verify checks are present in readiness
      if (!readinessResult.checks.smoke_test) {
        return {
          name: "Health Check",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Registered check not found in readiness result",
        };
      }

      return {
        name: "Health Check",
        passed: true,
        durationMs: Date.now() - startTime,
        metadata: {
          livenessStatus: livenessResult.status,
          readinessStatus: readinessResult.status,
          registeredChecks: healthChecker.getRegisteredChecks(),
        },
      };
    } catch (error) {
      return {
        name: "Health Check",
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test: Metrics collection
   */
  private async testMetricsCollection(): Promise<SmokeTestResult> {
    const startTime = Date.now();

    try {
      const metrics = new Metrics();

      // Reset metrics to ensure clean state
      metrics.reset();

      // Record sample metrics
      metrics.recordTaskCompletion({
        taskId: "smoke-test-1",
        status: "success",
        durationSeconds: 1.5,
        waveId: "smoke-wave-1",
      });

      metrics.incrementActiveAgents("smoke-wave-1");
      metrics.recordResourceUtilization("cpu", 25.5);

      // Retrieve metrics in Prometheus format
      const metricsOutput = await metrics.getMetrics();

      // Verify output is non-empty string
      if (!metricsOutput || typeof metricsOutput !== "string") {
        return {
          name: "Metrics Collection",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Metrics output is not a valid string",
        };
      }

      // Verify it contains expected metric names
      const hasTaskMetric = metricsOutput.includes("agent_tasks_total");
      const hasResourceMetric = metricsOutput.includes("resource_utilization");

      if (!hasTaskMetric || !hasResourceMetric) {
        return {
          name: "Metrics Collection",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "Metrics output missing expected metric names",
        };
      }

      return {
        name: "Metrics Collection",
        passed: true,
        durationMs: Date.now() - startTime,
        metadata: {
          metricsLength: metricsOutput.length,
          hasTaskMetric,
          hasResourceMetric,
        },
      };
    } catch (error) {
      return {
        name: "Metrics Collection",
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test: Core module imports
   */
  private async testCoreModuleImports(): Promise<SmokeTestResult> {
    const startTime = Date.now();

    try {
      // Dynamically import core modules to verify they can be loaded
      const coreModule = await import("@/core/index.js");
      const advancedModule = await import("@/advanced/index.js");
      const configModule = await import("@/config/index.js");

      // Verify expected exports exist
      const coreExports = [
        "ResourceManager",
        "PromptValidator",
        "ResponseParser",
      ];

      const advancedExports = ["WaveOrchestrator", "ErrorRecoveryEngine"];

      const configExports = ["loadProviderConfig"];

      // Check core exports
      for (const exportName of coreExports) {
        if (!(exportName in coreModule)) {
          return {
            name: "Core Module Imports",
            passed: false,
            durationMs: Date.now() - startTime,
            error: `Core module missing export: ${exportName}`,
          };
        }
      }

      // Check advanced exports
      for (const exportName of advancedExports) {
        if (!(exportName in advancedModule)) {
          return {
            name: "Core Module Imports",
            passed: false,
            durationMs: Date.now() - startTime,
            error: `Advanced module missing export: ${exportName}`,
          };
        }
      }

      // Check config exports
      for (const exportName of configExports) {
        if (!(exportName in configModule)) {
          return {
            name: "Core Module Imports",
            passed: false,
            durationMs: Date.now() - startTime,
            error: `Config module missing export: ${exportName}`,
          };
        }
      }

      return {
        name: "Core Module Imports",
        passed: true,
        durationMs: Date.now() - startTime,
        metadata: {
          coreExports: Object.keys(coreModule),
          advancedExports: Object.keys(advancedModule),
          configExports: Object.keys(configModule),
        },
      };
    } catch (error) {
      return {
        name: "Core Module Imports",
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test: Observability module exports
   */
  private async testObservabilityExports(): Promise<SmokeTestResult> {
    const startTime = Date.now();

    try {
      // Dynamically import observability modules
      const observabilityModule = await import("@/observability/index.js");

      // Verify expected exports exist
      const expectedExports = [
        "HealthChecker",
        "Metrics",
        "MetricsRegistry",
        "Logger",
        "TracingProvider",
        "createLogger",
        "createTracingProvider",
      ];

      for (const exportName of expectedExports) {
        if (!(exportName in observabilityModule)) {
          return {
            name: "Observability Exports",
            passed: false,
            durationMs: Date.now() - startTime,
            error: `Observability module missing export: ${exportName}`,
          };
        }
      }

      return {
        name: "Observability Exports",
        passed: true,
        durationMs: Date.now() - startTime,
        metadata: {
          exports: Object.keys(observabilityModule),
        },
      };
    } catch (error) {
      return {
        name: "Observability Exports",
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test: Basic wave orchestrator instantiation
   *
   * Note: We don't actually execute a wave here because it would:
   * 1. Take too long (resource checks via ps commands)
   * 2. Be flaky on different systems
   * 3. Not be suitable for fast smoke tests
   *
   * Instead, we verify all components can be instantiated.
   */
  private async testBasicWaveExecution(): Promise<SmokeTestResult> {
    const startTime = Date.now();

    try {
      // Import required modules
      const { ResourceManager } = await import("@/core/ResourceManager.js");
      const { PromptValidator } = await import("@/core/PromptValidator.js");
      const { ResponseParser } = await import("@/core/ResponseParser.js");
      const { WaveOrchestrator } = await import(
        "@/advanced/WaveOrchestrator.js"
      );
      const { SDKIntegration } = await import("@/sdk/SDKIntegration.js");
      const { HierarchicalMemory } = await import(
        "@/memory/HierarchicalMemory.js"
      );
      const { getDefaultConfig } = await import("@/config/schema.js");

      // Get default config for testing
      const mockConfig: Config = getDefaultConfig();

      // Initialize dependencies - this validates they can be instantiated
      const resourceManager = new ResourceManager({ maxConcurrent: 2 });
      const promptValidator = new PromptValidator();
      const responseParser = new ResponseParser();
      const sdk = new SDKIntegration(); // Auto-detects provider
      const memory = new HierarchicalMemory({
        globalTokenBudget: 100000,
        taskTokenMultiplier: 50000,
        localTokenBudget: 10000,
      });

      // Create wave orchestrator - validates integration
      const orchestrator = new WaveOrchestrator({
        resourceManager,
        promptValidator,
        responseParser,
        sdk,
        memory,
        config: mockConfig,
      });

      // Verify orchestrator has expected methods
      if (typeof orchestrator.executeWave !== "function") {
        return {
          name: "Basic Wave Execution",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "WaveOrchestrator missing executeWave method",
        };
      }

      if (typeof orchestrator.calculateWaveSize !== "function") {
        return {
          name: "Basic Wave Execution",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "WaveOrchestrator missing calculateWaveSize method",
        };
      }

      if (typeof orchestrator.splitIntoWaves !== "function") {
        return {
          name: "Basic Wave Execution",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "WaveOrchestrator missing splitIntoWaves method",
        };
      }

      // Test splitIntoWaves logic (pure function, fast)
      const testTasks = [
        { id: "task-1", prompt: "test" },
        { id: "task-2", prompt: "test" },
        { id: "task-3", prompt: "test" },
      ];

      const waves = orchestrator.splitIntoWaves(testTasks, 2);

      if (waves.length !== 2) {
        return {
          name: "Basic Wave Execution",
          passed: false,
          durationMs: Date.now() - startTime,
          error: `splitIntoWaves returned ${waves.length} waves, expected 2`,
        };
      }

      if (waves[0].length !== 2 || waves[1].length !== 1) {
        return {
          name: "Basic Wave Execution",
          passed: false,
          durationMs: Date.now() - startTime,
          error: "splitIntoWaves returned incorrect wave sizes",
        };
      }

      return {
        name: "Basic Wave Execution",
        passed: true,
        durationMs: Date.now() - startTime,
        metadata: {
          componentsInitialized: [
            "ResourceManager",
            "PromptValidator",
            "ResponseParser",
            "SDKIntegration",
            "HierarchicalMemory",
            "WaveOrchestrator",
          ],
          splitIntoWavesVerified: true,
        },
      };
    } catch (error) {
      return {
        name: "Basic Wave Execution",
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Print test summary to console
   * @param summary - Test summary to print
   */
  private printSummary(summary: SmokeTestSummary): void {
    console.log("\n" + "=".repeat(60));
    console.log("🔥 SMOKE TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(
      `Total Tests:  ${summary.totalTests} (${summary.passed} passed, ${summary.failed} failed)`
    );
    console.log(`Duration:     ${summary.totalDurationMs}ms`);
    console.log(`Status:       ${summary.success ? "✓ PASS" : "✗ FAIL"}`);
    console.log("=".repeat(60));

    if (!summary.success) {
      console.log("\nFailed Tests:");
      for (const result of summary.results.filter((r) => !r.passed)) {
        console.log(`  ✗ ${result.name}: ${result.error}`);
      }
      console.log("");
    }
  }
}
