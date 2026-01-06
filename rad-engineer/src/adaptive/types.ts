/**
 * Self-Learning EVALS System - Core Type Definitions
 *
 * Deterministic, repeatable, reproducible types for intelligent LLM/SLM routing
 */

/**
 * Query features extracted for routing decisions
 * All features are deterministic (no ML, no probabilistic classification)
 */
export interface QueryFeatures {
  // Structural features (deterministic)
  tokenCount: number;
  lineCount: number;
  maxDepth: number;
  hasCodeBlock: boolean;
  hasMath: boolean;

  // Domain classification (deterministic keyword matching)
  domain: Domain;

  // Complexity score (deterministic calculation)
  complexityScore: number; // 0-1

  // User requirements (from explicit hints)
  maxCost?: number;
  minQuality?: number;
  maxLatency?: number;
}

/**
 * Domain classification (deterministic via keyword matching)
 */
export type Domain =
  | "code"
  | "creative"
  | "reasoning"
  | "analysis"
  | "general";

/**
 * Routing decision output
 */
export interface RoutingDecision {
  provider: string;
  model: string;
  confidence: number; // 0-1
  reason: string;
  exploration: boolean; // true if this was an exploration decision
}

/**
 * Provider performance statistics
 */
export interface ProviderStats {
  provider: string;
  model: string;
  domain: Domain;
  complexityRange: [number, number]; // [min, max]

  // Success metrics (Beta distribution parameters)
  success: number; // α parameter
  failure: number; // β parameter

  // Confidence interval
  mean: number;
  variance: number;
  confidenceInterval: [number, number]; // 95% CI

  // Cost/quality/latency tracking
  avgCost: number;
  avgLatency: number;
  avgQuality: number; // 0-1

  // EWC: Importance weights for continual learning
  importanceWeights: number[]; // One per feature

  // Metadata
  lastUpdated: number; // timestamp
}

/**
 * Performance store version (immutable snapshot)
 */
export interface PerformanceStoreVersion {
  version: string; // ISO timestamp or sequential ID
  timestamp: number;
  stats: ProviderStats[];
  checksum: string; // For verification
}

/**
 * Performance store configuration
 */
export interface PerformanceStoreConfig {
  versionsToKeep: number;
  autoSave: boolean;
  savePath: string;
}

/**
 * Quality metrics from evaluation
 */
export interface QualityMetrics {
  answerRelevancy: number; // 0-1
  faithfulness: number; // 0-1
  contextualPrecision: number; // 0-1
  contextualRecall: number; // 0-1
  overall: number; // 0-1 weighted average
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  query: string;
  response: string;
  provider: string;
  model: string;
  metrics: QualityMetrics;
  cost: number;
  latency: number;
  timestamp: number;
}

/**
 * EVALS system configuration
 */
export interface EvalConfig {
  enabled: boolean;
  explorationRate: number; // 0-1, default 0.10
  qualityThreshold: number; // 0-1, default 0.7

  // Catastrophic forgetting prevention
  ewc: {
    enabled: boolean;
    lambda: number; // Regularization strength
  };

  // State persistence
  state: {
    path: string;
    autoSave: boolean;
    versionsToKeep: number;
  };

  // Evaluation config
  evaluation: {
    timeout: number; // ms
    useLocalModel: boolean;
    localModel: string;
  };
}

/**
 * Context bucket for bandit routing
 */
export interface ContextBucket {
  domain: Domain;
  complexityRange: [number, number]; // [min, max]
}

/**
 * Candidate provider for routing
 */
export interface RoutingCandidate {
  provider: string;
  model: string;
  stats: ProviderStats;
}
