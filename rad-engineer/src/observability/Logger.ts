import pino, { type Logger as PinoLogger } from 'pino';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Component name for scoped logging */
  component?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context fields */
  context?: Record<string, unknown>;
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Enable pretty printing (dev mode) */
  pretty?: boolean;
}

/**
 * Structured logging system built on pino
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Rich context (timestamp, level, component, requestId)
 * - JSON format for production, pretty format for dev
 * - Child loggers for scoped logging
 *
 * @example
 * ```ts
 * const logger = new Logger({ component: 'UserService' });
 * logger.info('User created', { userId: '123' });
 *
 * const childLogger = logger.child({ requestId: 'abc' });
 * childLogger.debug('Processing request');
 * ```
 */
export class Logger {
  private logger: PinoLogger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = config;

    // Determine if we're in development mode
    const isDev = process.env.NODE_ENV === 'development' || config.pretty;

    // Create pino logger with appropriate configuration
    this.logger = pino({
      level: config.level || process.env.LOG_LEVEL || 'info',
      base: {
        component: config.component,
        requestId: config.requestId,
        ...config.context,
      },
      // Use pretty printing in dev mode
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      // Production: structured JSON
      formatters: !isDev
        ? {
            level: (label) => {
              return { level: label };
            },
          }
        : undefined,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(data, message);
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(data, message);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(data, message);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.logger.error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message
      );
    } else {
      this.logger.error(error, message);
    }
  }

  /**
   * Create a child logger with additional context
   *
   * @example
   * ```ts
   * const baseLogger = new Logger({ component: 'API' });
   * const requestLogger = baseLogger.child({ requestId: '123' });
   * ```
   */
  child(bindings: Record<string, unknown>): Logger {
    const childConfig: LoggerConfig = {
      ...this.config,
      context: {
        ...this.config.context,
        ...bindings,
      },
    };

    const childLogger = new Logger(childConfig);
    childLogger.logger = this.logger.child(bindings);

    return childLogger;
  }

  /**
   * Get the underlying pino logger instance
   */
  getPinoLogger(): PinoLogger {
    return this.logger;
  }

  /**
   * Flush any buffered logs (useful for graceful shutdown)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush(() => resolve());
    });
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}
