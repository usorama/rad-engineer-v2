import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ShutdownHandler, getShutdownHandler } from '../../src/reliability/ShutdownHandler';

describe('ShutdownHandler', () => {
  beforeEach(() => {
    ShutdownHandler.resetInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ShutdownHandler.getInstance();
      const instance2 = ShutdownHandler.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should work via getShutdownHandler helper', () => {
      const handler = getShutdownHandler();
      expect(handler).toBeInstanceOf(ShutdownHandler);
    });

    it('should reset instance for testing', () => {
      const instance1 = ShutdownHandler.getInstance();
      ShutdownHandler.resetInstance();
      const instance2 = ShutdownHandler.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('handler registration', () => {
    it('should register a handler', () => {
      const handler = ShutdownHandler.getInstance();
      const fn = mock();

      handler.registerHandler('test', fn, 10);

      expect(handler.getHandlerNames()).toContain('test');
    });

    it('should throw if handler name already exists', () => {
      const handler = ShutdownHandler.getInstance();
      const fn = mock();

      handler.registerHandler('test', fn);

      expect(() => {
        handler.registerHandler('test', fn);
      }).toThrow('Shutdown handler "test" already registered');
    });

    it('should remove a handler', () => {
      const handler = ShutdownHandler.getInstance();
      const fn = mock();

      handler.registerHandler('test', fn);
      const removed = handler.removeHandler('test');

      expect(removed).toBe(true);
      expect(handler.getHandlerNames()).not.toContain('test');
    });

    it('should return false when removing non-existent handler', () => {
      const handler = ShutdownHandler.getInstance();
      const removed = handler.removeHandler('nonexistent');

      expect(removed).toBe(false);
    });
  });

  describe('handler priority', () => {
    it('should register handlers with default priority 0', () => {
      const handler = ShutdownHandler.getInstance();
      const fn = mock();

      handler.registerHandler('test', fn);
      expect(handler.getHandlerNames()).toContain('test');
    });

    it('should accept custom priorities', () => {
      const handler = ShutdownHandler.getInstance();
      const fn1 = mock();
      const fn2 = mock();

      handler.registerHandler('high', fn1, 100);
      handler.registerHandler('low', fn2, 1);

      expect(handler.getHandlerNames()).toContain('high');
      expect(handler.getHandlerNames()).toContain('low');
    });
  });

  describe('configuration', () => {
    it('should accept custom handler timeout', () => {
      const handler = ShutdownHandler.getInstance(10000);
      expect(handler).toBeInstanceOf(ShutdownHandler);
    });

    it('should accept custom total timeout', () => {
      const handler = ShutdownHandler.getInstance(5000, 60000);
      expect(handler).toBeInstanceOf(ShutdownHandler);
    });
  });

  describe('async handlers', () => {
    it('should support async handler functions', () => {
      const handler = ShutdownHandler.getInstance();
      const asyncFn = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      handler.registerHandler('async', asyncFn);
      expect(handler.getHandlerNames()).toContain('async');
    });

    it('should support sync handler functions', () => {
      const handler = ShutdownHandler.getInstance();
      const syncFn = mock(() => {
        // Sync operation
      });

      handler.registerHandler('sync', syncFn);
      expect(handler.getHandlerNames()).toContain('sync');
    });
  });
});
