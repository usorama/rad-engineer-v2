/**
 * FailureIndex - Searchable failure database with semantic similarity
 *
 * Stores failure records with their embeddings and resolutions,
 * enabling efficient similarity-based retrieval.
 */

import {
  FailureEmbedding,
  FailureContext,
  EmbeddingResult,
} from "./FailureEmbedding.js";

export interface Resolution {
  /** Unique resolution ID */
  id: string;
  /** Description of the resolution */
  description: string;
  /** Specific action taken */
  action: string;
  /** Code changes if applicable */
  codeChanges?: string[];
  /** Configuration changes if applicable */
  configChanges?: Record<string, unknown>;
  /** Was resolution successful? */
  successful: boolean;
  /** Time taken to resolve (ms) */
  resolutionTimeMs?: number;
  /** Additional notes */
  notes?: string;
}

export interface FailureRecord {
  /** Unique failure ID */
  id: string;
  /** Failure context */
  context: FailureContext;
  /** Generated embedding */
  embedding: EmbeddingResult;
  /** Resolution if available */
  resolution?: Resolution;
  /** Timestamp of failure */
  timestamp: Date;
  /** Session ID where failure occurred */
  sessionId?: string;
  /** Tags for categorization */
  tags: string[];
}

export interface SearchResult {
  /** The matched failure record */
  record: FailureRecord;
  /** Similarity score (0-1) */
  similarity: number;
  /** Has successful resolution */
  hasResolution: boolean;
}

export interface IndexStats {
  /** Total number of records */
  totalRecords: number;
  /** Records with resolutions */
  resolvedCount: number;
  /** Resolution success rate */
  successRate: number;
  /** Average similarity in recent searches */
  avgSimilarity: number;
  /** Total searches performed */
  searchCount: number;
  /** Resolution hit rate */
  hitRate: number;
}

export interface IndexConfig {
  /** Maximum records to store */
  maxRecords: number;
  /** Similarity threshold for matches */
  similarityThreshold: number;
  /** Maximum search results */
  maxSearchResults: number;
  /** Enable persistence */
  persistenceEnabled: boolean;
  /** Persistence file path */
  persistencePath?: string;
}

export interface SearchStatsData {
  totalSearches: number;
  totalHits: number;
  totalSimilarity: number;
}

/**
 * FailureIndex provides a searchable database for failure records
 * with semantic similarity matching
 */
export class FailureIndex {
  private config: IndexConfig;
  private embedding: FailureEmbedding;
  private records: Map<string, FailureRecord> = new Map();
  private searchStats: SearchStatsData = {
    totalSearches: 0,
    totalHits: 0,
    totalSimilarity: 0,
  };

  constructor(
    config: Partial<IndexConfig> = {},
    embedding?: FailureEmbedding
  ) {
    this.config = {
      maxRecords: 10000,
      similarityThreshold: 0.6,
      maxSearchResults: 10,
      persistenceEnabled: false,
      ...config,
    };
    this.embedding = embedding || new FailureEmbedding();
  }

  /**
   * Add a failure to the index
   */
  add(
    context: FailureContext,
    options: {
      id?: string;
      resolution?: Resolution;
      sessionId?: string;
      tags?: string[];
    } = {}
  ): FailureRecord {
    const id = options.id || this.generateId();
    const embeddingResult = this.embedding.embed(context);

    const record: FailureRecord = {
      id,
      context,
      embedding: embeddingResult,
      resolution: options.resolution,
      timestamp: new Date(),
      sessionId: options.sessionId,
      tags: options.tags || [],
    };

    // Enforce max records limit
    if (this.records.size >= this.config.maxRecords) {
      this.evictOldest();
    }

    this.records.set(id, record);
    return record;
  }

  /**
   * Add resolution to an existing failure record
   */
  addResolution(failureId: string, resolution: Resolution): boolean {
    const record = this.records.get(failureId);
    if (!record) return false;

    record.resolution = resolution;
    return true;
  }

  /**
   * Search for similar failures
   */
  search(context: FailureContext, limit?: number): SearchResult[] {
    const queryEmbedding = this.embedding.embed(context);
    const maxResults = limit || this.config.maxSearchResults;

    const results: SearchResult[] = [];

    for (const record of this.records.values()) {
      const similarity = this.embedding.similarity(
        queryEmbedding,
        record.embedding
      );

      if (similarity >= this.config.similarityThreshold) {
        results.push({
          record,
          similarity,
          hasResolution: !!record.resolution,
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    // Update stats
    this.updateSearchStats(results);

    return results.slice(0, maxResults);
  }

  /**
   * Find resolutions for a failure
   */
  findResolutions(
    context: FailureContext,
    options: {
      limit?: number;
      onlySuccessful?: boolean;
      minSimilarity?: number;
    } = {}
  ): Array<{ resolution: Resolution; similarity: number; record: FailureRecord }> {
    const searchResults = this.search(context, options.limit || 10);
    const minSimilarity = options.minSimilarity || this.config.similarityThreshold;

    return searchResults
      .filter((result) => {
        if (!result.record.resolution) return false;
        if (result.similarity < minSimilarity) return false;
        if (options.onlySuccessful && !result.record.resolution.successful) {
          return false;
        }
        return true;
      })
      .map((result) => ({
        resolution: result.record.resolution!,
        similarity: result.similarity,
        record: result.record,
      }));
  }

  /**
   * Get a failure record by ID
   */
  get(id: string): FailureRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Remove a failure record
   */
  remove(id: string): boolean {
    return this.records.delete(id);
  }

  /**
   * Get all records with a specific tag
   */
  getByTag(tag: string): FailureRecord[] {
    const results: FailureRecord[] = [];
    for (const record of this.records.values()) {
      if (record.tags.includes(tag)) {
        results.push(record);
      }
    }
    return results;
  }

  /**
   * Get records by type
   */
  getByType(type: string): FailureRecord[] {
    const results: FailureRecord[] = [];
    for (const record of this.records.values()) {
      if (record.context.type === type) {
        results.push(record);
      }
    }
    return results;
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    let resolvedCount = 0;
    let successfulCount = 0;

    for (const record of this.records.values()) {
      if (record.resolution) {
        resolvedCount++;
        if (record.resolution.successful) {
          successfulCount++;
        }
      }
    }

    const avgSimilarity =
      this.searchStats.totalSearches > 0
        ? this.searchStats.totalSimilarity / this.searchStats.totalSearches
        : 0;

    const hitRate =
      this.searchStats.totalSearches > 0
        ? this.searchStats.totalHits / this.searchStats.totalSearches
        : 0;

    return {
      totalRecords: this.records.size,
      resolvedCount,
      successRate: resolvedCount > 0 ? successfulCount / resolvedCount : 0,
      avgSimilarity,
      searchCount: this.searchStats.totalSearches,
      hitRate,
    };
  }

  /**
   * Get record count
   */
  size(): number {
    return this.records.size;
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records.clear();
    this.searchStats = {
      totalSearches: 0,
      totalHits: 0,
      totalSimilarity: 0,
    };
    this.embedding.reset();
  }

  /**
   * Export index for persistence
   */
  export(): {
    records: FailureRecord[];
    embeddingState: ReturnType<FailureEmbedding["exportState"]>;
    searchStats: SearchStatsData;
  } {
    return {
      records: Array.from(this.records.values()).map((record) => ({
        ...record,
        timestamp: record.timestamp,
      })),
      embeddingState: this.embedding.exportState(),
      searchStats: { ...this.searchStats },
    };
  }

  /**
   * Import index from persistence
   */
  import(data: {
    records: FailureRecord[];
    embeddingState: ReturnType<FailureEmbedding["exportState"]>;
    searchStats?: SearchStatsData;
  }): void {
    this.clear();

    // Import embedding state
    this.embedding.importState(data.embeddingState);

    // Import records
    for (const record of data.records) {
      this.records.set(record.id, {
        ...record,
        timestamp: new Date(record.timestamp),
      });
    }

    // Import stats if available
    if (data.searchStats) {
      this.searchStats = { ...data.searchStats };
    }
  }

  /**
   * Batch add failures
   */
  batchAdd(
    failures: Array<{
      context: FailureContext;
      resolution?: Resolution;
      tags?: string[];
    }>
  ): FailureRecord[] {
    const records: FailureRecord[] = [];

    for (const failure of failures) {
      const record = this.add(failure.context, {
        resolution: failure.resolution,
        tags: failure.tags,
      });
      records.push(record);
    }

    return records;
  }

  /**
   * Find common failure patterns
   */
  findPatterns(
    minFrequency: number = 3
  ): Array<{ type: string; count: number; resolutionRate: number }> {
    const typeStats = new Map<
      string,
      { count: number; resolved: number; successful: number }
    >();

    for (const record of this.records.values()) {
      const type = record.context.type;
      const stats = typeStats.get(type) || { count: 0, resolved: 0, successful: 0 };

      stats.count++;
      if (record.resolution) {
        stats.resolved++;
        if (record.resolution.successful) {
          stats.successful++;
        }
      }

      typeStats.set(type, stats);
    }

    return Array.from(typeStats.entries())
      .filter(([_, stats]) => stats.count >= minFrequency)
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        resolutionRate: stats.resolved > 0 ? stats.successful / stats.resolved : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get recent failures
   */
  getRecent(limit: number = 10): FailureRecord[] {
    return Array.from(this.records.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Private methods

  private generateId(): string {
    return `failure-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private evictOldest(): void {
    // Find oldest record without resolution
    let oldestUnresolved: FailureRecord | null = null;

    for (const record of this.records.values()) {
      if (!record.resolution) {
        if (
          !oldestUnresolved ||
          record.timestamp < oldestUnresolved.timestamp
        ) {
          oldestUnresolved = record;
        }
      }
    }

    // If all have resolutions, evict oldest overall
    if (oldestUnresolved) {
      this.records.delete(oldestUnresolved.id);
    } else {
      let oldest: FailureRecord | null = null;
      for (const record of this.records.values()) {
        if (!oldest || record.timestamp < oldest.timestamp) {
          oldest = record;
        }
      }
      if (oldest) {
        this.records.delete(oldest.id);
      }
    }
  }

  private updateSearchStats(results: SearchResult[]): void {
    this.searchStats.totalSearches++;

    if (results.length > 0) {
      // Calculate average similarity of results
      const avgSim =
        results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
      this.searchStats.totalSimilarity += avgSim;

      // Count as hit if we found a resolution
      if (results.some((r) => r.hasResolution)) {
        this.searchStats.totalHits++;
      }
    }
  }
}
