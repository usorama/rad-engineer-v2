/**
 * Provider Auto-Detection Manager
 *
 * Automatically detects and configures LLM providers from environment variables.
 * Supports dynamic provider discovery without hardcoded configuration.
 *
 * Supported Environment Variables:
 * - ANTHROPIC_AUTH_TOKEN: API key for Anthropic/GLM via api.z.ai proxy
 * - ANTHROPIC_API_KEY: Alternative API key for Anthropic
 * - ANTHROPIC_BASE_URL: Custom base URL (e.g., https://api.z.ai/api/anthropic)
 * - OPENAI_API_KEY: API key for OpenAI
 * - OLLAMA_HOST: Ollama server URL (e.g., http://localhost:11434)
 * - GLM_API_KEY: API key for GLM (Zhipu AI)
 * - GLM_BASE_URL: GLM API endpoint
 */

import type { ProviderConfig, ProviderFactoryConfig, ProviderType } from "../sdk/providers/types.js";

/**
 * Provider information returned from auto-detection
 */
export interface ProviderInfo {
  /** Provider name/identifier */
  name: string;
  /** Provider type (anthropic, glm, openai, ollama, etc.) */
  providerType: ProviderType;
  /** Model identifier */
  model: string;
  /** API key (masked in logs) */
  apiKey: string;
  /** Base URL for API endpoint */
  baseUrl: string;
  /** Whether provider is available and configured */
  available: boolean;
}

/**
 * Auto-detection result
 */
export interface DetectionResult {
  /** All detected providers */
  providers: ProviderInfo[];
  /** Default provider (first available) */
  defaultProvider: ProviderInfo | null;
  /** Count of available providers */
  availableCount: number;
}

/**
 * Provider auto-detection manager
 *
 * Automatically discovers available LLM providers from environment variables.
 * Enables zero-configuration setup for common providers.
 */
export class ProviderAutoDetector {
  /**
   * Detect all available providers from environment variables
   * @returns Array of detected provider information
   */
  static detectAvailableProviders(): ProviderInfo[] {
    const providers: ProviderInfo[] = [];

    // Detect Anthropic (and GLM via api.z.ai proxy)
    const anthropicKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
    const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;

    if (anthropicKey) {
      // Check if this is GLM via api.z.ai proxy
      const isGlmProxy = anthropicBaseUrl?.includes("api.z.ai") ||
                         !process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_AUTH_TOKEN;

      if (isGlmProxy) {
        providers.push({
          name: "glm-proxy",
          providerType: "glm" as ProviderType,
          model: process.env.GLM_MODEL || "glm-4.7",
          apiKey: anthropicKey,
          baseUrl: anthropicBaseUrl || "https://api.z.ai/api/anthropic",
          available: true,
        });
      } else {
        // Standard Anthropic
        providers.push({
          name: "anthropic",
          providerType: "anthropic" as ProviderType,
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          apiKey: anthropicKey,
          baseUrl: anthropicBaseUrl || "https://api.anthropic.com",
          available: true,
        });
      }
    }

    // Detect GLM (direct API)
    const glmKey = process.env.GLM_API_KEY;
    if (glmKey) {
      providers.push({
        name: "glm",
        providerType: "glm" as ProviderType,
        model: process.env.GLM_MODEL || "glm-4.7",
        apiKey: glmKey,
        baseUrl: process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4/",
        available: true,
      });
    }

    // Detect OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      providers.push({
        name: "openai",
        providerType: "openai" as ProviderType,
        model: process.env.OPENAI_MODEL || "gpt-4o",
        apiKey: openaiKey,
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        available: true,
      });
    }

    // Detect Ollama (local)
    const ollamaHost = process.env.OLLAMA_HOST;
    if (ollamaHost) {
      providers.push({
        name: "ollama",
        providerType: "ollama" as ProviderType,
        model: process.env.OLLAMA_MODEL || "llama2",
        apiKey: "", // Ollama doesn't require API key
        baseUrl: ollamaHost,
        available: true,
      });
    }

    return providers;
  }

  /**
   * Get the default (first available) provider
   * @returns Default provider info
   * @throws Error if no providers are configured
   */
  static getDefaultProvider(): ProviderInfo {
    const providers = this.detectAvailableProviders();

    if (providers.length === 0) {
      throw new Error(
        "No LLM providers configured. Please set one of the following environment variables:\n" +
        "  - ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY (for Anthropic/GLM)\n" +
        "  - OPENAI_API_KEY (for OpenAI)\n" +
        "  - OLLAMA_HOST (for Ollama)\n" +
        "  - GLM_API_KEY (for GLM direct API)"
      );
    }

    return providers[0];
  }

  /**
   * Initialize ProviderFactoryConfig from detected providers
   * @returns Provider factory configuration
   * @throws Error if no providers are detected
   */
  static initializeFromEnv(): ProviderFactoryConfig {
    const providers = this.detectAvailableProviders();

    if (providers.length === 0) {
      throw new Error(
        "No LLM providers detected from environment. Please configure at least one provider."
      );
    }

    // Convert ProviderInfo[] to ProviderFactoryConfig
    const providerConfigs: Record<string, ProviderConfig> = {};

    for (const provider of providers) {
      providerConfigs[provider.name] = {
        providerType: provider.providerType,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        model: provider.model,
        timeout: 60000, // Default 60 second timeout
        temperature: 1.0,
        maxTokens: 4096,
        topP: 1.0,
        stream: false,
      };
    }

    return {
      defaultProvider: providers[0].providerType,
      providers: providerConfigs,
      enableFallback: false,
    };
  }

  /**
   * Get detection result with summary information
   * @returns Detection result with all providers and default
   */
  static detectAll(): DetectionResult {
    const providers = this.detectAvailableProviders();
    const defaultProvider = providers.length > 0 ? providers[0] : null;

    return {
      providers,
      defaultProvider,
      availableCount: providers.length,
    };
  }

  /**
   * Check if a specific provider type is available
   * @param providerType - Provider type to check
   * @returns true if provider is available
   */
  static isProviderAvailable(providerType: ProviderType): boolean {
    const providers = this.detectAvailableProviders();
    return providers.some((p) => p.providerType === providerType && p.available);
  }

  /**
   * Get provider by type
   * @param providerType - Provider type to get
   * @returns Provider info or undefined if not found
   */
  static getProviderByType(providerType: ProviderType): ProviderInfo | undefined {
    const providers = this.detectAvailableProviders();
    return providers.find((p) => p.providerType === providerType);
 }

  /**
   * Print detected providers (for debugging/logging)
   * @returns Formatted string listing all providers
   */
  static printDetectedProviders(): string {
    const result = this.detectAll();

    if (result.availableCount === 0) {
      return "No providers detected from environment variables.";
    }

    const lines = [
      `Detected ${result.availableCount} provider(s):`,
      "",
      ...result.providers.map((p) =>
        `  - ${p.name} (${p.providerType})\n` +
        `    Model: ${p.model}\n` +
        `    URL: ${p.baseUrl}\n` +
        `    Available: ${p.available ? "✓" : "✗"}`
      ),
      "",
      `Default: ${result.defaultProvider?.name || "none"}`,
    ];

    return lines.join("\n");
  }
}

/**
 * Quick helper to auto-detect and initialize provider factory
 * @returns Provider factory configuration
 */
export function autoDetectProviders(): ProviderFactoryConfig {
  return ProviderAutoDetector.initializeFromEnv();
}

/**
 * Quick helper to get default provider
 * @returns Default provider info
 */
export function getDefaultProvider(): ProviderInfo {
  return ProviderAutoDetector.getDefaultProvider();
}

/**
 * Quick helper to detect all providers
 * @returns Detection result
 */
export function detectAllProviders(): DetectionResult {
  return ProviderAutoDetector.detectAll();
}
