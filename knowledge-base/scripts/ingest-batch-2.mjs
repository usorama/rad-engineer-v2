#!/usr/bin/env node
/**
 * Batch 2 Claude Code Docs Ingestion
 * Ingesting next batch of documentation pages
 */

import { KnowledgeBase } from '../dist/core/KnowledgeBase.js';

const CONFIG = {
  qdrant: {
    url: 'http://72.60.204.156:6333',
    collection: 'claude-code-docs',
    timeout: 90000,
    vectorSize: 768,
  },
  ollama: {
    vps: {
      url: 'http://72.60.204.156:11434',
      embedModel: 'nomic-embed-text',
      summarizeModel: 'llama3.2',
      timeout: 90000,
      maxRetries: 3,
    },
    local: { enabled: false },
  },
  openai: { enabled: false },
  localCache: { enabled: false },
  knowledgeGraph: { enabled: true },
  search: {
    semantic: { enabled: true, weight: 1.0, topK: 5, minScore: 0.5 },
    graph: { enabled: false },
  },
  summarization: { enabled: false },
  mcp: { enabled: false },
  logging: { level: 'error', format: 'json' },
};

// Batch 2 documents with actual content
const DOCS = [
  {
    title: 'Subagents',
    url: 'https://code.claude.com/docs/en/sub-agents',
    content: `Custom subagents in Claude Code are specialized AI assistants that can be invoked to handle specific types of tasks. They enable more efficient problem-solving by providing task-specific configurations with customized system prompts, tools and a separate context window.

## What are subagents?

Subagents are pre-configured AI personalities that Claude Code can delegate tasks to. Each subagent:

- Has a specific purpose and expertise area
- Uses its own context window separate from the main conversation
- Can be configured with specific tools it's allowed to use
- Includes a custom system prompt that guides its behavior

When Claude Code encounters a task that matches a subagent's expertise, it can delegate that task to the specialized subagent, which works independently and returns results.

## File locations

Subagents are stored as Markdown files with YAML frontmatter in two possible locations:

| Type | Location | Scope | Priority |
| --- | --- | --- | --- |
| __Project subagents__ | \`.claude/agents/\` | Available in current project | Highest |
| __User subagents__ | \`~/.claude/agents/\` | Available across all projects | Lower |

## File format

Each subagent is defined in a Markdown file with this structure:

\`\`\`
---
name: your-sub-agent-name
description: Description of when this subagent should be invoked
tools: tool1, tool2, tool3  # Optional - inherits all tools if omitted
model: sonnet  # Optional - specify model alias or 'inherit'
---

Your subagent's system prompt goes here. This can be multiple paragraphs
and should clearly define the subagent's role, capabilities, and approach
to solving problems.
\`\`\`

## Built-in subagents

### General-purpose subagent
The general-purpose subagent is a capable agent for complex, multi-step tasks that require both exploration and action.

### Plan subagent
The Plan subagent is specialized for use during plan mode to conduct research and gather information about your codebase.

### Explore subagent
The Explore subagent is a fast, lightweight agent optimized for searching and analyzing codebases in strict read-only mode.

## Best practices

- Start with Claude-generated agents
- Design focused subagents
- Write detailed prompts
- Limit tool access
- Version control your subagents`,
  },
  {
    title: 'Monitoring Usage',
    url: 'https://code.claude.com/docs/en/monitoring-usage',
    content: `Claude Code supports OpenTelemetry (OTel) metrics and events for monitoring and observability.

## Quick start

Configure OpenTelemetry using environment variables:

\`\`\`bash
# 1. Enable telemetry
export CLAUDE_CODE_ENABLE_TELEMETRY=1

# 2. Choose exporters
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp

# 3. Configure OTLP endpoint
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
\`\`\`

## Available metrics

| Metric Name | Description | Unit |
| --- | --- | --- |
| \`claude_code.session.count\` | Count of CLI sessions started | count |
| \`claude_code.lines_of_code.count\` | Count of lines of code modified | count |
| \`claude_code.pull_request.count\` | Number of pull requests created | count |
| \`claude_code.commit.count\` | Number of git commits created | count |
| \`claude_code.cost.usage\` | Cost of the Claude Code session | USD |
| \`claude_code.token.usage\` | Number of tokens used | tokens |
| \`claude_code.active_time.total\` | Total active time in seconds | s |

## Events

Claude Code exports events via OpenTelemetry logs:

- \`claude_code.user_prompt\` - Logged when a user submits a prompt
- \`claude_code.tool_result\` - Logged when a tool completes execution
- \`claude_code.api_request\` - Logged for each API request to Claude
- \`claude_code.api_error\` - Logged when an API request fails

## Configuration variables

Common environment variables for configuration:

| Environment Variable | Description | Example Values |
| --- | --- | --- |
| \`CLAUDE_CODE_ENABLE_TELEMETRY\` | Enables telemetry collection | \`1\` |
| \`OTEL_METRICS_EXPORTER\` | Metrics exporter type | \`console\`, \`otlp\`, \`prometheus\` |
| \`OTEL_LOGS_EXPORTER\` | Logs/events exporter type | \`console\`, \`otlp\` |
| \`OTEL_EXPORTER_OTLP_ENDPOINT\` | OTLP collector endpoint | \`http://localhost:4317\` |`,
  },
  {
    title: 'Data Usage',
    url: 'https://code.claude.com/docs/en/data-usage',
    content: `## Data policies

### Data training policy

__Consumer users (Free, Pro, and Max plans)__:
We give you the choice to allow your data to be used to improve future Claude models.

__Commercial users__: (Team and Enterprise plans, API, 3rd-party platforms, and Claude Gov) maintain existing policies: Anthropic does not train generative models using code or prompts sent to Claude Code under commercial terms.

### Data retention

Anthropic retains Claude Code data based on your account type and preferences.

__Consumer users__:
- Users who allow data use for model improvement: 5-year retention period
- Users who don't allow data use: 30-day retention period
- Privacy settings can be changed at any time

__Commercial users__:
- Standard: 30-day retention period
- Zero data retention: Available with appropriately configured API keys
- Local caching: Claude Code clients may store sessions locally for up to 30 days

## Telemetry services

Claude Code connects to Statsig service for operational metrics and Sentry for error logging. To opt out:

\`\`\`bash
export DISABLE_TELEMETRY=1  # Disable Statsig
export DISABLE_ERROR_REPORTING=1  # Disable Sentry
\`\`\`

## Default behaviors by API provider

| Service | Claude API | Vertex API | Bedrock API |
| --- | --- | --- | --- |
| __Statsig (Metrics)__ | Default on | Default off | Default off |
| __Sentry (Errors)__ | Default on | Default off | Default off |`,
  },
  {
    title: 'Costs',
    url: 'https://code.claude.com/docs/en/costs',
    content: `Claude Code consumes tokens for each interaction. The average cost is $6 per developer per day, with daily costs remaining below $12 for 90% of users.

## Track your costs

### Using the \`/cost\` command

The \`/cost\` command provides detailed token usage statistics:

\`\`\`
Total cost:            $0.55
Total duration (API):  6m 19.7s
Total duration (wall): 6h 33m 10.2s
Total code changes:    0 lines added, 0 lines removed
\`\`\`

## Managing costs for teams

### Rate limit recommendations

When setting up Claude Code for teams, consider these TPM and RPM per-user recommendations:

| Team size | TPM per user | RPM per user |
| --- | --- | --- |
| 1-5 users | 200k-300k | 5-7 |
| 5-20 users | 100k-150k | 2.5-3.5 |
| 20-50 users | 50k-75k | 1.25-1.75 |
| 50-100 users | 25k-35k | 0.62-0.87 |
| 100-500 users | 15k-20k | 0.37-0.47 |
| 500+ users | 10k-15k | 0.25-0.35 |

## Reduce token usage

- __Compact conversations__: Use \`/compact\` when context gets large
- __Write specific queries__: Avoid vague requests
- __Break down complex tasks__: Split large tasks into focused interactions
- __Clear history between tasks__: Use \`/clear\` to reset context

## Background token usage

Claude Code uses tokens for some background functionality:
- Conversation summarization for the \`claude --resume\` feature
- Command processing for commands like \`/cost\`

These background processes consume a small amount of tokens (typically under $0.04 per session).`,
  },
  {
    title: 'Analytics',
    url: 'https://code.claude.com/docs/en/analytics',
    content: `Claude Code provides an analytics dashboard that helps organizations understand developer usage patterns, track productivity metrics, and optimize their Claude Code adoption.

## Access analytics

Navigate to the analytics dashboard at console.anthropic.com/claude-code.

Required roles: Primary Owner, Owner, Billing, Admin, Developer

## Available metrics

### Lines of code accepted
Total lines of code written by Claude Code that users have accepted in their sessions.

### Suggestion accept rate
Percentage of times users accept code editing tool usage (Edit, Write, NotebookEdit).

### Activity
- __users__: Number of active users in a given day
- __sessions__: Number of active sessions in a given day

### Spend
- __users__: Number of active users in a given day
- __spend__: Total dollars spent in a given day

### Team insights
- __Members__: All users who have authenticated to Claude Code
- __Spend this month__: Per-user total spend for the current month
- __Lines this month__: Per-user total of accepted code lines for the current month

## Using analytics effectively

### Monitor adoption
Track team member status to identify:
- Active users who can share best practices
- Overall adoption trends across your organization

### Measure productivity
Tool acceptance rates and code metrics help you:
- Understand developer satisfaction with Claude Code suggestions
- Track code generation effectiveness
- Identify opportunities for training`,
  },
  {
    title: 'Network Configuration',
    url: 'https://code.claude.com/docs/en/network-config',
    content: `Claude Code supports various enterprise network and security configurations through environment variables.

## Proxy configuration

Claude Code respects standard proxy environment variables:

\`\`\`bash
# HTTPS proxy (recommended)
export HTTPS_PROXY=https://proxy.example.com:8080

# HTTP proxy (if HTTPS not available)
export HTTP_PROXY=http://proxy.example.com:8080

# Bypass proxy for specific requests
export NO_PROXY="localhost 192.168.1.1 example.com .example.com"
\`\`\`

### Basic authentication

If your proxy requires basic authentication:

\`\`\`bash
export HTTPS_PROXY=http://username:password@proxy.example.com:8080
\`\`\`

## Custom CA certificates

If your enterprise environment uses custom CAs:

\`\`\`bash
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
\`\`\`

## mTLS authentication

For enterprise environments requiring client certificate authentication:

\`\`\`bash
# Client certificate
export CLAUDE_CODE_CLIENT_CERT=/path/to/client-cert.pem

# Client private key
export CLAUDE_CODE_CLIENT_KEY=/path/to/client-key.pem

# Optional: Passphrase for encrypted private key
export CLAUDE_CODE_CLIENT_KEY_PASSPHRASE="your-passphrase"
\`\`\`

## Network access requirements

Claude Code requires access to:
- \`api.anthropic.com\` - Claude API endpoints
- \`claude.ai\` - WebFetch safeguards
- \`statsig.anthropic.com\` - Telemetry and metrics
- \`sentry.io\` - Error reporting`,
  },
  {
    title: 'Sandboxing',
    url: 'https://code.claude.com/docs/en/sandboxing',
    content: `## Overview

Claude Code features native sandboxing to provide a more secure environment for agent execution while reducing the need for constant permission prompts.

The sandboxed bash tool uses OS-level primitives to enforce both filesystem and network isolation.

## Why sandboxing matters

Traditional permission-based security requires constant user approval. Sandboxing addresses this by:

1. __Defining clear boundaries__: Specify exactly which directories and network hosts Claude Code can access
2. __Reducing permission prompts__: Safe commands within the sandbox don't require approval
3. __Maintaining security__: Attempts to access resources outside the sandbox trigger immediate notifications
4. __Enabling autonomy__: Claude Code can run more independently within defined limits

## How it works

### Filesystem isolation
- __Default writes__: Read and write access to current working directory and subdirectories
- __Default read__: Read access to entire computer, except denied directories
- __Blocked access__: Cannot modify files outside current working directory

### Network isolation
- __Domain restrictions__: Only approved domains can be accessed
- __User confirmation__: New domain requests trigger permission prompts
- __Custom proxy support__: Advanced users can implement custom rules

### OS-level enforcement
- __Linux__: Uses bubblewrap for isolation
- __macOS__: Uses Seatbelt for sandbox enforcement

## Getting started

Enable sandboxing by running the \`/sandbox\` slash command.

### Sandbox modes

__Auto-allow mode__: Bash commands run inside the sandbox and are automatically allowed without requiring permission.

__Regular permissions mode__: All bash commands go through the standard permission flow.

## Security benefits

### Protection against prompt injection
Even if an attacker successfully manipulates Claude Code, the sandbox ensures:
- Cannot modify critical config files like \`~/.bashrc\`
- Cannot modify system-level files in \`/bin/\`
- Cannot exfiltrate data to attacker-controlled servers
- Cannot download malicious scripts from unauthorized domains`,
  },
  {
    title: 'Security',
    url: 'https://code.claude.com/docs/en/security',
    content: `## How we approach security

### Security foundation

Your code's security is paramount. Claude Code is built with security at its core, developed according to Anthropic's comprehensive security program.

### Permission-based architecture

Claude Code uses strict read-only permissions by default. When additional actions are needed, Claude Code requests explicit permission.

### Built-in protections

- __Sandboxed bash tool__: Sandbox bash commands with filesystem and network isolation
- __Write access restriction__: Claude Code can only write to the folder where it was started
- __Prompt fatigue mitigation__: Support for allowlisting frequently used safe commands
- __Accept Edits mode__: Batch accept multiple edits while maintaining permission prompts

## Protect against prompt injection

### Core protections

- __Permission system__: Sensitive operations require explicit approval
- __Context-aware analysis__: Detects potentially harmful instructions
- __Input sanitization__: Prevents command injection
- __Command blocklist__: Blocks risky commands like \`curl\` and \`wget\` by default

### Privacy safeguards

- Limited retention periods for sensitive information
- Restricted access to user session data
- User control over data training preferences

### Additional safeguards

- __Network request approval__: Tools that make network requests require user approval
- __Isolated context windows__: Web fetch uses a separate context window
- __Trust verification__: First-time codebase runs require trust verification
- __Command injection detection__: Suspicious bash commands require manual approval
- __Fail-closed matching__: Unmatched commands default to requiring manual approval

## Security best practices

### Working with sensitive code
- Review all suggested changes before approval
- Use project-specific permission settings for sensitive repositories
- Consider using devcontainers for additional isolation
- Regularly audit your permission settings with \`/permissions\`

### Team security
- Use enterprise managed settings to enforce organizational standards
- Share approved permission configurations through version control
- Train team members on security best practices

### Reporting security issues
If you discover a security vulnerability:
1. Do not disclose it publicly
2. Report it through our HackerOne program
3. Include detailed reproduction steps
4. Allow time for us to address the issue`,
  },
];

async function main() {
  console.log('=== Ingesting Batch 2 Claude Code Docs ===');
  console.log('');

  const kb = new KnowledgeBase(CONFIG);

  try {
    console.log('Initializing Knowledge Base...');
    await kb.initialize();
    console.log('✅ KB initialized');
    console.log('');

    const documents = DOCS.map((doc) => ({
      source: {
        repo: 'claude/code-docs',
        path: doc.url,
        language: 'markdown',
      },
      content: doc.content,
      metadata: {
        title: doc.title,
        url: doc.url,
        source: 'code.claude.com',
        category: 'claude-code',
        ingestedAt: new Date().toISOString(),
      },
    }));

    console.log('Ingesting ' + documents.length + ' documents...');
    console.log('');
    const result = await kb.ingest(documents);

    console.log('=== Results ===');
    console.log('Status: ' + result.status);
    console.log('Documents processed: ' + result.documentsProcessed);
    console.log('Nodes created: ' + result.nodesCreated);
    console.log('Duration: ' + result.duration + 'ms');

    if (result.errors.length > 0) {
      console.log('');
      console.log('Errors:');
      result.errors.forEach((err, i) => console.log('  ' + (i + 1) + '. ' + err));
    }

    const stats = await kb.getStats();
    console.log('');
    console.log('Total nodes in collection: ' + stats.nodes);

    await kb.shutdown();
    console.log('');
    console.log('✅ Ingestion complete!');

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

main().catch(console.error);
