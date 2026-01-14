/**
 * AuditLogger - Persistent audit logging for security events
 *
 * Features:
 * - Append-only JSON lines format for tamper resistance
 * - Automatic log rotation (configurable max size and file count)
 * - In-memory cache for fast queries
 * - Type-safe event tracking
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync, statSync, readdirSync, renameSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import type {
  AuditLogEntry,
  AuditLogFilter,
  AuditLoggerConfig,
  LogWriteResult,
  AuditEventType,
  AuditOutcome,
} from './types';

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_MEMORY_ENTRIES = 1000;

export class AuditLogger {
  private config: Required<AuditLoggerConfig>;
  private currentLogFile: string;
  private memoryStore: AuditLogEntry[] = [];

  constructor(config: AuditLoggerConfig) {
    this.config = {
      logDirectory: config.logDirectory,
      maxFileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
      maxFiles: config.maxFiles ?? DEFAULT_MAX_FILES,
      enableMemoryStore: config.enableMemoryStore ?? true,
      maxMemoryEntries: config.maxMemoryEntries ?? DEFAULT_MAX_MEMORY_ENTRIES,
    };

    // Ensure log directory exists
    if (!existsSync(this.config.logDirectory)) {
      mkdirSync(this.config.logDirectory, { recursive: true });
    }

    // Set current log file path
    this.currentLogFile = join(this.config.logDirectory, 'audit.log');

    // Initialize empty log file if it doesn't exist
    if (!existsSync(this.currentLogFile)) {
      writeFileSync(this.currentLogFile, '', 'utf-8');
    }

    // Load existing logs into memory if enabled
    if (this.config.enableMemoryStore) {
      this.loadLogsIntoMemory();
    }
  }

  /**
   * Log a security event
   */
  log(
    eventType: AuditEventType,
    userId: string,
    action: string,
    resource: string,
    outcome: AuditOutcome,
    metadata?: Record<string, unknown>
  ): LogWriteResult {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      action,
      resource,
      outcome,
      metadata,
    };

    try {
      // Check if rotation is needed
      const rotated = this.rotateIfNeeded();

      // Append to file (JSON lines format)
      const logLine = JSON.stringify(entry) + '\n';
      appendFileSync(this.currentLogFile, logLine, 'utf-8');

      // Add to memory store
      if (this.config.enableMemoryStore) {
        this.memoryStore.push(entry);

        // Trim memory store if it exceeds max entries
        if (this.memoryStore.length > this.config.maxMemoryEntries) {
          this.memoryStore = this.memoryStore.slice(-this.config.maxMemoryEntries);
        }
      }

      return { success: true, rotated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Query logs with optional filters
   */
  queryLogs(filters?: AuditLogFilter): AuditLogEntry[] {
    let results = this.config.enableMemoryStore
      ? [...this.memoryStore]
      : this.loadAllLogsFromDisk();

    // Apply filters
    if (filters) {
      if (filters.eventType) {
        results = results.filter((entry) => entry.eventType === filters.eventType);
      }

      if (filters.userId) {
        results = results.filter((entry) => entry.userId === filters.userId);
      }

      if (filters.outcome) {
        results = results.filter((entry) => entry.outcome === filters.outcome);
      }

      if (filters.startTime) {
        const startDate = new Date(filters.startTime);
        results = results.filter((entry) => new Date(entry.timestamp) >= startDate);
      }

      if (filters.endTime) {
        const endDate = new Date(filters.endTime);
        results = results.filter((entry) => new Date(entry.timestamp) <= endDate);
      }

      if (filters.limit && filters.limit > 0) {
        results = results.slice(0, filters.limit);
      }
    }

    return results;
  }

  /**
   * Get the count of logs matching filters
   */
  countLogs(filters?: AuditLogFilter): number {
    return this.queryLogs(filters).length;
  }

  /**
   * Clear all logs (use with caution)
   */
  clearLogs(): void {
    // Clear current log file
    writeFileSync(this.currentLogFile, '', 'utf-8');

    // Clear memory store
    this.memoryStore = [];

    // Remove rotated files
    const files = readdirSync(this.config.logDirectory);
    for (const file of files) {
      if (file.startsWith('audit.log.') && file.match(/\d+$/)) {
        const filePath = join(this.config.logDirectory, file);
        unlinkSync(filePath);
      }
    }
  }

  /**
   * Get memory store size
   */
  getMemoryStoreSize(): number {
    return this.memoryStore.length;
  }

  /**
   * Get current log file path
   */
  getCurrentLogFile(): string {
    return this.currentLogFile;
  }

  /**
   * Get all log files (including rotated)
   */
  getAllLogFiles(): string[] {
    const files = readdirSync(this.config.logDirectory);
    const logFiles = files
      .filter((file) => file.startsWith('audit.log'))
      .sort((a, b) => {
        // Sort by rotation number (audit.log is most recent)
        if (a === 'audit.log') return -1;
        if (b === 'audit.log') return 1;
        const numA = parseInt(a.split('.').pop() || '0', 10);
        const numB = parseInt(b.split('.').pop() || '0', 10);
        return numA - numB;
      })
      .map((file) => join(this.config.logDirectory, file));

    return logFiles;
  }

  /**
   * Check if rotation is needed and perform it
   * Returns true if rotation occurred
   */
  private rotateIfNeeded(): boolean {
    if (!existsSync(this.currentLogFile)) {
      return false;
    }

    const stats = statSync(this.currentLogFile);
    if (stats.size < this.config.maxFileSize) {
      return false;
    }

    // Perform rotation
    this.rotateLogFiles();
    return true;
  }

  /**
   * Rotate log files
   * audit.log -> audit.log.1
   * audit.log.1 -> audit.log.2
   * etc.
   */
  private rotateLogFiles(): void {
    // Shift existing rotated files
    for (let i = this.config.maxFiles - 1; i >= 1; i--) {
      const oldFile = join(this.config.logDirectory, `audit.log.${i}`);
      const newFile = join(this.config.logDirectory, `audit.log.${i + 1}`);

      if (existsSync(oldFile)) {
        if (i === this.config.maxFiles - 1) {
          // Delete oldest file
          unlinkSync(oldFile);
        } else {
          // Rename to next number
          renameSync(oldFile, newFile);
        }
      }
    }

    // Rotate current log file to .1
    if (existsSync(this.currentLogFile)) {
      const rotatedFile = join(this.config.logDirectory, 'audit.log.1');
      renameSync(this.currentLogFile, rotatedFile);
    }

    // Create new empty log file
    writeFileSync(this.currentLogFile, '', 'utf-8');
  }

  /**
   * Load logs from current file into memory
   */
  private loadLogsIntoMemory(): void {
    if (!existsSync(this.currentLogFile)) {
      return;
    }

    try {
      const content = readFileSync(this.currentLogFile, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditLogEntry;
          this.memoryStore.push(entry);
        } catch {
          // Skip invalid lines
        }
      }

      // Trim to max entries
      if (this.memoryStore.length > this.config.maxMemoryEntries) {
        this.memoryStore = this.memoryStore.slice(-this.config.maxMemoryEntries);
      }
    } catch {
      // If loading fails, start with empty memory store
      this.memoryStore = [];
    }
  }

  /**
   * Load all logs from all files (current + rotated)
   */
  private loadAllLogsFromDisk(): AuditLogEntry[] {
    const allLogs: AuditLogEntry[] = [];
    const logFiles = this.getAllLogFiles().reverse(); // Start with oldest

    for (const logFile of logFiles) {
      if (!existsSync(logFile)) {
        continue;
      }

      try {
        const content = readFileSync(logFile, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditLogEntry;
            allLogs.push(entry);
          } catch {
            // Skip invalid lines
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return allLogs;
  }
}
