/**
 * WorktreeAPIHandler - Git worktree management operations
 *
 * Provides APIs for managing git worktrees:
 * - List all worktrees in repository
 * - Create new worktree from branch
 * - Delete worktree
 *
 * Uses execFileNoThrow for safe git command execution without throwing.
 *
 * Responsibilities:
 * - Execute git worktree commands safely
 * - Parse git porcelain output
 * - Validate inputs (branch names, paths)
 * - Provide structured result objects
 *
 * Git Commands Used:
 * - git worktree list --porcelain (list all worktrees)
 * - git worktree add <path> <branch> (create worktree)
 * - git worktree remove <path> --force (delete worktree)
 * - git rev-parse --verify <branch> (check branch exists)
 */

import path from "node:path";
import type { ExecFileResult } from "@/utils/execFileNoThrow.js";

/**
 * Worktree information
 */
export interface WorktreeInfo {
  /** Absolute path to worktree */
  path: string;
  /** HEAD commit hash */
  head: string;
  /** Branch name (without refs/heads/) */
  branch: string;
  /** Whether this is the primary worktree */
  isPrimary: boolean;
}

/**
 * Options for creating a worktree
 */
export interface WorktreeCreateOptions {
  /** Branch name to checkout in worktree */
  branch: string;
  /** Optional: Path where worktree should be created (defaults to .worktrees/<branch>) */
  path?: string;
}

/**
 * Result from listing worktrees
 */
export interface WorktreeListResult {
  /** Operation success status */
  success: boolean;
  /** Array of worktree information */
  worktrees: WorktreeInfo[];
  /** Error message if failed */
  error?: string;
}

/**
 * Result from creating a worktree
 */
export interface WorktreeCreateResult {
  /** Operation success status */
  success: boolean;
  /** Path where worktree was created */
  path?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from deleting a worktree
 */
export interface WorktreeDeleteResult {
  /** Operation success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * execFileNoThrow function type
 */
export type ExecFileNoThrowFn = (
  file: string,
  args: string[],
  timeout?: number
) => Promise<ExecFileResult>;

/**
 * Configuration for WorktreeAPIHandler
 */
export interface WorktreeAPIHandlerConfig {
  /** Project directory (git repository root) */
  projectDir: string;
  /** execFileNoThrow function for git command execution */
  execFileNoThrow: ExecFileNoThrowFn;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * WorktreeAPIHandler - Manages git worktree operations
 *
 * @example
 * ```ts
 * import { execFileNoThrow } from "@/utils/execFileNoThrow.js";
 *
 * const handler = new WorktreeAPIHandler({
 *   projectDir: "/path/to/repo",
 *   execFileNoThrow,
 * });
 *
 * // List all worktrees
 * const list = await handler.listWorktrees();
 * console.log(list.worktrees);
 *
 * // Create worktree
 * const create = await handler.createWorktree({
 *   branch: "feature-x",
 *   path: "/path/to/repo/.worktrees/feature-x",
 * });
 *
 * // Delete worktree
 * const del = await handler.deleteWorktree("/path/to/repo/.worktrees/feature-x");
 * ```
 */
export class WorktreeAPIHandler {
  private readonly config: WorktreeAPIHandlerConfig;
  private readonly execFileNoThrow: ExecFileNoThrowFn;

  constructor(config: WorktreeAPIHandlerConfig) {
    this.config = config;
    this.execFileNoThrow = config.execFileNoThrow;

    if (this.config.debug) {
      console.log(
        `[WorktreeAPIHandler] Initialized for project: ${config.projectDir}`
      );
    }
  }

  /**
   * List all worktrees in the repository
   *
   * Process:
   * 1. Execute `git worktree list --porcelain`
   * 2. Parse porcelain output into WorktreeInfo objects
   * 3. Return structured result
   *
   * Porcelain format:
   * ```
   * worktree /path/to/worktree
   * HEAD <commit-hash>
   * branch refs/heads/<branch-name>
   * ```
   *
   * @returns WorktreeListResult with array of worktrees
   */
  async listWorktrees(): Promise<WorktreeListResult> {
    if (this.config.debug) {
      console.log("[WorktreeAPIHandler] Listing worktrees");
    }

    // Execute git worktree list
    const result = await this.execFileNoThrow(
      "git",
      ["worktree", "list", "--porcelain"],
      10000 // 10 second timeout
    );

    if (!result.success) {
      return {
        success: false,
        worktrees: [],
        error: result.stderr || "Failed to list worktrees",
      };
    }

    // Parse porcelain output
    const worktrees = this.parseWorktreeList(result.stdout);

    if (this.config.debug) {
      console.log(
        `[WorktreeAPIHandler] Listed ${worktrees.length} worktree(s)`
      );
    }

    return {
      success: true,
      worktrees,
    };
  }

  /**
   * Create a new worktree from a branch
   *
   * Process:
   * 1. Validate branch name
   * 2. Check if branch exists (git rev-parse --verify <branch>)
   * 3. Determine worktree path (use provided or auto-generate)
   * 4. Execute `git worktree add <path> <branch>`
   * 5. Return structured result
   *
   * @param options - Worktree creation options
   * @returns WorktreeCreateResult with created path
   */
  async createWorktree(
    options: WorktreeCreateOptions
  ): Promise<WorktreeCreateResult> {
    // Validate branch name
    if (!options.branch || options.branch.trim() === "") {
      return {
        success: false,
        error: "Branch name cannot be empty",
      };
    }

    // Check if branch exists
    const branchExists = await this.checkBranchExists(options.branch);
    if (!branchExists) {
      return {
        success: false,
        error: `Branch '${options.branch}' does not exist`,
      };
    }

    // Determine worktree path
    const worktreePath =
      options.path ||
      path.join(this.config.projectDir, ".worktrees", options.branch);

    if (this.config.debug) {
      console.log(
        `[WorktreeAPIHandler] Creating worktree at ${worktreePath} for branch ${options.branch}`
      );
    }

    // Execute git worktree add
    const result = await this.execFileNoThrow(
      "git",
      ["worktree", "add", worktreePath, options.branch],
      30000 // 30 second timeout (checkout can be slow)
    );

    if (!result.success) {
      return {
        success: false,
        error: result.stderr || "Failed to create worktree",
      };
    }

    if (this.config.debug) {
      console.log(
        `[WorktreeAPIHandler] Created worktree at ${worktreePath}`
      );
    }

    return {
      success: true,
      path: worktreePath,
    };
  }

  /**
   * Delete a worktree
   *
   * Process:
   * 1. Validate path
   * 2. Execute `git worktree remove <path> --force`
   * 3. Return structured result
   *
   * Note: Uses --force to remove even if worktree has uncommitted changes
   *
   * @param worktreePath - Path to worktree to delete
   * @returns WorktreeDeleteResult
   */
  async deleteWorktree(worktreePath: string): Promise<WorktreeDeleteResult> {
    // Validate path
    if (!worktreePath || worktreePath.trim() === "") {
      return {
        success: false,
        error: "Path cannot be empty",
      };
    }

    if (this.config.debug) {
      console.log(
        `[WorktreeAPIHandler] Deleting worktree at ${worktreePath}`
      );
    }

    // Execute git worktree remove
    const result = await this.execFileNoThrow(
      "git",
      ["worktree", "remove", worktreePath, "--force"],
      30000 // 30 second timeout
    );

    if (!result.success) {
      return {
        success: false,
        error: result.stderr || "Failed to delete worktree",
      };
    }

    if (this.config.debug) {
      console.log(
        `[WorktreeAPIHandler] Deleted worktree at ${worktreePath}`
      );
    }

    return {
      success: true,
    };
  }

  /**
   * Check if a branch exists
   *
   * Process:
   * 1. Execute `git rev-parse --verify <branch>`
   * 2. Return true if command succeeds
   *
   * @param branch - Branch name to check
   * @returns True if branch exists
   */
  private async checkBranchExists(branch: string): Promise<boolean> {
    const result = await this.execFileNoThrow(
      "git",
      ["rev-parse", "--verify", branch],
      5000 // 5 second timeout
    );

    return result.success;
  }

  /**
   * Parse git worktree list --porcelain output
   *
   * Porcelain format:
   * ```
   * worktree /path/to/worktree
   * HEAD <commit-hash>
   * branch refs/heads/<branch-name>
   * <blank line>
   * worktree /path/to/another
   * HEAD <commit-hash>
   * branch refs/heads/<another-branch>
   * ```
   *
   * @param output - Raw git worktree list output
   * @returns Array of WorktreeInfo objects
   */
  private parseWorktreeList(output: string): WorktreeInfo[] {
    const worktrees: WorktreeInfo[] = [];

    if (!output || output.trim() === "") {
      return worktrees;
    }

    const lines = output.trim().split("\n");
    let currentWorktree: Partial<WorktreeInfo> = {};
    let isPrimary = true; // First worktree is always primary

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === "") {
        // End of worktree entry
        if (currentWorktree.path && currentWorktree.head) {
          worktrees.push({
            path: currentWorktree.path,
            head: currentWorktree.head,
            branch: currentWorktree.branch || "",
            isPrimary,
          });
          isPrimary = false; // Subsequent worktrees are not primary
        }
        currentWorktree = {};
        continue;
      }

      if (trimmedLine.startsWith("worktree ")) {
        currentWorktree.path = trimmedLine.substring("worktree ".length);
      } else if (trimmedLine.startsWith("HEAD ")) {
        currentWorktree.head = trimmedLine.substring("HEAD ".length);
      } else if (trimmedLine.startsWith("branch ")) {
        const branchRef = trimmedLine.substring("branch ".length);
        // Remove refs/heads/ prefix
        currentWorktree.branch = branchRef.replace("refs/heads/", "");
      }
    }

    // Handle last entry (if no trailing blank line)
    if (currentWorktree.path && currentWorktree.head) {
      worktrees.push({
        path: currentWorktree.path,
        head: currentWorktree.head,
        branch: currentWorktree.branch || "",
        isPrimary,
      });
    }

    return worktrees;
  }
}
