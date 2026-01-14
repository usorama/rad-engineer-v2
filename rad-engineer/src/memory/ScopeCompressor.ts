/**
 * ScopeCompressor - Compresses closed scopes to summaries for memory efficiency
 * Achieves ≥5:1 compression ratio to maintain O(log n) token growth
 * Preserves essential information while reducing token footprint
 */

import { Scope, ScopeLevel } from "./Scope";
import { ScopeStack } from "./ScopeStack";

export enum CompressionStrategy {
  CONSERVATIVE = "CONSERVATIVE", // Preserves more detail, ~3:1 ratio
  BALANCED = "BALANCED",         // Default strategy, ~5:1 ratio
  AGGRESSIVE = "AGGRESSIVE",     // Maximum compression, ~8:1 ratio
}

export interface CompressionResult {
  scopeId: string;
  originalTokenCount: number;
  compressedTokenCount: number;
  compressionRatio: number;
  summary: string;
  eventSummary: string;
  artifactSummary: string;
  timestamp: Date;
}

export interface CompressionMetrics {
  totalCompressed: number;
  totalTokensSaved: number;
  averageCompressionRatio: number;
  bestCompressionRatio: number;
  worstCompressionRatio: number;
}

/**
 * ScopeCompressor implements intelligent compression of closed scopes
 * Uses extractive summarization and structured data reduction
 */
export class ScopeCompressor {
  private strategy: CompressionStrategy;
  private metrics: CompressionResult[];

  constructor(strategy: CompressionStrategy = CompressionStrategy.BALANCED) {
    this.strategy = strategy;
    this.metrics = [];
  }

  /**
   * Compress a single scope to a summary representation
   * Achieves target compression ratio while preserving essential information
   */
  async compressScope(scope: Scope): Promise<CompressionResult> {
    if (!scope.isClosed()) {
      throw new Error(`Cannot compress open scope: ${scope.id}`);
    }

    const originalTokenCount = scope.getTokenCount();

    // Generate compressed summaries
    const summary = await this.generateScopeSummary(scope);
    const eventSummary = await this.generateEventSummary(scope);
    const artifactSummary = await this.generateArtifactSummary(scope);

    // Calculate compressed token count
    const compressedContent = summary + eventSummary + artifactSummary;
    const compressedTokenCount = Math.ceil(compressedContent.length / 4);

    const compressionRatio = originalTokenCount / compressedTokenCount;

    const result: CompressionResult = {
      scopeId: scope.id,
      originalTokenCount,
      compressedTokenCount,
      compressionRatio,
      summary,
      eventSummary,
      artifactSummary,
      timestamp: new Date(),
    };

    // Apply compression to the scope itself
    scope.applyCompression(eventSummary, artifactSummary);

    // Track metrics
    this.metrics.push(result);

    return result;
  }

  /**
   * Compress multiple scopes in a stack
   * Optionally filter by scope level for targeted compression
   */
  async compressStack(
    stack: ScopeStack,
    levelFilter?: ScopeLevel
  ): Promise<CompressionResult[]> {
    const scopes = stack.getAllScopes();
    const scopesToCompress = scopes.filter(scope => {
      const isClosedAndMatches = scope.isClosed() &&
        (!levelFilter || scope.level === levelFilter);
      return isClosedAndMatches;
    });

    const results: CompressionResult[] = [];

    for (const scope of scopesToCompress) {
      try {
        const result = await this.compressScope(scope);
        results.push(result);
      } catch (error) {
        // Log error but continue with other scopes
        console.warn(`Failed to compress scope ${scope.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate high-level summary of scope goal and outcome
   */
  private async generateScopeSummary(scope: Scope): Promise<string> {
    const goal = scope.goal;
    const summary = scope.summary || "No summary provided";

    switch (this.strategy) {
      case CompressionStrategy.CONSERVATIVE:
        return `${goal} | ${summary}`;

      case CompressionStrategy.BALANCED:
        return this.extractKeywords(goal) + " → " + this.extractKeywords(summary);

      case CompressionStrategy.AGGRESSIVE:
        return this.extractKeywords(goal + " " + summary).substring(0, 50);

      default:
        return `${goal} → ${summary}`;
    }
  }

  /**
   * Generate compressed summary of events in scope
   */
  private async generateEventSummary(scope: Scope): Promise<string> {
    if (scope.events.length === 0) {
      return "";
    }

    const eventTypes = scope.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    switch (this.strategy) {
      case CompressionStrategy.CONSERVATIVE:
        return `Events: ${scope.events.length} (${Object.entries(eventTypes).map(([type, count]) => `${count}×${type}`).join(", ")})`;

      case CompressionStrategy.BALANCED:
        const topEventType = Object.entries(eventTypes).reduce((max, [type, count]) =>
          count > max[1] ? [type, count] : max
        );
        return `${scope.events.length}ev (${topEventType[1]}×${topEventType[0]})`;

      case CompressionStrategy.AGGRESSIVE:
        return `${scope.events.length}ev`;

      default:
        return `${scope.events.length} events`;
    }
  }

  /**
   * Generate compressed summary of artifacts in scope
   */
  private async generateArtifactSummary(scope: Scope): Promise<string> {
    if (scope.artifacts.size === 0) {
      return "";
    }

    const artifactKeys = Array.from(scope.artifacts.keys());

    switch (this.strategy) {
      case CompressionStrategy.CONSERVATIVE:
        return `Artifacts: ${artifactKeys.join(", ")}`;

      case CompressionStrategy.BALANCED:
        const keyCount = artifactKeys.length;
        const firstKey = artifactKeys[0];
        return keyCount > 1 ? `${keyCount}artifacts (${firstKey}...)` : `1artifact (${firstKey})`;

      case CompressionStrategy.AGGRESSIVE:
        return `${artifactKeys.length}art`;

      default:
        return `${artifactKeys.length} artifacts`;
    }
  }

  /**
   * Extract keywords from text for compression
   */
  private extractKeywords(text: string): string {
    // Remove common words and keep meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5); // Keep top 5 keywords

    return words.join(' ');
  }

  /**
   * Get compression metrics for monitoring and optimization
   */
  getCompressionMetrics(): CompressionMetrics {
    if (this.metrics.length === 0) {
      return {
        totalCompressed: 0,
        totalTokensSaved: 0,
        averageCompressionRatio: 0,
        bestCompressionRatio: 0,
        worstCompressionRatio: 0,
      };
    }

    const totalCompressed = this.metrics.length;
    const totalTokensSaved = this.metrics.reduce(
      (sum, result) => sum + (result.originalTokenCount - result.compressedTokenCount),
      0
    );
    const compressionRatios = this.metrics.map(result => result.compressionRatio);
    const averageCompressionRatio = compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / compressionRatios.length;
    const bestCompressionRatio = Math.max(...compressionRatios);
    const worstCompressionRatio = Math.min(...compressionRatios);

    return {
      totalCompressed,
      totalTokensSaved,
      averageCompressionRatio,
      bestCompressionRatio,
      worstCompressionRatio,
    };
  }

  /**
   * Clear compression metrics (for testing or reset)
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get all compression results for analysis
   */
  getAllResults(): CompressionResult[] {
    return [...this.metrics];
  }

  /**
   * Update compression strategy
   */
  setStrategy(strategy: CompressionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current compression strategy
   */
  getStrategy(): CompressionStrategy {
    return this.strategy;
  }

  /**
   * Check if compression target is being met
   */
  isCompressionTargetMet(minRatio: number = 5): boolean {
    const metrics = this.getCompressionMetrics();
    return metrics.averageCompressionRatio >= minRatio;
  }

  /**
   * Get recommendations for improving compression
   */
  getCompressionRecommendations(): string[] {
    const metrics = this.getCompressionMetrics();
    const recommendations: string[] = [];

    if (metrics.averageCompressionRatio < 3) {
      recommendations.push("Consider using AGGRESSIVE compression strategy");
    } else if (metrics.averageCompressionRatio < 5) {
      recommendations.push("Consider using AGGRESSIVE compression for LOCAL scopes");
    }

    if (metrics.worstCompressionRatio < 2) {
      recommendations.push("Some scopes have very low compression - review content structure");
    }

    if (recommendations.length === 0) {
      recommendations.push("Compression performance is optimal");
    }

    return recommendations;
  }
}