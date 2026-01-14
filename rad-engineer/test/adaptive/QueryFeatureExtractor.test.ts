/**
 * QueryFeatureExtractor Tests
 */

import { describe, it, expect } from "bun:test";
import { QueryFeatureExtractor } from "../../src/adaptive/QueryFeatureExtractor.js";

describe("QueryFeatureExtractor", () => {
  const extractor = new QueryFeatureExtractor();

  it("should extract features from simple query", () => {
    const features = extractor.extract("What is 2 + 2?");

    expect(features.tokenCount).toBeGreaterThan(0);
    expect(features.lineCount).toBe(1);
    expect(features.domain).toBe("general"); // No keywords match, so falls back to general
    expect(features.complexityScore).toBeGreaterThan(0);
  });

  it("should classify code domain", () => {
    const features = extractor.extract("Write a function to calculate fibonacci");

    expect(features.domain).toBe("code");
    expect(features.hasCodeBlock).toBe(false); // No code block markers
  });

  it("should detect code blocks", () => {
    const features = extractor.extract("Here's some code: ```javascript const x = 1; ```");

    expect(features.hasCodeBlock).toBe(true);
  });

  it("should detect math notation", () => {
    const features = extractor.extract("Calculate $\\int_0^1 x^2 dx$");

    expect(features.hasMath).toBe(true);
  });

  it("should calculate depth correctly", () => {
    const features = extractor.extract(`
      function outer() {
        function inner() {
          function deep() {
            return x;
          }
        }
      }
    `);

    expect(features.maxDepth).toBe(3);
  });

  it("should be deterministic", () => {
    const query = "Write a function to sort an array";

    const features1 = extractor.extract(query);
    const features2 = extractor.extract(query);

    expect(JSON.stringify(features1)).toBe(JSON.stringify(features2));
  });

  it("should extract cost requirements", () => {
    const features = extractor.extract("max cost: $0.001 Write a function");

    expect(features.maxCost).toBe(0.001);
  });

  it("should extract quality requirements", () => {
    const features = extractor.extract("min quality: 0.9 Write a story");

    expect(features.minQuality).toBe(0.9);
  });

  it("should extract latency requirements", () => {
    const features = extractor.extract("max latency: 500ms Calculate fibonacci");

    expect(features.maxLatency).toBe(500);
  });

  it("should calculate complexity score", () => {
    const simple = extractor.extract("hello world");
    const complex = extractor.extract("Design a distributed machine learning system using neural networks");

    expect(complex.complexityScore).toBeGreaterThan(simple.complexityScore);
  });

  it("should batch extract features", () => {
    const queries = ["query 1", "query 2", "query 3"];
    const features = extractor.extractBatch(queries);

    expect(features).toHaveLength(3);
    expect(features[0].tokenCount).toBeGreaterThan(0);
  });

  it("should calculate similarity between queries", () => {
    const query1 = "Write a function to sort an array";
    const query2 = "Write a function to search an array";

    const similarity = extractor.similarity(query1, query2);

    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it("should handle empty queries", () => {
    const features = extractor.extract("");

    expect(features.tokenCount).toBe(0);
    expect(features.lineCount).toBe(1); // Empty string still has 1 line
    expect(features.domain).toBe("general");
  });

  it("should classify creative domain", () => {
    const features = extractor.extract("Write a creative story about a space adventure");

    expect(features.domain).toBe("creative");
  });

  it("should classify analysis domain", () => {
    const features = extractor.extract("Analyze the data and find patterns");

    expect(features.domain).toBe("analysis");
  });
});
