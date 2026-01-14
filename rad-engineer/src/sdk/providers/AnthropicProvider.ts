/**
 * Anthropic Provider Adapter
 *
 * Adapter for Anthropic Claude API (https://api.anthropic.com)
 * Migrates existing SDKIntegration logic to adapter pattern
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type {
  ProviderAdapter,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ChatMessage,
  ProviderType,
} from "./types.js";

/**
 * Anthropic-specific provider adapter
 */
export class AnthropicProvider implements ProviderAdapter {
  private client: Anthropic | null = null;
  private config: Omit<ProviderConfig, 'apiKey'>;

  constructor() {
    this.config = {
      providerType: "anthropic" as ProviderType,
      baseUrl: "https://api.anthropic.com",
      model: "",
      timeout: 300000,
      temperature: 1.0,
      maxTokens: 4096,
      topP: 1.0,
      stream: false,
    };
  }

  /**
   * Initialize Anthropic client with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    // Merge with defaults, preserving existing values for fields not provided
    const { apiKey, ...safeConfig } = config;
    this.config = {
      ...this.config, // Preserve defaults
      ...safeConfig,  // Override with provided values
    };

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.apiKey || "",
      baseURL: config.baseUrl || this.config.baseUrl,
      timeout: this.config.timeout || 300000,
      dangerouslyAllowBrowser: false,
    });
  }

  /**
   * Create a chat completion
   */
  async createChat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error("AnthropicProvider not initialized. Call initialize() first.");
    }

    // Convert ChatRequest to Anthropic Message format
    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      stream: false,
      system: request.system,
      messages: this.convertMessages(request),
      tools: request.tools,
    });

    // Convert Anthropic response to ChatResponse
    return this.convertResponse(message);
  }

  /**
   * Create a streaming chat completion
   */
  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    if (!this.client) {
      throw new Error("AnthropicProvider not initialized. Call initialize() first.");
    }

    const stream = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      stream: true,
      system: request.system,
      messages: this.convertMessages(request),
      tools: request.tools,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta") {
        if (chunk.delta.type === "text_delta") {
          yield {
            delta: chunk.delta.text,
            done: false,
          };
        }
      } else if (chunk.type === "message_stop") {
        yield { done: true };
      }
    }
  }

  /**
   * Validate if model name is supported
   */
  validateModel(model: string): boolean {
    // Anthropic models start with "claude-"
    return model.startsWith("claude-");
  }

  /**
   * Estimate token count (rough approximation)
   * Anthropic uses ~4 chars per token for English text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if feature is supported
   */
  supportsFeature(feature: 'streaming' | 'tools' | 'images'): boolean {
    // Anthropic supports all three features
    return true;
  }

  /**
   * Get current configuration (without API key)
   */
  getConfig(): Omit<ProviderConfig, 'apiKey'> {
    return { ...this.config };
  }

  /**
   * Convert ChatRequest messages to Anthropic format
   */
  private convertMessages(request: ChatRequest): Message[] {
    const messages: Message[] = [];

    // Add history if present
    if (request.history) {
      for (const msg of request.history) {
        if (msg.role === "user") {
          messages.push({
            role: "user",
            content: msg.content,
          } as unknown as Message);
        } else if (msg.role === "assistant") {
          messages.push({
            role: "assistant",
            content: [{ type: "text", text: msg.content }],
          } as unknown as Message);
        }
      }
    }

    // Add current prompt
    messages.push({
      role: "user",
      content: request.prompt,
    } as unknown as Message);

    return messages;
  }

  /**
   * Convert Anthropic response to unified ChatResponse
   */
  private convertResponse(message: Message): ChatResponse {
    // Extract text content
    const content = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.type === "text" ? block.text : "")
      .join("\n");

    // Extract tool use if present
    const toolUse = message.content.find((block) => block.type === "tool_use");

    return {
      content,
      toolUse: toolUse ? toolUse : undefined,
      usage: {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      },
      metadata: {
        model: this.config.model,
        provider: "anthropic" as ProviderType,
        finishReason: message.stop_reason || "unknown",
      },
      requestId: message.id || "unknown",
    };
  }
}
