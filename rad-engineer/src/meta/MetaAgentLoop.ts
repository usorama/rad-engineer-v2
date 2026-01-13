/**
 * MetaAgentLoop - Build-Test-Improve orchestration
 *
 * Implements the meta-agent optimization loop:
 * 1. BUILD: Execute task with current configuration
 * 2. TEST: Evaluate quality of execution
 * 3. IMPROVE: Apply improvement strategies based on analysis
 *
 * Continues until quality threshold is met or max attempts reached.
 */

import type { ExecutionContext } from "../verification/Condition.js";
import {
  TraceAnalyzer,
  type ExecutionTrace,
  type TraceAnalysisResult,
  createEmptyTrace,
  createTraceEvent,
} from "./TraceAnalyzer.js";
import { ConfigMutator, type AgentConfig, createDefaultAgentConfig } from "./ConfigMutator.js";
import {
  BenchmarkRunner,
  type BenchmarkTask,
  type BenchmarkResult,
  type TaskExecutor,
} from "./BenchmarkRunner.js";
import {
  ImprovementStrategies,
  type ImprovementContext,
  type StrategyRecommendation,
} from "./ImprovementStrategies.js";

/**
 * Task input for meta-agent loop
 */
export interface MetaTask {
  /** Task ID */
  id: string;
  /** Task description */
  description: string;
  /** Input data */
  input: Record<string, unknown>;
  /** Quality threshold (0-100) */
  qualityThreshold: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** Timeout per attempt (ms) */
  attemptTimeoutMs: number;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Result of a single attempt
 */
export interface AttemptResult {
  /** Attempt number (1-based) */
  attemptNumber: number;
  /** Config used */
  config: AgentConfig;
  /** Execution trace */
  trace: ExecutionTrace;
  /** Trace analysis */
  analysis: TraceAnalysisResult;
  /** Quality score achieved */
  qualityScore: number;
  /** Whether quality threshold was met */
  thresholdMet: boolean;
  /** Improvements applied (if any) */
  improvementsApplied?: StrategyRecommendation;
  /** Duration (ms) */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
  /** Error if failed */
  error?: string;
}

/**
 * Final result of meta-agent loop
 */
export interface MetaLoopResult {
  /** Task ID */
  taskId: string;
  /** Whether task succeeded (met threshold) */
  success: boolean;
  /** Final quality score */
  finalQualityScore: number;
  /** Quality threshold */
  qualityThreshold: number;
  /** Number of attempts made */
  attemptsCount: number;
  /** All attempt results */
  attempts: AttemptResult[];
  /** Best attempt */
  bestAttempt: AttemptResult;
  /** Final configuration */
  finalConfig: AgentConfig;
  /** Quality improvement over attempts */
  qualityImprovement: number;
  /** Total duration (ms) */
  totalDurationMs: number;
  /** Learnings extracted */
  learnings: string[];
  /** Timestamp */
  completedAt: Date;
}

/**
 * MetaAgentLoop configuration
 */
export interface MetaLoopConfig {
  /** Initial agent configuration */
  initialConfig?: AgentConfig;
  /** Custom executor */
  executor?: TaskExecutor;
  /** Enable automatic improvements */
  autoImprove?: boolean;
  /** Improvement aggressiveness (0-1) */
  improvementMagnitude?: number;
  /** Enable mutation exploration */
  enableMutations?: boolean;
  /** Number of parallel variants to try */
  variantCount?: number;
  /** Progress callback */
  onProgress?: (attempt: AttemptResult) => void;
  /** Analysis callback */
  onAnalysis?: (analysis: TraceAnalysisResult) => void;
}

/**
 * MetaAgentLoop - Orchestrate Build-Test-Improve cycle
 *
 * @example
 * ```ts
 * const loop = new MetaAgentLoop({
 *   initialConfig: myConfig,
 *   autoImprove: true,
 * });
 *
 * const result = await loop.execute({
 *   id: "task-001",
 *   description: "Implement feature X",
 *   input: { prompt: "..." },
 *   qualityThreshold: 85,
 *   maxAttempts: 5,
 *   attemptTimeoutMs: 60000,
 * });
 *
 * if (result.success) {
 *   console.log("Task completed with quality:", result.finalQualityScore);
 * }
 * ```
 */
export class MetaAgentLoop {
  private readonly config: Required<MetaLoopConfig>;
  private readonly traceAnalyzer: TraceAnalyzer;
  private readonly configMutator: ConfigMutator;
  private readonly improvementStrategies: ImprovementStrategies;
  private readonly defaultExecutor: TaskExecutor;

  constructor(config: MetaLoopConfig = {}) {
    this.config = {
      initialConfig: config.initialConfig || createDefaultAgentConfig("meta-agent"),
      executor: config.executor || this.createDefaultExecutor(),
      autoImprove: config.autoImprove ?? true,
      improvementMagnitude: config.improvementMagnitude ?? 0.3,
      enableMutations: config.enableMutations ?? false,
      variantCount: config.variantCount ?? 1,
      onProgress: config.onProgress || (() => {}),
      onAnalysis: config.onAnalysis || (() => {}),
    };

    this.traceAnalyzer = new TraceAnalyzer();
    this.configMutator = new ConfigMutator();
    this.improvementStrategies = new ImprovementStrategies();
    this.defaultExecutor = this.config.executor;
  }

  /**
   * Execute task with Build-Test-Improve loop
   */
  async execute(task: MetaTask): Promise<MetaLoopResult> {
    const startTime = performance.now();
    const attempts: AttemptResult[] = [];
    let currentConfig = { ...this.config.initialConfig };
    let bestAttempt: AttemptResult | null = null;

    for (let attempt = 1; attempt <= task.maxAttempts; attempt++) {
      // BUILD phase
      const buildResult = await this.build(task, currentConfig);

      // TEST phase
      const testResult = await this.test(task, buildResult.trace);

      const attemptResult: AttemptResult = {
        attemptNumber: attempt,
        config: currentConfig,
        trace: buildResult.trace,
        analysis: testResult.analysis,
        qualityScore: testResult.qualityScore,
        thresholdMet: testResult.qualityScore >= task.qualityThreshold,
        durationMs: buildResult.durationMs,
        timestamp: new Date(),
        error: buildResult.error,
      };

      // Track best attempt
      if (!bestAttempt || attemptResult.qualityScore > bestAttempt.qualityScore) {
        bestAttempt = attemptResult;
      }

      // Notify progress
      this.config.onProgress(attemptResult);
      this.config.onAnalysis(testResult.analysis);

      attempts.push(attemptResult);

      // Check if threshold met
      if (attemptResult.thresholdMet) {
        return this.buildResult(
          task,
          true,
          attempts,
          bestAttempt,
          currentConfig,
          startTime
        );
      }

      // IMPROVE phase (if not last attempt)
      if (attempt < task.maxAttempts && this.config.autoImprove) {
        const improved = await this.improve(
          currentConfig,
          testResult.analysis,
          attempts
        );
        attemptResult.improvementsApplied = improved.recommendation;
        currentConfig = improved.config;
      }
    }

    // Max attempts reached without meeting threshold
    return this.buildResult(
      task,
      false,
      attempts,
      bestAttempt!,
      currentConfig,
      startTime
    );
  }

  /**
   * Execute with multiple configuration variants
   */
  async executeWithVariants(
    task: MetaTask,
    variantCount?: number
  ): Promise<MetaLoopResult[]> {
    const count = variantCount ?? this.config.variantCount;
    const variants: AgentConfig[] = [this.config.initialConfig];

    // Generate variants through mutation
    if (this.config.enableMutations) {
      for (let i = 1; i < count; i++) {
        const mutated = this.configMutator.mutate(this.config.initialConfig, {
          magnitude: this.config.improvementMagnitude,
        });
        variants.push(mutated);
      }
    }

    // Execute all variants
    const results = await Promise.all(
      variants.map(async (config) => {
        const loop = new MetaAgentLoop({
          ...this.config,
          initialConfig: config,
        });
        return loop.execute(task);
      })
    );

    return results.sort((a, b) => b.finalQualityScore - a.finalQualityScore);
  }

  /**
   * BUILD phase - Execute the task
   */
  private async build(
    task: MetaTask,
    config: AgentConfig
  ): Promise<{
    trace: ExecutionTrace;
    durationMs: number;
    error?: string;
  }> {
    const startTime = performance.now();
    const trace = createEmptyTrace(task.id);
    trace.events.push(createTraceEvent("state_change", "Build started", { taskId: task.id }));

    try {
      // Create execution context
      const context = this.createContext(task);

      // Create benchmark task
      const benchmarkTask = this.taskToBenchmark(task);

      // Execute via benchmark runner
      const runner = new BenchmarkRunner(this.defaultExecutor);
      const result = await runner.runTask(benchmarkTask, config, context);

      // Update trace with result
      trace.finalState = result.success ? "COMPLETED" : "FAILED";
      trace.success = result.success;
      trace.endTime = new Date();
      trace.events.push(
        createTraceEvent("state_change", "Build completed", {
          success: result.success,
          qualityScore: result.qualityScore,
        })
      );

      // Copy metrics
      trace.metrics = {
        totalDurationMs: result.executionTimeMs,
        stateTransitions: 2,
        errorCount: result.error ? 1 : 0,
        retryCount: result.metrics.retry_count,
        conditionChecks: 1,
        conditionPassRate: result.metrics.condition_pass_rate || 1,
        avgActionDurationMs: result.executionTimeMs,
        stateTimeMs: {
          IDLE: 0,
          PLANNING: result.executionTimeMs * 0.1,
          EXECUTING: result.executionTimeMs * 0.7,
          VERIFYING: result.executionTimeMs * 0.15,
          COMMITTING: result.executionTimeMs * 0.05,
          COMPLETED: 0,
          FAILED: 0,
        },
      };

      if (result.trace) {
        Object.assign(trace, result.trace);
      }

      return {
        trace,
        durationMs: performance.now() - startTime,
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      trace.finalState = "FAILED";
      trace.success = false;
      trace.endTime = new Date();
      trace.events.push(createTraceEvent("error", "Build failed", { error: errorMsg }));
      trace.metrics.errorCount = 1;

      return {
        trace,
        durationMs: performance.now() - startTime,
        error: errorMsg,
      };
    }
  }

  /**
   * TEST phase - Evaluate quality
   */
  private async test(
    task: MetaTask,
    trace: ExecutionTrace
  ): Promise<{
    analysis: TraceAnalysisResult;
    qualityScore: number;
  }> {
    const analysis = await this.traceAnalyzer.analyze(trace);

    // Quality score is combination of analysis scores
    const qualityScore = Math.round(
      analysis.qualityScore * 0.6 + analysis.efficiencyScore * 0.4
    );

    return {
      analysis,
      qualityScore,
    };
  }

  /**
   * IMPROVE phase - Apply improvements
   */
  private async improve(
    config: AgentConfig,
    analysis: TraceAnalysisResult,
    previousAttempts: AttemptResult[]
  ): Promise<{
    config: AgentConfig;
    recommendation?: StrategyRecommendation;
  }> {
    const context: ImprovementContext = {
      analysis,
      previousConfigs: previousAttempts.map((a) => a.config),
      learnings: this.improvementStrategies.getLearnings(),
    };

    // Get recommendations
    const recommendations = this.improvementStrategies.recommend(analysis, context);

    if (recommendations.length === 0) {
      // No recommendations - try random mutation
      if (this.config.enableMutations) {
        const mutated = this.configMutator.mutate(config, {
          magnitude: this.config.improvementMagnitude,
        });
        return { config: mutated };
      }
      return { config };
    }

    // Apply top recommendation
    const topRecommendation = recommendations[0];
    const improved = this.improvementStrategies.apply(config, topRecommendation, context);

    // Record learning
    this.improvementStrategies.recordLearning({
      insight: `Applied ${topRecommendation.strategy.name} for quality score ${analysis.qualityScore}`,
      source: "meta-loop",
      confidence: topRecommendation.confidence,
      pattern: topRecommendation.strategy.type,
      actionsApplied: topRecommendation.actions.map((a) => a.id),
    });

    return {
      config: improved,
      recommendation: topRecommendation,
    };
  }

  /**
   * Build final result
   */
  private buildResult(
    task: MetaTask,
    success: boolean,
    attempts: AttemptResult[],
    bestAttempt: AttemptResult,
    finalConfig: AgentConfig,
    startTime: number
  ): MetaLoopResult {
    const firstScore = attempts[0]?.qualityScore ?? 0;
    const lastScore = attempts[attempts.length - 1]?.qualityScore ?? 0;
    const improvement = lastScore - firstScore;

    // Extract learnings
    const learnings = this.extractLearnings(attempts);

    return {
      taskId: task.id,
      success,
      finalQualityScore: bestAttempt.qualityScore,
      qualityThreshold: task.qualityThreshold,
      attemptsCount: attempts.length,
      attempts,
      bestAttempt,
      finalConfig,
      qualityImprovement: improvement,
      totalDurationMs: performance.now() - startTime,
      learnings,
      completedAt: new Date(),
    };
  }

  /**
   * Extract learnings from attempts
   */
  private extractLearnings(attempts: AttemptResult[]): string[] {
    const learnings: string[] = [];

    // Track quality progression
    const qualityProgression = attempts.map((a) => a.qualityScore);
    if (qualityProgression.length > 1) {
      const trend =
        qualityProgression[qualityProgression.length - 1] - qualityProgression[0];
      if (trend > 10) {
        learnings.push(`Quality improved by ${trend} points over ${attempts.length} attempts`);
      } else if (trend < -10) {
        learnings.push(`Quality degraded by ${Math.abs(trend)} points - improvements may be counterproductive`);
      }
    }

    // Identify successful improvements
    for (let i = 1; i < attempts.length; i++) {
      const prev = attempts[i - 1];
      const curr = attempts[i];
      if (curr.qualityScore > prev.qualityScore && curr.improvementsApplied) {
        learnings.push(
          `${curr.improvementsApplied.strategy.name} improved quality by ${curr.qualityScore - prev.qualityScore} points`
        );
      }
    }

    // Note patterns from analysis
    const allPatterns = new Set<string>();
    for (const attempt of attempts) {
      for (const pattern of attempt.analysis.patterns) {
        allPatterns.add(pattern.name);
      }
    }
    if (allPatterns.size > 0) {
      learnings.push(`Detected patterns: ${[...allPatterns].join(", ")}`);
    }

    return learnings;
  }

  /**
   * Create execution context from task
   */
  private createContext(task: MetaTask): ExecutionContext {
    return {
      scopeId: `meta-${task.id}`,
      taskId: task.id,
      inputs: task.input,
      state: "IDLE",
      artifacts: new Map(),
      startTime: new Date(),
    };
  }

  /**
   * Convert MetaTask to BenchmarkTask
   */
  private taskToBenchmark(task: MetaTask): BenchmarkTask {
    return {
      id: task.id,
      name: task.description,
      description: task.description,
      category: "correctness",
      difficulty: 3,
      input: task.input,
      metrics: ["success_rate", "output_quality", "execution_time"],
      timeoutMs: task.attemptTimeoutMs,
      tags: task.tags ?? [],
    };
  }

  /**
   * Create default executor
   */
  private createDefaultExecutor(): TaskExecutor {
    return async (task, _config, _context) => {
      // Default executor - simulates execution
      // In real usage, this would be replaced with actual agent execution
      const simulatedSuccess = Math.random() > 0.3;
      const simulatedOutput = simulatedSuccess
        ? { result: "simulated", taskId: task.id }
        : undefined;

      const trace = createEmptyTrace(task.id, {
        success: simulatedSuccess,
        finalState: simulatedSuccess ? "COMPLETED" : "FAILED",
        endTime: new Date(),
      });

      return {
        success: simulatedSuccess,
        output: simulatedOutput,
        trace,
        error: simulatedSuccess ? undefined : "Simulated failure",
      };
    };
  }

  /**
   * Get trace analyzer for external use
   */
  getTraceAnalyzer(): TraceAnalyzer {
    return this.traceAnalyzer;
  }

  /**
   * Get config mutator for external use
   */
  getConfigMutator(): ConfigMutator {
    return this.configMutator;
  }

  /**
   * Get improvement strategies for external use
   */
  getImprovementStrategies(): ImprovementStrategies {
    return this.improvementStrategies;
  }
}

/**
 * Create a simple meta task
 */
export function createMetaTask(
  id: string,
  description: string,
  input: Record<string, unknown>,
  options?: Partial<MetaTask>
): MetaTask {
  return {
    id,
    description,
    input,
    qualityThreshold: options?.qualityThreshold ?? 80,
    maxAttempts: options?.maxAttempts ?? 3,
    attemptTimeoutMs: options?.attemptTimeoutMs ?? 60000,
    tags: options?.tags,
  };
}
