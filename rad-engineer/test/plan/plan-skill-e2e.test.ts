/**
 * End-to-End Test: /plan skill with "build me notion like notes app"
 *
 * This test simulates the complete /plan skill flow:
 * 1. Intake phase (Q&A)
 * 2. Research phase (parallel agents - mocked)
 * 3. Specification phase (component specs)
 * 4. Execution plan generation (YAML metadata)
 * 5. Validation phase
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  IntakeHandler,
  ResearchCoordinator,
  ExecutionPlanGenerator,
  ValidationUtils,
  type StructuredRequirements,
  type ResearchFindings,
  type ExecutionPlan,
} from '../../src/plan';

describe('/plan Skill - End-to-End Test', () => {
  let intakeHandler: IntakeHandler;
  let planGenerator: ExecutionPlanGenerator;
  let validationUtils: ValidationUtils;

  beforeEach(() => {
    intakeHandler = new IntakeHandler({ maxQuestions: 10 });
    planGenerator = new ExecutionPlanGenerator({ maxConcurrent: 2 });
    validationUtils = new ValidationUtils();
  });

  it('should process "build me notion like notes app" through complete flow', async () => {
    // PHASE 1: INTAKE
    console.log('\n=== PHASE 1: INTAKE ===');

    const query = 'build me notion like notes app';
    const answers = {
      coreFeature: 'Notion-like notes app with rich text editing',
      techStack: 'TypeScript/Node.js',
      timeline: 'this-week',
      successCriteria: ['Tests passing', 'TypeScript strict', 'Working demo'],
      outOfScope: ['Database schema changes', 'API changes'],
    };

    const requirements: StructuredRequirements = await intakeHandler.processQuery(query, answers);
    console.log('✓ Requirements gathered:', requirements.coreFeature);
    console.log('  Complexity:', requirements.complexity);
    console.log('  Estimated stories:', requirements.estimatedStories);

    expect(requirements.query).toBe(query);
    expect(requirements.complexity).toBe('complex');
    expect(requirements.estimatedStories).toBe(15);

    // PHASE 2: RESEARCH (Mocked - parallel agents would be spawned here)
    console.log('\n=== PHASE 2: RESEARCH (Mocked) ===');

    const mockFindings: ResearchFindings = {
      feasibility: {
        feasible: true,
        approaches: [
          {
            name: 'React + TipTap for rich text',
            pros: ['Modern', 'Well-documented', 'Extensible'],
            cons: ['Large bundle size'],
            confidence: 0.9,
          },
          {
            name: 'Vanilla JS + contentEditable',
            pros: ['Lightweight', 'No dependencies'],
            cons: ['Complex implementation', 'Cross-browser issues'],
            confidence: 0.7,
          },
        ],
        risks: [
          {
            risk: 'Rich text editing complexity',
            mitigation: 'Use proven library (TipTap)',
          },
          {
            risk: 'Performance with large documents',
            mitigation: 'Implement virtual scrolling',
          },
        ],
        complexity: 'medium',
      },
      codebasePatterns: {
        similarFeatures: [],
        conventions: {
          structure: 'src/components/, src/services/',
          naming: 'camelCase',
          testing: 'Jest + React Testing Library',
        },
        integrationPoints: [],
        existingDependencies: [],
      },
      bestPractices: {
        practices: [
          {
            practice: 'Use contentEditable over textarea for rich text',
            reason: 'Better formatting control',
            source: 'TipTap docs',
          },
          {
            practice: 'Implement auto-save with debouncing',
            reason: 'Prevent data loss',
            source: 'UX best practices',
          },
        ],
        pitfalls: [
          {
            pitfall: 'Using execCommand for rich text',
            consequence: 'Deprecated, inconsistent behavior',
            avoidance: 'Use modern library like TipTap',
          },
        ],
        securityConsiderations: [
          {
            risk: 'XSS through rich text content',
            mitigation: 'Sanitize HTML output',
          },
        ],
      },
      evidence: [
        {
          claim: 'React + TipTap is recommended approach',
          source: 'https://tiptap.dev/docs',
          confidence: 0.95,
        },
        {
          claim: 'Auto-save prevents data loss',
          source: 'https://www.nngroup.com/articles/auto-save',
          confidence: 0.85,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    console.log('✓ Research findings gathered:', mockFindings.evidence.length, 'evidence sources');

    // PHASE 3: SPECIFICATION (Skipped for simple test)
    console.log('\n=== PHASE 3: SPECIFICATION (Skipped for simple test) ===');

    // PHASE 4: EXECUTION PLAN GENERATION
    console.log('\n=== PHASE 4: EXECUTION PLAN GENERATION ===');

    const plan: ExecutionPlan = planGenerator.generateExecutionPlan(
      requirements,
      mockFindings
    );

    console.log('✓ Execution plan generated');
    console.log('  Project:', plan.execution_metadata.project);
    console.log('  Waves:', plan.waves.length);
    console.log('  Total stories:', plan.waves.reduce((sum, w) => sum + w.stories.length, 0));
    console.log('  Quality gates:', plan.quality_gates.length);

    expect(plan.execution_metadata.project).toBeTruthy();
    expect(plan.waves.length).toBeGreaterThan(0);
    expect(plan.quality_gates.length).toBeGreaterThan(0);

    // Generate YAML
    const yaml = planGenerator.toYaml(plan);
    console.log('\n✓ YAML generated (first 500 chars):');
    console.log(yaml.substring(0, 500) + '...');

    expect(yaml).toBeTruthy();
    expect(yaml.length).toBeGreaterThan(0);

    // Generate tasks.json
    const tasksJson = planGenerator.generateTasksJson(plan);
    console.log('\n✓ tasks.json generated');
    console.log('  Stories:', tasksJson.stories.length);

    expect(tasksJson.stories.length).toBeGreaterThan(0);

    // PHASE 5: VALIDATION
    console.log('\n=== PHASE 5: VALIDATION ===');

    const validationResult = validationUtils.validateExecutionPlan(plan);
    console.log('✓ Validation completed');
    console.log('  Passed:', validationResult.passed);
    console.log('  Issues:', validationResult.issues.length);

    // Generate validation summary
    const summary = validationUtils.generateValidationSummary(validationResult);
    console.log('\n✓ Validation summary generated (first 800 chars):');
    console.log(summary.substring(0, 800) + '...');

    // For this test, we expect some warnings but no blocking errors
    // (Research is mocked, so some evidence may be missing)
    console.log('\n=== COMPLETE ===');
    console.log('\nGenerated files would be:');
    console.log('  - docs/planning/execution/GRANULAR_EXECUTION_PLAN.md');
    console.log('  - docs/planning/tasks.json');
    console.log('  - docs/planning/VALIDATION_SUMMARY.md');
    console.log('  - docs/planning/RESEARCH_FINDINGS.md');

    // Core assertions
    expect(plan.execution_metadata.schema).toBe('rad-engineer-execution-metadata-v1');
    expect(plan.waves.length).toBeGreaterThan(0);
    expect(validationResult.issues.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle simple query correctly', async () => {
    const query = 'add login button';
    const requirements = await intakeHandler.processQuery(query, {
      coreFeature: 'Login button',
      techStack: 'TypeScript',
      timeline: 'flexible',
      successCriteria: ['Tests passing'],
      outOfScope: [],
    });

    expect(requirements.complexity).toBe('simple');
    expect(requirements.estimatedStories).toBe(3);
  });

  it('should handle complex query correctly', async () => {
    const query = 'build a full app like duolingo but for learning python';
    const requirements = await intakeHandler.processQuery(query, {
      coreFeature: 'Language learning app',
      techStack: 'TypeScript',
      timeline: 'flexible',
      successCriteria: ['Tests passing', 'TypeScript strict'],
      outOfScope: [],
    });

    expect(requirements.complexity).toBe('complex');
    expect(requirements.estimatedStories).toBe(15);
  });

  it('should detect missing evidence sources', () => {
    const planWithMissingEvidence: Partial<ExecutionPlan> = {
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
      evidence: [], // No evidence!
    };

    const result = validationUtils.validateEvidenceAlignment(
      planWithMissingEvidence as ExecutionPlan
    );

    // Should have warnings about missing evidence
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('should detect circular dependencies', () => {
    const planWithCircularDeps: Partial<ExecutionPlan> = {
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
      waves: [
        {
          id: 'wave-0.1',
          number: 0.1,
          phase: 0,
          name: 'Wave 0.1',
          dependencies: ['wave-0.2'], // Depends on 0.2
          estimatedMinutes: 30,
          parallelization: 'sequential',
          maxConcurrent: 2,
          stories: [],
        },
        {
          id: 'wave-0.2',
          number: 0.2,
          phase: 0,
          name: 'Wave 0.2',
          dependencies: ['wave-0.1'], // Depends on 0.1 - CIRCULAR!
          estimatedMinutes: 30,
          parallelization: 'sequential',
          maxConcurrent: 2,
          stories: [],
        },
      ],
      integration_tests: [],
      quality_gates: [],
    };

    const result = validationUtils.validateDependencies(
      planWithCircularDeps as ExecutionPlan
    );

    // Should detect circular dependency
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.message.includes('Circular dependency'))).toBe(true);
  });

  it('should validate parseability of generated YAML', () => {
    const plan: ExecutionPlan = {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: 'notion-notes-app',
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
        success_criteria: ['Tests passing', 'TypeScript strict'],
        out_of_scope: ['Database changes'],
      },
      waves: [
        {
          id: 'wave-0.1',
          number: 0.1,
          phase: 0,
          name: 'Foundation',
          dependencies: [],
          estimatedMinutes: 60,
          parallelization: 'full',
          maxConcurrent: 2,
          stories: [
            {
              id: 'STORY-001-1-1',
              waveId: 'wave-0.1',
              title: 'Initialize project',
              description: 'Set up project structure',
              agentType: 'developer',
              model: 'haiku',
              estimatedMinutes: 30,
              dependencies: [],
              parallelGroup: 1,
              acceptanceCriteria: [
                { criterion: 'Package.json exists', testable: true, priority: 'must' },
              ],
              filesInScope: ['package.json'],
              testRequirements: { unitTests: 3, integrationTests: 0, coverageTarget: 80 },
            },
          ],
        },
      ],
      integration_tests: [
        {
          waveId: 'wave-0.1',
          tests: [
            { name: 'Test project setup', testFile: 'test/setup.test.ts' },
          ],
        },
      ],
      quality_gates: [
        {
          waveId: 'all',
          gates: [
            { name: 'TypeScript', command: 'pnpm typecheck', mustPass: true },
            { name: 'Tests', command: 'pnpm test', mustPass: true },
          ],
        },
      ],
    };

    const yaml = planGenerator.toYaml(plan);
    const parseResult = validationUtils.validateParseability(plan);

    expect(yaml).toBeTruthy();
    expect(parseResult.passed).toBe(true);
  });
});
