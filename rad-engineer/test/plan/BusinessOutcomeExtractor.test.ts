/**
 * BusinessOutcomeExtractor Tests
 *
 * Comprehensive test suite for business outcome extraction:
 * - 20 unit tests (extraction, KPIs, validation)
 * - 6 integration tests
 * - 6 edge case tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  BusinessOutcomeExtractor,
  type BusinessOutcome,
  type ExecutionPlan,
  type StructuredRequirements,
  type ResearchFindings,
} from '../../src/plan';

describe('BusinessOutcomeExtractor.extractOutcomes', () => {
  let extractor: BusinessOutcomeExtractor;

  beforeEach(() => {
    extractor = new BusinessOutcomeExtractor();
  });

  it('should extract outcomes from ExecutionPlan success_criteria', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [
          'Increase user retention by 20% within 6 months',
          'Reduce page load time to <2 seconds',
        ],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(2);
    expect(outcomes[0].category).toBe('business');
    expect(outcomes[0].title).toBe('Increase user retention by 20% within 6 months');
    expect(outcomes[0].measurable).toBe(true);
  });

  it('should categorize outcomes correctly (business/technical/user/quality)', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [
          'Increase revenue by 10%',
          'Reduce latency to <100ms',
          'Improve user satisfaction',
          'Achieve 95% test coverage',
        ],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(4);
    expect(outcomes[0].category).toBe('business');
    expect(outcomes[1].category).toBe('technical');
    expect(outcomes[2].category).toBe('user');
    expect(outcomes[3].category).toBe('quality');
  });

  it('should extract multiple outcomes from array', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: ['Outcome 1', 'Outcome 2', 'Outcome 3', 'Outcome 4', 'Outcome 5'],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(5);
  });

  it('should handle empty success_criteria array', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(0);
  });

  it('should handle duplicate outcomes (deduplicate)', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [
          'Increase user retention',
          'Increase user retention',
          'INCREASE USER RETENTION',
        ],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(1);
  });

  it('should extract outcomes with complex KPI descriptions', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [
          'Achieve 25% reduction in customer churn within 3 quarters while maintaining NPS >50',
        ],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(1);
    expect(outcomes[0].kpis.length).toBeGreaterThan(0);
    expect(outcomes[0].kpis[0].quantifiable).toBe(true);
  });

  it('should preserve source references', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: ['Test outcome'],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes[0].source.section).toBe('requirements.success_criteria');
  });

  it('should handle malformed success criteria gracefully', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: ['', '   ', 'Valid outcome'],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    // Should skip empty strings and only extract valid outcome
    expect(outcomes.length).toBe(1);
    expect(outcomes[0].title).toBe('Valid outcome');
  });
});

describe('BusinessOutcomeExtractor.extractKPIs', () => {
  let extractor: BusinessOutcomeExtractor;

  beforeEach(() => {
    extractor = new BusinessOutcomeExtractor();
  });

  it('should extract percentage-based KPIs', () => {
    const text = 'Increase user retention by 20% within 6 months';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].quantifiable).toBe(true);
    expect(kpis[0].targetValue).toContain('20%');
  });

  it('should extract time-based thresholds', () => {
    const text = 'Reduce page load time to <2 seconds';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].quantifiable).toBe(true);
    expect(kpis[0].targetValue).toContain('<2');
  });

  it('should extract quantitative targets', () => {
    const text = 'Achieve 95% test coverage';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].quantifiable).toBe(true);
    expect(kpis[0].targetValue).toContain('95');
  });

  it('should detect SMART criteria', () => {
    const text = 'Achieve 95% test coverage within 2 weeks';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].quantifiable).toBe(true);
    expect(kpis[0].timeframe).not.toBe('To be determined');
  });

  it('should handle non-quantifiable KPIs', () => {
    const text = 'Improve user experience';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].quantifiable).toBe(false);
    expect(kpis[0].targetValue).toBe('To be determined');
  });

  it('should parse measurement methods and timeframes', () => {
    const text = 'Reduce latency by 50% within 3 months';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].timeframe).toContain('3 months');
    expect(kpis[0].measurementMethod).toBeTruthy();
  });
});

describe('BusinessOutcomeExtractor.validateOutcomes', () => {
  let extractor: BusinessOutcomeExtractor;

  beforeEach(() => {
    extractor = new BusinessOutcomeExtractor();
  });

  it('should pass validation for complete outcomes', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Valid outcome',
        description: 'Test outcome',
        kpis: [
          {
            name: 'Test KPI',
            targetValue: '20%',
            measurementMethod: 'Test',
            timeframe: '6 months',
            quantifiable: true,
          },
        ],
        successCriteria: ['Valid criterion'],
        impactMetrics: [
          {
            name: 'Test metric',
            expectedImpact: 'Positive',
            measurement: 'Test',
            confidence: 0.8,
          },
        ],
        priority: 'must',
        measurable: true,
        source: { section: 'test' },
      },
    ];

    const result = extractor.validateOutcomes(outcomes);

    expect(result.passed).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should fail validation for measurable outcomes without KPIs', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Invalid outcome',
        description: 'Test outcome',
        kpis: [], // No KPIs but measurable=true
        successCriteria: ['Valid criterion'],
        impactMetrics: [],
        priority: 'must',
        measurable: true,
        source: { section: 'test' },
      },
    ];

    const result = extractor.validateOutcomes(outcomes);

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === 'NO_KPIS_FOR_MEASURABLE')).toBe(true);
  });

  it('should warn about non-quantifiable KPIs', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Test outcome',
        description: 'Test outcome',
        kpis: [
          {
            name: 'Test KPI',
            targetValue: 'To be determined',
            measurementMethod: 'Test',
            timeframe: 'To be determined',
            quantifiable: false,
          },
        ],
        successCriteria: ['Valid criterion'],
        impactMetrics: [],
        priority: 'must',
        measurable: false,
        source: { section: 'test' },
      },
    ];

    const result = extractor.validateOutcomes(outcomes);

    expect(result.issues.some((i) => i.code === 'NON_QUANTIFIABLE_KPI')).toBe(true);
  });

  it('should fail validation for missing success criteria', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Invalid outcome',
        description: 'Test outcome',
        kpis: [],
        successCriteria: [], // No success criteria
        impactMetrics: [],
        priority: 'must',
        measurable: false,
        source: { section: 'test' },
      },
    ];

    const result = extractor.validateOutcomes(outcomes);

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === 'NO_SUCCESS_CRITERIA')).toBe(true);
  });

  it('should warn about missing priority', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Test outcome',
        description: 'Test outcome',
        kpis: [],
        successCriteria: ['Valid criterion'],
        impactMetrics: [],
        // @ts-expect-error - Testing missing priority
        priority: undefined,
        measurable: false,
        source: { section: 'test' },
      },
    ];

    const result = extractor.validateOutcomes(outcomes);

    expect(result.issues.some((i) => i.code === 'NO_PRIORITY')).toBe(true);
  });

  it('should report low confidence metrics as info', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Test outcome',
        description: 'Test outcome',
        kpis: [],
        successCriteria: ['Valid criterion'],
        impactMetrics: [
          {
            name: 'Test metric',
            expectedImpact: 'Positive',
            measurement: 'Test',
            confidence: 0.3, // Low confidence
          },
        ],
        priority: 'must',
        measurable: false,
        source: { section: 'test' },
      },
    ];

    const result = extractor.validateOutcomes(outcomes);

    expect(result.issues.some((i) => i.code === 'LOW_CONFIDENCE_METRICS')).toBe(true);
  });
});

describe('BusinessOutcomeExtractor Integration', () => {
  let extractor: BusinessOutcomeExtractor;

  beforeEach(() => {
    extractor = new BusinessOutcomeExtractor();
  });

  it('should extract from full ExecutionPlan with all fields', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test-project',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'build a feature',
        core_feature: 'Test feature',
        tech_stack: 'TypeScript',
        timeline: 'this-week',
        success_criteria: [
          'Increase user retention by 20%',
          'Reduce page load time to <2 seconds',
          'Achieve 95% test coverage',
        ],
        out_of_scope: ['Database changes'],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(3);
    expect(outcomes[0].source.section).toBeTruthy();
  });

  it('should extract from StructuredRequirements directly', () => {
    const requirements: StructuredRequirements = {
      query: 'test query',
      coreFeature: 'Test feature',
      techStack: 'TypeScript',
      timeline: 'flexible',
      successCriteria: ['Increase revenue by 10%', 'Reduce latency'],
      outOfScope: [],
      complexity: 'medium',
      estimatedStories: 5,
      gatheredAt: new Date().toISOString(),
    };

    const outcomes = extractor.extractFromRequirements(requirements);

    expect(outcomes.length).toBe(2);
    expect(outcomes[0].category).toBe('business');
  });

  it('should extract from ResearchFindings', () => {
    const research: Partial<ResearchFindings> = {
      feasibility: {
        feasible: true,
        approaches: [],
        risks: [
          {
            risk: 'Security vulnerability',
            mitigation: 'Implement input validation',
          },
        ],
        complexity: 'medium',
      },
      bestPractices: {
        practices: [],
        pitfalls: [],
        securityConsiderations: [
          {
            risk: 'XSS attack',
            mitigation: 'Sanitize user input',
          },
        ],
      },
      evidence: [],
      timestamp: new Date().toISOString(),
    };

    const outcomes = extractor.extractFromResearch(research as ResearchFindings);

    expect(outcomes.length).toBe(2);
    expect(outcomes[0].category).toBe('quality');
    expect(outcomes[0].title).toContain('Mitigate:');
  });

  it('should combine outcomes from multiple sources', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: ['Outcome from plan'],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const research: Partial<ResearchFindings> = {
      feasibility: {
        feasible: true,
        approaches: [],
        risks: [{ risk: 'Test risk', mitigation: 'Test mitigation' }],
        complexity: 'simple',
      },
      evidence: [],
      timestamp: new Date().toISOString(),
    };

    const planOutcomes = extractor.extractOutcomes(plan as ExecutionPlan);
    const researchOutcomes = extractor.extractFromResearch(research as ResearchFindings);

    expect(planOutcomes.length).toBe(1);
    expect(researchOutcomes.length).toBe(1);
  });

  it('should inject outcomes into agent prompt format', () => {
    const outcomes: BusinessOutcome[] = [
      {
        id: 'outcome-1',
        category: 'business',
        title: 'Increase revenue',
        description: 'Increase revenue by 20%',
        kpis: [
          {
            name: 'Revenue',
            targetValue: '20% increase',
            measurementMethod: 'Revenue analysis',
            timeframe: '6 months',
            quantifiable: true,
          },
        ],
        successCriteria: ['Achieve 20% revenue increase'],
        impactMetrics: [],
        priority: 'must',
        measurable: true,
        source: { section: 'test' },
      },
    ];

    const injection = extractor.toInjectionFormat(outcomes);

    expect(injection).toContain('## Business Outcomes');
    expect(injection).toContain('### Business Outcomes');
    expect(injection).toContain('Increase revenue');
    expect(injection).toContain('[must]');
    expect(injection).toContain('KPIs:');
  });

  it('should integrate with /plan skill output', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'integration-test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill v1.0.0',
        researchSessionId: crypto.randomUUID(),
      },
      requirements: {
        query: 'build me notion like notes app',
        core_feature: 'Notion-like notes app',
        tech_stack: 'TypeScript/Node.js',
        timeline: 'this-week',
        success_criteria: [
          'Tests passing',
          'TypeScript strict mode',
          'Rich text editing works',
        ],
        out_of_scope: ['Database schema changes'],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);
    const injection = extractor.toInjectionFormat(outcomes);

    expect(outcomes.length).toBe(3);
    expect(injection).toContain('## Business Outcomes');
    expect(injection).toContain('Tests passing');
  });
});

describe('BusinessOutcomeExtractor Edge Cases', () => {
  let extractor: BusinessOutcomeExtractor;

  beforeEach(() => {
    extractor = new BusinessOutcomeExtractor();
  });

  it('should handle success criteria with mixed formats', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [
          'OUTCOME IN ALL CAPS',
          'outcome in lowercase',
          'Mixed Case Outcome',
          '  outcome with whitespace  ',
        ],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(4);
    expect(outcomes.every((o) => o.title.length > 0)).toBe(true);
  });

  it('should handle unicode and special characters in KPIs', () => {
    const text = 'Achieve 95% success rate with emoji support 🎉 and unicode ñ';
    const kpis = extractor.extractKPIs(text);

    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].targetValue).toContain('95');
  });

  it('should handle very long success criteria (>500 chars)', () => {
    const longCriteria =
      'A'.repeat(600) + ' with measurable target 20% increase within 6 months';
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [longCriteria],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(1);
    expect(outcomes[0].title.length).toBeLessThanOrEqual(100); // Truncated
  });

  it('should handle ambiguous categorization', () => {
    const plan: Partial<ExecutionPlan> = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'test',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        source: '/plan skill',
        researchSessionId: 'test-session',
      },
      requirements: {
        query: 'test',
        core_feature: 'Test',
        tech_stack: 'TypeScript',
        timeline: 'flexible',
        success_criteria: [
          'Make the system better', // No clear category
          'Improve stuff', // No clear category
        ],
        out_of_scope: [],
      },
      waves: [],
      integration_tests: [],
      quality_gates: [],
    };

    const outcomes = extractor.extractOutcomes(plan as ExecutionPlan);

    expect(outcomes.length).toBe(2);
    // Should default to 'business' category
    expect(outcomes.every((o) => o.category === 'business')).toBe(true);
  });

  it('should handle conflicting KPIs', () => {
    const text = 'Achieve 20% increase and 30% decrease in same metric';
    const kpis = extractor.extractKPIs(text);

    // Should extract first match
    expect(kpis.length).toBeGreaterThan(0);
    expect(kpis[0].quantifiable).toBe(true);
  });

  it('should handle missing optional fields', () => {
    const outcome: BusinessOutcome = {
      id: 'outcome-1',
      category: 'business',
      title: 'Minimal outcome',
      description: 'Test',
      kpis: [],
      successCriteria: ['Valid criterion'],
      impactMetrics: [], // Empty
      priority: 'could',
      measurable: false,
      source: { section: 'test' },
    };

    const result = extractor.validateOutcomes([outcome]);

    // Should pass without errors
    expect(result.passed).toBe(true);
  });
});
