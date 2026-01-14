/**
 * LoadTester - Load Testing Framework
 *
 * Verifies system behavior under stress with concurrent users
 * Collects throughput, latency (p50, p95, p99), and error metrics
 */

export interface LoadTestConfig {
  /** Number of concurrent users to simulate */
  concurrentUsers: number;
  /** Total test duration in milliseconds */
  duration: number;
  /** Ramp-up time before measurement starts (ms) */
  rampUpTime: number;
  /** Target requests per second */
  targetRPS: number;
  /** Pass/fail thresholds for metrics */
  thresholds?: {
    maxP50Latency?: number;
    maxP95Latency?: number;
    maxP99Latency?: number;
    maxErrorRate?: number;
    minThroughput?: number;
  };
  /** Use mock mode for fast testing */
  mockMode?: boolean;
}

export interface LoadTestMetrics {
  /** Total requests executed */
  totalRequests: number;
  /** Successful requests */
  successCount: number;
  /** Failed requests */
  errorCount: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Requests per second */
  throughput: number;
  /** Latency percentiles in milliseconds */
  latency: {
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    mean: number;
  };
  /** Test duration in milliseconds */
  actualDuration: number;
  /** Whether test passed all thresholds */
  passed: boolean;
  /** Threshold violations (empty if passed) */
  violations: string[];
}

export interface LoadTestResult {
  /** Test configuration used */
  config: LoadTestConfig;
  /** Collected metrics */
  metrics: LoadTestMetrics;
  /** Warm-up phase metrics (not counted in pass/fail) */
  warmUpMetrics?: {
    requests: number;
    duration: number;
  };
}

export type TaskFunction = () => Promise<void>;

/**
 * LoadTester class for stress testing system behavior
 */
export class LoadTester {
  private latencies: number[] = [];
  private errors: number = 0;
  private successes: number = 0;
  private startTime: number = 0;
  private warmUpEndTime: number = 0;

  constructor(private taskFn?: TaskFunction) {}

  /**
   * Run load test with specified configuration
   */
  async runTest(config: LoadTestConfig): Promise<LoadTestResult> {
    this.reset();

    const taskFunction = this.taskFn || this.createSyntheticTask(config.mockMode);

    this.startTime = Date.now();
    this.warmUpEndTime = this.startTime + config.rampUpTime;

    // Warm-up phase
    const warmUpResult = await this.runWarmUp(config, taskFunction);

    // Reset metrics after warm-up
    this.latencies = [];
    this.errors = 0;
    this.successes = 0;

    // Measurement phase
    const measurementStart = Date.now();
    await this.runMeasurement(config, taskFunction);
    const actualDuration = Date.now() - measurementStart;

    // Calculate metrics
    const metrics = this.calculateMetrics(actualDuration, config);

    return {
      config,
      metrics,
      warmUpMetrics: warmUpResult,
    };
  }

  /**
   * Run warm-up phase to stabilize system
   */
  private async runWarmUp(
    config: LoadTestConfig,
    taskFn: TaskFunction
  ): Promise<{ requests: number; duration: number }> {
    if (config.rampUpTime === 0) {
      return { requests: 0, duration: 0 };
    }

    const warmUpStart = Date.now();
    const warmUpEnd = warmUpStart + config.rampUpTime;
    const warmUpLatencies: number[] = [];

    // Simplified ramp-up: gradually increase load
    const steps = 5;
    const stepDuration = config.rampUpTime / steps;

    for (let step = 1; step <= steps; step++) {
      const stepEnd = warmUpStart + step * stepDuration;
      const currentUsers = Math.ceil((step / steps) * config.concurrentUsers);

      // Run tasks for this step duration
      const stepTasks: Promise<void>[] = [];
      while (Date.now() < stepEnd) {
        for (let i = 0; i < currentUsers; i++) {
          const promise = this.executeTask(taskFn, warmUpLatencies, true);
          stepTasks.push(promise);
        }

        // Rate limiting
        const delayMs = (1000 / config.targetRPS) * currentUsers;
        await this.sleep(Math.max(10, delayMs));

        // Break if time is up
        if (Date.now() >= stepEnd) {
          break;
        }
      }

      // Don't wait for completion, continue ramping
    }

    return {
      requests: warmUpLatencies.length,
      duration: Date.now() - warmUpStart,
    };
  }

  /**
   * Run measurement phase with full load
   */
  private async runMeasurement(
    config: LoadTestConfig,
    taskFn: TaskFunction
  ): Promise<void> {
    if (config.duration === 0) {
      return;
    }

    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const requestIntervalMs = (1000 / config.targetRPS) * config.concurrentUsers;
    const activeTasks: Set<Promise<void>> = new Set();

    while (Date.now() < endTime) {
      const batchStart = Date.now();

      // Spawn batch of concurrent users
      for (let i = 0; i < config.concurrentUsers && Date.now() < endTime; i++) {
        const promise = this.executeTask(taskFn, this.latencies, false);
        activeTasks.add(promise);

        // Clean up completed promises
        promise.finally(() => activeTasks.delete(promise));
      }

      // Rate limiting - wait for next batch
      const elapsed = Date.now() - batchStart;
      const sleepTime = Math.max(0, requestIntervalMs - elapsed);
      if (sleepTime > 0) {
        await this.sleep(sleepTime);
      }
    }

    // Wait for remaining tasks to complete
    await Promise.all(Array.from(activeTasks));
  }

  /**
   * Execute a single task and record metrics
   */
  private async executeTask(
    taskFn: TaskFunction,
    latencyArray: number[],
    isWarmUp: boolean
  ): Promise<void> {
    const start = Date.now();
    try {
      await taskFn();
      const latency = Date.now() - start;
      latencyArray.push(latency);
      if (!isWarmUp) {
        this.successes++;
      }
    } catch (error) {
      const latency = Date.now() - start;
      latencyArray.push(latency);
      if (!isWarmUp) {
        this.errors++;
      }
    }
  }

  /**
   * Calculate final metrics from collected data
   */
  private calculateMetrics(
    actualDuration: number,
    config: LoadTestConfig
  ): LoadTestMetrics {
    const totalRequests = this.successes + this.errors;
    const errorRate = totalRequests > 0 ? this.errors / totalRequests : 0;
    const throughput = (totalRequests / actualDuration) * 1000; // requests per second

    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const latency = this.calculatePercentiles(sortedLatencies);

    const thresholds = config.thresholds || {};
    const violations: string[] = [];

    // Check thresholds
    if (thresholds.maxP50Latency && latency.p50 > thresholds.maxP50Latency) {
      violations.push(
        `P50 latency ${latency.p50.toFixed(2)}ms exceeds threshold ${thresholds.maxP50Latency}ms`
      );
    }
    if (thresholds.maxP95Latency && latency.p95 > thresholds.maxP95Latency) {
      violations.push(
        `P95 latency ${latency.p95.toFixed(2)}ms exceeds threshold ${thresholds.maxP95Latency}ms`
      );
    }
    if (thresholds.maxP99Latency && latency.p99 > thresholds.maxP99Latency) {
      violations.push(
        `P99 latency ${latency.p99.toFixed(2)}ms exceeds threshold ${thresholds.maxP99Latency}ms`
      );
    }
    if (thresholds.maxErrorRate && errorRate > thresholds.maxErrorRate) {
      violations.push(
        `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(thresholds.maxErrorRate * 100).toFixed(2)}%`
      );
    }
    if (thresholds.minThroughput && throughput < thresholds.minThroughput) {
      violations.push(
        `Throughput ${throughput.toFixed(2)} RPS below threshold ${thresholds.minThroughput} RPS`
      );
    }

    return {
      totalRequests,
      successCount: this.successes,
      errorCount: this.errors,
      errorRate,
      throughput,
      latency,
      actualDuration,
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Calculate latency percentiles
   */
  private calculatePercentiles(sortedLatencies: number[]): LoadTestMetrics["latency"] {
    if (sortedLatencies.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        mean: 0,
      };
    }

    const getPercentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sortedLatencies.length) - 1;
      return sortedLatencies[Math.max(0, index)];
    };

    const sum = sortedLatencies.reduce((acc, val) => acc + val, 0);
    const mean = sum / sortedLatencies.length;

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
      min: sortedLatencies[0],
      max: sortedLatencies[sortedLatencies.length - 1],
      mean,
    };
  }

  /**
   * Create synthetic task for stress testing
   */
  private createSyntheticTask(mockMode: boolean = false): TaskFunction {
    return async () => {
      if (mockMode) {
        // Fast mock task with random latency
        const latency = 5 + Math.random() * 20; // 5-25ms
        await this.sleep(latency);

        // Simulate 5% error rate
        if (Math.random() < 0.05) {
          throw new Error("Synthetic error");
        }
      } else {
        // Simulate more realistic work
        const latency = 50 + Math.random() * 100; // 50-150ms
        await this.sleep(latency);

        // Simulate 2% error rate
        if (Math.random() < 0.02) {
          throw new Error("Synthetic error");
        }
      }
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset internal state
   */
  private reset(): void {
    this.latencies = [];
    this.errors = 0;
    this.successes = 0;
    this.startTime = 0;
    this.warmUpEndTime = 0;
  }
}
