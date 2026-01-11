/**
 * TerminalAPIHandler - Terminal PTY operations with task association
 *
 * Integration Approach: Thin Wrapper Pattern
 *
 * Auto-Claude's TerminalManager (workspaces/Auto-Claude/apps/frontend/src/main/terminal/terminal-manager.ts)
 * is production-tested with comprehensive PTY management. This handler provides:
 *
 * 1. Task-Terminal Association Mapping (taskId → terminalId)
 * 2. Event Broadcasting Integration (terminal:output events)
 * 3. rad-engineer API compatibility
 *
 * The actual PTY operations (create, write, resize, destroy, session restore)
 * are delegated to Auto-Claude's TerminalManager without modification.
 *
 * Responsibilities:
 * - CRUD operations for terminals
 * - Task → Terminal ID mapping
 * - Terminal output streaming via EventBroadcaster
 * - Session persistence/restore (delegated to TerminalManager)
 *
 * EventBroadcaster Integration:
 * - terminal:output events streamed to UI with backpressure handling
 * - Max 10 events/second per terminal session
 */

import { EventEmitter } from "events";
import type { EventBroadcaster, TerminalOutputEvent } from "./EventBroadcaster.js";

/**
 * Terminal creation options
 * Mirrors Auto-Claude TerminalCreateOptions
 */
export interface TerminalCreateOptions {
  /** Terminal ID */
  id: string;
  /** Working directory */
  cwd?: string;
  /** Terminal columns */
  cols?: number;
  /** Terminal rows */
  rows?: number;
  /** Associated project path */
  projectPath?: string;
}

/**
 * Terminal operation result
 * Mirrors Auto-Claude TerminalOperationResult
 */
export interface TerminalOperationResult {
  /** Operation success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Output buffer (for restore operations) */
  outputBuffer?: string;
}

/**
 * Terminal session data
 * Mirrors Auto-Claude TerminalSession
 */
export interface TerminalSession {
  /** Terminal ID */
  id: string;
  /** Terminal title */
  title: string;
  /** Working directory */
  cwd: string;
  /** Project path */
  projectPath: string;
  /** Claude mode status */
  isClaudeMode: boolean;
  /** Claude session ID */
  claudeSessionId?: string;
  /** Output buffer */
  outputBuffer: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last active timestamp */
  lastActiveAt: string;
}

/**
 * Terminal manager interface
 * Matches Auto-Claude TerminalManager public API
 */
export interface TerminalManager {
  create(options: TerminalCreateOptions): Promise<TerminalOperationResult>;
  destroy(id: string): Promise<TerminalOperationResult>;
  write(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  restore(session: TerminalSession, cols?: number, rows?: number): Promise<TerminalOperationResult>;
  getSavedSessions(projectPath: string): TerminalSession[];
  clearSavedSessions(projectPath: string): void;
  getActiveTerminalIds(): string[];
  isTerminalAlive(terminalId: string): boolean;
}

/**
 * Configuration for TerminalAPIHandler
 */
export interface TerminalAPIHandlerConfig {
  /** Auto-Claude TerminalManager instance */
  terminalManager: TerminalManager;
  /** EventBroadcaster for streaming output */
  eventBroadcaster: EventBroadcaster;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * TerminalAPIHandler - Manages terminal operations with task association
 *
 * @example
 * ```ts
 * const handler = new TerminalAPIHandler({
 *   terminalManager: autoClaudeTerminalManager,
 *   eventBroadcaster: broadcaster,
 * });
 *
 * // Create terminal for task
 * const result = await handler.createTerminal("task-123", {
 *   id: "term-1",
 *   cwd: "/project",
 * });
 *
 * // Associate existing terminal with task
 * handler.associateTerminalWithTask("task-123", "term-2");
 *
 * // Write to terminal
 * handler.writeToTerminal("term-1", "npm test\r");
 *
 * // Listen for task-terminal associations
 * handler.on("terminal-associated", ({ taskId, terminalId }) => {
 *   console.log(`Terminal ${terminalId} associated with task ${taskId}`);
 * });
 * ```
 */
export class TerminalAPIHandler extends EventEmitter {
  private readonly config: TerminalAPIHandlerConfig;
  private readonly terminalManager: TerminalManager;
  private readonly eventBroadcaster: EventBroadcaster;

  /** Maps taskId → Set of terminalIds */
  private readonly taskTerminals: Map<string, Set<string>> = new Map();

  /** Maps terminalId → taskId */
  private readonly terminalTasks: Map<string, string> = new Map();

  constructor(config: TerminalAPIHandlerConfig) {
    super();
    this.config = config;
    this.terminalManager = config.terminalManager;
    this.eventBroadcaster = config.eventBroadcaster;

    if (this.config.debug) {
      console.log("[TerminalAPIHandler] Initialized");
    }
  }

  /**
   * Create a new terminal and optionally associate with task
   *
   * Process:
   * 1. Delegate creation to Auto-Claude TerminalManager
   * 2. If taskId provided, create task-terminal association
   * 3. Emit terminal-associated event
   *
   * @param taskId - Optional task ID to associate terminal with
   * @param options - Terminal creation options
   * @returns Terminal operation result
   */
  async createTerminal(
    taskId: string | null,
    options: TerminalCreateOptions
  ): Promise<TerminalOperationResult> {
    // Delegate to Auto-Claude TerminalManager
    const result = await this.terminalManager.create(options);

    if (result.success && taskId) {
      // Associate terminal with task
      this.associateTerminalWithTask(taskId, options.id);
    }

    if (this.config.debug) {
      console.log(
        `[TerminalAPIHandler] Created terminal ${options.id}${taskId ? ` for task ${taskId}` : ""}: ${result.success ? "success" : "failed"}`
      );
    }

    return result;
  }

  /**
   * Destroy a terminal
   *
   * Process:
   * 1. Delegate destruction to Auto-Claude TerminalManager
   * 2. Remove task-terminal associations
   * 3. Emit terminal-disassociated event
   *
   * @param terminalId - Terminal ID to destroy
   * @returns Terminal operation result
   */
  async destroyTerminal(terminalId: string): Promise<TerminalOperationResult> {
    // Get associated task before destroying
    const taskId = this.terminalTasks.get(terminalId);

    // Delegate to Auto-Claude TerminalManager
    const result = await this.terminalManager.destroy(terminalId);

    if (result.success) {
      // Remove associations
      this.disassociateTerminal(terminalId);

      if (taskId) {
        this.emit("terminal-disassociated", { taskId, terminalId });
      }
    }

    if (this.config.debug) {
      console.log(
        `[TerminalAPIHandler] Destroyed terminal ${terminalId}: ${result.success ? "success" : "failed"}`
      );
    }

    return result;
  }

  /**
   * Write data to terminal
   *
   * Process:
   * 1. Delegate write to Auto-Claude TerminalManager
   * 2. Stream output event via EventBroadcaster (if terminal associated with task)
   *
   * @param terminalId - Terminal ID
   * @param data - Data to write
   */
  writeToTerminal(terminalId: string, data: string): void {
    // Delegate to Auto-Claude TerminalManager
    this.terminalManager.write(terminalId, data);

    // Stream output event if terminal is associated with task
    const taskId = this.terminalTasks.get(terminalId);
    if (taskId) {
      const event: TerminalOutputEvent = {
        taskId,
        sessionId: terminalId,
        output: data,
        timestamp: new Date().toISOString(),
      };

      this.eventBroadcaster.streamTerminalOutput(event);
    }

    if (this.config.debug) {
      console.log(
        `[TerminalAPIHandler] Wrote ${data.length} bytes to terminal ${terminalId}${taskId ? ` (task ${taskId})` : ""}`
      );
    }
  }

  /**
   * Resize terminal
   *
   * Process:
   * 1. Delegate resize to Auto-Claude TerminalManager
   *
   * @param terminalId - Terminal ID
   * @param cols - New column count
   * @param rows - New row count
   */
  resizeTerminal(terminalId: string, cols: number, rows: number): void {
    // Delegate to Auto-Claude TerminalManager
    this.terminalManager.resize(terminalId, cols, rows);

    if (this.config.debug) {
      console.log(
        `[TerminalAPIHandler] Resized terminal ${terminalId} to ${cols}x${rows}`
      );
    }
  }

  /**
   * Restore terminal session
   *
   * Process:
   * 1. Delegate restore to Auto-Claude TerminalManager
   * 2. If taskId provided, create task-terminal association
   * 3. Emit terminal-associated event
   *
   * @param taskId - Optional task ID to associate terminal with
   * @param session - Terminal session to restore
   * @param cols - Terminal columns (default: 80)
   * @param rows - Terminal rows (default: 24)
   * @returns Terminal operation result
   */
  async restoreTerminal(
    taskId: string | null,
    session: TerminalSession,
    cols = 80,
    rows = 24
  ): Promise<TerminalOperationResult> {
    // Delegate to Auto-Claude TerminalManager
    const result = await this.terminalManager.restore(session, cols, rows);

    if (result.success && taskId) {
      // Associate restored terminal with task
      this.associateTerminalWithTask(taskId, session.id);
    }

    if (this.config.debug) {
      console.log(
        `[TerminalAPIHandler] Restored terminal ${session.id}${taskId ? ` for task ${taskId}` : ""}: ${result.success ? "success" : "failed"}`
      );
    }

    return result;
  }

  /**
   * Get saved sessions for project
   *
   * Process:
   * 1. Delegate to Auto-Claude TerminalManager
   *
   * @param projectPath - Project path
   * @returns Array of terminal sessions
   */
  getSavedSessions(projectPath: string): TerminalSession[] {
    return this.terminalManager.getSavedSessions(projectPath);
  }

  /**
   * Clear saved sessions for project
   *
   * Process:
   * 1. Delegate to Auto-Claude TerminalManager
   *
   * @param projectPath - Project path
   */
  clearSavedSessions(projectPath: string): void {
    this.terminalManager.clearSavedSessions(projectPath);

    if (this.config.debug) {
      console.log(`[TerminalAPIHandler] Cleared sessions for ${projectPath}`);
    }
  }

  /**
   * Associate existing terminal with task
   *
   * Process:
   * 1. Update taskTerminals map (taskId → Set<terminalId>)
   * 2. Update terminalTasks map (terminalId → taskId)
   * 3. Emit terminal-associated event
   *
   * @param taskId - Task ID
   * @param terminalId - Terminal ID
   */
  associateTerminalWithTask(taskId: string, terminalId: string): void {
    // Add to taskTerminals map
    let terminals = this.taskTerminals.get(taskId);
    if (!terminals) {
      terminals = new Set();
      this.taskTerminals.set(taskId, terminals);
    }
    terminals.add(terminalId);

    // Add to terminalTasks map
    this.terminalTasks.set(terminalId, taskId);

    // Emit event
    this.emit("terminal-associated", { taskId, terminalId });

    if (this.config.debug) {
      console.log(
        `[TerminalAPIHandler] Associated terminal ${terminalId} with task ${taskId}`
      );
    }
  }

  /**
   * Disassociate terminal from task
   *
   * Process:
   * 1. Remove from taskTerminals map
   * 2. Remove from terminalTasks map
   *
   * @param terminalId - Terminal ID
   */
  private disassociateTerminal(terminalId: string): void {
    const taskId = this.terminalTasks.get(terminalId);
    if (taskId) {
      const terminals = this.taskTerminals.get(taskId);
      if (terminals) {
        terminals.delete(terminalId);
        if (terminals.size === 0) {
          this.taskTerminals.delete(taskId);
        }
      }
    }

    this.terminalTasks.delete(terminalId);
  }

  /**
   * Get terminals associated with task
   *
   * @param taskId - Task ID
   * @returns Set of terminal IDs
   */
  getTerminalsForTask(taskId: string): Set<string> {
    return this.taskTerminals.get(taskId) || new Set();
  }

  /**
   * Get task associated with terminal
   *
   * @param terminalId - Terminal ID
   * @returns Task ID or undefined
   */
  getTaskForTerminal(terminalId: string): string | undefined {
    return this.terminalTasks.get(terminalId);
  }

  /**
   * Check if terminal is alive
   *
   * @param terminalId - Terminal ID
   * @returns True if terminal is alive
   */
  isTerminalAlive(terminalId: string): boolean {
    return this.terminalManager.isTerminalAlive(terminalId);
  }

  /**
   * Get all active terminal IDs
   *
   * @returns Array of terminal IDs
   */
  getActiveTerminalIds(): string[] {
    return this.terminalManager.getActiveTerminalIds();
  }

  /**
   * Get statistics about terminal management
   *
   * @returns Statistics object
   */
  getStats(): {
    totalTerminals: number;
    associatedTerminals: number;
    tasksWithTerminals: number;
  } {
    return {
      totalTerminals: this.terminalManager.getActiveTerminalIds().length,
      associatedTerminals: this.terminalTasks.size,
      tasksWithTerminals: this.taskTerminals.size,
    };
  }
}
