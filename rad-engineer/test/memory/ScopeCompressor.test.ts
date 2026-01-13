import { describe, it, expect } from "bun:test";
import { ScopeCompressor, CompressionStrategy, type CompressionResult } from "../../src/memory/ScopeCompressor";
import { Scope, ScopeLevel, type ContextEvent } from "../../src/memory/Scope";
import { ScopeStack } from "../../src/memory/ScopeStack";

describe("ScopeCompressor", () => {
  describe("constructor", () => {
    it("should create compressor with default strategy", () => {
      const compressor = new ScopeCompressor();
      expect(compressor).toBeInstanceOf(ScopeCompressor);
    });

    it("should create compressor with specified strategy", () => {
      const compressor = new ScopeCompressor(CompressionStrategy.AGGRESSIVE);
      expect(compressor).toBeInstanceOf(ScopeCompressor);
    });
  });

  describe("compressScope", () => {
    it("should compress single scope to summary", async () => {
      const compressor = new ScopeCompressor();

      const events: ContextEvent[] = [
        {
          id: "event-1",
          type: "USER_INPUT",
          timestamp: new Date(),
          data: { message: "Hello world, this is a test message with content" },
        },
        {
          id: "event-2",
          type: "AGENT_OUTPUT",
          timestamp: new Date(),
          data: { response: "I understand your request and will help you with this task" },
        },
        {
          id: "event-3",
          type: "TOOL_EXECUTION",
          timestamp: new Date(),
          data: { tool: "calculator", result: "42", operation: "multiply 6 by 7" },
        },
      ];

      const scope = new Scope({
        id: "compress-me",
        parentId: null,
        goal: "Test compression with substantial content to see compression ratio",
        level: ScopeLevel.LOCAL,
        events,
      });

      scope.setArtifact("testData", { value: "Some artifact data for testing compression" });
      scope.close("Completed successfully with all objectives met");

      const result = await compressor.compressScope(scope);

      expect(result.originalTokenCount).toBeGreaterThan(0);
      expect(result.compressedTokenCount).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeGreaterThan(1);
      expect(result.summary.toLowerCase()).toContain("test");
      expect(result.summary.toLowerCase()).toContain("compression");
      expect(result.eventSummary).toBeDefined();
      expect(result.artifactSummary).toBeDefined();
    });

    it("should achieve compression ratio >= 5:1 for substantial content", async () => {
      const compressor = new ScopeCompressor(CompressionStrategy.AGGRESSIVE);

      // Create scope with substantial content
      const events: ContextEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `event-${i}`,
        type: "USER_INPUT" as const,
        timestamp: new Date(),
        data: {
          message: `This is a detailed message ${i} with substantial content that should compress well. It contains multiple sentences with repetitive patterns and verbose descriptions that the compressor should be able to summarize effectively.`,
        },
      }));

      const scope = new Scope({
        id: "large-scope",
        parentId: null,
        goal: "Complex goal with detailed description that includes multiple requirements, edge cases, and comprehensive acceptance criteria that should compress to a much shorter summary",
        level: ScopeLevel.LOCAL,
        events,
      });

      // Add substantial artifact data
      scope.setArtifact("largeData", {
        description: "Comprehensive artifact with extensive metadata",
        results: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `result-${i}` })),
        analysis: "Detailed analysis with multiple paragraphs explaining the approach, methodology, and findings from the executed task",
      });

      scope.close("Completed successfully after processing all requirements and delivering comprehensive results");

      const result = await compressor.compressScope(scope);

      expect(result.compressionRatio).toBeGreaterThanOrEqual(5);
      expect(result.originalTokenCount).toBeGreaterThan(result.compressedTokenCount * 5);
    });

    it("should preserve essential information in compressed summary", async () => {
      const compressor = new ScopeCompressor();

      const scope = new Scope({
        id: "preserve-info",
        parentId: null,
        goal: "Generate user report",
        level: ScopeLevel.TASK,
        events: [
          {
            id: "event-1",
            type: "USER_INPUT",
            timestamp: new Date(),
            data: { request: "Create financial report" },
          },
          {
            id: "event-2",
            type: "TOOL_EXECUTION",
            timestamp: new Date(),
            data: { tool: "database", result: "Retrieved 1000 records" },
          },
        ],
      });

      scope.setArtifact("reportData", { totalRecords: 1000, status: "success" });
      scope.close("Report generated successfully");

      const result = await compressor.compressScope(scope);

      // Should preserve key information
      expect(result.summary.toLowerCase()).toContain("report");
      expect(result.eventSummary.toLowerCase()).toMatch(/2ev|event/);
      expect(result.artifactSummary.toLowerCase()).toMatch(/1art|artifact/);
    });

    it("should handle empty scope gracefully", async () => {
      const compressor = new ScopeCompressor();

      const scope = new Scope({
        id: "empty-scope",
        parentId: null,
        goal: "Empty test",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      scope.close("No content");

      const result = await compressor.compressScope(scope);

      expect(result.originalTokenCount).toBeGreaterThan(0); // Goal + summary at minimum
      expect(result.compressedTokenCount).toBeGreaterThan(0);
      expect(result.summary.toLowerCase()).toContain("empty");
    });
  });

  describe("compressStack", () => {
    it("should compress multiple scopes in stack", async () => {
      const compressor = new ScopeCompressor();
      const stack = new ScopeStack();

      // Create multiple scopes with content
      const scope1 = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "First scope with content",
        level: ScopeLevel.GLOBAL,
        events: [
          {
            id: "event-1",
            type: "USER_INPUT",
            timestamp: new Date(),
            data: { message: "Initial input for first scope" },
          },
        ],
      });

      const scope2 = new Scope({
        id: "scope-2",
        parentId: "scope-1",
        goal: "Second scope with more content",
        level: ScopeLevel.TASK,
        events: [
          {
            id: "event-2",
            type: "AGENT_OUTPUT",
            timestamp: new Date(),
            data: { response: "Processing task in second scope" },
          },
        ],
      });

      scope1.close("First scope completed");
      scope2.close("Second scope completed");

      stack.push(scope1);
      stack.push(scope2);

      const results = await compressor.compressStack(stack);

      expect(results).toHaveLength(2);
      expect(results[0].summary.toLowerCase()).toContain("first");
      expect(results[1].summary.toLowerCase()).toContain("second");
    });

    it("should only compress closed scopes", async () => {
      const compressor = new ScopeCompressor();
      const stack = new ScopeStack();

      const closedScope = new Scope({
        id: "closed",
        parentId: null,
        goal: "Closed scope",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      const openScope = new Scope({
        id: "open",
        parentId: null,
        goal: "Open scope",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      closedScope.close("Finished");
      // openScope remains open

      stack.push(closedScope);
      stack.push(openScope);

      const results = await compressor.compressStack(stack);

      expect(results).toHaveLength(1); // Only closed scope compressed
      expect(results[0].summary.toLowerCase()).toContain("closed");
    });

    it("should compress scopes by level when specified", async () => {
      const compressor = new ScopeCompressor();
      const stack = new ScopeStack();

      const globalScope = new Scope({
        id: "global",
        parentId: null,
        goal: "Global scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const localScope = new Scope({
        id: "local",
        parentId: "global",
        goal: "Local scope",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      globalScope.close("Global done");
      localScope.close("Local done");

      stack.push(globalScope);
      stack.push(localScope);

      const results = await compressor.compressStack(stack, ScopeLevel.LOCAL);

      expect(results).toHaveLength(1); // Only LOCAL level compressed
      expect(results[0].summary.toLowerCase()).toContain("local");
    });
  });

  describe("getCompressionMetrics", () => {
    it("should return metrics for completed compressions", () => {
      const compressor = new ScopeCompressor();
      const metrics = compressor.getCompressionMetrics();

      expect(metrics.totalCompressed).toBe(0);
      expect(metrics.totalTokensSaved).toBe(0);
      expect(metrics.averageCompressionRatio).toBe(0);
      expect(metrics.bestCompressionRatio).toBe(0);
    });

    it("should track metrics across compressions", async () => {
      const compressor = new ScopeCompressor();

      const scope1 = new Scope({
        id: "metrics-1",
        parentId: null,
        goal: "First scope for metrics tracking with content",
        level: ScopeLevel.LOCAL,
        events: [
          {
            id: "event-1",
            type: "USER_INPUT",
            timestamp: new Date(),
            data: { message: "Content for metrics test" },
          },
        ],
      });

      const scope2 = new Scope({
        id: "metrics-2",
        parentId: null,
        goal: "Second scope for metrics tracking with more content",
        level: ScopeLevel.LOCAL,
        events: [
          {
            id: "event-2",
            type: "AGENT_OUTPUT",
            timestamp: new Date(),
            data: { response: "More content for metrics test" },
          },
        ],
      });

      scope1.close("First completed");
      scope2.close("Second completed");

      await compressor.compressScope(scope1);
      await compressor.compressScope(scope2);

      const metrics = compressor.getCompressionMetrics();

      expect(metrics.totalCompressed).toBe(2);
      expect(metrics.totalTokensSaved).toBeGreaterThan(0);
      expect(metrics.averageCompressionRatio).toBeGreaterThan(1);
    });
  });

  describe("clearMetrics", () => {
    it("should reset compression metrics", async () => {
      const compressor = new ScopeCompressor();

      const scope = new Scope({
        id: "clear-test",
        parentId: null,
        goal: "Test scope for clearing metrics",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      scope.close("Done");

      await compressor.compressScope(scope);

      let metrics = compressor.getCompressionMetrics();
      expect(metrics.totalCompressed).toBe(1);

      compressor.clearMetrics();

      metrics = compressor.getCompressionMetrics();
      expect(metrics.totalCompressed).toBe(0);
      expect(metrics.totalTokensSaved).toBe(0);
    });
  });
});