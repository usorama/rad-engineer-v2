/**
 * HierarchicalMemory - Main memory manager implementing CCA-style hierarchical context
 * Orchestrates Scope, ScopeStack, and ScopeCompressor for O(log n) token growth
 * Provides adaptive token budgets and automatic compression
 */

import { Scope, ScopeLevel, type ContextEvent } from "./Scope";
import { ScopeStack } from "./ScopeStack";
import { ScopeCompressor, CompressionStrategy, type CompressionResult } from "./ScopeCompressor";

export interface MemoryConfig {
  globalTokenBudget: number;      // GLOBAL scope budget (default: 2000)
  taskTokenMultiplier: number;    // TASK scope base budget (default: 4000)
  localTokenBudget: number;       // LOCAL scope budget (default: 2000)
  compressionThreshold: number;   // Trigger compression at % of budget (default: 0.8)
  autoCompression: boolean;       // Auto-compress on scope close (default: true)
}

export interface MemoryMetrics {
  totalScopes: number;
  totalTokens: number;
  currentScopeDepth: number;
  compressionEvents: number;
  budgetUtilization: {
    global: number;
    task: number;
    local: number;
  };
}

export interface BudgetStatus {
  level: ScopeLevel;
  currentTokens: number;
  budgetLimit: number;
  utilizationPercentage: number;
  isNearLimit: boolean;    // ≥80% of budget
  isOverBudget: boolean;   // >100% of budget
}

interface ScopeCreateParams {
  goal: string;
  level: ScopeLevel;
  complexity?: number;  // For TASK scopes: multiplier for token budget
}

/**
 * HierarchicalMemory provides the main API for hierarchical context management
 * Implements CCA patterns with automatic compression for memory efficiency
 */
export class HierarchicalMemory {
  private readonly config: MemoryConfig;
  private readonly stack: ScopeStack;
  private readonly compressor: ScopeCompressor;
  private scopeRegistry: Map<string, Scope>;
  private compressionEventCount: number;
  private readonly DEFAULT_CONFIG: MemoryConfig = {
    globalTokenBudget: 2000,
    taskTokenMultiplier: 4000,
    localTokenBudget: 2000,
    compressionThreshold: 0.8,
    autoCompression: true,
  };

  constructor(config?: Partial<MemoryConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.stack = new ScopeStack();
    this.compressor = new ScopeCompressor(CompressionStrategy.BALANCED);
    this.scopeRegistry = new Map();
    this.compressionEventCount = 0;
  }

  /**
   * Create a new scope and push it onto the stack
   * Returns the scope ID for future reference
   */
  createScope(params: ScopeCreateParams): string {
    const scopeId = this.generateScopeId(params.level);
    const parentId = this.getCurrentScope()?.id || null;

    const scope = new Scope({
      id: scopeId,
      parentId,
      goal: params.goal,
      level: params.level,
      events: [],
    });

    this.stack.push(scope);
    this.scopeRegistry.set(scopeId, scope);

    return scopeId;
  }

  /**
   * Add an event to the current scope
   */
  addEvent(event: ContextEvent): void {
    const currentScope = this.getCurrentScope();
    if (!currentScope) {
      // Auto-create a LOCAL scope for orphaned events
      this.createScope({ goal: "Auto-created for event", level: ScopeLevel.LOCAL });
      const scope = this.getCurrentScope();
      scope?.addEvent(event);
    } else {
      currentScope.addEvent(event);
    }

    // Check for compression trigger
    this.checkCompressionTrigger();
  }

  /**
   * Set an artifact in the current scope
   */
  setArtifact(key: string, value: unknown): void {
    const currentScope = this.getCurrentScope();
    if (!currentScope) {
      // Auto-create a LOCAL scope for orphaned artifacts
      this.createScope({ goal: "Auto-created for artifact", level: ScopeLevel.LOCAL });
      const scope = this.getCurrentScope();
      scope?.setArtifact(key, value);
    } else {
      currentScope.setArtifact(key, value);
    }
  }

  /**
   * Get an artifact from current scope or search parent scopes
   * Implements scope chain lookup similar to lexical scoping
   */
  getArtifact<T = unknown>(key: string): T | undefined {
    // First search active scopes in the stack
    for (let depth = 0; depth < this.stack.size(); depth++) {
      const scope = this.stack.peek(depth);
      if (scope) {
        const artifact = scope.getArtifact<T>(key);
        if (artifact !== undefined) {
          return artifact;
        }
      }
    }

    // If not found in active scopes, search all scopes in registry
    // (includes closed scopes that were popped from stack)
    for (const scope of this.scopeRegistry.values()) {
      const artifact = scope.getArtifact<T>(key);
      if (artifact !== undefined) {
        return artifact;
      }
    }

    return undefined;
  }

  /**
   * Close the current scope with a summary
   * Triggers compression if auto-compression is enabled
   */
  async closeScope(summary: string): Promise<void> {
    const currentScope = this.getCurrentScope();
    if (!currentScope) {
      return;
    }

    currentScope.close(summary);

    // Pop the closed scope to return to parent
    this.stack.pop();

    // Auto-compress if enabled and scope meets criteria
    if (this.config.autoCompression) {
      await this.scheduleCompression(currentScope);
    }
  }

  /**
   * Pop the current scope from the stack and return it
   */
  popScope(): Scope | null {
    const scope = this.stack.pop();
    if (scope && !scope.isClosed()) {
      // Auto-close if not already closed
      scope.close("Scope popped without explicit close");
    }
    return scope;
  }

  /**
   * Get the current (top) scope
   */
  getCurrentScope(): Scope | null {
    return this.stack.current();
  }

  /**
   * Get a scope by ID from the registry
   */
  getScope(id: string): Scope | null {
    return this.scopeRegistry.get(id) || null;
  }

  /**
   * Get the current scope hierarchy path
   */
  getScopePath(): string[] {
    return this.stack.getAllScopes().map(scope => scope.goal);
  }

  /**
   * Get scopes filtered by level
   */
  getScopesByLevel(level: ScopeLevel): Scope[] {
    return Array.from(this.scopeRegistry.values()).filter(scope => scope.level === level);
  }

  /**
   * Manually trigger compression
   * Returns compression results for monitoring
   */
  async compress(levelFilter?: ScopeLevel): Promise<CompressionResult[]> {
    // Get all scopes from registry (includes closed scopes not in stack)
    const allScopes = Array.from(this.scopeRegistry.values());
    const scopesToCompress = allScopes.filter(scope => {
      const isClosedAndMatches = scope.isClosed() &&
        (!levelFilter || scope.level === levelFilter);
      return isClosedAndMatches;
    });

    const results: CompressionResult[] = [];

    for (const scope of scopesToCompress) {
      try {
        const result = await this.compressor.compressScope(scope);
        results.push(result);
      } catch (error) {
        // Log error but continue with other scopes
        console.warn(`Failed to compress scope ${scope.id}:`, error);
      }
    }

    this.compressionEventCount += results.length;
    return results;
  }

  /**
   * Get current memory usage metrics
   */
  getMetrics(): MemoryMetrics {
    const globalScopes = this.getScopesByLevel(ScopeLevel.GLOBAL);
    const taskScopes = this.getScopesByLevel(ScopeLevel.TASK);
    const localScopes = this.getScopesByLevel(ScopeLevel.LOCAL);

    const globalTokens = globalScopes.reduce((sum, s) => sum + s.getTokenCount(), 0);
    const taskTokens = taskScopes.reduce((sum, s) => sum + s.getTokenCount(), 0);
    const localTokens = localScopes.reduce((sum, s) => sum + s.getTokenCount(), 0);
    const totalTokens = globalTokens + taskTokens + localTokens;

    return {
      totalScopes: this.scopeRegistry.size,
      totalTokens,
      currentScopeDepth: this.stack.size(),
      compressionEvents: this.compressionEventCount,
      budgetUtilization: {
        global: Math.min(100, (globalTokens / this.config.globalTokenBudget) * 100),
        task: Math.min(100, (taskTokens / this.config.taskTokenMultiplier) * 100),
        local: Math.min(100, (localTokens / this.config.localTokenBudget) * 100),
      },
    };
  }

  /**
   * Get budget status for current scope
   */
  getBudgetStatus(): BudgetStatus | null {
    const currentScope = this.getCurrentScope();
    if (!currentScope) {
      return null;
    }

    const currentTokens = currentScope.getTokenCount();
    const budgetLimit = this.getBudgetForLevel(currentScope.level, 1);
    const utilizationPercentage = (currentTokens / budgetLimit) * 100;

    return {
      level: currentScope.level,
      currentTokens,
      budgetLimit,
      utilizationPercentage,
      isNearLimit: utilizationPercentage >= 80,
      isOverBudget: utilizationPercentage > 100,
    };
  }

  /**
   * Clear all memory and reset to initial state
   */
  clearMemory(): void {
    this.stack.clear();
    this.scopeRegistry.clear();
    this.compressor.clearMetrics();
    this.compressionEventCount = 0;
  }

  /**
   * Generate unique scope ID with level prefix
   */
  private generateScopeId(level: ScopeLevel): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const prefix = level.toLowerCase().substring(0, 1);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get token budget for a specific scope level
   */
  private getBudgetForLevel(level: ScopeLevel, complexity: number = 1): number {
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
   * Check if compression should be triggered
   */
  private checkCompressionTrigger(): void {
    const metrics = this.getMetrics();
    const threshold = this.config.compressionThreshold * 100;

    // Trigger compression if any level exceeds threshold
    if (
      metrics.budgetUtilization.local > threshold ||
      metrics.budgetUtilization.task > threshold
    ) {
      // Schedule async compression (don't block current operation)
      setTimeout(() => {
        this.compress(ScopeLevel.LOCAL); // Compress LOCAL scopes first
      }, 0);
    }
  }

  /**
   * Schedule compression for a specific scope
   */
  private async scheduleCompression(scope: Scope): Promise<void> {
    if (!scope.isClosed()) {
      return;
    }

    try {
      await this.compressor.compressScope(scope);
      this.compressionEventCount++;
    } catch (error) {
      console.warn(`Failed to compress scope ${scope.id}:`, error);
    }
  }

  /**
   * Get compression recommendations based on current state
   */
  getCompressionRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.budgetUtilization.global > 90) {
      recommendations.push("GLOBAL scope approaching limit - consider architectural changes");
    }

    if (metrics.budgetUtilization.task > 85) {
      recommendations.push("TASK scopes high utilization - consider breaking into smaller tasks");
    }

    if (metrics.budgetUtilization.local > 85) {
      recommendations.push("LOCAL scopes high utilization - compression recommended");
    }

    if (metrics.totalTokens > 10000) {
      recommendations.push("Total memory usage high - consider aggressive compression strategy");
    }

    const compressorRecs = this.compressor.getCompressionRecommendations();
    recommendations.push(...compressorRecs);

    return recommendations;
  }

  /**
   * Export memory state for debugging or persistence
   */
  exportState(): {
    config: MemoryConfig;
    metrics: MemoryMetrics;
    scopePath: string[];
    compressionMetrics: ReturnType<ScopeCompressor['getCompressionMetrics']>;
  } {
    return {
      config: this.config,
      metrics: this.getMetrics(),
      scopePath: this.getScopePath(),
      compressionMetrics: this.compressor.getCompressionMetrics(),
    };
  }
}