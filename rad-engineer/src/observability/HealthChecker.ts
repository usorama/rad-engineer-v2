/**
 * Health Checker Implementation
 *
 * Provides liveness and readiness health check capabilities for the platform.
 */

import type {
  HealthCheckFunction,
  HealthCheckResult,
  AggregatedHealthResult,
  HealthCheckerConfig,
  RegisteredHealthCheck,
  HealthStatus,
} from "./HealthCheck.js";

/**
 * Default timeout for health checks (5 seconds)
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Health Checker class for managing liveness and readiness probes
 */
export class HealthChecker {
  private checks: Map<string, RegisteredHealthCheck> = new Map();
  private timeout: number;

  /**
   * Create a new HealthChecker instance
   * @param config - Configuration options
   */
  constructor(config: HealthCheckerConfig = {}) {
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Register a health check
   * @param name - Unique name for the health check
   * @param fn - Function that performs the health check
   * @param required - Whether this check is required for readiness (default: true)
   */
  registerCheck(
    name: string,
    fn: HealthCheckFunction,
    required: boolean = true
  ): void {
    if (this.checks.has(name)) {
      throw new Error(`Health check '${name}' is already registered`);
    }

    this.checks.set(name, { name, fn, required });
  }

  /**
   * Unregister a health check
   * @param name - Name of the health check to remove
   * @returns true if check was removed, false if not found
   */
  unregisterCheck(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * Execute a single health check with timeout
   * @param check - The registered health check to execute
   * @returns Promise resolving to the health check result
   */
  private async executeCheck(
    check: RegisteredHealthCheck
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check '${check.name}' timed out after ${this.timeout}ms`));
        }, this.timeout);
      });

      // Race between the check and timeout
      const result = await Promise.race([check.fn(), timeoutPromise]);

      const latency = Date.now() - startTime;

      return {
        ...result,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      return {
        status: 'unhealthy',
        message,
        latency,
      };
    }
  }

  /**
   * Liveness endpoint - basic alive check
   * Returns healthy if the process is running
   * @returns Promise resolving to aggregated health result
   */
  async liveness(): Promise<AggregatedHealthResult> {
    // Liveness is simple - if we can execute this code, we're alive
    const timestamp = new Date().toISOString();

    return {
      status: 'healthy',
      checks: {
        process: {
          status: 'healthy',
          message: 'Process is running',
          latency: 0,
        },
      },
      timestamp,
    };
  }

  /**
   * Readiness endpoint - all dependencies ready check
   * Returns healthy only if all registered checks pass
   * @returns Promise resolving to aggregated health result
   */
  async readiness(): Promise<AggregatedHealthResult> {
    const timestamp = new Date().toISOString();

    // If no checks registered, consider ready
    if (this.checks.size === 0) {
      return {
        status: 'healthy',
        checks: {},
        timestamp,
      };
    }

    // Execute all checks in parallel
    const checkPromises = Array.from(this.checks.values()).map(
      async (check) => {
        const result = await this.executeCheck(check);
        return { name: check.name, result, required: check.required ?? true };
      }
    );

    const results = await Promise.all(checkPromises);

    // Build checks object
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus: HealthStatus = 'healthy';

    for (const { name, result, required } of results) {
      checks[name] = result;

      // If any required check is unhealthy, overall status is unhealthy
      if (required && result.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      checks,
      timestamp,
    };
  }

  /**
   * Get all registered check names
   * @returns Array of registered check names
   */
  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys());
  }

  /**
   * Clear all registered checks
   */
  clearChecks(): void {
    this.checks.clear();
  }
}
