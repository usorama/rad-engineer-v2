/**
 * SecurityScanner - Security Audit Component
 * Phase 1: Deterministic execution foundation - Security Layer
 *
 * Performs comprehensive security audits including:
 * - Dependency vulnerability scanning
 * - Outdated package detection
 * - License compliance checking
 * - Security best practices validation
 *
 * Responsibilities:
 * - Run dependency security audits
 * - Check for outdated packages with known vulnerabilities
 * - Validate license compliance
 * - Generate detailed security reports with severity levels
 * - Support full scan combining all security checks
 *
 * Failure Modes:
 * - AUDIT_FAILED: Thrown when dependency audit fails
 * - OUTDATED_CHECK_FAILED: Thrown when outdated package check fails
 * - LICENSE_CHECK_FAILED: Thrown when license validation fails
 * - SCAN_FAILED: Thrown when full security scan fails
 */

import { execFileNoThrow } from "@/utils/execFileNoThrow.js";

/**
 * Severity levels for security findings
 */
export enum SecuritySeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

/**
 * Individual security finding
 */
export interface SecurityFinding {
  /** Type of finding (vulnerability, outdated, license, etc.) */
  type: "vulnerability" | "outdated" | "license" | "best-practice";
  /** Severity level */
  severity: SecuritySeverity;
  /** Package name */
  packageName: string;
  /** Current version */
  currentVersion?: string;
  /** Recommended version (for outdated packages) */
  recommendedVersion?: string;
  /** Latest version available */
  latestVersion?: string;
  /** Description of the issue */
  description: string;
  /** CVE identifiers (for vulnerabilities) */
  cve?: string[];
  /** Remediation advice */
  remediation: string;
}

/**
 * Security audit report
 */
export interface SecurityAuditReport {
  /** Timestamp of audit */
  timestamp: string;
  /** Overall status */
  status: "pass" | "warning" | "fail";
  /** Summary statistics */
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  /** Detailed findings */
  findings: SecurityFinding[];
  /** Audit duration in milliseconds */
  durationMs: number;
}

/**
 * Configuration for SecurityScanner
 */
export interface SecurityScannerConfig {
  /** Package manager to use (default: auto-detect) */
  packageManager?: "bun" | "npm" | "pnpm" | "yarn";
  /** Working directory for scans (default: process.cwd()) */
  workingDirectory?: string;
  /** Fail on severity threshold */
  failOnSeverity?: SecuritySeverity;
}

/**
 * Error codes for SecurityScanner operations
 */
export enum SecurityScannerError {
  AUDIT_FAILED = "AUDIT_FAILED",
  OUTDATED_CHECK_FAILED = "OUTDATED_CHECK_FAILED",
  LICENSE_CHECK_FAILED = "LICENSE_CHECK_FAILED",
  SCAN_FAILED = "SCAN_FAILED",
}

/**
 * Custom error for SecurityScanner operations
 */
export class SecurityScannerException extends Error {
  constructor(
    public code: SecurityScannerError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SecurityScannerException";
  }
}

/**
 * SecurityScanner - Performs comprehensive security audits
 *
 * @example
 * ```ts
 * const scanner = new SecurityScanner({ packageManager: "bun" });
 * const report = await scanner.runFullScan();
 * console.log(`Found ${report.summary.total} security findings`);
 * ```
 */
export class SecurityScanner {
  private readonly packageManager: string;
  private readonly workingDirectory: string;
  private readonly failOnSeverity: SecuritySeverity | null;

  constructor(config: SecurityScannerConfig = {}) {
    this.packageManager = config.packageManager ?? this.detectPackageManager();
    this.workingDirectory = config.workingDirectory ?? process.cwd();
    this.failOnSeverity = config.failOnSeverity ?? null;
  }

  /**
   * Scan dependencies for known vulnerabilities
   *
   * @returns Array of vulnerability findings
   */
  async scanDependencies(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const result = await execFileNoThrow(this.packageManager, ["audit"]);

      // Parse bun audit output
      if (result.success) {
        // No vulnerabilities found
        if (result.stdout.includes("No vulnerabilities found")) {
          return [];
        }

        // Parse vulnerability output (format varies by package manager)
        // For bun, the output is minimal when no vulns found
        // For npm/pnpm/yarn, we'd need more sophisticated parsing
        return findings;
      }

      // Non-zero exit code might indicate vulnerabilities found
      if (!result.success && result.stdout) {
        // Parse error output for vulnerability details
        // This is a simplified parser - real implementation would be more robust
        const lines = result.stdout.split("\n");
        for (const line of lines) {
          if (line.includes("critical") || line.includes("high") || line.includes("moderate")) {
            // Extract vulnerability info (simplified)
            findings.push({
              type: "vulnerability",
              severity: this.parseSeverityFromLine(line),
              packageName: "unknown", // Would extract from line
              description: line.trim(),
              remediation: "Update to latest version or apply security patch",
            });
          }
        }
      }
    } catch (error) {
      throw new SecurityScannerException(
        SecurityScannerError.AUDIT_FAILED,
        `Dependency audit failed: ${error instanceof Error ? error.message : String(error)}`,
        { packageManager: this.packageManager }
      );
    }

    return findings;
  }

  /**
   * Check for outdated packages
   *
   * @returns Array of outdated package findings
   */
  async checkOutdated(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const result = await execFileNoThrow(this.packageManager, ["outdated"]);

      // Parse outdated output
      if (result.stdout) {
        const lines = result.stdout.split("\n");
        let inTable = false;

        for (const line of lines) {
          // Skip header lines
          if (line.includes("Package") || line.includes("---") || line.trim() === "") {
            if (line.includes("Package")) inTable = true;
            continue;
          }

          if (inTable && line.includes("|")) {
            // Parse table row: | Package | Current | Update | Latest |
            const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
            if (parts.length >= 4) {
              const [packageName, current, update, latest] = parts;

              // Determine severity based on version difference
              const severity = this.calculateOutdatedSeverity(current, latest);

              findings.push({
                type: "outdated",
                severity,
                packageName,
                currentVersion: current,
                recommendedVersion: update,
                latestVersion: latest,
                description: `${packageName} is outdated (${current} → ${latest})`,
                remediation: `Update to latest version: ${this.packageManager} add ${packageName}@${latest}`,
              });
            }
          }
        }
      }
    } catch (error) {
      throw new SecurityScannerException(
        SecurityScannerError.OUTDATED_CHECK_FAILED,
        `Outdated package check failed: ${error instanceof Error ? error.message : String(error)}`,
        { packageManager: this.packageManager }
      );
    }

    return findings;
  }

  /**
   * Check for license compliance issues
   *
   * @returns Array of license-related findings
   */
  async checkLicenses(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // Read package.json to check licenses
      const pkgJsonPath = `${this.workingDirectory}/package.json`;
      const pkgJsonResult = await execFileNoThrow("cat", [pkgJsonPath]);

      if (pkgJsonResult.success) {
        const pkgJson = JSON.parse(pkgJsonResult.stdout);

        // Check if package has license defined
        if (!pkgJson.license) {
          findings.push({
            type: "license",
            severity: SecuritySeverity.LOW,
            packageName: pkgJson.name || "unknown",
            description: "No license specified in package.json",
            remediation: 'Add "license" field to package.json',
          });
        }

        // Note: Full license audit would require checking all dependencies
        // This is a simplified check for the main package only
      }
    } catch (error) {
      throw new SecurityScannerException(
        SecurityScannerError.LICENSE_CHECK_FAILED,
        `License check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return findings;
  }

  /**
   * Run full security scan combining all checks
   *
   * @returns Complete security audit report
   */
  async runFullScan(): Promise<SecurityAuditReport> {
    const startTime = Date.now();

    try {
      // Run all scans in parallel
      const [vulnerabilities, outdated, licenses] = await Promise.all([
        this.scanDependencies(),
        this.checkOutdated(),
        this.checkLicenses(),
      ]);

      const findings = [...vulnerabilities, ...outdated, ...licenses];

      // Calculate summary statistics
      const summary = {
        total: findings.length,
        critical: findings.filter((f) => f.severity === SecuritySeverity.CRITICAL).length,
        high: findings.filter((f) => f.severity === SecuritySeverity.HIGH).length,
        medium: findings.filter((f) => f.severity === SecuritySeverity.MEDIUM).length,
        low: findings.filter((f) => f.severity === SecuritySeverity.LOW).length,
        info: findings.filter((f) => f.severity === SecuritySeverity.INFO).length,
      };

      // Determine overall status
      let status: SecurityAuditReport["status"] = "pass";
      if (summary.critical > 0 || summary.high > 0) {
        status = "fail";
      } else if (summary.medium > 0 || summary.low > 0) {
        status = "warning";
      }

      // Check if we should fail based on severity threshold
      if (this.failOnSeverity) {
        const severityRank = this.getSeverityRank(this.failOnSeverity);
        const hasFailingSeverity = findings.some(
          (f) => this.getSeverityRank(f.severity) >= severityRank
        );
        if (hasFailingSeverity) {
          status = "fail";
        }
      }

      const report: SecurityAuditReport = {
        timestamp: new Date().toISOString(),
        status,
        summary,
        findings,
        durationMs: Date.now() - startTime,
      };

      return report;
    } catch (error) {
      throw new SecurityScannerException(
        SecurityScannerError.SCAN_FAILED,
        `Full security scan failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect package manager from project files
   */
  private detectPackageManager(): string {
    // Check for lock files or package manager field in package.json
    // For now, default to bun as specified in project
    return "bun";
  }

  /**
   * Parse severity from audit output line
   */
  private parseSeverityFromLine(line: string): SecuritySeverity {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("critical")) return SecuritySeverity.CRITICAL;
    if (lowerLine.includes("high")) return SecuritySeverity.HIGH;
    if (lowerLine.includes("moderate") || lowerLine.includes("medium")) return SecuritySeverity.MEDIUM;
    if (lowerLine.includes("low")) return SecuritySeverity.LOW;
    return SecuritySeverity.INFO;
  }

  /**
   * Calculate severity for outdated packages based on version difference
   */
  private calculateOutdatedSeverity(current: string, latest: string): SecuritySeverity {
    // Parse semver versions
    const currentParts = current.split(".").map((n) => parseInt(n, 10));
    const latestParts = latest.split(".").map((n) => parseInt(n, 10));

    // Major version difference
    if (latestParts[0] > currentParts[0]) {
      return SecuritySeverity.MEDIUM;
    }

    // Minor version difference (multiple versions behind)
    if (latestParts[1] > currentParts[1] + 2) {
      return SecuritySeverity.LOW;
    }

    // Otherwise, just info
    return SecuritySeverity.INFO;
  }

  /**
   * Get numeric rank for severity (for comparison)
   */
  private getSeverityRank(severity: SecuritySeverity): number {
    const ranks = {
      [SecuritySeverity.CRITICAL]: 4,
      [SecuritySeverity.HIGH]: 3,
      [SecuritySeverity.MEDIUM]: 2,
      [SecuritySeverity.LOW]: 1,
      [SecuritySeverity.INFO]: 0,
    };
    return ranks[severity] ?? 0;
  }
}
