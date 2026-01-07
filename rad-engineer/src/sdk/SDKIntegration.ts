/**
 * SDK Integration - Main class for Claude Agent SDK orchestration
 * Based on: .claude/orchestration/specs/phase-0-poc/sdk-integration/component-spec.yaml
 *
 * Manages Claude Agent SDK integration for production-quality orchestration.
 * Replaces simulation with actual SDK message loop, tool execution, and streaming.
 */

import type {
  SDKConfig,
  InitResult,
  AgentTask,
  TestResult,
  BaselineMetrics,
  Tool,
} from "./types";
import { SDKError, SDKErrorCode } from "./types";
import { ResourceMonitor } from "./ResourceMonitor";
import { ProviderFactory } from "./providers/ProviderFactory.js";
import { ProviderAutoDetector } from "../config/ProviderAutoDetector.js";
import { EvaluationLoop } from "../adaptive/EvaluationLoop.js";
import type { RoutingDecision } from "../adaptive/types.js";
import type { ChatResponse } from "./providers/types.js";

/**
 * SDK Integration class
 *
 * Main orchestrator for Claude Agent SDK operations including:
 * - SDK initialization with streaming and hooks
 * - Single agent execution with tool support
 * - Baseline metrics collection
 */
export class SDKIntegration {
  private resourceMonitor: ResourceMonitor;
  private streamingEnabled = false;
  private hooksRegistered = false;
  private model: string = "";
  private providerFactory: ProviderFactory;
  private evalsEnabled = false;
  private evaluationLoop?: EvaluationLoop;

  constructor(providerFactory?: ProviderFactory) {
    this.resourceMonitor = new ResourceMonitor();

    // Auto-detect and initialize ProviderFactory if not provided
    if (providerFactory) {
      this.providerFactory = providerFactory;
    } else {
      const factoryConfig = ProviderAutoDetector.initializeFromEnv();
      this.providerFactory = new ProviderFactory(factoryConfig);
    }
  }

  /**
   * Initialize Claude Agent SDK with streaming and tool execution
   * @param config - SDK configuration
   * @returns Initialization result
   */
  async initSDK(config: SDKConfig): Promise<InitResult> {
    const startTime = Date.now();

    try {
      // Configure streaming
      this.streamingEnabled = config.stream ?? true;

      // Register hooks if provided
      if (config.hooks) {
        this.hooksRegistered = true;
        // Hooks will be called during agent execution
      }

      // Verify model is provided (no hardcoded fallback)
      if (!config.model || config.model.trim() === "") {
        throw new SDKError(
          SDKErrorCode.INVALID_MODEL,
          "Model name must be provided in configuration",
          "Set the model in SDKConfig (e.g., via environment variable or config file)"
        );
      }

      // Store model for use in agent execution
      this.model = config.model;

      // ProviderFactory is already initialized in constructor
      // No need to directly create Anthropic client anymore

      // Check for initialization timeout
      if (Date.now() - startTime > 10000) {
        throw new SDKError(
          SDKErrorCode.INITIALIZATION_TIMEOUT,
          "SDK initialization exceeded timeout",
          "Retry with fewer hooks or faster network connection",
          10000
        );
      }

      return {
        success: true,
        sdkInitialized: true,
        streamingEnabled: this.streamingEnabled,
        hooksRegistered: this.hooksRegistered,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        sdkInitialized: false,
        streamingEnabled: false,
        hooksRegistered: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Execute single agent task with SDK message loop
   * @param task - Agent task definition
   * @returns Test result with response and metrics
   */
  async testAgent(task: AgentTask): Promise<TestResult> {
    const startTime = Date.now();
    const toolsInvoked: string[] = [];

    try {
      // Check system resources before spawning
      const resourceCheck = await this.resourceMonitor.checkResources();
      if (!resourceCheck.can_spawn_agent) {
        throw new SDKError(
          SDKErrorCode.AGENT_TIMEOUT,
          `Cannot spawn agent: ${resourceCheck.reason}`,
          "Wait for resources to free up or close other applications"
        );
      }

      // Validate prompt size (≤500 characters enforced by PromptValidator)
      if (task.prompt.length > 500) {
        console.warn(
          `Prompt exceeds 500 characters (${task.prompt.length}). May cause context issues.`
        );
      }

      // Prepare tools (default set if not provided)
      const tools = task.tools ?? this.getDefaultTools();

      // Get provider using EVALS routing or default provider
      let provider: Awaited<ReturnType<typeof this.providerFactory.getProvider>>;
      let routingDecision;
      let providerUsed: string;
      let modelUsed: string;

      if (this.evalsEnabled && this.providerFactory.isEvalsRoutingEnabled()) {
        // Use EVALS intelligent routing
        const routed = await this.providerFactory.routeProvider(task.prompt);
        provider = routed.provider;
        routingDecision = routed.decision;
        providerUsed = routed.decision.provider;
        modelUsed = this.model; // Use configured model
      } else {
        // Use default provider
        provider = await this.providerFactory.getProvider();
        const providerConfig = provider.getConfig();
        providerUsed = providerConfig.providerType;
        modelUsed = this.model;
      }

      // Verify model is configured
      if (!this.model) {
        throw new SDKError(
          SDKErrorCode.INVALID_MODEL,
          "Model not configured. Call initSDK() with a valid model.",
          "Provide a model name in SDKConfig during initialization"
        );
      }

      // Execute agent with streaming support using provider adapter
      let agentResponse = "";
      let promptTokens = 0;
      let completionTokens = 0;

      const chatRequest = {
        prompt: task.prompt,
        tools,
      };

      if (this.streamingEnabled) {
        // Streaming execution using provider adapter
        const stream = provider.streamChat(chatRequest);

        for await (const chunk of stream) {
          // Accumulate text content from stream chunks
          if (chunk.delta) {
            agentResponse += chunk.delta;
          }
          // Stream is done when done flag is set
          if (chunk.done) {
            break;
          }
        }

        // For streaming, we'll need to get usage separately or estimate
        // In Phase 1, we'll set tokens to 0 for streaming (to be improved)
        promptTokens = 0;
        completionTokens = 0;

        // Note: EVALS feedback recording not yet implemented for streaming
        // Will be added when streaming response metadata is available
      } else {
        // Non-streaming execution using provider adapter
        const response = await provider.createChat(chatRequest);

        agentResponse = response.content;
        promptTokens = response.usage.promptTokens;
        completionTokens = response.usage.completionTokens;

        // Track tool invocations if present
        if (response.toolUse) {
          // Extract tool names from toolUse response
          // This depends on the provider's toolUse format
        }

        // Record EVALS feedback after successful execution
        if (this.evalsEnabled && routingDecision) {
          await this.recordEvalsFeedback(task, response, routingDecision);
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        agentResponse,
        tokensUsed: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        duration,
        toolsInvoked,
        error: null,
        providerUsed,
        modelUsed,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Categorize error type
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("timeout")) {
        // Agent timeout
      } else if (errorMessage.includes("rate_limit")) {
        // Rate limit hit
      }

      return {
        success: false,
        agentResponse: "",
        tokensUsed: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        duration,
        toolsInvoked,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Execute baseline measurement tests for comparison data
   * @param iterations - Number of test iterations to run
   * @returns Baseline metrics across all tests
   */
  async measureBaseline(iterations: number): Promise<BaselineMetrics> {
    // Validate iterations
    if (iterations < 10) {
      throw new SDKError(
        SDKErrorCode.INSUFFICIENT_ITERATIONS,
        "Too few iterations for statistical significance",
        "Use at least 10 iterations",
        0 // N/A
      );
    }

    const startTime = Date.now();
    const results: TestResult[] = [];
    const failuresByType = {
      contextOverflow: 0,
      typeErrors: 0,
      testFailures: 0,
      timeouts: 0,
    };
    let consecutiveFailures = 0;

    // Execute test iterations
    for (let i = 0; i < iterations; i++) {
      const task: AgentTask = {
        version: "1.0",
        prompt: `Test task ${i + 1}: What is 2 + 2?`,
      };

      try {
        const result = await this.testAgent(task);
        results.push(result);

        if (!result.success) {
          consecutiveFailures++;

          // Categorize failure
          if (result.error?.message.includes("context")) {
            failuresByType.contextOverflow++;
          } else if (result.error?.message.includes("timeout")) {
            failuresByType.timeouts++;
          } else {
            failuresByType.testFailures++;
          }

          // Check for failure cluster
          if (consecutiveFailures >= 5) {
            throw new SDKError(
              SDKErrorCode.AGENT_FAILURE_CLUSTER,
              "Multiple consecutive agent failures detected",
              "Investigate root cause before continuing",
              0
            );
          }
        } else {
          consecutiveFailures = 0; // Reset on success
        }
      } catch (error) {
        if (error instanceof SDKError) {
          if (error.code === SDKErrorCode.AGENT_FAILURE_CLUSTER) {
            throw error; // Re-throw critical errors
          }
        }
        failuresByType.testFailures++;
      }

      // Check for timeout
      if (Date.now() - startTime > 1800000) {
        // 30 minutes
        throw new SDKError(
          SDKErrorCode.MEASUREMENT_TIMEOUT,
          "Baseline measurement exceeded timeout",
          "Using partial data with warning",
          1800000
        );
      }
    }

    // Calculate aggregate metrics
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const totalTokens = results.reduce(
      (sum, r) => ({
        promptTokens: sum.promptTokens + r.tokensUsed.promptTokens,
        completionTokens:
          sum.completionTokens + r.tokensUsed.completionTokens,
        totalTokens: sum.totalTokens + r.tokensUsed.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );

    return {
      totalAgents: results.length,
      successCount,
      failureCount,
      successRate: successCount / results.length,
      averageDuration: totalDuration / results.length,
      totalTokens,
      contextOverflows: failuresByType.contextOverflow,
      failuresByType,
    };
  }

  /**
   * Get default tools for agent execution
   */
  private getDefaultTools(): Tool[] {
    return [
      {
        name: "read_file",
        description: "Read the contents of a file",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Path to the file to read",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Path to the file to write",
            },
            content: {
              type: "string" as const,
              description: "Content to write to the file",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "run_command",
        description: "Execute a shell command",
        input_schema: {
          type: "object" as const,
          properties: {
            command: {
              type: "string" as const,
              description: "Command to execute",
            },
          },
          required: ["command"],
        },
      },
    ];
  }

  /**
   * Get the provider factory instance
   */
  getProviderFactory(): ProviderFactory {
    return this.providerFactory;
  }

  /**
   * Get the current provider's underlying client (for backward compatibility)
   * @deprecated Use getProviderFactory() instead
   */
  async getClient(): Promise<any | null> {
    try {
      const provider = await this.providerFactory.getProvider();
      const config = provider.getConfig();
      // Return the config which contains client info
      // In Phase 1, this returns the provider config for backward compatibility
      return config as any;
    } catch {
      return null;
    }
  }

  /**
   * Check if streaming is enabled
   */
  isStreamingEnabled(): boolean {
    return this.streamingEnabled;
  }

  /**
   * Get resource monitor instance
   */
  getResourceMonitor(): ResourceMonitor {
    return this.resourceMonitor;
  }

  /**
   * Enable EVALS intelligent routing for provider selection
   * @param banditRouter - Bandit router instance
   * @param featureExtractor - Query feature extractor
   * @param performanceStore - Performance store
   * @param evaluationLoop - Evaluation loop for quality assessment
   */
  enableEvalsRouting(
    banditRouter: any, // BanditRouter
    featureExtractor: any, // QueryFeatureExtractor
    performanceStore: any, // PerformanceStore
    evaluationLoop?: EvaluationLoop
  ): void {
    this.providerFactory.enableEvalsRouting(banditRouter, featureExtractor, performanceStore);
    this.evaluationLoop = evaluationLoop;
    this.evalsEnabled = true;
  }

  /**
   * Disable EVALS routing (use default provider)
   */
  disableEvalsRouting(): void {
    this.providerFactory.disableEvalsRouting();
    this.evaluationLoop = undefined;
    this.evalsEnabled = false;
  }

  /**
   * Check if EVALS routing is enabled
   */
  isEvalsRoutingEnabled(): boolean {
    return this.evalsEnabled && this.providerFactory.isEvalsRoutingEnabled();
  }

  /**
   * Record feedback for EVALS routing (placeholder for Phase 1)
   * @param result - Test result with provider information
   * @param feedback - Quality score or feedback metric
   * @deprecated Use private recordEvalsFeedback with task/response/decision instead
   */
  async recordEvalsFeedbackLegacy(result: TestResult, feedback: number): Promise<void> {
    // Placeholder for backward compatibility
    // This method is kept for API compatibility but does nothing
    // The actual recording happens in the private recordEvalsFeedback method
    if (!this.evalsEnabled) {
      return;
    }

    console.debug(
      `[SDKIntegration] Feedback recording placeholder: ` +
      `provider=${result.providerUsed}, model=${result.modelUsed}, score=${feedback}`
    );
  }

  /**
   * Record feedback for EVALS PerformanceStore after agent execution
   * Evaluates response quality and updates performance metrics.
   *
   * @param task - The agent task that was executed
   * @param response - The provider's chat response
   * @param decision - The routing decision that was made
   * @private
   */
  private async recordEvalsFeedback(
    task: AgentTask,
    response: ChatResponse,
    decision: RoutingDecision
  ): Promise<void> {
    // Skip if EVALS is not enabled or EvaluationLoop is not available
    if (!this.evalsEnabled || !this.evaluationLoop) {
      return;
    }

    try {
      // Calculate cost from token usage (simplified cost model)
      // In production, this would use actual provider pricing
      const cost = this.calculateCost(response.usage);

      // Evaluate response quality using EvaluationLoop
      const evaluationResult = await this.evaluationLoop.evaluateAndUpdate(
        task.prompt,
        response.content,
        decision.provider,
        decision.model,
        task.context?.files, // Context files if available
        cost,
        response.metadata?.finishReason === "stop" ? 0 : 100 // Latency indicator
      );

      // Log evaluation results for debugging
      console.debug(
        `[SDKIntegration] EVALS feedback recorded: ` +
        `provider=${decision.provider}, ` +
        `model=${decision.model}, ` +
        `quality=${evaluationResult.metrics.overall.toFixed(3)}, ` +
        `success=${evaluationResult.success}, ` +
        `cost=${cost.toFixed(4)}`
      );
    } catch (error) {
      // Log error but don't fail the execution
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[SDKIntegration] Failed to record EVALS feedback: ${errorMessage}`
      );
    }
  }

  /**
   * Calculate cost from token usage
   * Simplified cost model for Phase 1
   * @private
   */
  private calculateCost(usage: ChatResponse["usage"]): number {
    // Simplified cost model (in dollars per 1M tokens)
    const INPUT_COST_PER_1M = 3.0; // Approximate for Claude Sonnet
    const OUTPUT_COST_PER_1M = 15.0;

    const inputCost = (usage.promptTokens / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (usage.completionTokens / 1_000_000) * OUTPUT_COST_PER_1M;

    return inputCost + outputCost;
  }
}
