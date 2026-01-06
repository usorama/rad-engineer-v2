/**
 * /kb-query Skill Handler
 *
 * This script demonstrates how the /kb-query skill works.
 * When a user invokes /kb-query, this handler:
 * 1. Parses the query from the user's prompt
 * 2. Calls the Knowledge Base query API
 * 3. Formats and returns results
 */

import { KnowledgeBase } from "../../../knowledge-base/dist/core/KnowledgeBase.js";
import type { KBConfig } from "../../../knowledge-base/dist/core/types.js";

/**
 * Execute a Knowledge Base query
 * @param query - The search query
 * @returns Formatted search results
 */
export async function kbQuery(query: string): Promise<string> {
  // Configure KB connection
  const config: KBConfig = {
    qdrant: {
      url: "http://127.0.0.1:6333",
      collection: "rad-engineer-kb",
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
      enabled: true,
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

  try {
    // Initialize KB
    const kb = new KnowledgeBase(config);
    await kb.initialize();

    // Execute query
    const result = await kb.query({
      query,
      topK: 5,
    });

    // Format results
    let output = `## Search Results for "${query}"\n\n`;

    if (result.results.length === 0) {
      output += "No relevant results found. Try rephrasing your query.\n";
    } else {
      output += `### Top Results (${result.results.length} found):\n\n`;

      result.results.forEach((r, i) => {
        output += `${i + 1}. **${r.node.source.path}** (Score: ${r.score.toFixed(2)})\n`;
        output += `   ${r.node.content.substring(0, 100)}...\n\n`;
      });

      if (result.summary) {
        output += `### Summary\n${result.summary.text}\n\n`;
        output += `**Sources**:\n`;
        result.summary.citations.forEach((c) => {
          output += `- ${c.source.path}\n`;
        });
        output += `\n**Confidence**: ${result.summary.confidence.toFixed(2)}\n`;
      }

      output += `\n**Metadata**:\n`;
      output += `- Duration: ${result.metadata.duration}ms\n`;
      output += `- Provider: ${result.metadata.provider}\n`;
    }

    await kb.shutdown();
    return output;
  } catch (error) {
    return `Error querying Knowledge Base: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2];
  if (!query) {
    console.error("Usage: kb-query <search query>");
    process.exit(1);
  }

  kbQuery(query)
    .then((result) => console.log(result))
    .catch((error) => console.error("Error:", error));
}
