/**
 * BenchmarkRunner - Run evaluation tasks and collect metrics
 *
 * Provides:
 * - Benchmark task definitions
 * - Metric collection
 * - Result comparison
 * - Performance tracking
 */

import type { ExecutionContext } from "../verification/Condition.js";
import type { ExecutionTrace } from "./TraceAnalyzer.js";
import type { AgentConfig } from "./ConfigMutator.js";

/**
 * Benchmark task definition
 */
export interface BenchmarkTask {
  /** Task ID */
  id: string;
  /** Task name */
  name: string;
  /** Task description */
  description: string;
  /** Task category */
  category: BenchmarkCategory;
  /** Difficulty level (1-5) */
  difficulty: number;
  /** Input for the task */
  input: Record<string, unknown>;
  /** Expected output validator */
  expectedOutput?: (output: Record<string, unknown>) => boolean;
  /** Quality metrics to evaluate */
  metrics: BenchmarkMetric[];
  /** Timeout (ms) */
  timeoutMs: number;
  /** Tags for filtering */
  tags: string[];
}

/**
 * Benchmark categories
 */
export type BenchmarkCategory =
  | "correctness"
  | "performance"
  | "reliability"
  | "edge_case"
  | "integration";

/**
 * Metric types
 */
export type BenchmarkMetric =
  | "execution_time"
  | "success_rate"
  | "output_quality"
  | "token_usage"
  | "retry_count"
  | "condition_pass_rate";

/**
 * Result of running a single benchmark task
 */
export interface BenchmarkResult {
  /** Task ID */
  taskId: string;
  /** Config ID used */
  configId: string;
  /** Whether task succeeded */
  success: boolean;
  /** Execution time (ms) */
  executionTimeMs: number;
  /** Output produced */
  output?: Record<string, unknown>;
  /** Output quality score (0-100) */
  qualityScore: number;
  /** Metric values */
  metrics: Record<BenchmarkMetric, number>;
  /** Execution trace */
  trace?: ExecutionTrace;
  /** Error if failed */
  error?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Suite of benchmark results
 */
export interface BenchmarkSuiteResult {
  /** Suite run ID */
  id: string;
  /** Config used */
  configId: string;
  /** Tasks run */
  taskCount: number;
  /** Tasks succeeded */
  successCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Total execution time (ms) */
  totalTimeMs: number;
  /** Average quality score */
  avgQualityScore: number;
  /** Individual results */
  results: BenchmarkResult[];
  /** Aggregate metrics */
  aggregateMetrics: Record<BenchmarkMetric, AggregateMetric>;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime: Date;
}

/**
 * Aggregate metric statistics
 */
export interface AggregateMetric {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Average value */
  avg: number;
  /** Median value */
  median: number;
  /** Standard deviation */
  stdDev: number;
}

/**
 * Comparison result between two benchmark runs
 */
export interface BenchmarkComparison {
  /** Baseline suite ID */
  baselineSuiteId: string;
  /** Candidate suite ID */
  candidateSuiteId: string;
  /** Overall improvement (-100 to +100) */
  overallImprovement: number;
  /** Per-metric improvements */
  metricImprovements: Record<BenchmarkMetric, number>;
  /** Task-level comparisons */
  taskComparisons: TaskComparison[];
  /** Whether candidate is better overall */
  candidateIsBetter: boolean;
  /** Significance level (0-1) */
  significance: number;
}

/**
 * Task-level comparison
 */
export interface TaskComparison {
  /** Task ID */
  taskId: string;
  /** Baseline result */
  baseline: BenchmarkResult;
  /** Candidate result */
  candidate: BenchmarkResult;
  /** Quality improvement */
  qualityDelta: number;
  /** Time improvement (negative = faster) */
  timeDeltaMs: number;
  /** Success changed */
  successChanged: boolean;
}

/**
 * Executor function type
 */
export type TaskExecutor = (
  task: BenchmarkTask,
  config: AgentConfig,
  context: ExecutionContext
) => Promise<{
  success: boolean;
  output?: Record<string, unknown>;
  trace?: ExecutionTrace;
  error?: string;
}>;

/**
 * BenchmarkRunner configuration
 */
export interface BenchmarkRunnerConfig {
  /** Maximum concurrent tasks */
  concurrency: number;
  /** Retry failed tasks */
  retryFailed: boolean;
  /** Max retries per task */
  maxRetries: number;
  /** Collect traces */
  collectTraces: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * BenchmarkRunner - Execute benchmarks and collect metrics
 *
 * @example
 * ```ts
 * const runner = new BenchmarkRunner(executor);
 *
 * // Run single task
 * const result = await runner.runTask(task, config, context);
 *
 * // Run suite
 * const suite = await runner.runSuite(tasks, config, context);
 *
 * // Compare configurations
 * const comparison = runner.compare(baselineSuite, candidateSuite);
 * ```
 */
export class BenchmarkRunner {
  private readonly executor: TaskExecutor;
  private readonly config: Required<BenchmarkRunnerConfig>;

  constructor(executor: TaskExecutor, config?: Partial<BenchmarkRunnerConfig>) {
    this.executor = executor;
    this.config = {
      concurrency: 3,
      retryFailed: true,
      maxRetries: 2,
      collectTraces: true,
      onProgress: () => {},
      ...config,
    };
  }

  /**
   * Run a single benchmark task
   */
  async runTask(
    task: BenchmarkTask,
    agentConfig: AgentConfig,
    context: ExecutionContext
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    let lastError: string | undefined;
    let attemptCount = 0;

    while (attemptCount <= (this.config.retryFailed ? this.config.maxRetries : 0)) {
      attemptCount++;

      try {
        const result = await this.executeWithTimeout(task, agentConfig, context, task.timeoutMs);
        const executionTimeMs = performance.now() - startTime;

        const qualityScore = this.evaluateQuality(task, result.output);
        const metrics = this.collectMetrics(
          task,
          result.success,
          executionTimeMs,
          qualityScore,
          result.trace
        );

        return {
          taskId: task.id,
          configId: agentConfig.id,
          success: result.success,
          executionTimeMs,
          output: result.output,
          qualityScore,
          metrics,
          trace: this.config.collectTraces ? result.trace : undefined,
          error: result.error,
          timestamp: new Date(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attemptCount > this.config.maxRetries) {
          break;
        }
      }
    }

    // All retries failed
    const executionTimeMs = performance.now() - startTime;
    return {
      taskId: task.id,
      configId: agentConfig.id,
      success: false,
      executionTimeMs,
      qualityScore: 0,
      metrics: this.collectMetrics(task, false, executionTimeMs, 0, undefined),
      error: lastError,
      timestamp: new Date(),
    };
  }

  /**
   * Run a suite of benchmark tasks
   */
  async runSuite(
    tasks: BenchmarkTask[],
    agentConfig: AgentConfig,
    context: ExecutionContext
  ): Promise<BenchmarkSuiteResult> {
    const startTime = new Date();
    const results: BenchmarkResult[] = [];
    let completed = 0;

    // Run tasks with concurrency limit
    const batches = this.createBatches(tasks, this.config.concurrency);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (task) => {
          const result = await this.runTask(task, agentConfig, context);
          completed++;
          this.config.onProgress?.(completed, tasks.length);
          return result;
        })
      );
      results.push(...batchResults);
    }

    const endTime = new Date();
    const successCount = results.filter((r) => r.success).length;

    return {
      id: `suite-${Date.now()}`,
      configId: agentConfig.id,
      taskCount: tasks.length,
      successCount,
      successRate: successCount / tasks.length,
      totalTimeMs: endTime.getTime() - startTime.getTime(),
      avgQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
      results,
      aggregateMetrics: this.aggregateMetrics(results),
      startTime,
      endTime,
    };
  }

  /**
   * Compare two benchmark suite results
   */
  compare(baseline: BenchmarkSuiteResult, candidate: BenchmarkSuiteResult): BenchmarkComparison {
    const metricImprovements: Record<BenchmarkMetric, number> = {
      execution_time: 0,
      success_rate: 0,
      output_quality: 0,
      token_usage: 0,
      retry_count: 0,
      condition_pass_rate: 0,
    };

    // Calculate metric improvements
    for (const metric of Object.keys(metricImprovements) as BenchmarkMetric[]) {
      const baselineAvg = baseline.aggregateMetrics[metric]?.avg || 0;
      const candidateAvg = candidate.aggregateMetrics[metric]?.avg || 0;

      if (baselineAvg !== 0) {
        // For time and retry_count, lower is better
        if (metric === "execution_time" || metric === "retry_count") {
          metricImprovements[metric] = ((baselineAvg - candidateAvg) / baselineAvg) * 100;
        } else {
          // For others, higher is better
          metricImprovements[metric] = ((candidateAvg - baselineAvg) / baselineAvg) * 100;
        }
      }
    }

    // Task-level comparisons
    const taskComparisons: TaskComparison[] = [];
    const baselineResultMap = new Map(baseline.results.map((r) => [r.taskId, r]));

    for (const candidateResult of candidate.results) {
      const baselineResult = baselineResultMap.get(candidateResult.taskId);
      if (baselineResult) {
        taskComparisons.push({
          taskId: candidateResult.taskId,
          baseline: baselineResult,
          candidate: candidateResult,
          qualityDelta: candidateResult.qualityScore - baselineResult.qualityScore,
          timeDeltaMs: candidateResult.executionTimeMs - baselineResult.executionTimeMs,
          successChanged: candidateResult.success !== baselineResult.success,
        });
      }
    }

    // Calculate overall improvement
    const weights: Record<BenchmarkMetric, number> = {
      success_rate: 3,
      output_quality: 2,
      execution_time: 1,
      condition_pass_rate: 1.5,
      retry_count: 0.5,
      token_usage: 0.5,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [metric, improvement] of Object.entries(metricImprovements)) {
      const weight = weights[metric as BenchmarkMetric] || 1;
      weightedSum += improvement * weight;
      totalWeight += weight;
    }

    const overallImprovement = weightedSum / totalWeight;

    // Calculate significance based on sample size and variance
    const significance = this.calculateSignificance(baseline, candidate);

    return {
      baselineSuiteId: baseline.id,
      candidateSuiteId: candidate.id,
      overallImprovement,
      metricImprovements,
      taskComparisons,
      candidateIsBetter: overallImprovement > 0 && significance > 0.8,
      significance,
    };
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout(
    task: BenchmarkTask,
    config: AgentConfig,
    context: ExecutionContext,
    timeoutMs: number
  ): Promise<{
    success: boolean;
    output?: Record<string, unknown>;
    trace?: ExecutionTrace;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.executor(task, config, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Evaluate output quality
   */
  private evaluateQuality(task: BenchmarkTask, output?: Record<string, unknown>): number {
    if (!output) {
      return 0;
    }

    let score = 50; // Base score for having output

    // Check expected output if validator provided
    if (task.expectedOutput) {
      try {
        if (task.expectedOutput(output)) {
          score += 40;
        }
      } catch {
        // Validator threw, deduct points
        score -= 10;
      }
    } else {
      // No validator, give moderate score for any output
      score += 20;
    }

    // Bonus for completeness
    const outputKeys = Object.keys(output);
    if (outputKeys.length > 0) {
      score += Math.min(10, outputKeys.length * 2);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Collect metrics from execution
   */
  private collectMetrics(
    task: BenchmarkTask,
    success: boolean,
    executionTimeMs: number,
    qualityScore: number,
    trace?: ExecutionTrace
  ): Record<BenchmarkMetric, number> {
    return {
      execution_time: executionTimeMs,
      success_rate: success ? 1 : 0,
      output_quality: qualityScore,
      token_usage: trace?.metrics.totalDurationMs || 0, // Placeholder
      retry_count: trace?.metrics.retryCount || 0,
      condition_pass_rate: trace?.metrics.conditionPassRate || 0,
    };
  }

  /**
   * Aggregate metrics from results
   */
  private aggregateMetrics(
    results: BenchmarkResult[]
  ): Record<BenchmarkMetric, AggregateMetric> {
    const metrics: BenchmarkMetric[] = [
      "execution_time",
      "success_rate",
      "output_quality",
      "token_usage",
      "retry_count",
      "condition_pass_rate",
    ];

    const aggregates: Record<BenchmarkMetric, AggregateMetric> = {} as Record<
      BenchmarkMetric,
      AggregateMetric
    >;

    for (const metric of metrics) {
      const values = results.map((r) => r.metrics[metric] || 0);
      aggregates[metric] = this.calculateStats(values);
    }

    return aggregates;
  }

  /**
   * Calculate statistics for a set of values
   */
  private calculateStats(values: number[]): AggregateMetric {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    const midIndex = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[midIndex - 1] + sorted[midIndex]) / 2
        : sorted[midIndex];

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      median,
      stdDev,
    };
  }

  /**
   * Calculate statistical significance of comparison
   */
  private calculateSignificance(
    baseline: BenchmarkSuiteResult,
    candidate: BenchmarkSuiteResult
  ): number {
    // Simple significance based on sample size and consistency
    const n = Math.min(baseline.taskCount, candidate.taskCount);

    // More tasks = higher significance
    const sampleSignificance = Math.min(1, n / 20);

    // Lower variance in improvement = higher significance
    const improvements = candidate.results.map((cr) => {
      const br = baseline.results.find((r) => r.taskId === cr.taskId);
      return br ? cr.qualityScore - br.qualityScore : 0;
    });

    const stats = this.calculateStats(improvements);
    const consistencySignificance =
      stats.avg !== 0 ? 1 / (1 + Math.abs(stats.stdDev / stats.avg)) : 0.5;

    return (sampleSignificance + consistencySignificance) / 2;
  }

  /**
   * Create batches for parallel execution
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

/**
 * Standard benchmark tasks for testing
 */
export const StandardBenchmarks = {
  /**
   * Create a simple correctness benchmark
   */
  correctness: (
    id: string,
    name: string,
    input: Record<string, unknown>,
    expectedValidator?: (output: Record<string, unknown>) => boolean
  ): BenchmarkTask => ({
    id,
    name,
    description: `Correctness test: ${name}`,
    category: "correctness",
    difficulty: 2,
    input,
    expectedOutput: expectedValidator,
    metrics: ["success_rate", "output_quality"],
    timeoutMs: 30000,
    tags: ["correctness"],
  }),

  /**
   * Create a performance benchmark
   */
  performance: (
    id: string,
    name: string,
    input: Record<string, unknown>,
    timeoutMs: number = 60000
  ): BenchmarkTask => ({
    id,
    name,
    description: `Performance test: ${name}`,
    category: "performance",
    difficulty: 3,
    input,
    metrics: ["execution_time", "token_usage", "success_rate"],
    timeoutMs,
    tags: ["performance"],
  }),

  /**
   * Create a reliability benchmark
   */
  reliability: (id: string, name: string, input: Record<string, unknown>): BenchmarkTask => ({
    id,
    name,
    description: `Reliability test: ${name}`,
    category: "reliability",
    difficulty: 3,
    input,
    metrics: ["success_rate", "retry_count", "condition_pass_rate"],
    timeoutMs: 60000,
    tags: ["reliability"],
  }),

  /**
   * Create an edge case benchmark
   */
  edgeCase: (id: string, name: string, input: Record<string, unknown>): BenchmarkTask => ({
    id,
    name,
    description: `Edge case test: ${name}`,
    category: "edge_case",
    difficulty: 4,
    input,
    metrics: ["success_rate", "output_quality"],
    timeoutMs: 45000,
    tags: ["edge_case"],
  }),
};
