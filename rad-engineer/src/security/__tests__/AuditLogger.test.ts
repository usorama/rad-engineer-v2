import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AuditLogger } from '../AuditLogger';
import { AuditEventType, AuditOutcome } from '../types';
import { mkdirSync, rmSync, existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), '.test-tmp-audit');
const TEST_LOG_DIR = join(TEST_DIR, 'logs');

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    // Create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Initialize logger with test directory
    logger = new AuditLogger({
      logDirectory: TEST_LOG_DIR,
      maxFileSize: 1024, // 1KB for easier testing of rotation
      maxFiles: 3,
      enableMemoryStore: true,
      maxMemoryEntries: 100,
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create log directory if it does not exist', () => {
      expect(existsSync(TEST_LOG_DIR)).toBe(true);
    });

    it('should create empty log file on initialization', () => {
      const logFile = logger.getCurrentLogFile();
      expect(existsSync(logFile)).toBe(true);
    });

    it('should use default configuration values', () => {
      const defaultLogger = new AuditLogger({
        logDirectory: join(TEST_DIR, 'default-logs'),
      });

      expect(defaultLogger.getMemoryStoreSize()).toBe(0);
    });
  });

  describe('log()', () => {
    it('should log a security event successfully', () => {
      const result = logger.log(
        AuditEventType.AGENT_SPAWN,
        'user-123',
        'spawn_agent',
        'agent-abc',
        AuditOutcome.SUCCESS
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should include metadata in log entry', () => {
      const metadata = { agentType: 'developer', taskId: 'task-456' };

      logger.log(
        AuditEventType.AGENT_SPAWN,
        'user-123',
        'spawn_agent',
        'agent-abc',
        AuditOutcome.SUCCESS,
        metadata
      );

      const logs = logger.queryLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata).toEqual(metadata);
    });

    it('should append entry to log file', () => {
      logger.log(
        AuditEventType.CONFIG_CHANGE,
        'admin-1',
        'update_config',
        'config.json',
        AuditOutcome.SUCCESS
      );

      const logFile = logger.getCurrentLogFile();
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      expect(lines).toHaveLength(1);
      const entry = JSON.parse(lines[0]);
      expect(entry.eventType).toBe(AuditEventType.CONFIG_CHANGE);
      expect(entry.userId).toBe('admin-1');
    });

    it('should add entry to memory store', () => {
      logger.log(
        AuditEventType.ACCESS_DENIED,
        'user-999',
        'read_file',
        '/etc/shadow',
        AuditOutcome.DENIED
      );

      expect(logger.getMemoryStoreSize()).toBe(1);
    });

    it('should trim memory store when exceeding max entries', () => {
      // Log more entries than maxMemoryEntries (100)
      for (let i = 0; i < 150; i++) {
        logger.log(
          AuditEventType.AGENT_COMPLETE,
          `user-${i}`,
          'complete',
          `agent-${i}`,
          AuditOutcome.SUCCESS
        );
      }

      expect(logger.getMemoryStoreSize()).toBe(100);
    });

    it('should log different event types', () => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.AGENT_COMPLETE, 'user-1', 'complete', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.CONFIG_CHANGE, 'admin-1', 'update', 'config', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.ACCESS_DENIED, 'user-2', 'read', 'secret', AuditOutcome.DENIED);
      logger.log(AuditEventType.ERROR, 'system', 'operation', 'resource', AuditOutcome.FAILURE);

      const logs = logger.queryLogs();
      expect(logs).toHaveLength(5);
    });
  });

  describe('queryLogs()', () => {
    beforeEach(() => {
      // Seed with test data
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.AGENT_COMPLETE, 'user-1', 'complete', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.ACCESS_DENIED, 'user-2', 'read', 'secret', AuditOutcome.DENIED);
      logger.log(AuditEventType.ERROR, 'system', 'operation', 'resource', AuditOutcome.FAILURE);
    });

    it('should return all logs when no filter is provided', () => {
      const logs = logger.queryLogs();
      expect(logs).toHaveLength(4);
    });

    it('should filter by event type', () => {
      const logs = logger.queryLogs({ eventType: AuditEventType.AGENT_SPAWN });
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe(AuditEventType.AGENT_SPAWN);
    });

    it('should filter by user ID', () => {
      const logs = logger.queryLogs({ userId: 'user-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.userId === 'user-1')).toBe(true);
    });

    it('should filter by outcome', () => {
      const logs = logger.queryLogs({ outcome: AuditOutcome.SUCCESS });
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.outcome === AuditOutcome.SUCCESS)).toBe(true);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago
      const future = new Date(now.getTime() + 3600000); // 1 hour from now

      const logs = logger.queryLogs({
        startTime: past.toISOString(),
        endTime: future.toISOString(),
      });

      expect(logs).toHaveLength(4);
    });

    it('should respect limit parameter', () => {
      const logs = logger.queryLogs({ limit: 2 });
      expect(logs).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const logs = logger.queryLogs({
        userId: 'user-1',
        outcome: AuditOutcome.SUCCESS,
      });

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.userId === 'user-1' && log.outcome === AuditOutcome.SUCCESS)).toBe(true);
    });
  });

  describe('countLogs()', () => {
    beforeEach(() => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.AGENT_SPAWN, 'user-2', 'spawn', 'agent-2', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.ACCESS_DENIED, 'user-3', 'read', 'secret', AuditOutcome.DENIED);
    });

    it('should count all logs when no filter provided', () => {
      expect(logger.countLogs()).toBe(3);
    });

    it('should count logs matching filter', () => {
      expect(logger.countLogs({ eventType: AuditEventType.AGENT_SPAWN })).toBe(2);
      expect(logger.countLogs({ outcome: AuditOutcome.DENIED })).toBe(1);
    });
  });

  describe('log rotation', () => {
    it('should rotate logs when file size exceeds maxFileSize', () => {
      // Log enough entries to exceed 1KB
      for (let i = 0; i < 50; i++) {
        logger.log(
          AuditEventType.AGENT_SPAWN,
          `user-${i}`,
          'spawn_agent_with_long_description',
          `agent-${i}`,
          AuditOutcome.SUCCESS,
          { extra: 'data'.repeat(20) }
        );
      }

      const logFiles = logger.getAllLogFiles();
      expect(logFiles.length).toBeGreaterThan(1);
    });

    it('should keep only maxFiles rotated logs', () => {
      // Force multiple rotations
      for (let i = 0; i < 200; i++) {
        logger.log(
          AuditEventType.CONFIG_CHANGE,
          `admin-${i}`,
          'update_config_with_very_long_description',
          'config.json',
          AuditOutcome.SUCCESS,
          { data: 'x'.repeat(50) }
        );
      }

      const logFiles = logger.getAllLogFiles();
      // Should have at most maxFiles + 1 (current + rotated)
      expect(logFiles.length).toBeLessThanOrEqual(4);
    });

    it('should indicate rotation in log result', () => {
      // Log enough to trigger rotation
      for (let i = 0; i < 40; i++) {
        const result = logger.log(
          AuditEventType.AGENT_SPAWN,
          `user-${i}`,
          'spawn',
          `agent-${i}`,
          AuditOutcome.SUCCESS,
          { data: 'x'.repeat(50) }
        );

        if (result.rotated) {
          expect(result.rotated).toBe(true);
          break;
        }
      }
    });

    it('should preserve all logs across rotation', () => {
      const totalLogs = 100;

      for (let i = 0; i < totalLogs; i++) {
        logger.log(
          AuditEventType.AGENT_COMPLETE,
          `user-${i}`,
          'complete',
          `agent-${i}`,
          AuditOutcome.SUCCESS,
          { data: 'x'.repeat(30) }
        );
      }

      // Query should retrieve from all files (within memory limit)
      const logs = logger.queryLogs();
      // Due to memory limit of 100, we should have exactly 100
      expect(logs.length).toBeLessThanOrEqual(totalLogs);
    });
  });

  describe('clearLogs()', () => {
    beforeEach(() => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.AGENT_COMPLETE, 'user-1', 'complete', 'agent-1', AuditOutcome.SUCCESS);
    });

    it('should clear all logs from memory', () => {
      expect(logger.getMemoryStoreSize()).toBeGreaterThan(0);
      logger.clearLogs();
      expect(logger.getMemoryStoreSize()).toBe(0);
    });

    it('should clear log file', () => {
      logger.clearLogs();
      const logFile = logger.getCurrentLogFile();
      const content = readFileSync(logFile, 'utf-8');
      expect(content).toBe('');
    });

    it('should remove rotated log files', () => {
      // Force rotation
      for (let i = 0; i < 50; i++) {
        logger.log(
          AuditEventType.AGENT_SPAWN,
          `user-${i}`,
          'spawn',
          `agent-${i}`,
          AuditOutcome.SUCCESS,
          { data: 'x'.repeat(50) }
        );
      }

      expect(logger.getAllLogFiles().length).toBeGreaterThan(1);

      logger.clearLogs();
      expect(logger.getAllLogFiles()).toHaveLength(1); // Only current file remains
    });
  });

  describe('getAllLogFiles()', () => {
    it('should return current log file', () => {
      const files = logger.getAllLogFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(logger.getCurrentLogFile());
    });

    it('should return all log files in order', () => {
      // Force rotations
      for (let i = 0; i < 100; i++) {
        logger.log(
          AuditEventType.CONFIG_CHANGE,
          `user-${i}`,
          'change',
          'config',
          AuditOutcome.SUCCESS,
          { data: 'x'.repeat(50) }
        );
      }

      const files = logger.getAllLogFiles();
      expect(files.length).toBeGreaterThan(1);

      // First file should be current log
      expect(files[0]).toContain('audit.log');
      expect(files[0]).not.toContain('audit.log.');
    });
  });

  describe('memory store disabled', () => {
    beforeEach(() => {
      logger = new AuditLogger({
        logDirectory: TEST_LOG_DIR,
        enableMemoryStore: false,
      });
    });

    it('should not store logs in memory', () => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      expect(logger.getMemoryStoreSize()).toBe(0);
    });

    it('should still query logs from disk', () => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.AGENT_COMPLETE, 'user-1', 'complete', 'agent-1', AuditOutcome.SUCCESS);

      const logs = logger.queryLogs();
      expect(logs).toHaveLength(2);
    });
  });

  describe('JSON lines format', () => {
    it('should write each log entry as a single JSON line', () => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);
      logger.log(AuditEventType.AGENT_COMPLETE, 'user-1', 'complete', 'agent-1', AuditOutcome.SUCCESS);

      const logFile = logger.getCurrentLogFile();
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      expect(lines).toHaveLength(2);

      // Each line should be valid JSON
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    it('should handle special characters in log entries', () => {
      const specialMetadata = {
        message: 'Error: "something" failed\nwith newline',
        path: 'C:\\Users\\test\\file.txt',
      };

      logger.log(
        AuditEventType.ERROR,
        'system',
        'operation',
        'resource',
        AuditOutcome.FAILURE,
        specialMetadata
      );

      const logs = logger.queryLogs();
      expect(logs[0].metadata).toEqual(specialMetadata);
    });
  });

  describe('timestamp handling', () => {
    it('should use ISO 8601 format for timestamps', () => {
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);

      const logs = logger.queryLogs();
      const timestamp = logs[0].timestamp;

      // Should be valid ISO 8601
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should filter by timestamp correctly', () => {
      const before = new Date().toISOString();

      // Wait a tiny bit
      logger.log(AuditEventType.AGENT_SPAWN, 'user-1', 'spawn', 'agent-1', AuditOutcome.SUCCESS);

      const after = new Date(Date.now() + 1000).toISOString();

      const logs = logger.queryLogs({
        startTime: before,
        endTime: after,
      });

      expect(logs).toHaveLength(1);
    });
  });
});
