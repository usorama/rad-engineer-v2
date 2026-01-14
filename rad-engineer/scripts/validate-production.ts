#!/usr/bin/env bun
/**
 * Production Validation Script
 *
 * Validates system readiness for production deployment.
 * Runs comprehensive checks and generates reports.
 *
 * Usage:
 *   bun run scripts/validate-production.ts [options]
 *
 * Options:
 *   --fix            Attempt to auto-fix fixable issues
 *   --verbose        Show detailed output during checks
 *   --skip-services  Skip service connectivity checks
 *   --json           Output report as JSON
 *   --help           Show this help message
 */

import { ValidationSuite, type ValidationReport } from "./ValidationSuite";
import { writeFile } from "fs/promises";
import { join } from "path";

/**
 * Parse command-line arguments
 */
function parseArgs(): {
  fix: boolean;
  verbose: boolean;
  skipServices: boolean;
  json: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  return {
    fix: args.includes("--fix"),
    verbose: args.includes("--verbose"),
    skipServices: args.includes("--skip-services"),
    json: args.includes("--json"),
    help: args.includes("--help"),
  };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Production Validation Script

Validates system readiness for production deployment.

Usage:
  bun run scripts/validate-production.ts [options]

Options:
  --fix            Attempt to auto-fix fixable issues
  --verbose        Show detailed output during checks
  --skip-services  Skip service connectivity checks
  --json           Output report as JSON
  --help           Show this help message

Examples:
  # Basic validation
  bun run scripts/validate-production.ts

  # Verbose output with auto-fix
  bun run scripts/validate-production.ts --verbose --fix

  # Skip service checks (useful in CI)
  bun run scripts/validate-production.ts --skip-services

  # Generate JSON report
  bun run scripts/validate-production.ts --json > report.json
`);
}

/**
 * Format report for human reading
 */
function formatReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("PRODUCTION VALIDATION REPORT");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Overall Status: ${getStatusIcon(report.overallStatus)} ${report.overallStatus.toUpperCase()}`);
  lines.push("");
  lines.push(`Total Checks: ${report.totalChecks}`);
  lines.push(`✓ Passed: ${report.passed}`);
  lines.push(`✗ Failed: ${report.failed}`);
  lines.push(`⚠ Warnings: ${report.warnings}`);
  lines.push("");

  // Group by category
  const categories = ["dependencies", "configuration", "services", "security", "filesystem"] as const;

  for (const category of categories) {
    const categoryResults = report.results.filter((r) => r.category === category);
    if (categoryResults.length === 0) continue;

    lines.push("-".repeat(60));
    lines.push(`${getCategoryIcon(category)} ${category.toUpperCase()}`);
    lines.push("-".repeat(60));
    lines.push("");

    for (const result of categoryResults) {
      lines.push(`${getStatusIcon(result.status)} ${result.name}`);
      lines.push(`   ${result.message}`);
      if (result.details) {
        lines.push(`   Details: ${result.details}`);
      }
      if (result.fixable) {
        lines.push(`   💡 This issue may be auto-fixable with --fix flag`);
      }
      lines.push("");
    }
  }

  lines.push("=".repeat(60));
  lines.push("SUMMARY");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(report.summary);
  lines.push("");

  return lines.join("\n");
}

/**
 * Get status icon
 */
function getStatusIcon(status: "pass" | "fail" | "warn"): string {
  switch (status) {
    case "pass":
      return "✓";
    case "fail":
      return "✗";
    case "warn":
      return "⚠";
  }
}

/**
 * Get category icon
 */
function getCategoryIcon(
  category: "dependencies" | "configuration" | "services" | "security" | "filesystem"
): string {
  switch (category) {
    case "dependencies":
      return "📦";
    case "configuration":
      return "⚙️";
    case "services":
      return "🌐";
    case "security":
      return "🔒";
    case "filesystem":
      return "📁";
  }
}

/**
 * Save report to file
 */
async function saveReport(report: ValidationReport, format: "json" | "text"): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `validation-report-${timestamp}.${format === "json" ? "json" : "txt"}`;
  const filepath = join(process.cwd(), "validation-reports", filename);

  const content = format === "json" ? JSON.stringify(report, null, 2) : formatReport(report);

  try {
    // Create directory if it doesn't exist
    await Bun.write(filepath, content);
    console.log(`\n📄 Report saved to: ${filepath}`);
  } catch (error) {
    console.error(`Failed to save report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("RAD ENGINEER - PRODUCTION VALIDATION");
  console.log("=".repeat(60));
  console.log("");

  // Run validation suite
  const suite = new ValidationSuite(
    {
      fix: args.fix,
      verbose: args.verbose,
      skipServices: args.skipServices,
    },
    process.cwd()
  );

  const report = await suite.runAllChecks();

  // Output report
  console.log("");
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
  }

  // Save report to file
  await saveReport(report, args.json ? "json" : "text");

  // Exit with appropriate code
  if (report.overallStatus === "fail") {
    console.error("\n❌ Validation failed. System is NOT ready for production.\n");
    process.exit(1);
  } else if (report.overallStatus === "warn") {
    console.warn("\n⚠️  Validation completed with warnings. Review issues before production.\n");
    process.exit(0);
  } else {
    console.log("\n✅ Validation passed. System is ready for production.\n");
    process.exit(0);
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error during validation:");
  console.error(error);
  process.exit(1);
});
