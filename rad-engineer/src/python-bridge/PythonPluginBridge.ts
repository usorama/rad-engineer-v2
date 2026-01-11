/**
 * PythonPluginBridge - TypeScript <-> Python Communication Bridge
 *
 * Spawns Python subprocesses and communicates via JSON protocol over stdin/stdout.
 * Provides timeout handling, error recovery, retry logic, process monitoring, and graceful shutdown.
 *
 * Responsibilities:
 * - Spawn Python subprocess with stdin/stdout communication
 * - JSON protocol: send input via stdin, receive output via stdout
 * - Timeout handling (configurable per plugin, default 30s)
 * - Error recovery and retry logic (max 3 retries)
 * - Process monitoring and health checks
 * - Graceful shutdown and cleanup
 * - Support for async execution
 * - TypeScript type safety for plugin inputs/outputs
 *
 * Failure Modes:
 * - PYTHON_NOT_FOUND: Python executable not found
 * - PLUGIN_NOT_FOUND: Plugin file not found
 * - PLUGIN_TIMEOUT: Plugin execution exceeded timeout
 * - PLUGIN_CRASHED: Plugin process exited unexpectedly
 * - INVALID_JSON: Plugin returned invalid JSON
 * - MAX_RETRIES_EXCEEDED: Plugin failed after max retries
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Configuration for Python plugin execution
 */
export interface PluginConfig {
  /** Path to Python executable (default: 'python3') */
  pythonPath?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Working directory for plugin execution */
  cwd?: string;
  /** Environment variables to pass to plugin */
  env?: Record<string, string>;
}

/**
 * Input to Python plugin
 */
export interface PluginInput<T = unknown> {
  /** Plugin method/action to invoke */
  action: string;
  /** Plugin input data */
  data: T;
  /** Optional plugin-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Output from Python plugin
 */
export interface PluginOutput<T = unknown> {
  /** Whether plugin execution succeeded */
  success: boolean;
  /** Plugin output data */
  data: T | null;
  /** Error message if failed */
  error?: string;
  /** Plugin execution metadata */
  metadata?: {
    duration: number;
    pythonVersion?: string;
    pluginVersion?: string;
  };
}

/**
 * Result of plugin execution with retry information
 */
export interface PluginResult<T = unknown> {
  /** Whether plugin execution succeeded */
  success: boolean;
  /** Plugin output (if successful) */
  output: PluginOutput<T> | null;
  /** Error message (if failed) */
  error?: string;
  /** Number of retry attempts made */
  retries: number;
  /** Total duration including retries (milliseconds) */
  totalDuration: number;
  /** Whether execution timed out */
  timedOut: boolean;
}

/**
 * Process health status
 */
export interface ProcessHealth {
  /** Whether process is running */
  isRunning: boolean;
  /** Process ID (if running) */
  pid?: number;
  /** Process uptime in milliseconds */
  uptime?: number;
  /** Last error (if any) */
  lastError?: string;
}

/**
 * Error codes for PythonPluginBridge operations
 */
export enum PythonBridgeError {
  PYTHON_NOT_FOUND = "PYTHON_NOT_FOUND",
  PLUGIN_NOT_FOUND = "PLUGIN_NOT_FOUND",
  PLUGIN_TIMEOUT = "PLUGIN_TIMEOUT",
  PLUGIN_CRASHED = "PLUGIN_CRASHED",
  INVALID_JSON = "INVALID_JSON",
  MAX_RETRIES_EXCEEDED = "MAX_RETRIES_EXCEEDED",
  PROCESS_SPAWN_FAILED = "PROCESS_SPAWN_FAILED",
  PROCESS_NOT_RUNNING = "PROCESS_NOT_RUNNING",
}

/**
 * Custom error for PythonPluginBridge operations
 */
export class PythonBridgeException extends Error {
  constructor(
    public code: PythonBridgeError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PythonBridgeException";
  }
}

/**
 * PythonPluginBridge - Manages Python subprocess communication
 *
 * @example
 * ```ts
 * const bridge = new PythonPluginBridge("/path/to/plugin.py", {
 *   timeout: 30000,
 *   maxRetries: 3
 * });
 *
 * const result = await bridge.execute({
 *   action: "process",
 *   data: { text: "Hello world" }
 * });
 *
 * if (result.success) {
 *   console.log(result.output?.data);
 * }
 *
 * await bridge.shutdown();
 * ```
 */
export class PythonPluginBridge {
  private readonly pluginPath: string;
  private readonly config: Required<PluginConfig>;
  private process: ChildProcess | null = null;
  private readonly startTime: number;
  private lastError: string | null = null;

  constructor(pluginPath: string, config: PluginConfig = {}) {
    this.pluginPath = resolve(pluginPath);
    this.config = {
      pythonPath: config.pythonPath || "python3",
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      cwd: config.cwd || process.cwd(),
      env: config.env || {},
    };
    this.startTime = Date.now();

    // Validate plugin exists
    if (!existsSync(this.pluginPath)) {
      throw new PythonBridgeException(
        PythonBridgeError.PLUGIN_NOT_FOUND,
        `Plugin file not found: ${this.pluginPath}`,
        { pluginPath: this.pluginPath }
      );
    }
  }

  /**
   * Execute plugin with input and return output
   * Includes retry logic and timeout handling
   */
  async execute<TInput = unknown, TOutput = unknown>(
    input: PluginInput<TInput>
  ): Promise<PluginResult<TOutput>> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let lastErrorCode: PythonBridgeError | undefined;
    let retries = 0;

    // Try initial execution + retries
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const output = await this.executeSingle<TInput, TOutput>(input);
        return {
          success: true,
          output,
          retries: attempt,
          totalDuration: Date.now() - startTime,
          timedOut: false,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        lastErrorCode = error instanceof PythonBridgeException ? error.code : undefined;
        this.lastError = lastError;

        // Don't retry on certain non-retryable errors
        if (
          error instanceof PythonBridgeException &&
          (error.code === PythonBridgeError.PYTHON_NOT_FOUND ||
            error.code === PythonBridgeError.PLUGIN_NOT_FOUND ||
            error.code === PythonBridgeError.PROCESS_SPAWN_FAILED)
        ) {
          break;
        }

        retries = attempt;

        // Don't delay after last retry
        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await this.delay(100 * Math.pow(2, attempt));
        }
      }
    }

    return {
      success: false,
      output: null,
      error:
        lastError ||
        `Plugin execution failed after ${retries} retries`,
      retries,
      totalDuration: Date.now() - startTime,
      timedOut: lastErrorCode === PythonBridgeError.PLUGIN_TIMEOUT,
    };
  }

  /**
   * Execute plugin once (internal, no retry logic)
   */
  private async executeSingle<TInput = unknown, TOutput = unknown>(
    input: PluginInput<TInput>
  ): Promise<PluginOutput<TOutput>> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.process) {
          this.process.kill("SIGTERM");
        }
        reject(
          new PythonBridgeException(
            PythonBridgeError.PLUGIN_TIMEOUT,
            `Plugin execution timed out after ${this.config.timeout}ms`,
            { timeout: this.config.timeout }
          )
        );
      }, this.config.timeout);

      let stdout = "";
      let stderr = "";

      try {
        this.process = spawn(this.config.pythonPath, [this.pluginPath], {
          cwd: this.config.cwd,
          env: { ...process.env, ...this.config.env },
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
          clearTimeout(timeoutId);
          reject(
            new PythonBridgeException(
              PythonBridgeError.PROCESS_SPAWN_FAILED,
              "Failed to create process stdio streams"
            )
          );
          return;
        }

        this.process.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        this.process.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        this.process.on("error", (error: Error) => {
          clearTimeout(timeoutId);
          reject(
            new PythonBridgeException(
              PythonBridgeError.PROCESS_SPAWN_FAILED,
              `Failed to spawn Python process: ${error.message}`,
              { error: error.message }
            )
          );
        });

        this.process.on("close", (code: number | null) => {
          clearTimeout(timeoutId);

          if (code !== 0) {
            reject(
              new PythonBridgeException(
                PythonBridgeError.PLUGIN_CRASHED,
                `Plugin exited with code ${code}: ${stderr}`,
                { exitCode: code, stderr }
              )
            );
            return;
          }

          try {
            const output = JSON.parse(stdout) as PluginOutput<TOutput>;
            resolve(output);
          } catch (error) {
            reject(
              new PythonBridgeException(
                PythonBridgeError.INVALID_JSON,
                `Plugin returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
                { stdout, stderr }
              )
            );
          }
        });

        // Send input to plugin via stdin
        this.process.stdin.write(JSON.stringify(input) + "\n");
        this.process.stdin.end();
      } catch (error) {
        clearTimeout(timeoutId);
        reject(
          new PythonBridgeException(
            PythonBridgeError.PROCESS_SPAWN_FAILED,
            `Failed to spawn Python process: ${error instanceof Error ? error.message : String(error)}`,
            { error: error instanceof Error ? error.message : String(error) }
          )
        );
      }
    });
  }

  /**
   * Check process health status
   */
  getHealth(): ProcessHealth {
    // Check if process exists and hasn't exited
    if (!this.process || this.process.exitCode !== null || this.process.killed) {
      return {
        isRunning: false,
        lastError: this.lastError || undefined,
      };
    }

    return {
      isRunning: true,
      pid: this.process.pid,
      uptime: Date.now() - this.startTime,
      lastError: this.lastError || undefined,
    };
  }

  /**
   * Gracefully shutdown plugin process
   */
  async shutdown(): Promise<void> {
    if (!this.process || this.process.killed) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
        resolve();
      }, 5000);

      this.process.on("close", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.process.kill("SIGTERM");
    });
  }

  /**
   * Utility: delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get plugin path
   */
  getPluginPath(): string {
    return this.pluginPath;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<PluginConfig>> {
    return { ...this.config };
  }
}
