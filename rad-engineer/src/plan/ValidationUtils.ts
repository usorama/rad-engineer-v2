/**
 * Validation Utilities
 *
 * Validates execution plans for:
 * - Evidence alignment
 * - Completeness
 * - Dependency validation
 * - Parseability
 */

import type {
  ExecutionPlan,
  ValidationResult,
  Wave,
  Story,
} from './types.js';

/**
 * Validation utilities for /plan skill
 *
 * Ensures execution plans are valid and consumable by /execute skill.
 */
export class ValidationUtils {
  /**
   * Validate complete execution plan
   *
   * @param plan - Execution plan to validate
   * @returns Validation result with issues
   */
  validateExecutionPlan(plan: ExecutionPlan): ValidationResult {
    const issues: ValidationResult['issues'] = [];

    // Run all validation checks
    const completeness = this.validateCompleteness(plan);
    const evidence = this.validateEvidenceAlignment(plan);
    const dependencies = this.validateDependencies(plan);
    const parseability = this.validateParseability(plan);

    issues.push(...completeness.issues);
    issues.push(...evidence.issues);
    issues.push(...dependencies.issues);
    issues.push(...parseability.issues);

    // Sort by severity
    issues.sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate evidence alignment
   *
   * All claims must have verified evidence sources
   */
  validateEvidenceAlignment(plan: ExecutionPlan): ValidationResult {
    const issues: ValidationResult['issues'] = [];
    const evidence = plan.evidence ?? [];

    // Check for unverified claims in requirements
    const claims = this.extractClaims(plan);

    for (const claim of claims) {
      const hasEvidence = evidence.some(ev => ev.claim === claim);
      if (!hasEvidence) {
        issues.push({
          severity: 'warning',
          message: `Claim "${claim}" has no evidence source`,
          location: 'requirements',
        });
      }
    }

    // Check evidence confidence scores
    for (const ev of evidence) {
      if (ev.confidence < 0.5) {
        issues.push({
          severity: 'warning',
          message: `Low confidence evidence for "${ev.claim}": ${ev.confidence}`,
          location: 'evidence',
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate completeness
   *
   * All required fields must be present
   */
  validateCompleteness(plan: ExecutionPlan): ValidationResult {
    const issues: ValidationResult['issues'] = [];
    const requiredFields = [
      'execution_metadata',
      'requirements',
      'waves',
      'quality_gates',
    ];

    for (const field of requiredFields) {
      if (!plan[field as keyof ExecutionPlan]) {
        issues.push({
          severity: 'error',
          message: `Missing required field: ${field}`,
          location: field,
        });
      }
    }

    // Validate execution_metadata
    if (plan.execution_metadata) {
      const metaRequired = ['version', 'schema', 'project', 'created', 'updated'];
      for (const field of metaRequired) {
        if (!plan.execution_metadata[field as keyof typeof plan.execution_metadata]) {
          issues.push({
            severity: 'error',
            message: `Missing required metadata field: ${field}`,
            location: 'execution_metadata',
          });
        }
      }
    }

    // Validate waves
    if (plan.waves && plan.waves.length === 0) {
      issues.push({
        severity: 'error',
        message: 'At least one wave is required',
        location: 'waves',
      });
    }

    // Validate each wave
    for (let i = 0; i < (plan.waves?.length ?? 0); i++) {
      const wave = plan.waves![i];
      const waveIssues = this.validateWave(wave, i);
      issues.push(...waveIssues);
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate single wave
   */
  private validateWave(wave: Wave, index: number): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = [];
    const prefix = `waves[${index}]`;

    const requiredFields = ['id', 'number', 'phase', 'name', 'stories'];
    for (const field of requiredFields) {
      if (wave[field as keyof Wave] === undefined) {
        issues.push({
          severity: 'error',
          message: `Missing required field: ${field}`,
          location: `${prefix}.${field}`,
        });
      }
    }

    // Validate stories
    if (wave.stories && wave.stories.length === 0) {
      issues.push({
        severity: 'error',
        message: `Wave ${wave.id} must have at least one story`,
        location: `${prefix}.stories`,
      });
    }

    // Validate each story
    for (let i = 0; i < (wave.stories?.length ?? 0); i++) {
      const story = wave.stories![i];
      const storyIssues = this.validateStory(story, index, i);
      issues.push(...storyIssues);
    }

    // Validate maxConcurrent
    if (wave.maxConcurrent && (wave.maxConcurrent < 1 || wave.maxConcurrent > 3)) {
      issues.push({
        severity: 'error',
        message: `maxConcurrent must be 1-3, got ${wave.maxConcurrent}`,
        location: `${prefix}.maxConcurrent`,
      });
    }

    return issues;
  }

  /**
   * Validate single story
   */
  private validateStory(
    story: Story,
    waveIndex: number,
    storyIndex: number
  ): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = [];
    const prefix = `waves[${waveIndex}].stories[${storyIndex}]`;

    const requiredFields = [
      'id',
      'waveId',
      'phase',
      'title',
      'agentType',
      'model',
      'estimatedMinutes',
      'acceptanceCriteria',
      'filesInScope',
      'testRequirements',
    ];
    for (const field of requiredFields) {
      if (story[field as keyof Story] === undefined) {
        issues.push({
          severity: 'error',
          message: `Missing required field: ${field}`,
          location: `${prefix}.${field}`,
        });
      }
    }

    // Validate model
    if (story.model && !['haiku', 'sonnet', 'opus'].includes(story.model)) {
      issues.push({
        severity: 'error',
        message: `Invalid model: ${story.model}`,
        location: `${prefix}.model`,
      });
    }

    // Validate agentType
    const validAgentTypes = [
      'planner',
      'test-writer',
      'developer',
      'code-reviewer',
      'debugger',
    ];
    if (story.agentType && !validAgentTypes.includes(story.agentType)) {
      issues.push({
        severity: 'error',
        message: `Invalid agentType: ${story.agentType}`,
        location: `${prefix}.agentType`,
      });
    }

    // Validate acceptance criteria
    if (story.acceptanceCriteria && story.acceptanceCriteria.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No acceptance criteria defined',
        location: `${prefix}.acceptanceCriteria`,
      });
    }

    return issues;
  }

  /**
   * Validate dependencies
   *
   * No circular dependencies allowed
   */
  validateDependencies(plan: ExecutionPlan): ValidationResult {
    const issues: ValidationResult['issues'] = [];
    const waves = plan.waves ?? [];

    // Build dependency graph
    const graph = this.buildDependencyGraph(waves);
    const cycles = this.detectCycles(graph);

    for (const cycle of cycles) {
      issues.push({
        severity: 'error',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        location: 'waves',
      });
    }

    // Validate wave dependencies exist
    const waveIds = new Set(waves.map(w => w.id));
    for (const wave of waves) {
      for (const dep of wave.dependencies ?? []) {
        if (!waveIds.has(dep)) {
          issues.push({
            severity: 'error',
            message: `Wave ${wave.id} depends on non-existent wave ${dep}`,
            location: `waves[${wave.id}].dependencies`,
          });
        }
      }
    }

    // Validate story dependencies exist (can be story IDs or wave IDs)
    for (const wave of waves) {
      const storyIds = new Set(wave.stories.map(s => s.id));
      for (const story of wave.stories) {
        for (const dep of story.dependencies ?? []) {
          // Dependency can be either a story ID or a wave ID
          const isValidStoryDep = storyIds.has(dep);
          const isValidWaveDep = waveIds.has(dep);

          if (!isValidStoryDep && !isValidWaveDep) {
            issues.push({
              severity: 'error',
              message: `Story ${story.id} depends on non-existent story ${dep}`,
              location: `stories[${story.id}].dependencies`,
            });
          }
        }
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate parseability
   *
   * /execute skill MUST be able to parse this plan
   */
  validateParseability(plan: ExecutionPlan): ValidationResult {
    const issues: ValidationResult['issues'] = [];

    try {
      // Simulate /execute parsing
      const parsed = this.simulateParse(plan);

      // Check wave structure
      if (!parsed.waves || parsed.waves.length === 0) {
        issues.push({
          severity: 'error',
          message: 'No waves found in plan',
          location: 'waves',
        });
      }

      // Check quality gates
      if (!parsed.quality_gates || parsed.quality_gates.length === 0) {
        issues.push({
          severity: 'error',
          message: 'No quality gates defined',
          location: 'quality_gates',
        });
      }

      // Verify YAML can be serialized
      const yaml = require('js-yaml');
      yaml.dump(plan);

      if (issues.length === 0) {
        return {
          passed: true,
          issues: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      issues.push({
        severity: 'critical',
        message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        location: 'GRANULAR_EXECUTION_PLAN.md',
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error' || i.severity === 'critical').length === 0,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract claims from plan that need evidence
   */
  private extractClaims(plan: ExecutionPlan): string[] {
    const claims: string[] = [];

    // Extract from requirements
    if (plan.requirements) {
      claims.push(plan.requirements.core_feature);
      claims.push(plan.requirements.tech_stack);
    }

    // Extract from wave names and descriptions
    for (const wave of plan.waves ?? []) {
      claims.push(wave.name);
      for (const story of wave.stories ?? []) {
        claims.push(story.title);
        claims.push(story.description);
      }
    }

    return claims;
  }

  /**
   * Build dependency graph from waves
   */
  private buildDependencyGraph(waves: Wave[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const wave of waves) {
      graph.set(wave.id, wave.dependencies ?? []);
    }

    return graph;
  }

  /**
   * Detect cycles in dependency graph using DFS
   */
  private detectCycles(graph: Map<string, string[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (path.includes(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      path.push(node);

      const dependencies = graph.get(node) ?? [];
      for (const dep of dependencies) {
        if (graph.has(dep) && dfs(dep)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    for (const node of Array.from(graph.keys())) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Simulate /execute skill parsing
   */
  private simulateParse(plan: ExecutionPlan): Partial<ExecutionPlan> {
    // This simulates what /execute does when parsing the plan
    return {
      waves: plan.waves?.map(wave => ({
        ...wave,
        stories: wave.stories.map(story => ({
          ...story,
          // Parse acceptance criteria
          acceptanceCriteria: story.acceptanceCriteria.map(ac =>
            typeof ac === 'string' ? { criterion: ac, testable: true, priority: 'must' as const } : ac
          ),
        })),
      })),
      quality_gates: plan.quality_gates,
    };
  }

  /**
   * Generate validation summary markdown
   *
   * @param result - Validation result
   * @returns Markdown summary
   */
  generateValidationSummary(result: ValidationResult): string {
    const lines: string[] = ['# Validation Summary', ''];
    const status = result.passed ? 'PASS ✓' : 'FAIL ✗';
    lines.push(`## Overall Result: ${status}`, '');

    // Group issues by severity
    const errors = result.issues.filter(i => i.severity === 'error' || i.severity === 'critical');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const infos = result.issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      lines.push('## Errors');
      lines.push(`Found ${errors.length} error(s)`, '');
      for (const error of errors) {
        lines.push(`- **[${error.location}]** ${error.message}`);
      }
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('## Warnings');
      lines.push(`Found ${warnings.length} warning(s)`, '');
      for (const warning of warnings) {
        lines.push(`- **[${warning.location}]** ${warning.message}`);
      }
      lines.push('');
    }

    if (infos.length > 0) {
      lines.push('## Info');
      lines.push(`Found ${infos.length} info item(s)`, '');
      for (const info of infos) {
        lines.push(`- **[${info.location}]** ${info.message}`);
      }
      lines.push('');
    }

    if (result.passed) {
      lines.push('## Next Steps');
      lines.push('Plan is ready for execution. Run /execute skill to begin implementation.');
    } else {
      lines.push('## Next Steps');
      lines.push('Please fix the errors above and re-run validation.');
    }

    return lines.join('\n');
  }
}
