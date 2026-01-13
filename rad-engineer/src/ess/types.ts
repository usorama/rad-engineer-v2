/**
 * ESS (Engineering Support System) Client Types
 *
 * Type definitions for the ESS Gateway HTTP API.
 * ESS provides hybrid search (Qdrant vector + Neo4j graph) for codebase understanding.
 */

// ============================================================================
// Request Types
// ============================================================================

export interface ESSQueryRequest {
  /** The natural language query */
  query: string;
  /** Optional project name to scope the search */
  project?: string;
  /** Optional context strings to include */
  context?: string[];
  /** Query mode: one-shot or conversational */
  mode?: 'one-shot' | 'conversational';
}

export interface ESSConversationContinueRequest {
  /** Answers to clarifying questions from the previous response */
  answers: Record<string, string>;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ESSQueryResponse {
  /** Unique request ID */
  requestId: string;
  /** ISO timestamp */
  timestamp: string;
  /** The synthesized answer */
  answer: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Sources from Qdrant vector search */
  qdrantSources: ESSQdrantSource[];
  /** Sources from Neo4j graph search */
  neo4jSources: ESSNeo4jSource[];
  /** For conversational mode: conversation ID to continue */
  conversationId?: string;
  /** Clarifying questions if more info needed */
  clarifyingQuestions?: ESSClarifyingQuestion[];
  /** Warnings about degraded service */
  warnings?: string[];
}

export interface ESSQdrantSource {
  /** File path */
  path: string;
  /** Matched content snippet */
  content: string;
  /** Similarity score */
  score: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface ESSNeo4jSource {
  /** Node type (File, Function, Class, etc.) */
  type: string;
  /** Node name */
  name: string;
  /** File path */
  path: string;
  /** Relationships to other nodes */
  relationships?: ESSRelationship[];
}

export interface ESSRelationship {
  /** Relationship type (IMPORTS, CALLS, EXTENDS, etc.) */
  type: string;
  /** Target node name */
  target: string;
  /** Target node type */
  targetType: string;
}

export interface ESSClarifyingQuestion {
  /** Question ID */
  id: string;
  /** The question text */
  question: string;
  /** Suggested answers */
  options?: string[];
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface ESSHealthResponse {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** ISO timestamp */
  timestamp: string;
  /** Individual service health */
  services: {
    neo4j: ESSServiceHealth;
    qdrant: ESSServiceHealth;
    redis: ESSServiceHealth;
    ollama: ESSServiceHealth;
  };
}

export interface ESSServiceHealth {
  /** Service status */
  status: 'ok' | 'error' | 'unknown';
  /** Response latency in ms */
  latency?: number;
  /** Error message if status is error */
  error?: string;
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface ESSClientConfig {
  /** ESS Gateway URL (e.g., http://localhost:3001 or https://ess.yourvps.com) */
  baseUrl: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Optional API key for authenticated endpoints */
  apiKey?: string;
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class ESSError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ESSError';
  }
}

export class ESSConnectionError extends ESSError {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = 'ESSConnectionError';
  }
}

export class ESSTimeoutError extends ESSError {
  constructor(public readonly timeoutMs: number) {
    super(`ESS request timed out after ${timeoutMs}ms`);
    this.name = 'ESSTimeoutError';
  }
}
