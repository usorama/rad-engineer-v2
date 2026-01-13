/**
 * ResolutionMatcher - Match failures to resolutions with ranking
 *
 * Uses the FailureIndex to find and rank potential resolutions
 * for new failures, providing confidence scores and recommendations.
 */

import { FailureIndex, FailureRecord, Resolution, SearchResult } from "./FailureIndex.js";
import { FailureContext, FailureEmbedding } from "./FailureEmbedding.js";

export interface MatchResult {
  /** Matched resolution */
  resolution: Resolution;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source failure record */
  sourceRecord: FailureRecord;
  /** Why this resolution was matched */
  matchReason: string;
  /** Similarity score from embedding */
  similarity: number;
  /** Applicability score */
  applicability: number;
}

export interface MatcherConfig {
  /** Minimum similarity threshold */
  minSimilarity: number;
  /** Minimum confidence to suggest */
  minConfidence: number;
  /** Maximum matches to return */
  maxMatches: number;
  /** Weight for similarity in ranking */
  similarityWeight: number;
  /** Weight for success rate in ranking */
  successWeight: number;
  /** Weight for recency in ranking */
  recencyWeight: number;
  /** Boost for exact type match */
  typeMatchBoost: number;
}

export interface MatchStats {
  /** Total match attempts */
  totalAttempts: number;
  /** Successful matches (confidence >= threshold) */
  successfulMatches: number;
  /** Average confidence of matches */
  avgConfidence: number;
  /** Average time to match (ms) */
  avgMatchTimeMs: number;
  /** Match rate (hit rate) */
  matchRate: number;
}

export interface FeedbackResult {
  /** Was the resolution helpful */
  helpful: boolean;
  /** Specific feedback */
  feedback?: string;
  /** Adjusted confidence */
  adjustedConfidence?: number;
}

/**
 * ResolutionMatcher provides intelligent matching of failures
 * to known resolutions with confidence scoring
 */
export class ResolutionMatcher {
  private config: MatcherConfig;
  private index: FailureIndex;
  private stats = {
    totalAttempts: 0,
    successfulMatches: 0,
    totalConfidence: 0,
    totalMatchTime: 0,
  };
  private feedbackHistory: Map<
    string,
    { positive: number; negative: number }
  > = new Map();

  constructor(index: FailureIndex, config: Partial<MatcherConfig> = {}) {
    this.index = index;
    this.config = {
      minSimilarity: 0.5,
      minConfidence: 0.4,
      maxMatches: 5,
      similarityWeight: 0.4,
      successWeight: 0.3,
      recencyWeight: 0.15,
      typeMatchBoost: 0.15,
      ...config,
    };
  }

  /**
   * Find matching resolutions for a failure
   */
  match(context: FailureContext): MatchResult[] {
    const startTime = Date.now();

    // Search for similar failures
    const searchResults = this.index.search(context, 20);

    // Filter to only records with resolutions
    const withResolutions = searchResults.filter(
      (r) => r.record.resolution && r.record.resolution.successful
    );

    // Score and rank matches
    const matches = this.rankMatches(context, withResolutions);

    // Update stats
    const matchTime = Date.now() - startTime;
    this.updateStats(matches, matchTime);

    return matches.slice(0, this.config.maxMatches);
  }

  /**
   * Get the best resolution match
   */
  getBestMatch(context: FailureContext): MatchResult | null {
    const matches = this.match(context);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Check if we have a confident match
   */
  hasConfidentMatch(
    context: FailureContext,
    threshold?: number
  ): boolean {
    const minConfidence = threshold || this.config.minConfidence;
    const matches = this.match(context);
    return matches.some((m) => m.confidence >= minConfidence);
  }

  /**
   * Get match statistics
   */
  getStats(): MatchStats {
    const avgConfidence =
      this.stats.totalAttempts > 0
        ? this.stats.totalConfidence / this.stats.totalAttempts
        : 0;

    const avgMatchTime =
      this.stats.totalAttempts > 0
        ? this.stats.totalMatchTime / this.stats.totalAttempts
        : 0;

    const matchRate =
      this.stats.totalAttempts > 0
        ? this.stats.successfulMatches / this.stats.totalAttempts
        : 0;

    return {
      totalAttempts: this.stats.totalAttempts,
      successfulMatches: this.stats.successfulMatches,
      avgConfidence,
      avgMatchTimeMs: avgMatchTime,
      matchRate,
    };
  }

  /**
   * Provide feedback on a match result
   */
  provideFeedback(
    matchResult: MatchResult,
    feedback: FeedbackResult
  ): void {
    const resolutionId = matchResult.resolution.id;
    const history = this.feedbackHistory.get(resolutionId) || {
      positive: 0,
      negative: 0,
    };

    if (feedback.helpful) {
      history.positive++;
    } else {
      history.negative++;
    }

    this.feedbackHistory.set(resolutionId, history);
  }

  /**
   * Get resolution quality score based on feedback
   */
  getResolutionQuality(resolutionId: string): number {
    const history = this.feedbackHistory.get(resolutionId);
    if (!history) return 0.5; // Default neutral

    const total = history.positive + history.negative;
    if (total === 0) return 0.5;

    // Wilson score lower bound (simplified)
    const n = total;
    const p = history.positive / n;
    const z = 1.96; // 95% confidence

    const denominator = 1 + (z * z) / n;
    const pAdjusted = p + (z * z) / (2 * n);
    const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

    return (pAdjusted - spread) / denominator;
  }

  /**
   * Suggest a resolution with explanation
   */
  suggestResolution(context: FailureContext): {
    suggestion: Resolution | null;
    confidence: number;
    explanation: string;
    alternatives: Resolution[];
  } {
    const matches = this.match(context);

    if (matches.length === 0) {
      return {
        suggestion: null,
        confidence: 0,
        explanation: "No matching resolutions found in the failure index.",
        alternatives: [],
      };
    }

    const best = matches[0];
    const alternatives = matches.slice(1, 4).map((m) => m.resolution);

    let explanation = `Found ${matches.length} potential resolution(s). `;
    explanation += `Best match has ${(best.confidence * 100).toFixed(1)}% confidence. `;
    explanation += `Match reason: ${best.matchReason}`;

    if (best.confidence < this.config.minConfidence) {
      explanation += ` Note: Confidence is below threshold (${(this.config.minConfidence * 100).toFixed(0)}%).`;
    }

    return {
      suggestion: best.resolution,
      confidence: best.confidence,
      explanation,
      alternatives,
    };
  }

  /**
   * Find common resolutions for a failure type
   */
  findCommonResolutions(
    type: string,
    limit: number = 5
  ): Array<{ resolution: Resolution; frequency: number }> {
    const records = this.index.getByType(type);
    const resolutionCounts = new Map<string, { resolution: Resolution; count: number }>();

    for (const record of records) {
      if (record.resolution && record.resolution.successful) {
        const existing = resolutionCounts.get(record.resolution.id);
        if (existing) {
          existing.count++;
        } else {
          resolutionCounts.set(record.resolution.id, {
            resolution: record.resolution,
            count: 1,
          });
        }
      }
    }

    return Array.from(resolutionCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ resolution, count }) => ({
        resolution,
        frequency: count / records.length,
      }));
  }

  /**
   * Analyze resolution patterns
   */
  analyzePatterns(): {
    byType: Map<string, { totalFailures: number; resolvedCount: number; topResolutions: string[] }>;
    mostEffective: Array<{ resolution: Resolution; successRate: number }>;
    recentTrends: string[];
  } {
    const byType = new Map<
      string,
      {
        totalFailures: number;
        resolvedCount: number;
        resolutions: Map<string, number>;
      }
    >();

    const resolutionSuccess = new Map<
      string,
      { resolution: Resolution; success: number; total: number }
    >();

    // Analyze all records
    for (const record of this.iterateRecords()) {
      const type = record.context.type;

      // Update type stats
      let typeStats = byType.get(type);
      if (!typeStats) {
        typeStats = { totalFailures: 0, resolvedCount: 0, resolutions: new Map() };
        byType.set(type, typeStats);
      }
      typeStats.totalFailures++;

      if (record.resolution) {
        typeStats.resolvedCount++;
        const resId = record.resolution.id;
        typeStats.resolutions.set(resId, (typeStats.resolutions.get(resId) || 0) + 1);

        // Update resolution success
        let resStats = resolutionSuccess.get(resId);
        if (!resStats) {
          resStats = { resolution: record.resolution, success: 0, total: 0 };
          resolutionSuccess.set(resId, resStats);
        }
        resStats.total++;
        if (record.resolution.successful) {
          resStats.success++;
        }
      }
    }

    // Format type results
    const formattedByType = new Map<
      string,
      { totalFailures: number; resolvedCount: number; topResolutions: string[] }
    >();
    for (const [type, stats] of byType) {
      const topRes = Array.from(stats.resolutions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
      formattedByType.set(type, {
        totalFailures: stats.totalFailures,
        resolvedCount: stats.resolvedCount,
        topResolutions: topRes,
      });
    }

    // Find most effective resolutions
    const mostEffective = Array.from(resolutionSuccess.values())
      .filter((s) => s.total >= 3) // Minimum sample size
      .map((s) => ({
        resolution: s.resolution,
        successRate: s.success / s.total,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    // Analyze recent trends
    const recentTrends: string[] = [];
    const recent = this.index.getRecent(50);
    const recentTypes = new Map<string, number>();
    for (const record of recent) {
      recentTypes.set(record.context.type, (recentTypes.get(record.context.type) || 0) + 1);
    }
    const sortedTypes = Array.from(recentTypes.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedTypes.length > 0) {
      recentTrends.push(`Most common recent failure: ${sortedTypes[0][0]} (${sortedTypes[0][1]} occurrences)`);
    }

    return {
      byType: formattedByType,
      mostEffective,
      recentTrends,
    };
  }

  /**
   * Reset matcher statistics
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulMatches: 0,
      totalConfidence: 0,
      totalMatchTime: 0,
    };
  }

  /**
   * Clear feedback history
   */
  clearFeedback(): void {
    this.feedbackHistory.clear();
  }

  // Private methods

  private rankMatches(
    context: FailureContext,
    searchResults: SearchResult[]
  ): MatchResult[] {
    const results: MatchResult[] = [];
    const now = Date.now();

    for (const result of searchResults) {
      const record = result.record;
      if (!record.resolution) continue;

      // Calculate component scores
      const similarityScore = result.similarity;

      // Success rate score based on feedback
      const feedbackQuality = this.getResolutionQuality(record.resolution.id);
      const successScore = record.resolution.successful ? 0.7 + feedbackQuality * 0.3 : 0.3;

      // Recency score (decay over time)
      const ageMs = now - record.timestamp.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageDays / 30); // 30-day half-life

      // Type match boost
      const typeBoost = context.type === record.context.type ? 1 : 0;

      // Calculate weighted confidence
      const confidence =
        similarityScore * this.config.similarityWeight +
        successScore * this.config.successWeight +
        recencyScore * this.config.recencyWeight +
        typeBoost * this.config.typeMatchBoost;

      // Calculate applicability (how applicable this resolution is)
      const applicability = this.calculateApplicability(context, record);

      // Generate match reason
      const matchReason = this.generateMatchReason(
        context,
        record,
        similarityScore,
        typeBoost > 0
      );

      results.push({
        resolution: record.resolution,
        confidence: Math.min(confidence, 1),
        sourceRecord: record,
        matchReason,
        similarity: similarityScore,
        applicability,
      });
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  private calculateApplicability(
    context: FailureContext,
    record: FailureRecord
  ): number {
    let score = 0.5; // Base score

    // Type match
    if (context.type === record.context.type) {
      score += 0.2;
    }

    // Check for common tokens in messages
    const contextTokens = new Set(
      context.message.toLowerCase().split(/\s+/)
    );
    const recordTokens = new Set(
      record.context.message.toLowerCase().split(/\s+/)
    );

    let commonTokens = 0;
    for (const token of contextTokens) {
      if (recordTokens.has(token)) {
        commonTokens++;
      }
    }

    const tokenOverlap = commonTokens / Math.max(contextTokens.size, 1);
    score += tokenOverlap * 0.2;

    // Agent ID match if available
    if (context.agentId && record.context.agentId === context.agentId) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  private generateMatchReason(
    context: FailureContext,
    record: FailureRecord,
    similarity: number,
    typeMatch: boolean
  ): string {
    const reasons: string[] = [];

    if (typeMatch) {
      reasons.push(`Same error type (${context.type})`);
    }

    if (similarity >= 0.8) {
      reasons.push("Very similar error message");
    } else if (similarity >= 0.6) {
      reasons.push("Similar error pattern");
    }

    if (record.resolution?.successful) {
      reasons.push("Previously resolved successfully");
    }

    if (record.context.taskId && context.taskId === record.context.taskId) {
      reasons.push("Same task");
    }

    return reasons.length > 0 ? reasons.join("; ") : "Semantic similarity match";
  }

  private updateStats(matches: MatchResult[], matchTimeMs: number): void {
    this.stats.totalAttempts++;
    this.stats.totalMatchTime += matchTimeMs;

    if (matches.length > 0) {
      const bestConfidence = matches[0].confidence;
      this.stats.totalConfidence += bestConfidence;

      if (bestConfidence >= this.config.minConfidence) {
        this.stats.successfulMatches++;
      }
    }
  }

  private *iterateRecords(): Generator<FailureRecord> {
    // Use index's internal iteration
    const recent = this.index.getRecent(this.index.size());
    for (const record of recent) {
      yield record;
    }
  }
}
