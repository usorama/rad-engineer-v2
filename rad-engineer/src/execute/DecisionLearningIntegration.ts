/**
 * Decision Learning Integration for /execute skill
 *
 * Integrates business outcomes, reasoning methods, and decision tracking
 * into the agent execution workflow to enable outcome-based decision making.
 *
 * This is the CORE MECHANISM that makes the platform:
 * - Deterministic: Same reasoning methods for similar contexts
 * - Self-learning: Tracks which methods work for which outcomes
 * - Self-improving: Updates method selection based on effectiveness
 *
 * @module execute/DecisionLearningIntegration
 */

import { BusinessOutcomeExtractor } from '../plan/BusinessOutcomeExtractor.js';
import { OutcomeInjector } from '../outcome/OutcomeInjector.js';
import { DecisionTracker } from '../decision/DecisionTracker.js';
import { DecisionLearningStore } from '../decision/DecisionLearningStore.js';
import type { Domain } from '../adaptive/types.js';
import type { BusinessOutcome } from '../plan/BusinessOutcomeExtractor.js';
import type { ReasoningMethod, InjectionContext } from '../outcome/OutcomeInjector.js';

/**
 * Execution context for decision learning
 */
export interface ExecutionContext {
  /** Story ID from tasks.json */
  storyId: string;

  /** Story title */
  storyTitle: string;

  /** Component/domain area */
  component: string;

  /** Activity type (implementation, testing, debugging, etc.) */
  activity: string;

  /** Complexity (0-1) */
  complexity: number;

  /** Domain classification */
  domain: Domain;

  /** Files in scope for this story */
  filesInScope: string[];

  /** Acceptance criteria */
  acceptanceCriteria: string[];
}

/**
 * Enhanced prompt with decision learning
 */
export interface EnhancedPrompt {
  /** Original prompt with learnings */
  originalPrompt: string;

  /** Business outcomes to achieve */
  businessOutcomes: BusinessOutcome[];

  /** Reasoning method to use */
  reasoningMethod: ReasoningMethod | null;

  /** Injection context */
  injectionContext: InjectionContext;

  /** Full enhanced prompt text */
  enhancedPrompt: string;

  /** Decision record ID (for tracking) */
  decisionId: string;
}

/**
 * Execution outcome for learning
 */
export interface ExecutionOutcome {
  /** Decision ID */
  decisionId: string;

  /** Success (quality gates passed) */
  success: boolean;

  /** Quality score (0-1) */
  quality: number;

  /** Execution time (ms) */
  duration?: number;

  /** Errors encountered */
  errors: string[];

  /** User feedback */
  userFeedback?: string;
}

/**
 * Configuration for decision learning integration
 */
export interface DecisionLearningConfig {
  /** Enable/disable outcome injection */
  enableOutcomeInjection: boolean;

  /** Enable/disable reasoning method selection */
  enableMethodSelection: boolean;

  /** Enable/disable decision tracking */
  enableDecisionTracking: boolean;

  /** Enable/disable outcome learning */
  enableOutcomeLearning: boolean;

  /** Path to decision store */
  decisionStorePath?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DecisionLearningConfig = {
  enableOutcomeInjection: true,
  enableMethodSelection: true,
  enableDecisionTracking: true,
  enableOutcomeLearning: true,
  decisionStorePath: '~/.config/rad-engineer/decision-store.yaml',
};

/**
 * Decision Learning Integration Manager
 *
 * Orchestrates the integration of business outcomes, reasoning methods,
 * and decision tracking into the agent execution workflow.
 */
export class DecisionLearningIntegration {
  private outcomeExtractor: BusinessOutcomeExtractor;
  private outcomeInjector: OutcomeInjector;
  private decisionTracker: DecisionTracker;
  private decisionStore: DecisionLearningStore;
  private config: Required<DecisionLearningConfig>;

  constructor(config?: Partial<DecisionLearningConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<DecisionLearningConfig>;

    // Initialize DecisionLearningStore first (shared by all components)
    this.decisionStore = new DecisionLearningStore({
      path: this.config.decisionStorePath,
      autoSave: true,
      versionsToKeep: 100,
    });

    // Initialize other components with shared DecisionLearningStore
    this.outcomeExtractor = new BusinessOutcomeExtractor();
    this.outcomeInjector = new OutcomeInjector(this.decisionStore);
    this.decisionTracker = new DecisionTracker({
      autoLinkToLearningStore: true,
      storagePath: this.config.decisionStorePath
        ? this.config.decisionStorePath.replace(/\/[^/]+\.yaml$/, '/docs/decisions')
        : './docs/decisions',
      enableKnowledgeGraph: true,
    });
  }

  /**
   * Enhance agent prompt with business outcomes and reasoning methods
   *
   * This is the main integration point called by /execute skill before spawning agents.
   *
   * @param originalPrompt - Original agent prompt with domain learnings
   * @param context - Execution context (story details)
   * @returns Enhanced prompt with decision learning
   */
  async enhancePrompt(
    originalPrompt: string,
    context: ExecutionContext
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now();

    // Generate decision ID for tracking
    const decisionId = `DEC-${context.storyId}-${Date.now()}`;

    // Build injection context
    const injectionContext: InjectionContext = {
      domain: context.domain,
      complexity: context.complexity,
      component: context.component,
      activity: context.activity,
    };

    let businessOutcomes: BusinessOutcome[] = [];
    let reasoningMethod: ReasoningMethod | null = null;

    // Step 1: Extract business outcomes (if enabled)
    if (this.config.enableOutcomeInjection) {
      try {
        // Extract outcomes from execution plan (if available)
        businessOutcomes = await this.extractBusinessOutcomes(context);
      } catch (error) {
        console.warn(`Failed to extract business outcomes: ${error}`);
        // Continue without outcomes - non-fatal
      }
    }

    // Step 2: Select reasoning method (if enabled)
    if (this.config.enableMethodSelection) {
      try {
        reasoningMethod = this.selectReasoningMethod(injectionContext);
      } catch (error) {
        console.warn(`Failed to select reasoning method: ${error}`);
        // Continue without method selection - non-fatal
      }
    }

    // Step 3: Inject outcomes and method into prompt
    const enhancedPrompt = this.buildEnhancedPrompt(
      originalPrompt,
      businessOutcomes,
      reasoningMethod,
      context
    );

    // Step 4: Track decision (if enabled)
    if (this.config.enableDecisionTracking) {
      try {
        await this.trackDecision(decisionId, context, reasoningMethod);
      } catch (error) {
        console.warn(`Failed to track decision: ${error}`);
        // Continue without tracking - non-fatal
      }
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 1000) {
      console.warn(`DecisionLearningIntegration.enhancePrompt took ${elapsed}ms`);
    }

    return {
      originalPrompt,
      businessOutcomes,
      reasoningMethod,
      injectionContext,
      enhancedPrompt,
      decisionId,
    };
  }

  /**
   * Record execution outcome for learning
   *
   * Called after agent completes task to measure success and update learning.
   *
   * @param outcome - Execution outcome to record
   */
  async recordOutcome(outcome: ExecutionOutcome): Promise<void> {
    if (!this.config.enableOutcomeLearning) {
      return;
    }

    const startTime = Date.now();

    try {
      // Update DecisionLearningStore with outcome
      await this.decisionStore.learnFromOutcome({
        decisionId: outcome.decisionId,
        success: outcome.success,
        quality: outcome.quality,
        latency: outcome.duration,
        errors: outcome.errors,
        userFeedback: outcome.userFeedback,
      });

      // Update DecisionTracker ADR status based on outcome
      try {
        if (outcome.success) {
          await this.decisionTracker.updateADR(outcome.decisionId, {
            status: 'accepted',
          });
        } else {
          await this.decisionTracker.updateADR(outcome.decisionId, {
            status: 'rejected',
          });
        }
      } catch (error) {
        // ADR might not exist (tracking disabled or failed)
        console.warn(`Failed to update ADR status: ${error}`);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > 1000) {
        console.warn(`DecisionLearningIntegration.recordOutcome took ${elapsed}ms`);
      }
    } catch (error) {
      console.error(`Failed to record outcome: ${error}`);
      // Non-fatal - log and continue
    }
  }

  /**
   * Extract business outcomes from execution plan
   *
   * @param context - Execution context
   * @returns Business outcomes (empty array if none found)
   */
  private async extractBusinessOutcomes(_context: ExecutionContext): Promise<BusinessOutcome[]> {
    // Try to read execution plan to extract outcomes
    // For now, return empty array - this would read from IMPLEMENTATION_PLAN.md
    // and call BusinessOutcomeExtractor.extractOutcomes()
    return [];
  }

  /**
   * Select reasoning method based on context
   *
   * @param injectionContext - Injection context (domain, complexity, etc.)
   * @returns Best reasoning method for this context
   */
  private selectReasoningMethod(injectionContext: InjectionContext): ReasoningMethod | null {
    // Use OutcomeInjector to select best method
    // Convert InjectionContext to DecisionContext by adding required fields
    const decisionContext = {
      domain: injectionContext.domain,
      complexity: injectionContext.complexity,
      constraints: [], // Could be extracted from context
      stakeholders: [], // Could be extracted from context
    };
    return this.outcomeInjector.selectReasoningMethod(decisionContext);
  }

  /**
   * Track decision in DecisionTracker and DecisionLearningStore
   *
   * @param decisionId - Decision ID
   * @param context - Execution context
   * @param reasoningMethod - Selected reasoning method
   */
  private async trackDecision(
    decisionId: string,
    context: ExecutionContext,
    reasoningMethod: ReasoningMethod | null
  ): Promise<void> {
    // Step 1: Store decision in DecisionLearningStore
    // This is required for learnFromOutcome() to work later
    try {
      // Create ReasoningMethod object for DecisionLearningStore
      const learningStoreMethod = reasoningMethod || {
        name: 'default',
        category: 'Core',
        parameters: {},
      };

      this.decisionStore.storeDecision({
        id: decisionId,
        timestamp: Date.now(),
        component: context.component,
        activity: context.activity,
        decision: reasoningMethod
          ? `Use ${reasoningMethod.name} reasoning method`
          : 'Use default implementation approach',
        context: {
          domain: context.domain,
          complexity: context.complexity,
          constraints: [], // Could be extracted from acceptance criteria
          stakeholders: [], // Could be extracted from context
        },
        reasoningMethod: learningStoreMethod,
        confidence: reasoningMethod ? 0.8 : 0.5, // Higher confidence if method selected
        importanceWeights: [0.5, 0.3, 0.2], // Domain, complexity, activity weights
      });
    } catch (error) {
      console.warn(`Failed to store decision in DecisionLearningStore: ${error}`);
      // Continue without storing - non-fatal
    }

    // Step 2: Create ADR in DecisionTracker
    // Always provide at least 2 options (requirement for proper ADRs)
    try {
      await this.decisionTracker.createADR({
        title: `Technical decision for ${context.storyId}: ${context.storyTitle}`,
        status: 'proposed',
        category: 'general',
        contextAndProblemStatement: `${context.component} - ${context.activity}\n\nAcceptance Criteria:\n${context.acceptanceCriteria.map(c => `- ${c}`).join('\n')}`,
        decisionDrivers: [
          'Domain: ' + context.domain,
          'Complexity: ' + context.complexity.toFixed(2),
          reasoningMethod ? 'Method: ' + reasoningMethod.name : 'No specific method',
        ],
        consideredOptions: reasoningMethod ? [
          {
            title: reasoningMethod.name,
            description: `Use ${reasoningMethod.category} reasoning method`,
          },
          {
            title: 'Default Implementation Approach',
            description: 'Standard implementation without specific reasoning method',
          },
        ] : [
          {
            title: 'Default Implementation Approach',
            description: 'Standard implementation without specific reasoning method',
          },
          {
            title: 'TDD-First Approach',
            description: 'Test-driven development with extensive test coverage',
          },
        ],
        decisionOutcome: reasoningMethod ? {
          chosenOption: reasoningMethod.name,
          justification: `Best fit for ${context.domain} domain with complexity ${context.complexity.toFixed(2)}`,
        } : {
          chosenOption: 'Default Implementation Approach',
          justification: 'Standard implementation approach for this context',
        },
        prosAndCons: reasoningMethod ? [
          {
            option: reasoningMethod.name,
            pros: [
              'Proven effective for similar contexts',
              'Supports deterministic decision making',
            ],
            cons: [
              'May require more time for complex reasoning',
            ],
          },
          {
            option: 'Default Implementation Approach',
            pros: [
              'Fast and straightforward',
              'No additional overhead',
            ],
            cons: [
              'May miss edge cases',
              'Less systematic decision making',
            ],
          },
        ] : [
          {
            option: 'Default Implementation Approach',
            pros: [
              'Fast and straightforward',
              'No additional overhead',
            ],
            cons: [
              'May miss edge cases',
              'Less systematic decision making',
            ],
          },
          {
            option: 'TDD-First Approach',
            pros: [
              'Comprehensive test coverage',
              'Better code quality',
            ],
            cons: [
              'Slower initial development',
              'More maintenance overhead',
            ],
          },
        ],
        consequences: {
          positive: [
            'Improved decision quality',
            'Better outcome alignment',
          ],
          negative: [
            'Additional overhead for reasoning',
          ],
        },
        decisionMakers: ['execute-skill'],
        consulted: [],
        informed: [],
        evidenceSources: [],
      });
    } catch (error) {
      console.warn(`Failed to create ADR in DecisionTracker: ${error}`);
      // Continue without ADR - non-fatal
    }
  }

  /**
   * Build enhanced prompt with outcomes and method
   *
   * @param originalPrompt - Original prompt
   * @param outcomes - Business outcomes
   * @param method - Reasoning method
   * @param context - Execution context
   * @returns Enhanced prompt text
   */
  private buildEnhancedPrompt(
    originalPrompt: string,
    outcomes: BusinessOutcome[],
    method: ReasoningMethod | null,
    context: ExecutionContext
  ): string {
    let enhanced = originalPrompt;
    let injection = '';

    // Inject business outcomes
    if (outcomes.length > 0) {
      injection += '\n## Business Outcomes to Achieve\n\n';
      injection += 'Keep these business outcomes in mind during implementation:\n\n';

      for (const outcome of outcomes.slice(0, 5)) { // Max 5 outcomes
        injection += `### ${outcome.title} (${outcome.category})\n`;
        injection += `${outcome.description}\n`;
        if (outcome.successCriteria.length > 0) {
          injection += '**Success Criteria:**\n';
          for (const criterion of outcome.successCriteria.slice(0, 3)) {
            injection += `- ${criterion}\n`;
          }
        }
        injection += '\n';
      }
    }

    // Inject reasoning method
    if (method) {
      injection += '\n## Reasoning Method\n\n';
      injection += `Use the **${method.name}** method (${method.category} category) for this task.\n\n`;
      injection += 'This method has been selected based on:\n';
      injection += `- Domain: ${context.domain}\n`;
      injection += `- Complexity: ${context.complexity.toFixed(2)}\n`;
      injection += `- Component: ${context.component}\n`;
      injection += `- Activity: ${context.activity}\n\n`;
      injection += 'Apply this reasoning method to make better technical decisions.\n\n';
    }

    // Inject at the end of the prompt (before quality gates if exists)
    if (injection) {
      // Try to insert before "### Quality Gates" if it exists
      if (enhanced.includes('### Quality Gates')) {
        enhanced = enhanced.replace(/### Quality Gates/, injection + '\n### Quality Gates');
      } else {
        // Otherwise, append to end
        enhanced = enhanced + injection;
      }
    }

    return enhanced;
  }

  /**
   * Get decision learning statistics
   *
   * @returns Statistics about decision learning effectiveness
   */
  async getStatistics(): Promise<{
    totalDecisions: number;
    averageQuality: number;
    successRate: number;
    bestMethod: string | null;
  }> {
    const stats = this.decisionStore.getState().statistics;

    return {
      totalDecisions: stats.totalDecisions,
      averageQuality: stats.averageQuality,
      successRate: stats.successRate,
      bestMethod: Object.keys(stats.bestMethods)[0] || null,
    };
  }
}

/**
 * Singleton instance for /execute skill
 */
let integrationInstance: DecisionLearningIntegration | null = null;

/**
 * Get or create the integration instance
 *
 * @param config - Optional configuration
 * @returns Integration instance
 */
export function getDecisionLearningIntegration(config?: Partial<DecisionLearningConfig>): DecisionLearningIntegration {
  if (!integrationInstance) {
    integrationInstance = new DecisionLearningIntegration(config);
  }
  return integrationInstance;
}

/**
 * Reset the integration instance (for testing)
 */
export function resetDecisionLearningIntegration(): void {
  integrationInstance = null;
}
