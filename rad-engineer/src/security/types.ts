/**
 * Type definitions for Security component
 * Provides audit logging for security events
 */

/**
 * Security event types that can be audited
 */
export enum AuditEventType {
  AGENT_SPAWN = "AGENT_SPAWN",
  AGENT_COMPLETE = "AGENT_COMPLETE",
  CONFIG_CHANGE = "CONFIG_CHANGE",
  ACCESS_DENIED = "ACCESS_DENIED",
  ERROR = "ERROR",
}

/**
 * Outcome of a security event
 */
export enum AuditOutcome {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  DENIED = "DENIED",
}

/**
 * A single audit log entry
 */
export interface AuditLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Type of event */
  eventType: AuditEventType;
  /** User or system identifier */
  userId: string;
  /** Action performed */
  action: string;
  /** Resource affected */
  resource: string;
  /** Outcome of the action */
  outcome: AuditOutcome;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for querying audit logs
 */
export interface AuditLogFilter {
  /** Filter by event type */
  eventType?: AuditEventType;
  /** Filter by user ID */
  userId?: string;
  /** Filter by outcome */
  outcome?: AuditOutcome;
  /** Filter by start timestamp (ISO 8601) */
  startTime?: string;
  /** Filter by end timestamp (ISO 8601) */
  endTime?: string;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Configuration for the audit logger
 */
export interface AuditLoggerConfig {
  /** Directory path for log files */
  logDirectory: string;
  /** Maximum log file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Number of rotated files to keep (default: 5) */
  maxFiles?: number;
  /** Whether to also keep logs in memory (default: true) */
  enableMemoryStore?: boolean;
  /** Maximum number of entries in memory (default: 1000) */
  maxMemoryEntries?: number;
}

/**
 * Result of a log write operation
 */
export interface LogWriteResult {
  success: boolean;
  error?: Error;
  rotated?: boolean;
}
