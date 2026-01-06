/**
 * PromptValidator - Core Orchestrator Component
 * Phase 1: Deterministic execution foundation
 *
 * Validates and sanitizes agent prompts before execution to ensure:
 * - Size constraints (≤500 characters, ≤125 tokens)
 * - Required structure (task, files, output, rules)
 * - Security (no prompt injection, no forbidden content)
 * - Proper format (JSON output structure)
 *
 * Evidence-Backed Thresholds (from research-findings.md):
 * - CLAIM-001: Max 500 characters total
 * - CLAIM-002: Max 200 characters for task
 * - CLAIM-003: 3-5 files preferred (1-5 accepted for flexibility)
 * - CLAIM-004: Must have all 4 required fields
 * - CLAIM-005: Prompt injection is #1 LLM threat (OWASP LLM01:2025)
 * - CLAIM-006: Forbidden: conversation history
 * - CLAIM-007: Forbidden: CLAUDE.md rules
 * - CLAIM-008: ~125 tokens (500 chars / 4)
 * - CLAIM-009: Structured JSON output required
 *
 * Failure Modes:
 * - PROMPT_TOO_LARGE: Prompt exceeds 500 characters
 * - TASK_TOO_LONG: Task field exceeds 200 characters
 * - MISSING_REQUIRED_FIELD: One of 4 required fields is missing
 * - INJECTION_DETECTED: Prompt contains injection pattern
 * - CONTAINS_CONVERSATION_HISTORY: Forbidden content
 * - CONTAINS_CLAUDE_MD_RULES: Forbidden content
 * - CONTAINS_PREVIOUS_AGENT_OUTPUT: Forbidden content
 */

/**
 * Validation result with errors and warnings
 */
export interface ValidationResult {
  /** Whether the prompt is valid */
  valid: boolean;
  /** List of error codes/messages */
  errors: string[];
  /** List of warning codes/messages */
  warnings?: string[];
}

/**
 * Injection detection result
 */
export interface InjectionCheckResult {
  /** Whether injection was detected */
  hasInjection: boolean;
  /** Matched pattern (if detected) */
  pattern?: string;
  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Error codes for PromptValidator operations
 */
export enum PromptValidatorError {
  PROMPT_TOO_LARGE = "PROMPT_TOO_LARGE",
  TOO_MANY_TOKENS = "TOO_MANY_TOKENS",
  MISSING_TASK = "MISSING_TASK",
  TASK_TOO_LONG = "TASK_TOO_LONG",
  MISSING_FILES = "MISSING_FILES",
  TOO_MANY_FILES = "TOO_MANY_FILES",
  MISSING_OUTPUT = "MISSING_OUTPUT",
  INVALID_OUTPUT_FORMAT = "INVALID_OUTPUT_FORMAT",
  MISSING_RULES = "MISSING_RULES",
  INJECTION_DETECTED = "INJECTION_DETECTED",
  CONTAINS_CONVERSATION_HISTORY = "CONTAINS_CONVERSATION_HISTORY",
  CONTAINS_CLAUDE_MD_RULES = "CONTAINS_CLAUDE_MD_RULES",
  CONTAINS_PREVIOUS_AGENT_OUTPUT = "CONTAINS_PREVIOUS_AGENT_OUTPUT",
  SANITIZATION_FAILED = "SANITIZATION_FAILED",
}

/**
 * Custom error for PromptValidator operations
 */
export class PromptValidatorException extends Error {
  constructor(
    public code: PromptValidatorError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PromptValidatorException";
  }
}

/**
 * Prompt injection patterns from OWASP LLM01:2025
 * Ordered by severity (high to low)
 */
const INJECTION_PATTERNS: Array<{
  pattern: RegExp;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}> = [
  // Critical severity - direct command execution
  {
    pattern: /execute\s*:\s*(rm\s+-rf|del\s+\/|drop\s+table|shutdown|reboot)/i,
    severity: "critical",
    description: "Command injection",
  },
  // High severity - instruction override
  {
    pattern: /ignore\s+(all\s+)?(previous|above|earlier)\s+instructions/i,
    severity: "high",
    description: "Instruction override",
  },
  {
    pattern: /forget\s+(everything|all\s+above|previous)/i,
    severity: "high",
    description: "Memory override",
  },
  {
    pattern: /you\s+are\s+(now\s+)?(a\s+)?(system\s+)?(administrator|admin|root|god|supervisor)/i,
    severity: "high",
    description: "Role impersonation",
  },
  {
    pattern: /(?:```|""")\s*(?:DELETE|DROP|EXEC|EXECUTE)\s/i,
    severity: "high",
    description: "Delimiter attack with SQL/command",
  },
  // Medium severity - context manipulation
  {
    pattern: /```[\s\S]*?```/,
    severity: "medium",
    description: "Code block delimiter",
  },
  {
    pattern: /"""\s*[\s\S]*?\s*"""/,
    severity: "medium",
    description: "Triple quote delimiter",
  },
  {
    pattern: /\$\{.*?\}/,
    severity: "medium",
    description: "Template injection",
  },
  // Low severity - suspicious patterns
  {
    pattern: /(?:(?:new|override|replace)\s+)*(?:system|assistant|ai|agent)\s+instructions/i,
    severity: "low",
    description: "Instruction manipulation",
  },
];

/**
 * Forbidden content patterns
 */
const FORBIDDEN_PATTERNS: Array<{
  pattern: RegExp;
  error: PromptValidatorError;
  description: string;
}> = [
  {
    pattern: /conversation\s+history/i,
    error: PromptValidatorError.CONTAINS_CONVERSATION_HISTORY,
    description: "Conversation history",
  },
  {
    pattern: /CLAUDE\.md\s+rules/i,
    error: PromptValidatorError.CONTAINS_CLAUDE_MD_RULES,
    description: "CLAUDE.md rules",
  },
  {
    pattern: /previous\s+agent/i,
    error: PromptValidatorError.CONTAINS_PREVIOUS_AGENT_OUTPUT,
    description: "Previous agent output",
  },
];

/**
 * PII patterns for redaction
 */
const PII_PATTERNS: Array<{
  pattern: RegExp;
  replacement: string;
  description: string;
}> = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[EMAIL_REDACTED]",
    description: "Email address",
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN_REDACTED]",
    description: "SSN",
  },
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[CC_REDACTED]",
    description: "Credit card",
  },
  {
    pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE_REDACTED]",
    description: "Phone number",
  },
];

/**
 * Constants for validation thresholds
 */
const MAX_PROMPT_LENGTH = 500;
const MAX_TASK_LENGTH = 200;
const MAX_FILES = 5;
const MAX_TOKENS = 125;
const CHARS_PER_TOKEN = 4;

/**
 * PromptValidator - Validates and sanitizes agent prompts
 *
 * @example
 * ```ts
 * const validator = new PromptValidator();
 * const result = await validator.validate(prompt);
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export class PromptValidator {
  /**
   * Main validation entry point
   * Runs all validation checks in order
   *
   * Order (security priority):
   * 1. Injection detection (highest priority)
   * 2. Size validation
   * 3. Structure validation
   * 4. Forbidden content validation
   *
   * @param prompt - Agent prompt to validate
   * @returns ValidationResult with errors and warnings
   */
  async validate(prompt: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check for injection (highest priority)
    const injectionResult = this.detectInjection(prompt);
    if (injectionResult.hasInjection) {
      errors.push(
        `${PromptValidatorError.INJECTION_DETECTED}: ${injectionResult.pattern} (${injectionResult.severity} severity)`
      );
    }

    // 2. Check size constraints
    const sizeResult = this.validateSize(prompt);
    if (!sizeResult.valid) {
      errors.push(...sizeResult.errors);
    }

    // 3. Check structure
    const structureResult = this.validateStructure(prompt);
    if (!structureResult.valid) {
      errors.push(...structureResult.errors);
    }

    // 4. Check forbidden content
    const forbiddenResult = this.validateNoForbiddenContent(prompt);
    if (!forbiddenResult.valid) {
      errors.push(...forbiddenResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validates prompt size constraints
   *
   * Checks:
   * - Character count ≤ 500
   * - Estimated token count ≤ 125
   *
   * @param prompt - Agent prompt to validate
   * @returns ValidationResult
   */
  validateSize(prompt: string): ValidationResult {
    const errors: string[] = [];

    // Check character count
    if (prompt.length > MAX_PROMPT_LENGTH) {
      errors.push(
        `${PromptValidatorError.PROMPT_TOO_LARGE}: ${prompt.length}/${MAX_PROMPT_LENGTH} characters`
      );
    }

    // Check token count
    const estimatedTokens = this.estimateTokenCount(prompt.length);
    if (estimatedTokens > MAX_TOKENS) {
      errors.push(
        `${PromptValidatorError.TOO_MANY_TOKENS}: ${estimatedTokens}/${MAX_TOKENS} tokens estimated`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates prompt structure
   *
   * Checks for required fields:
   * - Task: (required, ≤200 chars)
   * - Files: (required, 1-5 files)
   * - Output: (required, must specify JSON)
   * - Rules: (required)
   *
   * @param prompt - Agent prompt to validate
   * @returns ValidationResult
   */
  validateStructure(prompt: string): ValidationResult {
    const errors: string[] = [];

    // Check for Task field
    const taskMatch = prompt.match(/Task:\s*(.*?)(?=\nFiles:|\nOutput:|\nRules:|$)/is);
    if (!taskMatch) {
      errors.push(PromptValidatorError.MISSING_TASK);
    } else {
      const task = taskMatch[1].trim();
      if (task.length > MAX_TASK_LENGTH) {
        errors.push(
          `${PromptValidatorError.TASK_TOO_LONG}: ${task.length}/${MAX_TASK_LENGTH} characters`
        );
      }
    }

    // Check for Files field
    const filesMatch = prompt.match(/Files:\s*(.*?)(?=\nOutput:|\nRules:|$)/is);
    if (!filesMatch) {
      errors.push(PromptValidatorError.MISSING_FILES);
    } else {
      const filesText = filesMatch[1].trim();
      // Count files (comma-separated or newlines)
      const files = filesText.split(/[\n,]+/).filter((f) => f.trim().length > 0);
      if (files.length > MAX_FILES) {
        errors.push(
          `${PromptValidatorError.TOO_MANY_FILES}: ${files.length}/${MAX_FILES} files`
        );
      }
    }

    // Check for Output field
    const outputMatch = prompt.match(/Output:\s*(.*?)(?=\nRules:|$)/is);
    if (!outputMatch) {
      errors.push(PromptValidatorError.MISSING_OUTPUT);
    } else {
      const output = outputMatch[1].trim();
      if (!output.toLowerCase().includes("json")) {
        errors.push(
          `${PromptValidatorError.INVALID_OUTPUT_FORMAT}: Must specify JSON output format`
        );
      }
    }

    // Check for Rules field
    const rulesMatch = prompt.match(/Rules:\s*(.*)$/is);
    if (!rulesMatch) {
      errors.push(PromptValidatorError.MISSING_RULES);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates no forbidden content patterns
   *
   * Checks for:
   * - Conversation history
   * - CLAUDE.md rules
   * - Previous agent output
   *
   * @param prompt - Agent prompt to validate
   * @returns ValidationResult
   */
  validateNoForbiddenContent(prompt: string): ValidationResult {
    const errors: string[] = [];

    for (const { pattern, error, description } of FORBIDDEN_PATTERNS) {
      if (pattern.test(prompt)) {
        errors.push(`${error}: ${description} detected`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detects prompt injection attempts
   *
   * Uses pattern matching against OWASP LLM01:2025 injection patterns
   *
   * @param prompt - Agent prompt to check for injection
   * @returns InjectionCheckResult with severity
   */
  detectInjection(prompt: string): InjectionCheckResult {
    // Check all patterns, return highest severity match
    let highestSeverityResult: InjectionCheckResult = {
      hasInjection: false,
      severity: "low",
    };

    for (const { pattern, severity, description } of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        const result: InjectionCheckResult = {
          hasInjection: true,
          pattern: description,
          severity,
        };

        // Update if this is higher severity
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (
          severityOrder[severity] >
          severityOrder[highestSeverityResult.severity]
        ) {
          highestSeverityResult = result;
        }
      }
    }

    return highestSeverityResult;
  }

  /**
   * Sanitizes prompt content
   *
   * Operations:
   * 1. Escapes special characters (backslash, backtick, dollar sign)
   * 2. Redacts PII (email, SSN, credit card, phone)
   * 3. Filters control characters
   *
   * @param prompt - Agent prompt to sanitize
   * @returns Sanitized prompt string
   */
  sanitize(prompt: string): string {
    try {
      let sanitized = prompt;

      // 1. Escape special characters
      sanitized = sanitized.replace(/\\/g, "\\\\");
      sanitized = sanitized.replace(/`/g, "\\`");
      sanitized = sanitized.replace(/\$/g, "\\$");

      // 2. Redact PII
      for (const { pattern, replacement } of PII_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
      }

      // 3. Filter control characters (but keep \n and \t)
      sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

      // 4. Filter unicode control characters
      sanitized = sanitized.replace(/[\u200B\uFEFF\u200C\u200D\u2060]/g, "");

      return sanitized;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[PromptValidator] ${PromptValidatorError.SANITIZATION_FAILED}: ${errorMessage}`
      );
      // Return original prompt on failure
      return prompt;
    }
  }

  /**
   * Estimates token count from character count
   *
   * Simple estimation: ~4 characters per token
   * This is a rough estimate, not exact tokenization
   *
   * @param charCount - Character count to convert
   * @returns Estimated token count
   */
  estimateTokenCount(charCount: number): number {
    // Handle invalid input
    if (typeof charCount !== "number" || charCount < 0 || Number.isNaN(charCount)) {
      return 0;
    }

    return Math.ceil(charCount / CHARS_PER_TOKEN);
  }
}
