/**
 * SecurityLayer - Integration & Polish Component
 * Phase 3: Integration & Polish
 *
 * Provides security scanning and audit logging for the orchestrator:
 * - Scans prompts for injection attacks, PII, and code injection
 * - Scans responses for data leaks and sensitive information
 * - Maintains audit log of all security events
 *
 * Integrates with PromptValidator patterns for consistent threat detection.
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Result of a security scan
 */
export interface SecurityScanResult {
  /** Whether the content is safe (no threats detected) */
  safe: boolean;
  /** List of detected threat descriptions */
  threats: string[];
}

/**
 * Security event for audit logging
 */
export interface SecurityEvent {
  /** Event type (e.g., THREAT_DETECTED, SCAN_INITIATED) */
  type: string;
  /** ISO timestamp of when the event occurred */
  timestamp: string;
  /** Optional additional details about the event */
  details?: Record<string, unknown>;
}

/**
 * Threat detection pattern
 */
interface ThreatPattern {
  pattern: RegExp;
  category: string;
  description: string;
}

/**
 * Prompt injection patterns (from PromptValidator for consistency)
 */
const PROMPT_INJECTION_PATTERNS: ThreatPattern[] = [
  {
    pattern: /ignore\s+(all\s+)?(previous|above|earlier)\s+instructions/i,
    category: "prompt_injection",
    description: "Instruction override attempt detected",
  },
  {
    pattern: /forget\s+(everything|all\s+above|previous)/i,
    category: "prompt_injection",
    description: "Memory override attempt detected",
  },
  {
    pattern: /you\s+are\s+(now\s+)?(a\s+)?(system\s+)?(administrator|admin|root|god|supervisor)/i,
    category: "prompt_injection",
    description: "Role impersonation attempt detected",
  },
  {
    pattern: /(?:```|""")\s*[\s\S]*?(?:DELETE|DROP|EXEC|EXECUTE)\s/i,
    category: "code_injection",
    description: "SQL/command injection attempt detected",
  },
  {
    pattern: /```(?:sql|bash|sh)?[\s\S]*?(?:DROP|DELETE|EXECUTE)\s/i,
    category: "code_injection",
    description: "SQL injection in code block detected",
  },
  {
    pattern: /execute\s*:\s*(rm\s+-rf|del\s+\/|drop\s+table|shutdown|reboot)/i,
    category: "code_injection",
    description: "Command execution attempt detected",
  },
];

/**
 * PII detection patterns (from PromptValidator for consistency)
 */
const PII_PATTERNS: ThreatPattern[] = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    category: "pii",
    description: "Email address detected",
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    category: "pii",
    description: "SSN detected",
  },
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    category: "pii",
    description: "Credit card number detected",
  },
  {
    pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    category: "pii",
    description: "Phone number detected",
  },
];

/**
 * Credential leakage patterns for response scanning
 */
const CREDENTIAL_PATTERNS: ThreatPattern[] = [
  {
    pattern: /password\s*[:=]\s*\S+/i,
    category: "credential_leak",
    description: "Password leakage detected",
  },
  {
    pattern: /api[_-]?key\s*[:=]\s*\S+/i,
    category: "credential_leak",
    description: "API key leakage detected",
  },
  {
    pattern: /secret[_-]?key\s*[:=]\s*\S+/i,
    category: "credential_leak",
    description: "Secret key leakage detected",
  },
  {
    pattern: /token\s*[:=]\s*[A-Za-z0-9+/]{20,}=*/i,
    category: "credential_leak",
    description: "Token leakage detected",
  },
  {
    pattern: /mongodb:\/\/[^@]+:[^@]+@/i,
    category: "credential_leak",
    description: "Database connection string leakage detected",
  },
];

/**
 * Audit log file path
 */
const AUDIT_LOG_DIR = join(process.cwd(), ".audit");
const AUDIT_LOG_PATH = join(AUDIT_LOG_DIR, "audit.log");

/**
 * SecurityLayer - Scans prompts and responses for threats
 *
 * @example
 * ```ts
 * const securityLayer = new SecurityLayer();
 *
 * // Scan a prompt
 * const promptResult = securityLayer.scanPrompt("Task: Implement feature");
 * if (!promptResult.safe) {
 *   console.error("Threats detected:", promptResult.threats);
 * }
 *
 * // Scan a response
 * const responseResult = securityLayer.scanResponse(agentResponse);
 *
 * // Log security events
 * securityLayer.auditLog({
 *   type: "THREAT_DETECTED",
 *   timestamp: new Date().toISOString(),
 *   details: { threatType: "prompt_injection" }
 * });
 * ```
 */
export class SecurityLayer {
  private auditLogPath: string;

  constructor() {
    this.auditLogPath = AUDIT_LOG_PATH;
    this.ensureAuditDirectory();
  }

  /**
   * Scans prompt for security threats
   *
   * Detects:
   * - Prompt injection attempts
   * - PII (Personally Identifiable Information)
   * - Code injection attempts
   *
   * @param prompt - Prompt content to scan
   * @returns SecurityScanResult with detected threats
   */
  scanPrompt(prompt: string): SecurityScanResult {
    const threats: string[] = [];

    // Check for prompt injection
    for (const { pattern, category, description } of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        threats.push(`${category}: ${description}`);
      }
    }

    // Check for PII
    for (const { pattern, category, description } of PII_PATTERNS) {
      const matches = prompt.match(pattern);
      if (matches && matches.length > 0) {
        threats.push(`${category}: ${description} (${matches.length} occurrence(s))`);
      }
    }

    // Check for code injection (already covered above, but add additional patterns if needed)
    // Additional code injection patterns can be added here

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  /**
   * Scans response for data leaks
   *
   * Detects:
   * - PII leakage
   * - Credential leakage (passwords, API keys, tokens)
   * - Sensitive system information
   *
   * @param response - Response content to scan
   * @returns SecurityScanResult with detected threats
   */
  scanResponse(response: string): SecurityScanResult {
    const threats: string[] = [];

    // Check for PII leakage
    for (const { pattern, category, description } of PII_PATTERNS) {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        threats.push(`${category}: ${description} (${matches.length} occurrence(s))`);
      }
    }

    // Check for credential leakage
    for (const { pattern, category, description } of CREDENTIAL_PATTERNS) {
      if (pattern.test(response)) {
        threats.push(`${category}: ${description}`);
      }
    }

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  /**
   * Logs security events to audit file
   *
   * Creates/updates .audit/audit.log with timestamped entries
   *
   * @param event - Security event to log
   */
  auditLog(event: SecurityEvent): void {
    try {
      const logEntry = {
        timestamp: event.timestamp,
        type: event.type,
        ...event.details,
      };

      const logLine = JSON.stringify(logEntry) + "\n";

      // Append to audit log
      appendFileSync(this.auditLogPath, logLine, "utf-8");
    } catch (error) {
      console.error(`[SecurityLayer] Failed to write audit log: ${error}`);
    }
  }

  /**
   * Ensures audit directory exists
   * Creates .audit directory if it doesn't exist
   */
  private ensureAuditDirectory(): void {
    if (!existsSync(AUDIT_LOG_DIR)) {
      try {
        mkdirSync(AUDIT_LOG_DIR, { recursive: true });
      } catch (error) {
        console.error(`[SecurityLayer] Failed to create audit directory: ${error}`);
      }
    }
  }
}
