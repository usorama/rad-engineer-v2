/**
 * RoadmapAPIHandler - Roadmap generation and feature management for rad-engineer Integration
 *
 * Responsibilities:
 * - Generate roadmaps via /plan skill integration
 * - Manage roadmap features (add, update, convert to spec)
 * - Persistent storage via StateManager
 * - Event broadcasting for UI updates
 *
 * Integration:
 * - IntakeHandler: Gather requirements from user queries
 * - ResearchCoordinator: Spawn parallel research agents
 * - ExecutionPlanGenerator: Generate execution plans
 * - StateManager: Persist roadmap data
 */

import { EventEmitter } from "events";
import { StateManager } from "@/advanced/StateManager.js";
import type { WaveState } from "@/advanced/StateManager.js";
import {
  IntakeHandler,
  ExecutionPlanGenerator,
  ValidationUtils,
} from "@/plan/index.js";
import type {
  StructuredRequirements,
  ResearchFindings,
  ExecutionPlan,
  Wave,
} from "@/plan/types.js";

/**
 * Roadmap feature status
 */
export type RoadmapFeatureStatus =
  | "draft"      // Feature idea, not yet converted to spec
  | "specified"  // Converted to executable spec
  | "planned"    // Execution plan generated
  | "in_progress" // Feature being implemented
  | "completed"  // Feature implemented
  | "cancelled"; // Feature cancelled

/**
 * Roadmap feature
 */
export interface RoadmapFeature {
  /** Unique feature ID */
  id: string;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Current status */
  status: RoadmapFeatureStatus;
  /** Priority (1-5, 5 is highest) */
  priority: number;
  /** Tags for categorization */
  tags: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Execution plan (if generated) */
  executionPlan?: ExecutionPlan;
  /** Requirements (if gathered) */
  requirements?: StructuredRequirements;
  /** Research findings (if conducted) */
  research?: ResearchFindings;
}

/**
 * Roadmap structure
 */
export interface Roadmap {
  /** Roadmap ID */
  id: string;
  /** Roadmap name */
  name: string;
  /** Roadmap description */
  description: string;
  /** Array of features */
  features: RoadmapFeature[];
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Roadmap checkpoint format stored in StateManager
 */
interface RoadmapCheckpoint extends WaveState {
  /** Current roadmap */
  roadmap: Roadmap | null;
  /** Checkpoint metadata */
  metadata: {
    version: string;
    lastUpdated: string;
  };
}

/**
 * Configuration for RoadmapAPIHandler
 */
export interface RoadmapAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** StateManager instance for persistence */
  stateManager: StateManager;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * RoadmapAPIHandler - Manages roadmap generation and feature operations
 *
 * @example
 * ```ts
 * const handler = new RoadmapAPIHandler({
 *   projectDir: "/path/to/project",
 *   stateManager: new StateManager(),
 * });
 *
 * // Generate roadmap from user query
 * const roadmap = await handler.generateRoadmap({
 *   query: "Build a user authentication system with OAuth",
 *   name: "Auth Roadmap",
 * });
 *
 * // Add feature to roadmap
 * const feature = await handler.addFeature({
 *   title: "Password reset flow",
 *   description: "Email-based password reset",
 *   priority: 4,
 * });
 *
 * // Convert feature to executable spec
 * await handler.convertFeatureToSpec(feature.id);
 *
 * // Listen for updates
 * handler.on("roadmap-updated", (roadmap) => {
 *   console.log("Roadmap changed");
 * });
 * ```
 */
export class RoadmapAPIHandler extends EventEmitter {
  private readonly config: RoadmapAPIHandlerConfig;
  private readonly stateManager: StateManager;
  private readonly checkpointName = "rad-engineer-roadmap";
  private featureIdCounter = 0;

  // Performance: Caching layer
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  // Performance: Memoized checkpoint
  private checkpointCache: RoadmapCheckpoint | null = null;
  private checkpointCacheTime = 0;

  constructor(config: RoadmapAPIHandlerConfig) {
    super();
    this.config = config;
    this.stateManager = config.stateManager;

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Initialized for project: ${config.projectDir}`);
    }
  }

  /**
   * Get data from cache
   *
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache
   *
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Invalidate cache entries
   *
   * @param pattern - Optional pattern to match keys (invalidates all if not provided)
   */
  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.checkpointCache = null;
      this.checkpointCacheTime = 0;
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Load roadmap checkpoint from StateManager
   *
   * Performance: Memoized with 1-minute TTL to avoid repeated disk reads
   *
   * @returns Roadmap checkpoint or empty state if not found
   */
  private async loadCheckpoint(): Promise<RoadmapCheckpoint> {
    // Check memoized checkpoint cache
    if (this.checkpointCache && Date.now() - this.checkpointCacheTime < this.CACHE_TTL) {
      return this.checkpointCache;
    }

    const state = await this.stateManager.loadCheckpoint(this.checkpointName);

    if (!state) {
      const emptyCheckpoint: RoadmapCheckpoint = {
        waveNumber: 0,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
        roadmap: null,
        metadata: {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        },
      };

      // Cache empty checkpoint
      this.checkpointCache = emptyCheckpoint;
      this.checkpointCacheTime = Date.now();

      return emptyCheckpoint;
    }

    const checkpoint = state as unknown as RoadmapCheckpoint;

    // Cache loaded checkpoint
    this.checkpointCache = checkpoint;
    this.checkpointCacheTime = Date.now();

    return checkpoint;
  }

  /**
   * Save roadmap checkpoint to StateManager
   *
   * Performance: Invalidates caches after save to ensure consistency
   *
   * @param checkpoint - Roadmap checkpoint to save
   */
  private async saveCheckpoint(checkpoint: RoadmapCheckpoint): Promise<void> {
    checkpoint.metadata.lastUpdated = new Date().toISOString();
    checkpoint.timestamp = new Date().toISOString();

    await this.stateManager.saveCheckpoint(
      this.checkpointName,
      checkpoint as unknown as WaveState
    );

    // Invalidate all caches on save
    this.invalidateCache();

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Saved checkpoint and invalidated caches`);
    }
  }

  /**
   * Get current roadmap
   *
   * Performance: Cached with 1-minute TTL via loadCheckpoint memoization
   *
   * @returns Current roadmap or null if none exists
   */
  async getRoadmap(): Promise<Roadmap | null> {
    const checkpoint = await this.loadCheckpoint();
    return checkpoint.roadmap;
  }

  /**
   * Generate roadmap from user query
   *
   * Performance: Invalidates cache before mutating operation
   *
   * Process:
   * 1. Gather requirements via IntakeHandler
   * 2. Spawn research agents via ResearchCoordinator
   * 3. Generate execution plan via ExecutionPlanGenerator
   * 4. Create roadmap structure with features from waves
   * 5. Save to StateManager
   * 6. Emit roadmap-updated event
   *
   * @param spec - Roadmap generation spec
   * @returns Generated roadmap
   */
  async generateRoadmap(spec: {
    query: string;
    name: string;
    description?: string;
  }): Promise<Roadmap> {
    // Invalidate cache before mutating operation
    this.invalidateCache();

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Generating roadmap from query: ${spec.query}`);
    }

    // Phase 1: Gather requirements
    const intakeHandler = new IntakeHandler();
    const requirements = await intakeHandler.processQuery(spec.query);

    // Emit progress event
    this.emit("roadmap-progress", {
      stage: "requirements",
      message: "Requirements gathered",
    });

    // Phase 2: Conduct research
    // Note: In production, this would use Task tool to spawn agents
    // For now, we simulate research findings
    const research: ResearchFindings = {
      feasibility: {
        feasible: true,
        approaches: [],
        risks: [],
        complexity: requirements.complexity,
      },
      evidence: [],
      timestamp: new Date().toISOString(),
    };

    // Emit progress event
    this.emit("roadmap-progress", {
      stage: "research",
      message: "Research completed",
    });

    // Phase 3: Generate execution plan
    const planGenerator = new ExecutionPlanGenerator();
    const executionPlan = planGenerator.generateExecutionPlan(requirements, research);

    // Validate execution plan
    const validationUtils = new ValidationUtils();
    const validation = validationUtils.validateExecutionPlan(executionPlan);
    if (!validation.passed) {
      const errors = validation.issues
        .filter((i: { severity: string; message: string }) => i.severity === "critical" || i.severity === "error")
        .map((i: { message: string }) => i.message)
        .join("; ");
      throw new Error(`Execution plan validation failed: ${errors}`);
    }

    // Emit progress event
    this.emit("roadmap-progress", {
      stage: "planning",
      message: "Execution plan generated",
    });

    // Phase 4: Create roadmap from execution plan
    const roadmapId = `roadmap-${Date.now()}`;
    const now = new Date().toISOString();

    // Convert waves to features
    const features: RoadmapFeature[] = executionPlan.waves.map((wave: Wave) => {
      const featureId = `feature-${Date.now()}-${this.featureIdCounter++}`;
      return {
        id: featureId,
        title: wave.name,
        description: `Phase ${wave.phase}: ${wave.stories.length} stories`,
        status: "planned" as RoadmapFeatureStatus,
        priority: 5 - wave.phase, // Higher phase = lower priority
        tags: [`phase-${wave.phase}`, `wave-${wave.number}`],
        createdAt: now,
        updatedAt: now,
        executionPlan: {
          ...executionPlan,
          waves: [wave], // Single wave per feature
        },
        requirements,
        research,
      };
    });

    const roadmap: Roadmap = {
      id: roadmapId,
      name: spec.name,
      description: spec.description || `Roadmap for: ${requirements.coreFeature}`,
      features,
      createdAt: now,
      updatedAt: now,
    };

    // Phase 5: Save to StateManager
    const checkpoint = await this.loadCheckpoint();
    checkpoint.roadmap = roadmap;
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("roadmap-updated", roadmap);

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Generated roadmap: ${roadmapId} with ${features.length} features`);
    }

    return roadmap;
  }

  /**
   * Add feature to current roadmap
   *
   * Performance: Invalidates cache before mutating operation
   *
   * Process:
   * 1. Load current roadmap
   * 2. Create feature object
   * 3. Add to roadmap
   * 4. Save checkpoint
   * 5. Emit feature-added event
   *
   * @param spec - Feature specification
   * @returns Added feature
   * @throws Error if no roadmap exists
   */
  async addFeature(spec: {
    title: string;
    description: string;
    priority?: number;
    tags?: string[];
  }): Promise<RoadmapFeature> {
    // Invalidate cache before mutating operation
    this.invalidateCache();

    const checkpoint = await this.loadCheckpoint();

    if (!checkpoint.roadmap) {
      throw new Error("No roadmap exists. Generate a roadmap first.");
    }

    const featureId = `feature-${Date.now()}-${this.featureIdCounter++}`;
    const now = new Date().toISOString();

    const feature: RoadmapFeature = {
      id: featureId,
      title: spec.title,
      description: spec.description,
      status: "draft",
      priority: spec.priority ?? 3,
      tags: spec.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    checkpoint.roadmap.features.push(feature);
    checkpoint.roadmap.updatedAt = now;
    await this.saveCheckpoint(checkpoint);

    // Emit events
    this.emit("feature-added", feature);
    this.emit("roadmap-updated", checkpoint.roadmap);

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Added feature: ${featureId}`);
    }

    return feature;
  }

  /**
   * Update feature
   *
   * Performance: Invalidates cache before loading to prevent reference issues
   *
   * @param featureId - Feature ID to update
   * @param updates - Partial feature updates
   * @returns Updated feature
   * @throws Error if roadmap or feature not found
   */
  async updateFeature(
    featureId: string,
    updates: Partial<RoadmapFeature>
  ): Promise<RoadmapFeature> {
    // Invalidate cache before mutating operation
    this.invalidateCache();

    const checkpoint = await this.loadCheckpoint();

    if (!checkpoint.roadmap) {
      throw new Error("No roadmap exists");
    }

    const featureIndex = checkpoint.roadmap.features.findIndex(f => f.id === featureId);
    if (featureIndex === -1) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    const feature = checkpoint.roadmap.features[featureIndex];
    Object.assign(feature, updates);
    feature.updatedAt = new Date().toISOString();

    checkpoint.roadmap.updatedAt = feature.updatedAt;
    await this.saveCheckpoint(checkpoint);

    // Emit events
    this.emit("feature-updated", feature);
    this.emit("roadmap-updated", checkpoint.roadmap);

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Updated feature: ${featureId}`);
    }

    return feature;
  }

  /**
   * Convert feature to executable spec
   *
   * Performance: Invalidates cache before mutating operation
   *
   * Process:
   * 1. Find feature
   * 2. If feature is draft, gather requirements and generate plan
   * 3. Update feature status to "specified"
   * 4. Save checkpoint
   * 5. Emit feature-updated event
   *
   * @param featureId - Feature ID to convert
   * @returns Updated feature with execution plan
   * @throws Error if feature not found or already specified
   */
  async convertFeatureToSpec(featureId: string): Promise<RoadmapFeature> {
    // Invalidate cache before mutating operation
    this.invalidateCache();

    const checkpoint = await this.loadCheckpoint();

    if (!checkpoint.roadmap) {
      throw new Error("No roadmap exists");
    }

    const featureIndex = checkpoint.roadmap.features.findIndex(f => f.id === featureId);
    if (featureIndex === -1) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    const feature = checkpoint.roadmap.features[featureIndex];

    if (feature.status !== "draft") {
      throw new Error(`Feature is not in draft status: ${featureId}`);
    }

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Converting feature to spec: ${featureId}`);
    }

    // Emit progress event
    this.emit("feature-conversion-progress", {
      featureId,
      stage: "requirements",
      message: "Gathering requirements",
    });

    // Gather requirements
    const intakeHandler = new IntakeHandler();
    const requirements = await intakeHandler.processQuery(
      `${feature.title}: ${feature.description}`
    );

    // Emit progress event
    this.emit("feature-conversion-progress", {
      featureId,
      stage: "research",
      message: "Conducting research",
    });

    // Conduct research
    // Note: In production, this would use Task tool to spawn agents
    // For now, we simulate research findings
    const research: ResearchFindings = {
      feasibility: {
        feasible: true,
        approaches: [],
        risks: [],
        complexity: "medium",
      },
      evidence: [],
      timestamp: new Date().toISOString(),
    };

    // Emit progress event
    this.emit("feature-conversion-progress", {
      featureId,
      stage: "planning",
      message: "Generating execution plan",
    });

    // Generate execution plan
    const planGenerator = new ExecutionPlanGenerator();
    const executionPlan = planGenerator.generateExecutionPlan(requirements, research);

    // Validate execution plan
    const validationUtils = new ValidationUtils();
    const validation = validationUtils.validateExecutionPlan(executionPlan);
    if (!validation.passed) {
      const errors = validation.issues
        .filter((i: { severity: string; message: string }) => i.severity === "critical" || i.severity === "error")
        .map((i: { message: string }) => i.message)
        .join("; ");
      throw new Error(`Execution plan validation failed: ${errors}`);
    }

    // Update feature
    feature.executionPlan = executionPlan;
    feature.requirements = requirements;
    feature.research = research;
    feature.status = "specified";
    feature.updatedAt = new Date().toISOString();

    checkpoint.roadmap.updatedAt = feature.updatedAt;
    await this.saveCheckpoint(checkpoint);

    // Emit events
    this.emit("feature-updated", feature);
    this.emit("roadmap-updated", checkpoint.roadmap);

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Feature converted to spec: ${featureId}`);
    }

    return feature;
  }

  /**
   * Delete feature
   *
   * Performance: Invalidates cache before mutating operation
   *
   * @param featureId - Feature ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteFeature(featureId: string): Promise<boolean> {
    // Invalidate cache before mutating operation
    this.invalidateCache();

    const checkpoint = await this.loadCheckpoint();

    if (!checkpoint.roadmap) {
      return false;
    }

    const featureIndex = checkpoint.roadmap.features.findIndex(f => f.id === featureId);
    if (featureIndex === -1) {
      return false;
    }

    checkpoint.roadmap.features.splice(featureIndex, 1);
    checkpoint.roadmap.updatedAt = new Date().toISOString();
    await this.saveCheckpoint(checkpoint);

    // Emit events
    this.emit("feature-deleted", featureId);
    this.emit("roadmap-updated", checkpoint.roadmap);

    if (this.config.debug) {
      console.log(`[RoadmapAPIHandler] Deleted feature: ${featureId}`);
    }

    return true;
  }

  /**
   * Get all features from current roadmap
   *
   * @returns Array of features or empty array if no roadmap
   */
  async getFeatures(): Promise<RoadmapFeature[]> {
    const checkpoint = await this.loadCheckpoint();
    return checkpoint.roadmap?.features ?? [];
  }

  /**
   * Get specific feature by ID
   *
   * @param featureId - Feature ID to retrieve
   * @returns Feature if found, null otherwise
   */
  async getFeature(featureId: string): Promise<RoadmapFeature | null> {
    const checkpoint = await this.loadCheckpoint();
    if (!checkpoint.roadmap) {
      return null;
    }
    return checkpoint.roadmap.features.find(f => f.id === featureId) ?? null;
  }
}
