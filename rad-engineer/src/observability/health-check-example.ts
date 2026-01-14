/**
 * Health Check System Usage Examples
 *
 * This file demonstrates how to use the HealthChecker for liveness and readiness probes.
 */

import { HealthChecker } from './HealthChecker.js';
import type { HealthCheckFunction } from './HealthCheck.js';

// Create health checker with 5 second timeout (default)
const healthChecker = new HealthChecker({ timeout: 5000 });

// Example health check functions
const databaseHealthCheck: HealthCheckFunction = async () => {
  try {
    // Simulate database ping
    // await db.ping();
    return {
      status: 'healthy',
      message: 'Database connection is active',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
};

const cacheHealthCheck: HealthCheckFunction = async () => {
  try {
    // Simulate cache check
    // await redis.ping();
    return {
      status: 'healthy',
      message: 'Cache is responding',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Cache check failed',
    };
  }
};

// Register health checks
// Required checks (default) - must pass for readiness
healthChecker.registerCheck('database', databaseHealthCheck);
healthChecker.registerCheck('cache', cacheHealthCheck);

// Optional check - won't affect readiness status
healthChecker.registerCheck('metrics', async () => {
  return { status: 'healthy', message: 'Metrics collection active' };
}, false); // false = not required

// HTTP endpoint handlers (example with Express)
/*
app.get('/health/live', async (req, res) => {
  const result = await healthChecker.liveness();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(result);
});

app.get('/health/ready', async (req, res) => {
  const result = await healthChecker.readiness();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(result);
});
*/

// Example responses:
//
// Liveness (always healthy if process is running):
// {
//   "status": "healthy",
//   "checks": {
//     "process": {
//       "status": "healthy",
//       "message": "Process is running",
//       "latency": 0
//     }
//   },
//   "timestamp": "2026-01-14T05:00:00.000Z"
// }
//
// Readiness (healthy only if all required checks pass):
// {
//   "status": "healthy",
//   "checks": {
//     "database": {
//       "status": "healthy",
//       "message": "Database connection is active",
//       "latency": 23
//     },
//     "cache": {
//       "status": "healthy",
//       "message": "Cache is responding",
//       "latency": 12
//     },
//     "metrics": {
//       "status": "healthy",
//       "message": "Metrics collection active",
//       "latency": 1
//     }
//   },
//   "timestamp": "2026-01-14T05:00:00.000Z"
// }

export { healthChecker };
