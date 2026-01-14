/**
 * ShutdownHandler Example
 *
 * Demonstrates graceful shutdown with multiple handlers
 */

import { getShutdownHandler } from '../src/reliability';

// Simulate services that need cleanup
class DatabaseService {
  async close(): Promise<void> {
    console.log('  → Closing database connections...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('  ✓ Database closed');
  }
}

class CacheService {
  async flush(): Promise<void> {
    console.log('  → Flushing cache...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('  ✓ Cache flushed');
  }
}

class LoggerService {
  async close(): Promise<void> {
    console.log('  → Closing log streams...');
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('  ✓ Logger closed');
  }
}

// Initialize services
const db = new DatabaseService();
const cache = new CacheService();
const logger = new LoggerService();

// Get shutdown handler
const shutdownHandler = getShutdownHandler(
  5000,  // 5s per handler
  30000  // 30s total
);

// Register handlers with priorities
// Higher priority = runs first

// Critical: Close database first (priority 100)
shutdownHandler.registerHandler(
  'database',
  async () => {
    await db.close();
  },
  100
);

// Important: Flush cache second (priority 50)
shutdownHandler.registerHandler(
  'cache',
  async () => {
    await cache.flush();
  },
  50
);

// Normal: Close logger last (priority 10)
shutdownHandler.registerHandler(
  'logger',
  async () => {
    await logger.close();
  },
  10
);

// Application logic
console.log('Application running...');
console.log('Press Ctrl+C to trigger graceful shutdown');

// Keep process alive
setInterval(() => {
  process.stdout.write('.');
}, 1000);

// Expected shutdown sequence when Ctrl+C is pressed:
// 1. Received SIGINT, starting graceful shutdown...
// 2. Executing shutdown handler: database (priority: 100)
//    → Closing database connections...
//    ✓ Database closed
//    ✓ Handler "database" completed
// 3. Executing shutdown handler: cache (priority: 50)
//    → Flushing cache...
//    ✓ Cache flushed
//    ✓ Handler "cache" completed
// 4. Executing shutdown handler: logger (priority: 10)
//    → Closing log streams...
//    ✓ Logger closed
//    ✓ Handler "logger" completed
// 5. Graceful shutdown complete
