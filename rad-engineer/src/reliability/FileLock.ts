import * as lockfile from 'proper-lockfile';
import type { LockOptions } from 'proper-lockfile';

export interface FileLockOptions {
  timeout?: number; // Timeout in milliseconds (default: 10000)
  retries?: number; // Number of retries (default: 0)
  retryDelay?: number; // Delay between retries in ms (default: 100)
  stale?: number; // Time in ms to consider lock stale (default: 10000)
}

export interface LockHandle {
  filePath: string;
  release: () => Promise<void>;
}

/**
 * FileLock provides file-based locking mechanism to prevent concurrent access issues.
 *
 * Uses proper-lockfile under the hood which creates a lockfile alongside the target file.
 *
 * @example
 * ```typescript
 * const fileLock = new FileLock();
 *
 * // Manual lock management
 * const handle = await fileLock.acquireLock('data.json');
 * try {
 *   // Do work with file
 * } finally {
 *   await handle.release();
 * }
 *
 * // Automatic lock management
 * await fileLock.withLock('data.json', async () => {
 *   // Do work with file
 * });
 * ```
 */
export class FileLock {
  private readonly defaultOptions: Required<FileLockOptions> = {
    timeout: 10000,
    retries: 0,
    retryDelay: 100,
    stale: 10000,
  };

  /**
   * Acquire a lock on the specified file.
   *
   * @param filePath - Path to the file to lock
   * @param options - Lock options
   * @returns Lock handle with release method
   * @throws Error if lock cannot be acquired within timeout
   */
  async acquireLock(
    filePath: string,
    options?: FileLockOptions
  ): Promise<LockHandle> {
    const opts = { ...this.defaultOptions, ...options };

    const lockfileOptions: LockOptions = {
      retries: {
        retries: opts.retries,
        minTimeout: opts.retryDelay,
        maxTimeout: opts.retryDelay,
      },
      stale: opts.stale,
    };

    try {
      // Acquire the lock with timeout
      const release = await this.withTimeout(
        lockfile.lock(filePath, lockfileOptions),
        opts.timeout,
        `Failed to acquire lock on ${filePath} within ${opts.timeout}ms`
      );

      return {
        filePath,
        release: async () => {
          try {
            await release();
          } catch (error) {
            // Swallow errors on release - lock might already be released
            console.warn(`Warning: Failed to release lock on ${filePath}:`, error);
          }
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to acquire lock on ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Release a lock on the specified file.
   *
   * @param filePath - Path to the file to unlock
   * @throws Error if lock cannot be released
   */
  async releaseLock(filePath: string): Promise<void> {
    try {
      await lockfile.unlock(filePath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to release lock on ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Execute a function with automatic lock management.
   *
   * The lock is acquired before the function executes and released afterwards,
   * even if the function throws an error.
   *
   * @param filePath - Path to the file to lock
   * @param fn - Function to execute while holding the lock
   * @param options - Lock options
   * @returns Result of the function
   * @throws Error if lock cannot be acquired or function throws
   */
  async withLock<T>(
    filePath: string,
    fn: () => Promise<T>,
    options?: FileLockOptions
  ): Promise<T> {
    const handle = await this.acquireLock(filePath, options);

    try {
      return await fn();
    } finally {
      await handle.release();
    }
  }

  /**
   * Check if a file is currently locked.
   *
   * @param filePath - Path to the file to check
   * @returns true if file is locked, false otherwise
   */
  async isLocked(filePath: string): Promise<boolean> {
    try {
      return await lockfile.check(filePath);
    } catch {
      // If we can't check, assume not locked
      return false;
    }
  }

  /**
   * Wrap a promise with a timeout.
   *
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param errorMessage - Error message if timeout occurs
   * @returns Promise that rejects if timeout occurs
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  }
}
