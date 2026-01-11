/**
 * ChangelogAPIHandler - Automated changelog generation from git history
 *
 * Responsibilities:
 * - Parse git commit history
 * - Identify conventional commits (feat, fix, breaking, etc.)
 * - Group commits by type (Features, Fixes, Breaking Changes)
 * - Generate formatted changelog in Markdown
 * - Suggest semantic version bump based on commit types
 *
 * Integration:
 * - Follows conventional commits specification
 * - Supports semantic versioning (semver)
 * - Emits events for UI updates
 */

import { EventEmitter } from "events";

/**
 * Conventional commit types mapping
 */
const COMMIT_TYPE_LABELS: Record<string, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance Improvements",
  refactor: "Code Refactoring",
  docs: "Documentation",
  style: "Styles",
  test: "Tests",
  build: "Build System",
  ci: "Continuous Integration",
  chore: "Chores",
  revert: "Reverts",
};

/**
 * Commit types that should appear in user-facing changelog
 */
const USER_FACING_TYPES = ["feat", "fix", "perf", "refactor"];

/**
 * Parsed conventional commit structure
 */
export interface ConventionalCommit {
  /** Commit type (feat, fix, etc.) */
  type: string;
  /** Optional scope */
  scope?: string;
  /** Whether this is a breaking change */
  breaking: boolean;
  /** Commit description */
  description: string;
}

/**
 * Parsed git commit with metadata
 */
export interface GitCommit {
  /** Commit hash */
  hash: string;
  /** Commit date (ISO 8601) */
  date: string;
  /** Full commit message */
  message: string;
  /** Commit type (if conventional) */
  type?: string;
  /** Commit scope (if specified) */
  scope?: string;
  /** Whether breaking change */
  breaking: boolean;
  /** Commit description */
  description?: string;
}

/**
 * Semantic version bump type
 */
export type BumpType = "major" | "minor" | "patch" | "none";

/**
 * Version suggestion result
 */
export interface VersionSuggestion {
  /** Current version */
  currentVersion: string;
  /** Suggested next version */
  suggestedVersion: string;
  /** Type of bump (major/minor/patch/none) */
  bumpType: BumpType;
  /** Reason for the suggestion */
  reason: string;
}

/**
 * Configuration for ChangelogAPIHandler
 */
export interface ChangelogAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * ChangelogAPIHandler - Manages automated changelog generation
 *
 * @example
 * ```ts
 * const handler = new ChangelogAPIHandler({
 *   projectDir: "/path/to/project",
 * });
 *
 * // Fetch git log (in real usage, this would exec git log)
 * const gitLog = "commit abc123|2026-01-11|feat: add feature...";
 * const commits = handler.parseGitLog(gitLog);
 *
 * // Generate changelog
 * const changelog = handler.generateChangelog(commits, "1.0.0");
 *
 * // Suggest version
 * const suggestion = handler.suggestVersion(commits, "1.0.0");
 * console.log(`Bump from ${suggestion.currentVersion} to ${suggestion.suggestedVersion}`);
 * ```
 */
export class ChangelogAPIHandler extends EventEmitter {
  private readonly config: ChangelogAPIHandlerConfig;

  constructor(config: ChangelogAPIHandlerConfig) {
    super();
    this.config = config;

    if (this.config.debug) {
      console.log(`[ChangelogAPIHandler] Initialized for ${config.projectDir}`);
    }
  }

  /**
   * Parse a conventional commit message
   *
   * Format: type(scope)!: description
   * Examples:
   * - feat: add feature
   * - fix(api): resolve bug
   * - feat!: breaking change
   * - feat(auth)!: breaking change with scope
   *
   * @param message - Commit message to parse
   * @returns Parsed conventional commit or null if not conventional
   */
  parseConventionalCommit(message: string): ConventionalCommit | null {
    // Regex: type(scope)!: description
    // type is required, scope and ! are optional
    const regex = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;
    const match = message.match(regex);

    if (!match) {
      return null;
    }

    const [, type, scope, breaking, description] = match;

    return {
      type,
      scope,
      breaking: breaking === "!",
      description: description.trim(),
    };
  }

  /**
   * Parse git log output into structured commits
   *
   * Expected format (pipe-delimited):
   * commit hash|date|message
   *
   * Example:
   * commit abc123|2026-01-11T10:00:00Z|feat: add feature
   * commit def456|2026-01-10T15:30:00Z|fix: resolve bug
   *
   * @param gitLogOutput - Output from git log command
   * @returns Array of parsed commits
   */
  parseGitLog(gitLogOutput: string): GitCommit[] {
    if (!gitLogOutput.trim()) {
      return [];
    }

    const lines = gitLogOutput.trim().split("\n");
    const commits: GitCommit[] = [];

    for (const line of lines) {
      const parts = line.split("|");
      if (parts.length < 3) {
        continue; // Skip malformed lines
      }

      const [commitPrefix, date, message] = parts;
      const hash = commitPrefix.replace("commit ", "").trim();

      // Parse conventional commit format
      const parsed = this.parseConventionalCommit(message);

      commits.push({
        hash,
        date,
        message,
        type: parsed?.type,
        scope: parsed?.scope,
        breaking: parsed?.breaking || false,
        description: parsed?.description,
      });
    }

    return commits;
  }

  /**
   * Group commits by type for changelog sections
   *
   * Groups:
   * - Breaking Changes (any type with ! flag)
   * - Features (feat)
   * - Bug Fixes (fix)
   * - Performance Improvements (perf)
   * - Code Refactoring (refactor)
   *
   * @param commits - Array of parsed commits
   * @returns Commits grouped by type
   */
  groupCommitsByType(commits: GitCommit[]): Record<string, GitCommit[]> {
    const groups: Record<string, GitCommit[]> = {};

    for (const commit of commits) {
      // Breaking changes go into special section
      if (commit.breaking) {
        if (!groups["Breaking Changes"]) {
          groups["Breaking Changes"] = [];
        }
        groups["Breaking Changes"].push(commit);
      }

      // Group by type (only user-facing types)
      if (commit.type && USER_FACING_TYPES.includes(commit.type)) {
        const label = COMMIT_TYPE_LABELS[commit.type];
        if (label) {
          if (!groups[label]) {
            groups[label] = [];
          }
          groups[label].push(commit);
        }
      }
    }

    return groups;
  }

  /**
   * Suggest semantic version bump based on commit types
   *
   * Rules:
   * - Breaking change (!) → major bump
   * - New feature (feat) → minor bump
   * - Bug fix (fix) → patch bump
   * - Other types → no bump
   *
   * @param commits - Array of parsed commits
   * @param currentVersion - Current version (with or without 'v' prefix)
   * @returns Version suggestion with reasoning
   */
  suggestVersion(
    commits: GitCommit[],
    currentVersion: string
  ): VersionSuggestion {
    // Remove 'v' prefix if present
    const cleanVersion = currentVersion.startsWith("v")
      ? currentVersion.slice(1)
      : currentVersion;

    const [major, minor, patch] = cleanVersion.split(".").map(Number);

    // Check for breaking changes
    const hasBreaking = commits.some((c) => c.breaking);
    if (hasBreaking) {
      return {
        currentVersion: cleanVersion,
        suggestedVersion: `${major + 1}.0.0`,
        bumpType: "major",
        reason: "Contains breaking change(s)",
      };
    }

    // Check for features
    const hasFeatures = commits.some((c) => c.type === "feat");
    if (hasFeatures) {
      return {
        currentVersion: cleanVersion,
        suggestedVersion: `${major}.${minor + 1}.0`,
        bumpType: "minor",
        reason: "Contains new feature(s)",
      };
    }

    // Check for fixes
    const hasFixes = commits.some((c) => c.type === "fix");
    if (hasFixes) {
      return {
        currentVersion: cleanVersion,
        suggestedVersion: `${major}.${minor}.${patch + 1}`,
        bumpType: "patch",
        reason: "Contains bug fix(es)",
      };
    }

    // No semantic changes
    return {
      currentVersion: cleanVersion,
      suggestedVersion: cleanVersion,
      bumpType: "none",
      reason: "No semantic changes (only docs, chores, etc.)",
    };
  }

  /**
   * Generate changelog in Markdown format
   *
   * Format:
   * # Changelog
   *
   * ## Version X.Y.Z (YYYY-MM-DD)
   *
   * ### Breaking Changes
   * - Description (hash)
   *
   * ### Features
   * - Description (hash)
   *
   * ### Bug Fixes
   * - Description (hash)
   *
   * @param commits - Array of parsed commits
   * @param version - Version for this changelog section
   * @returns Formatted changelog markdown
   */
  generateChangelog(commits: GitCommit[], version: string): string {
    const lines: string[] = [];

    // Header
    lines.push("# Changelog");
    lines.push("");

    // Version section
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    lines.push(`## Version ${version} (${date})`);
    lines.push("");

    // Group commits
    const grouped = this.groupCommitsByType(commits);

    if (Object.keys(grouped).length === 0) {
      lines.push("No changes");
      lines.push("");
      return lines.join("\n");
    }

    // Sections in order: Breaking Changes, Features, Bug Fixes, Performance, Refactoring
    const sectionOrder = [
      "Breaking Changes",
      "Features",
      "Bug Fixes",
      "Performance Improvements",
      "Code Refactoring",
    ];

    for (const section of sectionOrder) {
      const sectionCommits = grouped[section];
      if (!sectionCommits || sectionCommits.length === 0) {
        continue;
      }

      lines.push(`### ${section}`);
      lines.push("");

      for (const commit of sectionCommits) {
        const scope = commit.scope ? `**${commit.scope}**: ` : "";
        const desc = commit.description || commit.message;
        const hash = commit.hash.slice(0, 7); // Short hash
        lines.push(`- ${scope}${desc} (${hash})`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }
}
