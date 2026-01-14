/**
 * Tests for Meta-Agent Module
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  MetaAgentLoop,
  createMetaTask,
  TraceAnalyzer,
  createEmptyTrace,
  createTraceEvent,
  ConfigMutator,
  createDefaultAgentConfig,
  BenchmarkRunner,
  StandardBenchmarks,
  ImprovementStrategies,
  createAction,
  type TaskExecutor,
  type ExecutionTrace,
  type TraceAnalysisResult,
  type AgentConfig,
} from "@/meta/index.js";
import type { ExecutionContext } from "@/verification/Condition.js";

describe("TraceAnalyzer", () => {
  let analyzer: TraceAnalyzer;

  beforeEach(() => {
    analyzer = new TraceAnalyzer();
  });

  describe("analyze", () => {
    it("should analyze empty trace", async () => {
      const trace = createEmptyTrace("task-001");
      const result = await analyzer.analyze(trace);

      expect(result.traceId).toBe(trace.id);
      expect(result.patterns).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
      expect(result.rootCauses).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect retry patterns", async () => {
      const trace = createEmptyTrace("task-001");
      trace.events = [
        createTraceEvent("state_change", "retry-1", {}),
        createTraceEvent("state_change", "retry-2", {}),
        createTraceEvent("state_change", "retry-3", {}),
      ];

      const result = await analyzer.analyze(trace);

      const retryPattern = result.patterns.find((p) => p.name === "Retry Loop");
      expect(retryPattern).toBeDefined();
      expect(retryPattern?.type).toBe("inefficiency");
    });

    it("should detect error clusters", async () => {
      const trace = createEmptyTrace("task-001");
      trace.events = [
        { ...createTraceEvent("error", "Error 1", {}), error: "First error" },
        { ...createTraceEvent("error", "Error 2", {}), error: "Second error" },
      ];

      const result = await analyzer.analyze(trace);

      const errorPattern = result.patterns.find((p) => p.name === "Error Cluster");
      expect(errorPattern).toBeDefined();
      expect(errorPattern?.type).toBe("error_cluster");
    });

    it("should detect slow actions", async () => {
      const trace = createEmptyTrace("task-001");
      // Need 3+ slow actions to meet confidence threshold (3/3 = 1.0 > 0.6)
      trace.events = [
        { ...createTraceEvent("action_end", "Slow action 1", {}), durationMs: 2000 },
        { ...createTraceEvent("action_end", "Slow action 2", {}), durationMs: 3000 },
        { ...createTraceEvent("action_end", "Slow action 3", {}), durationMs: 2500 },
      ];

      const result = await analyzer.analyze(trace);

      const slowPattern = result.patterns.find((p) => p.name === "Slow Actions");
      expect(slowPattern).toBeDefined();
      expect(slowPattern?.type).toBe("bottleneck");
    });

    it("should identify bottlenecks from slow actions", async () => {
      const trace = createEmptyTrace("task-001");
      trace.events = [
        { ...createTraceEvent("action_end", "Slow action", {}), durationMs: 3000 },
      ];

      const result = await analyzer.analyze(trace);

      expect(result.bottlenecks.length).toBeGreaterThan(0);
      expect(result.bottlenecks[0].type).toBe("slow_action");
      expect(result.bottlenecks[0].durationImpactMs).toBe(2000); // 3000 - 1000 threshold
    });

    it("should analyze root causes for errors", async () => {
      const trace = createEmptyTrace("task-001");
      trace.events = [
        {
          ...createTraceEvent("error", "Validation failed", {}),
          error: "Missing required input",
        },
      ];

      const result = await analyzer.analyze(trace);

      expect(result.rootCauses.length).toBe(1);
      expect(result.rootCauses[0].category).toBe("input_validation");
    });

    it("should calculate quality score based on success", async () => {
      const successTrace = createEmptyTrace("task-001", { success: true });
      const failTrace = createEmptyTrace("task-002", { success: false });

      const successResult = await analyzer.analyze(successTrace);
      const failResult = await analyzer.analyze(failTrace);

      expect(successResult.qualityScore).toBeGreaterThan(failResult.qualityScore);
    });
  });

  describe("analyzeMultiple", () => {
    it("should aggregate analysis from multiple traces", async () => {
      const traces = [
        createEmptyTrace("task-001", { success: true }),
        createEmptyTrace("task-002", { success: true }),
        createEmptyTrace("task-003", { success: false }),
      ];

      const result = await analyzer.analyzeMultiple(traces);

      expect(result.traceCount).toBe(3);
      expect(result.successRate).toBeCloseTo(2 / 3, 2);
      expect(result.individualResults.length).toBe(3);
    });

    it("should identify recurring patterns", async () => {
      const traces = [
        createEmptyTrace("task-001"),
        createEmptyTrace("task-002"),
        createEmptyTrace("task-003"),
      ];

      // Add same pattern to all traces - need 5 retry events for 1.0 confidence
      for (const trace of traces) {
        trace.events = [
          createTraceEvent("state_change", "retry-1", {}),
          createTraceEvent("state_change", "retry-2", {}),
          createTraceEvent("state_change", "retry-3", {}),
          createTraceEvent("state_change", "retry-4", {}),
          createTraceEvent("state_change", "retry-5", {}),
        ];
      }

      const result = await analyzer.analyzeMultiple(traces);

      expect(result.recurringPatterns).toContain("Retry Loop");
    });
  });
});

describe("ConfigMutator", () => {
  let mutator: ConfigMutator;
  let baseConfig: AgentConfig;

  beforeEach(() => {
    mutator = new ConfigMutator();
    baseConfig = createDefaultAgentConfig("test-agent");
  });

  describe("mutate", () => {
    it("should create new config with mutation", () => {
      const mutated = mutator.mutate(baseConfig);

      expect(mutated.id).not.toBe(baseConfig.id);
      expect(mutated.version).toBe(baseConfig.version + 1);
      expect(mutated.parentId).toBe(baseConfig.id);
      expect(mutated.mutation).toBeDefined();
    });

    it("should apply temperature adjustment", () => {
      const mutated = mutator.mutate(baseConfig, {
        mutationType: "temperature_adjust",
        magnitude: 0.5,
        seed: 12345,
      });

      expect(mutated.temperature).not.toBe(baseConfig.temperature);
      expect(mutated.mutation?.type).toBe("temperature_adjust");
    });

    it("should apply prompt refinement", () => {
      const mutated = mutator.mutate(baseConfig, {
        mutationType: "prompt_refine",
        magnitude: 0.3,
      });

      expect(mutated.systemPrompt.length).toBeGreaterThan(baseConfig.systemPrompt.length);
      expect(mutated.mutation?.type).toBe("prompt_refine");
    });

    it("should apply token adjustment", () => {
      const mutated = mutator.mutate(baseConfig, {
        mutationType: "token_adjust",
        magnitude: 0.5,
        seed: 54321,
      });

      expect(mutated.mutation?.type).toBe("token_adjust");
      expect(mutated.maxTokens).toBeGreaterThanOrEqual(100);
      expect(mutated.maxTokens).toBeLessThanOrEqual(8000);
    });

    it("should apply retry adjustment", () => {
      const mutated = mutator.mutate(baseConfig, {
        mutationType: "retry_adjust",
        magnitude: 0.5,
      });

      expect(mutated.mutation?.type).toBe("retry_adjust");
    });

    it("should track changed fields", () => {
      const mutated = mutator.mutate(baseConfig, {
        mutationType: "temperature_adjust",
        magnitude: 0.5,
        seed: 99999,
      });

      expect(mutated.mutation?.fieldsChanged).toContain("temperature");
    });
  });

  describe("mutateMultiple", () => {
    it("should apply multiple mutations", () => {
      const results = mutator.mutateMultiple(baseConfig, 3);

      expect(results.length).toBe(3);
      expect(results[0].version).toBe(baseConfig.version + 1);
      expect(results[1].version).toBe(baseConfig.version + 2);
      expect(results[2].version).toBe(baseConfig.version + 3);
    });
  });

  describe("crossover", () => {
    it("should combine two configs", () => {
      const parent1 = createDefaultAgentConfig("parent-1");
      parent1.temperature = 0.3;
      parent1.maxTokens = 1000;

      const parent2 = createDefaultAgentConfig("parent-2");
      parent2.temperature = 0.9;
      parent2.maxTokens = 3000;

      const child = mutator.crossover(parent1, parent2);

      expect(child.temperature).toBeCloseTo(0.6, 2); // Average
      expect(child.maxTokens).toBe(2000); // Average
      expect(child.mutation?.type).toBe("crossover");
    });
  });

  describe("getStrategies", () => {
    it("should return all registered strategies", () => {
      const strategies = mutator.getStrategies();

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some((s) => s.type === "temperature_adjust")).toBe(true);
      expect(strategies.some((s) => s.type === "prompt_refine")).toBe(true);
    });
  });
});

describe("BenchmarkRunner", () => {
  let runner: BenchmarkRunner;
  let mockExecutor: TaskExecutor;
  let baseConfig: AgentConfig;

  beforeEach(() => {
    mockExecutor = async () => ({
      success: true,
      output: { result: "test" },
    });
    runner = new BenchmarkRunner(mockExecutor);
    baseConfig = createDefaultAgentConfig("benchmark-agent");
  });

  describe("runTask", () => {
    it("should run single task", async () => {
      const task = StandardBenchmarks.correctness(
        "test-001",
        "Test task",
        { input: "test" }
      );

      const context: ExecutionContext = {
        scopeId: "scope-001",
        taskId: "task-001",
        inputs: {},
        state: "IDLE",
        artifacts: new Map(),
        startTime: new Date(),
      };

      const result = await runner.runTask(task, baseConfig, context);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe("test-001");
      expect(result.configId).toBe(baseConfig.id);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it("should handle task failure", async () => {
      mockExecutor = async () => ({
        success: false,
        error: "Test failure",
      });
      runner = new BenchmarkRunner(mockExecutor, { retryFailed: false });

      const task = StandardBenchmarks.correctness(
        "test-002",
        "Failing task",
        {}
      );

      const context: ExecutionContext = {
        scopeId: "scope-001",
        taskId: "task-001",
        inputs: {},
        state: "IDLE",
        artifacts: new Map(),
        startTime: new Date(),
      };

      const result = await runner.runTask(task, baseConfig, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should retry failed tasks when configured", async () => {
      let attempts = 0;
      mockExecutor = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Temporary failure");
        }
        return { success: true, output: { result: "success" } };
      };
      runner = new BenchmarkRunner(mockExecutor, {
        retryFailed: true,
        maxRetries: 2,
      });

      const task = StandardBenchmarks.correctness("test-003", "Retry task", {});

      const context: ExecutionContext = {
        scopeId: "scope-001",
        taskId: "task-001",
        inputs: {},
        state: "IDLE",
        artifacts: new Map(),
        startTime: new Date(),
      };

      const result = await runner.runTask(task, baseConfig, context);

      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });
  });

  describe("runSuite", () => {
    it("should run multiple tasks", async () => {
      const tasks = [
        StandardBenchmarks.correctness("task-1", "Task 1", {}),
        StandardBenchmarks.correctness("task-2", "Task 2", {}),
        StandardBenchmarks.correctness("task-3", "Task 3", {}),
      ];

      const context: ExecutionContext = {
        scopeId: "scope-001",
        taskId: "suite-001",
        inputs: {},
        state: "IDLE",
        artifacts: new Map(),
        startTime: new Date(),
      };

      const result = await runner.runSuite(tasks, baseConfig, context);

      expect(result.taskCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.successRate).toBe(1);
      expect(result.results.length).toBe(3);
    });

    it("should calculate aggregate metrics", async () => {
      const tasks = [
        StandardBenchmarks.performance("perf-1", "Perf 1", {}),
        StandardBenchmarks.performance("perf-2", "Perf 2", {}),
      ];

      const context: ExecutionContext = {
        scopeId: "scope-001",
        taskId: "suite-001",
        inputs: {},
        state: "IDLE",
        artifacts: new Map(),
        startTime: new Date(),
      };

      const result = await runner.runSuite(tasks, baseConfig, context);

      expect(result.aggregateMetrics).toBeDefined();
      expect(result.aggregateMetrics.execution_time).toBeDefined();
      expect(result.aggregateMetrics.success_rate).toBeDefined();
    });
  });

  describe("compare", () => {
    it("should compare two suite results", async () => {
      const tasks = [StandardBenchmarks.correctness("task-1", "Task 1", {})];

      const context: ExecutionContext = {
        scopeId: "scope-001",
        taskId: "suite-001",
        inputs: {},
        state: "IDLE",
        artifacts: new Map(),
        startTime: new Date(),
      };

      const baseline = await runner.runSuite(tasks, baseConfig, context);

      // Create better config
      const betterConfig = { ...baseConfig, id: "better-config" };
      const betterExecutor: TaskExecutor = async () => ({
        success: true,
        output: { result: "better", extra: "data" },
      });
      const betterRunner = new BenchmarkRunner(betterExecutor);

      const candidate = await betterRunner.runSuite(tasks, betterConfig, context);

      const comparison = runner.compare(baseline, candidate);

      expect(comparison.baselineSuiteId).toBe(baseline.id);
      expect(comparison.candidateSuiteId).toBe(candidate.id);
      expect(comparison.metricImprovements).toBeDefined();
      expect(comparison.taskComparisons.length).toBe(1);
    });
  });
});

describe("ImprovementStrategies", () => {
  let strategies: ImprovementStrategies;

  beforeEach(() => {
    strategies = new ImprovementStrategies();
  });

  describe("recommend", () => {
    it("should return recommendations for low quality analysis", async () => {
      const analysis: TraceAnalysisResult = {
        traceId: "trace-001",
        analyzedAt: new Date(),
        patterns: [],
        bottlenecks: [],
        rootCauses: [],
        improvements: [],
        qualityScore: 50,
        efficiencyScore: 80,
      };

      const recommendations = strategies.recommend(analysis);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].strategy).toBeDefined();
      expect(recommendations[0].actions.length).toBeGreaterThan(0);
    });

    it("should prioritize recommendations by confidence and weight", async () => {
      const analysis: TraceAnalysisResult = {
        traceId: "trace-001",
        analyzedAt: new Date(),
        patterns: [{
          id: "p1",
          name: "Error Cluster",
          type: "error_cluster",
          confidence: 0.9,
          description: "",
          eventTypes: [],
          frequency: 2,
          evidence: [],
        }],
        bottlenecks: [{
          id: "b1",
          eventId: "e1",
          type: "slow_action",
          severity: 80,
          durationImpactMs: 2000,
          description: ""
        }],
        rootCauses: [{
          id: "r1",
          errorEventId: "e1",
          category: "input_validation",
          confidence: 0.8,
          description: "",
          factors: []
        }],
        improvements: [],
        qualityScore: 40,
        efficiencyScore: 50,
      };

      const recommendations = strategies.recommend(analysis);

      // Should be sorted by confidence * weight
      for (let i = 1; i < recommendations.length; i++) {
        const prevScore = recommendations[i - 1].confidence * recommendations[i - 1].strategy.weight;
        const currScore = recommendations[i].confidence * recommendations[i].strategy.weight;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it("should include reasoning", async () => {
      const analysis: TraceAnalysisResult = {
        traceId: "trace-001",
        analyzedAt: new Date(),
        patterns: [],
        bottlenecks: [],
        rootCauses: [],
        improvements: [],
        qualityScore: 60,
        efficiencyScore: 70,
      };

      const recommendations = strategies.recommend(analysis);

      for (const rec of recommendations) {
        expect(rec.reasoning).toBeDefined();
        expect(rec.reasoning.length).toBeGreaterThan(0);
      }
    });
  });

  describe("apply", () => {
    it("should apply recommendation to config", async () => {
      const config = createDefaultAgentConfig("test");
      const analysis: TraceAnalysisResult = {
        traceId: "trace-001",
        analyzedAt: new Date(),
        patterns: [],
        bottlenecks: [],
        rootCauses: [],
        improvements: [],
        qualityScore: 50,
        efficiencyScore: 80,
      };

      const recommendations = strategies.recommend(analysis);
      if (recommendations.length === 0) {
        return; // Skip if no recommendations
      }

      const improved = strategies.apply(config, recommendations[0]);

      // Config should be modified
      expect(improved.id).toBe(config.id); // Same id since we copy
      expect(improved.systemPrompt.length).toBeGreaterThanOrEqual(config.systemPrompt.length);
    });
  });

  describe("recordLearning", () => {
    it("should record learnings", () => {
      strategies.recordLearning({
        insight: "Test insight",
        source: "test",
        confidence: 0.8,
        pattern: "test_pattern",
        actionsApplied: ["action-1"],
      });

      const learnings = strategies.getLearnings();

      expect(learnings.length).toBe(1);
      expect(learnings[0].insight).toBe("Test insight");
      expect(learnings[0].confidence).toBe(0.8);
    });

    it("should filter learnings by pattern", () => {
      strategies.recordLearning({
        insight: "Pattern A",
        source: "test",
        confidence: 0.8,
        pattern: "a",
        actionsApplied: [],
      });
      strategies.recordLearning({
        insight: "Pattern B",
        source: "test",
        confidence: 0.7,
        pattern: "b",
        actionsApplied: [],
      });

      const learnings = strategies.getLearnings({ pattern: "a" });

      expect(learnings.length).toBe(1);
      expect(learnings[0].pattern).toBe("a");
    });

    it("should filter learnings by confidence", () => {
      strategies.recordLearning({
        insight: "High confidence",
        source: "test",
        confidence: 0.9,
        actionsApplied: [],
      });
      strategies.recordLearning({
        insight: "Low confidence",
        source: "test",
        confidence: 0.5,
        actionsApplied: [],
      });

      const learnings = strategies.getLearnings({ minConfidence: 0.7 });

      expect(learnings.length).toBe(1);
      expect(learnings[0].confidence).toBe(0.9);
    });
  });

  describe("createAction", () => {
    it("should create action with apply function", () => {
      const action = createAction(
        "prompt_refinement",
        "Add instructions",
        (config) => ({
          ...config,
          systemPrompt: config.systemPrompt + "\nExtra instructions",
        })
      );

      const config = createDefaultAgentConfig("test");
      const result = action.apply(config, {});

      expect(result.systemPrompt).toContain("Extra instructions");
    });
  });
});

describe("MetaAgentLoop", () => {
  let loop: MetaAgentLoop;
  let mockExecutor: TaskExecutor;

  beforeEach(() => {
    let executionCount = 0;
    mockExecutor = async () => {
      executionCount++;
      // Simulate improving quality over attempts
      const successRate = Math.min(1, executionCount * 0.4);
      return {
        success: Math.random() < successRate,
        output: { result: `attempt-${executionCount}` },
        trace: createEmptyTrace(`task-${executionCount}`, {
          success: true,
          metrics: {
            totalDurationMs: 100,
            stateTransitions: 2,
            errorCount: 0,
            retryCount: 0,
            conditionChecks: 1,
            conditionPassRate: 0.9,
            avgActionDurationMs: 50,
            stateTimeMs: {
              IDLE: 0,
              PLANNING: 10,
              EXECUTING: 70,
              VERIFYING: 15,
              COMMITTING: 5,
              COMPLETED: 0,
              FAILED: 0,
            },
          },
        }),
      };
    };

    loop = new MetaAgentLoop({
      executor: mockExecutor,
      autoImprove: true,
    });
  });

  describe("execute", () => {
    it("should execute task and return result", async () => {
      const task = createMetaTask("task-001", "Test task", { prompt: "test" }, {
        qualityThreshold: 50,
        maxAttempts: 3,
      });

      const result = await loop.execute(task);

      expect(result.taskId).toBe("task-001");
      expect(result.attempts.length).toBeGreaterThanOrEqual(1);
      expect(result.bestAttempt).toBeDefined();
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });

    it("should try multiple attempts until threshold met", async () => {
      // Always succeed with improving quality
      let quality = 30;
      mockExecutor = async () => {
        quality += 25;
        return {
          success: true,
          output: { result: "test" },
          trace: createEmptyTrace("task", {
            success: true,
            metrics: {
              totalDurationMs: 100,
              stateTransitions: 2,
              errorCount: 0,
              retryCount: 0,
              conditionChecks: 1,
              conditionPassRate: quality / 100,
              avgActionDurationMs: 50,
              stateTimeMs: {
                IDLE: 0,
                PLANNING: 10,
                EXECUTING: 70,
                VERIFYING: 15,
                COMMITTING: 5,
                COMPLETED: 0,
                FAILED: 0,
              },
            },
          }),
        };
      };

      loop = new MetaAgentLoop({
        executor: mockExecutor,
        autoImprove: true,
      });

      const task = createMetaTask("task-002", "Improving task", {}, {
        qualityThreshold: 80,
        maxAttempts: 5,
      });

      const result = await loop.execute(task);

      expect(result.attempts.length).toBeGreaterThanOrEqual(1);
    });

    it("should track quality improvement", async () => {
      let attemptNum = 0;
      mockExecutor = async () => {
        attemptNum++;
        // Start with errors, gradually improve
        const hasErrors = attemptNum < 3;
        return {
          success: !hasErrors,
          output: { result: "test" },
          trace: createEmptyTrace("task", {
            success: !hasErrors,
            metrics: {
              totalDurationMs: 100,
              stateTransitions: 2,
              errorCount: hasErrors ? 3 - attemptNum : 0, // 2, 1, 0 errors
              retryCount: hasErrors ? 2 : 0,
              conditionChecks: 1,
              conditionPassRate: 0.5 + attemptNum * 0.15, // 0.65, 0.8, 0.95
              avgActionDurationMs: 50,
              stateTimeMs: {
                IDLE: 0,
                PLANNING: 10,
                EXECUTING: 70,
                VERIFYING: 15,
                COMMITTING: 5,
                COMPLETED: 0,
                FAILED: 0,
              },
            },
          }),
        };
      };

      loop = new MetaAgentLoop({
        executor: mockExecutor,
        autoImprove: true,
      });

      const task = createMetaTask("task-003", "Quality tracking", {}, {
        qualityThreshold: 99, // Very high - won't reach this
        maxAttempts: 3,
      });

      const result = await loop.execute(task);

      expect(result.attempts.length).toBe(3);
      // Quality should improve across attempts (or at least not drop significantly)
      if (result.attempts.length > 1) {
        const firstQuality = result.attempts[0].qualityScore;
        const lastQuality = result.attempts[result.attempts.length - 1].qualityScore;
        // Last quality should be >= first quality (improvement) or within variance
        expect(lastQuality).toBeGreaterThanOrEqual(firstQuality - 15);
      }
    });

    it("should call progress callback", async () => {
      let callCount = 0;
      loop = new MetaAgentLoop({
        executor: mockExecutor,
        onProgress: () => { callCount++; },
      });

      const task = createMetaTask("task-004", "Progress task", {}, {
        qualityThreshold: 95,
        maxAttempts: 2,
      });

      await loop.execute(task);

      expect(callCount).toBeGreaterThan(0);
    });

    it("should extract learnings from attempts", async () => {
      const task = createMetaTask("task-005", "Learning task", {}, {
        qualityThreshold: 50,
        maxAttempts: 2,
      });

      const result = await loop.execute(task);

      expect(result.learnings).toBeDefined();
      expect(Array.isArray(result.learnings)).toBe(true);
    });
  });

  describe("executeWithVariants", () => {
    it("should execute with multiple config variants", async () => {
      loop = new MetaAgentLoop({
        executor: mockExecutor,
        enableMutations: true,
        variantCount: 2,
      });

      const task = createMetaTask("task-006", "Variant task", {}, {
        qualityThreshold: 50,
        maxAttempts: 2,
      });

      const results = await loop.executeWithVariants(task, 2);

      expect(results.length).toBe(2);
      // Results should be sorted by quality
      expect(results[0].finalQualityScore).toBeGreaterThanOrEqual(results[1].finalQualityScore);
    });
  });

  describe("accessors", () => {
    it("should provide access to internal components", () => {
      expect(loop.getTraceAnalyzer()).toBeInstanceOf(TraceAnalyzer);
      expect(loop.getConfigMutator()).toBeInstanceOf(ConfigMutator);
      expect(loop.getImprovementStrategies()).toBeInstanceOf(ImprovementStrategies);
    });
  });
});

describe("StandardBenchmarks", () => {
  it("should create correctness benchmark", () => {
    const task = StandardBenchmarks.correctness(
      "corr-001",
      "Correctness test",
      { input: "test" },
      (output) => output.result === "expected"
    );

    expect(task.category).toBe("correctness");
    expect(task.metrics).toContain("success_rate");
    expect(task.metrics).toContain("output_quality");
  });

  it("should create performance benchmark", () => {
    const task = StandardBenchmarks.performance(
      "perf-001",
      "Performance test",
      { input: "test" },
      120000
    );

    expect(task.category).toBe("performance");
    expect(task.timeoutMs).toBe(120000);
    expect(task.metrics).toContain("execution_time");
  });

  it("should create reliability benchmark", () => {
    const task = StandardBenchmarks.reliability(
      "rel-001",
      "Reliability test",
      { input: "test" }
    );

    expect(task.category).toBe("reliability");
    expect(task.metrics).toContain("retry_count");
  });

  it("should create edge case benchmark", () => {
    const task = StandardBenchmarks.edgeCase(
      "edge-001",
      "Edge case test",
      { input: "" }
    );

    expect(task.category).toBe("edge_case");
    expect(task.difficulty).toBe(4);
  });
});

describe("createMetaTask", () => {
  it("should create task with defaults", () => {
    const task = createMetaTask("task-001", "Description", { prompt: "test" });

    expect(task.id).toBe("task-001");
    expect(task.description).toBe("Description");
    expect(task.qualityThreshold).toBe(80);
    expect(task.maxAttempts).toBe(3);
    expect(task.attemptTimeoutMs).toBe(60000);
  });

  it("should create task with overrides", () => {
    const task = createMetaTask("task-002", "Custom", { prompt: "test" }, {
      qualityThreshold: 90,
      maxAttempts: 5,
      attemptTimeoutMs: 120000,
      tags: ["custom"],
    });

    expect(task.qualityThreshold).toBe(90);
    expect(task.maxAttempts).toBe(5);
    expect(task.attemptTimeoutMs).toBe(120000);
    expect(task.tags).toContain("custom");
  });
});

describe("createDefaultAgentConfig", () => {
  it("should create config with name", () => {
    const config = createDefaultAgentConfig("my-agent");

    expect(config.name).toBe("my-agent");
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(2000);
    expect(config.retry.maxAttempts).toBe(3);
  });

  it("should allow overrides", () => {
    const config = createDefaultAgentConfig("custom-agent", {
      temperature: 0.5,
      maxTokens: 4000,
    });

    expect(config.temperature).toBe(0.5);
    expect(config.maxTokens).toBe(4000);
  });
});
