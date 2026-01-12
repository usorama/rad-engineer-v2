/**
 * Type definitions for SDK Integration component
 * Based on: .claude/orchestration/specs/phase-0-poc/sdk-integration/component-spec.yaml
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// Re-export Tool type
export { Tool };
export { Anthropic };

/**
 * Configuration for SDK initialization
 */
export interface SDKConfig {
  /** Anthropic API key from environment variable (optional for local providers) */
  apiKey?: string;
  /** Model identifier (e.g., 'claude-3-5-sonnet-20241022') */
  model: string;
  /** Custom base URL (e.g., 'https://api.z.ai/api/anthropic' for GLM) */
  baseUrl?: string;
  /** Enable streaming responses */
  stream?: boolean;
  /** Event hooks for tool execution lifecycle */
  hooks?: {
    on_tool_start?: (tool: string) => void;
    on_tool_end?: (tool: string, result: unknown) => void;
  };
}

/**
 * Result of SDK initialization
 */
export interface InitResult {
  success: boolean;
  sdkInitialized: boolean;
  streamingEnabled: boolean;
  hooksRegistered: boolean;
  error: Error | null;
}


/**
 * Task context for agent execution
 */
export interface TaskContext {
  files: string[];
  history: string[];
  [key: string]: unknown;
}

/**
 * Agent task definition
 */
export interface AgentTask {
  /** Schema version for forward compatibility */
  version: "1.0";
  /** Task prompt for agent (≤500 characters enforced by PromptValidator) */
  prompt: string;
  /** Available tools for agent execution */
  tools?: Tool[];
  /** Task execution context */
  context?: TaskContext;
}

/**
 * Token usage metrics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Result of single agent execution
 */
export interface TestResult {
  success: boolean;
  agentResponse: string;
  tokensUsed: TokenUsage;
  duration: number; // milliseconds
  toolsInvoked: string[];
  error: Error | null;
  /** Provider used for this execution (when using ProviderFactory) */
  providerUsed?: string;
  /** Model used for this execution (when using ProviderFactory) */
  modelUsed?: string;
}

/**
 * Baseline metrics across multiple test runs
 */
export interface BaselineMetrics {
  totalAgents: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageDuration: number;
  totalTokens: TokenUsage;
  contextOverflows: number;
  failuresByType: {
    contextOverflow: number;
    typeErrors: number;
    testFailures: number;
    timeouts: number;
  };
}

/**
 * System resource metrics
 */
export interface ResourceMetrics {
  kernel_task_cpu: number;
  memory_pressure: number;
  process_count: number;
  can_spawn_agent: boolean;
  timestamp: string;
  /** Optional thread count (macOS-specific) */
  thread_count?: number;
}

/**
 * Resource check result
 */
export interface ResourceCheckResult {
  can_spawn_agent: boolean;
  metrics: ResourceMetrics;
  reason?: string;
}

/**
 * Error codes for SDK operations
 */
export enum SDKErrorCode {
  API_KEY_MISSING = "API_KEY_MISSING",
  SDK_INSTALL_FAILED = "SDK_INSTALL_FAILED",
  INITIALIZATION_TIMEOUT = "INITIALIZATION_TIMEOUT",
  INVALID_MODEL = "INVALID_MODEL",
  AGENT_TIMEOUT = "AGENT_TIMEOUT",
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",
  STREAM_INTERRUPTED = "STREAM_INTERRUPTED",
  CONTEXT_OVERFLOW = "CONTEXT_OVERFLOW",
  INSUFFICIENT_ITERATIONS = "INSUFFICIENT_ITERATIONS",
  MEASUREMENT_TIMEOUT = "MEASUREMENT_TIMEOUT",
  AGENT_FAILURE_CLUSTER = "AGENT_FAILURE_CLUSTER",
}

/**
 * Custom error for SDK operations
 */
export class SDKError extends Error {
  constructor(
    public code: SDKErrorCode,
    message: string,
    public recovery?: string,
    public timeout?: number,
  ) {
    super(message);
    this.name = "SDKError";
  }
}
