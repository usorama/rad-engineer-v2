/**
 * TraceAnalyzer - Analyze execution traces for improvement insights
 *
 * Analyzes:
 * - Execution patterns and bottlenecks
 * - Error frequency and root causes
 * - Quality metrics over time
 * - Resource usage patterns
 */

import type { ExecutionContext, ExecutionState } from "../verification/Condition.js";

/**
 * Trace event types
 */
export type TraceEventType =
  | "state_change"
  | "condition_check"
  | "action_start"
  | "action_end"
  | "error"
  | "warning"
  | "metric"
  | "decision";

/**
 * Individual trace event
 */
export interface TraceEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: TraceEventType;
  /** Timestamp */
  timestamp: Date;
  /** Event name/description */
  name: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Duration if applicable (ms) */
  durationMs?: number;
  /** Parent event ID for nesting */
  parentId?: string;
  /** Success indicator */
  success?: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Execution trace - Full record of an execution
 */
export interface ExecutionTrace {
  /** Trace ID */
  id: string;
  /** Task ID being executed */
  taskId: string;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Final state */
  finalState: ExecutionState;
  /** Whether execution succeeded */
  success: boolean;
  /** All events in order */
  events: TraceEvent[];
  /** Context at completion */
  context?: ExecutionContext;
  /** Metrics collected */
  metrics: TraceMetrics;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Aggregated metrics from a trace
 */
export interface TraceMetrics {
  /** Total execution duration (ms) */
  totalDurationMs: number;
  /** Number of state transitions */
  stateTransitions: number;
  /** Number of errors encountered */
  errorCount: number;
  /** Number of retries */
  retryCount: number;
  /** Condition check count */
  conditionChecks: number;
  /** Condition pass rate (0-1) */
  conditionPassRate: number;
  /** Average action duration (ms) */
  avgActionDurationMs: number;
  /** Time spent in each state (ms) */
  stateTimeMs: Record<ExecutionState, number>;
}

/**
 * Pattern detected in traces
 */
export interface TracePattern {
  /** Pattern ID */
  id: string;
  /** Pattern name */
  name: string;
  /** Pattern type */
  type: "bottleneck" | "error_cluster" | "success_pattern" | "inefficiency";
  /** Confidence (0-1) */
  confidence: number;
  /** Description */
  description: string;
  /** Related event types */
  eventTypes: TraceEventType[];
  /** Frequency of occurrence */
  frequency: number;
  /** Recommended action */
  recommendation?: string;
  /** Evidence (event IDs) */
  evidence: string[];
}

/**
 * Analysis result from trace analysis
 */
export interface TraceAnalysisResult {
  /** Analyzed trace ID */
  traceId: string;
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Patterns detected */
  patterns: TracePattern[];
  /** Bottlenecks identified */
  bottlenecks: Bottleneck[];
  /** Root cause analysis for errors */
  rootCauses: RootCause[];
  /** Improvement opportunities */
  improvements: ImprovementOpportunity[];
  /** Quality score (0-100) */
  qualityScore: number;
  /** Efficiency score (0-100) */
  efficiencyScore: number;
}

/**
 * Bottleneck in execution
 */
export interface Bottleneck {
  /** Bottleneck ID */
  id: string;
  /** Location in trace */
  eventId: string;
  /** Type of bottleneck */
  type: "slow_action" | "retry_loop" | "condition_failure" | "resource_wait";
  /** Impact severity (0-100) */
  severity: number;
  /** Duration impact (ms) */
  durationImpactMs: number;
  /** Description */
  description: string;
}

/**
 * Root cause of an error
 */
export interface RootCause {
  /** Root cause ID */
  id: string;
  /** Error event ID */
  errorEventId: string;
  /** Root cause category */
  category: "input_validation" | "state_error" | "external_failure" | "timeout" | "logic_error";
  /** Confidence (0-1) */
  confidence: number;
  /** Description */
  description: string;
  /** Contributing factors */
  factors: string[];
  /** Suggested fix */
  suggestedFix?: string;
}

/**
 * Improvement opportunity
 */
export interface ImprovementOpportunity {
  /** Opportunity ID */
  id: string;
  /** Type of improvement */
  type: "performance" | "reliability" | "quality" | "resource";
  /** Priority (0-100) */
  priority: number;
  /** Description */
  description: string;
  /** Estimated impact */
  estimatedImpact: string;
  /** Implementation effort */
  effort: "low" | "medium" | "high";
}

/**
 * TraceAnalyzer - Analyze execution traces
 *
 * @example
 * ```ts
 * const analyzer = new TraceAnalyzer();
 * const result = await analyzer.analyze(trace);
 *
 * console.log(`Quality: ${result.qualityScore}`);
 * console.log(`Bottlenecks: ${result.bottlenecks.length}`);
 * ```
 */
export class TraceAnalyzer {
  private readonly thresholds: AnalysisThresholds;

  constructor(thresholds?: Partial<AnalysisThresholds>) {
    this.thresholds = {
      slowActionMs: 1000,
      highRetryCount: 3,
      lowConditionPassRate: 0.8,
      minPatternConfidence: 0.6,
      ...thresholds,
    };
  }

  /**
   * Analyze a single execution trace
   */
  async analyze(trace: ExecutionTrace): Promise<TraceAnalysisResult> {
    const patterns = this.detectPatterns(trace);
    const bottlenecks = this.identifyBottlenecks(trace);
    const rootCauses = this.analyzeRootCauses(trace);
    const improvements = this.findImprovements(trace, patterns, bottlenecks);

    const qualityScore = this.calculateQualityScore(trace, patterns, rootCauses);
    const efficiencyScore = this.calculateEfficiencyScore(trace, bottlenecks);

    return {
      traceId: trace.id,
      analyzedAt: new Date(),
      patterns,
      bottlenecks,
      rootCauses,
      improvements,
      qualityScore,
      efficiencyScore,
    };
  }

  /**
   * Analyze multiple traces for aggregate patterns
   */
  async analyzeMultiple(traces: ExecutionTrace[]): Promise<AggregateAnalysis> {
    const results = await Promise.all(traces.map((t) => this.analyze(t)));

    const patternFrequency = new Map<string, number>();
    const allPatterns: TracePattern[] = [];

    for (const result of results) {
      for (const pattern of result.patterns) {
        const count = patternFrequency.get(pattern.name) || 0;
        patternFrequency.set(pattern.name, count + 1);
        allPatterns.push(pattern);
      }
    }

    // Find recurring patterns
    const recurringPatterns = [...patternFrequency.entries()]
      .filter(([, count]) => count >= Math.ceil(traces.length * 0.3))
      .map(([name]) => name);

    const avgQuality = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;
    const avgEfficiency = results.reduce((sum, r) => sum + r.efficiencyScore, 0) / results.length;

    return {
      traceCount: traces.length,
      analyzedAt: new Date(),
      individualResults: results,
      recurringPatterns,
      avgQualityScore: avgQuality,
      avgEfficiencyScore: avgEfficiency,
      successRate: traces.filter((t) => t.success).length / traces.length,
    };
  }

  /**
   * Detect patterns in trace
   */
  private detectPatterns(trace: ExecutionTrace): TracePattern[] {
    const patterns: TracePattern[] = [];

    // Detect retry patterns
    const retryEvents = trace.events.filter(
      (e) => e.type === "state_change" && e.name.includes("retry")
    );
    if (retryEvents.length >= 2) {
      patterns.push({
        id: `pattern-retry-${trace.id}`,
        name: "Retry Loop",
        type: "inefficiency",
        confidence: Math.min(1, retryEvents.length / 5),
        description: `${retryEvents.length} retry attempts detected`,
        eventTypes: ["state_change"],
        frequency: retryEvents.length,
        recommendation: "Investigate root cause of failures to reduce retries",
        evidence: retryEvents.map((e) => e.id),
      });
    }

    // Detect error clusters
    const errorEvents = trace.events.filter((e) => e.type === "error");
    if (errorEvents.length >= 2) {
      patterns.push({
        id: `pattern-error-cluster-${trace.id}`,
        name: "Error Cluster",
        type: "error_cluster",
        confidence: Math.min(1, errorEvents.length / 3),
        description: `${errorEvents.length} errors occurred in sequence`,
        eventTypes: ["error"],
        frequency: errorEvents.length,
        recommendation: "Review error handling and failure recovery",
        evidence: errorEvents.map((e) => e.id),
      });
    }

    // Detect slow actions
    const slowActions = trace.events.filter(
      (e) =>
        e.type === "action_end" &&
        e.durationMs !== undefined &&
        e.durationMs > this.thresholds.slowActionMs
    );
    if (slowActions.length >= 1) {
      patterns.push({
        id: `pattern-slow-${trace.id}`,
        name: "Slow Actions",
        type: "bottleneck",
        confidence: Math.min(1, slowActions.length / 3),
        description: `${slowActions.length} actions exceeded ${this.thresholds.slowActionMs}ms`,
        eventTypes: ["action_end"],
        frequency: slowActions.length,
        recommendation: "Optimize slow actions or add caching",
        evidence: slowActions.map((e) => e.id),
      });
    }

    // Detect success pattern
    if (trace.success && trace.metrics.retryCount === 0) {
      patterns.push({
        id: `pattern-success-${trace.id}`,
        name: "Clean Execution",
        type: "success_pattern",
        confidence: 1,
        description: "Execution completed successfully without retries",
        eventTypes: [],
        frequency: 1,
        evidence: [],
      });
    }

    return patterns.filter((p) => p.confidence >= this.thresholds.minPatternConfidence);
  }

  /**
   * Identify bottlenecks in trace
   */
  private identifyBottlenecks(trace: ExecutionTrace): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Slow actions
    for (const event of trace.events) {
      if (
        event.type === "action_end" &&
        event.durationMs !== undefined &&
        event.durationMs > this.thresholds.slowActionMs
      ) {
        bottlenecks.push({
          id: `bottleneck-slow-${event.id}`,
          eventId: event.id,
          type: "slow_action",
          severity: Math.min(100, Math.floor((event.durationMs / this.thresholds.slowActionMs) * 50)),
          durationImpactMs: event.durationMs - this.thresholds.slowActionMs,
          description: `Action "${event.name}" took ${event.durationMs}ms`,
        });
      }
    }

    // Retry loops
    if (trace.metrics.retryCount >= this.thresholds.highRetryCount) {
      const retryEvents = trace.events.filter(
        (e) => e.type === "state_change" && e.name.includes("retry")
      );
      if (retryEvents.length > 0) {
        bottlenecks.push({
          id: `bottleneck-retry-${trace.id}`,
          eventId: retryEvents[0].id,
          type: "retry_loop",
          severity: Math.min(100, trace.metrics.retryCount * 25),
          durationImpactMs: trace.metrics.retryCount * 500, // Estimate
          description: `${trace.metrics.retryCount} retries indicate persistent issue`,
        });
      }
    }

    // Condition failures
    if (trace.metrics.conditionPassRate < this.thresholds.lowConditionPassRate) {
      const failedConditions = trace.events.filter(
        (e) => e.type === "condition_check" && e.success === false
      );
      if (failedConditions.length > 0) {
        bottlenecks.push({
          id: `bottleneck-condition-${trace.id}`,
          eventId: failedConditions[0].id,
          type: "condition_failure",
          severity: Math.floor((1 - trace.metrics.conditionPassRate) * 100),
          durationImpactMs: 0,
          description: `Only ${(trace.metrics.conditionPassRate * 100).toFixed(1)}% conditions passed`,
        });
      }
    }

    return bottlenecks.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Analyze root causes of errors
   */
  private analyzeRootCauses(trace: ExecutionTrace): RootCause[] {
    const rootCauses: RootCause[] = [];
    const errorEvents = trace.events.filter((e) => e.type === "error");

    for (const errorEvent of errorEvents) {
      const errorMessage = errorEvent.error || errorEvent.name;
      const category = this.categorizeError(errorMessage);
      const factors = this.findContributingFactors(trace, errorEvent);

      rootCauses.push({
        id: `root-cause-${errorEvent.id}`,
        errorEventId: errorEvent.id,
        category,
        confidence: this.calculateRootCauseConfidence(errorEvent, factors),
        description: this.describeRootCause(errorMessage, category),
        factors,
        suggestedFix: this.suggestFix(category, errorMessage),
      });
    }

    return rootCauses;
  }

  /**
   * Find improvement opportunities
   */
  private findImprovements(
    trace: ExecutionTrace,
    patterns: TracePattern[],
    bottlenecks: Bottleneck[]
  ): ImprovementOpportunity[] {
    const improvements: ImprovementOpportunity[] = [];

    // Performance improvements from bottlenecks
    for (const bottleneck of bottlenecks) {
      if (bottleneck.type === "slow_action" && bottleneck.severity > 50) {
        improvements.push({
          id: `improve-perf-${bottleneck.id}`,
          type: "performance",
          priority: bottleneck.severity,
          description: `Optimize: ${bottleneck.description}`,
          estimatedImpact: `Could save ${bottleneck.durationImpactMs}ms per execution`,
          effort: bottleneck.durationImpactMs > 2000 ? "high" : "medium",
        });
      }
    }

    // Reliability improvements from patterns
    const errorPatterns = patterns.filter((p) => p.type === "error_cluster");
    for (const pattern of errorPatterns) {
      improvements.push({
        id: `improve-rel-${pattern.id}`,
        type: "reliability",
        priority: pattern.confidence * 80,
        description: pattern.recommendation || "Improve error handling",
        estimatedImpact: "Reduce error rate and improve stability",
        effort: "medium",
      });
    }

    // Resource improvements from retries
    if (trace.metrics.retryCount > 0) {
      improvements.push({
        id: `improve-res-${trace.id}`,
        type: "resource",
        priority: Math.min(100, trace.metrics.retryCount * 30),
        description: "Reduce retry frequency by fixing root causes",
        estimatedImpact: `Could eliminate ${trace.metrics.retryCount} retries`,
        effort: "high",
      });
    }

    return improvements.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(
    trace: ExecutionTrace,
    patterns: TracePattern[],
    rootCauses: RootCause[]
  ): number {
    let score = 100;

    // Deduct for failure
    if (!trace.success) {
      score -= 30;
    }

    // Deduct for errors
    score -= Math.min(30, trace.metrics.errorCount * 10);

    // Deduct for low condition pass rate
    score -= Math.floor((1 - trace.metrics.conditionPassRate) * 20);

    // Deduct for negative patterns
    const negativePatterns = patterns.filter(
      (p) => p.type === "error_cluster" || p.type === "inefficiency"
    );
    score -= Math.min(20, negativePatterns.length * 5);

    // Deduct for root causes
    score -= Math.min(10, rootCauses.length * 3);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate efficiency score (0-100)
   */
  private calculateEfficiencyScore(trace: ExecutionTrace, bottlenecks: Bottleneck[]): number {
    let score = 100;

    // Deduct for retries
    score -= Math.min(30, trace.metrics.retryCount * 10);

    // Deduct for bottlenecks
    const totalBottleneckSeverity = bottlenecks.reduce((sum, b) => sum + b.severity, 0);
    score -= Math.min(40, totalBottleneckSeverity / 5);

    // Deduct for long duration (relative to expected)
    // Assume expected is avg action * condition checks
    const expectedDuration = trace.metrics.avgActionDurationMs * trace.metrics.conditionChecks;
    if (expectedDuration > 0 && trace.metrics.totalDurationMs > expectedDuration * 2) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Categorize error by message
   */
  private categorizeError(
    errorMessage: string
  ): RootCause["category"] {
    const lower = errorMessage.toLowerCase();

    if (lower.includes("input") || lower.includes("validation") || lower.includes("required")) {
      return "input_validation";
    }
    if (lower.includes("state") || lower.includes("transition") || lower.includes("undefined")) {
      return "state_error";
    }
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return "timeout";
    }
    if (lower.includes("external") || lower.includes("network") || lower.includes("connection")) {
      return "external_failure";
    }
    return "logic_error";
  }

  /**
   * Find contributing factors for an error
   */
  private findContributingFactors(trace: ExecutionTrace, errorEvent: TraceEvent): string[] {
    const factors: string[] = [];
    const errorIndex = trace.events.findIndex((e) => e.id === errorEvent.id);

    // Look at events before the error
    const precedingEvents = trace.events.slice(Math.max(0, errorIndex - 5), errorIndex);

    for (const event of precedingEvents) {
      if (event.type === "condition_check" && event.success === false) {
        factors.push(`Failed condition: ${event.name}`);
      }
      if (event.type === "warning") {
        factors.push(`Warning: ${event.name}`);
      }
      if (event.type === "action_end" && event.success === false) {
        factors.push(`Failed action: ${event.name}`);
      }
    }

    return factors;
  }

  /**
   * Calculate root cause confidence
   */
  private calculateRootCauseConfidence(event: TraceEvent, factors: string[]): number {
    let confidence = 0.5;

    // More factors = higher confidence in analysis
    confidence += Math.min(0.3, factors.length * 0.1);

    // Clear error message = higher confidence
    if (event.error && event.error.length > 10) {
      confidence += 0.2;
    }

    return Math.min(1, confidence);
  }

  /**
   * Describe root cause
   */
  private describeRootCause(
    errorMessage: string,
    category: RootCause["category"]
  ): string {
    switch (category) {
      case "input_validation":
        return `Input validation failed: ${errorMessage}`;
      case "state_error":
        return `Invalid state transition: ${errorMessage}`;
      case "timeout":
        return `Operation timed out: ${errorMessage}`;
      case "external_failure":
        return `External service failure: ${errorMessage}`;
      default:
        return `Logic error: ${errorMessage}`;
    }
  }

  /**
   * Suggest fix for error category
   */
  private suggestFix(
    category: RootCause["category"],
    _errorMessage: string
  ): string {
    switch (category) {
      case "input_validation":
        return "Add input validation before execution and provide clear error messages";
      case "state_error":
        return "Review state machine transitions and add guards for edge cases";
      case "timeout":
        return "Increase timeout limits or optimize slow operations";
      case "external_failure":
        return "Add retry logic and circuit breaker for external calls";
      default:
        return "Review the logic and add more comprehensive error handling";
    }
  }
}

/**
 * Analysis thresholds configuration
 */
interface AnalysisThresholds {
  /** Duration above which action is considered slow (ms) */
  slowActionMs: number;
  /** Retry count above which is considered high */
  highRetryCount: number;
  /** Condition pass rate below which is considered low */
  lowConditionPassRate: number;
  /** Minimum confidence for pattern detection */
  minPatternConfidence: number;
}

/**
 * Aggregate analysis result
 */
export interface AggregateAnalysis {
  /** Number of traces analyzed */
  traceCount: number;
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Individual trace results */
  individualResults: TraceAnalysisResult[];
  /** Patterns that occur across multiple traces */
  recurringPatterns: string[];
  /** Average quality score */
  avgQualityScore: number;
  /** Average efficiency score */
  avgEfficiencyScore: number;
  /** Success rate (0-1) */
  successRate: number;
}

/**
 * Create an empty trace for testing
 */
export function createEmptyTrace(
  taskId: string,
  overrides?: Partial<ExecutionTrace>
): ExecutionTrace {
  return {
    id: `trace-${Date.now()}`,
    taskId,
    startTime: new Date(),
    finalState: "IDLE",
    success: false,
    events: [],
    metrics: {
      totalDurationMs: 0,
      stateTransitions: 0,
      errorCount: 0,
      retryCount: 0,
      conditionChecks: 0,
      conditionPassRate: 1,
      avgActionDurationMs: 0,
      stateTimeMs: {
        IDLE: 0,
        PLANNING: 0,
        EXECUTING: 0,
        VERIFYING: 0,
        COMMITTING: 0,
        COMPLETED: 0,
        FAILED: 0,
      },
    },
    tags: [],
    ...overrides,
  };
}

/**
 * Create a trace event
 */
export function createTraceEvent(
  type: TraceEventType,
  name: string,
  data: Record<string, unknown> = {}
): TraceEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    timestamp: new Date(),
    name,
    data,
  };
}
