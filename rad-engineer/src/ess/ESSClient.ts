/**
 * ESS (Engineering Support System) Client
 *
 * HTTP client for the ESS Gateway API. Provides hybrid search
 * combining Qdrant vector search and Neo4j graph traversal for
 * complete codebase understanding.
 *
 * @example
 * ```typescript
 * const ess = new ESSClient({ baseUrl: 'http://localhost:3001' });
 *
 * // One-shot query
 * const result = await ess.query('How does authentication work?');
 * console.log(result.answer);
 *
 * // Check health
 * const health = await ess.health();
 * console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
 * ```
 */

import type {
  ESSClientConfig,
  ESSQueryRequest,
  ESSQueryResponse,
  ESSConversationContinueRequest,
  ESSHealthResponse,
} from './types.js';
import {
  ESSError,
  ESSConnectionError,
  ESSTimeoutError,
} from './types.js';

export class ESSClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly apiKey?: string;
  private readonly debug: boolean;

  constructor(config: ESSClientConfig) {
    // Remove trailing slash from baseUrl
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout ?? 30000;
    this.apiKey = config.apiKey;
    this.debug = config.debug ?? false;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Query ESS with natural language. Uses hybrid search (Qdrant + Neo4j).
   *
   * @param query - Natural language query or ESSQueryRequest object
   * @param options - Optional query options (project, synthesisMode)
   * @returns Query response with answer, sources, and confidence
   */
  async query(
    query: string | ESSQueryRequest,
    options?: { project?: string; synthesisMode?: 'synthesized' | 'raw' } | string
  ): Promise<ESSQueryResponse> {
    // Handle backwards compatibility: options can be a string (project name)
    const opts = typeof options === 'string' ? { project: options } : options;

    const request: ESSQueryRequest = typeof query === 'string'
      ? {
          query,
          project: opts?.project,
          mode: 'one-shot',
          synthesisMode: opts?.synthesisMode ?? 'synthesized', // Default to synthesized
        }
      : query;

    return this.post<ESSQueryResponse>('/query', request);
  }

  /**
   * Start a conversational query session. Use this for complex questions
   * that may require clarification.
   *
   * @param query - Natural language query
   * @param project - Optional project name
   * @returns Response with conversationId for continuation
   */
  async startConversation(
    query: string,
    project?: string
  ): Promise<ESSQueryResponse> {
    const request: ESSQueryRequest = {
      query,
      project,
      mode: 'conversational',
    };

    return this.post<ESSQueryResponse>('/conversation', request);
  }

  /**
   * Continue an existing conversation by providing answers to clarifying questions.
   *
   * @param conversationId - ID from previous response
   * @param answers - Answers to clarifying questions (question ID -> answer)
   * @returns Updated response
   */
  async continueConversation(
    conversationId: string,
    answers: Record<string, string>
  ): Promise<ESSQueryResponse> {
    const request: ESSConversationContinueRequest = { answers };
    return this.post<ESSQueryResponse>(`/conversation/${conversationId}/continue`, request);
  }

  /**
   * Abort an ongoing conversation.
   *
   * @param conversationId - ID of conversation to abort
   */
  async abortConversation(conversationId: string): Promise<void> {
    await this.delete(`/conversation/${conversationId}`);
  }

  /**
   * Check ESS health status. Returns status of all backend services.
   *
   * @returns Health status of ESS and all dependencies
   */
  async health(): Promise<ESSHealthResponse> {
    return this.get<ESSHealthResponse>('/health');
  }

  /**
   * Check if ESS is available and healthy.
   *
   * @returns true if ESS is healthy or degraded, false if unhealthy or unreachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.health();
      return health.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  /**
   * Get list of indexed projects.
   *
   * @returns Array of project names
   */
  async listProjects(): Promise<string[]> {
    const response = await this.get<{ projects: string[] }>('/projects');
    return response.projects;
  }

  // ==========================================================================
  // HTTP Methods
  // ==========================================================================

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async delete(path: string): Promise<void> {
    await this.request<unknown>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.debug) {
      console.log(`[ESSClient] ${method} ${url}`, body ? JSON.stringify(body) : '');
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData: unknown;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = errorBody;
        }

        throw new ESSError(
          `ESS request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const data = await response.json() as T;

      if (this.debug) {
        console.log(`[ESSClient] Response:`, JSON.stringify(data, null, 2));
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ESSError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ESSTimeoutError(this.timeout);
        }

        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new ESSConnectionError(
            `Failed to connect to ESS at ${this.baseUrl}: ${error.message}`,
            this.baseUrl
          );
        }
      }

      throw new ESSError(
        `ESS request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// ==========================================================================
// Factory Functions
// ==========================================================================

/**
 * Create an ESS client for local development.
 *
 * @param port - Gateway port (default: 3001)
 * @returns Configured ESSClient
 */
export function createLocalESSClient(port = 3001): ESSClient {
  return new ESSClient({
    baseUrl: `http://localhost:${port}`,
    debug: process.env.ESS_DEBUG === 'true',
  });
}

/**
 * Create an ESS client from environment variables.
 *
 * Environment variables:
 * - ESS_URL: Gateway URL (required)
 * - ESS_API_KEY: API key (optional)
 * - ESS_TIMEOUT: Request timeout in ms (optional, default: 30000)
 * - ESS_DEBUG: Enable debug logging (optional)
 *
 * @returns Configured ESSClient
 * @throws Error if ESS_URL is not set
 */
export function createESSClientFromEnv(): ESSClient {
  const baseUrl = process.env.ESS_URL;

  if (!baseUrl) {
    throw new Error('ESS_URL environment variable is required');
  }

  return new ESSClient({
    baseUrl,
    apiKey: process.env.ESS_API_KEY,
    timeout: process.env.ESS_TIMEOUT ? parseInt(process.env.ESS_TIMEOUT, 10) : undefined,
    debug: process.env.ESS_DEBUG === 'true',
  });
}

/**
 * Create an ESS client for production VPS.
 *
 * Connects to ess.ping-gadgets.com over HTTPS.
 * Note: fetch() handles HTTPS/TLS automatically.
 *
 * @param options - Optional overrides
 * @returns Configured ESSClient for production
 *
 * @example
 * ```typescript
 * // Default production URL
 * const ess = createProductionESSClient();
 *
 * // With API key for authenticated endpoints
 * const ess = createProductionESSClient({ apiKey: 'your-key' });
 * ```
 */
export function createProductionESSClient(options?: {
  apiKey?: string;
  timeout?: number;
  debug?: boolean;
}): ESSClient {
  return new ESSClient({
    baseUrl: 'https://ess.ping-gadgets.com',
    apiKey: options?.apiKey,
    timeout: options?.timeout ?? 30000,
    debug: options?.debug ?? false,
  });
}

/**
 * Create an ESS client that auto-selects local or production based on environment.
 *
 * - Development (NODE_ENV !== 'production'): Uses localhost:3001
 * - Production (NODE_ENV === 'production'): Uses https://ess.ping-gadgets.com
 *
 * @param options - Optional configuration
 * @returns Configured ESSClient
 */
export function createESSClient(options?: {
  apiKey?: string;
  timeout?: number;
  debug?: boolean;
}): ESSClient {
  const isProduction = process.env.NODE_ENV === 'production';

  return new ESSClient({
    baseUrl: isProduction
      ? 'https://ess.ping-gadgets.com'
      : 'http://localhost:3001',
    apiKey: options?.apiKey,
    timeout: options?.timeout ?? 30000,
    debug: options?.debug ?? (process.env.ESS_DEBUG === 'true'),
  });
}
