import { describe, it, expect, beforeEach } from "bun:test";
import { TokenBudgetManager, BudgetConfig, BudgetAlert, type BudgetMetrics } from "../../src/memory/TokenBudgetManager";
import { ScopeLevel } from "../../src/memory/Scope";

describe("TokenBudgetManager", () => {
  let budgetManager: TokenBudgetManager;

  beforeEach(() => {
    const config: BudgetConfig = {
      globalTokenBudget: 2000,
      taskTokenMultiplier: 4000,
      localTokenBudget: 2000,
      adaptiveThreshold: 0.8,
      emergencyThreshold: 0.95,
      adaptiveEnabled: true,
    };
    budgetManager = new TokenBudgetManager(config);
  });

  describe("constructor", () => {
    it("should create budget manager with default configuration", () => {
      const defaultManager = new TokenBudgetManager();
      expect(defaultManager).toBeInstanceOf(TokenBudgetManager);
    });

    it("should create budget manager with custom configuration", () => {
      const config: BudgetConfig = {
        globalTokenBudget: 3000,
        taskTokenMultiplier: 5000,
        localTokenBudget: 1500,
        adaptiveThreshold: 0.7,
        emergencyThreshold: 0.9,
        adaptiveEnabled: false,
      };

      const customManager = new TokenBudgetManager(config);
      expect(customManager).toBeInstanceOf(TokenBudgetManager);
    });
  });

  describe("getBudgetLimit", () => {
    it("should return correct budget for GLOBAL level", () => {
      const budget = budgetManager.getBudgetLimit(ScopeLevel.GLOBAL);
      expect(budget).toBe(2000);
    });

    it("should return correct budget for TASK level with default complexity", () => {
      const budget = budgetManager.getBudgetLimit(ScopeLevel.TASK);
      expect(budget).toBe(4000);
    });

    it("should return scaled budget for TASK level with custom complexity", () => {
      const budget = budgetManager.getBudgetLimit(ScopeLevel.TASK, 2.5);
      expect(budget).toBe(10000); // 4000 * 2.5
    });

    it("should return correct budget for LOCAL level", () => {
      const budget = budgetManager.getBudgetLimit(ScopeLevel.LOCAL);
      expect(budget).toBe(2000);
    });
  });

  describe("updateUsage", () => {
    it("should track token usage by level", () => {
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 500);
      budgetManager.updateUsage(ScopeLevel.TASK, 1200);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 800);

      const metrics = budgetManager.getMetrics();
      expect(metrics.currentUsage.global).toBe(500);
      expect(metrics.currentUsage.task).toBe(1200);
      expect(metrics.currentUsage.local).toBe(800);
    });

    it("should accumulate usage across multiple updates", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 400);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 300);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 200);

      const metrics = budgetManager.getMetrics();
      expect(metrics.currentUsage.local).toBe(900);
    });

    it("should handle negative usage adjustments", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1000);
      budgetManager.updateUsage(ScopeLevel.LOCAL, -300);

      const metrics = budgetManager.getMetrics();
      expect(metrics.currentUsage.local).toBe(700);
    });
  });

  describe("checkBudgetStatus", () => {
    it("should return OK status when usage is below threshold", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1000); // 50% of 2000
      const status = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(status.level).toBe(ScopeLevel.LOCAL);
      expect(status.currentUsage).toBe(1000);
      expect(status.budgetLimit).toBe(2000);
      expect(status.utilizationPercentage).toBe(50);
      expect(status.status).toBe("OK");
      expect(status.isNearLimit).toBe(false);
      expect(status.isAtEmergency).toBe(false);
    });

    it("should return WARNING status when usage exceeds adaptive threshold", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1700); // 85% of 2000
      const status = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(status.status).toBe("WARNING");
      expect(status.isNearLimit).toBe(true);
      expect(status.isAtEmergency).toBe(false);
      expect(status.utilizationPercentage).toBe(85);
    });

    it("should return EMERGENCY status when usage exceeds emergency threshold", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1950); // 97.5% of 2000
      const status = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(status.status).toBe("EMERGENCY");
      expect(status.isNearLimit).toBe(true);
      expect(status.isAtEmergency).toBe(true);
      expect(status.utilizationPercentage).toBe(97.5);
    });

    it("should return EXCEEDED status when usage exceeds budget limit", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 2200); // 110% of 2000
      const status = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(status.status).toBe("EXCEEDED");
      expect(status.isNearLimit).toBe(true);
      expect(status.isAtEmergency).toBe(true);
      expect(status.utilizationPercentage).toBe(110);
    });
  });

  describe("getAlerts", () => {
    it("should return no alerts when usage is normal", () => {
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 1000);
      budgetManager.updateUsage(ScopeLevel.TASK, 2000);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1000);

      const alerts = budgetManager.getAlerts();
      expect(alerts).toHaveLength(0);
    });

    it("should return warning alerts when thresholds are exceeded", () => {
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 1700); // 85%
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1950); // 97.5%

      const alerts = budgetManager.getAlerts();
      expect(alerts).toHaveLength(2);

      const globalAlert = alerts.find(a => a.level === ScopeLevel.GLOBAL);
      const localAlert = alerts.find(a => a.level === ScopeLevel.LOCAL);

      expect(globalAlert?.severity).toBe("WARNING");
      expect(localAlert?.severity).toBe("EMERGENCY");
    });

    it("should include recommended actions in alerts", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1950);

      const alerts = budgetManager.getAlerts();
      expect(alerts[0].message).toContain("LOCAL");
      expect(alerts[0].recommendedAction).toContain("compression");
    });
  });

  describe("adaptive budgets", () => {
    it("should increase budget when consistently under threshold", () => {
      // Simulate several low-usage scenarios
      for (let i = 0; i < 10; i++) {
        budgetManager.resetUsage(ScopeLevel.LOCAL, true); // Preserve history
        budgetManager.updateUsage(ScopeLevel.LOCAL, 600); // 30% of 2000 budget
        budgetManager.adaptBudgets();
      }

      const newBudget = budgetManager.getBudgetLimit(ScopeLevel.LOCAL);
      expect(newBudget).toBeGreaterThan(2000); // Should have increased
    });

    it("should decrease budget when consistently over threshold", () => {
      // Simulate several high-usage scenarios
      for (let i = 0; i < 10; i++) {
        budgetManager.resetUsage(ScopeLevel.LOCAL, true); // Preserve history
        budgetManager.updateUsage(ScopeLevel.LOCAL, 1700); // 85% of 2000 budget
        budgetManager.adaptBudgets();
      }

      const newBudget = budgetManager.getBudgetLimit(ScopeLevel.LOCAL);
      expect(newBudget).toBeLessThan(2000); // Should have decreased
    });

    it("should not adapt budgets when adaptive is disabled", () => {
      const config: BudgetConfig = {
        globalTokenBudget: 2000,
        taskTokenMultiplier: 4000,
        localTokenBudget: 2000,
        adaptiveThreshold: 0.8,
        emergencyThreshold: 0.95,
        adaptiveEnabled: false,
      };

      const noAdaptManager = new TokenBudgetManager(config);

      for (let i = 0; i < 10; i++) {
        noAdaptManager.updateUsage(ScopeLevel.LOCAL, 100);
        noAdaptManager.adaptBudgets();
      }

      const budget = noAdaptManager.getBudgetLimit(ScopeLevel.LOCAL);
      expect(budget).toBe(2000); // Should remain unchanged
    });
  });

  describe("resetUsage", () => {
    it("should reset usage for specific level", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1500);
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 1000);

      budgetManager.resetUsage(ScopeLevel.LOCAL);

      const metrics = budgetManager.getMetrics();
      expect(metrics.currentUsage.local).toBe(0);
      expect(metrics.currentUsage.global).toBe(1000); // Should remain unchanged
    });

    it("should reset all usage when no level specified", () => {
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 1000);
      budgetManager.updateUsage(ScopeLevel.TASK, 2000);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1500);

      budgetManager.resetUsage();

      const metrics = budgetManager.getMetrics();
      expect(metrics.currentUsage.global).toBe(0);
      expect(metrics.currentUsage.task).toBe(0);
      expect(metrics.currentUsage.local).toBe(0);
    });
  });

  describe("getMetrics", () => {
    it("should return comprehensive budget metrics", () => {
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 800);
      budgetManager.updateUsage(ScopeLevel.TASK, 1600);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1200);

      const metrics = budgetManager.getMetrics();

      expect(metrics.currentUsage.global).toBe(800);
      expect(metrics.currentUsage.task).toBe(1600);
      expect(metrics.currentUsage.local).toBe(1200);

      expect(metrics.budgetLimits.global).toBe(2000);
      expect(metrics.budgetLimits.task).toBe(4000);
      expect(metrics.budgetLimits.local).toBe(2000);

      expect(metrics.utilizationPercentages.global).toBe(40);
      expect(metrics.utilizationPercentages.task).toBe(40);
      expect(metrics.utilizationPercentages.local).toBe(60);

      expect(metrics.totalUsage).toBe(3600);
      expect(metrics.totalBudget).toBe(8000);
      expect(metrics.overallUtilization).toBe(45);
    });
  });

  describe("predictBudgetNeeds", () => {
    it("should predict future budget needs based on trend", () => {
      // Create an increasing usage trend
      for (let i = 1; i <= 5; i++) {
        budgetManager.updateUsage(ScopeLevel.LOCAL, i * 100);
      }

      const prediction = budgetManager.predictBudgetNeeds(ScopeLevel.LOCAL, 10);

      expect(prediction.projectedUsage).toBeGreaterThan(1500);
      expect(prediction.recommendedBudget).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it("should return low confidence for insufficient data", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 100);

      const prediction = budgetManager.predictBudgetNeeds(ScopeLevel.LOCAL, 5);

      expect(prediction.confidence).toBeLessThan(0.5);
    });
  });

  describe("export and import state", () => {
    it("should export and import budget manager state", () => {
      budgetManager.updateUsage(ScopeLevel.GLOBAL, 1000);
      budgetManager.updateUsage(ScopeLevel.LOCAL, 1500);

      const exported = budgetManager.exportState();

      expect(exported.config.globalTokenBudget).toBe(2000);
      expect(exported.usage.global).toBe(1000);
      expect(exported.usage.local).toBe(1500);

      const newManager = new TokenBudgetManager();
      newManager.importState(exported);

      const metrics = newManager.getMetrics();
      expect(metrics.currentUsage.global).toBe(1000);
      expect(metrics.currentUsage.local).toBe(1500);
    });
  });

  describe("edge cases", () => {
    it("should handle zero token usage", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 0);
      const status = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(status.utilizationPercentage).toBe(0);
      expect(status.status).toBe("OK");
    });

    it("should handle very large token usage", () => {
      budgetManager.updateUsage(ScopeLevel.LOCAL, 10000000);
      const status = budgetManager.checkBudgetStatus(ScopeLevel.LOCAL);

      expect(status.status).toBe("EXCEEDED");
      expect(status.utilizationPercentage).toBe(500000);
    });

    it("should handle task complexity edge cases", () => {
      const zeroBudget = budgetManager.getBudgetLimit(ScopeLevel.TASK, 0);
      const hugeBudget = budgetManager.getBudgetLimit(ScopeLevel.TASK, 100);

      expect(zeroBudget).toBe(0);
      expect(hugeBudget).toBe(400000);
    });
  });
});