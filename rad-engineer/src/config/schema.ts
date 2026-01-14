/**
 * Configuration Schema
 *
 * Zod-based configuration validation with environment variable support.
 * Provides type-safe configuration loading with sensible defaults.
 */

import { z } from "zod";

/**
 * Log level enum
 */
export const LogLevel = z.enum(["debug", "info", "warn", "error"]);
export type LogLevel = z.infer<typeof LogLevel>;

/**
 * Configuration schema with validation rules
 */
export const ConfigSchema = z.object({
  /**
   * Whether to use real Claude agents (true) or mock agents (false)
   * @env RAD_USE_REAL_AGENTS
   * @default false
   */
  useRealAgents: z
    .string()
    .default("false")
    .refine((val) => val === "true" || val === "false", {
      message: "useRealAgents must be 'true' or 'false'",
    })
    .transform((val) => val === "true"),

  /**
   * Anthropic API key for Claude agents
   * @env RAD_API_KEY
   * @optional
   */
  apiKey: z.string().optional(),

  /**
   * Maximum number of concurrent agents (1-10)
   * @env RAD_MAX_AGENTS
   * @default 3
   */
  maxAgents: z
    .string()
    .default("3")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(10)),

  /**
   * Timeout for agent operations in milliseconds (min 1000ms)
   * @env RAD_TIMEOUT
   * @default 300000 (5 minutes)
   */
  timeout: z
    .string()
    .default("300000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1000)),

  /**
   * Log level for the application
   * @env RAD_LOG_LEVEL
   * @default info
   */
  logLevel: z
    .string()
    .default("info")
    .transform((val) => val as LogLevel)
    .pipe(LogLevel),
});

/**
 * Inferred TypeScript type from schema
 */
export type Config = {
  useRealAgents: boolean;
  apiKey?: string;
  maxAgents: number;
  timeout: number;
  logLevel: LogLevel;
};

/**
 * Load and validate configuration from environment variables
 *
 * @returns Validated configuration object
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * // Load with defaults
 * const config = loadConfig();
 *
 * // Set environment variables
 * process.env.RAD_USE_REAL_AGENTS = "true";
 * process.env.RAD_API_KEY = "sk-ant-...";
 * const config = loadConfig();
 * ```
 */
export function loadConfig(): Config {
  // Extract environment variables with fallbacks
  const envConfig = {
    useRealAgents: process.env.RAD_USE_REAL_AGENTS || "false",
    apiKey: process.env.RAD_API_KEY,
    maxAgents: process.env.RAD_MAX_AGENTS || "3",
    timeout: process.env.RAD_TIMEOUT || "300000",
    logLevel: process.env.RAD_LOG_LEVEL || "info",
  };

  // Parse and validate
  const parsed = ConfigSchema.parse(envConfig);

  // Return typed config
  return {
    useRealAgents: parsed.useRealAgents,
    apiKey: parsed.apiKey,
    maxAgents: parsed.maxAgents,
    timeout: parsed.timeout,
    logLevel: parsed.logLevel,
  };
}

/**
 * Load configuration with error handling
 *
 * @returns Result object with config or error
 *
 * @example
 * ```typescript
 * const result = loadConfigSafe();
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function loadConfigSafe(): { success: true; data: Config } | { success: false; error: z.ZodError } {
  try {
    const config = loadConfig();
    return { success: true, data: config };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Get default configuration values
 *
 * @returns Default configuration object
 */
export function getDefaultConfig(): Config {
  return {
    useRealAgents: false,
    apiKey: undefined,
    maxAgents: 3,
    timeout: 300000,
    logLevel: "info",
  };
}
