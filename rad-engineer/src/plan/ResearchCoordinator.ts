/**
 * Research Coordinator
 *
 * Manages parallel research agents for the /plan skill:
 * - Spawns 2-3 parallel research agents (enforced by ResourceManager)
 * - Collects and consolidates research findings
 * - Maintains evidence traceability
 */

import type {
  ResearchFindings,
  ResearchAgentTask,
  ResearchAgentResult,
  StructuredRequirements,
} from './types.js';
import { ResourceManager } from '../core/ResourceManager.js';

/**
 * Research coordinator options
 */
export interface ResearchCoordinatorOptions {
  maxConcurrent?: number; // Default: 3 (enforced by ResourceManager)
  resourceManager?: ResourceManager;
}

/**
 * Research coordinator for /plan skill
 *
 * Manages parallel research agents while respecting
 * ResourceManager limits (max 2-3 concurrent).
 */
export class ResearchCoordinator {
  private options: ResearchCoordinatorOptions;
  private resourceManager: ResourceManager;

  constructor(options: ResearchCoordinatorOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 3,
      resourceManager: options.resourceManager,
    };
    this.resourceManager =
      options.resourceManager ?? new ResourceManager({ maxConcurrent: 3 });
  }

  /**
   * Execute research phase with parallel agents
   *
   * @param requirements - Structured requirements from intake phase
   * @param spawnAgentFn - Function to spawn research agents (Task tool in skill)
   * @returns Consolidated research findings
   */
  async executeResearch(
    requirements: StructuredRequirements,
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<ResearchFindings> {
    // Calculate agent count based on complexity
    const agentCount = this.calculateAgentCount(requirements.complexity);

    // Check resource availability
    const resourceCheck = await this.resourceManager.checkResources();
    if (!resourceCheck.canSpawnAgent) {
      throw new Error(
        `Cannot spawn research agents: ${resourceCheck.violations.join(', ')}`
      );
    }

    // Generate research tasks
    const tasks = this.generateResearchTasks(requirements, agentCount);

    // Register agents with ResourceManager
    for (const task of tasks) {
      this.resourceManager.registerAgent(task.agentId);
    }

    try {
      // Execute agents in parallel (respecting maxConcurrent limit)
      const results = await this.executeAgents(tasks, spawnAgentFn);

      // Consolidate findings
      const findings = this.consolidateFindings(results);

      return findings;
    } finally {
      // Unregister all agents
      for (const task of tasks) {
        this.resourceManager.unregisterAgent(task.agentId);
      }
    }
  }

  /**
   * Calculate agent count based on complexity
   */
  private calculateAgentCount(
    complexity: 'simple' | 'medium' | 'complex'
  ): number {
    switch (complexity) {
      case 'simple':
        return 2; // Feasibility + Codebase
      case 'medium':
        return 2; // Feasibility + Codebase
      case 'complex':
        return 3; // Feasibility + Codebase + Best Practices
    }
  }

  /**
   * Generate research task configurations
   */
  private generateResearchTasks(
    requirements: StructuredRequirements,
    agentCount: number
  ): ResearchAgentTask[] {
    const tasks: ResearchAgentTask[] = [];

    // Agent 1: Technical Feasibility (always)
    tasks.push({
      agentId: `research-feasibility-${Date.now()}`,
      taskType: 'feasibility',
      prompt: this.buildFeasibilityPrompt(requirements),
      model: requirements.complexity === 'complex' ? 'sonnet' : 'haiku',
    });

    // Agent 2: Codebase Patterns (always, unless new project)
    if (agentCount >= 2) {
      tasks.push({
        agentId: `research-codebase-${Date.now()}`,
        taskType: 'codebase',
        prompt: this.buildCodebasePrompt(requirements),
        model: 'haiku',
      });
    }

    // Agent 3: Best Practices (complex features only)
    if (agentCount >= 3) {
      tasks.push({
        agentId: `research-practices-${Date.now()}`,
        taskType: 'best-practices',
        prompt: this.buildPracticesPrompt(requirements),
        model: 'sonnet',
      });
    }

    return tasks;
  }

  /**
   * Build prompt for feasibility research agent
   */
  private buildFeasibilityPrompt(requirements: StructuredRequirements): string {
    return `Research technical approaches for: ${requirements.coreFeature}

Requirements to investigate:
- Tech stack: ${requirements.techStack}
- Timeline: ${requirements.timeline}
- Success criteria: ${requirements.successCriteria.join(', ')}

Research focus:
1. Technical feasibility (can this be built?)
2. Recommended approaches (2-3 options with pros/cons)
3. Potential blockers or risks
4. Estimated complexity (simple/medium/complex)

Output: JSON
{
  "feasible": boolean,
  "approaches": [{"name": string, "pros": string[], "cons": string[], "confidence": number}],
  "risks": [{"risk": string, "mitigation": string}],
  "complexity": "simple" | "medium" | "complex",
  "evidence": [{"claim": string, "source": string, "confidence": number}]
}

Rules: Grep-first, LSP for navigation, JSON output, max 5000 tokens`;
  }

  /**
   * Build prompt for codebase patterns research agent
   */
  private buildCodebasePrompt(requirements: StructuredRequirements): string {
    return `Analyze existing codebase patterns for: ${requirements.coreFeature}

Glob/Grep to find:
1. Similar existing features (pattern matching)
2. Codebase conventions (file structure, naming)
3. Integration points (where to connect)
4. Dependencies (what already exists)

Output: JSON
{
  "similarFeatures": [{"file": string, "pattern": string, "reusable": boolean}],
  "conventions": {"structure": string, "naming": string, "testing": string},
  "integrationPoints": [{"location": string, "type": string, "requirements": string[]}],
  "existingDependencies": string[],
  "evidence": [{"claim": string, "source": string, "confidence": number}]
}

Rules: Grep-first, LSP for navigation, JSON output, max 5000 tokens`;
  }

  /**
   * Build prompt for best practices research agent
   */
  private buildPracticesPrompt(requirements: StructuredRequirements): string {
    return `Research best practices for: ${requirements.coreFeature}

Focus on:
1. Library documentation (if using specific libraries)
2. Framework best practices
3. Common pitfalls and anti-patterns
4. Security considerations

Output: JSON
{
  "bestPractices": [{"practice": string, "reason": string, "source": string}],
  "pitfalls": [{"pitfall": string, "consequence": string, "avoidance": string}],
  "securityConsiderations": [{"risk": string, "mitigation": string}],
  "evidence": [{"claim": string, "source": string, "confidence": number}]
}

Rules: Use context7 for docs, web search for current patterns, JSON output, max 5000 tokens`;
  }

  /**
   * Execute agents in parallel (respecting maxConcurrent)
   */
  private async executeAgents(
    tasks: ResearchAgentTask[],
    spawnAgentFn: (task: ResearchAgentTask) => Promise<ResearchAgentResult>
  ): Promise<ResearchAgentResult[]> {
    // Execute in parallel ( ResourceManager already enforced limits)
    const promises = tasks.map(task => spawnAgentFn(task));
    return Promise.all(promises);
  }

  /**
   * Consolidate findings from all research agents
   */
  private consolidateFindings(results: ResearchAgentResult[]): ResearchFindings {
    const findings: ResearchFindings = {
      feasibility: {
        feasible: true,
        approaches: [],
        risks: [],
        complexity: 'medium',
      },
      evidence: [],
      timestamp: new Date().toISOString(),
    };

    for (const result of results) {
      if (!result.success) {
        console.error(`Research agent ${result.agentId} failed: ${result.error}`);
        continue;
      }

      // Parse result data based on task type
      const data = result.data as any;

      if (result.taskType === 'feasibility') {
        findings.feasibility = {
          feasible: data.feasible ?? true,
          approaches: data.approaches ?? [],
          risks: data.risks ?? [],
          complexity: data.complexity ?? 'medium',
        };
      }

      if (result.taskType === 'codebase') {
        findings.codebasePatterns = {
          similarFeatures: data.similarFeatures ?? [],
          conventions: data.conventions ?? {
            structure: '',
            naming: '',
            testing: '',
          },
          integrationPoints: data.integrationPoints ?? [],
          existingDependencies: data.existingDependencies ?? [],
        };
      }

      if (result.taskType === 'best-practices') {
        findings.bestPractices = {
          practices: data.bestPractices ?? [],
          pitfalls: data.pitfalls ?? [],
          securityConsiderations: data.securityConsiderations ?? [],
        };
      }

      // Collect evidence
      if (data.evidence && Array.isArray(data.evidence)) {
        findings.evidence.push(...data.evidence);
      }
    }

    return findings;
  }
}
