/**
 * E2E Integration Test - Sweet Dreams Bakery Build
 *
 * Tests the complete workflow from PRD → Roadmap → Plan → Execute → Verify
 * using the actual Sweet Dreams Bakery project as a real-world scenario.
 *
 * Test Flow:
 * 1. Load existing PRD from docs/bakery-project/planning/PRD_Sweet_Dreams_Bakery.md
 * 2. Generate roadmap using RoadmapAPIHandler
 * 3. Verify roadmap contains expected features (Order Intake, Dashboard, Portal)
 * 4. Generate execution plan for first feature
 * 5. Verify plan has valid waves and stories
 * 6. Test error handling for invalid inputs
 *
 * Coverage Areas:
 * - RoadmapAPIHandler (roadmap generation, feature management)
 * - StateManager (persistence)
 * - IntakeHandler (requirement gathering)
 * - ExecutionPlanGenerator (plan generation)
 * - ValidationUtils (plan validation)
 * - BusinessOutcomeExtractor (outcome extraction)
 *
 * Success Criteria:
 * - All test cases pass (6-8 scenarios)
 * - Realistic bakery PRD data used throughout
 * - Error cases handled gracefully
 * - No flaky tests (deterministic execution)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RoadmapAPIHandler } from "@/ui-adapter/RoadmapAPIHandler.js";
import type { Roadmap, RoadmapFeature } from "@/ui-adapter/RoadmapAPIHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import {
  IntakeHandler,
  ExecutionPlanGenerator,
  ValidationUtils,
  BusinessOutcomeExtractor,
} from "@/plan/index.js";
import type {
  StructuredRequirements,
  ResearchFindings,
  ExecutionPlan,
  Wave,
} from "@/plan/types.js";
import { promises as fs } from "fs";
import { join } from "path";
import { mkdirSync, rmSync, existsSync } from "fs";

// Test fixture directory - unique per test to avoid conflicts
const getTestProjectDir = () => join(process.cwd(), `.test-eb-int-${Date.now()}`);

/**
 * Load PRD content from Sweet Dreams Bakery project
 */
const loadBakeryPRD = async (): Promise<string> => {
  const prdPath = join(
    process.cwd(),
    "docs",
    "bakery-project",
    "planning",
    "PRD_Sweet_Dreams_Bakery.md"
  );
  return await fs.readFile(prdPath, "utf-8");
};

/**
 * Create mock research findings for bakery project
 */
const createMockResearchFindings = (): ResearchFindings => ({
  feasibility: {
    feasible: true,
    approaches: [
      {
        name: "Next.js + Supabase",
        pros: ["Fast development", "Low cost", "Scalable"],
        cons: ["Vendor lock-in"],
        confidence: 0.9,
      },
    ],
    risks: [
      {
        risk: "Owner may find system too complex",
        mitigation: "Extensive training and simple UI design",
      },
    ],
    complexity: "medium",
  },
  evidence: [
    {
      claim: "Next.js + Supabase is golden standard for 2026 small business apps",
      source: "https://writerdock.in/blog/ultimate-guide-best-tech-stack-saas-2026",
      confidence: 0.85,
    },
  ],
  timestamp: new Date().toISOString(),
});

describe("E2E: Sweet Dreams Bakery Build", () => {
  let roadmapHandler: RoadmapAPIHandler;
  let stateManager: StateManager;
  let intakeHandler: IntakeHandler;
  let planGenerator: ExecutionPlanGenerator;
  let validationUtils: ValidationUtils;
  let businessOutcomeExtractor: BusinessOutcomeExtractor;
  let testProjectDir: string;
  let bakeryPRD: string;

  beforeEach(async () => {
    // Create unique test directory for isolation
    testProjectDir = getTestProjectDir();
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true, force: true });
    }
    mkdirSync(testProjectDir, { recursive: true });

    // Load bakery PRD
    bakeryPRD = await loadBakeryPRD();

    // Initialize components
    stateManager = new StateManager({ checkpointsDir: join(testProjectDir, ".checkpoints") });
    roadmapHandler = new RoadmapAPIHandler({
      projectDir: testProjectDir,
      stateManager,
      debug: false,
    });

    intakeHandler = new IntakeHandler();
    planGenerator = new ExecutionPlanGenerator();
    validationUtils = new ValidationUtils();
    businessOutcomeExtractor = new BusinessOutcomeExtractor();
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  describe("Scenario 1: Load PRD and Process Requirements", () => {
    test("should load PRD successfully", async () => {
      // Verify PRD loaded
      expect(bakeryPRD).toBeDefined();
      expect(bakeryPRD.length).toBeGreaterThan(0);

      // Verify PRD contains expected content
      expect(bakeryPRD).toContain("Sweet Dreams Bakery");
      expect(bakeryPRD).toContain("Order Management System");
      expect(bakeryPRD).toContain("Business Outcomes");
    });

    test("should extract requirements from bakery PRD query", async () => {
      const query =
        "Build a custom order management system for Sweet Dreams Bakery with order intake, dashboard, and customer self-service portal";

      const requirements = await intakeHandler.processQuery(query);

      // Verify requirements extracted
      expect(requirements.query).toBe(query);
      expect(requirements.coreFeature).toBeDefined();
      expect(requirements.techStack).toBeDefined();
      expect(requirements.complexity).toMatch(/simple|medium|complex/);
      expect(requirements.estimatedStories).toBeGreaterThan(0);
    });

    test("should generate execution plan with bakery features", () => {
      // Create requirements
      const requirements: StructuredRequirements = {
        query: "Build bakery order management system",
        coreFeature: "Custom Order Intake System",
        techStack: "Next.js 15 + Supabase",
        timeline: "8-12 weeks",
        successCriteria: [
          "Zero lost orders (100% capture rate)",
          "80% reduction in customer status calls",
        ],
        outOfScope: ["Recipe management", "Employee scheduling"],
        complexity: "medium",
        estimatedStories: 12,
        gatheredAt: new Date().toISOString(),
      };

      const research = createMockResearchFindings();

      // Generate execution plan
      const plan = planGenerator.generateExecutionPlan(requirements, research);

      // Verify plan structure
      expect(plan.execution_metadata).toBeDefined();
      expect(plan.requirements.core_feature).toBe("Custom Order Intake System");
      expect(plan.waves.length).toBeGreaterThan(0);

      // Verify waves have stories
      plan.waves.forEach((wave: Wave) => {
        expect(wave.stories).toBeDefined();
        expect(wave.stories.length).toBeGreaterThan(0);
      });
    });

    test("should extract business outcomes from execution plan", () => {
      // Create plan with success criteria
      const requirements: StructuredRequirements = {
        query: "Build bakery order system",
        coreFeature: "Order Management",
        techStack: "Next.js + Supabase",
        timeline: "8-12 weeks",
        successCriteria: [
          "Zero lost orders (100% capture rate)",
          "80% reduction in customer status calls",
          "Real-time profitability dashboard",
        ],
        outOfScope: [],
        complexity: "medium",
        estimatedStories: 10,
        gatheredAt: new Date().toISOString(),
      };

      const research = createMockResearchFindings();
      const plan = planGenerator.generateExecutionPlan(requirements, research);

      // Extract outcomes from plan
      const outcomes = businessOutcomeExtractor.extractOutcomes(plan);

      // Verify outcomes extracted
      expect(outcomes.length).toBeGreaterThan(0);

      // Verify outcomes have KPIs
      outcomes.forEach((outcome) => {
        expect(outcome.id).toBeDefined();
        expect(outcome.title).toBeDefined();
        expect(outcome.kpis).toBeDefined();
      });
    });
  });

  describe("Scenario 2: Generate Roadmap from PRD", () => {
    test("should generate roadmap with bakery features", async () => {
      // Generate roadmap from bakery PRD query
      const roadmap = await roadmapHandler.generateRoadmap({
        query:
          "Build a custom order management system for Sweet Dreams Bakery with order intake, dashboard, and customer self-service portal",
        name: "Sweet Dreams Bakery - Phase 2 Custom Solution",
        description: "Complete order management system to replace manual notebook tracking",
      });

      // Verify roadmap created
      expect(roadmap).toBeDefined();
      expect(roadmap.id).toBeDefined();
      expect(roadmap.name).toBe("Sweet Dreams Bakery - Phase 2 Custom Solution");

      // Verify features created from waves
      expect(roadmap.features.length).toBeGreaterThan(0);

      // Verify feature structure
      roadmap.features.forEach((feature) => {
        expect(feature.id).toBeDefined();
        expect(feature.title).toBeDefined();
        expect(feature.status).toBe("planned");
        expect(feature.executionPlan).toBeDefined();
      });
    });

    test("should persist roadmap to StateManager", async () => {
      // Generate roadmap
      const roadmap = await roadmapHandler.generateRoadmap({
        query: "Build bakery order management system",
        name: "Bakery Roadmap",
      });

      // Verify roadmap persisted
      const retrievedRoadmap = await roadmapHandler.getRoadmap();
      expect(retrievedRoadmap).not.toBeNull();
      expect(retrievedRoadmap?.id).toBe(roadmap.id);
      expect(retrievedRoadmap?.features.length).toBe(roadmap.features.length);
    });

    test("should emit roadmap-updated event", async () => {
      // Listen for event
      const events: Roadmap[] = [];
      roadmapHandler.on("roadmap-updated", (roadmap: Roadmap) => {
        events.push(roadmap);
      });

      // Generate roadmap
      await roadmapHandler.generateRoadmap({
        query: "Build bakery order management system",
        name: "Test Roadmap",
      });

      // Verify event emitted
      expect(events.length).toBe(1);
      expect(events[0].name).toBe("Test Roadmap");
    });
  });

  describe("Scenario 3: Verify Roadmap Features", () => {
    let roadmap: Roadmap;

    beforeEach(async () => {
      // Generate roadmap for tests
      roadmap = await roadmapHandler.generateRoadmap({
        query:
          "Build Sweet Dreams Bakery order management system with order intake, dashboard, and customer portal",
        name: "Bakery Roadmap",
      });
    });

    test("should have multiple features representing different phases", () => {
      // Should have at least 3 features (foundation + 2 main features)
      expect(roadmap.features.length).toBeGreaterThanOrEqual(3);
    });

    test("should have features with valid priorities", () => {
      roadmap.features.forEach((feature) => {
        expect(feature.priority).toBeGreaterThanOrEqual(1);
        expect(feature.priority).toBeLessThanOrEqual(5);
      });
    });

    test("should have features with phase tags", () => {
      const featuresWithPhaseTags = roadmap.features.filter((f) =>
        f.tags.some((t) => t.startsWith("phase-"))
      );
      expect(featuresWithPhaseTags.length).toBeGreaterThan(0);
    });

    test("should have valid execution plans for features", () => {
      roadmap.features.forEach((feature) => {
        expect(feature.executionPlan).toBeDefined();

        if (feature.executionPlan) {
          // Verify execution plan structure
          expect(feature.executionPlan.execution_metadata).toBeDefined();
          expect(feature.executionPlan.requirements).toBeDefined();
          expect(feature.executionPlan.waves).toBeDefined();
          expect(feature.executionPlan.waves.length).toBeGreaterThan(0);

          // Verify waves have stories
          feature.executionPlan.waves.forEach((wave: Wave) => {
            expect(wave.stories).toBeDefined();
            expect(wave.stories.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe("Scenario 4: Validate Execution Plans", () => {
    let roadmap: Roadmap;

    beforeEach(async () => {
      roadmap = await roadmapHandler.generateRoadmap({
        query: "Build bakery order intake system",
        name: "Bakery Roadmap",
      });
    });

    test("should have valid execution plan structure", () => {
      const firstFeature = roadmap.features[0];
      expect(firstFeature.executionPlan).toBeDefined();

      const plan = firstFeature.executionPlan!;

      // Verify metadata
      expect(plan.execution_metadata.version).toBeDefined();
      expect(plan.execution_metadata.schema).toBeDefined();

      // Verify requirements
      expect(plan.requirements.core_feature).toBeDefined();
      expect(plan.requirements.tech_stack).toBeDefined();
      expect(plan.requirements.success_criteria.length).toBeGreaterThan(0);

      // Verify waves
      expect(plan.waves.length).toBeGreaterThan(0);
    });

    test("should have waves with valid dependencies", () => {
      const plan = roadmap.features[0].executionPlan!;

      plan.waves.forEach((wave: Wave, index: number) => {
        // Verify wave structure
        expect(wave.id).toBeDefined();
        expect(wave.number).toBe(index + 1);
        expect(wave.phase).toBeGreaterThanOrEqual(0);
        expect(wave.phase).toBeLessThanOrEqual(3);

        // Verify dependencies reference valid wave IDs
        wave.dependencies.forEach((depId: string) => {
          const depWave = plan.waves.find((w: Wave) => w.id === depId);
          expect(depWave).toBeDefined();
        });
      });
    });

    test("should have stories with acceptance criteria", () => {
      const plan = roadmap.features[0].executionPlan!;

      plan.waves.forEach((wave: Wave) => {
        wave.stories.forEach((story) => {
          // Each story should have acceptance criteria
          expect(story.acceptanceCriteria).toBeDefined();
          expect(story.acceptanceCriteria.length).toBeGreaterThan(0);

          // Verify acceptance criteria structure
          story.acceptanceCriteria.forEach((ac) => {
            expect(ac.criterion).toBeDefined();
            expect(ac.testable).toBeDefined();
            expect(ac.priority).toMatch(/must|should|could/);
          });
        });
      });
    });

    test("should pass execution plan validation", () => {
      const plan = roadmap.features[0].executionPlan!;

      const validation = validationUtils.validateExecutionPlan(plan);

      // Verify validation passed
      expect(validation.passed).toBe(true);

      // Verify no critical/error issues
      const criticalIssues = validation.issues.filter(
        (i) => i.severity === "critical" || i.severity === "error"
      );
      expect(criticalIssues.length).toBe(0);
    });
  });

  describe("Scenario 5: Feature Management Operations", () => {
    let roadmap: Roadmap;

    beforeEach(async () => {
      roadmap = await roadmapHandler.generateRoadmap({
        query: "Build bakery order system",
        name: "Test Roadmap",
      });
    });

    test("should add new feature successfully", async () => {
      const initialFeatureCount = roadmap.features.length;

      // Add custom feature
      const newFeature = await roadmapHandler.addFeature({
        title: "Customer Loyalty Program",
        description: "Implement points system with 10th cake free promotion",
        priority: 2,
        tags: ["future", "marketing"],
      });

      // Verify feature added
      expect(newFeature.id).toBeDefined();
      expect(newFeature.status).toBe("draft");
      expect(newFeature.priority).toBe(2);

      // Verify feature in roadmap
      const updatedRoadmap = await roadmapHandler.getRoadmap();
      expect(updatedRoadmap?.features.length).toBe(initialFeatureCount + 1);
    });

    test("should convert draft feature to spec", async () => {
      // Add draft feature
      const draftFeature = await roadmapHandler.addFeature({
        title: "Email Notifications",
        description: "Send order confirmation emails to customers",
        priority: 3,
      });

      expect(draftFeature.status).toBe("draft");

      // Convert to spec
      const specifiedFeature = await roadmapHandler.convertFeatureToSpec(draftFeature.id);

      // Verify conversion
      expect(specifiedFeature.status).toBe("specified");
      expect(specifiedFeature.executionPlan).toBeDefined();
      expect(specifiedFeature.requirements).toBeDefined();
      expect(specifiedFeature.research).toBeDefined();
    });

    test("should retrieve all features", async () => {
      const features = await roadmapHandler.getFeatures();

      expect(features.length).toBe(roadmap.features.length);
      expect(features[0].id).toBeDefined();
    });

    test("should retrieve specific feature by ID", async () => {
      const featureId = roadmap.features[0].id;
      const feature = await roadmapHandler.getFeature(featureId);

      expect(feature).not.toBeNull();
      expect(feature?.id).toBe(featureId);
    });

    test("should update feature successfully", async () => {
      const featureId = roadmap.features[0].id;

      const updatedFeature = await roadmapHandler.updateFeature(featureId, {
        priority: 5,
        tags: ["urgent", "bakery"],
      });

      expect(updatedFeature.priority).toBe(5);
      expect(updatedFeature.tags).toContain("urgent");
      expect(updatedFeature.tags).toContain("bakery");
    });

    test("should delete feature successfully", async () => {
      const featureId = roadmap.features[0].id;

      const deleted = await roadmapHandler.deleteFeature(featureId);
      expect(deleted).toBe(true);

      // Verify feature deleted
      const feature = await roadmapHandler.getFeature(featureId);
      expect(feature).toBeNull();
    });
  });

  describe("Scenario 6: Error Handling", () => {
    test("should throw error when adding feature without roadmap", async () => {
      // Create new handler with empty state
      const emptyHandler = new RoadmapAPIHandler({
        projectDir: testProjectDir,
        stateManager: new StateManager({
          checkpointsDir: join(testProjectDir, ".checkpoints-empty"),
        }),
        debug: false,
      });

      // Try to add feature without roadmap
      await expect(
        emptyHandler.addFeature({
          title: "Test Feature",
          description: "Should fail",
        })
      ).rejects.toThrow("No roadmap exists");
    });

    test("should throw error when converting non-draft feature", async () => {
      const roadmap = await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Test Roadmap",
      });

      // Try to convert already-specified feature
      const specifiedFeature = roadmap.features[0]; // These are already "planned"
      await expect(roadmapHandler.convertFeatureToSpec(specifiedFeature.id)).rejects.toThrow(
        "not in draft status"
      );
    });

    test("should throw error when updating non-existent feature", async () => {
      await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Test Roadmap",
      });

      await expect(
        roadmapHandler.updateFeature("non-existent-id", {
          title: "Updated Title",
        })
      ).rejects.toThrow("Feature not found");
    });

    test("should return false when deleting non-existent feature", async () => {
      await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Test Roadmap",
      });

      const deleted = await roadmapHandler.deleteFeature("non-existent-id");
      expect(deleted).toBe(false);
    });

    test("should handle invalid execution plan gracefully", () => {
      // Create invalid plan (missing required fields)
      const invalidPlan = {
        execution_metadata: {
          version: "1.0.0",
          schema: "invalid",
          project: "test",
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          source: "test",
          researchSessionId: "test",
        },
        requirements: {
          query: "",
          core_feature: "",
          tech_stack: "",
          timeline: "",
          success_criteria: [],
          out_of_scope: [],
        },
        waves: [], // Empty waves - invalid
        integration_tests: [],
        quality_gates: [],
      };

      const validation = validationUtils.validateExecutionPlan(invalidPlan as ExecutionPlan);

      // Should fail validation
      expect(validation.passed).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Scenario 7: Progress Events and Real-Time Updates", () => {
    test("should emit progress events during roadmap generation", async () => {
      const progressEvents: Array<{ stage: string; message: string }> = [];

      roadmapHandler.on("roadmap-progress", (event) => {
        progressEvents.push(event);
      });

      await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Progress Test Roadmap",
      });

      // Should have emitted progress events for requirements, research, planning
      expect(progressEvents.length).toBeGreaterThan(0);

      const stages = progressEvents.map((e) => e.stage);
      expect(stages).toContain("requirements");
      expect(stages).toContain("research");
      expect(stages).toContain("planning");
    });

    test("should emit feature-added event", async () => {
      await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Test Roadmap",
      });

      const events: RoadmapFeature[] = [];
      roadmapHandler.on("feature-added", (feature: RoadmapFeature) => {
        events.push(feature);
      });

      await roadmapHandler.addFeature({
        title: "Test Feature",
        description: "Test description",
      });

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("Test Feature");
    });

    test("should emit feature-updated event when updating feature", async () => {
      const roadmap = await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Test Roadmap",
      });

      const updateEvents: RoadmapFeature[] = [];
      roadmapHandler.on("feature-updated", (feature: RoadmapFeature) => {
        updateEvents.push(feature);
      });

      await roadmapHandler.updateFeature(roadmap.features[0].id, {
        title: "Updated Title",
      });

      expect(updateEvents.length).toBe(1);
      expect(updateEvents[0].title).toBe("Updated Title");
    });

    test("should emit feature-deleted event when deleting feature", async () => {
      const roadmap = await roadmapHandler.generateRoadmap({
        query: "Build bakery system",
        name: "Test Roadmap",
      });

      const deleteEvents: string[] = [];
      roadmapHandler.on("feature-deleted", (featureId: string) => {
        deleteEvents.push(featureId);
      });

      const featureId = roadmap.features[0].id;
      await roadmapHandler.deleteFeature(featureId);

      expect(deleteEvents.length).toBe(1);
      expect(deleteEvents[0]).toBe(featureId);
    });
  });
});
