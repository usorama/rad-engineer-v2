# Unified Implementation Plan: rad-engineer-v2 + engg-support-system

> **Vision**: Autonomous Engineering Platform that engineers digital solutions from ideation to production, fully autonomously using Claude Code and Claude Agent SDK
>
> **Scope**: Complete integration of rad-engineer-v2 (local orchestration) + engg-support-system (VPS indexing/veracity) + Universal Business Domain Extensions
>
> **Distribution**: `npx create-rad-engineer` one-command installer

---

## Part 0: Research Foundation & Traceability

### 0.1 CCA/Neo-Confucius Research Requirements → Implementation Mapping

This plan is derived from the research report "SDK Replication and Deterministic Platform" (Meta/Harvard CCA + Neo-Confucius). Every component traces to research requirements.

| Research Requirement | Research Source | Implementation Component | Status |
|---------------------|-----------------|-------------------------|--------|
| **Hierarchical Working Memory** | RESEARCH-SUMMARY.md §Mechanism 1 | `HierarchicalMemory.ts`, `ScopeManager.ts`, `TokenBudgetManager.ts` | Phase 3 |
| **Persistent Hindsight System** | RESEARCH-SUMMARY.md §Mechanism 2 | `DecisionLearningStore.ts` (EXISTS), `FailureIndex.ts` (NEW) | EXISTS + Phase 5 |
| **Meta-Agent Optimization Loop** | RESEARCH-SUMMARY.md §Mechanism 3 | `MetaAgentLoop.ts`, `TraceAnalyzer.ts`, `ConfigMutator.ts` | Phase 5 |
| **Verifiable Agentic Contract (VAC)** | RESEARCH-SUMMARY.md §Innovation | `AgentContract.ts`, `ContractValidator.ts`, `VACHook.ts` | Phase 4 |
| **Calculator Mode (HLAAs)** | RESEARCH-SUMMARY.md §Calculator Mode | `StateMachineExecutor.ts`, domain-specific `ActionCatalog` | Phase 4 + 6 |
| **Scope-Aware Context** | RESEARCH-SUMMARY.md §Mechanism 1 | `TokenBudgetManager.ts`, modified `PromptValidator.ts` | Phase 3 |
| **Active Learning** | RESEARCH-SUMMARY.md §Mechanism 2 | `DecisionLearningIntegration.ts` (EXISTS) | EXISTS |
| **Deterministic Verification** | RESEARCH-SUMMARY.md §Metrics | `DriftDetector.ts`, `PropertyTestRunner.ts` | Phase 4 |
| **Safety Hooks** | RESEARCH-SUMMARY.md §VAC Protocol | `SecurityLayer.ts` (EXISTS), `VACHook.ts` (NEW) | EXISTS + Phase 4 |
| **Modular Tools (MCP)** | RESEARCH-SUMMARY.md §Architecture | `VeracityClient.ts` (MCP), `SDKIntegration.ts` (EXISTS) | EXISTS + Phase 2 |

### 0.2 Gap Analysis Findings → Phase Mapping

From GAP-ANALYSIS.md, each finding maps to a specific phase:

| Gap Category | Component | Gap Finding | Phase | Tasks |
|--------------|-----------|-------------|-------|-------|
| **GREAT AS-IS** | PersistentHindsight | DecisionLearningStore + DecisionTracker satisfy requirements | N/A | Reuse |
| **GREAT AS-IS** | ActiveLearning | learnFromOutcome() + recordOutcome() complete | N/A | Reuse |
| **GREAT AS-IS** | SafetyHooks | SecurityLayer exceeds CCA baseline | N/A | Reuse |
| **GREAT AS-IS** | ModularTools | SDKIntegration + ProviderFactory + WaveOrchestrator | N/A | Reuse |
| **NEEDS MODIFICATION** | HierarchicalMemory | StateManager is checkpoint-only, not scope-aware | Phase 3 | 3.1, 3.2 |
| **NEEDS MODIFICATION** | MetaAgentLoop | Learning is passive, not Build-Test-Improve | Phase 5 | 5.1 |
| **NEEDS MODIFICATION** | VAC | PromptValidator lacks contracts | Phase 4 | 4.1 |
| **NEEDS MODIFICATION** | CalculatorMode | MethodSelector methods are suggestions, not enforced | Phase 4 | 4.2 |
| **NEEDS MODIFICATION** | DeterministicVerif | EvaluationLoop is heuristic, not statistical | Phase 4 | 4.3 |
| **NEEDS MODIFICATION** | ScopeContext | ResourceMonitor is resource-based, not token-based | Phase 3 | 3.1.3 |
| **MISSING** | HierarchicalMemory class | New component needed | Phase 3 | 3.1.1-3.1.5 |
| **MISSING** | ContractRegistry | New component needed | Phase 4 | 4.1.3 |
| **MISSING** | StateMachineExecutor | New component needed | Phase 4 | 4.2.1-4.2.3 |
| **MISSING** | DriftDetector | New component needed | Phase 4 | 4.3.1-4.3.3 |
| **MISSING** | PropertyTestRunner | New component needed | Phase 4 | 4.1.4 |
| **MISSING** | FailureIndex | New component needed | Phase 5 | 5.2.1-5.2.3 |
| **UNIVERSAL EXTENSIONS** | DomainRegistry | New for business domains | Phase 6 | 6.1 |
| **UNIVERSAL EXTENSIONS** | HumanInTheLoopGateway | New for non-automatable actions | Phase 6 | 6.2.3 |

### 0.3 engg-support-system Integration Requirements

From ENGG-SUPPORT-INTEGRATION.md, these VPS components are integrated:

| VPS Component | File | Status | Integration Point | Phase |
|---------------|------|--------|-------------------|-------|
| **veracity.py** | veracity-engine/core/veracity.py | EXISTS | `VeracityClient.ts` calls MCP | Phase 2 |
| **packet_contract.py** | veracity-engine/core/packet_contract.py | EXISTS | `EvidencePacketParser.ts` | Phase 2 |
| **mcp_server.py** | veracity-engine/core/mcp_server.py | EXISTS | MCP integration | Phase 2 |
| **build_graph.py** | veracity-engine/core/build_graph.py | NEEDS TypeScript | `ts_visitor.py` | Phase 1 |
| **ask_codebase.py** | veracity-engine/core/ask_codebase.py | EXISTS | Used via MCP | Phase 2 |
| **EnggContextAgent.ts** | gateway/src/agents/EnggContextAgent.ts | EXISTS | Dual-DB queries | Phase 2 |
| **QueryClassifier.ts** | gateway/src/agents/QueryClassifier.ts | EXISTS | Used via HTTP | Phase 2 |
| **ConversationManager.ts** | gateway/src/agents/ConversationManager.ts | EXISTS | Multi-round dialogue | Phase 2 |
| **HTTP Server** | gateway/src/server.ts | MISSING | New endpoint layer | Phase 1 |
| **Multi-language visitors** | veracity-engine/core/*.py | MISSING | 10+ language parsers | Phase 1 |

### 0.4 Existing rad-engineer-v2 Components (82 Files)

These components are ALREADY BUILT and will be EXTENDED, not replaced:

| Module | Files | Key Components | Status | Extensions |
|--------|-------|----------------|--------|------------|
| **sdk/** | 12 | SDKIntegration, ResourceMonitor, ProviderFactory, Providers | COMPLETE | Add VeracityClient |
| **core/** | 4 | ResourceManager, PromptValidator, ResponseParser | COMPLETE | Modify for scopes |
| **advanced/** | 4 | WaveOrchestrator, StateManager, ErrorRecoveryEngine | COMPLETE | Integrate HierarchicalMemory |
| **decision/** | 3 | DecisionLearningStore, DecisionTracker | COMPLETE | Add FailureIndex integration |
| **reasoning/** | 5 | MethodSelector, BMADMethods, MethodCatalog | COMPLETE | Add StateMachine |
| **outcome/** | 2 | OutcomeInjector | COMPLETE | Add domain outcomes |
| **execute/** | 2 | DecisionLearningIntegration | COMPLETE | Add MetaAgentLoop |
| **plan/** | 6 | IntakeHandler, ResearchCoordinator, ExecutionPlanGenerator | COMPLETE | None |
| **adaptive/** | 12 | BanditRouter, EvaluationLoop, PerformanceStore | COMPLETE | Add DriftDetector |
| **config/** | 4 | ProviderConfig, EvalsConfig | COMPLETE | Add VeracityConfig |
| **ui-adapter/** | 12 | ElectronIPCAdapter, API handlers | COMPLETE | None |
| **python-bridge/** | 5 | PythonPluginBridge | COMPLETE | None |

### 0.5 Existing Agents (.claude/agents/) - 12 Agents

These agents are PRODUCTION-READY and will be USED, not recreated:

| Agent | Model | Token Budget | Usage |
|-------|-------|--------------|-------|
| `developer.md` | Sonnet | ~120K lifetime | TDD implementation, quality gates |
| `planner.md` | **Opus** | Full context | PRD creation, architecture design |
| `research-agent.md` | Sonnet | ~1K output | Complex research, YAML synthesis |
| `architect.md` | **Opus** | Full context | System design, tech selection |
| `code-reviewer.md` | Sonnet | As needed | Security audits, code quality |
| `test-writer.md` | Sonnet | As needed | Unit/integration/E2E tests |
| `debugger.md` | Sonnet | As needed | Bug investigation |
| `pr-fixer.md` | Sonnet | As needed | PR fixes |
| `pr-reviewer.md` | Sonnet | As needed | PR reviews |
| `pr-tester.md` | Sonnet | As needed | PR testing |
| `e2b-implementer.md` | Sonnet | As needed | E2B sandbox implementation |
| `base-instructions.md` | N/A | N/A | Injected into ALL agents |

**Correction Applied**: The Gap Analysis originally proposed 7 new atomic agents. After evidence review, only 1 is genuinely new (ClassifierAgent). Others map to existing agents:
- Proposed PlannerAgent → Use `planner.md`
- Proposed ExecutorAgent → Use `developer.md`
- Proposed ResearchAgent → Use `research-agent.md`
- Proposed VerifierAgent → Use `code-reviewer.md`
- Proposed LearnerAgent → Use `DecisionLearningIntegration`

---

## Executive Summary

| Dimension | Specification |
|-----------|---------------|
| **Total Tasks** | 147 tasks across 8 phases |
| **New Files** | ~85 files (~18,000 lines) |
| **Modified Files** | ~25 files |
| **Languages Supported** | 10+ (TypeScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin) |
| **Business Domains** | 8 (Software, HR, Finance, Data Analysis, Marketing, Legal, Operations, Customer Success) |
| **Integration Points** | MCP (primary) + HTTP REST (fallback) |
| **Deployment** | VPS service (existing) + npx installer (new) |

### Core Outcomes

| Outcome | Metric | Target |
|---------|--------|--------|
| **Determinism** | Drift Rate (same input × 10 runs) | 0% |
| **Confidence** | Veracity Score on all outputs | ≥85 |
| **Resolution** | Resolve@1 on SWE-Bench-Pro | ≥60% |
| **Coverage** | Contract Coverage (VAC) | 100% |
| **Indexing** | Multi-language AST parsing | 10+ languages |
| **Domains** | Business domain templates | 8 domains |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  npx create-rad-engineer my-project                                         ││
│  │  rad-engineer init --domain=finance                                         ││
│  │  rad-engineer execute "Build expense approval workflow"                     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────────┤
│                          rad-engineer-v2 (LOCAL)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  ORCHESTRATION LAYER                                                        ││
│  │  ├── WaveOrchestrator (existing) + HierarchicalMemory (new)                ││
│  │  ├── ContractValidator (VAC) + StateMachineExecutor (new)                  ││
│  │  ├── MetaAgentLoop (Build-Test-Improve) (new)                              ││
│  │  └── DomainOrchestrator (business domains) (new)                           ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │  INTEGRATION LAYER                                                          ││
│  │  ├── VeracityClient (MCP) → engg-support-system                            ││
│  │  ├── EvidencePacketParser + QualityGate                                    ││
│  │  ├── CircuitBreaker + FallbackStrategy                                     ││
│  │  └── CodebaseSyncManager                                                    ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │  EXISTING MODULES (82 files)                                                ││
│  │  ├── sdk/ (SDKIntegration, Providers, ResourceMonitor)                     ││
│  │  ├── core/ (ResourceManager, PromptValidator, ResponseParser)              ││
│  │  ├── advanced/ (StateManager, ErrorRecoveryEngine)                         ││
│  │  ├── decision/ (DecisionLearningStore, DecisionTracker)                    ││
│  │  ├── plan/ (IntakeHandler, ResearchCoordinator, ExecutionPlanGenerator)    ││
│  │  └── reasoning/ (MethodSelector, BMADMethods, MethodCatalog)               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────────┤
│                              ↕ MCP + HTTP ↕                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                    engg-support-system (VPS 72.60.204.156)                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  GATEWAY (TypeScript)                                                       ││
│  │  ├── EnggContextAgent (dual-DB queries)                                    ││
│  │  ├── QueryClassifier (clear/ambiguous/requires_context)                    ││
│  │  ├── ConversationManager (Redis, 3-round)                                  ││
│  │  ├── HTTPServer (new) + HealthEndpoints (new)                              ││
│  │  └── MultiLanguageRouter (new)                                              ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │  VERACITY ENGINE (Python)                                                   ││
│  │  ├── veracity.py (confidence scoring)                                      ││
│  │  ├── packet_contract.py (evidence packets v1.0)                            ││
│  │  ├── mcp_server.py (4 tools)                                               ││
│  │  ├── build_graph.py (Python AST) + ts_visitor.py (new)                     ││
│  │  └── multi_lang_visitor.py (Go, Rust, Java...) (new)                       ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │  KNOWLEDGE BASE (TypeScript/Qdrant)                                         ││
│  │  ├── 768-dim embeddings (nomic-embed-text)                                 ││
│  │  ├── Semantic search + relationship traversal                              ││
│  │  └── Business domain schemas (new)                                          ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │  INFRASTRUCTURE (Docker)                                                    ││
│  │  ├── Neo4j (7687) - graph database                                         ││
│  │  ├── Qdrant (6333) - vector database                                       ││
│  │  ├── Redis (6379) - conversation state                                     ││
│  │  └── Ollama (11434) - embeddings                                           ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Multi-Language Indexing Foundation

**Duration**: Week 1-2
**Focus**: Enable engg-support-system to index ANY codebase (10+ languages)

### Task 1.1: TypeScript AST Parser

**Location**: `engg-support-system/veracity-engine/core/ts_visitor.py`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 1.1.1 | `requirements.txt` | Add tree-sitter-typescript dependency | 0.5h |
| 1.1.2 | `ts_visitor.py` | Create TypeScriptVisitor class mirroring Python's CodeVisitor | 8h |
| 1.1.3 | `build_graph.py` | Extend to detect .ts/.tsx files and route to TypeScriptVisitor | 2h |
| 1.1.4 | `tests/test_ts_visitor.py` | Unit tests with rad-engineer-v2 sample files | 2h |

**Agent Prompt (1.1.2)**:
```
Task: Create TypeScriptVisitor class for AST parsing
Files: engg-support-system/veracity-engine/core/ts_visitor.py (create), core/code_visitor.py (reference)
Output: JSON {filesModified, nodesExtracted: {classes, functions, imports}, testsPass}

Context:
- Mirror Python CodeVisitor structure exactly
- Node types: Class, Function, Interface, TypeAlias, Import
- Relationships: DEFINES, CALLS, DEPENDS_ON, IMPLEMENTS, EXTENDS
- Use tree-sitter-typescript for parsing
- Extract docstrings from JSDoc comments
- Generate embeddings via Ollama nomic-embed-text

Success Criteria:
- Parses rad-engineer-v2/src/sdk/SDKIntegration.ts correctly
- Extracts 5+ classes, 20+ functions, all imports
- Creates Neo4j nodes with uid, name, qualified_name, docstring, embedding
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| TypeScript files indexed | 100% of rad-engineer-v2 (82 files) | `list_projects` shows node count ≥500 |
| Class extraction | All classes in src/ | Query: `MATCH (c:Class) WHERE c.project = 'rad-engineer-v2' RETURN count(c)` |
| Function extraction | All exported functions | Query for `qualified_name` contains `export` |
| Embedding generation | 768-dim for each node | Check `n.embedding` length = 768 |

### Task 1.2: Multi-Language Visitor Framework

**Location**: `engg-support-system/veracity-engine/core/multi_lang_visitor.py`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 1.2.1 | `multi_lang_visitor.py` | Abstract base visitor with language registry | 4h |
| 1.2.2 | `go_visitor.py` | Go AST parser (tree-sitter-go) | 4h |
| 1.2.3 | `rust_visitor.py` | Rust AST parser (tree-sitter-rust) | 4h |
| 1.2.4 | `java_visitor.py` | Java AST parser (tree-sitter-java) | 4h |
| 1.2.5 | `csharp_visitor.py` | C# AST parser | 4h |
| 1.2.6 | `ruby_visitor.py` | Ruby AST parser | 3h |
| 1.2.7 | `php_visitor.py` | PHP AST parser | 3h |
| 1.2.8 | `swift_visitor.py` | Swift AST parser | 3h |
| 1.2.9 | `kotlin_visitor.py` | Kotlin AST parser | 3h |
| 1.2.10 | `build_graph.py` | Language detection and visitor routing | 2h |

**Agent Prompt (1.2.1)**:
```
Task: Create multi-language visitor framework with language registry
Files: veracity-engine/core/multi_lang_visitor.py (create), code_visitor.py (reference)
Output: JSON {filesModified, languagesSupported: string[], abstractMethods: string[]}

Design:
- Abstract base class with common methods: visit_class, visit_function, visit_import
- Language registry: LANGUAGE_VISITORS = {'python': CodeVisitor, 'typescript': TypeScriptVisitor, ...}
- Factory function: get_visitor(file_path) -> BaseVisitor
- Detect language from file extension
- Unified Neo4j node schema across all languages

Success Criteria:
- All visitors inherit from BaseVisitor
- get_visitor('/path/to/file.go') returns GoVisitor
- 10+ languages registered in LANGUAGE_VISITORS
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Languages supported | 10 | `len(LANGUAGE_VISITORS) >= 10` |
| Cross-language queries work | Pass | Query: `MATCH (f:Function)-[:CALLS]->(g:Function) WHERE f.language <> g.language RETURN count(*)` |
| Index speed | ≥100 files/minute | Benchmark with mixed-language repo |

### Task 1.3: HTTP REST Gateway

**Location**: `engg-support-system/gateway/src/server.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 1.3.1 | `server.ts` | Express server with CORS, rate limiting | 3h |
| 1.3.2 | `routes/query.ts` | POST /query endpoint → EnggContextAgent | 2h |
| 1.3.3 | `routes/health.ts` | GET /health, /ready, /live endpoints | 1h |
| 1.3.4 | `routes/projects.ts` | GET /projects, POST /projects/:name/index | 2h |
| 1.3.5 | `middleware/auth.ts` | API key authentication | 1h |
| 1.3.6 | `Dockerfile.gateway` | Container for gateway service | 1h |

**Agent Prompt (1.3.2)**:
```
Task: Create POST /query endpoint that routes to EnggContextAgent
Files: gateway/src/routes/query.ts (create), agents/EnggContextAgent.ts (reference)
Output: JSON {filesModified, endpoints: [{method, path, handler}], responseSchema}

Requirements:
- Accept QueryRequestWithMode: { query, project, mode, context[] }
- Route to EnggContextAgent.query()
- Return EvidencePacketV1 or ConversationResponse
- Handle errors with proper HTTP status codes
- Log all queries for audit

Success Criteria:
- curl -X POST http://localhost:3000/query -d '{"query":"...", "project":"rad-engineer-v2"}' returns EvidencePacket
- Response time ≤500ms for simple queries
- Error returns 4xx/5xx with structured error body
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Endpoint availability | 99.9% uptime | Health check passes continuously |
| Response latency | p95 < 500ms | Measure with `curl -w "%{time_total}"` |
| Error handling | All errors structured | Test with invalid inputs |

---

## Phase 2: Veracity Integration Layer

**Duration**: Week 2-3
**Focus**: Connect rad-engineer-v2 to engg-support-system with quality gates

### Task 2.1: MCP Client for Veracity

**Location**: `rad-engineer/src/veracity/VeracityClient.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 2.1.1 | `VeracityClient.ts` | MCP client wrapping veracity-engine tools | 4h |
| 2.1.2 | `EvidencePacketParser.ts` | Parse and validate EvidencePacketV1 | 2h |
| 2.1.3 | `VeracityConfig.ts` | Configuration for VPS connection, thresholds | 1h |
| 2.1.4 | `types.ts` | TypeScript interfaces matching packet_contract.py | 2h |
| 2.1.5 | `index.ts` | Module exports | 0.5h |

**Agent Prompt (2.1.1)**:
```
Task: Create MCP client for veracity-engine integration
Files: rad-engineer/src/veracity/VeracityClient.ts (create), sdk/SDKIntegration.ts (reference)
Output: JSON {filesModified, methods: string[], mcpTools: string[]}

Requirements:
- Connect to veracity MCP server via stdio or TCP
- Methods: queryCodebase(), getComponentMap(), listProjects(), getFileRelationships()
- Return typed EvidencePacketV1 objects
- Handle connection failures gracefully
- Cache responses with TTL

MCP Tools to call:
- query_codebase(project_name, question, max_results) → EvidencePacket
- get_component_map(project_name, component_path) → ComponentMap
- list_projects() → ProjectList
- get_file_relationships(project_name, file_path) → FileRelationships

Success Criteria:
- All 4 MCP tools callable via TypeScript methods
- EvidencePacket returned with veracity.confidenceScore populated
- Connection timeout returns graceful error
```

### Task 2.2: Quality Gate Integration

**Location**: `rad-engineer/src/veracity/QualityGate.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 2.2.1 | `QualityGate.ts` | Veracity threshold enforcement | 2h |
| 2.2.2 | `CircuitBreaker.ts` | Circuit breaker for VPS failures | 4h |
| 2.2.3 | `FallbackStrategy.ts` | Graceful degradation when VPS down | 4h |
| 2.2.4 | `HealthChecker.ts` | Periodic VPS health monitoring | 2h |

**Agent Prompt (2.2.1)**:
```
Task: Create QualityGate that rejects low-confidence agent outputs
Files: rad-engineer/src/veracity/QualityGate.ts (create), integration/SecurityLayer.ts (reference)
Output: JSON {filesModified, thresholds: object, rejectionReasons: string[]}

Requirements:
- Configurable thresholds: minConfidence (default 70), maxStaleness (90 days)
- Methods: evaluate(output, evidencePacket) → QualityResult
- QualityResult: {passed: boolean, score: number, reasons: string[], suggestions: string[]}
- Integrate with DecisionLearningIntegration to reject low-quality outputs
- Log all rejections for learning

Rejection Reasons:
- CONFIDENCE_TOO_LOW: veracity.confidenceScore < minConfidence
- STALE_EVIDENCE: veracity.isStale = true
- CONTRADICTION_DETECTED: veracity.faults includes CONTRADICTION
- INSUFFICIENT_EVIDENCE: status = 'insufficient_evidence'

Success Criteria:
- evaluate() returns QualityResult with all fields populated
- Outputs with confidenceScore < 70 are rejected
- Rejection reasons are human-readable
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Quality gate coverage | 100% of agent outputs scored | Log analysis: all outputs have veracity score |
| Rejection rate | Track (baseline) | Count rejections / total evaluations |
| False positive rate | ≤5% | Manual review of rejected outputs |

### Task 2.3: Codebase Sync Automation

**Location**: `rad-engineer/scripts/sync-to-vps.sh` + `rad-engineer/src/veracity/CodebaseSyncManager.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 2.3.1 | `sync-to-vps.sh` | Rsync script with exclusions | 2h |
| 2.3.2 | `CodebaseSyncManager.ts` | TypeScript wrapper with change detection | 4h |
| 2.3.3 | `.git/hooks/post-commit` | Auto-sync on commit | 1h |
| 2.3.4 | `trigger-reindex.sh` | VPS-side reindex trigger | 1h |

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Sync latency | ≤60s from commit to indexed | Time end-to-end |
| Change detection | Only modified files synced | Check rsync output |
| Reindex trigger | Works via webhook | Verify Neo4j node timestamps |

---

## Phase 3: Hierarchical Memory System

**Duration**: Week 3-4
**Focus**: Implement CCA's hierarchical working memory for logarithmic context growth

### Task 3.1: HierarchicalMemory Class

**Location**: `rad-engineer/src/memory/HierarchicalMemory.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 3.1.1 | `Scope.ts` | Scope class with parent reference | 3h |
| 3.1.2 | `HierarchicalMemory.ts` | Memory manager with scope stack | 8h |
| 3.1.3 | `TokenBudgetManager.ts` | Per-scope token tracking and eviction | 4h |
| 3.1.4 | `ScopeCompressor.ts` | Compress local scope to task summary | 4h |
| 3.1.5 | `index.ts` | Module exports | 0.5h |

**Agent Prompt (3.1.2)**:
```
Task: Implement HierarchicalMemory with Global→Task→Local scope stack
Files: rad-engineer/src/memory/HierarchicalMemory.ts (create), advanced/StateManager.ts (integrate)
Output: JSON {filesModified, scopeLevels: string[], methods: string[], tokenGrowthRate: string}

Requirements:
- Three scope levels:
  - GLOBAL: Immutable project manifesto, architectural constraints (2000 tokens max)
  - TASK: Current plan, progress summaries (4000 tokens, scales with complexity)
  - LOCAL: Ephemeral tool outputs (2000 tokens, compressed after subtask)
- Methods:
  - pushTask(goal: string): void - Push new task scope
  - popTask(): string - Pop and compress to summary
  - addLocalContext(content: string): void - Add to local scope
  - buildPromptContext(): string - Traverse tree, build context string
  - getTokenUsage(): {global, task, local} - Current token counts
- Compression triggers when LOCAL exceeds budget
- Token growth should be O(log n) with respect to completed tasks

Success Criteria:
- After 10 tasks completed, token usage ≤ 3x initial (not 10x)
- buildPromptContext() returns structured context with clear scope boundaries
- Compression preserves key insights, discards raw logs
```

**Agent Prompt (3.1.4)**:
```
Task: Create ScopeCompressor that summarizes scope content
Files: rad-engineer/src/memory/ScopeCompressor.ts (create)
Output: JSON {filesModified, compressionRatio: number, preservedKeys: string[]}

Requirements:
- Use fast model (Haiku) for compression
- Input: Scope with raw events (tool outputs, errors, etc.)
- Output: High-density summary (≤200 tokens)
- Preserve: Key decisions, artifacts (patches/diffs), success/failure status
- Discard: Raw logs, intermediate debugging, repeated information

Prompt for Haiku:
"Summarize this scope's events into a high-density summary (≤200 tokens).
Preserve: decisions made, files modified, tests passed/failed, key errors.
Discard: raw output, repeated content, debugging steps.
Format: Bullet points with actionable information."

Success Criteria:
- Compression ratio ≥ 5:1 (e.g., 1000 tokens → 200 tokens)
- Summary includes all file modifications
- Summary includes final test status
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Token efficiency | ≤70% budget usage | Monitor `getTokenUsage()` |
| Compression ratio | ≥5:1 | Compare raw vs compressed |
| Context growth rate | O(log n) | Plot tokens vs tasks, verify sublinear |

### Task 3.2: Integrate with WaveOrchestrator

**Location**: `rad-engineer/src/advanced/WaveOrchestrator.ts` (modify)

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 3.2.1 | `WaveOrchestrator.ts` | Inject HierarchicalMemory, manage scopes per wave | 4h |
| 3.2.2 | `PromptValidator.ts` | Use TokenBudgetManager for adaptive limits | 2h |
| 3.2.3 | `DecisionLearningIntegration.ts` | Record scope summaries as learning | 2h |

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Long-horizon tasks | Complete without context overflow | Run 50-task sequence |
| Scope transition accuracy | 100% correct scope on each task | Verify with tracing |

---

## Phase 4: Verifiable Agentic Contract (VAC)

**Duration**: Week 4-5
**Focus**: Implement contract-first execution with formal verification

### Task 4.1: Contract System

**Location**: `rad-engineer/src/verification/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 4.1.1 | `AgentContract.ts` | Contract interface with pre/post/invariants | 3h |
| 4.1.2 | `ContractValidator.ts` | Validate contract consistency | 4h |
| 4.1.3 | `ContractRegistry.ts` | Store and retrieve contracts by task type | 3h |
| 4.1.4 | `PropertyTestRunner.ts` | Hypothesis-style property testing | 6h |
| 4.1.5 | `VACHook.ts` | Pre-commit hook that blocks unverified code | 3h |
| 4.1.6 | `index.ts` | Module exports | 0.5h |

**Agent Prompt (4.1.1)**:
```
Task: Define AgentContract interface for VAC system
Files: rad-engineer/src/verification/AgentContract.ts (create)
Output: JSON {filesModified, interfaces: string[], conditionTypes: string[]}

Requirements:
- Interface AgentContract:
  - id: string
  - taskType: string (e.g., 'implement_feature', 'fix_bug', 'refactor')
  - preconditions: Condition[] - Must be true before execution
  - postconditions: Condition[] - Must be true after execution
  - invariants: Condition[] - Must be true throughout
  - verificationMethod: 'runtime' | 'property-test' | 'formal'
- Interface Condition:
  - id: string
  - name: string
  - predicate: (context: ExecutionContext) => boolean | Promise<boolean>
  - errorMessage: string
  - severity: 'error' | 'warning'
- Interface ExecutionContext:
  - files: FileState[]
  - tests: TestResult[]
  - typecheck: TypecheckResult
  - metrics: MetricSnapshot

Success Criteria:
- All interfaces have JSDoc documentation
- Condition predicates can be async (for I/O checks)
- ExecutionContext captures all verification-relevant state
```

**Agent Prompt (4.1.5)**:
```
Task: Create VACHook that blocks commits without verified contracts
Files: rad-engineer/src/verification/VACHook.ts (create), core/PromptValidator.ts (reference)
Output: JSON {filesModified, blockedTools: string[], bypassConditions: string[]}

Requirements:
- Integrate with Claude Code hooks system (PreToolUse)
- Block these tools without verified contract:
  - commit_changes
  - push_changes
  - deploy
- Hook logic:
  if (tool in BLOCKED_TOOLS):
    if (!context.contractVerified):
      return {decision: 'deny', reason: 'RISK BLOCK: Run verify_contract first'}
- Allow bypass for:
  - Emergency flag: context.emergencyBypass = true (logged)
  - Non-production branches: branch.startsWith('experiment/')

Success Criteria:
- Attempting to commit without contract verification fails
- Error message is clear and actionable
- Emergency bypass works but is logged
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Contract coverage | 100% of code changes | All commits have contract ID |
| Verification rejection rate | Track (bugs caught) | Log analysis |
| Precondition success rate | ≥95% | Count pre_pass / pre_total |
| Postcondition success rate | ≥90% | Count post_pass / post_total |

### Task 4.2: State Machine Executor

**Location**: `rad-engineer/src/verification/StateMachineExecutor.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 4.2.1 | `StateMachineExecutor.ts` | Defined states and transitions only | 8h |
| 4.2.2 | `Transition.ts` | Transition with guards and rollback | 4h |
| 4.2.3 | `UndefinedStateError.ts` | Error for invalid transitions | 1h |

**Agent Prompt (4.2.1)**:
```
Task: Create StateMachineExecutor that prevents undefined states
Files: rad-engineer/src/verification/StateMachineExecutor.ts (create)
Output: JSON {filesModified, states: string[], transitions: string[], guarantees: string[]}

Requirements:
- Define execution states:
  - IDLE: Ready to accept task
  - PLANNING: Generating contract and plan
  - EXECUTING: Running implementation
  - VERIFYING: Checking postconditions
  - COMMITTING: Writing to codebase
  - COMPLETED: Task finished
  - FAILED: Task failed with recovery
- Define allowed transitions:
  - IDLE → PLANNING (on task_received)
  - PLANNING → EXECUTING (on contract_verified)
  - EXECUTING → VERIFYING (on implementation_complete)
  - VERIFYING → COMMITTING (on verification_passed)
  - VERIFYING → EXECUTING (on verification_failed, retry)
  - COMMITTING → COMPLETED (on commit_success)
  - ANY → FAILED (on unrecoverable_error)
- Guard functions on each transition
- Automatic rollback on failed transition

Guarantees:
- No undefined states possible (throws UndefinedStateError)
- State machine is deterministic given same inputs
- Rollback restores previous state exactly

Success Criteria:
- Attempting IDLE → EXECUTING throws UndefinedStateError
- State transitions are logged with timestamps
- Rollback tested for each transition
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Undefined state occurrences | 0 | Monitor UndefinedStateError throws |
| Rollback success rate | 100% | Test each transition's rollback |
| State determinism | 100% | Same inputs → same state sequence |

### Task 4.3: Drift Detection

**Location**: `rad-engineer/src/verification/DriftDetector.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 4.3.1 | `DriftDetector.ts` | Statistical drift detection | 6h |
| 4.3.2 | `ASTComparator.ts` | Compare code ASTs for semantic equivalence | 4h |
| 4.3.3 | `ReproducibilityTest.ts` | Run same task N times, measure variance | 3h |

**Agent Prompt (4.3.1)**:
```
Task: Create DriftDetector for determinism validation
Files: rad-engineer/src/verification/DriftDetector.ts (create)
Output: JSON {filesModified, statisticalTests: string[], metrics: string[]}

Requirements:
- Methods:
  - measureDriftRate(task, runs=10): Promise<number> - Run same task N times, return variance
  - detectDistributionDrift(baseline, current): DriftResult - Kolmogorov-Smirnov test
  - normalizeAST(code): string - Normalize code to comparable form
- DriftResult:
  - hasDrift: boolean
  - ksStatistic: number
  - pValue: number
  - confidence: number
- For code comparison:
  - Normalize whitespace, comments
  - Compare AST structure, not text
  - Report semantic differences only

Statistical Tests:
- Kolmogorov-Smirnov for continuous distributions
- Chi-square for categorical data
- Fisher exact test for small samples

Success Criteria:
- measureDriftRate returns 0 for truly deterministic tasks
- detectDistributionDrift has ≤5% false positive rate
- AST comparison ignores cosmetic differences
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Drift rate | 0% | measureDriftRate on 10 reference tasks |
| Reproducibility | 100% identical AST | 10 runs × 10 tasks |

---

## Phase 5: Meta-Agent Optimization Loop

**Duration**: Week 5-6
**Focus**: Implement Build-Test-Improve cycle for continuous self-improvement

### Task 5.1: MetaAgentLoop

**Location**: `rad-engineer/src/meta/MetaAgentLoop.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 5.1.1 | `MetaAgentLoop.ts` | Build-Test-Improve orchestration | 8h |
| 5.1.2 | `TraceAnalyzer.ts` | Analyze execution traces for bottlenecks | 4h |
| 5.1.3 | `ConfigMutator.ts` | Mutate agent configurations | 4h |
| 5.1.4 | `BenchmarkRunner.ts` | Run SWE-Bench tasks for evaluation | 4h |
| 5.1.5 | `FailureIndex.ts` | Searchable failure pattern database | 4h |

**Agent Prompt (5.1.1)**:
```
Task: Implement MetaAgentLoop for continuous agent improvement
Files: rad-engineer/src/meta/MetaAgentLoop.ts (create), execute/DecisionLearningIntegration.ts (integrate)
Output: JSON {filesModified, loopStages: string[], improvementMetrics: string[]}

Requirements:
- Build-Test-Improve loop:
  1. BUILD: Execute task with current configuration
  2. TEST: Evaluate quality via EvaluationLoop
  3. IMPROVE: If quality < threshold, analyze trace and modify configuration
- Methods:
  - executeWithImprovement(task: Task): Promise<Result>
  - analyzeTrace(trace: ExecutionTrace): BottleneckAnalysis
  - improveConfiguration(analysis: BottleneckAnalysis): ConfigDelta
  - applyImprovements(task: Task, delta: ConfigDelta): Task
- Quality threshold: configurable (default 0.7)
- Max attempts: configurable (default 3)
- Learning integration: Record successful improvements to DecisionLearningStore

Improvement Strategies:
- PROMPT_REFINEMENT: Modify agent prompt based on failure pattern
- TOOL_SUBSTITUTION: Replace failing tool with alternative
- CONTEXT_EXPANSION: Add more context for unclear tasks
- DECOMPOSITION: Break task into smaller subtasks

Success Criteria:
- After 3 iterations, quality improves by ≥10% on average
- Bottleneck analysis identifies specific failure point
- Improvements are recorded and reused for similar tasks
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Quality improvement per iteration | ≥10% | Track quality scores across iterations |
| Convergence rate | 90% within 3 attempts | Count tasks reaching quality threshold |
| Learning reuse | ≥30% improvement patterns reused | Track pattern applications |

### Task 5.2: Failure Index System

**Location**: `rad-engineer/src/meta/FailureIndex.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 5.2.1 | `FailureIndex.ts` | Semantic search over failure patterns | 4h |
| 5.2.2 | `FailureEmbedding.ts` | Generate embeddings for error messages | 2h |
| 5.2.3 | `ResolutionMatcher.ts` | Match failures to known resolutions | 3h |

**Agent Prompt (5.2.1)**:
```
Task: Create FailureIndex for searchable failure pattern database
Files: rad-engineer/src/meta/FailureIndex.ts (create)
Output: JSON {filesModified, methods: string[], indexFields: string[]}

Requirements:
- Interface FailureRecord:
  - id: string
  - error: string (error message)
  - context: ExecutionContext (state at failure)
  - rootCause: string (diagnosed cause)
  - resolution: string (how it was fixed)
  - embedding: number[] (768-dim for semantic search)
  - tags: string[] (categorization)
- Methods:
  - index(failure: FailureRecord): Promise<void>
  - searchSimilar(error: string, limit: number): Promise<FailureRecord[]>
  - getResolution(error: string): Promise<string | undefined>
- Use local SQLite + vector extension for storage
- Fallback to VPS knowledge-base for cross-project search

Success Criteria:
- Similar errors return similar failures (cosine similarity ≥0.8)
- Resolution lookup has ≤100ms latency
- Index persists across sessions
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Resolution hit rate | ≥40% | Count resolutions found / errors searched |
| Search latency | ≤100ms | Measure `searchSimilar` time |
| Index growth | Track | Monitor failure count over time |

---

## Phase 6: Universal Business Domain Extensions

**Duration**: Week 6-8
**Focus**: Enable platform to work beyond software engineering

### Task 6.1: Domain Registry

**Location**: `rad-engineer/src/universal/DomainRegistry.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 6.1.1 | `DomainDefinition.ts` | Interface for domain definitions | 2h |
| 6.1.2 | `DomainRegistry.ts` | Registry with domain lookup and composition | 4h |
| 6.1.3 | `domains/software.ts` | Software engineering domain | 4h |
| 6.1.4 | `domains/hr.ts` | HR/People operations domain | 4h |
| 6.1.5 | `domains/finance.ts` | Finance/Accounting domain | 4h |
| 6.1.6 | `domains/data-analysis.ts` | Data analysis/BI domain | 4h |
| 6.1.7 | `domains/marketing.ts` | Marketing operations domain | 3h |
| 6.1.8 | `domains/legal.ts` | Legal/Compliance domain | 3h |
| 6.1.9 | `domains/operations.ts` | Operations/Supply chain domain | 3h |
| 6.1.10 | `domains/customer-success.ts` | Customer success domain | 3h |

**Agent Prompt (6.1.1)**:
```
Task: Define DomainDefinition interface for universal applicability
Files: rad-engineer/src/universal/DomainDefinition.ts (create)
Output: JSON {filesModified, interfaces: string[], domainProperties: string[]}

Requirements:
- Interface DomainDefinition:
  - id: string (e.g., 'software', 'hr', 'finance')
  - name: string (display name)
  - description: string
  - keywords: string[] (for domain detection)
  - phases: PhaseTemplate[] (lifecycle phases)
  - actions: ActionCatalog (domain-specific actions)
  - outcomes: OutcomeFramework (success metrics)
  - stakeholders: StakeholderRole[]
  - regulations: RegulationSet[] (compliance requirements)
  - integrations: ExternalSystem[] (APIs, databases)
  - artifacts: ArtifactType[] (documents, reports)
- Interface PhaseTemplate:
  - id: string
  - name: string
  - requiredInputs: string[]
  - expectedOutputs: string[]
  - validationRules: ValidationRule[]
- Interface ActionCatalog:
  - actions: Action[]
  - preconditions: Map<ActionId, Condition[]>
  - effects: Map<ActionId, Effect[]>

Success Criteria:
- All properties documented with JSDoc
- PhaseTemplate captures full lifecycle
- ActionCatalog is complete (all domain actions)
```

**Agent Prompt (6.1.4 - HR Domain)**:
```
Task: Define HR domain with complete lifecycle and actions
Files: rad-engineer/src/universal/domains/hr.ts (create)
Output: JSON {filesModified, phases: string[], actions: string[], stakeholders: string[]}

HR Domain Specification:
- id: 'hr'
- name: 'Human Resources & People Operations'

Phases:
1. RECRUITMENT: Job posting, candidate sourcing, screening
2. HIRING: Interviews, offers, negotiations
3. ONBOARDING: Documentation, training, equipment
4. PERFORMANCE: Reviews, goals, feedback
5. DEVELOPMENT: Training, career paths, succession
6. OFFBOARDING: Exit interviews, knowledge transfer, deprovisioning

Actions:
- create_job_posting(title, requirements, compensation)
- screen_candidates(jobId, criteria)
- schedule_interview(candidateId, interviewers, time)
- generate_offer_letter(candidateId, compensation, startDate)
- create_onboarding_plan(employeeId, department)
- track_performance_goals(employeeId, goals)
- generate_review_document(employeeId, period)
- process_termination(employeeId, type, lastDay)

Stakeholders:
- HR_MANAGER: Owns processes, approves decisions
- HIRING_MANAGER: Defines requirements, makes hiring decisions
- RECRUITER: Sources candidates, conducts screens
- CANDIDATE: External person applying
- EMPLOYEE: Internal person in process
- IT_ADMIN: Provisions/deprovisions access
- LEGAL: Reviews compliance

Regulations:
- EEOC: Equal opportunity compliance
- GDPR/CCPA: Data privacy for candidates
- I-9: Employment eligibility verification
- ADA: Accommodation requirements

Success Criteria:
- All 6 phases defined with inputs/outputs
- ≥20 actions covering full lifecycle
- All stakeholders with clear responsibilities
- Major regulations captured
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Domains defined | 8 | Count domain files |
| Actions per domain | ≥15 | Count actions in each domain |
| Lifecycle coverage | 100% | All phases have actions |

### Task 6.2: Domain Orchestrator

**Location**: `rad-engineer/src/universal/DomainOrchestrator.ts`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 6.2.1 | `DomainOrchestrator.ts` | Base orchestrator for domain execution | 6h |
| 6.2.2 | `DomainDetector.ts` | Auto-detect domain from task description | 3h |
| 6.2.3 | `HumanInTheLoopGateway.ts` | Manage human checkpoints | 6h |
| 6.2.4 | `ExternalResourceAdapter.ts` | Integration with external APIs | 4h |

**Agent Prompt (6.2.3)**:
```
Task: Create HumanInTheLoopGateway for non-automatable actions
Files: rad-engineer/src/universal/HumanInTheLoopGateway.ts (create)
Output: JSON {filesModified, taskTypes: string[], notificationChannels: string[]}

Requirements:
- Some actions require human execution (e.g., physical inspection, signature)
- Methods:
  - queueForHuman(task: HumanTask): Promise<string> - Queue task, return taskId
  - checkCompletion(taskId: string): Promise<HumanTaskResult | null>
  - notify(taskId: string, channel: NotificationChannel): Promise<void>
  - setTimeout(taskId: string, duration: Duration): void
  - escalate(taskId: string, escalationPath: string[]): void
- HumanTask:
  - id: string
  - description: string
  - instructions: string[]
  - requiredEvidence: EvidenceType[] (photo, signature, document)
  - assignedTo: string | null
  - deadline: Date
  - priority: 'high' | 'normal' | 'low'
- NotificationChannel: 'email' | 'slack' | 'sms' | 'webhook'
- Integration with existing workflow (blocks execution until human completes)

Use Cases:
- Legal: Contract signature required
- HR: Background check verification
- Finance: Invoice approval ≥$10k
- Operations: Physical inventory count

Success Criteria:
- Human tasks are queued with unique ID
- Notification sent within 1 minute of queuing
- Completion status is checked efficiently (webhook-based)
- Timeout triggers escalation
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Human task queuing | ≤1s latency | Measure queue time |
| Notification delivery | ≤1min | Check notification logs |
| Completion detection | ≤5min after action | Webhook latency |

### Task 6.3: Business Domain Schemas (Knowledge Base)

**Location**: `engg-support-system/knowledge-base/config/schemas/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 6.3.1 | `hr.schema.yaml` | HR domain node types and relationships | 2h |
| 6.3.2 | `finance.schema.yaml` | Finance domain schema | 2h |
| 6.3.3 | `data-analysis.schema.yaml` | Data analysis domain schema | 2h |
| 6.3.4 | `marketing.schema.yaml` | Marketing domain schema | 2h |
| 6.3.5 | `legal.schema.yaml` | Legal domain schema | 2h |
| 6.3.6 | `operations.schema.yaml` | Operations domain schema | 2h |
| 6.3.7 | `customer-success.schema.yaml` | Customer success domain schema | 2h |
| 6.3.8 | `SchemaLoader.ts` | Load and validate domain schemas | 3h |

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Domain schemas | 8 complete | Count schema files |
| Node types per domain | ≥10 | Count in each schema |
| Relationship types | ≥15 | Count unique relationships |

---

## Phase 7: npx Installer & Distribution

**Duration**: Week 8-9
**Focus**: One-command installation that sets up everything

### Task 7.1: Package Structure

**Location**: `rad-engineer/packages/create-rad-engineer/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 7.1.1 | `package.json` | npm package configuration | 1h |
| 7.1.2 | `bin/create-rad-engineer.js` | CLI entry point | 2h |
| 7.1.3 | `src/installer.ts` | Main installer logic | 6h |
| 7.1.4 | `src/prompts.ts` | Interactive prompts (domain, VPS config) | 3h |
| 7.1.5 | `src/templates/` | Project templates per domain | 4h |
| 7.1.6 | `src/docker-compose.yml` | Local Docker services (optional) | 2h |
| 7.1.7 | `src/vps-connector.ts` | VPS connection setup | 3h |

**Agent Prompt (7.1.3)**:
```
Task: Create installer that sets up rad-engineer in any project
Files: packages/create-rad-engineer/src/installer.ts (create)
Output: JSON {filesModified, installationSteps: string[], configFiles: string[]}

Requirements:
- Installation steps:
  1. Check prerequisites (Node ≥18, Docker optional)
  2. Prompt for domain (software, hr, finance, etc.)
  3. Prompt for VPS connection (use existing or local Docker)
  4. Create project structure
  5. Install dependencies
  6. Configure MCP servers
  7. Set up Claude Code integration
  8. Run initial codebase sync to VPS
  9. Verify installation
- Files created:
  - .rad-engineer/config.yaml (main config)
  - .rad-engineer/domain.yaml (domain definition)
  - .rad-engineer/vps.yaml (VPS connection)
  - .claude/mcp-servers.json (MCP configuration)
  - .claude/CLAUDE.md (context file)
- Interactive mode for first-time setup
- Non-interactive mode for CI/CD: `npx create-rad-engineer --domain=software --vps=72.60.204.156`

Success Criteria:
- Full installation completes in ≤5 minutes
- All config files are valid YAML/JSON
- rad-engineer CLI is available after installation
- Initial sync to VPS succeeds
```

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Installation time | ≤5 minutes | Time from `npx` to ready |
| Success rate | ≥95% | Track installation outcomes |
| Config validation | 100% pass | Validate all generated files |

### Task 7.2: CLI Commands

**Location**: `rad-engineer/src/cli/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 7.2.1 | `init.ts` | `rad-engineer init` - Initialize in existing project | 3h |
| 7.2.2 | `execute.ts` | `rad-engineer execute "task"` - Execute task | 4h |
| 7.2.3 | `plan.ts` | `rad-engineer plan "goal"` - Generate plan | 3h |
| 7.2.4 | `sync.ts` | `rad-engineer sync` - Sync codebase to VPS | 2h |
| 7.2.5 | `status.ts` | `rad-engineer status` - Show current state | 2h |
| 7.2.6 | `verify.ts` | `rad-engineer verify` - Verify installation | 2h |

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Commands implemented | 6 | Count CLI commands |
| Help documentation | 100% | All commands have --help |
| Error messages | Clear and actionable | Manual review |

### Task 7.3: Documentation

**Location**: `rad-engineer/docs/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 7.3.1 | `getting-started.md` | Quick start guide | 3h |
| 7.3.2 | `domain-guide.md` | How to use each domain | 4h |
| 7.3.3 | `architecture.md` | System architecture documentation | 3h |
| 7.3.4 | `api-reference.md` | API documentation | 4h |
| 7.3.5 | `troubleshooting.md` | Common issues and solutions | 2h |

---

## Phase 8: Integration Testing & Production Readiness

**Duration**: Week 9-10
**Focus**: End-to-end testing, performance validation, production hardening

### Task 8.1: Integration Test Suite

**Location**: `rad-engineer/test/integration/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 8.1.1 | `vps-integration.test.ts` | Test VPS connectivity and queries | 4h |
| 8.1.2 | `hierarchical-memory.test.ts` | Test memory across long tasks | 4h |
| 8.1.3 | `vac-workflow.test.ts` | Test contract-first execution | 4h |
| 8.1.4 | `domain-execution.test.ts` | Test each business domain | 8h |
| 8.1.5 | `meta-agent-loop.test.ts` | Test improvement iterations | 4h |
| 8.1.6 | `installer.test.ts` | Test npx installation flow | 3h |

### Task 8.2: Performance Validation

**Location**: `rad-engineer/test/performance/`

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 8.2.1 | `benchmark-suite.ts` | Performance benchmark harness | 4h |
| 8.2.2 | `swe-bench-runner.ts` | Run SWE-Bench-Pro subset | 6h |
| 8.2.3 | `long-horizon.test.ts` | 50+ task sequences | 4h |
| 8.2.4 | `concurrent-agents.test.ts` | Stress test with 3 agents | 3h |

### Task 8.3: Production Hardening

**Location**: Various

| Sub-task | File | Description | Effort |
|----------|------|-------------|--------|
| 8.3.1 | `rate-limiter.ts` | API rate limiting | 2h |
| 8.3.2 | `audit-logger.ts` | Comprehensive audit logging | 3h |
| 8.3.3 | `secrets-manager.ts` | Secure credential handling | 3h |
| 8.3.4 | `backup-restore.ts` | State backup and restore | 4h |
| 8.3.5 | `monitoring.ts` | Prometheus metrics export | 3h |

**Measurable Outcomes**:
| Metric | Target | Verification |
|--------|--------|--------------|
| Integration test pass rate | 100% | CI pipeline |
| SWE-Bench Resolve@1 | ≥60% | Benchmark run |
| Long-horizon completion | 100% | 50-task test |
| P95 latency | ≤2s | Performance benchmark |

---

## Success Metrics Summary

### Primary Outcomes (Deterministic)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Drift Rate** | 0% | Run same task 10×, compare ASTs |
| **Veracity Confidence** | ≥85 on all outputs | Check EvidencePacket.veracity.confidenceScore |
| **Contract Coverage** | 100% | All commits have verified contract |
| **Resolve@1** | ≥60% | SWE-Bench-Pro evaluation |
| **Hallucination Rate** | ≤1% | Evidence validation checks |

### Secondary Outcomes (Quality)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Token Efficiency** | ≤70% budget usage | HierarchicalMemory.getTokenUsage() |
| **Context Growth** | O(log n) | Plot tokens vs completed tasks |
| **Compression Ratio** | ≥5:1 | ScopeCompressor before/after |
| **Quality Improvement** | ≥10% per iteration | MetaAgentLoop quality scores |
| **Resolution Hit Rate** | ≥40% | FailureIndex search success |

### Tertiary Outcomes (Experience)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Installation Time** | ≤5 minutes | npx timer |
| **VPS Sync Latency** | ≤60 seconds | Commit to indexed timestamp |
| **Query Response Time** | ≤500ms p95 | HTTP latency measurement |
| **Human Task Notification** | ≤1 minute | Notification delivery timestamp |
| **CLI Command Latency** | ≤2 seconds | Command execution time |

---

## Agent Prompt Templates

### Template: Implementation Task

```
Task: [200 chars max - specific task description]
Files: [3-5 specific files to create/modify]
Output: JSON {filesModified, summary, errors, metrics}

Context:
[Relevant background from domain/architecture]

Requirements:
[Numbered list of specific requirements]

Success Criteria:
[Measurable conditions for task completion]

Verification:
- bun run typecheck: 0 errors required
- bun test [specific tests]: Must pass
- Evidence: [Specific metrics to report]
```

### Template: Integration Task

```
Task: [200 chars max - integration description]
Files: [Source and target files]
Output: JSON {filesModified, integrationPoints: string[], testsPass: boolean}

Integration Points:
[List of interfaces/methods to connect]

Protocol:
[Communication protocol details]

Error Handling:
[How to handle failures gracefully]

Success Criteria:
[End-to-end verification steps]
```

### Template: Testing Task

```
Task: [200 chars max - test description]
Files: [Test file locations]
Output: JSON {testsWritten: number, coverage: number, allPass: boolean}

Test Categories:
[Unit, integration, e2e breakdown]

Coverage Requirements:
[Lines/branches to cover]

Edge Cases:
[Specific edge cases to test]

Success Criteria:
- All tests pass
- Coverage ≥ [target]%
- Edge cases handled
```

---

## Execution Order

### Critical Path

```
Phase 1 (Multi-Language) → Phase 2 (Veracity Integration) → Phase 3 (Hierarchical Memory)
                                                                        ↓
Phase 4 (VAC) → Phase 5 (Meta-Agent) → Phase 6 (Universal Domains)
                                                        ↓
                                        Phase 7 (npx Installer) → Phase 8 (Production)
```

### Parallelizable Tasks

| Parallel Group | Tasks | Rationale |
|----------------|-------|-----------|
| Lang Visitors | 1.2.2-1.2.9 | Independent language parsers |
| Domain Definitions | 6.1.3-6.1.10 | Independent domain specs |
| Domain Schemas | 6.3.1-6.3.7 | Independent schema files |
| Integration Tests | 8.1.1-8.1.6 | Independent test suites |

### Dependencies

```
1.1 (TypeScript) → 1.3 (HTTP Gateway) → 2.1 (MCP Client)
1.2 (Multi-lang) ↗                        ↓
                                    2.2 (Quality Gate)
                                          ↓
                                    3.1 (Hierarchical Memory)
                                          ↓
                                    4.1 (Contract System) → 4.2 (State Machine)
                                          ↓
                                    5.1 (Meta-Agent Loop)
                                          ↓
                                    6.1 (Domain Registry) → 6.2 (Domain Orchestrator)
                                          ↓
                                    7.1 (npx Package) → 7.2 (CLI Commands)
                                          ↓
                                    8.1 (Integration Tests)
```

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| VPS connectivity issues | Medium | High | CircuitBreaker + local fallback |
| Multi-language parsing gaps | Medium | Medium | Prioritize TypeScript/Python, others iterative |
| Context overflow on long tasks | Low | High | HierarchicalMemory + aggressive compression |
| VAC false positives | Medium | Medium | Tunable thresholds + manual override |
| npx installation failures | Medium | High | Comprehensive error messages + fallback manual steps |

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Created** | 2026-01-12 |
| **Author** | Claude (Orchestrator) |
| **Status** | READY FOR EXECUTION |
| **Total Tasks** | 147 |
| **Estimated Effort** | ~300 hours |
| **Dependencies** | engg-support-system (VPS live), Claude Agent SDK |

---

---

## Mathematical Validation Framework

This section defines the mathematical foundations for deterministic outcomes. Every task must produce outputs that satisfy these formal specifications.

### 1. Mathematical Certainty Loop (Core Algorithm)

From RESEARCH-SUMMARY.md - this is the FUNDAMENTAL execution pattern:

```
ALGORITHM: Deterministic Execution with Mathematical Certainty
INPUT: Task T, Threshold θ = 0.85
OUTPUT: Result R with certainty C ≥ θ

1. certainty ← 0
2. WHILE certainty < θ:
    a. contract ← propose_contract(T)
    b. ASSERT valid(contract.preconditions)
    c. R ← implement(T, contract)
    d. V ← verify(R, contract.postconditions)
    e. IF ¬V.passed:
        i.  trace ← analyze_trace(R, V.failures)
        ii. T ← refine_approach(T, trace)
    f. ELSE:
        i.  certainty ← calculate_certainty(metrics)
3. RETURN R

INVARIANT: ∀ execution E, certainty(E) ≥ θ before commit
POSTCONDITION: R satisfies contract.postconditions
```

### 2. Certainty Calculation Formula

```typescript
/**
 * MATHEMATICAL DEFINITION:
 *
 * Certainty C = Σᵢ(wᵢ × mᵢ) where:
 *   - wᵢ = weight for metric i (Σwᵢ = 1.0)
 *   - mᵢ = normalized metric value [0, 1]
 *
 * Target: C ≥ 0.85 (85% certainty threshold)
 */
function calculateCertainty(metrics: CertaintyMetrics): number {
  const {
    contractCoverage,    // C_c: contracted_tasks / total_tasks
    driftRate,           // D: unique_outputs / total_runs (INVERTED: 1 - D)
    testPassRate,        // T: tests_passed / tests_total
    veracityScore,       // V: formula-computed confidence [0, 100]
    evidenceCoverage     // E: evidenced_claims / total_claims
  } = metrics;

  // Weights derived from CCA research priorities
  const W = {
    contractCoverage: 0.25,  // VAC is core innovation
    driftRate: 0.20,         // Determinism is critical
    testPassRate: 0.20,      // Tests validate correctness
    veracityScore: 0.20,     // Evidence quality matters
    evidenceCoverage: 0.15   // Claims need backing
  };

  // C = w₁×C_c + w₂×(1-D) + w₃×T + w₄×(V/100) + w₅×E
  return (
    W.contractCoverage * contractCoverage +
    W.driftRate * (1 - driftRate) +
    W.testPassRate * testPassRate +
    W.veracityScore * (veracityScore / 100) +
    W.evidenceCoverage * evidenceCoverage
  );
}

// THRESHOLD: certainty >= 0.85 required before any commit
```

### 3. Veracity Scoring Formula (from engg-support-system)

```typescript
/**
 * MATHEMATICAL DEFINITION:
 *
 * Veracity V = max(0, 100 - Σᵢ(pᵢ)) where:
 *   - pᵢ = penalty for fault type i
 *
 * FAULT_PENALTIES = {
 *   STALE_DOC: 15,        // Document >90 days old
 *   ORPHANED_NODE: 5,     // Node with <2 connections
 *   CONTRADICTION: 20,    // Code newer than doc by >30 days
 *   LOW_COVERAGE: 10      // <5 results found
 * }
 *
 * V ∈ [0, 100], higher is better
 * Target: V ≥ 85
 */
enum FaultType {
  STALE_DOC = 'STALE_DOC',           // -15 penalty
  ORPHANED_NODE = 'ORPHANED_NODE',   // -5 penalty
  CONTRADICTION = 'CONTRADICTION',   // -20 penalty
  LOW_COVERAGE = 'LOW_COVERAGE'      // -10 penalty
}

const FAULT_PENALTIES: Record<FaultType, number> = {
  [FaultType.STALE_DOC]: 15,
  [FaultType.ORPHANED_NODE]: 5,
  [FaultType.CONTRADICTION]: 20,
  [FaultType.LOW_COVERAGE]: 10
};

function computeVeracityScore(faults: VeracityFault[]): number {
  let score = 100.0;
  for (const fault of faults) {
    const penalty = FAULT_PENALTIES[fault.type] ?? 0;
    score -= penalty;
  }
  return Math.max(0.0, score);
}
```

### 4. Statistical Tests for Drift Detection

```typescript
/**
 * DRIFT DETECTION PROTOCOL
 *
 * Uses Kolmogorov-Smirnov test for continuous distributions
 * and Chi-square test for categorical data.
 *
 * H₀: No significant drift between baseline and current
 * H₁: Significant drift detected
 *
 * Rejection criterion: p-value < 0.05 (95% confidence)
 */

interface DriftTestResult {
  hasDrift: boolean;           // True if p < 0.05
  ksStatistic: number;         // D = sup|F_n(x) - F_m(x)|
  pValue: number;              // P(D > observed | H₀)
  confidence: number;          // 1 - pValue
}

/**
 * Kolmogorov-Smirnov Test for Distribution Comparison
 *
 * D_n,m = sup_x |F_n(x) - F_m(x)|
 *
 * where F_n, F_m are empirical CDFs of samples
 */
function kolmogorovSmirnovTest(
  baseline: number[],
  current: number[]
): DriftTestResult {
  // Sort both samples
  const n = baseline.length;
  const m = current.length;

  // Compute D statistic
  const combined = [...baseline.map(x => ({v: x, s: 0})),
                    ...current.map(x => ({v: x, s: 1}))];
  combined.sort((a, b) => a.v - b.v);

  let D = 0;
  let baseCount = 0, currCount = 0;
  for (const point of combined) {
    if (point.s === 0) baseCount++;
    else currCount++;
    const diff = Math.abs(baseCount/n - currCount/m);
    D = Math.max(D, diff);
  }

  // Compute p-value using asymptotic distribution
  const lambda = D * Math.sqrt(n * m / (n + m));
  const pValue = 2 * Math.exp(-2 * lambda * lambda);

  return {
    hasDrift: pValue < 0.05,
    ksStatistic: D,
    pValue,
    confidence: 1 - pValue
  };
}

/**
 * REPRODUCIBILITY TEST
 *
 * Run same task N times with temperature=0
 * Drift Rate = (|unique ASTs| - 1) / N
 * Target: Drift Rate = 0 (perfect determinism)
 */
async function measureDriftRate(
  task: Task,
  runs: number = 10
): Promise<number> {
  const results: string[] = [];

  for (let i = 0; i < runs; i++) {
    const result = await execute(task, { temperature: 0 });
    const normalizedAST = normalizeAST(result.code);
    results.push(normalizedAST);
  }

  const uniqueASTs = new Set(results);
  return (uniqueASTs.size - 1) / runs; // 0 = perfect, 1 = total chaos
}
```

### 5. Token Growth Constraint (Logarithmic)

```typescript
/**
 * MATHEMATICAL CONSTRAINT:
 *
 * Token usage T(n) must be O(log n) where n = completed tasks
 *
 * Linear growth T(n) = O(n) is FAILURE
 * Logarithmic growth T(n) = O(log n) is SUCCESS
 *
 * Verification:
 * Plot (n, T(n)) and verify slope decreases
 * Regression: T(n) = a * log(n) + b should fit better than T(n) = a*n + b
 */

interface TokenGrowthAnalysis {
  isLogarithmic: boolean;      // True if O(log n)
  linearR2: number;            // R² for linear fit
  logarithmicR2: number;       // R² for log fit
  growthRate: 'logarithmic' | 'linear' | 'polynomial';
}

function analyzeTokenGrowth(
  measurements: Array<{tasks: number, tokens: number}>
): TokenGrowthAnalysis {
  const n = measurements.map(m => m.tasks);
  const T = measurements.map(m => m.tokens);
  const logN = n.map(x => Math.log(x + 1));

  // Linear regression: T = a*n + b
  const linearR2 = computeR2(n, T);

  // Logarithmic regression: T = a*log(n) + b
  const logR2 = computeR2(logN, T);

  return {
    isLogarithmic: logR2 > linearR2,
    linearR2,
    logarithmicR2: logR2,
    growthRate: logR2 > linearR2 ? 'logarithmic' : 'linear'
  };
}
```

### 6. Contract Validity Formulas

```typescript
/**
 * VAC FORMAL SPECIFICATION
 *
 * A contract C is VALID iff:
 * 1. Consistency: preconditions ∧ invariants ⊭ ⊥
 * 2. Completeness: postconditions cover all state changes
 * 3. Satisfiability: ∃ execution path that satisfies postconditions
 *
 * Hoare Triple: {P} S {Q}
 *   - P = preconditions
 *   - S = implementation
 *   - Q = postconditions
 */

interface AgentContract {
  id: string;
  preconditions: Condition[];    // P: must be true before
  postconditions: Condition[];   // Q: must be true after
  invariants: Condition[];       // I: must be true throughout
}

interface Condition {
  name: string;
  predicate: (ctx: ExecutionContext) => boolean | Promise<boolean>;
  formalSpec: string;  // e.g., "∀x ∈ files: exists(x)"
}

/**
 * CONTRACT VALIDITY CHECK
 *
 * Valid(C) = Consistent(C.pre, C.inv) ∧
 *            Complete(C.post, StateChanges) ∧
 *            Satisfiable(C.pre, C.post)
 */
function validateContract(contract: AgentContract): ContractValidation {
  const consistency = checkConsistency(
    contract.preconditions,
    contract.invariants
  );
  const completeness = checkCompleteness(contract.postconditions);
  const satisfiability = checkSatisfiability(
    contract.preconditions,
    contract.postconditions
  );

  return {
    isValid: consistency && completeness && satisfiability,
    consistency,
    completeness,
    satisfiability,
    formalProof: generateProofSketch(contract)
  };
}
```

### 7. Compression Ratio Formula

```typescript
/**
 * COMPRESSION EFFICIENCY
 *
 * When LOCAL scope is compressed to TASK summary:
 * Compression Ratio CR = |original| / |compressed|
 * Target: CR ≥ 5:1 (5000 tokens → 1000 tokens)
 *
 * Information Preservation:
 * Must preserve: decisions, file changes, test status
 * May discard: raw logs, debugging steps, repeated info
 */

interface CompressionMetrics {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;         // CR = original / compressed
  informationLoss: number;          // 0 = perfect, 1 = total loss
  preservedKeyFacts: string[];      // Facts that were kept
  discardedCategories: string[];    // Categories that were summarized
}

function measureCompression(
  original: string,
  compressed: string,
  keyFacts: string[]
): CompressionMetrics {
  const originalTokens = estimateTokens(original);
  const compressedTokens = estimateTokens(compressed);

  // Check which key facts survived
  const preserved = keyFacts.filter(f => compressed.includes(f));
  const informationLoss = 1 - (preserved.length / keyFacts.length);

  return {
    originalTokens,
    compressedTokens,
    compressionRatio: originalTokens / compressedTokens,
    informationLoss,
    preservedKeyFacts: preserved,
    discardedCategories: ['raw_logs', 'debug_output', 'repeated_info']
  };
}

// CONSTRAINT: compressionRatio >= 5 AND informationLoss <= 0.1
```

---

## Deterministic Outcomes Per Task

Each task has a deterministic outcome specification that agents must satisfy.

### Phase 1 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 1.1.2 | TypeScriptVisitor extracts ALL classes, functions, imports from .ts files | `extracted_nodes == ast_walk_count` | "Output JSON: {classes: [], functions: [], imports: []}. Verify: count matches tree-sitter AST walk." |
| 1.2.1 | Language registry routes 100% of file extensions correctly | `correct_routes / total_files == 1.0` | "Output JSON: {languagesRegistered: number, routingAccuracy: 1.0}. Fail if any file misrouted." |
| 1.3.2 | POST /query returns EvidencePacket with veracity score | `response.veracity.confidenceScore >= 0` | "Output JSON: {endpoint: '/query', responseSchema: 'EvidencePacketV1', veracityIncluded: true}" |

### Phase 2 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 2.1.1 | VeracityClient calls all 4 MCP tools successfully | `successful_calls / 4 == 1.0` | "Output JSON: {mcpToolsCalled: ['query_codebase', 'get_component_map', 'list_projects', 'get_file_relationships'], allSucceeded: true}" |
| 2.2.1 | QualityGate rejects outputs with veracityScore < 70 | `rejected_low_confidence / low_confidence_total == 1.0` | "Output JSON: {threshold: 70, rejectionRate: number, falsePositives: 0}" |
| 2.2.2 | CircuitBreaker opens after 5 consecutive failures | `state == 'open' when failures >= 5` | "Output JSON: {failureThreshold: 5, currentState: 'closed'|'open'|'half-open'}" |

### Phase 3 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 3.1.2 | HierarchicalMemory maintains O(log n) token growth | `tokenGrowth.isLogarithmic == true` | "Output JSON: {tokenMeasurements: [{tasks, tokens}], growthRate: 'logarithmic'}" |
| 3.1.4 | ScopeCompressor achieves ≥5:1 compression ratio | `compressionRatio >= 5.0` | "Output JSON: {originalTokens, compressedTokens, ratio: number, informationLoss: number <= 0.1}" |

### Phase 4 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 4.1.2 | ContractValidator validates 100% of contracts | `valid_contracts / submitted_contracts == 1.0` | "Output JSON: {contractsValidated: number, consistency: true, completeness: true, satisfiability: true}" |
| 4.1.5 | VACHook blocks ALL commits without verified contract | `blocked_without_contract / attempts_without_contract == 1.0` | "Output JSON: {blockedCommits: number, allowedWithContract: number, bypassAttempts: 0}" |
| 4.3.1 | DriftDetector reports 0% drift for deterministic tasks | `driftRate == 0.0 for deterministic tasks` | "Output JSON: {runs: 10, uniqueASTs: 1, driftRate: 0.0, ksStatistic, pValue}" |

### Phase 5 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 5.1.1 | MetaAgentLoop improves quality by ≥10% within 3 iterations | `(quality_final - quality_initial) / quality_initial >= 0.10` | "Output JSON: {iterations: number <= 3, qualityImprovement: number >= 0.10, converged: true}" |
| 5.2.1 | FailureIndex returns similar failures with cosine similarity ≥0.8 | `top_result.similarity >= 0.8` | "Output JSON: {indexed: number, searchLatency: number <= 100, similarityThreshold: 0.8}" |

### Phase 6 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 6.1.2 | DomainRegistry registers all 8 domains | `registeredDomains.length == 8` | "Output JSON: {domains: ['software', 'hr', 'finance', 'data-analysis', 'marketing', 'legal', 'operations', 'customer-success']}" |
| 6.2.3 | HumanInTheLoopGateway notifies within 1 minute | `notification_latency_ms <= 60000` | "Output JSON: {queued: true, notificationSent: true, latencyMs: number <= 60000}" |

### Phase 7 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 7.1.3 | Installer completes in ≤5 minutes | `installation_time_ms <= 300000` | "Output JSON: {steps: number, completedSteps: number, totalTimeMs: number <= 300000}" |
| 7.2.2 | CLI execute command returns within timeout | `execution_time <= configured_timeout` | "Output JSON: {command: 'execute', exitCode: 0, outputValid: true}" |

### Phase 8 Tasks - Deterministic Outcomes

| Task ID | Deterministic Outcome | Verification Formula | Agent Prompt Suffix |
|---------|----------------------|---------------------|---------------------|
| 8.2.2 | SWE-Bench achieves ≥60% Resolve@1 | `resolved_issues / total_issues >= 0.60` | "Output JSON: {benchmark: 'swe-bench-pro', resolveAt1: number >= 0.60, totalIssues: number}" |
| 8.5.9 | Full regression passes 100% | `passed_tests / total_tests == 1.0` | "Output JSON: {testSuites: 8, totalTests: number, passed: number, failed: 0}" |

---

## Global Mathematical Invariants

These invariants MUST hold throughout execution:

```typescript
/**
 * SYSTEM INVARIANTS (must always be true)
 */
const SYSTEM_INVARIANTS = {
  // INV-1: Max 2-3 concurrent agents
  maxConcurrentAgents: (state: SystemState) =>
    state.runningAgents.length <= 3,

  // INV-2: Certainty threshold before commit
  commitRequiresCertainty: (commit: CommitRequest) =>
    commit.certainty >= 0.85,

  // INV-3: All outputs have evidence packets
  outputsHaveEvidence: (outputs: Output[]) =>
    outputs.every(o => o.evidencePacket !== undefined),

  // INV-4: Token growth is logarithmic
  tokenGrowthLogarithmic: (measurements: TokenMeasurement[]) =>
    analyzeTokenGrowth(measurements).isLogarithmic,

  // INV-5: No undefined states in state machine
  noUndefinedStates: (stateMachine: StateMachine) =>
    stateMachine.transitions.every(t =>
      stateMachine.states.includes(t.from) &&
      stateMachine.states.includes(t.to)),

  // INV-6: Contracts cover all code changes
  contractCoverage: (changes: CodeChange[], contracts: Contract[]) =>
    changes.every(c => contracts.some(ct => ct.covers(c))),

  // INV-7: Drift rate is zero for deterministic operations
  zeroDrift: (task: Task, runs: DriftRun[]) =>
    task.isDeterministic ? runs.driftRate === 0 : true,

  // INV-8: Compression preserves key information
  compressionPreservesInfo: (original: Scope, compressed: Summary) =>
    compressed.informationLoss <= 0.1
};
```

---

## Overall Success Criteria (Mathematical)

| Metric | Formula | Target | Verification |
|--------|---------|--------|--------------|
| **Certainty Score** | `C = Σ(wᵢ × mᵢ)` | C ≥ 0.85 | Calculate before each commit |
| **Veracity Score** | `V = 100 - Σ(penalties)` | V ≥ 85 | Run veracity scoring on all outputs |
| **Drift Rate** | `D = (unique - 1) / runs` | D = 0 | Run 10x reproducibility test |
| **Contract Coverage** | `CC = contracted / total` | CC = 100% | Static analysis of code changes |
| **Token Growth** | `T(n) = O(log n)` | R²_log > R²_linear | Regression analysis |
| **Compression Ratio** | `CR = original / compressed` | CR ≥ 5:1 | Measure all scope compressions |
| **Resolve@1** | `R = resolved / total` | R ≥ 60% | SWE-Bench evaluation |
| **Hallucination Rate** | `H = ungrounded / claims` | H ≤ 1% | Evidence validation |

---

## Complete Task Inventory

### Phase 1: Multi-Language Indexing Foundation (18 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 1.1.1 | Add tree-sitter-typescript dependency | 0.5h | None |
| 1.1.2 | Create TypeScriptVisitor class | 8h | 1.1.1 |
| 1.1.3 | Extend build_graph.py for .ts/.tsx | 2h | 1.1.2 |
| 1.1.4 | Unit tests for TypeScript parser | 2h | 1.1.3 |
| 1.2.1 | Create multi_lang_visitor.py base | 4h | None |
| 1.2.2 | Go visitor (tree-sitter-go) | 4h | 1.2.1 |
| 1.2.3 | Rust visitor | 4h | 1.2.1 |
| 1.2.4 | Java visitor | 4h | 1.2.1 |
| 1.2.5 | C# visitor | 4h | 1.2.1 |
| 1.2.6 | Ruby visitor | 3h | 1.2.1 |
| 1.2.7 | PHP visitor | 3h | 1.2.1 |
| 1.2.8 | Swift visitor | 3h | 1.2.1 |
| 1.2.9 | Kotlin visitor | 3h | 1.2.1 |
| 1.2.10 | Language detection routing | 2h | 1.2.2-1.2.9 |
| 1.3.1 | Express server with CORS | 3h | None |
| 1.3.2 | POST /query endpoint | 2h | 1.3.1 |
| 1.3.3 | Health check endpoints | 1h | 1.3.1 |
| 1.3.4 | Project management endpoints | 2h | 1.3.1 |
| 1.3.5 | API key authentication | 1h | 1.3.1 |
| 1.3.6 | Dockerfile for gateway | 1h | 1.3.1-1.3.5 |

### Phase 2: Veracity Integration Layer (13 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 2.1.1 | VeracityClient.ts MCP client | 4h | Phase 1 |
| 2.1.2 | EvidencePacketParser.ts | 2h | None |
| 2.1.3 | VeracityConfig.ts | 1h | None |
| 2.1.4 | TypeScript interfaces for packets | 2h | None |
| 2.1.5 | Module exports index.ts | 0.5h | 2.1.1-2.1.4 |
| 2.2.1 | QualityGate.ts | 2h | 2.1.1 |
| 2.2.2 | CircuitBreaker.ts | 4h | 2.1.1 |
| 2.2.3 | FallbackStrategy.ts | 4h | 2.2.2 |
| 2.2.4 | HealthChecker.ts | 2h | 2.1.1 |
| 2.3.1 | sync-to-vps.sh script | 2h | None |
| 2.3.2 | CodebaseSyncManager.ts | 4h | 2.3.1 |
| 2.3.3 | Git post-commit hook | 1h | 2.3.1 |
| 2.3.4 | VPS reindex trigger | 1h | Phase 1 |

### Phase 3: Hierarchical Memory System (9 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 3.1.1 | Scope.ts class | 3h | None |
| 3.1.2 | HierarchicalMemory.ts | 8h | 3.1.1 |
| 3.1.3 | TokenBudgetManager.ts | 4h | 3.1.1 |
| 3.1.4 | ScopeCompressor.ts | 4h | 3.1.2 |
| 3.1.5 | memory/index.ts exports | 0.5h | 3.1.1-3.1.4 |
| 3.2.1 | Integrate into WaveOrchestrator | 4h | 3.1.2 |
| 3.2.2 | Modify PromptValidator for scopes | 2h | 3.1.3 |
| 3.2.3 | Update DecisionLearningIntegration | 2h | 3.1.4 |
| 3.2.4 | Integration tests | 3h | 3.2.1-3.2.3 |

### Phase 4: Verifiable Agentic Contract (17 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 4.1.1 | AgentContract.ts interface | 3h | None |
| 4.1.2 | ContractValidator.ts | 4h | 4.1.1 |
| 4.1.3 | ContractRegistry.ts | 3h | 4.1.1 |
| 4.1.4 | PropertyTestRunner.ts | 6h | 4.1.1 |
| 4.1.5 | VACHook.ts pre-commit hook | 3h | 4.1.2 |
| 4.1.6 | verification/index.ts | 0.5h | 4.1.1-4.1.5 |
| 4.2.1 | StateMachineExecutor.ts | 8h | None |
| 4.2.2 | Transition.ts | 4h | 4.2.1 |
| 4.2.3 | UndefinedStateError.ts | 1h | 4.2.1 |
| 4.2.4 | State machine tests | 4h | 4.2.1-4.2.3 |
| 4.3.1 | DriftDetector.ts | 6h | None |
| 4.3.2 | ASTComparator.ts | 4h | 4.3.1 |
| 4.3.3 | ReproducibilityTest.ts | 3h | 4.3.1 |
| 4.3.4 | Statistical tests integration | 4h | 4.3.1 |
| 4.4.1 | ClassifierAgent.ts (NEW) | 4h | Phase 2 |
| 4.4.2 | ClarifierAgent.ts extension | 3h | 4.4.1 |
| 4.4.3 | Agent tests | 3h | 4.4.1-4.4.2 |

### Phase 5: Meta-Agent Optimization Loop (12 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 5.1.1 | MetaAgentLoop.ts | 8h | Phase 4 |
| 5.1.2 | TraceAnalyzer.ts | 4h | 5.1.1 |
| 5.1.3 | ConfigMutator.ts | 4h | 5.1.1 |
| 5.1.4 | BenchmarkRunner.ts | 4h | 5.1.1 |
| 5.1.5 | Meta-agent tests | 4h | 5.1.1-5.1.4 |
| 5.2.1 | FailureIndex.ts | 4h | None |
| 5.2.2 | FailureEmbedding.ts | 2h | 5.2.1 |
| 5.2.3 | ResolutionMatcher.ts | 3h | 5.2.1 |
| 5.2.4 | SQLite + vector setup | 2h | 5.2.1 |
| 5.3.1 | Integrate with DecisionLearningStore | 2h | 5.2.1 |
| 5.3.2 | Integrate with ErrorRecoveryEngine | 2h | 5.2.1 |
| 5.3.3 | Integration tests | 3h | 5.3.1-5.3.2 |

### Phase 6: Universal Business Domain Extensions (32 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 6.1.1 | DomainDefinition.ts interface | 2h | None |
| 6.1.2 | DomainRegistry.ts | 4h | 6.1.1 |
| 6.1.3 | domains/software.ts | 4h | 6.1.2 |
| 6.1.4 | domains/hr.ts | 4h | 6.1.2 |
| 6.1.5 | domains/finance.ts | 4h | 6.1.2 |
| 6.1.6 | domains/data-analysis.ts | 4h | 6.1.2 |
| 6.1.7 | domains/marketing.ts | 3h | 6.1.2 |
| 6.1.8 | domains/legal.ts | 3h | 6.1.2 |
| 6.1.9 | domains/operations.ts | 3h | 6.1.2 |
| 6.1.10 | domains/customer-success.ts | 3h | 6.1.2 |
| 6.2.1 | DomainOrchestrator.ts | 6h | 6.1.2 |
| 6.2.2 | DomainDetector.ts | 3h | 6.1.2 |
| 6.2.3 | HumanInTheLoopGateway.ts | 6h | None |
| 6.2.4 | ExternalResourceAdapter.ts | 4h | None |
| 6.2.5 | Domain orchestration tests | 4h | 6.2.1-6.2.4 |
| 6.3.1 | hr.schema.yaml | 2h | None |
| 6.3.2 | finance.schema.yaml | 2h | None |
| 6.3.3 | data-analysis.schema.yaml | 2h | None |
| 6.3.4 | marketing.schema.yaml | 2h | None |
| 6.3.5 | legal.schema.yaml | 2h | None |
| 6.3.6 | operations.schema.yaml | 2h | None |
| 6.3.7 | customer-success.schema.yaml | 2h | None |
| 6.3.8 | SchemaLoader.ts | 3h | 6.3.1-6.3.7 |
| 6.4.1 | OutcomeFramework.ts | 3h | 6.1.1 |
| 6.4.2 | DomainMetrics.ts | 2h | 6.4.1 |
| 6.4.3 | Extend OutcomeInjector | 2h | 6.4.1 |
| 6.4.4 | Outcome tests | 2h | 6.4.1-6.4.3 |
| 6.5.1 | ActionCatalog.ts base | 3h | 6.1.1 |
| 6.5.2 | Domain-specific actions | 4h | 6.5.1 |
| 6.5.3 | Action validation | 2h | 6.5.1 |
| 6.5.4 | Action tests | 2h | 6.5.1-6.5.3 |
| 6.5.5 | Domain integration tests | 4h | 6.1-6.5 |

### Phase 7: npx Installer & Distribution (18 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 7.1.1 | package.json configuration | 1h | None |
| 7.1.2 | bin/create-rad-engineer.js | 2h | 7.1.1 |
| 7.1.3 | src/installer.ts | 6h | 7.1.2 |
| 7.1.4 | src/prompts.ts | 3h | 7.1.3 |
| 7.1.5 | src/templates/ project templates | 4h | 7.1.3 |
| 7.1.6 | src/docker-compose.yml | 2h | 7.1.3 |
| 7.1.7 | src/vps-connector.ts | 3h | 7.1.3 |
| 7.1.8 | Installer tests | 3h | 7.1.3-7.1.7 |
| 7.2.1 | cli/init.ts | 3h | 7.1.3 |
| 7.2.2 | cli/execute.ts | 4h | 7.1.3 |
| 7.2.3 | cli/plan.ts | 3h | 7.1.3 |
| 7.2.4 | cli/sync.ts | 2h | 7.1.3 |
| 7.2.5 | cli/status.ts | 2h | 7.1.3 |
| 7.2.6 | cli/verify.ts | 2h | 7.1.3 |
| 7.3.1 | docs/getting-started.md | 3h | 7.1-7.2 |
| 7.3.2 | docs/domain-guide.md | 4h | 7.1-7.2 |
| 7.3.3 | docs/architecture.md | 3h | All |
| 7.3.4 | docs/api-reference.md | 4h | 7.1-7.2 |
| 7.3.5 | docs/troubleshooting.md | 2h | All |

### Phase 8: Integration Testing & Production (28 tasks)
| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| 8.1.1 | vps-integration.test.ts | 4h | Phase 2 |
| 8.1.2 | hierarchical-memory.test.ts | 4h | Phase 3 |
| 8.1.3 | vac-workflow.test.ts | 4h | Phase 4 |
| 8.1.4 | domain-execution.test.ts | 8h | Phase 6 |
| 8.1.5 | meta-agent-loop.test.ts | 4h | Phase 5 |
| 8.1.6 | installer.test.ts | 3h | Phase 7 |
| 8.2.1 | benchmark-suite.ts | 4h | All |
| 8.2.2 | swe-bench-runner.ts | 6h | Phase 4-5 |
| 8.2.3 | long-horizon.test.ts | 4h | Phase 3 |
| 8.2.4 | concurrent-agents.test.ts | 3h | Phase 2-3 |
| 8.3.1 | rate-limiter.ts | 2h | None |
| 8.3.2 | audit-logger.ts | 3h | None |
| 8.3.3 | secrets-manager.ts | 3h | None |
| 8.3.4 | backup-restore.ts | 4h | Phase 3 |
| 8.3.5 | monitoring.ts | 3h | None |
| 8.4.1 | Security audit | 4h | All |
| 8.4.2 | Performance optimization | 4h | 8.2 |
| 8.4.3 | Error message review | 2h | All |
| 8.4.4 | Documentation review | 3h | 7.3 |
| 8.5.1 | E2E: Software domain | 4h | All |
| 8.5.2 | E2E: HR domain | 3h | All |
| 8.5.3 | E2E: Finance domain | 3h | All |
| 8.5.4 | E2E: Data Analysis domain | 3h | All |
| 8.5.5 | E2E: Marketing domain | 2h | All |
| 8.5.6 | E2E: Legal domain | 2h | All |
| 8.5.7 | E2E: Operations domain | 2h | All |
| 8.5.8 | E2E: Customer Success domain | 2h | All |
| 8.5.9 | Full regression suite | 6h | 8.5.1-8.5.8 |

---

## Task Count Summary

| Phase | Tasks | Effort (hrs) | New Files | Modified Files |
|-------|-------|--------------|-----------|----------------|
| Phase 1: Multi-Language | 18 | 56 | 14 | 1 |
| Phase 2: Veracity Integration | 13 | 30 | 10 | 0 |
| Phase 3: Hierarchical Memory | 9 | 31 | 5 | 3 |
| Phase 4: VAC | 17 | 60 | 12 | 2 |
| Phase 5: Meta-Agent | 12 | 38 | 8 | 2 |
| Phase 6: Business Domains | 32 | 85 | 22 | 1 |
| Phase 7: npx Installer | 18 | 52 | 15 | 0 |
| Phase 8: Production | 28 | 90 | ~5 | ~10 |
| **TOTAL** | **147** | **~442** | **~91** | **~19** |

---

## Business Outcomes by Domain

### Software Engineering Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Code quality | TypeScript errors | 0 |
| Test coverage | Line coverage | ≥80% |
| Bug resolution | Resolve@1 | ≥60% |
| Determinism | Drift rate | 0% |

### HR/People Operations Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Time-to-hire | Days from post to start | -30% |
| Compliance | EEOC/GDPR violations | 0 |
| Onboarding completion | Checklist items | 100% |
| Documentation | Auto-generated docs | 100% |

### Finance/Accounting Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Approval latency | Time for ≤$10k approvals | Auto |
| Compliance | SOX controls | 100% |
| Reconciliation | Auto-match rate | ≥90% |
| Audit trail | Transaction coverage | 100% |

### Data Analysis Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Query accuracy | Correct SQL generation | ≥95% |
| Insight quality | Stakeholder approval | ≥80% |
| Automation | Repeatable reports | 100% |
| Data lineage | Tracked transformations | 100% |

### Marketing Operations Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Campaign setup | Time reduction | -50% |
| Content compliance | Brand guideline adherence | 100% |
| Analytics | Attribution accuracy | ≥85% |
| Automation | Triggered workflows | ≥80% |

### Legal/Compliance Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Contract review | Time per contract | -40% |
| Risk flagging | Issues identified | ≥95% |
| Compliance tracking | Regulations monitored | 100% |
| Document generation | Template accuracy | 100% |

### Operations/Supply Chain Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Order processing | Automation rate | ≥90% |
| Inventory accuracy | Stock discrepancy | ≤2% |
| Vendor management | SLA compliance | ≥95% |
| Logistics | Route optimization | -15% cost |

### Customer Success Domain
| Outcome | Metric | Target |
|---------|--------|--------|
| Response time | First response | ≤1hr |
| Resolution rate | First contact | ≥70% |
| Health scoring | Accuracy | ≥85% |
| Churn prediction | Early warning | ≥80% |

---

## Execution Constraints

From CLAUDE.md and research:

| Constraint | Value | Source |
|------------|-------|--------|
| Max parallel agents | 2-3 | CLAUDE.md (kernel crash at 5) |
| Agent prompt size | Adaptive (scope-based) | GAP-ANALYSIS.md correction |
| Test runner | `bun test` only | CLAUDE.md (17x faster than Vitest) |
| Verification loop | Mandatory after each agent | CLAUDE.md |
| Evidence requirement | All claims need proof | CLAUDE.md |
| Context compaction | At 70% usage | agent-context-v2.md |
| Wave completion | Wait before next wave | CLAUDE.md |

---

**Document Version**: 1.0.0
**Created**: 2026-01-12
**Traced To**: RESEARCH-SUMMARY.md, GAP-ANALYSIS.md, ENGG-SUPPORT-INTEGRATION.md
**Status**: READY FOR EXECUTION

**Next Step**: Begin Phase 1 with Task 1.1 (TypeScript AST Parser)
