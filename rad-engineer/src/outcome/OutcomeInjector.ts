/**
 * Outcome Injector
 *
 * Injects business outcomes and reasoning methods into agent prompts
 * to enable outcome-based decision making across the platform.
 *
 * This is the CORE MECHANISM that makes the platform deterministic, self-learning,
 * and self-improving.
 */

import type { Domain } from '../adaptive/types.js';
import type { BusinessOutcome } from '../plan/BusinessOutcomeExtractor.js';
import { DecisionLearningStore } from '../decision/DecisionLearningStore.js';

/**
 * Injection context for outcome injection
 */
export interface InjectionContext {
  domain: Domain;
  complexity: number;
  component: string;
  activity: string;
}

/**
 * Decision context for reasoning method selection
 */
export interface DecisionContext {
  domain: Domain;
  complexity: number;
  constraints: string[];
  stakeholders: string[];
}

/**
 * Reasoning method to inject
 */
export interface ReasoningMethod {
  name: string;
  category: MethodCategory;
  parameters: Record<string, unknown>;
}

/**
 * Method category
 */
export type MethodCategory = 'Core' | 'Advanced' | 'Risk' | 'Competitive' | 'Research';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Decision outcome for tracking
 */
export interface DecisionOutcome {
  success: boolean;
  quality: number;
  errors: string[];
  decisionId: string;
}

/**
 * Injection tracking record
 */
interface InjectionTracking {
  injectionId: string;
  outcomes: BusinessOutcome[];
  method: ReasoningMethod | null;
  timestamp: number;
  context: InjectionContext;
}

/**
 * Maximum prompt size (from agent-context-v2.md)
 */
const MAX_PROMPT_SIZE = 500;

/**
 * Known reasoning methods from BMAD research
 */
const KNOWN_METHODS = [
  'First Principles',
  '5 Whys',
  'Socratic Questioning',
  'Root Cause Analysis',
  'SWOT Analysis',
  'Tree of Thoughts',
  'Self-Consistency',
  'Chain of Thought',
  'Pre-mortem Analysis',
  'Failure Mode Analysis',
  'Red Team vs Blue Team',
  "Devil's Advocate",
];

/**
 * Outcome Injector class
 *
 * Injects business outcomes and reasoning methods into agent prompts
 * for outcome-based decision making.
 */
export class OutcomeInjector {
  private decisionStore: DecisionLearningStore;
  private activeInjections: Map<string, InjectionTracking>;
  private injectionCounter = 0;

  constructor(decisionStore?: DecisionLearningStore) {
    this.decisionStore = decisionStore ?? new DecisionLearningStore();
    this.activeInjections = new Map();
  }

  /**
   * Inject business outcomes into agent prompt
   *
   * @param basePrompt - Original agent prompt to enhance
   * @param outcomes - Business outcomes to inject
   * @param context - Injection context
   * @returns Enhanced prompt with outcomes injected
   */
  injectOutcomes(basePrompt: string, outcomes: BusinessOutcome[], context: InjectionContext): string {
    // Validate inputs
    if (!basePrompt || basePrompt.trim().length === 0) {
      throw new Error('BASE_PROMPT_EMPTY: Base prompt cannot be empty');
    }

    if (!outcomes || outcomes.length === 0) {
      console.warn('NO_OUTCOMES_PROVIDED: No outcomes to inject, returning base prompt');
      return basePrompt;
    }

    // Validate outcome format
    const validOutcomes = outcomes.filter((o) => this.isValidOutcome(o));
    if (validOutcomes.length === 0) {
      console.warn('INVALID_OUTCOME_FORMAT: No valid outcomes after filtering');
      return basePrompt;
    }

    // Prioritize outcomes
    const prioritized = this.prioritizeOutcomes(validOutcomes, context);

    // Format injection
    let injection = this.formatOutcomes(prioritized);

    // Check size limit
    if (basePrompt.length + injection.length > MAX_PROMPT_SIZE) {
      injection = this.truncateToFit(injection, MAX_PROMPT_SIZE - basePrompt.length);
      console.warn(`BASE_PROMPT_TOO_LARGE: Truncated outcomes to fit within ${MAX_PROMPT_SIZE} chars`);
    }

    // Validate injection won't break prompt (only validate structure, not size since we already handled it)
    const validation = this.validateInjection(basePrompt, injection, true);
    if (!validation.valid) {
      console.error('INJECTION_VALIDATION_FAILED:', validation.errors);
      throw new Error(`INJECTION_VALIDATION_FAILED: ${validation.errors.join(', ')}`);
    }

    return basePrompt + '\n\n' + injection;
  }

  /**
   * Select best reasoning method for context
   *
   * @param context - Decision context
   * @returns Selected reasoning method
   */
  selectReasoningMethod(context: DecisionContext): ReasoningMethod {
    const startTime = Date.now();

    try {
      // Query DecisionLearningStore for best method
      const method = this.decisionStore.getBestMethod(context);

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > 1000) {
        console.warn(`METHOD_SELECTION_TIMEOUT: Took ${elapsed}ms, using default`);
        return this.getDefaultMethod();
      }

      return method;
    } catch (error) {
      if (error instanceof Error && error.message.includes('INSUFFICIENT_DATA')) {
        console.warn('INSUFFICIENT_DATA: Using default method');
        return this.getDefaultMethod();
      }

      console.error('STORE_UNAVAILABLE:', error);
      return this.getDefaultMethod();
    }
  }

  /**
   * Inject reasoning method into agent prompt
   *
   * @param basePrompt - Agent prompt to enhance
   * @param method - Reasoning method to inject
   * @returns Enhanced prompt with reasoning method guidance
   */
  injectReasoningMethod(basePrompt: string, method: ReasoningMethod): string {
    // Validate inputs
    if (!basePrompt || basePrompt.trim().length === 0) {
      throw new Error('BASE_PROMPT_EMPTY: Base prompt cannot be empty');
    }

    if (!this.isValidMethod(method)) {
      console.error('METHOD_FORMAT_INVALID: Invalid reasoning method structure');
      return basePrompt;
    }

    // Format injection
    const injection = this.formatReasoningMethod(method);

    // Check size limit
    if (basePrompt.length + injection.length > MAX_PROMPT_SIZE) {
      console.warn('PROMPT_SIZE_EXCEEDED: Shortening method description');
      const shortened = this.shortenMethodDescription(method);
      if (basePrompt.length + shortened.length <= MAX_PROMPT_SIZE) {
        return basePrompt + '\n\n' + shortened;
      }
      console.error('PROMPT_SIZE_EXCEEDED: Cannot fit even shortened method');
      return basePrompt;
    }

    return basePrompt + '\n\n' + injection;
  }

  /**
   * Track injection effectiveness for learning
   *
   * @param injectionId - Unique identifier for this injection
   * @param outcome - Decision outcome
   */
  trackInjectionEffectiveness(injectionId: string, outcome: DecisionOutcome): void {
    const startTime = Date.now();

    try {
      // Check if injection exists
      const tracking = this.activeInjections.get(injectionId);
      if (!tracking) {
        console.warn(`INJECTION_NOT_FOUND: ${injectionId} not found in tracking`);
        return;
      }

      // Update DecisionLearningStore
      const maxRetries = 3;
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < maxRetries) {
        try {
          this.decisionStore.learnFromOutcome(outcome);
          break;
        } catch (error) {
          lastError = error as Error;
          attempt++;
          if (attempt >= maxRetries) {
            throw lastError;
          }
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 100;
          const waitUntil = Date.now() + delay;
          while (Date.now() < waitUntil) {
            // Busy wait
          }
        }
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > 3000) {
        console.warn(`TRACKING_TIMEOUT: Took ${elapsed}ms`);
      }
    } catch (error) {
      console.error('LEARN_FROM_OUTCOME_FAILED:', error);
    }
  }

  /**
   * Validate that injection won't break agent prompt
   *
   * @param prompt - Original agent prompt
   * @param injection - Content to inject
   * @param skipSizeCheck - Skip size validation (when already handled)
   * @returns Validation result
   */
  validateInjection(prompt: string, injection: string, skipSizeCheck = false): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Size validation (unless skipped)
    if (!skipSizeCheck && prompt.length + injection.length > MAX_PROMPT_SIZE) {
      errors.push(
        `INJECTION_TOO_LARGE: Total size ${prompt.length + injection.length} exceeds ${MAX_PROMPT_SIZE}`
      );
    }

    // Check 2: Structure validation
    const combined = prompt + '\n\n' + injection;
    if (!this.hasValidStructure(combined)) {
      errors.push('INJECTION_BREAKS_STRUCTURE: Prompt structure invalid after injection');
    }

    // Check 3: Format validation
    if (!this.hasValidFormat(injection)) {
      warnings.push('INJECTION_HAS_SUSPICIOUS_FORMAT: May contain markdown injection');
    }

    // Check 4: Content validation
    const forbidden = this.checkForbiddenPatterns(injection);
    if (forbidden.length > 0) {
      warnings.push(`INJECTION_HAS_FORBIDDEN_PATTERNS: ${forbidden.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate unique injection ID
   *
   * @param outcomes - Outcomes being injected
   * @param method - Method being injected
   * @param context - Injection context
   * @returns Unique injection ID
   */
  generateInjectionId(
    outcomes: BusinessOutcome[],
    method: ReasoningMethod | null,
    context: InjectionContext
  ): string {
    this.injectionCounter++;
    const injectionId = `injection-${this.injectionCounter}-${Date.now()}`;

    // Track injection
    this.activeInjections.set(injectionId, {
      injectionId,
      outcomes,
      method,
      timestamp: Date.now(),
      context,
    });

    return injectionId;
  }

  /**
   * Get active injections
   */
  getActiveInjections(): Map<string, InjectionTracking> {
    return new Map(this.activeInjections);
  }

  /**
   * Clear old injections (older than 1 hour)
   */
  clearOldInjections(): void {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();

    for (const [id, tracking] of this.activeInjections) {
      if (now - tracking.timestamp > oneHour) {
        this.activeInjections.delete(id);
      }
    }
  }

  /**
   * Validate outcome structure
   */
  private isValidOutcome(outcome: unknown): outcome is BusinessOutcome {
    if (!outcome || typeof outcome !== 'object') {
      return false;
    }

    const o = outcome as Partial<BusinessOutcome>;
    return (
      typeof o.id === 'string' &&
      typeof o.title === 'string' &&
      typeof o.description === 'string' &&
      typeof o.category === 'string' &&
      Array.isArray(o.kpis) &&
      Array.isArray(o.successCriteria) &&
      (o.priority === 'must' || o.priority === 'should' || o.priority === 'could')
    );
  }

  /**
   * Validate method structure
   */
  private isValidMethod(method: unknown): method is ReasoningMethod {
    if (!method || typeof method !== 'object') {
      return false;
    }

    const m = method as Partial<ReasoningMethod>;
    return (
      typeof m.name === 'string' &&
      typeof m.category === 'string' &&
      m.parameters !== undefined &&
      typeof m.parameters === 'object'
    );
  }

  /**
   * Prioritize outcomes for injection
   */
  private prioritizeOutcomes(outcomes: BusinessOutcome[], context: InjectionContext): BusinessOutcome[] {
    // Sort by priority (must > should > could)
    const priorityWeight = { must: 3, should: 2, could: 1 };

    // Sort by category relevance (business > technical > user > quality)
    const categoryWeight = { business: 4, technical: 3, user: 2, quality: 1 };

    return outcomes.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by category relevance
      const categoryDiff = categoryWeight[b.category] - categoryWeight[a.category];
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      // Finally by domain relevance
      const aRelevant = this.isDomainRelevant(a, context.domain);
      const bRelevant = this.isDomainRelevant(b, context.domain);
      return Number(bRelevant) - Number(aRelevant);
    });
  }

  /**
   * Check if outcome is relevant to domain
   */
  private isDomainRelevant(outcome: BusinessOutcome, domain: Domain): boolean {
    const lowerTitle = outcome.title.toLowerCase();
    const lowerDesc = outcome.description.toLowerCase();

    switch (domain) {
      case 'code':
        return (
          lowerTitle.includes('performance') ||
          lowerTitle.includes('latency') ||
          lowerTitle.includes('coverage') ||
          lowerDesc.includes('code') ||
          lowerDesc.includes('test')
        );
      case 'creative':
        return (
          lowerTitle.includes('engagement') ||
          lowerTitle.includes('adoption') ||
          lowerTitle.includes('ux')
        );
      case 'reasoning':
        return (
          lowerTitle.includes('decision') ||
          lowerTitle.includes('analysis') ||
          lowerTitle.includes('quality')
        );
      case 'analysis':
        return (
          lowerTitle.includes('data') ||
          lowerTitle.includes('metrics') ||
          lowerTitle.includes('insight')
        );
      default:
        return true;
    }
  }

  /**
   * Format outcomes for injection
   */
  private formatOutcomes(outcomes: BusinessOutcome[]): string {
    if (outcomes.length === 0) {
      return '';
    }

    let output = '## Business Outcomes\n\n';

    // Group by category
    const grouped = this.groupBy(outcomes, (o) => o.category);

    for (const [category, categoryOutcomes] of Object.entries(grouped)) {
      output += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Outcomes\n\n`;

      for (const outcome of categoryOutcomes) {
        output += `**${outcome.title}** [${outcome.priority}]\n`;
        output += `- ${this.truncate(outcome.description, 200)}\n`;

        if (outcome.kpis.length > 0) {
          output += '\nKPIs:\n';
          for (const kpi of outcome.kpis) {
            output += `- ${kpi.name}: Target ${kpi.targetValue} within ${kpi.timeframe}\n`;
          }
        }

        if (outcome.successCriteria.length > 0) {
          output += '\nSuccess Criteria:\n';
          for (const sc of outcome.successCriteria) {
            output += `- [ ] ${sc}\n`;
          }
        }

        output += '\n';
      }
    }

    return output.trim();
  }

  /**
   * Format reasoning method for injection
   */
  private formatReasoningMethod(method: ReasoningMethod): string {
    let output = '## Reasoning Method\n\n';
    output += `Use **${method.name}** for this task:\n`;

    // Add method-specific guidance
    switch (method.name) {
      case 'First Principles':
        output += '- Strip away assumptions to rebuild from fundamental truths\n';
        output += '- Question: What are the fundamental truths about this domain?\n';
        output += '- Pattern: assumptions → truths → new approach\n';
        break;
      case '5 Whys':
        output += '- Ask "why" five times to find root cause\n';
        output += '- Pattern: symptom → why 1 → why 2 → why 3 → why 4 → root cause\n';
        break;
      case 'Chain of Thought':
        output += '- Think step-by-step through the problem\n';
        output += '- Show your reasoning at each step\n';
        output += '- Pattern: step 1 → step 2 → step 3 → conclusion\n';
        break;
      case 'Tree of Thoughts':
        output += '- Explore multiple solution branches in parallel\n';
        output += '- Evaluate each branch before choosing best path\n';
        output += '- Pattern: branch A / branch B / branch C → best branch\n';
        break;
      default:
        output += `- Apply ${method.name} reasoning systematically\n`;
        output += '- Document your thought process clearly\n';
    }

    // Add outcome-based reasoning guidance
    output += '\nFocus on outcome-based reasoning:\n';
    output += '1. START WITH OUTCOMES: What result do we want?\n';
    output += '2. GATHER EVIDENCE: What proof exists?\n';
    output += '3. CRITICALLY REASON: Does evidence support the approach?\n';
    output += '4. CHOOSE BEST PATH: Even if inconvenient\n';

    return output.trim();
  }

  /**
   * Shorten method description for size constraints
   */
  private shortenMethodDescription(method: ReasoningMethod): string {
    return `## Reasoning Method\n\nUse **${method.name}**: START WITH OUTCOMES → GATHER EVIDENCE → CRITICALLY REASON → CHOOSE BEST PATH`;
  }

  /**
   * Truncate injection to fit within limit
   */
  private truncateToFit(injection: string, maxLength: number): string {
    if (injection.length <= maxLength) {
      return injection;
    }

    // Reserve space for truncation marker and newlines
    const marker = '\n\n[Additional outcomes truncated]';
    const availableLength = maxLength - marker.length - 4; // Extra buffer

    if (availableLength <= 0) {
      return marker.trim();
    }

    // Truncate but keep structure
    const truncated = injection.substring(0, availableLength);
    const lastNewline = truncated.lastIndexOf('\n');

    if (lastNewline > 0) {
      return truncated.substring(0, lastNewline) + marker;
    }

    return truncated.substring(0, maxLength - 3) + '...';
  }

  /**
   * Check if prompt has valid structure
   */
  private hasValidStructure(prompt: string): boolean {
    // Basic structure checks
    const lines = prompt.split('\n');

    // Must have at least task description
    const hasTask = lines.some((line) => line.trim().length > 0);

    return hasTask;
  }

  /**
   * Check if injection has valid format
   */
  private hasValidFormat(injection: string): boolean {
    // Check for suspicious patterns
    const suspicious = ['```', '****', '::::', '\\\\'];
    return !suspicious.some((pattern) => injection.includes(pattern));
  }

  /**
   * Check for forbidden patterns
   */
  private checkForbiddenPatterns(injection: string): string[] {
    const forbidden: string[] = [];

    if (injection.includes('Full conversation history')) {
      forbidden.push('conversation history');
    }

    if (injection.includes('All CLAUDE.md rules')) {
      forbidden.push('all rules');
    }

    if (injection.includes('Previous agent outputs')) {
      forbidden.push('previous outputs');
    }

    return forbidden;
  }

  /**
   * Get default reasoning method
   */
  private getDefaultMethod(): ReasoningMethod {
    return {
      name: 'First Principles',
      category: 'Core',
      parameters: {},
    };
  }

  /**
   * Group array by key function
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  /**
   * Truncate string to max length
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}
