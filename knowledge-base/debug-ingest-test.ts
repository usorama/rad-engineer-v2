/**
 * Debug test for ingest functionality
 */

import { KnowledgeBase } from "./dist/core/KnowledgeBase.js";
import type { KBConfig, IngestDocument } from "./dist/core/types.js";

async function main() {
  console.log("=== Debug Ingest Test ===\n");

  // Configure KB
  const config: KBConfig = {
    qdrant: {
      url: "http://127.0.0.1:6333",
      collection: "debug_test_collection",
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
        enabled: true,
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
    console.log("Creating KnowledgeBase instance...");
    const kb = new KnowledgeBase(config);

    console.log("Initializing KB...");
    await kb.initialize();
    console.log("KB initialized successfully\n");

    // Test ingest
    const testDoc: IngestDocument = {
      source: {
        repo: "debug/test",
        path: "test.md",
        language: "markdown",
      },
      content: "This is a test document for debugging the ingest functionality.",
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    console.log("=== Ingesting test document ===");
    const ingestResult = await kb.ingest([testDoc]);

    console.log("\nIngest Result:");
    console.log(JSON.stringify(ingestResult, null, 2));

    if (ingestResult.status === "completed") {
      console.log("\n✅ SUCCESS: Ingest completed!");
    } else {
      console.log("\n❌ FAILURE: Ingest failed!");
      console.log("Errors:", ingestResult.errors);
    }

    // Get stats
    console.log("\n=== Getting Collection Stats ===");
    const stats = await kb.getStats();
    console.log(JSON.stringify(stats, null, 2));

    // Shutdown
    await kb.shutdown();
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

main().catch(console.error);
