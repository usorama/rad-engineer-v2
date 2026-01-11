/**
 * Ollama Provider Adapter
 *
 * Adapter for Ollama local models
 * Supports running models locally without API keys
 * API: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type {
  ProviderAdapter,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ProviderType,
} from "./types.js";

/**
 * Ollama API response types
 */
interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
  };
  tools?: unknown[];
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message?: OllamaMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama-specific provider adapter
 */
export class OllamaProvider implements ProviderAdapter {
  private config: Omit<ProviderConfig, 'apiKey'>;
  private baseUrl: string;

  constructor() {
    this.config = {
      providerType: "ollama" as ProviderType,
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
      timeout: 120000,
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      stream: false,
    };
    this.baseUrl = this.config.baseUrl;
  }

  /**
   * Initialize Ollama provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    // Merge with defaults, preserving existing values for fields not provided
    const { apiKey, ...safeConfig } = config;
    this.config = {
      ...this.config, // Preserve defaults
      ...safeConfig,  // Override with provided values
    };
    this.baseUrl = this.config.baseUrl;

    // Verify Ollama is running
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama health check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(
        `Cannot connect to Ollama at ${this.baseUrl}. Make sure Ollama is running.`
      );
    }
  }

  /**
   * Create a chat completion
   */
  async createChat(request: ChatRequest): Promise<ChatResponse> {
    const ollamaRequest: OllamaChatRequest = {
      model: this.config.model,
      messages: this.convertMessages(request),
      stream: false,
      options: {
        temperature: this.config.temperature,
        num_predict: this.config.maxTokens,
        top_p: this.config.topP,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data: OllamaChatResponse = await response.json() as OllamaChatResponse;
    return this.convertResponse(data);
  }

  /**
   * Create a streaming chat completion
   */
  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    const ollamaRequest: OllamaChatRequest = {
      model: this.config.model,
      messages: this.convertMessages(request),
      stream: true,
      options: {
        temperature: this.config.temperature,
        num_predict: this.config.maxTokens,
        top_p: this.config.topP,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk: OllamaStreamChunk = JSON.parse(line);
          if (chunk.message?.content) {
            yield {
              delta: chunk.message.content,
              done: false,
            };
          }
          if (chunk.done) {
            yield { done: true };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * Validate if model name is supported
   * Ollama supports any model that's installed locally
   */
  validateModel(model: string): boolean {
    // We can't validate without calling Ollama API
    // Assume valid if name is provided
    return model.length > 0;
  }

  /**
   * Estimate token count (rough approximation)
   * Ollama uses ~4 chars per token for English text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if feature is supported
   */
  supportsFeature(feature: 'streaming' | 'tools' | 'images'): boolean {
    // Ollama supports streaming
    if (feature === 'streaming') return true;

    // Tool support varies by model
    if (feature === 'tools') {
      // Some models like llama3.2 support tools
      // We'll assume yes for now
      return true;
    }

    // Image support (vision models like llava)
    if (feature === 'images') {
      // Check if model is a vision model
      return this.config.model.includes("llava") || this.config.model.includes("vision");
    }

    return false;
  }

  /**
   * Get current configuration (without API key)
   */
  getConfig(): Omit<ProviderConfig, 'apiKey'> {
    return { ...this.config };
  }

  /**
   * Convert ChatRequest messages to Ollama format
   */
  private convertMessages(request: ChatRequest): OllamaMessage[] {
    const messages: OllamaMessage[] = [];

    // Add history if present
    if (request.history) {
      for (const msg of request.history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current prompt
    messages.push({
      role: "user",
      content: request.prompt,
    });

    return messages;
  }

  /**
   * Convert Ollama response to unified ChatResponse
   */
  private convertResponse(data: OllamaChatResponse): ChatResponse {
    return {
      content: data.message.content,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      metadata: {
        model: data.model,
        provider: "ollama" as ProviderType,
        finishReason: data.done ? "done" : "unknown",
      },
      requestId: `${data.model}-${Date.now()}`,
    };
  }
}
