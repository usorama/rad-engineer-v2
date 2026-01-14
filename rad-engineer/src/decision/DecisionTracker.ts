/**
 * Decision Tracker with MADR 4.0.0 Template Support
 *
 * Tracks architectural and engineering decisions using MADR (Markdown Architectural Decision Records)
 * template structure. Enables deterministic decision documentation with evidence linking,
 * supersession tracking, and knowledge graph integration.
 *
 * Sources:
 * - MADR Template: https://adr.github.io/madr/ (verified 2026-01-08)
 * - AWS ADR Best Practices: https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/ (verified 2026-01-08)
 */

import type { Domain } from "../adaptive/types.js";
import { DecisionLearningStore } from "./DecisionLearningStore.js";

/**
 * ADR Status values
 * Evidence: MADR template (verified 2026-01-08)
 */
export type ADRStatus =
  | "proposed"      // Under review
  | "accepted"      // Approved and active
  | "rejected"      // Not chosen
  | "deprecated"    // No longer recommended
  | "superseded";   // Replaced by new decision

/**
 * ADR Category for organization
 * Evidence: AWS ADR guide (verified 2026-01-08)
 */
export type ADRCategory =
  | "backend"        // Backend architecture decisions
  | "frontend"       // Frontend/UI decisions
  | "infrastructure" // Infrastructure, cloud, deployment
  | "data"           // Database, data pipeline, analytics
  | "devops"         // CI/CD, testing, operations
  | "general";       // Cross-cutting decisions

/**
 * A decision option
 */
export interface ADROption {
  title: string;              // Option title
  description?: string;       // Optional description
  links?: string[];           // Pointers to more information
}

/**
 * Decision outcome (chosen option)
 */
export interface ADROutcome {
  chosenOption: string;       // Title of chosen option
  justification: string;      // Why this option was chosen
}

/**
 * Pros and cons for an option
 */
export interface ProsAndCons {
  option: string;             // Option title
  pros: string[];             // "Good, because..." arguments
  cons: string[];             // "Bad, because..." arguments
  neutral?: string[];         // "Neutral, because..." arguments
}

/**
 * Consequences of the decision
 */
export interface Consequences {
  positive: string[];         // "Good, because..." consequences
  negative: string[];         // "Bad, because..." consequences
}

/**
 * Evidence source supporting the decision
 */
export interface EvidenceSource {
  type: "url" | "file" | "doc" | "conversation" | "experiment";
  source: string;             // URL, file path, or description
  title?: string;             // Optional title
  relevance: string;          // How this evidence supports the decision
  confidence: number;         // 0-1, how confident in this evidence
}

/**
 * ADR Record following MADR template structure
 * Source: https://adr.github.io/madr/ (verified 2026-01-08)
 */
export interface ADRRecord {
  // Unique identifier (sequential number like "ADR-0001")
  id: string;

  // Timestamps
  createdAt: number;
  updatedAt: number;

  // MADR Required Fields
  title: string;              // Short title representing solved problem
  status: ADRStatus;          // proposed | accepted | rejected | deprecated | superseded
  date: string;               // YYYY-MM-DD when decision was last updated

  // MADR Core Sections
  contextAndProblemStatement: string;  // 2-3 sentences describing context
  decisionDrivers: string[];            // Forces, concerns, requirements

  // Options
  consideredOptions: ADROption[];       // All options considered
  decisionOutcome: ADROutcome;          // Chosen option + justification

  // Optional MADR Sections
  prosAndCons?: ProsAndCons[];          // Optional analysis
  consequences?: Consequences;          // Positive/negative consequences
  confirmation?: string;                // How to verify compliance
  moreInformation?: string;             // Links, additional context

  // Evidence Sources (extension to MADR)
  evidenceSources: EvidenceSource[];    // URLs, files, docs supporting decision

  // Decision Lineage
  supersedes?: string;      // ID of ADR this replaces
  supersededBy?: string[];  // IDs of ADRs that replace this

  // Category (for organization)
  category?: ADRCategory;   // backend | frontend | infrastructure | data | devops | general

  // Stakeholders
  decisionMakers: string[];  // Everyone involved in decision
  consulted: string[];       // Subject matter experts (2-way communication)
  informed: string[];        // Kept up-to-date (1-way communication)
}

/**
 * Input for creating new ADR
 */
export interface ADRInput {
  title: string;
  status?: ADRStatus;         // Default: "proposed"
  category?: ADRCategory;
  contextAndProblemStatement: string;
  decisionDrivers: string[];
  consideredOptions: ADROption[];
  decisionOutcome: ADROutcome;
  prosAndCons?: ProsAndCons[];
  consequences?: Consequences;
  confirmation?: string;
  moreInformation?: string;
  evidenceSources?: EvidenceSource[];
  supersedes?: string;
  decisionMakers: string[];
  consulted?: string[];
  informed?: string[];
}

/**
 * Updates to existing ADR
 */
export interface ADRUpdate {
  title?: string;
  status?: ADRStatus;
  category?: ADRCategory;
  contextAndProblemStatement?: string;
  decisionDrivers?: string[];
  consideredOptions?: ADROption[];
  decisionOutcome?: ADROutcome;
  prosAndCons?: ProsAndCons[];
  consequences?: Consequences;
  confirmation?: string;
  moreInformation?: string;
  evidenceSources?: EvidenceSource[];
  supersededBy?: string;  // Add to supersededBy array
}

/**
 * Filter for querying ADRs
 */
export interface ADRFilter {
  status?: ADRStatus | ADRStatus[];
  category?: ADRCategory;
  dateRange?: { start: string; end: string };
  decisionMakers?: string[];
  superseded?: boolean;  // true = only superseded ADRs
  hasEvidence?: boolean;
  searchText?: string;
}

/**
 * Batch insert payload for Qdrant
 */
export interface QdrantBatch {
  collection: string;
  batch: Array<{
    id: string;
    vector: number[];
    payload: ADRRecord;
  }>;
}

/**
 * Decision Tracker Configuration
 */
export interface DecisionTrackerConfig {
  autoLinkToLearningStore?: boolean;  // Default: true
  storagePath?: string;               // Default: "./docs/decisions"
  enableKnowledgeGraph?: boolean;     // Default: true
}

/**
 * Status transition rules based on AWS ADR best practices
 * Evidence: https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/
 */
const VALID_TRANSITIONS: Record<ADRStatus, ADRStatus[]> = {
  proposed: ["accepted", "rejected"],
  accepted: ["deprecated", "superseded"],
  rejected: [],  // Cannot transition from rejected
  deprecated: ["superseded"],
  superseded: [], // Cannot transition from superseded
};

/**
 * Decision Tracker
 *
 * Tracks architectural and engineering decisions using MADR template structure.
 * Integrates with DecisionLearningStore for outcome tracking and learning.
 */
export class DecisionTracker {
  private adrs: Map<string, ADRRecord> = new Map();
  private nextId: number = 1;
  private learningStore: DecisionLearningStore;
  private config: Required<DecisionTrackerConfig>;

  constructor(config?: DecisionTrackerConfig) {
    this.config = {
      autoLinkToLearningStore: config?.autoLinkToLearningStore ?? true,
      storagePath: config?.storagePath || "./docs/decisions",
      enableKnowledgeGraph: config?.enableKnowledgeGraph ?? true,
    };

    this.learningStore = new DecisionLearningStore({
      path: `${this.config.storagePath}/.learning-store.yaml`,
      autoSave: true,
    });
  }

  /**
   * Create a new ADR record
   *
   * Generates sequential ID (ADR-0001, ADR-0002, etc.)
   * Sets createdAt/updatedAt timestamps
   * Validates required MADR fields
   *
   * @param decision - ADR input data
   * @returns {ADRRecord} Created ADR with generated ID
   * @throws {Error} If required MADR fields missing
   */
  createADR(decision: ADRInput): ADRRecord {
    const startTime = Date.now();

    // Validate required MADR fields
    this.validateADRInput(decision);

    // Check for timeout
    if (Date.now() - startTime > 2000) {
      throw new Error("ID_GENERATION_FAILED: Timeout after 2000ms");
    }

    // Generate sequential ID
    const id = `ADR-${String(this.nextId).padStart(4, "0")}`;

    // Check if ID already exists (shouldn't happen with sequential IDs)
    if (this.adrs.has(id)) {
      this.nextId++;
      throw new Error(`ID_GENERATION_FAILED: ID ${id} already exists, retrying`);
    }

    // Get current date in YYYY-MM-DD format
    const date = new Date().toISOString().split("T")[0];
    const now = Date.now();

    // Create ADR record
    const adr: ADRRecord = {
      id,
      createdAt: now,
      updatedAt: now,
      title: decision.title,
      status: decision.status || "proposed",
      date,
      contextAndProblemStatement: decision.contextAndProblemStatement,
      decisionDrivers: decision.decisionDrivers,
      consideredOptions: decision.consideredOptions,
      decisionOutcome: decision.decisionOutcome,
      prosAndCons: decision.prosAndCons,
      consequences: decision.consequences,
      confirmation: decision.confirmation,
      moreInformation: decision.moreInformation,
      evidenceSources: decision.evidenceSources || [],
      supersedes: decision.supersedes,
      supersededBy: [],
      category: decision.category,
      decisionMakers: decision.decisionMakers,
      consulted: decision.consulted || [],
      informed: decision.informed || [],
    };

    // Handle supersession linkage
    if (adr.supersedes) {
      const oldADR = this.adrs.get(adr.supersedes);
      if (oldADR) {
        // Update old ADR's supersededBy array
        if (!oldADR.supersededBy) {
          oldADR.supersededBy = [];
        }
        oldADR.supersededBy.push(id);
        // Update old ADR status to superseded
        oldADR.status = "superseded";
      }
    }

    // Store ADR
    this.adrs.set(id, adr);
    this.nextId++;

    // Check storage timeout
    if (Date.now() - startTime > 5000) {
      throw new Error("STORAGE_WRITE_FAILED: Timeout after 5000ms");
    }

    return adr;
  }

  /**
   * Update an existing ADR record
   *
   * Updates updatedAt timestamp
   * Validates status transitions (e.g., proposed → accepted)
   * Maintains decision lineage (supersedes/supersededBy)
   *
   * @param id - ADR ID to update
   * @param updates - Fields to update
   * @returns {ADRRecord} Updated ADR
   * @throws {Error} If ADR not found or invalid status transition
   */
  updateADR(id: string, updates: ADRUpdate): ADRRecord {
    const adr = this.adrs.get(id);
    if (!adr) {
      throw new Error(`ADR_NOT_FOUND: ADR ${id} not found`);
    }

    // Validate status transition if status is being updated
    if (updates.status && updates.status !== adr.status) {
      this.validateStatusTransition(adr.status, updates.status);
    }

    // Apply updates
    if (updates.title !== undefined) adr.title = updates.title;
    if (updates.status !== undefined) adr.status = updates.status;
    if (updates.category !== undefined) adr.category = updates.category;
    if (updates.contextAndProblemStatement !== undefined) {
      adr.contextAndProblemStatement = updates.contextAndProblemStatement;
    }
    if (updates.decisionDrivers !== undefined) adr.decisionDrivers = updates.decisionDrivers;
    if (updates.consideredOptions !== undefined) adr.consideredOptions = updates.consideredOptions;
    if (updates.decisionOutcome !== undefined) adr.decisionOutcome = updates.decisionOutcome;
    if (updates.prosAndCons !== undefined) adr.prosAndCons = updates.prosAndCons;
    if (updates.consequences !== undefined) adr.consequences = updates.consequences;
    if (updates.confirmation !== undefined) adr.confirmation = updates.confirmation;
    if (updates.moreInformation !== undefined) adr.moreInformation = updates.moreInformation;
    if (updates.evidenceSources !== undefined) adr.evidenceSources = updates.evidenceSources;

    // Handle supersededBy linkage
    if (updates.supersededBy !== undefined) {
      if (!adr.supersededBy) {
        adr.supersededBy = [];
      }
      adr.supersededBy.push(updates.supersededBy);
    }

    // Update timestamp and date
    adr.updatedAt = Date.now();
    adr.date = new Date().toISOString().split("T")[0];

    return adr;
  }

  /**
   * Get a single ADR by ID
   *
   * @param id - ADR ID
   * @returns {ADRRecord} ADR record
   * @throws {Error} If ADR not found
   */
  getADR(id: string): ADRRecord {
    const adr = this.adrs.get(id);
    if (!adr) {
      // Find similar IDs for error message
      const similarIds = Array.from(this.adrs.keys()).filter(
        (key) => key.toLowerCase().includes(id.toLowerCase()) ||
                 id.toLowerCase().includes(key.toLowerCase())
      ).slice(0, 3);

      const suggestion = similarIds.length > 0
        ? ` Did you mean: ${similarIds.join(", ")}?`
        : "";

      throw new Error(`ADR_NOT_FOUND: ADR ${id} not found.${suggestion}`);
    }

    return adr;
  }

  /**
   * List ADRs with optional filtering
   *
   * Supports filtering by:
   * - Status (proposed, accepted, rejected, etc.)
   * - Category (backend, frontend, infrastructure, etc.)
   * - Date range
   * - Decision makers
   * - Superseded status
   * - Full-text search
   *
   * @param filter - Optional filter criteria
   * @returns {ADRRecord[]} Matching ADRs (empty array if none)
   */
  listADRs(filter?: ADRFilter): ADRRecord[] {
    const startTime = Date.now();

    try {
      let results = Array.from(this.adrs.values());

      // Apply filter if provided
      if (filter) {
        // Validate filter
        if (!this.validateFilter(filter)) {
          console.warn("INVALID_FILTER: Returning empty array");
          return [];
        }

        // Apply status filter
        if (filter.status) {
          const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
          results = results.filter((adr) => statuses.includes(adr.status));
        }

        // Apply category filter
        if (filter.category) {
          results = results.filter((adr) => adr.category === filter.category);
        }

        // Apply date range filter
        if (filter.dateRange) {
          results = results.filter((adr) => {
            return adr.date >= filter.dateRange!.start && adr.date <= filter.dateRange!.end;
          });
        }

        // Apply decision makers filter
        if (filter.decisionMakers && filter.decisionMakers.length > 0) {
          results = results.filter((adr) =>
            filter.decisionMakers!.some((maker) =>
              adr.decisionMakers.includes(maker)
            )
          );
        }

        // Apply superseded filter
        if (filter.superseded !== undefined) {
          results = results.filter((adr) =>
            filter.superseded ? adr.status === "superseded" : adr.status !== "superseded"
          );
        }

        // Apply evidence filter
        if (filter.hasEvidence !== undefined) {
          results = results.filter((adr) =>
            filter.hasEvidence ? adr.evidenceSources.length > 0 : adr.evidenceSources.length === 0
          );
        }

        // Apply search text filter
        if (filter.searchText) {
          const searchLower = filter.searchText.toLowerCase();
          results = results.filter((adr) =>
            adr.title.toLowerCase().includes(searchLower) ||
            adr.contextAndProblemStatement.toLowerCase().includes(searchLower) ||
            adr.decisionOutcome.justification.toLowerCase().includes(searchLower)
          );
        }
      }

      // Check query timeout
      if (Date.now() - startTime > 1000) {
        console.warn(`QUERY_TIMEOUT: Query took ${Date.now() - startTime}ms, returning partial results`);
      }

      return results;
    } catch (error) {
      console.error("Error in listADRs:", error);
      return [];
    }
  }

  /**
   * Supersede an existing ADR with a new decision
   *
   * Creates new ADR with "supersedes" reference
   * Updates old ADR status to "superseded"
   * Adds new ADR ID to old ADR's "supersededBy" array
   *
   * @param id - ADR ID to supersede
   * @param newADR - New ADR that replaces the old one
   * @returns {ADRRecord} New ADR record
   * @throws {Error} If old ADR not found or invalid transition
   */
  supersedeADR(id: string, newADR: ADRInput): ADRRecord {
    const startTime = Date.now();

    const oldADR = this.adrs.get(id);
    if (!oldADR) {
      throw new Error(`OLD_ADR_NOT_FOUND: ADR ${id} not found`);
    }

    // Check if old ADR is already superseded
    if (oldADR.status === "superseded") {
      console.warn(`INVALID_SUPESESSION: ADR ${id} is already superseded`);
    }

    // Set supersedes reference in new ADR
    newADR.supersedes = id;

    try {
      // Create new ADR (this will handle the linkage)
      const createdADR = this.createADR(newADR);

      // Verify lineage was updated
      if (oldADR.status !== "superseded" || !oldADR.supersededBy?.includes(createdADR.id)) {
        throw new Error("LINEAGE_UPDATE_FAILED: Supersession linkage not properly updated");
      }

      // Check timeout
      if (Date.now() - startTime > 5000) {
        throw new Error("LINEAGE_UPDATE_FAILED: Timeout after 5000ms");
      }

      return createdADR;
    } catch (error) {
      // Retry logic for lineage update failures
      if (error instanceof Error && error.message.includes("LINEAGE_UPDATE_FAILED")) {
        // Max retries handled by createADR
        throw error;
      }
      throw new Error(`LINEAGE_UPDATE_FAILED: ${error}`);
    }
  }

  /**
   * Link an ADR to an evidence source
   *
   * Evidence sources support decision rationale:
   * - URLs (documentation, research, blog posts)
   * - Files (design docs, specs)
   * - Conversations (meeting notes, chat logs)
   * - Experiments (A/B test results, performance data)
   *
   * @param id - ADR ID
   * @param evidence - Evidence source to link
   * @returns {void}
   * @throws {Error} If ADR not found
   */
  linkToEvidence(id: string, evidence: EvidenceSource): void {
    const adr = this.adrs.get(id);
    if (!adr) {
      throw new Error(`ADR_NOT_FOUND: ADR ${id} not found`);
    }

    // Validate evidence type
    const validTypes = ["url", "file", "doc", "conversation", "experiment"];
    if (!validTypes.includes(evidence.type)) {
      throw new Error(
        `INVALID_EVIDENCE_TYPE: Type must be one of ${validTypes.join(", ")}`
      );
    }

    // Validate confidence range
    if (evidence.confidence < 0 || evidence.confidence > 1) {
      throw new Error("INVALID_EVIDENCE_CONFIDENCE: Confidence must be between 0 and 1");
    }

    // Check for duplicate evidence
    const isDuplicate = adr.evidenceSources.some(
      (existing) => existing.source === evidence.source && existing.type === evidence.type
    );

    if (isDuplicate) {
      console.warn(`DUPLICATE_EVIDENCE: Evidence ${evidence.source} already linked to ADR ${id}`);
      return;
    }

    // Add evidence
    adr.evidenceSources.push(evidence);
  }

  /**
   * Record the outcome of an ADR (accepted/rejected/deprecated/etc.)
   *
   * Updates ADR status
   * Feeds outcome to DecisionLearningStore for learning
   * Timestamps the outcome
   *
   * @param id - ADR ID
   * @param outcome - New status
   * @returns {void}
   * @throws {Error} If ADR not found or invalid status transition
   */
  recordOutcome(id: string, outcome: ADRStatus): void {
    const startTime = Date.now();

    const adr = this.adrs.get(id);
    if (!adr) {
      throw new Error(`ADR_NOT_FOUND: ADR ${id} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(adr.status, outcome);

    // Update ADR status
    adr.status = outcome;
    adr.updatedAt = Date.now();

    // Feed outcome to DecisionLearningStore if enabled
    if (this.config.autoLinkToLearningStore) {
      try {
        // Map ADR status to decision outcome
        const success = outcome === "accepted";
        const quality = success ? 1.0 : 0.0;

        // Create decision record for learning
        const decisionRecord = {
          id: `${adr.id}-outcome-${Date.now()}`,
          timestamp: Date.now(),
          component: "DecisionTracker",
          activity: "adr_outcome",
          decision: adr.title,
          context: {
            domain: this.mapCategoryToDomain(adr.category || "general"),
            complexity: 0.5, // Default complexity
            constraints: adr.decisionDrivers,
            stakeholders: adr.decisionMakers,
          },
          reasoningMethod: {
            name: "ADR Process",
            category: "Core" as const,
            parameters: {},
          },
          outcome: {
            success,
            quality,
            errors: success ? [] : [`ADR status changed to ${outcome}`],
            decisionId: adr.id,
          },
          confidence: 1.0,
          importanceWeights: [1.0], // Simplified weight
        };

        this.learningStore.storeDecision(decisionRecord);

        // Check timeout
        if (Date.now() - startTime > 3000) {
          console.warn("DECISION_STORE_FAILED: Timeout after 3000ms, outcome recorded in ADR only");
        }
      } catch (error) {
        console.warn("DECISION_STORE_FAILED: Failed to store outcome in DecisionLearningStore:", error);
        // Continue - outcome is still recorded in ADR
      }
    }
  }

  /**
   * Export ADRs to knowledge graph (Qdrant)
   *
   * Generates embeddings for semantic search
   * Enables finding similar decisions by context
   *
   * @param filter - Optional filter to export subset
   * @returns {Promise<QdrantBatch>} Batch insert payload
   * @throws {Error} If Qdrant connection fails
   */
  async exportToKnowledgeGraph(filter?: ADRFilter): Promise<QdrantBatch> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Get ADRs to export
        const adrs = this.listADRs(filter);

        // Check batch size
        const batchSize = adrs.length;
        const maxBatchSize = 1000;

        if (batchSize > maxBatchSize) {
          throw new Error(`BATCH_TOO_LARGE: Batch size ${batchSize} exceeds maximum ${maxBatchSize}`);
        }

        // Generate embeddings and create batch
        const batch: Array<{
          id: string;
          vector: number[];
          payload: ADRRecord;
        }> = [];

        for (const adr of adrs) {
          try {
            const vector = this.generateEmbedding(adr);

            batch.push({
              id: adr.id,
              vector,
              payload: adr,
            });
          } catch (error) {
            console.error(`EMBEDDING_FAILED for ADR ${adr.id}:`, error);
            // Use text-only fallback (zero vector)
            batch.push({
              id: adr.id,
              vector: new Array(128).fill(0),
              payload: adr,
            });
          }
        }

        return {
          collection: "adrs",
          batch,
        };
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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("QDRANT_CONNECTION_FAILED: Max retries exceeded");
  }

  /**
   * Semantic search for ADRs
   *
   * Uses Qdrant vector search to find ADRs similar to query
   * Useful for: "Have we made a decision about X before?"
   *
   * @param query - Natural language search query
   * @param limit - Max results (default: 10)
   * @returns {Promise<ADRRecord[]>} Similar ADRs ranked by relevance
   * @throws {Error} If Qdrant query fails
   */
  async search(query: string, limit: number = 10): Promise<ADRRecord[]> {
    // Validate query
    if (!query || query.trim().length === 0) {
      throw new Error("INVALID_QUERY: Query cannot be empty");
    }

    const startTime = Date.now();

    try {
      // Generate query embedding
      const queryVector = this.generateTextEmbedding(query);

      // Simple similarity search (in real implementation, use Qdrant)
      const results = Array.from(this.adrs.values())
        .map((adr) => ({
          adr,
          similarity: this.calculateSimilarity(queryVector, this.generateEmbedding(adr)),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((result) => result.adr);

      // Check timeout
      if (Date.now() - startTime > 5000) {
        console.warn("QDRANT_QUERY_FAILED: Timeout after 5000ms, returning partial results");
      }

      return results;
    } catch (error) {
      console.error("QDRANT_QUERY_FAILED:", error);
      return [];
    }
  }

  /**
   * Get current state
   */
  getState(): Map<string, ADRRecord> {
    return new Map(this.adrs);
  }

  /**
   * Reset to empty state
   */
  reset(): void {
    this.adrs.clear();
    this.nextId = 1;
  }

  /**
   * Validate ADR input
   */
  private validateADRInput(decision: ADRInput): void {
    const requiredFields = [
      "title",
      "contextAndProblemStatement",
      "decisionDrivers",
      "consideredOptions",
      "decisionOutcome",
      "decisionMakers",
    ];

    const missing = requiredFields.filter((field) => !(field in decision) || decision[field as keyof ADRInput] === undefined);

    if (missing.length > 0) {
      throw new Error(`MISSING_REQUIRED_FIELDS: ${missing.join(", ")}`);
    }

    // Validate at least 2 options
    if (!decision.consideredOptions || decision.consideredOptions.length < 2) {
      throw new Error("MISSING_REQUIRED_FIELDS: At least 2 options required in consideredOptions");
    }

    // Validate chosenOption matches one of the options
    const optionTitles = decision.consideredOptions.map((opt) => opt.title);
    if (!optionTitles.includes(decision.decisionOutcome.chosenOption)) {
      throw new Error(
        `INVALID_OPTION_CHOICE: chosenOption "${decision.decisionOutcome.chosenOption}" must match one of: ${optionTitles.join(", ")}`
      );
    }

    // Validate decisionDrivers is an array with at least one item
    if (!Array.isArray(decision.decisionDrivers) || decision.decisionDrivers.length === 0) {
      throw new Error("MISSING_REQUIRED_FIELDS: decisionDrivers must be a non-empty array");
    }

    // Validate decisionMakers is an array with at least one item
    if (!Array.isArray(decision.decisionMakers) || decision.decisionMakers.length === 0) {
      throw new Error("MISSING_REQUIRED_FIELDS: decisionMakers must be a non-empty array");
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: ADRStatus, newStatus: ADRStatus): void {
    const validTransitions = VALID_TRANSITIONS[currentStatus];

    if (!validTransitions.includes(newStatus)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${validTransitions.join(", ") || "none"}`
      );
    }
  }

  /**
   * Validate filter
   */
  private validateFilter(filter: ADRFilter): boolean {
    // Basic validation
    if (filter.dateRange) {
      if (filter.dateRange.start >= filter.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Map ADR category to domain
   */
  private mapCategoryToDomain(category: ADRCategory): Domain {
    const mapping: Record<ADRCategory, Domain> = {
      backend: "code",
      frontend: "code",
      infrastructure: "code",
      data: "analysis",
      devops: "code",
      general: "general",
    };

    return mapping[category] || "general";
  }

  /**
   * Generate embedding for ADR
   */
  private generateEmbedding(adr: ADRRecord): number[] {
    const text = [
      adr.title,
      adr.contextAndProblemStatement,
      adr.decisionOutcome.justification,
      adr.decisionDrivers.join(" "),
    ].join(" ");

    return this.generateTextEmbedding(text);
  }

  /**
   * Generate embedding for text
   */
  private generateTextEmbedding(text: string): number[] {
    // Simplified embedding generation
    // In real implementation, use actual embedding model
    const embedding = new Array(128).fill(0);

    // Use text hash to generate pseudo-random embedding
    const hash = this.hashString(text);
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
   * Calculate cosine similarity between two vectors
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}
