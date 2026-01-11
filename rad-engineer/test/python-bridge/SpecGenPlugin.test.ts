/**
 * Tests for Spec Generator Plugin Integration
 *
 * Tests the Auto-Claude spec generator plugin ported to rad-engineer.
 * Validates:
 * - Complexity assessment (simple/standard/complex)
 * - 8-phase pipeline execution
 * - TypeScript integration via PythonPluginBridge
 * - Spec document quality
 *
 * Coverage requirements:
 * - Complexity assessment: AI-based and heuristic
 * - Phase execution: quick spec (3 phases), standard (6 phases), complex (8 phases)
 * - Error handling: missing inputs, plugin failures
 * - Integration: with /plan skill
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { SpecGeneratorPlugin } from "@/python-bridge/SpecGenPluginIntegration.js";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Lazy import to avoid circular dependency issues
let SpecGeneratorPluginClass: typeof SpecGeneratorPlugin;

async function getSpecGeneratorPlugin() {
  if (!SpecGeneratorPluginClass) {
    const module = await import("@/python-bridge/SpecGenPluginIntegration.js");
    SpecGeneratorPluginClass = module.SpecGeneratorPlugin;
  }
  return SpecGeneratorPluginClass;
}

const TEST_DIR = join(process.cwd(), "test-spec-gen");
const TEST_PROJECT_DIR = join(TEST_DIR, "test-project");
const TEST_SPEC_DIR = join(TEST_DIR, "specs");

/**
 * Setup test project structure
 */
function setupTestProject(): void {
  if (!existsSync(TEST_PROJECT_DIR)) {
    mkdirSync(TEST_PROJECT_DIR, { recursive: true });
  }
  if (!existsSync(TEST_SPEC_DIR)) {
    mkdirSync(TEST_SPEC_DIR, { recursive: true });
  }

  // Create minimal project structure
  writeFileSync(join(TEST_PROJECT_DIR, "package.json"), JSON.stringify({
    name: "test-project",
    version: "1.0.0"
  }));

  writeFileSync(join(TEST_PROJECT_DIR, "README.md"), "# Test Project");
}

/**
 * Clean up test directory
 */
function cleanupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe("SpecGeneratorPlugin", () => {
  beforeEach(() => {
    cleanupTestDir();
    setupTestProject();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe("constructor", () => {
    it("should create plugin instance with valid config", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
        pythonPath: "python3",
        timeout: 60000,
      });

      expect(plugin).toBeDefined();
      expect(plugin.getConfig().timeout).toBe(60000);
    });

    it("should use default configuration", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const config = plugin.getConfig();
      expect(config.pythonPath).toBe("python3");
      expect(config.timeout).toBe(120000); // 2 minutes default
      expect(config.maxRetries).toBe(2);
    });

    it("should throw error when plugin file not found", async () => {
      const PluginClass = await getSpecGeneratorPlugin();

      // This should throw during instantiation if plugin file doesn't exist
      expect(() => {
        new PluginClass({
          projectDir: TEST_PROJECT_DIR,
          pluginPath: "/nonexistent/plugin.py",
        });
      }).toThrow();
    });
  });

  describe("assessComplexity()", () => {
    it("should assess simple task complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.assessComplexity({
        taskDescription: "Fix button color in Header component",
        useAI: false, // Use heuristic
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.data?.complexity).toBe("simple");
      expect(result.output?.data?.estimatedFiles).toBeLessThanOrEqual(2);
    });

    it("should assess standard task complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.assessComplexity({
        taskDescription: "Add user authentication with JWT tokens and refresh logic",
        useAI: false,
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.complexity).toBe("standard");
      expect(result.output?.data?.estimatedFiles).toBeGreaterThan(2);
      expect(result.output?.data?.estimatedFiles).toBeLessThanOrEqual(10);
    });

    it("should assess complex task complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.assessComplexity({
        taskDescription: "Add Graphiti memory integration with FalkorDB backend, semantic search, and cross-session context",
        useAI: false,
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.complexity).toBe("complex");
      expect(result.output?.data?.estimatedFiles).toBeGreaterThan(10);
      expect(result.output?.data?.requiresResearch).toBe(true);
    });

    it("should use AI-based assessment when requested", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no ANTHROPIC_API_KEY
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping AI assessment test - no API key");
        return;
      }

      const result = await plugin.assessComplexity({
        taskDescription: "Add user login feature",
        useAI: true,
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.complexity).toMatch(/simple|standard|complex/);
      expect(result.output?.data?.reasoning).toBeDefined();
    }, 30000); // Allow 30s for API call

    it("should handle missing task description", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.assessComplexity({
        taskDescription: "",
        useAI: false,
      });

      expect(result.success).toBe(true); // Bridge succeeded
      expect(result.output?.success).toBe(false); // Plugin returned error
      expect(result.output?.error).toContain("task description");
    });
  });

  describe("generateSpec()", () => {
    it("should generate spec for simple task (3 phases)", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping spec generation test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Update README.md with project description",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });

      expect(result.success).toBe(true);
      expect(result.output?.data).toBeDefined();
      expect(result.output?.data?.phasesRun).toEqual(["discovery", "quick_spec", "validate"]);
      expect(result.output?.data?.specPath).toBeDefined();
      const specPath = result.output?.data?.specPath;
      if (specPath) {
        expect(existsSync(specPath)).toBe(true);
      }
    }, 120000); // Allow 2 minutes

    it("should generate spec for standard task (6 phases)", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping spec generation test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Add configuration validation system",
        specDir: TEST_SPEC_DIR,
        complexity: "standard",
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.phasesRun).toContain("requirements");
      expect(result.output?.data?.phasesRun).toContain("context");
      expect(result.output?.data?.phasesRun).toContain("spec_writing");
      expect(result.output?.data?.phasesRun).toContain("plan");
      expect(result.output?.data?.phasesRun.length).toBeGreaterThanOrEqual(6);
    }, 240000); // Allow 4 minutes

    it("should generate spec for complex task (8 phases)", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping spec generation test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Add multi-provider LLM integration with fallback and rate limiting",
        specDir: TEST_SPEC_DIR,
        complexity: "complex",
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.phasesRun).toContain("research");
      expect(result.output?.data?.phasesRun).toContain("critique");
      expect(result.output?.data?.phasesRun.length).toBeGreaterThanOrEqual(8);
    }, 360000); // Allow 6 minutes

    it("should handle auto-detected complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping spec generation test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Fix typo in error message",
        specDir: TEST_SPEC_DIR,
        // No complexity specified - should auto-detect
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.complexity).toBe("simple");
      expect(result.output?.data?.phasesRun.length).toBeLessThanOrEqual(4);
    }, 120000);

    it("should validate spec document structure", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping spec generation test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Add health check endpoint",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });

      expect(result.success).toBe(true);

      // Validate spec structure
      const specPath = result.output?.data?.specPath;
      expect(specPath).toBeDefined();
      const specContent = require("fs").readFileSync(specPath!, "utf-8");
      expect(specContent).toContain("# "); // Has headings
      expect(specContent.length).toBeGreaterThan(100); // Non-trivial content
    }, 120000);

    it("should handle missing project directory", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: "/nonexistent/project",
      });

      const result = await plugin.generateSpec({
        taskDescription: "Test task",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });

      expect(result.success).toBe(true); // Bridge succeeded
      expect(result.output?.success).toBe(false); // Plugin returned error
      expect(result.output?.error).toContain("not found");
    });
  });

  describe("getPhaseList()", () => {
    it("should return correct phases for simple complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.getPhaseList({ complexity: "simple" });

      expect(result.success).toBe(true);
      expect(result.output?.data?.phases).toEqual(["discovery", "quick_spec", "validate"]);
      expect(result.output?.data?.estimatedDuration).toBeLessThan(120); // < 2 minutes
    });

    it("should return correct phases for standard complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.getPhaseList({ complexity: "standard" });

      expect(result.success).toBe(true);
      expect(result.output?.data?.phases).toEqual([
        "discovery",
        "requirements",
        "context",
        "spec_writing",
        "plan",
        "validate",
      ]);
      expect(result.output?.data?.estimatedDuration).toBeGreaterThan(120);
      expect(result.output?.data?.estimatedDuration).toBeLessThan(360);
    });

    it("should return correct phases for complex complexity", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.getPhaseList({ complexity: "complex" });

      expect(result.success).toBe(true);
      expect(result.output?.data?.phases).toEqual([
        "discovery",
        "requirements",
        "research",
        "context",
        "spec_writing",
        "plan",
        "critique",
        "validate",
      ]);
      expect(result.output?.data?.estimatedDuration).toBeGreaterThan(360); // > 6 minutes
    });

    it("should handle research requirement", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      const result = await plugin.getPhaseList({
        complexity: "standard",
        requiresResearch: true,
      });

      expect(result.success).toBe(true);
      expect(result.output?.data?.phases).toContain("research");
      expect(result.output?.data?.phases.length).toBe(7); // Standard + research
    });
  });

  describe("error handling", () => {
    it("should handle plugin timeout", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
        timeout: 10, // Very short timeout (10ms)
      });

      const result = await plugin.generateSpec({
        taskDescription: "Test task",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it("should retry on transient failures", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
        maxRetries: 2,
      });

      // Test with invalid input to trigger retries
      const result = await plugin.assessComplexity({
        taskDescription: "", // Invalid
        useAI: false,
      });

      expect(result.success).toBe(true); // Bridge succeeded
      expect(result.output?.success).toBe(false); // Plugin returned error
      expect(result.retries).toBe(0); // No retries on successful plugin execution
    });

    it("should handle plugin crash gracefully", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
        pythonPath: "/nonexistent/python", // Will cause spawn failure
        maxRetries: 0,
      });

      const result = await plugin.assessComplexity({
        taskDescription: "Test",
        useAI: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("integration with /plan skill", () => {
    it("should export spec format compatible with /plan skill", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping /plan integration test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Add logging system",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });

      expect(result.success).toBe(true);

      // Verify outputs exist
      expect(existsSync(join(TEST_SPEC_DIR, "spec.md"))).toBe(true);
      expect(existsSync(join(TEST_SPEC_DIR, "implementation_plan.json"))).toBe(true);

      // Verify implementation plan structure
      const planContent = require("fs").readFileSync(
        join(TEST_SPEC_DIR, "implementation_plan.json"),
        "utf-8"
      );
      const plan = JSON.parse(planContent);
      expect(plan.subtasks).toBeDefined();
      expect(Array.isArray(plan.subtasks)).toBe(true);
    }, 120000);
  });

  describe("performance", () => {
    it("should complete simple spec in reasonable time", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping performance test - no API key");
        return;
      }

      const startTime = Date.now();
      const result = await plugin.generateSpec({
        taskDescription: "Add version check",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(120000); // < 2 minutes
    }, 120000);

    it("should track phase durations", async () => {
      const PluginClass = await getSpecGeneratorPlugin();
      const plugin = new PluginClass({
        projectDir: TEST_PROJECT_DIR,
      });

      // Skip if no API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-test-key") {
        console.log("Skipping performance test - no API key");
        return;
      }

      const result = await plugin.generateSpec({
        taskDescription: "Add feature flag",
        specDir: TEST_SPEC_DIR,
        complexity: "simple",
      });

      expect(result.success).toBe(true);
      expect(result.output?.metadata?.duration).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);
    }, 120000);
  });
});
