/**
 * Production Validation Suite
 *
 * Comprehensive validation suite to verify system readiness for production.
 * Checks dependencies, configuration, services, security, and generates reports.
 */

import { z } from "zod";
import { existsSync, accessSync, constants, statSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Validation check result
 */
export interface ValidationResult {
  category: "dependencies" | "configuration" | "services" | "security" | "filesystem";
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: string;
  fixable?: boolean;
}

/**
 * Validation report
 */
export interface ValidationReport {
  timestamp: string;
  overallStatus: "pass" | "fail" | "warn";
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
  summary: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  fix?: boolean;
  verbose?: boolean;
  skipServices?: boolean;
}

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS = [
  { name: "RAD_USE_REAL_AGENTS", required: false, description: "Use real Claude agents (true/false)" },
  { name: "RAD_API_KEY", required: false, description: "Anthropic API key (required if useRealAgents=true)" },
  { name: "RAD_MAX_AGENTS", required: false, description: "Maximum concurrent agents (1-10)" },
  { name: "RAD_TIMEOUT", required: false, description: "Agent timeout in ms" },
  { name: "RAD_LOG_LEVEL", required: false, description: "Log level (debug/info/warn/error)" },
] as const;

/**
 * Required dependencies
 */
const REQUIRED_DEPENDENCIES = [
  { name: "bun", command: "bun --version", minVersion: "1.0.0" },
  { name: "node", command: "node --version", minVersion: "20.0.0" },
] as const;

/**
 * Required files and directories
 */
const REQUIRED_PATHS = [
  { path: "package.json", type: "file" as const, description: "Package manifest" },
  { path: "tsconfig.json", type: "file" as const, description: "TypeScript configuration" },
  { path: "src", type: "dir" as const, description: "Source directory" },
  { path: "src/config", type: "dir" as const, description: "Configuration directory" },
  { path: "src/observability", type: "dir" as const, description: "Observability directory" },
  { path: "test", type: "dir" as const, description: "Test directory" },
] as const;

/**
 * ValidationSuite class - Runs comprehensive production readiness checks
 */
export class ValidationSuite {
  private results: ValidationResult[] = [];
  private options: ValidationOptions;
  private projectRoot: string;

  constructor(options: ValidationOptions = {}, projectRoot: string = process.cwd()) {
    this.options = options;
    this.projectRoot = projectRoot;
  }

  /**
   * Run all validation checks
   */
  async runAllChecks(): Promise<ValidationReport> {
    console.log("🔍 Running production validation suite...\n");

    // Run all check categories
    await this.checkDependencies();
    await this.checkConfiguration();
    await this.checkFilesystem();
    await this.checkSecurity();

    if (!this.options.skipServices) {
      await this.checkServices();
    }

    // Generate report
    return this.generateReport();
  }

  /**
   * Check system dependencies
   */
  private async checkDependencies(): Promise<void> {
    console.log("📦 Checking dependencies...");

    for (const dep of REQUIRED_DEPENDENCIES) {
      try {
        const proc = Bun.spawn(dep.command.split(" "), {
          stdout: "pipe",
          stderr: "pipe",
        });

        const output = await new Response(proc.stdout).text();
        await proc.exited;

        const version = output.trim().replace(/^v/, "");
        const meetsMinVersion = this.compareVersions(version, dep.minVersion) >= 0;

        this.addResult({
          category: "dependencies",
          name: `${dep.name} version check`,
          status: meetsMinVersion ? "pass" : "fail",
          message: meetsMinVersion
            ? `${dep.name} ${version} installed (>= ${dep.minVersion})`
            : `${dep.name} ${version} is below minimum version ${dep.minVersion}`,
          details: version,
        });
      } catch (error) {
        this.addResult({
          category: "dependencies",
          name: `${dep.name} availability`,
          status: "fail",
          message: `${dep.name} not found or not executable`,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check package.json dependencies
    await this.checkPackageDependencies();
  }

  /**
   * Check package.json dependencies
   */
  private async checkPackageDependencies(): Promise<void> {
    const packageJsonPath = join(this.projectRoot, "package.json");

    try {
      const content = await readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(content);

      const criticalDeps = [
        "@anthropic-ai/sdk",
        "zod",
        "pino",
        "@opentelemetry/api",
      ];

      for (const dep of criticalDeps) {
        const hasInDeps = packageJson.dependencies?.[dep];
        const hasInDevDeps = packageJson.devDependencies?.[dep];

        if (hasInDeps || hasInDevDeps) {
          this.addResult({
            category: "dependencies",
            name: `${dep} package`,
            status: "pass",
            message: `${dep} is installed`,
            details: hasInDeps || hasInDevDeps,
          });
        } else {
          this.addResult({
            category: "dependencies",
            name: `${dep} package`,
            status: "fail",
            message: `${dep} is missing from package.json`,
            fixable: true,
          });
        }
      }
    } catch (error) {
      this.addResult({
        category: "dependencies",
        name: "package.json validation",
        status: "fail",
        message: "Failed to read or parse package.json",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check configuration
   */
  private async checkConfiguration(): Promise<void> {
    console.log("⚙️  Checking configuration...");

    // Check environment variables
    for (const envVar of REQUIRED_ENV_VARS) {
      const value = process.env[envVar.name];

      if (!value && envVar.required) {
        this.addResult({
          category: "configuration",
          name: `${envVar.name} environment variable`,
          status: "fail",
          message: `Required environment variable ${envVar.name} is not set`,
          details: envVar.description,
          fixable: true,
        });
      } else if (!value) {
        this.addResult({
          category: "configuration",
          name: `${envVar.name} environment variable`,
          status: "warn",
          message: `Optional environment variable ${envVar.name} is not set, using defaults`,
          details: envVar.description,
        });
      } else {
        this.addResult({
          category: "configuration",
          name: `${envVar.name} environment variable`,
          status: "pass",
          message: `${envVar.name} is configured`,
          details: envVar.name === "RAD_API_KEY" ? "[REDACTED]" : value,
        });
      }
    }

    // Validate configuration schema
    await this.validateConfigSchema();
  }

  /**
   * Validate configuration using schema
   */
  private async validateConfigSchema(): Promise<void> {
    try {
      const { loadConfigSafe } = await import("../src/config/schema.js");
      const result = loadConfigSafe();

      if (result.success) {
        this.addResult({
          category: "configuration",
          name: "Configuration schema validation",
          status: "pass",
          message: "Configuration passes schema validation",
          details: JSON.stringify(result.data, null, 2),
        });

        // Additional checks for production
        if (result.data.useRealAgents && !result.data.apiKey) {
          this.addResult({
            category: "configuration",
            name: "API key requirement",
            status: "fail",
            message: "useRealAgents is true but apiKey is not set",
            details: "Set RAD_API_KEY environment variable",
            fixable: true,
          });
        }
      } else {
        // Type narrowing: if !result.success, result has error property
        const failedResult = result as { success: false; error: { issues: Array<{ message: string }> } };
        this.addResult({
          category: "configuration",
          name: "Configuration schema validation",
          status: "fail",
          message: "Configuration validation failed",
          details: failedResult.error.issues.map((i) => i.message).join(", "),
          fixable: true,
        });
      }
    } catch (error) {
      this.addResult({
        category: "configuration",
        name: "Configuration schema validation",
        status: "fail",
        message: "Failed to load configuration schema",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check filesystem structure
   */
  private async checkFilesystem(): Promise<void> {
    console.log("📁 Checking filesystem structure...");

    for (const item of REQUIRED_PATHS) {
      const fullPath = join(this.projectRoot, item.path);
      const exists = existsSync(fullPath);

      if (!exists) {
        this.addResult({
          category: "filesystem",
          name: `${item.path} ${item.type}`,
          status: "fail",
          message: `Required ${item.type} ${item.path} does not exist`,
          details: item.description,
          fixable: item.type === "dir",
        });
        continue;
      }

      // Check type matches
      const stats = statSync(fullPath);
      const isCorrectType =
        (item.type === "file" && stats.isFile()) || (item.type === "dir" && stats.isDirectory());

      if (!isCorrectType) {
        this.addResult({
          category: "filesystem",
          name: `${item.path} ${item.type}`,
          status: "fail",
          message: `${item.path} exists but is not a ${item.type}`,
          details: item.description,
        });
        continue;
      }

      // Check permissions
      try {
        accessSync(fullPath, constants.R_OK);
        this.addResult({
          category: "filesystem",
          name: `${item.path} ${item.type}`,
          status: "pass",
          message: `${item.path} exists and is readable`,
          details: item.description,
        });
      } catch {
        this.addResult({
          category: "filesystem",
          name: `${item.path} ${item.type}`,
          status: "fail",
          message: `${item.path} exists but is not readable`,
          details: item.description,
          fixable: true,
        });
      }
    }
  }

  /**
   * Check security settings
   */
  private async checkSecurity(): Promise<void> {
    console.log("🔒 Checking security settings...");

    // Check for sensitive files in production
    const sensitiveFiles = [".env", ".env.local", ".env.production"];
    for (const file of sensitiveFiles) {
      const fullPath = join(this.projectRoot, file);
      if (existsSync(fullPath)) {
        this.addResult({
          category: "security",
          name: `${file} file check`,
          status: "warn",
          message: `Sensitive file ${file} found - ensure it's in .gitignore`,
          details: "Environment files should not be committed to version control",
        });
      }
    }

    // Check API key format if present
    const apiKey = process.env.RAD_API_KEY;
    if (apiKey) {
      if (!apiKey.startsWith("sk-ant-")) {
        this.addResult({
          category: "security",
          name: "API key format",
          status: "warn",
          message: "RAD_API_KEY does not match expected Anthropic format",
          details: "Expected format: sk-ant-...",
        });
      } else {
        this.addResult({
          category: "security",
          name: "API key format",
          status: "pass",
          message: "API key format is valid",
        });
      }

      if (apiKey.length < 40) {
        this.addResult({
          category: "security",
          name: "API key length",
          status: "warn",
          message: "API key appears to be too short",
          details: "Anthropic API keys are typically 95+ characters",
        });
      }
    }

    // Check file permissions on critical files
    await this.checkFilePermissions();
  }

  /**
   * Check file permissions
   */
  private async checkFilePermissions(): Promise<void> {
    const criticalFiles = ["package.json", "tsconfig.json"];

    for (const file of criticalFiles) {
      const fullPath = join(this.projectRoot, file);
      if (!existsSync(fullPath)) continue;

      try {
        const stats = statSync(fullPath);
        const mode = stats.mode & 0o777;

        // Check if world-writable
        if (mode & 0o002) {
          this.addResult({
            category: "security",
            name: `${file} permissions`,
            status: "warn",
            message: `${file} is world-writable`,
            details: `Current mode: ${mode.toString(8)}`,
            fixable: true,
          });
        } else {
          this.addResult({
            category: "security",
            name: `${file} permissions`,
            status: "pass",
            message: `${file} has appropriate permissions`,
          });
        }
      } catch (error) {
        this.addResult({
          category: "security",
          name: `${file} permissions`,
          status: "fail",
          message: `Failed to check permissions for ${file}`,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Check service connectivity
   */
  private async checkServices(): Promise<void> {
    console.log("🌐 Checking service connectivity...");

    // Check if services are running (basic check)
    const services = [
      { name: "rad-engineer", url: "http://localhost:3000/health", required: false },
      { name: "prometheus", url: "http://localhost:9090/-/healthy", required: false },
      { name: "grafana", url: "http://localhost:3001/api/health", required: false },
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          this.addResult({
            category: "services",
            name: `${service.name} health check`,
            status: "pass",
            message: `${service.name} is responding`,
            details: service.url,
          });
        } else {
          this.addResult({
            category: "services",
            name: `${service.name} health check`,
            status: service.required ? "fail" : "warn",
            message: `${service.name} returned status ${response.status}`,
            details: service.url,
          });
        }
      } catch (error) {
        this.addResult({
          category: "services",
          name: `${service.name} health check`,
          status: service.required ? "fail" : "warn",
          message: `${service.name} is not accessible`,
          details: `${service.url} - ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  /**
   * Add validation result
   */
  private addResult(result: ValidationResult): void {
    this.results.push(result);
    if (this.options.verbose) {
      const icon = result.status === "pass" ? "✓" : result.status === "warn" ? "⚠" : "✗";
      console.log(`  ${icon} ${result.name}: ${result.message}`);
    }
  }

  /**
   * Generate validation report
   */
  private generateReport(): ValidationReport {
    const passed = this.results.filter((r) => r.status === "pass").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const warnings = this.results.filter((r) => r.status === "warn").length;

    const overallStatus = failed > 0 ? "fail" : warnings > 0 ? "warn" : "pass";

    const summary = [
      `Total checks: ${this.results.length}`,
      `Passed: ${passed}`,
      `Failed: ${failed}`,
      `Warnings: ${warnings}`,
      "",
      overallStatus === "pass"
        ? "✓ System is ready for production"
        : overallStatus === "warn"
        ? "⚠ System has warnings but may be production-ready"
        : "✗ System is NOT ready for production",
    ].join("\n");

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      totalChecks: this.results.length,
      passed,
      failed,
      warnings,
      results: this.results,
      summary,
    };
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map((n) => parseInt(n) || 0);
    const parts2 = v2.split(".").map((n) => parseInt(n) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}
