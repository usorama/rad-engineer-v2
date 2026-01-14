/**
 * Unit tests for GitHubAPIHandler
 *
 * Tests:
 * - Issue fetching and synchronization
 * - Issue to task conversion
 * - Pull request fetching
 * - PR review with AI Merge integration
 * - Error handling
 * - Event emissions
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { GitHubAPIHandler } from "@/ui-adapter/GitHubAPIHandler.js";
import type { GitHubAPIHandlerConfig } from "@/ui-adapter/GitHubAPIHandler.js";
import { TaskAPIHandler } from "@/ui-adapter/TaskAPIHandler.js";
import { AIMergeIntegration } from "@/python-bridge/AIMergePluginIntegration.js";
import type { ConflictRegion, MergeResult } from "@/python-bridge/AIMergePluginIntegration.js";
import type { PluginResult } from "@/python-bridge/PythonPluginBridge.js";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Mock GitHub issue response
 */
interface MockGitHubIssue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * Mock GitHub PR response
 */
interface MockGitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  html_url: string;
  created_at: string;
  updated_at: string;
  mergeable: boolean | null;
  mergeable_state: string;
}

/**
 * Create mock TaskAPIHandler
 */
function createMockTaskAPIHandler(): Partial<TaskAPIHandler> {
  return {
    createTask: mock(async (spec) => ({
      id: `task-${Date.now()}`,
      title: spec.title,
      description: spec.description,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: spec.priority,
      tags: spec.tags,
      progress: 0,
    })),
  };
}

/**
 * Create mock AIMergeIntegration
 */
function createMockAIMergeIntegration(): Partial<AIMergeIntegration> {
  return {
    resolveConflict: mock(async (): Promise<PluginResult<MergeResult>> => ({
      success: true,
      output: {
        success: true,
        data: {
          decision: "ai_merged" as const,
          file_path: "src/test.ts",
          merged_content: "merged code here",
          conflicts_resolved: [],
          conflicts_remaining: [],
          ai_calls_made: 1,
          tokens_used: 500,
          explanation: "Successfully merged using AI",
        },
      },
      retries: 0,
      totalDuration: 1000,
      timedOut: false,
    })),
    shutdown: mock(async () => {}),
  };
}

describe("GitHubAPIHandler", () => {
  let handler: GitHubAPIHandler;
  let testDir: string;
  let taskHandler: Partial<TaskAPIHandler>;
  let aiMerge: Partial<AIMergeIntegration>;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(process.cwd(), ".test-github-api-handler", Date.now().toString());
    await fs.mkdir(testDir, { recursive: true });

    // Create mock dependencies
    taskHandler = createMockTaskAPIHandler();
    aiMerge = createMockAIMergeIntegration();

    // Create handler
    const config: GitHubAPIHandlerConfig = {
      projectDir: testDir,
      taskAPIHandler: taskHandler as TaskAPIHandler,
      aiMergeIntegration: aiMerge as AIMergeIntegration,
      githubToken: "test-token",
      owner: "test-owner",
      repo: "test-repo",
      debug: false,
    };

    handler = new GitHubAPIHandler(config);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Issue Management", () => {
    it("should fetch issues from GitHub API", async () => {
      // Mock fetch for GitHub API
      const mockIssues: MockGitHubIssue[] = [
        {
          number: 1,
          title: "Bug: Fix login form",
          body: "The login form is not submitting correctly",
          state: "open",
          labels: [{ name: "bug" }],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/1",
        },
        {
          number: 2,
          title: "Feature: Add dark mode",
          body: "Implement dark mode theme",
          state: "open",
          labels: [{ name: "enhancement" }],
          created_at: "2026-01-03T00:00:00Z",
          updated_at: "2026-01-03T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/2",
        },
      ];

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        } as Response)
      ) as unknown as typeof fetch;

      const issues = await handler.getIssues({ state: "open" });

      expect(issues).toHaveLength(2);
      expect(issues[0].number).toBe(1);
      expect(issues[0].title).toBe("Bug: Fix login form");
      expect(issues[1].number).toBe(2);
    });

    it("should handle GitHub API errors gracefully", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ message: "Not Found" }),
        } as Response)
      ) as unknown as typeof fetch;

      await expect(handler.getIssues()).rejects.toThrow("GitHub API error");
    });

    it("should convert issue to task", async () => {
      const mockIssue: MockGitHubIssue = {
        number: 1,
        title: "Bug: Fix login form",
        body: "The login form is not submitting correctly",
        state: "open",
        labels: [{ name: "bug" }, { name: "high-priority" }],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        html_url: "https://github.com/test-owner/test-repo/issues/1",
      };

      const task = await handler.createTaskFromIssue(mockIssue);

      expect(task.title).toBe("Bug: Fix login form");
      expect(task.description).toContain("The login form is not submitting correctly");
      expect(task.description).toContain("Issue #1");
      expect(task.tags).toContain("github-issue");
      expect(task.tags).toContain("bug");
      expect(taskHandler.createTask).toHaveBeenCalledTimes(1);
    });

    it("should filter issues by labels", async () => {
      const mockIssues: MockGitHubIssue[] = [
        {
          number: 1,
          title: "Bug issue",
          body: "Bug description",
          state: "open",
          labels: [{ name: "bug" }],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/1",
        },
        {
          number: 2,
          title: "Feature issue",
          body: "Feature description",
          state: "open",
          labels: [{ name: "enhancement" }],
          created_at: "2026-01-03T00:00:00Z",
          updated_at: "2026-01-03T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/2",
        },
      ];

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        } as Response)
      ) as unknown as typeof fetch;

      const issues = await handler.getIssues({ labels: ["bug"] });

      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
    });
  });

  describe("Pull Request Management", () => {
    it("should fetch pull requests from GitHub API", async () => {
      const mockPRs: MockGitHubPullRequest[] = [
        {
          number: 10,
          title: "Fix: Resolve login bug",
          body: "This PR fixes the login form issue",
          state: "open",
          head: { ref: "fix/login", sha: "abc123" },
          base: { ref: "main", sha: "def456" },
          html_url: "https://github.com/test-owner/test-repo/pull/10",
          created_at: "2026-01-05T00:00:00Z",
          updated_at: "2026-01-05T00:00:00Z",
          mergeable: true,
          mergeable_state: "clean",
        },
      ];

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockPRs,
        } as Response)
      ) as unknown as typeof fetch;

      const prs = await handler.getPullRequests({ state: "open" });

      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(10);
      expect(prs[0].title).toBe("Fix: Resolve login bug");
    });

    it("should detect merge conflicts in PR", async () => {
      const mockPR: MockGitHubPullRequest = {
        number: 10,
        title: "Fix: Resolve login bug",
        body: "This PR fixes the login form issue",
        state: "open",
        head: { ref: "fix/login", sha: "abc123" },
        base: { ref: "main", sha: "def456" },
        html_url: "https://github.com/test-owner/test-repo/pull/10",
        created_at: "2026-01-05T00:00:00Z",
        updated_at: "2026-01-05T00:00:00Z",
        mergeable: false,
        mergeable_state: "dirty",
      };

      const conflicts = await handler.detectPRConflicts(mockPR);

      expect(conflicts.hasMergeConflicts).toBe(true);
      expect(conflicts.mergeable).toBe(false);
    });

    it("should review PR with AI Merge integration", async () => {
      const mockConflict: ConflictRegion = {
        file_path: "src/auth/login.ts",
        location: "LoginComponent",
        tasks_involved: ["task-1", "task-2"],
        change_types: ["modify_function"],
        severity: "medium",
        can_auto_merge: false,
        merge_strategy: "ai_required",
        reason: "Overlapping logic changes",
      };

      const result = await handler.reviewPRWithAI(10, {
        conflicts: [mockConflict],
        baselineCode: "original code",
        taskSnapshots: [],
      });

      expect(result.success).toBe(true);
      expect(result.mergeResults).toHaveLength(1);
      expect(result.mergeResults[0].decision).toBe("ai_merged");
      expect(aiMerge.resolveConflict).toHaveBeenCalledTimes(1);
    });

    it("should handle PR review errors", async () => {
      // Mock AI merge to fail
      aiMerge.resolveConflict = mock(async (): Promise<PluginResult<MergeResult>> => ({
        success: false,
        output: null,
        error: "AI merge failed",
        retries: 0,
        totalDuration: 1000,
        timedOut: false,
      }));

      const mockConflict: ConflictRegion = {
        file_path: "src/auth/login.ts",
        location: "LoginComponent",
        tasks_involved: ["task-1", "task-2"],
        change_types: ["modify_function"],
        severity: "high",
        can_auto_merge: false,
        merge_strategy: "ai_required",
      };

      const result = await handler.reviewPRWithAI(10, {
        conflicts: [mockConflict],
        baselineCode: "original code",
        taskSnapshots: [],
      });

      expect(result.success).toBe(false);
      expect(result.mergeResults).toHaveLength(1);
      expect(result.mergeResults[0].decision).toBe("failed");
    });
  });

  describe("Event Emissions", () => {
    it("should emit issue-fetched event", async () => {
      const mockIssues: MockGitHubIssue[] = [
        {
          number: 1,
          title: "Test issue",
          body: "Test body",
          state: "open",
          labels: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/1",
        },
      ];

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        } as Response)
      ) as unknown as typeof fetch;

      let emitted = false;
      handler.on("issues-fetched", (issues) => {
        emitted = true;
        expect(issues).toHaveLength(1);
      });

      await handler.getIssues();
      expect(emitted).toBe(true);
    });

    it("should emit task-created-from-issue event", async () => {
      const mockIssue: MockGitHubIssue = {
        number: 1,
        title: "Test issue",
        body: "Test body",
        state: "open",
        labels: [],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        html_url: "https://github.com/test-owner/test-repo/issues/1",
      };

      let emitted = false;
      handler.on("task-created-from-issue", (data) => {
        emitted = true;
        expect(data.issue.number).toBe(1);
        expect(data.task.title).toBe("Test issue");
      });

      await handler.createTaskFromIssue(mockIssue);
      expect(emitted).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network error"))) as unknown as typeof fetch;

      await expect(handler.getIssues()).rejects.toThrow("Failed to fetch issues");
    });

    it("should handle invalid GitHub token", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({ message: "Bad credentials" }),
        } as Response)
      ) as unknown as typeof fetch;

      await expect(handler.getIssues()).rejects.toThrow("GitHub API error: 401");
    });

    it("should handle rate limiting", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({ message: "API rate limit exceeded" }),
        } as Response)
      ) as unknown as typeof fetch;

      await expect(handler.getIssues()).rejects.toThrow("GitHub API error: 403");
    });
  });
});
