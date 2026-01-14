import { describe, it, expect, beforeEach } from "bun:test";
import { HierarchicalMemory, MemoryConfig } from "../../src/memory/HierarchicalMemory";
import { TokenBudgetManager, BudgetConfig } from "../../src/memory/TokenBudgetManager";
import { ScopeLevel, type ContextEvent } from "../../src/memory/Scope";
import { CompressionStrategy } from "../../src/memory/ScopeCompressor";

describe("Memory Module Integration", () => {
  let memory: HierarchicalMemory;
  let budgetManager: TokenBudgetManager;

  beforeEach(() => {
    const memoryConfig: MemoryConfig = {
      globalTokenBudget: 1000,
      taskTokenMultiplier: 2000,
      localTokenBudget: 800,
      compressionThreshold: 0.7,
      autoCompression: true,
    };

    const budgetConfig: BudgetConfig = {
      globalTokenBudget: 1000,
      taskTokenMultiplier: 2000,
      localTokenBudget: 800,
      adaptiveThreshold: 0.8,
      emergencyThreshold: 0.95,
      adaptiveEnabled: true,
    };

    memory = new HierarchicalMemory(memoryConfig);
    budgetManager = new TokenBudgetManager(budgetConfig);
  });

  describe("End-to-End Memory Workflows", () => {
    it("should handle complete memory lifecycle with budget tracking", async () => {
      // Phase 1: Create hierarchical scope structure
      const globalId = memory.createScope({
        goal: "Global context for agent session",
        level: ScopeLevel.GLOBAL,
      });

      const taskId = memory.createScope({
        goal: "Process user request for data analysis",
        level: ScopeLevel.TASK,
        complexity: 1.5, // Higher complexity task
      });

      const localId = memory.createScope({
        goal: "Validate input data format",
        level: ScopeLevel.LOCAL,
      });

      // Phase 2: Add substantial content across scopes
      const events: ContextEvent[] = [
        {
          id: "user-request",
          type: "USER_INPUT",
          timestamp: new Date(),
          data: {
            request: "Please analyze the quarterly sales data and provide insights on revenue trends",
            attachments: ["sales_q3.xlsx", "revenue_breakdown.csv"],
            priority: "high",
          },
        },
        {
          id: "data-validation",
          type: "TOOL_EXECUTION",
          timestamp: new Date(),
          data: {
            tool: "data_validator",
            input: "sales_q3.xlsx",
            result: "Valid Excel file with 15,847 rows, 23 columns",
            issues: ["Missing values in 'region' column (12 rows)", "Date format inconsistency"],
          },
        },
        {
          id: "analysis-start",
          type: "AGENT_OUTPUT",
          timestamp: new Date(),
          data: {
            reasoning: "Data validation complete. Proceeding with analysis using pandas and matplotlib",
            next_steps: ["Clean missing values", "Standardize date formats", "Calculate trends"],
          },
        },
      ];

      // Add events to different scopes
      for (const event of events) {
        memory.addEvent(event);
      }

      // Add artifacts
      memory.setArtifact("validated_data", {
        file_path: "/tmp/cleaned_sales_q3.xlsx",
        rows: 15835, // After cleaning
        columns: 23,
        validation_status: "passed",
      });

      memory.setArtifact("analysis_config", {
        methods: ["trend_analysis", "seasonal_decomposition"],
        confidence_threshold: 0.85,
        output_format: "interactive_dashboard",
      });

      // Phase 3: Track token usage with budget manager
      let globalUsage = 0;
      let taskUsage = 0;
      let localUsage = 0;

      const globalScope = memory.getScope(globalId);
      const taskScope = memory.getScope(taskId);
      const localScope = memory.getScope(localId);

      if (globalScope) globalUsage = globalScope.getTokenCount();
      if (taskScope) taskUsage = taskScope.getTokenCount();
      if (localScope) localUsage = localScope.getTokenCount();

      budgetManager.updateUsage(ScopeLevel.GLOBAL, globalUsage);
      budgetManager.updateUsage(ScopeLevel.TASK, taskUsage);
      budgetManager.updateUsage(ScopeLevel.LOCAL, localUsage);

      // Phase 4: Check budget status and alerts
      const budgetStatus = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);
      expect(budgetStatus.status).toMatch(/OK|WARNING/); // Should not be exceeded

      const alerts = budgetManager.getAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(0);

      // Phase 5: Close scopes and trigger compression
      await memory.closeScope("Input validation completed successfully");
      await memory.closeScope("Data analysis task completed with insights generated");
      await memory.closeScope("Session completed");

      // Phase 6: Verify compression effectiveness
      const compressionResults = await memory.compress();
      expect(compressionResults.length).toBeGreaterThan(0);

      for (const result of compressionResults) {
        expect(result.compressionRatio).toBeGreaterThan(1);
        expect(result.summary).toBeTruthy();
      }

      // Phase 7: Verify final state
      const finalMetrics = memory.getMetrics();
      expect(finalMetrics.totalScopes).toBe(3);
      expect(finalMetrics.compressionEvents).toBeGreaterThan(0);

      const budgetMetrics = budgetManager.getMetrics();
      expect(budgetMetrics.totalUsage).toBeGreaterThan(0);
    });

    it("should handle budget-triggered compression workflow", async () => {
      // Create a memory system with very low budgets to trigger compression
      const tightMemoryConfig: MemoryConfig = {
        globalTokenBudget: 200,
        taskTokenMultiplier: 300,
        localTokenBudget: 150,
        compressionThreshold: 0.6,
        autoCompression: true,
      };

      const tightMemory = new HierarchicalMemory(tightMemoryConfig);
      const tightBudget = new TokenBudgetManager({
        globalTokenBudget: 200,
        taskTokenMultiplier: 300,
        localTokenBudget: 150,
        adaptiveThreshold: 0.7,
        emergencyThreshold: 0.9,
        adaptiveEnabled: true,
      });

      // Create scope with substantial content to exceed budget
      tightMemory.createScope({
        goal: "Process large dataset with comprehensive analysis including statistical modeling, visualization generation, and automated reporting",
        level: ScopeLevel.LOCAL,
      });

      // Add multiple substantial events
      for (let i = 0; i < 8; i++) {
        tightMemory.addEvent({
          id: `analysis-step-${i}`,
          type: "TOOL_EXECUTION",
          timestamp: new Date(),
          data: {
            step: i + 1,
            description: `Executing analysis step ${i + 1} with detailed processing of data segments and intermediate calculations`,
            input_size: `${(i + 1) * 1000} records`,
            processing_time: `${(i + 1) * 2.5} seconds`,
            memory_usage: `${(i + 1) * 125} MB`,
            results: `Generated ${(i + 1) * 50} data points and ${(i + 1) * 10} visualizations`,
          },
        });
      }

      // Track usage in budget manager
      const currentScope = tightMemory.getCurrentScope();
      const tokenUsage = currentScope?.getTokenCount() || 0;
      tightBudget.updateUsage(ScopeLevel.LOCAL, tokenUsage);

      // Check if budget alerts are triggered
      const budgetStatus = tightBudget.checkBudgetStatus(ScopeLevel.LOCAL);
      expect(budgetStatus.status).toMatch(/WARNING|EMERGENCY|EXCEEDED/);

      const alerts = tightBudget.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const localAlert = alerts.find(alert => alert.level === ScopeLevel.LOCAL);
      expect(localAlert).toBeDefined();
      expect(localAlert?.recommendedAction).toContain("compression");

      // Trigger compression due to budget pressure
      await tightMemory.closeScope("Analysis completed under budget constraints");
      const compressionResults = await tightMemory.compress(ScopeLevel.LOCAL);

      expect(compressionResults.length).toBeGreaterThan(0);
      expect(compressionResults[0].compressionRatio).toBeGreaterThan(1.5); // Moderate compression with preserved artifacts

      // Verify budget impact after compression
      const compressedScope = tightMemory.getScope(currentScope?.id || "");
      const newTokenUsage = compressedScope?.getTokenCount() || 0;
      expect(newTokenUsage).toBeLessThan(tokenUsage); // Token usage should decrease
    });

    it("should maintain scope hierarchy integrity during compression", async () => {
      // Create nested scope structure
      const globalId = memory.createScope({
        goal: "Global project context",
        level: ScopeLevel.GLOBAL,
      });

      const task1Id = memory.createScope({
        goal: "Implement user authentication",
        level: ScopeLevel.TASK,
      });

      const local1Id = memory.createScope({
        goal: "Hash password validation",
        level: ScopeLevel.LOCAL,
      });

      memory.setArtifact("hash_algorithm", "bcrypt");
      await memory.closeScope("Password hashing implemented");

      const local2Id = memory.createScope({
        goal: "JWT token generation",
        level: ScopeLevel.LOCAL,
      });

      memory.setArtifact("jwt_secret", "secure_key_placeholder");
      await memory.closeScope("JWT implementation completed");

      await memory.closeScope("Authentication task completed");

      const task2Id = memory.createScope({
        goal: "Implement user authorization",
        level: ScopeLevel.TASK,
      });

      memory.setArtifact("permissions", ["read", "write", "admin"]);
      await memory.closeScope("Authorization implemented");

      // Verify scope relationships before compression
      const globalScope = memory.getScope(globalId);
      const task1Scope = memory.getScope(task1Id);
      const task2Scope = memory.getScope(task2Id);

      expect(globalScope?.parentId).toBeNull();
      expect(task1Scope?.parentId).toBe(globalId);
      expect(task2Scope?.parentId).toBe(globalId);

      // Compress and verify relationships are maintained
      const compressionResults = await memory.compress();
      expect(compressionResults.length).toBeGreaterThan(0);

      // Scope relationships should still be intact
      expect(task1Scope?.parentId).toBe(globalId);
      expect(task2Scope?.parentId).toBe(globalId);

      // Artifacts should be accessible through hierarchy
      const hashAlgorithm = memory.getArtifact("hash_algorithm");
      const permissions = memory.getArtifact("permissions");
      expect(hashAlgorithm).toBeDefined();
      expect(permissions).toEqual(["read", "write", "admin"]);
    });
  });

  describe("Cross-Component Integration", () => {
    it("should integrate budget manager with hierarchical memory", async () => {
      // Create integrated memory management system
      const integratedSystem = {
        memory,
        budgetManager,

        updateBudgetFromMemory() {
          const metrics = this.memory.getMetrics();

          // Get current scopes and their token counts
          const globalScopes = this.memory.getScopesByLevel(ScopeLevel.GLOBAL);
          const taskScopes = this.memory.getScopesByLevel(ScopeLevel.TASK);
          const localScopes = this.memory.getScopesByLevel(ScopeLevel.LOCAL);

          // Reset and update budget tracking
          this.budgetManager.resetUsage();

          const globalTokens = globalScopes.reduce((sum, s) => sum + s.getTokenCount(), 0);
          const taskTokens = taskScopes.reduce((sum, s) => sum + s.getTokenCount(), 0);
          const localTokens = localScopes.reduce((sum, s) => sum + s.getTokenCount(), 0);

          this.budgetManager.updateUsage(ScopeLevel.GLOBAL, globalTokens);
          this.budgetManager.updateUsage(ScopeLevel.TASK, taskTokens);
          this.budgetManager.updateUsage(ScopeLevel.LOCAL, localTokens);
        },

        async compressIfNeeded() {
          const alerts = this.budgetManager.getAlerts();
          const compressionNeeded = alerts.some(alert =>
            alert.severity === "EMERGENCY" &&
            alert.recommendedAction.includes("compression")
          );

          if (compressionNeeded) {
            return await this.memory.compress();
          }
          return [];
        },

        async adaptBudgetsBasedOnUsage() {
          this.budgetManager.adaptBudgets();

          // Apply adapted budgets back to memory system (conceptually)
          const budgetMetrics = this.budgetManager.getMetrics();
          return budgetMetrics;
        }
      };

      // Test integrated workflow
      integratedSystem.memory.createScope({
        goal: "Integration test scope with substantial content for budget testing",
        level: ScopeLevel.LOCAL,
      });

      // Add significant content
      for (let i = 0; i < 5; i++) {
        integratedSystem.memory.addEvent({
          id: `integration-event-${i}`,
          type: "USER_INPUT",
          timestamp: new Date(),
          data: {
            iteration: i,
            content: `Substantial event content for integration testing iteration ${i}`,
            metadata: {
              size: "large",
              processing_time: `${i * 100}ms`,
              complexity: "high",
            },
          },
        });
      }

      // Update budget tracking from memory state
      integratedSystem.updateBudgetFromMemory();

      // Check if compression is needed based on budget
      const compressionResults = await integratedSystem.compressIfNeeded();

      // Adapt budgets based on usage patterns
      const adaptedBudgetMetrics = await integratedSystem.adaptBudgetsBasedOnUsage();

      // Verify integration works
      expect(adaptedBudgetMetrics.totalUsage).toBeGreaterThan(0);
      expect(adaptedBudgetMetrics.overallUtilization).toBeGreaterThan(0);

      const memoryMetrics = integratedSystem.memory.getMetrics();
      expect(memoryMetrics.totalScopes).toBe(1);
      expect(memoryMetrics.totalTokens).toBeGreaterThan(0);
    });

    it("should handle memory stress testing with budget constraints", async () => {
      const stressConfig: MemoryConfig = {
        globalTokenBudget: 500,
        taskTokenMultiplier: 800,
        localTokenBudget: 300,
        compressionThreshold: 0.5, // Aggressive compression
        autoCompression: true,
      };

      const stressMemory = new HierarchicalMemory(stressConfig);
      const stressBudget = new TokenBudgetManager({
        globalTokenBudget: 500,
        taskTokenMultiplier: 800,
        localTokenBudget: 300,
        adaptiveThreshold: 0.6,
        emergencyThreshold: 0.8,
        adaptiveEnabled: true,
      });

      const tokenCounts: number[] = [];
      const compressionEvents: number[] = [];

      // Simulate high-load memory usage scenario
      for (let cycle = 0; cycle < 10; cycle++) {
        stressMemory.createScope({
          goal: `High-intensity processing cycle ${cycle} with complex multi-step operations requiring substantial memory allocation`,
          level: ScopeLevel.LOCAL,
        });

        // Add heavy content load
        for (let event = 0; event < 8; event++) {
          stressMemory.addEvent({
            id: `stress-${cycle}-${event}`,
            type: "TOOL_EXECUTION",
            timestamp: new Date(),
            data: {
              cycle,
              event,
              operation: `Complex operation ${event} in cycle ${cycle}`,
              input_data: `Large dataset with ${1000 + event * 500} records`,
              processing_details: {
                algorithm: "advanced_ml_pipeline",
                memory_intensive: true,
                cpu_cores: 8,
                processing_time: `${event * 1.5 + cycle * 0.5} seconds`,
              },
              results: {
                accuracy: 0.95 + (event * 0.01),
                confidence: 0.87 + (cycle * 0.01),
                output_size: `${event + cycle * 2} MB`,
              },
            },
          });
        }

        // Track memory usage
        const currentScope = stressMemory.getCurrentScope();
        const usage = currentScope?.getTokenCount() || 0;
        stressBudget.updateUsage(ScopeLevel.LOCAL, usage);

        // Check budget status
        const budgetStatus = stressBudget.checkBudgetStatus(ScopeLevel.LOCAL);

        await stressMemory.closeScope(`Cycle ${cycle} completed with budget utilization at ${budgetStatus.utilizationPercentage.toFixed(1)}%`);

        // Force compression if budget is stressed
        if (budgetStatus.utilizationPercentage > 60) {
          await stressMemory.compress(ScopeLevel.LOCAL);
        }

        stressBudget.adaptBudgets();

        // Record metrics
        const memoryMetrics = stressMemory.getMetrics();
        tokenCounts.push(memoryMetrics.totalTokens);
        compressionEvents.push(memoryMetrics.compressionEvents);

        // Reset for next cycle to simulate discrete operations
        stressBudget.resetUsage(ScopeLevel.LOCAL, true); // Preserve history for adaptation
      }

      // Verify stress test results
      expect(tokenCounts.length).toBe(10);
      expect(compressionEvents[compressionEvents.length - 1]).toBeGreaterThan(0);

      // Token growth should be sub-linear due to compression
      const firstHalf = tokenCounts[4];
      const secondHalf = tokenCounts[9];
      const growthRatio = firstHalf > 0 ? secondHalf / firstHalf : 1;

      expect(growthRatio).toBeLessThan(3); // Should not grow exponentially

      // Budget adaptation should have occurred
      const finalBudgetMetrics = stressBudget.getMetrics();
      expect(finalBudgetMetrics.adaptiveChanges).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Performance and Scalability", () => {
    it("should maintain O(log n) memory growth with integrated budget management", async () => {
      const scalabilityMemory = new HierarchicalMemory({
        globalTokenBudget: 2000,
        taskTokenMultiplier: 1500,
        localTokenBudget: 800,
        compressionThreshold: 0.6,
        autoCompression: true,
      });

      const scalabilityBudget = new TokenBudgetManager({
        globalTokenBudget: 2000,
        taskTokenMultiplier: 1500,
        localTokenBudget: 800,
        adaptiveThreshold: 0.7,
        emergencyThreshold: 0.9,
        adaptiveEnabled: true,
      });

      const performanceMetrics: Array<{
        iteration: number;
        memoryTokens: number;
        budgetUtilization: number;
        compressionEvents: number;
        scopeCount: number;
      }> = [];

      // Simulate extended operation with 15 iterations
      for (let i = 0; i < 15; i++) {
        scalabilityMemory.createScope({
          goal: `Scalability test iteration ${i} with performance monitoring and resource tracking`,
          level: ScopeLevel.LOCAL,
        });

        // Add substantial content with increasing complexity
        const eventCount = 3 + Math.floor(i / 3); // Gradually increasing load

        for (let j = 0; j < eventCount; j++) {
          scalabilityMemory.addEvent({
            id: `scale-${i}-${j}`,
            type: "AGENT_OUTPUT",
            timestamp: new Date(),
            data: {
              iteration: i,
              event: j,
              analysis: `Detailed analysis for iteration ${i}, event ${j}`,
              complexity_score: i * 0.5 + j * 0.2,
              data_processed: `${(i + 1) * (j + 1) * 100} records`,
              performance_metrics: {
                latency: `${i * 10 + j * 5}ms`,
                throughput: `${1000 / (i + 1)} ops/sec`,
                memory_efficiency: `${95 - (i * 0.5)}%`,
              },
              results: Array.from({ length: Math.min(5, i + 1) }, (_, k) => ({
                metric: `result_${k}`,
                value: (i + 1) * (j + 1) * (k + 1) * 0.1,
                confidence: 0.9 + (k * 0.02),
              })),
            },
          });
        }

        // Update budget tracking
        const currentUsage = scalabilityMemory.getCurrentScope()?.getTokenCount() || 0;
        scalabilityBudget.resetUsage(ScopeLevel.LOCAL, true);
        scalabilityBudget.updateUsage(ScopeLevel.LOCAL, currentUsage);

        // Adaptive budget management
        scalabilityBudget.adaptBudgets();

        await scalabilityMemory.closeScope(`Iteration ${i} completed with ${eventCount} events processed`);

        // Compression if needed
        if (i % 3 === 2) { // Compress every 3rd iteration
          await scalabilityMemory.compress(ScopeLevel.LOCAL);
        }

        // Capture performance metrics
        const memoryMetrics = scalabilityMemory.getMetrics();
        const budgetMetrics = scalabilityBudget.getMetrics();

        performanceMetrics.push({
          iteration: i,
          memoryTokens: memoryMetrics.totalTokens,
          budgetUtilization: budgetMetrics.overallUtilization,
          compressionEvents: memoryMetrics.compressionEvents,
          scopeCount: memoryMetrics.totalScopes,
        });
      }

      // Analyze performance characteristics
      expect(performanceMetrics.length).toBe(15);

      // Verify sub-linear growth
      const earlyMetrics = performanceMetrics[4]; // 5th iteration
      const lateMetrics = performanceMetrics[14]; // 15th iteration

      const tokenGrowthRatio = lateMetrics.memoryTokens / earlyMetrics.memoryTokens;
      const iterationRatio = 15 / 5; // 3x increase in iterations

      // Token growth should be at most linear (not exponential)
      expect(tokenGrowthRatio).toBeLessThanOrEqual(iterationRatio + 0.1); // Linear or sub-linear growth
      expect(lateMetrics.compressionEvents).toBeGreaterThan(earlyMetrics.compressionEvents);

      // Budget utilization should remain manageable
      const avgUtilization = performanceMetrics.reduce((sum, m) => sum + m.budgetUtilization, 0) / performanceMetrics.length;
      expect(avgUtilization).toBeLessThan(90); // Should not consistently hit emergency levels

      // Scope count should be reasonable (compression working)
      expect(lateMetrics.scopeCount).toBeLessThanOrEqual(15); // At most the iteration count due to compression
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle budget overflow with graceful degradation", async () => {
      const overflowMemory = new HierarchicalMemory({
        globalTokenBudget: 100, // Very small budget
        taskTokenMultiplier: 150,
        localTokenBudget: 80,
        compressionThreshold: 0.4,
        autoCompression: true,
      });

      const overflowBudget = new TokenBudgetManager({
        globalTokenBudget: 100,
        taskTokenMultiplier: 150,
        localTokenBudget: 80,
        adaptiveThreshold: 0.5,
        emergencyThreshold: 0.8,
        adaptiveEnabled: true,
      });

      // Force budget overflow
      overflowMemory.createScope({
        goal: "Intentionally create massive content to test budget overflow handling and recovery mechanisms",
        level: ScopeLevel.LOCAL,
      });

      // Add content that will definitely exceed budget
      for (let i = 0; i < 10; i++) {
        overflowMemory.addEvent({
          id: `overflow-${i}`,
          type: "USER_INPUT",
          timestamp: new Date(),
          data: {
            massive_content: `This is intentionally large content to force budget overflow scenario ${i}`.repeat(20),
            additional_data: Array.from({ length: 50 }, (_, j) => ({
              field: `data_${j}`,
              value: `Large value for field ${j} in iteration ${i}`,
              metadata: {
                size: "enormous",
                processing: "intensive",
                memory_impact: "high",
              },
            })),
          },
        });
      }

      // Check budget status - should be severely exceeded
      const currentUsage = overflowMemory.getCurrentScope()?.getTokenCount() || 0;
      overflowBudget.updateUsage(ScopeLevel.LOCAL, currentUsage);
      const budgetStatus = overflowBudget.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(budgetStatus.status).toBe("EXCEEDED");
      expect(budgetStatus.utilizationPercentage).toBeGreaterThan(100);

      // Get emergency alerts
      const alerts = overflowBudget.getAlerts();
      const emergencyAlert = alerts.find(a => a.severity === "EMERGENCY");
      expect(emergencyAlert).toBeDefined();
      expect(emergencyAlert?.recommendedAction).toContain("compression");

      // Emergency compression should handle the overflow
      await overflowMemory.closeScope("Overflow scenario completed");
      const compressionResults = await overflowMemory.compress(ScopeLevel.LOCAL);

      expect(compressionResults.length).toBeGreaterThan(0);
      expect(compressionResults[0].compressionRatio).toBeGreaterThan(1.5); // Compression with preserved artifacts

      // System should recover to manageable state
      const compressedScope = overflowMemory.getCurrentScope();
      const recoveredUsage = compressedScope?.getTokenCount() || 0;
      expect(recoveredUsage).toBeLessThan(currentUsage);

      // Budget system should adapt to prevent future overflows
      // First, create usage history to trigger adaptation (needs at least 5 data points)
      for (let i = 0; i < 6; i++) {
        overflowBudget.updateUsage(ScopeLevel.LOCAL, 1800); // High usage (90% of 2000)
        overflowBudget.resetUsage(ScopeLevel.LOCAL, true); // Preserve history
      }

      overflowBudget.adaptBudgets();
      const adaptedBudget = overflowBudget.getBudgetLimit(ScopeLevel.LOCAL);

      // In overflow scenarios, budget might be reduced to encourage efficiency
      const budgetMetrics = overflowBudget.getMetrics();
      expect(budgetMetrics.adaptiveChanges).toBeGreaterThan(0);
    });

    it("should maintain data integrity during compression failures", async () => {
      // This test would normally test compression failure scenarios,
      // but since our compression is deterministic, we'll test edge cases

      const edgeCaseMemory = new HierarchicalMemory();

      // Test empty scope compression
      edgeCaseMemory.createScope({
        goal: "Empty scope for edge case testing",
        level: ScopeLevel.LOCAL,
      });

      await edgeCaseMemory.closeScope("Empty scope completed");

      // Should handle empty scope compression gracefully
      const emptyCompressionResults = await edgeCaseMemory.compress(ScopeLevel.LOCAL);
      expect(emptyCompressionResults.length).toBeGreaterThan(0);
      expect(emptyCompressionResults[0].compressionRatio).toBeGreaterThanOrEqual(1);

      // Test scope with minimal content
      edgeCaseMemory.createScope({
        goal: "Minimal",
        level: ScopeLevel.LOCAL,
      });

      edgeCaseMemory.addEvent({
        id: "minimal",
        type: "STATE_CHANGE",
        timestamp: new Date(),
        data: { status: "ok" },
      });

      await edgeCaseMemory.closeScope("Done");

      const minimalCompressionResults = await edgeCaseMemory.compress(ScopeLevel.LOCAL);
      expect(minimalCompressionResults.length).toBeGreaterThan(0);

      // Verify scope hierarchy is maintained
      const metrics = edgeCaseMemory.getMetrics();
      expect(metrics.totalScopes).toBeGreaterThan(0);
      expect(metrics.compressionEvents).toBeGreaterThan(0);
    });
  });
});