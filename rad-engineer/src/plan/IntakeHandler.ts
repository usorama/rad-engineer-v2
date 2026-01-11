/**
 * Intake Handler
 *
 * Manages the intake phase of the /plan skill:
 * - Receives user queries
 * - Asks clarifying questions
 * - Builds structured requirements
 */

import type {
  StructuredRequirements,
  ValidationResult,
} from './types.js';

/**
 * Question configuration for intake phase
 */
interface QuestionConfig {
  question: string;
  header: string;
  multiSelect: boolean;
  options: Array<{
    label: string;
    description: string;
  }>;
}

/**
 * User answers from Q&A
 */
interface UserAnswers {
  coreFeature: string;
  techStack: string;
  timeline: string;
  successCriteria: string[];
  outOfScope: string[];
}

/**
 * Intake handler options
 */
export interface IntakeHandlerOptions {
  maxQuestions?: number; // Default: 10
  timeout?: number; // Default: 300000 (5 minutes)
}

/**
 * Intake handler for /plan skill
 *
 * Manages the Q&A phase to gather structured requirements
 * from user queries (vague to specific).
 */
export class IntakeHandler {
  private options: IntakeHandlerOptions;
  private questionsAsked: number = 0;

  constructor(options: IntakeHandlerOptions = {}) {
    this.options = {
      maxQuestions: options.maxQuestions ?? 10,
      timeout: options.timeout ?? 300000,
    };
  }

  /**
   * Process user query and gather structured requirements
   *
   * This simulates the AskUserQuestion flow. In practice,
   * the /plan skill will use the AskUserQuestion tool directly.
   *
   * @param query - User's query (vague to specific)
   * @param answers - User's answers to clarifying questions
   * @returns Structured requirements
   */
  async processQuery(
    query: string,
    answers: Partial<UserAnswers> = {}
  ): Promise<StructuredRequirements> {
    // Validate query
    this.validateQuery(query);

    // Build structured requirements from answers
    const requirements: StructuredRequirements = {
      query,
      coreFeature: answers.coreFeature ?? this.extractFeatureFromQuery(query),
      techStack: answers.techStack ?? 'typescript', // Default
      timeline: answers.timeline ?? 'flexible',
      successCriteria: answers.successCriteria ?? this.defaultSuccessCriteria(),
      outOfScope: answers.outOfScope ?? [],
      complexity: this.estimateComplexity(query),
      estimatedStories: this.estimateStoryCount(query),
      gatheredAt: new Date().toISOString(),
    };

    // Validate requirements
    const validation = this.validateRequirements(requirements);
    if (!validation.passed) {
      throw new Error(
        `Requirements validation failed: ${validation.issues.map(i => i.message).join(', ')}`
      );
    }

    return requirements;
  }

  /**
   * Validate user query
   */
  private validateQuery(query: string): void {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length > 1000) {
      throw new Error('Query too long (max 1000 characters)');
    }
  }

  /**
   * Extract core feature from query using simple heuristics
   */
  private extractFeatureFromQuery(query: string): string {
    // Remove common prefixes
    const cleaned = query
      .replace(/^(build|create|make|implement|add|generate)\s+(me\s+)?/i, '')
      .trim();

    // Return first 100 chars
    return cleaned.substring(0, 100);
  }

  /**
   * Get default success criteria
   */
  private defaultSuccessCriteria(): string[] {
    return [
      'Tests passing',
      'TypeScript strict mode',
      'Code quality standards',
    ];
  }

  /**
   * Estimate complexity from query
   */
  private estimateComplexity(query: string): 'simple' | 'medium' | 'complex' {
    const lowerQuery = query.toLowerCase();

    // Simple indicators
    if (
      lowerQuery.includes('fix') ||
      lowerQuery.includes('add') && lowerQuery.includes('button') ||
      lowerQuery.includes('update') && lowerQuery.includes('single')
    ) {
      return 'simple';
    }

    // Complex indicators
    if (
      lowerQuery.includes('app') ||
      lowerQuery.includes('system') ||
      lowerQuery.includes('platform') ||
      lowerQuery.includes('architecture')
    ) {
      return 'complex';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Estimate story count from complexity
   */
  private estimateStoryCount(query: string): number {
    const complexity = this.estimateComplexity(query);

    switch (complexity) {
      case 'simple':
        return 3;
      case 'medium':
        return 8;
      case 'complex':
        return 15;
    }
  }

  /**
   * Validate structured requirements
   */
  private validateRequirements(requirements: StructuredRequirements): ValidationResult {
    const issues: ValidationResult['issues'] = [];

    // Required fields
    if (!requirements.coreFeature) {
      issues.push({
        severity: 'error',
        message: 'coreFeature is required',
        location: 'coreFeature',
      });
    }

    if (!requirements.techStack) {
      issues.push({
        severity: 'error',
        message: 'techStack is required',
        location: 'techStack',
      });
    }

    if (requirements.successCriteria.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No success criteria defined',
        location: 'successCriteria',
      });
    }

    // Validate complexity
    if (!['simple', 'medium', 'complex'].includes(requirements.complexity)) {
      issues.push({
        severity: 'error',
        message: `Invalid complexity: ${requirements.complexity}`,
        location: 'complexity',
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate question configurations for intake phase
   *
   * This is used by the /plan skill with AskUserQuestion tool
   */
  generateQuestionConfigs(): QuestionConfig[] {
    return [
      {
        question: 'What is the main feature you want to build?',
        header: 'Core Feature',
        multiSelect: false,
        options: [
          {
            label: 'New feature from scratch',
            description: 'Building something completely new',
          },
          {
            label: 'Enhancement to existing',
            description: 'Adding to/modifying existing code',
          },
          {
            label: 'Bug fix',
            description: 'Fixing a specific issue',
          },
        ],
      },
      {
        question: 'What technical stack should we use?',
        header: 'Tech Stack',
        multiSelect: false,
        options: [
          {
            label: 'TypeScript/Node.js',
            description: 'Recommended for rad-engineer projects',
          },
          {
            label: 'Python/FastAPI',
            description: 'For Python-based services',
          },
          {
            label: 'Other (specify)',
            description: 'Will use custom tech stack',
          },
        ],
      },
      {
        question: "What's the timeline for this feature?",
        header: 'Timeline',
        multiSelect: false,
        options: [
          { label: 'ASAP', description: 'Urgent, prioritize speed' },
          {
            label: 'This week',
            description: 'Standard sprint timeline',
          },
          { label: 'Flexible', description: 'No specific deadline' },
        ],
      },
      {
        question: 'What are the success criteria?',
        header: 'Success Criteria',
        multiSelect: true,
        options: [
          {
            label: 'Tests passing',
            description: 'All tests must pass (≥80% coverage)',
          },
          {
            label: 'TypeScript strict',
            description: 'Zero typecheck errors',
          },
          {
            label: 'Documentation',
            description: 'Include inline documentation',
          },
          {
            label: 'Working demo',
            description: 'Runnable demonstration',
          },
        ],
      },
      {
        question: 'What should we NOT include (scope boundaries)?',
        header: 'Out of Scope',
        multiSelect: true,
        options: [
          {
            label: 'Database schema changes',
            description: 'No DB modifications',
          },
          {
            label: 'API changes',
            description: 'No breaking API changes',
          },
          {
            label: 'UI/UX design',
            description: 'Focus on backend only',
          },
          {
            label: 'Performance optimization',
            description: 'Functional requirements only',
          },
        ],
      },
    ];
  }
}
