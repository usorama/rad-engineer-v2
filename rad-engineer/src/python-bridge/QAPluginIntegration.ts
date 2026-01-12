/**
 * QAPluginIntegration - TypeScript wrapper for rad-engineer QA Loop plugin
 *
 * Provides post-execution QA validation using the ported qa_loop.py plugin.
 *
 * Features:
 * - Quality gate execution (typecheck, lint, test, code quality)
 * - Recurring issue detection (3+ occurrences → escalation)
 * - Integration with TaskAPIHandler for post-execution validation
 * - TypeScript type safety for plugin inputs/outputs
 *
 * Quality Gates:
 * 1. TypeCheck (required) - pnpm typecheck must show 0 errors
 * 2. Lint (warning) - pnpm lint should pass
 * 3. Test (required) - bun test must pass
 * 4. Code Quality (warning) - TODO/FIXME, console.log, any types
 *
 * Recurring Issue Detection:
 * - Tracks issue history across iterations
 * - Detects similar issues (≥80% similarity)
 * - Escalates if issue appears 3+ times
 */

import { PythonPluginBridge } from "./PythonPluginBridge.js";
import type { PluginInput, PluginResult } from "./PythonPluginBridge.js";
import { resolve } from "node:path";

/**
 * QA issue severity
 */
export type QAIssueSeverity = "error" | "warning";

/**
 * QA issue type
 */
export type QAIssueType = "typecheck" | "lint" | "test" | "quality";

/**
 * QA issue
 */
export interface QAIssue {
  /** Issue type */
  type: QAIssueType;
  /** Issue severity */
  severity: QAIssueSeverity;
  /** Issue title */
  title: string;
  /** Detailed description */
  description: string;
  /** File path (if applicable) */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
  /** Occurrence count (for recurring issues) */
  occurrence_count?: number;
}

/**
 * Quality gate result
 */
export interface QualityGateResult {
  /** Whether gate passed */
  passed: boolean;
  /** Gate output */
  output: string;
}

/**
 * QA validation status
 */
export type QAValidationStatus = "approved" | "rejected" | "error" | "recurring_detected" | "no_recurring";

/**
 * QA validation input
 */
export interface QAValidationInput {
  /** Project directory path */
  project_dir: string;
  /** List of modified files (relative paths) */
  files_modified: string[];
  /** Task description */
  task_description?: string;
  /** Iteration history for recurring issue detection */
  iteration_history?: QAIterationRecord[];
}

/**
 * QA iteration record
 */
export interface QAIterationRecord {
  /** Iteration number */
  iteration: number;
  /** Iteration status */
  status: "approved" | "rejected" | "error";
  /** Timestamp */
  timestamp: string;
  /** Issues found in this iteration */
  issues: QAIssue[];
  /** Duration in seconds */
  duration_seconds?: number;
}

/**
 * QA validation result
 */
export interface QAValidationResult {
  /** Validation status */
  status: QAValidationStatus;
  /** All issues found */
  issues: QAIssue[];
  /** Recurring issues (if any) */
  recurring_issues: QAIssue[];
  /** Summary message */
  summary: string;
  /** Quality gate results */
  quality_gates?: {
    typecheck: QualityGateResult;
    lint: QualityGateResult;
    test: QualityGateResult;
  };
}

/**
 * Recurring issue check input
 */
export interface RecurringIssueCheckInput {
  /** Current issues */
  current_issues: QAIssue[];
  /** Iteration history */
  iteration_history: QAIterationRecord[];
}

/**
 * QAPluginIntegration - Wrapper for Python QA loop plugin
 *
 * @example
 * ```ts
 * const qa = new QAPluginIntegration();
 *
 * // Validate task execution
 * const result = await qa.validateTask({
 *   project_dir: "/path/to/project",
 *   files_modified: ["src/feature.ts", "test/feature.test.ts"],
 *   task_description: "Implement feature X",
 *   iteration_history: [],
 * });
 *
 * if (result.status === "approved") {
 *   console.log("QA validation passed!");
 * } else {
 *   console.error("QA validation failed:", result.summary);
 *   console.error("Issues:", result.issues);
 * }
 *
 * // Check for recurring issues
 * const recurring = await qa.checkRecurringIssues({
 *   current_issues: result.issues,
 *   iteration_history: [...],
 * });
 * ```
 */
export class QAPluginIntegration {
  private readonly bridge: PythonPluginBridge;

  constructor(pluginPath?: string, timeout: number = 180000) {
    // Default to qa_loop.py in python-plugins directory
    const defaultPath = resolve(
      process.cwd(),
      "python-plugins",
      "qa_loop.py"
    );
    const path = pluginPath || defaultPath;

    this.bridge = new PythonPluginBridge(path, {
      timeout, // 3 minutes default (quality gates can be slow)
      maxRetries: 2,
    });
  }

  /**
   * Validate task execution with full quality gates
   *
   * Runs:
   * 1. TypeScript type checking
   * 2. Linting
   * 3. Tests
   * 4. Code quality analysis
   * 5. Recurring issue detection
   *
   * @param input - Validation input
   * @returns Validation result
   */
  async validateTask(
    input: QAValidationInput
  ): Promise<QAValidationResult | null> {
    const pluginInput: PluginInput<QAValidationInput> = {
      action: "validate",
      data: input,
    };

    const result: PluginResult<QAValidationResult> = await this.bridge.execute(
      pluginInput
    );

    if (!result.success || !result.output) {
      throw new Error(`QA validation failed: ${result.error || "Unknown error"}`);
    }

    if (!result.output.success || !result.output.data) {
      throw new Error(`QA plugin error: ${result.output.error || "Unknown error"}`);
    }

    return result.output.data;
  }

  /**
   * Check for recurring issues only (no quality gates)
   *
   * Useful for detecting patterns across iterations without
   * re-running expensive quality gates.
   *
   * @param input - Recurring issue check input
   * @returns Validation result with recurring issues
   */
  async checkRecurringIssues(
    input: RecurringIssueCheckInput
  ): Promise<QAValidationResult | null> {
    const pluginInput: PluginInput<RecurringIssueCheckInput> = {
      action: "check_recurring",
      data: input,
    };

    const result: PluginResult<QAValidationResult> = await this.bridge.execute(
      pluginInput
    );

    if (!result.success || !result.output) {
      throw new Error(`Recurring issue check failed: ${result.error || "Unknown error"}`);
    }

    if (!result.output.success || !result.output.data) {
      throw new Error(`QA plugin error: ${result.output.error || "Unknown error"}`);
    }

    return result.output.data;
  }

  /**
   * Get plugin health status
   */
  getHealth() {
    return this.bridge.getHealth();
  }

  /**
   * Shutdown plugin
   */
  async shutdown(): Promise<void> {
    await this.bridge.shutdown();
  }
}
