/**
 * Decision Learning Store with Versioning
 *
 * Stores, tracks, and learns from architectural and engineering decisions.
 * Extends PerformanceStore pattern for deterministic self-improvement.
 */

import type { Domain } from "../adaptive/types.js";

/**
 * A stored decision record
 */
export interface DecisionRecord {
  id: string;
  timestamp: number;
  component: string;
  activity: string;
  decision: string;
  context: DecisionContext;
  reasoningMethod: ReasoningMethod;
  outcome?: DecisionOutcome;
  confidence: number;
  importanceWeights: number[];
}

/**
 * Context in which decision was made
 */
export interface DecisionContext {
  domain: Domain;
  complexity: number;
  constraints: string[];
  stakeholders: string[];
}

/**
 * Which reasoning method was used
 */
export interface ReasoningMethod {
  name: string;
  category: MethodCategory;
  parameters: Record<string, unknown>;
}

/**
 * Method category
 */
export type MethodCategory = "Core" | "Advanced" | "Risk" | "Competitive" | "Research";

/**
 * Outcome of a decision (filled in later)
 */
export interface DecisionOutcome {
  success: boolean;
  quality: number;
  latency?: number;
  cost?: number;
  errors: string[];
  userFeedback?: string;
  decisionId: string;
}

/**
 * Learning update from outcome
 */
export interface LearningUpdate {
  decisionId: string;
  methodEffectiveness: number;
  contextPatterns: Record<string, number>;
  recommendation: string;
}

/**
 * Filter for querying decisions
 */
export interface DecisionFilter {
  component?: string;
  activity?: string;
  reasoningMethod?: string;
  domain?: Domain;
  dateRange?: { start: number; end: number };
  hasOutcome?: boolean;
}

/**
 * Current state snapshot
 */
export interface DecisionStoreVersion {
  version: string;
  timestamp: number;
  decisions: DecisionRecord[];
  checksum: string;
  statistics: {
    totalDecisions: number;
    decisionsWithOutcomes: number;
    averageQuality: number;
    successRate: number;
    bestMethods: Record<string, number>;
  };
}

/**
 * Decision snapshot for EWC
 */
export interface DecisionSnapshot {
  version: string;
  timestamp: number;
  decisions: DecisionRecord[];
  checksum: string;
}

/**
 * Qdrant batch payload
 */
export interface QdrantBatch {
  collection: string;
  points: QdrantPoint[];
}

/**
 * Qdrant point
 */
export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    decisionId: string;
    component: string;
    activity: string;
    decision: string;
    domain: string;
    reasoningMethod: string;
    timestamp: number;
    success?: boolean;
    quality?: number;
  };
}

/**
 * Decision Store Configuration
 */
export interface DecisionStoreConfig {
  path?: string;
  autoSave?: boolean;
  versionsToKeep?: number;
}

/**
 * Decision Learning Store
 *
 * Extends the PerformanceStore pattern for decision tracking and learning.
 * Implements Elastic Weight Consolidation (EWC) to prevent catastrophic forgetting.
 */
export class DecisionLearningStore {
  private versions: DecisionStoreVersion[] = [];
  private current: DecisionStoreVersion;
  private config: Required<DecisionStoreConfig>;
  private methodEffectiveness: Map<string, number> = new Map();

  constructor(config?: DecisionStoreConfig) {
    this.config = {
      path: config?.path || "~/.config/rad-engineer/decision-store.yaml",
      autoSave: config?.autoSave ?? true,
      versionsToKeep: config?.versionsToKeep || 100,
    };

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
   * Store a new decision record
   *
   * @param decision - Decision record to store
   * @throws {Error} If decision.id already exists
   * @throws {Error} If required fields missing
   */
  storeDecision(decision: DecisionRecord): void {
    const startTime = Date.now();

    // Validate required fields
    this.validateDecision(decision);

    // Check for duplicate ID
    if (this.current.decisions.some((d) => d.id === decision.id)) {
      throw new Error(`DUPLICATE_DECISION_ID: Decision ${decision.id} already exists`);
    }

    // Add to current version
    this.current.decisions.push(decision);

    // Create new version
    this.current = this.createVersion();
    this.versions.push(this.current);

    // Prune old versions
    this.pruneVersions();

    // Check timeout
    const elapsed = Date.now() - startTime;
    if (elapsed > 5000) {
      throw new Error(`STORAGE_WRITE_FAILED: Timeout after ${elapsed}ms`);
    }
  }

  /**
   * Query decisions with optional filter
   *
   * @param filter - Optional filter criteria
   * @returns {DecisionRecord[]} Matching decisions (empty array if none)
   */
  getDecisions(filter?: DecisionFilter): DecisionRecord[] {
    const startTime = Date.now();

    try {
      let decisions = this.current.decisions;

      // Apply filter if provided
      if (filter) {
        // Validate filter
        if (!this.validateFilter(filter)) {
          console.warn("INVALID_FILTER: Returning empty array");
          return [];
        }

        decisions = decisions.filter((d) => this.matchesFilter(d, filter));
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > 1000) {
        console.warn(`QUERY_TIMEOUT: Query took ${elapsed}ms, returning partial results`);
      }

      // Skip corrupted records
      return decisions.filter((d) => this.isValidDecision(d));
    } catch (error) {
      console.error("Error in getDecisions:", error);
      return [];
    }
  }

  /**
   * Learn from a decision outcome
   *
   * Updates:
   * - Decision record with outcome
   * - Method effectiveness scores
   * - Context pattern matching
   * - EWC importance weights
   *
   * @param outcome - Outcome data
   * @returns {LearningUpdate} What was learned
   * @throws {Error} If decision.id not found
   */
  learnFromOutcome(outcome: DecisionOutcome): LearningUpdate {
    const startTime = Date.now();
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Find decision
        const decision = this.current.decisions.find((d) => d.id === outcome.decisionId);
        if (!decision) {
          throw new Error(`DECISION_NOT_FOUND: Decision ${outcome.decisionId} not found`);
        }

        // Validate outcome matches decision
        if (outcome.errors.length > 0 && !outcome.success) {
          // Valid failure outcome
        }

        // Update decision with outcome
        decision.outcome = outcome;

        // Update method effectiveness
        const currentEffectiveness = this.methodEffectiveness.get(decision.reasoningMethod.name) ?? 0.5;
        const learningRate = 0.1;
        const newEffectiveness = (1 - learningRate) * currentEffectiveness + learningRate * (outcome.success ? 1 : 0);
        this.methodEffectiveness.set(decision.reasoningMethod.name, newEffectiveness);

        // Update importance weights (EWC)
        this.updateImportanceWeights(decision, outcome);

        // Create new version
        this.current = this.createVersion();
        this.versions.push(this.current);

        // Prune old versions
        this.pruneVersions();

        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > 3000) {
          throw new Error(`LEARNING_UPDATE_FAILED: Timeout after ${elapsed}ms`);
        }

        return {
          decisionId: outcome.decisionId,
          methodEffectiveness: newEffectiveness,
          contextPatterns: this.extractContextPatterns(decision),
          recommendation: this.generateRecommendation(decision, outcome),
        };
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          if (error instanceof Error && error.message.includes("DECISION_NOT_FOUND")) {
            throw error;
          }
          throw new Error(`LEARNING_UPDATE_FAILED: ${error}`);
        }
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 100;
        const waitUntil = Date.now() + delay;
        while (Date.now() < waitUntil) {
          // Busy wait
        }
      }
    }

    throw new Error("LEARNING_UPDATE_FAILED: Max retries exceeded");
  }

  /**
   * Get best reasoning method for a context
   *
   * Uses historical data to recommend which reasoning method
   * has been most effective for similar contexts.
   *
   * @param context - Decision context
   * @returns {ReasoningMethod} Recommended method
   */
  getBestMethod(context: DecisionContext): ReasoningMethod {
    // Find decisions with similar context
    const similarDecisions = this.current.decisions.filter((d) => {
      if (!d.outcome) return false;

      const domainMatch = d.context.domain === context.domain;
      const complexitySimilar = Math.abs(d.context.complexity - context.complexity) < 0.2;

      return domainMatch && complexitySimilar;
    });

    // Check for insufficient data
    if (similarDecisions.length < 10) {
      return {
        name: "First Principles",
        category: "Core",
        parameters: {},
      };
    }

    // Group by method and calculate effectiveness
    const methodScores = new Map<string, { total: number; count: number }>();

    for (const decision of similarDecisions) {
      if (!decision.outcome) continue;

      const methodName = decision.reasoningMethod.name;
      const score = decision.outcome.success ? 1 : 0;

      const current = methodScores.get(methodName) ?? { total: 0, count: 0 };
      methodScores.set(methodName, {
        total: current.total + score,
        count: current.count + 1,
      });
    }

    // Find best method
    let bestMethod = "First Principles";
    let bestScore = 0;

    for (const [method, { total, count }] of methodScores) {
      const avgScore = total / count;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestMethod = method;
      }
    }

    // Check if method is available (simplified check)
    const knownMethods = ["First Principles", "5 Whys", "Root Cause Analysis", "SWOT Analysis"];
    if (!knownMethods.includes(bestMethod)) {
      return {
        name: "First Principles",
        category: "Core",
        parameters: {},
      };
    }

    return {
      name: bestMethod,
      category: "Core",
      parameters: {},
    };
  }

  /**
   * Export decisions to knowledge graph (Qdrant)
   *
   * @returns {Promise<QdrantBatch>} Batch insert payload
   * @throws {Error} If Qdrant connection fails
   */
  async exportToKnowledgeGraph(): Promise<QdrantBatch> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Check batch size
        const batchSize = this.current.decisions.length;
        const maxBatchSize = 1000;

        if (batchSize > maxBatchSize) {
          // Split into smaller batches
          const batches: QdrantBatch[] = [];
          for (let i = 0; i < batchSize; i += maxBatchSize) {
            const chunk = this.current.decisions.slice(i, i + maxBatchSize);
            batches.push(await this.createQdrantBatch(chunk));
          }
          // Return first batch for now
          return batches[0];
        }

        return await this.createQdrantBatch(this.current.decisions);
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          if (error instanceof Error && error.message.includes("QDRANT_CONNECTION_FAILED")) {
            throw error;
          }
          throw new Error(`INDEX_CREATION_FAILED: ${error}`);
        }
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        const waitUntil = Date.now() + delay;
        while (Date.now() < waitUntil) {
          // Busy wait
        }
      }
    }

    throw new Error("QDRANT_CONNECTION_FAILED: Max retries exceeded");
  }

  /**
   * Apply Elastic Weight Consolidation to prevent catastrophic forgetting
   *
   * When learning new patterns, EWC ensures old important patterns
   * are not forgotten.
   *
   * @param oldSnapshot - Previous state snapshot
   * @returns {this} Chainable
   * @throws {Error} If snapshot checksum invalid
   */
  applyEWC(oldSnapshot: DecisionSnapshot): this {
    const startTime = Date.now();

    try {
      // Validate snapshot checksum
      // If snapshot has decisions, verify checksum integrity
      // If snapshot has no decisions but has an invalid checksum, throw (data corruption)
      const expectedChecksum = this.calculateChecksum(oldSnapshot.decisions);
      if (oldSnapshot.checksum !== expectedChecksum) {
        // Empty snapshots with non-empty checksums are suspicious
        if (oldSnapshot.decisions.length === 0 && oldSnapshot.checksum !== "") {
          throw new Error("SNAPSHOT_INVALID: Checksum mismatch, reloading from disk");
        }
        // Non-empty snapshots must have matching checksums
        if (oldSnapshot.decisions.length > 0) {
          throw new Error("SNAPSHOT_INVALID: Checksum mismatch, reloading from disk");
        }
      }

      // Calculate Fisher information for old decisions
      const oldImportance = this.calculateFisherInformation(oldSnapshot.decisions);

      // Apply EWC penalty to current decisions
      const learningRate = 0.01;

      for (const decision of this.current.decisions) {
        if (!decision.outcome) continue;

        // Update importance weights with EWC penalty
        for (let i = 0; i < decision.importanceWeights.length; i++) {
          const oldWeight = this.getOldWeight(oldSnapshot.decisions, decision.id, i);
          if (oldWeight !== null) {
            const penalty = oldImportance[i] * (decision.importanceWeights[i] - oldWeight);
            decision.importanceWeights[i] -= learningRate * penalty;
          }
        }
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > 5000) {
        throw new Error(`WEIGHT_UPDATE_FAILED: Timeout after ${elapsed}ms`);
      }

      return this;
    } catch (error) {
      if (error instanceof Error && error.message.includes("SNAPSHOT_INVALID")) {
        // Reload from disk (simplified - just throw for now)
        throw error;
      }
      throw new Error(`WEIGHT_UPDATE_FAILED: ${error}`);
    }
  }

  /**
   * Get current state
   */
  getState(): DecisionStoreVersion {
    return this.current;
  }

  /**
   * Get all versions
   */
  getAllVersions(): DecisionStoreVersion[] {
    return [...this.versions];
  }

  /**
   * Load a specific version
   */
  loadVersion(version: string): this {
    const found = this.versions.find((v) => v.version === version);
    if (!found) {
      throw new Error(`Version ${version} not found`);
    }

    // Deep copy and set as current
    this.current = JSON.parse(JSON.stringify(found));
    return this;
  }

  /**
   * Reset to empty state
   */
  reset(): this {
    this.current = this.createEmptyVersion();
    this.versions = [this.current];
    this.methodEffectiveness.clear();
    return this;
  }

  /**
   * Validate decision record
   */
  private validateDecision(decision: DecisionRecord): void {
    const required = ["id", "timestamp", "component", "activity", "decision", "context", "reasoningMethod"];
    const missing = required.filter((field) => !(field in decision));

    if (missing.length > 0) {
      throw new Error(`MISSING_REQUIRED_FIELDS: ${missing.join(", ")}`);
    }

    // Validate context
    if (!decision.context.domain || typeof decision.context.complexity !== "number") {
      throw new Error("MISSING_REQUIRED_FIELDS: Invalid context");
    }

    // Validate domain is one of the valid values
    const validDomains = ["code", "creative", "reasoning", "analysis", "general"];
    if (!validDomains.includes(decision.context.domain)) {
      throw new Error("MISSING_REQUIRED_FIELDS: Invalid domain");
    }

    // Validate reasoning method
    if (!decision.reasoningMethod.name || !decision.reasoningMethod.category) {
      throw new Error("MISSING_REQUIRED_FIELDS: Invalid reasoningMethod");
    }

    // Validate confidence
    if (decision.confidence < 0 || decision.confidence > 1) {
      throw new Error("MISSING_REQUIRED_FIELDS: Invalid confidence (must be 0-1)");
    }
  }

  /**
   * Validate filter
   */
  private validateFilter(filter: DecisionFilter): boolean {
    // Basic validation
    if (filter.dateRange) {
      if (filter.dateRange.start >= filter.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if decision matches filter
   */
  private matchesFilter(decision: DecisionRecord, filter: DecisionFilter): boolean {
    if (filter.component && decision.component !== filter.component) {
      return false;
    }

    if (filter.activity && decision.activity !== filter.activity) {
      return false;
    }

    if (filter.reasoningMethod && decision.reasoningMethod.name !== filter.reasoningMethod) {
      return false;
    }

    if (filter.domain && decision.context.domain !== filter.domain) {
      return false;
    }

    if (filter.dateRange) {
      if (decision.timestamp < filter.dateRange.start || decision.timestamp > filter.dateRange.end) {
        return false;
      }
    }

    if (filter.hasOutcome !== undefined) {
      const hasOutcome = !!decision.outcome;
      if (filter.hasOutcome !== hasOutcome) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if decision record is valid
   */
  private isValidDecision(decision: DecisionRecord): boolean {
    try {
      return (
        typeof decision.id === "string" &&
        typeof decision.timestamp === "number" &&
        typeof decision.component === "string" &&
        typeof decision.activity === "string" &&
        typeof decision.decision === "string" &&
        decision.context !== undefined &&
        decision.reasoningMethod !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Update importance weights (EWC)
   */
  private updateImportanceWeights(decision: DecisionRecord, outcome: DecisionOutcome): void {
    // Simplified importance update based on outcome quality
    const learningRate = 0.1;
    const target = outcome.success ? 1 : 0;

    for (let i = 0; i < decision.importanceWeights.length; i++) {
      decision.importanceWeights[i] =
        (1 - learningRate) * decision.importanceWeights[i] + learningRate * target;
    }
  }

  /**
   * Extract context patterns
   */
  private extractContextPatterns(decision: DecisionRecord): Record<string, number> {
    return {
      domain: decision.context.domain === "code" ? 1 : 0.5,
      complexity: decision.context.complexity,
      constraints: decision.context.constraints.length,
    };
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(decision: DecisionRecord, outcome: DecisionOutcome): string {
    if (outcome.success) {
      return `Method ${decision.reasoningMethod.name} was effective for ${decision.context.domain} domain`;
    } else {
      return `Consider alternative methods for ${decision.context.domain} domain`;
    }
  }

  /**
   * Create Qdrant batch
   */
  private async createQdrantBatch(decisions: DecisionRecord[]): Promise<QdrantBatch> {
    const points: QdrantPoint[] = [];

    for (const decision of decisions) {
      try {
        // Generate simple embedding (in real implementation, use actual embedding model)
        const vector = this.generateEmbedding(decision);

        points.push({
          id: decision.id,
          vector,
          payload: {
            decisionId: decision.id,
            component: decision.component,
            activity: decision.activity,
            decision: decision.decision,
            domain: decision.context.domain,
            reasoningMethod: decision.reasoningMethod.name,
            timestamp: decision.timestamp,
            success: decision.outcome?.success,
            quality: decision.outcome?.quality,
          },
        });
      } catch (error) {
        console.error(`EMBEDDING_FAILED for decision ${decision.id}:`, error);
        // Use text-only fallback (zero vector)
        points.push({
          id: decision.id,
          vector: new Array(128).fill(0),
          payload: {
            decisionId: decision.id,
            component: decision.component,
            activity: decision.activity,
            decision: decision.decision,
            domain: decision.context.domain,
            reasoningMethod: decision.reasoningMethod.name,
            timestamp: decision.timestamp,
            success: decision.outcome?.success,
            quality: decision.outcome?.quality,
          },
        });
      }
    }

    return {
      collection: "decisions",
      points,
    };
  }

  /**
   * Generate embedding for decision
   */
  private generateEmbedding(decision: DecisionRecord): number[] {
    // Simplified embedding generation
    // In real implementation, use actual embedding model
    const embedding = new Array(128).fill(0);

    // Use decision ID to generate pseudo-random embedding
    const hash = this.hashString(decision.id);
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = ((hash >> (i % 32)) & 1) * 0.1;
    }

    return embedding;
  }

  /**
   * Hash string for embedding generation
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Calculate Fisher information (approximation)
   */
  private calculateFisherInformation(decisions: DecisionRecord[]): number[] {
    // Simplified Fisher information calculation
    const importance = new Array(10).fill(0);

    for (const decision of decisions) {
      for (let i = 0; i < Math.min(decision.importanceWeights.length, 10); i++) {
        importance[i] += Math.abs(decision.importanceWeights[i]);
      }
    }

    // Normalize
    const max = Math.max(...importance, 1);
    return importance.map((v) => v / max);
  }

  /**
   * Get old weight from snapshot
   */
  private getOldWeight(decisions: DecisionRecord[], decisionId: string, index: number): number | null {
    const decision = decisions.find((d) => d.id === decisionId);
    if (!decision || index >= decision.importanceWeights.length) {
      return null;
    }
    return decision.importanceWeights[index];
  }

  /**
   * Create empty version
   */
  private createEmptyVersion(): DecisionStoreVersion {
    return {
      version: this.generateVersionId(),
      timestamp: Date.now(),
      decisions: [],
      checksum: "",
      statistics: {
        totalDecisions: 0,
        decisionsWithOutcomes: 0,
        averageQuality: 0,
        successRate: 0,
        bestMethods: {},
      },
    };
  }

  /**
   * Create new version from current state
   */
  private createVersion(): DecisionStoreVersion {
    const decisions = JSON.parse(JSON.stringify(this.current.decisions));

    // Calculate statistics
    const decisionsWithOutcomes = decisions.filter((d: DecisionRecord) => d.outcome).length;
    const qualities = decisions
      .filter((d: DecisionRecord) => d.outcome?.quality !== undefined)
      .map((d: DecisionRecord) => d.outcome!.quality);
    const averageQuality = qualities.length > 0
      ? qualities.reduce((a: number, b: number) => a + b, 0) / qualities.length
      : 0;

    const successes = decisions.filter((d: DecisionRecord) => d.outcome?.success).length;
    const successRate = decisionsWithOutcomes > 0 ? successes / decisionsWithOutcomes : 0;

    // Calculate best methods
    const bestMethods: Record<string, number> = {};
    for (const [method, effectiveness] of this.methodEffectiveness) {
      bestMethods[method] = effectiveness;
    }

    return {
      version: this.generateVersionId(),
      timestamp: Date.now(),
      decisions,
      checksum: this.calculateChecksum(decisions),
      statistics: {
        totalDecisions: decisions.length,
        decisionsWithOutcomes,
        averageQuality,
        successRate,
        bestMethods,
      },
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
  private calculateChecksum(decisions: DecisionRecord[]): string {
    const data = JSON.stringify(decisions);
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
   * Create snapshot for EWC
   */
  createSnapshot(): DecisionSnapshot {
    return {
      version: this.current.version,
      timestamp: this.current.timestamp,
      decisions: JSON.parse(JSON.stringify(this.current.decisions)),
      checksum: this.current.checksum,
    };
  }
}
