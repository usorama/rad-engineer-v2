# kb-query Skill - Complete Workflow Documentation

## Overview

The `/kb-query` skill provides semantic search capabilities across your entire codebase by leveraging a Knowledge Graph system deployed on your VPS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER / AGENT REQUEST                        │
│                                                                  │
│  User types: /kb-query "How does authentication work?"          │
│  Or agent recognizes need for codebase context                   │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLAUDE CODE SKILL INVOCATION                        │
│                                                                  │
│  1. User invokes: /kb-query "<query>"                           │
│  2. Claude Code loads: ~/.claude/skills/kb-query/SKILL.md       │
│  3. Skill executes instructions in SKILL.md                     │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VPS (72.60.204.156)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 1: Generate Embedding                              │  │
│  │ ─────────────────────────────────                       │  │
│  │ curl -X POST http://localhost:11434/api/embeddings      │  │
│  │   -d '{"model": "nomic-embed-text", "prompt": "..."}'   │  │
│  │                                                          │  │
│  │ Result: 768-dimensional vector representing meaning     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 2: Semantic Search in Qdrant                       │  │
│  │ ────────────────────────────────────────                │  │
│  │ curl -X POST http://localhost:6333/collections/         │  │
│  │   rad-engineer-kb/points/search                         │  │
│  │   -d '{"vector": [...], "limit": 5}'                   │  │
│  │                                                          │  │
│  │ Result: Top 5 matching documents with similarity scores │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STEP 3: Generate Summary with Citations (Optional)       │  │
│  │ ───────────────────────────────────────────              │  │
│  │ curl -X POST http://localhost:11434/api/generate         │  │
│  │   -d '{"model": "llama3.2", "prompt": "...",            │  │
│  │        "stream": false}'                                  │  │
│  │                                                          │  │
│  │ Result: Synthesized answer with source citations         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE FORMATTING                          │
│                                                                  │
│  ## Search Results for "How does authentication work?"         │
│                                                                  │
│  ### Top Results (3 found):                                     │
│  1. **src/core/SecurityLayer.ts** (Score: 0.92)                │
│  2. **src/api/AuthMiddleware.ts** (Score: 0.88)                │
│                                                                  │
│  ### Summary                                                    │
│  Authentication uses JWT tokens... [citations]                  │
│                                                                  │
│  **Confidence**: 0.87 (High)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Workflow

### 1. User/Agent Invocation

**Manual Invocation:**
```bash
/kb-query "How does authentication work?"
```

**Automatic Agent Invocation:**
When an agent needs codebase context, it recognizes the need based on:
- Task requires understanding existing code patterns
- User asks "how does X work?"
- Agent needs to reference architecture decisions
- Looking for related code or dependencies

**How Agents Know to Use kb-query:**

The skill's YAML frontmatter contains:
```yaml
description: Search the project Knowledge Graph for code patterns,
architecture decisions, and documentation. Use when you need codebase context.
```

Claude Code's skill system matches this description when:
- Query contains "codebase", "documentation", "architecture"
- Task involves understanding existing patterns
- Agent needs context before implementing changes
- User asks about "how X works" or "what depends on Y"

### 2. Embedding Generation (VPS → Ollama)

```bash
curl -X POST http://72.60.204.156:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "prompt": "How does authentication work?"
  }'
```

**Response:**
```json
{
  "embedding": [0.1, -0.2, 0.3, ...], // 768 floats
  "model": "nomic-embed-text"
}
```

**What happens:** The query text is converted to a 768-dimensional vector that captures semantic meaning. Similar concepts will have similar vectors.

### 3. Semantic Search (VPS → Qdrant)

```bash
curl -X POST http://72.60.204.156:6333/collections/rad-engineer-kb/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, -0.2, 0.3, ...],
    "limit": 5,
    "score_threshold": 0.7
  }'
```

**Response:**
```json
{
  "result": [
    {
      "id": "uuid-1",
      "score": 0.92,
      "payload": {
        "content": "Implements JWT-based authentication...",
        "source": "src/core/SecurityLayer.ts",
        "type": "CODE"
      }
    },
    {
      "id": "uuid-2",
      "score": 0.88,
      "payload": {
        "content": "Express middleware for protecting API endpoints...",
        "source": "src/api/AuthMiddleware.ts",
        "type": "CODE"
      }
    }
  ]
}
```

**What happens:** Qdrant finds the most semantically similar documents by cosine similarity between vectors. Score threshold (0.7) filters out irrelevant results.

### 4. Summarization (VPS → Ollama) [Optional]

```bash
curl -X POST http://72.60.204.156:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Based on these search results, answer: How does authentication work?\n\nResults:\n1. src/core/SecurityLayer.ts (0.92): Implements JWT-based authentication...\n2. src/api/AuthMiddleware.ts (0.88): Express middleware...\n\nProvide a concise summary with citations.",
    "stream": false
  }'
```

**Response:**
```json
{
  "response": "Authentication uses JWT tokens signed with a secret key. The SecurityLayer validates tokens on each request and extracts user context for authorization.\n\n[Source: src/core/SecurityLayer.ts]\n[Source: src/api/AuthMiddleware.ts]"
}
```

**What happens:** Ollama synthesizes a natural language answer from the search results, including proper citations to sources.

### 5. Response Formatting

The skill formats the final response:

```markdown
## Search Results for "How does authentication work?"

### Top Results (3 found):

1. **src/core/SecurityLayer.ts** (Score: 0.92)
   Implements JWT-based authentication with token validation and refresh logic.

2. **src/api/AuthMiddleware.ts** (Score: 0.88)
   Express middleware for protecting API endpoints using JWT tokens.

3. **src/types/Auth.ts** (Score: 0.75)
   Type definitions for authentication tokens and user sessions.

### Summary
Authentication uses JWT tokens signed with a secret key. The SecurityLayer
validates tokens on each request and extracts user context for authorization.

**Sources:**
- src/core/SecurityLayer.ts
- src/api/AuthMiddleware.ts

**Confidence**: 0.87 (High)

**Metadata**:
- Duration: 127ms
- VPS: 72.60.204.156
- Provider: ollama
```

## Fallback Mechanism: KB Unavailable → Web Search

### When KB Fails

The skill detects KB unavailability when:
- VPS is unreachable (`ssh` or `curl` timeout)
- Qdrant returns errors (503, connection refused)
- Ollama models not loaded
- Collection doesn't exist or is empty

### Automatic Fallback to Web Search

When KB fails, the skill automatically falls back to web search:

```yaml
# In SKILL.md fallback instructions
if ! kb_available; then
  use web_search tool
  query: "{original query} site:docs.anthropic.com OR site:github.com"
  return: "Results from web search (KB unavailable - showing web results)"
fi
```

**Example Web Search Fallback:**

```markdown
## Search Results for "How does authentication work?"

⚠️ **Knowledge Base Unavailable** - Falling back to web search

### Web Results:

1. **Claude Documentation - Authentication** (docs.anthropic.com)
   [Summary of content...]

2. **GitHub - anthropic/sdk-typescript** (github.com)
   [Summary of content...]

**Note**: Results from web search. Consider ingesting this content into KB for faster access.
```

### Agent Decision Logic

**When to Use KB (Priority):**
1. ✅ Task involves understanding YOUR codebase
2. ✅ Query references internal code patterns
3. ✅ User asks about "our" architecture
4. ✅ Looking for dependencies or related code
5. ✅ KB is available and has data

**When to Use Web Search (Fallback):**
1. ❌ KB is unavailable or unreachable
2. ❌ KB has no relevant data
3. ❌ Query asks about external libraries/docs
4. ❌ User explicitly requests "search the web"

**Decision Tree:**

```
Agent needs codebase context?
│
├─ YES → Try KB first
│   │
│   ├─ KB Available?
│   │   ├─ YES → Use KB
│   │   └─ NO  → Fall back to web search
│   │
│   └─ KB Has Results?
│       ├─ YES → Return KB results
│       └─ NO  → Fall back to web search
│
└─ NO → Use web search directly
```

## Testing the Skill

### Test 1: Direct API Test

```bash
# Test embedding generation
curl -X POST http://72.60.204.156:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "prompt": "test query"}' \
  | jq '.embedding | length'

# Expected: 768
```

### Test 2: Skill Invocation

```bash
# In Claude Code, invoke:
/kb-query "test query"

# Should return results or helpful error
```

### Test 3: Fallback Test

```bash
# Stop Qdrant temporarily
ssh root@72.60.204.156 "docker stop kb-qdrant"

# Try kb-query - should fallback to web search
/kb-query "test query"

# Restart Qdrant
ssh root@72.60.204.156 "docker start kb-qdrant"
```

## Troubleshooting

**Problem: "VPS unreachable"**
- Check VPS is running: `ssh root@72.60.204.156 "echo 'OK'"`
- Check services: `ssh root@72.60.204.156 "docker ps"`

**Problem: "No results found"**
- Collection may be empty - ingest documents first
- Try lower score threshold (0.7 → 0.5)

**Problem: "Slow response"**
- Ollama generation takes time (5-30s for summarization)
- Disable summarization for faster results

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Embedding generation | 500ms-2s | Depends on query length |
| Qdrant search | 50-200ms | Very fast, even with millions of points |
| Summarization | 5-30s | Optional, most expensive operation |
| **Total (with summary)** | **6-32s** | Full semantic search + synthesis |
| **Total (without summary)** | **0.5-2.2s** | Fast search only |

## Data Flow Summary

```
Query → Embedding (768-dim vector) → Qdrant Search → Top Results → Summary → Formatted Response
          ↓                          ↓                ↓                ↓
      Ollama                  Qdrant KB          Ollama        Markdown Output
    (nomic-embed)         (vector DB)        (llama3.2)
```

---

**Status**: Ready for use
**VPS**: 72.60.204.156
**Skill Location**: ~/.claude/skills/kb-query/SKILL.md (global)
**Install Script**: /scripts/install-kb-query-skill.sh
