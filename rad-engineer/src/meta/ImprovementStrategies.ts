/**
 * ImprovementStrategies - Strategies for improving agent execution
 *
 * Provides:
 * - Prompt refinement strategies
 * - Task decomposition strategies
 * - Error recovery strategies
 * - Performance optimization strategies
 */

import type { AgentConfig } from "./ConfigMutator.js";
import type {
  ExecutionTrace,
  TraceAnalysisResult,
  ImprovementOpportunity,
  RootCause,
  Bottleneck,
} from "./TraceAnalyzer.js";

/**
 * Improvement strategy types
 */
export type StrategyType =
  | "prompt_refinement"
  | "task_decomposition"
  | "error_recovery"
  | "performance_optimization"
  | "context_enrichment"
  | "validation_enhancement";

/**
 * Improvement action to apply
 */
export interface ImprovementAction {
  /** Action ID */
  id: string;
  /** Strategy type */
  strategyType: StrategyType;
  /** Action description */
  description: string;
  /** Priority (0-100) */
  priority: number;
  /** Estimated impact */
  estimatedImpact: number;
  /** Effort level */
  effort: "low" | "medium" | "high";
  /** Application function */
  apply: (config: AgentConfig, context: ImprovementContext) => AgentConfig;
  /** Rollback function */
  rollback?: (config: AgentConfig) => AgentConfig;
}

/**
 * Context for improvement application
 */
export interface ImprovementContext {
  /** Trace analysis result */
  analysis?: TraceAnalysisResult;
  /** Previous execution trace */
  trace?: ExecutionTrace;
  /** Previous configs tried */
  previousConfigs?: AgentConfig[];
  /** Task-specific data */
  taskData?: Record<string, unknown>;
  /** Learning data */
  learnings?: LearningRecord[];
}

/**
 * Record of a learning from execution
 */
export interface LearningRecord {
  /** Learning ID */
  id: string;
  /** What was learned */
  insight: string;
  /** Source (trace, analysis, etc.) */
  source: string;
  /** Confidence (0-1) */
  confidence: number;
  /** Related pattern */
  pattern?: string;
  /** Applied actions */
  actionsApplied: string[];
  /** Timestamp */
  learnedAt: Date;
}

/**
 * Strategy recommendation
 */
export interface StrategyRecommendation {
  /** Strategy */
  strategy: ImprovementStrategy;
  /** Recommended actions */
  actions: ImprovementAction[];
  /** Overall confidence (0-1) */
  confidence: number;
  /** Reasoning */
  reasoning: string;
}

/**
 * Improvement strategy definition
 */
export interface ImprovementStrategy {
  /** Strategy name */
  name: string;
  /** Strategy type */
  type: StrategyType;
  /** Description */
  description: string;
  /** When to apply this strategy */
  applicableWhen: (analysis: TraceAnalysisResult) => boolean;
  /** Generate actions for this strategy */
  generateActions: (
    analysis: TraceAnalysisResult,
    context: ImprovementContext
  ) => ImprovementAction[];
  /** Priority weight (for selection) */
  weight: number;
}

/**
 * ImprovementStrategies - Orchestrate improvement strategies
 *
 * @example
 * ```ts
 * const strategies = new ImprovementStrategies();
 *
 * // Get recommendations based on analysis
 * const recommendations = strategies.recommend(analysis);
 *
 * // Apply top recommendation
 * const improved = strategies.apply(config, recommendations[0]);
 * ```
 */
export class ImprovementStrategies {
  private readonly strategies: Map<string, ImprovementStrategy>;
  private readonly learnings: LearningRecord[];

  constructor() {
    this.strategies = new Map();
    this.learnings = [];
    this.registerDefaultStrategies();
  }

  /**
   * Get recommendations based on analysis
   */
  recommend(
    analysis: TraceAnalysisResult,
    context: ImprovementContext = {}
  ): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];

    for (const strategy of this.strategies.values()) {
      if (strategy.applicableWhen(analysis)) {
        const actions = strategy.generateActions(analysis, context);
        if (actions.length > 0) {
          const confidence = this.calculateConfidence(analysis, strategy, actions);
          recommendations.push({
            strategy,
            actions,
            confidence,
            reasoning: this.generateReasoning(strategy, analysis, actions),
          });
        }
      }
    }

    return recommendations.sort((a, b) => {
      // Sort by confidence * weight
      const aScore = a.confidence * a.strategy.weight;
      const bScore = b.confidence * b.strategy.weight;
      return bScore - aScore;
    });
  }

  /**
   * Apply improvement actions to config
   */
  apply(
    config: AgentConfig,
    recommendation: StrategyRecommendation,
    context: ImprovementContext = {}
  ): AgentConfig {
    let improved = { ...config };

    for (const action of recommendation.actions) {
      improved = action.apply(improved, context);
    }

    return improved;
  }

  /**
   * Apply specific action to config
   */
  applyAction(
    config: AgentConfig,
    action: ImprovementAction,
    context: ImprovementContext = {}
  ): AgentConfig {
    return action.apply({ ...config }, context);
  }

  /**
   * Record a learning
   */
  recordLearning(learning: Omit<LearningRecord, "id" | "learnedAt">): void {
    this.learnings.push({
      ...learning,
      id: `learning-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      learnedAt: new Date(),
    });
  }

  /**
   * Get learnings for context
   */
  getLearnings(filter?: { pattern?: string; minConfidence?: number }): LearningRecord[] {
    let results = [...this.learnings];

    if (filter?.pattern) {
      results = results.filter((l) => l.pattern === filter.pattern);
    }

    if (filter?.minConfidence !== undefined) {
      const minConf = filter.minConfidence;
      results = results.filter((l) => l.confidence >= minConf);
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Register a custom strategy
   */
  registerStrategy(strategy: ImprovementStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get all strategies
   */
  getStrategies(): ImprovementStrategy[] {
    return [...this.strategies.values()];
  }

  /**
   * Register default improvement strategies
   */
  private registerDefaultStrategies(): void {
    // Prompt Refinement Strategy
    this.registerStrategy({
      name: "Prompt Refinement",
      type: "prompt_refinement",
      description: "Improve system prompt based on execution issues",
      weight: 2,
      applicableWhen: (analysis) =>
        analysis.qualityScore < 80 || analysis.patterns.some((p) => p.type === "error_cluster"),
      generateActions: (analysis, _context) => {
        const actions: ImprovementAction[] = [];

        // Low quality - add quality instructions
        if (analysis.qualityScore < 70) {
          actions.push({
            id: `prompt-quality-${Date.now()}`,
            strategyType: "prompt_refinement",
            description: "Add quality improvement instructions",
            priority: 80,
            estimatedImpact: 15,
            effort: "low",
            apply: (config) => ({
              ...config,
              systemPrompt:
                config.systemPrompt +
                "\n\nQuality Guidelines:\n- Verify all outputs before returning\n- Consider edge cases\n- Provide clear explanations\n- Validate against requirements",
            }),
          });
        }

        // Error patterns - add error handling instructions
        if (analysis.patterns.some((p) => p.type === "error_cluster")) {
          actions.push({
            id: `prompt-error-${Date.now()}`,
            strategyType: "prompt_refinement",
            description: "Add error handling instructions",
            priority: 70,
            estimatedImpact: 10,
            effort: "low",
            apply: (config) => ({
              ...config,
              systemPrompt:
                config.systemPrompt +
                "\n\nError Handling:\n- Check inputs carefully before processing\n- Handle missing or invalid data gracefully\n- Provide informative error messages\n- Attempt recovery when possible",
            }),
          });
        }

        return actions;
      },
    });

    // Task Decomposition Strategy
    this.registerStrategy({
      name: "Task Decomposition",
      type: "task_decomposition",
      description: "Break complex tasks into smaller steps",
      weight: 1.5,
      applicableWhen: (analysis) =>
        analysis.bottlenecks.some((b) => b.type === "slow_action" && b.severity > 60),
      generateActions: (analysis) => {
        const actions: ImprovementAction[] = [];
        const slowBottlenecks = analysis.bottlenecks.filter(
          (b) => b.type === "slow_action" && b.severity > 60
        );

        if (slowBottlenecks.length > 0) {
          actions.push({
            id: `decompose-${Date.now()}`,
            strategyType: "task_decomposition",
            description: "Add step-by-step processing instructions",
            priority: 60,
            estimatedImpact: 20,
            effort: "medium",
            apply: (config) => ({
              ...config,
              systemPrompt:
                config.systemPrompt +
                "\n\nStep-by-Step Processing:\n1. Break the task into smaller steps\n2. Complete each step before moving on\n3. Validate intermediate results\n4. Report progress at each stage\n5. Handle each step's errors independently",
            }),
          });
        }

        return actions;
      },
    });

    // Error Recovery Strategy
    this.registerStrategy({
      name: "Error Recovery",
      type: "error_recovery",
      description: "Improve recovery from errors",
      weight: 2.5,
      applicableWhen: (analysis) => analysis.rootCauses.length > 0 || analysis.efficiencyScore < 60,
      generateActions: (analysis, _context) => {
        const actions: ImprovementAction[] = [];

        // Add recovery instructions based on root causes
        for (const rootCause of analysis.rootCauses) {
          actions.push(this.createRecoveryAction(rootCause));
        }

        // Retry configuration if efficiency is low
        if (analysis.efficiencyScore < 60) {
          actions.push({
            id: `retry-config-${Date.now()}`,
            strategyType: "error_recovery",
            description: "Adjust retry configuration",
            priority: 50,
            estimatedImpact: 15,
            effort: "low",
            apply: (config) => ({
              ...config,
              retry: {
                ...config.retry,
                maxAttempts: Math.min(5, config.retry.maxAttempts + 1),
                initialDelayMs: Math.max(500, config.retry.initialDelayMs - 200),
              },
            }),
          });
        }

        return actions;
      },
    });

    // Performance Optimization Strategy
    this.registerStrategy({
      name: "Performance Optimization",
      type: "performance_optimization",
      description: "Optimize for faster execution",
      weight: 1,
      applicableWhen: (analysis) =>
        analysis.bottlenecks.some((b) => b.durationImpactMs > 1000) ||
        analysis.efficiencyScore < 70,
      generateActions: (analysis) => {
        const actions: ImprovementAction[] = [];

        // Add timeout adjustments for slow operations
        const totalImpact = analysis.bottlenecks.reduce((sum, b) => sum + b.durationImpactMs, 0);
        if (totalImpact > 2000) {
          actions.push({
            id: `timeout-adjust-${Date.now()}`,
            strategyType: "performance_optimization",
            description: "Increase timeouts for slow operations",
            priority: 40,
            estimatedImpact: 10,
            effort: "low",
            apply: (config) => ({
              ...config,
              timeout: {
                ...config.timeout,
                actionMs: config.timeout.actionMs + totalImpact,
                totalMs: config.timeout.totalMs + totalImpact * 2,
              },
            }),
          });
        }

        // Add conciseness instructions
        actions.push({
          id: `concise-${Date.now()}`,
          strategyType: "performance_optimization",
          description: "Add conciseness instructions",
          priority: 30,
          estimatedImpact: 5,
          effort: "low",
          apply: (config) => ({
            ...config,
            systemPrompt:
              config.systemPrompt +
              "\n\nPerformance:\n- Be concise in responses\n- Avoid unnecessary elaboration\n- Focus on essential information\n- Optimize for speed without sacrificing correctness",
          }),
        });

        return actions;
      },
    });

    // Context Enrichment Strategy
    this.registerStrategy({
      name: "Context Enrichment",
      type: "context_enrichment",
      description: "Add more context to improve understanding",
      weight: 1.2,
      applicableWhen: (analysis) =>
        analysis.rootCauses.some(
          (r) => r.category === "input_validation" || r.category === "logic_error"
        ),
      generateActions: (analysis, _context) => {
        const actions: ImprovementAction[] = [];

        const inputErrors = analysis.rootCauses.filter(
          (r) => r.category === "input_validation"
        );
        if (inputErrors.length > 0) {
          actions.push({
            id: `context-input-${Date.now()}`,
            strategyType: "context_enrichment",
            description: "Add input processing guidelines",
            priority: 55,
            estimatedImpact: 12,
            effort: "low",
            apply: (config) => ({
              ...config,
              systemPrompt:
                config.systemPrompt +
                "\n\nInput Processing:\n- Validate all inputs before use\n- Handle missing values with defaults\n- Document assumptions about input format\n- Request clarification if input is ambiguous",
            }),
          });
        }

        return actions;
      },
    });

    // Validation Enhancement Strategy
    this.registerStrategy({
      name: "Validation Enhancement",
      type: "validation_enhancement",
      description: "Add more validation checkpoints",
      weight: 1.8,
      applicableWhen: (analysis) => analysis.patterns.some((p) => p.type === "inefficiency"),
      generateActions: (_analysis, _context) => {
        const actions: ImprovementAction[] = [];

        actions.push({
          id: `validate-${Date.now()}`,
          strategyType: "validation_enhancement",
          description: "Add validation checkpoints",
          priority: 65,
          estimatedImpact: 18,
          effort: "medium",
          apply: (config) => ({
            ...config,
            systemPrompt:
              config.systemPrompt +
              "\n\nValidation Checkpoints:\n- Verify preconditions before each action\n- Check postconditions after each step\n- Validate data transformations\n- Confirm results match expectations\n- Report validation status in output",
          }),
        });

        return actions;
      },
    });
  }

  /**
   * Create recovery action for root cause
   */
  private createRecoveryAction(rootCause: RootCause): ImprovementAction {
    const instructions: Record<RootCause["category"], string> = {
      input_validation:
        "\n\nInput Recovery:\n- Validate inputs before processing\n- Provide default values when appropriate\n- Return clear error messages for invalid inputs",
      state_error:
        "\n\nState Recovery:\n- Check current state before transitions\n- Handle unexpected states gracefully\n- Log state changes for debugging",
      timeout:
        "\n\nTimeout Recovery:\n- Break long operations into chunks\n- Add progress indicators\n- Implement partial result saving",
      external_failure:
        "\n\nExternal Failure Recovery:\n- Implement retry with backoff\n- Cache successful results\n- Provide offline fallbacks when possible",
      logic_error:
        "\n\nLogic Error Recovery:\n- Add assertions for invariants\n- Validate intermediate results\n- Include debug information in errors",
    };

    return {
      id: `recovery-${rootCause.id}`,
      strategyType: "error_recovery",
      description: `Add recovery instructions for ${rootCause.category}`,
      priority: 75,
      estimatedImpact: 15,
      effort: "low",
      apply: (config) => ({
        ...config,
        systemPrompt: config.systemPrompt + instructions[rootCause.category],
      }),
    };
  }

  /**
   * Calculate confidence for recommendation
   */
  private calculateConfidence(
    analysis: TraceAnalysisResult,
    strategy: ImprovementStrategy,
    actions: ImprovementAction[]
  ): number {
    let confidence = 0.5;

    // More actions = higher confidence in applicability
    confidence += Math.min(0.2, actions.length * 0.05);

    // Higher priority actions = higher confidence
    const avgPriority = actions.reduce((sum, a) => sum + a.priority, 0) / actions.length;
    confidence += (avgPriority / 100) * 0.2;

    // Lower quality/efficiency = higher confidence that improvement is needed
    if (analysis.qualityScore < 50 || analysis.efficiencyScore < 50) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(
    strategy: ImprovementStrategy,
    analysis: TraceAnalysisResult,
    actions: ImprovementAction[]
  ): string {
    const parts: string[] = [
      `Strategy "${strategy.name}" is applicable because:`,
    ];

    if (analysis.qualityScore < 80) {
      parts.push(`- Quality score is ${analysis.qualityScore} (below 80)`);
    }

    if (analysis.efficiencyScore < 70) {
      parts.push(`- Efficiency score is ${analysis.efficiencyScore} (below 70)`);
    }

    if (analysis.rootCauses.length > 0) {
      parts.push(`- ${analysis.rootCauses.length} root cause(s) identified`);
    }

    if (analysis.bottlenecks.length > 0) {
      parts.push(`- ${analysis.bottlenecks.length} bottleneck(s) found`);
    }

    parts.push(`\nRecommended actions (${actions.length}):`);
    for (const action of actions.slice(0, 3)) {
      parts.push(`- ${action.description} (priority: ${action.priority})`);
    }

    return parts.join("\n");
  }
}

/**
 * Create a simple improvement action
 */
export function createAction(
  type: StrategyType,
  description: string,
  applyFn: (config: AgentConfig) => AgentConfig,
  options?: Partial<ImprovementAction>
): ImprovementAction {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    strategyType: type,
    description,
    priority: options?.priority ?? 50,
    estimatedImpact: options?.estimatedImpact ?? 10,
    effort: options?.effort ?? "medium",
    apply: (config) => applyFn(config),
    rollback: options?.rollback,
  };
}
