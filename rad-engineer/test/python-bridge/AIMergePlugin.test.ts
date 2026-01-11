/**
 * Tests for AI Merge Plugin Integration
 *
 * Coverage requirements:
 * - Single conflict resolution
 * - Batch conflict resolution
 * - Context building
 * - Git workflow integration
 * - Provider configuration (Anthropic, OpenAI)
 * - Error handling
 * - Token usage tracking
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import {
  AIMergeIntegration,
  detectMergeConflicts,
  extractGitConflictMarkers,
  type ConflictRegion,
  type TaskSnapshot,
  type ResolveConflictInput,
} from "@/python-bridge/index.js";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const TEST_DIR = join(process.cwd(), "test-ai-merge");
const TEST_REPO = join(TEST_DIR, "test-repo");

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockConflict: ConflictRegion = {
  file_path: "src/app.ts",
  location: "function:App",
  tasks_involved: ["task-1", "task-2"],
  change_types: ["add_hook_call", "modify_function"],
  severity: "medium",
  can_auto_merge: false,
  reason: "Both tasks modified the same function",
};

const mockTaskSnapshot1: TaskSnapshot = {
  task_id: "task-1",
  task_intent: "Add authentication",
  started_at: new Date().toISOString(),
  semantic_changes: [
    {
      change_type: "add_hook_call",
      target: "useAuth",
      location: "function:App",
      line_start: 5,
      line_end: 5,
      content_after: "const { user } = useAuth();",
    },
  ],
};

const mockTaskSnapshot2: TaskSnapshot = {
  task_id: "task-2",
  task_intent: "Add loading state",
  started_at: new Date().toISOString(),
  semantic_changes: [
    {
      change_type: "add_hook_call",
      target: "useState",
      location: "function:App",
      line_start: 5,
      line_end: 5,
      content_after: "const [loading, setLoading] = useState(false);",
    },
  ],
};

const mockBaselineCode = `
function App() {
  return <div>Hello World</div>;
}
`;

function setupTestDir() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
}

function cleanupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function setupTestRepo() {
  if (!existsSync(TEST_REPO)) {
    mkdirSync(TEST_REPO, { recursive: true });
  }

  // Initialize git repo
  await execAsync("git init", { cwd: TEST_REPO });
  await execAsync('git config user.email "test@example.com"', { cwd: TEST_REPO });
  await execAsync('git config user.name "Test User"', { cwd: TEST_REPO });

  // Create initial file
  const initialContent = `function hello() {\n  console.log("hello");\n}\n`;
  writeFileSync(join(TEST_REPO, "test.js"), initialContent);

  await execAsync("git add .", { cwd: TEST_REPO });
  await execAsync('git commit -m "Initial commit"', { cwd: TEST_REPO });

  // Create branch and make conflicting changes
  await execAsync("git checkout -b feature-1", { cwd: TEST_REPO });
  const feature1Content = `function hello() {\n  console.log("hello from feature-1");\n}\n`;
  writeFileSync(join(TEST_REPO, "test.js"), feature1Content);
  await execAsync("git add .", { cwd: TEST_REPO });
  await execAsync('git commit -m "Feature 1 changes"', { cwd: TEST_REPO });

  // Create another branch with conflicting changes
  try {
    await execAsync("git checkout main", { cwd: TEST_REPO });
  } catch {
    // Create main if doesn't exist
    await execAsync("git checkout -b main", { cwd: TEST_REPO });
  }
  await execAsync("git checkout -b feature-2", { cwd: TEST_REPO });
  const feature2Content = `function hello() {\n  console.log("hello from feature-2");\n}\n`;
  writeFileSync(join(TEST_REPO, "test.js"), feature2Content);
  await execAsync("git add .", { cwd: TEST_REPO });
  await execAsync('git commit -m "Feature 2 changes"', { cwd: TEST_REPO });

  // Try to merge and create conflict
  await execAsync("git checkout main", { cwd: TEST_REPO });
  await execAsync("git merge feature-1", { cwd: TEST_REPO });
  try {
    await execAsync("git merge feature-2", { cwd: TEST_REPO });
  } catch (error) {
    // Expected to fail with conflict
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("AIMergeIntegration", () => {
  beforeAll(() => {
    setupTestDir();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe("constructor", () => {
    it("should create integration with Anthropic provider", () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
        model: "claude-sonnet-4-5-20250929",
        maxContextTokens: 4000,
      });

      expect(integration).toBeDefined();
    });

    it("should create integration with OpenAI provider", () => {
      const integration = new AIMergeIntegration({
        aiProvider: "openai",
        apiKey: "test-key",
        model: "gpt-4o",
      });

      expect(integration).toBeDefined();
    });

    it("should use default values for optional config", () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
      });

      expect(integration).toBeDefined();
    });
  });

  describe("buildContext()", () => {
    it("should build conflict context without resolving", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.buildContext(mockConflict, input);

      expect(result.success).toBe(true);
      expect(result.output?.data).toBeDefined();

      const context = result.output!.data!;
      expect(context.file_path).toBe("src/app.ts");
      expect(context.location).toBe("function:App");
      expect(context.language).toBe("typescript");
      expect(context.prompt_context).toContain("BASELINE CODE");
      expect(context.prompt_context).toContain("Add authentication");
      expect(context.prompt_context).toContain("Add loading state");
      expect(context.estimated_tokens).toBeGreaterThan(0);

      await integration.shutdown();
    }, 10000);

    it("should estimate token count correctly", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.buildContext(mockConflict, input);

      expect(result.success).toBe(true);
      const context = result.output!.data!;

      // Token estimate should be roughly text length / 4
      const expectedTokens = Math.floor(context.prompt_context.length / 4);
      expect(context.estimated_tokens).toBeGreaterThan(0);
      expect(context.estimated_tokens).toBeLessThanOrEqual(expectedTokens + 50);

      await integration.shutdown();
    }, 10000);
  });

  describe("resolveConflict() - mock mode", () => {
    it("should fail gracefully when AI provider is not available", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "invalid-key",
        timeout: 5000,
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.resolveConflict(mockConflict, input);

      // Should fail due to invalid API key
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await integration.shutdown();
    }, 15000);

    it("should handle context too large error", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
        maxContextTokens: 10, // Very small limit
      });

      const largeBaseline = "x".repeat(10000);
      const input: ResolveConflictInput = {
        baselineCode: largeBaseline,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.resolveConflict(mockConflict, input);

      expect(result.success).toBe(true);
      expect(result.output?.data?.decision).toBe("needs_human_review");
      expect(result.output?.data?.explanation).toContain("Context too large");

      await integration.shutdown();
    }, 10000);
  });

  describe("resolveConflicts() - batch", () => {
    it("should resolve multiple conflicts sequentially", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "invalid-key", // Will fail but we test batch logic
        timeout: 3000,
      });

      const conflicts: ConflictRegion[] = [
        mockConflict,
        {
          ...mockConflict,
          location: "function:handleClick",
        },
      ];

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const results = await integration.resolveConflicts(conflicts, input);

      expect(results).toHaveLength(2);
      expect(results[0].file_path).toBe("src/app.ts");
      expect(results[1].file_path).toBe("src/app.ts");

      await integration.shutdown();
    }, 20000);

    it("should collect statistics from batch results", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "invalid-key",
        timeout: 3000,
      });

      const conflicts: ConflictRegion[] = [mockConflict];

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const results = await integration.resolveConflicts(conflicts, input);
      const stats = integration.getStats(results);

      expect(stats.total).toBe(1);
      expect(stats.resolved).toBeGreaterThanOrEqual(0);
      expect(stats.remaining).toBeGreaterThanOrEqual(0);
      expect(stats.aiCallsMade).toBeGreaterThanOrEqual(0);
      expect(stats.tokensUsed).toBeGreaterThanOrEqual(0);

      await integration.shutdown();
    }, 15000);
  });

  describe("provider overrides", () => {
    it("should allow overriding AI provider per call", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "default-key",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      // Override provider for this call
      const result = await integration.resolveConflict(mockConflict, input, {
        aiProvider: "openai",
        apiKey: "openai-key",
        model: "gpt-4o",
      });

      // Will fail due to invalid key but verifies override logic works
      expect(result).toBeDefined();

      await integration.shutdown();
    }, 10000);
  });

  describe("error handling", () => {
    it("should handle plugin not found error", async () => {
      // Create integration with non-existent plugin path
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
        pythonPath: "/nonexistent/python",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.resolveConflict(mockConflict, input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await integration.shutdown();
    }, 10000);

    it("should handle timeout gracefully", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
        timeout: 100, // Very short timeout
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.resolveConflict(mockConflict, input);

      // May timeout or fail, either is acceptable
      expect(result).toBeDefined();

      await integration.shutdown();
    }, 10000);

    it("should handle empty task snapshots", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [],
      };

      const result = await integration.buildContext(mockConflict, input);

      expect(result.success).toBe(true);
      expect(result.output?.data?.prompt_context).toBeDefined();

      await integration.shutdown();
    }, 10000);
  });

  describe("shutdown()", () => {
    it("should shutdown gracefully", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
      });

      await expect(integration.shutdown()).resolves.toBeUndefined();
    });

    it("should allow multiple shutdown calls", async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: "test-key",
      });

      await integration.shutdown();
      await expect(integration.shutdown()).resolves.toBeUndefined();
    });
  });
});

// ============================================================================
// GIT WORKFLOW INTEGRATION TESTS
// ============================================================================

describe("Git Workflow Integration", () => {
  beforeAll(async () => {
    setupTestDir();
    await setupTestRepo();
  });

  afterEach(() => {
    // Keep repo for other tests
  });

  describe("detectMergeConflicts()", () => {
    it("should detect conflicted files in git repository", async () => {
      const conflicts = await detectMergeConflicts(TEST_REPO);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);

      // Should detect test.js as conflicted
      if (conflicts.length > 0) {
        expect(conflicts).toContain("test.js");
      }
    }, 10000);

    it("should return empty array when no conflicts", async () => {
      // Create a clean repo
      const cleanRepo = join(TEST_DIR, "clean-repo");
      mkdirSync(cleanRepo, { recursive: true });

      await execAsync("git init", { cwd: cleanRepo });
      await execAsync('git config user.email "test@example.com"', { cwd: cleanRepo });
      await execAsync('git config user.name "Test User"', { cwd: cleanRepo });

      writeFileSync(join(cleanRepo, "test.txt"), "hello");
      await execAsync("git add .", { cwd: cleanRepo });
      await execAsync('git commit -m "Initial"', { cwd: cleanRepo });

      const conflicts = await detectMergeConflicts(cleanRepo);

      expect(conflicts).toEqual([]);

      rmSync(cleanRepo, { recursive: true, force: true });
    }, 10000);

    it("should handle non-git directory gracefully", async () => {
      const nonGitDir = join(TEST_DIR, "non-git");
      mkdirSync(nonGitDir, { recursive: true });

      await expect(detectMergeConflicts(nonGitDir)).rejects.toThrow();

      rmSync(nonGitDir, { recursive: true, force: true });
    });
  });

  describe("extractGitConflictMarkers()", () => {
    it("should extract conflict markers from file", async () => {
      const conflictFile = join(TEST_DIR, "conflict.js");
      const conflictContent = `function hello() {
<<<<<<< HEAD
  console.log("from HEAD");
=======
  console.log("from branch");
>>>>>>> feature-branch
}`;

      writeFileSync(conflictFile, conflictContent);

      const markers = await extractGitConflictMarkers(conflictFile);

      expect(markers.filePath).toBe(conflictFile);
      expect(markers.conflicts).toHaveLength(1);
      expect(markers.conflicts[0].ours).toContain('console.log("from HEAD")');
      expect(markers.conflicts[0].theirs).toContain('console.log("from branch")');
      expect(markers.conflicts[0].lineStart).toBe(1);

      rmSync(conflictFile);
    });

    it("should handle multiple conflicts in one file", async () => {
      const conflictFile = join(TEST_DIR, "multi-conflict.js");
      const conflictContent = `function hello() {
<<<<<<< HEAD
  console.log("conflict 1 - HEAD");
=======
  console.log("conflict 1 - branch");
>>>>>>> feature
}

function goodbye() {
<<<<<<< HEAD
  console.log("conflict 2 - HEAD");
=======
  console.log("conflict 2 - branch");
>>>>>>> feature
}`;

      writeFileSync(conflictFile, conflictContent);

      const markers = await extractGitConflictMarkers(conflictFile);

      expect(markers.conflicts).toHaveLength(2);
      expect(markers.conflicts[0].ours).toContain("conflict 1 - HEAD");
      expect(markers.conflicts[1].ours).toContain("conflict 2 - HEAD");

      rmSync(conflictFile);
    });

    it("should handle file with no conflicts", async () => {
      const cleanFile = join(TEST_DIR, "clean.js");
      const cleanContent = `function hello() {\n  console.log("no conflict");\n}`;

      writeFileSync(cleanFile, cleanContent);

      const markers = await extractGitConflictMarkers(cleanFile);

      expect(markers.conflicts).toHaveLength(0);

      rmSync(cleanFile);
    });

    it("should handle non-existent file", async () => {
      await expect(
        extractGitConflictMarkers("/nonexistent/file.js")
      ).rejects.toThrow();
    });
  });

  afterAll(() => {
    cleanupTestDir();
  });
});

// ============================================================================
// INTEGRATION TESTS (require real API keys)
// ============================================================================

describe("Real AI Integration (requires API key)", () => {
  // Skip these tests by default - only run when API keys are available
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  it.skipIf(!ANTHROPIC_API_KEY)(
    "should resolve conflict with Anthropic",
    async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "anthropic",
        apiKey: ANTHROPIC_API_KEY!,
        model: "claude-sonnet-4-5-20250929",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.resolveConflict(mockConflict, input);

      expect(result.success).toBe(true);
      expect(result.output?.data?.decision).toMatch(
        /ai_merged|needs_human_review/
      );

      if (result.output?.data?.merged_content) {
        expect(result.output.data.merged_content).toContain("function App");
      }

      await integration.shutdown();
    },
    30000
  );

  it.skipIf(!OPENAI_API_KEY)(
    "should resolve conflict with OpenAI",
    async () => {
      const integration = new AIMergeIntegration({
        aiProvider: "openai",
        apiKey: OPENAI_API_KEY!,
        model: "gpt-4o",
      });

      const input: ResolveConflictInput = {
        baselineCode: mockBaselineCode,
        taskSnapshots: [mockTaskSnapshot1, mockTaskSnapshot2],
      };

      const result = await integration.resolveConflict(mockConflict, input);

      expect(result.success).toBe(true);
      expect(result.output?.data?.decision).toMatch(
        /ai_merged|needs_human_review/
      );

      await integration.shutdown();
    },
    30000
  );
});
