#!/usr/bin/env bun
/**
 * TypeScript-based deployment validation
 * Provides programmatic validation with detailed reporting
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

interface ValidationResult {
  category: string;
  checks: CheckResult[];
  passed: number;
  failed: number;
  warnings: number;
}

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: string;
}

class DeploymentValidator {
  private results: ValidationResult[] = [];
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run all validation checks
   */
  async validate(): Promise<boolean> {
    console.log("🔍 Starting deployment validation...\n");

    this.validateRuntime();
    this.validateDependencies();
    this.validateConfiguration();
    this.validateSourceStructure();
    this.validateTypeScript();
    this.validateTests();
    this.validateCLI();

    this.printReport();

    return this.hasNoFailures();
  }

  /**
   * Validate runtime environment (Bun)
   */
  private validateRuntime(): void {
    const category = "Runtime Environment";
    const checks: CheckResult[] = [];

    // Check Bun installation
    const bunResult = spawnSync("bun", ["--version"], { encoding: "utf-8" });

    if (bunResult.status === 0) {
      const version = bunResult.stdout.trim();
      const [major] = version.split(".").map(Number);

      if (major >= 1) {
        checks.push({
          name: "Bun Installation",
          status: "pass",
          message: `Bun v${version} installed`,
        });
      } else {
        checks.push({
          name: "Bun Version",
          status: "fail",
          message: `Bun v${version} is below required v1.0.0`,
        });
      }
    } else {
      checks.push({
        name: "Bun Installation",
        status: "fail",
        message: "Bun is not installed",
        details: "Install: curl -fsSL https://bun.sh/install | bash",
      });
    }

    this.addResult(category, checks);
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(): void {
    const category = "Dependencies";
    const checks: CheckResult[] = [];

    // Check node_modules
    const nodeModulesPath = join(this.projectRoot, "node_modules");
    if (!existsSync(nodeModulesPath)) {
      checks.push({
        name: "node_modules",
        status: "fail",
        message: "node_modules directory not found",
        details: "Run: bun install",
      });
    } else {
      checks.push({
        name: "node_modules",
        status: "pass",
        message: "Dependencies installed",
      });

      // Validate critical dependencies
      const criticalDeps = [
        "@anthropic-ai/sdk",
        "@opentelemetry/api",
        "js-yaml",
        "pino",
        "zod",
        "typescript",
        "@types/bun",
        "@types/node",
      ];

      criticalDeps.forEach((dep) => {
        const depPath = join(nodeModulesPath, dep);
        if (existsSync(depPath)) {
          checks.push({
            name: dep,
            status: "pass",
            message: "Installed",
          });
        } else {
          checks.push({
            name: dep,
            status: "fail",
            message: "Missing dependency",
            details: "Run: bun install",
          });
        }
      });
    }

    this.addResult(category, checks);
  }

  /**
   * Validate configuration files
   */
  private validateConfiguration(): void {
    const category = "Configuration";
    const checks: CheckResult[] = [];

    // Required config files
    const requiredFiles = [
      { file: "package.json", critical: true },
      { file: "tsconfig.json", critical: true },
      { file: "eslint.config.js", critical: false },
      { file: ".env", critical: false },
    ];

    requiredFiles.forEach(({ file, critical }) => {
      const filePath = join(this.projectRoot, file);
      if (existsSync(filePath)) {
        checks.push({
          name: file,
          status: "pass",
          message: "Found",
        });

        // Validate package.json structure
        if (file === "package.json") {
          try {
            const pkg = JSON.parse(readFileSync(filePath, "utf-8"));

            if (pkg.scripts?.typecheck) {
              checks.push({
                name: "typecheck script",
                status: "pass",
                message: "Configured",
              });
            } else {
              checks.push({
                name: "typecheck script",
                status: "warn",
                message: "Not configured in package.json",
              });
            }

            if (pkg.scripts?.lint) {
              checks.push({
                name: "lint script",
                status: "pass",
                message: "Configured",
              });
            }

            if (pkg.scripts?.test) {
              checks.push({
                name: "test script",
                status: "pass",
                message: "Configured",
              });
            }
          } catch (err) {
            checks.push({
              name: "package.json",
              status: "fail",
              message: "Invalid JSON",
              details: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } else {
        checks.push({
          name: file,
          status: critical ? "fail" : "warn",
          message: critical ? "Required file missing" : "Optional file missing",
        });
      }
    });

    this.addResult(category, checks);
  }

  /**
   * Validate source structure
   */
  private validateSourceStructure(): void {
    const category = "Source Structure";
    const checks: CheckResult[] = [];

    const srcPath = join(this.projectRoot, "src");
    if (!existsSync(srcPath)) {
      checks.push({
        name: "src directory",
        status: "fail",
        message: "Source directory not found",
      });
    } else {
      checks.push({
        name: "src directory",
        status: "pass",
        message: "Found",
      });

      // Check key directories
      const keyDirs = [
        "sdk",
        "config",
        "observability",
        "security",
        "memory",
        "cli",
      ];

      keyDirs.forEach((dir) => {
        const dirPath = join(srcPath, dir);
        if (existsSync(dirPath)) {
          checks.push({
            name: `src/${dir}`,
            status: "pass",
            message: "Found",
          });
        } else {
          checks.push({
            name: `src/${dir}`,
            status: "warn",
            message: "Directory not found (may not be implemented)",
          });
        }
      });
    }

    this.addResult(category, checks);
  }

  /**
   * Validate TypeScript compilation
   */
  private validateTypeScript(): void {
    const category = "TypeScript";
    const checks: CheckResult[] = [];

    const result = spawnSync("bun", ["run", "typecheck"], {
      cwd: this.projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });

    if (result.status === 0) {
      // Check for errors in output
      const hasErrors = result.stdout.includes("error TS");

      if (hasErrors) {
        const errorCount = (result.stdout.match(/error TS/g) || []).length;
        checks.push({
          name: "Type Check",
          status: "fail",
          message: `Found ${errorCount} TypeScript errors`,
          details: "Run: bun run typecheck",
        });
      } else {
        checks.push({
          name: "Type Check",
          status: "pass",
          message: "0 errors found",
        });
      }
    } else {
      checks.push({
        name: "Type Check",
        status: "fail",
        message: "Type check failed",
        details: result.stderr || "Unknown error",
      });
    }

    this.addResult(category, checks);
  }

  /**
   * Validate tests
   */
  private validateTests(): void {
    const category = "Tests";
    const checks: CheckResult[] = [];

    const testPath = join(this.projectRoot, "test");
    if (!existsSync(testPath)) {
      checks.push({
        name: "test directory",
        status: "warn",
        message: "No test directory found",
      });
      this.addResult(category, checks);
      return;
    }

    checks.push({
      name: "test directory",
      status: "pass",
      message: "Found",
    });

    // Run tests
    const result = spawnSync("bun", ["test"], {
      cwd: this.projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });

    if (result.status === 0) {
      // Parse test results
      const passMatch = result.stdout.match(/(\d+) pass/);
      const failMatch = result.stdout.match(/(\d+) fail/);

      if (failMatch) {
        checks.push({
          name: "Test Execution",
          status: "fail",
          message: `${failMatch[1]} tests failed`,
          details: "Run: bun test",
        });
      } else if (passMatch) {
        checks.push({
          name: "Test Execution",
          status: "pass",
          message: `${passMatch[1]} tests passed`,
        });
      } else {
        checks.push({
          name: "Test Execution",
          status: "pass",
          message: "Tests executed successfully",
        });
      }
    } else {
      checks.push({
        name: "Test Execution",
        status: "fail",
        message: "Tests failed to run",
        details: result.stderr || "Run: bun test",
      });
    }

    this.addResult(category, checks);
  }

  /**
   * Validate CLI accessibility
   */
  private validateCLI(): void {
    const category = "CLI";
    const checks: CheckResult[] = [];

    const cliPath = join(this.projectRoot, "src", "cli");
    if (existsSync(cliPath)) {
      checks.push({
        name: "CLI directory",
        status: "pass",
        message: "Found",
      });

      // Check for CLI files
      const hasCliFiles = existsSync(join(cliPath, "index.ts"));
      if (hasCliFiles) {
        checks.push({
          name: "CLI entry point",
          status: "pass",
          message: "CLI accessible via: bun run src/cli/index.ts",
        });
      } else {
        checks.push({
          name: "CLI entry point",
          status: "warn",
          message: "No index.ts found in CLI directory",
        });
      }
    } else {
      checks.push({
        name: "CLI directory",
        status: "warn",
        message: "CLI not found (may not be implemented)",
      });
    }

    this.addResult(category, checks);
  }

  /**
   * Add validation result
   */
  private addResult(category: string, checks: CheckResult[]): void {
    const passed = checks.filter((c) => c.status === "pass").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const warnings = checks.filter((c) => c.status === "warn").length;

    this.results.push({
      category,
      checks,
      passed,
      failed,
      warnings,
    });
  }

  /**
   * Check if validation passed
   */
  private hasNoFailures(): boolean {
    return this.results.every((r) => r.failed === 0);
  }

  /**
   * Print validation report
   */
  private printReport(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 Validation Report");
    console.log("=".repeat(60) + "\n");

    this.results.forEach((result) => {
      console.log(`\n${result.category}:`);
      console.log("-".repeat(40));

      result.checks.forEach((check) => {
        const icon =
          check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
        const color =
          check.status === "pass"
            ? "\x1b[32m"
            : check.status === "fail"
              ? "\x1b[31m"
              : "\x1b[33m";

        console.log(`${color}${icon}\x1b[0m ${check.name}: ${check.message}`);

        if (check.details) {
          console.log(`  └─ ${check.details}`);
        }
      });

      const summary = [];
      if (result.passed > 0) summary.push(`${result.passed} passed`);
      if (result.failed > 0) summary.push(`${result.failed} failed`);
      if (result.warnings > 0) summary.push(`${result.warnings} warnings`);

      console.log(`\n  Summary: ${summary.join(", ")}`);
    });

    // Overall summary
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings, 0);

    console.log("\n" + "=".repeat(60));
    console.log("Overall Summary:");
    console.log(`  ✓ ${totalPassed} checks passed`);
    console.log(`  ✗ ${totalFailed} checks failed`);
    console.log(`  ⚠ ${totalWarnings} warnings`);
    console.log("=".repeat(60) + "\n");

    if (totalFailed === 0) {
      console.log("✅ All critical checks passed!\n");
      console.log("Next steps:");
      console.log("  1. Start development: bun run dev");
      console.log("  2. Run tests: bun test");
      console.log("  3. Build: bun run build\n");
    } else {
      console.log("❌ Validation failed. Please fix the issues above.\n");
    }
  }
}

// Main execution
const projectRoot = process.cwd();
const validator = new DeploymentValidator(projectRoot);

validator
  .validate()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error during validation:", error);
    process.exit(1);
  });
