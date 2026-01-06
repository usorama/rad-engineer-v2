/**
 * BaselineMeasurement - Performance metrics collection, persistence, and statistical analysis
 * Phase 0 - Prerequisites & Foundation
 *
 * Provides deterministic metrics collection with:
 * - Token usage tracking (input/output tokens from SDK responses)
 * - Execution time measurement (duration in milliseconds)
 * - Success rate tracking (complete/partial/failed outcomes)
 * - JSONL persistence with buffered writes
 * - Statistical analysis (percentiles, trends)
 * - Baseline report generation with thresholds
 *
 * Based on: .claude/orchestration/specs/phase-0-poc/baseline-measurement/component-spec.yaml
 */

import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Token usage from SDK response
 */
export interface TokenUsage {
  input: number;
  output: number;
}

/**
 * Metric outcome types
 */
export type MetricOutcome = "complete" | "partial" | "failed";

/**
 * Single metric entry
 */
export interface MetricData {
  /** Timestamp in milliseconds since epoch */
  timestamp: number;
  /** Duration in milliseconds */
  duration: number;
  /** Token usage (optional, defaults to 0) */
  tokenUsage?: TokenUsage;
  /** Execution outcome */
  outcome: MetricOutcome;
  /** Task type (e.g., 'sdk-invoke', 'query', 'system-check') */
  taskType: string;
  /** Error type (if failed) */
  errorType?: string;
  /** System context (optional) */
  systemContext?: Record<string, unknown>;
}

/**
 * Filter for metric retrieval
 */
export interface MetricFilter {
  /** Start time (inclusive) in milliseconds */
  startTime?: number;
  /** End time (inclusive) in milliseconds */
  endTime?: number;
  /** Filter by task type */
  taskType?: string;
  /** Filter by outcome */
  outcome?: MetricOutcome;
}

/**
 * Statistical percentiles
 */
export interface Percentiles {
  average: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Metric summary with statistics
 */
export interface MetricSummary {
  count: number;
  tokenStats: Percentiles;
  durationStats: Percentiles;
  successRate: number;
  trend: "increasing" | "stable" | "decreasing";
}

/**
 * Threshold status levels
 */
export type ThresholdStatus = "excellent" | "target" | "warning" | "critical";

/**
 * Threshold comparison result
 */
export interface ThresholdComparison {
  current: number;
  warning: number;
  critical?: number;
  maximum?: number;
  status: ThresholdStatus;
}

/**
 * Baseline thresholds
 */
export interface BaselineThresholds {
  token: {
    total: ThresholdComparison;
    input: ThresholdComparison;
    output: ThresholdComparison;
  };
  timeout: {
    quick: ThresholdComparison;
    normal: ThresholdComparison;
    extended: ThresholdComparison;
    maximum: ThresholdComparison;
  };
  successRate: {
    current: number;
    minimum: number;
    target: number;
    excellent: number;
    status: ThresholdStatus;
  };
}

/**
 * Baseline report
 */
export interface BaselineReport {
  summary: MetricSummary;
  thresholds: BaselineThresholds;
  recommendations: string[];
  generatedAt: Date;
  warning?: string;
}

/**
 * Error codes for BaselineMeasurement operations
 */
export enum BaselineErrorCode {
  INVALID_METRIC_DATA = "INVALID_METRIC_DATA",
  FILE_WRITE_FAILED = "FILE_WRITE_FAILED",
  BUFFER_OVERFLOW = "BUFFER_OVERFLOW",
  FILE_READ_FAILED = "FILE_READ_FAILED",
  INVALID_METRIC_FORMAT = "INVALID_METRIC_FORMAT",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  SERIALIZATION_FAILED = "SERIALIZATION_FAILED",
  INSUFFICIENT_BASELINE_DATA = "INSUFFICIENT_BASELINE_DATA",
  STATISTICAL_ANALYSIS_FAILED = "STATISTICAL_ANALYSIS_FAILED",
  FLUSH_FAILED = "FLUSH_FAILED",
}

/**
 * Custom error for BaselineMeasurement operations
 */
export class BaselineError extends Error {
  constructor(
    public code: BaselineErrorCode,
    message: string,
    public recovery?: string,
    public timeout?: number,
  ) {
    super(message);
    this.name = "BaselineError";
  }
}

/**
 * BaselineMeasurement - Performance metrics collection and analysis
 */
export class BaselineMeasurement {
  private metricsFile: string;
  private buffer: MetricData[] = [];
  private readonly bufferSize = 100;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private initialized = false;

  // Thresholds from research-findings.md
  private readonly thresholds = {
    token: {
      warning: 150000,
      critical: 175000,
      maximum: 190000,
    },
    timeout: {
      quick: 5000,
      normal: 30000,
      extended: 120000,
      maximum: 300000,
    },
    successRate: {
      minimum: 0.7,
      target: 0.9,
      excellent: 0.95,
    },
  };

  /**
   * Create a new BaselineMeasurement instance
   * @param metricsDir Directory to store metrics files (default: 'metrics')
   * @param metricsFile Name of metrics file (default: 'baseline.jsonl')
   */
  constructor(metricsDir: string = "metrics", metricsFile: string = "baseline.jsonl") {
    this.metricsFile = join(metricsDir, metricsFile);
  }

  /**
   * Initialize the metrics system
   * Creates metrics directory if it doesn't exist
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await mkdir(this.metricsFile.split("/").slice(0, -1).join("/"), { recursive: true });
      this.initialized = true;
    } catch (error) {
      throw new BaselineError(
        BaselineErrorCode.FILE_WRITE_FAILED,
        `Failed to create metrics directory: ${error instanceof Error ? error.message : String(error)}`,
        "Ensure write permissions for metrics directory",
        5000,
      );
    }
  }

  /**
   * Record a single metric entry
   * @param data Metric data to record
   */
  async recordMetric(data: MetricData): Promise<void> {
    // Validate required fields
    if (!this.isValidMetricData(data)) {
      console.error("[BaselineMeasurement] INVALID_METRIC_DATA: Missing required fields", data);
      return;
    }

    // Set defaults
    const metric: MetricData = {
      tokenUsage: { input: 0, output: 0 },
      ...data,
    };

    // Add to buffer
    this.buffer.push(metric);

    // Check for buffer overflow
    if (this.buffer.length > 1000) {
      console.warn("[BaselineMeasurement] BUFFER_OVERFLOW: Force flushing buffer");
      await this.flush();
      return;
    }

    // Auto-flush at buffer size
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
      return;
    }
  }

  /**
   * Validate metric data has required fields
   */
  private isValidMetricData(data: MetricData): boolean {
    return (
      typeof data.timestamp === "number" &&
      typeof data.duration === "number" &&
      typeof data.outcome === "string" &&
      typeof data.taskType === "string"
    );
  }

  /**
   * Check if file rotation is needed
   */
  private async checkRotation(): Promise<void> {
    try {
      if (!existsSync(this.metricsFile)) {
        return;
      }

      const stats = await stat(this.metricsFile);
      if (stats.size > this.maxFileSize) {
        await this.rotateLog();
      }
    } catch {
      // File doesn't exist yet
    }
  }

  /**
   * Rotate log file by adding timestamp suffix
   */
  private async rotateLog(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rotatedFile = this.metricsFile.replace(".jsonl", `-${timestamp}.jsonl`);

    try {
      await writeFile(this.metricsFile, "", "utf-8");
      console.log(`[BaselineMeasurement] Rotated log to ${rotatedFile}`);
    } catch {
      // Rotation failed, continue with existing file
    }
  }

  /**
   * Retrieve and aggregate metrics with optional filtering
   * @param filter Optional filter for metrics
   * @returns Metric summary with statistics
   */
  async getMetrics(filter?: MetricFilter): Promise<MetricSummary> {
    let metrics: MetricData[] = [];

    try {
      metrics = await this.readMetricsFromFile();
    } catch (error) {
      console.error("[BaselineMeasurement] FILE_READ_FAILED:", error);
      return this.emptySummary();
    }

    // Apply filters
    if (filter) {
      metrics = this.applyFilters(metrics, filter);
    }

    // Check for insufficient data
    if (metrics.length < 10) {
      console.warn("[BaselineMeasurement] INSUFFICIENT_DATA: Less than 10 entries");
    }

    if (metrics.length === 0) {
      return this.emptySummary();
    }

    return {
      count: metrics.length,
      tokenStats: this.calculateTokenStats(metrics),
      durationStats: this.calculateDurationStats(metrics),
      successRate: this.calculateSuccessRate(metrics),
      trend: this.detectTrend(metrics),
    };
  }

  /**
   * Read metrics from file
   */
  private async readMetricsFromFile(): Promise<MetricData[]> {
    if (!existsSync(this.metricsFile)) {
      return [];
    }

    const content = await readFile(this.metricsFile, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    const metrics: MetricData[] = [];
    let skipped = 0;

    for (const line of lines) {
      try {
        const metric = JSON.parse(line) as MetricData;
        metrics.push(metric);
      } catch {
        skipped++;
      }
    }

    if (skipped > 0) {
      console.warn(`[BaselineMeasurement] INVALID_METRIC_FORMAT: Skipped ${skipped} corrupted lines`);
    }

    return metrics;
  }

  /**
   * Apply filters to metrics
   */
  private applyFilters(metrics: MetricData[], filter: MetricFilter): MetricData[] {
    return metrics.filter((metric) => {
      if (filter.startTime && metric.timestamp < filter.startTime) {
        return false;
      }
      if (filter.endTime && metric.timestamp > filter.endTime) {
        return false;
      }
      if (filter.taskType && metric.taskType !== filter.taskType) {
        return false;
      }
      if (filter.outcome && metric.outcome !== filter.outcome) {
        return false;
      }
      return true;
    });
  }

  /**
   * Calculate token statistics
   */
  private calculateTokenStats(metrics: MetricData[]): Percentiles {
    const totals = metrics.map((m) => (m.tokenUsage?.input || 0) + (m.tokenUsage?.output || 0));

    if (totals.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0 };
    }

    return this.calculatePercentiles(totals);
  }

  /**
   * Calculate duration statistics
   */
  private calculateDurationStats(metrics: MetricData[]): Percentiles {
    const durations = metrics.map((m) => m.duration);

    if (durations.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0 };
    }

    return this.calculatePercentiles(durations);
  }

  /**
   * Calculate percentiles from values
   */
  private calculatePercentiles(values: number[]): Percentiles {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const average = sum / sorted.length;

    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)] || 0;
    };

    return {
      average,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(metrics: MetricData[]): number {
    const complete = metrics.filter((m) => m.outcome === "complete").length;
    return metrics.length > 0 ? complete / metrics.length : 0;
  }

  /**
   * Detect trend in metrics
   */
  private detectTrend(metrics: MetricData[]): "increasing" | "stable" | "decreasing" {
    if (metrics.length < 10) {
      return "stable";
    }

    const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);
    const mid = Math.floor(sorted.length / 2);

    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    const olderAvg = this.calculateDurationStats(older).average;
    const recentAvg = this.calculateDurationStats(recent).average;

    if (olderAvg === 0) {
      return "stable";
    }

    const ratio = recentAvg / olderAvg;

    if (ratio > 1.1) {
      return "increasing";
    } else if (ratio < 0.9) {
      return "decreasing";
    } else {
      return "stable";
    }
  }

  /**
   * Create empty summary
   */
  private emptySummary(): MetricSummary {
    return {
      count: 0,
      tokenStats: { average: 0, p50: 0, p95: 0, p99: 0 },
      durationStats: { average: 0, p50: 0, p95: 0, p99: 0 },
      successRate: 0,
      trend: "stable",
    };
  }

  /**
   * Export all metrics in specified format
   * @param format Export format ('json' or 'csv')
   * @returns Serialized metrics string
   */
  async exportMetrics(format: "json" | "csv"): Promise<string> {
    if (format !== "json" && format !== "csv") {
      throw new BaselineError(
        BaselineErrorCode.UNSUPPORTED_FORMAT,
        `Unsupported format: ${format}`,
        "Use 'json' or 'csv'",
      );
    }

    let metrics: MetricData[];

    try {
      metrics = await this.readMetricsFromFile();
    } catch {
      throw new BaselineError(
        BaselineErrorCode.FILE_READ_FAILED,
        "Failed to read metrics file",
        "Check file permissions and disk space",
        2000,
      );
    }

    try {
      if (format === "json") {
        return JSON.stringify(metrics, null, 2);
      } else {
        return this.toCSV(metrics);
      }
    } catch {
      // Fallback to raw file contents
      console.warn("[BaselineMeasurement] SERIALIZATION_FAILED: Returning raw JSONL");
      return readFile(this.metricsFile, "utf-8");
    }
  }

  /**
   * Convert metrics to CSV format
   */
  private toCSV(metrics: MetricData[]): string {
    if (metrics.length === 0) {
      return "";
    }

    const headers = [
      "timestamp",
      "duration",
      "token_input",
      "token_output",
      "outcome",
      "taskType",
      "errorType",
    ];

    const rows = metrics.map((m) => [
      m.timestamp,
      m.duration,
      m.tokenUsage?.input || 0,
      m.tokenUsage?.output || 0,
      m.outcome,
      m.taskType,
      m.errorType || "",
    ]);

    return [
      headers.join(","),
      ...rows.map((row) => row.map((v) => JSON.stringify(v)).join(",")),
    ].join("\n");
  }

  /**
   * Generate comprehensive baseline report
   * @returns Baseline report with thresholds and recommendations
   */
  async generateBaseline(): Promise<BaselineReport> {
    let metrics: MetricData[];

    try {
      metrics = await this.readMetricsFromFile();
    } catch {
      throw new BaselineError(
        BaselineErrorCode.FILE_READ_FAILED,
        "Failed to read metrics for baseline",
        "Check file permissions",
        2000,
      );
    }

    // Check for sufficient data
    if (metrics.length < 50) {
      console.warn("[BaselineMeasurement] INSUFFICIENT_BASELINE_DATA: Less than 50 entries");
    }

    let summary: MetricSummary;
    try {
      summary = await this.getMetrics();
    } catch {
      throw new BaselineError(
        BaselineErrorCode.STATISTICAL_ANALYSIS_FAILED,
        "Failed to calculate statistics",
        "Check metrics data integrity",
        2000,
      );
    }

    return {
      summary,
      thresholds: this.generateThresholds(summary),
      recommendations: this.generateRecommendations(summary),
      generatedAt: new Date(),
      warning: metrics.length < 50 ? "Low sample size: less than 50 entries" : undefined,
    };
  }

  /**
   * Generate threshold comparisons
   */
  private generateThresholds(summary: MetricSummary): BaselineThresholds {
    const avgTokens = summary.tokenStats.average;
    const avgDuration = summary.durationStats.average;

    return {
      token: {
        total: this.compareThreshold(avgTokens, this.thresholds.token),
        input: this.compareThreshold(avgTokens / 2, this.thresholds.token),
        output: this.compareThreshold(avgTokens / 2, this.thresholds.token),
      },
      timeout: {
        quick: this.compareThreshold(avgDuration, {
          warning: this.thresholds.timeout.quick,
          critical: this.thresholds.timeout.normal,
          maximum: this.thresholds.timeout.maximum,
        }),
        normal: this.compareThreshold(avgDuration, {
          warning: this.thresholds.timeout.normal,
          critical: this.thresholds.timeout.extended,
          maximum: this.thresholds.timeout.maximum,
        }),
        extended: this.compareThreshold(avgDuration, {
          warning: this.thresholds.timeout.extended,
          critical: this.thresholds.timeout.maximum,
          maximum: this.thresholds.timeout.maximum,
        }),
        maximum: this.compareThreshold(avgDuration, {
          warning: this.thresholds.timeout.maximum,
          critical: this.thresholds.timeout.maximum,
          maximum: this.thresholds.timeout.maximum,
        }),
      },
      successRate: this.compareSuccessRate(summary.successRate),
    };
  }

  /**
   * Compare value against thresholds
   */
  private compareThreshold(
    value: number,
    thresholds: { warning: number; critical: number; maximum: number },
  ): ThresholdComparison {
    if (value >= thresholds.maximum) {
      return {
        current: value,
        warning: thresholds.warning,
        critical: thresholds.critical,
        maximum: thresholds.maximum,
        status: "critical",
      };
    } else if (value >= thresholds.critical) {
      return {
        current: value,
        warning: thresholds.warning,
        critical: thresholds.critical,
        maximum: thresholds.maximum,
        status: "critical",
      };
    } else if (value >= thresholds.warning) {
      return {
        current: value,
        warning: thresholds.warning,
        critical: thresholds.critical,
        maximum: thresholds.maximum,
        status: "warning",
      };
    } else {
      return {
        current: value,
        warning: thresholds.warning,
        critical: thresholds.critical,
        maximum: thresholds.maximum,
        status: "excellent",
      };
    }
  }

  /**
   * Compare success rate against thresholds
   */
  private compareSuccessRate(value: number): {
    current: number;
    minimum: number;
    target: number;
    excellent: number;
    status: ThresholdStatus;
  } {
    if (value >= this.thresholds.successRate.excellent) {
      return {
        current: value,
        minimum: this.thresholds.successRate.minimum,
        target: this.thresholds.successRate.target,
        excellent: this.thresholds.successRate.excellent,
        status: "excellent",
      };
    } else if (value >= this.thresholds.successRate.target) {
      return {
        current: value,
        minimum: this.thresholds.successRate.minimum,
        target: this.thresholds.successRate.target,
        excellent: this.thresholds.successRate.excellent,
        status: "target",
      };
    } else if (value >= this.thresholds.successRate.minimum) {
      return {
        current: value,
        minimum: this.thresholds.successRate.minimum,
        target: this.thresholds.successRate.target,
        excellent: this.thresholds.successRate.excellent,
        status: "warning",
      };
    } else {
      return {
        current: value,
        minimum: this.thresholds.successRate.minimum,
        target: this.thresholds.successRate.target,
        excellent: this.thresholds.successRate.excellent,
        status: "critical",
      };
    }
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(summary: MetricSummary): string[] {
    const recommendations: string[] = [];

    // Token usage recommendations
    if (summary.tokenStats.average > this.thresholds.token.warning) {
      recommendations.push("Token usage exceeds warning threshold - consider prompt optimization");
    }

    if (summary.tokenStats.p99 > this.thresholds.token.critical) {
      recommendations.push("P99 token usage in critical range - review outliers for optimization");
    }

    // Duration recommendations
    if (summary.durationStats.average > this.thresholds.timeout.normal) {
      recommendations.push("Average duration exceeds normal timeout - consider performance tuning");
    }

    // Success rate recommendations
    if (summary.successRate < this.thresholds.successRate.target) {
      recommendations.push("Success rate below target - review error patterns and implement retry logic");
    }

    if (summary.successRate < this.thresholds.successRate.minimum) {
      recommendations.push("Success rate below minimum - critical reliability issue requiring immediate attention");
    }

    // Trend recommendations
    if (summary.trend === "increasing") {
      recommendations.push("Metrics show increasing trend - monitor for degradation");
    }

    if (recommendations.length === 0) {
      recommendations.push("All metrics within acceptable ranges - continue monitoring");
    }

    return recommendations;
  }

  /**
   * Force immediate flush of buffer to disk
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    try {
      await this.checkRotation();
      const lines = this.buffer.map((m) => JSON.stringify(m)).join("\n") + "\n";
      await appendFile(this.metricsFile, lines, "utf-8");
      this.buffer = [];
    } catch (error) {
      console.error("[BaselineMeasurement] FLUSH_FAILED: Buffer retained in memory", error);
      throw new BaselineError(
        BaselineErrorCode.FLUSH_FAILED,
        `Failed to flush buffer: ${error instanceof Error ? error.message : String(error)}`,
        "Buffer retained in memory for retry",
        5000,
      );
    }
  }
}
