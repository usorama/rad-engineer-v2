/**
 * Execution Plan Generator
 *
 * Generates GRANULAR_EXECUTION_PLAN.md with YAML metadata
 * and tasks.json for consumption by /execute skill.
 */

import type {
  StructuredRequirements,
  ResearchFindings,
  ExecutionPlan,
  TasksJson,
  Story,
  Wave,
  ComponentSpec,
  IntegrationSpec,
} from './types.js';
import * as yaml from 'js-yaml';

/**
 * Execution plan generator options
 */
export interface ExecutionPlanGeneratorOptions {
  defaultModel?: 'haiku' | 'sonnet' | 'opus';
  maxConcurrent?: number; // Default: 2
}

/**
 * Execution plan generator for /plan skill
 *
 * Generates YAML-based execution plans consumable by /execute skill.
 */
export class ExecutionPlanGenerator {
  private options: ExecutionPlanGeneratorOptions;
  private researchSessionId: string;

  constructor(options: ExecutionPlanGeneratorOptions = {}) {
    this.options = {
      defaultModel: options.defaultModel ?? 'sonnet',
      maxConcurrent: options.maxConcurrent ?? 2,
    };
    this.researchSessionId = this.generateUUID();
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate complete execution plan from requirements and research
   *
   * @param requirements - Structured requirements from intake
   * @param research - Research findings from parallel agents
   * @param specs - Component specifications (optional)
   * @param integrations - Integration specifications (optional)
   * @returns Execution plan with YAML metadata
   */
  generateExecutionPlan(
    requirements: StructuredRequirements,
    research: ResearchFindings,
    specs?: ComponentSpec[],
    integrations?: IntegrationSpec[]
  ): ExecutionPlan {
    const now = new Date().toISOString();

    // Build waves from requirements and research
    const waves = this.buildWaves(requirements, research);

    // Build integration tests
    const integrationTests = this.buildIntegrationTests(waves);

    // Build quality gates
    const qualityGates = this.buildQualityGates();

    // Extract evidence from research
    const evidence = research.evidence ?? [];

    return {
      execution_metadata: {
        version: '1.0',
        schema: 'rad-engineer-execution-metadata-v1',
        project: this.extractProjectName(requirements),
        created: now,
        updated: now,
        source: '/plan skill v1.0.0',
        researchSessionId: this.researchSessionId,
      },
      requirements: {
        query: requirements.query,
        core_feature: requirements.coreFeature,
        tech_stack: requirements.techStack,
        timeline: requirements.timeline,
        success_criteria: requirements.successCriteria,
        out_of_scope: requirements.outOfScope,
      },
      waves,
      integration_tests: integrationTests,
      quality_gates: qualityGates,
      evidence,
    };
  }

  /**
   * Generate tasks.json from execution plan
   *
   * @param plan - Execution plan
   * @returns Machine-readable tasks.json
   */
  generateTasksJson(plan: ExecutionPlan): TasksJson {
    const stories = plan.waves.flatMap(wave =>
      wave.stories.map(story => ({
        id: story.id,
        waveId: story.waveId,
        title: story.title,
        status: 'pending' as const,
        model: story.model,
        estimatedMinutes: story.estimatedMinutes,
        dependencies: story.dependencies,
        acceptanceCriteria: story.acceptanceCriteria.map(ac => ac.criterion),
        filesInScope: story.filesInScope,
        testRequirements: story.testRequirements,
      }))
    );

    return {
      version: '1.0',
      schema: 'rad-engineer-tasks-v1',
      project: plan.execution_metadata.project,
      generatedAt: new Date().toISOString(),
      stories,
    };
  }

  /**
   * Convert execution plan to YAML string
   *
   * @param plan - Execution plan
   * @returns YAML string
   */
  toYaml(plan: ExecutionPlan): string {
    return yaml.dump(plan, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false,
    });
  }

  /**
   * Extract project name from requirements
   */
  private extractProjectName(requirements: StructuredRequirements): string {
    // Generate project name from core feature
    const feature = requirements.coreFeature
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return feature || 'untitled-project';
  }

  /**
   * Build waves from requirements and research
   */
  private buildWaves(
    requirements: StructuredRequirements,
    research: ResearchFindings
  ): Wave[] {
    const waves: Wave[] = [];
    const complexity = requirements.complexity;
    const storyCount = requirements.estimatedStories;

    // Wave structure based on complexity
    if (complexity === 'simple') {
      // Simple: 2 waves
      waves.push(
        this.createFoundationWave(0.1, storyCount),
        this.createFeatureWave(0.2, storyCount)
      );
    } else if (complexity === 'medium') {
      // Medium: 3 waves
      waves.push(
        this.createFoundationWave(0.1, storyCount),
        this.createFeatureWave(0.2, storyCount),
        this.createQAWave(0.3, storyCount)
      );
    } else {
      // Complex: 5 waves
      waves.push(
        this.createFoundationWave(0.1, storyCount),
        this.createFeatureWave(0.2, storyCount),
        this.createFeatureWave(0.3, storyCount),
        this.createQAWave(0.4, storyCount),
        this.createDocumentationWave(0.5, storyCount)
      );
    }

    return waves;
  }

  /**
   * Create foundation wave
   */
  private createFoundationWave(number: number, totalStories: number): Wave {
    const storyCount = Math.max(1, Math.floor(totalStories * 0.2));
    const stories = this.createStories(
      `wave-${number}`,
      storyCount,
      'foundation',
      0
    );

    return {
      id: `wave-${number}`,
      number,
      phase: 0,
      name: 'Foundation Setup',
      dependencies: [],
      estimatedMinutes: Math.max(30, storyCount * 30),
      parallelization: 'full',
      maxConcurrent: this.options.maxConcurrent ?? 2,
      stories,
    };
  }

  /**
   * Create feature wave
   */
  private createFeatureWave(number: number, totalStories: number): Wave {
    const storyCount = Math.max(1, Math.floor(totalStories * 0.5));
    const stories = this.createStories(
      `wave-${number}`,
      storyCount,
      'feature',
      number - 0.1
    );

    return {
      id: `wave-${number}`,
      number,
      phase: 1,
      name: 'Core Feature Implementation',
      dependencies: number > 0.1 ? [`wave-${number - 0.1}`] : [],
      estimatedMinutes: Math.max(60, storyCount * 45),
      parallelization: 'full',
      maxConcurrent: this.options.maxConcurrent ?? 2,
      stories,
    };
  }

  /**
   * Create QA wave
   */
  private createQAWave(number: number, totalStories: number): Wave {
    const storyCount = Math.max(1, Math.floor(totalStories * 0.2));
    const stories = this.createStories(
      `wave-${number}`,
      storyCount,
      'qa',
      number - 0.1
    );

    return {
      id: `wave-${number}`,
      number,
      phase: 2,
      name: 'Testing & QA',
      dependencies: [`wave-${number - 0.1}`],
      estimatedMinutes: Math.max(30, storyCount * 20),
      parallelization: 'partial',
      maxConcurrent: this.options.maxConcurrent ?? 2,
      stories,
    };
  }

  /**
   * Create documentation wave
   */
  private createDocumentationWave(number: number, totalStories: number): Wave {
    const storyCount = Math.max(1, Math.floor(totalStories * 0.1));
    const stories = this.createStories(
      `wave-${number}`,
      storyCount,
      'documentation',
      number - 0.1
    );

    return {
      id: `wave-${number}`,
      number,
      phase: 3,
      name: 'Documentation & Polish',
      dependencies: [`wave-${number - 0.1}`],
      estimatedMinutes: Math.max(30, storyCount * 30),
      parallelization: 'sequential',
      maxConcurrent: 1,
      stories,
    };
  }

  /**
   * Create stories for a wave
   */
  private createStories(
    waveId: string,
    count: number,
    type: 'foundation' | 'feature' | 'qa' | 'documentation',
    waveNumber: number
  ): Story[] {
    const stories: Story[] = [];
    const waveNum = Math.floor(waveNumber);
    const subWaveNum = Math.round((waveNumber % 1) * 10);

    for (let i = 0; i < count; i++) {
      const storyId = `STORY-${String(waveNum).padStart(3, '0')}-${subWaveNum}-${i + 1}`;
      const model = this.selectModel(type, i, count);

      stories.push({
        id: storyId,
        waveId,
        title: this.generateStoryTitle(type, i, count),
        description: this.generateStoryDescription(type, i, count),
        agentType: 'developer',
        model,
        estimatedMinutes: this.estimateStoryMinutes(type, model),
        dependencies: i === 0 && waveNumber > 0 ? [`wave-${waveNumber - 0.1}`] : [],
        parallelGroup: Math.floor(i / 2) + 1, // Group stories for parallel execution
        acceptanceCriteria: this.generateAcceptanceCriteria(type),
        filesInScope: this.generateFilesInScope(type),
        testRequirements: this.generateTestRequirements(type),
      });
    }

    return stories;
  }

  /**
   * Select model for story based on type and position
   */
  private selectModel(
    type: string,
    index: number,
    total: number
  ): 'haiku' | 'sonnet' | 'opus' {
    // First story and last story use higher quality model
    if (index === 0 || index === total - 1) {
      return 'sonnet';
    }

    // Middle stories can use haiku
    return 'haiku';
  }

  /**
   * Estimate story minutes based on type and model
   */
  private estimateStoryMinutes(
    type: string,
    model: 'haiku' | 'sonnet' | 'opus'
  ): number {
    const baseMinutes = {
      foundation: 30,
      feature: 45,
      qa: 20,
      documentation: 30,
    }[type] ?? 30;

    const modelMultiplier = {
      haiku: 0.8,
      sonnet: 1.0,
      opus: 1.2,
    }[model];

    return Math.round(baseMinutes * modelMultiplier);
  }

  /**
   * Generate story title
   */
  private generateStoryTitle(type: string, index: number, total: number): string {
    const titles = {
      foundation: [
        'Initialize project structure',
        'Configure build tools',
        'Set up testing framework',
      ],
      feature: [
        'Implement core feature',
        'Add input validation',
        'Create error handling',
        'Add logging',
        'Write unit tests',
      ],
      qa: [
        'Integration testing',
        'Edge case testing',
        'Performance testing',
      ],
      documentation: [
        'Write inline documentation',
        'Create API documentation',
        'Generate README',
      ],
    };

    const typeTitles = titles[type as keyof typeof titles] ?? titles.feature;
    return typeTitles[index % typeTitles.length];
  }

  /**
   * Generate story description
   */
  private generateStoryDescription(type: string, index: number, total: number): string {
    return `Story ${index + 1} of ${total}: ${this.generateStoryTitle(type, index, total)}`;
  }

  /**
   * Generate acceptance criteria
   */
  private generateAcceptanceCriteria(type: string): Array<{
    criterion: string;
    testable: boolean;
    priority: 'must' | 'should' | 'could';
  }> {
    return [
      {
        criterion: 'Implementation meets requirements',
        testable: true,
        priority: 'must',
      },
      {
        criterion: 'Tests pass with ≥80% coverage',
        testable: true,
        priority: 'must',
      },
      {
        criterion: 'TypeScript compilation successful',
        testable: true,
        priority: 'must',
      },
    ];
  }

  /**
   * Generate files in scope
   */
  private generateFilesInScope(type: string): string[] {
    const files = {
      foundation: ['package.json', 'tsconfig.json', 'test/setup.ts'],
      feature: ['src/**/*.ts', 'test/**/*.test.ts'],
      qa: ['test/integration/**/*.test.ts'],
      documentation: ['README.md', 'src/**/*.ts'],
    };

    return files[type as keyof typeof files] ?? files.feature;
  }

  /**
   * Generate test requirements
   */
  private generateTestRequirements(type: string): {
    unitTests: number;
    integrationTests: number;
    coverageTarget: number;
  } {
    const requirements = {
      foundation: { unitTests: 3, integrationTests: 0, coverageTarget: 80 },
      feature: { unitTests: 5, integrationTests: 1, coverageTarget: 80 },
      qa: { unitTests: 0, integrationTests: 3, coverageTarget: 80 },
      documentation: { unitTests: 0, integrationTests: 0, coverageTarget: 0 },
    };

    return requirements[type as keyof typeof requirements] ?? requirements.feature;
  }

  /**
   * Build integration tests from waves
   */
  private buildIntegrationTests(waves: Wave[]): Array<{
    waveId: string;
    tests: Array<{
      name: string;
      testFile: string;
    }>;
  }> {
    const tests: Array<{
      waveId: string;
      tests: Array<{
        name: string;
        testFile: string;
      }>;
    }> = [];

    for (const wave of waves) {
      if (wave.phase === 2) {
        // QA wave has integration tests
        tests.push({
          waveId: wave.id,
          tests: wave.stories.map(story => ({
            name: story.title,
            testFile: `test/integration/${story.id}.test.ts`,
          })),
        });
      }
    }

    return tests;
  }

  /**
   * Build quality gates
   */
  private buildQualityGates(): Array<{
    waveId: string;
    gates: Array<{
      name: string;
      command: string;
      mustPass: boolean;
      threshold?: string;
    }>;
  }> {
    return [
      {
        waveId: 'all',
        gates: [
          {
            name: 'TypeScript compilation',
            command: 'pnpm typecheck',
            mustPass: true,
          },
          {
            name: 'Lint',
            command: 'pnpm lint',
            mustPass: true,
          },
          {
            name: 'Tests',
            command: 'pnpm test',
            mustPass: true,
            threshold: '80%',
          },
        ],
      },
    ];
  }
}
