# Rad Engineer v2 - Component Architecture Diagram

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /execute     │  │ /plan        │  │ CLI Commands │  │ API Usage    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION LAYER                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                        SMART ORCHESTRATOR (Phase 1)                           │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────────────┐ │ │
│  │  │ /plan Skill │  │ Wave Based   │  │  Resource Management (2-3 agent   │ │ │
│  │  │             │  │ Execution    │  │  concurrency limit)              │ │ │
│  │  └──────┬──────┘  │ Coordinator  │  └────────────────────────────────────┘ │ │
│  │         │          └──────┬───────┘                                         │ │
│  │         │                 │                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Core Orchestrator Components                                      │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │ │ │
│  │  │  │ResourceManager│  │PromptValidator│  │ResponseParser│               │ │ │
│  │  │  │  Limits:     │  │  Validate:   │  │  Parse:      │               │ │ │
│  │  │  │  - CPU       │  │  - Size      │  │  - JSON      │               │ │ │
│  │  │  │  - Memory    │  │  - Injection │  │  - 6 fields   │               │ │ │
│  │  │  │  - Agents    │  │  - PII       │  │              │               │ │ │
│  │  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │ │ │
│  │  └─────────┼──────────────────┼──────────────────┼──────────────────────┘ │ │
│  └────────────┼──────────────────┼──────────────────┼───────────────────────┘ │
└───────────────┼──────────────────┼──────────────────┼──────────────────────────┘
                │                  │                  │
                ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                      ADAPTIVE INTELLIGENCE LAYER (EVALS) ✨ NEW                       │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                        QUERY FEATURE EXTRACTION                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Input: "Write a function to sort an array"                              │ │ │
│  │  │                                                                         │ │ │
│  │  │  Extract:                                                              │ │ │
│  │  │  • domain: "code"                                                       │ │ │
│  │  │  • complexityScore: 0.65                                                │ │ │
│  │  │  • tokenCount: 9                                                        │ │ │
│  │  │  • constraints: { maxCost, minQuality, maxLatency }                     │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────┬──────────────────────────────────────┘ │
│                                           ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                    BANDIT ROUTER (Thompson Sampling)                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  1. Get candidates from PerformanceStore for (domain, complexity)       │ │ │
│  │  │                                                                         │ │ │
│  │  │  2. Generate deterministic seed: hash(query + stateVersion)            │ │ │
│  │  │                                                                         │ │ │
│  │  │  3. Thompson Sampling: Sample from Beta(α, β) for each candidate       │ │ │
│  │  │     ┌─────────────────────────────────────────────────────────────────┐ │ │ │
│  │  │     │ Candidate          │ Success │ Failure │ Sample (Beta)       │ │ │ │ │
│  │  │     │ anthropic/sonnet   │    45   │    5    │ 0.87 ← selected     │ │ │ │ │
│  │  │     │ glm-4.7            │    10   │    2    │ 0.72                │ │ │ │ │
│  │  │     │ ollama/llama3.2    │    8    │    4    │ 0.61                │ │ │ │ │
│  │  │     └─────────────────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                                         │ │ │
│  │  │  4. Apply constraints (cost, quality, latency)                         │ │ │
│  │  │                                                                         │ │ │
│  │  │  5. Explore (10%) or Exploit (90%)                                     │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────┬──────────────────────────────────────┘ │
│                                           ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                         PROVIDER SELECTION                                    │ │
│  │  Routing Decision: {                                                         │ │
│  │    provider: "anthropic",                                                    │ │
│  │    model: "claude-3-5-sonnet-20241022",                                      │ │
│  │    confidence: 0.87,                                                         │ │
│  │    reason: "Exploit: Best expected value for code@0.65"                     │ │
│  │  }                                                                            │ │
│  └────────────────────────────────────────┬──────────────────────────────────────┘ │
└───────────────────────────────────────────┼───────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         MULTI-PROVIDER LAYER (40+ LLMs/SLMs)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Anthropic     │  │      GLM        │  │     Ollama      │  │   OpenAI     │  │
│  │                 │  │                 │  │                 │  │              │  │
│  │  Claude 3.5     │  │    GLM 4.7      │  │  Llama 3.2      │  │    GPT-4     │  │
│  │  Claude 3 Opus  │  │    GLM 4.5      │  │    Mistral      │  │   GPT-3.5    │  │
│  │  Claude 3 Haiku │  │    GLM 4.0      │  │     Qwen        │  │              │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘  │
│           │                     │                     │                    │           │
│           └─────────────────────┴─────────────────────┴────────────────────┘           │
│                                        │                                                │
│                           ProviderFactory.getProvider(name)                           │
│                                        │                                                │
│                           provider.createChat(prompt, system)                        │
│                                        │                                                │
│                                        ▼                                                │
│                           ┌──────────────────────────────┐                            │
│                           │   LLM Response (with metadata)│                           │
│                           └──────────────┬───────────────┘                            │
└───────────────────────────────────────────┼───────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         EVALUATION & FEEDBACK LOOP                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                    QUALITY METRICS (DeepEval-inspired)                         │ │
│  │  ┌──────────────────┐  ┌───────────────┐  ┌────────────────┐  ┌─────────────┐│ │
│  │  │ AnswerRelevancy │  │ Faithfulness  │  │ContextPrecision│  │ContextRecall││ │
│  │  │                  │  │               │  │                │  │             ││ │
│  │  │ 0.87             │  │ 0.92          │  │ 0.85           │  │ 0.88        ││ │
│  │  └──────────────────┘  └───────────────┘  └────────────────┘  └─────────────┘│ │
│  │                                                                         │ │ │
│  │  Overall: (0.87×0.3 + 0.92×0.3 + 0.85×0.2 + 0.88×0.2) = 0.88           │ │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                            │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                       PERFORMANCE STORE UPDATE                                 │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Store Entry: anthropic/claude-3-5-sonnet-20241022/code@0.65           │ │ │
│  │  │                                                                         │ │ │
│  │  │  Before: success=45, failure=5, avgQuality=0.82                         │ │ │
│  │  │  After:  success=46, failure=5, avgQuality=0.83                         │ │ │
│  │  │                                                                         │ │ │
│  │  │  Confidence Interval: [0.81, 0.95] (95%)                               │ │ │
│  │  │  Beta Distribution: Beta(47, 6) → α/success+1, β/failure+1              │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                         │ │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  New Version Created (immutable append-only log)                      │ │ │
│  │  │  version: v2026-01-07T12:00:00Z                                         │ │ │
│  │  │  timestamp: 1736265600000                                              │ │ │
│  │  │  checksum: "a1b2c3d4"                                                 │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          INITIALIZATION FLOW                                    │
│                                                                                  │
│  1. Auto-Detect Providers                                                       │
│     ProviderAutoDetector.detectAll()                                            │
│     │                                                                          │
│     ├─→ Anthropic (✓)                                                          │
│     ├─→ GLM (✓)                                                                │
│     └─→ Ollama (✓)                                                             │
│                                                                                  │
│  2. Initialize ProviderFactory                                                   │
│     ProviderFactory.initialize(detectedProviders)                                │
│     │                                                                          │
│     └─→ Factory with 3+ providers                                               │
│                                                                                  │
│  3. Initialize EVALS System                                                     │
│     EvalsFactory.initialize(providerFactory, config)                            │
│     │                                                                          │
│     ├─→ BanditRouter(store, explorationRate=0.1)                               │
│     ├─→ PerformanceStore()                                                     │
│     ├─→ QueryFeatureExtractor()                                                 │
│     ├─→ EvaluationLoop(store)                                                  │
│     └─→ StateManager(store, { path, autoSave })                                │
│                                                                                  │
│  4. Seed Performance Store (optional)                                           │
│     store.updateStats(provider, model, domain, complexity, success, cost...)     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            QUERY FLOW                                           │
│                                                                                  │
│  User Query                                                                     │
│     │                                                                          │
│     ▼                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ QueryFeatureExtractor.extract(query)                                   │      │
│  │                                                                       │      │
│  │ Output: { domain, complexityScore, tokenCount, maxCost, ... }      │      │
│  └──────────────────────────────┬──────────────────────────────────────┘      │
│                                 │                                             │
│                                 ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ BanditRouter.route(features)                                         │      │
│  │                                                                       │      │
│  │ 1. Get candidates: store.getCandidates(domain, complexity)          │      │
│  │ 2. Thompson Sampling: Sample from Beta(α, β) for each               │      │
│  │ 3. Select best candidate or explore (10%)                           │      │
│  │ 4. Apply constraints: cost, quality, latency                         │      │
│  └──────────────────────────────┬──────────────────────────────────────┘      │
│                                 │                                             │
│                                 ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ ProviderFactory.getProvider(providerName)                            │      │
│  │ → provider.createChat(prompt, system)                                │      │
│  │                                                                       │      │
│  │ Response: { content, metadata: { provider, model, tokens, ... } }  │      │
│  └──────────────────────────────┬──────────────────────────────────────┘      │
│                                 │                                             │
│                                 ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ EvaluationLoop.evaluateAndUpdate(query, response, provider, model) │      │
│  │                                                                       │      │
│  │ 1. Calculate metrics: relevancy, faithfulness, precision, recall  │      │
│  │ 2. Calculate overall: weighted average                              │      │
│  │ 3. Update store: Beta(α, β), EMA metrics, confidence interval      │      │
│  │ 4. Create new version (immutable)                                   │      │
│  └──────────────────────────────┬──────────────────────────────────────┘      │
│                                 │                                             │
│                                 ▼                                             │
│  Return response to user                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Performance Store Entry

```typescript
interface ProviderStats {
  provider: string;              // "anthropic"
  model: string;                 // "claude-3-5-sonnet-20241022"
  domain: string;                // "code", "creative", "reasoning", "analysis", "general"
  complexityRange: [number, number];  // [min, max] e.g., [0.5, 0.7]

  // Beta distribution parameters (for Thompson Sampling)
  success: number;               // α (alpha)
  failure: number;               // β (beta)

  // Statistics
  mean: number;                  // α / (α + β)
  variance: number;              // (α × β) / ((α + β)² × (α + β + 1))
  confidenceInterval: [number, number];  // 95% CI

  // Exponential Moving Average (EMA) metrics
  avgCost: number;               // EMA with α=0.1
  avgLatency: number;            // EMA with α=0.1
  avgQuality: number;            // EMA with α=0.1

  // Continual Learning (EWC)
  importanceWeights: number[];  // Per-feature importance

  lastUpdated: number;           // Timestamp
}
```

### Routing Decision

```typescript
interface RoutingDecision {
  provider: string;              // Selected provider
  model: string;                 // Selected model
  confidence: number;            // 0-1 (from Beta distribution)
  exploration: boolean;          // True if explored, false if exploited
  reason: string;                // Human-readable explanation
  strategy?: string;             // Routing strategy used
}
```

### Query Features

```typescript
interface QueryFeatures {
  // Structural features (deterministic)
  tokenCount: number;
  lineCount: number;
  maxDepth: number;
  hasCodeBlock: boolean;
  hasMath: boolean;

  // Domain classification (deterministic)
  domain: 'code' | 'creative' | 'reasoning' | 'analysis' | 'general';

  // Complexity score (deterministic)
  complexityScore: number;       // 0-1

  // Requirements (from user hints)
  maxCost?: number;              // Maximum cost per query
  minQuality?: number;           // Minimum quality threshold (0-1)
  maxLatency?: number;           // Maximum latency in ms
}
```

---

## Quality Metrics Flow

```
Query: "What is 2 + 2?"
Response: "4"
Context: []

┌─────────────────────────────────────────────────────────────┐
│ Answer Relevancy                                          │
│   Embedding(query) • Embedding(response) = 0.87           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Faithfulness                                              │
│   Fact-check: "4" is in { } → 0.50 (no context)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Contextual Precision                                      │
│   Retrieved: [] → N/A → 0.00                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Contextual Recall                                         │
│   Retrieved: [] → N/A → 0.00                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Overall Quality                                           │
│   0.87×0.3 + 0.50×0.3 + 0.00×0.2 + 0.00×0.2 = 0.41        │
│   Success: 0.41 < 0.7 → Mark as FAILURE                     │
└─────────────────────────────────────────────────────────────┘
```

---

## State Versioning

```
Version 1: Initial state
  version: v2026-01-07T10:00:00Z
  timestamp: 1736256000000
  stats: [
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022", domain: "code", ... }
  ]
  checksum: "abc123"

Version 2: After 1 query
  version: v2026-01-07T10:05:00Z
  timestamp: 1736256300000
  stats: [
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022", domain: "code",
      success: 1, failure: 0, ... }
  ]
  checksum: "def456"

Version 3: After 10 queries
  version: v2026-01-07T11:00:00Z
  timestamp: 1736259600000
  stats: [
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022", domain: "code",
      success: 8, failure: 2, ... },
    { provider: "glm", model: "glm-4.7", domain: "general",
      success: 5, failure: 1, ... }
  ]
  checksum: "ghi789"

Each version is immutable. Can load any historical version:
  store.loadVersion("v2026-01-07T10:05:00Z")  → Reproduces exact routing decisions from that time
```

---

**Generated**: 2026-01-07
**System**: Rad Engineer v2
**Version**: 1.1.0
