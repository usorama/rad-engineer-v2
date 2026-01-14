/**
 * ConfigMutator - Mutate agent configurations for optimization
 *
 * Provides genetic-algorithm-inspired mutation strategies:
 * - Prompt refinement
 * - Parameter adjustment
 * - Strategy variation
 * - Configuration crossover
 */

/**
 * Agent configuration that can be mutated
 */
export interface AgentConfig {
  /** Configuration ID */
  id: string;
  /** Agent name */
  name: string;
  /** System prompt */
  systemPrompt: string;
  /** Temperature (0-1) */
  temperature: number;
  /** Max tokens */
  maxTokens: number;
  /** Top P sampling */
  topP: number;
  /** Retry settings */
  retry: RetryConfig;
  /** Timeout settings (ms) */
  timeout: TimeoutConfig;
  /** Custom parameters */
  parameters: Record<string, unknown>;
  /** Configuration version */
  version: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Parent configuration ID (if mutated) */
  parentId?: string;
  /** Mutation applied */
  mutation?: MutationRecord;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Max retry attempts */
  maxAttempts: number;
  /** Initial delay (ms) */
  initialDelayMs: number;
  /** Max delay (ms) */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Request timeout (ms) */
  requestMs: number;
  /** Total execution timeout (ms) */
  totalMs: number;
  /** Per-action timeout (ms) */
  actionMs: number;
}

/**
 * Mutation types
 */
export type MutationType =
  | "prompt_refine"
  | "temperature_adjust"
  | "token_adjust"
  | "retry_adjust"
  | "timeout_adjust"
  | "parameter_tweak"
  | "crossover";

/**
 * Record of a mutation applied
 */
export interface MutationRecord {
  /** Mutation ID */
  id: string;
  /** Type of mutation */
  type: MutationType;
  /** Mutation description */
  description: string;
  /** Fields changed */
  fieldsChanged: string[];
  /** Magnitude of change (0-1) */
  magnitude: number;
  /** Timestamp */
  appliedAt: Date;
}

/**
 * Mutation strategy definition
 */
export interface MutationStrategy {
  /** Strategy name */
  name: string;
  /** Mutation type */
  type: MutationType;
  /** Weight for random selection */
  weight: number;
  /** Apply mutation to config */
  apply: (config: AgentConfig, magnitude: number) => AgentConfig;
  /** Description generator */
  describe: (magnitude: number) => string;
}

/**
 * Mutation options
 */
export interface MutationOptions {
  /** Mutation magnitude (0-1, default 0.2) */
  magnitude?: number;
  /** Specific mutation type to apply */
  mutationType?: MutationType;
  /** Random seed for reproducibility */
  seed?: number;
  /** Preserve certain fields */
  preserve?: string[];
}

/**
 * ConfigMutator - Apply mutations to agent configurations
 *
 * @example
 * ```ts
 * const mutator = new ConfigMutator();
 *
 * // Random mutation
 * const mutated = mutator.mutate(config);
 *
 * // Specific mutation
 * const adjusted = mutator.mutate(config, {
 *   mutationType: "temperature_adjust",
 *   magnitude: 0.3,
 * });
 *
 * // Crossover two configs
 * const offspring = mutator.crossover(config1, config2);
 * ```
 */
export class ConfigMutator {
  private readonly strategies: Map<MutationType, MutationStrategy>;
  private readonly defaultMagnitude = 0.2;
  private randomSeed: number;

  constructor() {
    this.strategies = new Map();
    this.randomSeed = Date.now();
    this.registerDefaultStrategies();
  }

  /**
   * Mutate a configuration
   */
  mutate(config: AgentConfig, options: MutationOptions = {}): AgentConfig {
    const magnitude = options.magnitude ?? this.defaultMagnitude;
    const strategy = options.mutationType
      ? this.strategies.get(options.mutationType)
      : this.selectRandomStrategy();

    if (!strategy) {
      throw new Error(`Unknown mutation type: ${options.mutationType}`);
    }

    if (options.seed !== undefined) {
      this.randomSeed = options.seed;
    }

    const mutated = strategy.apply({ ...config }, magnitude);

    // Apply mutation record
    mutated.id = `config-${Date.now()}-${this.random().toString(36).slice(2, 9)}`;
    mutated.version = config.version + 1;
    mutated.parentId = config.id;
    mutated.createdAt = new Date();
    mutated.mutation = {
      id: `mutation-${Date.now()}`,
      type: strategy.type,
      description: strategy.describe(magnitude),
      fieldsChanged: this.getChangedFields(config, mutated),
      magnitude,
      appliedAt: new Date(),
    };

    return mutated;
  }

  /**
   * Apply multiple mutations
   */
  mutateMultiple(
    config: AgentConfig,
    count: number,
    options: MutationOptions = {}
  ): AgentConfig[] {
    const results: AgentConfig[] = [];
    let current = config;

    for (let i = 0; i < count; i++) {
      const mutated = this.mutate(current, options);
      results.push(mutated);
      current = mutated;
    }

    return results;
  }

  /**
   * Crossover two configurations
   */
  crossover(parent1: AgentConfig, parent2: AgentConfig): AgentConfig {
    const child: AgentConfig = {
      id: `config-${Date.now()}-${this.random().toString(36).slice(2, 9)}`,
      name: `${parent1.name}-${parent2.name}-child`,
      systemPrompt: this.random() > 0.5 ? parent1.systemPrompt : parent2.systemPrompt,
      temperature: (parent1.temperature + parent2.temperature) / 2,
      maxTokens: Math.floor((parent1.maxTokens + parent2.maxTokens) / 2),
      topP: (parent1.topP + parent2.topP) / 2,
      retry: {
        maxAttempts: Math.floor((parent1.retry.maxAttempts + parent2.retry.maxAttempts) / 2),
        initialDelayMs: Math.floor((parent1.retry.initialDelayMs + parent2.retry.initialDelayMs) / 2),
        maxDelayMs: Math.floor((parent1.retry.maxDelayMs + parent2.retry.maxDelayMs) / 2),
        backoffMultiplier: (parent1.retry.backoffMultiplier + parent2.retry.backoffMultiplier) / 2,
      },
      timeout: {
        requestMs: Math.floor((parent1.timeout.requestMs + parent2.timeout.requestMs) / 2),
        totalMs: Math.floor((parent1.timeout.totalMs + parent2.timeout.totalMs) / 2),
        actionMs: Math.floor((parent1.timeout.actionMs + parent2.timeout.actionMs) / 2),
      },
      parameters: this.mergeParameters(parent1.parameters, parent2.parameters),
      version: 1,
      createdAt: new Date(),
      parentId: parent1.id,
      mutation: {
        id: `mutation-${Date.now()}`,
        type: "crossover",
        description: `Crossover of ${parent1.id} and ${parent2.id}`,
        fieldsChanged: ["temperature", "maxTokens", "topP", "retry", "timeout", "parameters"],
        magnitude: 0.5,
        appliedAt: new Date(),
      },
    };

    return child;
  }

  /**
   * Register a custom mutation strategy
   */
  registerStrategy(strategy: MutationStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): MutationStrategy[] {
    return [...this.strategies.values()];
  }

  /**
   * Register default mutation strategies
   */
  private registerDefaultStrategies(): void {
    // Prompt refinement
    this.registerStrategy({
      name: "Prompt Refinement",
      type: "prompt_refine",
      weight: 1,
      apply: (config, magnitude) => {
        const refinements = [
          "Be more concise in your responses.",
          "Provide step-by-step reasoning.",
          "Focus on accuracy over speed.",
          "Consider edge cases carefully.",
          "Validate inputs before processing.",
          "Document your assumptions.",
          "Break complex tasks into steps.",
          "Verify outputs before returning.",
        ];

        const numRefinements = Math.max(1, Math.floor(refinements.length * magnitude));
        const selected = this.shuffleArray(refinements).slice(0, numRefinements);
        const addition = `\n\n${selected.join("\n")}`;

        return {
          ...config,
          systemPrompt: config.systemPrompt + addition,
        };
      },
      describe: (magnitude) =>
        `Added ${Math.max(1, Math.floor(8 * magnitude))} refinement instructions to prompt`,
    });

    // Temperature adjustment
    this.registerStrategy({
      name: "Temperature Adjustment",
      type: "temperature_adjust",
      weight: 2,
      apply: (config, magnitude) => {
        const delta = (this.random() - 0.5) * 2 * magnitude;
        const newTemp = Math.max(0, Math.min(1, config.temperature + delta));

        return {
          ...config,
          temperature: Math.round(newTemp * 100) / 100,
        };
      },
      describe: (magnitude) => `Adjusted temperature by up to ±${(magnitude * 100).toFixed(0)}%`,
    });

    // Token adjustment
    this.registerStrategy({
      name: "Token Limit Adjustment",
      type: "token_adjust",
      weight: 1.5,
      apply: (config, magnitude) => {
        const multiplier = 1 + (this.random() - 0.5) * 2 * magnitude;
        const newTokens = Math.floor(config.maxTokens * multiplier);

        return {
          ...config,
          maxTokens: Math.max(100, Math.min(8000, newTokens)),
        };
      },
      describe: (magnitude) => `Adjusted max tokens by up to ±${(magnitude * 100).toFixed(0)}%`,
    });

    // Retry adjustment
    this.registerStrategy({
      name: "Retry Configuration Adjustment",
      type: "retry_adjust",
      weight: 1,
      apply: (config, magnitude) => {
        const attemptDelta = Math.floor(this.random() * magnitude * 3);
        const delayMultiplier = 1 + (this.random() - 0.5) * magnitude;

        return {
          ...config,
          retry: {
            ...config.retry,
            maxAttempts: Math.max(1, config.retry.maxAttempts + attemptDelta),
            initialDelayMs: Math.floor(config.retry.initialDelayMs * delayMultiplier),
            maxDelayMs: Math.floor(config.retry.maxDelayMs * delayMultiplier),
          },
        };
      },
      describe: (magnitude) => `Adjusted retry configuration with magnitude ${magnitude.toFixed(2)}`,
    });

    // Timeout adjustment
    this.registerStrategy({
      name: "Timeout Adjustment",
      type: "timeout_adjust",
      weight: 1,
      apply: (config, magnitude) => {
        const multiplier = 1 + (this.random() - 0.5) * magnitude;

        return {
          ...config,
          timeout: {
            requestMs: Math.floor(config.timeout.requestMs * multiplier),
            totalMs: Math.floor(config.timeout.totalMs * multiplier),
            actionMs: Math.floor(config.timeout.actionMs * multiplier),
          },
        };
      },
      describe: (magnitude) => `Adjusted timeouts by up to ±${(magnitude * 50).toFixed(0)}%`,
    });

    // Parameter tweak
    this.registerStrategy({
      name: "Parameter Tweak",
      type: "parameter_tweak",
      weight: 0.5,
      apply: (config, magnitude) => {
        const newParams = { ...config.parameters };
        const keys = Object.keys(newParams);

        if (keys.length > 0) {
          const numToTweak = Math.max(1, Math.floor(keys.length * magnitude));
          const keysToTweak = this.shuffleArray(keys).slice(0, numToTweak);

          for (const key of keysToTweak) {
            const value = newParams[key];
            if (typeof value === "number") {
              const multiplier = 1 + (this.random() - 0.5) * magnitude;
              newParams[key] = value * multiplier;
            } else if (typeof value === "boolean") {
              if (this.random() < magnitude) {
                newParams[key] = !value;
              }
            }
          }
        }

        return {
          ...config,
          parameters: newParams,
        };
      },
      describe: (magnitude) => `Tweaked parameters with magnitude ${magnitude.toFixed(2)}`,
    });
  }

  /**
   * Select a random strategy based on weights
   */
  private selectRandomStrategy(): MutationStrategy {
    const strategies = [...this.strategies.values()];
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    let random = this.random() * totalWeight;

    for (const strategy of strategies) {
      random -= strategy.weight;
      if (random <= 0) {
        return strategy;
      }
    }

    return strategies[strategies.length - 1];
  }

  /**
   * Get list of changed fields between configs
   */
  private getChangedFields(original: AgentConfig, mutated: AgentConfig): string[] {
    const changed: string[] = [];

    if (original.systemPrompt !== mutated.systemPrompt) changed.push("systemPrompt");
    if (original.temperature !== mutated.temperature) changed.push("temperature");
    if (original.maxTokens !== mutated.maxTokens) changed.push("maxTokens");
    if (original.topP !== mutated.topP) changed.push("topP");

    if (JSON.stringify(original.retry) !== JSON.stringify(mutated.retry)) {
      changed.push("retry");
    }

    if (JSON.stringify(original.timeout) !== JSON.stringify(mutated.timeout)) {
      changed.push("timeout");
    }

    if (JSON.stringify(original.parameters) !== JSON.stringify(mutated.parameters)) {
      changed.push("parameters");
    }

    return changed;
  }

  /**
   * Merge parameters from two configs
   */
  private mergeParameters(
    p1: Record<string, unknown>,
    p2: Record<string, unknown>
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(p1), ...Object.keys(p2)]);

    for (const key of allKeys) {
      const v1 = p1[key];
      const v2 = p2[key];

      if (v1 !== undefined && v2 !== undefined) {
        // Both have value - pick based on random or average
        if (typeof v1 === "number" && typeof v2 === "number") {
          merged[key] = (v1 + v2) / 2;
        } else {
          merged[key] = this.random() > 0.5 ? v1 : v2;
        }
      } else {
        // One has value
        merged[key] = v1 ?? v2;
      }
    }

    return merged;
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Seeded random number generator
   */
  private random(): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }
}

/**
 * Create a default agent configuration
 */
export function createDefaultAgentConfig(
  name: string,
  overrides?: Partial<AgentConfig>
): AgentConfig {
  return {
    id: `config-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    systemPrompt: "You are a helpful assistant.",
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,
    retry: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    },
    timeout: {
      requestMs: 30000,
      totalMs: 120000,
      actionMs: 60000,
    },
    parameters: {},
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}
