/**
 * Unit tests for WorktreeAPIHandler
 *
 * Tests:
 * - List worktrees
 * - Create worktree from branch
 * - Delete worktree
 * - Error handling for git operations
 * - Path validation
 * - Branch existence checks
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  WorktreeAPIHandler,
  type WorktreeAPIHandlerConfig,
  type WorktreeInfo,
  type WorktreeCreateOptions,
  type WorktreeListResult,
  type WorktreeCreateResult,
  type WorktreeDeleteResult,
} from "@/ui-adapter/WorktreeAPIHandler.js";
import type { ExecFileResult } from "@/utils/execFileNoThrow.js";

/**
 * Mock execFileNoThrow function
 */
type ExecFileNoThrowFn = (
  file: string,
  args: string[],
  timeout?: number
) => Promise<ExecFileResult>;

/**
 * Create mock execFileNoThrow with custom behavior
 */
function createMockExec(
  responses: Map<string, ExecFileResult>
): ExecFileNoThrowFn {
  return async (file: string, args: string[]): Promise<ExecFileResult> => {
    const key = `${file} ${args.join(" ")}`;
    const response = responses.get(key);
    if (response) {
      return response;
    }
    // Default: command not found
    return {
      success: false,
      stdout: "",
      stderr: `Command not mocked: ${key}`,
    };
  };
}

/**
 * Create mock config
 */
function createMockConfig(
  projectDir: string,
  execFileNoThrow: ExecFileNoThrowFn,
  options: Partial<WorktreeAPIHandlerConfig> = {}
): WorktreeAPIHandlerConfig {
  return {
    projectDir,
    execFileNoThrow,
    debug: options.debug ?? false,
  };
}

describe("WorktreeAPIHandler: initialization", () => {
  it("Initializes with default config", () => {
    const mockExec = createMockExec(new Map());
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    expect(handler).toBeDefined();
  });

  it("Initializes with debug mode enabled", () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    const mockExec = createMockExec(new Map());
    new WorktreeAPIHandler(
      createMockConfig("/project", mockExec, { debug: true })
    );

    console.log = originalLog;

    const initLog = logs.find((log) => log.includes("Initialized"));
    expect(initLog).toBeTruthy();
  });
});

describe("WorktreeAPIHandler: list worktrees", () => {
  it("Lists worktrees successfully", async () => {
    const responses = new Map<string, ExecFileResult>();
    responses.set("git worktree list --porcelain", {
      success: true,
      stdout: `worktree /project
HEAD abc123def456
branch refs/heads/main

worktree /project/.worktrees/feature-x
HEAD def456abc123
branch refs/heads/feature-x

worktree /project/.worktrees/bugfix-y
HEAD 789abc456def
branch refs/heads/bugfix-y
`,
      stderr: "",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.listWorktrees();

    expect(result.success).toBe(true);
    expect(result.worktrees).toHaveLength(3);
    expect(result.worktrees[0]).toEqual({
      path: "/project",
      head: "abc123def456",
      branch: "main",
      isPrimary: true,
    });
    expect(result.worktrees[1]).toEqual({
      path: "/project/.worktrees/feature-x",
      head: "def456abc123",
      branch: "feature-x",
      isPrimary: false,
    });
  });

  it("Returns empty list when no worktrees exist", async () => {
    const responses = new Map<string, ExecFileResult>();
    responses.set("git worktree list --porcelain", {
      success: true,
      stdout: "",
      stderr: "",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.listWorktrees();

    expect(result.success).toBe(true);
    expect(result.worktrees).toHaveLength(0);
  });

  it("Handles git command failure", async () => {
    const responses = new Map<string, ExecFileResult>();
    responses.set("git worktree list --porcelain", {
      success: false,
      stdout: "",
      stderr: "fatal: not a git repository",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.listWorktrees();

    expect(result.success).toBe(false);
    expect(result.error).toContain("not a git repository");
  });

  it("Logs debug messages on list", async () => {
    const responses = new Map<string, ExecFileResult>();
    responses.set("git worktree list --porcelain", {
      success: true,
      stdout: "worktree /project\nHEAD abc123\nbranch refs/heads/main\n",
      stderr: "",
    });

    const mockExec = createMockExec(responses);

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec, { debug: true })
    );

    await handler.listWorktrees();

    console.log = originalLog;

    const listLog = logs.find((log) => log.includes("Listed"));
    expect(listLog).toBeTruthy();
  });
});

describe("WorktreeAPIHandler: create worktree", () => {
  it("Creates worktree successfully", async () => {
    const responses = new Map<string, ExecFileResult>();

    // Branch exists check
    responses.set("git rev-parse --verify feature-x", {
      success: true,
      stdout: "abc123def456",
      stderr: "",
    });

    // Worktree create
    responses.set(
      "git worktree add /project/.worktrees/feature-x feature-x",
      {
        success: true,
        stdout: "Preparing worktree (checking out 'feature-x')",
        stderr: "",
      }
    );

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const options: WorktreeCreateOptions = {
      branch: "feature-x",
      path: "/project/.worktrees/feature-x",
    };

    const result = await handler.createWorktree(options);

    expect(result.success).toBe(true);
    expect(result.path).toBe("/project/.worktrees/feature-x");
  });

  it("Creates worktree with auto-generated path", async () => {
    const responses = new Map<string, ExecFileResult>();

    // Branch exists check
    responses.set("git rev-parse --verify feature-x", {
      success: true,
      stdout: "abc123def456",
      stderr: "",
    });

    // Worktree create with auto path
    responses.set(
      "git worktree add /project/.worktrees/feature-x feature-x",
      {
        success: true,
        stdout: "Preparing worktree (checking out 'feature-x')",
        stderr: "",
      }
    );

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const options: WorktreeCreateOptions = {
      branch: "feature-x",
    };

    const result = await handler.createWorktree(options);

    expect(result.success).toBe(true);
    expect(result.path).toBe("/project/.worktrees/feature-x");
  });

  it("Fails when branch does not exist", async () => {
    const responses = new Map<string, ExecFileResult>();

    // Branch does not exist
    responses.set("git rev-parse --verify nonexistent", {
      success: false,
      stdout: "",
      stderr: "fatal: Needed a single revision",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const options: WorktreeCreateOptions = {
      branch: "nonexistent",
      path: "/project/.worktrees/nonexistent",
    };

    const result = await handler.createWorktree(options);

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist");
  });

  it("Handles git worktree add failure", async () => {
    const responses = new Map<string, ExecFileResult>();

    // Branch exists
    responses.set("git rev-parse --verify feature-x", {
      success: true,
      stdout: "abc123def456",
      stderr: "",
    });

    // Worktree create fails
    responses.set(
      "git worktree add /project/.worktrees/feature-x feature-x",
      {
        success: false,
        stdout: "",
        stderr: "fatal: '/project/.worktrees/feature-x' already exists",
      }
    );

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const options: WorktreeCreateOptions = {
      branch: "feature-x",
      path: "/project/.worktrees/feature-x",
    };

    const result = await handler.createWorktree(options);

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  it("Logs debug messages on create", async () => {
    const responses = new Map<string, ExecFileResult>();

    responses.set("git rev-parse --verify feature-x", {
      success: true,
      stdout: "abc123",
      stderr: "",
    });

    responses.set(
      "git worktree add /project/.worktrees/feature-x feature-x",
      {
        success: true,
        stdout: "Preparing worktree",
        stderr: "",
      }
    );

    const mockExec = createMockExec(responses);

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec, { debug: true })
    );

    await handler.createWorktree({ branch: "feature-x" });

    console.log = originalLog;

    const createLog = logs.find((log) => log.includes("Created worktree"));
    expect(createLog).toBeTruthy();
  });
});

describe("WorktreeAPIHandler: delete worktree", () => {
  it("Deletes worktree successfully", async () => {
    const responses = new Map<string, ExecFileResult>();

    // Worktree delete
    responses.set(
      "git worktree remove /project/.worktrees/feature-x --force",
      {
        success: true,
        stdout: "",
        stderr: "",
      }
    );

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.deleteWorktree("/project/.worktrees/feature-x");

    expect(result.success).toBe(true);
  });

  it("Handles git worktree remove failure", async () => {
    const responses = new Map<string, ExecFileResult>();

    // Worktree delete fails
    responses.set("git worktree remove /nonexistent --force", {
      success: false,
      stdout: "",
      stderr: "fatal: '/nonexistent' is not a working tree",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.deleteWorktree("/nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not a working tree");
  });

  it("Logs debug messages on delete", async () => {
    const responses = new Map<string, ExecFileResult>();

    responses.set(
      "git worktree remove /project/.worktrees/feature-x --force",
      {
        success: true,
        stdout: "",
        stderr: "",
      }
    );

    const mockExec = createMockExec(responses);

    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec, { debug: true })
    );

    await handler.deleteWorktree("/project/.worktrees/feature-x");

    console.log = originalLog;

    const deleteLog = logs.find((log) => log.includes("Deleted worktree"));
    expect(deleteLog).toBeTruthy();
  });
});

describe("WorktreeAPIHandler: edge cases", () => {
  it("Handles malformed worktree list output", async () => {
    const responses = new Map<string, ExecFileResult>();
    responses.set("git worktree list --porcelain", {
      success: true,
      stdout: "invalid output without proper format\n",
      stderr: "",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.listWorktrees();

    expect(result.success).toBe(true);
    expect(result.worktrees).toHaveLength(0);
  });

  it("Handles partial worktree info in list output", async () => {
    const responses = new Map<string, ExecFileResult>();
    responses.set("git worktree list --porcelain", {
      success: true,
      stdout: "worktree /project\nHEAD abc123\n",
      stderr: "",
    });

    const mockExec = createMockExec(responses);
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.listWorktrees();

    expect(result.success).toBe(true);
    // Should handle missing branch gracefully
    expect(result.worktrees).toHaveLength(1);
  });

  it("Validates empty branch name", async () => {
    const mockExec = createMockExec(new Map());
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.createWorktree({ branch: "" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Branch name cannot be empty");
  });

  it("Validates empty path for delete", async () => {
    const mockExec = createMockExec(new Map());
    const handler = new WorktreeAPIHandler(
      createMockConfig("/project", mockExec)
    );

    const result = await handler.deleteWorktree("");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Path cannot be empty");
  });
});
