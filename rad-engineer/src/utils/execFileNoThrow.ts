/**
 * execFileNoThrow - Safe execution utility for system commands
 *
 * Unlike execSync, this utility:
 * - NEVER throws on errors
 * - Returns structured result with status flag
 * - Captures both stdout and stderr
 * - Suitable for chaos scenarios (command failures)
 *
 * Usage in ResourceManager:
 * - System resource monitoring commands
 * - Graceful degradation when commands fail
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Result from execFileNoThrow
 */
export interface ExecFileResult {
  /** Command succeeded */
  success: boolean;
  /** Standard output (trimmed) */
  stdout: string;
  /** Standard error (trimmed) */
  stderr: string;
  /** Error code if failed */
  errorCode?: number;
}

/**
 * Execute a command file safely without throwing
 *
 * @param file - Executable file path
 * @param args - Command arguments
 * @param timeout - Optional timeout in milliseconds (default: 5000)
 * @returns ExecFileResult with success flag and output
 *
 * @example
 * ```ts
 * const result = await execFileNoThrow("ps", ["-A"]);
 * if (result.success) {
 *   console.log(result.stdout);
 * } else {
 *   console.error("Command failed:", result.stderr);
 * }
 * ```
 */
export async function execFileNoThrow(
  file: string,
  args: string[] = [],
  timeout: number = 5000
): Promise<ExecFileResult> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout,
      encoding: "utf-8",
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    // Never throw - return structured error
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        errorCode: nodeError.code ? parseInt(nodeError.code as string, 10) : undefined,
      };
    }

    return {
      success: false,
      stdout: "",
      stderr: String(error),
    };
  }
}
