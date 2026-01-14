/**
 * Unit tests for RateLimiter
 *
 * Tests:
 * - Token bucket initialization
 * - Rate limit checking
 * - Token consumption
 * - Token refilling over time
 * - Operation-specific limits
 * - Retry-after calculation
 * - Sliding window behavior
 * - Configuration validation
 * - Edge cases
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { RateLimiter } from "../RateLimiter.js";
import type { RateLimiterConfig } from "../RateLimiter.js";

describe("RateLimiter: Initialization", () => {
  it("Creates limiter with default config", () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 5 },
    });

    expect(limiter).toBeDefined();
    expect(limiter.getActiveBucketCount()).toBe(0);
  });

  it("Creates limiter with operation-specific configs", () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 5 },
      operations: {
        "agent:spawn": { tokensPerSecond: 1, bucketSize: 3 },
        "agent:register": { tokensPerSecond: 5, bucketSize: 10 },
      },
    });

    expect(limiter).toBeDefined();
  });

  it("Throws on invalid tokensPerSecond (default)", () => {
    expect(() => {
      new RateLimiter({
        default: { tokensPerSecond: 0, bucketSize: 5 },
      });
    }).toThrow("tokensPerSecond must be > 0");
  });

  it("Throws on invalid bucketSize (default)", () => {
    expect(() => {
      new RateLimiter({
        default: { tokensPerSecond: 2, bucketSize: 0 },
      });
    }).toThrow("bucketSize must be > 0");
  });

  it("Throws on invalid maxCost exceeding bucketSize", () => {
    expect(() => {
      new RateLimiter({
        default: { tokensPerSecond: 2, bucketSize: 5, maxCost: 10 },
      });
    }).toThrow("maxCost cannot exceed bucketSize");
  });

  it("Throws on invalid operation-specific config", () => {
    expect(() => {
      new RateLimiter({
        default: { tokensPerSecond: 2, bucketSize: 5 },
        operations: {
          "agent:spawn": { tokensPerSecond: -1, bucketSize: 3 },
        },
      });
    }).toThrow("tokensPerSecond must be > 0");
  });
});

describe("RateLimiter: Basic Token Bucket", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 5 },
    });
  });

  it("Allows operation when tokens available", () => {
    const result = limiter.checkLimit("test:op1", 1);
    expect(result.allowed).toBe(true);
    expect(result.tokensRemaining).toBe(5); // Full bucket initially
    expect(result.retryAfter).toBeUndefined();
  });

  it("Consumes tokens correctly", () => {
    limiter.checkLimit("test:op1", 2);
    limiter.consumeTokens("test:op1", 2);

    const state = limiter.getBucketState("test:op1");
    expect(state).toBeDefined();
    expect(state!.tokens).toBe(3); // 5 - 2 = 3
  });

  it("Blocks operation when insufficient tokens", () => {
    // Consume all tokens
    limiter.consumeTokens("test:op1", 5);

    const result = limiter.checkLimit("test:op1", 1);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.tokensRemaining).toBe(0);
  });

  it("Calculates retry-after based on token deficit", () => {
    // Consume all tokens
    limiter.consumeTokens("test:op1", 5);

    // Try to use 2 tokens (deficit = 2)
    // With refillRate = 2 tokens/sec, need 1 second = 1000ms
    const result = limiter.checkLimit("test:op1", 2);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThanOrEqual(950); // ~1000ms
    expect(result.retryAfter).toBeLessThanOrEqual(1050);
  });

  it("Enforces maxCost per operation", () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 10, maxCost: 3 },
    });

    // Try to consume 5 tokens (> maxCost of 3)
    const result = limiter.checkLimit("test:op1", 5);
    expect(result.allowed).toBe(false);
  });
});

describe("RateLimiter: Token Refilling", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    // Use faster refill rate for tests: 20 tokens/sec instead of 2
    limiter = new RateLimiter({
      default: { tokensPerSecond: 20, bucketSize: 50 },
    });
  });

  it("Refills tokens based on elapsed time", async () => {
    // Consume all tokens
    limiter.consumeTokens("test:op1", 50);
    expect(limiter.getBucketState("test:op1")!.tokens).toBe(0);

    // Wait 100ms (should refill 2 tokens at 20/sec)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBeGreaterThanOrEqual(1.5); // ~2 tokens
    expect(state!.tokens).toBeLessThanOrEqual(2.5);
  });

  it("Does not exceed bucket capacity when refilling", async () => {
    // Start with full bucket (trigger creation with checkLimit)
    limiter.checkLimit("test:op1", 1);
    const initial = limiter.getBucketState("test:op1");
    expect(initial!.tokens).toBe(50);

    // Wait 200ms (would add many tokens, but capped at 50)
    await new Promise((resolve) => setTimeout(resolve, 200));

    const state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBe(50); // Still capped at capacity
  });

  it("Allows operation after sufficient refill time", async () => {
    // Consume all tokens
    limiter.consumeTokens("test:op1", 50);

    // Initially blocked
    let result = limiter.checkLimit("test:op1", 2);
    expect(result.allowed).toBe(false);

    // Wait for refill (need 2 tokens = 100ms at 20/sec)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now allowed
    result = limiter.checkLimit("test:op1", 2);
    expect(result.allowed).toBe(true);
  });
});

describe("RateLimiter: Operation-Specific Limits", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 5 },
      operations: {
        "agent:spawn": { tokensPerSecond: 1, bucketSize: 3 },
        "agent:register": { tokensPerSecond: 5, bucketSize: 10 },
      },
    });
  });

  it("Uses operation-specific config for matching keys", () => {
    // agent:spawn operations use 1 token/sec, bucket size 3
    limiter.consumeTokens("agent:spawn:agent-1", 3);
    const state = limiter.getBucketState("agent:spawn:agent-1");
    expect(state!.tokens).toBe(0);
    expect(state!.capacity).toBe(3);

    // agent:register operations use 5 tokens/sec, bucket size 10
    limiter.consumeTokens("agent:register:agent-2", 10);
    const state2 = limiter.getBucketState("agent:register:agent-2");
    expect(state2!.tokens).toBe(0);
    expect(state2!.capacity).toBe(10);
  });

  it("Uses default config for non-matching keys", () => {
    // Unknown operation type uses default config
    limiter.consumeTokens("unknown:operation", 5);
    const state = limiter.getBucketState("unknown:operation");
    expect(state!.tokens).toBe(0);
    expect(state!.capacity).toBe(5);
  });

  it("Matches longest prefix for operation config", () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 1, bucketSize: 5 },
      operations: {
        agent: { tokensPerSecond: 2, bucketSize: 10 },
        "agent:spawn": { tokensPerSecond: 3, bucketSize: 15 },
      },
    });

    // Should match 'agent:spawn' (longest prefix)
    limiter.consumeTokens("agent:spawn:agent-1", 15);
    const state = limiter.getBucketState("agent:spawn:agent-1");
    expect(state!.capacity).toBe(15);

    // Should match 'agent' prefix
    limiter.consumeTokens("agent:other:agent-2", 10);
    const state2 = limiter.getBucketState("agent:other:agent-2");
    expect(state2!.capacity).toBe(10);
  });
});

describe("RateLimiter: Sliding Window", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    // Use faster refill for tests: 100 tokens/sec
    limiter = new RateLimiter({
      default: { tokensPerSecond: 100, bucketSize: 100 },
    });
  });

  it("Refills proportionally to elapsed time (sliding window)", async () => {
    // Consume 100 tokens
    limiter.consumeTokens("test:op1", 100);
    expect(limiter.getBucketState("test:op1")!.tokens).toBe(0);

    // Wait 50ms (should refill ~5 tokens at 100/sec)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBeGreaterThanOrEqual(4);
    expect(state!.tokens).toBeLessThanOrEqual(6);
  });

  it("Handles multiple refills accurately", async () => {
    limiter.consumeTokens("test:op1", 100);

    // Wait 30ms (refill ~3 tokens at 100/sec)
    await new Promise((resolve) => setTimeout(resolve, 30));
    let state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBeGreaterThanOrEqual(2);
    expect(state!.tokens).toBeLessThanOrEqual(4);

    // Wait another 20ms (total 50ms = ~5 tokens)
    await new Promise((resolve) => setTimeout(resolve, 20));
    state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBeGreaterThanOrEqual(4);
    expect(state!.tokens).toBeLessThanOrEqual(6);
  });
});

describe("RateLimiter: Multiple Operations", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 5 },
    });
  });

  it("Maintains separate buckets for different keys", () => {
    // Consume tokens from op1
    limiter.consumeTokens("test:op1", 3);
    expect(limiter.getBucketState("test:op1")!.tokens).toBe(2);

    // op2 should have full bucket
    expect(limiter.getBucketState("test:op2")).toBeNull(); // Not created yet
    const result = limiter.checkLimit("test:op2", 1);
    expect(result.allowed).toBe(true);
    expect(result.tokensRemaining).toBe(5); // Full bucket
  });

  it("Tracks multiple active buckets", () => {
    limiter.checkLimit("test:op1", 1);
    limiter.checkLimit("test:op2", 1);
    limiter.checkLimit("test:op3", 1);

    expect(limiter.getActiveBucketCount()).toBe(3);
  });
});

describe("RateLimiter: Edge Cases", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      default: { tokensPerSecond: 2, bucketSize: 5 },
    });
  });

  it("Handles zero cost check", () => {
    const result = limiter.checkLimit("test:op1", 0);
    expect(result.allowed).toBe(true);
    expect(result.tokensRemaining).toBe(5);
  });

  it("Handles consuming zero tokens", () => {
    limiter.consumeTokens("test:op1", 0);
    const state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBe(5); // Unchanged
  });

  it("Returns null state for non-existent bucket", () => {
    const state = limiter.getBucketState("non-existent");
    expect(state).toBeNull();
  });

  it("Clears all buckets", () => {
    limiter.checkLimit("test:op1", 1);
    limiter.checkLimit("test:op2", 1);
    expect(limiter.getActiveBucketCount()).toBe(2);

    limiter.clearBuckets();
    expect(limiter.getActiveBucketCount()).toBe(0);
  });

  it("Handles fractional token costs", () => {
    const result = limiter.checkLimit("test:op1", 2.5);
    expect(result.allowed).toBe(true);

    limiter.consumeTokens("test:op1", 2.5);
    const state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBe(2.5);
  });

  it("Handles very high token costs", () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 100, bucketSize: 1000 },
    });

    const result = limiter.checkLimit("test:op1", 500);
    expect(result.allowed).toBe(true);

    limiter.consumeTokens("test:op1", 500);
    const state = limiter.getBucketState("test:op1");
    expect(state!.tokens).toBe(500);
  });
});

describe("RateLimiter: Real-World Scenarios", () => {
  it("Limits agent spawning with shared bucket", async () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 100, bucketSize: 30 },
    });

    // Use same key to share bucket across spawn attempts
    const agentKey = "agent:spawn:shared";

    // Spawn 3 agents immediately (burst capacity)
    for (let i = 1; i <= 3; i++) {
      const result = limiter.checkLimit(agentKey, 10);
      expect(result.allowed).toBe(true);
      limiter.consumeTokens(agentKey, 10);
    }

    // 4th agent should be rate limited (bucket empty)
    const result = limiter.checkLimit(agentKey, 10);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);

    // Wait for refill (100ms = 10 tokens at 100/sec)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now allowed
    const result2 = limiter.checkLimit(agentKey, 10);
    expect(result2.allowed).toBe(true);
  });

  it("Allows different limits for spawn vs register", () => {
    const limiter = new RateLimiter({
      default: { tokensPerSecond: 1, bucketSize: 2 },
      operations: {
        "agent:spawn": { tokensPerSecond: 1, bucketSize: 3 },
        "agent:register": { tokensPerSecond: 10, bucketSize: 20 },
      },
    });

    // Spawn operations limited to 3/bucket
    for (let i = 1; i <= 3; i++) {
      const result = limiter.checkLimit("agent:spawn:agent-1", 1);
      expect(result.allowed).toBe(true);
      limiter.consumeTokens("agent:spawn:agent-1", 1);
    }
    let result = limiter.checkLimit("agent:spawn:agent-1", 1);
    expect(result.allowed).toBe(false);

    // Register operations can burst up to 20
    for (let i = 1; i <= 20; i++) {
      result = limiter.checkLimit("agent:register:agent-1", 1);
      expect(result.allowed).toBe(true);
      limiter.consumeTokens("agent:register:agent-1", 1);
    }
    result = limiter.checkLimit("agent:register:agent-1", 1);
    expect(result.allowed).toBe(false);
  });
});
