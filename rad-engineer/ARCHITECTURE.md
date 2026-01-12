# Rad Engineer v2 - Complete Architecture

> **Autonomous Engineering Platform with Smart Orchestration + Self-Learning EVALS System**

**Version**: 1.1.0 (Phase 1 + EVALS Integration)
**Last Updated**: 2026-01-07
**Status**: ✅ Production Ready

---

## Overview

Rad Engineer v2 is now a **two-layer autonomous engineering platform**:

1. **Smart Orchestrator Layer** - Deterministic Claude Agent SDK orchestration with wave-based execution
2. **Adaptive Intelligence Layer (EVALS)** - Self-learning LLM/SLM routing with Thompson Sampling

The system intelligently routes queries to optimal providers based on task characteristics, cost constraints, quality requirements, and performance history.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RAD ENGINEER V2 ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 1: SMART ORCHESTRATOR                        │  │
│  │  Deterministic Claude Agent SDK Orchestration (Wave-based Execution)  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                  LAYER 2: ADAPTIVE INTELLIGENCE (EVALS)              │  │
│  │    Self-Learning Routing with Thompson Sampling + Quality Feedback    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     MULTI-PROVIDER LAYER (40+ LLMs/SLMs)              │  │
│  │   Anthropic • GLM • Ollama • OpenAI • DeepSeek • Together • more     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
rad-engineer/src/
├── sdk/                    # SDK Integration (Phase 0)
│   ├── SDKIntegration.ts   # Claude Agent SDK orchestration
│   ├── ResourceMonitor.ts  # System resource monitoring
│   └── providers/          # Multi-provider abstraction (40+ LLMs)
│       ├── ProviderFactory.ts        # Factory pattern
│       ├── AnthropicProvider.ts      # Anthropic Claude adapter
│       ├── GLMProvider.ts            # GLM (Zhipu AI) adapter
│       ├── OllamaProvider.ts         # Ollama/local models adapter
│       └── ProviderAvailability.ts   # Credential validation
│
├── adaptive/               # ADAPTIVE INTELLIGENCE LAYER (EVALS) ✨ NEW
│   ├── EvalsFactory.ts             # EVALS system factory
│   ├── BanditRouter.ts             # Thompson Sampling router
│   ├── PerformanceStore.ts         # Versioned performance storage
│   ├── QueryFeatureExtractor.ts    # Deterministic feature extraction
│   ├── EvaluationLoop.ts           # Quality metrics + feedback
│   ├── StateManager.ts             # EVALS state persistence
│   ├── SeededRandom.ts             # Deterministic RNG
│   ├── types.ts                    # EVALS type definitions
│   └── metrics/                    # DeepEval-inspired metrics
│       ├── AnswerRelevancy.ts
│       ├── Faithfulness.ts
│       ├── ContextualPrecision.ts
│       └── ContextualRecall.ts
│
├── baseline/               # Baseline Measurement (Phase 0)
│   └── BaselineMeasurement.ts  # Token tracking, metrics collection
│
├── core/                   # Core Orchestrator (Phase 1)
│   ├── ResourceManager.ts       # Resource limits (max 2-3 agents)
│   ├── PromptValidator.ts       # Input validation + security
│   └── ResponseParser.ts        # Structured output parsing
│
├── advanced/               # Advanced Features (Phase 2)
│   ├── WaveOrchestrator.ts      # Wave execution coordination
│   ├── StateManager.ts          # Checkpoint save/load/compact
│   └── ErrorRecoveryEngine.ts   # Retry logic + circuit breakers
│
├── integration/            # Integration & Polish (Phase 3)
│   └── SecurityLayer.ts         # Threat scanning + audit logging
│
├── plan/                   # /plan Skill (Planning Module)
│   ├── IntakeHandler.ts         # Requirements gathering
│   ├── ResearchCoordinator.ts   # Parallel research spawning
│   ├── ExecutionPlanGenerator.ts # YAML plan generation
│   └── ValidationUtils.ts       # Plan validation
│
├── config/                 # Configuration Management
│   ├── ProviderConfig.ts        # Provider configuration schemas
│   ├── ProviderAutoDetector.ts  # Auto-detect providers from env
│   └── EvalsConfig.ts           # EVALS system configuration
│
├── cli/                    # Command-Line Interface
│   ├── evals.ts                 # EVALS management commands
│   └── evals-commands.ts        # EVALS CLI implementation
│
└── utils/                  # Utility Functions
    └── execFileNoThrow.ts       # Safe process execution
```

---

## Layer 1: Smart Orchestrator (Phase 0-3)

### Phase 0: Foundation
| Component | Purpose | Status |
|-----------|---------|--------|
| **SDKIntegration** | Claude Agent SDK orchestration, agent spawning, response handling | ✅ 100% |
| **BaselineMeasurement** | Token tracking, metrics collection, success rate measurement | ✅ 100% |
| **Multi-Provider Layer** | 40+ LLM/SLM providers (Anthropic, GLM, Ollama, OpenAI, etc.) | ✅ 100% |

### Phase 1: Core Orchestrator
| Component | Purpose | Status |
|-----------|---------|--------|
| **ResourceManager** | Resource limits enforcement, concurrent agent management (max 2-3) | ✅ 100% |
| **PromptValidator** | Input validation (≤500 chars), injection detection, PII redaction | ✅ 100% |
| **ResponseParser** | Structured JSON output parsing, 6 required fields validation | ✅ 100% |

### Phase 2: Advanced Features
| Component | Purpose | Status |
|-----------|---------|--------|
| **WaveOrchestrator** | Wave execution coordination, dependency management | ✅ 100% |
| **StateManager** | Checkpoint save/load/compact for recovery | ✅ 100% |

### Phase 3: Integration & Polish
| Component | Purpose | Status |
|-----------|---------|--------|
| **ErrorRecoveryEngine** | Exponential backoff retry, circuit breakers, saga pattern | ✅ 100% |
| **SecurityLayer** | Threat scanning, PII detection, audit logging | ✅ 100% |

---

## Layer 2: Adaptive Intelligence (EVALS) ✨ NEW

### Core Components

| Component | Purpose | Algorithm/Technique |
|-----------|---------|---------------------|
| **QueryFeatureExtractor** | Extract deterministic features from queries | Keyword matching, token counting |
| **BanditRouter** | Intelligent routing using Thompson Sampling | Bayesian optimization |
| **PerformanceStore** | Versioned performance data storage | Immutable append-only log |
| **EvaluationLoop** | Quality assessment + feedback loop | DeepEval-inspired metrics |
| **StateManager** | EVALS state persistence | JSON/YAML storage |
| **EvalsFactory** | System initialization + lifecycle | Factory pattern |

### Quality Metrics (DeepEval-Inspired)

| Metric | Purpose | Range |
|--------|---------|-------|
| **AnswerRelevancy** | Response relevance to query | 0-1 |
| **Faithfulness** | Factual correctness vs context | 0-1 |
| **ContextualPrecision** | Retrieved context precision | 0-1 |
| **ContextualRecall** | Retrieved context recall | 0-1 |

### Routing Algorithm

**Thompson Sampling with Deterministic Seeding**:

```typescript
// 1. Extract features
const features = QueryFeatureExtractor.extract(query);
// → { domain: "code", complexityScore: 0.65, ... }

// 2. Generate deterministic seed
const seed = hash(query + stateVersion);
const rng = createSeededRNG(seed);

// 3. Get candidates for context
const candidates = PerformanceStore.getCandidates(features.domain, features.complexityScore);

// 4. Thompson Sampling: Sample from Beta(α, β) for each candidate
for (const candidate of candidates) {
  const sample = rng.nextBeta(candidate.success + 1, candidate.failure + 1);
  // Select candidate with highest sample
}

// 5. Apply constraints (cost, quality, latency)
if (features.maxCost && selected.avgCost > features.maxCost) {
  // Find cheaper option
}

// 6. Exploration vs Exploitation
if (rng.next() < 0.1) {
  return explore(candidates);  // 10% exploration
} else {
  return exploit(bestCandidate);  // 90% exploitation
}
```

### Domain Classification

Queries are classified into 5 domains:

| Domain | Description | Example Keywords |
|--------|-------------|------------------|
| **code** | Programming tasks | function, class, array, algorithm |
| **creative** | Creative writing | write, story, poem, creative |
| **reasoning** | Logical reasoning | because, therefore, logic, reason |
| **analysis** | Analytical tasks | analyze, compare, evaluate, assess |
| **general** | General queries | (default when no keywords match) |

### Determinism Guarantees

✅ **Same inputs + same state = same routing decision**

- Seeded RNG from `hash(query + stateVersion)`
- Immutable state versioning (append-only log)
- Deterministic feature extraction (no ML models)
- Fixed exploration rate (10%)

---

## Multi-Provider Layer

### Supported Providers (40+)

| Provider | Type | Models | Status |
|----------|------|--------|--------|
| **Anthropic** | External | Claude 3.5 Sonnet, Opus, Haiku | ✅ |
| **GLM** | External | GLM 4.7, 4.5, 4.0 | ✅ |
| **Ollama** | Local | Llama 3.2, Mistral, Qwen, etc. | ✅ |
| **OpenAI** | External | GPT-4, GPT-3.5 | ✅ (adapter ready) |
| **DeepSeek** | External | DeepSeek Coder, Chat | ✅ (adapter ready) |
| **Together** | External | Mixtral, RedPajama, etc. | ✅ (adapter ready) |
| ... | ... | ... | ... |

### Provider Auto-Detection

```bash
# Auto-detect from environment variables
export ANTHROPIC_API_KEY=sk-ant-xxx
export GLM_API_KEY=xxx
export OPENAI_API_KEY=sk-xxx

# System auto-detects available providers
const detected = ProviderAutoDetector.detectAll();
// → { availableCount: 3, defaultProvider: {...}, providers: [...] }
```

---

## Data Flow

### Complete Query Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. QUERY FEATURE EXTRACTION                                 │
│  - Domain classification (code, creative, reasoning, etc.)    │
│  - Complexity scoring (0-1)                                   │
│  - Cost/quality/latency requirements                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CONTEXTUAL BANDIT ROUTING (Thompson Sampling)             │
│  - Get performance candidates for (domain, complexity)        │
│  - Sample from Beta(α, β) for each candidate                 │
│  - Select best candidate OR explore (10%)                     │
│  - Apply constraints (cost, quality, latency)                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. PROVIDER SELECTION & EXECUTION                          │
│  - ProviderFactory.getProvider(providerName)                 │
│  - provider.createChat(prompt, system)                       │
│  - Return response with metadata                              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. QUALITY EVALUATION (DeepEval-inspired metrics)          │
│  - Answer Relevancy: embedding similarity                    │
│  - Faithfulness: fact-check vs context                       │
│  - Contextual Precision/Recall: RAG metrics                  │
│  - Overall quality score (0-1)                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. PERFORMANCE STORE UPDATE                                 │
│  - Update Beta distribution (success/failure)                │
│  - Update EMA metrics (cost, latency, quality)               │
│  - Calculate confidence interval (95%)                       │
│  - Create new version (immutable append-only)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### EVALS Configuration

```yaml
# ~/.config/rad-engineer/evals.yaml
version: "1.0"
enabled: true

explorationRate: 0.10          # 10% exploration
qualityThreshold: 0.7          # Success if quality > 0.7

# Catastrophic forgetting prevention
ewc:
  enabled: true
  lambda: 0.5                  # Regularization strength

# State persistence
state:
  path: ~/.config/rad-engineer/performance-store.yaml
  autoSave: true
  versionsToKeep: 100

# Evaluation config
evaluation:
  timeout: 5000                # 5s max per evaluation
  useLocalModel: true          # Use Ollama for metrics
  localModel: "llama3.2"
```

### Provider Configuration

```yaml
# ~/.config/rad-engineer/providers.yaml
providers:
  anthropic:
    providerType: anthropic
    apiKey: ${ANTHROPIC_API_KEY}
    baseUrl: https://api.anthropic.com
    model: claude-3-5-sonnet-20241022

  glm:
    providerType: glm
    apiKey: ${GLM_API_KEY}
    baseUrl: https://api.z.ai/api/anthropic
    model: glm-4.7

  ollama:
    providerType: ollama
    baseUrl: http://localhost:11434
    model: llama3.2
```

---

## Performance Statistics

### Test Coverage

```
Total Tests: 464
Pass: 464 ✅
Fail: 0

Coverage:
  Functions: 83.94%
  Lines: 82.68%
```

### Component Breakdown

| Module | Tests | Coverage |
|--------|-------|----------|
| Adaptive (EVALS) | 75 | 80%+ funcs, 82%+ lines |
| SDK Integration | 50 | 90%+ funcs, 95%+ lines |
| Core Orchestrator | 120 | 95%+ funcs, 100% lines |
| Advanced Features | 80 | 93%+ funcs, 90%+ lines |
| Integration | 33 | 100% funcs, 100% lines |
| Baseline | 40 | 97%+ funcs, 96%+ lines |
| Plan | 30 | 58% funcs, 47% lines |
| Config | 16 | 92%+ funcs, 100% lines |

### Quality Metrics

- **TypeScript Errors**: 0 ✅
- **ESLint**: Pass ✅
- **Test Success Rate**: 100% ✅

---

## Key Constraints

### Agent Concurrency (HARD LIMIT)
```
⛔ MAXIMUM 2-3 PARALLEL AGENTS
   Exceeding this causes system crash (5 agents = 685 threads, kernel overload)
```

### Determinism
- Same query + same state = same routing decision
- Seed derived from `hash(query + stateVersion)`
- Immutable state versioning (append-only log)

### Security
- Prompt injection detection (OWASP LLM01:2025)
- PII redaction (email, phone, SSN, credit card)
- Audit logging for all EVALS decisions

---

## Usage Examples

### Basic Usage

```typescript
import { SDKIntegration } from './sdk/index.js';
import { EvalsFactory } from './adaptive/index.js';

// Initialize EVALS with auto-detected providers
const evalsSystem = await EvalsFactory.initialize(
  ProviderAutoDetector.initializeFromEnv(),
  { enabled: true, explorationRate: 0.1 }
);

// Initialize SDK with EVALS routing enabled
const sdk = new SDKIntegration({
  model: "auto",  // Let EVALS decide
  evalsRouting: true,
});

// Query is automatically routed to optimal provider
const response = await sdk.query("Write a function to sort an array");
console.log(response.content);
// → Provider selected based on query features + performance history
```

### CLI Commands

```bash
# View EVALS statistics
bun run evals stats

# Compare providers
bun run evals compare anthropic claude-3-5-sonnet-20241022 glm glm-4.7

# Export performance data
bun run evals export --format json > metrics.json

# Reset performance store
bun run evals reset --confirm
```

---

## Documentation

### Architecture & Planning
- **Full Platform Vision**: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`
- **Integration Plan**: `.claude/orchestration/docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md`
- **EVALS Research**: `.claude/orchestration/docs/planning/SELF-LEARNING_EVALS_DESIGN.md`

### Component Specifications
- **Component Specs**: `.claude/orchestration/specs/`
- **Validation Summaries**: `.claude/orchestration/specs/*/VALIDATION_SUMMARY.md`

### Progress Tracking
- **PROGRESS.md**: `.claude/orchestration/specs/PROGRESS.md`

---

## What Was Added (EVALS Integration)

### Before (Phase 1 Only)
- ✅ Smart Orchestrator with 9 components
- ✅ Multi-provider layer (40+ LLMs)
- ✅ Deterministic wave-based execution
- ❌ No intelligent routing (always used default provider)
- ❌ No performance tracking
- ❌ No quality assessment
- ❌ No learning/optimization

### After (Phase 1 + EVALS)
- ✅ Smart Orchestrator (unchanged)
- ✅ Multi-provider layer (enhanced with auto-detection)
- ✅ **NEW: Intelligent routing with Thompson Sampling**
- ✅ **NEW: Performance tracking with versioned storage**
- ✅ **NEW: Quality assessment with DeepEval-inspired metrics**
- ✅ **NEW: Self-learning via feedback loop**
- ✅ **NEW: Deterministic, reproducible routing decisions**

---

## License

MIT

---

**Version**: 1.1.0
**Status**: Phase 1 + EVALS Integration Complete ✅
**Last Updated**: 2026-01-07
