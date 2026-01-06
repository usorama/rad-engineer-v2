/**
 * ErrorRecoveryEngine - Advanced Orchestrator Component
 * Phase 3: Integration & Polish
 *
 * Provides error recovery mechanisms including retry with exponential backoff
 * and circuit breaker pattern for fault tolerance
 *
 * Responsibilities:
 * - Retry failed operations with exponential backoff
 * - Execute tasks with automatic recovery and checkpointing
 * - Circuit breaker to prevent cascading failures
 * - Integration with StateManager for checkpoint persistence
 *
 * Failure Modes:
 * - RETRY_EXHAUSTED: All retry attempts failed
 * - CIRCUIT_OPEN: Circuit breaker is open, blocking requests
 * - CHECKPOINT_RECOVERY_FAILED: Unable to recover from checkpoint
 */

import type { StateManager, WaveState } from "./StateManager.js";
import type { Task, WaveResult } from "./WaveOrchestrator.js";

/**
 * Retry options for exponential backoff
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000ms) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000ms) */
  maxDelay?: number;
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Circuit is closed, allowing requests */
  CLOSED = "closed",
  /** Circuit is open, blocking requests */
  OPEN = "open",
  /** Circuit is half-open, testing if service has recovered */
  HALF_OPEN = "half_open",
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Cooldown period in milliseconds before attempting recovery (default: 60000ms) */
  cooldownPeriod: number;
}

/**
 * Circuit breaker state tracking
 */
interface CircuitBreakerState {
  /** Current circuit state */
  state: CircuitState;
  /** Number of consecutive failures */
  failureCount: number;
  /** Timestamp when circuit was opened */
  openedAt?: number;
  /** Last failure timestamp */
  lastFailureTime?: number;
}

/**
 * Error codes for ErrorRecoveryEngine operations
 */
export enum ErrorRecoveryError {
  RETRY_EXHAUSTED = "RETRY_EXHAUSTED",
  CIRCUIT_OPEN = "CIRCUIT_OPEN",
  CHECKPOINT_RECOVERY_FAILED = "CHECKPOINT_RECOVERY_FAILED",
  INVALID_RETRY_OPTIONS = "INVALID_RETRY_OPTIONS",
}

/**
 * Custom error for ErrorRecoveryEngine operations
 */
export class ErrorRecoveryException extends Error {
  constructor(
    public code: ErrorRecoveryError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ErrorRecoveryException";
  }
}

/**
 * ErrorRecoveryEngine - Provides retry logic and circuit breaker for fault tolerance
 *
 * @example
 * ```ts
 * const engine = new ErrorRecoveryEngine({ stateManager });
 *
 * // Retry with exponential backoff
 * const result = await engine.retryWithBackoff(
 *   async () => fetchData(),
 *   { maxAttempts: 3, baseDelay: 1000, maxDelay: 30000 }
 * );
 *
 * // Execute with recovery and checkpointing
 * const waveResult = await engine.executeWithRecovery(tasks, "wave-1");
 *
 * // Check circuit breaker state
 * const state = engine.getCircuitBreakerState("api-service");
 * ```
 */
export class ErrorRecoveryEngine {
  private readonly stateManager?: StateManager;
  private readonly circuitBreakers: Map<string, CircuitBreakerState>;
  private readonly defaultRetryOptions: Required<RetryOptions>;
  private readonly defaultCircuitConfig: CircuitBreakerConfig;

  constructor(config?: { stateManager?: StateManager }) {
    this.stateManager = config?.stateManager;
    this.circuitBreakers = new Map();

    // Default retry options
    this.defaultRetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
    };

    // Default circuit breaker config
    this.defaultCircuitConfig = {
      failureThreshold: 5,
      cooldownPeriod: 60000, // 60 seconds
    };
  }

  /**
   * Calculate exponential backoff delay with jitter
   *
   * Formula: min(baseDelay * 2^attempt, maxDelay) + random jitter
   *
   * @param attempt - Attempt number (0-indexed)
   * @param options - Retry options
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number, options: Required<RetryOptions>): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = options.baseDelay * Math.pow(2, attempt);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

    // Add jitter (±25% random variance) to prevent thundering herd
    const jitter = Math.random() * 0.5 - 0.25; // -0.25 to +0.25
    const delayWithJitter = cappedDelay * (1 + jitter);

    return Math.max(0, Math.floor(delayWithJitter));
  }

  /**
   * Validate retry options
   *
   * @param options - Options to validate
   * @throws ErrorRecoveryException if invalid
   */
  private validateRetryOptions(options: RetryOptions): void {
    if (options.maxAttempts !== undefined && options.maxAttempts < 1) {
      throw new ErrorRecoveryException(
        ErrorRecoveryError.INVALID_RETRY_OPTIONS,
        "maxAttempts must be at least 1",
        { maxAttempts: options.maxAttempts }
      );
    }

    if (options.baseDelay !== undefined && options.baseDelay < 0) {
      throw new ErrorRecoveryException(
        ErrorRecoveryError.INVALID_RETRY_OPTIONS,
        "baseDelay must be non-negative",
        { baseDelay: options.baseDelay }
      );
    }

    if (options.maxDelay !== undefined && options.maxDelay < 0) {
      throw new ErrorRecoveryException(
        ErrorRecoveryError.INVALID_RETRY_OPTIONS,
        "maxDelay must be non-negative",
        { maxDelay: options.maxDelay }
      );
    }

    if (options.baseDelay !== undefined && options.maxDelay !== undefined && options.baseDelay > options.maxDelay) {
      throw new ErrorRecoveryException(
        ErrorRecoveryError.INVALID_RETRY_OPTIONS,
        "baseDelay cannot be greater than maxDelay",
        { baseDelay: options.baseDelay, maxDelay: options.maxDelay }
      );
    }
  }

  /**
   * Retry function with exponential backoff
   *
   * Process:
   * 1. Validate retry options
   * 2. Execute function
   * 3. On failure, calculate backoff delay
   * 4. Wait for backoff period
   * 5. Retry up to maxAttempts
   * 6. Throw error if all attempts fail
   *
   * @param fn - Function to retry
   * @param options - Retry options
   * @returns Function result
   * @throws ErrorRecoveryException if all retries exhausted
   */
  async retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    // Validate options
    if (options) {
      this.validateRetryOptions(options);
    }

    // Merge with defaults
    const retryOptions: Required<RetryOptions> = {
      maxAttempts: options?.maxAttempts ?? this.defaultRetryOptions.maxAttempts,
      baseDelay: options?.baseDelay ?? this.defaultRetryOptions.baseDelay,
      maxDelay: options?.maxDelay ?? this.defaultRetryOptions.maxDelay,
    };

    let lastError: Error | unknown;

    // Attempt execution with retries
    for (let attempt = 0; attempt < retryOptions.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt < retryOptions.maxAttempts - 1) {
          const delay = this.calculateBackoff(attempt, retryOptions);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new ErrorRecoveryException(
      ErrorRecoveryError.RETRY_EXHAUSTED,
      `All ${retryOptions.maxAttempts} retry attempts failed`,
      { lastError, attempts: retryOptions.maxAttempts }
    );
  }

  /**
   * Get or create circuit breaker state for a service
   *
   * @param service - Service identifier
   * @returns Circuit breaker state
   */
  private getCircuitBreaker(service: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, {
        state: CircuitState.CLOSED,
        failureCount: 0,
      });
    }
    return this.circuitBreakers.get(service)!;
  }

  /**
   * Update circuit breaker state after a failure
   *
   * @param service - Service identifier
   */
  private recordFailure(service: string): void {
    const breaker = this.getCircuitBreaker(service);
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    // Open circuit if threshold exceeded
    if (breaker.failureCount >= this.defaultCircuitConfig.failureThreshold) {
      breaker.state = CircuitState.OPEN;
      breaker.openedAt = Date.now();
    }
  }

  /**
   * Update circuit breaker state after a success
   *
   * @param service - Service identifier
   */
  private recordSuccess(service: string): void {
    const breaker = this.getCircuitBreaker(service);

    // Reset failure count
    breaker.failureCount = 0;

    // Close circuit if it was half-open
    if (breaker.state === CircuitState.HALF_OPEN) {
      breaker.state = CircuitState.CLOSED;
    }
  }

  /**
   * Check if circuit breaker allows execution
   *
   * @param service - Service identifier
   * @returns True if execution is allowed
   */
  private allowExecution(service: string): boolean {
    const breaker = this.getCircuitBreaker(service);

    // If circuit is closed, allow execution
    if (breaker.state === CircuitState.CLOSED) {
      return true;
    }

    // If circuit is open, check if cooldown period has elapsed
    if (breaker.state === CircuitState.OPEN) {
      if (breaker.openedAt === undefined) {
        return true;
      }

      const elapsed = Date.now() - breaker.openedAt;
      if (elapsed >= this.defaultCircuitConfig.cooldownPeriod) {
        // Transition to half-open
        breaker.state = CircuitState.HALF_OPEN;
        return true;
      }

      // Still in cooldown period
      return false;
    }

    // Half-open state - allow one test request
    return true;
  }

  /**
   * Get circuit breaker state for a service
   *
   * @param service - Service identifier
   * @returns Current circuit state
   */
  getCircuitBreakerState(service: string): CircuitState {
    const breaker = this.getCircuitBreaker(service);
    return breaker.state;
  }

  /**
   * Reset circuit breaker for a service
   *
   * @param service - Service identifier
   */
  resetCircuitBreaker(service: string): void {
    this.circuitBreakers.delete(service);
  }

  /**
   * Execute function with circuit breaker protection
   *
   * @param service - Service identifier
   * @param fn - Function to execute
   * @returns Function result
   * @throws ErrorRecoveryException if circuit is open
   */
  async executeWithCircuitBreaker<T>(service: string, fn: () => Promise<T>): Promise<T> {
    // Check if execution is allowed
    if (!this.allowExecution(service)) {
      throw new ErrorRecoveryException(
        ErrorRecoveryError.CIRCUIT_OPEN,
        `Circuit breaker is open for service: ${service}`,
        { service, state: CircuitState.OPEN }
      );
    }

    try {
      const result = await fn();
      this.recordSuccess(service);
      return result;
    } catch (error) {
      this.recordFailure(service);
      throw error;
    }
  }

  /**
   * Create wave state from tasks
   *
   * @param tasks - Tasks to execute
   * @param completedTasks - IDs of completed tasks
   * @param failedTasks - IDs of failed tasks
   * @param waveNumber - Wave number
   * @returns Wave state
   */
  private createWaveState(
    tasks: Task[],
    completedTasks: string[],
    failedTasks: string[],
    waveNumber: number
  ): WaveState {
    return {
      waveNumber,
      completedTasks,
      failedTasks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute tasks with automatic error recovery and checkpointing
   *
   * Process:
   * 1. Check for existing checkpoint
   * 2. If checkpoint exists, load state and skip completed tasks
   * 3. Execute remaining tasks with retry logic
   * 4. Save checkpoint on each failure
   * 5. Return final result
   *
   * @param tasks - Tasks to execute
   * @param stateName - Optional state name for checkpointing
   * @param executeFn - Function to execute tasks (WaveOrchestrator.executeWave)
   * @returns WaveResult with execution results
   * @throws ErrorRecoveryException if checkpoint recovery fails
   */
  async executeWithRecovery(
    tasks: Task[],
    stateName?: string,
    executeFn?: (tasks: Task[]) => Promise<WaveResult>
  ): Promise<WaveResult> {
    // If no state manager or state name, execute without recovery
    if (!this.stateManager || !stateName) {
      if (!executeFn) {
        throw new Error("executeFn is required when stateManager is not provided");
      }
      return executeFn(tasks);
    }

    // Try to load existing checkpoint
    const savedState = await this.stateManager.loadCheckpoint(stateName);

    let completedTasks: string[] = [];
    let failedTasks: string[] = [];
    let waveNumber = 1;

    if (savedState) {
      // Recover from checkpoint
      completedTasks = savedState.completedTasks;
      failedTasks = savedState.failedTasks;
      waveNumber = savedState.waveNumber + 1;

      // Filter out completed and failed tasks
      const remainingTasks = tasks.filter(
        (task) => !completedTasks.includes(task.id) && !failedTasks.includes(task.id)
      );

      // If no remaining tasks, return saved state as result
      if (remainingTasks.length === 0) {
        return {
          tasks: tasks.map((task) => ({
            id: task.id,
            success: completedTasks.includes(task.id),
            error: failedTasks.includes(task.id) ? "Previously failed" : undefined,
          })),
          waves: [],
          totalSuccess: completedTasks.length,
          totalFailure: failedTasks.length,
        };
      }

      // Execute remaining tasks
      if (!executeFn) {
        throw new Error("executeFn is required when recovering from checkpoint");
      }

      try {
        const result = await this.retryWithBackoff(() => executeFn(remainingTasks));

        // Update completed and failed tasks
        const newCompleted = result.tasks.filter((t) => t.success).map((t) => t.id);
        const newFailed = result.tasks.filter((t) => !t.success).map((t) => t.id);

        completedTasks = [...completedTasks, ...newCompleted];
        failedTasks = [...failedTasks, ...newFailed];

        // Save updated checkpoint
        const newState = this.createWaveState(tasks, completedTasks, failedTasks, waveNumber);
        await this.stateManager.saveCheckpoint(stateName, newState);

        return result;
      } catch (error) {
        // Save checkpoint on failure
        const currentState = this.createWaveState(tasks, completedTasks, failedTasks, waveNumber);
        await this.stateManager.saveCheckpoint(stateName, currentState);

        throw new ErrorRecoveryException(
          ErrorRecoveryError.CHECKPOINT_RECOVERY_FAILED,
          "Failed to execute tasks after retry from checkpoint",
          { error, completedTasks, failedTasks }
        );
      }
    }

    // No checkpoint exists, execute all tasks with retry
    if (!executeFn) {
      throw new Error("executeFn is required when no checkpoint exists");
    }

    try {
      const result = await this.retryWithBackoff(() => executeFn(tasks));

      // Save checkpoint on success
      const newCompleted = result.tasks.filter((t) => t.success).map((t) => t.id);
      const newFailed = result.tasks.filter((t) => !t.success).map((t) => t.id);

      const state = this.createWaveState(tasks, newCompleted, newFailed, waveNumber);
      await this.stateManager.saveCheckpoint(stateName, state);

      return result;
    } catch (error) {
      // Save checkpoint on failure
      const state = this.createWaveState(tasks, [], [], waveNumber);
      await this.stateManager.saveCheckpoint(stateName, state);

      throw error;
    }
  }
}
