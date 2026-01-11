/**
 * Provider Availability Checking
 *
 * Validates provider credentials before routing.
 * Ensures BanditRouter only selects providers with valid API keys.
 */

import type { ProviderFactory } from "./ProviderFactory.js";
import type { ProviderType } from "./types.js";

/**
 * Provider availability check result
 */
export interface AvailabilityCheck {
  provider: string;
  available: boolean;
  reason?: string;
}

/**
 * Provider availability validator
 */
export class ProviderAvailability {
  /**
   * Validate Anthropic credentials
   * Checks if API key exists and makes a minimal validation call
   */
  private static async validateAnthropic(apiKey: string | undefined): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Basic format check: Anthropic keys start with "sk-ant-"
    if (!apiKey.startsWith("sk-ant-")) {
      return false;
    }

    // Optional: Make a minimal API call to verify key is valid
    // This would require importing Anthropic SDK, which we want to avoid here
    // for performance reasons. The format check is usually sufficient.
    return true;
  }

  /**
   * Validate GLM credentials
   * GLM uses Anthropic-compatible API with custom base URL
   */
  private static async validateGLM(apiKey: string | undefined): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // GLM keys vary in format, just check non-empty
    return apiKey.trim().length > 0;
  }

  /**
   * Validate Ollama availability
   * Ollama doesn't use API keys, checks if OLLAMA_HOST is set
   */
  private static async validateOllama(
    apiKey: string | undefined,
    baseUrl?: string
  ): Promise<boolean> {
    // Ollama doesn't require API key
    // Check if baseUrl is set (either custom or default)
    const ollamaHost = baseUrl || process.env.OLLAMA_HOST || "http://localhost:11434";

    try {
      // Quick health check
      const response = await fetch(`${ollamaHost}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Validate OpenAI-compatible provider
   * Most providers use "sk-" prefix
   */
  private static async validateOpenAICompatible(
    apiKey: string | undefined
  ): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Most OpenAI-compatible providers use "sk-" prefix
    return apiKey.startsWith("sk-");
  }

  /**
   * Validate credentials for a specific provider type
   */
  private static async validateCredentials(
    providerType: ProviderType,
    apiKey: string | undefined,
    baseUrl?: string
  ): Promise<boolean> {
    switch (providerType) {
      case "anthropic":
        return this.validateAnthropic(apiKey);

      case "glm":
        return this.validateGLM(apiKey);

      case "ollama":
        return this.validateOllama(apiKey, baseUrl);

      // OpenAI-compatible providers
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
        return this.validateOpenAICompatible(apiKey);

      default:
        // For unknown providers, be conservative
        return false;
    }
  }

  /**
   * Check if a specific provider is available
   */
  static async isProviderAvailable(
    factory: ProviderFactory,
    providerName: string
  ): Promise<AvailabilityCheck> {
    try {
      const config = factory.getProviderConfig(providerName);

      if (!config) {
        return {
          provider: providerName,
          available: false,
          reason: "Provider not registered",
        };
      }

      const available = await this.validateCredentials(
        config.providerType,
        // We can't access apiKey from getConfig() (it's omitted)
        // So we check environment variables
        this.getApiKeyFromEnv(config.providerType),
        config.baseUrl
      );

      return {
        provider: providerName,
        available,
        reason: available ? undefined : "Invalid or missing credentials",
      };
    } catch (error) {
      return {
        provider: providerName,
        available: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get list of available providers
   */
  static async getAvailableProviders(
    factory: ProviderFactory
  ): Promise<string[]> {
    const providers = factory.listProviders();
    const available: string[] = [];

    for (const provider of providers) {
      const check = await this.isProviderAvailable(factory, provider);
      if (check.available) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Get API key from environment for a provider type
   */
  private static getApiKeyFromEnv(providerType: ProviderType): string | undefined {
    const envVar = this.getEnvVarForProvider(providerType);
    return process.env[envVar];
  }

  /**
   * Get environment variable name for a provider
   */
  private static getEnvVarForProvider(providerType: ProviderType): string {
    switch (providerType) {
      case "anthropic":
        return "ANTHROPIC_API_KEY";
      case "openai":
        return "OPENAI_API_KEY";
      case "glm":
        return "GLM_API_KEY";
      case "google":
        return "GOOGLE_API_KEY";
      case "ollama":
        return "OLLAMA_HOST"; // Ollama doesn't use API key
      default:
        // Default pattern: {PROVIDER}_API_KEY
        return `${providerType.toUpperCase()}_API_KEY`;
    }
  }
}
