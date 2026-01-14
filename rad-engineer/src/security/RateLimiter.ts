/**
 * RateLimiter - Token bucket algorithm with sliding window
 * Phase 1: Security Layer Component
 *
 * Implements rate limiting for agent spawning operations to prevent:
 * - Excessive concurrent agent spawns
 * - Resource exhaustion attacks
 * - System overload from rapid spawning
 *
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Sliding window for accurate time-based limits
 * - Per-operation-type limits (spawn, register, unregister)
 * - Configurable bucket size and refill rate
 * - Retry-After calculation for backpressure
 *
 * Responsibilities:
 * - Track token consumption per operation key
 * - Refill tokens based on tokensPerSecond rate
 * - Calculate retry delays when rate limited
 * - Support different limits for different operation types
 *
 * Failure Modes:
 * - RATE_LIMIT_EXCEEDED: Returned when insufficient tokens
 * - Never throws - returns {allowed: false, retryAfter: ms}
 */

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Milliseconds to wait before retry (only if !allowed) */
  retryAfter?: number;
  /** Current token count (for debugging) */
  tokensRemaining?: number;
}

/**
 * Configuration for a rate limit bucket
 */
export interface RateLimitConfig {
  /** Tokens refilled per second */
  tokensPerSecond: number;
  /** Maximum bucket capacity */
  bucketSize: number;
  /** Maximum cost per single operation (default: bucketSize) */
  maxCost?: number;
}

/**
 * Configuration for RateLimiter with operation-specific limits
 */
export interface RateLimiterConfig {
  /** Default rate limit for all operations */
  default: RateLimitConfig;
  /** Operation-specific rate limits (override default) */
  operations?: Record<string, RateLimitConfig>;
}

/**
 * Internal bucket state
 */
interface TokenBucket {
  /** Current token count */
  tokens: number;
  /** Bucket capacity */
  capacity: number;
  /** Tokens per second refill rate */
  refillRate: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Maximum cost per operation */
  maxCost: number;
}

/**
 * RateLimiter - Token bucket rate limiting with sliding window
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({
 *   default: { tokensPerSecond: 2, bucketSize: 5 },
 *   operations: {
 *     'agent:spawn': { tokensPerSecond: 1, bucketSize: 3 }
 *   }
 * });
 *
 * const result = limiter.checkLimit('agent:spawn:agent-1', 1);
 * if (result.allowed) {
 *   limiter.consumeTokens('agent:spawn:agent-1', 1);
 *   // Spawn agent...
 * } else {
 *   console.log(`Rate limited. Retry after ${result.retryAfter}ms`);
 * }
 * ```
 */
export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly buckets: Map<string, TokenBucket> = new Map();

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Check if operation is allowed without consuming tokens
   *
   * @param key - Unique identifier for the operation (e.g., 'agent:spawn:agent-1')
   * @param cost - Token cost for this operation (default: 1)
   * @returns RateLimitResult with allowed status and retry delay
   */
  checkLimit(key: string, cost: number = 1): RateLimitResult {
    const bucket = this.getOrCreateBucket(key);
    this.refillBucket(bucket);

    const allowed = bucket.tokens >= cost && cost <= bucket.maxCost;

    if (allowed) {
      return {
        allowed: true,
        tokensRemaining: bucket.tokens,
      };
    }

    // Calculate retry delay based on token deficit
    const deficit = cost - bucket.tokens;
    const retryAfter = Math.ceil((deficit / bucket.refillRate) * 1000);

    return {
      allowed: false,
      retryAfter,
      tokensRemaining: bucket.tokens,
    };
  }

  /**
   * Consume tokens for an operation
   *
   * Should only be called after checkLimit() returns allowed=true
   * Does not validate if tokens are available - caller's responsibility
   *
   * @param key - Operation identifier
   * @param count - Number of tokens to consume (default: 1)
   */
  consumeTokens(key: string, count: number = 1): void {
    const bucket = this.getOrCreateBucket(key);
    this.refillBucket(bucket);
    bucket.tokens = Math.max(0, bucket.tokens - count);
  }

  /**
   * Get or create a bucket for the given key
   *
   * Determines appropriate config based on operation type prefix
   * (e.g., 'agent:spawn' uses operations['agent:spawn'] config)
   */
  private getOrCreateBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      const config = this.getConfigForKey(key);
      bucket = {
        tokens: config.bucketSize,
        capacity: config.bucketSize,
        refillRate: config.tokensPerSecond,
        lastRefill: Date.now(),
        maxCost: config.maxCost ?? config.bucketSize,
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Refill bucket based on elapsed time since last refill
   *
   * Implements sliding window by refilling tokens proportionally
   * to elapsed time (tokensPerSecond * secondsElapsed)
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    const elapsedSeconds = elapsedMs / 1000;

    // Calculate tokens to add
    const tokensToAdd = elapsedSeconds * bucket.refillRate;

    // Add tokens up to capacity
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Get configuration for a given key
   *
   * Matches operation-specific config by prefix
   * (e.g., 'agent:spawn:agent-1' matches 'agent:spawn')
   */
  private getConfigForKey(key: string): RateLimitConfig {
    if (!this.config.operations) {
      return this.config.default;
    }

    // Find longest matching prefix
    let matchedConfig: RateLimitConfig | null = null;
    let longestMatch = 0;

    for (const [operationType, config] of Object.entries(this.config.operations)) {
      if (key.startsWith(operationType) && operationType.length > longestMatch) {
        matchedConfig = config;
        longestMatch = operationType.length;
      }
    }

    return matchedConfig ?? this.config.default;
  }

  /**
   * Validate configuration on construction
   */
  private validateConfig(): void {
    const validateBucketConfig = (config: RateLimitConfig, name: string) => {
      if (config.tokensPerSecond <= 0) {
        throw new Error(`[${name}] tokensPerSecond must be > 0`);
      }
      if (config.bucketSize <= 0) {
        throw new Error(`[${name}] bucketSize must be > 0`);
      }
      if (config.maxCost !== undefined && config.maxCost > config.bucketSize) {
        throw new Error(`[${name}] maxCost cannot exceed bucketSize`);
      }
    };

    validateBucketConfig(this.config.default, "default");

    if (this.config.operations) {
      for (const [operationType, config] of Object.entries(this.config.operations)) {
        validateBucketConfig(config, operationType);
      }
    }
  }

  /**
   * Get current bucket state for debugging/testing
   *
   * @param key - Operation identifier
   * @returns Current token count and capacity, or null if bucket doesn't exist
   */
  getBucketState(key: string): { tokens: number; capacity: number } | null {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return null;
    }

    this.refillBucket(bucket);
    return {
      tokens: bucket.tokens,
      capacity: bucket.capacity,
    };
  }

  /**
   * Clear all buckets (for testing)
   */
  clearBuckets(): void {
    this.buckets.clear();
  }

  /**
   * Get number of active buckets (for testing/monitoring)
   */
  getActiveBucketCount(): number {
    return this.buckets.size;
  }
}
