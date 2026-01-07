/**
 * Ingest Claude Code Documentation
 *
 * Fetches documentation from docs.anthropic.com and ingests into Knowledge Base
 */

import { KnowledgeBase } from "../dist/core/KnowledgeBase.js";
import type { KBConfig, IngestDocument } from "../dist/core/types.js";

// Claude Code documentation URLs
const CLAUDE_CODE_DOCS = [
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-iteration",
    title: "Prompt Iteration",
  },
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/iteration",
    title: "Iteration Patterns",
  },
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    title: "Tool Use",
  },
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use-examples",
    title: "Tool Use Examples",
  },
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/skills",
    title: "Skills",
  },
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/evals",
    title: "Evaluations",
  },
  {
    url: "https://docs.anthropic.com/en/docs/build-with-claude/monitoring",
    title: "Monitoring",
  },
];

const KB_CONFIG: KBConfig = {
  qdrant: {
    url: "http://127.0.0.1:6333",
    collection: "claude-code-docs",
    timeout: 90000,
    vectorSize: 768,
  },
  ollama: {
    vps: {
      url: "http://127.0.0.1:11434",
      embedModel: "nomic-embed-text",
      summarizeModel: "llama3.2",
      timeout: 90000,
      maxRetries: 3,
    },
    local: {
      enabled: false,
      url: "http://localhost:11434",
      embedModel: "nomic-embed-text",
      summarizeModel: "llama3.2",
      timeout: 10000,
    },
  },
  openai: {
    enabled: false,
    apiKey: undefined,
    embedModel: "text-embedding-3-small",
    summarizeModel: "gpt-4o-mini",
    timeout: 30000,
    fallbackTriggers: [],
    maxRetriesBeforeFallback: 3,
  },
  localCache: {
    enabled: false,
    path: "/tmp/kb_cache",
    maxSize: 500,
    maxDocuments: 10000,
    promotionThreshold: 0.6,
    demotionThreshold: 0.3,
  },
  knowledgeGraph: {
    enabled: true,
    relationshipSchema: "config/relationships.schema.yaml",
    maxTraversalDepth: 2,
    minRelationshipStrength: 0.5,
  },
  search: {
    semantic: {
      enabled: true,
      weight: 1.0,
      topK: 5,
      minScore: 0.7,
    },
    graph: {
      enabled: false,
      weight: 0.0,
      maxDepth: 2,
      followRelationships: [],
    },
  },
  summarization: {
    enabled: false, // Disabled for faster ingestion
    provider: "ollama",
    model: "llama3.2",
    citationRequired: true,
  },
  mcp: {
    enabled: false,
    port: 3000,
    auth: {
      enabled: false,
      apiKey: undefined,
    },
  },
  logging: {
    level: "error",
    format: "json",
  },
};

/**
 * Fetch markdown content from URL using simple HTTP fetch
 */
async function fetchMarkdown(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Simple markdown extraction - look for content in main/article
    // This is a basic implementation - for production, use proper HTML parsing
    const contentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ||
                       html.match(/<article[^>]*>([\s\S]*?)<\/article>/) ||
                       html.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>/);

    if (contentMatch) {
      // Strip HTML tags (basic implementation)
      let content = contentMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/\n+/g, "\n")
        .trim();

      return content;
    }

    throw new Error("Could not extract content from HTML");
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main ingestion function
 */
async function main() {
  console.log("=== Claude Code Documentation Ingestion ===\n");

  const kb = new KnowledgeBase(KB_CONFIG);

  try {
    console.log("Initializing Knowledge Base...");
    await kb.initialize();
    console.log("✅ KB initialized\n");

    const documents: IngestDocument[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const doc of CLAUDE_CODE_DOCS) {
      console.log(`Fetching: ${doc.title}`);
      console.log(`  URL: ${doc.url}`);

      try {
        const content = await fetchMarkdown(doc.url);

        documents.push({
          source: {
            repo: "anthropic/docs",
            path: doc.url,
            language: "markdown",
          },
          content: `${doc.title}\n\n${content}`,
          metadata: {
            title: doc.title,
            url: doc.url,
            source: "docs.anthropic.com",
            category: "claude-code",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

        console.log(`  ✅ Fetched (${content.length} chars)\n`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ Failed: ${error instanceof Error ? error.message : String(error)}\n`);
        failCount++;
      }
    }

    if (documents.length === 0) {
      console.log("❌ No documents to ingest");
      process.exit(1);
    }

    console.log(`=== Ingesting ${documents.length} documents ===\n`);

    const result = await kb.ingest(documents);

    console.log("\n=== Ingestion Results ===");
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
    console.log("\n=== Collection Stats ===");
    const stats = await kb.getStats();
    console.log(`Total nodes: ${stats.nodes}`);
    console.log(`Collections: ${stats.collections.join(", ")}`);

    await kb.shutdown();

    console.log("\n✅ Ingestion complete!");
    console.log(`\nSummary:`);
    console.log(`  Fetched: ${successCount}/${CLAUDE_CODE_DOCS.length} documents`);
    console.log(`  Failed: ${failCount}/${CLAUDE_CODE_DOCS.length} documents`);
    console.log(`  Ingested: ${result.nodesCreated} nodes`);

  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
    process.exit(1);
  }
}

main().catch(console.error);
