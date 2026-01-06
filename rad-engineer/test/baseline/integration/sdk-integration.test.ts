/**
 * Integration tests for SDK call wrapping
 * Tests: metric extraction from SDK calls, error handling
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink } from "node:fs/promises";
import { BaselineMeasurement } from "@/baseline/index.js";

const TEST_DIR = "metrics-test-integration";

// Mock SDK response type
interface MockSDKResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Mock SDK error
class MockAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "APIError";
  }
}

describe("Integration: SDK Integration Wrapper", () => {
  let baseline: BaselineMeasurement;

  // Helper function to measure SDK calls
  async function measuredSDKCall(
    baseline: BaselineMeasurement,
    call: () => Promise<MockSDKResponse>,
    taskType: string = "sdk-invoke",
  ): Promise<MockSDKResponse> {
    const startTime = performance.now();
    try {
      const response = await call();
      const duration = performance.now() - startTime;

      await baseline.recordMetric({
        timestamp: Date.now(),
        duration,
        tokenUsage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
        outcome: "complete",
        taskType,
      });

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      await baseline.recordMetric({
        timestamp: Date.now(),
        duration,
        outcome: "failed",
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
        taskType,
      });

      throw error;
    }
  }

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    baseline = new BaselineMeasurement(TEST_DIR, "test-sdk.jsonl");
    await baseline.init();
  });

  afterEach(async () => {
    try {
      await unlink("metrics-test-integration/test-sdk.jsonl");
    } catch {
      // File may not exist
    }
  });

  it("Wrap successful SDK call and record metric", async () => {
    // Mock successful SDK call
    const mockCall = async (): Promise<MockSDKResponse> => {
      return {
        content: "Test response",
        usage: { input_tokens: 1500, output_tokens: 2500 },
      };
    };

    const response = await measuredSDKCall(baseline, mockCall);
    await baseline.flush();

    expect(response.content).toBe("Test response");

    const summary = await baseline.getMetrics();
    expect(summary.count).toBe(1);
    expect(summary.tokenStats.average).toBe(4000); // 1500 + 2500
    expect(summary.durationStats.average).toBeGreaterThan(0);
  });

  it("Wrap failed SDK call and record error", async () => {
    // Mock failed SDK call
    const mockCall = async (): Promise<MockSDKResponse> => {
      throw new MockAPIError("API request failed");
    };

    await expect(measuredSDKCall(baseline, mockCall)).rejects.toThrow("API request failed");

    await baseline.flush();

    const summary = await baseline.getMetrics({ outcome: "failed" });
    expect(summary.count).toBe(1);
  });

  it("Metric recording failure doesn't fail SDK call", async () => {
    const badBaseline = new BaselineMeasurement("/invalid/path", "test.jsonl");

    const mockCall = async (): Promise<MockSDKResponse> => {
      return {
        content: "Test response",
        usage: { input_tokens: 1000, output_tokens: 2000 },
      };
    };

    // SDK call should succeed even if metric recording fails
    const response = await measuredSDKCall(badBaseline, mockCall);
    expect(response.content).toBe("Test response");
  });

  it("Extract token usage from SDK response", async () => {
    const mockCall = async (): Promise<MockSDKResponse> => {
      return {
        content: "Response",
        usage: { input_tokens: 1234, output_tokens: 5678 },
      };
    };

    await measuredSDKCall(baseline, mockCall);
    await baseline.flush();

    const summary = await baseline.getMetrics();
    expect(summary.tokenStats.average).toBe(6912); // 1234 + 5678
  });

  it("Measure duration accurately", async () => {
    const mockCall = async (): Promise<MockSDKResponse> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        content: "Response",
        usage: { input_tokens: 100, output_tokens: 200 },
      };
    };

    await measuredSDKCall(baseline, mockCall);
    await baseline.flush();

    const summary = await baseline.getMetrics();
    expect(summary.durationStats.average).toBeGreaterThan(8); // At least 8ms
    expect(summary.durationStats.average).toBeLessThan(100); // Less than 100ms
  });
});
