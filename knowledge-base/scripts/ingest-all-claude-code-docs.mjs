#!/usr/bin/env node
/**
 * Ingest ALL Claude Code Documentation from code.claude.com
 *
 * Fetches and ingests all 53 English documentation pages
 */

import { KnowledgeBase } from './dist/core/KnowledgeBase.js';

// Configuration
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

// All 53 English Claude Code documentation pages
const CLAUDE_CODE_DOCS = [
  // Getting Started
  { url: 'https://code.claude.com/docs/en/overview', title: 'Overview' },
  { url: 'https://code.claude.com/docs/en/quickstart', title: 'Quickstart' },
  { url: 'https://code.claude.com/docs/en/setup', title: 'Setup' },

  // Core Features
  { url: 'https://code.claude.com/docs/en/skills', title: 'Skills' },
  { url: 'https://code.claude.com/docs/en/cli-reference', title: 'CLI Reference' },
  { url: 'https://code.claude.com/docs/en/slash-commands', title: 'Slash Commands' },
  { url: 'https://code.claude.com/docs/en/mcp', title: 'Model Context Protocol (MCP)' },
  { url: 'https://code.claude.com/docs/en/plugins', title: 'Plugins' },
  { url: 'https://code.claude.com/docs/en/plugins-reference', title: 'Plugins Reference' },
  { url: 'https://code.claude.com/docs/en/discover-plugins', title: 'Discover Plugins' },
  { url: 'https://code.claude.com/docs/en/plugin-marketplaces', title: 'Plugin Marketplaces' },
  { url: 'https://code.claude.com/docs/en/sub-agents', title: 'Sub-Agents' },
  { url: 'https://code.claude.com/docs/en/memory', title: 'Memory' },

  // Guides
  { url: 'https://code.claude.com/docs/en/common-workflows', title: 'Common Workflows' },
  { url: 'https://code.claude.com/docs/en/troubleshooting', title: 'Troubleshooting' },
  { url: 'https://code.claude.com/docs/en/settings', title: 'Settings' },
  { url: 'https://code.claude.com/docs/en/hooks-guide', title: 'Hooks Guide' },
  { url: 'https://code.claude.com/docs/en/hooks', title: 'Hooks' },

  // Configuration
  { url: 'https://code.claude.com/docs/en/checkpointing', title: 'Checkpointing' },
  { url: 'https://code.claude.com/docs/en/data-usage', title: 'Data Usage' },
  { url: 'https://code.claude.com/docs/en/monitoring-usage', title: 'Monitoring Usage' },
  { url: 'https://code.claude.com/docs/en/analytics', title: 'Analytics' },
  { url: 'https://code.claude.com/docs/en/costs', title: 'Costs' },

  // Security & Compliance
  { url: 'https://code.claude.com/docs/en/security', title: 'Security' },
  { url: 'https://code.claude.com/docs/en/legal-and-compliance', title: 'Legal and Compliance' },
  { url: 'https://code.claude.com/docs/en/sandboxing', title: 'Sandboxing' },

  // Advanced Configuration
  { url: 'https://code.claude.com/docs/en/network-config', title: 'Network Configuration' },
  { url: 'https://code.claude.com/docs/en/terminal-config', title: 'Terminal Configuration' },
  { url: 'https://code.claude.com/docs/en/model-config', title: 'Model Configuration' },
  { url: 'https://code.claude.com/docs/en/output-styles', title: 'Output Styles' },
  { url: 'https://code.claude.com/docs/en/statusline', title: 'Statusline' },

  // Modes
  { url: 'https://code.claude.com/docs/en/interactive-mode', title: 'Interactive Mode' },
  { url: 'https://code.claude.com/docs/en/headless', title: 'Headless Mode' },
  { url: 'https://code.claude.com/docs/en/claude-code-on-the-web', title: 'Claude Code on the Web' },

  // Integrations
  { url: 'https://code.claude.com/docs/en/third-party-integrations', title: 'Third-Party Integrations' },
  { url: 'https://code.claude.com/docs/en/iam', title: 'IAM' },
  { url: 'https://code.claude.com/docs/en/llm-gateway', title: 'LLM Gateway' },

  // Cloud Providers
  { url: 'https://code.claude.com/docs/en/amazon-bedrock', title: 'Amazon Bedrock' },
  { url: 'https://code.claude.com/docs/en/google-vertex-ai', title: 'Google Vertex AI' },
  { url: 'https://code.claude.com/docs/en/microsoft-foundry', title: 'Microsoft Foundry' },

  // CI/CD
  { url: 'https://code.claude.com/docs/en/github-actions', title: 'GitHub Actions' },
  { url: 'https://code.claude.com/docs/en/gitlab-ci-cd', title: 'GitLab CI/CD' },
  { url: 'https://code.claude.com/docs/en/devcontainer', title: 'DevContainer' },

  // IDE Integrations
  { url: 'https://code.claude.com/docs/en/vs-code', title: 'VS Code' },
  { url: 'https://code.claude.com/docs/en/jetbrains', title: 'JetBrains IDEs' },

  // Platforms
  { url: 'https://code.claude.com/docs/en/chrome', title: 'Chrome' },
  { url: 'https://code.claude.com/docs/en/desktop', title: 'Desktop App' },
  { url: 'https://code.claude.com/docs/en/slack', title: 'Slack' },
];

/**
 * Fetch markdown content from URL using simple HTTP fetch
 */
async function fetchMarkdown(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract content from main/article
    const contentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ||
                       html.match(/<article[^>]*>([\s\S]*?)<\/article>/) ||
                       html.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>/);

    if (contentMatch) {
      // Strip HTML tags
      let content = contentMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/\n+/g, '\n')
        .trim();

      return content;
    }

    throw new Error('Could not extract content from HTML');
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

/**
 * Main ingestion function
 */
async function main() {
  console.log('=== Claude Code Documentation Complete Ingestion ===\n');
  console.log(`Total docs to ingest: ${CLAUDE_CODE_DOCS.length}\n`);

  const kb = new KnowledgeBase(CONFIG);

  try {
    console.log('Initializing Knowledge Base...');
    await kb.initialize();
    console.log('✅ KB initialized\n');

    const documents = [];
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < CLAUDE_CODE_DOCS.length; i++) {
      const doc = CLAUDE_CODE_DOCS[i];
      const progress = `[${i + 1}/${CLAUDE_CODE_DOCS.length}]`;

      console.log(`${progress} Fetching: ${doc.title}`);
      console.log(`     URL: ${doc.url}`);

      try {
        const content = await fetchMarkdown(doc.url);

        documents.push({
          source: {
            repo: 'claude/code-docs',
            path: doc.url,
            language: 'markdown',
          },
          content: `${doc.title}\n\n${content}`,
          metadata: {
            title: doc.title,
            url: doc.url,
            source: 'code.claude.com',
            category: 'claude-code',
            ingestedAt: new Date().toISOString(),
          },
        });

        console.log(`     ✅ Fetched (${content.length} chars)\n`);
        successCount++;
      } catch (error) {
        const errorMsg = `❌ Failed: ${error.message}`;
        console.log(`     ${errorMsg}\n`);
        errors.push({ doc: doc.title, error: error.message });
        failCount++;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (documents.length === 0) {
      console.log('❌ No documents to ingest');
      process.exit(1);
    }

    console.log(`\n=== Ingesting ${documents.length} documents ===\n`);

    const result = await kb.ingest(documents);

    console.log('\n=== Ingestion Results ===');
    console.log(`Status: ${result.status}`);
    console.log(`Documents processed: ${result.documentsProcessed}`);
    console.log(`Nodes created: ${result.nodesCreated}`);
    console.log(`Relationships created: ${result.relationshipsCreated}`);
    console.log(`Duration: ${result.duration}ms`);

    if (result.errors.length > 0) {
      console.log(`\nErrors:`);
      result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    // Get stats
    console.log('\n=== Collection Stats ===');
    const stats = await kb.getStats();
    console.log(`Total nodes: ${stats.nodes}`);
    console.log(`Collections: ${stats.collections.join(', ')}`);

    await kb.shutdown();

    console.log('\n✅ Ingestion complete!');
    console.log('\n=== Summary ===');
    console.log(`  Fetched: ${successCount}/${CLAUDE_CODE_DOCS.length} documents`);
    console.log(`  Failed: ${failCount}/${CLAUDE_CODE_DOCS.length} documents`);
    console.log(`  Ingested: ${result.nodesCreated} nodes`);
    console.log(`  Total in collection: ${stats.nodes} nodes`);

    if (errors.length > 0) {
      console.log('\n=== Failed Documents ===');
      errors.forEach(({ doc, error }) => console.log(`  - ${doc}: ${error}`));
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

main().catch(console.error);
