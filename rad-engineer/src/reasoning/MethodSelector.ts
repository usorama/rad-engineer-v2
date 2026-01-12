/**
 * BMAD Method Selector
 *
 * Selects the most appropriate reasoning method based on decision context.
 * Implements intelligent selection algorithm with learning integration.
 */

import type {
  ReasoningMethod,
  MethodSelectionContext,
  MethodWithScore,
  MethodSelectionResult,
} from './types.js';
import { MethodCatalog } from './MethodCatalog.js';
import { DecisionLearningStore } from '../decision/DecisionLearningStore.js';

/**
 * Time requirement thresholds (in seconds)
 */
const TIME_THRESHOLDS = {
  quick: 60,      // 1 minute
  medium: 300,    // 5 minutes
  extensive: 900, // 15 minutes
};

/**
 * Complexity tolerance
 */
const COMPLEXITY_TOLERANCE = 2.0;

/**
 * Method Selector class
 *
 * Selects reasoning methods based on decision context and historical data.
 */
export class MethodSelector {
  private catalog: MethodCatalog;
  private decisionStore: DecisionLearningStore;

  constructor(catalog: MethodCatalog, decisionStore?: DecisionLearningStore) {
    this.catalog = catalog;
    this.decisionStore = decisionStore ?? new DecisionLearningStore();
  }

  /**
   * Select best method for context
   *
   * @param context - Method selection context
   * @returns Selected method with metadata
   */
  selectMethod(context: MethodSelectionContext): MethodSelectionResult {
    const startTime = Date.now();

    try {
      // Get all methods
      let methods = this.catalog.getAllMethods();

      // Filter by applicability
      methods = this.filterByApplicability(methods, context);

      // Sort by relevance
      const scored = this.sortByRelevance(methods, context);

      // Get best method
      const best = this.getBestMethod(scored);

      // Check for fallback
      const fallbackUsed = scored.length === 0;

      // Get alternatives
      const alternatives = scored
        .slice(1, 4)
        .map(s => s.method);

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > 100) {
        console.warn(`METHOD_SELECTION_TIMEOUT: Took ${elapsed}ms`);
      }

      return {
        method: best.method,
        confidence: best.score,
        reasons: best.reasons,
        alternatives,
        fallbackUsed,
      };
    } catch (error) {
      console.error('METHOD_SELECTION_ERROR:', error);
      // Fallback to First Principles
      const fallback = this.getFallbackMethod();
      return {
        method: fallback.method,
        confidence: fallback.score,
        reasons: fallback.reasons,
        alternatives: [],
        fallbackUsed: true,
      };
    }
  }

  /**
   * Filter methods by applicability to context
   *
   * @param methods - All methods
   * @param context - Selection context
   * @returns Filtered methods
   */
  private filterByApplicability(
    methods: ReasoningMethod[],
    context: MethodSelectionContext
  ): ReasoningMethod[] {
    return methods.filter(method => {
      // Filter by domain
      if (!method.domains.includes(context.domain)) {
        return false;
      }

      // Filter by time available
      const methodTime = TIME_THRESHOLDS[method.timeRequired];
      if (context.timeAvailable < methodTime) {
        return false;
      }

      // Filter by stakeholders
      const requiredPeople = this.stakeholderCount(method.stakeholders);
      const availablePeople = context.stakeholders.length;
      if (requiredPeople > availablePeople) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort methods by relevance to context
   *
   * @param methods - Filtered methods
   * @param context - Selection context
   * @returns Methods with scores
   */
  private sortByRelevance(
    methods: ReasoningMethod[],
    context: MethodSelectionContext
  ): MethodWithScore[] {
    const scored: MethodWithScore[] = [];

    for (const method of methods) {
      const score = this.calculateScore(method, context);
      scored.push(score);
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Calculate relevance score for method
   *
   * @param method - Method to score
   * @param context - Selection context
   * @returns Method with score
   */
  private calculateScore(
    method: ReasoningMethod,
    context: MethodSelectionContext
  ): MethodWithScore {
    let score = 0;
    const reasons: string[] = [];

    // Complexity match (30 points)
    const complexityDiff = Math.abs(method.complexity - context.complexity);
    if (complexityDiff <= COMPLEXITY_TOLERANCE) {
      const complexityScore = 30 * (1 - complexityDiff / 10);
      score += complexityScore;
      if (complexityScore > 20) {
        reasons.push(`Complexity match (${method.complexity} ≈ ${context.complexity})`);
      }
    }

    // Domain match (25 points)
    if (method.domains.includes(context.domain)) {
      score += 25;
      reasons.push(`Domain applicable (${context.domain})`);
    }

    // Time efficiency (20 points)
    const methodTime = TIME_THRESHOLDS[method.timeRequired];
    if (context.timeAvailable >= methodTime) {
      const timeScore = 20 * (methodTime / context.timeAvailable);
      score += Math.min(timeScore, 20);
      reasons.push(`Time fit (${method.timeRequired})`);
    }

    // Historical effectiveness (25 points)
    try {
      const effectiveness = this.decisionStore['methodEffectiveness']?.get(method.name) ?? 0.5;
      const historyScore = 25 * effectiveness;
      score += historyScore;
      if (effectiveness > 0.7) {
        reasons.push(`Historically effective (${Math.round(effectiveness * 100)}%)`);
      }
    } catch {
      // If we can't get effectiveness, skip this factor
    }

    return {
      method,
      score: Math.max(0, Math.min(100, score)),
      reasons,
    };
  }

  /**
   * Get best method from scored list
   *
   * @param scored - Scored methods
   * @returns Best method with score
   */
  private getBestMethod(scored: MethodWithScore[]): MethodWithScore {
    if (scored.length === 0) {
      return this.getFallbackMethod();
    }

    return scored[0];
  }

  /**
   * Get fallback method (First Principles)
   *
   * @returns Fallback method
   */
  private getFallbackMethod(): MethodWithScore {
    const method = this.catalog.getMethod('first-principles-analysis');

    if (!method) {
      // If First Principles not found, create default
      return {
        method: {
          id: 'first-principles',
          name: 'First Principles Analysis',
          category: 'core',
          description: 'Strip away assumptions to rebuild from fundamental truths',
          outputPattern: 'assumptions → truths → new approach',
          domains: ['code', 'creative', 'reasoning', 'analysis'],
          complexity: 3,
          timeRequired: 'quick',
          stakeholders: 'solo',
          parameters: {},
        },
        score: 50,
        reasons: ['Fallback method - catalog not loaded'],
      };
    }

    return {
      method,
      score: 50,
      reasons: ['Fallback method - no suitable methods found'],
    };
  }

  /**
   * Get stakeholder count requirement
   *
   * @param requirement - Stakeholder requirement
   * @returns Number of people required
   */
  private stakeholderCount(requirement: 'solo' | 'pair' | 'team'): number {
    switch (requirement) {
      case 'solo':
        return 1;
      case 'pair':
        return 2;
      case 'team':
        return 3;
    }
  }
}
