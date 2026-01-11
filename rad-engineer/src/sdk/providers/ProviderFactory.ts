/**
 * Provider Factory
 *
 * Factory pattern for creating provider adapters
 * Supports 40+ LLM providers with OpenAI-compatible fallback
 * Integrated with EVALS system for intelligent routing
 */

import type {
  ProviderAdapter,
  ProviderConfig,
  ProviderFactoryConfig,
  ProviderType,
} from "./types.js";
import { AnthropicProvider } from "./AnthropicProvider.js";
import { GLMProvider } from "./GLMProvider.js";
import { OllamaProvider } from "./OllamaProvider.js";
import type { QueryFeatures, RoutingDecision } from "../../adaptive/types.js";
import type { BanditRouter } from "../../adaptive/BanditRouter.js";
import type { PerformanceStore } from "../../adaptive/PerformanceStore.js";
import type { QueryFeatureExtractor } from "../../adaptive/QueryFeatureExtractor.js";

/**
 * Provider factory for creating adapters
 */
export class ProviderFactory {
  private readonly defaultProvider: ProviderType;
  private readonly providers: Map<string, ProviderAdapter>;
  private readonly enableFallback: boolean;

  // EVALS integration (optional)
  private banditRouter?: BanditRouter;
  private featureExtractor?: QueryFeatureExtractor;
  private performanceStore?: PerformanceStore;

  constructor(config: ProviderFactoryConfig) {
    this.defaultProvider = config.defaultProvider || "anthropic" as ProviderType;
    this.enableFallback = config.enableFallback || false;
    this.providers = new Map();

    // Initialize registered providers
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      this.registerProvider(name, providerConfig);
    }
  }

  /**
   * Enable EVALS intelligent routing
   * @param banditRouter - Bandit router instance
   * @param featureExtractor - Query feature extractor
   * @param performanceStore - Performance store
   */
  enableEvalsRouting(
    banditRouter: BanditRouter,
    featureExtractor: QueryFeatureExtractor,
    performanceStore: PerformanceStore
  ): void {
    this.banditRouter = banditRouter;
    this.featureExtractor = featureExtractor;
    this.performanceStore = performanceStore;
  }

  /**
   * Disable EVALS routing (use default provider)
   */
  disableEvalsRouting(): void {
    this.banditRouter = undefined;
    this.featureExtractor = undefined;
    this.performanceStore = undefined;
  }

  /**
   * Check if EVALS routing is enabled
   */
  isEvalsRoutingEnabled(): boolean {
    return this.banditRouter !== undefined;
  }

  /**
   * Get a provider adapter by name
   * @param name - Provider name (optional, uses default if not specified)
   * @returns Provider adapter
   * @throws Error if provider not found
   */
  async getProvider(name?: string): Promise<ProviderAdapter> {
    const providerName = name || this.defaultProvider;

    // Check if provider is already initialized
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName)!;
    }

    // Try to create provider on-the-fly
    throw new Error(
      `Provider "${providerName}" not registered. ` +
      `Available providers: ${Array.from(this.providers.keys()).join(", ")}`
    );
  }

  /**
   * Route a query to the optimal provider using EVALS
   * @param query - User query text
   * @param features - Optional pre-computed features (will be extracted if not provided)
   * @returns Provider adapter and routing decision
   * @throws Error if EVALS routing is not enabled
   */
  async routeProvider(
    query: string,
    features?: QueryFeatures
  ): Promise<{ provider: ProviderAdapter; decision: RoutingDecision }> {
    if (!this.banditRouter || !this.featureExtractor) {
      throw new Error(
        "EVALS routing is not enabled. Call enableEvalsRouting() first."
      );
    }

    // Extract features if not provided
    const queryFeatures = features || this.featureExtractor.extract(query);

    // Get routing decision
    const decision = await this.banditRouter.route(queryFeatures);

    // Get provider for routing decision
    const provider = await this.getProvider(decision.provider);

    return { provider, decision };
  }

  /**
   * Register a new provider configuration
   * @param name - Provider name/alias
   * @param config - Provider configuration
   */
  registerProvider(name: string, config: ProviderConfig): void {
    const adapter = this.createAdapter(config.providerType);
    adapter.initialize(config);
    this.providers.set(name, adapter);
  }

  /**
   * Check if a provider is registered
   * @param name - Provider name
   * @returns true if registered, false otherwise
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get list of registered provider names
   * @returns Array of provider names
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider configuration by name (without API key)
   * @param name - Provider name
   * @returns Provider config (safe)
   */
  getProviderConfig(name: string): Omit<ProviderConfig, 'apiKey'> | undefined {
    const provider = this.providers.get(name);
    if (!provider) return undefined;
    return provider.getConfig();
  }

  /**
   * Create adapter based on provider type
   * @param providerType - Type of provider
   * @returns Provider adapter instance
   * @throws Error if provider type not supported
   */
  private createAdapter(providerType: ProviderType): ProviderAdapter {
    switch (providerType) {
      // US/Europe Majors
      case "anthropic":
        return new AnthropicProvider();

      case "glm":
        return new GLMProvider();

      case "ollama":
        return new OllamaProvider();

      // OpenAI-compatible providers can use a common adapter
      case "openai":
      case "google":
      case "meta":
      case "mistral":
      case "cohere":
      case "together":
      case "anyscale":
      case "fireworks":
      case "replicate":
      case "openrouter":
      case "qwen":
      case "ernie":
      case "hunyuan":
      case "doubao":
      case "kimi":
      case "deepseek":
      case "minimax":
      case "yi":
      case "perplexity":
      case "xai":
      case "ai21":
      case "writer":
      case "huggingface":
      case "litellm":
      case "portkey":
      case "braintrust":
      case "localai":
      case "vllm":
      case "tgi":
      case "fastchat":
        // Import OpenAI-compatible adapter lazily to avoid circular deps
        return this.createOpenAICompatibleAdapter(providerType);

      case "custom":
        throw new Error(
          "Custom provider requires manual adapter registration. " +
          "Use registerProvider() with a custom adapter instance."
        );

      default:
        // Fallback to OpenAI-compatible for unknown providers
        if (this.enableFallback) {
          console.warn(
            `[ProviderFactory] Unknown provider type "${providerType}", ` +
            `falling back to OpenAI-compatible adapter`
          );
          return this.createOpenAICompatibleAdapter(providerType);
        }

        throw new Error(
          `Unsupported provider type: "${providerType}". ` +
          `Supported types: ${this.getSupportedTypes().join(", ")}`
        );
    }
  }

  /**
   * Create OpenAI-compatible adapter for providers with compatible API
   * @param providerType - Type of provider
   * @returns OpenAI-compatible adapter
   */
  private createOpenAICompatibleAdapter(providerType: ProviderType): ProviderAdapter {
    // Dynamic import to avoid loading OpenAI SDK unless needed
    // This will be implemented with OpenAIProvider class
    throw new Error(
      `OpenAI-compatible adapter not yet implemented for provider: "${providerType}". ` +
      `Coming soon in Phase 1.`
    );
  }

  /**
   * Get list of supported provider types
   * @returns Array of supported provider types
   */
  getSupportedTypes(): string[] {
    return [
      // Fully implemented
      "anthropic",
      "glm",
      "ollama",

      // OpenAI-compatible (pending implementation)
      "openai",
      "google",
      "meta",
      "mistral",
      "cohere",
      "together",
      "anyscale",
      "fireworks",
      "replicate",
      "openrouter",
      "qwen",
      "ernie",
      "hunyuan",
      "doubao",
      "kimi",
      "deepseek",
      "minimax",
      "yi",
      "perplexity",
      "xai",
      "ai21",
      "writer",
      "huggingface",
      "litellm",
      "portkey",
      "braintrust",
      "localai",
      "vllm",
      "tgi",
      "fastchat",
    ];
  }

  /**
   * Remove a provider from the registry
   * @param name - Provider name to remove
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  /**
   * Clear all registered providers
   */
  clear(): void {
    this.providers.clear();
  }

  /**
   * Get count of registered providers
   * @returns Number of registered providers
   */
  getProviderCount(): number {
    return this.providers.size;
  }
}

/**
 * Singleton factory instance (optional pattern)
 */
let globalFactory: ProviderFactory | null = null;

/**
 * Initialize global provider factory
 * @param config - Factory configuration
 * @returns Provider factory instance
 */
export function initializeProviderFactory(config: ProviderFactoryConfig): ProviderFactory {
  if (!globalFactory) {
    globalFactory = new ProviderFactory(config);
  }
  return globalFactory;
}

/**
 * Get global provider factory instance
 * @returns Provider factory instance or throws if not initialized
 */
export function getProviderFactory(): ProviderFactory {
  if (!globalFactory) {
    throw new Error(
      "Provider factory not initialized. Call initializeProviderFactory() first."
    );
  }
  return globalFactory;
}

/**
 * Reset global provider factory (for testing)
 */
export function resetProviderFactory(): void {
  globalFactory = null;
}
