/**
 * VACHook - Pre-commit verification hook for Verifiable Agentic Contracts
 *
 * Integrates with the git pre-commit hook system to ensure all agent
 * work is verified against contracts before being committed.
 *
 * Features:
 * - Automatic contract discovery
 * - Pre-commit verification
 * - Verification report generation
 * - Integration with CI/CD pipelines
 */

import type { AgentContract, ContractEvaluationResult } from "./AgentContract.js";
import type { ContractRegistry } from "./ContractRegistry.js";
import type { ExecutionContext, ExecutionState } from "./Condition.js";
import { ContractValidator, type ValidationResult } from "./ContractValidator.js";

/**
 * Verification status
 */
export type VerificationStatus = "PASSED" | "FAILED" | "SKIPPED" | "ERROR";

/**
 * Hook execution mode
 */
export type HookMode = "pre-commit" | "pre-push" | "ci" | "manual";

/**
 * Verification evidence
 */
export interface VerificationEvidence {
  /** Verification ID */
  id: string;
  /** Contract that was verified */
  contractId: string;
  /** Status */
  status: VerificationStatus;
  /** Contract evaluation result */
  evaluationResult?: ContractEvaluationResult;
  /** Validation result (if contract was validated) */
  validationResult?: ValidationResult;
  /** Files affected */
  filesAffected: string[];
  /** Verification timestamp */
  timestamp: Date;
  /** Duration in ms */
  durationMs: number;
  /** Error if status is ERROR */
  error?: string;
}

/**
 * Hook execution result
 */
export interface HookResult {
  /** Whether the hook passed (all verifications successful) */
  passed: boolean;
  /** Hook mode */
  mode: HookMode;
  /** Total verifications run */
  totalVerifications: number;
  /** Passed count */
  passedCount: number;
  /** Failed count */
  failedCount: number;
  /** Skipped count */
  skippedCount: number;
  /** Error count */
  errorCount: number;
  /** Individual verification evidences */
  evidences: VerificationEvidence[];
  /** Hook start time */
  startTime: Date;
  /** Hook end time */
  endTime: Date;
  /** Total duration in ms */
  totalDurationMs: number;
  /** Summary message */
  summary: string;
}

/**
 * Hook configuration
 */
export interface VACHookConfig {
  /** Hook mode */
  mode?: HookMode;
  /** Contract registry to use */
  registry?: ContractRegistry;
  /** Whether to validate contracts before evaluation */
  validateContracts?: boolean;
  /** Whether to skip on validation failure */
  skipOnValidationFailure?: boolean;
  /** Files to check (for filtering) */
  filesToCheck?: string[];
  /** Task type to filter contracts */
  taskType?: string;
  /** Custom execution context provider */
  contextProvider?: () => ExecutionContext | Promise<ExecutionContext>;
  /** Whether to generate detailed report */
  detailedReport?: boolean;
  /** Output format for report */
  outputFormat?: "text" | "json" | "markdown";
  /** Whether to block on failure */
  blockOnFailure?: boolean;
}

/**
 * Default execution context for hooks
 */
function createDefaultContext(
  taskId: string,
  files: string[]
): ExecutionContext {
  return {
    scopeId: "hook-scope",
    taskId,
    inputs: {
      files,
      mode: "pre-commit",
    },
    outputs: undefined,
    state: "VERIFYING" as ExecutionState,
    artifacts: new Map(),
    startTime: new Date(),
  };
}

/**
 * VACHook - Pre-commit verification hook
 *
 * @example
 * ```ts
 * // Create hook with registry
 * const hook = new VACHook({
 *   registry: contractRegistry,
 *   mode: "pre-commit",
 *   blockOnFailure: true,
 * });
 *
 * // Run verification
 * const result = await hook.run();
 *
 * if (!result.passed) {
 *   console.error("Verification failed:", result.summary);
 *   process.exit(1);
 * }
 *
 * // Or use as git hook
 * await hook.runAsGitHook();
 * ```
 */
export class VACHook {
  private config: VACHookConfig;
  private validator: ContractValidator;

  constructor(config: VACHookConfig = {}) {
    this.config = {
      mode: "pre-commit",
      validateContracts: true,
      skipOnValidationFailure: false,
      detailedReport: false,
      outputFormat: "text",
      blockOnFailure: true,
      ...config,
    };
    this.validator = new ContractValidator();
  }

  /**
   * Run the verification hook
   */
  async run(contracts?: AgentContract[]): Promise<HookResult> {
    const startTime = new Date();
    const evidences: VerificationEvidence[] = [];

    // Get contracts to verify
    const contractsToVerify = contracts || this.getContractsFromRegistry();

    if (contractsToVerify.length === 0) {
      return this.buildResult(startTime, evidences, "No contracts to verify");
    }

    // Get execution context
    const ctx = await this.getExecutionContext();

    // Verify each contract
    for (const contract of contractsToVerify) {
      const evidence = await this.verifyContract(contract, ctx);
      evidences.push(evidence);
    }

    return this.buildResult(startTime, evidences);
  }

  /**
   * Run as git hook (with exit code)
   */
  async runAsGitHook(): Promise<void> {
    const result = await this.run();

    // Print report
    console.log(this.formatReport(result));

    // Exit with appropriate code
    if (!result.passed && this.config.blockOnFailure) {
      process.exit(1);
    }
  }

  /**
   * Verify a single contract
   */
  async verifyContract(
    contract: AgentContract,
    ctx: ExecutionContext
  ): Promise<VerificationEvidence> {
    const startTime = performance.now();
    const evidenceId = `vac-${Date.now()}-${contract.id}`;

    try {
      // Optionally validate contract first
      let validationResult: ValidationResult | undefined;
      if (this.config.validateContracts) {
        validationResult = this.validator.validate(contract);

        if (!validationResult.valid && this.config.skipOnValidationFailure) {
          return {
            id: evidenceId,
            contractId: contract.id,
            status: "SKIPPED",
            validationResult,
            filesAffected: this.config.filesToCheck || [],
            timestamp: new Date(),
            durationMs: performance.now() - startTime,
            error: "Contract validation failed",
          };
        }
      }

      // Evaluate contract
      const evaluationResult = await contract.evaluateAll(ctx);

      return {
        id: evidenceId,
        contractId: contract.id,
        status: evaluationResult.success ? "PASSED" : "FAILED",
        evaluationResult,
        validationResult,
        filesAffected: this.config.filesToCheck || [],
        timestamp: new Date(),
        durationMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        id: evidenceId,
        contractId: contract.id,
        status: "ERROR",
        filesAffected: this.config.filesToCheck || [],
        timestamp: new Date(),
        durationMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get contracts from registry
   */
  private getContractsFromRegistry(): AgentContract[] {
    if (!this.config.registry) {
      return [];
    }

    return this.config.registry.getAll({
      includeDisabled: false,
    });
  }

  /**
   * Get execution context
   */
  private async getExecutionContext(): Promise<ExecutionContext> {
    if (this.config.contextProvider) {
      return this.config.contextProvider();
    }

    const taskId = `hook-${this.config.mode}-${Date.now()}`;
    const files = this.config.filesToCheck || [];

    return createDefaultContext(taskId, files);
  }

  /**
   * Build hook result
   */
  private buildResult(
    startTime: Date,
    evidences: VerificationEvidence[],
    customSummary?: string
  ): HookResult {
    const endTime = new Date();

    const passedCount = evidences.filter((e) => e.status === "PASSED").length;
    const failedCount = evidences.filter((e) => e.status === "FAILED").length;
    const skippedCount = evidences.filter((e) => e.status === "SKIPPED").length;
    const errorCount = evidences.filter((e) => e.status === "ERROR").length;

    const passed = failedCount === 0 && errorCount === 0;

    const summary =
      customSummary ||
      `${passed ? "✓" : "✗"} ${passedCount}/${evidences.length} contracts passed` +
        (failedCount > 0 ? `, ${failedCount} failed` : "") +
        (skippedCount > 0 ? `, ${skippedCount} skipped` : "") +
        (errorCount > 0 ? `, ${errorCount} errors` : "");

    return {
      passed,
      mode: this.config.mode || "manual",
      totalVerifications: evidences.length,
      passedCount,
      failedCount,
      skippedCount,
      errorCount,
      evidences,
      startTime,
      endTime,
      totalDurationMs: endTime.getTime() - startTime.getTime(),
      summary,
    };
  }

  /**
   * Format report based on output format
   */
  formatReport(result: HookResult): string {
    switch (this.config.outputFormat) {
      case "json":
        return JSON.stringify(result, null, 2);
      case "markdown":
        return this.formatMarkdownReport(result);
      default:
        return this.formatTextReport(result);
    }
  }

  /**
   * Format text report
   */
  private formatTextReport(result: HookResult): string {
    const lines: string[] = [
      "",
      "═══════════════════════════════════════════════════════════════",
      `  VAC VERIFICATION REPORT (${result.mode})`,
      "═══════════════════════════════════════════════════════════════",
      "",
      `Status: ${result.passed ? "PASSED ✓" : "FAILED ✗"}`,
      `Contracts verified: ${result.totalVerifications}`,
      `  - Passed:  ${result.passedCount}`,
      `  - Failed:  ${result.failedCount}`,
      `  - Skipped: ${result.skippedCount}`,
      `  - Errors:  ${result.errorCount}`,
      `Duration: ${result.totalDurationMs}ms`,
      "",
    ];

    if (this.config.detailedReport) {
      lines.push("───────────────────────────────────────────────────────────────");
      lines.push("  CONTRACT DETAILS");
      lines.push("───────────────────────────────────────────────────────────────");

      for (const evidence of result.evidences) {
        const icon = evidence.status === "PASSED" ? "✓" : evidence.status === "FAILED" ? "✗" : "○";
        lines.push(`  ${icon} ${evidence.contractId}: ${evidence.status}`);

        if (evidence.evaluationResult && !evidence.evaluationResult.success) {
          for (const failure of evidence.evaluationResult.failures) {
            lines.push(`      - ${failure.conditionName}: ${failure.errorMessage}`);
          }
        }

        if (evidence.error) {
          lines.push(`      Error: ${evidence.error}`);
        }
      }
      lines.push("");
    }

    if (!result.passed) {
      lines.push("───────────────────────────────────────────────────────────────");
      lines.push("  FAILURES");
      lines.push("───────────────────────────────────────────────────────────────");

      for (const evidence of result.evidences.filter(
        (e) => e.status === "FAILED" || e.status === "ERROR"
      )) {
        lines.push(`  Contract: ${evidence.contractId}`);

        if (evidence.evaluationResult) {
          for (const failure of evidence.evaluationResult.failures) {
            lines.push(`    - [${failure.type}] ${failure.conditionName}`);
            lines.push(`      ${failure.errorMessage}`);
          }
        }

        if (evidence.error) {
          lines.push(`    - Error: ${evidence.error}`);
        }

        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════════════════");
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Format markdown report
   */
  private formatMarkdownReport(result: HookResult): string {
    const lines: string[] = [
      "# VAC Verification Report",
      "",
      `**Mode**: ${result.mode}`,
      `**Status**: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`,
      `**Duration**: ${result.totalDurationMs}ms`,
      "",
      "## Summary",
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total | ${result.totalVerifications} |`,
      `| Passed | ${result.passedCount} |`,
      `| Failed | ${result.failedCount} |`,
      `| Skipped | ${result.skippedCount} |`,
      `| Errors | ${result.errorCount} |`,
      "",
    ];

    if (this.config.detailedReport || !result.passed) {
      lines.push("## Contract Details");
      lines.push("");
      lines.push("| Contract | Status | Details |");
      lines.push("|----------|--------|---------|");

      for (const evidence of result.evidences) {
        const status = {
          PASSED: "✅",
          FAILED: "❌",
          SKIPPED: "⏭️",
          ERROR: "⚠️",
        }[evidence.status];

        let details = "";
        if (evidence.evaluationResult && !evidence.evaluationResult.success) {
          details = evidence.evaluationResult.failures
            .map((f) => `${f.conditionName}: ${f.errorMessage}`)
            .join("<br>");
        }
        if (evidence.error) {
          details = `Error: ${evidence.error}`;
        }

        lines.push(`| ${evidence.contractId} | ${status} ${evidence.status} | ${details || "-"} |`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Create hook script content for git
   */
  static createGitHookScript(): string {
    return `#!/bin/bash
# VAC Pre-Commit Hook
# Generated by rad-engineer VACHook

# Run VAC verification
npx ts-node -e "
const { VACHook, getGlobalRegistry } = require('./src/verification');

const hook = new VACHook({
  registry: getGlobalRegistry(),
  mode: 'pre-commit',
  blockOnFailure: true,
  detailedReport: true,
});

hook.runAsGitHook();
"

exit_code=$?
exit $exit_code
`;
  }

  /**
   * Install hook in git repository
   */
  static async installGitHook(repoPath: string): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    const hookPath = path.join(repoPath, ".git", "hooks", "pre-commit");
    const hookContent = VACHook.createGitHookScript();

    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
  }
}

/**
 * Quick verification function
 */
export async function verifyWithVAC(
  contracts: AgentContract[],
  ctx?: ExecutionContext
): Promise<HookResult> {
  const hook = new VACHook({
    mode: "manual",
    blockOnFailure: false,
  });

  if (ctx) {
    return hook.run(contracts);
  }

  return hook.run(contracts);
}
