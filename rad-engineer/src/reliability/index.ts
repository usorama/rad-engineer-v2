/**
 * Reliability Module
 *
 * Exports:
 * - ShutdownHandler: Graceful shutdown system
 * - FileLock: File locking mechanism to prevent concurrent access
 */

export { ShutdownHandler, getShutdownHandler } from './ShutdownHandler';
export { FileLock } from './FileLock';
export type { FileLockOptions, LockHandle } from './FileLock';
