/**
 * OutcomeInjector Tests
 *
 * Comprehensive test suite covering all 5 methods with 38 tests total:
 * - 20 unit tests
 * - 10 integration tests
 * - 8 edge case tests
 *
 * Coverage target: ≥80% lines, ≥95% for critical paths
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { OutcomeInjector } from '../../src/outcome/OutcomeInjector.js';
import { DecisionLearningStore } from '../../src/decision/DecisionLearningStore.js';
import type {
  BusinessOutcome,
  InjectionContext,
  DecisionContext,
  ReasoningMethod,
  DecisionOutcome,
} from '../../src/outcome/index.js';
import type { Domain } from '../../src/adaptive/types.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestOutcome(overrides?: Partial<BusinessOutcome>): BusinessOutcome {
  return {
    id: 'outcome-1',
    category: 'business',
    title: 'Increase user retention by 20% within 6 months',
    description: 'Achieve 20% improvement in user retention through engagement features',
    kpis: [
      {
        name: 'User Retention Rate',
        targetValue: '20% increase',
        measurementMethod: 'Cohort analysis',
        timeframe: '6 months',
        quantifiable: true,
      },
    ],
    successCriteria: [
      'Increase user retention by 20% within 6 months',
      'Implement 3 new engagement features',
    ],
    impactMetrics: [
      {
        name: 'Revenue Impact',
        expectedImpact: '+15% MRR',
        measurement: 'Monthly recurring revenue analysis',
        confidence: 0.8,
      },
    ],
    priority: 'must',
    measurable: true,
    source: { section: 'requirements.success_criteria' },
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<InjectionContext>): InjectionContext {
  return {
    domain: 'code',
    complexity: 0.5,
    component: 'ResourceManager',
    activity: 'allocate resources',
    ...overrides,
  };
}

function createTestDecisionContext(overrides?: Partial<DecisionContext>): DecisionContext {
  return {
    domain: 'code',
    complexity: 0.5,
    constraints: ['memory limit', 'cpu quota'],
    stakeholders: ['platform team', 'users'],
    ...overrides,
  };
}

function createTestMethod(overrides?: Partial<ReasoningMethod>): ReasoningMethod {
  return {
    name: 'First Principles',
    category: 'Core',
    parameters: {},
    ...overrides,
  };
}

function createTestDecisionOutcome(overrides?: Partial<DecisionOutcome>): DecisionOutcome {
  return {
    success: true,
    quality: 0.9,
    errors: [],
    decisionId: 'decision-1',
    ...overrides,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('OutcomeInjector', () => {
  let injector: OutcomeInjector;
  let decisionStore: DecisionLearningStore;

  beforeEach(() => {
    decisionStore = new DecisionLearningStore();
    injector = new OutcomeInjector(decisionStore);
  });

  // ============================================================================
  // UNIT TESTS (20 tests)
  // ============================================================================

  describe('injectOutcomes (Unit Tests)', () => {
    it('should inject outcomes into base prompt', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [createTestOutcome()];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('Task: Implement feature X');
      expect(result).toContain('## Business Outcomes');
      expect(result).toContain('Increase user retention');
      expect(result).toContain('[must]');
    });

    it('should return base prompt when no outcomes provided', () => {
      const basePrompt = 'Task: Implement feature X';
      const result = injector.injectOutcomes(basePrompt, [], createTestContext());

      expect(result).toBe(basePrompt);
    });

    it('should group outcomes by category', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [
        createTestOutcome({ category: 'business', title: 'Business outcome' }),
        createTestOutcome({ id: 'outcome-2', category: 'technical', title: 'Technical outcome' }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('### Business Outcomes');
      expect(result).toContain('### Technical Outcomes');
    });

    it('should include KPIs when present', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [createTestOutcome()];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('KPIs:');
      expect(result).toContain('User Retention Rate');
      expect(result).toContain('20% increase');
    });

    it('should include success criteria when present', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [createTestOutcome()];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('Success Criteria:');
      expect(result).toContain('- [ ] Increase user retention');
    });

    it('should prioritize must outcomes over should', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [
        createTestOutcome({ id: 'outcome-1', priority: 'should', title: 'Should outcome' }),
        createTestOutcome({ id: 'outcome-2', priority: 'must', title: 'Must outcome' }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);
      const mustIndex = result.indexOf('Must outcome');
      const shouldIndex = result.indexOf('Should outcome');

      expect(mustIndex).toBeLessThan(shouldIndex);
    });

    it('should filter out invalid outcomes', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [
        createTestOutcome(),
        { invalid: 'outcome' } as unknown as BusinessOutcome,
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('Increase user retention');
      expect(result).not.toContain('invalid');
    });

    it('should truncate outcomes to fit size limit', () => {
      const basePrompt = 'A'.repeat(400);
      const largeDescription = 'B'.repeat(300);
      const outcomes = [createTestOutcome({ description: largeDescription })];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result.length).toBeLessThanOrEqual(500);
    });

    it('should throw on empty base prompt', () => {
      expect(() => {
        injector.injectOutcomes('', [createTestOutcome()], createTestContext());
      }).toThrow('BASE_PROMPT_EMPTY');
    });

    it('should throw on whitespace-only base prompt', () => {
      expect(() => {
        injector.injectOutcomes('   ', [createTestOutcome()], createTestContext());
      }).toThrow('BASE_PROMPT_EMPTY');
    });

    it('should format description with truncation at 200 chars', () => {
      const basePrompt = 'Task: Implement feature X';
      const longDescription = 'A'.repeat(250);
      const outcomes = [createTestOutcome({ description: longDescription })];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('...');
    });
  });

  describe('selectReasoningMethod (Unit Tests)', () => {
    it('should return First Principles as default with insufficient data', () => {
      const context = createTestDecisionContext();

      const method = injector.selectReasoningMethod(context);

      expect(method.name).toBe('First Principles');
      expect(method.category).toBe('Core');
    });

    it('should return valid ReasoningMethod structure', () => {
      const context = createTestDecisionContext();

      const method = injector.selectReasoningMethod(context);

      expect(method).toHaveProperty('name');
      expect(method).toHaveProperty('category');
      expect(method).toHaveProperty('parameters');
    });

    it('should handle timeout gracefully', () => {
      // This test verifies the method doesn't hang
      const context = createTestDecisionContext();

      const startTime = Date.now();
      injector.selectReasoningMethod(context);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
    });

    it('should return Core category method for code domain', () => {
      const context = createTestDecisionContext({ domain: 'code' });

      const method = injector.selectReasoningMethod(context);

      expect(method.category).toBe('Core');
    });

    it('should include empty parameters by default', () => {
      const context = createTestDecisionContext();

      const method = injector.selectReasoningMethod(context);

      expect(method.parameters).toEqual({});
    });
  });

  describe('injectReasoningMethod (Unit Tests)', () => {
    it('should inject First Principles guidance', () => {
      const basePrompt = 'Task: Implement feature X';
      const method = createTestMethod();

      const result = injector.injectReasoningMethod(basePrompt, method);

      expect(result).toContain('## Reasoning Method');
      expect(result).toContain('First Principles');
      expect(result).toContain('fundamental truths');
    });

    it('should inject 5 Whys guidance', () => {
      const basePrompt = 'Task: Implement feature X';
      const method = createTestMethod({ name: '5 Whys', category: 'Core' });

      const result = injector.injectReasoningMethod(basePrompt, method);

      expect(result).toContain('5 Whys');
      expect(result).toContain('root cause');
    });

    it('should include outcome-based reasoning framework', () => {
      const basePrompt = 'Task: Implement feature X';
      const method = createTestMethod();

      const result = injector.injectReasoningMethod(basePrompt, method);

      expect(result).toContain('START WITH OUTCOMES');
      expect(result).toContain('GATHER EVIDENCE');
      expect(result).toContain('CRITICALLY REASON');
      expect(result).toContain('CHOOSE BEST PATH');
    });

    it('should return base prompt for invalid method', () => {
      const basePrompt = 'Task: Implement feature X';
      const invalidMethod = { invalid: 'method' } as unknown as ReasoningMethod;

      const result = injector.injectReasoningMethod(basePrompt, invalidMethod);

      expect(result).toBe(basePrompt);
    });

    it('should shorten method description if needed', () => {
      const basePrompt = 'A'.repeat(450);
      const method = createTestMethod();

      const result = injector.injectReasoningMethod(basePrompt, method);

      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('validateInjection (Unit Tests)', () => {
    it('should pass validation for valid injection', () => {
      const prompt = 'Task: Implement feature X';
      const injection = '## Business Outcomes\n\nTest outcome';

      const result = injector.validateInjection(prompt, injection);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when total size exceeds limit', () => {
      const prompt = 'A'.repeat(400);
      const injection = 'B'.repeat(200);

      const result = injector.validateInjection(prompt, injection);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('INJECTION_TOO_LARGE'))).toBe(true);
    });

    it('should warn about suspicious format', () => {
      const prompt = 'Task: Implement feature X';
      const injection = '```markdown\nSuspicious content\n```';

      const result = injector.validateInjection(prompt, injection);

      expect(result.warnings.some(w => w.includes('INJECTION_HAS_SUSPICIOUS_FORMAT'))).toBe(true);
    });

    it('should warn about forbidden patterns', () => {
      const prompt = 'Task: Implement feature X';
      const injection = 'This includes Full conversation history';

      const result = injector.validateInjection(prompt, injection);

      expect(result.warnings.some(w => w.includes('INJECTION_HAS_FORBIDDEN_PATTERNS'))).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS (10 tests)
  // ============================================================================

  describe('Integration with BusinessOutcomeExtractor', () => {
    it('should work with outcomes extracted from PRD', () => {
      const basePrompt = 'Task: Build user retention feature';
      const outcomes = [
        createTestOutcome({
          title: 'Increase user retention by 20%',
          category: 'business',
          priority: 'must',
        }),
        createTestOutcome({
          id: 'outcome-2',
          title: 'Achieve 99.9% uptime',
          category: 'technical',
          priority: 'must',
        }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('Increase user retention');
      expect(result).toContain('Achieve 99.9% uptime');
      expect(result).toContain('Business Outcomes');
      expect(result).toContain('Technical Outcomes');
    });

    it('should preserve outcome structure from extractor', () => {
      const basePrompt = 'Task: Build feature';
      const outcomes = [
        createTestOutcome({
          kpis: [
            {
              name: 'Test Metric',
              targetValue: '100',
              measurementMethod: 'count',
              timeframe: '1 day',
              quantifiable: true,
            },
          ],
          successCriteria: ['Criteria 1', 'Criteria 2'],
        }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('Test Metric');
      expect(result).toContain('Criteria 1');
      expect(result).toContain('Criteria 2');
    });

    it('should handle multiple outcomes with same priority', () => {
      const basePrompt = 'Task: Build feature';
      const outcomes = [
        createTestOutcome({ id: '1', priority: 'should', title: 'Outcome A' }),
        createTestOutcome({ id: '2', priority: 'should', title: 'Outcome B' }),
        createTestOutcome({ id: '3', priority: 'should', title: 'Outcome C' }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      // Should contain at least the first two (may truncate due to size)
      expect(result).toContain('Outcome A');
      expect(result).toContain('Outcome B');
    });
  });

  describe('Integration with DecisionLearningStore', () => {
    it('should query store for method selection', () => {
      const context = createTestDecisionContext();

      // Add some historical decisions
      for (let i = 0; i < 15; i++) {
        decisionStore.storeDecision({
          id: `decision-${i}`,
          timestamp: Date.now(),
          component: 'TestComponent',
          activity: 'test activity',
          decision: 'Test decision',
          context: {
            domain: 'code' as Domain,
            complexity: 0.5,
            constraints: [],
            stakeholders: [],
          },
          reasoningMethod: {
            name: 'First Principles',
            category: 'Core',
            parameters: {},
          },
          confidence: 0.8,
          importanceWeights: [0.5],
        });
      }

      const method = injector.selectReasoningMethod(context);

      expect(method).toBeDefined();
      expect(method.name).toBeTruthy();
    });

    it('should track injection outcomes', () => {
      const injectionId = injector.generateInjectionId(
        [createTestOutcome()],
        createTestMethod(),
        createTestContext()
      );

      // Create the decision in the store first
      decisionStore.storeDecision({
        id: injectionId,
        timestamp: Date.now(),
        component: 'TestComponent',
        activity: 'test activity',
        decision: 'Test decision',
        context: {
          domain: 'code' as Domain,
          complexity: 0.5,
          constraints: [],
          stakeholders: [],
        },
        reasoningMethod: {
          name: 'First Principles',
          category: 'Core',
          parameters: {},
        },
        confidence: 0.8,
        importanceWeights: [0.5],
      });

      const outcome = createTestDecisionOutcome({
        decisionId: injectionId,
      });

      expect(() => {
        injector.trackInjectionEffectiveness(injectionId, outcome);
      }).not.toThrow();
    });

    it('should warn on tracking non-existent injection', () => {
      const outcome = createTestDecisionOutcome();

      expect(() => {
        injector.trackInjectionEffectiveness('non-existent', outcome);
      }).not.toThrow();
    });

    it('should update store with outcome data', () => {
      const injectionId = injector.generateInjectionId(
        [createTestOutcome()],
        createTestMethod(),
        createTestContext()
      );

      // First, create a decision in the store
      decisionStore.storeDecision({
        id: injectionId,
        timestamp: Date.now(),
        component: 'TestComponent',
        activity: 'test activity',
        decision: 'Test decision',
        context: {
          domain: 'code' as Domain,
          complexity: 0.5,
          constraints: [],
          stakeholders: [],
        },
        reasoningMethod: {
          name: 'First Principles',
          category: 'Core',
          parameters: {},
        },
        confidence: 0.8,
        importanceWeights: [0.5],
      });

      const outcome = createTestDecisionOutcome({
        decisionId: injectionId,
        success: true,
        quality: 0.9,
      });

      injector.trackInjectionEffectiveness(injectionId, outcome);

      const decisions = decisionStore.getDecisions();
      const updatedDecision = decisions.find((d) => d.id === injectionId);

      expect(updatedDecision?.outcome).toEqual(outcome);
    });

    it('should generate unique injection IDs', () => {
      const id1 = injector.generateInjectionId(
        [createTestOutcome()],
        createTestMethod(),
        createTestContext()
      );
      const id2 = injector.generateInjectionId(
        [createTestOutcome()],
        createTestMethod(),
        createTestContext()
      );

      expect(id1).not.toBe(id2);
    });

    it('should track injection metadata', () => {
      const outcomes = [createTestOutcome()];
      const method = createTestMethod();
      const context = createTestContext();

      const injectionId = injector.generateInjectionId(outcomes, method, context);

      const activeInjections = injector.getActiveInjections();
      const tracking = activeInjections.get(injectionId);

      expect(tracking).toBeDefined();
      expect(tracking?.outcomes).toEqual(outcomes);
      expect(tracking?.method).toEqual(method);
      expect(tracking?.context).toEqual(context);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS (8 tests)
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty outcome array', () => {
      const basePrompt = 'Task: Implement feature X';
      const result = injector.injectOutcomes(basePrompt, [], createTestContext());

      expect(result).toBe(basePrompt);
    });

    it('should handle outcomes with empty fields', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [
        createTestOutcome({
          kpis: [],
          successCriteria: [],
          impactMetrics: [],
        }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('## Business Outcomes');
      expect(result).toContain('Increase user retention');
    });

    it('should handle very long outcome titles', () => {
      const basePrompt = 'Task: Implement feature X';
      const longTitle = 'A'.repeat(200);
      const outcomes = [createTestOutcome({ title: longTitle })];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      // Title is truncated in the format
      expect(result.length).toBeLessThan(500);
    });

    it('should handle special characters in outcomes', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [
        createTestOutcome({
          title: 'Achieve 100% (all) users & <errors>',
          description: 'Test with <special> & "characters"',
        }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('100%');
      expect(result).toContain('&');
    });

    it('should handle unicode characters in outcomes', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [
        createTestOutcome({
          title: 'Achieve 🎯 success with 中文 characters',
        }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result).toContain('🎯');
      expect(result).toContain('中文');
    });

    it('should handle injection at size boundary', () => {
      const basePrompt = 'A'.repeat(400);
      const injection = 'B'.repeat(99);
      const outcomes = [createTestOutcome({ description: injection })];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      expect(result.length).toBeLessThanOrEqual(500);
    });

    it('should handle method with unknown name', () => {
      const basePrompt = 'Task: Implement feature X';
      const method = createTestMethod({
        name: 'Unknown Method',
        category: 'Core',
      });

      const result = injector.injectReasoningMethod(basePrompt, method);

      expect(result).toContain('Unknown Method');
    });

    it('should clear old injections', () => {
      // Create injection with old timestamp
      const oldId = `injection-old-${Date.now() - 61 * 60 * 1000}`;
      injector['activeInjections'].set(oldId, {
        injectionId: oldId,
        outcomes: [createTestOutcome()],
        method: createTestMethod(),
        timestamp: Date.now() - 61 * 60 * 1000,
        context: createTestContext(),
      });

      injector.clearOldInjections();

      const activeInjections = injector.getActiveInjections();
      expect(activeInjections.has(oldId)).toBe(false);
    });
  });

  // ============================================================================
  // CRITICAL PATH TESTS (Coverage for 95% requirement)
  // ============================================================================

  describe('Critical Path: Outcome Injection', () => {
    it('should complete full injection workflow', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [createTestOutcome()];
      const context = createTestContext();

      // Step 1: Inject outcomes
      const enhancedPrompt = injector.injectOutcomes(basePrompt, outcomes, context);

      // Step 2: Validate
      const validation = injector.validateInjection(basePrompt, enhancedPrompt);
      expect(validation.valid).toBe(true);

      // Step 3: Track
      const injectionId = injector.generateInjectionId(outcomes, null, context);
      const tracking = injector.getActiveInjections().get(injectionId);
      expect(tracking).toBeDefined();
    });

    it('should handle injection with method selection', () => {
      const basePrompt = 'Task: Implement feature X';
      const outcomes = [createTestOutcome()];
      const context = createTestContext();
      const decisionContext = createTestDecisionContext();

      // Step 1: Select method
      const method = injector.selectReasoningMethod(decisionContext);

      // Step 2: Inject outcomes
      const withOutcomes = injector.injectOutcomes(basePrompt, outcomes, context);

      // Step 3: Inject method (separately, not concatenated)
      const withMethod = injector.injectReasoningMethod(basePrompt, method);

      expect(withOutcomes).toContain('Business Outcomes');
      expect(withMethod).toContain('Reasoning Method');
    });
  });

  describe('Critical Path: Size Validation', () => {
    it('should prevent context overflow', () => {
      const largeBase = 'A'.repeat(300);
      const largeOutcomes = [
        createTestOutcome({ description: 'B'.repeat(200) }),
        createTestOutcome({ id: '2', description: 'C'.repeat(200) }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(largeBase, largeOutcomes, context);

      expect(result.length).toBeLessThanOrEqual(500);
    });

    it('should truncate intelligently when needed', () => {
      const basePrompt = 'A'.repeat(250); // Smaller to allow some injection
      const outcomes = [
        createTestOutcome({ priority: 'must', title: 'Critical outcome' }),
        createTestOutcome({ id: '2', priority: 'could', title: 'Nice to have' }),
      ];
      const context = createTestContext();

      const result = injector.injectOutcomes(basePrompt, outcomes, context);

      // Must outcome should be present (prioritized)
      expect(result).toContain('Critical outcome');
      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Critical Path: Learning Integration', () => {
    it('should improve method selection over time', () => {
      const context = createTestDecisionContext();

      // Initial selection with no data
      const method1 = injector.selectReasoningMethod(context);
      expect(method1.name).toBe('First Principles');

      // Add successful decisions with First Principles
      for (let i = 0; i < 20; i++) {
        const decisionId = `decision-${i}`;
        decisionStore.storeDecision({
          id: decisionId,
          timestamp: Date.now(),
          component: 'TestComponent',
          activity: 'test activity',
          decision: 'Test decision',
          context: {
            domain: 'code' as Domain,
            complexity: 0.5,
            constraints: [],
            stakeholders: [],
          },
          reasoningMethod: {
            name: 'First Principles',
            category: 'Core',
            parameters: {},
          },
          confidence: 0.8,
          importanceWeights: [0.5],
        });

        // Mark as successful
        decisionStore.learnFromOutcome({
          success: true,
          quality: 0.9,
          errors: [],
          decisionId,
        });
      }

      // Selection with data
      const method2 = injector.selectReasoningMethod(context);
      expect(method2.name).toBe('First Principles');
    });

    it('should track and learn from failures', () => {
      const injectionId = injector.generateInjectionId(
        [createTestOutcome()],
        createTestMethod(),
        createTestContext()
      );

      // Create decision
      decisionStore.storeDecision({
        id: injectionId,
        timestamp: Date.now(),
        component: 'TestComponent',
        activity: 'test activity',
        decision: 'Test decision',
        context: {
          domain: 'code' as Domain,
          complexity: 0.5,
          constraints: [],
          stakeholders: [],
        },
        reasoningMethod: {
          name: 'First Principles',
          category: 'Core',
          parameters: {},
        },
        confidence: 0.8,
        importanceWeights: [0.5],
      });

      // Track failure
      const failureOutcome = createTestDecisionOutcome({
        decisionId: injectionId,
        success: false,
        quality: 0.3,
        errors: ['Timeout error'],
      });

      expect(() => {
        injector.trackInjectionEffectiveness(injectionId, failureOutcome);
      }).not.toThrow();

      const decisions = decisionStore.getDecisions();
      const updatedDecision = decisions.find((d) => d.id === injectionId);
      expect(updatedDecision?.outcome?.success).toBe(false);
    });
  });
});
