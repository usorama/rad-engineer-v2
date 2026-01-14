/**
 * TokenBudgetManager - Adaptive token budget management for hierarchical memory
 * Provides dynamic budget allocation, usage tracking, and predictive analysis
 * Supports automatic budget adaptation based on usage patterns
 */

import { ScopeLevel } from "./Scope";

export interface BudgetConfig {
  globalTokenBudget: number;      // GLOBAL scope budget
  taskTokenMultiplier: number;    // TASK scope base budget multiplier
  localTokenBudget: number;       // LOCAL scope budget
  adaptiveThreshold: number;      // Threshold to trigger adaptive changes (default: 0.8)
  emergencyThreshold: number;     // Emergency threshold (default: 0.95)
  adaptiveEnabled: boolean;       // Enable adaptive budget adjustments
}

export type BudgetStatus = "OK" | "WARNING" | "EMERGENCY" | "EXCEEDED";

export interface BudgetStatusInfo {
  level: ScopeLevel;
  currentUsage: number;
  budgetLimit: number;
  utilizationPercentage: number;
  status: BudgetStatus;
  isNearLimit: boolean;
  isAtEmergency: boolean;
}

export interface BudgetAlert {
  level: ScopeLevel;
  severity: "WARNING" | "EMERGENCY";
  currentUsage: number;
  budgetLimit: number;
  utilizationPercentage: number;
  message: string;
  recommendedAction: string;
  timestamp: Date;
}

export interface BudgetMetrics {
  currentUsage: {
    global: number;
    task: number;
    local: number;
  };
  budgetLimits: {
    global: number;
    task: number;
    local: number;
  };
  utilizationPercentages: {
    global: number;
    task: number;
    local: number;
  };
  totalUsage: number;
  totalBudget: number;
  overallUtilization: number;
  alertCount: number;
  adaptiveChanges: number;
}

export interface BudgetPrediction {
  projectedUsage: number;
  recommendedBudget: number;
  confidence: number; // 0-1 confidence score
  trend: "increasing" | "decreasing" | "stable";
}

export interface BudgetState {
  config: BudgetConfig;
  usage: {
    global: number;
    task: number;
    local: number;
  };
  adaptiveHistory: number[];
  lastAdaptation: Date | null;
}

/**
 * TokenBudgetManager implements adaptive token budget management
 * Tracks usage across scope levels and provides predictive budget adjustments
 */
export class TokenBudgetManager {
  private config: BudgetConfig;
  private currentUsage: { global: number; task: number; local: number };
  private usageHistory: Map<ScopeLevel, number[]>;
  private adaptiveChanges: number;
  private lastAdaptation: Date | null;

  private readonly DEFAULT_CONFIG: BudgetConfig = {
    globalTokenBudget: 2000,
    taskTokenMultiplier: 4000,
    localTokenBudget: 2000,
    adaptiveThreshold: 0.8,
    emergencyThreshold: 0.95,
    adaptiveEnabled: true,
  };

  constructor(config?: Partial<BudgetConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.currentUsage = { global: 0, task: 0, local: 0 };
    this.usageHistory = new Map([
      [ScopeLevel.GLOBAL, []],
      [ScopeLevel.TASK, []],
      [ScopeLevel.LOCAL, []],
    ]);
    this.adaptiveChanges = 0;
    this.lastAdaptation = null;
  }

  /**
   * Get budget limit for a specific scope level
   */
  getBudgetLimit(level: ScopeLevel, complexity: number = 1): number {
    switch (level) {
      case ScopeLevel.GLOBAL:
        return this.config.globalTokenBudget;
      case ScopeLevel.TASK:
        return this.config.taskTokenMultiplier * complexity;
      case ScopeLevel.LOCAL:
        return this.config.localTokenBudget;
      default:
        return this.config.localTokenBudget;
    }
  }

  /**
   * Update token usage for a specific level
   * Can handle positive (add) or negative (subtract) adjustments
   */
  updateUsage(level: ScopeLevel, tokenDelta: number): void {
    switch (level) {
      case ScopeLevel.GLOBAL:
        this.currentUsage.global += tokenDelta;
        this.currentUsage.global = Math.max(0, this.currentUsage.global);
        break;
      case ScopeLevel.TASK:
        this.currentUsage.task += tokenDelta;
        this.currentUsage.task = Math.max(0, this.currentUsage.task);
        break;
      case ScopeLevel.LOCAL:
        this.currentUsage.local += tokenDelta;
        this.currentUsage.local = Math.max(0, this.currentUsage.local);
        break;
    }

    // Track usage history for trend analysis
    const history = this.usageHistory.get(level) || [];
    const currentLevelUsage = this.getCurrentUsage(level);
    history.push(currentLevelUsage);

    // Keep only last 20 data points for trend analysis
    if (history.length > 20) {
      history.shift();
    }

    this.usageHistory.set(level, history);
  }

  /**
   * Check budget status for a specific scope level
   */
  checkBudgetStatus(level: ScopeLevel, complexity: number = 1): BudgetStatusInfo {
    const currentUsage = this.getCurrentUsage(level);
    const budgetLimit = this.getBudgetLimit(level, complexity);
    const utilizationPercentage = Math.round((currentUsage / budgetLimit) * 100 * 100) / 100;

    let status: BudgetStatus;
    if (utilizationPercentage > 100) {
      status = "EXCEEDED";
    } else if (utilizationPercentage > this.config.emergencyThreshold * 100) {
      status = "EMERGENCY";
    } else if (utilizationPercentage > this.config.adaptiveThreshold * 100) {
      status = "WARNING";
    } else {
      status = "OK";
    }

    return {
      level,
      currentUsage,
      budgetLimit,
      utilizationPercentage,
      status,
      isNearLimit: utilizationPercentage > this.config.adaptiveThreshold * 100,
      isAtEmergency: utilizationPercentage > this.config.emergencyThreshold * 100,
    };
  }

  /**
   * Get current alerts for all scope levels
   */
  getAlerts(): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const levels = [ScopeLevel.GLOBAL, ScopeLevel.TASK, ScopeLevel.LOCAL];

    for (const level of levels) {
      const statusInfo = this.checkBudgetStatus(level);

      if (statusInfo.status === "WARNING" || statusInfo.status === "EMERGENCY" || statusInfo.status === "EXCEEDED") {
        const severity = statusInfo.status === "WARNING" ? "WARNING" : "EMERGENCY";

        alerts.push({
          level,
          severity,
          currentUsage: statusInfo.currentUsage,
          budgetLimit: statusInfo.budgetLimit,
          utilizationPercentage: statusInfo.utilizationPercentage,
          message: `${level} scope at ${statusInfo.utilizationPercentage.toFixed(1)}% utilization`,
          recommendedAction: this.getRecommendedAction(level, statusInfo),
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Adapt budgets based on usage patterns (if adaptive mode enabled)
   */
  adaptBudgets(): void {
    if (!this.config.adaptiveEnabled) {
      return;
    }

    const levels = [ScopeLevel.GLOBAL, ScopeLevel.TASK, ScopeLevel.LOCAL];
    let hasChanges = false;

    for (const level of levels) {
      const history = this.usageHistory.get(level) || [];
      if (history.length < 5) {
        continue; // Need at least 5 data points for adaptation
      }

      const avgUtilization = this.calculateAverageUtilization(level, history);
      const currentBudget = this.getBaseBudget(level);

      if (avgUtilization < 0.4) {
        // Consistently low usage - increase budget by 10%
        this.adjustBaseBudget(level, 1.1);
        hasChanges = true;
      } else if (avgUtilization > 0.8) {
        // Consistently high usage - decrease budget by 5%
        this.adjustBaseBudget(level, 0.95);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.adaptiveChanges++;
      this.lastAdaptation = new Date();
    }
  }

  /**
   * Reset usage for specific level or all levels
   */
  resetUsage(level?: ScopeLevel, preserveHistory: boolean = false): void {
    if (level) {
      switch (level) {
        case ScopeLevel.GLOBAL:
          this.currentUsage.global = 0;
          break;
        case ScopeLevel.TASK:
          this.currentUsage.task = 0;
          break;
        case ScopeLevel.LOCAL:
          this.currentUsage.local = 0;
          break;
      }
      if (!preserveHistory) {
        this.usageHistory.set(level, []);
      }
    } else {
      this.currentUsage = { global: 0, task: 0, local: 0 };
      if (!preserveHistory) {
        this.usageHistory.clear();
        this.usageHistory = new Map([
          [ScopeLevel.GLOBAL, []],
          [ScopeLevel.TASK, []],
          [ScopeLevel.LOCAL, []],
        ]);
      }
    }
  }

  /**
   * Get comprehensive budget metrics
   */
  getMetrics(): BudgetMetrics {
    const globalBudget = this.getBudgetLimit(ScopeLevel.GLOBAL);
    const taskBudget = this.getBudgetLimit(ScopeLevel.TASK);
    const localBudget = this.getBudgetLimit(ScopeLevel.LOCAL);

    const totalUsage = this.currentUsage.global + this.currentUsage.task + this.currentUsage.local;
    const totalBudget = globalBudget + taskBudget + localBudget;

    return {
      currentUsage: {
        global: this.currentUsage.global,
        task: this.currentUsage.task,
        local: this.currentUsage.local,
      },
      budgetLimits: {
        global: globalBudget,
        task: taskBudget,
        local: localBudget,
      },
      utilizationPercentages: {
        global: (this.currentUsage.global / globalBudget) * 100,
        task: (this.currentUsage.task / taskBudget) * 100,
        local: (this.currentUsage.local / localBudget) * 100,
      },
      totalUsage,
      totalBudget,
      overallUtilization: (totalUsage / totalBudget) * 100,
      alertCount: this.getAlerts().length,
      adaptiveChanges: this.adaptiveChanges,
    };
  }

  /**
   * Predict future budget needs based on usage trends
   */
  predictBudgetNeeds(level: ScopeLevel, stepsAhead: number): BudgetPrediction {
    const history = this.usageHistory.get(level) || [];

    if (history.length < 3) {
      return {
        projectedUsage: this.getCurrentUsage(level),
        recommendedBudget: this.getBudgetLimit(level),
        confidence: 0.1,
        trend: "stable",
      };
    }

    const trend = this.calculateTrend(history);
    const avgChange = this.calculateAverageChange(history);
    const projectedUsage = Math.max(0, this.getCurrentUsage(level) + (avgChange * stepsAhead));

    const recommendedBudget = Math.max(
      this.getBudgetLimit(level),
      projectedUsage * 1.2 // 20% buffer
    );

    const confidence = Math.min(0.9, history.length / 10); // More data = higher confidence

    return {
      projectedUsage,
      recommendedBudget,
      confidence,
      trend,
    };
  }

  /**
   * Export current state for persistence
   */
  exportState(): BudgetState {
    return {
      config: { ...this.config },
      usage: { ...this.currentUsage },
      adaptiveHistory: this.usageHistory.get(ScopeLevel.LOCAL) || [],
      lastAdaptation: this.lastAdaptation,
    };
  }

  /**
   * Import state from exported data
   */
  importState(state: BudgetState): void {
    this.config = { ...state.config };
    this.currentUsage = { ...state.usage };
    this.lastAdaptation = state.lastAdaptation;

    // Reconstruct usage history
    this.usageHistory.set(ScopeLevel.LOCAL, [...state.adaptiveHistory]);
  }

  /**
   * Private helper methods
   */
  private getCurrentUsage(level: ScopeLevel): number {
    switch (level) {
      case ScopeLevel.GLOBAL:
        return this.currentUsage.global;
      case ScopeLevel.TASK:
        return this.currentUsage.task;
      case ScopeLevel.LOCAL:
        return this.currentUsage.local;
      default:
        return 0;
    }
  }

  private getBaseBudget(level: ScopeLevel): number {
    switch (level) {
      case ScopeLevel.GLOBAL:
        return this.config.globalTokenBudget;
      case ScopeLevel.TASK:
        return this.config.taskTokenMultiplier;
      case ScopeLevel.LOCAL:
        return this.config.localTokenBudget;
      default:
        return 0;
    }
  }

  private adjustBaseBudget(level: ScopeLevel, multiplier: number): void {
    switch (level) {
      case ScopeLevel.GLOBAL:
        this.config.globalTokenBudget = Math.round(this.config.globalTokenBudget * multiplier);
        break;
      case ScopeLevel.TASK:
        this.config.taskTokenMultiplier = Math.round(this.config.taskTokenMultiplier * multiplier);
        break;
      case ScopeLevel.LOCAL:
        this.config.localTokenBudget = Math.round(this.config.localTokenBudget * multiplier);
        break;
    }
  }

  private calculateAverageUtilization(level: ScopeLevel, history: number[]): number {
    const budget = this.getBudgetLimit(level);
    const avgUsage = history.reduce((sum, usage) => sum + usage, 0) / history.length;
    return avgUsage / budget;
  }

  private calculateTrend(history: number[]): "increasing" | "decreasing" | "stable" {
    if (history.length < 3) return "stable";

    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (difference > firstAvg * 0.1) return "increasing";
    if (difference < -firstAvg * 0.1) return "decreasing";
    return "stable";
  }

  private calculateAverageChange(history: number[]): number {
    if (history.length < 2) return 0;

    let totalChange = 0;
    for (let i = 1; i < history.length; i++) {
      totalChange += history[i] - history[i - 1];
    }

    return totalChange / (history.length - 1);
  }

  private getRecommendedAction(level: ScopeLevel, statusInfo: BudgetStatusInfo): string {
    if (statusInfo.status === "EXCEEDED") {
      return `Immediate action required: trigger compression for ${level} scopes`;
    } else if (statusInfo.status === "EMERGENCY") {
      return `Urgently trigger compression for ${level} scopes`;
    } else {
      return `Consider compression for ${level} scopes`;
    }
  }
}