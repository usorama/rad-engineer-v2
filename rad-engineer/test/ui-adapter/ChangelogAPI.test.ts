/**
 * ChangelogAPIHandler Tests
 *
 * Tests automated changelog generation from git history
 * with conventional commit parsing and semantic versioning
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ChangelogAPIHandler } from "../../src/ui-adapter/ChangelogAPIHandler.js";

/**
 * Mock git log output with conventional commits
 */
const MOCK_GIT_LOG = `commit abc123|2026-01-11T10:00:00Z|feat: add user authentication
commit def456|2026-01-10T15:30:00Z|fix: resolve memory leak in data processor
commit ghi789|2026-01-10T10:00:00Z|feat!: migrate to new database schema
commit jkl012|2026-01-09T14:00:00Z|docs: update README with installation steps
commit mno345|2026-01-09T09:00:00Z|chore: bump dependencies
commit pqr678|2026-01-08T16:00:00Z|fix: correct validation logic
commit stu901|2026-01-08T11:00:00Z|feat: implement export functionality`;

describe("ChangelogAPIHandler", () => {
  let handler: ChangelogAPIHandler;

  beforeEach(() => {
    handler = new ChangelogAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  describe("parseConventionalCommit", () => {
    test("parses feat commit correctly", () => {
      const result = handler.parseConventionalCommit(
        "feat: add user authentication"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("feat");
      expect(result?.scope).toBeUndefined();
      expect(result?.breaking).toBe(false);
      expect(result?.description).toBe("add user authentication");
    });

    test("parses feat with scope correctly", () => {
      const result = handler.parseConventionalCommit(
        "feat(auth): add OAuth2 support"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("feat");
      expect(result?.scope).toBe("auth");
      expect(result?.breaking).toBe(false);
      expect(result?.description).toBe("add OAuth2 support");
    });

    test("parses breaking change with ! correctly", () => {
      const result = handler.parseConventionalCommit(
        "feat!: migrate to new database schema"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("feat");
      expect(result?.breaking).toBe(true);
      expect(result?.description).toBe("migrate to new database schema");
    });

    test("parses breaking change with scope correctly", () => {
      const result = handler.parseConventionalCommit(
        "feat(api)!: remove deprecated endpoints"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("feat");
      expect(result?.scope).toBe("api");
      expect(result?.breaking).toBe(true);
      expect(result?.description).toBe("remove deprecated endpoints");
    });

    test("parses fix commit correctly", () => {
      const result = handler.parseConventionalCommit(
        "fix: resolve memory leak in data processor"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("fix");
      expect(result?.breaking).toBe(false);
      expect(result?.description).toBe("resolve memory leak in data processor");
    });

    test("returns null for non-conventional commit", () => {
      const result = handler.parseConventionalCommit(
        "random commit message without type"
      );

      expect(result).toBeNull();
    });

    test("returns null for invalid commit format", () => {
      const result = handler.parseConventionalCommit("feat");
      expect(result).toBeNull();
    });
  });

  describe("parseGitLog", () => {
    test("parses git log output correctly", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);

      expect(commits).toHaveLength(7);

      // Check first commit
      expect(commits[0].hash).toBe("abc123");
      expect(commits[0].date).toBe("2026-01-11T10:00:00Z");
      expect(commits[0].message).toBe("feat: add user authentication");
      expect(commits[0].type).toBe("feat");
      expect(commits[0].breaking).toBe(false);
    });

    test("identifies breaking changes correctly", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const breakingCommit = commits.find(c => c.breaking);

      expect(breakingCommit).toBeDefined();
      expect(breakingCommit?.hash).toBe("ghi789");
      expect(breakingCommit?.type).toBe("feat");
    });

    test("filters out non-conventional commits", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const nonConventional = commits.filter(c => !c.type);

      // All commits in mock are conventional
      expect(nonConventional).toHaveLength(0);
    });

    test("handles empty git log", () => {
      const commits = handler.parseGitLog("");
      expect(commits).toHaveLength(0);
    });
  });

  describe("groupCommitsByType", () => {
    test("groups commits by type correctly", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const grouped = handler.groupCommitsByType(commits);

      expect(grouped["Features"]).toBeDefined();
      expect(grouped["Features"]).toHaveLength(3); // 2 feat + 1 feat!

      expect(grouped["Bug Fixes"]).toBeDefined();
      expect(grouped["Bug Fixes"]).toHaveLength(2);

      expect(grouped["Breaking Changes"]).toBeDefined();
      expect(grouped["Breaking Changes"]).toHaveLength(1);
    });

    test("excludes non-user-facing types by default", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const grouped = handler.groupCommitsByType(commits);

      // docs, chore should not appear
      expect(grouped["Documentation"]).toBeUndefined();
      expect(grouped["Chores"]).toBeUndefined();
    });

    test("handles empty commits array", () => {
      const grouped = handler.groupCommitsByType([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe("suggestVersion", () => {
    test("suggests major bump for breaking changes", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const suggestion = handler.suggestVersion(commits, "1.2.3");

      expect(suggestion.currentVersion).toBe("1.2.3");
      expect(suggestion.suggestedVersion).toBe("2.0.0");
      expect(suggestion.bumpType).toBe("major");
      expect(suggestion.reason).toContain("breaking change");
    });

    test("suggests minor bump for features without breaking changes", () => {
      const logWithoutBreaking = `commit abc123|2026-01-11T10:00:00Z|feat: add feature
commit def456|2026-01-10T15:30:00Z|fix: fix bug`;

      const commits = handler.parseGitLog(logWithoutBreaking);
      const suggestion = handler.suggestVersion(commits, "1.2.3");

      expect(suggestion.currentVersion).toBe("1.2.3");
      expect(suggestion.suggestedVersion).toBe("1.3.0");
      expect(suggestion.bumpType).toBe("minor");
      expect(suggestion.reason).toContain("feature");
    });

    test("suggests patch bump for fixes only", () => {
      const logWithFixes = `commit abc123|2026-01-11T10:00:00Z|fix: fix bug 1
commit def456|2026-01-10T15:30:00Z|fix: fix bug 2`;

      const commits = handler.parseGitLog(logWithFixes);
      const suggestion = handler.suggestVersion(commits, "1.2.3");

      expect(suggestion.currentVersion).toBe("1.2.3");
      expect(suggestion.suggestedVersion).toBe("1.2.4");
      expect(suggestion.bumpType).toBe("patch");
      expect(suggestion.reason).toContain("fix");
    });

    test("suggests no bump for non-semantic commits", () => {
      const logWithChores = `commit abc123|2026-01-11T10:00:00Z|chore: update deps
commit def456|2026-01-10T15:30:00Z|docs: update readme`;

      const commits = handler.parseGitLog(logWithChores);
      const suggestion = handler.suggestVersion(commits, "1.2.3");

      expect(suggestion.currentVersion).toBe("1.2.3");
      expect(suggestion.suggestedVersion).toBe("1.2.3");
      expect(suggestion.bumpType).toBe("none");
      expect(suggestion.reason).toContain("No semantic");
    });

    test("handles version without v prefix", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const suggestion = handler.suggestVersion(commits, "2.0.0");

      expect(suggestion.suggestedVersion).toBe("3.0.0");
    });

    test("handles version with v prefix", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const suggestion = handler.suggestVersion(commits, "v2.0.0");

      expect(suggestion.suggestedVersion).toBe("3.0.0");
    });
  });

  describe("generateChangelog", () => {
    test("generates changelog in markdown format", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const changelog = handler.generateChangelog(commits, "2.0.0");

      expect(changelog).toContain("# Changelog");
      expect(changelog).toContain("## Version 2.0.0");
      expect(changelog).toContain("### Breaking Changes");
      expect(changelog).toContain("### Features");
      expect(changelog).toContain("### Bug Fixes");
      expect(changelog).toContain("migrate to new database schema");
      expect(changelog).toContain("add user authentication");
      expect(changelog).toContain("resolve memory leak");
    });

    test("includes commit hashes", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const changelog = handler.generateChangelog(commits, "1.0.0");

      expect(changelog).toContain("abc123");
      expect(changelog).toContain("def456");
    });

    test("formats dates correctly", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const changelog = handler.generateChangelog(commits, "1.0.0");

      expect(changelog).toContain("2026-01-11");
    });

    test("handles empty commits", () => {
      const changelog = handler.generateChangelog([], "1.0.0");

      expect(changelog).toContain("# Changelog");
      expect(changelog).toContain("## Version 1.0.0");
      expect(changelog).toContain("No changes");
    });
  });

  describe("integration", () => {
    test("end-to-end changelog generation", () => {
      const commits = handler.parseGitLog(MOCK_GIT_LOG);
      const versionSuggestion = handler.suggestVersion(commits, "1.5.0");
      const changelog = handler.generateChangelog(
        commits,
        versionSuggestion.suggestedVersion
      );

      expect(versionSuggestion.suggestedVersion).toBe("2.0.0");
      expect(changelog).toContain("## Version 2.0.0");
      expect(changelog).toContain("### Breaking Changes");
      expect(changelog).toContain("### Features");
      expect(changelog).toContain("### Bug Fixes");
    });
  });
});
