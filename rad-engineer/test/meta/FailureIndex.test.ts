/**
 * Tests for Failure Index components
 *
 * Tests cover:
 * - FailureEmbedding: Vector generation and similarity
 * - FailureIndex: Storage, search, and persistence
 * - ResolutionMatcher: Matching and ranking
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  FailureEmbedding,
  FailureContext,
  EmbeddingResult,
} from "../../src/meta/FailureEmbedding.js";
import {
  FailureIndex,
  FailureRecord,
  Resolution,
} from "../../src/meta/FailureIndex.js";
import {
  ResolutionMatcher,
  MatchResult,
} from "../../src/meta/ResolutionMatcher.js";

// Test helpers
function createFailureContext(
  message: string,
  type: string = "Error",
  options: Partial<FailureContext> = {}
): FailureContext {
  return {
    message,
    type,
    ...options,
  };
}

function createResolution(
  description: string,
  successful: boolean = true,
  options: Partial<Resolution> = {}
): Resolution {
  return {
    id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    description,
    action: options.action || "Applied fix",
    successful,
    ...options,
  };
}

// ================================
// FailureEmbedding Tests
// ================================
describe("FailureEmbedding", () => {
  let embedding: FailureEmbedding;

  beforeEach(() => {
    embedding = new FailureEmbedding();
  });

  describe("embed", () => {
    it("should generate embedding for failure context", () => {
      const context = createFailureContext(
        "Cannot read property 'foo' of undefined",
        "TypeError"
      );

      const result = embedding.embed(context);

      expect(result.vector).toBeDefined();
      expect(result.vector.length).toBe(128);
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.normalizedMessage).toBeDefined();
    });

    it("should normalize message during embedding", () => {
      const context = createFailureContext(
        "  ERROR:  Multiple   spaces!  ",
        "Error"
      );

      const result = embedding.embed(context);

      expect(result.normalizedMessage).toBe("error multiple spaces");
    });

    it("should filter stop words from tokens", () => {
      const context = createFailureContext(
        "The variable is being defined in the scope",
        "ReferenceError"
      );

      const result = embedding.embed(context);

      expect(result.tokens).not.toContain("the");
      expect(result.tokens).not.toContain("is");
      expect(result.tokens).not.toContain("being");
      expect(result.tokens).not.toContain("in");
      expect(result.tokens).toContain("variable");
      expect(result.tokens).toContain("defined");
      expect(result.tokens).toContain("scope");
    });

    it("should generate normalized vectors", () => {
      const context = createFailureContext("Some error message", "Error");

      const result = embedding.embed(context);

      // Check vector is normalized (magnitude ~= 1)
      const magnitude = Math.sqrt(
        result.vector.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it("should update vocabulary with new tokens", () => {
      const initialSize = embedding.getVocabularySize();

      embedding.embed(createFailureContext("unique_error_token", "Error"));

      expect(embedding.getVocabularySize()).toBeGreaterThan(initialSize);
    });
  });

  describe("similarity", () => {
    it("should return high similarity for identical messages", () => {
      const context1 = createFailureContext("Connection timeout", "NetworkError");
      const context2 = createFailureContext("Connection timeout", "NetworkError");

      const emb1 = embedding.embed(context1);
      const emb2 = embedding.embed(context2);

      const sim = embedding.similarity(emb1, emb2);

      expect(sim).toBeGreaterThan(0.9);
    });

    it("should return high similarity for similar messages", () => {
      const context1 = createFailureContext(
        "Connection timeout after 30 seconds",
        "NetworkError"
      );
      const context2 = createFailureContext(
        "Connection timeout after 60 seconds",
        "NetworkError"
      );

      const emb1 = embedding.embed(context1);
      const emb2 = embedding.embed(context2);

      const sim = embedding.similarity(emb1, emb2);

      expect(sim).toBeGreaterThan(0.7);
    });

    it("should return lower similarity for different messages", () => {
      const context1 = createFailureContext("Connection timeout", "NetworkError");
      const context2 = createFailureContext("Syntax error in file", "SyntaxError");

      const emb1 = embedding.embed(context1);
      const emb2 = embedding.embed(context2);

      const sim = embedding.similarity(emb1, emb2);

      expect(sim).toBeLessThan(0.5);
    });
  });

  describe("batchEmbed", () => {
    it("should embed multiple contexts efficiently", () => {
      const contexts = [
        createFailureContext("Error 1", "TypeError"),
        createFailureContext("Error 2", "ReferenceError"),
        createFailureContext("Error 3", "SyntaxError"),
      ];

      const results = embedding.batchEmbed(contexts);

      expect(results.length).toBe(3);
      expect(embedding.getDocumentCount()).toBeGreaterThanOrEqual(3);
    });
  });

  describe("findSimilar", () => {
    it("should find most similar embeddings", () => {
      const contexts = [
        createFailureContext("Database connection failed", "DatabaseError"),
        createFailureContext("Network timeout occurred", "NetworkError"),
        createFailureContext("Database query timeout", "DatabaseError"),
        createFailureContext("Syntax error in SQL", "SyntaxError"),
      ];

      const embeddings = contexts.map((c) => embedding.embed(c));
      const query = embedding.embed(
        createFailureContext("Database connection timeout", "DatabaseError")
      );

      const similar = embedding.findSimilar(query, embeddings, 2);

      expect(similar.length).toBe(2);
      expect(similar[0].similarity).toBeGreaterThan(similar[1].similarity);
    });
  });

  describe("persistence", () => {
    it("should export and import state", () => {
      // Build some vocabulary
      embedding.embed(createFailureContext("Error one", "TypeError"));
      embedding.embed(createFailureContext("Error two", "ReferenceError"));

      const exported = embedding.exportState();

      // Create new embedding and import
      const newEmbedding = new FailureEmbedding();
      newEmbedding.importState(exported);

      expect(newEmbedding.getVocabularySize()).toBe(embedding.getVocabularySize());
      expect(newEmbedding.getDocumentCount()).toBe(embedding.getDocumentCount());
    });

    it("should reset state completely", () => {
      embedding.embed(createFailureContext("Some error", "Error"));

      embedding.reset();

      expect(embedding.getVocabularySize()).toBe(0);
      expect(embedding.getDocumentCount()).toBe(0);
    });
  });
});

// ================================
// FailureIndex Tests
// ================================
describe("FailureIndex", () => {
  let index: FailureIndex;

  beforeEach(() => {
    index = new FailureIndex();
  });

  describe("add", () => {
    it("should add failure record to index", () => {
      const context = createFailureContext("Test error", "Error");

      const record = index.add(context);

      expect(record.id).toBeDefined();
      expect(record.context).toBe(context);
      expect(record.embedding).toBeDefined();
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it("should add record with custom options", () => {
      const context = createFailureContext("Test error", "Error");
      const resolution = createResolution("Fixed it", true);

      const record = index.add(context, {
        id: "custom-id",
        resolution,
        sessionId: "session-123",
        tags: ["critical", "api"],
      });

      expect(record.id).toBe("custom-id");
      expect(record.resolution).toBe(resolution);
      expect(record.sessionId).toBe("session-123");
      expect(record.tags).toEqual(["critical", "api"]);
    });

    it("should evict oldest record when at capacity", () => {
      const smallIndex = new FailureIndex({ maxRecords: 3 });

      smallIndex.add(createFailureContext("Error 1", "Error"));
      smallIndex.add(createFailureContext("Error 2", "Error"));
      smallIndex.add(createFailureContext("Error 3", "Error"));
      smallIndex.add(createFailureContext("Error 4", "Error"));

      expect(smallIndex.size()).toBe(3);
    });
  });

  describe("addResolution", () => {
    it("should add resolution to existing record", () => {
      const context = createFailureContext("Test error", "Error");
      const record = index.add(context);
      const resolution = createResolution("Fixed the issue", true);

      const result = index.addResolution(record.id, resolution);

      expect(result).toBe(true);
      expect(index.get(record.id)?.resolution).toBe(resolution);
    });

    it("should return false for non-existent record", () => {
      const resolution = createResolution("Fixed", true);

      const result = index.addResolution("non-existent", resolution);

      expect(result).toBe(false);
    });
  });

  describe("search", () => {
    it("should find similar failures", () => {
      // Create index with lower threshold for test
      const testIndex = new FailureIndex({ similarityThreshold: 0.3 });

      // Add some failures
      testIndex.add(createFailureContext("Connection timeout error", "NetworkError"));
      testIndex.add(createFailureContext("Database query failed", "DatabaseError"));
      testIndex.add(createFailureContext("Network connection lost", "NetworkError"));

      // Search for similar - use same words for better match
      const results = testIndex.search(
        createFailureContext("Connection timeout", "NetworkError")
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.3);
    });

    it("should respect similarity threshold", () => {
      const strictIndex = new FailureIndex({ similarityThreshold: 0.9 });

      strictIndex.add(createFailureContext("Exact match test", "Error"));
      strictIndex.add(createFailureContext("Completely different", "OtherError"));

      const results = strictIndex.search(
        createFailureContext("Exact match test", "Error")
      );

      expect(results.length).toBe(1);
    });

    it("should limit results", () => {
      // Add many failures
      for (let i = 0; i < 20; i++) {
        index.add(createFailureContext(`Error variant ${i}`, "Error"));
      }

      const results = index.search(createFailureContext("Error variant", "Error"), 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("findResolutions", () => {
    it("should find resolutions for similar failures", () => {
      const resolution = createResolution("Increased timeout", true);
      index.add(createFailureContext("Connection timeout", "NetworkError"), {
        resolution,
      });
      index.add(createFailureContext("Unrelated error", "OtherError"));

      const results = index.findResolutions(
        createFailureContext("Connection timed out", "NetworkError")
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].resolution.description).toBe("Increased timeout");
    });

    it("should filter to only successful resolutions", () => {
      index.add(createFailureContext("Test error", "Error"), {
        resolution: createResolution("Failed attempt", false),
      });
      index.add(createFailureContext("Test error similar", "Error"), {
        resolution: createResolution("Successful fix", true),
      });

      const results = index.findResolutions(
        createFailureContext("Test error", "Error"),
        { onlySuccessful: true }
      );

      expect(results.every((r) => r.resolution.successful)).toBe(true);
    });
  });

  describe("getByTag", () => {
    it("should retrieve records by tag", () => {
      index.add(createFailureContext("API error", "Error"), { tags: ["api", "critical"] });
      index.add(createFailureContext("DB error", "Error"), { tags: ["database"] });
      index.add(createFailureContext("Auth error", "Error"), { tags: ["api", "auth"] });

      const apiErrors = index.getByTag("api");

      expect(apiErrors.length).toBe(2);
    });
  });

  describe("getByType", () => {
    it("should retrieve records by error type", () => {
      index.add(createFailureContext("Error 1", "TypeError"));
      index.add(createFailureContext("Error 2", "ReferenceError"));
      index.add(createFailureContext("Error 3", "TypeError"));

      const typeErrors = index.getByType("TypeError");

      expect(typeErrors.length).toBe(2);
    });
  });

  describe("getStats", () => {
    it("should return index statistics", () => {
      index.add(createFailureContext("Error 1", "Error"), {
        resolution: createResolution("Fix 1", true),
      });
      index.add(createFailureContext("Error 2", "Error"), {
        resolution: createResolution("Fix 2", false),
      });
      index.add(createFailureContext("Error 3", "Error"));

      // Perform a search to update stats
      index.search(createFailureContext("Error", "Error"));

      const stats = index.getStats();

      expect(stats.totalRecords).toBe(3);
      expect(stats.resolvedCount).toBe(2);
      expect(stats.successRate).toBe(0.5);
      expect(stats.searchCount).toBe(1);
    });
  });

  describe("findPatterns", () => {
    it("should identify common failure patterns", () => {
      // Add several failures of same type
      for (let i = 0; i < 5; i++) {
        index.add(createFailureContext(`Timeout error ${i}`, "TimeoutError"), {
          resolution: createResolution("Increased timeout", true),
        });
      }
      for (let i = 0; i < 3; i++) {
        index.add(createFailureContext(`Type error ${i}`, "TypeError"));
      }

      const patterns = index.findPatterns(3);

      expect(patterns.length).toBe(2);
      expect(patterns[0].type).toBe("TimeoutError");
      expect(patterns[0].count).toBe(5);
    });
  });

  describe("persistence", () => {
    it("should export and import index", () => {
      index.add(createFailureContext("Error 1", "Error"), {
        resolution: createResolution("Fix 1", true),
      });
      index.add(createFailureContext("Error 2", "Error"));

      const exported = index.export();

      const newIndex = new FailureIndex();
      newIndex.import(exported);

      expect(newIndex.size()).toBe(2);
      const stats = newIndex.getStats();
      expect(stats.resolvedCount).toBe(1);
    });

    it("should clear all records", () => {
      index.add(createFailureContext("Error 1", "Error"));
      index.add(createFailureContext("Error 2", "Error"));

      index.clear();

      expect(index.size()).toBe(0);
    });
  });

  describe("batchAdd", () => {
    it("should add multiple failures efficiently", () => {
      const failures = [
        { context: createFailureContext("Error 1", "Error"), tags: ["tag1"] },
        { context: createFailureContext("Error 2", "Error"), resolution: createResolution("Fix", true) },
        { context: createFailureContext("Error 3", "Error") },
      ];

      const records = index.batchAdd(failures);

      expect(records.length).toBe(3);
      expect(index.size()).toBe(3);
    });
  });

  describe("getRecent", () => {
    it("should return most recent failures", () => {
      // Create custom index to add records with explicit timestamps
      const testIndex = new FailureIndex();

      // Add old record
      const oldRecord = testIndex.add(createFailureContext("Old error", "Error"));
      // Manually adjust timestamp to be older
      (oldRecord as { timestamp: Date }).timestamp = new Date(Date.now() - 10000);

      // Add new record
      testIndex.add(createFailureContext("New error", "Error"));

      const recent = testIndex.getRecent(1);

      expect(recent.length).toBe(1);
      expect(recent[0].context.message).toBe("New error");
    });
  });
});

// ================================
// ResolutionMatcher Tests
// ================================
describe("ResolutionMatcher", () => {
  let index: FailureIndex;
  let matcher: ResolutionMatcher;

  beforeEach(() => {
    index = new FailureIndex();
    matcher = new ResolutionMatcher(index);
  });

  describe("match", () => {
    it("should find matching resolutions", () => {
      // Add failures with resolutions
      index.add(createFailureContext("Connection timeout error", "NetworkError"), {
        resolution: createResolution("Increased connection timeout to 60s", true),
      });
      index.add(createFailureContext("Database connection failed", "DatabaseError"), {
        resolution: createResolution("Restarted database pool", true),
      });

      const matches = matcher.match(
        createFailureContext("Connection timed out", "NetworkError")
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThan(0);
      expect(matches[0].resolution).toBeDefined();
    });

    it("should rank matches by confidence", () => {
      // Add multiple similar failures
      index.add(createFailureContext("Connection timeout", "NetworkError"), {
        resolution: createResolution("Best fix", true),
      });
      index.add(createFailureContext("Connection error", "NetworkError"), {
        resolution: createResolution("Second best", true),
      });

      const matches = matcher.match(
        createFailureContext("Connection timeout", "NetworkError")
      );

      if (matches.length >= 2) {
        expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence);
      }
    });

    it("should only return records with successful resolutions", () => {
      index.add(createFailureContext("Test error", "Error"), {
        resolution: createResolution("Failed attempt", false),
      });
      index.add(createFailureContext("Test error similar", "Error"), {
        resolution: createResolution("Successful fix", true),
      });

      const matches = matcher.match(createFailureContext("Test error", "Error"));

      expect(matches.every((m) => m.resolution.successful)).toBe(true);
    });
  });

  describe("getBestMatch", () => {
    it("should return the best match or null", () => {
      index.add(createFailureContext("Known error", "Error"), {
        resolution: createResolution("Known fix", true),
      });

      const best = matcher.getBestMatch(createFailureContext("Known error", "Error"));

      expect(best).not.toBeNull();
      expect(best?.resolution.description).toBe("Known fix");
    });

    it("should return null for no matches", () => {
      const best = matcher.getBestMatch(
        createFailureContext("Unknown error", "Error")
      );

      expect(best).toBeNull();
    });
  });

  describe("hasConfidentMatch", () => {
    it("should return true when confident match exists", () => {
      // Add exact match to ensure high confidence
      index.add(createFailureContext("Exact error message", "Error"), {
        resolution: createResolution("Exact fix", true),
      });

      const hasMatch = matcher.hasConfidentMatch(
        createFailureContext("Exact error message", "Error"),
        0.3
      );

      expect(hasMatch).toBe(true);
    });

    it("should return false when no confident match", () => {
      const hasMatch = matcher.hasConfidentMatch(
        createFailureContext("No match for this", "Error"),
        0.9
      );

      expect(hasMatch).toBe(false);
    });
  });

  describe("suggestResolution", () => {
    it("should suggest resolution with explanation", () => {
      index.add(createFailureContext("API rate limit exceeded", "RateLimitError"), {
        resolution: createResolution("Implemented exponential backoff", true),
      });

      const suggestion = matcher.suggestResolution(
        createFailureContext("Rate limit hit", "RateLimitError")
      );

      expect(suggestion.suggestion).not.toBeNull();
      expect(suggestion.confidence).toBeGreaterThan(0);
      expect(suggestion.explanation).toContain("Found");
    });

    it("should provide alternatives", () => {
      // Add multiple resolutions
      for (let i = 0; i < 4; i++) {
        index.add(createFailureContext(`Variant ${i} of error`, "Error"), {
          resolution: createResolution(`Fix ${i}`, true),
        });
      }

      const suggestion = matcher.suggestResolution(
        createFailureContext("Variant of error", "Error")
      );

      expect(suggestion.alternatives.length).toBeGreaterThan(0);
    });

    it("should return null suggestion when no matches", () => {
      const suggestion = matcher.suggestResolution(
        createFailureContext("Completely unknown error", "UnknownError")
      );

      expect(suggestion.suggestion).toBeNull();
      expect(suggestion.confidence).toBe(0);
    });
  });

  describe("provideFeedback", () => {
    it("should track positive feedback", () => {
      index.add(createFailureContext("Test error", "Error"), {
        resolution: createResolution("Test fix", true),
      });

      const matches = matcher.match(createFailureContext("Test error", "Error"));
      if (matches.length > 0) {
        // Add many positive feedbacks to get high Wilson score
        for (let i = 0; i < 10; i++) {
          matcher.provideFeedback(matches[0], { helpful: true });
        }

        const quality = matcher.getResolutionQuality(matches[0].resolution.id);
        // With 10 positives and 0 negatives, Wilson lower bound should exceed 0.5
        expect(quality).toBeGreaterThan(0.5);
      }
    });

    it("should track negative feedback", () => {
      index.add(createFailureContext("Test error", "Error"), {
        resolution: createResolution("Bad fix", true),
      });

      const matches = matcher.match(createFailureContext("Test error", "Error"));
      if (matches.length > 0) {
        matcher.provideFeedback(matches[0], { helpful: false });
        matcher.provideFeedback(matches[0], { helpful: false });

        const quality = matcher.getResolutionQuality(matches[0].resolution.id);
        expect(quality).toBeLessThan(0.5);
      }
    });
  });

  describe("getStats", () => {
    it("should track match statistics", () => {
      index.add(createFailureContext("Test error", "Error"), {
        resolution: createResolution("Test fix", true),
      });

      // Perform some matches
      matcher.match(createFailureContext("Test error", "Error"));
      matcher.match(createFailureContext("Another test", "Error"));

      const stats = matcher.getStats();

      expect(stats.totalAttempts).toBe(2);
      expect(stats.avgMatchTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findCommonResolutions", () => {
    it("should find common resolutions for error type", () => {
      // Add multiple failures of same type with same resolution pattern
      for (let i = 0; i < 5; i++) {
        index.add(createFailureContext(`Timeout ${i}`, "TimeoutError"), {
          resolution: createResolution("Increased timeout", true),
        });
      }

      const common = matcher.findCommonResolutions("TimeoutError");

      expect(common.length).toBeGreaterThan(0);
      expect(common[0].frequency).toBeGreaterThan(0);
    });
  });

  describe("analyzePatterns", () => {
    it("should analyze resolution patterns", () => {
      // Add various failures
      for (let i = 0; i < 5; i++) {
        index.add(createFailureContext(`Network error ${i}`, "NetworkError"), {
          resolution: createResolution("Retry connection", true),
        });
      }
      for (let i = 0; i < 3; i++) {
        index.add(createFailureContext(`Type error ${i}`, "TypeError"), {
          resolution: createResolution("Fix type", true),
        });
      }

      const analysis = matcher.analyzePatterns();

      expect(analysis.byType.size).toBeGreaterThan(0);
      expect(analysis.mostEffective.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.recentTrends)).toBe(true);
    });
  });

  describe("resetStats", () => {
    it("should reset matcher statistics", () => {
      index.add(createFailureContext("Test", "Error"), {
        resolution: createResolution("Fix", true),
      });
      matcher.match(createFailureContext("Test", "Error"));

      matcher.resetStats();

      const stats = matcher.getStats();
      expect(stats.totalAttempts).toBe(0);
    });
  });

  describe("clearFeedback", () => {
    it("should clear feedback history", () => {
      index.add(createFailureContext("Test", "Error"), {
        resolution: createResolution("Fix", true),
      });

      const matches = matcher.match(createFailureContext("Test", "Error"));
      if (matches.length > 0) {
        matcher.provideFeedback(matches[0], { helpful: true });
        matcher.clearFeedback();

        // Quality should return to neutral
        const quality = matcher.getResolutionQuality(matches[0].resolution.id);
        expect(quality).toBe(0.5);
      }
    });
  });
});

// ================================
// Integration Tests
// ================================
describe("Failure Index Integration", () => {
  it("should support full workflow: add, search, resolve, feedback", () => {
    const index = new FailureIndex();
    const matcher = new ResolutionMatcher(index);

    // 1. Add historical failures with resolutions
    index.add(createFailureContext("Connection refused", "NetworkError"), {
      resolution: createResolution("Checked firewall rules and opened port", true),
    });
    index.add(createFailureContext("Database timeout", "DatabaseError"), {
      resolution: createResolution("Increased query timeout to 30s", true),
    });

    // 2. New failure comes in
    const newFailure = createFailureContext("Connection refused to host", "NetworkError");

    // 3. Search for similar
    const searchResults = index.search(newFailure);
    expect(searchResults.length).toBeGreaterThan(0);

    // 4. Get resolution suggestions
    const suggestion = matcher.suggestResolution(newFailure);
    expect(suggestion.suggestion).not.toBeNull();

    // 5. Add the new failure with resolution
    const newRecord = index.add(newFailure, {
      resolution: createResolution("Applied firewall fix from suggestion", true),
    });

    // 6. Provide feedback
    const matches = matcher.match(newFailure);
    if (matches.length > 0) {
      matcher.provideFeedback(matches[0], { helpful: true });
    }

    // 7. Verify stats
    const indexStats = index.getStats();
    expect(indexStats.totalRecords).toBe(3);
    expect(indexStats.resolvedCount).toBe(3);
  });

  it("should maintain high hit rate with similar failures", () => {
    const index = new FailureIndex();
    const matcher = new ResolutionMatcher(index);

    // Add base failures
    const baseFailures = [
      { msg: "Cannot read property 'x' of undefined", type: "TypeError" },
      { msg: "Cannot read property 'y' of null", type: "TypeError" },
      { msg: "Connection timeout after 30s", type: "NetworkError" },
      { msg: "Socket connection timeout", type: "NetworkError" },
      { msg: "Query execution exceeded time limit", type: "DatabaseError" },
    ];

    for (const { msg, type } of baseFailures) {
      index.add(createFailureContext(msg, type), {
        resolution: createResolution(`Fixed ${type}`, true),
      });
    }

    // Search for similar failures
    const queries = [
      createFailureContext("Cannot read property 'z' of undefined", "TypeError"),
      createFailureContext("Connection timeout occurred", "NetworkError"),
      createFailureContext("Query timed out", "DatabaseError"),
    ];

    let hits = 0;
    for (const query of queries) {
      if (matcher.hasConfidentMatch(query, 0.4)) {
        hits++;
      }
    }

    const hitRate = hits / queries.length;
    expect(hitRate).toBeGreaterThanOrEqual(0.4); // Success criteria: ≥40% hit rate
  });

  it("should have fast search latency", () => {
    const index = new FailureIndex();

    // Add many records
    for (let i = 0; i < 1000; i++) {
      index.add(createFailureContext(`Error message variant ${i}`, "Error"));
    }

    // Measure search time
    const start = performance.now();
    index.search(createFailureContext("Error message variant", "Error"));
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100); // Success criteria: ≤100ms
  });

  it("should persist across exports/imports", () => {
    const index1 = new FailureIndex();

    // Add data
    index1.add(createFailureContext("Persistent error", "Error"), {
      resolution: createResolution("Persistent fix", true),
      tags: ["important"],
    });

    // Export
    const exported = index1.export();

    // Create new index and import
    const index2 = new FailureIndex();
    index2.import(exported);

    // Verify data persisted
    expect(index2.size()).toBe(1);
    const records = index2.getByTag("important");
    expect(records.length).toBe(1);
    expect(records[0].resolution?.description).toBe("Persistent fix");
  });
});
