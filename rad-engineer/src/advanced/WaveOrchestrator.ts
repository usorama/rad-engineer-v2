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
import type { Config } from "@/config/schema.js";
import { HierarchicalMemory } from "@/memory/HierarchicalMemory.js";
import { ScopeLevel } from "@/memory/Scope.js";

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
  /** Custom goal for memory scope context (default: "Wave execution") */
  memoryGoal?: string;
  /** Enable memory-aware resource calculation (default: true) */
  useMemoryBudgets?: boolean;
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
  private readonly memory: HierarchicalMemory;
  private readonly config: Config;
  private globalScopeId: string | null = null;

  constructor(deps: {
    resourceManager: ResourceManager;
    promptValidator: PromptValidator;
    responseParser: ResponseParser;
    sdk: SDKIntegration;
    memory: HierarchicalMemory;
    config: Config;
  }) {
    this.resourceManager = deps.resourceManager;
    this.promptValidator = deps.promptValidator;
    this.responseParser = deps.responseParser;
    this.sdk = deps.sdk;
    this.memory = deps.memory;
    this.config = deps.config;

    // Log agent mode at initialization
    console.log(`[WaveOrchestrator] Initialized with ${this.config.useRealAgents ? "REAL" : "MOCK"} agents`);
  }

  /**
   * Calculate optimal wave size from ResourceManager and memory constraints
   *
   * Considers both resource limits and memory budget utilization to prevent
   * memory exhaustion during wave execution
   *
   * @param useMemoryBudgets - Whether to consider memory constraints (default: true)
   * @returns Optimal wave size considering resources and memory
   */
  async calculateWaveSize(useMemoryBudgets: boolean = true): Promise<number> {
    const resourceLimit = await this.resourceManager.getMaxConcurrent();

    if (!useMemoryBudgets) {
      return resourceLimit;
    }

    // Check memory budget status to adjust wave size
    const memoryMetrics = this.memory.getMetrics();

    // If memory utilization is high, reduce wave size to prevent exhaustion
    if (memoryMetrics.budgetUtilization.task > 80) {
      return Math.max(1, Math.floor(resourceLimit * 0.5)); // Reduce by 50%
    } else if (memoryMetrics.budgetUtilization.task > 60) {
      return Math.max(1, Math.floor(resourceLimit * 0.75)); // Reduce by 25%
    }

    return resourceLimit;
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
   * Initialize memory context for wave execution
   *
   * Creates a GLOBAL scope for the entire wave execution session
   * to track orchestration state and artifacts
   *
   * @param goal - Description of the wave execution goal
   */
  private async initializeMemoryContext(goal: string): Promise<void> {
    if (!this.globalScopeId) {
      this.globalScopeId = this.memory.createScope({
        goal,
        level: ScopeLevel.GLOBAL,
      });

      // Add initial orchestration event
      this.memory.addEvent({
        id: "wave_orchestration_start",
        type: "STATE_CHANGE",
        timestamp: new Date(),
        data: {
          action: "orchestration_started",
          goal,
          memoryMetrics: this.memory.getMetrics(),
        },
      });
    }
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

    // Initialize memory context for wave execution
    await this.initializeMemoryContext(options?.memoryGoal || "Wave execution");

    try {
      // Determine wave size with memory awareness
      const useMemoryBudgets = options?.useMemoryBudgets ?? true;
      const defaultWaveSize = await this.calculateWaveSize(useMemoryBudgets);
      const waveSize = options?.waveSize ?? defaultWaveSize;

      // Store wave configuration in memory
      this.memory.setArtifact("wave_config", {
        totalTasks: tasks.length,
        waveSize,
        useMemoryBudgets,
        startTime: new Date().toISOString(),
      });

    // Split tasks into waves
    const waves = this.splitIntoWaves(tasks, waveSize);

      // Execute each wave sequentially
      for (let waveNumber = 0; waveNumber < waves.length; waveNumber++) {
        const wave = waves[waveNumber];
        const waveResults: TaskResult[] = [];

        // Create TASK scope for this wave
        const waveScopeId = this.memory.createScope({
          goal: `Wave ${waveNumber + 1} - Execute ${wave.length} tasks`,
          level: ScopeLevel.TASK,
          complexity: wave.length / waveSize, // Complexity based on wave utilization
        });

        // Store wave start event
        this.memory.addEvent({
          id: `wave_${waveNumber + 1}_start`,
          type: "STATE_CHANGE",
          timestamp: new Date(),
          data: {
            waveNumber: waveNumber + 1,
            taskCount: wave.length,
            taskIds: wave.map(t => t.id),
            memoryMetrics: this.memory.getMetrics(),
          },
        });

        // Wait for resource availability for each task in wave
        for (const task of wave) {
          // Create LOCAL scope for this specific task
          const taskScopeId = this.memory.createScope({
            goal: `Execute task: ${task.id}`,
            level: ScopeLevel.LOCAL,
          });

          // Store task start event
          this.memory.addEvent({
            id: `task_${task.id}_start`,
            type: "STATE_CHANGE",
            timestamp: new Date(),
            data: {
              taskId: task.id,
              taskPrompt: task.prompt,
              dependencies: task.dependencies || [],
              waveNumber: waveNumber + 1,
            },
          });

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
            const taskResult = {
              id: task.id,
              success: false,
              error: errorMsg,
            };
            waveResults.push(taskResult);

            // Store failure in memory
            this.memory.setArtifact(`task_${task.id}_result`, taskResult);
            this.memory.addEvent({
              id: `task_${task.id}_failed`,
              type: "ERROR",
              timestamp: new Date(),
              data: { error: errorMsg, reason: "resource_limit" },
            });

            // Close task scope with failure summary
            await this.memory.closeScope(`Task ${task.id} failed: ${errorMsg}`);

            if (!options?.continueOnError) {
              // Stop execution on first error
              break;
            }
            continue;
          }

          // Validate prompt
          const validationResult = await this.promptValidator.validate(task.prompt);
          if (!validationResult.valid) {
            const errorMsg = `Task validation failed: ${validationResult.errors.join("; ")}`;
            const taskResult = {
              id: task.id,
              success: false,
              error: errorMsg,
            };
            waveResults.push(taskResult);

            // Store validation failure in memory
            this.memory.setArtifact(`task_${task.id}_result`, taskResult);
            this.memory.addEvent({
              id: `task_${task.id}_validation_failed`,
              type: "ERROR",
              timestamp: new Date(),
              data: {
                error: errorMsg,
                reason: "validation_failed",
                validationErrors: validationResult.errors
              },
            });

            // Close task scope with validation failure summary
            await this.memory.closeScope(`Task ${task.id} validation failed: ${errorMsg}`);

            if (!options?.continueOnError) {
              break;
            }
            continue;
          }

          // Execute task via SDKIntegration
          try {
            const taskResult = await this.executeTask(task);
            waveResults.push(taskResult);

            // Store task result in memory
            this.memory.setArtifact(`task_${task.id}_result`, taskResult);

            if (taskResult.success) {
              // Store success event and response
              this.memory.addEvent({
                id: `task_${task.id}_completed`,
                type: "AGENT_OUTPUT",
                timestamp: new Date(),
                data: {
                  taskId: task.id,
                  response: taskResult.response,
                  providerUsed: taskResult.providerUsed,
                  modelUsed: taskResult.modelUsed,
                },
              });

              // Close task scope with success summary
              await this.memory.closeScope(`Task ${task.id} completed successfully`);
            } else {
              // Store failure event
              this.memory.addEvent({
                id: `task_${task.id}_failed`,
                type: "ERROR",
                timestamp: new Date(),
                data: {
                  taskId: task.id,
                  error: taskResult.error,
                  reason: "execution_failed",
                },
              });

              // Close task scope with failure summary
              await this.memory.closeScope(`Task ${task.id} failed: ${taskResult.error}`);
            }

            // Check if we should continue on error
            if (!taskResult.success && !options?.continueOnError) {
              break;
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const taskResult = {
              id: task.id,
              success: false,
              error: `Task execution failed: ${errorMsg}`,
            };
            waveResults.push(taskResult);

            // Store exception in memory
            this.memory.setArtifact(`task_${task.id}_result`, taskResult);
            this.memory.addEvent({
              id: `task_${task.id}_exception`,
              type: "ERROR",
              timestamp: new Date(),
              data: {
                taskId: task.id,
                error: errorMsg,
                reason: "execution_exception",
              },
            });

            // Close task scope with exception summary
            await this.memory.closeScope(`Task ${task.id} threw exception: ${errorMsg}`);

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

        const waveSummary = {
          waveNumber: waveNumber + 1,
          taskCount: wave.length,
          successCount,
          failureCount,
        };

        waveSummaries.push(waveSummary);

        // Store wave completion in memory
        this.memory.setArtifact(`wave_${waveNumber + 1}_summary`, waveSummary);
        this.memory.addEvent({
          id: `wave_${waveNumber + 1}_completed`,
          type: "STATE_CHANGE",
          timestamp: new Date(),
          data: {
            ...waveSummary,
            memoryMetrics: this.memory.getMetrics(),
          },
        });

        // Close wave scope with summary
        const waveStatus = failureCount > 0 ?
          `Wave ${waveNumber + 1} completed with ${failureCount} failures` :
          `Wave ${waveNumber + 1} completed successfully`;
        await this.memory.closeScope(waveStatus);

        // If wave had failures and continueOnError is false, stop
        const waveFailed = waveResults.some((r) => !r.success);
        if (waveFailed && !options?.continueOnError) {
          break;
        }
      }

      // Calculate totals
      const totalSuccess = results.filter((r) => r.success).length;
      const totalFailure = results.filter((r) => !r.success).length;

      // Store final orchestration results in memory
      const finalResult = {
        tasks: results,
        waves: waveSummaries,
        totalSuccess,
        totalFailure,
      };

      this.memory.setArtifact("orchestration_result", finalResult);
      this.memory.addEvent({
        id: "orchestration_completed",
        type: "STATE_CHANGE",
        timestamp: new Date(),
        data: {
          totalTasks: tasks.length,
          totalSuccess,
          totalFailure,
          wavesExecuted: waveSummaries.length,
          finalMemoryMetrics: this.memory.getMetrics(),
        },
      });

      return finalResult;
    } catch (error) {
      // Handle unexpected errors during wave execution
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.memory.addEvent({
        id: "orchestration_failed",
        type: "ERROR",
        timestamp: new Date(),
        data: {
          error: errorMsg,
          tasksAttempted: results.length,
          wavesCompleted: waveSummaries.length,
        },
      });

      throw error;
    } finally {
      // Always close the global orchestration scope
      if (this.globalScopeId) {
        const finalStatus = results.length === 0 ? "No tasks executed" :
          `Orchestration completed: ${results.filter(r => r.success).length}/${results.length} tasks successful`;
        await this.memory.closeScope(finalStatus);
        this.globalScopeId = null; // Reset for next execution
      }
    }
  }

  /**
   * Execute a single task using SDKIntegration or mock response
   *
   * Process:
   * 1. If config.useRealAgents=false, return mock response
   * 2. If config.useRealAgents=true, call sdk.testAgent() with task prompt
   * 3. Parse response using responseParser
   * 4. Return TaskResult with response and provider/model info
   *
   * @param task - Task to execute
   * @returns TaskResult with execution outcome
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    try {
      // Mock mode - return predefined success response
      if (!this.config.useRealAgents) {
        console.log(`[WaveOrchestrator] Executing task ${task.id} in MOCK mode`);

        const mockResponse: AgentResponse = {
          success: true,
          filesModified: ["/mock/test.ts"],
          testsWritten: ["/mock/test.test.ts"],
          summary: "Mock task completed successfully",
          errors: [],
          nextSteps: [],
        };

        return {
          id: task.id,
          success: true,
          response: mockResponse,
          providerUsed: "mock",
          modelUsed: "mock-model",
        };
      }

      // Real agent mode - use SDK integration
      console.log(`[WaveOrchestrator] Executing task ${task.id} with REAL agent`);

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
