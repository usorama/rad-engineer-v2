/**
 * Unit tests for PlanningAPIHandler
 *
 * Tests:
 * - 10 IPC channel handlers (startIntake, submitAnswers, startResearch, etc.)
 * - 4 real-time event emissions (intake-progress, research-agent-update, etc.)
 * - Mock implementations (placeholder data for Phase 1)
 * - Event broadcasting integration
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PlanningAPIHandler } from "@/ui-adapter/PlanningAPIHandler.js";
import type { PlanningAPIHandlerConfig } from "@/ui-adapter/PlanningAPIHandler.js";
import { promises as fs } from "fs";
import { join } from "path";

describe("PlanningAPIHandler: Initialization", () => {
  let handler: PlanningAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-planning-handler");
    await fs.mkdir(tempDir, { recursive: true });

    const config: PlanningAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };
    handler = new PlanningAPIHandler(config);
  });

  afterEach(async () => {
    handler.removeAllListeners();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Initializes with provided config", () => {
    expect(handler).toBeDefined();
  });

  it("Logs debug messages when debug enabled", () => {
    const config: PlanningAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };

    const debugHandler = new PlanningAPIHandler(config);
    expect(debugHandler).toBeDefined();
  });
});

describe("PlanningAPIHandler: startIntake", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Starts intake workflow and returns success", async () => {
    const result = await handler.startIntake();

    expect(result.success).toBe(true);
    expect(result.sessionId).toMatch(/^intake-session-\d+$/);
  });

  it("Returns initial questions", async () => {
    const result = await handler.startIntake();

    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.questions!.length).toBeGreaterThan(0);
  });

  it("Emits intake-progress event", async () => {
    const progressEvents: unknown[] = [];
    handler.on("intake-progress", (event) => {
      progressEvents.push(event);
    });

    await handler.startIntake();

    expect(progressEvents.length).toBeGreaterThan(0);
    expect((progressEvents[0] as any).sessionId).toBeTruthy();
    expect((progressEvents[0] as any).progress).toBeGreaterThanOrEqual(0);
    expect((progressEvents[0] as any).message).toBeTruthy();
  });
});

describe("PlanningAPIHandler: submitAnswers", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Submits answers and returns success", async () => {
    // Start intake first to create session
    const { sessionId } = await handler.startIntake();
    const answers = {
      q1: "Answer 1",
      q2: "Answer 2",
    };

    const result = await handler.submitAnswers(sessionId, answers);

    expect(result.success).toBe(true);
    expect(result.nextQuestions).toBeDefined();
  });

  it("Returns next questions if intake incomplete", async () => {
    // Start intake first
    const { sessionId } = await handler.startIntake();
    const answers = { q1: "Answer 1" };

    const result = await handler.submitAnswers(sessionId, answers);

    expect(result.complete).toBe(false);
    expect(result.nextQuestions).toBeDefined();
    expect(Array.isArray(result.nextQuestions)).toBe(true);
  });

  it("Marks intake as complete when all questions answered", async () => {
    // Start intake first
    const { sessionId } = await handler.startIntake();
    const answers = {
      q1: "Full requirements",
      q2: "Complete specifications",
      q3: "All details provided",
    };

    const result = await handler.submitAnswers(sessionId, answers);

    expect(result.complete).toBe(true);
    expect(result.nextQuestions).toBeUndefined();
  });

  it("Emits intake-progress event", async () => {
    const progressEvents: unknown[] = [];
    handler.on("intake-progress", (event) => {
      progressEvents.push(event);
    });

    // Start intake first
    const { sessionId } = await handler.startIntake();
    await handler.submitAnswers(sessionId, { q1: "Answer" });

    expect(progressEvents.length).toBeGreaterThan(0);
    expect((progressEvents[0] as any).sessionId).toBe(sessionId);
  });
});

describe("PlanningAPIHandler: getQuestions", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns current questions for session", async () => {
    // Start intake first
    const { sessionId } = await handler.startIntake();

    const result = await handler.getQuestions(sessionId);

    expect(result.success).toBe(true);
    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
  });

  it("Returns error for non-existent session", async () => {
    const result = await handler.getQuestions("non-existent");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("PlanningAPIHandler: startResearch", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Starts research phase and returns success", async () => {
    const sessionId = "test-session-123";

    const result = await handler.startResearch(sessionId);

    expect(result.success).toBe(true);
    expect(result.researchId).toBeTruthy();
  });

  it("Returns research agents information", async () => {
    const sessionId = "test-session-123";

    const result = await handler.startResearch(sessionId);

    expect(result.agents).toBeDefined();
    expect(Array.isArray(result.agents)).toBe(true);
    expect(result.agents!.length).toBeGreaterThan(0);
  });

  it("Emits research-agent-update event", async () => {
    const agentEvents: unknown[] = [];
    handler.on("research-agent-update", (event) => {
      agentEvents.push(event);
    });

    await handler.startResearch("test-session");

    // Wait for async events
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(agentEvents.length).toBeGreaterThan(0);
    expect((agentEvents[0] as any).agentId).toBeTruthy();
    expect((agentEvents[0] as any).status).toBeTruthy();
  });

  it("Emits research-complete event when done", async () => {
    const completeEvents: unknown[] = [];
    handler.on("research-complete", (event) => {
      completeEvents.push(event);
    });

    await handler.startResearch("test-session");

    // Wait for async completion
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(completeEvents.length).toBeGreaterThan(0);
    expect((completeEvents[0] as any).sessionId).toBeTruthy();
    expect((completeEvents[0] as any).findings).toBeDefined();
  });
});

describe("PlanningAPIHandler: getResearchStatus", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns research status", async () => {
    const researchId = "research-123";

    const result = await handler.getResearchStatus(researchId);

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    if (result.status) {
      expect(["pending", "in_progress", "completed", "failed"]).toContain(result.status);
    }
  });

  it("Returns agent progress", async () => {
    const researchId = "research-123";

    const result = await handler.getResearchStatus(researchId);

    expect(result.agents).toBeDefined();
    expect(Array.isArray(result.agents)).toBe(true);
  });
});

describe("PlanningAPIHandler: getResearchFindings", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns research findings", async () => {
    // Start research and wait for completion
    const { researchId } = await handler.startResearch("test-session");

    // Wait for research to complete
    await new Promise((resolve) => setTimeout(resolve, 250));

    const result = await handler.getResearchFindings(researchId!);

    expect(result.success).toBe(true);
    expect(result.findings).toBeDefined();
  });

  it("Returns error if research not completed", async () => {
    // Start research but don't wait for completion
    const { researchId } = await handler.startResearch("test-session");

    const result = await handler.getResearchFindings(researchId!);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not completed");
  });
});

describe("PlanningAPIHandler: generatePlan", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Generates plan from session data", async () => {
    const sessionId = "test-session-123";

    const result = await handler.generatePlan(sessionId);

    expect(result.success).toBe(true);
    expect(result.planId).toBeTruthy();
  });

  it("Returns generated plan structure", async () => {
    const sessionId = "test-session-123";

    const result = await handler.generatePlan(sessionId);

    expect(result.plan).toBeDefined();
    expect(result.plan!.waves).toBeDefined();
    expect(Array.isArray(result.plan!.waves)).toBe(true);
  });

  it("Emits plan-generated event", async () => {
    const planEvents: unknown[] = [];
    handler.on("plan-generated", (event) => {
      planEvents.push(event);
    });

    await handler.generatePlan("test-session");

    expect(planEvents.length).toBeGreaterThan(0);
    expect((planEvents[0] as any).planId).toBeTruthy();
    expect((planEvents[0] as any).plan).toBeDefined();
  });
});

describe("PlanningAPIHandler: validatePlan", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Validates plan structure", async () => {
    const planId = "plan-123";

    const result = await handler.validatePlan(planId);

    expect(result.success).toBe(true);
    expect(result.valid).toBeDefined();
  });

  it("Returns validation errors if invalid", async () => {
    const planId = "invalid-plan";

    const result = await handler.validatePlan(planId);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("Returns validation warnings", async () => {
    const planId = "plan-123";

    const result = await handler.validatePlan(planId);

    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

describe("PlanningAPIHandler: savePlan", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Saves plan to storage", async () => {
    // Generate plan first
    const { planId } = await handler.generatePlan("test-session");

    const result = await handler.savePlan(planId!);

    expect(result.success).toBe(true);
    expect(result.savedPath).toBeTruthy();
  });

  it("Returns error if plan not found", async () => {
    const result = await handler.savePlan("non-existent");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("PlanningAPIHandler: updatePlan", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Updates plan with changes", async () => {
    const planId = "plan-123";
    const updates = {
      waves: [{ id: "wave-1", name: "Wave 1", tasks: [] }],
    };

    const result = await handler.updatePlan(planId, updates);

    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
  });

  it("Returns updated plan", async () => {
    const planId = "plan-123";
    const updates = { description: "Updated description" };

    const result = await handler.updatePlan(planId, updates);

    expect(result.plan).toBeDefined();
  });

  it("Emits plan-generated event on update", async () => {
    const planEvents: unknown[] = [];
    handler.on("plan-generated", (event) => {
      planEvents.push(event);
    });

    await handler.updatePlan("plan-123", { description: "Updated" });

    expect(planEvents.length).toBeGreaterThan(0);
  });
});

describe("PlanningAPIHandler: Error Handling", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Handles invalid session ID gracefully", async () => {
    const result = await handler.submitAnswers("", {});

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Handles missing research ID", async () => {
    const result = await handler.getResearchStatus("");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("Handles validation of non-existent plan", async () => {
    const result = await handler.validatePlan("non-existent");

    expect(result.success).toBe(true); // Validation succeeds but marks invalid
    expect(result.valid).toBe(false);
  });
});

describe("PlanningAPIHandler: Event Broadcasting", () => {
  let handler: PlanningAPIHandler;

  beforeEach(() => {
    handler = new PlanningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Supports multiple listeners for same event", async () => {
    const listener1Events: unknown[] = [];
    const listener2Events: unknown[] = [];

    handler.on("intake-progress", (event) => listener1Events.push(event));
    handler.on("intake-progress", (event) => listener2Events.push(event));

    await handler.startIntake();

    expect(listener1Events.length).toBeGreaterThan(0);
    expect(listener2Events.length).toBeGreaterThan(0);
    expect(listener1Events.length).toBe(listener2Events.length);
  });

  it("Allows removing event listeners", async () => {
    const events: unknown[] = [];
    const listener = (event: unknown) => events.push(event);

    handler.on("intake-progress", listener);
    await handler.startIntake();

    const eventsAfterFirst = events.length;

    handler.off("intake-progress", listener);
    await handler.startIntake();

    expect(events.length).toBe(eventsAfterFirst); // No new events
  });

  it("Cleans up all listeners", async () => {
    handler.on("intake-progress", () => {});
    handler.on("research-agent-update", () => {});

    expect(handler.listenerCount("intake-progress")).toBeGreaterThan(0);

    handler.removeAllListeners();

    expect(handler.listenerCount("intake-progress")).toBe(0);
    expect(handler.listenerCount("research-agent-update")).toBe(0);
  });
});
