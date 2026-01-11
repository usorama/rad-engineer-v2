/**
 * Spec Generator Plugin Integration
 *
 * TypeScript wrapper for Auto-Claude's spec generator plugin.
 * Provides complexity assessment and spec generation capabilities.
 *
 * Features:
 * - Complexity assessment (simple/standard/complex)
 * - Dynamic phase selection (3/6/8 phases)
 * - Heuristic and AI-based assessment
 * - Integration with /plan skill
 *
 * Usage:
 * ```ts
 * const plugin = new SpecGeneratorPlugin({
 *   projectDir: "/path/to/project"
 * });
 *
 * const complexity = await plugin.assessComplexity({
 *   taskDescription: "Add user authentication",
 *   useAI: false
 * });
 *
 * const spec = await plugin.generateSpec({
 *   taskDescription: "Add user authentication",
 *   specDir: "/path/to/specs/001",
 *   complexity: "standard"
 * });
 * ```
 */

import { PythonPluginBridge } from "./PythonPluginBridge.js";
import type { PluginConfig, PluginResult } from "./PythonPluginBridge.js";
import { resolve, join } from "node:path";

/**
 * Complexity levels for spec generation
 */
export type ComplexityLevel = "simple" | "standard" | "complex";

/**
 * Complexity assessment input
 */
export interface ComplexityAssessmentInput {
  /** Task description to assess */
  taskDescription: string;
  /** Use AI-based assessment (requires API key) */
  useAI?: boolean;
}

/**
 * Complexity assessment result
 */
export interface ComplexityAssessment {
  /** Assessed complexity level */
  complexity: ComplexityLevel;
  /** Estimated number of files to modify */
  estimatedFiles: number;
  /** Whether external research is required */
  requiresResearch: boolean;
  /** Assessment reasoning */
  reasoning?: string;
}

/**
 * Spec generation input
 */
export interface SpecGenerationInput {
  /** Task description */
  taskDescription: string;
  /** Directory to write spec files */
  specDir: string;
  /** Override complexity (optional, auto-detected if not provided) */
  complexity?: ComplexityLevel;
  /** Model to use for agent phases */
  model?: string;
}

/**
 * Spec generation result
 */
export interface SpecGenerationResult {
  /** Detected or provided complexity */
  complexity: ComplexityLevel;
  /** List of phases that were executed */
  phasesRun: string[];
  /** Path to generated spec.md */
  specPath: string;
  /** Path to generated implementation_plan.json */
  planPath: string;
  /** Whether research phase was required */
  requiresResearch: boolean;
}

/**
 * Phase list input
 */
export interface PhaseListInput {
  /** Complexity level */
  complexity: ComplexityLevel;
  /** Whether research is required */
  requiresResearch?: boolean;
}

/**
 * Phase list result
 */
export interface PhaseListResult {
  /** List of phase names */
  phases: string[];
  /** Estimated duration in seconds */
  estimatedDuration: number;
  /** Number of phases */
  phaseCount: number;
}

/**
 * Configuration for SpecGeneratorPlugin
 */
export interface SpecGenPluginConfig extends Partial<PluginConfig> {
  /** Project directory */
  projectDir: string;
  /** Path to Python plugin (default: auto-detected) */
  pluginPath?: string;
}

/**
 * Spec Generator Plugin
 *
 * Wrapper around Auto-Claude's spec generator plugin.
 * Provides TypeScript interface for complexity assessment and spec generation.
 */
export class SpecGeneratorPlugin {
  private readonly bridge: PythonPluginBridge;
  private readonly projectDir: string;

  constructor(config: SpecGenPluginConfig) {
    this.projectDir = resolve(config.projectDir);

    // Auto-detect plugin path if not provided
    const pluginPath = config.pluginPath || this.getDefaultPluginPath();

    // Create bridge with extended timeout (spec generation can be slow)
    this.bridge = new PythonPluginBridge(pluginPath, {
      pythonPath: config.pythonPath || "python3",
      timeout: config.timeout || 120000, // 2 minutes default
      maxRetries: config.maxRetries ?? 2,
      cwd: config.cwd || process.cwd(),
      env: config.env || {},
    });
  }

  /**
   * Get default plugin path (relative to this file)
   */
  private getDefaultPluginPath(): string {
    // From src/python-bridge/ to python-plugins/
    const rootDir = resolve(__dirname, "../..");
    return join(rootDir, "python-plugins", "spec_generator.py");
  }

  /**
   * Assess complexity of a task
   *
   * @param input - Complexity assessment input
   * @returns Complexity assessment result
   */
  async assessComplexity(
    input: ComplexityAssessmentInput
  ): Promise<PluginResult<ComplexityAssessment>> {
    const result = await this.bridge.execute<
      {
        task_description: string;
        use_ai: boolean;
      },
      {
        complexity: string;
        estimated_files: number;
        requires_research: boolean;
        reasoning?: string;
      }
    >({
      action: "assess_complexity",
      data: {
        task_description: input.taskDescription,
        use_ai: input.useAI || false,
      },
    });

    // Transform snake_case from Python to camelCase for TypeScript
    if (result.success && result.output?.data) {
      const pythonData = result.output.data;
      const transformedData: ComplexityAssessment = {
        complexity: pythonData.complexity as ComplexityLevel,
        estimatedFiles: pythonData.estimated_files,
        requiresResearch: pythonData.requires_research,
        reasoning: pythonData.reasoning,
      };

      return {
        ...result,
        output: result.output ? {
          ...result.output,
          data: transformedData,
        } : null,
      };
    }

    return result as unknown as PluginResult<ComplexityAssessment>;
  }

  /**
   * Generate specification for a task
   *
   * This runs the full spec generation pipeline:
   * - SIMPLE: Discovery → Quick Spec → Validate (3 phases)
   * - STANDARD: Discovery → Requirements → Context → Spec → Plan → Validate (6 phases)
   * - COMPLEX: Full 8-phase pipeline with research and critique
   *
   * @param input - Spec generation input
   * @returns Spec generation result
   */
  async generateSpec(
    input: SpecGenerationInput
  ): Promise<PluginResult<SpecGenerationResult>> {
    const result = await this.bridge.execute<
      {
        task_description: string;
        project_dir: string;
        spec_dir: string;
        complexity?: ComplexityLevel;
        model?: string;
      },
      {
        complexity: string;
        phases_run: string[];
        spec_path: string;
        plan_path: string;
        requires_research: boolean;
      }
    >({
      action: "generate_spec",
      data: {
        task_description: input.taskDescription,
        project_dir: this.projectDir,
        spec_dir: input.specDir,
        complexity: input.complexity,
        model: input.model,
      },
    });

    // Transform snake_case from Python to camelCase for TypeScript
    if (result.success && result.output?.data) {
      const pythonData = result.output.data;
      const transformedData: SpecGenerationResult = {
        complexity: pythonData.complexity as ComplexityLevel,
        phasesRun: pythonData.phases_run,
        specPath: pythonData.spec_path,
        planPath: pythonData.plan_path,
        requiresResearch: pythonData.requires_research,
      };

      return {
        ...result,
        output: result.output ? {
          ...result.output,
          data: transformedData,
        } : null,
      };
    }

    return result as unknown as PluginResult<SpecGenerationResult>;
  }

  /**
   * Get list of phases for a given complexity
   *
   * @param input - Phase list input
   * @returns Phase list result
   */
  async getPhaseList(
    input: PhaseListInput
  ): Promise<PluginResult<PhaseListResult>> {
    const result = await this.bridge.execute<
      {
        complexity: ComplexityLevel;
        requires_research: boolean;
      },
      {
        phases: string[];
        estimated_duration: number;
        phase_count: number;
      }
    >({
      action: "get_phase_list",
      data: {
        complexity: input.complexity,
        requires_research: input.requiresResearch || false,
      },
    });

    // Transform snake_case from Python to camelCase for TypeScript
    if (result.success && result.output?.data) {
      const pythonData = result.output.data;
      const transformedData: PhaseListResult = {
        phases: pythonData.phases,
        estimatedDuration: pythonData.estimated_duration,
        phaseCount: pythonData.phase_count,
      };

      return {
        ...result,
        output: result.output ? {
          ...result.output,
          data: transformedData,
        } : null,
      };
    }

    return result as unknown as PluginResult<PhaseListResult>;
  }

  /**
   * Get bridge configuration
   */
  getConfig(): Readonly<Required<PluginConfig>> {
    return this.bridge.getConfig();
  }

  /**
   * Get project directory
   */
  getProjectDir(): string {
    return this.projectDir;
  }

  /**
   * Shutdown plugin bridge
   */
  async shutdown(): Promise<void> {
    await this.bridge.shutdown();
  }
}
