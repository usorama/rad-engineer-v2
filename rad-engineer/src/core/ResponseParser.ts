/**
 * ResponseParser - Core Orchestrator Component
 * Phase 1: Deterministic execution foundation
 *
 * Parses and validates agent responses to ensure:
 * - Valid JSON structure
 * - All 6 required fields present
 * - Correct field types
 * - Summary ≤ 500 characters
 *
 * Evidence-Backed Requirements (from research-findings.md):
 * - CLAIM-001: 6 required fields (success, filesModified, testsWritten, summary, errors, nextSteps)
 * - CLAIM-002: success must be boolean
 * - CLAIM-003: filesModified must be string array
 * - CLAIM-004: testsWritten must be string array
 * - CLAIM-005: summary must be ≤ 500 characters
 * - CLAIM-006: errors must be string array
 * - CLAIM-007: nextSteps must be string array
 * - CLAIM-008: JSON parsing via JSON.parse()
 *
 * Failure Modes:
 * - MALFORMED_JSON: Response is not valid JSON
 * - MISSING_REQUIRED_FIELD: One of 6 required fields is missing
 * - TYPE_MISMATCH: Field has wrong type
 * - VALUE_TOO_LONG: Summary exceeds 500 characters
 */

/**
 * Structured agent response format
 */
export interface AgentResponse {
  /** Whether the agent execution succeeded */
  success: boolean;
  /** List of modified file paths */
  filesModified: string[];
  /** List of test file paths written */
  testsWritten: string[];
  /** Summary of work done (max 500 characters) */
  summary: string;
  /** List of error messages (if any) */
  errors: string[];
  /** List of next steps (if any) */
  nextSteps: string[];
}

/**
 * Parse result with success/failure indication
 */
export interface ParseResult<T> {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Validation result with errors list
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation error messages */
  errors: string[];
}

/**
 * Error codes for ResponseParser operations
 */
export enum ResponseParserError {
  MALFORMED_JSON = "MALFORMED_JSON",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  TYPE_MISMATCH = "TYPE_MISMATCH",
  VALUE_TOO_LONG = "VALUE_TOO_LONG",
  NOT_AN_OBJECT = "NOT_AN_OBJECT",
}

/**
 * Custom error for ResponseParser operations
 */
export class ResponseParserException extends Error {
  constructor(
    public code: ResponseParserError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ResponseParserException";
  }
}

/**
 * ResponseParser validates and parses agent responses
 */
export class ResponseParser {
  /** Maximum summary length (from CLAIM-005) */
  private static readonly MAX_SUMMARY_LENGTH = 500;

  /** Required field names (from CLAIM-001) */
  private static readonly REQUIRED_FIELDS = [
    "success",
    "filesModified",
    "testsWritten",
    "summary",
    "errors",
    "nextSteps",
  ] as const;

  /**
   * Parse and validate agent response JSON
   *
   * @param rawResponse - Raw agent response string
   * @returns Parse result with AgentResponse or error
   */
  parse(rawResponse: string): ParseResult<AgentResponse> {
    try {
      // Parse JSON (CLAIM-008)
      const parsed = JSON.parse(rawResponse);

      // Validate structure
      const validation = this.validateStructure(parsed);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // Cast to AgentResponse (validated above)
      return {
        success: true,
        data: parsed as AgentResponse,
      };
    } catch (error) {
      // Check for JSON parsing errors
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: `${ResponseParserError.MALFORMED_JSON}: ${error.message}`,
        };
      }

      // Unknown error
      return {
        success: false,
        error: `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate response has all 6 required fields with correct types
   *
   * @param data - Parsed data to validate
   * @returns Validation result with errors list
   */
  validateStructure(data: unknown): ValidationResult {
    const errors: string[] = [];

    // Check if data is an object (but not an array)
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        valid: false,
        errors: [`${ResponseParserError.NOT_AN_OBJECT}: Response must be an object`],
      };
    }

    const obj = data as Record<string, unknown>;

    // Check all required fields (CLAIM-001)
    for (const field of ResponseParser.REQUIRED_FIELDS) {
      if (!(field in obj)) {
        errors.push(`${ResponseParserError.MISSING_REQUIRED_FIELD}: Missing required field '${field}'`);
      }
    }

    // Early return if fields are missing
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Type checking (CLAIM-002 through CLAIM-007)
    // success: boolean (CLAIM-002)
    if (typeof obj.success !== "boolean") {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'success' must be boolean, got '${typeof obj.success}'`
      );
    }

    // filesModified: string array (CLAIM-003)
    if (!Array.isArray(obj.filesModified)) {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'filesModified' must be array, got '${typeof obj.filesModified}'`
      );
    } else if (!obj.filesModified.every((item) => typeof item === "string")) {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'filesModified' must contain only strings`
      );
    }

    // testsWritten: string array (CLAIM-004)
    if (!Array.isArray(obj.testsWritten)) {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'testsWritten' must be array, got '${typeof obj.testsWritten}'`
      );
    } else if (!obj.testsWritten.every((item) => typeof item === "string")) {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'testsWritten' must contain only strings`
      );
    }

    // summary: string, max 500 chars (CLAIM-005)
    if (typeof obj.summary !== "string") {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'summary' must be string, got '${typeof obj.summary}'`
      );
    } else if (obj.summary.length > ResponseParser.MAX_SUMMARY_LENGTH) {
      errors.push(
        `${ResponseParserError.VALUE_TOO_LONG}: Field 'summary' must be <= ${ResponseParser.MAX_SUMMARY_LENGTH} characters, got ${obj.summary.length}`
      );
    }

    // errors: string array (CLAIM-006)
    if (!Array.isArray(obj.errors)) {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'errors' must be array, got '${typeof obj.errors}'`
      );
    } else if (!obj.errors.every((item) => typeof item === "string")) {
      errors.push(`${ResponseParserError.TYPE_MISMATCH}: Field 'errors' must contain only strings`);
    }

    // nextSteps: string array (CLAIM-007)
    if (!Array.isArray(obj.nextSteps)) {
      errors.push(
        `${ResponseParserError.TYPE_MISMATCH}: Field 'nextSteps' must be array, got '${typeof obj.nextSteps}'`
      );
    } else if (!obj.nextSteps.every((item) => typeof item === "string")) {
      errors.push(`${ResponseParserError.TYPE_MISMATCH}: Field 'nextSteps' must contain only strings`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract list of modified files from response
   *
   * @param response - Validated agent response
   * @returns List of modified file paths
   */
  extractFiles(response: AgentResponse): string[] {
    return response.filesModified;
  }

  /**
   * Extract list of test files from response
   *
   * @param response - Validated agent response
   * @returns List of test file paths
   */
  extractTests(response: AgentResponse): string[] {
    return response.testsWritten;
  }

  /**
   * Extract list of errors from response
   *
   * @param response - Validated agent response
   * @returns List of error messages
   */
  extractErrors(response: AgentResponse): string[] {
    return response.errors;
  }

  /**
   * Check if response indicates success
   *
   * @param response - Validated agent response
   * @returns True if success field is true
   */
  isSuccess(response: AgentResponse): boolean {
    return response.success === true;
  }
}
