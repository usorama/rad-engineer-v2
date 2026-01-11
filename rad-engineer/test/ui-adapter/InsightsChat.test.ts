/**
 * Unit tests for InsightsAPIHandler
 *
 * Tests:
 * - Session management (create, get, delete)
 * - Message sending with streaming
 * - Decision context integration
 * - StateManager persistence
 * - Event emissions
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { InsightsAPIHandler } from "@/ui-adapter/InsightsAPIHandler.js";
import type { InsightsAPIHandlerConfig, ChatMessage, MessageChunk } from "@/ui-adapter/InsightsAPIHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import { DecisionLearningIntegration } from "@/execute/DecisionLearningIntegration.js";
import { DecisionLearningStore } from "@/decision/DecisionLearningStore.js";
import type { DecisionRecord } from "@/decision/DecisionLearningStore.js";
import { promises as fs } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Mock Anthropic SDK for testing
 */
function createMockAnthropicSDK() {
  return {
    messages: {
      create: mock(async (params: any) => {
        if (params.stream) {
          // Return async iterator for streaming
          return (async function* () {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "This is " },
            };
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "a test " },
            };
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "response." },
            };
          })();
        }
        return {
          content: [{ type: "text", text: "This is a test response." }],
        };
      }),
    },
  };
}

/**
 * Create test DecisionLearningIntegration with mock data
 */
function createTestDecisionLearning(tempDir: string): DecisionLearningIntegration {
  const integration = new DecisionLearningIntegration({
    decisionStorePath: join(tempDir, "decision-store.yaml"),
  });

  // Add some test decisions
  const store = (integration as any).decisionStore as DecisionLearningStore;

  store.storeDecision({
    id: "DEC-001",
    timestamp: Date.now(),
    component: "UserService",
    activity: "implementation",
    decision: "Use Repository Pattern for data access",
    context: {
      domain: "code",
      complexity: 0.6,
      constraints: [],
      stakeholders: [],
    },
    reasoningMethod: {
      name: "First Principles",
      category: "Core",
      parameters: {},
    },
    confidence: 0.8,
    importanceWeights: [0.5, 0.3, 0.2],
  });

  store.learnFromOutcome({
    decisionId: "DEC-001",
    success: true,
    quality: 0.9,
    latency: 1000,
    errors: [],
    userFeedback: "Good choice",
  });

  return integration;
}

describe("InsightsAPIHandler: createSession", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);

    // Mock Anthropic constructor
    const originalAnthropicConstructor = Anthropic;
    (global as any).Anthropic = function (config: any) {
      return createMockAnthropicSDK();
    };

    const config: InsightsAPIHandlerConfig = {
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    };
    handler = new InsightsAPIHandler(config);

    // Restore Anthropic after handler creation
    (global as any).Anthropic = originalAnthropicConstructor;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Creates session with generated unique ID", async () => {
    const session = await handler.createSession("Test Session");

    expect(session.id).toMatch(/^session-\d+-\d+$/);
    expect(session.title).toBe("Test Session");
    expect(session.messages).toEqual([]);
    expect(session.metadata?.messageCount).toBe(0);
    expect(session.createdAt).toBeTruthy();
    expect(session.updatedAt).toBeTruthy();
  });

  it("Generates unique IDs for multiple sessions", async () => {
    const session1 = await handler.createSession("Session 1");
    await new Promise((resolve) => setTimeout(resolve, 2));
    const session2 = await handler.createSession("Session 2");

    expect(session1.id).not.toBe(session2.id);
  });

  it("Persists session to StateManager", async () => {
    const session = await handler.createSession("Persisted Session");

    // Create new handler to verify persistence
    const newHandler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });

    const retrievedSession = await newHandler.getSessionHistory(session.id);

    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.title).toBe("Persisted Session");
  });

  it("Emits session-created event", async () => {
    let emittedSession = null;

    handler.on("session-created", (session) => {
      emittedSession = session;
    });

    const session = await handler.createSession("Event Test");

    expect(emittedSession).not.toBeNull();
    expect((emittedSession as any).id).toBe(session.id);
  });
});

describe("InsightsAPIHandler: getSessionHistory", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);

    handler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns session by ID", async () => {
    const createdSession = await handler.createSession("Test Session");

    const retrievedSession = await handler.getSessionHistory(createdSession.id);

    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.id).toBe(createdSession.id);
    expect(retrievedSession?.title).toBe("Test Session");
  });

  it("Returns null for non-existent session", async () => {
    const session = await handler.getSessionHistory("non-existent-id");

    expect(session).toBeNull();
  });

  it("Returns session with messages", async () => {
    const session = await handler.createSession("Test Session");

    // Mock Anthropic for sendMessage
    (handler as any).anthropic = createMockAnthropicSDK();

    await handler.sendMessage(session.id, "Hello");

    const retrievedSession = await handler.getSessionHistory(session.id);

    expect(retrievedSession?.messages.length).toBeGreaterThan(0);
  });
});

describe("InsightsAPIHandler: getAllSessions", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);

    handler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns empty array when no sessions exist", async () => {
    const sessions = await handler.getAllSessions();

    expect(sessions).toEqual([]);
  });

  it("Returns all sessions sorted by updated time", async () => {
    const session1 = await handler.createSession("Session 1");
    await new Promise((resolve) => setTimeout(resolve, 2));
    const session2 = await handler.createSession("Session 2");
    await new Promise((resolve) => setTimeout(resolve, 2));
    const session3 = await handler.createSession("Session 3");

    const sessions = await handler.getAllSessions();

    expect(sessions).toHaveLength(3);
    expect(sessions[0].id).toBe(session3.id); // Newest first
    expect(sessions[1].id).toBe(session2.id);
    expect(sessions[2].id).toBe(session1.id);
  });
});

describe("InsightsAPIHandler: sendMessage", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);

    handler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });

    // Mock Anthropic SDK
    (handler as any).anthropic = createMockAnthropicSDK();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Adds user message to session", async () => {
    const session = await handler.createSession("Test Session");

    await handler.sendMessage(session.id, "Hello AI");

    const updatedSession = await handler.getSessionHistory(session.id);

    expect(updatedSession?.messages.length).toBeGreaterThanOrEqual(1);
    const userMessage = updatedSession?.messages.find((m) => m.role === "user");
    expect(userMessage?.content).toBe("Hello AI");
  });

  it("Adds assistant response to session", async () => {
    const session = await handler.createSession("Test Session");

    const assistantMessage = await handler.sendMessage(session.id, "Hello AI");

    expect(assistantMessage.role).toBe("assistant");
    expect(assistantMessage.content).toContain("test response");
  });

  it("Emits message chunks during streaming", async () => {
    const session = await handler.createSession("Test Session");
    const chunks: MessageChunk[] = [];

    handler.on("message-chunk", (chunk: MessageChunk) => {
      chunks.push(chunk);
    });

    await handler.sendMessage(session.id, "Stream test");

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => !c.done)).toBe(true); // At least one non-final chunk
    expect(chunks[chunks.length - 1].done).toBe(true); // Last chunk is final
  });

  it("Emits message-added events", async () => {
    const session = await handler.createSession("Test Session");
    const addedMessages: ChatMessage[] = [];

    handler.on("message-added", (message: ChatMessage) => {
      addedMessages.push(message);
    });

    await handler.sendMessage(session.id, "Event test");

    expect(addedMessages.length).toBeGreaterThanOrEqual(2); // User + assistant
    expect(addedMessages.some((m) => m.role === "user")).toBe(true);
    expect(addedMessages.some((m) => m.role === "assistant")).toBe(true);
  });

  it("Updates session metadata", async () => {
    const session = await handler.createSession("Test Session");

    await handler.sendMessage(session.id, "Metadata test");

    const updatedSession = await handler.getSessionHistory(session.id);

    expect(updatedSession?.metadata?.messageCount).toBeGreaterThan(0);
    expect(updatedSession?.metadata?.lastMessageAt).toBeTruthy();
  });

  it("Throws error for non-existent session", async () => {
    await expect(
      handler.sendMessage("non-existent-id", "Hello")
    ).rejects.toThrow("Session not found: non-existent-id");
  });

  it("Handles API errors gracefully", async () => {
    const session = await handler.createSession("Error Test");

    // Mock API error
    (handler as any).anthropic.messages.create = mock(async () => {
      throw new Error("API error");
    });

    const response = await handler.sendMessage(session.id, "Error test");

    expect(response.content).toContain("error");
  });

  it("Includes decision context in messages", async () => {
    const session = await handler.createSession("Context Test");

    // Track API calls to verify context
    let apiMessages: any[] = [];
    (handler as any).anthropic.messages.create = mock(async (params: any) => {
      apiMessages = params.messages;
      return (async function* () {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Response" },
        };
      })();
    });

    await handler.sendMessage(session.id, "Tell me about UserService repository implementation");

    // Should have context messages before user message (context + assistant ack + user message)
    expect(apiMessages.length).toBeGreaterThanOrEqual(1);
    // Check if context was included (should have decision info)
    const hasContextMessage = apiMessages.some((m: any) => m.content.includes("decision history"));
    expect(hasContextMessage).toBe(true);
  });

  it("Persists messages to StateManager", async () => {
    const session = await handler.createSession("Persistence Test");

    await handler.sendMessage(session.id, "Persist this");

    // Create new handler to verify persistence
    const newHandler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });

    const retrievedSession = await newHandler.getSessionHistory(session.id);

    expect(retrievedSession?.messages.length).toBeGreaterThan(0);
  });
});

describe("InsightsAPIHandler: deleteSession", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);

    handler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Deletes existing session", async () => {
    const session = await handler.createSession("Delete Test");

    const deleted = await handler.deleteSession(session.id);

    expect(deleted).toBe(true);

    const retrievedSession = await handler.getSessionHistory(session.id);
    expect(retrievedSession).toBeNull();
  });

  it("Returns false for non-existent session", async () => {
    const deleted = await handler.deleteSession("non-existent-id");

    expect(deleted).toBe(false);
  });

  it("Persists deletion to StateManager", async () => {
    const session = await handler.createSession("Persist Delete");

    await handler.deleteSession(session.id);

    // Create new handler to verify persistence
    const newHandler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });

    const retrievedSession = await newHandler.getSessionHistory(session.id);
    expect(retrievedSession).toBeNull();
  });
});

describe("InsightsAPIHandler: decision context integration", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);

    handler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
    });

    // Mock Anthropic SDK
    (handler as any).anthropic = createMockAnthropicSDK();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Gathers decision context from DecisionLearningStore", async () => {
    const session = await handler.createSession("Context Test");

    // Access private method for testing
    const context = await (handler as any).gatherDecisionContext("Tell me about UserService");

    expect(context.length).toBeGreaterThan(0);
    expect(context[0].decision).toContain("UserService");
  });

  it("Filters decisions by keywords", async () => {
    const session = await handler.createSession("Filter Test");

    const context = await (handler as any).gatherDecisionContext("repository pattern");

    expect(context.length).toBeGreaterThan(0);
    expect(context[0].decision.toLowerCase()).toContain("repository");
  });

  it("Includes decision outcomes in context", async () => {
    const session = await handler.createSession("Outcome Test");

    const context = await (handler as any).gatherDecisionContext("UserService implementation");

    expect(context.length).toBeGreaterThan(0);
    expect(context[0].outcome).toBeTruthy();
    expect(context[0].outcome).toContain("Success");
  });

  it("Limits context to max 10 decisions", async () => {
    // Add many decisions
    const store = (decisionLearning as any).decisionStore as DecisionLearningStore;
    for (let i = 0; i < 15; i++) {
      store.storeDecision({
        id: `DEC-${i}`,
        timestamp: Date.now(),
        component: "TestComponent",
        activity: "test",
        decision: `Test decision ${i}`,
        context: {
          domain: "code",
          complexity: 0.5,
          constraints: [],
          stakeholders: [],
        },
        reasoningMethod: {
          name: "First Principles",
          category: "Core",
          parameters: {},
        },
        confidence: 0.8,
        importanceWeights: [0.5, 0.3, 0.2],
      });

      store.learnFromOutcome({
        decisionId: `DEC-${i}`,
        success: true,
        quality: 0.8,
        errors: [],
      });
    }

    const context = await (handler as any).gatherDecisionContext("test");

    expect(context.length).toBeLessThanOrEqual(10);
  });

  it("Handles empty decision store gracefully", async () => {
    // Create handler with empty decision store
    const emptyDecisionLearning = new DecisionLearningIntegration({
      decisionStorePath: join(tempDir, "empty-store.yaml"),
    });

    const emptyHandler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning: emptyDecisionLearning,
      apiKey: "test-key",
    });

    (emptyHandler as any).anthropic = createMockAnthropicSDK();

    const session = await emptyHandler.createSession("Empty Context");
    const response = await emptyHandler.sendMessage(session.id, "Hello");

    expect(response).toBeTruthy();
  });
});

describe("InsightsAPIHandler: debug mode", () => {
  let handler: InsightsAPIHandler;
  let stateManager: StateManager;
  let decisionLearning: DecisionLearningIntegration;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-insights-handler-checkpoints");
    await fs.mkdir(tempDir, { recursive: true });
    stateManager = new StateManager({ checkpointsDir: tempDir });
    decisionLearning = createTestDecisionLearning(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Logs debug messages when debug enabled", async () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    handler = new InsightsAPIHandler({
      projectDir: "/test/project",
      stateManager,
      decisionLearning,
      apiKey: "test-key",
      debug: true,
    });

    (handler as any).anthropic = createMockAnthropicSDK();

    const session = await handler.createSession("Debug Test");
    await handler.sendMessage(session.id, "Test message");

    console.log = originalLog;

    const initLog = logs.find((log) => log.includes("Initialized for project"));
    const createLog = logs.find((log) => log.includes("Created session"));
    const saveLog = logs.find((log) => log.includes("Saved checkpoint"));

    expect(initLog).toBeTruthy();
    expect(createLog).toBeTruthy();
    expect(saveLog).toBeTruthy();
  });
});
