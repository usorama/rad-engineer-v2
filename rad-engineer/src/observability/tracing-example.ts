/**
 * Example usage of the Tracing module
 *
 * This file demonstrates how to use distributed tracing with OpenTelemetry
 * in the rad-engineer platform.
 */

import { TracingProvider, createTracingProvider } from './Tracing.js';
import * as api from '@opentelemetry/api';

// Example 1: Basic initialization with console exporter (development)
function exampleBasicInitialization() {
  const tracing = new TracingProvider();
  tracing.initialize('rad-engineer', {
    environment: 'development',
    exporter: 'console'
  });

  // Use the tracer...
  const span = tracing.createSpan('example-operation');
  // ... do work ...
  span.end();

  // Clean up
  tracing.shutdown();
}

// Example 2: Production initialization with OTLP exporter
function exampleProductionInitialization() {
  const tracing = createTracingProvider('rad-engineer', {
    environment: 'production',
    exporter: 'otlp',
    otlpEndpoint: 'http://collector:4318/v1/traces'
  });

  return tracing;
}

// Example 3: Manual span creation with attributes
async function exampleManualSpan(tracing: TracingProvider) {
  const span = tracing.createSpan('process-task', {
    attributes: {
      taskId: 'task-123',
      userId: 'user-456',
      operation: 'execute'
    },
    kind: api.SpanKind.INTERNAL
  });

  try {
    // ... do work ...
    span.setStatus({ code: api.SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: api.SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

// Example 4: Automatic span wrapper (recommended)
async function exampleWithSpan(tracing: TracingProvider) {
  // The span is automatically created, managed, and ended
  const result = await tracing.withSpan('fetch-data', async () => {
    // If this throws, the span is automatically marked as failed
    const data = await fetchSomeData();
    return data;
  });

  return result;
}

// Example 5: Nested spans (parent-child relationship)
async function exampleNestedSpans(tracing: TracingProvider) {
  return await tracing.withSpan('parent-operation', async () => {
    // Child operations will automatically be nested
    await tracing.withSpan('child-operation-1', async () => {
      // ... do work ...
    });

    await tracing.withSpan('child-operation-2', async () => {
      // ... do work ...
    });

    return 'completed';
  });
}

// Example 6: Integration with agent orchestration
async function exampleAgentOrchestration(tracing: TracingProvider) {
  return await tracing.withSpan('orchestrate-agents', async () => {
    // Span for wave creation
    await tracing.withSpan('create-wave', async () => {
      // ... create wave ...
    });

    // Span for each agent execution
    for (const agent of ['agent-1', 'agent-2', 'agent-3']) {
      await tracing.withSpan('execute-agent', async () => {
        // ... execute agent ...
      }, {
        attributes: {
          agentId: agent,
          waveId: 'wave-1'
        }
      });
    }

    return 'wave-complete';
  });
}

// Example 7: Error handling and recovery
async function exampleErrorHandling(tracing: TracingProvider) {
  try {
    await tracing.withSpan('risky-operation', async () => {
      throw new Error('Something went wrong');
    });
  } catch (error) {
    // The span is already marked as failed
    // Handle the error appropriately
    console.error('Operation failed:', error);
  }
}

// Placeholder for examples
async function fetchSomeData(): Promise<unknown> {
  return { data: 'example' };
}

export {
  exampleBasicInitialization,
  exampleProductionInitialization,
  exampleManualSpan,
  exampleWithSpan,
  exampleNestedSpans,
  exampleAgentOrchestration,
  exampleErrorHandling,
};
