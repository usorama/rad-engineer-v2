/**
 * Decision Learning Integration Tests
 *
 * Tests the integration of business outcomes, reasoning methods,
 * and decision tracking into the agent execution workflow.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { getDecisionLearningIntegration, resetDecisionLearningIntegration, type ExecutionContext } from '../../src/execute/index.js';

describe('DecisionLearningIntegration', () => {
  let integration: ReturnType<typeof getDecisionLearningIntegration>;

  beforeAll(() => {
    // Reset singleton for clean test state
    resetDecisionLearningIntegration();
    integration = getDecisionLearningIntegration({
      enableOutcomeInjection: true,
      enableMethodSelection: true,
      enableDecisionTracking: true,
      enableOutcomeLearning: true,
      decisionStorePath: '/tmp/test-decision-store.yaml',
    });
  });

  describe('enhancePrompt', () => {
    it('should enhance prompt with reasoning method', async () => {
      const originalPrompt = '## Story: US-001\n\nImplement user authentication.';
      const context: ExecutionContext = {
        storyId: 'US-001',
        storyTitle: 'User Authentication',
        component: 'Auth',
        activity: 'implementation',
        complexity: 0.7,
        domain: 'code',
        filesInScope: ['app/src/auth/login.ts'],
        acceptanceCriteria: ['User can log in', 'Session management works'],
      };

      const enhanced = await integration.enhancePrompt(originalPrompt, context);

      // Should return enhanced prompt (may be same length if no method/outcomes)
      expect(enhanced.enhancedPrompt).toBeDefined();
      expect(enhanced.enhancedPrompt.length).toBeGreaterThanOrEqual(originalPrompt.length);

      // Should include decision ID
      expect(enhanced.decisionId).toMatch(/^DEC-US-001-\d+$/);

      // Should include reasoning method (if selected by DecisionLearningStore)
      if (enhanced.reasoningMethod) {
        expect(enhanced.reasoningMethod.name).toBeDefined();
        expect(enhanced.enhancedPrompt).toContain(enhanced.reasoningMethod.name);
      } else {
        // If no method selected (fresh store), that's OK
        console.log('No reasoning method selected (DecisionLearningStore has no prior data)');
      }
    });

    it('should handle empty outcomes gracefully', async () => {
      const originalPrompt = '## Story: US-002\n\nFix bug in dashboard.';
      const context: ExecutionContext = {
        storyId: 'US-002',
        storyTitle: 'Dashboard Bug Fix',
        component: 'Dashboard',
        activity: 'debugging',
        complexity: 0.3,
        domain: 'general',
        filesInScope: ['app/src/dashboard/widget.tsx'],
        acceptanceCriteria: ['Bug fixed', 'No regressions'],
      };

      const enhanced = await integration.enhancePrompt(originalPrompt, context);

      // Should still return enhanced prompt even without outcomes
      expect(enhanced.enhancedPrompt).toBeDefined();
      expect(enhanced.businessOutcomes).toEqual([]);
    });

    it('should include injection context in result', async () => {
      const originalPrompt = '## Story: US-003\n\nAdd API endpoint.';
      const context: ExecutionContext = {
        storyId: 'US-003',
        storyTitle: 'API Endpoint',
        component: 'API',
        activity: 'implementation',
        complexity: 0.5,
        domain: 'code',
        filesInScope: ['app/src/app/api/route.ts'],
        acceptanceCriteria: ['Endpoint returns JSON', 'Error handling works'],
      };

      const enhanced = await integration.enhancePrompt(originalPrompt, context);

      // Should include injection context
      expect(enhanced.injectionContext).toBeDefined();
      expect(enhanced.injectionContext.domain).toBe(context.domain);
      expect(enhanced.injectionContext.complexity).toBe(context.complexity);
      expect(enhanced.injectionContext.component).toBe(context.component);
      expect(enhanced.injectionContext.activity).toBe(context.activity);
    });
  });

  describe('recordOutcome', () => {
    it('should record successful execution outcome', async () => {
      const outcome = {
        decisionId: 'DEC-US-001-1234567890',
        success: true,
        quality: 0.9,
        duration: 5000,
        errors: [],
      };

      // Should not throw
      await integration.recordOutcome(outcome);

      // Verify outcome was recorded (check statistics)
      const stats = await integration.getStatistics();
      expect(stats.totalDecisions).toBeGreaterThan(0);
    });

    it('should record failed execution outcome', async () => {
      const outcome = {
        decisionId: 'DEC-US-002-1234567890',
        success: false,
        quality: 0.3,
        duration: 10000,
        errors: ['Type check failed', 'Tests failed'],
      };

      // Should not throw
      await integration.recordOutcome(outcome);

      // Verify outcome was recorded
      const stats = await integration.getStatistics();
      expect(stats.totalDecisions).toBeGreaterThan(0);
    });

    it('should record outcome with user feedback', async () => {
      const outcome = {
        decisionId: 'DEC-US-003-1234567890',
        success: true,
        quality: 0.8,
        errors: [],
        userFeedback: 'Good implementation, minor improvements needed',
      };

      // Should not throw
      await integration.recordOutcome(outcome);

      // Verify outcome was recorded
      const stats = await integration.getStatistics();
      expect(stats.totalDecisions).toBeGreaterThan(0);
    });
  });

  describe('getStatistics', () => {
    it('should return decision learning statistics', async () => {
      const stats = await integration.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalDecisions).toBeGreaterThanOrEqual(0);
      expect(stats.averageQuality).toBeGreaterThanOrEqual(0);
      expect(stats.averageQuality).toBeLessThanOrEqual(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full workflow: enhance → execute → record', async () => {
      const originalPrompt = '## Story: US-004\n\nImplement feature.';
      const context: ExecutionContext = {
        storyId: 'US-004',
        storyTitle: 'New Feature',
        component: 'Core',
        activity: 'implementation',
        complexity: 0.6,
        domain: 'code',
        filesInScope: ['app/src/feature.ts'],
        acceptanceCriteria: ['Feature works'],
      };

      // Step 1: Enhance prompt
      const enhanced = await integration.enhancePrompt(originalPrompt, context);
      expect(enhanced.enhancedPrompt).toBeDefined();
      expect(enhanced.decisionId).toBeDefined();

      // Step 2: Simulate execution (agent would use enhanced.enhancedPrompt)
      const executionSuccess = true;
      const executionQuality = 0.85;
      const executionErrors: string[] = [];

      // Step 3: Record outcome
      await integration.recordOutcome({
        decisionId: enhanced.decisionId,
        success: executionSuccess,
        quality: executionQuality,
        duration: 3000,
        errors: executionErrors,
      });

      // Verify learning updated
      const stats = await integration.getStatistics();
      expect(stats.totalDecisions).toBeGreaterThan(0);
    });

    it('should track learning over multiple executions', async () => {
      const contexts: ExecutionContext[] = [
        {
          storyId: 'US-005',
          storyTitle: 'Feature A',
          component: 'Core',
          activity: 'implementation',
          complexity: 0.5,
          domain: 'code',
          filesInScope: ['app/src/featureA.ts'],
          acceptanceCriteria: ['Feature A works'],
        },
        {
          storyId: 'US-006',
          storyTitle: 'Feature B',
          component: 'Core',
          activity: 'implementation',
          complexity: 0.5,
          domain: 'code',
          filesInScope: ['app/src/featureB.ts'],
          acceptanceCriteria: ['Feature B works'],
        },
        {
          storyId: 'US-007',
          storyTitle: 'Feature C',
          component: 'Core',
          activity: 'implementation',
          complexity: 0.5,
          domain: 'code',
          filesInScope: ['app/src/featureC.ts'],
          acceptanceCriteria: ['Feature C works'],
        },
      ];

      const initialStats = await integration.getStatistics();
      const initialCount = initialStats.totalDecisions;

      // Execute multiple stories
      for (const context of contexts) {
        const enhanced = await integration.enhancePrompt(
          '## Story: ' + context.storyId + '\n\nImplement.',
          context
        );

        await integration.recordOutcome({
          decisionId: enhanced.decisionId,
          success: true,
          quality: 0.8,
          errors: [],
        });
      }

      // Verify learning accumulated
      const finalStats = await integration.getStatistics();
      expect(finalStats.totalDecisions).toBe(initialCount + contexts.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle enhancement errors gracefully', async () => {
      const invalidContext = {
        storyId: '',
        storyTitle: '',
        component: '',
        activity: '',
        complexity: -1, // Invalid
        domain: 'invalid' as unknown as 'code', // Invalid - using unknown for type coercion
        filesInScope: [],
        acceptanceCriteria: [],
      };

      // Should not throw
      const enhanced = await integration.enhancePrompt(
        '## Story: INVALID\n\nInvalid context.',
        invalidContext
      );

      // Should still return result (degraded gracefully)
      expect(enhanced).toBeDefined();
    });

    it('should handle outcome recording errors gracefully', async () => {
      const invalidOutcome = {
        decisionId: '', // Invalid
        success: true,
        quality: 0.5,
        errors: [],
      };

      // Should not throw
      await integration.recordOutcome(invalidOutcome);
    });
  });

  describe('Configuration', () => {
    it('should respect configuration options', async () => {
      resetDecisionLearningIntegration();

      const disabledIntegration = getDecisionLearningIntegration({
        enableOutcomeInjection: false,
        enableMethodSelection: false,
        enableDecisionTracking: false,
        enableOutcomeLearning: false,
      });

      const context: ExecutionContext = {
        storyId: 'US-008',
        storyTitle: 'Config Test',
        component: 'Test',
        activity: 'testing',
        complexity: 0.4,
        domain: 'general',
        filesInScope: [],
        acceptanceCriteria: [],
      };

      const enhanced = await disabledIntegration.enhancePrompt(
        '## Story: US-008\n\nTest.',
        context
      );

      // Should return enhanced prompt (even with features disabled)
      expect(enhanced.enhancedPrompt).toBeDefined();
    });
  });
});
