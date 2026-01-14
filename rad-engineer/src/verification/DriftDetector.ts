/**
 * DriftDetector - Statistical drift detection for determinism validation
 *
 * Measures drift rate by running tasks multiple times and comparing outputs.
 * 0% drift = perfect determinism (identical outputs every time).
 */

import { ASTNormalizer } from "./ASTNormalizer.js";
import { ASTComparator } from "./ASTComparator.js";
import { ReproducibilityTest, TestTask, TestConfig, TaskExecutor, ReproducibilityReport } from "./ReproducibilityTest.js";

export interface DriftMeasurement {
  /** Task that was measured */
  taskId: string;
  /** Number of runs */
  runs: number;
  /** Drift rate (0-100%) */
  driftRate: number;
  /** Unique output variants */
  uniqueVariants: number;
  /** Is deterministic? (drift < threshold) */
  isDeterministic: boolean;
  /** Confidence in measurement */
  confidence: number;
  /** Timestamp */
  timestamp: Date;
  /** Detailed analysis */
  analysis: DriftAnalysis;
}

export interface DriftAnalysis {
  /** Sources of drift identified */
  driftSources: DriftSource[];
  /** Recommendations for improvement */
  recommendations: string[];
  /** Consensus output if exists */
  consensusOutput: string | null;
  /** Agreement with consensus */
  consensusAgreement: number;
}

export interface DriftSource {
  /** Type of drift source */
  type: "timestamp" | "uuid" | "random" | "order" | "formatting" | "unknown";
  /** Severity (0-1) */
  severity: number;
  /** Description */
  description: string;
  /** Example occurrences */
  examples: string[];
}

export interface DriftThresholds {
  /** Maximum acceptable drift rate (%) */
  maxDriftRate: number;
  /** Minimum runs for confident measurement */
  minRuns: number;
  /** Confidence threshold for deterministic classification */
  confidenceThreshold: number;
}

export interface DetectorConfig {
  /** Default number of runs */
  defaultRuns: number;
  /** Drift thresholds */
  thresholds: DriftThresholds;
  /** Enable caching */
  enableCaching: boolean;
  /** Cache TTL (ms) */
  cacheTtl: number;
  /** Verbose logging */
  verbose: boolean;
}

export interface DriftReport {
  /** All measurements */
  measurements: DriftMeasurement[];
  /** Overall drift rate */
  overallDriftRate: number;
  /** Tasks with drift issues */
  tasksWithDrift: string[];
  /** Deterministic tasks */
  deterministicTasks: string[];
  /** Report timestamp */
  generatedAt: Date;
  /** Summary */
  summary: DriftSummary;
}

export interface DriftSummary {
  totalTasks: number;
  deterministicCount: number;
  driftingCount: number;
  deterministicRate: number;
  avgDriftRate: number;
  worstDriftRate: number;
  commonDriftSources: string[];
}

/**
 * DriftDetector measures output determinism for agent tasks
 */
export class DriftDetector {
  private config: DetectorConfig;
  private normalizer: ASTNormalizer;
  private comparator: ASTComparator;
  private executor: TaskExecutor;
  private cache: Map<string, { measurement: DriftMeasurement; timestamp: number }> = new Map();

  constructor(executor: TaskExecutor, config: Partial<DetectorConfig> = {}) {
    this.executor = executor;
    this.config = {
      defaultRuns: 10,
      thresholds: {
        maxDriftRate: 5,
        minRuns: 5,
        confidenceThreshold: 0.8,
      },
      enableCaching: true,
      cacheTtl: 300000, // 5 minutes
      verbose: false,
      ...config,
    };
    this.normalizer = new ASTNormalizer();
    this.comparator = new ASTComparator();
  }

  /**
   * Measure drift rate for a single task
   */
  async measureDriftRate(
    task: TestTask,
    runs?: number
  ): Promise<DriftMeasurement> {
    const numRuns = runs || this.config.defaultRuns;

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.getCached(task.id);
      if (cached) return cached;
    }

    // Run reproducibility test
    const reproTest = new ReproducibilityTest(this.executor, {
      runs: numRuns,
      parallel: numRuns <= 5,
      maxParallel: 3,
    });

    const report = await reproTest.runTest(task);

    // Calculate drift rate
    const driftRate =
      report.successfulRuns > 0
        ? ((report.uniqueVariants - 1) / report.successfulRuns) * 100
        : 100;

    // Analyze drift sources
    const driftSources = this.identifyDriftSources(report);

    // Calculate confidence
    const confidence = this.calculateConfidence(
      report.successfulRuns,
      numRuns,
      report.reproducibilityRate
    );

    // Create measurement
    const measurement: DriftMeasurement = {
      taskId: task.id,
      runs: numRuns,
      driftRate,
      uniqueVariants: report.uniqueVariants,
      isDeterministic: driftRate <= this.config.thresholds.maxDriftRate,
      confidence,
      timestamp: new Date(),
      analysis: {
        driftSources,
        recommendations: this.generateRecommendations(driftSources),
        consensusOutput: report.consensusOutput,
        consensusAgreement: report.consensusAgreement,
      },
    };

    // Cache result
    if (this.config.enableCaching) {
      this.setCache(task.id, measurement);
    }

    return measurement;
  }

  /**
   * Measure drift for multiple tasks
   */
  async measureMultipleTasks(tasks: TestTask[]): Promise<DriftReport> {
    const measurements: DriftMeasurement[] = [];

    for (const task of tasks) {
      const measurement = await this.measureDriftRate(task);
      measurements.push(measurement);
    }

    return this.generateReport(measurements);
  }

  /**
   * Quick check: is task deterministic?
   */
  async isDeterministic(task: TestTask, runs?: number): Promise<boolean> {
    const measurement = await this.measureDriftRate(task, runs || 5);
    return measurement.isDeterministic && measurement.confidence >= this.config.thresholds.confidenceThreshold;
  }

  /**
   * Compare outputs directly
   */
  async compareOutputs(outputs: string[]): Promise<{
    driftRate: number;
    identical: boolean;
    uniqueCount: number;
  }> {
    const result = this.comparator.calculateDrift(outputs);
    return {
      driftRate: result.driftRate,
      identical: result.uniqueVariants === 1,
      uniqueCount: result.uniqueVariants,
    };
  }

  /**
   * Validate determinism requirement
   */
  async validateDeterminism(
    task: TestTask,
    options: {
      runs?: number;
      maxDriftRate?: number;
      minConfidence?: number;
    } = {}
  ): Promise<{
    valid: boolean;
    measurement: DriftMeasurement;
    violations: string[];
  }> {
    const runs = options.runs || this.config.thresholds.minRuns;
    const maxDrift = options.maxDriftRate || this.config.thresholds.maxDriftRate;
    const minConf = options.minConfidence || this.config.thresholds.confidenceThreshold;

    const measurement = await this.measureDriftRate(task, runs);
    const violations: string[] = [];

    if (measurement.driftRate > maxDrift) {
      violations.push(
        `Drift rate ${measurement.driftRate.toFixed(1)}% exceeds maximum ${maxDrift}%`
      );
    }

    if (measurement.confidence < minConf) {
      violations.push(
        `Confidence ${(measurement.confidence * 100).toFixed(1)}% below minimum ${(minConf * 100).toFixed(0)}%`
      );
    }

    return {
      valid: violations.length === 0,
      measurement,
      violations,
    };
  }

  /**
   * Get thresholds
   */
  getThresholds(): DriftThresholds {
    return { ...this.config.thresholds };
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: Partial<DriftThresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // Would need tracking
      misses: 0,
    };
  }

  // Private methods

  private identifyDriftSources(report: ReproducibilityReport): DriftSource[] {
    const sources: DriftSource[] = [];
    const categories = report.differenceAnalysis.categories;

    for (const cat of categories) {
      const source: DriftSource = {
        type: this.mapCategoryToType(cat.category),
        severity: Math.min(cat.count / 10, 1),
        description: this.describeCategory(cat.category),
        examples: cat.examples,
      };
      sources.push(source);
    }

    return sources.sort((a, b) => b.severity - a.severity);
  }

  private mapCategoryToType(category: string): DriftSource["type"] {
    const mapping: Record<string, DriftSource["type"]> = {
      timestamp_variation: "timestamp",
      uuid_variation: "uuid",
      import_order: "order",
      whitespace_variation: "formatting",
      comment_variation: "formatting",
      string_variation: "random",
      variable_naming: "random",
      function_variation: "unknown",
    };
    return mapping[category] || "unknown";
  }

  private describeCategory(category: string): string {
    const descriptions: Record<string, string> = {
      timestamp_variation: "Dynamic timestamps causing output variation",
      uuid_variation: "Generated UUIDs differ between runs",
      import_order: "Import statements in different order",
      whitespace_variation: "Inconsistent whitespace/formatting",
      comment_variation: "Comment content varies",
      string_variation: "String values contain dynamic content",
      variable_naming: "Variable names differ between runs",
      function_variation: "Function implementations vary",
    };
    return descriptions[category] || "Unidentified source of variation";
  }

  private generateRecommendations(sources: DriftSource[]): string[] {
    const recommendations: string[] = [];

    for (const source of sources.slice(0, 3)) {
      switch (source.type) {
        case "timestamp":
          recommendations.push(
            "Mock Date.now() and Date constructors for deterministic timestamps"
          );
          break;
        case "uuid":
          recommendations.push(
            "Use seeded random or mock UUID generation functions"
          );
          break;
        case "random":
          recommendations.push(
            "Seed random number generators for reproducible outputs"
          );
          break;
        case "order":
          recommendations.push(
            "Sort collections before outputting to ensure consistent order"
          );
          break;
        case "formatting":
          recommendations.push(
            "Use consistent code formatting (prettier/black) before comparison"
          );
          break;
        default:
          recommendations.push(
            "Review output generation for sources of non-determinism"
          );
      }
    }

    return [...new Set(recommendations)]; // Dedupe
  }

  private calculateConfidence(
    successfulRuns: number,
    totalRuns: number,
    reproducibilityRate: number
  ): number {
    // Confidence based on:
    // 1. Sample size (more runs = higher confidence)
    // 2. Success rate (more successful runs = higher confidence)
    // 3. Reproducibility consistency

    const sampleConfidence = Math.min(successfulRuns / 10, 1);
    const successConfidence = successfulRuns / totalRuns;
    const consistencyConfidence = reproducibilityRate;

    return (sampleConfidence * 0.3 + successConfidence * 0.3 + consistencyConfidence * 0.4);
  }

  private generateReport(measurements: DriftMeasurement[]): DriftReport {
    const deterministicTasks = measurements
      .filter((m) => m.isDeterministic)
      .map((m) => m.taskId);

    const tasksWithDrift = measurements
      .filter((m) => !m.isDeterministic)
      .map((m) => m.taskId);

    const driftRates = measurements.map((m) => m.driftRate);
    const overallDriftRate =
      driftRates.length > 0
        ? driftRates.reduce((a, b) => a + b, 0) / driftRates.length
        : 0;

    // Find common drift sources
    const sourceTypeCounts = new Map<string, number>();
    for (const m of measurements) {
      for (const source of m.analysis.driftSources) {
        sourceTypeCounts.set(source.type, (sourceTypeCounts.get(source.type) || 0) + 1);
      }
    }
    const commonSources = Array.from(sourceTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    return {
      measurements,
      overallDriftRate,
      tasksWithDrift,
      deterministicTasks,
      generatedAt: new Date(),
      summary: {
        totalTasks: measurements.length,
        deterministicCount: deterministicTasks.length,
        driftingCount: tasksWithDrift.length,
        deterministicRate:
          measurements.length > 0 ? deterministicTasks.length / measurements.length : 0,
        avgDriftRate: overallDriftRate,
        worstDriftRate: driftRates.length > 0 ? Math.max(...driftRates) : 0,
        commonDriftSources: commonSources,
      },
    };
  }

  private getCached(taskId: string): DriftMeasurement | null {
    const cached = this.cache.get(taskId);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cacheTtl) {
      this.cache.delete(taskId);
      return null;
    }

    return cached.measurement;
  }

  private setCache(taskId: string, measurement: DriftMeasurement): void {
    this.cache.set(taskId, { measurement, timestamp: Date.now() });
  }
}

/**
 * Create a drift detector
 */
export function createDriftDetector(
  executor: TaskExecutor,
  config?: Partial<DetectorConfig>
): DriftDetector {
  return new DriftDetector(executor, config);
}
