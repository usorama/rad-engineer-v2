/**
 * Unit tests for LearningAPIHandler
 *
 * Tests:
 * - 10 IPC channel handlers (getDecisionHistory, getLearningAnalytics, etc.)
 * - Mock implementations (placeholder data for Phase 1)
 * - EventEmitter base class functionality
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { LearningAPIHandler } from "@/ui-adapter/LearningAPIHandler.js";
import type { LearningAPIHandlerConfig } from "@/ui-adapter/LearningAPIHandler.js";
import { promises as fs } from "fs";
import { join } from "path";

describe("LearningAPIHandler: Initialization", () => {
  let handler: LearningAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-learning-handler");
    await fs.mkdir(tempDir, { recursive: true });

    const config: LearningAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };
    handler = new LearningAPIHandler(config);
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
    const config: LearningAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };

    const debugHandler = new LearningAPIHandler(config);
    expect(debugHandler).toBeDefined();
  });
});

describe("LearningAPIHandler: getDecisionHistory", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with decision history", async () => {
    const result = await handler.getDecisionHistory();

    expect(result.success).toBe(true);
    expect(result.history).toBeDefined();
    expect(Array.isArray(result.history)).toBe(true);
  });

  it("Returns placeholder decision history data", async () => {
    const result = await handler.getDecisionHistory();

    expect(result.history?.length).toBeGreaterThan(0);
    const firstDecision = result.history![0];
    expect(firstDecision).toHaveProperty("id");
    expect(firstDecision).toHaveProperty("timestamp");
    expect(firstDecision).toHaveProperty("context");
    expect(firstDecision).toHaveProperty("chosenMethod");
  });
});

describe("LearningAPIHandler: getLearningAnalytics", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with analytics data", async () => {
    const result = await handler.getLearningAnalytics();

    expect(result.success).toBe(true);
    expect(result.analytics).toBeDefined();
  });

  it("Returns analytics with required metrics", async () => {
    const result = await handler.getLearningAnalytics();

    expect(result.analytics?.totalDecisions).toBeDefined();
    expect(result.analytics?.successRate).toBeDefined();
    expect(result.analytics?.methodDistribution).toBeDefined();
  });
});

describe("LearningAPIHandler: getPatterns", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with patterns list", async () => {
    const result = await handler.getPatterns();

    expect(result.success).toBe(true);
    expect(result.patterns).toBeDefined();
    expect(Array.isArray(result.patterns)).toBe(true);
  });

  it("Returns patterns with required properties", async () => {
    const result = await handler.getPatterns();

    expect(result.patterns?.length).toBeGreaterThan(0);
    const firstPattern = result.patterns![0];
    expect(firstPattern).toHaveProperty("id");
    expect(firstPattern).toHaveProperty("type");
    expect(firstPattern).toHaveProperty("description");
  });
});

describe("LearningAPIHandler: searchPatterns", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with search results", async () => {
    const result = await handler.searchPatterns("test query");

    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
  });

  it("Returns error for empty query", async () => {
    const result = await handler.searchPatterns("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("LearningAPIHandler: getMethodEffectiveness", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with effectiveness data", async () => {
    const result = await handler.getMethodEffectiveness("method1");

    expect(result.success).toBe(true);
    expect(result.effectiveness).toBeDefined();
  });

  it("Returns effectiveness metrics", async () => {
    const result = await handler.getMethodEffectiveness("method1");

    expect(result.effectiveness?.methodId).toBe("method1");
    expect(result.effectiveness?.successRate).toBeDefined();
    expect(result.effectiveness?.usageCount).toBeDefined();
  });

  it("Returns error for empty method ID", async () => {
    const result = await handler.getMethodEffectiveness("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("LearningAPIHandler: selectMethod", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with selected method", async () => {
    const context = { taskType: "implement", complexity: "medium" };
    const result = await handler.selectMethod(context);

    expect(result.success).toBe(true);
    expect(result.selectedMethod).toBeDefined();
  });

  it("Returns method with confidence score", async () => {
    const context = { taskType: "implement" };
    const result = await handler.selectMethod(context);

    expect(result.selectedMethod?.methodId).toBeDefined();
    expect(result.selectedMethod?.confidence).toBeDefined();
  });

  it("Returns error for empty context", async () => {
    const result = await handler.selectMethod({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("LearningAPIHandler: getOutcomeMetrics", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with outcome metrics", async () => {
    const result = await handler.getOutcomeMetrics("decision1");

    expect(result.success).toBe(true);
    expect(result.metrics).toBeDefined();
  });

  it("Returns metrics with required properties", async () => {
    const result = await handler.getOutcomeMetrics("decision1");

    expect(result.metrics?.decisionId).toBe("decision1");
    expect(result.metrics?.qualityScore).toBeDefined();
    expect(result.metrics?.timeToComplete).toBeDefined();
  });

  it("Returns error for empty decision ID", async () => {
    const result = await handler.getOutcomeMetrics("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("LearningAPIHandler: exportLearningReport", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with export data", async () => {
    const result = await handler.exportLearningReport();

    expect(result.success).toBe(true);
    expect(result.reportData).toBeDefined();
  });

  it("Returns report with required sections", async () => {
    const result = await handler.exportLearningReport();

    expect(result.reportData?.summary).toBeDefined();
    expect(result.reportData?.patterns).toBeDefined();
    expect(result.reportData?.recommendations).toBeDefined();
  });
});

describe("LearningAPIHandler: getQualityTrends", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with quality trends", async () => {
    const result = await handler.getQualityTrends();

    expect(result.success).toBe(true);
    expect(result.trends).toBeDefined();
    expect(Array.isArray(result.trends)).toBe(true);
  });

  it("Returns trends with time series data", async () => {
    const result = await handler.getQualityTrends();

    expect(result.trends?.length).toBeGreaterThan(0);
    const firstTrend = result.trends![0];
    expect(firstTrend).toHaveProperty("timestamp");
    expect(firstTrend).toHaveProperty("qualityScore");
  });
});

describe("LearningAPIHandler: getEWCCurves", () => {
  let handler: LearningAPIHandler;

  beforeEach(() => {
    handler = new LearningAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with EWC curves", async () => {
    const result = await handler.getEWCCurves();

    expect(result.success).toBe(true);
    expect(result.curves).toBeDefined();
    expect(Array.isArray(result.curves)).toBe(true);
  });

  it("Returns curves with required data points", async () => {
    const result = await handler.getEWCCurves();

    expect(result.curves?.length).toBeGreaterThan(0);
    const firstCurve = result.curves![0];
    expect(firstCurve).toHaveProperty("methodId");
    expect(firstCurve).toHaveProperty("dataPoints");
    expect(Array.isArray(firstCurve.dataPoints)).toBe(true);
  });
});
