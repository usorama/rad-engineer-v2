# Reliability Module

Provides graceful shutdown and reliability utilities.

## ShutdownHandler

Graceful shutdown system for clean process termination.

### Features

- Register/remove shutdown handlers with priority
- Executes handlers in priority order (higher priority runs first)
- Per-handler timeout (default 5s)
- Total shutdown timeout (default 30s)
- Handles SIGINT, SIGTERM, SIGUSR2 signals
- Force exit after timeout

### Usage

```typescript
import { getShutdownHandler } from './reliability';

// Get the singleton instance
const shutdownHandler = getShutdownHandler();

// Register a shutdown handler
shutdownHandler.registerHandler(
  'database',
  async () => {
    console.log('Closing database connections...');
    await db.close();
  },
  100 // High priority - runs first
);

// Register another handler with lower priority
shutdownHandler.registerHandler(
  'cache',
  async () => {
    console.log('Flushing cache...');
    await cache.flush();
  },
  50 // Lower priority - runs after database
);

// Remove a handler
shutdownHandler.removeHandler('cache');
```

### Configuration

```typescript
// Custom timeouts
const shutdownHandler = getShutdownHandler(
  10000, // Handler timeout: 10s per handler
  60000  // Total timeout: 60s for entire shutdown
);
```

### Priority System

Handlers execute in **descending priority order** (higher numbers first):

```typescript
shutdownHandler.registerHandler('critical', criticalCleanup, 100);  // Runs 1st
shutdownHandler.registerHandler('important', importantCleanup, 50); // Runs 2nd
shutdownHandler.registerHandler('normal', normalCleanup, 0);        // Runs 3rd
```

### Signals Handled

- **SIGINT**: Ctrl+C (interactive termination)
- **SIGTERM**: Graceful shutdown request
- **SIGUSR2**: Custom user signal (used by nodemon/pm2)

### Error Handling

- Individual handler failures are logged but don't stop shutdown
- Handlers that exceed timeout are terminated
- Total timeout triggers force exit
- All errors logged to console

### Testing

Use `resetInstance()` in tests to get a fresh singleton:

```typescript
import { ShutdownHandler } from './reliability';

beforeEach(() => {
  ShutdownHandler.resetInstance();
});
```
