/**
 * Business Outcome Extractor
 *
 * Extracts structured business outcomes from Product Requirements Documents (PRDs),
 * including KPIs, success criteria, and business impact metrics.
 *
 * These outcomes are injected into agent prompts to enable outcome-based decision making.
 */

import type {
  ExecutionPlan,
  StructuredRequirements,
  ResearchFindings,
} from './types.js';

/**
 * Outcome category
 */
export type OutcomeCategory = 'business' | 'technical' | 'user' | 'quality';

/**
 * KPI definition
 */
export interface KPI {
  /** KPI name (e.g., "User Retention Rate") */
  name: string;

  /** Current value */
  currentValue?: string;

  /** Target value */
  targetValue: string;

  /** Measurement method */
  measurementMethod: string;

  /** Timeframe for achievement */
  timeframe: string;

  /** Is this KPI quantifiable? */
  quantifiable: boolean;
}

/**
 * Impact metric
 */
export interface ImpactMetric {
  /** Metric name (e.g., "Revenue Impact") */
  name: string;

  /** Expected impact */
  expectedImpact: string;

  /** Measurement approach */
  measurement: string;

  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  severity: 'critical' | 'error' | 'warning' | 'info';
  code: string;
  message: string;
  outcomeId: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}

/**
 * Source location in PRD
 */
export interface SourceLocation {
  section: string;
  lineReference?: string;
}

/**
 * Business outcome
 */
export interface BusinessOutcome {
  /** Unique identifier for this outcome */
  id: string;

  /** Outcome category */
  category: OutcomeCategory;

  /** Outcome title */
  title: string;

  /** Detailed outcome description */
  description: string;

  /** KPIs associated with this outcome */
  kpis: KPI[];

  /** Success criteria for this outcome */
  successCriteria: string[];

  /** Business impact metrics */
  impactMetrics: ImpactMetric[];

  /** Priority (must/should/could) */
  priority: 'must' | 'should' | 'could';

  /** Measurable (can be verified) */
  measurable: boolean;

  /** Source location in PRD */
  source: SourceLocation;
}

/**
 * Business Outcome Extractor class
 */
export class BusinessOutcomeExtractor {
  private outcomeCounter = 0;

  /**
   * Extract business outcomes from ExecutionPlan
   *
   * @param plan - Execution plan from /plan skill
   * @returns Extracted business outcomes
   */
  extractOutcomes(plan: ExecutionPlan): BusinessOutcome[] {
    const outcomes: BusinessOutcome[] = [];

    // Extract from success_criteria in requirements
    if (plan.requirements?.success_criteria) {
      for (const criterion of plan.requirements.success_criteria) {
        const outcome = this.createOutcomeFromCriterion(
          criterion,
          'requirements.success_criteria'
        );
        if (outcome) {
          outcomes.push(outcome);
        }
      }
    }

    return this.deduplicateOutcomes(outcomes);
  }

  /**
   * Extract outcomes from StructuredRequirements
   *
   * @param requirements - Requirements from intake
   * @returns Extracted business outcomes
   */
  extractFromRequirements(requirements: StructuredRequirements): BusinessOutcome[] {
    const outcomes: BusinessOutcome[] = [];

    // Extract from successCriteria
    if (requirements.successCriteria) {
      for (const criterion of requirements.successCriteria) {
        const outcome = this.createOutcomeFromCriterion(
          criterion,
          'requirements.successCriteria'
        );
        if (outcome) {
          outcomes.push(outcome);
        }
      }
    }

    return this.deduplicateOutcomes(outcomes);
  }

  /**
   * Extract outcomes from ResearchFindings
   *
   * @param research - Research findings from parallel agents
   * @returns Extracted business outcomes (from feasibility/best-practices)
   */
  extractFromResearch(research: ResearchFindings): BusinessOutcome[] {
    const outcomes: BusinessOutcome[] = [];

    // Extract from feasibility risks
    if (research.feasibility?.risks) {
      for (const risk of research.feasibility.risks) {
        outcomes.push({
          id: this.generateId(),
          category: 'quality',
          title: `Mitigate: ${risk.risk}`,
          description: risk.mitigation,
          kpis: [],
          successCriteria: [risk.mitigation],
          impactMetrics: [],
          priority: 'should',
          measurable: this.canMeasure(risk.mitigation),
          source: { section: 'research.feasibility.risks' },
        });
      }
    }

    // Extract from best practices security considerations
    if (research.bestPractices?.securityConsiderations) {
      for (const sec of research.bestPractices.securityConsiderations) {
        outcomes.push({
          id: this.generateId(),
          category: 'quality',
          title: `Security: ${sec.risk}`,
          description: sec.mitigation,
          kpis: [],
          successCriteria: [sec.mitigation],
          impactMetrics: [],
          priority: 'must',
          measurable: this.canMeasure(sec.mitigation),
          source: { section: 'research.bestPractices.securityConsiderations' },
        });
      }
    }

    return this.deduplicateOutcomes(outcomes);
  }

  /**
   * Validate outcome completeness
   *
   * @param outcomes - Outcomes to validate
   * @returns Validation result with issues
   */
  validateOutcomes(outcomes: BusinessOutcome[]): ValidationResult {
    const issues: ValidationIssue[] = [];

    for (const outcome of outcomes) {
      // Check 1: Measurable outcomes must have KPIs
      if (outcome.measurable && outcome.kpis.length === 0) {
        issues.push({
          severity: 'error',
          code: 'NO_KPIS_FOR_MEASURABLE',
          message: 'Outcome marked as measurable but has no KPIs defined',
          outcomeId: outcome.id,
          suggestion: 'Add at least one quantifiable KPI or mark as not measurable',
        });
      }

      // Check 2: KPIs must be quantifiable
      const nonQuantifiableKPIs = outcome.kpis.filter((kpi) => !kpi.quantifiable);
      if (nonQuantifiableKPIs.length > 0) {
        issues.push({
          severity: 'warning',
          code: 'NON_QUANTIFIABLE_KPI',
          message: `${nonQuantifiableKPIs.length} KPI(s) are not quantifiable`,
          outcomeId: outcome.id,
          suggestion: 'Rewrite KPIs with specific numbers or measurable criteria',
        });
      }

      // Check 3: Success criteria must be present
      if (outcome.successCriteria.length === 0) {
        issues.push({
          severity: 'error',
          code: 'NO_SUCCESS_CRITERIA',
          message: 'Outcome has no success criteria defined',
          outcomeId: outcome.id,
          suggestion: 'Add at least one testable success criterion',
        });
      }

      // Check 4: Priority must be set
      if (!outcome.priority) {
        issues.push({
          severity: 'warning',
          code: 'NO_PRIORITY',
          message: 'Outcome has no priority set',
          outcomeId: outcome.id,
          suggestion: 'Set priority to must/should/could',
        });
      }

      // Check 5: Impact metrics must have confidence scores
      const lowConfidenceMetrics = outcome.impactMetrics.filter((m) => m.confidence < 0.5);
      if (lowConfidenceMetrics.length > 0) {
        issues.push({
          severity: 'info',
          code: 'LOW_CONFIDENCE_METRICS',
          message: `${lowConfidenceMetrics.length} impact metric(s) have low confidence (<50%)`,
          outcomeId: outcome.id,
        });
      }
    }

    return {
      passed: !issues.some((i) => i.severity === 'critical' || i.severity === 'error'),
      issues,
    };
  }

  /**
   * Convert outcomes to injection format for agent prompts
   *
   * @param outcomes - Business outcomes
   * @returns Formatted string for prompt injection
   */
  toInjectionFormat(outcomes: BusinessOutcome[]): string {
    if (outcomes.length === 0) {
      return 'No business outcomes defined';
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

    return output;
  }

  /**
   * Extract KPIs from text
   *
   * @param text - Text containing KPI descriptions
   * @returns Extracted KPIs
   */
  extractKPIs(text: string): KPI[] {
    const kpis: KPI[] = [];

    // Pattern 1: "by X%" (most common pattern)
    const byPercentPattern = /by\s+(\d+)%/i;
    const byPercentMatch = text.match(byPercentPattern);
    if (byPercentMatch) {
      kpis.push({
        name: this.inferKPIName(text),
        targetValue: `${byPercentMatch[1]}% change`,
        measurementMethod: 'Percentage analysis',
        timeframe: this.extractTimeframe(text) || 'To be determined',
        quantifiable: true,
      });
    }

    // Pattern 2: "X% increase/decrease/reduction"
    const percentPattern = /(\d+)%\s+(increase|decrease|reduction)/i;
    const percentMatch = text.match(percentPattern);
    if (percentMatch && !byPercentMatch) {
      kpis.push({
        name: this.inferKPIName(text),
        targetValue: `${percentMatch[1]}% ${percentMatch[2].toLowerCase()}`,
        measurementMethod: 'Percentage analysis',
        timeframe: this.extractTimeframe(text) || 'To be determined',
        quantifiable: true,
      });
    }

    // Pattern 3: Time-based thresholds
    const timePattern = /<(\d+)\s+(seconds?|minutes?|hours?)/i;
    const timeMatch = text.match(timePattern);
    if (timeMatch && !byPercentMatch && !percentMatch) {
      kpis.push({
        name: this.inferKPIName(text),
        targetValue: `<${timeMatch[1]} ${timeMatch[2]}`,
        measurementMethod: 'Performance measurement',
        timeframe: this.extractTimeframe(text) || 'Immediate',
        quantifiable: true,
      });
    }

    // Pattern 4: Quantitative targets (achieve/reach/target + number)
    const quantPattern = /(achieve|reach|target)\s+(\d+)/i;
    const quantMatch = text.match(quantPattern);
    if (quantMatch && !byPercentMatch && !percentMatch && !timeMatch) {
      kpis.push({
        name: this.inferKPIName(text),
        targetValue: quantMatch[2],
        measurementMethod: 'Quantitative analysis',
        timeframe: this.extractTimeframe(text) || 'To be determined',
        quantifiable: true,
      });
    }

    // If no patterns found, create non-quantifiable KPI
    if (kpis.length === 0 && text.length > 0) {
      kpis.push({
        name: this.inferKPIName(text),
        targetValue: 'To be determined',
        measurementMethod: 'To be determined',
        timeframe: 'To be determined',
        quantifiable: false,
      });
    }

    return kpis;
  }

  /**
   * Create outcome from success criterion
   */
  private createOutcomeFromCriterion(
    criterion: string,
    section: string
  ): BusinessOutcome | null {
    if (!criterion || criterion.trim().length === 0) {
      return null;
    }

    const category = this.classifyOutcome(criterion);
    const kpis = this.extractKPIs(criterion);
    const measurable = kpis.some((kpi) => kpi.quantifiable) || this.isSMART(criterion);

    return {
      id: this.generateId(),
      category,
      title: this.generateTitle(criterion),
      description: criterion,
      kpis,
      successCriteria: [criterion],
      impactMetrics: [],
      priority: this.inferPriority(criterion),
      measurable,
      source: { section },
    };
  }

  /**
   * Classify outcome category based on keywords
   */
  private classifyOutcome(criteria: string): OutcomeCategory {
    const lowerCriteria = criteria.toLowerCase();

    const businessKeywords = ['revenue', 'retention', 'acquisition', 'conversion', 'churn'];
    const technicalKeywords = ['performance', 'latency', 'uptime', 'response time', 'load'];
    const userKeywords = ['ux', 'usability', 'satisfaction', 'engagement', 'adoption'];
    const qualityKeywords = ['coverage', 'bugs', 'defects', 'reliability', 'security'];

    if (businessKeywords.some((kw) => lowerCriteria.includes(kw))) {
      return 'business';
    } else if (technicalKeywords.some((kw) => lowerCriteria.includes(kw))) {
      return 'technical';
    } else if (userKeywords.some((kw) => lowerCriteria.includes(kw))) {
      return 'user';
    } else if (qualityKeywords.some((kw) => lowerCriteria.includes(kw))) {
      return 'quality';
    }

    return 'business'; // default
  }

  /**
   * Check if criteria is SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
   */
  private isSMART(criteria: string): boolean {
    const hasMeasurable = /\d+/.test(criteria);
    const hasTimeframe = /\b(within|by|in\s+\d+\s+(days|weeks|months))\b/i.test(criteria);

    return hasMeasurable && hasTimeframe;
  }

  /**
   * Infer KPI name from text
   */
  private inferKPIName(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('retention')) return 'User Retention Rate';
    if (lowerText.includes('revenue')) return 'Revenue';
    if (lowerText.includes('conversion')) return 'Conversion Rate';
    if (lowerText.includes('load time') || lowerText.includes('page load')) return 'Page Load Time';
    if (lowerText.includes('latency')) return 'Latency';
    if (lowerText.includes('uptime')) return 'Uptime';
    if (lowerText.includes('coverage')) return 'Test Coverage';
    if (lowerText.includes('bugs') || lowerText.includes('defects')) return 'Defect Rate';

    return 'Performance Metric';
  }

  /**
   * Extract timeframe from text
   */
  private extractTimeframe(text: string): string | null {
    const timeframePattern = /\b(within|by|in)\s+(\d+)\s+(days?|weeks?|months?|quarters?)\b/i;
    const match = text.match(timeframePattern);

    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }

    return null;
  }

  /**
   * Generate title from criterion
   */
  private generateTitle(criterion: string): string {
    // Truncate to 100 chars
    return this.truncate(criterion, 100);
  }

  /**
   * Infer priority from criterion
   */
  private inferPriority(criterion: string): 'must' | 'should' | 'could' {
    const lowerCriterion = criterion.toLowerCase();

    if (lowerCriterion.includes('must') || lowerCriterion.includes('critical') || lowerCriterion.includes('required')) {
      return 'must';
    } else if (lowerCriterion.includes('should') || lowerCriterion.includes('important')) {
      return 'should';
    }

    return 'could'; // default
  }

  /**
   * Check if text can be measured
   */
  private canMeasure(text: string): boolean {
    return /\d+/.test(text) || this.isSMART(text);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    this.outcomeCounter++;
    return `outcome-${this.outcomeCounter}`;
  }

  /**
   * Deduplicate outcomes by title
   */
  private deduplicateOutcomes(outcomes: BusinessOutcome[]): BusinessOutcome[] {
    const seen = new Set<string>();
    const deduplicated: BusinessOutcome[] = [];

    for (const outcome of outcomes) {
      const normalizedTitle = outcome.title.toLowerCase().trim();
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        deduplicated.push(outcome);
      }
    }

    return deduplicated;
  }

  /**
   * Group outcomes by key
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
