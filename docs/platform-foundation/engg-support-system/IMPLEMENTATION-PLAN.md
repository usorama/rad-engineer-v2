# engg-support-system Implementation Plan

> **Version**: 1.0.0
> **Created**: 2026-01-13
> **Purpose**: Standalone plan for engg-support-system development, prioritized by rad-engineer-v2 dependencies
> **Execution**: Run in separate Claude Code terminal, parallel with rad-engineer-v2 development

---

## Executive Summary

This plan covers the enhancement of engg-support-system (ESS) from its current state on VPS to a fully-featured, locally-developable, production-ready system. The implementation prioritizes features that rad-engineer-v2 depends on for integration.

**Current State**: ESS runs on VPS (72.60.204.156) with Neo4j, Qdrant, Redis, Ollama
**Target State**: Full-featured ESS with TypeScript AST support, HTTP gateway, queue system, and HA resilience

---

## Priority Matrix (rad-engineer Dependencies First)

| Priority | Component | rad-engineer Dependency | Effort |
|----------|-----------|------------------------|--------|
| P0 | Local Development Setup | Blocks all development | 4h |
| P0 | TypeScript AST Parser | Blocks codebase indexing | 16h |
| P0 | HTTP Gateway API | Blocks integration calls | 8h |
| P1 | Health Check Endpoints | Needed for fallback logic | 4h |
| P1 | LLM Request Queue | Prevents agent contention | 8h |
| P1 | Embedding Model Pinning | Ensures reproducibility | 2h |
| P2 | Prometheus Metrics | Observability | 4h |
| P2 | Auto-sync from Local | Developer experience | 4h |
| P2 | Docker Hardening | Production readiness | 4h |

---

## Phase 0: Local Development Setup (FIRST)

**Duration**: Day 1
**Blocking**: All other phases

### Task 0.1: Clone Repository from VPS

```bash
# On local macbook
cd ~/Projects
git clone devuser@72.60.204.156:/home/devuser/Projects/engg-support-system
cd engg-support-system
```

**If not a git repo on VPS:**
```bash
# On VPS first
ssh vps-dev
cd /home/devuser/Projects/engg-support-system
git init
git add -A
git commit -m "Initial commit from VPS"

# On local
scp -r devuser@72.60.204.156:/home/devuser/Projects/engg-support-system ~/Projects/
cd ~/Projects/engg-support-system
git init  # if not already
git remote add vps devuser@72.60.204.156:/home/devuser/Projects/engg-support-system
```

### Task 0.2: Setup OrbStack Docker Environment

**File**: `docker-compose.local.yml`

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15.0
    container_name: ess-neo4j-local
    ports:
      - "7474:7474"  # Browser
      - "7687:7687"  # Bolt
    environment:
      NEO4J_AUTH: neo4j/password123
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7474"]
      interval: 10s
      timeout: 5s
      retries: 5

  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: ess-qdrant-local
    ports:
      - "6333:6333"  # HTTP
      - "6334:6334"  # gRPC
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ess-redis-local
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  ollama:
    image: ollama/ollama:latest
    container_name: ess-ollama-local
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # Pull nomic-embed-text after container starts
    entrypoint: ["/bin/bash", "-c", "ollama serve & sleep 5 && ollama pull nomic-embed-text && wait"]

volumes:
  neo4j_data:
  qdrant_data:
  redis_data:
  ollama_data:
```

**Start command:**
```bash
docker-compose -f docker-compose.local.yml up -d
```

### Task 0.3: Verify Local Environment

**File**: `scripts/verify-local-env.sh`

```bash
#!/bin/bash
set -e

echo "Checking Neo4j..."
curl -s http://localhost:7474 > /dev/null && echo "✓ Neo4j OK" || echo "✗ Neo4j FAILED"

echo "Checking Qdrant..."
curl -s http://localhost:6333/health > /dev/null && echo "✓ Qdrant OK" || echo "✗ Qdrant FAILED"

echo "Checking Redis..."
redis-cli ping | grep -q PONG && echo "✓ Redis OK" || echo "✗ Redis FAILED"

echo "Checking Ollama..."
curl -s http://localhost:11434/api/tags | grep -q nomic && echo "✓ Ollama OK" || echo "✗ Ollama FAILED"

echo ""
echo "All services ready!"
```

### Task 0.4: Environment Configuration

**File**: `.env.local`

```bash
# Database connections (local Docker)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379

OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

# VPS deployment target
VPS_HOST=72.60.204.156
VPS_USER=devuser
VPS_PROJECT_PATH=/home/devuser/Projects/engg-support-system
```

### Task 0.5: Git Configuration for VPS Deployment

**File**: `scripts/deploy-to-vps.sh`

```bash
#!/bin/bash
set -e

echo "Deploying to VPS..."

# Push to VPS remote
git push vps main

# SSH and restart services
ssh vps-dev << 'EOF'
cd /home/devuser/Projects/engg-support-system
git pull
docker-compose down
docker-compose up -d
echo "VPS deployment complete!"
EOF
```

**Verification**:
- [ ] All 4 Docker containers running (`docker ps`)
- [ ] Neo4j browser accessible at http://localhost:7474
- [ ] Qdrant health returns OK
- [ ] Redis ping returns PONG
- [ ] Ollama has nomic-embed-text model

---

## Phase 1: TypeScript AST Parser (P0)

**Duration**: 2 days
**Blocking**: rad-engineer codebase indexing

### Task 1.1: Add tree-sitter-typescript

**Location**: `veracity-engine/requirements.txt`

```
tree-sitter==0.21.0
tree-sitter-typescript==0.21.0
tree-sitter-javascript==0.21.0
```

### Task 1.2: Create TypeScriptVisitor

**Location**: `veracity-engine/core/ts_visitor.py`

```python
"""
TypeScript AST Visitor for codebase indexing.

Extracts:
- Classes with methods
- Functions (including arrow functions)
- Interfaces and types
- Import/export relationships
- JSDoc comments
"""

from dataclasses import dataclass
from typing import List, Optional
import tree_sitter_typescript as ts_typescript
from tree_sitter import Language, Parser

@dataclass
class TSNode:
    uid: str
    node_type: str  # 'class' | 'function' | 'interface' | 'type'
    name: str
    qualified_name: str
    file_path: str
    start_line: int
    end_line: int
    docstring: Optional[str]
    is_exported: bool
    is_async: bool

@dataclass
class TSRelationship:
    source_uid: str
    target_uid: str
    relationship_type: str  # 'DEFINES' | 'CALLS' | 'IMPLEMENTS' | 'IMPORTS'

class TypeScriptVisitor:
    """Visits TypeScript AST and extracts nodes and relationships."""

    def __init__(self):
        self.parser = Parser()
        TS_LANGUAGE = Language(ts_typescript.language_typescript())
        self.parser.set_language(TS_LANGUAGE)

    def parse_file(self, file_path: str, content: str) -> tuple[List[TSNode], List[TSRelationship]]:
        """Parse a TypeScript file and return nodes and relationships."""
        tree = self.parser.parse(bytes(content, "utf8"))
        nodes = []
        relationships = []

        self._visit(tree.root_node, file_path, nodes, relationships)
        return nodes, relationships

    def _visit(self, node, file_path: str, nodes: List[TSNode], relationships: List[TSRelationship]):
        """Recursively visit AST nodes."""

        if node.type == 'class_declaration':
            self._extract_class(node, file_path, nodes, relationships)
        elif node.type in ('function_declaration', 'arrow_function', 'method_definition'):
            self._extract_function(node, file_path, nodes, relationships)
        elif node.type == 'interface_declaration':
            self._extract_interface(node, file_path, nodes, relationships)
        elif node.type == 'type_alias_declaration':
            self._extract_type_alias(node, file_path, nodes, relationships)
        elif node.type == 'import_statement':
            self._extract_import(node, file_path, relationships)

        for child in node.children:
            self._visit(child, file_path, nodes, relationships)

    def _extract_class(self, node, file_path: str, nodes: List[TSNode], relationships: List[TSRelationship]):
        """Extract class declaration."""
        name_node = node.child_by_field_name('name')
        if name_node:
            name = name_node.text.decode('utf8')
            nodes.append(TSNode(
                uid=f"{file_path}::{name}",
                node_type='class',
                name=name,
                qualified_name=f"{file_path}::{name}",
                file_path=file_path,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                docstring=self._extract_jsdoc(node),
                is_exported=self._is_exported(node),
                is_async=False
            ))

    def _extract_function(self, node, file_path: str, nodes: List[TSNode], relationships: List[TSRelationship]):
        """Extract function/method."""
        name_node = node.child_by_field_name('name')
        if name_node:
            name = name_node.text.decode('utf8')
            nodes.append(TSNode(
                uid=f"{file_path}::{name}",
                node_type='function',
                name=name,
                qualified_name=f"{file_path}::{name}",
                file_path=file_path,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                docstring=self._extract_jsdoc(node),
                is_exported=self._is_exported(node),
                is_async='async' in node.text.decode('utf8')[:50]
            ))

    def _extract_interface(self, node, file_path: str, nodes: List[TSNode], relationships: List[TSRelationship]):
        """Extract interface declaration."""
        name_node = node.child_by_field_name('name')
        if name_node:
            name = name_node.text.decode('utf8')
            nodes.append(TSNode(
                uid=f"{file_path}::interface::{name}",
                node_type='interface',
                name=name,
                qualified_name=f"{file_path}::interface::{name}",
                file_path=file_path,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                docstring=self._extract_jsdoc(node),
                is_exported=self._is_exported(node),
                is_async=False
            ))

    def _extract_type_alias(self, node, file_path: str, nodes: List[TSNode], relationships: List[TSRelationship]):
        """Extract type alias."""
        name_node = node.child_by_field_name('name')
        if name_node:
            name = name_node.text.decode('utf8')
            nodes.append(TSNode(
                uid=f"{file_path}::type::{name}",
                node_type='type',
                name=name,
                qualified_name=f"{file_path}::type::{name}",
                file_path=file_path,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                docstring=self._extract_jsdoc(node),
                is_exported=self._is_exported(node),
                is_async=False
            ))

    def _extract_import(self, node, file_path: str, relationships: List[TSRelationship]):
        """Extract import statement as IMPORTS relationship."""
        source = node.child_by_field_name('source')
        if source:
            import_path = source.text.decode('utf8').strip("'\"")
            relationships.append(TSRelationship(
                source_uid=file_path,
                target_uid=import_path,
                relationship_type='IMPORTS'
            ))

    def _extract_jsdoc(self, node) -> Optional[str]:
        """Extract JSDoc comment before a node."""
        prev = node.prev_sibling
        if prev and prev.type == 'comment':
            text = prev.text.decode('utf8')
            if text.startswith('/**'):
                return text
        return None

    def _is_exported(self, node) -> bool:
        """Check if node is exported."""
        parent = node.parent
        if parent and parent.type == 'export_statement':
            return True
        return False
```

### Task 1.3: Extend build_graph.py for TypeScript

**Location**: `veracity-engine/core/build_graph.py` (modify)

Add after line ~100:

```python
from ts_visitor import TypeScriptVisitor

def index_typescript_files(root_dir: str, project_name: str):
    """Index all TypeScript files in directory."""
    visitor = TypeScriptVisitor()

    for ts_file in Path(root_dir).rglob("*.ts"):
        if "node_modules" in str(ts_file):
            continue

        content = ts_file.read_text()
        nodes, relationships = visitor.parse_file(str(ts_file), content)

        # Insert into Neo4j
        for node in nodes:
            create_node_in_neo4j(node, project_name)

        for rel in relationships:
            create_relationship_in_neo4j(rel, project_name)
```

### Task 1.4: Test TypeScript Indexing

**File**: `veracity-engine/tests/test_ts_visitor.py`

```python
import pytest
from core.ts_visitor import TypeScriptVisitor

def test_parse_class():
    visitor = TypeScriptVisitor()
    content = '''
    /**
     * Example class
     */
    export class UserService {
        async getUser(id: string): Promise<User> {
            return this.db.find(id);
        }
    }
    '''
    nodes, rels = visitor.parse_file("test.ts", content)

    assert len(nodes) >= 1
    assert nodes[0].name == "UserService"
    assert nodes[0].is_exported == True
    assert "Example class" in (nodes[0].docstring or "")

def test_parse_function():
    visitor = TypeScriptVisitor()
    content = '''
    export async function fetchData(url: string): Promise<Data> {
        return await fetch(url).then(r => r.json());
    }
    '''
    nodes, rels = visitor.parse_file("test.ts", content)

    assert len(nodes) >= 1
    assert nodes[0].name == "fetchData"
    assert nodes[0].is_async == True

def test_parse_interface():
    visitor = TypeScriptVisitor()
    content = '''
    export interface Config {
        apiUrl: string;
        timeout: number;
    }
    '''
    nodes, rels = visitor.parse_file("test.ts", content)

    assert len(nodes) >= 1
    assert nodes[0].node_type == "interface"
    assert nodes[0].name == "Config"
```

**Verification Criteria**:
- [ ] All tests pass: `pytest veracity-engine/tests/test_ts_visitor.py`
- [ ] rad-engineer-v2 codebase indexes successfully
- [ ] Neo4j contains TypeScript nodes with correct relationships

---

## Phase 2: HTTP Gateway API (P0)

**Duration**: 1 day
**Blocking**: rad-engineer API integration

### Task 2.1: Create Express HTTP Server

**Location**: `gateway/src/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { EnggContextAgent } from './agents/EnggContextAgent';
import { QueryClassifier } from './agents/QueryClassifier';
import { ConversationManager } from './agents/ConversationManager';

const app = express();
app.use(cors());
app.use(express.json());

const agent = new EnggContextAgent();
const classifier = new QueryClassifier();
const conversationManager = new ConversationManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      neo4j: agent.checkNeo4jHealth(),
      qdrant: agent.checkQdrantHealth(),
      redis: conversationManager.checkRedisHealth(),
      ollama: agent.checkOllamaHealth()
    }
  });
});

// Query endpoint (one-shot)
app.post('/query', async (req, res) => {
  try {
    const { query, project, context } = req.body;

    // Classify query
    const classification = await classifier.classify(query);

    // Execute query
    const result = await agent.query({
      query,
      project,
      context,
      mode: classification.clarity === 'clear' ? 'one-shot' : 'conversational'
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conversation endpoint (multi-round)
app.post('/conversation', async (req, res) => {
  try {
    const { conversationId, query, answer } = req.body;

    const result = await conversationManager.process({
      conversationId,
      query,
      answer
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List indexed projects
app.get('/projects', async (req, res) => {
  try {
    const projects = await agent.listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger re-indexing
app.post('/index', async (req, res) => {
  try {
    const { project, rootDir } = req.body;
    // This would trigger the Python indexer
    res.json({ status: 'indexing_started', project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ESS Gateway running on port ${PORT}`);
});
```

### Task 2.2: Add Health Check Methods

**Location**: `gateway/src/agents/EnggContextAgent.ts` (modify)

Add methods:

```typescript
async checkNeo4jHealth(): Promise<boolean> {
  try {
    await this.neo4jClient.query('RETURN 1');
    return true;
  } catch {
    return false;
  }
}

async checkQdrantHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.QDRANT_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.OLLAMA_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
```

### Task 2.3: Test HTTP Gateway

**File**: `gateway/tests/api.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';

const API_URL = 'http://localhost:3000';

describe('ESS Gateway API', () => {
  it('should return healthy status', async () => {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
  });

  it('should query codebase', async () => {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is WaveOrchestrator?',
        project: 'rad-engineer-v2'
      })
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it('should list projects', async () => {
    const response = await fetch(`${API_URL}/projects`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Verification Criteria**:
- [ ] `GET /health` returns 200 with all services healthy
- [ ] `POST /query` returns results with veracity score
- [ ] `GET /projects` returns list of indexed projects

---

## Phase 3: LLM Request Queue (P1)

**Duration**: 1 day
**Purpose**: Prevent contention when multiple agents query ESS

### Task 3.1: Create Request Queue

**Location**: `gateway/src/queue/LLMRequestQueue.ts`

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

interface LLMRequest {
  id: string;
  type: 'embedding' | 'completion';
  input: string;
  model: string;
  timestamp: number;
}

interface LLMResponse {
  id: string;
  result: unknown;
  duration: number;
}

export class LLMRequestQueue {
  private queue: Queue;
  private worker: Worker;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    this.queue = new Queue('llm-requests', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });

    this.worker = new Worker('llm-requests', async (job) => {
      return this.processRequest(job.data);
    }, {
      connection: this.redis,
      concurrency: 1  // Sequential processing to prevent Ollama overload
    });
  }

  async enqueue(request: Omit<LLMRequest, 'id' | 'timestamp'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.queue.add('request', {
      ...request,
      id,
      timestamp: Date.now()
    });
    return id;
  }

  async waitForResult(requestId: string, timeout = 30000): Promise<LLMResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.redis.get(`llm-result:${requestId}`);
      if (result) {
        return JSON.parse(result);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Request ${requestId} timed out`);
  }

  private async processRequest(request: LLMRequest): Promise<void> {
    const startTime = Date.now();

    let result: unknown;
    if (request.type === 'embedding') {
      result = await this.generateEmbedding(request.input, request.model);
    } else {
      result = await this.generateCompletion(request.input, request.model);
    }

    const response: LLMResponse = {
      id: request.id,
      result,
      duration: Date.now() - startTime
    };

    await this.redis.setex(
      `llm-result:${request.id}`,
      300,  // 5 minute TTL
      JSON.stringify(response)
    );
  }

  private async generateEmbedding(input: string, model: string): Promise<number[]> {
    const response = await fetch(`${process.env.OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: input })
    });

    const data = await response.json();
    return data.embedding;
  }

  private async generateCompletion(input: string, model: string): Promise<string> {
    const response = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: input, stream: false })
    });

    const data = await response.json();
    return data.response;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    return {
      waiting: await this.queue.getWaitingCount(),
      active: await this.queue.getActiveCount(),
      completed: await this.queue.getCompletedCount(),
      failed: await this.queue.getFailedCount()
    };
  }
}
```

### Task 3.2: Integrate Queue with Gateway

**Location**: `gateway/src/server.ts` (modify)

```typescript
import { LLMRequestQueue } from './queue/LLMRequestQueue';

const llmQueue = new LLMRequestQueue();

// Add queue stats endpoint
app.get('/queue/stats', async (req, res) => {
  const stats = await llmQueue.getQueueStats();
  res.json(stats);
});
```

**Verification Criteria**:
- [ ] Concurrent requests are queued (not rejected)
- [ ] Queue stats endpoint works
- [ ] Sequential processing prevents Ollama overload

---

## Phase 4: Embedding Model Pinning (P1)

**Duration**: 0.5 days
**Purpose**: Ensure reproducible embeddings

### Task 4.1: Pin Model Version

**Location**: `veracity-engine/core/models.py` (modify)

```python
import hashlib
import subprocess

# Pinned model version with digest
EMBEDDING_MODEL = {
    "name": "nomic-embed-text",
    "expected_digest": "sha256:abc123...",  # Get actual digest
    "dimension": 768
}

def verify_model_version() -> bool:
    """Verify the installed model matches expected digest."""
    result = subprocess.run(
        ["ollama", "show", EMBEDDING_MODEL["name"], "--json"],
        capture_output=True,
        text=True
    )

    model_info = json.loads(result.stdout)
    actual_digest = model_info.get("digest", "")

    if actual_digest != EMBEDDING_MODEL["expected_digest"]:
        raise ValueError(
            f"Model digest mismatch! "
            f"Expected: {EMBEDDING_MODEL['expected_digest']}, "
            f"Got: {actual_digest}"
        )

    return True

def get_model_digest() -> str:
    """Get current model digest for documentation."""
    result = subprocess.run(
        ["ollama", "show", EMBEDDING_MODEL["name"], "--json"],
        capture_output=True,
        text=True
    )
    model_info = json.loads(result.stdout)
    return model_info.get("digest", "unknown")
```

**Verification Criteria**:
- [ ] Model digest is captured in code
- [ ] Verification fails if model changes
- [ ] Digest is logged on startup

---

## Phase 5: VPS Deployment Pipeline

**Duration**: 0.5 days

### Task 5.1: Create Deployment Script

**Location**: `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

echo "=== ESS Deployment Pipeline ==="

# 1. Run local tests
echo "Running tests..."
cd gateway && bun test && cd ..
cd veracity-engine && pytest && cd ..

# 2. Build production images (if needed)
echo "Building images..."
docker-compose -f docker-compose.prod.yml build

# 3. Push to VPS
echo "Pushing to VPS..."
git push vps main

# 4. Deploy on VPS
echo "Deploying on VPS..."
ssh vps-dev << 'EOF'
cd /home/devuser/Projects/engg-support-system
git pull
docker-compose down
docker-compose up -d
sleep 10
# Verify health
curl -f http://localhost:3000/health || exit 1
echo "Deployment successful!"
EOF

echo "=== Deployment Complete ==="
```

### Task 5.2: Create Production Docker Compose

**Location**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15.0
    restart: always
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: ${NEO4J_AUTH}
    volumes:
      - /data/neo4j:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7474"]
      interval: 30s
      timeout: 10s
      retries: 3

  qdrant:
    image: qdrant/qdrant:v1.7.4
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - /data/qdrant:/qdrant/storage

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - /data/redis:/data

  ollama:
    image: ollama/ollama:latest
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - /data/ollama:/root/.ollama

  gateway:
    build: ./gateway
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - neo4j
      - qdrant
      - redis
      - ollama
    environment:
      NEO4J_URI: bolt://neo4j:7687
      QDRANT_URL: http://qdrant:6333
      REDIS_URL: redis://redis:6379
      OLLAMA_URL: http://ollama:11434
```

---

## Integration Checkpoints (for rad-engineer-v2)

After each phase, verify integration readiness:

### Checkpoint 1 (After Phase 0)
- [ ] Local Docker environment running
- [ ] rad-engineer can ping localhost services

### Checkpoint 2 (After Phase 1)
- [ ] rad-engineer-v2 codebase indexed in Neo4j
- [ ] TypeScript nodes visible in graph

### Checkpoint 3 (After Phase 2)
- [ ] rad-engineer can call `POST /query`
- [ ] EvidencePacket responses received

### Checkpoint 4 (After Phase 3)
- [ ] Multiple concurrent agent requests don't fail
- [ ] Queue handles load gracefully

### Checkpoint 5 (After Phase 4)
- [ ] Embeddings are reproducible
- [ ] Same input = same embedding

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| TypeScript indexing | ≥95% of files | Count indexed vs total |
| Query latency | <500ms p95 | Measure /query response time |
| Queue throughput | 10 req/sec sustained | Load test |
| Embedding consistency | 100% | Same input = same output |
| Health check reliability | 99.9% uptime | Monitor /health |

---

## Validation Protocol

Each task must include:

1. **Unit tests** (bun test or pytest)
2. **Integration test** with actual services
3. **Verification criteria** (checkboxes above)
4. **Evidence capture** (screenshots, logs, metrics)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-13
**Dependency Priority**: P0 items block rad-engineer-v2 integration
