---
name: kb-query
description: Search the project Knowledge Graph for code patterns, architecture decisions, and documentation. Returns semantic search results with summaries and citations. Use when you need codebase context.
---

# /kb-query - Knowledge Graph Search

Search the Knowledge Graph to find relevant information about:
- Code patterns and best practices
- Architecture decisions
- Related code and dependencies
- Documentation references
- Test implementations

## Quick Start

```bash
# Basic search
/kb-query "How does authentication work?"

# Find patterns
/kb-query "Show me error handling patterns"

# Architecture context
/kb-query "What is the ResourceManager architecture?"

# Related code
/kb-query "What depends on SDK integration?"
```

## What It Does

1. **Semantic Search**: Finds code/documents by meaning, not just keywords
2. **Evidence-Based Summary**: Synthesizes results with citations
3. **Source Attribution**: Shows exactly where information comes from
4. **Confidence Scoring**: Indicates how relevant results are

## Example Output

```markdown
## Search Results for "How does authentication work?"

### Top Results (5 found):

1. **rad-engineer/src/core/SecurityLayer.ts** (Score: 0.92)
   Implements JWT-based authentication with token validation

2. **rad-engineer/src/api/AuthMiddleware.ts** (Score: 0.88)
   Express middleware for protecting API endpoints

### Summary
Authentication uses JWT tokens signed with a secret key. The SecurityLayer
validates tokens on each request and extracts user context for authorization.

[Source: rad-engineer/src/core/SecurityLayer.ts]
[Source: rad-engineer/src/api/AuthMiddleware.ts]

**Confidence**: 0.87 (High)
```

## Technical Details

**Knowledge Base System**:
- Location: `knowledge-base/` directory
- VPS: 72.60.204.156
- Embeddings: Ollama nomic-embed-text (768 dimensions)
- Vector DB: Qdrant (Cosine similarity)
- Summarization: Ollama llama3.2

**Query Process**:
1. Generate embedding for query
2. Semantic search in Qdrant (top 5)
3. Filter by relevance (minScore: 0.7)
4. Generate summary with citations
5. Return formatted results

## Tips

- **Be specific**: "authentication flow" vs "auth"
- **Ask for patterns**: "error handling patterns"
- **Request context**: "How does X integrate with Y?"
- **Get architecture**: "Show me the overall architecture"

## Notes

- Requires VPS connection (72.60.204.156:6333)
- Falls back to local Ollama if VPS unavailable
- Results cached locally for performance
- Supports all code types (TypeScript, Python, etc.)
