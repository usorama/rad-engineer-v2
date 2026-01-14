/**
 * ResumeDecisionEngine - Intelligent Resume Recommendations
 * Phase 3: Advanced Features
 *
 * Analyzes checkpoints and provides intelligent recommendations
 * for resuming execution after failures or interruptions.
 *
 * Responsibilities:
 * - Analyze checkpoint state and failure patterns
 * - Recommend resume, restart, skip, or abort actions
 * - Provide confidence scores for recommendations
 * - Suggest alternative approaches
 */

import type {
  StepCheckpoint,
  ResumeDecision,
  Step,
  StepError,
} from "./types/step.js";

/**
 * Error pattern classification
 */
interface ErrorPattern {
  /** Pattern name */
  name: string;
  /** Regex to match error messages */
  pattern: RegExp;
  /** Recommended action */
  action: ResumeDecision["action"];
  /** Base confidence for this pattern */
  confidence: number;
  /** Reason for recommendation */
  reason: string;
}

/**
 * ResumeDecisionEngine - Provides intelligent resume recommendations
 *
 * @example
 * ```ts
 * const engine = new ResumeDecisionEngine();
 * const checkpoint = await stateManager.loadStepCheckpoint("checkpoint-123");
 *
 * const decision = engine.analyzeCheckpoint(checkpoint);
 * console.log(decision.action); // "resume" | "restart" | "skip" | "abort"
 * console.log(decision.reason);
 * console.log(decision.confidence);
 * ```
 */
export class ResumeDecisionEngine {
  private readonly errorPatterns: ErrorPattern[] = [
    // Network/Transient errors - recommend resume
    {
      name: "network_error",
      pattern: /ECONNREFUSED|ECONNRESET|ETIMEDOUT|network/i,
      action: "resume",
      confidence: 0.9,
      reason: "Transient network error - resume from current step",
    },
    {
      name: "rate_limit",
      pattern: /rate.?limit|429|too.?many.?requests/i,
      action: "resume",
      confidence: 0.85,
      reason: "Rate limit hit - wait and resume from current step",
    },
    {
      name: "timeout",
      pattern: /timeout|timed.?out/i,
      action: "resume",
      confidence: 0.85,
      reason: "Operation timed out - resume with longer timeout",
    },

    // Code/Logic errors - recommend skip or restart
    {
      name: "type_error",
      pattern: /TypeError|type.?error|is.?not.?a.?function/i,
      action: "skip",
      confidence: 0.7,
      reason: "Type error suggests code issue - skip and continue or fix code",
    },
    {
      name: "reference_error",
      pattern: /ReferenceError|is.?not.?defined/i,
      action: "skip",
      confidence: 0.7,
      reason: "Reference error suggests missing dependency - skip or fix",
    },
    {
      name: "syntax_error",
      pattern: /SyntaxError|syntax.?error/i,
      action: "abort",
      confidence: 0.9,
      reason: "Syntax error requires code fix before resuming",
    },

    // Test failures - recommend resume with fixes
    {
      name: "test_failure",
      pattern: /test.?fail|assertion|expect|toEqual|toBe/i,
      action: "resume",
      confidence: 0.8,
      reason: "Test failure - resume after fixing the implementation",
    },

    // Build errors - recommend abort for fixes
    {
      name: "build_error",
      pattern: /build.?fail|compilation.?error|typecheck/i,
      action: "abort",
      confidence: 0.8,
      reason: "Build error requires fixes before resuming",
    },

    // Resource errors - recommend resume
    {
      name: "resource_exhausted",
      pattern: /ENOMEM|out.?of.?memory|heap|resource/i,
      action: "resume",
      confidence: 0.75,
      reason: "Resource exhaustion - wait for resources and resume",
    },

    // Permission errors - recommend abort
    {
      name: "permission_error",
      pattern: /EACCES|permission.?denied|unauthorized/i,
      action: "abort",
      confidence: 0.85,
      reason: "Permission error requires configuration fix",
    },
  ];

  /**
   * Analyze a checkpoint and recommend a resume action
   *
   * @param checkpoint - Checkpoint to analyze
   * @returns Resume decision with recommendation
   */
  analyzeCheckpoint(checkpoint: StepCheckpoint): ResumeDecision {
    const step = checkpoint.step;
    const alternatives: ResumeDecision["alternatives"] = [];

    // If step completed successfully, just resume from next step
    if (step.status === "completed") {
      return {
        action: "resume",
        reason: "Step completed successfully - resume from next step",
        fromStep: step.id,
        confidence: 0.95,
        alternatives: [
          {
            action: "restart",
            reason: "Start fresh from beginning of wave",
            confidence: 0.5,
          },
        ],
      };
    }

    // If step is still pending/executing, resume it
    if (step.status === "pending" || step.status === "executing") {
      return {
        action: "resume",
        reason: "Step was interrupted - resume execution",
        fromStep: step.id,
        confidence: 0.9,
        alternatives: [
          {
            action: "skip",
            reason: "Skip this step and continue",
            confidence: 0.6,
          },
          {
            action: "restart",
            reason: "Start fresh from beginning of wave",
            confidence: 0.4,
          },
        ],
      };
    }

    // If step failed, analyze the error
    if (step.status === "failed" && step.error) {
      return this.analyzeFailedStep(step, checkpoint);
    }

    // Default case - recommend resume with low confidence
    return {
      action: "resume",
      reason: "Unable to determine optimal action - attempting resume",
      fromStep: step.id,
      confidence: 0.5,
      alternatives: [
        {
          action: "restart",
          reason: "Start fresh from beginning",
          confidence: 0.5,
        },
        {
          action: "abort",
          reason: "Stop execution and investigate",
          confidence: 0.3,
        },
      ],
    };
  }

  /**
   * Analyze a failed step and recommend action
   */
  private analyzeFailedStep(
    step: Step,
    checkpoint: StepCheckpoint
  ): ResumeDecision {
    const error = step.error!;
    const alternatives: ResumeDecision["alternatives"] = [];

    // Check against known error patterns
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(error.message) || pattern.pattern.test(error.code)) {
        // Adjust confidence based on retry count
        let confidence = pattern.confidence;
        const attemptNumber = step.attemptNumber ?? 1;
        const maxAttempts = step.maxAttempts ?? 3;

        if (attemptNumber >= maxAttempts) {
          // Max retries reached - reduce confidence in resume
          confidence = Math.max(0.3, confidence - 0.3);
          if (pattern.action === "resume") {
            alternatives.push({
              action: "skip",
              reason: `Max retries (${maxAttempts}) reached - consider skipping`,
              confidence: 0.6,
            });
            alternatives.push({
              action: "abort",
              reason: "Max retries reached - manual intervention may be needed",
              confidence: 0.5,
            });
          }
        } else {
          // Add alternatives
          if (pattern.action === "resume") {
            alternatives.push({
              action: "skip",
              reason: "Skip if error persists after retry",
              confidence: 0.4,
            });
          }
          if (pattern.action !== "abort") {
            alternatives.push({
              action: "abort",
              reason: "Stop and investigate if issue continues",
              confidence: 0.3,
            });
          }
        }

        // Check for recoverable flag
        if (!error.recoverable && pattern.action === "resume") {
          confidence = Math.max(0.4, confidence - 0.2);
        }

        return {
          action: pattern.action,
          reason: pattern.reason,
          fromStep: step.id,
          skipSteps: pattern.action === "skip" ? [step.id] : undefined,
          confidence,
          alternatives,
        };
      }
    }

    // Unknown error pattern - analyze based on recoverability
    if (error.recoverable) {
      return {
        action: "resume",
        reason: "Error marked as recoverable - attempting resume",
        fromStep: step.id,
        confidence: 0.65,
        alternatives: [
          {
            action: "skip",
            reason: "Skip this step if resume fails",
            confidence: 0.5,
          },
          {
            action: "abort",
            reason: "Stop and investigate the error",
            confidence: 0.4,
          },
        ],
      };
    }

    // Non-recoverable unknown error
    return {
      action: "abort",
      reason: `Non-recoverable error: ${error.message}`,
      fromStep: step.id,
      confidence: 0.7,
      alternatives: [
        {
          action: "skip",
          reason: "Skip this step and continue execution",
          confidence: 0.4,
        },
        {
          action: "restart",
          reason: "Start fresh after fixing the issue",
          confidence: 0.3,
        },
      ],
    };
  }

  /**
   * Analyze multiple checkpoints to find the best resume point
   *
   * @param checkpoints - Available checkpoints (newest first)
   * @returns Best checkpoint to resume from with recommendation
   */
  findBestResumePoint(
    checkpoints: StepCheckpoint[]
  ): { checkpoint: StepCheckpoint; decision: ResumeDecision } | null {
    if (checkpoints.length === 0) {
      return null;
    }

    let bestCheckpoint: StepCheckpoint | null = null;
    let bestDecision: ResumeDecision | null = null;
    let bestScore = -1;

    for (const checkpoint of checkpoints) {
      const decision = this.analyzeCheckpoint(checkpoint);

      // Calculate score based on action and confidence
      let score = decision.confidence;

      // Prefer resume over skip over restart over abort
      switch (decision.action) {
        case "resume":
          score *= 1.0;
          break;
        case "skip":
          score *= 0.8;
          break;
        case "restart":
          score *= 0.6;
          break;
        case "abort":
          score *= 0.4;
          break;
      }

      // Prefer newer checkpoints slightly
      const checkpointAge =
        Date.now() - new Date(checkpoint.createdAt).getTime();
      const hoursSinceCheckpoint = checkpointAge / (1000 * 60 * 60);
      if (hoursSinceCheckpoint < 1) {
        score *= 1.1; // Bonus for recent checkpoints
      }

      if (score > bestScore) {
        bestScore = score;
        bestCheckpoint = checkpoint;
        bestDecision = decision;
      }
    }

    if (!bestCheckpoint || !bestDecision) {
      return null;
    }

    return {
      checkpoint: bestCheckpoint,
      decision: bestDecision,
    };
  }

  /**
   * Get a human-readable explanation of the decision
   */
  explainDecision(decision: ResumeDecision): string {
    const lines: string[] = [];

    lines.push(`**Recommended Action:** ${decision.action.toUpperCase()}`);
    lines.push(`**Confidence:** ${Math.round(decision.confidence * 100)}%`);
    lines.push(`**Reason:** ${decision.reason}`);

    if (decision.fromStep) {
      lines.push(`**Resume From:** ${decision.fromStep}`);
    }

    if (decision.skipSteps && decision.skipSteps.length > 0) {
      lines.push(`**Steps to Skip:** ${decision.skipSteps.join(", ")}`);
    }

    if (decision.alternatives.length > 0) {
      lines.push("");
      lines.push("**Alternative Actions:**");
      for (const alt of decision.alternatives) {
        lines.push(
          `- ${alt.action.toUpperCase()} (${Math.round(alt.confidence * 100)}%): ${alt.reason}`
        );
      }
    }

    return lines.join("\n");
  }
}
