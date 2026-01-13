/**
 * /plan Skill Integration Types
 *
 * Types for the /plan skill that generates execution plans
 * consumable by the /execute skill.
 */

/**
 * Core requirements gathered from user during intake phase
 */
export interface StructuredRequirements {
  /** Original user query */
  query: string;

  /** Main feature to build */
  coreFeature: string;

  /** Technology stack to use */
  techStack: string;

  /** Timeline constraint */
  timeline: 'asap' | 'this-week' | 'flexible' | string;

  /** Success criteria */
  successCriteria: string[];

  /** Explicitly excluded items (scope boundaries) */
  outOfScope: string[];

  /** Estimated complexity */
  complexity: 'simple' | 'medium' | 'complex';

  /** Rough story count estimate */
  estimatedStories: number;

  /** Timestamp when requirements were gathered */
  gatheredAt: string;
}

/**
 * Research findings from parallel research agents
 */
export interface ResearchFindings {
  /** Feasibility analysis from Agent 1 */
  feasibility: {
    feasible: boolean;
    approaches: Array<{
      name: string;
      pros: string[];
      cons: string[];
      confidence: number;
    }>;
    risks: Array<{
      risk: string;
      mitigation: string;
    }>;
    complexity: 'simple' | 'medium' | 'complex';
  };

  /** Codebase patterns from Agent 2 */
  codebasePatterns?: {
    similarFeatures: Array<{
      file: string;
      pattern: string;
      reusable: boolean;
    }>;
    conventions: {
      structure: string;
      naming: string;
      testing: string;
    };
    integrationPoints: Array<{
      location: string;
      type: string;
      requirements: string[];
    }>;
    existingDependencies: string[];
  };

  /** Best practices from Agent 3 */
  bestPractices?: {
    practices: Array<{
      practice: string;
      reason: string;
      source: string;
    }>;
    pitfalls: Array<{
      pitfall: string;
      consequence: string;
      avoidance: string;
    }>;
    securityConsiderations: Array<{
      risk: string;
      mitigation: string;
    }>;
  };

  /** All evidence sources */
  evidence: Array<{
    claim: string;
    source: string;
    confidence: number;
  }>;

  /** Research session timestamp */
  timestamp: string;
}

/**
 * Component specification
 */
export interface ComponentSpec {
  componentId: string;
  name: string;
  purpose: string;
  dependencies: string[];
  api: {
    inputs: Record<string, { type: string; required: boolean }>;
    outputs: Record<string, { type: string }>;
  };
  dataModels: Array<{
    name: string;
    fields: Record<string, { type: string; nullable: boolean }>;
  }>;
  evidence: string[];
}

/**
 * Integration specification
 */
export interface IntegrationSpec {
  integrationId: string;
  type: 'api' | 'database' | 'service' | 'ui';
  provider: string;
  contract: {
    endpoint?: string;
    method?: string;
    protocol: string;
  };
  requirements: string[];
  evidence: string[];
}

/**
 * Story acceptance criterion
 */
export interface AcceptanceCriterion {
  criterion: string;
  testable: boolean;
  priority: 'must' | 'should' | 'could';
}

/**
 * Story test requirements
 */
export interface TestRequirements {
  unitTests: number;
  integrationTests: number;
  coverageTarget: number;
}

/**
 * Story in execution plan
 */
export interface Story {
  id: string;
  waveId: string;
  phase: 0 | 1 | 2 | 3; // 0=foundation, 1=features, 2=qa, 3=polish
  title: string;
  description: string;
  agentType: 'planner' | 'test-writer' | 'developer' | 'code-reviewer' | 'debugger';
  model: 'haiku' | 'sonnet' | 'opus';
  estimatedMinutes: number;
  dependencies: string[];
  parallelGroup: number;
  acceptanceCriteria: AcceptanceCriterion[];
  filesInScope: string[];
  testRequirements: TestRequirements;
}

/**
 * Wave in execution plan
 */
export interface Wave {
  id: string;
  number: number;
  phase: 0 | 1 | 2 | 3; // 0=foundation, 1=features, 2=qa, 3=polish
  name: string;
  dependencies: string[];
  estimatedMinutes: number;
  parallelization: 'full' | 'partial' | 'sequential';
  maxConcurrent: number;
  stories: Story[];
}

/**
 * Integration test specification
 */
export interface IntegrationTestSpec {
  waveId: string;
  tests: Array<{
    name: string;
    testFile: string;
    description?: string;
  }>;
}

/**
 * Quality gate specification
 */
export interface QualityGateSpec {
  waveId: string;
  gates: Array<{
    name: string;
    command: string;
    mustPass: boolean;
    threshold?: string;
  }>;
}

/**
 * Execution plan metadata
 */
export interface ExecutionMetadata {
  version: string;
  schema: string;
  project: string;
  created: string;
  updated: string;
  source: string;
  researchSessionId: string;
}

/**
 * Complete execution plan
 */
export interface ExecutionPlan {
  execution_metadata: ExecutionMetadata;
  requirements: {
    query: string;
    core_feature: string;
    tech_stack: string;
    timeline: string;
    success_criteria: string[];
    out_of_scope: string[];
  };
  waves: Wave[];
  integration_tests: IntegrationTestSpec[];
  quality_gates: QualityGateSpec[];
  evidence?: Array<{
    claim: string;
    source: string;
    confidence: number;
  }>;
}

/**
 * Machine-readable tasks.json structure
 */
export interface TasksJson {
  version: string;
  schema: string;
  project: string;
  generatedAt: string;
  stories: Array<{
    id: string;
    waveId: string;
    phase: 0 | 1 | 2 | 3;
    title: string;
    status: 'pending' | 'in_progress' | 'complete' | 'blocked';
    model: 'haiku' | 'sonnet' | 'opus';
    estimatedMinutes: number;
    dependencies: string[];
    acceptanceCriteria: string[];
    filesInScope: string[];
    testRequirements: TestRequirements;
  }>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  passed: boolean;
  issues: Array<{
    severity: 'critical' | 'error' | 'warning' | 'info';
    message: string;
    location: string;
  }>;
  timestamp: string;
}

/**
 * Research agent task configuration
 */
export interface ResearchAgentTask {
  agentId: string;
  taskType: 'feasibility' | 'codebase' | 'best-practices';
  prompt: string;
  model?: 'haiku' | 'sonnet' | 'opus';
}

/**
 * Research agent result
 */
export interface ResearchAgentResult {
  agentId: string;
  taskType: string;
  success: boolean;
  data: unknown;
  error?: string;
  duration: number;
}
