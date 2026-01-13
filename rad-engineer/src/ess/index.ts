/**
 * ESS (Engineering Support System) Client Module
 *
 * Provides HTTP client for querying the ESS Gateway API.
 * ESS combines Qdrant vector search and Neo4j graph traversal
 * for complete codebase understanding.
 *
 * @module ess
 */

export {
  ESSClient,
  createLocalESSClient,
  createESSClientFromEnv,
  createProductionESSClient,
  createESSClient,
} from './ESSClient.js';

export type {
  ESSClientConfig,
  ESSQueryRequest,
  ESSQueryResponse,
  ESSConversationContinueRequest,
  ESSHealthResponse,
  ESSServiceHealth,
  ESSQdrantSource,
  ESSNeo4jSource,
  ESSRelationship,
  ESSClarifyingQuestion,
} from './types.js';

export {
  ESSError,
  ESSConnectionError,
  ESSTimeoutError,
} from './types.js';
