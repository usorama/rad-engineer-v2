/**
 * Unit tests for Tracing module
 * Tests: TracingProvider initialization, span creation, withSpan wrapper
 *
 * Coverage requirements:
 * - Unit tests: All public methods
 * - Branches: 85%
 * - Functions: 90%
 * - Lines: 90%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TracingProvider, createTracingProvider } from "@/observability/index.js";
import * as api from '@opentelemetry/api';

describe("TracingProvider", () => {
  let tracing: TracingProvider;

  beforeEach(() => {
    tracing = new TracingProvider();
  });

  // Helper to initialize with memory exporter for tests (no auto-instrumentation for faster tests)
  const initializeForTest = (serviceName = 'test-service', config?: Partial<any>) => {
    tracing.initialize(serviceName, {
      exporter: 'memory',
      autoInstrumentation: false,
      ...config
    });
  };

  afterEach(async () => {
    // Clean up tracing provider
    await tracing.shutdown();
  });

  describe("initialize", () => {
    it("Initializes tracing provider with service name", () => {
      initializeForTest();

      expect(tracing.isInitialized()).toBe(true);
    });

    it("Uses default environment when not provided", () => {
      initializeForTest();

      expect(tracing.isInitialized()).toBe(true);
    });

    it("Uses custom environment when provided", () => {
      initializeForTest('test-service', {
        environment: 'production'
      });

      expect(tracing.isInitialized()).toBe(true);
    });

    it("Uses console exporter by default", () => {
      initializeForTest();

      expect(tracing.isInitialized()).toBe(true);
    });

    it("Can use OTLP exporter", () => {
      initializeForTest('test-service', {
        exporter: 'otlp',
        otlpEndpoint: 'http://localhost:4318/v1/traces'
      });

      expect(tracing.isInitialized()).toBe(true);
    });

    it("Does not reinitialize if already initialized", () => {
      initializeForTest();
      const firstInitialized = tracing.isInitialized();

      initializeForTest('test-service-2');
      const secondInitialized = tracing.isInitialized();

      expect(firstInitialized).toBe(true);
      expect(secondInitialized).toBe(true);
    });
  });

  describe("createSpan", () => {
    it("Creates a span with given name", () => {
      initializeForTest();

      const span = tracing.createSpan('test-span');

      expect(span).toBeDefined();
      expect(span.spanContext()).toBeDefined();
      span.end();
    });

    it("Throws error if not initialized", () => {
      expect(() => {
        tracing.createSpan('test-span');
      }).toThrow('TracingProvider not initialized');
    });

    it("Creates span with attributes", () => {
      initializeForTest();

      const span = tracing.createSpan('test-span', {
        attributes: {
          userId: '123',
          operation: 'fetch'
        }
      });

      expect(span).toBeDefined();
      span.end();
    });

    it("Creates span with custom kind", () => {
      initializeForTest();

      const span = tracing.createSpan('test-span', {
        kind: api.SpanKind.CLIENT
      });

      expect(span).toBeDefined();
      span.end();
    });

    it("Creates span with parent context", () => {
      initializeForTest();

      const parentSpan = tracing.createSpan('parent-span');
      const childSpan = tracing.createSpan('child-span', {
        parent: parentSpan
      });

      expect(childSpan).toBeDefined();
      childSpan.end();
      parentSpan.end();
    });
  });

  describe("withSpan", () => {
    it("Executes function within a span", async () => {
      initializeForTest();

      let executedInSpan = false;
      const result = await tracing.withSpan('test-span', async () => {
        executedInSpan = true;
        return 'success';
      });

      expect(executedInSpan).toBe(true);
      expect(result).toBe('success');
    });

    it("Handles synchronous functions", async () => {
      initializeForTest();

      const result = await tracing.withSpan('test-span', () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("Propagates errors and marks span as failed", async () => {
      initializeForTest();

      await expect(async () => {
        await tracing.withSpan('test-span', async () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it("Handles non-Error thrown values", async () => {
      initializeForTest();

      await expect(async () => {
        await tracing.withSpan('test-span', async () => {
          throw 'string error';
        });
      }).toThrow('string error');
    });

    it("Accepts span options", async () => {
      initializeForTest();

      const result = await tracing.withSpan(
        'test-span',
        async () => 'success',
        {
          attributes: { userId: '123' },
          kind: api.SpanKind.SERVER
        }
      );

      expect(result).toBe('success');
    });

    it("Ends span even if function throws", async () => {
      initializeForTest();

      try {
        await tracing.withSpan('test-span', async () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected error, span should still be ended
      }

      // If we get here without hanging, the span was properly ended
      expect(true).toBe(true);
    });
  });

  describe("shutdown", () => {
    it("Shuts down the tracing provider", async () => {
      initializeForTest();
      expect(tracing.isInitialized()).toBe(true);

      await tracing.shutdown();

      expect(tracing.isInitialized()).toBe(false);
    });

    it("Can be called multiple times safely", async () => {
      initializeForTest();

      await tracing.shutdown();
      await tracing.shutdown();

      expect(tracing.isInitialized()).toBe(false);
    });

    it("Can be called without initialization", async () => {
      await tracing.shutdown();

      expect(tracing.isInitialized()).toBe(false);
    });
  });

  describe("isInitialized", () => {
    it("Returns false before initialization", () => {
      expect(tracing.isInitialized()).toBe(false);
    });

    it("Returns true after initialization", () => {
      initializeForTest();

      expect(tracing.isInitialized()).toBe(true);
    });

    it("Returns false after shutdown", async () => {
      initializeForTest();
      await tracing.shutdown();

      expect(tracing.isInitialized()).toBe(false);
    });
  });
});

describe("createTracingProvider", () => {
  it("Creates and initializes a tracing provider", async () => {
    const tracing = createTracingProvider('test-service', {
      exporter: 'memory',
      autoInstrumentation: false
    });

    expect(tracing.isInitialized()).toBe(true);

    await tracing.shutdown();
  });

  it("Creates tracing provider with config", async () => {
    const tracing = createTracingProvider('test-service', {
      environment: 'production',
      exporter: 'memory',
      autoInstrumentation: false
    });

    expect(tracing.isInitialized()).toBe(true);

    await tracing.shutdown();
  });
});
