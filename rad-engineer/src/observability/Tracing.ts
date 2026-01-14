/**
 * Distributed tracing with OpenTelemetry
 *
 * Provides distributed tracing capabilities for observing request flows
 * across services and components.
 *
 * Features:
 * - Automatic instrumentation with OpenTelemetry
 * - Span creation and management
 * - Context propagation
 * - Configurable exporters (console, OTLP)
 * - Service name and environment attributes
 *
 * @example
 * ```ts
 * import { TracingProvider } from '@/observability';
 *
 * // Initialize tracing
 * const tracing = new TracingProvider();
 * tracing.initialize('rad-engineer');
 *
 * // Create spans manually
 * const span = tracing.createSpan('processRequest', {
 *   attributes: { userId: '123' }
 * });
 * // ... do work ...
 * span.end();
 *
 * // Or use automatic span wrapper
 * await tracing.withSpan('fetchData', async () => {
 *   // ... do async work ...
 *   return result;
 * });
 * ```
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import type { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';

/**
 * Configuration for tracing provider
 */
export interface TracingConfig {
  /** Service name for traces */
  serviceName: string;
  /** Deployment environment (dev, staging, prod) */
  environment?: string;
  /** Exporter type: 'console', 'otlp', or 'memory' */
  exporter?: 'console' | 'otlp' | 'memory';
  /** OTLP endpoint URL (for 'otlp' exporter) */
  otlpEndpoint?: string;
  /** Enable auto-instrumentation (default: true) */
  autoInstrumentation?: boolean;
}

/**
 * Options for creating spans
 */
export interface SpanOptions {
  /** Span attributes */
  attributes?: Record<string, string | number | boolean>;
  /** Span kind */
  kind?: api.SpanKind;
  /** Parent span context */
  parent?: api.Span | api.SpanContext;
}

/**
 * Tracing provider for distributed tracing
 *
 * Manages OpenTelemetry SDK initialization and provides helper methods
 * for creating and managing spans.
 */
export class TracingProvider {
  private sdk: NodeSDK | null = null;
  private tracer: api.Tracer | null = null;
  private initialized = false;

  /**
   * Initialize the tracing provider
   *
   * @param serviceName - Name of the service
   * @param config - Optional configuration
   */
  public initialize(serviceName: string, config?: Partial<TracingConfig>): void {
    if (this.initialized) {
      return;
    }

    const environment = config?.environment || process.env.DEPLOYMENT_ENV || 'development';
    const exporterType = config?.exporter || process.env.OTEL_EXPORTER || 'console';
    const autoInstrumentation = config?.autoInstrumentation !== false; // Default to true

    // Suppress SDK logging in test/development if not explicitly set
    if (!process.env.OTEL_LOG_LEVEL && (environment === 'development' || process.env.NODE_ENV === 'test')) {
      process.env.OTEL_LOG_LEVEL = 'none';
    }

    // Create resource with service name and environment
    const baseResource = defaultResource();
    const customResource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    });
    const resource = baseResource.merge(customResource);

    // Configure exporter based on type
    let spanProcessor;
    if (exporterType === 'otlp') {
      const otlpEndpoint = config?.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
      const exporter = new OTLPTraceExporter({
        url: otlpEndpoint,
      });
      spanProcessor = new SimpleSpanProcessor(exporter);
    } else if (exporterType === 'memory') {
      // In-memory exporter for testing
      const exporter = new InMemorySpanExporter();
      spanProcessor = new SimpleSpanProcessor(exporter);
    } else {
      // Default to console exporter for development
      const exporter = new ConsoleSpanExporter();
      spanProcessor = new SimpleSpanProcessor(exporter);
    }

    // Initialize NodeSDK with optional auto-instrumentation
    this.sdk = new NodeSDK({
      resource,
      spanProcessor,
      instrumentations: autoInstrumentation ? [getNodeAutoInstrumentations()] : [],
    });

    this.sdk.start();

    // Get tracer for manual span creation
    this.tracer = api.trace.getTracer(serviceName, '1.0.0');

    this.initialized = true;
  }

  /**
   * Create a new span
   *
   * @param name - Span name
   * @param options - Span options
   * @returns The created span
   *
   * @example
   * ```ts
   * const span = tracing.createSpan('fetchUser', {
   *   attributes: { userId: '123' }
   * });
   * try {
   *   // ... do work ...
   * } finally {
   *   span.end();
   * }
   * ```
   */
  public createSpan(name: string, options?: SpanOptions): api.Span {
    if (!this.tracer) {
      throw new Error('TracingProvider not initialized. Call initialize() first.');
    }

    const spanOptions: api.SpanOptions = {
      kind: options?.kind || api.SpanKind.INTERNAL,
      attributes: options?.attributes,
    };

    if (options?.parent) {
      if ('spanContext' in options.parent) {
        // It's a Span, get its context
        spanOptions.root = false;
      } else {
        // It's already a SpanContext
        spanOptions.root = false;
      }
    }

    return this.tracer.startSpan(name, spanOptions);
  }

  /**
   * Execute a function within a span
   *
   * Automatically creates a span, executes the function, and ends the span.
   * Handles errors and marks the span as failed if an error occurs.
   *
   * @param name - Span name
   * @param fn - Function to execute
   * @param options - Span options
   * @returns The result of the function
   *
   * @example
   * ```ts
   * const result = await tracing.withSpan('processData', async () => {
   *   return await processData();
   * });
   * ```
   */
  public async withSpan<T>(
    name: string,
    fn: () => T | Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.createSpan(name, options);

    try {
      const result = await fn();
      span.setStatus({ code: api.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Shutdown the tracing provider
   *
   * Flushes pending spans and cleans up resources.
   */
  public async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = null;
      this.tracer = null;
      this.initialized = false;
    }
  }

  /**
   * Check if the tracing provider is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Factory function to create a logger
 *
 * @param serviceName - Service name
 * @param config - Optional configuration
 * @returns Configured TracingProvider instance
 */
export function createTracingProvider(serviceName: string, config?: Partial<TracingConfig>): TracingProvider {
  const provider = new TracingProvider();
  provider.initialize(serviceName, config);
  return provider;
}
