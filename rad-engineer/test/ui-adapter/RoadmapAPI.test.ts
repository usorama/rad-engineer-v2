/**
 * Unit tests for RoadmapAPIHandler
 *
 * Tests:
 * - Roadmap generation from user queries
 * - Feature CRUD operations
 * - Feature conversion to executable specs
 * - StateManager persistence integration
 * - Event emissions
 * - Error handling (no roadmap, invalid features, validation failures)
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { RoadmapAPIHandler } from "@/ui-adapter/RoadmapAPIHandler.js";
import type { RoadmapAPIHandlerConfig, RoadmapFeature, Roadmap } from "@/ui-adapter/RoadmapAPIHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import { promises as fs } from "fs";
import { join } from "path";

// Mock the /plan skill modules
mock.module("@/plan/index.js", () => ({
  IntakeHandler: class MockIntakeHandler {
    async processQuery(query: string): Promise<{
      query: string;
      coreFeature: string;
      techStack: string;
      timeline: string;
      successCriteria: string[];
      outOfScope: string[];
      complexity: "simple" | "medium" | "complex";
      estimatedStories: number;
      gatheredAt: string;
    }> {
      return {
        query,
        coreFeature: "User authentication system",
        techStack: "typescript",
        timeline: "flexible",
        successCriteria: ["Users can log in", "OAuth support"],
        outOfScope: ["Advanced analytics"],
        complexity: "medium" as const,
        estimatedStories: 5,
        gatheredAt: new Date().toISOString(),
      };
    }
  },
  ResearchCoordinator: class MockResearchCoordinator {
    constructor(_config: { projectDir: string }) {}
    async conductResearch(_requirements: { complexity: "simple" | "medium" | "complex" }) {
      return {
        feasibility: {
          feasible: true,
          approaches: [
            {
              name: "JWT-based auth",
              pros: ["Simple", "Stateless"],
              cons: ["Token storage"],
              confidence: 0.9,
            },
          ],
          risks: [
            {
              risk: "Token theft",
              mitigation: "Use httpOnly cookies",
            },
          ],
          complexity: "medium" as const,
        },
        evidence: [
          {
            claim: "JWT is widely adopted",
            source: "Industry research",
            confidence: 0.95,
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }
  },
  ExecutionPlanGenerator: class MockExecutionPlanGenerator {
    generateExecutionPlan(requirements: { query: string; coreFeature: string; techStack: string; timeline: string; successCriteria: string[]; outOfScope: string[] }, research: { evidence: Array<{ claim: string; source: string; confidence: number }> }) {
      return {
        execution_metadata: {
          version: "1.0",
          schema: "rad-engineer-execution-metadata-v1",
          project: "test-project",
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          source: "/plan skill v1.0.0",
          researchSessionId: "research-123",
        },
        requirements: {
          query: requirements.query,
          core_feature: requirements.coreFeature,
          tech_stack: requirements.techStack,
          timeline: requirements.timeline,
          success_criteria: requirements.successCriteria,
          out_of_scope: requirements.outOfScope,
        },
        waves: [
          {
            id: "wave-1",
            number: 1,
            phase: 0,
            name: "Foundation setup",
            dependencies: [],
            estimatedMinutes: 60,
            parallelization: "sequential" as const,
            maxConcurrent: 1,
            stories: [
              {
                id: "story-1",
                waveId: "wave-1",
                title: "Setup auth infrastructure",
                description: "Initialize authentication system",
                agentType: "developer" as const,
                model: "sonnet" as const,
                estimatedMinutes: 30,
                dependencies: [],
                parallelGroup: 1,
                acceptanceCriteria: [
                  {
                    criterion: "Auth module created",
                    testable: true,
                    priority: "must" as const,
                  },
                ],
                filesInScope: ["src/auth/index.ts"],
                testRequirements: {
                  unitTests: 5,
                  integrationTests: 2,
                  coverageTarget: 80,
                },
              },
            ],
          },
          {
            id: "wave-2",
            number: 2,
            phase: 1,
            name: "OAuth integration",
            dependencies: ["wave-1"],
            estimatedMinutes: 90,
            parallelization: "partial" as const,
            maxConcurrent: 2,
            stories: [
              {
                id: "story-2",
                waveId: "wave-2",
                title: "Implement OAuth flow",
                description: "Add OAuth 2.0 authentication",
                agentType: "developer" as const,
                model: "sonnet" as const,
                estimatedMinutes: 45,
                dependencies: ["story-1"],
                parallelGroup: 1,
                acceptanceCriteria: [
                  {
                    criterion: "OAuth login works",
                    testable: true,
                    priority: "must" as const,
                  },
                ],
                filesInScope: ["src/auth/oauth.ts"],
                testRequirements: {
                  unitTests: 8,
                  integrationTests: 3,
                  coverageTarget: 85,
                },
              },
            ],
          },
        ],
        integration_tests: [],
        quality_gates: [],
        evidence: research.evidence,
      };
    }
  },
  ValidationUtils: class MockValidationUtils {
    validateExecutionPlan(_plan: { execution_metadata: unknown; requirements: unknown; waves: unknown[] }) {
      return {
        passed: true,
        issues: [],
        timestamp: new Date().toISOString(),
      };
    }
  },
}));

describe("RoadmapAPIHandler: getRoadmap", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns null when no roadmap exists", async () => {
    const roadmap = await handler.getRoadmap();
    expect(roadmap).toBeNull();
  });

  it("Returns roadmap after generation", async () => {
    const generated = await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    const retrieved = await handler.getRoadmap();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(generated.id);
    expect(retrieved?.name).toBe("Auth Roadmap");
  });
});

describe("RoadmapAPIHandler: generateRoadmap", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Generates roadmap from user query", async () => {
    const roadmap = await handler.generateRoadmap({
      query: "Build user authentication with OAuth",
      name: "Auth Roadmap",
      description: "Complete authentication system",
    });

    expect(roadmap).toBeDefined();
    expect(roadmap.id).toMatch(/^roadmap-\d+$/);
    expect(roadmap.name).toBe("Auth Roadmap");
    expect(roadmap.description).toBe("Complete authentication system");
    expect(roadmap.features).toBeArray();
    expect(roadmap.features.length).toBeGreaterThan(0);
  });

  it("Creates features from execution plan waves", async () => {
    const roadmap = await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    // Should have 2 features (from 2 waves in mock)
    expect(roadmap.features).toHaveLength(2);

    const feature1 = roadmap.features[0];
    expect(feature1.id).toMatch(/^feature-\d+-\d+$/);
    expect(feature1.title).toBe("Foundation setup");
    expect(feature1.status).toBe("planned");
    expect(feature1.executionPlan).toBeDefined();
    expect(feature1.requirements).toBeDefined();
    expect(feature1.research).toBeDefined();

    const feature2 = roadmap.features[1];
    expect(feature2.title).toBe("OAuth integration");
    expect(feature2.status).toBe("planned");
  });

  it("Assigns priority based on wave phase", async () => {
    const roadmap = await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    // Phase 0 → priority 5
    expect(roadmap.features[0].priority).toBe(5);
    // Phase 1 → priority 4
    expect(roadmap.features[1].priority).toBe(4);
  });

  it("Persists roadmap to StateManager", async () => {
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    // Create new handler instance to verify persistence
    const newHandler = new RoadmapAPIHandler({
      projectDir: "/test/project",
      stateManager,
    });

    const retrieved = await newHandler.getRoadmap();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Auth Roadmap");
  });

  it("Emits roadmap-updated event", async () => {
    let emittedRoadmap: Roadmap | undefined;
    handler.on("roadmap-updated", (roadmap: Roadmap) => {
      emittedRoadmap = roadmap;
    });

    const roadmap = await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    expect(emittedRoadmap).toBeDefined();
    expect(emittedRoadmap!.id).toBe(roadmap.id);
  });

  it("Emits progress events during generation", async () => {
    const progressEvents: Array<{ stage: string; message: string }> = [];
    handler.on("roadmap-progress", (event: { stage: string; message: string }) => {
      progressEvents.push(event);
    });

    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
    expect(progressEvents.some(e => e.stage === "requirements")).toBe(true);
    expect(progressEvents.some(e => e.stage === "research")).toBe(true);
    expect(progressEvents.some(e => e.stage === "planning")).toBe(true);
  });

  it("Uses default description when not provided", async () => {
    const roadmap = await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    expect(roadmap.description).toContain("User authentication system");
  });
});

describe("RoadmapAPIHandler: Debug mode", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;
  let consoleSpy: any;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints-debug");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    // Spy on console.log
    consoleSpy = {
      calls: [] as string[],
      original: console.log,
    };
    console.log = (...args: any[]) => {
      consoleSpy.calls.push(args.join(" "));
    };

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
      debug: true,
    };
    handler = new RoadmapAPIHandler(config);
  });

  afterEach(async () => {
    // Restore console.log
    console.log = consoleSpy.original;

    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Logs debug messages when debug mode enabled", async () => {
    const roadmap = await handler.generateRoadmap({
      query: "Test query",
      name: "Test Roadmap",
    });

    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Initialized"))).toBe(true);
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Generating roadmap"))).toBe(true);
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Saved checkpoint"))).toBe(true);
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Generated roadmap"))).toBe(true);
  });

  it("Logs feature operations in debug mode", async () => {
    await handler.generateRoadmap({
      query: "Test",
      name: "Test",
    });

    consoleSpy.calls = []; // Clear previous calls

    const feature = await handler.addFeature({
      title: "Test feature",
      description: "Test",
    });

    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Added feature"))).toBe(true);

    await handler.updateFeature(feature.id, { title: "Updated" });
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Updated feature"))).toBe(true);

    await handler.convertFeatureToSpec(feature.id);
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Converting feature"))).toBe(true);
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Feature converted"))).toBe(true);
  });

  it("Logs delete operations in debug mode", async () => {
    await handler.generateRoadmap({
      query: "Test",
      name: "Test",
    });

    const feature = await handler.addFeature({
      title: "Test",
      description: "Test",
    });

    consoleSpy.calls = [];

    await handler.deleteFeature(feature.id);
    expect(consoleSpy.calls.some((c: string) => c.includes("[RoadmapAPIHandler] Deleted feature"))).toBe(true);
  });
});

describe("RoadmapAPIHandler: addFeature", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);

    // Generate initial roadmap
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Adds feature to existing roadmap", async () => {
    const feature = await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
      priority: 4,
      tags: ["security", "user-experience"],
    });

    expect(feature).toBeDefined();
    expect(feature.id).toMatch(/^feature-\d+-\d+$/);
    expect(feature.title).toBe("Password reset flow");
    expect(feature.description).toBe("Email-based password reset");
    expect(feature.status).toBe("draft");
    expect(feature.priority).toBe(4);
    expect(feature.tags).toEqual(["security", "user-experience"]);
  });

  it("Throws error when no roadmap exists", async () => {
    const tempDir2 = join(process.cwd(), "test-roadmap-handler-checkpoints-2");
    await fs.mkdir(tempDir2, { recursive: true });

    const newHandler = new RoadmapAPIHandler({
      projectDir: "/test/project2",
      stateManager: new StateManager({ checkpointsDir: tempDir2 }),
    });

    try {
      await expect(
        newHandler.addFeature({
          title: "Test feature",
          description: "Test",
        })
      ).rejects.toThrow("No roadmap exists");
    } finally {
      await fs.rm(tempDir2, { recursive: true, force: true });
    }
  });

  it("Uses default values for optional fields", async () => {
    const feature = await handler.addFeature({
      title: "Test feature",
      description: "Test description",
    });

    expect(feature.priority).toBe(3); // Default priority
    expect(feature.tags).toEqual([]); // Default tags
  });

  it("Persists added feature", async () => {
    await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
    });

    const roadmap = await handler.getRoadmap();
    expect(roadmap).not.toBeNull();
    const added = roadmap!.features.find(f => f.title === "Password reset flow");
    expect(added).toBeDefined();
  });

  it("Emits feature-added and roadmap-updated events", async () => {
    let addedFeature: RoadmapFeature | null = null;
    let updatedRoadmap: Roadmap | null = null;

    handler.on("feature-added", (feature: RoadmapFeature) => {
      addedFeature = feature;
    });
    handler.on("roadmap-updated", (roadmap: Roadmap) => {
      updatedRoadmap = roadmap;
    });

    const feature = await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
    });

    expect(addedFeature).not.toBeNull();
    expect(addedFeature!.id).toBe(feature.id);
    expect(updatedRoadmap).not.toBeNull();
  });
});

describe("RoadmapAPIHandler: updateFeature", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;
  let featureId: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);

    // Generate roadmap and add feature
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });
    const feature = await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
    });
    featureId = feature.id;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Updates feature properties", async () => {
    const updated = await handler.updateFeature(featureId, {
      title: "Enhanced password reset",
      priority: 5,
      tags: ["critical", "security"],
    });

    expect(updated.id).toBe(featureId);
    expect(updated.title).toBe("Enhanced password reset");
    expect(updated.priority).toBe(5);
    expect(updated.tags).toEqual(["critical", "security"]);
  });

  it("Updates updatedAt timestamp", async () => {
    const original = await handler.getFeature(featureId);
    await new Promise(resolve => setTimeout(resolve, 10));

    const updated = await handler.updateFeature(featureId, {
      title: "Updated title",
    });

    expect(updated.updatedAt).not.toBe(original!.updatedAt);
  });

  it("Throws error when feature not found", async () => {
    await expect(
      handler.updateFeature("non-existent-feature", { title: "Test" })
    ).rejects.toThrow("Feature not found");
  });

  it("Throws error when no roadmap exists", async () => {
    const tempDir2 = join(process.cwd(), "test-roadmap-handler-checkpoints-update");
    await fs.mkdir(tempDir2, { recursive: true });

    const newHandler = new RoadmapAPIHandler({
      projectDir: "/test/project2",
      stateManager: new StateManager({ checkpointsDir: tempDir2 }),
    });

    try {
      await expect(
        newHandler.updateFeature("feature-id", { title: "Test" })
      ).rejects.toThrow("No roadmap exists");
    } finally {
      await fs.rm(tempDir2, { recursive: true, force: true });
    }
  });

  it("Emits feature-updated and roadmap-updated events", async () => {
    let updatedFeature: RoadmapFeature | null = null;
    let updatedRoadmap: Roadmap | null = null;

    handler.on("feature-updated", (feature: RoadmapFeature) => {
      updatedFeature = feature;
    });
    handler.on("roadmap-updated", (roadmap: Roadmap) => {
      updatedRoadmap = roadmap;
    });

    await handler.updateFeature(featureId, { title: "Updated title" });

    expect(updatedFeature).not.toBeNull();
    expect(updatedFeature!.id).toBe(featureId);
    expect(updatedRoadmap).not.toBeNull();
  });
});

describe("RoadmapAPIHandler: convertFeatureToSpec", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;
  let featureId: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);

    // Generate roadmap and add draft feature
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });
    const feature = await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
    });
    featureId = feature.id;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Converts draft feature to specified with execution plan", async () => {
    const converted = await handler.convertFeatureToSpec(featureId);

    expect(converted.id).toBe(featureId);
    expect(converted.status).toBe("specified");
    expect(converted.executionPlan).toBeDefined();
    expect(converted.requirements).toBeDefined();
    expect(converted.research).toBeDefined();
  });

  it("Execution plan contains waves from plan generator", async () => {
    const converted = await handler.convertFeatureToSpec(featureId);

    expect(converted.executionPlan?.waves).toBeArray();
    expect(converted.executionPlan?.waves.length).toBeGreaterThan(0);
    expect(converted.executionPlan?.execution_metadata).toBeDefined();
  });

  it("Throws error when feature not found", async () => {
    await expect(
      handler.convertFeatureToSpec("non-existent-feature")
    ).rejects.toThrow("Feature not found");
  });

  it("Throws error when feature is not draft", async () => {
    await handler.convertFeatureToSpec(featureId); // Convert once

    // Try to convert again
    await expect(
      handler.convertFeatureToSpec(featureId)
    ).rejects.toThrow("Feature is not in draft status");
  });

  it("Throws error when no roadmap exists", async () => {
    const tempDir2 = join(process.cwd(), "test-roadmap-handler-checkpoints-convert");
    await fs.mkdir(tempDir2, { recursive: true });

    const newHandler = new RoadmapAPIHandler({
      projectDir: "/test/project2",
      stateManager: new StateManager({ checkpointsDir: tempDir2 }),
    });

    try {
      await expect(
        newHandler.convertFeatureToSpec("feature-id")
      ).rejects.toThrow("No roadmap exists");
    } finally {
      await fs.rm(tempDir2, { recursive: true, force: true });
    }
  });

  it("Emits progress events during conversion", async () => {
    const progressEvents: Array<{ featureId: string; stage: string; message: string }> = [];
    handler.on("feature-conversion-progress", (event: { featureId: string; stage: string; message: string }) => {
      progressEvents.push(event);
    });

    await handler.convertFeatureToSpec(featureId);

    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
    expect(progressEvents.some(e => e.stage === "requirements")).toBe(true);
    expect(progressEvents.some(e => e.stage === "research")).toBe(true);
    expect(progressEvents.some(e => e.stage === "planning")).toBe(true);
    progressEvents.forEach(e => {
      expect(e.featureId).toBe(featureId);
    });
  });

  it("Emits feature-updated and roadmap-updated events", async () => {
    let updatedFeature: RoadmapFeature | null = null;
    let updatedRoadmap: Roadmap | null = null;

    handler.on("feature-updated", (feature: RoadmapFeature) => {
      updatedFeature = feature;
    });
    handler.on("roadmap-updated", (roadmap: Roadmap) => {
      updatedRoadmap = roadmap;
    });

    await handler.convertFeatureToSpec(featureId);

    expect(updatedFeature).not.toBeNull();
    expect(updatedFeature!.id).toBe(featureId);
    expect(updatedFeature!.status).toBe("specified");
    expect(updatedRoadmap).not.toBeNull();
  });
});

describe("RoadmapAPIHandler: deleteFeature", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;
  let featureId: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);

    // Generate roadmap and add feature
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });
    const feature = await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
    });
    featureId = feature.id;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Deletes feature and returns true", async () => {
    const result = await handler.deleteFeature(featureId);
    expect(result).toBe(true);

    const feature = await handler.getFeature(featureId);
    expect(feature).toBeNull();
  });

  it("Returns false when feature not found", async () => {
    const result = await handler.deleteFeature("non-existent-feature");
    expect(result).toBe(false);
  });

  it("Returns false when no roadmap exists", async () => {
    const newHandler = new RoadmapAPIHandler({
      projectDir: "/test/project2",
      stateManager: new StateManager({ checkpointsDir: tempDir }),
    });

    const result = await newHandler.deleteFeature("feature-id");
    expect(result).toBe(false);
  });

  it("Emits feature-deleted and roadmap-updated events", async () => {
    let deletedFeatureId: string | undefined;
    let updatedRoadmap: Roadmap | undefined;

    handler.on("feature-deleted", (id: string) => {
      deletedFeatureId = id;
    });
    handler.on("roadmap-updated", (roadmap: Roadmap) => {
      updatedRoadmap = roadmap;
    });

    await handler.deleteFeature(featureId);

    expect(deletedFeatureId).toBeDefined();
    expect(deletedFeatureId).toBe(featureId);
    expect(updatedRoadmap).toBeDefined();
  });
});

describe("RoadmapAPIHandler: getFeatures", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns empty array when no roadmap exists", async () => {
    const features = await handler.getFeatures();
    expect(features).toEqual([]);
  });

  it("Returns all features from roadmap", async () => {
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });

    const features = await handler.getFeatures();
    expect(features).toBeArray();
    expect(features.length).toBeGreaterThan(0);
  });
});

describe("RoadmapAPIHandler: getFeature", () => {
  let handler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let tempDir: string;
  let featureId: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-roadmap-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });

    const config: RoadmapAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
    };
    handler = new RoadmapAPIHandler(config);

    // Generate roadmap and add feature
    await handler.generateRoadmap({
      query: "Build user authentication",
      name: "Auth Roadmap",
    });
    const feature = await handler.addFeature({
      title: "Password reset flow",
      description: "Email-based password reset",
    });
    featureId = feature.id;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns feature by ID", async () => {
    const feature = await handler.getFeature(featureId);
    expect(feature).not.toBeNull();
    expect(feature?.id).toBe(featureId);
    expect(feature?.title).toBe("Password reset flow");
  });

  it("Returns null when feature not found", async () => {
    const feature = await handler.getFeature("non-existent-feature");
    expect(feature).toBeNull();
  });

  it("Returns null when no roadmap exists", async () => {
    const newHandler = new RoadmapAPIHandler({
      projectDir: "/test/project2",
      stateManager: new StateManager({ checkpointsDir: tempDir }),
    });

    const feature = await newHandler.getFeature("feature-id");
    expect(feature).toBeNull();
  });
});
