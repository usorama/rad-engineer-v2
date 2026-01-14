# engg-support-system Integration Architecture

> **Purpose**: Comprehensive integration specification for rad-engineer-v2 + engg-support-system
> **Analysis Date**: 2026-01-12
> **VPS Location**: `devuser@72.60.204.156:/home/devuser/Projects/engg-support-system`

---

## Executive Summary

**engg-support-system** is a deterministic, evidence-based engineering intelligence system on VPS that provides:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **knowledge-base** | Qdrant + TypeScript | Semantic vector search (768-dim embeddings) |
| **veracity-engine** | Neo4j + Python | Graph relationships + deterministic validation |
| **gateway** | TypeScript | Unified query agent + conversation manager |

**Integration Value for rad-engineer**: Provides the missing **context engineering**, **codebase indexing**, **hierarchical memory**, and **deterministic verification** layers that rad-engineer needs for true autonomous engineering.

---

## System Architecture (Verified from VPS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    rad-engineer-v2 (Local/Development)                       │
│  ├── WaveOrchestrator (single orchestrator)                                 │
│  ├── DecisionLearningIntegration                                            │
│  ├── 12 Existing Agents (developer, planner, researcher, etc.)              │
│  └── /plan, /execute skills                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                              ↓ HTTP/MCP ↓                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                    engg-support-system (VPS 72.60.204.156)                  │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     Unified Gateway (gateway/)                         │ │
│  │  ├── EnggContextAgent.ts  (dual-DB queries)                           │ │
│  │  ├── QueryClassifier.ts   (clear/ambiguous/requires_context)          │ │
│  │  ├── ClarificationGenerator.ts                                         │ │
│  │  └── ConversationManager.ts (Redis-backed, 3-round max)               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                         ↓           ↓           ↓                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐   │
│  │ knowledge-base  │ │ veracity-engine │ │ Shared Infrastructure       │   │
│  │    (Qdrant)     │ │    (Neo4j)      │ ├─────────────────────────────┤   │
│  ├─────────────────┤ ├─────────────────┤ │ Ollama (11434) - embeddings │   │
│  │ Port: 6333      │ │ Port: 7474/7687 │ │ Redis (6379) - caching      │   │
│  │ 768-dim vectors │ │ Graph traversal │ │ Docker Compose              │   │
│  │ MCP Server      │ │ MCP Server      │ └─────────────────────────────┘   │
│  └─────────────────┘ └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Veracity Engine (Python)

### 1.1 Core Files (Verified)

```
veracity-engine/core/
├── veracity.py          (11KB) - Deterministic confidence scoring
├── packet_contract.py   (12KB) - Evidence packet schema v1.0
├── mcp_server.py        (20KB) - MCP server with 4 tools
├── evidence_query.py    (14KB) - Evidence retrieval
├── build_graph.py       (40KB) - Codebase indexing engine
├── ask_codebase.py      (15KB) - Query engine
├── metrics.py           (10KB) - Prometheus metrics
├── watcher_daemon.py    (14KB) - File system watcher
└── ...
```

### 1.2 Veracity Scoring Algorithm (veracity.py)

**Deterministic formula** - starts at 100, deducts penalties:

| Fault Type | Penalty | Detection |
|------------|---------|-----------|
| `STALE_DOC` | -15 | Document >90 days old |
| `ORPHANED_NODE` | -5 | Node with <2 connections |
| `CONTRADICTION` | -20 | Code newer than linked doc by >30 days |
| `LOW_COVERAGE` | -10 | <5 results found |

```python
# From veracity.py - exact algorithm
def compute_confidence_score(faults: List[VeracityFault]) -> float:
    score = 100.0
    for fault in faults:
        penalty = FAULT_PENALTIES.get(fault.fault_type, 0)
        score -= penalty
    return max(0.0, score)
```

**Integration Point**: rad-engineer can call `validate_veracity()` to score any query result before accepting it as ground truth.

### 1.3 Evidence Packet Schema (packet_contract.py)

Every response follows this versioned schema:

```python
@dataclass
class EvidencePacketV1:
    meta: PacketMeta           # schema_version, query_id, timestamp, project, question
    status: str                # "success" | "insufficient_evidence"
    code_truth: List[CodeResult]   # id, type, path, name, score, excerpt, neighbors
    doc_claims: List[DocResult]    # id, path, name, score, last_modified, excerpt
    veracity: VeracityReport       # confidence_score, is_stale, faults
    graph_relationships: List[Dict]
    suggested_actions: List[str]
    technical_brief: Optional[str]  # Only in synthesis mode
```

**Integration Point**: rad-engineer agents can consume these packets directly for evidence-based reasoning.

### 1.4 MCP Server Tools (mcp_server.py)

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `query_codebase` | Query knowledge graph | project_name, question, max_results | EvidencePacket |
| `get_component_map` | Architecture analysis | project_name, component_path | Dependencies, imports |
| `list_projects` | List indexed projects | (none) | Project names, node counts |
| `get_file_relationships` | File-level analysis | project_name, file_path | Functions, imports, callers |

**MCP Configuration** (for Claude Code):
```json
{
  "mcpServers": {
    "veracity": {
      "command": "/opt/homebrew/bin/python3.11",
      "args": ["/path/to/veracity-engine/core/mcp_server.py"],
      "env": {"NEO4J_URI": "bolt://72.60.204.156:7687"}
    }
  }
}
```

---

## Part 2: Knowledge Base (TypeScript/Qdrant)

### 2.1 Vector Storage Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID v4 | **Required** - Qdrant requires UUID format |
| `vector` | number[768] | Embedding from nomic-embed-text |
| `content` | string | Text content |
| `nodeType` | enum | CODE, MARKDOWN, DOCUMENT, ISSUE, COMMIT, CONCEPT |
| `relationships` | Relationship[] | Stored in payload metadata |
| `metadata` | NodeMetadata | Source location, timestamps |

### 2.2 Relationship Types (relationships.schema.yaml)

```yaml
# Document relationships
REFERENCES, IS_REFERENCED_BY, RELATED_TO, EXTENDS, IS_EXTENDED_BY, SUPERSEDES

# Code relationships
DEPENDS_ON, IS_DEPENDENCY_OF, IMPLEMENTS, IS_IMPLEMENTED_BY
EXTENDS_CLASS, IS_EXTENDED_BY_CLASS, CALLS, IS_CALLED_BY

# Test relationships
TESTS, IS_TESTED_BY

# Documentation relationships
DESCRIBES, IS_DESCRIBED_BY

# Part-whole relationships
PART_OF, HAS_PART
```

### 2.3 MCP Integration

```bash
# Start knowledge-base MCP server
cd knowledge-base
npm run start:mcp  # Port 3000
```

---

## Part 3: Gateway (TypeScript)

### 3.1 EnggContextAgent

**Key Behavior**: ALWAYS queries BOTH Qdrant AND Neo4j - no exceptions.

```typescript
// From EnggContextAgent.ts - dual query pattern
async query(request: QueryRequestWithMode): Promise<GatewayResponse> {
  // Query both databases in parallel
  const [qdrantResult, neo4jResult] = await Promise.allSettled([
    this.qdrantClient.semanticSearch(request.query, queryVector),
    this.neo4jClient.structuralSearch(request.query, options)
  ]);

  // Merge results with veracity validation
  return this.buildResponse({ qdrantResult, neo4jResult, ... });
}
```

### 3.2 QueryClassifier

Classifies queries into clarity levels:

| Clarity | Confidence | Mode | Trigger |
|---------|------------|------|---------|
| `clear` | 0.8-0.9 | one-shot | No ambiguity indicators |
| `ambiguous` | 0.6-0.7 | conversational | 1-2 ambiguity indicators |
| `requires_context` | 0.3 | conversational | 3+ ambiguity indicators |

**Ambiguity Indicators**:
- Pronouns: "it", "they", "that", "this thing"
- Vague terms: "something", "anything", "stuff"
- Broad terms: "all", "everything", "the whole"

### 3.3 ConversationManager

Redis-backed multi-round conversation state:

```typescript
interface ConversationState {
  conversationId: string;      // UUID v4
  originalQuery: string;
  round: number;               // Current round (1-3)
  maxRounds: number;           // 3 rounds max
  phase: "analyzing" | "clarifying" | "executing" | "completed";
  collectedContext: Record<string, unknown>;
  history: ConversationMessage[];
}
```

---

## Part 4: Integration Points for rad-engineer

### 4.1 How rad-engineer Calls engg-support-system

**Option A: MCP Integration** (Recommended)
```typescript
// In rad-engineer agent configuration
{
  "mcpServers": {
    "veracity": { /* veracity-engine MCP */ },
    "knowledge": { /* knowledge-base MCP */ }
  }
}
```

**Option B: HTTP Gateway**
```typescript
// REST call to gateway
const response = await fetch('http://72.60.204.156:3000/query', {
  method: 'POST',
  body: JSON.stringify({
    query: "What components handle authentication?",
    project: "rad-engineer-v2",
    mode: "one-shot"
  })
});
```

### 4.2 Integration Matrix

| rad-engineer Need | engg-support-system Solution |
|-------------------|------------------------------|
| **Codebase indexing** | veracity-engine `build_graph.py` + knowledge-base ingestion |
| **Semantic search** | knowledge-base Qdrant (768-dim vectors) |
| **Structural analysis** | veracity-engine Neo4j (graph traversal) |
| **Deterministic verification** | veracity.py scoring (0-100 with fault penalties) |
| **Evidence packets** | packet_contract.py schema v1.0 |
| **Context engineering** | EnggContextAgent + ConversationManager |
| **Ambiguity detection** | QueryClassifier (clear/ambiguous/requires_context) |
| **Multi-round clarification** | ConversationManager (3 rounds, Redis-backed) |

### 4.3 Mapping to rad-engineer Objectives

| rad-engineer Objective | engg-support-system Support |
|------------------------|----------------------------|
| **Deterministic Execution** | Veracity scoring ensures reproducible confidence |
| **Decision Learning** | Evidence packets provide traceable decision data |
| **Outcome-Based Reasoning** | `code_truth` + `doc_claims` = evidence-backed decisions |
| **Hierarchical Memory** | ConversationManager + scope-based context |
| **VAC (Verifiable Agentic Contract)** | EvidencePacketV1 = verifiable contract format |

---

## Part 5: Required Enhancements

### 5.1 engg-support-system Enhancements Needed

| Enhancement | Priority | Effort | Reason |
|-------------|----------|--------|--------|
| **TypeScript AST parsing** | HIGH | 16h | rad-engineer is TypeScript, veracity-engine only parses Python |
| **HTTP Gateway API** | HIGH | 8h | Gateway exists but needs REST endpoints exposed |
| **rad-engineer project indexing** | HIGH | 4h | Must index rad-engineer-v2 codebase |
| **Embedding model pinning** | MEDIUM | 2h | Non-deterministic without fixed model versions |
| **Redis queue for LLM requests** | MEDIUM | 8h | Prevent contention when rad-engineer spawns agents |
| **Health check endpoints** | MEDIUM | 4h | rad-engineer needs to detect unavailability |
| **Prometheus metrics export** | LOW | 4h | Observability for production |

### 5.2 rad-engineer Enhancements Needed

| Enhancement | Priority | Effort | Reason |
|-------------|----------|--------|--------|
| **MCP client for veracity** | HIGH | 8h | Call veracity-engine MCP tools |
| **Evidence packet parser** | HIGH | 4h | Parse EvidencePacketV1 responses |
| **Veracity threshold config** | MEDIUM | 2h | Configure minimum confidence scores |
| **Fallback when VPS unavailable** | MEDIUM | 8h | Graceful degradation |
| **Codebase sync automation** | LOW | 16h | Auto-index on git push |

---

## Part 6: Implementation Roadmap

### Phase 1: Basic Integration (Week 1)

1. Index rad-engineer-v2 codebase in veracity-engine
   ```bash
   ssh vps-dev
   cd /home/devuser/Projects/engg-support-system/veracity-engine
   python3 core/build_graph.py --project-name rad-engineer-v2 --root-dir /path/to/sync
   ```

2. Configure MCP in rad-engineer Claude Code settings
3. Test query_codebase tool from rad-engineer agents

### Phase 2: Enhanced Integration (Week 2-3)

1. Add TypeScript AST parser to veracity-engine
2. Create HTTP gateway endpoints
3. Implement Evidence packet parser in rad-engineer
4. Add veracity scoring to agent decisions

### Phase 3: Production Integration (Week 4+)

1. Set up Redis queue for LLM requests
2. Add health checks and fallback
3. Implement codebase sync automation
4. Add observability (Prometheus + logging)

---

## Part 7: API Reference

### veracity-engine MCP Tools

```python
# query_codebase
{
  "project_name": "rad-engineer-v2",
  "question": "What components handle agent spawning?",
  "max_results": 20
}
# Returns: EvidencePacketV1

# get_component_map
{
  "project_name": "rad-engineer-v2",
  "component_path": "src/advanced/WaveOrchestrator.ts"
}
# Returns: { imports: [], reverse_deps: [], relationships: [] }

# list_projects
{}
# Returns: [{ name, node_count, last_indexed }]

# get_file_relationships
{
  "project_name": "rad-engineer-v2",
  "file_path": "src/sdk/SDKIntegration.ts"
}
# Returns: { functions: [], imports: [], callers: [] }
```

### Gateway Query Request

```typescript
interface QueryRequestWithMode {
  query: string;
  requestId: string;
  timestamp: string;
  project?: string;
  context?: string[];
  mode?: "one-shot" | "conversational";
}
```

### Gateway Response Types

```typescript
// One-shot mode
interface QueryResponse {
  requestId: string;
  status: "success" | "partial" | "unavailable";
  queryType: "code" | "explanation" | "location" | "relationship" | "both";
  results: {
    semantic: SemanticResult;    // From Qdrant
    structural: StructuralResult; // From Neo4j
  };
  warnings?: string[];
  meta: QueryMeta;
}

// Conversational mode
interface ConversationResponse {
  type: "conversation";
  conversationId: string;
  round: number;
  maxRounds: number;
  phase: "analyzing" | "clarifying" | "executing" | "completed";
  clarifications: {
    questions: ClarificationQuestion[];
    message: string;
  };
  meta: ConversationMeta;
}
```

---

## Part 8: How rad-engineer Becomes Whole

### 8.1 The Gap Before Integration

rad-engineer-v2 has:
- WaveOrchestrator for execution
- 12 existing agents for software engineering
- DecisionLearningIntegration for learning
- /plan and /execute skills

rad-engineer-v2 is MISSING:
- **Codebase indexing** (can't query its own codebase semantically)
- **Evidence-based verification** (no veracity scoring)
- **Structural analysis** (no graph relationships)
- **Context engineering** (no conversation state management)
- **Hierarchical memory** (StateManager is checkpoint-only)

### 8.2 The Complete Picture After Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        rad-engineer-v2 (COMPLETE)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  PLANNING (/plan skill)                                                     │
│  ├── IntakeHandler parses requirements                                      │
│  ├── QueryClassifier determines ambiguity level                            │
│  ├── ConversationManager handles multi-round clarification                 │
│  └── ResearchCoordinator spawns agents WITH codebase context               │
├─────────────────────────────────────────────────────────────────────────────┤
│  EXECUTION (/execute skill)                                                 │
│  ├── WaveOrchestrator coordinates agents                                   │
│  ├── Agents query knowledge-base for semantic context                      │
│  ├── Agents query veracity-engine for structural relationships             │
│  └── Veracity scoring validates agent outputs                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  LEARNING (DecisionLearningIntegration)                                     │
│  ├── Decisions stored with evidence packets                                │
│  ├── Veracity scores track decision quality                                │
│  └── Knowledge base accumulates codebase understanding                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  MEMORY (Hierarchical)                                                      │
│  ├── GLOBAL: Project manifesto, constraints (immutable)                    │
│  ├── TASK: Current plan, progress (ConversationManager)                    │
│  └── LOCAL: Tool outputs, ephemeral (compressed after use)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Key Benefits

| Capability | Before Integration | After Integration |
|------------|-------------------|-------------------|
| Codebase queries | None | Semantic + structural search |
| Confidence scoring | Subjective | Deterministic (0-100) |
| Evidence tracking | Limited | Full EvidencePacketV1 |
| Context management | Checkpoint-only | Redis-backed conversation state |
| Ambiguity handling | None | QueryClassifier + clarification |
| Graph relationships | None | CALLS, DEPENDS_ON, IMPLEMENTS |
| Multi-round dialogue | None | 3-round ConversationManager |

---

## Part 9: Neo4j Graph Database (Comprehensive)

### 9.1 Running Infrastructure (Verified via `docker ps`)

| Container | Status | Ports | Purpose |
|-----------|--------|-------|---------|
| `engg-neo4j` | Up 3 days | 7475:7474, 7688:7687 | Graph database for veracity-engine |
| `engg-qdrant` | Up 3 days | 6335:6333, 6336:6334 | Vector database for knowledge-base |
| `engg-redis` | Up 4 days (healthy) | 6379:6379 | Conversation state + caching |
| `kb-ollama` | Up 5 days | 11434:11434 | Embeddings (nomic-embed-text) |

### 9.2 Neo4j Graph Schema (from build_graph.py)

**Node Types**:
| Label | Properties | Created By |
|-------|------------|------------|
| `File` | uid, path, name, project, last_modified | `build_graph.py` |
| `Class` | uid, name, qualified_name, docstring, file_path, start_line, embedding | `CodeVisitor.visit_ClassDef()` |
| `Function` | uid, name, qualified_name, docstring, file_path, start_line, is_async, embedding | `CodeVisitor.visit_FunctionDef()` |
| `Document` | uid, path, name, last_modified, project | `build_graph.py` |
| `Code` | (label on Class/Function nodes) | AST parsing |
| `VeracityReport` | query_id, project, timestamp | Audit trail |

**Relationship Types**:
| Type | From → To | Created By |
|------|-----------|------------|
| `DEFINES` | File → Class/Function | `CodeVisitor` |
| `CALLS` | Function → Function | `CodeVisitor.visit_Call()` |
| `DEPENDS_ON` | File → Module | `CodeVisitor.visit_Import()` |
| `HAS_ASSET` | Component → Asset | hierarchy processing |
| `HAS_COMPONENT` | Parent → Child | hierarchy processing |

**Indexes & Constraints**:
```cypher
-- From build_graph.py:create_constraints()
CREATE CONSTRAINT FOR (n:Node) REQUIRE n.uid IS UNIQUE
CREATE INDEX FOR (n:Node) ON (n.name)
CREATE INDEX FOR (n:Node) ON (n.qualified_name)
CREATE INDEX FOR (n:Node) ON (n.path)
CREATE FULLTEXT INDEX code_search FOR (n:Code) ON EACH [n.name, n.docstring]
CREATE VECTOR INDEX code_embeddings FOR (n:Code) ON (n.embedding)
  OPTIONS {indexConfig: {`vector.dimensions`: 768, `vector.similarity_function`: 'cosine'}}
```

### 9.3 Hybrid Query Pattern (from ask_codebase.py)

```cypher
-- The actual query that combines vector + fulltext + graph traversal
CALL {
    -- 1. Vector Search (500 limit for multitenancy filtering)
    CALL db.index.vector.queryNodes('code_embeddings', 500, $embedding)
    YIELD node, score
    WHERE node.project = $project
    RETURN node, score, 'vector' as source

    UNION

    -- 2. Full-Text Search (Keywords)
    CALL db.index.fulltext.queryNodes('code_search', $question, {limit: 100})
    YIELD node, score
    WHERE node.project = $project
    RETURN node, score, 'keyword' as source
}

-- Deduplicate and aggregate
WITH node, max(score) as score, collect(source) as sources

-- 3. Expand Context (neighboring nodes via relationships)
OPTIONAL MATCH (node)-[:DEFINES|CALLS|DEPENDS_ON|HAS_ASSET|HAS_COMPONENT*0..1]-(related)
WHERE related.project = $project

RETURN node, node.uid as id, node.name as name, node.docstring as doc,
       score, sources, collect(distinct related.name) as neighbors
ORDER BY score DESC
LIMIT 20
```

### 9.4 What Neo4j Provides That rad-engineer Lacks

| Capability | Neo4j Implementation | rad-engineer Current State |
|------------|---------------------|---------------------------|
| **Code graph** | File→Class→Function with DEFINES | None - no structural indexing |
| **Call graph** | CALLS relationships between functions | None |
| **Dependency graph** | DEPENDS_ON from imports | None |
| **Vector search** | 768-dim embeddings indexed | None |
| **Full-text search** | Fulltext index on name+docstring | None |
| **Multitenancy** | `project` label on all nodes | N/A |
| **Veracity validation** | GroundTruthContextSystem class | None |

---

## Part 10: Comprehensive EXISTS vs MISSING

### 10.1 What EXISTS in engg-support-system (Ready to Use)

| Component | File | Status | Evidence |
|-----------|------|--------|----------|
| **Neo4j graph indexer** | `build_graph.py` (40KB) | ✅ Production | Indexes .py/.md files with AST |
| **Hybrid query engine** | `ask_codebase.py` (15KB) | ✅ Production | Vector + fulltext + graph |
| **Veracity scoring** | `veracity.py` (11KB) | ✅ Production | Deterministic 0-100 scoring |
| **Evidence packets** | `packet_contract.py` (12KB) | ✅ Production | Schema v1.0 with validation |
| **MCP server (veracity)** | `mcp_server.py` (20KB) | ✅ Production | 4 tools exposed |
| **Query classifier** | `QueryClassifier.ts` (4KB) | ✅ Production | clear/ambiguous/requires_context |
| **Conversation manager** | `ConversationManager.ts` (6KB) | ✅ Production | Redis-backed, 3 rounds |
| **Dual-DB agent** | `EnggContextAgent.ts` (16KB) | ✅ Production | Queries both Qdrant+Neo4j |
| **Clarification generator** | `ClarificationGenerator.ts` (2KB) | ✅ Production | Generates follow-up questions |
| **Model version manager** | `models.py` (8KB) | ✅ Production | Digest verification |
| **File watcher daemon** | `watcher_daemon.py` (14KB) | ✅ Production | Real-time re-indexing |
| **Redis conversation store** | `RedisConversationStore.ts` | ✅ Production | Persistent state |
| **Docker infrastructure** | `docker-compose.yml` | ✅ Running | Neo4j, Qdrant, Redis, Ollama |

### 10.2 What's MISSING in engg-support-system (Needs Implementation)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| **TypeScript AST parser** | Can't index rad-engineer-v2 (TypeScript) | 16h | 🔴 HIGH |
| **HTTP REST gateway** | Gateway has no REST endpoints exposed | 8h | 🔴 HIGH |
| **Project sync mechanism** | No auto-sync from local to VPS | 8h | 🟡 MEDIUM |
| **Health check endpoints** | Can't detect unavailability | 4h | 🟡 MEDIUM |
| **Embedding model pinning** | Non-deterministic without fixed digests | 2h | 🟡 MEDIUM |
| **LLM request queue** | Contention when multiple agents query | 8h | 🟡 MEDIUM |
| **Prometheus metrics export** | No observability | 4h | 🟢 LOW |

### 10.3 What's MISSING in rad-engineer-v2 (Needs Implementation)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| **MCP client for veracity** | Can't call veracity-engine tools | 8h | 🔴 HIGH |
| **EvidencePacket parser** | Can't consume evidence responses | 4h | 🔴 HIGH |
| **Veracity threshold config** | No quality gates on agent outputs | 2h | 🔴 HIGH |
| **Fallback when VPS down** | No graceful degradation | 8h | 🟡 MEDIUM |
| **Codebase sync script** | Manual sync to VPS | 4h | 🟡 MEDIUM |

### 10.4 What's SHARED (Already Aligned)

| Concept | engg-support-system | rad-engineer-v2 | Status |
|---------|--------------------|-----------------| -------|
| Determinism | Formula-based scoring | DecisionLearningStore | ✅ Compatible |
| Evidence-based | EvidencePacketV1 | DecisionTracker | ✅ Compatible |
| Multi-agent | EnggContextAgent | WaveOrchestrator | ✅ Compatible |
| Learning | Query audit trail | DecisionLearningIntegration | ✅ Compatible |

---

## Part 11: Detailed Implementation Plan

### Phase 1: Enable TypeScript Indexing (Week 1)

| Task | File | Effort | Dependency |
|------|------|--------|------------|
| 1.1 Add tree-sitter-typescript to veracity-engine | `requirements.txt` | 2h | None |
| 1.2 Create TypeScriptVisitor class | `core/ts_visitor.py` | 8h | 1.1 |
| 1.3 Extend build_graph.py for .ts/.tsx files | `core/build_graph.py` | 4h | 1.2 |
| 1.4 Test with rad-engineer-v2 codebase | `tests/` | 2h | 1.3 |

**Deliverable**: `python3 core/build_graph.py --project-name rad-engineer-v2 --root-dir /path/to/rad-engineer` indexes TypeScript.

### Phase 2: Expose HTTP Gateway (Week 1-2)

| Task | File | Effort | Dependency |
|------|------|--------|------------|
| 2.1 Create Express/Fastify HTTP server | `gateway/src/server.ts` | 4h | None |
| 2.2 Add `/query` endpoint | `gateway/src/routes/query.ts` | 2h | 2.1 |
| 2.3 Add `/health` endpoint | `gateway/src/routes/health.ts` | 1h | 2.1 |
| 2.4 Add `/projects` endpoint | `gateway/src/routes/projects.ts` | 1h | 2.1 |
| 2.5 Deploy and test | - | 2h | 2.2-2.4 |

**Deliverable**: `curl http://72.60.204.156:3000/query -d '{"query":"...", "project":"..."}' ` works.

### Phase 3: rad-engineer MCP Integration (Week 2)

| Task | File | Effort | Dependency |
|------|------|--------|------------|
| 3.1 Create VeracityClient class | `rad-engineer/src/veracity/VeracityClient.ts` | 4h | Phase 2 |
| 3.2 Create EvidencePacketParser | `rad-engineer/src/veracity/EvidencePacketParser.ts` | 2h | None |
| 3.3 Add veracity config to ProviderConfig | `rad-engineer/src/config/ProviderConfig.ts` | 1h | None |
| 3.4 Integrate into WaveOrchestrator | `rad-engineer/src/advanced/WaveOrchestrator.ts` | 4h | 3.1-3.3 |
| 3.5 Add veracity scoring to agent verification | `rad-engineer/src/advanced/AgentVerifier.ts` | 2h | 3.4 |

**Deliverable**: WaveOrchestrator queries veracity-engine before/after agent execution.

### Phase 4: Codebase Sync Automation (Week 2-3)

| Task | File | Effort | Dependency |
|------|------|--------|------------|
| 4.1 Create sync script | `scripts/sync-to-vps.sh` | 2h | None |
| 4.2 Add git post-commit hook | `.git/hooks/post-commit` | 1h | 4.1 |
| 4.3 Create VPS watcher trigger | `veracity-engine/scripts/trigger-reindex.sh` | 1h | Phase 1 |
| 4.4 Test end-to-end sync | - | 2h | 4.1-4.3 |

**Deliverable**: `git commit` automatically syncs and re-indexes on VPS.

### Phase 5: Fallback & Resilience (Week 3)

| Task | File | Effort | Dependency |
|------|------|--------|------------|
| 5.1 Add connection health check | `rad-engineer/src/veracity/HealthChecker.ts` | 2h | Phase 3 |
| 5.2 Implement fallback behavior | `rad-engineer/src/veracity/FallbackStrategy.ts` | 4h | 5.1 |
| 5.3 Add circuit breaker pattern | `rad-engineer/src/veracity/CircuitBreaker.ts` | 4h | 5.2 |
| 5.4 Test with VPS down | - | 2h | 5.1-5.3 |

**Deliverable**: rad-engineer continues working (with warnings) when VPS unavailable.

### Phase 6: Quality Gates Integration (Week 3)

| Task | File | Effort | Dependency |
|------|------|--------|------------|
| 6.1 Add veracity threshold to agent config | `rad-engineer/src/sdk/types.ts` | 1h | None |
| 6.2 Create QualityGate class | `rad-engineer/src/veracity/QualityGate.ts` | 2h | 6.1 |
| 6.3 Integrate with DecisionLearningIntegration | `rad-engineer/src/decision/DecisionLearningIntegration.ts` | 2h | 6.2 |
| 6.4 Add tests | `rad-engineer/test/veracity/` | 2h | 6.1-6.3 |

**Deliverable**: Agent outputs rejected if veracity score < threshold.

---

## Part 12: Implementation Summary

### Total Effort Estimate

| Phase | Effort | Deliverable |
|-------|--------|-------------|
| Phase 1: TypeScript Indexing | 16h | Index TS/TSX files in Neo4j |
| Phase 2: HTTP Gateway | 10h | REST API for queries |
| Phase 3: MCP Integration | 13h | rad-engineer calls veracity-engine |
| Phase 4: Codebase Sync | 6h | Auto-sync on commit |
| Phase 5: Fallback & Resilience | 12h | Graceful degradation |
| Phase 6: Quality Gates | 7h | Veracity-based rejection |
| **Total** | **64h** | **Full integration** |

### Critical Path

```
Phase 1 (TypeScript) → Phase 2 (Gateway) → Phase 3 (MCP Integration)
                                              ↓
                                    Phase 4 (Sync) + Phase 5 (Fallback) + Phase 6 (Quality Gates)
```

### Success Criteria

| Metric | Target | Verification |
|--------|--------|--------------|
| rad-engineer-v2 indexed | All .ts/.tsx files in Neo4j | `list_projects` shows node count |
| Query latency | <500ms for hybrid search | Measure p95 latency |
| Veracity integration | 100% agent outputs scored | Check decision logs |
| Fallback works | Continue with warning when VPS down | Kill VPS, verify operation |
| Auto-sync | <5min from commit to indexed | Time end-to-end |

---

## Appendix A: File Inventory (VPS)

```
engg-support-system/
├── CLAUDE.md                (17KB) - System overview
├── README.md                (8KB)  - Quick start guide
├── docker-compose.yml       (1KB)  - Infrastructure
├── docs/
│   └── plans/
│       └── INTEGRATION_PLAN.md (comprehensive roadmap)
├── gateway/
│   └── src/
│       ├── agents/
│       │   ├── EnggContextAgent.ts    (16KB)
│       │   ├── QueryClassifier.ts     (4KB)
│       │   ├── ClarificationGenerator.ts (2KB)
│       │   └── ConversationManager.ts (6KB)
│       ├── storage/
│       │   └── RedisConversationStore.ts
│       └── types/
│           └── agent-contracts.ts
├── knowledge-base/
│   ├── src/
│   │   ├── core/
│   │   │   ├── KnowledgeBase.ts
│   │   │   ├── QdrantProvider.ts
│   │   │   └── types.ts
│   │   └── mcp/
│   └── config/
│       └── relationships.schema.yaml
└── veracity-engine/
    ├── core/
    │   ├── veracity.py         (11KB)
    │   ├── packet_contract.py  (12KB)
    │   ├── mcp_server.py       (20KB)
    │   ├── build_graph.py      (40KB)
    │   ├── ask_codebase.py     (15KB)
    │   └── evidence_query.py   (14KB)
    └── infra/
        └── docker-compose.yml
```

---

## Appendix B: Connection Details

| Service | Host | Port | Protocol |
|---------|------|------|----------|
| Qdrant | 72.60.204.156 | 6333 | HTTP |
| Neo4j Browser | 72.60.204.156 | 7474 | HTTP |
| Neo4j Bolt | 72.60.204.156 | 7687 | Bolt |
| Ollama | 72.60.204.156 | 11434 | HTTP |
| Redis | 72.60.204.156 | 6379 | Redis |
| Gateway | 72.60.204.156 | 3000 | HTTP |

---

**Version**: 2.0.0
**Last Updated**: 2026-01-12
**Evidence Source**: SSH exploration of VPS codebase + `docker ps` + source file analysis
**Document Scope**: Complete integration context for implementation (12 parts, 64h effort estimate)
