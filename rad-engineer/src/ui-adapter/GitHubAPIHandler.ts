/**
 * GitHubAPIHandler - GitHub Integration for Auto-Claude
 *
 * Responsibilities:
 * - Fetch issues from GitHub repository
 * - Convert issues to Auto-Claude tasks
 * - Fetch pull requests
 * - Review PRs with AI Merge conflict resolution
 * - Sync GitHub state with local tasks
 *
 * Integration:
 * - Uses TaskAPIHandler for task creation
 * - Uses AIMergeIntegration for PR conflict resolution
 * - Emits events for UI updates
 */

import { EventEmitter } from "events";
import type { TaskAPIHandler } from "./TaskAPIHandler.js";
import type { AIMergeIntegration, ConflictRegion, TaskSnapshot } from "@/python-bridge/AIMergePluginIntegration.js";
import type { AutoClaudeTask, AutoClaudeTaskSpec } from "./types.js";

/**
 * GitHub issue representation
 */
export interface GitHubIssue {
  /** Issue number */
  number: number;
  /** Issue title */
  title: string;
  /** Issue body/description */
  body: string;
  /** Issue state */
  state: "open" | "closed";
  /** Issue labels */
  labels: Array<{ name: string }>;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
  /** GitHub URL */
  html_url: string;
}

/**
 * GitHub pull request representation
 */
export interface GitHubPullRequest {
  /** PR number */
  number: number;
  /** PR title */
  title: string;
  /** PR body/description */
  body: string;
  /** PR state */
  state: "open" | "closed";
  /** Head branch info */
  head: {
    ref: string;
    sha: string;
  };
  /** Base branch info */
  base: {
    ref: string;
    sha: string;
  };
  /** GitHub URL */
  html_url: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
  /** Whether PR is mergeable */
  mergeable: boolean | null;
  /** Mergeable state */
  mergeable_state: string;
}

/**
 * Options for fetching issues
 */
export interface GetIssuesOptions {
  /** Filter by state */
  state?: "open" | "closed" | "all";
  /** Filter by labels */
  labels?: string[];
  /** Maximum number of issues to fetch */
  per_page?: number;
  /** Page number for pagination */
  page?: number;
}

/**
 * Options for fetching pull requests
 */
export interface GetPullRequestsOptions {
  /** Filter by state */
  state?: "open" | "closed" | "all";
  /** Maximum number of PRs to fetch */
  per_page?: number;
  /** Page number for pagination */
  page?: number;
}

/**
 * PR conflict detection result
 */
export interface PRConflictStatus {
  /** PR number */
  number: number;
  /** Whether PR has merge conflicts */
  hasMergeConflicts: boolean;
  /** Whether PR is mergeable */
  mergeable: boolean;
  /** Mergeable state from GitHub */
  mergeable_state: string;
}

/**
 * PR review input for AI merge
 */
export interface PRReviewInput {
  /** Detected conflicts */
  conflicts: ConflictRegion[];
  /** Baseline code before PR */
  baselineCode: string;
  /** Task snapshots involved */
  taskSnapshots: TaskSnapshot[];
}

/**
 * PR review result
 */
export interface PRReviewResult {
  /** PR number */
  prNumber: number;
  /** Whether review succeeded */
  success: boolean;
  /** Merge results from AI */
  mergeResults: Array<{
    decision: "auto_merged" | "ai_merged" | "needs_human_review" | "failed";
    file_path: string;
    merged_content?: string | null;
    explanation: string;
    error?: string | null;
  }>;
  /** Error message if review failed */
  error?: string;
}

/**
 * Configuration for GitHubAPIHandler
 */
export interface GitHubAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** TaskAPIHandler instance for task creation */
  taskAPIHandler: TaskAPIHandler;
  /** AIMergeIntegration instance for PR review */
  aiMergeIntegration: AIMergeIntegration;
  /** GitHub personal access token */
  githubToken: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * GitHubAPIHandler - Manages GitHub integration with Auto-Claude
 *
 * @example
 * ```ts
 * const handler = new GitHubAPIHandler({
 *   projectDir: "/path/to/project",
 *   taskAPIHandler: taskHandler,
 *   aiMergeIntegration: aiMerge,
 *   githubToken: "ghp_...",
 *   owner: "myorg",
 *   repo: "myrepo",
 * });
 *
 * // Fetch issues
 * const issues = await handler.getIssues({ state: "open" });
 *
 * // Convert issue to task
 * const task = await handler.createTaskFromIssue(issues[0]);
 *
 * // Review PR with AI
 * const review = await handler.reviewPRWithAI(10, {
 *   conflicts: [...],
 *   baselineCode: "...",
 *   taskSnapshots: [...],
 * });
 * ```
 */
export class GitHubAPIHandler extends EventEmitter {
  private readonly config: GitHubAPIHandlerConfig;
  private readonly baseURL = "https://api.github.com";

  constructor(config: GitHubAPIHandlerConfig) {
    super();
    this.config = config;

    if (this.config.debug) {
      console.log(`[GitHubAPIHandler] Initialized for ${config.owner}/${config.repo}`);
    }
  }

  /**
   * Make authenticated request to GitHub API
   *
   * @param endpoint - API endpoint (e.g., "/repos/:owner/:repo/issues")
   * @param options - Fetch options
   * @returns Response JSON data
   * @throws Error if request fails
   */
  private async githubRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      Authorization: `token ${this.config.githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "rad-engineer-auto-claude",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}. ${
            errorData.message || ""
          }`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes("GitHub API error")) {
        throw error;
      }
      throw new Error(
        `Failed to make GitHub request: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch issues from GitHub repository
   *
   * Process:
   * 1. Build query parameters from options
   * 2. Make authenticated request to GitHub API
   * 3. Filter by labels if specified
   * 4. Emit issues-fetched event
   * 5. Return issues
   *
   * @param options - Fetch options
   * @returns Array of GitHub issues
   */
  async getIssues(options: GetIssuesOptions = {}): Promise<GitHubIssue[]> {
    try {
      const params = new URLSearchParams({
        state: options.state || "open",
        per_page: String(options.per_page || 100),
        page: String(options.page || 1),
      });

      const endpoint = `/repos/${this.config.owner}/${this.config.repo}/issues?${params}`;
      let issues = await this.githubRequest<GitHubIssue[]>(endpoint);

      // Filter by labels if specified
      if (options.labels && options.labels.length > 0) {
        issues = issues.filter((issue) =>
          options.labels!.some((label) =>
            issue.labels.some((l) => l.name === label)
          )
        );
      }

      // Emit event
      this.emit("issues-fetched", issues);

      if (this.config.debug) {
        console.log(`[GitHubAPIHandler] Fetched ${issues.length} issues`);
      }

      return issues;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch issues: ${errorMsg}`);
    }
  }

  /**
   * Convert GitHub issue to Auto-Claude task
   *
   * Process:
   * 1. Extract issue metadata (title, body, labels)
   * 2. Format description with issue link
   * 3. Map labels to task tags
   * 4. Create task via TaskAPIHandler
   * 5. Emit task-created-from-issue event
   * 6. Return created task
   *
   * @param issue - GitHub issue to convert
   * @returns Created Auto-Claude task
   */
  async createTaskFromIssue(issue: GitHubIssue): Promise<AutoClaudeTask> {
    // Build task spec from issue
    const spec: AutoClaudeTaskSpec = {
      title: issue.title,
      description: `${issue.body}\n\n---\nIssue #${issue.number}: ${issue.html_url}`,
      tags: [
        "github-issue",
        ...issue.labels.map((l) => l.name),
      ],
      // Set priority based on labels (if any)
      priority: this.extractPriorityFromLabels(issue.labels),
    };

    // Create task
    const task = await this.config.taskAPIHandler.createTask(spec);

    // Emit event
    this.emit("task-created-from-issue", { issue, task });

    if (this.config.debug) {
      console.log(`[GitHubAPIHandler] Created task ${task.id} from issue #${issue.number}`);
    }

    return task;
  }

  /**
   * Extract priority from issue labels
   *
   * @param labels - Issue labels
   * @returns Priority value (1-5, default 3)
   */
  private extractPriorityFromLabels(
    labels: Array<{ name: string }>
  ): number {
    const priorityLabels: Record<string, number> = {
      "priority: critical": 5,
      "priority: high": 4,
      "priority: medium": 3,
      "priority: low": 2,
      "high-priority": 4,
      "low-priority": 2,
    };

    for (const label of labels) {
      const priority = priorityLabels[label.name.toLowerCase()];
      if (priority) {
        return priority;
      }
    }

    return 3; // Default medium priority
  }

  /**
   * Fetch pull requests from GitHub repository
   *
   * Process:
   * 1. Build query parameters from options
   * 2. Make authenticated request to GitHub API
   * 3. Emit prs-fetched event
   * 4. Return PRs
   *
   * @param options - Fetch options
   * @returns Array of GitHub pull requests
   */
  async getPullRequests(
    options: GetPullRequestsOptions = {}
  ): Promise<GitHubPullRequest[]> {
    try {
      const params = new URLSearchParams({
        state: options.state || "open",
        per_page: String(options.per_page || 100),
        page: String(options.page || 1),
      });

      const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls?${params}`;
      const prs = await this.githubRequest<GitHubPullRequest[]>(endpoint);

      // Emit event
      this.emit("prs-fetched", prs);

      if (this.config.debug) {
        console.log(`[GitHubAPIHandler] Fetched ${prs.length} pull requests`);
      }

      return prs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch pull requests: ${errorMsg}`);
    }
  }

  /**
   * Detect merge conflicts in a pull request
   *
   * Process:
   * 1. Check PR mergeable status from GitHub
   * 2. Determine if conflicts exist
   * 3. Return conflict status
   *
   * @param pr - GitHub pull request
   * @returns Conflict status
   */
  async detectPRConflicts(pr: GitHubPullRequest): Promise<PRConflictStatus> {
    const hasMergeConflicts =
      pr.mergeable === false || pr.mergeable_state === "dirty";

    return {
      number: pr.number,
      hasMergeConflicts,
      mergeable: pr.mergeable || false,
      mergeable_state: pr.mergeable_state,
    };
  }

  /**
   * Review pull request with AI merge conflict resolution
   *
   * Process:
   * 1. Validate input conflicts
   * 2. For each conflict, call AIMergeIntegration.resolveConflict
   * 3. Collect merge results
   * 4. Determine overall success
   * 5. Emit pr-reviewed event
   * 6. Return review result
   *
   * @param prNumber - PR number
   * @param input - Review input with conflicts and context
   * @returns Review result with merge decisions
   */
  async reviewPRWithAI(
    prNumber: number,
    input: PRReviewInput
  ): Promise<PRReviewResult> {
    const mergeResults: PRReviewResult["mergeResults"] = [];

    try {
      // Resolve each conflict with AI
      for (const conflict of input.conflicts) {
        const result = await this.config.aiMergeIntegration.resolveConflict(
          conflict,
          {
            baselineCode: input.baselineCode,
            taskSnapshots: input.taskSnapshots,
          }
        );

        if (result.success && result.output?.data) {
          const data = result.output.data;
          mergeResults.push({
            decision: data.decision,
            file_path: data.file_path,
            merged_content: data.merged_content,
            explanation: data.explanation,
          });
        } else {
          // AI merge failed for this conflict
          mergeResults.push({
            decision: "failed",
            file_path: conflict.file_path,
            explanation: result.error || "AI merge failed",
            error: result.error,
          });
        }
      }

      // Determine overall success (all conflicts resolved successfully)
      const success = mergeResults.every(
        (r) => r.decision === "ai_merged" || r.decision === "auto_merged"
      );

      const reviewResult: PRReviewResult = {
        prNumber,
        success,
        mergeResults,
      };

      // Emit event
      this.emit("pr-reviewed", reviewResult);

      if (this.config.debug) {
        console.log(
          `[GitHubAPIHandler] Reviewed PR #${prNumber}: ${
            success ? "SUCCESS" : "FAILED"
          }`
        );
      }

      return reviewResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        prNumber,
        success: false,
        mergeResults,
        error: errorMsg,
      };
    }
  }
}
