#!/usr/bin/env node
/**
 * Ingest 5 Key Claude Code Docs using pre-fetched content from webReader
 */

import { KnowledgeBase } from './dist/core/KnowledgeBase.js';

const CONFIG = {
  qdrant: {
    url: 'http://127.0.0.1:6333',
    collection: 'claude-code-docs',
    timeout: 90000,
    vectorSize: 768,
  },
  ollama: {
    vps: {
      url: 'http://127.0.0.1:11434',
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
    semantic: { enabled: true, weight: 1.0, topK: 5, minScore: 0.7 },
    graph: { enabled: false },
  },
  summarization: { enabled: false },
  mcp: { enabled: false },
  logging: { level: 'error', format: 'json' },
};

// Documents with actual content extracted via webReader
const DOCS = [
  {
    title: 'Overview',
    url: 'https://code.claude.com/docs/en/overview',
    content: `## Get started in 30 seconds

Prerequisites:

- A Claude.ai (recommended) or Claude Console account

__Install Claude Code:__
To install Claude Code, use one of the following methods:

- Native Install (Recommended)
- Homebrew
- NPM

__macOS, Linux, WSL:__

\`\`\`bash
curl -fsSL https://claude.ai/install.sh | bash
\`\`\`

__Windows PowerShell:__

\`\`\`bash
irm https://claude.ai/install.ps1 | iex
\`\`\`

__Windows CMD:__

\`\`\`bash
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
\`\`\`

\`\`\`bash
brew install --cask claude-code
\`\`\`

__Start using Claude Code:__

You'll be prompted to log in on first use. That's it! Continue with Quickstart (5 minutes) →

## What Claude Code does for you

- __Build features from descriptions__: Tell Claude what you want to build in plain English. It will make a plan, write the code, and ensure it works.
- __Debug and fix issues__: Describe a bug or paste an error message. Claude Code will analyze your codebase, identify the problem, and implement a fix.
- __Navigate any codebase__: Ask anything about your team's codebase, and get a thoughtful answer back. Claude Code maintains awareness of your entire project structure, can find up-to-date information from the web, and with MCP can pull from external data sources like Google Drive, Figma, and Slack.
- __Automate tedious tasks__: Fix fiddly lint issues, resolve merge conflicts, and write release notes. Do all this in a single command from your developer machines, or automatically in CI.

## Why developers love Claude Code

- __Works in your terminal__: Not another chat window. Not another IDE. Claude Code meets you where you already work, with the tools you already love.
- __Takes action__: Claude Code can directly edit files, run commands, and create commits. Need more? MCP lets Claude read your design docs in Google Drive, update your tickets in Jira, or use _your_ custom developer tooling.
- __Unix philosophy__: Claude Code is composable and scriptable. \`tail -f app.log | claude -p "Slack me if you see any anomalies appear in this log stream"\` _works_. Your CI can run \`claude -p "If there are new text strings, translate them into French and raise a PR for @lang-fr-team to review"\`.
- __Enterprise-ready__: Use the Claude API, or host on AWS or GCP. Enterprise-grade security, privacy, and compliance is built-in.`,
  },
  {
    title: 'Quickstart',
    url: 'https://code.claude.com/docs/en/quickstart',
    content: `This quickstart guide will have you using AI-powered coding assistance in just a few minutes. By the end, you'll understand how to use Claude Code for common development tasks.

## Before you begin

Make sure you have:

- A terminal or command prompt open
- A code project to work with
- A Claude.ai (recommended) or Claude Console account

## Step 1: Install Claude Code

To install Claude Code, use one of the following methods:

- Native Install (Recommended)
- Homebrew
- NPM

__macOS, Linux, WSL:__

\`\`\`bash
curl -fsSL https://claude.ai/install.sh | bash
\`\`\`

__Windows PowerShell:__

\`\`\`bash
irm https://claude.ai/install.ps1 | iex
\`\`\`

__Windows CMD:__

\`\`\`bash
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
\`\`\`

\`\`\`bash
brew install --cask claude-code
\`\`\`

## Step 2: Log in to your account

Claude Code requires an account to use. When you start an interactive session with the \`claude\` command, you'll need to log in:

\`\`\`bash
claude
# You'll be prompted to log in on first use
\`\`\`

\`\`\`bash
/login
# Follow the prompts to log in with your account
\`\`\`

You can log in using either account type:

- Claude.ai (subscription plans - recommended)
- Claude Console (API access with pre-paid credits)

Once logged in, your credentials are stored and you won't need to log in again.

## Step 3: Start your first session

Open your terminal in any project directory and start Claude Code:

\`\`\`bash
cd /path/to/your/project
claude
\`\`\`

You'll see the Claude Code welcome screen with your session information, recent conversations, and latest updates. Type \`/help\` for available commands or \`/resume\` to continue a previous conversation.

## Step 4: Ask your first question

Let's start with understanding your codebase. Try one of these commands:

\`\`\`
> what does this project do?
\`\`\`

Claude will analyze your files and provide a summary. You can also ask more specific questions:

\`\`\`
> what technologies does this project use?
\`\`\`

\`\`\`
> where is the main entry point?
\`\`\`

\`\`\`
> explain the folder structure
\`\`\`

You can also ask Claude about its own capabilities:

\`\`\`
> what can Claude Code do?
\`\`\`

\`\`\`
> how do I use slash commands in Claude Code?
\`\`\`

\`\`\`
> can Claude Code work with Docker?
\`\`\`

## Step 5: Make your first code change

Now let's make Claude Code do some actual coding. Try a simple task:

\`\`\`
> add a hello world function to the main file
\`\`\`

Claude Code will:

1. Find the appropriate file
2. Show you the proposed changes
3. Ask for your approval
4. Make the edit

## Step 6: Use Git with Claude Code

Claude Code makes Git operations conversational:

\`\`\`
> what files have I changed?
\`\`\`

\`\`\`
> commit my changes with a descriptive message
\`\`\`

You can also prompt for more complex Git operations:

\`\`\`
> create a new branch called feature/quickstart
\`\`\`

\`\`\`
> show me the last 5 commits
\`\`\`

\`\`\`
> help me resolve merge conflicts
\`\`\`

## Step 7: Fix a bug or add a feature

Claude is proficient at debugging and feature implementation.
Describe what you want in natural language:

\`\`\`
> add input validation to the user registration form
\`\`\`

Or fix existing issues:

\`\`\`
> there's a bug where users can submit empty forms - fix it
\`\`\`

Claude Code will:

- Locate the relevant code
- Understand the context
- Implement a solution
- Run tests if available

## Step 8: Test out other common workflows

There are a number of ways to work with Claude:
__Refactor code__

\`\`\`
> refactor the authentication module to use async/await instead of callbacks
\`\`\`

__Write tests__

\`\`\`
> write unit tests for the calculator functions
\`\`\`

__Update documentation__

\`\`\`
> update the README with installation instructions
\`\`\`

__Code review__

\`\`\`
> review my changes and suggest improvements
\`\`\`

## Essential commands

Here are the most important commands for daily use:

| Command | What it does | Example |
| --- | --- | --- |
| \`claude\` | Start interactive mode | \`claude\` |
| \`claude "task"\` | Run a one-time task | \`claude "fix the build error"\` |
| \`claude -p "query"\` | Run one-off query, then exit | \`claude -p "explain this function"\` |
| \`claude -c\` | Continue most recent conversation | \`claude -c\` |
| \`claude -r\` | Resume a previous conversation | \`claude -r\` |
| \`claude commit\` | Create a Git commit | \`claude commit\` |
| \`/clear\` | Clear conversation history | \`> /clear\` |
| \`/help\` | Show available commands | \`> /help\` |
| \`exit\` or Ctrl+C | Exit Claude Code | \`> exit\` |

See the CLI reference for a complete list of commands.`,
  },
  {
    title: 'Agent Skills',
    url: 'https://code.claude.com/docs/en/skills',
    content: `This guide shows you how to create, use, and manage Agent Skills in Claude Code. For background on how Skills work across Claude products, see What are Skills?.

A Skill is a markdown file that teaches Claude how to do something specific: reviewing PRs using your team's standards, generating commit messages in your preferred format, or querying your company's database schema. When you ask Claude something that matches a Skill's purpose, Claude automatically applies it.

## Create your first Skill

This example creates a personal Skill that teaches Claude to explain code using visual diagrams and analogies. Unlike Claude's default explanations, this Skill ensures every explanation includes an ASCII diagram and a real-world analogy.

The rest of this guide covers how Skills work, configuration options, and troubleshooting.

## How Skills work

Skills are __model-invoked__: Claude decides which Skills to use based on your request. You don't need to explicitly call a Skill. Claude automatically applies relevant Skills when your request matches their description.

When you send a request, Claude follows these steps to find and use relevant Skills:

### Where Skills live

Where you store a Skill determines who can use it:

| Location | Path | Applies to |
| --- | --- | --- |
| Enterprise | See managed settings | All users in your organization |
| Personal | \`~/.claude/skills/\` | You, across all projects |
| Project | \`.claude/skills/\` | Anyone working in this repository |
| Plugin | Bundled with plugins | Anyone with the plugin installed |

If two Skills have the same name, the higher row wins: enterprise overrides personal, personal overrides project, and project overrides plugin.

### When to use Skills versus other options

Claude Code offers several ways to customize behavior. The key difference: __Skills are triggered automatically by Claude__ based on your request, while slash commands require you to type \`/command\` explicitly.

| Use this | When you want to… | When it runs |
| --- | --- | --- |
| __Skills__ | Give Claude specialized knowledge (e.g., "review PRs using our standards") | Claude chooses when relevant |
| __Slash commands__ | Create reusable prompts (e.g., \`/deploy staging\`) | You type \`/command\` to run it |
| __CLAUDE.md__ | Set project-wide instructions (e.g., "use TypeScript strict mode") | Loaded into every conversation |
| __Subagents__ | Delegate tasks to a separate context with its own tools | Claude delegates, or you invoke explicitly |
| __Hooks__ | Run scripts on events (e.g., lint on file save) | Fires on specific tool events |
| __MCP servers__ | Connect Claude to external tools and data sources | Claude calls MCP tools as needed |

__Skills vs. subagents__: Skills add knowledge to the current conversation. Subagents run in a separate context with their own tools. Use Skills for guidance and standards; use subagents when you need isolation or different tool access.

__Skills vs. MCP__: Skills tell Claude _how_ to use tools; MCP _provides_ the tools. For example, an MCP server connects Claude to your database, while a Skill teaches Claude your data model and query patterns.

## Configure Skills

This section covers Skill file structure, supporting files, tool restrictions, and distribution options.

### Write SKILL.md

The \`SKILL.md\` file is the only required file in a Skill. It has two parts: YAML metadata (the section between \`---\` markers) at the top, and Markdown instructions that tell Claude how to use the Skill:

\`\`\`yaml
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions
Provide clear, step-by-step guidance for Claude.

## Examples
Show concrete examples of using this Skill.
\`\`\`

#### Available metadata fields

You can use the following fields in the YAML frontmatter:

| Field | Required | Description |
| --- | --- | --- |
| \`name\` | Yes | Skill name. Must use lowercase letters, numbers, and hyphens only (max 64 characters). Should match the directory name. |
| \`description\` | Yes | What the Skill does and when to use it (max 1024 characters). Claude uses this to decide when to apply the Skill. |
| \`allowed-tools\` | No | Tools Claude can use without asking permission when this Skill is active. See Restrict tool access. |
| \`model\` | No | Model to use when this Skill is active (e.g., \`claude-sonnet-4-20250514\`). Defaults to the conversation's model. |

See the best practices guide for complete authoring guidance including validation rules.`,
  },
  {
    title: 'Setup',
    url: 'https://code.claude.com/docs/en/setup',
    content: `## System requirements

- __Operating Systems__: macOS 10.15+, Ubuntu 20.04+/Debian 10+, or Windows 10+ (with WSL 1, WSL 2, or Git for Windows)
- __Hardware__: 4 GB+ RAM
- __Software__: Node.js 18+ (only required for npm installation)
- __Network__: Internet connection required for authentication and AI processing
- __Shell__: Works best in Bash, Zsh or Fish
- __Location__: Anthropic supported countries

### Additional dependencies

- __ripgrep__: Usually included with Claude Code. If search fails, see search troubleshooting.

## Standard installation

To install Claude Code, use one of the following methods:

- Native Install (Recommended)
- Homebrew
- NPM

__macOS, Linux, WSL:__

\`\`\`
curl -fsSL https://claude.ai/install.sh | bash
\`\`\`

__Windows PowerShell:__

\`\`\`
irm https://claude.ai/install.ps1 | iex
\`\`\`

__Windows CMD:__

\`\`\`
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
\`\`\`

\`\`\`
brew install --cask claude-code
\`\`\`

After the installation process completes, navigate to your project and start Claude Code:

\`\`\`
cd your-awesome-project
claude
\`\`\`

Claude Code offers the following authentication options:

1. __Claude Console__: The default option. Connect through the Claude Console and complete the OAuth process. Requires active billing in the Anthropic console. A "Claude Code" workspace is automatically created for usage tracking and cost management. You can't create API keys for the Claude Code workspace; it's dedicated exclusively for Claude Code usage.
2. __Claude App (with Pro or Max plan)__: Subscribe to Claude's Pro or Max plan for a unified subscription that includes both Claude Code and the web interface. Get more value at the same price point while managing your account in one place. Log in with your Claude.ai account. During launch, choose the option that matches your subscription type.
3. __Enterprise platforms__: Configure Claude Code to use Amazon Bedrock, Google Vertex AI, or Microsoft Foundry for enterprise deployments with your existing cloud infrastructure.

## Windows setup

__Option 1: Claude Code within WSL__

- Both WSL 1 and WSL 2 are supported

__Option 2: Claude Code on native Windows with Git Bash__

- Requires Git for Windows
- For portable Git installations, specify the path to your \`bash.exe\`:

  \`\`\`
  $env:CLAUDE_CODE_GIT_BASH_PATH=\\"C:\\\\Program Files\\\\Git\\\\bin\\\\bash.exe\\"
  \`\`\`

## Alternative installation methods

Claude Code offers multiple installation methods to suit different environments.
If you encounter any issues during installation, consult the troubleshooting guide.

### Native installation options

The native installation is the recommended method and offers several benefits:

- One self-contained executable
- No Node.js dependency
- Improved auto-updater stability

If you have an existing installation of Claude Code, use \`claude install\` to migrate to the native binary installation.
For advanced installation options with the native installer:

__macOS, Linux, WSL:__

\`\`\`
# Install stable version (default)
curl -fsSL https://claude.ai/install.sh | bash

# Install latest version
curl -fsSL https://claude.ai/install.sh | bash -s latest

# Install specific version number
curl -fsSL https://claude.ai/install.sh | bash -s 1.0.58
\`\`\`

__Windows PowerShell:__

\`\`\`
# Install stable version (default)
irm https://claude.ai/install.ps1 | iex

# Install latest version
& ([scriptblock]::Create((irm https://claude.ai/install.ps1))) latest

# Install specific version number
& ([scriptblock]::Create((irm https://claude.ai/install.ps1))) 1.0.58
\`\`\`

__Windows CMD:__

\`\`\`
REM Install stable version (default)
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd

REM Install latest version
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd latest && del install.cmd

REM Install specific version number
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd 1.0.58 && del install.cmd
\`\`\`

__Binary integrity and code signing__

- SHA256 checksums for all platforms are published in the release manifests, currently located at \`https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/{VERSION}/manifest.json\` (example: replace \`{VERSION}\` with \`2.0.30\`)
- Signed binaries are distributed for the following platforms:
  - macOS: Signed by "Anthropic PBC" and notarized by Apple
  - Windows: Signed by "Anthropic, PBC"

### NPM installation

For environments where NPM is preferred or required:

\`\`\`
npm install -g @anthropic-ai/claude-code
\`\`\`

## Running on AWS or GCP

By default, Claude Code uses the Claude API.
For details on running Claude Code on AWS or GCP, see third-party integrations.

## Update Claude Code

### Auto updates

Claude Code automatically keeps itself up to date to ensure you have the latest features and security fixes.

- __Update checks__: Performed on startup and periodically while running
- __Update process__: Downloads and installs automatically in the background
- __Notifications__: You'll see a notification when updates are installed
- __Applying updates__: Updates take effect the next time you start Claude Code

__Disable auto-updates:__
Set the \`DISABLE_AUTOUPDATER\` environment variable in your shell or settings.json file:

\`\`\`
export DISABLE_AUTOUPDATER=1
\`\`\`

### Update manually

## Uninstall Claude Code

If you need to uninstall Claude Code, follow the instructions for your installation method.

### Native installation

Remove the Claude Code binary and version files:

__macOS, Linux, WSL:__

\`\`\`
rm -f ~/.local/bin/claude
rm -rf ~/.local/share/claude
\`\`\`

__Windows PowerShell:__

\`\`\`
Remove-Item -Path \\"$env:USERPROFILE\\\\.local\\\\bin\\\\claude.exe\\" -Force
Remove-Item -Path \\"$env:USERPROFILE\\\\.local\\\\share\\\\claude\\" -Recurse -Force
\`\`\`

__Windows CMD:__

\`\`\`
del \\"%USERPROFILE%\\\\.local\\\\bin\\\\claude.exe\\"
rmdir /s /q \\"%USERPROFILE%\\\\.local\\\\share\\\\claude\\"
\`\`\`

### Homebrew installation

\`\`\`
brew uninstall --cask claude-code
\`\`\`

### NPM installation

\`\`\`
npm uninstall -g @anthropic-ai/claude-code
\`\`\`

### Clean up configuration files (optional)

To remove Claude Code settings and cached data:

__macOS, Linux, WSL:__

\`\`\`
# Remove user settings and state
rm -rf ~/.claude
rm ~/.claude.json

# Remove project-specific settings (run from your project directory)
rm -rf .claude
rm -f .mcp.json
\`\`\`

__Windows PowerShell:__

\`\`\`
# Remove user settings and state
Remove-Item -Path \\"$env:USERPROFILE\\\\.claude\\" -Recurse -Force
Remove-Item -Path \\"$env:USERPROFILE\\\\.claude.json\\" -Force

# Remove project-specific settings (run from your project directory)
Remove-Item -Path \\".claude\\" -Recurse -Force
Remove-Item -Path \\".mcp.json\\" -Force
\`\`\`

__Windows CMD:__

\`\`\`
REM Remove user settings and state
rmdir /s /q \\"%USERPROFILE%\\\\.claude\\"
del \\"%USERPROFILE%\\\\.claude.json\\"

REM Remove project-specific settings (run from your project directory)
rmdir /s /q \\".claude\\"
del \\".mcp.json\\"
\`\`\``,
  },
  {
    title: 'MCP - Model Context Protocol',
    url: 'https://code.claude.com/docs/en/mcp',
    content: `Claude Code can connect to hundreds of external tools and data sources through the Model Context Protocol (MCP), an open source standard for AI-tool integrations. MCP servers give Claude Code access to your tools, databases, and APIs.

## What you can do with MCP

With MCP servers connected, you can ask Claude Code to:

- __Implement features from issue trackers__: "Add the feature described in JIRA issue ENG-4521 and create a PR on GitHub."
- __Analyze monitoring data__: "Check Sentry and Statsig to check the usage of the feature described in ENG-4521."
- __Query databases__: "Find emails of 10 random users who used feature ENG-4521, based on our PostgreSQL database."
- __Integrate designs__: "Update our standard email template based on the new Figma designs that were posted in Slack"
- __Automate workflows__: "Create Gmail drafts inviting these 10 users to a feedback session about the new feature."

## Popular MCP servers

Here are some commonly used MCP servers you can connect to Claude Code:

## Installing MCP servers

MCP servers can be configured in three different ways depending on your needs:

### Option 1: Add a remote HTTP server

HTTP servers are the recommended option for connecting to remote MCP servers. This is the most widely supported transport for cloud-based services.

\`\`\`
# Basic syntax
claude mcp add --transport http <name> <url>

# Real example: Connect to Notion
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Example with Bearer token
claude mcp add --transport http secure-api https://api.example.com/mcp \\\\
  --header \\"Authorization: Bearer your-token\\"
\`\`\`

### Option 2: Add a remote SSE server

\`\`\`
# Basic syntax
claude mcp add --transport sse <name> <url>

# Real example: Connect to Asana
claude mcp add --transport sse asana https://mcp.asana.com/sse

# Example with authentication header
claude mcp add --transport sse private-api https://api.company.com/sse \\\\
  --header \\"X-API-Key: your-key-here\\"
\`\`\`

### Option 3: Add a local stdio server

Stdio servers run as local processes on your machine. They're ideal for tools that need direct system access or custom scripts.

\`\`\`
# Basic syntax
claude mcp add --transport stdio <name> <command> [args...]

# Real example: Add Airtable server
claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=YOUR_KEY \\\\
  -- npx -y airtable-mcp-server
\`\`\`

### Managing your servers

Once configured, you can manage your MCP servers with these commands:

\`\`\`
# List all configured servers
claude mcp list

# Get details for a specific server
claude mcp get github

# Remove a server
claude mcp remove github

# (within Claude Code) Check server status
/mcp
\`\`\`

### Plugin-provided MCP servers

Plugins can bundle MCP servers, automatically providing tools and integrations when the plugin is enabled. Plugin MCP servers work identically to user-configured servers.
__How plugin MCP servers work__:

- Plugins define MCP servers in \`.mcp.json\` at the plugin root or inline in \`plugin.json\`
- When a plugin is enabled, its MCP servers start automatically
- Plugin MCP tools appear alongside manually configured MCP tools
- Plugin servers are managed through plugin installation ( not \`/mcp\` commands)

__Example plugin MCP configuration__:
In \`.mcp.json\` at plugin root:

\`\`\`
{
  \\"database-tools\\": {
    \\"command\\": \\"${CLAUDE_PLUGIN_ROOT}/servers/db-server\\",
    \\"args\\": [\\"--config\\", \\"${CLAUDE_PLUGIN_ROOT}/config.json\\"],
    \\"env\\": {
      \\"DB_URL\\": \\"${DB_URL}\\"
    }
  }
}
\`\`\`

Or inline in \`plugin.json\`:

\`\`\`
{
  \\"name\\": \\"my-plugin\\",
  \\"mcpServers\\": {
    \\"plugin-api\\": {
      \\"command\\": \\"${CLAUDE_PLUGIN_ROOT}/servers/api-server\\",
      \\"args\\": [\\"--port\\", \\"8080\\"]
    }
  }
}
\`\`\`

__Plugin MCP features__:

- __Automatic lifecycle__: Servers start when plugin enables, but you must restart Claude Code to apply MCP server changes (enabling or disabling)
- __Environment variables__: Use \`${CLAUDE_PLUGIN_ROOT}\` for plugin-relative paths
- __User environment access__: Access to same environment variables as manually configured servers
- __Multiple transport types__: Support stdio, SSE, and HTTP transports (transport support may vary by server)

__Viewing plugin MCP servers__:

\`\`\`
# Within Claude Code, see all MCP servers including plugin ones
/mcp
\`\`\`

Plugin servers appear in the list with indicators showing they come from plugins.
__Benefits of plugin MCP servers__:

- __Bundled distribution__: Tools and servers packaged together
- __Automatic setup__: No manual MCP configuration needed
- __Team consistency__: Everyone gets the same tools when plugin is installed

See the plugin components reference for details on bundling MCP servers with plugins.`,
  },
];

async function main() {
  console.log('=== Ingesting 5 Key Claude Code Docs ===\\n');

  const kb = new KnowledgeBase(CONFIG);

  try {
    console.log('Initializing Knowledge Base...');
    await kb.initialize();
    console.log('✅ KB initialized\\n');

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

    console.log(\`Ingesting \${documents.length} documents...\\n\`);
    const result = await kb.ingest(documents);

    console.log('=== Results ===');
    console.log(\`Status: \${result.status}\`);
    console.log(\`Documents processed: \${result.documentsProcessed}\`);
    console.log(\`Nodes created: \${result.nodesCreated}\`);
    console.log(\`Relationships created: \${result.relationshipsCreated}\`);
    console.log(\`Duration: \${result.duration}ms\`);

    if (result.errors.length > 0) {
      console.log(\`\\nErrors:\`);
      result.errors.forEach((err, i) => console.log(\`  \${i + 1}. \${err}\`));
    }

    const stats = await kb.getStats();
    console.log(\`\\nTotal nodes in collection: \${stats.nodes}\`);

    await kb.shutdown();
    console.log('\\n✅ Ingestion complete!');

  } catch (error) {
    console.error('\\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

main().catch(console.error);
