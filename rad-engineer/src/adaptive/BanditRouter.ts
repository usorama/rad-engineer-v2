/**
 * Contextual Bandit Router
 *
 * Intelligently routes queries using Thompson Sampling with deterministic seeding.
 * Balances exploration (10%) and exploitation (90%) for optimal provider selection.
 */

import { SeededRandom, createSeededRNG } from "./SeededRandom.js";
import { PerformanceStore } from "./PerformanceStore.js";
import type {
  QueryFeatures,
  RoutingDecision,
  RoutingCandidate,
  EvalConfig,
} from "./types.js";

/**
 * Bandit Router using Thompson Sampling
 */
export class BanditRouter {
  private store: PerformanceStore;
  private config: EvalConfig;
  private explorationRate: number;

  constructor(store: PerformanceStore, config?: Partial<EvalConfig>) {
    this.store = store;
    this.config = {
      enabled: config?.enabled ?? true,
      explorationRate: config?.explorationRate ?? 0.10,
      qualityThreshold: config?.qualityThreshold ?? 0.7,
      ewc: config?.ewc ?? { enabled: true, lambda: 0.5 },
      state: config?.state ?? {
        path: "~/.config/rad-engineer/performance-store.yaml",
        autoSave: true,
        versionsToKeep: 100,
      },
      evaluation: config?.evaluation ?? {
        timeout: 5000,
        useLocalModel: true,
        localModel: "llama3.2",
      },
    };
    this.explorationRate = this.config.explorationRate;
  }

  /**
   * Route query to optimal provider using Thompson Sampling
   * Deterministic: same query + same state = same decision
   */
  async route(features: QueryFeatures): Promise<RoutingDecision> {
    // DETERMINISTIC SEEDING: hash(query + state version) → seed
    const stateVersion = this.store.getCurrentVersion();
    const seedInput = JSON.stringify({
      domain: features.domain,
      complexity: features.complexityScore,
      version: stateVersion,
    });
    const rng = createSeededRNG(seedInput);

    // Get candidates for this context
    const candidates = this.store.getCandidates(
      features.domain,
      features.complexityScore
    );

    // Fallback to general domain if no candidates
    const finalCandidates =
      candidates.length > 0
        ? candidates
        : this.store.getCandidates("general", features.complexityScore);

    if (finalCandidates.length === 0) {
      throw new Error("No candidates available for routing");
    }

    // EXPLORE with fixed probability (deterministic)
    if (rng.next() < this.explorationRate) {
      return this.explore(finalCandidates, rng, features);
    }

    // EXPLOIT: use Thompson Sampling to select best candidate
    return this.exploit(finalCandidates, rng, features);
  }

  /**
   * Exploitation: select candidate with highest expected value
   * Uses Thompson Sampling with Beta distribution
   */
  private exploit(
    candidates: RoutingCandidate[],
    rng: SeededRandom,
    features: QueryFeatures
  ): RoutingDecision {
    let bestSample = -Infinity;
    let bestCandidate = candidates[0];

    // Sample from Beta distribution for each candidate
    for (const candidate of candidates) {
      const stats = candidate.stats;

      // Beta distribution parameters
      const alpha = stats.success + 1;
      const beta = stats.failure + 1;

      // Sample from Beta distribution
      const sample = rng.nextBeta(alpha, beta);

      if (sample > bestSample) {
        bestSample = sample;
        bestCandidate = candidate;
      }
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(bestCandidate.stats);

    // Apply constraints (cost, quality, latency)
    if (features.maxCost && bestCandidate.stats.avgCost > features.maxCost) {
      // Try to find cheaper option
      const cheaper = candidates
        .filter((c) => c.stats.avgCost <= (features.maxCost ?? Infinity))
        .sort((a, b) => a.stats.avgCost - b.stats.avgCost)[0];

      if (cheaper) {
        bestCandidate = cheaper;
      }
    }

    if (features.minQuality && bestCandidate.stats.avgQuality < features.minQuality) {
      // Try to find higher quality option
      const higher = candidates
        .filter((c) => c.stats.avgQuality >= (features.minQuality ?? 0))
        .sort((a, b) => b.stats.avgQuality - a.stats.avgQuality)[0];

      if (higher) {
        bestCandidate = higher;
      }
    }

    return {
      provider: bestCandidate.provider,
      model: bestCandidate.model,
      confidence,
      reason: this.buildReason(bestCandidate, "exploit"),
      exploration: false,
    };
  }

  /**
   * Exploration: try a random candidate
   * Uses deterministic RNG
   */
  private explore(
    candidates: RoutingCandidate[],
    rng: SeededRandom,
    features: QueryFeatures
  ): RoutingDecision {
    // Select random candidate (deterministically)
    const selected = rng.sampleOne(candidates);

    return {
      provider: selected.provider,
      model: selected.model,
      confidence: 0.5, // Low confidence during exploration
      reason: this.buildReason(selected, "explore"),
      exploration: true,
    };
  }

  /**
   * Calculate confidence interval width (narrower = higher confidence)
   */
  private calculateConfidence(stats: {
    confidenceInterval: [number, number];
  }): number {
    const [low, high] = stats.confidenceInterval;
    const width = high - low;
    return 1 - width; // Narrower interval = higher confidence
  }

  /**
   * Build human-readable reason
   */
  private buildReason(
    candidate: RoutingCandidate,
    mode: "exploit" | "explore"
  ): string {
    const stats = candidate.stats;

    if (mode === "explore") {
      return `Exploring ${candidate.provider}/${candidate.model} to gather data`;
    }

    return `Exploiting ${candidate.provider}/${candidate.model} ` +
      `(mean: ${stats.mean.toFixed(2)}, ` +
      `success: ${stats.success}, ` +
      `failure: ${stats.failure}, ` +
      `avg quality: ${stats.avgQuality.toFixed(2)}, ` +
      `avg cost: $${stats.avgCost.toFixed(4)})`;
  }

  /**
   * Get current exploration rate
   */
  getExplorationRate(): number {
    return this.explorationRate;
  }

  /**
   * Set exploration rate (for adaptive exploration)
   */
  setExplorationRate(rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error("Exploration rate must be in [0, 1]");
    }
    this.explorationRate = rate;
  }

  /**
   * Get router statistics
   */
  getStats(): {
    totalCandidates: number;
    candidatesByDomain: Record<string, number>;
  } {
    const state = this.store.getState();
    const candidatesByDomain: Record<string, number> = {};

    for (const stats of state.stats) {
      candidatesByDomain[stats.domain] = (candidatesByDomain[stats.domain] || 0) + 1;
    }

    return {
      totalCandidates: state.stats.length,
      candidatesByDomain,
    };
  }

  /**
   * Recommend if router should explore or exploit
   * Based on uncertainty in current best candidate
   */
  shouldExplore(features: QueryFeatures): boolean {
    const candidates = this.store.getCandidates(
      features.domain,
      features.complexityScore
    );

    if (candidates.length === 0) {
      return true; // No data, must explore
    }

    // Find candidate with most data (highest success + failure)
    const mostData = candidates.reduce((best, current) => {
      const bestTotal = best.stats.success + best.stats.failure;
      const currentTotal = current.stats.success + current.stats.failure;
      return currentTotal > bestTotal ? current : best;
    });

    // If we have little data (< 10 samples), explore more
    const totalSamples = mostData.stats.success + mostData.stats.failure;
    if (totalSamples < 10) {
      return true;
    }

    // If confidence interval is wide (> 0.3), explore more
    const [low, high] = mostData.stats.confidenceInterval;
    const width = high - low;
    if (width > 0.3) {
      return true;
    }

    // Otherwise, exploit
    return false;
  }

  /**
   * Get performance summary for a provider
   */
  getProviderSummary(provider: string, model: string): {
    domain: string;
    success: number;
    failure: number;
    mean: number;
    confidenceInterval: [number, number];
    avgQuality: number;
    avgCost: number;
    avgLatency: number;
  }[] {
    const state = this.store.getState();
    const providerStats = state.stats.filter(
      (s) => s.provider === provider && s.model === model
    );

    return providerStats.map((stats) => ({
      domain: stats.domain,
      success: stats.success,
      failure: stats.failure,
      mean: stats.mean,
      confidenceInterval: stats.confidenceInterval,
      avgQuality: stats.avgQuality,
      avgCost: stats.avgCost,
      avgLatency: stats.avgLatency,
    }));
  }

  /**
   * Compare two providers
   */
  compareProviders(
    provider1: string,
    model1: string,
    provider2: string,
    model2: string
  ): {
    provider1: {
      avgQuality: number;
      avgCost: number;
      mean: number;
    };
    provider2: {
      avgQuality: number;
      avgCost: number;
      mean: number;
    };
    recommendation: string;
  } {
    const stats1 = this.getProviderSummary(provider1, model1);
    const stats2 = this.getProviderSummary(provider2, model2);

    // Calculate averages across domains
    const avg1 = this.averageStats(stats1);
    const avg2 = this.averageStats(stats2);

    let recommendation = "";
    if (avg1.avgQuality > avg2.avgQuality && avg1.avgCost < avg2.avgCost) {
      recommendation = `${provider1}/${model1} is better in both quality and cost`;
    } else if (avg2.avgQuality > avg1.avgQuality && avg2.avgCost < avg1.avgCost) {
      recommendation = `${provider2}/${model2} is better in both quality and cost`;
    } else if (avg1.avgQuality > avg2.avgQuality) {
      recommendation = `${provider1}/${model1} has better quality but higher cost`;
    } else if (avg2.avgQuality > avg1.avgQuality) {
      recommendation = `${provider2}/${model2} has better quality but higher cost`;
    } else if (avg1.avgCost < avg2.avgCost) {
      recommendation = `${provider1}/${model1} is cheaper with similar quality`;
    } else {
      recommendation = `${provider2}/${model2} is cheaper with similar quality`;
    }

    return {
      provider1: avg1,
      provider2: avg2,
      recommendation,
    };
  }

  /**
   * Average stats across domains
   */
  private averageStats(
    stats: {
      avgQuality: number;
      avgCost: number;
      mean: number;
    }[]
  ): {
    avgQuality: number;
    avgCost: number;
    mean: number;
  } {
    if (stats.length === 0) {
      return { avgQuality: 0, avgCost: 0, mean: 0 };
    }

    return {
      avgQuality: stats.reduce((sum, s) => sum + s.avgQuality, 0) / stats.length,
      avgCost: stats.reduce((sum, s) => sum + s.avgCost, 0) / stats.length,
      mean: stats.reduce((sum, s) => sum + s.mean, 0) / stats.length,
    };
  }
}
