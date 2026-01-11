/**
 * ContextAPIHandler - Decision Learning & ADR Display for Auto-Claude Integration
 *
 * Responsibilities:
 * - Fetch memories (ADRs and learning history) from DecisionLearningStore
 * - Search memories by query (component, activity, domain, reasoning method)
 * - Get specific ADRs by decision ID
 * - Event emissions for UI updates
 *
 * Integration:
 * - DecisionLearningStore: Source of decision records and learning data
 * - Follows SettingsAPIHandler and TaskAPIHandler patterns
 * - EventEmitter for real-time UI updates
 */

import { EventEmitter } from "events";
import type {
  DecisionLearningStore,
  DecisionRecord,
  DecisionFilter,
  DecisionStoreVersion,
  LearningUpdate,
} from "@/decision/DecisionLearningStore.js";

/**
 * Configuration for ContextAPIHandler
 */
export interface ContextAPIHandlerConfig {
  /** DecisionLearningStore instance for memory access */
  decisionStore: DecisionLearningStore;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * Memory item for UI display
 * Simplified view of DecisionRecord for frontend consumption
 */
export interface MemoryItem {
  /** Decision ID */
  id: string;
  /** Timestamp of decision */
  timestamp: number;
  /** Component that made the decision */
  component: string;
  /** Activity context */
  activity: string;
  /** The decision made */
  decision: string;
  /** Domain (code, creative, reasoning, etc.) */
  domain: string;
  /** Reasoning method used */
  reasoningMethod: string;
  /** Reasoning method category */
  methodCategory: string;
  /** Decision confidence (0-1) */
  confidence: number;
  /** Whether outcome is available */
  hasOutcome: boolean;
  /** Outcome success status (if available) */
  success?: boolean;
  /** Outcome quality score (if available) */
  quality?: number;
  /** Complexity of decision context */
  complexity: number;
  /** Constraints considered */
  constraints: string[];
}

/**
 * Architecture Decision Record (ADR) for UI display
 * Full decision record with outcome details
 */
export interface ADRDisplay {
  /** Decision record */
  decision: MemoryItem;
  /** Full context details */
  context: {
    domain: string;
    complexity: number;
    constraints: string[];
    stakeholders: string[];
  };
  /** Outcome details (if available) */
  outcome?: {
    success: boolean;
    quality: number;
    latency?: number;
    cost?: number;
    errors: string[];
    userFeedback?: string;
  };
  /** Learning insights (if outcome available) */
  learning?: {
    methodEffectiveness: number;
    contextPatterns: Record<string, number>;
    recommendation: string;
  };
}

/**
 * Search query for memories
 */
export interface MemorySearchQuery {
  /** Filter by component */
  component?: string;
  /** Filter by activity */
  activity?: string;
  /** Filter by domain */
  domain?: string;
  /** Filter by reasoning method */
  reasoningMethod?: string;
  /** Filter by date range */
  dateRange?: {
    start: number;
    end: number;
  };
  /** Filter by outcome availability */
  hasOutcome?: boolean;
  /** Limit number of results */
  limit?: number;
}

/**
 * Store statistics for UI display
 */
export interface StoreStatistics {
  /** Total decisions stored */
  totalDecisions: number;
  /** Decisions with outcomes */
  decisionsWithOutcomes: number;
  /** Average quality score */
  averageQuality: number;
  /** Success rate */
  successRate: number;
  /** Best performing methods */
  bestMethods: Record<string, number>;
  /** Current store version */
  version: string;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * ContextAPIHandler - Provides access to decision learning data for UI
 *
 * @example
 * ```ts
 * const handler = new ContextAPIHandler({
 *   decisionStore: new DecisionLearningStore(),
 * });
 *
 * // Get all memories
 * const memories = await handler.getMemories();
 *
 * // Search memories
 * const results = await handler.searchMemories({
 *   component: "plan",
 *   hasOutcome: true,
 * });
 *
 * // Get specific ADR
 * const adr = await handler.getADR("decision-123");
 *
 * // Get statistics
 * const stats = await handler.getStatistics();
 *
 * // Listen for updates
 * handler.on("memories-updated", (memories) => {
 *   console.log("Memories changed");
 * });
 * ```
 */
export class ContextAPIHandler extends EventEmitter {
  private readonly config: ContextAPIHandlerConfig;
  private readonly decisionStore: DecisionLearningStore;

  constructor(config: ContextAPIHandlerConfig) {
    super();
    this.config = config;
    this.decisionStore = config.decisionStore;

    if (this.config.debug) {
      console.log("[ContextAPIHandler] Initialized");
    }
  }

  /**
   * Get all memories from decision store
   *
   * Process:
   * 1. Query all decisions from store
   * 2. Convert to MemoryItem format
   * 3. Sort by timestamp (newest first)
   *
   * @returns Array of memory items
   */
  async getMemories(): Promise<MemoryItem[]> {
    try {
      const decisions = this.decisionStore.getDecisions();
      const memories = this.convertToMemoryItems(decisions);

      // Sort by timestamp descending (newest first)
      memories.sort((a, b) => b.timestamp - a.timestamp);

      if (this.config.debug) {
        console.log(`[ContextAPIHandler] Retrieved ${memories.length} memories`);
      }

      return memories;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ContextAPIHandler] Error getting memories: ${errorMsg}`);
      throw new Error(`Failed to retrieve memories: ${errorMsg}`);
    }
  }

  /**
   * Search memories with query filters
   *
   * Process:
   * 1. Convert search query to DecisionFilter
   * 2. Query decisions from store with filter
   * 3. Convert to MemoryItem format
   * 4. Apply limit if specified
   * 5. Sort by timestamp (newest first)
   *
   * @param query - Search query parameters
   * @returns Array of matching memory items
   */
  async searchMemories(query: MemorySearchQuery): Promise<MemoryItem[]> {
    try {
      // Convert to DecisionFilter
      const filter: DecisionFilter = {
        component: query.component,
        activity: query.activity,
        domain: query.domain as "code" | "creative" | "reasoning" | "analysis" | "general" | undefined,
        reasoningMethod: query.reasoningMethod,
        dateRange: query.dateRange,
        hasOutcome: query.hasOutcome,
      };

      // Query with filter
      const decisions = this.decisionStore.getDecisions(filter);
      let memories = this.convertToMemoryItems(decisions);

      // Sort by timestamp descending (newest first)
      memories.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit if specified
      if (query.limit && query.limit > 0) {
        memories = memories.slice(0, query.limit);
      }

      if (this.config.debug) {
        console.log(`[ContextAPIHandler] Search found ${memories.length} memories`);
      }

      return memories;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ContextAPIHandler] Error searching memories: ${errorMsg}`);
      throw new Error(`Failed to search memories: ${errorMsg}`);
    }
  }

  /**
   * Get specific ADR by decision ID
   *
   * Process:
   * 1. Query decision by ID from store
   * 2. Convert to ADRDisplay format with full details
   * 3. Include outcome and learning if available
   *
   * @param decisionId - Decision ID to retrieve
   * @returns ADR display object or null if not found
   */
  async getADR(decisionId: string): Promise<ADRDisplay | null> {
    try {
      // Query all decisions and find by ID
      const decisions = this.decisionStore.getDecisions();
      const decision = decisions.find((d) => d.id === decisionId);

      if (!decision) {
        if (this.config.debug) {
          console.log(`[ContextAPIHandler] ADR not found: ${decisionId}`);
        }
        return null;
      }

      // Convert to ADRDisplay format
      const adr = this.convertToADR(decision);

      if (this.config.debug) {
        console.log(`[ContextAPIHandler] Retrieved ADR: ${decisionId}`);
      }

      return adr;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ContextAPIHandler] Error getting ADR: ${errorMsg}`);
      throw new Error(`Failed to retrieve ADR: ${errorMsg}`);
    }
  }

  /**
   * Get store statistics
   *
   * Process:
   * 1. Get current store state
   * 2. Extract statistics
   * 3. Format for UI display
   *
   * @returns Store statistics
   */
  async getStatistics(): Promise<StoreStatistics> {
    try {
      const state: DecisionStoreVersion = this.decisionStore.getState();

      const stats: StoreStatistics = {
        totalDecisions: state.statistics.totalDecisions,
        decisionsWithOutcomes: state.statistics.decisionsWithOutcomes,
        averageQuality: state.statistics.averageQuality,
        successRate: state.statistics.successRate,
        bestMethods: state.statistics.bestMethods,
        version: state.version,
        lastUpdated: state.timestamp,
      };

      if (this.config.debug) {
        console.log(`[ContextAPIHandler] Retrieved statistics: ${stats.totalDecisions} decisions`);
      }

      return stats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ContextAPIHandler] Error getting statistics: ${errorMsg}`);
      throw new Error(`Failed to retrieve statistics: ${errorMsg}`);
    }
  }

  /**
   * Notify UI of memory updates
   *
   * Called externally when decisions are added/updated
   * Emits memories-updated event for UI refresh
   */
  notifyMemoriesUpdated(): void {
    this.emit("memories-updated");

    if (this.config.debug) {
      console.log("[ContextAPIHandler] Emitted memories-updated event");
    }
  }

  /**
   * Notify UI of new learning update
   *
   * Called externally when a decision outcome is processed
   * Emits learning-updated event for UI display
   *
   * @param update - Learning update data
   */
  notifyLearningUpdate(update: LearningUpdate): void {
    this.emit("learning-updated", update);

    if (this.config.debug) {
      console.log(`[ContextAPIHandler] Emitted learning-updated event for ${update.decisionId}`);
    }
  }

  /**
   * Convert DecisionRecords to MemoryItems
   *
   * @param decisions - Decision records
   * @returns Memory items
   */
  private convertToMemoryItems(decisions: DecisionRecord[]): MemoryItem[] {
    return decisions.map((decision) => ({
      id: decision.id,
      timestamp: decision.timestamp,
      component: decision.component,
      activity: decision.activity,
      decision: decision.decision,
      domain: decision.context.domain,
      reasoningMethod: decision.reasoningMethod.name,
      methodCategory: decision.reasoningMethod.category,
      confidence: decision.confidence,
      hasOutcome: !!decision.outcome,
      success: decision.outcome?.success,
      quality: decision.outcome?.quality,
      complexity: decision.context.complexity,
      constraints: decision.context.constraints,
    }));
  }

  /**
   * Convert DecisionRecord to ADRDisplay
   *
   * @param decision - Decision record
   * @returns ADR display object
   */
  private convertToADR(decision: DecisionRecord): ADRDisplay {
    const memoryItem = this.convertToMemoryItems([decision])[0];

    const adr: ADRDisplay = {
      decision: memoryItem,
      context: {
        domain: decision.context.domain,
        complexity: decision.context.complexity,
        constraints: decision.context.constraints,
        stakeholders: decision.context.stakeholders,
      },
    };

    // Add outcome if available
    if (decision.outcome) {
      adr.outcome = {
        success: decision.outcome.success,
        quality: decision.outcome.quality,
        latency: decision.outcome.latency,
        cost: decision.outcome.cost,
        errors: decision.outcome.errors,
        userFeedback: decision.outcome.userFeedback,
      };
    }

    // Add learning insights if outcome available
    // Note: Learning data is computed on-demand from store state
    // This is a simplified version - full implementation would query store
    if (decision.outcome) {
      adr.learning = {
        methodEffectiveness: decision.outcome.success ? 0.8 : 0.2,
        contextPatterns: {
          domain: decision.context.domain === "code" ? 1 : 0.5,
          complexity: decision.context.complexity,
          constraints: decision.context.constraints.length,
        },
        recommendation: decision.outcome.success
          ? `Method ${decision.reasoningMethod.name} was effective for ${decision.context.domain} domain`
          : `Consider alternative methods for ${decision.context.domain} domain`,
      };
    }

    return adr;
  }
}
