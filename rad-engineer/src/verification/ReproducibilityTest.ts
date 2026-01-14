/**
 * ReproducibilityTest - Run tasks multiple times to measure determinism
 *
 * Executes the same task N times and analyzes output consistency
 * to measure reproducibility and identify sources of drift.
 */

import { ASTComparator } from "./ASTComparator.js";

export interface TestTask {
  /** Unique task ID */
  id: string;
  /** Task description */
  description: string;
  /** Task input/prompt */
  input: string;
  /** Expected output type */
  expectedType: "code" | "text" | "json";
  /** Task metadata */
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  /** Task that was executed */
  taskId: string;
  /** Run number (1-N) */
  runNumber: number;
  /** Execution output */
  output: string;
  /** Execution time (ms) */
  executionTimeMs: number;
  /** Was execution successful? */
  success: boolean;
  /** Error if failed */
  error?: string;
  /** Timestamp */
  timestamp: Date;
}

export interface ReproducibilityReport {
  /** Task that was tested */
  task: TestTask;
  /** All run results */
  results: TaskResult[];
  /** Number of successful runs */
  successfulRuns: number;
  /** Number of failed runs */
  failedRuns: number;
  /** Reproducibility rate (0-1) */
  reproducibilityRate: number;
  /** Drift rate (0-100%) */
  driftRate: number;
  /** Unique output variants */
  uniqueVariants: number;
  /** Consensus output (most common) */
  consensusOutput: string | null;
  /** Agreement rate with consensus */
  consensusAgreement: number;
  /** Average execution time */
  avgExecutionTimeMs: number;
  /** Execution time variance */
  executionTimeVariance: number;
  /** Analysis of differences */
  differenceAnalysis: DifferenceAnalysis;
}

export interface DifferenceAnalysis {
  /** Categories of differences found */
  categories: DifferenceCategory[];
  /** Most common difference type */
  mostCommonDifference: string | null;
  /** Suggested improvements */
  suggestions: string[];
}

export interface DifferenceCategory {
  category: string;
  count: number;
  examples: string[];
}

export interface TestConfig {
  /** Number of runs */
  runs: number;
  /** Timeout per run (ms) */
  timeout: number;
  /** Parallel execution */
  parallel: boolean;
  /** Max parallel runs */
  maxParallel: number;
  /** Stop on first failure */
  stopOnFailure: boolean;
  /** Delay between runs (ms) */
  delayBetweenRuns: number;
}

export type TaskExecutor = (
  task: TestTask
) => Promise<{ output: string; success: boolean; error?: string }>;

/**
 * ReproducibilityTest runs tasks multiple times to measure determinism
 */
export class ReproducibilityTest {
  private config: TestConfig;
  private comparator: ASTComparator;
  private executor: TaskExecutor;

  constructor(executor: TaskExecutor, config: Partial<TestConfig> = {}) {
    this.executor = executor;
    this.config = {
      runs: 10,
      timeout: 60000,
      parallel: false,
      maxParallel: 3,
      stopOnFailure: false,
      delayBetweenRuns: 100,
      ...config,
    };
    this.comparator = new ASTComparator();
  }

  /**
   * Run reproducibility test for a single task
   */
  async runTest(task: TestTask): Promise<ReproducibilityReport> {
    const results: TaskResult[] = [];

    if (this.config.parallel) {
      // Parallel execution
      const batches = this.createBatches(this.config.runs, this.config.maxParallel);

      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map((runNum) => this.executeRun(task, runNum))
        );
        results.push(...batchResults);

        // Check for stop condition
        if (this.config.stopOnFailure && batchResults.some((r) => !r.success)) {
          break;
        }
      }
    } else {
      // Sequential execution
      for (let i = 1; i <= this.config.runs; i++) {
        const result = await this.executeRun(task, i);
        results.push(result);

        if (this.config.stopOnFailure && !result.success) {
          break;
        }

        // Delay between runs
        if (i < this.config.runs && this.config.delayBetweenRuns > 0) {
          await this.delay(this.config.delayBetweenRuns);
        }
      }
    }

    return this.generateReport(task, results);
  }

  /**
   * Run reproducibility tests for multiple tasks
   */
  async runTests(tasks: TestTask[]): Promise<ReproducibilityReport[]> {
    const reports: ReproducibilityReport[] = [];

    for (const task of tasks) {
      const report = await this.runTest(task);
      reports.push(report);
    }

    return reports;
  }

  /**
   * Quick check: is output reproducible?
   */
  async isReproducible(
    task: TestTask,
    threshold: number = 0.9
  ): Promise<boolean> {
    const report = await this.runTest(task);
    return report.reproducibilityRate >= threshold;
  }

  /**
   * Get aggregate statistics for multiple reports
   */
  getAggregateStats(
    reports: ReproducibilityReport[]
  ): {
    avgReproducibilityRate: number;
    avgDriftRate: number;
    totalTasks: number;
    reproducibleTasks: number;
    nonReproducibleTasks: number;
    mostCommonIssues: string[];
  } {
    if (reports.length === 0) {
      return {
        avgReproducibilityRate: 0,
        avgDriftRate: 0,
        totalTasks: 0,
        reproducibleTasks: 0,
        nonReproducibleTasks: 0,
        mostCommonIssues: [],
      };
    }

    const avgReproducibilityRate =
      reports.reduce((sum, r) => sum + r.reproducibilityRate, 0) / reports.length;
    const avgDriftRate =
      reports.reduce((sum, r) => sum + r.driftRate, 0) / reports.length;

    const reproducibleTasks = reports.filter((r) => r.reproducibilityRate >= 0.9).length;
    const nonReproducibleTasks = reports.length - reproducibleTasks;

    // Collect common issues
    const issueCounts = new Map<string, number>();
    for (const report of reports) {
      if (report.differenceAnalysis.mostCommonDifference) {
        const issue = report.differenceAnalysis.mostCommonDifference;
        issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
      }
    }

    const mostCommonIssues = Array.from(issueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      avgReproducibilityRate,
      avgDriftRate,
      totalTasks: reports.length,
      reproducibleTasks,
      nonReproducibleTasks,
      mostCommonIssues,
    };
  }

  // Private methods

  private async executeRun(task: TestTask, runNumber: number): Promise<TaskResult> {
    const start = Date.now();

    try {
      const result = await Promise.race([
        this.executor(task),
        this.timeoutPromise(this.config.timeout),
      ]);

      return {
        taskId: task.id,
        runNumber,
        output: result.output,
        executionTimeMs: Date.now() - start,
        success: result.success,
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        taskId: task.id,
        runNumber,
        output: "",
        executionTimeMs: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private generateReport(task: TestTask, results: TaskResult[]): ReproducibilityReport {
    const successfulResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    // Get outputs from successful runs
    const outputs = successfulResults.map((r) => r.output);

    // Calculate consensus and drift
    const consensusResult = this.comparator.findConsensus(outputs);
    const driftResult = this.comparator.calculateDrift(outputs);

    // Calculate execution time stats
    const executionTimes = results.map((r) => r.executionTimeMs);
    const avgExecutionTime =
      executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    const variance = this.calculateVariance(executionTimes);

    // Analyze differences
    const differenceAnalysis = this.analyzeDifferences(outputs, task.expectedType);

    // Calculate reproducibility rate
    const reproducibilityRate = consensusResult.agreementRate;

    return {
      task,
      results,
      successfulRuns: successfulResults.length,
      failedRuns: failedResults.length,
      reproducibilityRate,
      driftRate: driftResult.driftRate,
      uniqueVariants: driftResult.uniqueVariants,
      consensusOutput: consensusResult.consensus,
      consensusAgreement: consensusResult.agreementRate,
      avgExecutionTimeMs: avgExecutionTime,
      executionTimeVariance: variance,
      differenceAnalysis,
    };
  }

  private analyzeDifferences(outputs: string[], type: string): DifferenceAnalysis {
    if (outputs.length < 2) {
      return {
        categories: [],
        mostCommonDifference: null,
        suggestions: [],
      };
    }

    const categories: DifferenceCategory[] = [];
    const suggestions: string[] = [];

    // Compare each output to the first (reference)
    const reference = outputs[0];
    const differenceCounts = new Map<string, { count: number; examples: string[] }>();

    for (let i = 1; i < outputs.length; i++) {
      const diff = this.comparator.getDiff(reference, outputs[i]);

      // Categorize differences
      for (const line of diff) {
        if (line.startsWith("+ ") || line.startsWith("- ")) {
          const category = this.categorizeDifference(line, type);
          const existing = differenceCounts.get(category);
          if (existing) {
            existing.count++;
            if (existing.examples.length < 3) {
              existing.examples.push(line.substring(0, 50));
            }
          } else {
            differenceCounts.set(category, {
              count: 1,
              examples: [line.substring(0, 50)],
            });
          }
        }
      }
    }

    // Convert to categories
    for (const [category, data] of differenceCounts) {
      categories.push({
        category,
        count: data.count,
        examples: data.examples,
      });
    }

    // Sort by count
    categories.sort((a, b) => b.count - a.count);

    // Generate suggestions based on categories
    for (const cat of categories.slice(0, 3)) {
      suggestions.push(this.generateSuggestion(cat.category));
    }

    return {
      categories,
      mostCommonDifference: categories[0]?.category || null,
      suggestions,
    };
  }

  private categorizeDifference(diff: string, type: string): string {
    const content = diff.substring(2);

    // Check for common patterns
    if (content.match(/\d{10,}/)) return "timestamp_variation";
    if (content.match(/[a-f0-9]{8}-[a-f0-9]{4}/)) return "uuid_variation";
    if (content.match(/^import|^from/)) return "import_order";
    if (content.match(/^\s+/)) return "whitespace_variation";
    if (content.match(/\/\/|#|\/\*/)) return "comment_variation";
    if (content.match(/".*"|'.*'/)) return "string_variation";
    if (content.match(/^\s*(const|let|var)\s+\w+/)) return "variable_naming";
    if (content.match(/function|def|=>/)) return "function_variation";

    return "other";
  }

  private generateSuggestion(category: string): string {
    const suggestions: Record<string, string> = {
      timestamp_variation: "Use fixed timestamps or mock Date.now() for determinism",
      uuid_variation: "Use seeded UUID generation or mock UUID functions",
      import_order: "Enable import sorting in linting rules",
      whitespace_variation: "Use consistent formatting (prettier/black)",
      comment_variation: "Standardize comment format or remove from comparison",
      string_variation: "Check for interpolated dynamic values in strings",
      variable_naming: "Use deterministic naming conventions",
      function_variation: "Check for non-deterministic function implementations",
    };

    return suggestions[category] || "Review output for non-deterministic patterns";
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private createBatches<T>(count: number, batchSize: number): number[][] {
    const batches: number[][] = [];
    for (let i = 1; i <= count; i += batchSize) {
      const batch: number[] = [];
      for (let j = i; j < i + batchSize && j <= count; j++) {
        batch.push(j);
      }
      batches.push(batch);
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Execution timeout")), ms)
    );
  }
}

/**
 * Create a reproducibility test runner
 */
export function createReproducibilityTest(
  executor: TaskExecutor,
  config?: Partial<TestConfig>
): ReproducibilityTest {
  return new ReproducibilityTest(executor, config);
}
