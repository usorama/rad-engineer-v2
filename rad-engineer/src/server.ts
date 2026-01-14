/**
 * HTTP Server for rad-engineer in Docker
 *
 * Provides:
 * - Health endpoints (/health/live, /health/ready)
 * - Metrics endpoint (/metrics)
 */

import { HealthChecker } from "./observability/HealthChecker.js";
import { Metrics } from "./observability/Metrics.js";

const PORT = Number(process.env.PORT) || 3000;
const METRICS_PORT = Number(process.env.METRICS_PORT) || 9090;

// Initialize health checker and metrics
const healthChecker = new HealthChecker({ timeout: 5000 });
const metrics = new Metrics();

// Register basic health checks
healthChecker.registerCheck("system", async () => ({
  status: "healthy",
  message: "System is running",
}));

// Main application server
const server = Bun.serve({
  port: PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health endpoints
    if (path === "/health/live" || path === "/health") {
      const result = await healthChecker.liveness();
      return new Response(JSON.stringify(result, null, 2), {
        status: result.status === "healthy" ? 200 : 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/health/ready") {
      const result = await healthChecker.readiness();
      return new Response(JSON.stringify(result, null, 2), {
        status: result.status === "healthy" ? 200 : 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // API info endpoint
    if (path === "/" || path === "/api") {
      return new Response(
        JSON.stringify(
          {
            name: "rad-engineer",
            version: "1.0.0",
            status: "running",
            endpoints: {
              health: "/health/live",
              ready: "/health/ready",
              metrics: `http://localhost:${METRICS_PORT}/metrics`,
            },
          },
          null,
          2
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
});

// Metrics server on separate port
const metricsServer = Bun.serve({
  port: METRICS_PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/metrics") {
      const metricsData = await metrics.getMetrics();
      return new Response(metricsData, {
        status: 200,
        headers: { "Content-Type": "text/plain; version=0.0.4" },
      });
    }

    // Redirect root to metrics
    if (path === "/") {
      return Response.redirect(`http://localhost:${METRICS_PORT}/metrics`);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`
=====================================
  rad-engineer Server Started
=====================================
  Main server:    http://localhost:${PORT}
  Metrics server: http://localhost:${METRICS_PORT}/metrics

  Endpoints:
    GET /            - API info
    GET /health/live - Liveness probe
    GET /health/ready - Readiness probe
    GET /metrics     - Prometheus metrics (port ${METRICS_PORT})
=====================================
`);

// Keep process running
process.on("SIGINT", () => {
  console.log("Shutting down...");
  server.stop();
  metricsServer.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  server.stop();
  metricsServer.stop();
  process.exit(0);
});
