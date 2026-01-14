/**
 * Health Check Types and Interfaces
 *
 * Defines types for health check operations including liveness and readiness probes.
 */

/**
 * Health check status enumeration
 */
export type HealthStatus = 'healthy' | 'unhealthy';

/**
 * Individual health check result
 */
export interface HealthCheckResult {
  /** Status of the health check */
  status: HealthStatus;
  /** Optional message describing the status */
  message?: string;
  /** Latency of the check in milliseconds */
  latency?: number;
}

/**
 * Aggregated health check response
 */
export interface AggregatedHealthResult {
  /** Overall status (healthy only if all checks pass) */
  status: HealthStatus;
  /** Individual check results keyed by check name */
  checks: Record<string, HealthCheckResult>;
  /** Timestamp when the check was performed */
  timestamp: string;
}

/**
 * Health check function signature
 * Returns a Promise that resolves to a HealthCheckResult
 */
export type HealthCheckFunction = () => Promise<HealthCheckResult>;

/**
 * Configuration for the health checker
 */
export interface HealthCheckerConfig {
  /** Timeout for individual health checks in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Registered health check with metadata
 */
export interface RegisteredHealthCheck {
  /** Name of the health check */
  name: string;
  /** Function to execute the check */
  fn: HealthCheckFunction;
  /** Whether this check is required for readiness */
  required?: boolean;
}
