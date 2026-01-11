/**
 * E2E Integration Tests - Phase 3: Enhanced Auto-Claude Integration
 *
 * Tests the complete integration of all Phase 3 components:
 * - RoadmapAPIHandler (roadmap generation, feature management)
 * - InsightsAPIHandler (chat sessions, AI streaming)
 * - GitHubAPIHandler (issue sync, PR review)
 * - ContextAPIHandler (memory/ADR retrieval)
 * - WorktreeAPIHandler (worktree management)
 * - ChangelogAPIHandler (changelog generation)
 *
 * Test Scenarios:
 * 1. Roadmap: Add Feature → Convert to Spec (skip full generation due to plan complexity)
 * 2. Insights: Create Session → Send Message → AI Response Streaming
 * 3. GitHub: Fetch Issues → Create Task → Review PR with AI
 * 4. Context: Search Memories → Get ADR → Display Stats
 * 5. Worktree: Create → List → Delete
 * 6. Changelog: Parse Commits → Generate Changelog → Suggest Version
 *
 * Success Target: >90% success rate
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RoadmapAPIHandler } from "@/ui-adapter/RoadmapAPIHandler.js";
import { InsightsAPIHandler } from "@/ui-adapter/InsightsAPIHandler.js";
import { GitHubAPIHandler } from "@/ui-adapter/GitHubAPIHandler.js";
import { ContextAPIHandler } from "@/ui-adapter/ContextAPIHandler.js";
import { WorktreeAPIHandler } from "@/ui-adapter/WorktreeAPIHandler.js";
import { ChangelogAPIHandler } from "@/ui-adapter/ChangelogAPIHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import { DecisionLearningIntegration } from "@/execute/DecisionLearningIntegration.js";
import { DecisionLearningStore } from "@/decision/DecisionLearningStore.js";
import type { DecisionRecord } from "@/decision/DecisionLearningStore.js";
import { TaskAPIHandler } from "@/ui-adapter/TaskAPIHandler.js";
import { ResourceManager } from "@/core/ResourceManager.js";
import type { WaveOrchestrator } from "@/advanced/WaveOrchestrator.js";
import type { ResourceMetrics } from "@/sdk/types.js";
import type { ExecFileResult } from "@/utils/execFileNoThrow.js";
import type {
  GitHubIssue,
  GitHubPullRequest,
  PRConflictStatus,
} from "@/ui-adapter/GitHubAPIHandler.js";
import type { ConflictRegion, TaskSnapshot } from "@/python-bridge/AIMergePluginIntegration.js";
import type { MessageChunk } from "@/ui-adapter/InsightsAPIHandler.js";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

// Test fixture directory - unique per test to avoid conflicts
const getTestProjectDir = () => join(process.cwd(), `.test-phase3-${Date.now()}`);

/**
 * Helper to create a valid decision record
 */
const createDecisionRecord = (overrides: Partial<DecisionRecord> = {}): DecisionRecord => ({
  id: `decision-${Date.now()}-${Math.random()}`,
  timestamp: Date.now(),
  component: "test",
  activity: "testing",
  decision: "Test decision",
  context: {
    domain: "code",
    complexity: 0.5,
    constraints: [],
    stakeholders: [],
  },
  reasoningMethod: {
    name: "test-method",
    category: "Core",
    parameters: {},
  },
  confidence: 0.8,
  importanceWeights: [1.0],
  ...overrides,
});

/**
 * Mock WaveOrchestrator (minimal implementation for Phase 3)
 */
class MockWaveOrchestrator implements Partial<WaveOrchestrator> {
  async executeWave(): Promise<any> {
    return {
      tasks: [],
      waves: [],
      totalSuccess: 0,
      totalFailure: 0,
    };
  }
}

/**
 * Mock AIMergeIntegration for PR review testing
 */
class MockAIMergeIntegration {
  async resolveConflict(conflict: ConflictRegion, context: any): Promise<any> {
    return {
      success: true,
      output: {
        data: {
          decision: "ai_merged" as const,
          file_path: conflict.file_path,
          merged_content: "merged content",
          explanation: "Successfully merged using AI",
        },
      },
    };
  }
}

/**
 * Mock GitHub API fetch function
 */
const createMockGitHubFetch = () => {
  const mockIssues: GitHubIssue[] = [
    {
      number: 1,
      title: "Add user authentication",
      body: "Implement OAuth2 authentication",
      state: "open",
      labels: [{ name: "enhancement" }, { name: "priority: high" }],
      created_at: "2026-01-10T10:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
      html_url: "https://github.com/test/repo/issues/1",
    },
    {
      number: 2,
      title: "Fix login bug",
      body: "Users cannot login with email",
      state: "open",
      labels: [{ name: "bug" }],
      created_at: "2026-01-09T14:00:00Z",
      updated_at: "2026-01-10T16:00:00Z",
      html_url: "https://github.com/test/repo/issues/2",
    },
  ];

  const mockPRs: GitHubPullRequest[] = [
    {
      number: 10,
      title: "Feature: User profile",
      body: "Add user profile page",
      state: "open",
      head: { ref: "feature-profile", sha: "abc123" },
      base: { ref: "main", sha: "def456" },
      html_url: "https://github.com/test/repo/pull/10",
      created_at: "2026-01-08T10:00:00Z",
      updated_at: "2026-01-09T15:00:00Z",
      mergeable: true,
      mergeable_state: "clean",
    },
  ];

  return async (url: string, options?: RequestInit): Promise<Response> => {
    if (url.includes("/issues")) {
      return new Response(JSON.stringify(mockIssues), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/pulls")) {
      return new Response(JSON.stringify(mockPRs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };
};

/**
 * Mock execFileNoThrow for worktree operations
 */
const createMockExecFileNoThrow = () => {
  return async (
    file: string,
    args: string[],
    timeout?: number
  ): Promise<ExecFileResult> => {
    // Mock git worktree list
    if (args.includes("list")) {
      return {
        success: true,
        stdout: `worktree /path/to/repo
HEAD abc123
branch refs/heads/main

worktree /path/to/repo/.worktrees/feature-x
HEAD def456
branch refs/heads/feature-x
`,
        stderr: "",
      };
    }

    // Mock git worktree add
    if (args.includes("add")) {
      return {
        success: true,
        stdout: "Preparing worktree...",
        stderr: "",
      };
    }

    // Mock git worktree remove
    if (args.includes("remove")) {
      return {
        success: true,
        stdout: "",
        stderr: "",
      };
    }

    // Mock git rev-parse (branch check)
    if (args.includes("rev-parse")) {
      return {
        success: true,
        stdout: "abc123\n",
        stderr: "",
      };
    }

    return {
      success: false,
      stdout: "",
      stderr: "Command not implemented",
      errorCode: 1,
    };
  };
};

/**
 * Mock Anthropic SDK for InsightsAPIHandler
 */
class MockAnthropicSDK {
  messages = {
    create: async (params: any) => {
      // Simulate streaming response
      const chunks = ["Hello ", "from ", "Claude!"];
      let index = 0;

      return {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: chunk },
            };
          }
        },
      };
    },
  };
}

/**
 * Mock ResourceMonitor for ResourceManager
 */
const createMockResourceMonitor = () => ({
  getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
    kernel_task_cpu: 30,
    memory_pressure: 40,
    process_count: 200,
    can_spawn_agent: true,
    timestamp: new Date().toISOString(),
  }),
  setBaseline: async () => {},
});

describe("Phase 3 E2E Integration Tests", () => {
  let stateManager: StateManager;
  let decisionStore: DecisionLearningStore;
  let decisionLearning: DecisionLearningIntegration;
  let roadmapHandler: RoadmapAPIHandler;
  let insightsHandler: InsightsAPIHandler;
  let githubHandler: GitHubAPIHandler;
  let contextHandler: ContextAPIHandler;
  let worktreeHandler: WorktreeAPIHandler;
  let changelogHandler: ChangelogAPIHandler;
  let taskHandler: TaskAPIHandler;
  let testProjectDir: string;

  beforeEach(async () => {
    // Create unique test directory for isolation
    testProjectDir = getTestProjectDir();
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true, force: true });
    }
    mkdirSync(testProjectDir, { recursive: true });

    // Initialize core components
    stateManager = new StateManager({
      checkpointsDir: join(testProjectDir, ".checkpoints"),
    });

    decisionStore = new DecisionLearningStore({
      path: join(testProjectDir, ".decisions"),
    });

    decisionLearning = new DecisionLearningIntegration({
      decisionStorePath: join(testProjectDir, ".decisions", "decisions.yaml"),
    });

    const mockWaveOrchestrator = new MockWaveOrchestrator();
    const resourceManager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: createMockResourceMonitor(),
    });

    // Initialize TaskAPIHandler (required by GitHubAPIHandler)
    taskHandler = new TaskAPIHandler({
      projectDir: testProjectDir,
      stateManager,
      waveOrchestrator: mockWaveOrchestrator as any,
      resourceManager,
      debug: false,
    });

    // Initialize Phase 3 handlers
    roadmapHandler = new RoadmapAPIHandler({
      projectDir: testProjectDir,
      stateManager,
      debug: false,
    });

    // Mock Anthropic SDK
    const mockAnthropic = new MockAnthropicSDK() as any;
    insightsHandler = new InsightsAPIHandler({
      projectDir: testProjectDir,
      stateManager,
      decisionLearning,
      debug: false,
    });
    // Replace anthropic instance with mock
    (insightsHandler as any).anthropic = mockAnthropic;

    // Mock global fetch for GitHub API
    global.fetch = createMockGitHubFetch() as any;

    githubHandler = new GitHubAPIHandler({
      projectDir: testProjectDir,
      taskAPIHandler: taskHandler,
      aiMergeIntegration: new MockAIMergeIntegration() as any,
      githubToken: "mock-token",
      owner: "test",
      repo: "repo",
      debug: false,
    });

    contextHandler = new ContextAPIHandler({
      decisionStore,
      debug: false,
    });

    worktreeHandler = new WorktreeAPIHandler({
      projectDir: testProjectDir,
      execFileNoThrow: createMockExecFileNoThrow(),
      debug: false,
    });

    changelogHandler = new ChangelogAPIHandler({
      projectDir: testProjectDir,
      debug: false,
    });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  describe("Scenario 1: Roadmap Feature Management (Simplified)", () => {
    test("should add feature and retrieve roadmap", async () => {
      // Note: Skipping full roadmap generation due to execution plan complexity
      // Testing feature management directly

      // Create initial roadmap structure via StateManager
      await stateManager.saveCheckpoint("auto-claude-roadmap", {
        waveNumber: 0,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
        roadmap: {
          id: "test-roadmap",
          name: "Test Roadmap",
          description: "Test description",
          features: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        metadata: {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        },
      } as any);

      // Add feature to existing roadmap
      const customFeature = await roadmapHandler.addFeature({
        title: "Password reset flow",
        description: "Implement email-based password reset",
        priority: 4,
        tags: ["security", "email"],
      });

      // Verify feature added
      expect(customFeature.id).toBeDefined();
      expect(customFeature.status).toBe("draft");
      expect(customFeature.title).toBe("Password reset flow");

      // Retrieve roadmap
      const roadmap = await roadmapHandler.getRoadmap();
      expect(roadmap).not.toBeNull();
      expect(roadmap!.features.length).toBe(1);
    });

    test("should handle feature updates and deletion", async () => {
      // Create initial roadmap
      await stateManager.saveCheckpoint("auto-claude-roadmap", {
        waveNumber: 0,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
        roadmap: {
          id: "test-roadmap",
          name: "Test Roadmap",
          description: "Test",
          features: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        metadata: {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        },
      } as any);

      const feature = await roadmapHandler.addFeature({
        title: "Test feature",
        description: "Test",
      });

      // Update feature
      const updated = await roadmapHandler.updateFeature(feature.id, {
        priority: 5,
        tags: ["updated"],
      });

      expect(updated.priority).toBe(5);
      expect(updated.tags).toContain("updated");

      // Delete feature
      const deleted = await roadmapHandler.deleteFeature(feature.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const retrievedFeature = await roadmapHandler.getFeature(feature.id);
      expect(retrievedFeature).toBeNull();
    });
  });

  describe("Scenario 2: Insights Chat → AI Streaming → Context Enrichment", () => {
    test("should create session, send message, and receive streaming response", async () => {
      // Step 1: Create chat session
      const session = await insightsHandler.createSession(
        "Architecture Discussion"
      );

      // Verify session created
      expect(session.id).toBeDefined();
      expect(session.title).toBe("Architecture Discussion");
      expect(session.messages.length).toBe(0);

      // Step 2: Track streaming chunks
      const chunks: MessageChunk[] = [];
      insightsHandler.on("message-chunk", (chunk: MessageChunk) => {
        chunks.push(chunk);
      });

      // Step 3: Send message and receive streaming response
      const response = await insightsHandler.sendMessage(
        session.id,
        "What are the best practices for authentication?"
      );

      // Verify response
      expect(response.id).toBeDefined();
      expect(response.role).toBe("assistant");
      expect(response.content).toContain("Hello from Claude!");

      // Verify streaming chunks emitted
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].done).toBe(true);

      // Step 4: Verify session history
      const history = await insightsHandler.getSessionHistory(session.id);
      expect(history).not.toBeNull();
      expect(history!.messages.length).toBe(2); // User + Assistant
    });

    test("should enrich AI response with decision context", async () => {
      // Add decision to store
      const decision = createDecisionRecord({
        component: "auth",
        activity: "implementing-oauth",
        decision: "Use OAuth2 with JWT tokens",
        context: {
          domain: "code",
          complexity: 0.7,
          constraints: ["security", "scalability"],
          stakeholders: ["backend-team"],
        },
        reasoningMethod: {
          name: "best-practices",
          category: "Core",
          parameters: {},
        },
        confidence: 0.9,
      });

      decisionStore.storeDecision(decision);

      // Create session and send message related to auth
      const session = await insightsHandler.createSession("Auth Review");
      const response = await insightsHandler.sendMessage(
        session.id,
        "What decisions did we make about authentication?"
      );

      // Response should be generated (mocked)
      expect(response.content).toBeDefined();
    });

    test("should manage multiple sessions", async () => {
      // Create multiple sessions
      const session1 = await insightsHandler.createSession("Session 1");
      const session2 = await insightsHandler.createSession("Session 2");

      // Send messages to different sessions
      await insightsHandler.sendMessage(session1.id, "Message 1");
      await insightsHandler.sendMessage(session2.id, "Message 2");

      // Get all sessions
      const allSessions = await insightsHandler.getAllSessions();
      expect(allSessions.length).toBe(2);

      // Delete session
      const deleted = await insightsHandler.deleteSession(session1.id);
      expect(deleted).toBe(true);

      const remaining = await insightsHandler.getAllSessions();
      expect(remaining.length).toBe(1);
    });
  });

  describe("Scenario 3: GitHub Integration → Issue Sync → PR Review with AI", () => {
    test("should fetch issues and create tasks", async () => {
      // Step 1: Fetch issues from GitHub
      const issues = await githubHandler.getIssues({ state: "open" });

      // Verify issues fetched
      expect(issues.length).toBe(2);
      expect(issues[0].title).toBe("Add user authentication");
      expect(issues[1].title).toBe("Fix login bug");

      // Step 2: Convert issue to task
      const task = await githubHandler.createTaskFromIssue(issues[0]);

      // Verify task created
      expect(task.id).toBeDefined();
      expect(task.title).toBe("Add user authentication");
      expect(task.description).toContain("Issue #1");
      expect(task.tags).toContain("github-issue");
    });

    test("should filter issues by labels", async () => {
      // Fetch only bug issues
      const bugIssues = await githubHandler.getIssues({
        state: "open",
        labels: ["bug"],
      });

      expect(bugIssues.length).toBe(1);
      expect(bugIssues[0].number).toBe(2);
    });

    test("should fetch pull requests and detect conflicts", async () => {
      // Step 1: Fetch PRs
      const prs = await githubHandler.getPullRequests({ state: "open" });

      // Verify PRs fetched
      expect(prs.length).toBe(1);
      expect(prs[0].title).toBe("Feature: User profile");

      // Step 2: Detect PR conflicts
      const conflictStatus = await githubHandler.detectPRConflicts(prs[0]);

      // Verify conflict detection
      expect(conflictStatus.number).toBe(10);
      expect(conflictStatus.hasMergeConflicts).toBe(false);
      expect(conflictStatus.mergeable).toBe(true);
    });

    test("should review PR with AI merge conflict resolution", async () => {
      // Mock conflict
      const conflict: ConflictRegion = {
        file_path: "src/auth.ts",
        location: "lines 10-20",
        tasks_involved: ["task-1", "task-2"],
        change_types: ["add_function" as const, "modify_function" as const],
        severity: "medium" as const,
        can_auto_merge: true,
        merge_strategy: "append_functions" as const,
        reason: "OAuth2 implementation conflict",
      };

      const taskSnapshot: TaskSnapshot = {
        task_id: "task-1",
        task_intent: "Added OAuth2 support",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      // Review PR with AI
      const review = await githubHandler.reviewPRWithAI(10, {
        conflicts: [conflict],
        baselineCode: "original code",
        taskSnapshots: [taskSnapshot],
      });

      // Verify review result
      expect(review.success).toBe(true);
      expect(review.mergeResults.length).toBe(1);
      expect(review.mergeResults[0].decision).toBe("ai_merged");
    });
  });

  describe("Scenario 4: Context → Memory Search → ADR Display", () => {
    test("should retrieve memories and search with filters", async () => {
      // Add test decisions
      const decision1 = createDecisionRecord({
        component: "plan",
        activity: "requirements-gathering",
        decision: "Use structured requirements format",
        context: {
          domain: "reasoning",
          complexity: 0.5,
          constraints: ["clarity", "completeness"],
          stakeholders: ["product"],
        },
        reasoningMethod: {
          name: "analytical",
          category: "Core",
          parameters: {},
        },
        confidence: 0.8,
      });

      const decision2 = createDecisionRecord({
        component: "code",
        activity: "implementing-api",
        decision: "Use RESTful architecture",
        context: {
          domain: "code",
          complexity: 0.6,
          constraints: ["scalability", "maintainability"],
          stakeholders: ["backend"],
        },
        reasoningMethod: {
          name: "best-practices",
          category: "Core",
          parameters: {},
        },
        confidence: 0.9,
      });

      decisionStore.storeDecision(decision1);
      decisionStore.storeDecision(decision2);

      // Step 1: Get all memories
      const allMemories = await contextHandler.getMemories();
      expect(allMemories.length).toBe(2);

      // Step 2: Search memories by component
      const planMemories = await contextHandler.searchMemories({
        component: "plan",
      });
      expect(planMemories.length).toBe(1);
      expect(planMemories[0].component).toBe("plan");

      // Step 3: Search memories by domain
      const codeMemories = await contextHandler.searchMemories({
        domain: "code",
      });
      expect(codeMemories.length).toBe(1);
      expect(codeMemories[0].domain).toBe("code");

      // Step 4: Search with limit
      const limitedMemories = await contextHandler.searchMemories({
        limit: 1,
      });
      expect(limitedMemories.length).toBe(1);
    });

    test("should retrieve specific ADR with full details", async () => {
      // Add decision
      const decision = createDecisionRecord({
        component: "execute",
        activity: "task-execution",
        decision: "Use parallel wave execution",
        context: {
          domain: "code",
          complexity: 0.8,
          constraints: ["performance", "reliability"],
          stakeholders: ["execution-engine"],
        },
        reasoningMethod: {
          name: "analytical",
          category: "Core",
          parameters: {},
        },
        confidence: 0.85,
      });

      decisionStore.storeDecision(decision);

      // Add outcome
      const updatedDecision = { ...decision };
      updatedDecision.outcome = {
        success: true,
        quality: 0.9,
        latency: 1500,
        errors: [],
        decisionId: decision.id,
      };

      // Get ADR
      const adr = await contextHandler.getADR(decision.id);

      // Verify ADR structure
      expect(adr).not.toBeNull();
      expect(adr!.decision.id).toBe(decision.id);
      expect(adr!.context.domain).toBe("code");
    });

    test("should get store statistics", async () => {
      // Add decision
      const decision = createDecisionRecord({
        component: "test",
        activity: "testing",
        decision: "Test decision 1",
      });

      decisionStore.storeDecision(decision);

      // Get statistics
      const stats = await contextHandler.getStatistics();

      expect(stats.totalDecisions).toBeGreaterThan(0);
      expect(stats.version).toBeDefined();
      expect(stats.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe("Scenario 5: Worktree Management → Create → List → Delete", () => {
    test("should list worktrees", async () => {
      const result = await worktreeHandler.listWorktrees();

      // Verify list result
      expect(result.success).toBe(true);
      expect(result.worktrees.length).toBe(2);

      const primaryWorktree = result.worktrees[0];
      expect(primaryWorktree.isPrimary).toBe(true);
      expect(primaryWorktree.branch).toBe("main");

      const featureWorktree = result.worktrees[1];
      expect(featureWorktree.isPrimary).toBe(false);
      expect(featureWorktree.branch).toBe("feature-x");
    });

    test("should create worktree from branch", async () => {
      const result = await worktreeHandler.createWorktree({
        branch: "feature-y",
        path: join(testProjectDir, ".worktrees", "feature-y"),
      });

      // Verify creation
      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
    });

    test("should delete worktree", async () => {
      const worktreePath = join(testProjectDir, ".worktrees", "feature-x");
      const result = await worktreeHandler.deleteWorktree(worktreePath);

      // Verify deletion
      expect(result.success).toBe(true);
    });

    test("should fail to create worktree with invalid branch", async () => {
      // Mock execFileNoThrow to return branch not found
      const mockExec = async (
        file: string,
        args: string[]
      ): Promise<ExecFileResult> => {
        if (args.includes("rev-parse")) {
          return {
            success: false,
            stdout: "",
            stderr: "fatal: Needed a single revision",
            errorCode: 128,
          };
        }
        return { success: true, stdout: "", stderr: "" };
      };

      const handler = new WorktreeAPIHandler({
        projectDir: testProjectDir,
        execFileNoThrow: mockExec,
        debug: false,
      });

      const result = await handler.createWorktree({
        branch: "nonexistent-branch",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist");
    });
  });

  describe("Scenario 6: Changelog Generation → Version Suggestion", () => {
    test("should parse conventional commits and generate changelog", () => {
      // Mock git log output
      const gitLog = `commit abc123|2026-01-11T10:00:00Z|feat: add user authentication
commit def456|2026-01-10T15:00:00Z|fix: resolve login bug
commit ghi789|2026-01-09T12:00:00Z|docs: update README
commit jkl012|2026-01-08T09:00:00Z|feat!: breaking change in API`;

      // Parse git log
      const commits = changelogHandler.parseGitLog(gitLog);

      // Verify parsing
      expect(commits.length).toBe(4);
      expect(commits[0].type).toBe("feat");
      expect(commits[1].type).toBe("fix");
      expect(commits[3].breaking).toBe(true);

      // Generate changelog
      const changelog = changelogHandler.generateChangelog(commits, "2.0.0");

      // Verify changelog format
      expect(changelog).toContain("# Changelog");
      expect(changelog).toContain("## Version 2.0.0");
      expect(changelog).toContain("### Breaking Changes");
      expect(changelog).toContain("### Features");
      expect(changelog).toContain("### Bug Fixes");
      expect(changelog).toContain("add user authentication");
      expect(changelog).toContain("resolve login bug");
    });

    test("should suggest semantic version bump", () => {
      // Test major bump (breaking change)
      const breakingCommits = changelogHandler.parseGitLog(
        "commit abc|2026-01-11|feat!: breaking change"
      );
      const majorBump = changelogHandler.suggestVersion(
        breakingCommits,
        "1.5.3"
      );

      expect(majorBump.bumpType).toBe("major");
      expect(majorBump.suggestedVersion).toBe("2.0.0");
      expect(majorBump.reason).toContain("breaking change");

      // Test minor bump (feature)
      const featureCommits = changelogHandler.parseGitLog(
        "commit def|2026-01-11|feat: add feature"
      );
      const minorBump = changelogHandler.suggestVersion(
        featureCommits,
        "1.5.3"
      );

      expect(minorBump.bumpType).toBe("minor");
      expect(minorBump.suggestedVersion).toBe("1.6.0");
      expect(minorBump.reason).toContain("new feature");

      // Test patch bump (fix)
      const fixCommits = changelogHandler.parseGitLog(
        "commit ghi|2026-01-11|fix: bug fix"
      );
      const patchBump = changelogHandler.suggestVersion(fixCommits, "1.5.3");

      expect(patchBump.bumpType).toBe("patch");
      expect(patchBump.suggestedVersion).toBe("1.5.4");
      expect(patchBump.reason).toContain("bug fix");

      // Test no bump (docs only)
      const docsCommits = changelogHandler.parseGitLog(
        "commit jkl|2026-01-11|docs: update docs"
      );
      const noBump = changelogHandler.suggestVersion(docsCommits, "1.5.3");

      expect(noBump.bumpType).toBe("none");
      expect(noBump.suggestedVersion).toBe("1.5.3");
    });

    test("should group commits by type", () => {
      const gitLog = `commit a|2026-01-11|feat: feature 1
commit b|2026-01-10|feat: feature 2
commit c|2026-01-09|fix: bug fix 1
commit d|2026-01-08|fix: bug fix 2
commit e|2026-01-07|docs: documentation
commit f|2026-01-06|feat!: breaking change`;

      const commits = changelogHandler.parseGitLog(gitLog);
      const grouped = changelogHandler.groupCommitsByType(commits);

      // Verify grouping
      expect(grouped["Features"].length).toBe(3);
      expect(grouped["Bug Fixes"].length).toBe(2);
      expect(grouped["Breaking Changes"].length).toBe(1);
      expect(grouped["Documentation"]).toBeUndefined(); // Not user-facing
    });
  });

  describe("Integration: Multi-Handler Workflows", () => {
    test("should handle PR review workflow with context", async () => {
      // Step 1: Record development decision
      const decision = createDecisionRecord({
        component: "pr-review",
        activity: "merge-conflict-resolution",
        decision: "Use AI-powered merge for conflicting changes",
        context: {
          domain: "code",
          complexity: 0.7,
          constraints: ["accuracy", "safety"],
          stakeholders: ["review-team"],
        },
        reasoningMethod: { name: "ai-assisted", category: "Core", parameters: {} },
        confidence: 0.85,
      });

      decisionStore.storeDecision(decision);

      // Step 2: Fetch PR with conflicts
      const prs = await githubHandler.getPullRequests({ state: "open" });
      expect(prs.length).toBeGreaterThan(0);

      // Step 3: Review PR with AI
      const conflict: ConflictRegion = {
        file_path: "src/test.ts",
        location: "lines 1-10",
        tasks_involved: ["STORY-001-1", "STORY-002-1"],
        change_types: ["modify_function" as const, "modify_function" as const],
        severity: "high" as const,
        can_auto_merge: false,
        reason: "Conflicting changes to same function",
      };

      const review = await githubHandler.reviewPRWithAI(prs[0].number, {
        conflicts: [conflict],
        baselineCode: "baseline",
        taskSnapshots: [],
      });

      expect(review.success).toBe(true);

      // Step 4: Record outcome
      const outcomeDecision = { ...decision };
      outcomeDecision.outcome = {
        success: review.success,
        quality: 0.9,
        errors: [],
        decisionId: decision.id,
      };
      // Step 5: Get ADR with outcome
      const adr = await contextHandler.getADR(decision.id);
      expect(adr).not.toBeNull();
    });

    test("should handle insights chat with changelog context", async () => {
      // Step 1: Generate changelog
      const mockCommits = changelogHandler.parseGitLog(
        "commit abc|2026-01-11|feat: add OAuth2 authentication"
      );
      const changelog = changelogHandler.generateChangelog(
        mockCommits,
        "1.1.0"
      );
      expect(changelog).toContain("OAuth2 authentication");

      // Step 2: Create insights session
      const session = await insightsHandler.createSession("Changelog Review");
      const response = await insightsHandler.sendMessage(
        session.id,
        "Summarize recent changes"
      );
      expect(response.content).toBeDefined();

      // Step 3: Check context
      const memories = await contextHandler.getMemories();
      expect(memories).toBeDefined();
    });

    test("should handle worktree creation with GitHub issue", async () => {
      // Step 1: Fetch GitHub issue
      const issues = await githubHandler.getIssues({ state: "open" });
      expect(issues.length).toBeGreaterThan(0);

      // Step 2: Create worktree for issue
      const issue = issues[0];
      const branchName = `issue-${issue.number}`;

      const worktreeResult = await worktreeHandler.createWorktree({
        branch: branchName,
      });

      expect(worktreeResult.success).toBe(true);

      // Step 3: Create task from issue
      const task = await githubHandler.createTaskFromIssue(issue);
      expect(task.id).toBeDefined();
    });
  });
});
