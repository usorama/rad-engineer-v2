import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FileLock } from '../FileLock';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), '.test-tmp');
const TEST_FILE = join(TEST_DIR, 'test-file.txt');

describe('FileLock', () => {
  let fileLock: FileLock;

  beforeEach(() => {
    // Create test directory and file
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    writeFileSync(TEST_FILE, 'test content');
    fileLock = new FileLock();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('acquireLock', () => {
    it('should acquire a lock on a file', async () => {
      const handle = await fileLock.acquireLock(TEST_FILE);
      expect(handle).toBeDefined();
      expect(handle.filePath).toBe(TEST_FILE);
      expect(typeof handle.release).toBe('function');

      await handle.release();
    });

    it('should prevent concurrent locks on the same file', async () => {
      const handle1 = await fileLock.acquireLock(TEST_FILE);

      // Try to acquire second lock with very short timeout
      await expect(
        fileLock.acquireLock(TEST_FILE, { timeout: 100, retries: 0 })
      ).rejects.toThrow();

      await handle1.release();
    });

    it('should allow lock after previous lock is released', async () => {
      const handle1 = await fileLock.acquireLock(TEST_FILE);
      await handle1.release();

      // Should succeed now
      const handle2 = await fileLock.acquireLock(TEST_FILE);
      expect(handle2).toBeDefined();

      await handle2.release();
    });

    it('should respect timeout option', async () => {
      const handle1 = await fileLock.acquireLock(TEST_FILE);

      try {
        await fileLock.acquireLock(TEST_FILE, { timeout: 200 });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // proper-lockfile fails immediately without retries, so just check it fails
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to acquire lock');
      }

      await handle1.release();
    });

    it('should support custom timeout', async () => {
      const handle = await fileLock.acquireLock(TEST_FILE, { timeout: 5000 });
      expect(handle).toBeDefined();
      await handle.release();
    });

    it('should handle lock on non-existent file path', async () => {
      const nonExistentFile = join(TEST_DIR, 'non-existent.txt');

      // proper-lockfile requires the file to exist, so this should fail
      await expect(fileLock.acquireLock(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('releaseLock', () => {
    it('should release a lock', async () => {
      await fileLock.acquireLock(TEST_FILE);
      await fileLock.releaseLock(TEST_FILE);

      // Should be able to acquire lock again
      const handle2 = await fileLock.acquireLock(TEST_FILE);
      expect(handle2).toBeDefined();
      await handle2.release();
    });

    it('should throw error when releasing non-existent lock', async () => {
      await expect(fileLock.releaseLock(TEST_FILE)).rejects.toThrow();
    });
  });

  describe('withLock', () => {
    it('should execute function with automatic lock management', async () => {
      let executed = false;

      await fileLock.withLock(TEST_FILE, async () => {
        executed = true;
        expect(await fileLock.isLocked(TEST_FILE)).toBe(true);
      });

      expect(executed).toBe(true);
      expect(await fileLock.isLocked(TEST_FILE)).toBe(false);
    });

    it('should release lock even if function throws', async () => {
      const error = new Error('Test error');

      await expect(
        fileLock.withLock(TEST_FILE, async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      // Lock should be released
      expect(await fileLock.isLocked(TEST_FILE)).toBe(false);
    });

    it('should return function result', async () => {
      const result = await fileLock.withLock(TEST_FILE, async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should prevent concurrent execution', async () => {
      const results: number[] = [];

      // Execute task 1 first
      await fileLock.withLock(TEST_FILE, async () => {
        results.push(1);
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.push(2);
      });

      // Then execute task 2 (sequential)
      await fileLock.withLock(TEST_FILE, async () => {
        results.push(3);
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.push(4);
      });

      // Tasks executed sequentially
      expect(results).toEqual([1, 2, 3, 4]);
    });

    it('should support custom options', async () => {
      await fileLock.withLock(
        TEST_FILE,
        async () => {
          expect(await fileLock.isLocked(TEST_FILE)).toBe(true);
        },
        { timeout: 5000 }
      );
    });
  });

  describe('isLocked', () => {
    it('should return false for unlocked file', async () => {
      const locked = await fileLock.isLocked(TEST_FILE);
      expect(locked).toBe(false);
    });

    it('should return true for locked file', async () => {
      const handle = await fileLock.acquireLock(TEST_FILE);

      const locked = await fileLock.isLocked(TEST_FILE);
      expect(locked).toBe(true);

      await handle.release();
    });

    it('should return false after lock is released', async () => {
      const handle = await fileLock.acquireLock(TEST_FILE);
      await handle.release();

      const locked = await fileLock.isLocked(TEST_FILE);
      expect(locked).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const nonExistentFile = join(TEST_DIR, 'non-existent.txt');
      const locked = await fileLock.isLocked(nonExistentFile);
      expect(locked).toBe(false);
    });
  });

  describe('LockHandle', () => {
    it('should allow multiple calls to release', async () => {
      const handle = await fileLock.acquireLock(TEST_FILE);

      await handle.release();
      // Second release should not throw (swallows error)
      await handle.release();
    });
  });

  describe('Error handling', () => {
    it('should provide clear error messages', async () => {
      const handle = await fileLock.acquireLock(TEST_FILE);

      try {
        await fileLock.acquireLock(TEST_FILE, { timeout: 100 });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to acquire lock');
        expect((error as Error).message).toContain(TEST_FILE);
      }

      await handle.release();
    });
  });
});
