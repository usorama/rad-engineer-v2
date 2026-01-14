/**
 * Provider Abstraction Layer - Type Definitions
 *
 * Enables multi-provider LLM support (Anthropic, GLM, Ollama, etc.)
 * Based on: Adapter + Factory Pattern (Solution 1 from approved plan)
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";

/**
 * Supported provider types
 *
 * Comprehensive list of 40+ LLM providers across:
 * - US/Europe majors (OpenAI, Anthropic, Google, Meta, Mistral, Cohere)
 * - Chinese providers (GLM, Qwen, Ernie, Hunyuan, DeepSeek, etc.)
 * - Inference platforms (Together, Anyscale, Fireworks, Replicate, etc.)
 * - Model hubs (Hugging Face, OpenRouter)
 * - Local/edge (Ollama, LocalAI, vLLM)
 * - Specialized (images, audio)
 */
export enum ProviderType {
  // US/Europe Majors
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  META = "meta",
  MISTRAL = "mistral",
  COHERE = "cohere",
  AI21 = "ai21",
  XAI = "xai", // Grok
  PERPLEXITY = "perplexity",
  WRITER = "writer",

  // Chinese Providers
  GLM = "glm", // Zhipu AI
  QWEN = "qwen", // Alibaba Cloud
  ERNIE = "ernie", // Baidu
  HUNYUAN = "hunyuan", // Tencent
  DOUBAO = "doubao", // ByteDance
  KIMI = "kimi", // Moonshot AI
  DEEPSEEK = "deepseek",
  MINIMAX = "minimax",
  YI = "yi", // 01.AI
  SENSETIME = "sensetime",

  // Inference Platforms (OpenAI-compatible)
  TOGETHER = "together",
  ANYSCALE = "anyscale",
  FIREWORKS = "fireworks",
  REPLICATE = "replicate",
  OCTOAI = "octoai",
  LAMBDA = "lambda",
  CEREBRAS = "cerebras",
  BASETEN = "baseten",
  MODAL = "modal",
  DEEPINFRA = "deepinfra",
  CENTML = "centml",

  // Model Hubs & Aggregators
  HUGGINGFACE = "huggingface",
  OPENROUTER = "openrouter",
  LITELLM = "litellm",
  PORTKEY = "portkey",
  BRAINTRUST = "braintrust",

  // Local/Edge Inference
  OLLAMA = "ollama",
  LOCALAI = "localai",
  VLLM = "vllm",
  TGI = "tgi", // Text Generation Inference
  FASTCHAT = "fastchat",

  // Specialized
  MIDJOURNEY = "midjourney",
  STABILITY = "stability",
  LEONARDO = "leonardo",
  IDEOGRAM = "ideogram",

  // Enterprise/Vertical
  C3AI = "c3ai",
  SCALEAI = "scaleai",
  DATAROBOT = "datarobot",
  H2OAI = "h2oai",

  // Custom/Fallback
  CUSTOM = "custom",
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  /** Provider type (determines which adapter to use) */
  providerType: ProviderType;
  /** API key for authentication (not required for local providers like Ollama) */
  apiKey?: string;
  /** Base URL for API endpoint (supports custom endpoints like GLM) */
  baseUrl: string;
  /** Model identifier */
  model: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Sampling temperature (0.0 - 1.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Enable streaming responses */
  stream?: boolean;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** Additional provider-specific parameters */
  params?: Record<string, unknown>;
}

/**
 * Chat request interface (unified across providers)
 */
export interface ChatRequest {
  /** User prompt */
  prompt: string;
  /** System message (optional) */
  system?: string;
  /** Conversation history (optional) */
  history?: ChatMessage[];
  /** Available tools */
  tools?: Tool[];
  /** Task context (optional) */
  context?: Record<string, unknown>;
}

/**
 * Chat message for conversation history
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk {
  /** Delta content (text fragment) */
  delta?: string;
  /** Tool use (if any) */
  toolUse?: unknown;
  /** Done flag for end of stream */
  done: boolean;
}

/**
 * Chat response interface (unified across providers)
 */
export interface ChatResponse {
  /** Response text content */
  content: string;
  /** Tool use results (if any) */
  toolUse?: unknown;
  /** Token usage metrics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Response metadata */
  metadata: {
    model: string;
    provider: ProviderType;
    finishReason: string;
  };
  /** Request ID for tracing */
  requestId: string;
}

/**
 * Provider adapter interface
 *
 * All providers must implement this interface for unified API
 */
export interface ProviderAdapter {
  /**
   * Initialize the provider with configuration
   * @param config - Provider configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Create a chat completion
   * @param request - Chat request
   * @returns Chat response
   */
  createChat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Create a streaming chat completion
   * @param request - Chat request
   * @returns Async iterable of stream chunks
   */
  streamChat(request: ChatRequest): AsyncIterable<StreamChunk>;

  /**
   * Validate if model name is supported by this provider
   * @param model - Model name to validate
   * @returns true if valid, false otherwise
   */
  validateModel(model: string): boolean;

  /**
   * Estimate token count for text (provider-specific)
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;

  /**
   * Check if provider supports a feature
   * @param feature - Feature to check
   * @returns true if supported, false otherwise
   */
  supportsFeature(feature: 'streaming' | 'tools' | 'images'): boolean;

  /**
   * Get current provider configuration
   * @returns Provider config (without sensitive data)
   */
  getConfig(): Omit<ProviderConfig, 'apiKey'>;
}

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  /** Default provider to use if none specified */
  defaultProvider?: ProviderType;
  /** Available provider configurations */
  providers: Record<string, ProviderConfig>;
  /** Enable provider fallback on errors */
  enableFallback?: boolean;
}
