/**
 * Seeded Random Number Generator
 *
 * Provides deterministic random sequences from a seed.
 * Uses a simple Mulberry32 algorithm for reproducibility.
 */

/**
 * Seeded random number generator
 * Same seed always produces the same sequence of numbers
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    // Convert seed to number
    if (typeof seed === "string") {
      // Simple string hash
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      this.state = hash >>> 0; // Ensure unsigned
    } else {
      this.state = seed >>> 0;
    }

    // Ensure state is never 0 (Mulberry32 doesn't work with 0)
    if (this.state === 0) {
      this.state = 1;
    }
  }

  /**
   * Generate next random number in [0, 1)
   * Uses Mulberry32 algorithm
   */
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random number from Beta distribution
   * Uses rejection sampling for simplicity
   */
  nextBeta(alpha: number, beta: number): number {
    if (alpha <= 0 || beta <= 0) {
      throw new Error("Alpha and beta must be positive");
    }

    // Simple rejection sampling
    while (true) {
      const u = this.next();
      const v = this.next();

      const x = Math.pow(u, 1 / alpha);
      const y = Math.pow(v, 1 / beta);

      if (x + y <= 1) {
        return x / (x + y);
      }
    }
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   * Returns the same array reference for chaining
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Sample from array without replacement
   */
  sample<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error("Cannot sample more than array length");
    }
    if (count === array.length) {
      return [...array];
    }

    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, count);
  }

  /**
   * Sample single element from array
   */
  sampleOne<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot sample from empty array");
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Create a new generator with the same state
   * Useful for branching random sequences
   */
  clone(): SeededRandom {
    const cloned = new SeededRandom(this.state);
    cloned.state = this.state;
    return cloned;
  }
}

/**
 * Create a deterministic hash from input string
 */
export function deterministicHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a seeded RNG from hash of input
 */
export function createSeededRNG(input: string): SeededRandom {
  const hash = deterministicHash(input);
  const seed = parseInt(hash, 36);
  return new SeededRandom(seed);
}
