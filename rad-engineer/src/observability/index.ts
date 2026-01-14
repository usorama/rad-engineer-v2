/**
 * Observability module
 *
 * Provides structured logging with pino, health check capabilities, and Prometheus metrics
 */

export { Logger, createLogger, type LoggerConfig } from './Logger.js';

export { HealthChecker } from "./HealthChecker.js";
export type {
  HealthStatus,
  HealthCheckResult,
  AggregatedHealthResult,
  HealthCheckFunction,
  HealthCheckerConfig,
  RegisteredHealthCheck,
} from "./HealthCheck.js";

export { Metrics } from "./Metrics.js";
export { MetricsRegistry } from "./MetricsRegistry.js";
export type { TaskCompletionParams } from "./Metrics.js";
