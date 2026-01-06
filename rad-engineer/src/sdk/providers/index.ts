/**
 * Provider Abstraction Layer - Public API
 *
 * Exports all provider types, adapters, and factory for multi-provider LLM support
 */

// Type definitions
export type {
  ProviderConfig,
  ChatRequest,
  ChatMessage,
  StreamChunk,
  ChatResponse,
  ProviderAdapter,
  ProviderFactoryConfig,
} from "./types.js";

export { ProviderType } from "./types.js";

// Provider adapters
export { AnthropicProvider } from "./AnthropicProvider.js";
export { GLMProvider } from "./GLMProvider.js";
export { OllamaProvider } from "./OllamaProvider.js";

// Provider factory
export {
  ProviderFactory,
  initializeProviderFactory,
  getProviderFactory,
  resetProviderFactory,
} from "./ProviderFactory.js";

/**
 * Quick start example:
 *
 * ```ts
 * import { initializeProviderFactory, ProviderType } from './providers';
 *
 * const factory = initializeProviderFactory({
 *   defaultProvider: ProviderType.ANTHROPIC,
 *   providers: {
 *     anthropic: {
 *       providerType: ProviderType.ANTHROPIC,
 *       apiKey: process.env.ANTHROPIC_API_KEY,
 *       baseUrl: "https://api.anthropic.com",
 *       model: "claude-3-5-sonnet-20241022",
 *     },
 *     glm: {
 *       providerType: ProviderType.GLM,
 *       apiKey: process.env.GLM_API_KEY,
 *       baseUrl: "https://api.z.ai/api/anthropic",
 *       model: "glm-4.7",
 *     },
 *   },
 * });
 *
 * const anthropic = await factory.getProvider("anthropic");
 * const glm = await factory.getProvider("glm");
 * ```
 */
