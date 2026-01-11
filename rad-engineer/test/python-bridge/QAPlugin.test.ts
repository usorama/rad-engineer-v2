/**
 * Tests for QA Plugin Integration
 *
 * Coverage requirements:
 * - QA validation: typecheck, lint, test, quality gates
 * - Recurring issue detection: similarity matching, threshold
 * - Integration with TaskAPIHandler: post-execution validation
 * - Error handling: invalid inputs, plugin failures
 * - Edge cases: no issues, all warnings, mixed severity
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { QAPluginIntegration } from "@/python-bridge/QAPluginIntegration.js";
import type {
  QAValidationInput,
  QAValidationResult,
  QAIssue,
  QAIterationRecord,
  RecurringIssueCheckInput,
} from "@/python-bridge/QAPluginIntegration.js";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TEST_PROJECT_DIR = join(process.cwd(), "test-qa-project");
const QA_PLUGIN_PATH = join(process.cwd(), "python-plugins", "qa_loop.py");

/**
 * Setup test project directory
 */
function setupTestProject() {
  if (!existsSync(TEST_PROJECT_DIR)) {
    mkdirSync(TEST_PROJECT_DIR, { recursive: true });
  }

  // Create package.json with test scripts
  const packageJson = {
    name: "test-qa-project",
    version: "1.0.0",
    scripts: {
      typecheck: "echo 'TypeScript check passed'",
      lint: "echo 'Lint check passed'",
      test: "echo 'All tests passed'",
    },
  };
  writeFileSync(
    join(TEST_PROJECT_DIR, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Create a test TypeScript file
  const testFile = `
// Test file
export function add(a: number, b: number): number {
  return a + b;
}
`;
  writeFileSync(join(TEST_PROJECT_DIR, "test.ts"), testFile);
}

/**
 * Setup test project with failing typecheck
 */
function setupFailingTypecheckProject() {
  setupTestProject();

  // Override typecheck script to fail
  const packageJson = JSON.parse(
    readFileSync(join(TEST_PROJECT_DIR, "package.json"), "utf-8")
  );
  packageJson.scripts.typecheck = "exit 1";
  writeFileSync(
    join(TEST_PROJECT_DIR, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
}

/**
 * Setup test project with quality issues
 */
function setupQualityIssuesProject() {
  setupTestProject();

  // Create file with quality issues
  const fileWithIssues = `
export function badCode(): any {
  console.log("Debug log"); // Should be removed
  // TODO: Fix this function
  return null;
}
`;
  writeFileSync(join(TEST_PROJECT_DIR, "quality.ts"), fileWithIssues);
}

/**
 * Cleanup test project
 */
function cleanupTestProject() {
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
}

/**
 * Helper to read file
 */
function readFileSync(path: string, encoding: string) {
  const fs = require("fs");
  return fs.readFileSync(path, encoding);
}

describe("QAPluginIntegration", () => {
  let qaPlugin: QAPluginIntegration;

  beforeAll(() => {
    // Verify QA plugin exists
    if (!existsSync(QA_PLUGIN_PATH)) {
      throw new Error(`QA plugin not found at ${QA_PLUGIN_PATH}`);
    }
  });

  beforeEach(() => {
    cleanupTestProject();
    qaPlugin = new QAPluginIntegration(QA_PLUGIN_PATH, 60000); // 60s timeout
  });

  afterEach(async () => {
    await qaPlugin.shutdown();
    cleanupTestProject();
  });

  describe("constructor", () => {
    it("should create QA plugin integration with default path", () => {
      const qa = new QAPluginIntegration();
      expect(qa).toBeDefined();
      expect(qa.getHealth).toBeDefined();
    });

    it("should create QA plugin integration with custom path", () => {
      const qa = new QAPluginIntegration(QA_PLUGIN_PATH);
      expect(qa).toBeDefined();
    });

    it("should create QA plugin integration with custom timeout", () => {
      const qa = new QAPluginIntegration(QA_PLUGIN_PATH, 120000);
      expect(qa).toBeDefined();
    });
  });

  describe("validateTask()", () => {
    it("should validate task successfully when all checks pass", async () => {
      setupTestProject();

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["test.ts"],
        task_description: "Add function",
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("approved");
      expect(result?.summary).toContain("passed");
      expect(result?.quality_gates).toBeDefined();
      expect(result?.quality_gates?.typecheck.passed).toBe(true);
      expect(result?.quality_gates?.lint.passed).toBe(true);
      expect(result?.quality_gates?.test.passed).toBe(true);
    });

    it("should detect typecheck failures", async () => {
      setupFailingTypecheckProject();

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["test.ts"],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("rejected");
      expect(result?.quality_gates?.typecheck.passed).toBe(false);
      expect(result?.issues.length).toBeGreaterThan(0);
      expect(result?.issues.some(i => i.type === "typecheck")).toBe(true);
    });

    it("should detect code quality issues", async () => {
      setupQualityIssuesProject();

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["quality.ts"],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      expect(result?.issues.length).toBeGreaterThan(0);

      // Check for expected quality issues
      const qualityIssues = result?.issues.filter(i => i.type === "quality");
      expect(qualityIssues).toBeDefined();
      expect(qualityIssues!.length).toBeGreaterThan(0);

      // Should detect: any type, console.log, TODO
      const hasAnyTypeIssue = qualityIssues!.some(i =>
        i.title.includes("Any type")
      );
      const hasConsoleLogIssue = qualityIssues!.some(i =>
        i.title.includes("Console.log")
      );
      const hasTodoIssue = qualityIssues!.some(i =>
        i.title.includes("TODO")
      );

      expect(hasAnyTypeIssue || hasConsoleLogIssue || hasTodoIssue).toBe(true);
    });

    it("should detect recurring issues", async () => {
      setupTestProject();

      const recurringIssue: QAIssue = {
        type: "typecheck",
        severity: "error",
        title: "Type error in feature.ts",
        description: "Property 'x' does not exist",
        file: "feature.ts",
        line: 10,
      };

      const iteration_history: QAIterationRecord[] = [
        {
          iteration: 1,
          status: "rejected",
          timestamp: new Date().toISOString(),
          issues: [recurringIssue],
        },
        {
          iteration: 2,
          status: "rejected",
          timestamp: new Date().toISOString(),
          issues: [{ ...recurringIssue }], // Same issue again
        },
        {
          iteration: 3,
          status: "rejected",
          timestamp: new Date().toISOString(),
          issues: [{ ...recurringIssue }], // Third time - should be flagged
        },
      ];

      // Override typecheck to simulate the recurring issue
      const packageJson = JSON.parse(
        readFileSync(join(TEST_PROJECT_DIR, "package.json"), "utf-8")
      );
      packageJson.scripts.typecheck = "echo 'error TS2339: Property x does not exist' && exit 1";
      writeFileSync(
        join(TEST_PROJECT_DIR, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["test.ts"],
        iteration_history,
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("rejected");
      expect(result?.recurring_issues.length).toBeGreaterThan(0);
      expect(result?.summary).toContain("Recurring issues");
    });

    it("should handle invalid project directory", async () => {
      const input: QAValidationInput = {
        project_dir: "/nonexistent/directory",
        files_modified: [],
        iteration_history: [],
      };

      await expect(qaPlugin.validateTask(input)).rejects.toThrow();
    });

    it("should handle empty files_modified list", async () => {
      setupTestProject();

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: [],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      // Should still run quality gates even with no files
      expect(result?.quality_gates).toBeDefined();
    });

    it("should approve with warnings only (no errors)", async () => {
      setupQualityIssuesProject();

      // Ensure quality checks pass (only warnings)
      const packageJson = JSON.parse(
        readFileSync(join(TEST_PROJECT_DIR, "package.json"), "utf-8")
      );
      packageJson.scripts.typecheck = "exit 0";
      packageJson.scripts.lint = "exit 0";
      packageJson.scripts.test = "exit 0";
      writeFileSync(
        join(TEST_PROJECT_DIR, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["quality.ts"],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("approved");
      expect(result?.summary).toContain("warning");
      expect(result?.issues.some(i => i.severity === "warning")).toBe(true);
    });
  });

  describe("checkRecurringIssues()", () => {
    it("should detect recurring issues", async () => {
      const issue: QAIssue = {
        type: "typecheck",
        severity: "error",
        title: "Type error",
        description: "Property does not exist",
        file: "test.ts",
        line: 10,
      };

      const input: RecurringIssueCheckInput = {
        current_issues: [issue],
        iteration_history: [
          {
            iteration: 1,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [{ ...issue }],
          },
          {
            iteration: 2,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [{ ...issue }],
          },
        ],
      };

      const result = await qaPlugin.checkRecurringIssues(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("recurring_detected");
      expect(result?.recurring_issues.length).toBeGreaterThan(0);
      expect(result?.recurring_issues[0].occurrence_count).toBeGreaterThanOrEqual(3);
    });

    it("should not detect recurring issues when count is below threshold", async () => {
      const issue: QAIssue = {
        type: "lint",
        severity: "warning",
        title: "Lint warning",
        description: "Unused variable",
        file: "test.ts",
      };

      const input: RecurringIssueCheckInput = {
        current_issues: [issue],
        iteration_history: [
          {
            iteration: 1,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [{ ...issue }],
          },
        ],
      };

      const result = await qaPlugin.checkRecurringIssues(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("no_recurring");
      expect(result?.recurring_issues.length).toBe(0);
    });

    it("should detect similar issues (not exact matches)", async () => {
      const issue1: QAIssue = {
        type: "typecheck",
        severity: "error",
        title: "Error: Property 'x' does not exist",
        description: "Full description",
        file: "feature.ts",
        line: 10,
      };

      const issue2: QAIssue = {
        type: "typecheck",
        severity: "error",
        title: "Property 'x' does not exist", // Slightly different
        description: "Full description",
        file: "feature.ts",
        line: 10,
      };

      const input: RecurringIssueCheckInput = {
        current_issues: [issue1],
        iteration_history: [
          {
            iteration: 1,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [issue2],
          },
          {
            iteration: 2,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [issue2],
          },
        ],
      };

      const result = await qaPlugin.checkRecurringIssues(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("recurring_detected");
      expect(result?.recurring_issues.length).toBeGreaterThan(0);
    });

    it("should handle empty iteration history", async () => {
      const issue: QAIssue = {
        type: "test",
        severity: "error",
        title: "Test failure",
        description: "Expected true but got false",
      };

      const input: RecurringIssueCheckInput = {
        current_issues: [issue],
        iteration_history: [],
      };

      const result = await qaPlugin.checkRecurringIssues(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("no_recurring");
      expect(result?.recurring_issues.length).toBe(0);
    });

    it("should handle multiple different issues", async () => {
      const issue1: QAIssue = {
        type: "typecheck",
        severity: "error",
        title: "Type error A",
        description: "Error A",
        file: "a.ts",
      };

      const issue2: QAIssue = {
        type: "lint",
        severity: "warning",
        title: "Lint warning B",
        description: "Warning B",
        file: "b.ts",
      };

      const input: RecurringIssueCheckInput = {
        current_issues: [issue1, issue2],
        iteration_history: [
          {
            iteration: 1,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [{ ...issue1 }, { ...issue2 }],
          },
          {
            iteration: 2,
            status: "rejected",
            timestamp: new Date().toISOString(),
            issues: [{ ...issue1 }, { ...issue2 }],
          },
        ],
      };

      const result = await qaPlugin.checkRecurringIssues(input);

      expect(result).toBeDefined();
      expect(result?.recurring_issues.length).toBe(2); // Both issues recurring
    });
  });

  describe("getHealth()", () => {
    it("should return health status", () => {
      const health = qaPlugin.getHealth();

      expect(health).toBeDefined();
      expect(health.isRunning).toBeDefined();
    });
  });

  describe("shutdown()", () => {
    it("should shutdown gracefully", async () => {
      await expect(qaPlugin.shutdown()).resolves.toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle very long file paths", async () => {
      setupTestProject();

      const longPath = "a/".repeat(50) + "file.ts";

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: [longPath],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      // Should not crash, even if file doesn't exist
    });

    it("should handle special characters in file paths", async () => {
      setupTestProject();

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["file with spaces.ts", "file-with-dashes.ts"],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
    });

    it("should handle large iteration history", async () => {
      setupTestProject();

      const largeHistory: QAIterationRecord[] = Array.from(
        { length: 100 },
        (_, i) => ({
          iteration: i + 1,
          status: "rejected" as const,
          timestamp: new Date().toISOString(),
          issues: [
            {
              type: "test" as const,
              severity: "error" as const,
              title: `Test failure ${i}`,
              description: `Test ${i} failed`,
            },
          ],
        })
      );

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["test.ts"],
        iteration_history: largeHistory,
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      // Should handle large history without crashing
    });

    it("should handle non-TypeScript files in files_modified", async () => {
      setupTestProject();

      // Create various file types
      writeFileSync(join(TEST_PROJECT_DIR, "readme.md"), "# README");
      writeFileSync(join(TEST_PROJECT_DIR, "config.json"), "{}");
      writeFileSync(join(TEST_PROJECT_DIR, "script.sh"), "#!/bin/bash");

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["readme.md", "config.json", "script.sh", "test.ts"],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      // Should only analyze TypeScript files for quality issues
    });
  });

  describe("error scenarios", () => {
    it("should handle plugin timeout gracefully", async () => {
      setupTestProject();

      // Create plugin with very short timeout
      const shortTimeoutQA = new QAPluginIntegration(QA_PLUGIN_PATH, 100);

      // Override test script to take longer than timeout
      const packageJson = JSON.parse(
        readFileSync(join(TEST_PROJECT_DIR, "package.json"), "utf-8")
      );
      packageJson.scripts.test = "sleep 10 && echo 'done'";
      writeFileSync(
        join(TEST_PROJECT_DIR, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: ["test.ts"],
        iteration_history: [],
      };

      await expect(shortTimeoutQA.validateTask(input)).rejects.toThrow();

      await shortTimeoutQA.shutdown();
    }, 15000);

    it("should handle missing package.json gracefully", async () => {
      // Create project without package.json
      if (!existsSync(TEST_PROJECT_DIR)) {
        mkdirSync(TEST_PROJECT_DIR, { recursive: true });
      }

      const input: QAValidationInput = {
        project_dir: TEST_PROJECT_DIR,
        files_modified: [],
        iteration_history: [],
      };

      const result = await qaPlugin.validateTask(input);

      expect(result).toBeDefined();
      // Quality gates should fail, but plugin shouldn't crash
      expect(result?.status).toBe("rejected");
    });
  });
});
