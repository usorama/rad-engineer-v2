/**
 * Unit tests for ErrorRecoveryEngine
 * Tests: retry with backoff, circuit breaker, checkpoint recovery
 *
 * Coverage requirements:
 * - Unit tests: 10 tests
 * - Overall coverage: 80%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  ErrorRecoveryEngine,
  ErrorRecoveryException,
  CircuitState,
} from "@/advanced/ErrorRecoveryEngine.js";
import { StateManager } from "@/advanced/StateManager.js";
import type { WaveResult } from "@/advanced/WaveOrchestrator.js";
import { promises as fs } from "fs";
import { join } from "path";

describe("ErrorRecoveryEngine: retryWithBackoff", () => {
  let engine: ErrorRecoveryEngine;

  beforeEach(() => {
    engine = new ErrorRecoveryEngine();
  });

  it("Retries successful operation", async () => {
    let attempts = 0;
    const fn = async (): Promise<string> => {
      attempts++;
      if (attempts === 1) {
        throw new Error("First attempt failed");
      }
      return "success";
    };

    const result = await engine.retryWithBackoff(fn, { maxAttempts: 3 });

    expect(result).toBe("success");
    expect(attempts).toBe(2);
  });

  it("Retries failed operation up to maxAttempts", async () => {
    let attempts = 0;
    const fn = async (): Promise<string> => {
      attempts++;
      throw new Error("Always fails");
    };

    // First call to verify it throws
    await expect(engine.retryWithBackoff(fn, { maxAttempts: 3, baseDelay: 10 })).rejects.toThrow(
      ErrorRecoveryException
    );

    // Verify it attempted 3 times
    expect(attempts).toBe(3);
  });

  it("Uses exponential backoff", async () => {
    const delays: number[] = [];
    const startTime = Date.now();

    const fn = async (): Promise<string> => {
      delays.push(Date.now() - startTime);
      if (delays.length < 3) {
        throw new Error("Failed");
      }
      return "success";
    };

    await engine.retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 5000,
    });

    // First attempt should be immediate (delay ~0)
    expect(delays[0]).toBeLessThan(50);

    // Second attempt should have exponential backoff (~100ms with jitter)
    // Allow generous range due to timing variance
    expect(delays[1]).toBeGreaterThan(70);
    expect(delays[1]).toBeLessThan(150);

    // Third attempt should have longer backoff (~200ms with jitter)
    expect(delays[2]).toBeGreaterThan(150);
    expect(delays[2]).toBeLessThan(400); // Increased for jitter variance
  });

  it("Respects maxDelay cap", async () => {
    let attempts = 0;
    const executeTimes: number[] = [];

    const fn = async (): Promise<string> => {
      executeTimes.push(Date.now());
      attempts++;
      if (attempts < 5) {
        throw new Error("Failed");
      }
      return "success";
    };

    // Use small maxDelay to test capping
    await engine.retryWithBackoff(fn, {
      maxAttempts: 5,
      baseDelay: 100,
      maxDelay: 200,
    });

    // Calculate delays between executions
    const delays: number[] = [];
    for (let i = 1; i < executeTimes.length; i++) {
      delays.push(executeTimes[i] - executeTimes[i - 1]);
    }

    // Verify all delays are roughly in the expected range
    // With maxDelay=200 and jitter, delays should be 150-250ms
    // The key is that delays don't grow exponentially beyond maxDelay
    const maxDelayCalculated = Math.max(...delays);
    const minDelay = Math.min(...delays);

    // Max delay should not be significantly larger than min delay
    // (indicates capping is working, not exponential growth)
    expect(maxDelayCalculated / minDelay).toBeLessThan(3.5); // Allow some variance but not exponential

    // All delays should be reasonable (not seconds)
    for (const delay of delays) {
      expect(delay).toBeGreaterThan(50); // At least some delay
      expect(delay).toBeLessThan(1000); // Not excessively long
    }
  });

  it("Validates retry options", async () => {
    const fn = async (): Promise<string> => "success";

    // maxAttempts < 1
    await expect(
      engine.retryWithBackoff(fn, { maxAttempts: 0 })
    ).rejects.toThrow(ErrorRecoveryException);

    // baseDelay < 0
    await expect(
      engine.retryWithBackoff(fn, { baseDelay: -100 })
    ).rejects.toThrow(ErrorRecoveryException);

    // maxDelay < 0
    await expect(
      engine.retryWithBackoff(fn, { maxDelay: -100 })
    ).rejects.toThrow(ErrorRecoveryException);

    // baseDelay > maxDelay
    await expect(
      engine.retryWithBackoff(fn, { baseDelay: 5000, maxDelay: 1000 })
    ).rejects.toThrow(ErrorRecoveryException);
  });
});

describe("ErrorRecoveryEngine: circuit breaker", () => {
  let engine: ErrorRecoveryEngine;

  beforeEach(() => {
    engine = new ErrorRecoveryEngine();
  });

  it("Opens circuit after threshold failures", async () => {
    const service = "test-service";

    // Simulate failures (threshold is 5 by default)
    for (let i = 0; i < 5; i++) {
      await expect(
        engine.executeWithCircuitBreaker(service, async () => {
          throw new Error("Service unavailable");
        })
      ).rejects.toThrow("Service unavailable");
    }

    // Circuit should now be open
    expect(engine.getCircuitBreakerState(service)).toBe(CircuitState.OPEN);
  });

  it("Blocks requests when circuit is open", async () => {
    const service = "test-service";

    // Open the circuit by causing 5 failures
    for (let i = 0; i < 5; i++) {
      try {
        await engine.executeWithCircuitBreaker(service, async () => {
          throw new Error("Service unavailable");
        });
      } catch {
        // Expected to fail
      }
    }

    // Verify circuit is open
    expect(engine.getCircuitBreakerState(service)).toBe(CircuitState.OPEN);

    // Try to execute with open circuit
    await expect(
      engine.executeWithCircuitBreaker(service, async () => {
        return "success";
      })
    ).rejects.toThrow(ErrorRecoveryException);
    await expect(
      engine.executeWithCircuitBreaker(service, async () => {
        return "success";
      })
    ).rejects.toThrow("Circuit breaker is open");
  });

  it("Closes circuit after cooldown period", async () => {
    const service = "test-service";

    // Create engine with short cooldown period for testing
    const customEngine = new ErrorRecoveryEngine();
    // Access private circuitBreakers map for testing
    const breaker = (customEngine as unknown as { circuitBreakers: Map<string, unknown> }).circuitBreakers;

    // Manually set circuit state to OPEN with old timestamp
    breaker.set(service, {
      state: CircuitState.OPEN,
      failureCount: 5,
      openedAt: Date.now() - 70000, // 70 seconds ago (past default 60s cooldown)
      lastFailureTime: Date.now() - 70000,
    });

    // Circuit should still be open
    expect(customEngine.getCircuitBreakerState(service)).toBe(CircuitState.OPEN);

    // Execute should transition to half-open
    const result = await customEngine.executeWithCircuitBreaker(service, async () => {
      return "success";
    });

    expect(result).toBe("success");

    // After success, circuit should be closed
    expect(customEngine.getCircuitBreakerState(service)).toBe(CircuitState.CLOSED);
  });

  it("Resets circuit breaker", async () => {
    const service = "test-service";

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await engine.executeWithCircuitBreaker(service, async () => {
          throw new Error("Service unavailable");
        });
      } catch {
        // Expected to fail
      }
    }

    expect(engine.getCircuitBreakerState(service)).toBe(CircuitState.OPEN);

    // Reset circuit breaker
    engine.resetCircuitBreaker(service);

    // Circuit should be closed again
    expect(engine.getCircuitBreakerState(service)).toBe(CircuitState.CLOSED);
  });
});

describe("ErrorRecoveryEngine: checkpoint recovery", () => {
  let engine: ErrorRecoveryEngine;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-checkpoints-recovery");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    engine = new ErrorRecoveryEngine({ stateManager });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Saves checkpoint on failure", async () => {
    const tasks = [
      { id: "task-1", prompt: "Test prompt 1" },
      { id: "task-2", prompt: "Test prompt 2" },
    ];

    const executeFn = async (): Promise<WaveResult> => {
      return {
        tasks: [
          { id: "task-1", success: false, error: "Task failed" },
          { id: "task-2", success: true },
        ],
        waves: [],
        totalSuccess: 1,
        totalFailure: 1,
      };
    };

    // Execute with recovery
    const result = await engine.executeWithRecovery(tasks, "wave-1", executeFn);

    expect(result.totalSuccess).toBe(1);
    expect(result.totalFailure).toBe(1);

    // Verify checkpoint was saved
    const savedState = await stateManager.loadCheckpoint("wave-1");
    expect(savedState).not.toBeNull();
    expect(savedState?.completedTasks).toEqual(["task-2"]);
    expect(savedState?.failedTasks).toEqual(["task-1"]);
  });

  it("Recovers from checkpoint and executes remaining tasks", async () => {
    const tasks = [
      { id: "task-1", prompt: "Test prompt 1" },
      { id: "task-2", prompt: "Test prompt 2" },
      { id: "task-3", prompt: "Test prompt 3" },
    ];

    // Manually create a checkpoint with task-1 completed, task-2 failed
    await stateManager.saveCheckpoint("wave-1", {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: ["task-2"],
      timestamp: new Date().toISOString(),
    });

    // Track which tasks are executed
    let executedTasks: string[] = [];
    const executeFn = async (taskList: typeof tasks): Promise<WaveResult> => {
      executedTasks = taskList.map(t => t.id);
      return {
        tasks: taskList.map(t => ({ id: t.id, success: true })),
        waves: [],
        totalSuccess: taskList.length,
        totalFailure: 0,
      };
    };

    // Execute with recovery - should only process task-3
    await engine.executeWithRecovery(tasks, "wave-1", executeFn);

    // Should only execute task-3 (the remaining task, not completed or failed)
    expect(executedTasks).toEqual(["task-3"]);

    // Verify checkpoint was updated
    const savedState = await stateManager.loadCheckpoint("wave-1");
    expect(savedState?.completedTasks).toContain("task-1");
    expect(savedState?.completedTasks).toContain("task-3");
  });

  it("Returns empty result when all tasks already completed", async () => {
    const tasks = [
      { id: "task-1", prompt: "Test prompt 1" },
      { id: "task-2", prompt: "Test prompt 2" },
    ];

    // Create a checkpoint with all tasks completed
    await stateManager.saveCheckpoint("wave-1", {
      waveNumber: 1,
      completedTasks: ["task-1", "task-2"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    });

    const executeFn = async (): Promise<WaveResult> => {
      throw new Error("Should not be called");
    };

    // Should not call executeFn since all tasks are complete
    const result = await engine.executeWithRecovery(tasks, "wave-1", executeFn);

    expect(result.totalSuccess).toBe(2);
    expect(result.totalFailure).toBe(0);
    expect(result.tasks).toHaveLength(2);
  });
});

describe("ErrorRecoveryEngine: edge cases", () => {
  it("Handles zero maxAttempts (synchronous execution)", async () => {
    const engine = new ErrorRecoveryEngine();
    let attempts = 0;

    const fn = async (): Promise<string> => {
      attempts++;
      if (attempts === 1) {
        throw new Error("First attempt failed");
      }
      return "success";
    };

    // maxAttempts=1 means execute once (no retries)
    await expect(engine.retryWithBackoff(fn, { maxAttempts: 1 })).rejects.toThrow();
    expect(attempts).toBe(1);
  });

  it("Allows execution when circuit is closed", async () => {
    const engine = new ErrorRecoveryEngine();
    const service = "test-service";

    // Circuit should be closed by default
    expect(engine.getCircuitBreakerState(service)).toBe(CircuitState.CLOSED);

    // Execution should succeed
    const result = await engine.executeWithCircuitBreaker(service, async () => {
      return "success";
    });

    expect(result).toBe("success");
    expect(engine.getCircuitBreakerState(service)).toBe(CircuitState.CLOSED);
  });

  it("Requires executeFn when no stateManager", async () => {
    const engine = new ErrorRecoveryEngine();
    const tasks = [{ id: "task-1", prompt: "Test" }];

    await expect(
      engine.executeWithRecovery(tasks, undefined, undefined)
    ).rejects.toThrow("executeFn is required");
  });
});
