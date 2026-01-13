/**
 * Meta-Agent Module - Build-Test-Improve Optimization Loop
 *
 * Provides:
 * - MetaAgentLoop: Main orchestration
 * - TraceAnalyzer: Execution trace analysis
 * - ConfigMutator: Configuration mutation
 * - BenchmarkRunner: Benchmark execution
 * - ImprovementStrategies: Improvement strategies
 */

// TraceAnalyzer exports
export {
  TraceAnalyzer,
  createEmptyTrace,
  createTraceEvent,
  type TraceEventType,
  type TraceEvent,
  type ExecutionTrace,
  type TraceMetrics,
  type TracePattern,
  type TraceAnalysisResult,
  type Bottleneck,
  type RootCause,
  type ImprovementOpportunity,
  type AggregateAnalysis,
} from "./TraceAnalyzer.js";

// ConfigMutator exports
export {
  ConfigMutator,
  createDefaultAgentConfig,
  type AgentConfig,
  type RetryConfig,
  type TimeoutConfig,
  type MutationType,
  type MutationRecord,
  type MutationStrategy,
  type MutationOptions,
} from "./ConfigMutator.js";

// BenchmarkRunner exports
export {
  BenchmarkRunner,
  StandardBenchmarks,
  type BenchmarkTask,
  type BenchmarkCategory,
  type BenchmarkMetric,
  type BenchmarkResult,
  type BenchmarkSuiteResult,
  type AggregateMetric,
  type BenchmarkComparison,
  type TaskComparison,
  type TaskExecutor,
  type BenchmarkRunnerConfig,
} from "./BenchmarkRunner.js";

// ImprovementStrategies exports
export {
  ImprovementStrategies,
  createAction,
  type StrategyType,
  type ImprovementAction,
  type ImprovementContext,
  type LearningRecord,
  type StrategyRecommendation,
  type ImprovementStrategy,
} from "./ImprovementStrategies.js";

// MetaAgentLoop exports
export {
  MetaAgentLoop,
  createMetaTask,
  type MetaTask,
  type AttemptResult,
  type MetaLoopResult,
  type MetaLoopConfig,
} from "./MetaAgentLoop.js";
