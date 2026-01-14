/**
 * ShutdownHandler - Graceful shutdown system for clean process termination
 *
 * Features:
 * - Register/remove shutdown handlers with priority
 * - Executes handlers in priority order (higher first)
 * - Per-handler timeout (default 5s)
 * - Total shutdown timeout (default 30s)
 * - Handles SIGINT, SIGTERM, SIGUSR2 signals
 * - Force exit after timeout
 */

type ShutdownHandlerFn = () => Promise<void> | void;

interface ShutdownHandlerConfig {
  name: string;
  fn: ShutdownHandlerFn;
  priority: number;
}

export class ShutdownHandler {
  private static instance: ShutdownHandler | null = null;
  private handlers: Map<string, ShutdownHandlerConfig> = new Map();
  private isShuttingDown = false;
  private handlerTimeout: number;
  private totalTimeout: number;

  private constructor(
    handlerTimeout = 5000,
    totalTimeout = 30000
  ) {
    this.handlerTimeout = handlerTimeout;
    this.totalTimeout = totalTimeout;
    this.setupSignalHandlers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    handlerTimeout = 5000,
    totalTimeout = 30000
  ): ShutdownHandler {
    if (!ShutdownHandler.instance) {
      ShutdownHandler.instance = new ShutdownHandler(handlerTimeout, totalTimeout);
    }
    return ShutdownHandler.instance;
  }

  /**
   * Register a shutdown handler with priority
   * Higher priority handlers execute first
   */
  public registerHandler(
    name: string,
    fn: ShutdownHandlerFn,
    priority = 0
  ): void {
    if (this.handlers.has(name)) {
      throw new Error(`Shutdown handler "${name}" already registered`);
    }

    this.handlers.set(name, { name, fn, priority });
  }

  /**
   * Remove a registered shutdown handler
   */
  public removeHandler(name: string): boolean {
    return this.handlers.delete(name);
  }

  /**
   * Get all registered handler names
   */
  public getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.shutdown(signal).catch((error) => {
          console.error('Shutdown error:', error);
          process.exit(1);
        });
      });
    });
  }

  /**
   * Execute shutdown sequence
   */
  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      console.warn('Shutdown already in progress, ignoring signal:', signal);
      return;
    }

    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}, starting graceful shutdown...`);

    // Setup force exit timeout
    const forceExitTimer = setTimeout(() => {
      console.error(`Force exit after ${this.totalTimeout}ms timeout`);
      process.exit(1);
    }, this.totalTimeout);

    try {
      // Sort handlers by priority (descending)
      const sortedHandlers = Array.from(this.handlers.values()).sort(
        (a, b) => b.priority - a.priority
      );

      // Execute handlers sequentially
      for (const handler of sortedHandlers) {
        try {
          console.log(`Executing shutdown handler: ${handler.name} (priority: ${handler.priority})`);
          await this.executeWithTimeout(handler);
          console.log(`✓ Handler "${handler.name}" completed`);
        } catch (error) {
          console.error(`✗ Handler "${handler.name}" failed:`, error);
        }
      }

      console.log('Graceful shutdown complete');
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      console.error('Shutdown sequence error:', error);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }

  /**
   * Execute a handler with timeout
   */
  private async executeWithTimeout(
    handler: ShutdownHandlerConfig
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Handler "${handler.name}" timed out after ${this.handlerTimeout}ms`));
      }, this.handlerTimeout);

      Promise.resolve(handler.fn())
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    ShutdownHandler.instance = null;
  }
}

/**
 * Get the singleton shutdown handler instance
 */
export function getShutdownHandler(
  handlerTimeout = 5000,
  totalTimeout = 30000
): ShutdownHandler {
  return ShutdownHandler.getInstance(handlerTimeout, totalTimeout);
}
