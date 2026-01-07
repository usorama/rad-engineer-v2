/**
 * WaveOrchestrator - Advanced Orchestrator Component
 * Phase 2: Advanced Features
 *
 * Orchestrates task execution in waves (batches) with resource management
 * Ensures maxConcurrent limits are respected during wave execution
 *
 * Responsibilities:
 * - Split tasks into waves based on ResourceManager capacity
 * - Execute tasks in waves with proper resource checking
 * - Handle task failures with continueOnError option
 * - Integrate with PromptValidator and ResponseParser
 *
 * Failure Modes:
 * - WAVE_EXECUTION_FAILED: Task execution fails
 * - TASK_VALIDATION_FAILED: Prompt validation fails
 * - RESPONSE_PARSE_FAILED: Response parsing fails
 */

import type { ResourceManager } from "@/core/index.js";
import type { PromptValidator } from "@/core/index.js";
import type { ResponseParser, AgentResponse } from "@/core/index.js";
import type { SDKIntegration } from "@/sdk/index.js";

/**
 * Task definition for wave execution
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Task prompt (will be validated) */
  prompt: string;
  /** Task IDs that must complete first (optional) */
  dependencies?: string[];
}

/**
 * Wave execution options
 */
export interface WaveOptions {
  /** Override default wave size (default: from ResourceManager) */
  waveSize?: number;
  /** Continue on task failure (default: false) */
  continueOnError?: boolean;
}

/**
 * Result of a single task execution
 */
export interface TaskResult {
  /** Task identifier */
  id: string;
  /** Whether task succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Parsed agent response if successful */
  response?: AgentResponse;
  /** Provider used for task execution (from SDKIntegration) */
  providerUsed?: string;
  /** Model used for task execution (from SDKIntegration) */
  modelUsed?: string;
}

/**
 * Summary of a single wave execution
 */
export interface WaveSummary {
  /** Wave number (1-indexed) */
  waveNumber: number;
  /** Number of tasks in wave */
  taskCount: number;
  /** Number of successful tasks */
  successCount: number;
  /** Number of failed tasks */
  failureCount: number;
}

/**
 * Result of wave execution
 */
export interface WaveResult {
  /** Results for all tasks */
  tasks: TaskResult[];
  /** Summary of each wave */
  waves: WaveSummary[];
  /** Total success count */
  totalSuccess: number;
  /** Total failure count */
  totalFailure: number;
}

/**
 * Error codes for WaveOrchestrator operations
 */
export enum WaveOrchestratorError {
  WAVE_EXECUTION_FAILED = "WAVE_EXECUTION_FAILED",
  TASK_VALIDATION_FAILED = "TASK_VALIDATION_FAILED",
  RESPONSE_PARSE_FAILED = "RESPONSE_PARSE_FAILED",
  RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED",
}

/**
 * Custom error for WaveOrchestrator operations
 */
export class WaveOrchestratorException extends Error {
  constructor(
    public code: WaveOrchestratorError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WaveOrchestratorException";
  }
}

/**
 * WaveOrchestrator - Executes tasks in waves with resource management
 *
 * @example
 * ```ts
 * const orchestrator = new WaveOrchestrator({
 *   resourceManager,
 *   promptValidator,
 *   responseParser,
 * });
 *
 * const result = await orchestrator.executeWave(tasks, {
 *   waveSize: 2,
 *   continueOnError: true,
 * });
 * ```
 */
export class WaveOrchestrator {
  private readonly resourceManager: ResourceManager;
  private readonly promptValidator: PromptValidator;
  private readonly responseParser: ResponseParser;
  private readonly sdk: SDKIntegration;

  constructor(config: {
    resourceManager: ResourceManager;
    promptValidator: PromptValidator;
    responseParser: ResponseParser;
    sdk: SDKIntegration;
  }) {
    this.resourceManager = config.resourceManager;
    this.promptValidator = config.promptValidator;
    this.responseParser = config.responseParser;
    this.sdk = config.sdk;
  }

  /**
   * Calculate optimal wave size from ResourceManager
   *
   * @returns Max concurrent agents from ResourceManager
   */
  async calculateWaveSize(): Promise<number> {
    return this.resourceManager.getMaxConcurrent();
  }

  /**
   * Split tasks into waves of specified size
   *
   * @param tasks - Tasks to split
   * @param waveSize - Size of each wave
   * @returns Array of task waves
   */
  splitIntoWaves(tasks: Task[], waveSize: number): Task[][] {
    if (waveSize < 1) {
      throw new Error("waveSize must be at least 1");
    }

    const waves: Task[][] = [];
    for (let i = 0; i < tasks.length; i += waveSize) {
      waves.push(tasks.slice(i, i + waveSize));
    }

    return waves;
  }

  /**
   * Execute tasks in waves with resource limits
   *
   * Process:
   * 1. Calculate wave size (or use custom option)
   * 2. Split tasks into waves
   * 3. For each wave:
   *    - Wait for resource availability
   *    - Execute tasks concurrently
   *    - Validate prompts before execution
   *    - Parse responses after execution
   *    - Handle failures based on continueOnError
   *
   * @param tasks - Tasks to execute
   * @param options - Wave execution options
   * @returns WaveResult with all task results and wave summaries
   */
  async executeWave(tasks: Task[], options?: WaveOptions): Promise<WaveResult> {
    const results: TaskResult[] = [];
    const waveSummaries: WaveSummary[] = [];

    // Determine wave size
    const defaultWaveSize = await this.calculateWaveSize();
    const waveSize = options?.waveSize ?? defaultWaveSize;

    // Split tasks into waves
    const waves = this.splitIntoWaves(tasks, waveSize);

    // Execute each wave sequentially
    for (let waveNumber = 0; waveNumber < waves.length; waveNumber++) {
      const wave = waves[waveNumber];
      const waveResults: TaskResult[] = [];

      // Wait for resource availability for each task in wave
      for (const task of wave) {
        // Check if dependencies are satisfied
        if (task.dependencies && task.dependencies.length > 0) {
          const dependenciesMet = task.dependencies.every((depId) => {
            // Check both previous wave results and current wave results
            const depResult = results.find((r) => r.id === depId) ||
                             waveResults.find((r) => r.id === depId);
            return depResult && depResult.success;
          });

          if (!dependenciesMet) {
            waveResults.push({
              id: task.id,
              success: false,
              error: "Dependencies not satisfied",
            });
            continue;
          }
        }

        // Wait for resource slot
        let canSpawn = false;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite waiting

        while (!canSpawn && attempts < maxAttempts) {
          canSpawn = await this.resourceManager.canSpawnAgent();
          if (!canSpawn) {
            // Wait 100ms before retrying
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
        }

        if (!canSpawn) {
          const errorMsg = "Resource limit exceeded - could not acquire slot";
          waveResults.push({
            id: task.id,
            success: false,
            error: errorMsg,
          });

          if (!options?.continueOnError) {
            // Stop execution on first error
            break;
          }
          continue;
        }

        // Validate prompt
        const validationResult = await this.promptValidator.validate(task.prompt);
        if (!validationResult.valid) {
          waveResults.push({
            id: task.id,
            success: false,
            error: `Task validation failed: ${validationResult.errors.join("; ")}`,
          });

          if (!options?.continueOnError) {
            break;
          }
          continue;
        }

        // Execute task via SDKIntegration
        try {
          const taskResult = await this.executeTask(task);
          waveResults.push(taskResult);

          // Check if we should continue on error
          if (!taskResult.success && !options?.continueOnError) {
            break;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          waveResults.push({
            id: task.id,
            success: false,
            error: `Task execution failed: ${errorMsg}`,
          });

          if (!options?.continueOnError) {
            break;
          }
        }
      }

      // Add wave results to overall results
      results.push(...waveResults);

      // Calculate wave summary
      const successCount = waveResults.filter((r) => r.success).length;
      const failureCount = waveResults.filter((r) => !r.success).length;

      waveSummaries.push({
        waveNumber: waveNumber + 1,
        taskCount: wave.length,
        successCount,
        failureCount,
      });

      // If wave had failures and continueOnError is false, stop
      const waveFailed = waveResults.some((r) => !r.success);
      if (waveFailed && !options?.continueOnError) {
        break;
      }
    }

    // Calculate totals
    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailure = results.filter((r) => !r.success).length;

    return {
      tasks: results,
      waves: waveSummaries,
      totalSuccess,
      totalFailure,
    };
  }

  /**
   * Execute a single task using SDKIntegration
   *
   * Process:
   * 1. Call sdk.testAgent() with task prompt
   * 2. Parse response using responseParser
   * 3. Return TaskResult with response and provider/model info
   *
   * @param task - Task to execute
   * @returns TaskResult with execution outcome
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    try {
      // Execute agent via SDKIntegration
      const agentTask = {
        version: "1.0" as const,
        prompt: task.prompt,
      };

      const testResult = await this.sdk.testAgent(agentTask);

      // Check if execution succeeded
      if (!testResult.success) {
        return {
          id: task.id,
          success: false,
          error: testResult.error?.message || "Agent execution failed",
        };
      }

      // Parse agent response using ResponseParser
      const parseResult = this.responseParser.parse(testResult.agentResponse);

      if (!parseResult.success) {
        return {
          id: task.id,
          success: false,
          error: `Failed to parse agent response: ${parseResult.error}`,
        };
      }

      // Return successful task result with provider/model info
      return {
        id: task.id,
        success: true,
        response: parseResult.data,
        providerUsed: testResult.providerUsed,
        modelUsed: testResult.modelUsed,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        id: task.id,
        success: false,
        error: `Task execution failed: ${errorMsg}`,
      };
    }
  }
}
