# Integration Dependencies: rad-engineer-v2 ↔ engg-support-system

> **Purpose**: Track dependencies between systems to ensure parallel development stays synchronized
> **Updated**: 2026-01-13
> **Status**: Active tracking during parallel development

---

## Dependency Matrix

| rad-engineer-v2 Task | Depends On (ESS) | ESS Phase | Blocking? |
|---------------------|------------------|-----------|-----------|
| MCP Client for Veracity | HTTP Gateway API | Phase 2 | **YES** |
| EvidencePacket Parser | HTTP Gateway API | Phase 2 | **YES** |
| Codebase Queries | TypeScript AST Parser | Phase 1 | **YES** |
| Quality Gate Integration | Veracity Scoring | Existing | No |
| Fallback when VPS down | Health Check Endpoints | Phase 2 | **YES** |
| Concurrent Agent Queries | LLM Request Queue | Phase 3 | Recommended |
| Reproducible Embeddings | Model Pinning | Phase 4 | Recommended |

---

## Synchronization Points

### Checkpoint 1: Local Environment Ready

**ESS Completes**: Phase 0 (Local Development Setup)
**rad-engineer-v2 Can Start**: Local integration testing

**Signal**: ESS creates `INTEGRATION-STATUS.md` with:
```markdown
## Phase 0: Local Environment
- Status: COMPLETE
- Docker Services: neo4j, qdrant, redis, ollama
- Ports: 7474, 7687, 6333, 6379, 11434
- Verified: YYYY-MM-DD HH:MM
```

---

### Checkpoint 2: TypeScript Indexing Ready

**ESS Completes**: Phase 1 (TypeScript AST Parser)
**rad-engineer-v2 Can Start**: Codebase indexing calls

**Signal**: ESS creates checkpoint with:
```markdown
## Phase 1: TypeScript AST Parser
- Status: COMPLETE
- Indexed: rad-engineer-v2 codebase
- Node Count: [number]
- Test: pytest veracity-engine/tests/test_ts_visitor.py PASSED
- Verified: YYYY-MM-DD HH:MM
```

**rad-engineer-v2 Verification**:
```bash
# Query Neo4j for rad-engineer nodes
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is WaveOrchestrator?", "project": "rad-engineer-v2"}'
```

---

### Checkpoint 3: HTTP Gateway Ready

**ESS Completes**: Phase 2 (HTTP Gateway API)
**rad-engineer-v2 Can Start**: Full integration

**Signal**: ESS creates checkpoint with:
```markdown
## Phase 2: HTTP Gateway
- Status: COMPLETE
- Endpoints: /health, /query, /conversation, /projects
- Tests: bun test gateway/tests/api.test.ts PASSED
- Verified: YYYY-MM-DD HH:MM
```

**rad-engineer-v2 Verification**:
```bash
# Health check
curl http://localhost:3000/health

# Query test
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Find functions that handle agent spawning", "project": "rad-engineer-v2"}'
```

---

### Checkpoint 4: Production Ready

**ESS Completes**: Phase 3-5
**rad-engineer-v2 Can Start**: VPS integration, concurrent agents

**Signal**: ESS creates checkpoint with:
```markdown
## Phase 3-5: Production Ready
- Queue: LLM Request Queue active
- Model Pinning: nomic-embed-text sha256:xxx
- VPS Deployed: http://72.60.204.156:3000
- Verified: YYYY-MM-DD HH:MM
```

---

## rad-engineer-v2 Tasks by Dependency

### Phase A: Independent (No ESS dependency)

These rad-engineer tasks can proceed immediately:

| Task | Description | ESS Required? |
|------|-------------|---------------|
| Hierarchical Memory | Implement scope-based context | No |
| Token Budget Manager | Adaptive token limits | No |
| Scope Compressor | Compression logic | No |
| VAC Contracts | AgentContract interface | No |
| Contract Validator | Consistency checking | No |
| Contract Registry | Contract storage | No |
| State Machine Executor | State transitions | No |
| Drift Detector (partial) | Statistical detection | No |

### Phase B: After ESS Checkpoint 2

These tasks require TypeScript indexing:

| Task | Description | ESS Required? |
|------|-------------|---------------|
| Codebase Sync Script | Trigger re-indexing | TypeScript Parser |
| Navigation Integration | Query codebase structure | TypeScript Parser |

### Phase C: After ESS Checkpoint 3

These tasks require HTTP Gateway:

| Task | Description | ESS Required? |
|------|-------------|---------------|
| VeracityClient | Call /query endpoint | HTTP Gateway |
| EvidencePacketParser | Parse responses | HTTP Gateway |
| Quality Gate Integration | Veracity scoring | HTTP Gateway |
| Fallback Strategy | Health check polling | HTTP Gateway |

### Phase D: After ESS Checkpoint 4

These tasks benefit from production features:

| Task | Description | ESS Required? |
|------|-------------|---------------|
| Concurrent Agent Testing | Multiple agents query | LLM Queue |
| Reproducibility Testing | Same embeddings | Model Pinning |

---

## Status Tracking

### Current Status

**ESS Progress**:
- [ ] Phase 0: Local Development Setup
- [ ] Phase 1: TypeScript AST Parser
- [ ] Phase 2: HTTP Gateway API
- [ ] Phase 3: LLM Request Queue
- [ ] Phase 4: Embedding Model Pinning
- [ ] Phase 5: VPS Deployment Pipeline

**rad-engineer-v2 Progress**:
- [ ] Phase A: Independent tasks (can start now)
- [ ] Phase B: After ESS Checkpoint 2
- [ ] Phase C: After ESS Checkpoint 3
- [ ] Phase D: After ESS Checkpoint 4

### Blocking Issues

| Issue | Blocked Task | Owner | Status |
|-------|-------------|-------|--------|
| None currently | - | - | - |

---

## Communication Protocol

### ESS → rad-engineer-v2

1. Update `docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md`
2. Include checkpoint number and verification evidence
3. List any API changes or breaking changes

### rad-engineer-v2 → ESS

1. Update blocking issues table above if blocked
2. Specify exact API/feature needed
3. Include expected format of response

---

## API Contract (Agreed Interface)

### /health Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T10:00:00Z",
  "services": {
    "neo4j": true,
    "qdrant": true,
    "redis": true,
    "ollama": true
  }
}
```

### /query Request

```json
{
  "query": "What is WaveOrchestrator?",
  "project": "rad-engineer-v2",
  "context": ["optional", "context", "strings"],
  "mode": "one-shot"  // or "conversational"
}
```

### /query Response (EvidencePacket)

```json
{
  "requestId": "uuid",
  "status": "success",
  "results": {
    "semantic": {
      "matches": [
        {
          "id": "WaveOrchestrator.ts::WaveOrchestrator",
          "name": "WaveOrchestrator",
          "type": "class",
          "score": 0.95,
          "excerpt": "..."
        }
      ]
    },
    "structural": {
      "relationships": [
        {
          "source": "WaveOrchestrator",
          "target": "StateManager",
          "type": "DEPENDS_ON"
        }
      ]
    }
  },
  "veracity": {
    "confidenceScore": 87,
    "isStale": false,
    "faults": []
  }
}
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-13
**Maintained By**: Both sessions during parallel development
