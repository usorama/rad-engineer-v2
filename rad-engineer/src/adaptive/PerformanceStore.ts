/**
 * Performance Store with Versioning
 *
 * Stores and manages historical performance data for providers.
 * Every update creates a new immutable version for reproducibility.
 */

import type {
  ProviderStats,
  PerformanceStoreVersion,
  Domain,
  RoutingCandidate,
  EvalConfig,
} from "./types.js";

/**
 * Performance Store with versioning
 */
export class PerformanceStore {
  private versions: PerformanceStoreVersion[] = [];
  private current: PerformanceStoreVersion;
  private config: EvalConfig["state"];

  constructor(config?: Partial<EvalConfig["state"]>) {
    this.config = {
      path: config?.path || "~/.config/rad-engineer/performance-store.yaml",
      autoSave: config?.autoSave ?? true,
      versionsToKeep: config?.versionsToKeep || 100,
    };

    // Initialize with empty version
    this.current = this.createEmptyVersion();
    this.versions.push(this.current);
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return this.current.version;
  }

  /**
   * Get stats for a specific (provider, model, domain) tuple
   */
  getStats(provider: string, model: string, domain: Domain): ProviderStats | undefined {
    return this.current.stats.find(
      (s) => s.provider === provider && s.model === model && s.domain === domain
    );
  }

  /**
   * Get all candidates for a context bucket
   */
  getCandidates(domain: Domain, complexityScore: number): RoutingCandidate[] {
    const candidates: RoutingCandidate[] = [];

    for (const stats of this.current.stats) {
      // Check if stats matches domain
      if (stats.domain !== domain && stats.domain !== "general") {
        continue;
      }

      // Check if complexity is in range
      const [min, max] = stats.complexityRange;
      if (complexityScore < min || complexityScore > max) {
        continue;
      }

      candidates.push({
        provider: stats.provider,
        model: stats.model,
        stats,
      });
    }

    return candidates;
  }

  /**
   * Update stats with new data point
   * Creates a new version (immutable append-only)
   */
  updateStats(
    provider: string,
    model: string,
    domain: Domain,
    complexityScore: number,
    success: boolean,
    cost: number,
    quality: number,
    latency: number
  ): PerformanceStore {
    // Find or create stats
    let stats = this.getStats(provider, model, domain);

    if (!stats) {
      // Create new stats entry
      stats = this.createInitialStats(provider, model, domain, complexityScore);
      this.current.stats.push(stats);
    }

    // Update Beta distribution parameters
    if (success) {
      stats.success += 1;
    } else {
      stats.failure += 1;
    }

    // Update running averages (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    stats.avgCost = (1 - alpha) * stats.avgCost + alpha * cost;
    stats.avgLatency = (1 - alpha) * stats.avgLatency + alpha * latency;
    stats.avgQuality = (1 - alpha) * stats.avgQuality + alpha * quality;

    // Recalculate Beta distribution statistics
    const a = stats.success + 1; // α
    const b = stats.failure + 1; // β
    stats.mean = a / (a + b);
    stats.variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
    stats.confidenceInterval = this.betaCI(stats.mean, stats.variance, 0.95);

    // Update timestamp
    stats.lastUpdated = Date.now();

    // Create new version
    this.current = this.createVersion();
    this.versions.push(this.current);

    // Prune old versions
    this.pruneVersions();

    return this;
  }

  /**
   * Load a specific version
   */
  loadVersion(version: string): PerformanceStore {
    const found = this.versions.find((v) => v.version === version);
    if (!found) {
      throw new Error(`Version ${version} not found`);
    }

    // Deep copy to avoid mutation
    this.current = JSON.parse(JSON.stringify(found));
    return this;
  }

  /**
   * Get all versions
   */
  getAllVersions(): PerformanceStoreVersion[] {
    return [...this.versions];
  }

  /**
   * Export current state to JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.current, null, 2);
  }

  /**
   * Import state from JSON
   */
  importJSON(json: string): PerformanceStore {
    const imported = JSON.parse(json) as PerformanceStoreVersion;
    this.current = imported;
    this.versions.push(imported);
    this.pruneVersions();
    return this;
  }

  /**
   * Reset to empty state
   */
  reset(): PerformanceStore {
    this.current = this.createEmptyVersion();
    this.versions = [this.current];
    return this;
  }

  /**
   * Apply Elastic Weight Consolidation to prevent catastrophic forgetting
   */
  applyEWC(
    provider: string,
    model: string,
    domain: Domain,
    oldStats: ProviderStats,
    newDataPoint: { success: boolean; quality: number }
  ): ProviderStats {
    const stats = this.getStats(provider, model, domain);
    if (!stats) {
      throw new Error(`Stats not found for ${provider}/${model}/${domain}`);
    }

    // Calculate importance (Fisher information approximation)
    const importance = this.calculateImportance(oldStats);

    // Update with EWC regularization
    const learningRate = 0.01;

    // For each parameter, apply gradient with penalty
    const gradient = newDataPoint.success ? 1 : -1;
    for (let i = 0; i < stats.importanceWeights.length; i++) {
      const penalty = importance[i] * (stats.importanceWeights[i] - oldStats.importanceWeights[i]);
      stats.importanceWeights[i] -= learningRate * (gradient + penalty);
    }

    return this;
  }

  /**
   * Get current state
   */
  getState(): PerformanceStoreVersion {
    return this.current;
  }

  /**
   * Create initial stats entry
   */
  private createInitialStats(
    provider: string,
    model: string,
    domain: Domain,
    complexityScore: number
  ): ProviderStats {
    // Create complexity range around this score (±0.2)
    const min = Math.max(0, complexityScore - 0.2);
    const max = Math.min(1, complexityScore + 0.2);

    return {
      provider,
      model,
      domain,
      complexityRange: [min, max],
      success: 0,
      failure: 0,
      mean: 0.5, // Uniform prior
      variance: 0.0833, // Beta(1,1) variance
      confidenceInterval: [0, 1],
      avgCost: 0,
      avgLatency: 0,
      avgQuality: 0.5,
      importanceWeights: new Array(10).fill(0), // 10 features
      lastUpdated: Date.now(),
    };
  }

  /**
   * Create empty version
   */
  private createEmptyVersion(): PerformanceStoreVersion {
    return {
      version: this.generateVersionId(),
      timestamp: Date.now(),
      stats: [],
      checksum: "",
    };
  }

  /**
   * Create new version from current state
   */
  private createVersion(): PerformanceStoreVersion {
    return {
      version: this.generateVersionId(),
      timestamp: Date.now(),
      stats: JSON.parse(JSON.stringify(this.current.stats)), // Deep copy
      checksum: this.calculateChecksum(),
    };
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `v${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(): string {
    const data = JSON.stringify(this.current.stats);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Prune old versions to limit memory usage
   */
  private pruneVersions(): void {
    if (this.versions.length > this.config.versionsToKeep) {
      const toRemove = this.versions.length - this.config.versionsToKeep;
      this.versions.splice(0, toRemove);
    }
  }

  /**
   * Calculate Beta distribution confidence interval
   */
  private betaCI(mean: number, variance: number, confidence: number): [number, number] {
    // Approximate using normal distribution (valid for large α, β)
    const z = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90%
    const se = Math.sqrt(variance);
    return [
      Math.max(0, mean - z * se),
      Math.min(1, mean + z * se),
    ];
  }

  /**
   * Calculate importance weights (Fisher information approximation)
   */
  private calculateImportance(stats: ProviderStats): number[] {
    // Simple approximation: importance based on variance
    // Higher importance for parameters that vary less (more certain)
    const meanImportance = stats.importanceWeights.reduce((a, b) => a + b, 0) / stats.importanceWeights.length;
    const variance = stats.importanceWeights.reduce((sum, w) => sum + (w - meanImportance) ** 2, 0) / stats.importanceWeights.length;

    // Importance is inversely related to variance
    return stats.importanceWeights.map((w) => 1 / (1 + variance + Math.abs(w - meanImportance)));
  }
}
