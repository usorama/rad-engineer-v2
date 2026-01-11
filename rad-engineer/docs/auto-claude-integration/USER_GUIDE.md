# rad-engineer Integration - User Guide

> **Getting Started with the rad-engineer Auto-Claude Integration**

This guide helps you install, configure, and use the rad-engineer integration with Auto-Claude's desktop UI for autonomous engineering workflows.

---

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Key Features](#key-features)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Installation

### Prerequisites

Before installing, ensure you have the following:

- **Node.js**: Version 20 or higher
- **Bun**: Version 1.0 or higher (for fast test execution)
- **Python**: Version 3.10 or higher (for Python plugin support)
- **Git**: Latest version
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check Bun version
bun --version   # Should be 1.x.x or higher

# Check Python version
python3 --version  # Should be 3.10.x or higher

# Check Git version
git --version
```

### Installation Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-org/rad-engineer-v2.git
   cd rad-engineer-v2/rad-engineer
   ```

2. **Install Dependencies**

   ```bash
   # Install Node.js dependencies
   bun install

   # Verify installation
   bun run typecheck  # Should show 0 errors
   ```

3. **Configure API Keys**

   Create a `.env` file in the project root:

   ```bash
   # Anthropic API key for AI-powered features
   ANTHROPIC_API_KEY=sk-ant-...

   # Optional: GitHub token for GitHub integration
   GITHUB_TOKEN=ghp_...
   ```

4. **Run Tests** (optional, to verify installation)

   ```bash
   bun test
   ```

### Post-Installation Verification

```bash
# Verify all systems are operational
bun run typecheck  # 0 errors
bun run lint       # 0 errors
bun test           # All tests pass
```

---

## Configuration

### Project Configuration

The integration uses `StateManager` to persist configuration. Configuration is stored in:

```
<project-dir>/.auto-claude-integration/
├── tasks-checkpoint.json       # Task state
├── auto-claude-roadmap.json    # Roadmap state
├── insights-chat-sessions.json # Chat history
└── settings.json               # User settings
```

### Settings API

Configure application settings via the Settings API:

#### API Profiles

Store multiple AI provider credentials:

```typescript
// Example profile configuration
{
  id: "default-anthropic",
  name: "Default Anthropic",
  provider: "anthropic",
  apiKey: "sk-ant-...",
  baseURL: "https://api.anthropic.com",
  model: "claude-3-5-sonnet-20241022",
  isDefault: true
}
```

Supported providers:
- `anthropic`: Claude models (default)
- `openai`: GPT models
- `glm`: Zhipu GLM models
- `ollama`: Local Ollama models

#### App Settings

Configure application behavior:

```typescript
{
  theme: "dark" | "light",
  language: "en" | "zh",
  autoSave: boolean,
  notifications: boolean
}
```

### GitHub Integration

To enable GitHub features:

1. Generate a GitHub Personal Access Token:
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens
   - Create token with `repo` scope

2. Configure via Settings API:
   ```typescript
   settings.githubToken = "ghp_...";
   settings.githubOwner = "your-org";
   settings.githubRepo = "your-repo";
   ```

---

## Key Features

### 1. Roadmap Generation

**Generate execution roadmaps from natural language queries.**

#### How It Works

1. **Input**: Natural language description of what you want to build
2. **Processing**:
   - Gathers requirements via IntakeHandler
   - Conducts feasibility research
   - Generates phased execution plan
3. **Output**: Structured roadmap with features and waves

#### Example Usage

```typescript
// Generate roadmap
const roadmap = await roadmapHandler.generateRoadmap({
  query: "Build a user authentication system with OAuth and email login",
  name: "Auth System Roadmap",
  description: "Complete authentication implementation"
});

// Roadmap structure:
{
  id: "roadmap-123",
  name: "Auth System Roadmap",
  features: [
    {
      id: "feature-1",
      title: "OAuth Integration",
      status: "planned",
      priority: 5,
      executionPlan: { waves: [...] }
    },
    // ... more features
  ]
}
```

#### Roadmap Operations

- **Add Feature**: Add new features to existing roadmap
- **Update Feature**: Modify feature details or priority
- **Convert to Spec**: Convert draft feature to executable specification
- **Delete Feature**: Remove feature from roadmap

### 2. Insights Chat

**AI-powered insights with decision learning context.**

#### How It Works

1. **Context Gathering**: Queries DecisionLearningStore for relevant decisions
2. **AI Query**: Sends message to Claude with enriched context
3. **Streaming Response**: Real-time AI response streamed to UI

#### Example Usage

```typescript
// Create chat session
const session = await insightsHandler.createSession("Architecture Review");

// Send message
await insightsHandler.sendMessage(
  session.id,
  "What are the best methods for code domain decisions?"
);

// Listen for streaming response
insightsHandler.on("message-chunk", (chunk) => {
  if (!chunk.done) {
    console.log(chunk.content); // Stream AI response
  }
});
```

#### Best Practices

- **Specific Queries**: Ask targeted questions for better context matching
- **Domain Filtering**: Mention domain (code, creative, reasoning) for focused results
- **Session Management**: Create separate sessions for different topics

### 3. GitHub Integration

**Sync GitHub issues and PRs with automated conflict resolution.**

#### Features

- **Issue Import**: Convert GitHub issues to Auto-Claude tasks
- **PR Review**: AI-powered merge conflict resolution
- **Priority Mapping**: Automatically map issue labels to task priorities

#### Example Usage

```typescript
// Fetch open issues
const issues = await githubHandler.getIssues({ state: "open" });

// Convert issue to task
const task = await githubHandler.createTaskFromIssue(issues[0]);

// Review PR with AI merge
const review = await githubHandler.reviewPRWithAI(prNumber, {
  conflicts: [...],
  baselineCode: "...",
  taskSnapshots: [...]
});
```

#### PR Review Decisions

AI merge returns one of:
- `auto_merged`: Simple conflict, merged automatically
- `ai_merged`: Complex conflict, AI suggested merge
- `needs_human_review`: Too complex, human review needed
- `failed`: Merge failed, manual intervention required

### 4. Context View

**Browse decision learning history and ADRs.**

#### Features

- **Memory Browser**: View all decisions with outcomes
- **ADR Display**: Full Architecture Decision Records
- **Search & Filter**: Find decisions by component, domain, method
- **Statistics**: Success rates, best methods, quality scores

#### Example Usage

```typescript
// Get all memories
const memories = await contextHandler.getMemories();

// Search by criteria
const codeDecisions = await contextHandler.searchMemories({
  domain: "code",
  hasOutcome: true,
  limit: 20
});

// Get specific ADR
const adr = await contextHandler.getADR("decision-123");

// Get statistics
const stats = await contextHandler.getStatistics();
// {
//   totalDecisions: 150,
//   decisionsWithOutcomes: 120,
//   averageQuality: 0.85,
//   successRate: 0.92,
//   bestMethods: { "ReasoningMethod1": 0.95, ... }
// }
```

### 5. Worktree Management

**Manage git worktrees for parallel development.**

#### Features

- **List Worktrees**: View all active worktrees
- **Create Worktree**: Create new worktree from branch
- **Delete Worktree**: Clean up worktree

#### Example Usage

```typescript
// List all worktrees
const result = await worktreeHandler.listWorktrees();
console.log(result.worktrees);
// [
//   { path: "/project", branch: "main", isPrimary: true },
//   { path: "/project/.worktrees/feature-x", branch: "feature-x", isPrimary: false }
// ]

// Create worktree
await worktreeHandler.createWorktree({
  branch: "feature-y",
  path: "/project/.worktrees/feature-y" // optional
});

// Delete worktree
await worktreeHandler.deleteWorktree("/project/.worktrees/feature-x");
```

### 6. Changelog Generation

**Automated changelog generation from git history.**

#### Features

- **Conventional Commits**: Parses conventional commit format
- **Semantic Versioning**: Suggests version bumps
- **Category Grouping**: Groups changes by type (feat, fix, etc.)

#### Example Usage

```typescript
// Parse commits for changelog
const result = await changelogHandler.parseCommits({
  from: "v1.0.0",
  to: "HEAD"
});

// Get version suggestion
const version = await changelogHandler.suggestVersion();
// {
//   current: "1.0.0",
//   suggested: "1.1.0",
//   bumpType: "minor"
// }

// Format changelog
const changelog = await changelogHandler.formatChangelog(result.commits);
```

---

## Common Workflows

### Workflow 1: Create and Execute Task

**End-to-end task execution with quality gates.**

```typescript
// 1. Create task
const task = await taskHandler.createTask({
  title: "Implement user profile API",
  description: "Create REST API endpoints for user profile CRUD operations",
  priority: 4,
  tags: ["backend", "api"]
});

// 2. Start task execution
await taskHandler.startTask(task.id);

// 3. Monitor progress
taskHandler.on("task-progress", (progress) => {
  console.log(`${progress.progress}% - ${progress.message}`);
});

// 4. Handle completion
taskHandler.on("task-updated", (updatedTask) => {
  if (updatedTask.status === "completed") {
    console.log("Task completed!");
    console.log("Quality Gates:", updatedTask.qualityGates);
  }
});
```

### Workflow 2: GitHub Issue to Execution

**Import GitHub issue and execute as task.**

```typescript
// 1. Fetch issues
const issues = await githubHandler.getIssues({
  state: "open",
  labels: ["enhancement"]
});

// 2. Convert to task
const task = await githubHandler.createTaskFromIssue(issues[0]);

// 3. Execute task
await taskHandler.startTask(task.id);

// 4. Monitor and complete
// (Same as Workflow 1)
```

### Workflow 3: Roadmap-Driven Development

**Generate roadmap and execute features sequentially.**

```typescript
// 1. Generate roadmap
const roadmap = await roadmapHandler.generateRoadmap({
  query: "Build a blog platform with posts, comments, and user auth",
  name: "Blog Platform"
});

// 2. Iterate through features
for (const feature of roadmap.features) {
  // 3. Convert feature to spec
  await roadmapHandler.convertFeatureToSpec(feature.id);

  // 4. Create task from feature
  const task = await taskHandler.createTask({
    title: feature.title,
    description: feature.description,
    tags: feature.tags
  });

  // 5. Execute task
  await taskHandler.startTask(task.id);

  // 6. Wait for completion before next feature
  // (Use event listeners or polling)
}
```

### Workflow 4: AI-Assisted Code Review

**Review PR with AI merge conflict resolution.**

```typescript
// 1. Fetch PR
const prs = await githubHandler.getPullRequests({ state: "open" });
const pr = prs[0];

// 2. Detect conflicts
const conflictStatus = await githubHandler.detectPRConflicts(pr);

if (conflictStatus.hasMergeConflicts) {
  // 3. Review with AI
  const review = await githubHandler.reviewPRWithAI(pr.number, {
    conflicts: [...], // Detected conflicts
    baselineCode: "...", // Base branch code
    taskSnapshots: [...] // Related task snapshots
  });

  // 4. Process results
  for (const result of review.mergeResults) {
    if (result.decision === "ai_merged") {
      console.log(`AI merged: ${result.file_path}`);
      console.log(`Explanation: ${result.explanation}`);
      // Apply merged content
    } else if (result.decision === "needs_human_review") {
      console.log(`Human review needed: ${result.file_path}`);
    }
  }
}
```

### Workflow 5: Decision Learning Query

**Query insights based on past decisions.**

```typescript
// 1. Create chat session
const session = await insightsHandler.createSession("Decision Analysis");

// 2. Query specific domain
await insightsHandler.sendMessage(
  session.id,
  "What reasoning methods work best for code domain decisions with high complexity?"
);

// 3. Stream AI response
insightsHandler.on("message-chunk", (chunk) => {
  if (!chunk.done) {
    process.stdout.write(chunk.content);
  } else {
    console.log("\nResponse complete.");
  }
});

// 4. Explore memories directly
const codeMemories = await contextHandler.searchMemories({
  domain: "code",
  hasOutcome: true,
  limit: 10
});

// 5. View specific ADR
if (codeMemories.length > 0) {
  const adr = await contextHandler.getADR(codeMemories[0].id);
  console.log("Decision:", adr.decision);
  console.log("Outcome:", adr.outcome);
  console.log("Learning:", adr.learning);
}
```

---

## Troubleshooting

### Common Issues

#### Issue: "Anthropic API key not configured"

**Symptoms**: AI features fail with API key error

**Solutions**:
1. Set environment variable:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Or configure via `.env` file
3. Or provide key in handler config:
   ```typescript
   new InsightsAPIHandler({
     apiKey: "sk-ant-...",
     // ...
   })
   ```

#### Issue: "Task not found"

**Symptoms**: Operations on task fail with "Task not found"

**Solutions**:
1. Verify task ID is correct
2. Check that task exists:
   ```typescript
   const task = await taskHandler.getTask(taskId);
   if (!task) {
     console.log("Task does not exist");
   }
   ```
3. Ensure StateManager is initialized properly

#### Issue: "GitHub API rate limit exceeded"

**Symptoms**: GitHub operations fail with 403 status

**Solutions**:
1. Wait for rate limit reset (typically 1 hour)
2. Use authenticated token with higher rate limits
3. Implement caching to reduce API calls
4. Check remaining rate limit:
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
   ```

#### Issue: "Quality gates failed"

**Symptoms**: Task completes but marked as failed due to quality gates

**Solutions**:
1. Check quality gate results:
   ```typescript
   const task = await taskHandler.getTask(taskId);
   task.qualityGates?.gates.forEach(gate => {
     console.log(`${gate.type}: ${gate.passed ? "PASSED" : "FAILED"}`);
     if (!gate.passed) {
       console.log(`Error: ${gate.error}`);
     }
   });
   ```
2. Fix code quality issues:
   - **typecheck**: Fix TypeScript errors
   - **lint**: Fix linting issues
   - **test**: Fix failing tests
3. Re-run task after fixes

#### Issue: "AI merge plugin not available"

**Symptoms**: PR review fails with plugin error

**Solutions**:
1. Verify Python environment is set up:
   ```bash
   python3 --version  # Should be 3.10+
   ```
2. Check Python plugin installation:
   ```bash
   ls src/python-bridge/plugins/
   # Should contain ai-merge plugin files
   ```
3. Restart application to reload plugins

#### Issue: "Context overflow" or "Memory low"

**Symptoms**: Chat sessions or insights fail with context errors

**Solutions**:
1. Create new chat session (old sessions accumulate context)
2. Use specific queries (reduces context loaded)
3. Limit search results:
   ```typescript
   contextHandler.searchMemories({ limit: 10 })
   ```
4. Clear old chat sessions:
   ```typescript
   await insightsHandler.deleteSession(oldSessionId);
   ```

### Performance Issues

#### Slow Task Execution

**Symptoms**: Tasks take longer than expected

**Solutions**:
1. Check system resources (CPU, memory)
2. Reduce concurrent tasks (WaveOrchestrator limit)
3. Enable caching in handlers
4. Profile with debug logging:
   ```typescript
   new TaskAPIHandler({ debug: true })
   ```

#### High Memory Usage

**Symptoms**: Application uses excessive memory

**Solutions**:
1. Clear handler caches periodically:
   ```typescript
   roadmapHandler.invalidateCache();
   contextHandler.invalidateCache();
   ```
2. Delete old checkpoints:
   ```bash
   rm -rf .auto-claude-integration/*.old
   ```
3. Limit concurrent operations
4. Monitor with:
   ```bash
   bun run src/cli/monitor.ts
   ```

### Error Reporting

#### Enable Debug Logging

For detailed diagnostics:

```typescript
const handler = new TaskAPIHandler({
  projectDir: "/path/to/project",
  stateManager: new StateManager(),
  debug: true // Enable debug logging
});
```

#### Collect Error Evidence

When reporting issues, include:

1. **Error message**: Full error text
2. **Steps to reproduce**: Exact sequence of operations
3. **Environment**:
   ```bash
   node --version
   bun --version
   python3 --version
   uname -a  # OS info
   ```
4. **Logs**: Debug output from handlers
5. **Configuration**: Handler config (redact sensitive keys)

---

## FAQ

### General Questions

**Q: What is rad-engineer?**

A: rad-engineer is an autonomous engineering platform that combines Auto-Claude's UI with decision learning, execution orchestration, and quality automation.

**Q: Do I need Python for all features?**

A: Python is optional. Core features work without it. Python plugins (AI merge, QA loop, spec gen) require Python 3.10+.

**Q: Can I use this with existing projects?**

A: Yes. Point `projectDir` to your project root. rad-engineer creates `.auto-claude-integration/` for state storage without modifying your code.

**Q: Is this free?**

A: rad-engineer is open source. You need an Anthropic API key for AI features (paid service).

### Feature Questions

**Q: How accurate is AI merge conflict resolution?**

A: AI merge success rate is typically 70-80% for common conflicts. Complex conflicts may require human review.

**Q: Can I customize quality gates?**

A: Yes. Quality gates are configurable. Modify `TaskAPIHandler.runQualityGates()` to add/remove checks.

**Q: How does decision learning work?**

A: As tasks execute, decisions and outcomes are recorded in DecisionLearningStore. This data informs future AI responses in Insights Chat.

**Q: Can I use my own AI models?**

A: Yes, via Settings API profiles. Supported providers: Anthropic, OpenAI, GLM, Ollama.

### Integration Questions

**Q: Does this work with GitLab?**

A: Currently GitHub only. GitLab support is planned (Phase 3).

**Q: Can I integrate with Jira/Linear?**

A: Not yet. Issue tracker integrations are planned for future phases.

**Q: Does this support monorepos?**

A: Yes. Point `projectDir` to monorepo root. Worktree management helps with parallel package development.

**Q: Can multiple users share the same project?**

A: StateManager stores data locally. For multi-user, use shared network drive or implement custom StateManager with remote backend.

### Troubleshooting Questions

**Q: Why do tasks fail with "WaveOrchestrator not available"?**

A: WaveOrchestrator must be initialized before TaskAPIHandler. Verify config:
```typescript
const orchestrator = new WaveOrchestrator(...);
const taskHandler = new TaskAPIHandler({
  waveOrchestrator: orchestrator,
  // ...
});
```

**Q: How do I reset all state?**

A: Delete the state directory:
```bash
rm -rf .auto-claude-integration/
```
Restart application to reinitialize.

**Q: Why are my chat sessions not persisting?**

A: Ensure StateManager is configured with correct directory:
```typescript
const stateManager = new StateManager({
  checkpointDir: path.join(projectDir, ".auto-claude-integration")
});
```

---

## Next Steps

- **Developer Guide**: Learn how to contribute and extend rad-engineer
- **API Reference**: Detailed API documentation for all handlers
- **Examples**: Browse example projects in `docs/examples/`
- **Community**: Join our Discord for support and discussions

---

**Version**: 1.0.0
**Last Updated**: 2026-01-11

For issues or questions, please file an issue on GitHub or contact support.
