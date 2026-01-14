# rad-engineer Integration - API Reference

> **Complete IPC API Documentation for Auto-Claude Integration**

This document provides comprehensive API documentation for all IPC handlers, including channels, schemas, events, and error handling.

---

## Table of Contents

1. [TaskAPIHandler](#taskapihandler)
2. [RoadmapAPIHandler](#roadmapapihandler)
3. [InsightsAPIHandler](#insightsapihandler)
4. [GitHubAPIHandler](#githubapihandler)
5. [ContextAPIHandler](#contextapihandler)
6. [WorktreeAPIHandler](#worktreeapihandler)
7. [ChangelogAPIHandler](#changelogapihandler)
8. [SettingsAPIHandler](#settingsapihandler)
9. [EventBroadcaster](#eventbroadcaster)
10. [Error Handling](#error-handling)

---

## TaskAPIHandler

**Purpose**: Task CRUD operations with StateManager persistence and WaveOrchestrator execution.

**Location**: `src/ui-adapter/TaskAPIHandler.ts`

### IPC Channels

#### `task:get-all`

Get all tasks sorted by creation time (newest first).

**Request**: None

**Response**: `AutoClaudeTask[]`

```typescript
interface AutoClaudeTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
  priority?: number;          // 1-5, 5 is highest
  tags?: string[];
  progress?: number;          // 0-100
  error?: string;             // Error message if failed
  qualityGates?: QualityGatesResults;
}
```

**Example**:
```typescript
const tasks = await ipcRenderer.invoke("task:get-all");
// [{ id: "task-123", title: "...", status: "pending", ... }]
```

---

#### `task:get`

Get specific task by ID.

**Request**: `string` (task ID)

**Response**: `AutoClaudeTask | null`

**Example**:
```typescript
const task = await ipcRenderer.invoke("task:get", "task-123");
if (task) {
  console.log(task.status);
}
```

---

#### `task:create`

Create a new task.

**Request**: `AutoClaudeTaskSpec`

```typescript
interface AutoClaudeTaskSpec {
  title: string;              // Required
  description: string;        // Required
  priority?: number;          // Optional: 1-5
  tags?: string[];            // Optional
}
```

**Response**: `AutoClaudeTask`

**Example**:
```typescript
const task = await ipcRenderer.invoke("task:create", {
  title: "Implement user profile API",
  description: "Create REST API endpoints for user profile CRUD",
  priority: 4,
  tags: ["backend", "api"]
});
// { id: "task-123", title: "...", status: "pending", ... }
```

---

#### `task:update`

Update an existing task.

**Request**: `{ taskId: string; updates: Partial<AutoClaudeTask> }`

**Response**: `AutoClaudeTask`

**Example**:
```typescript
const task = await ipcRenderer.invoke("task:update", {
  taskId: "task-123",
  updates: {
    status: "in_progress",
    progress: 50
  }
});
```

**Throws**: Error if task not found

---

#### `task:delete`

Delete a task.

**Request**: `string` (task ID)

**Response**: `boolean` (true if deleted, false if not found)

**Example**:
```typescript
const deleted = await ipcRenderer.invoke("task:delete", "task-123");
// true
```

---

#### `task:start`

Start task execution.

**Request**: `string` (task ID)

**Response**: `void`

**Process**:
1. Validates task exists and is not already running
2. Updates status to "in_progress"
3. Converts task to Wave format
4. Executes via WaveOrchestrator (async)
5. Runs quality gates after execution
6. Updates final status

**Example**:
```typescript
await ipcRenderer.invoke("task:start", "task-123");
// Task starts executing in background
```

**Throws**:
- Error if task not found
- Error if task already in progress
- Error if task already completed
- Error if WaveOrchestrator not available

---

#### `task:stop`

Stop task execution.

**Request**: `string` (task ID)

**Response**: `void`

**Example**:
```typescript
await ipcRenderer.invoke("task:stop", "task-123");
```

**Throws**:
- Error if task not found
- Error if task not in progress

---

### Events

#### `task-updated`

Emitted when task is created, updated, or status changes.

**Payload**: `AutoClaudeTask`

**Example**:
```typescript
handler.on("task-updated", (task) => {
  console.log(`Task ${task.id} updated: ${task.status}`);
});
```

---

#### `task-progress`

Emitted during task execution with progress updates.

**Payload**: `TaskProgressEvent`

```typescript
interface TaskProgressEvent {
  taskId: string;
  progress: number;           // 0-100
  message: string;            // Status message
  waveNumber?: number;        // Current wave
  totalWaves?: number;        // Total waves
}
```

**Example**:
```typescript
handler.on("task-progress", (event) => {
  console.log(`${event.progress}% - ${event.message}`);
});
```

---

#### `quality:completed`

Emitted when quality gates complete.

**Payload**: `{ taskId: string; results: QualityGatesResults }`

```typescript
interface QualityGatesResults {
  passed: boolean;            // Overall pass/fail
  gates: QualityGateResult[]; // Individual gate results
  totalDuration: number;      // Total duration (ms)
  startedAt: string;          // ISO timestamp
  completedAt: string;        // ISO timestamp
}

interface QualityGateResult {
  type: "typecheck" | "lint" | "test";
  passed: boolean;
  severity: "required" | "warning";
  output: string;             // Command output
  duration: number;           // Duration (ms)
  error?: string;             // Error message if failed
  timestamp: string;          // ISO timestamp
}
```

**Example**:
```typescript
handler.on("quality:completed", ({ taskId, results }) => {
  console.log(`Quality gates for ${taskId}: ${results.passed ? "PASSED" : "FAILED"}`);
  results.gates.forEach(gate => {
    console.log(`  ${gate.type}: ${gate.passed ? "✓" : "✗"}`);
  });
});
```

---

#### `error`

Emitted when operations fail.

**Payload**: `HandlerErrorEvent`

```typescript
interface HandlerErrorEvent {
  code: string;               // Error code
  message: string;            // User-friendly message
  action: string;             // Actionable guidance
  details: string;            // Technical details
}
```

**Example**:
```typescript
handler.on("error", (error) => {
  console.error(`Error ${error.code}: ${error.message}`);
  console.error(`Action: ${error.action}`);
});
```

---

## RoadmapAPIHandler

**Purpose**: Roadmap generation and feature management with /plan skill integration.

**Location**: `src/ui-adapter/RoadmapAPIHandler.ts`

### IPC Channels

#### `roadmap:get`

Get current roadmap.

**Request**: None

**Response**: `Roadmap | null`

```typescript
interface Roadmap {
  id: string;
  name: string;
  description: string;
  features: RoadmapFeature[];
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}

interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  status: "draft" | "specified" | "planned" | "in_progress" | "completed" | "cancelled";
  priority: number;           // 1-5, 5 is highest
  tags: string[];
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
  executionPlan?: ExecutionPlan;
  requirements?: StructuredRequirements;
  research?: ResearchFindings;
}
```

**Example**:
```typescript
const roadmap = await ipcRenderer.invoke("roadmap:get");
if (roadmap) {
  console.log(`Roadmap: ${roadmap.name}, ${roadmap.features.length} features`);
}
```

---

#### `roadmap:generate`

Generate roadmap from natural language query.

**Request**: `{ query: string; name: string; description?: string }`

**Response**: `Roadmap`

**Example**:
```typescript
const roadmap = await ipcRenderer.invoke("roadmap:generate", {
  query: "Build a user authentication system with OAuth and email login",
  name: "Auth System Roadmap",
  description: "Complete authentication implementation"
});
```

**Process**:
1. Gathers requirements via IntakeHandler
2. Conducts research (simulated in current implementation)
3. Generates execution plan via ExecutionPlanGenerator
4. Validates execution plan
5. Creates roadmap with features from waves
6. Saves to StateManager
7. Emits `roadmap-updated` event

---

#### `roadmap:add-feature`

Add feature to current roadmap.

**Request**: `{ title: string; description: string; priority?: number; tags?: string[] }`

**Response**: `RoadmapFeature`

**Example**:
```typescript
const feature = await ipcRenderer.invoke("roadmap:add-feature", {
  title: "Password reset flow",
  description: "Email-based password reset",
  priority: 4,
  tags: ["auth", "security"]
});
```

**Throws**: Error if no roadmap exists

---

#### `roadmap:update-feature`

Update feature.

**Request**: `{ featureId: string; updates: Partial<RoadmapFeature> }`

**Response**: `RoadmapFeature`

**Example**:
```typescript
const feature = await ipcRenderer.invoke("roadmap:update-feature", {
  featureId: "feature-123",
  updates: {
    status: "in_progress",
    priority: 5
  }
});
```

**Throws**: Error if roadmap or feature not found

---

#### `roadmap:convert-feature-to-spec`

Convert draft feature to executable specification.

**Request**: `string` (feature ID)

**Response**: `RoadmapFeature`

**Example**:
```typescript
const feature = await ipcRenderer.invoke("roadmap:convert-feature-to-spec", "feature-123");
// feature.status === "specified"
// feature.executionPlan is now populated
```

**Throws**:
- Error if feature not found
- Error if feature not in draft status

---

#### `roadmap:delete-feature`

Delete feature from roadmap.

**Request**: `string` (feature ID)

**Response**: `boolean` (true if deleted, false if not found)

**Example**:
```typescript
const deleted = await ipcRenderer.invoke("roadmap:delete-feature", "feature-123");
```

---

#### `roadmap:get-features`

Get all features from current roadmap.

**Request**: None

**Response**: `RoadmapFeature[]`

**Example**:
```typescript
const features = await ipcRenderer.invoke("roadmap:get-features");
```

---

#### `roadmap:get-feature`

Get specific feature by ID.

**Request**: `string` (feature ID)

**Response**: `RoadmapFeature | null`

**Example**:
```typescript
const feature = await ipcRenderer.invoke("roadmap:get-feature", "feature-123");
```

---

### Events

#### `roadmap-updated`

Emitted when roadmap is created or modified.

**Payload**: `Roadmap`

---

#### `feature-added`

Emitted when feature is added.

**Payload**: `RoadmapFeature`

---

#### `feature-updated`

Emitted when feature is updated.

**Payload**: `RoadmapFeature`

---

#### `feature-deleted`

Emitted when feature is deleted.

**Payload**: `string` (feature ID)

---

#### `roadmap-progress`

Emitted during roadmap generation with progress updates.

**Payload**: `{ stage: string; message: string }`

**Example**:
```typescript
handler.on("roadmap-progress", ({ stage, message }) => {
  console.log(`[${stage}] ${message}`);
});
// [requirements] Requirements gathered
// [research] Research completed
// [planning] Execution plan generated
```

---

## InsightsAPIHandler

**Purpose**: AI-powered insights chat with DecisionLearningIntegration context.

**Location**: `src/ui-adapter/InsightsAPIHandler.ts`

### IPC Channels

#### `insights:create-session`

Create new chat session.

**Request**: `string` (session title)

**Response**: `ChatSession`

```typescript
interface ChatSession {
  id: string;
  title: string;
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
  messages: ChatMessage[];
  metadata?: {
    messageCount: number;
    lastMessageAt?: string;
  };
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;          // ISO timestamp
  decisionContext?: string[]; // Decision IDs used for context
}
```

**Example**:
```typescript
const session = await ipcRenderer.invoke("insights:create-session", "Architecture Review");
```

---

#### `insights:get-session-history`

Get chat history for a session.

**Request**: `string` (session ID)

**Response**: `ChatSession | null`

**Example**:
```typescript
const session = await ipcRenderer.invoke("insights:get-session-history", "session-123");
if (session) {
  console.log(`${session.messages.length} messages`);
}
```

---

#### `insights:get-all-sessions`

Get all chat sessions sorted by last updated.

**Request**: None

**Response**: `ChatSession[]`

**Example**:
```typescript
const sessions = await ipcRenderer.invoke("insights:get-all-sessions");
```

---

#### `insights:send-message`

Send message and stream AI response.

**Request**: `{ sessionId: string; message: string }`

**Response**: `ChatMessage` (full assistant response)

**Example**:
```typescript
const response = await ipcRenderer.invoke("insights:send-message", {
  sessionId: "session-123",
  message: "What are the best methods for code domain decisions?"
});
```

**Process**:
1. Adds user message to session
2. Gathers decision context from DecisionLearningStore
3. Builds API messages with context
4. Streams response from Anthropic API
5. Emits `message-chunk` events during streaming
6. Adds assistant message to session
7. Returns full assistant message

**Note**: Use `message-chunk` event for streaming updates

---

#### `insights:delete-session`

Delete a chat session.

**Request**: `string` (session ID)

**Response**: `boolean` (true if deleted, false if not found)

**Example**:
```typescript
const deleted = await ipcRenderer.invoke("insights:delete-session", "session-123");
```

---

### Events

#### `session-created`

Emitted when session is created.

**Payload**: `ChatSession`

---

#### `message-added`

Emitted when message (user or assistant) is added to session.

**Payload**: `ChatMessage`

---

#### `message-chunk`

Emitted during AI response streaming.

**Payload**: `MessageChunk`

```typescript
interface MessageChunk {
  sessionId: string;
  messageId: string;
  content: string;            // Content chunk
  done: boolean;              // True if final chunk
}
```

**Example**:
```typescript
handler.on("message-chunk", (chunk) => {
  if (!chunk.done) {
    process.stdout.write(chunk.content);
  } else {
    console.log("\nResponse complete.");
  }
});
```

---

#### `error`

Emitted when operations fail.

**Payload**: `HandlerErrorEvent`

**Error Codes**:
- `SESSION_NOT_FOUND`: Session does not exist
- `AI_API_KEY_ERROR`: Anthropic API key not configured
- `AI_RATE_LIMIT_ERROR`: Rate limit exceeded
- `AI_NETWORK_ERROR`: Network connectivity issue
- `AI_TIMEOUT_ERROR`: Request timeout
- `AI_STREAM_ERROR`: Generic streaming error
- `SEND_MESSAGE_ERROR`: Message send failed

---

## GitHubAPIHandler

**Purpose**: GitHub integration for issue sync and PR review with AI merge.

**Location**: `src/ui-adapter/GitHubAPIHandler.ts`

### IPC Channels

#### `github:get-issues`

Fetch issues from GitHub repository.

**Request**: `GetIssuesOptions`

```typescript
interface GetIssuesOptions {
  state?: "open" | "closed" | "all";
  labels?: string[];
  per_page?: number;
  page?: number;
}
```

**Response**: `GitHubIssue[]`

```typescript
interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  html_url: string;
}
```

**Example**:
```typescript
const issues = await ipcRenderer.invoke("github:get-issues", {
  state: "open",
  labels: ["enhancement"]
});
```

---

#### `github:create-task-from-issue`

Convert GitHub issue to Auto-Claude task.

**Request**: `GitHubIssue`

**Response**: `AutoClaudeTask`

**Example**:
```typescript
const task = await ipcRenderer.invoke("github:create-task-from-issue", issue);
```

---

#### `github:get-pull-requests`

Fetch pull requests from GitHub repository.

**Request**: `GetPullRequestsOptions`

```typescript
interface GetPullRequestsOptions {
  state?: "open" | "closed" | "all";
  per_page?: number;
  page?: number;
}
```

**Response**: `GitHubPullRequest[]`

```typescript
interface GitHubPullRequest {
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
```

**Example**:
```typescript
const prs = await ipcRenderer.invoke("github:get-pull-requests", {
  state: "open"
});
```

---

#### `github:detect-pr-conflicts`

Detect merge conflicts in a pull request.

**Request**: `GitHubPullRequest`

**Response**: `PRConflictStatus`

```typescript
interface PRConflictStatus {
  number: number;
  hasMergeConflicts: boolean;
  mergeable: boolean;
  mergeable_state: string;
}
```

**Example**:
```typescript
const status = await ipcRenderer.invoke("github:detect-pr-conflicts", pr);
if (status.hasMergeConflicts) {
  console.log("PR has merge conflicts");
}
```

---

#### `github:review-pr-with-ai`

Review pull request with AI merge conflict resolution.

**Request**: `{ prNumber: number; input: PRReviewInput }`

```typescript
interface PRReviewInput {
  conflicts: ConflictRegion[];
  baselineCode: string;
  taskSnapshots: TaskSnapshot[];
}
```

**Response**: `PRReviewResult`

```typescript
interface PRReviewResult {
  prNumber: number;
  success: boolean;
  mergeResults: Array<{
    decision: "auto_merged" | "ai_merged" | "needs_human_review" | "failed";
    file_path: string;
    merged_content?: string | null;
    explanation: string;
    error?: string | null;
  }>;
  error?: string;
}
```

**Example**:
```typescript
const review = await ipcRenderer.invoke("github:review-pr-with-ai", {
  prNumber: 10,
  input: {
    conflicts: [...],
    baselineCode: "...",
    taskSnapshots: [...]
  }
});

review.mergeResults.forEach(result => {
  console.log(`${result.file_path}: ${result.decision}`);
});
```

---

### Events

#### `issues-fetched`

Emitted when issues are fetched.

**Payload**: `GitHubIssue[]`

---

#### `task-created-from-issue`

Emitted when task is created from issue.

**Payload**: `{ issue: GitHubIssue; task: AutoClaudeTask }`

---

#### `prs-fetched`

Emitted when pull requests are fetched.

**Payload**: `GitHubPullRequest[]`

---

#### `pr-reviewed`

Emitted when PR review completes.

**Payload**: `PRReviewResult`

---

#### `error`

Emitted when operations fail.

**Payload**: `HandlerErrorEvent`

**Error Codes**:
- `GITHUB_API_ERROR`: GitHub API request failed
- `GITHUB_NETWORK_ERROR`: Network connectivity issue
- `AI_MERGE_NOT_AVAILABLE`: AI merge plugin not initialized
- `AI_MERGE_CONFLICT_FAILED`: Conflict resolution failed
- `AI_MERGE_PLUGIN_ERROR`: Python plugin error
- `PR_REVIEW_ERROR`: PR review failed

---

## ContextAPIHandler

**Purpose**: Decision learning memory and ADR display.

**Location**: `src/ui-adapter/ContextAPIHandler.ts`

### IPC Channels

#### `context:get-memories`

Get all memories from decision store.

**Request**: None

**Response**: `MemoryItem[]`

```typescript
interface MemoryItem {
  id: string;
  timestamp: number;
  component: string;
  activity: string;
  decision: string;
  domain: string;
  reasoningMethod: string;
  methodCategory: string;
  confidence: number;          // 0-1
  hasOutcome: boolean;
  success?: boolean;
  quality?: number;            // 0-1
  complexity: number;
  constraints: string[];
}
```

**Example**:
```typescript
const memories = await ipcRenderer.invoke("context:get-memories");
```

---

#### `context:search-memories`

Search memories with query filters.

**Request**: `MemorySearchQuery`

```typescript
interface MemorySearchQuery {
  component?: string;
  activity?: string;
  domain?: string;
  reasoningMethod?: string;
  dateRange?: { start: number; end: number };
  hasOutcome?: boolean;
  limit?: number;
}
```

**Response**: `MemoryItem[]`

**Example**:
```typescript
const codeMemories = await ipcRenderer.invoke("context:search-memories", {
  domain: "code",
  hasOutcome: true,
  limit: 20
});
```

---

#### `context:get-adr`

Get specific ADR by decision ID.

**Request**: `string` (decision ID)

**Response**: `ADRDisplay | null`

```typescript
interface ADRDisplay {
  decision: MemoryItem;
  context: {
    domain: string;
    complexity: number;
    constraints: string[];
    stakeholders: string[];
  };
  outcome?: {
    success: boolean;
    quality: number;
    latency?: number;
    cost?: number;
    errors: string[];
    userFeedback?: string;
  };
  learning?: {
    methodEffectiveness: number;
    contextPatterns: Record<string, number>;
    recommendation: string;
  };
}
```

**Example**:
```typescript
const adr = await ipcRenderer.invoke("context:get-adr", "decision-123");
if (adr) {
  console.log("Decision:", adr.decision.decision);
  console.log("Outcome:", adr.outcome);
  console.log("Learning:", adr.learning);
}
```

---

#### `context:get-statistics`

Get store statistics.

**Request**: None

**Response**: `StoreStatistics`

```typescript
interface StoreStatistics {
  totalDecisions: number;
  decisionsWithOutcomes: number;
  averageQuality: number;
  successRate: number;
  bestMethods: Record<string, number>;
  version: string;
  lastUpdated: number;
}
```

**Example**:
```typescript
const stats = await ipcRenderer.invoke("context:get-statistics");
console.log(`Total decisions: ${stats.totalDecisions}`);
console.log(`Success rate: ${stats.successRate * 100}%`);
```

---

### Events

#### `memories-updated`

Emitted when memories are updated.

**Payload**: None (indicates refresh needed)

---

#### `learning-updated`

Emitted when a decision outcome is processed.

**Payload**: `LearningUpdate`

```typescript
interface LearningUpdate {
  decisionId: string;
  methodName: string;
  effectiveness: number;
  improvement: number;
}
```

---

## WorktreeAPIHandler

**Purpose**: Git worktree management operations.

**Location**: `src/ui-adapter/WorktreeAPIHandler.ts`

### IPC Channels

#### `worktree:list`

List all worktrees in repository.

**Request**: None

**Response**: `WorktreeListResult`

```typescript
interface WorktreeListResult {
  success: boolean;
  worktrees: WorktreeInfo[];
  error?: string;
}

interface WorktreeInfo {
  path: string;               // Absolute path
  head: string;               // HEAD commit hash
  branch: string;             // Branch name
  isPrimary: boolean;         // Whether primary worktree
}
```

**Example**:
```typescript
const result = await ipcRenderer.invoke("worktree:list");
if (result.success) {
  result.worktrees.forEach(wt => {
    console.log(`${wt.branch}: ${wt.path}`);
  });
}
```

---

#### `worktree:create`

Create new worktree from branch.

**Request**: `WorktreeCreateOptions`

```typescript
interface WorktreeCreateOptions {
  branch: string;             // Required: Branch to checkout
  path?: string;              // Optional: Path for worktree
}
```

**Response**: `WorktreeCreateResult`

```typescript
interface WorktreeCreateResult {
  success: boolean;
  path?: string;              // Created path
  error?: string;
}
```

**Example**:
```typescript
const result = await ipcRenderer.invoke("worktree:create", {
  branch: "feature-x",
  path: "/project/.worktrees/feature-x" // optional
});
```

---

#### `worktree:delete`

Delete a worktree.

**Request**: `string` (worktree path)

**Response**: `WorktreeDeleteResult`

```typescript
interface WorktreeDeleteResult {
  success: boolean;
  error?: string;
}
```

**Example**:
```typescript
const result = await ipcRenderer.invoke("worktree:delete", "/project/.worktrees/feature-x");
```

---

## ChangelogAPIHandler

**Purpose**: Automated changelog generation from git history.

**Location**: `src/ui-adapter/ChangelogAPIHandler.ts`

### IPC Channels

#### `changelog:parse-commits`

Parse git commits for changelog.

**Request**: `{ from: string; to: string }`

**Response**: `{ commits: ConventionalCommit[] }`

```typescript
interface ConventionalCommit {
  hash: string;
  type: string;               // feat, fix, docs, etc.
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  author: string;
  date: string;
}
```

**Example**:
```typescript
const result = await ipcRenderer.invoke("changelog:parse-commits", {
  from: "v1.0.0",
  to: "HEAD"
});
```

---

#### `changelog:suggest-version`

Suggest next version based on commits.

**Request**: None

**Response**: `VersionSuggestion`

```typescript
interface VersionSuggestion {
  current: string;
  suggested: string;
  bumpType: "major" | "minor" | "patch";
}
```

**Example**:
```typescript
const version = await ipcRenderer.invoke("changelog:suggest-version");
// { current: "1.0.0", suggested: "1.1.0", bumpType: "minor" }
```

---

#### `changelog:format`

Format commits as changelog markdown.

**Request**: `ConventionalCommit[]`

**Response**: `string` (markdown)

**Example**:
```typescript
const markdown = await ipcRenderer.invoke("changelog:format", commits);
console.log(markdown);
```

---

## EventBroadcaster

**Purpose**: Real-time event streaming with backpressure handling.

**Location**: `src/ui-adapter/EventBroadcaster.ts`

### Event Channels

#### `task:progress`

Task progress updates (debounced 200ms = 5 events/sec).

**Payload**: `TaskProgressEvent`

---

#### `task:status`

Task status changes (immediate, no throttling).

**Payload**: `TaskStatusEvent`

```typescript
interface TaskStatusEvent {
  taskId: string;
  status: string;
  timestamp: string;
  error?: string;
}
```

---

#### `agent:output`

Agent output streaming (throttled 100ms = 10 events/sec).

**Payload**: `AgentOutputEvent`

```typescript
interface AgentOutputEvent {
  taskId: string;
  agentId: string;
  output: string;
  timestamp: string;
}
```

---

#### `terminal:output`

Terminal output streaming (throttled 100ms = 10 events/sec).

**Payload**: `TerminalOutputEvent`

```typescript
interface TerminalOutputEvent {
  taskId: string;
  sessionId: string;
  output: string;
  timestamp: string;
}
```

---

## Error Handling

### Error Event Structure

All handlers emit structured error events:

```typescript
interface HandlerErrorEvent {
  code: string;               // Machine-readable error code
  message: string;            // User-friendly error message
  action: string;             // Actionable guidance for user
  details: string;            // Technical details (stack trace, etc.)
}
```

### Common Error Codes

#### TaskAPIHandler

| Code | Description | Action |
|------|-------------|--------|
| `LOAD_TASKS_ERROR` | Failed to load tasks | Check project directory is writable |
| `LOAD_TASK_ERROR` | Failed to load task | Check storage is not corrupted |
| `CREATE_TASK_ERROR` | Failed to create task | Verify disk space available |
| `UPDATE_TASK_ERROR` | Failed to update task | Check storage is accessible |
| `TASK_NOT_FOUND` | Task does not exist | Verify task ID is correct |
| `TASK_ALREADY_RUNNING` | Task is executing | Wait or stop before restarting |
| `TASK_ALREADY_COMPLETED` | Task already completed | Create new task to re-run |
| `ORCHESTRATOR_NOT_AVAILABLE` | WaveOrchestrator not initialized | Restart application |
| `START_TASK_ERROR` | Failed to start task | Check StateManager initialized |
| `WAVE_EXECUTION_ERROR` | Task execution failed | Check task output for details |
| `QUALITY_GATE_EXECUTION_ERROR` | Quality gate failed to execute | Check tooling installed (pnpm, etc.) |
| `QUALITY_GATES_ERROR` | Quality gates orchestration failed | Check system resources |

#### InsightsAPIHandler

| Code | Description | Action |
|------|-------------|--------|
| `SESSION_NOT_FOUND` | Session does not exist | Create new session or verify ID |
| `AI_API_KEY_ERROR` | Anthropic API key not configured | Set ANTHROPIC_API_KEY env var |
| `AI_RATE_LIMIT_ERROR` | Rate limit exceeded | Wait or upgrade API plan |
| `AI_NETWORK_ERROR` | Network connectivity issue | Check internet connection |
| `AI_TIMEOUT_ERROR` | Request timeout | Try shorter message |
| `AI_STREAM_ERROR` | Generic streaming error | Check API key and network |
| `SEND_MESSAGE_ERROR` | Message send failed | Check session exists and storage accessible |

#### GitHubAPIHandler

| Code | Description | Action |
|------|-------------|--------|
| `GITHUB_API_ERROR` | GitHub API request failed | Check token and permissions |
| `GITHUB_NETWORK_ERROR` | Network connectivity issue | Check internet connection |
| `AI_MERGE_NOT_AVAILABLE` | AI merge plugin not initialized | Check Python environment |
| `AI_MERGE_CONFLICT_FAILED` | Conflict resolution failed | Review manually or retry |
| `AI_MERGE_PLUGIN_ERROR` | Python plugin error | Restart application |
| `PR_REVIEW_ERROR` | PR review failed | Verify PR data is valid |

### Error Handling Example

```typescript
// Listen for errors from any handler
handler.on("error", (error: HandlerErrorEvent) => {
  // Display to user
  showNotification({
    type: "error",
    title: error.message,
    description: error.action,
    details: error.details
  });

  // Log for debugging
  console.error(`[${error.code}] ${error.message}`);
  console.error(`Details: ${error.details}`);

  // Track for analytics
  trackError(error.code, error.details);
});
```

---

## Complete Example: Task Execution with All APIs

```typescript
// 1. Create task
const task = await ipcRenderer.invoke("task:create", {
  title: "Implement feature X",
  description: "Add feature X with tests",
  priority: 5
});

// 2. Listen for events
ipcMain.on("task:progress", (event, progress) => {
  console.log(`${progress.progress}% - ${progress.message}`);
});

ipcMain.on("task:status", (event, status) => {
  console.log(`Status: ${status.status}`);
});

handler.on("quality:completed", ({ taskId, results }) => {
  console.log(`Quality: ${results.passed ? "PASS" : "FAIL"}`);
});

handler.on("error", (error) => {
  console.error(`Error: ${error.message}`);
});

// 3. Start task
await ipcRenderer.invoke("task:start", task.id);

// 4. Wait for completion (via event)
ipcMain.on("task:status", async (event, status) => {
  if (status.taskId === task.id && status.status === "completed") {
    // 5. Get final task state
    const finalTask = await ipcRenderer.invoke("task:get", task.id);

    // 6. Check quality gates
    if (finalTask.qualityGates?.passed) {
      console.log("Task completed with quality!");
    } else {
      console.log("Task completed but quality gates failed");
    }
  }
});
```

---

**Version**: 1.0.0
**Last Updated**: 2026-01-11

For issues or questions, please file an issue on GitHub or contact support.
