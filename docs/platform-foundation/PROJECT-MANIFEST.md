# Rad Engineer v2 - Project Manifest

> **Read this first** to understand the project's vision, objectives, and current state.

---

## Vision

**Autonomous Engineering Platform** that can engineer digital solutions from ideation to production and beyond, fully autonomously using Claude Code and Claude Agent SDK.

---

## Current Focus

**Phase 1-2**: /execute + /plan skills with Claude Agent SDK orchestration (~25% of full platform vision)

---

## Progress Overview

| Metric | Value |
|--------|-------|
| Total Components | 17 |
| Completed | 15 |
| Deferred | 2 |
| Progress | 88% |
| TypeScript Files | 82 |

### Phase Breakdown

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0-3 Core | 100% | Foundation, orchestrator, advanced features, integration |
| Q4 Phase 1-2 | 100% | Decision learning infrastructure |
| Q4 Integration | 100% | /plan skill v2.0.0 integrated |
| Q4 Phase 3 | Deferred | Advanced reasoning (pending CBR+LLM research) |

---

## Key Objectives

### 1. Deterministic Execution
Repeatable, reproducible agent orchestration where same inputs produce same outputs.

### 2. Decision Learning
Improve decisions over time using EWC (Elastic Weight Consolidation) learning patterns.

### 3. Outcome-Based Reasoning
Inject business outcomes into agent prompts so agents optimize for business value.

### 4. Structured Reasoning Methods
50 BMAD elicitation methods for systematic problem-solving and decision-making.

### 5. Self-Learning Planning
/plan skill integrated with DecisionLearningIntegration for deterministic, improving plans.

---

## Modules Implemented (12 modules, 82 files)

### SDK Layer
- **SDKIntegration** - Claude Agent SDK orchestration, agent spawning
- **ResourceMonitor** - System resource monitoring (CPU, memory, threads)
- **ProviderFactory** - Pluggable providers (Anthropic, Ollama, GLM)

### Foundation
- **BaselineMeasurement** - Metrics collection, token tracking, success rates

### Core Orchestrator
- **ResourceManager** - Concurrent agent management (2-3 max)
- **PromptValidator** - Validation, injection detection, size limits
- **ResponseParser** - Structured JSON output handling

### Advanced Features
- **WaveOrchestrator** - Wave execution, dependency management
- **StateManager** - State persistence, checkpointing
- **ErrorRecoveryEngine** - Retry logic, circuit breakers, saga patterns

### Integration
- **SecurityLayer** - Input sanitization, output scanning, audit logging

### Decision Learning
- **DecisionLearningStore** - Generalized learning store with EWC
- **DecisionTracker** - ADR-based tracking (MADR 4.0.0)

### Reasoning
- **MethodSelector** - Context-based method selection
- **MethodCatalog** - 50 BMAD elicitation methods
- **BMADMethods** - Method definitions and metadata

### Outcome
- **OutcomeInjector** - Inject outcomes into agent prompts
- **BusinessOutcomeExtractor** - Extract outcomes from PRDs

### Execute
- **DecisionLearningIntegration** - Orchestrates all Q4 components

### Plan (/plan skill v2.0.0)
- **IntakeHandler** - User input parsing, requirements structuring
- **ResearchCoordinator** - Parallel research agent coordination
- **ExecutionPlanGenerator** - Story generation, task breakdown
- **ValidationUtils** - Plan integrity validation

### Adaptive (EVALS)
- **BanditRouter** - Thompson Sampling for provider selection
- **QueryFeatureExtractor** - Domain/complexity classification
- **PerformanceStore** - Provider performance tracking
- **EvaluationLoop** - DeepEval metrics integration
- **EvalsFactory** - Evaluation pipeline factory

### Config
- **ProviderConfig** - Provider configuration management
- **ProviderAutoDetector** - Available provider detection
- **EvalsConfig** - EVALS configuration

### UI Adapter
- **ElectronIPCAdapter** - IPC communication for UI
- **Various API Handlers** - Task, Context, Settings, GitHub, etc.

### Python Bridge
- **PythonPluginBridge** - Python plugin integration
- **SpecGen/QA/AIMerge Integrations** - AI-powered tools

---

## Platform Vision (Full Roadmap)

| Phase | Skill | Description | Status |
|-------|-------|-------------|--------|
| 0 | Foundation | SDK integration, baseline | **Complete** |
| 1 | /execute | Deterministic execution | **Complete** |
| 2 | /plan | Autonomous planning, research agents | **Complete** |
| 3 | /design | Architecture engine, tech selection | Future |
| 4 | /deploy | DevOps automation, CI/CD | Future |
| 5 | /monitor | Evolution engine, self-improvement | Future |

**Current**: ~25% of full autonomous platform (Phases 0-2 complete)

---

## Key Outcomes to Optimize For

1. **Business Value** - Every decision traces to business outcomes
2. **Determinism** - Same inputs = same outputs (target: 85% consistency)
3. **Learning** - Improve method selection over 150+ decisions (target: 10%)
4. **Quality** - Decision quality score >= 0.7 (from 0.5 baseline)

---

## Implementation Structure

```
rad-engineer/
├── src/
│   ├── sdk/           # SDK Integration, Providers
│   ├── baseline/      # Baseline Measurement
│   ├── core/          # ResourceManager, PromptValidator, ResponseParser
│   ├── advanced/      # WaveOrchestrator, StateManager, ErrorRecoveryEngine
│   ├── integration/   # SecurityLayer
│   ├── decision/      # DecisionLearningStore, DecisionTracker
│   ├── reasoning/     # MethodSelector, BMAD Methods
│   ├── outcome/       # OutcomeInjector, BusinessOutcomeExtractor
│   ├── execute/       # DecisionLearningIntegration
│   ├── plan/          # IntakeHandler, ResearchCoordinator, ExecutionPlanGenerator
│   ├── adaptive/      # EVALS routing, BanditRouter, PerformanceStore
│   ├── config/        # Provider and EVALS configuration
│   ├── ui-adapter/    # Electron IPC, API handlers
│   ├── python-bridge/ # Python plugin integration
│   ├── cli/           # CLI commands
│   └── utils/         # Shared utilities
├── .claude/skills/
│   └── plan/SKILL.md  # /plan skill v2.0.0
└── test/              # Mirrors src/ structure
```

---

## Critical Constraints

| Constraint | Limit | Reason |
|------------|-------|--------|
| Parallel Agents | 2-3 max | System crash at 5 (685 threads) |
| Agent Prompts | <500 chars | Context overflow prevention |
| Test Runner | Bun only | 17x faster than Vitest |
| File Loading | JIT | Don't read files upfront |

---

## Skills Available

| Skill | Version | Status | Description |
|-------|---------|--------|-------------|
| /plan | v2.0.0 | Active | Evidence-backed planning with decision learning |
| /execute | v1.0.0 | Active | Deterministic task execution |

---

## Progress Tracking

- **Master Progress**: `.claude/orchestration/specs/PROGRESS.md`
- **Full Vision**: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`
- **Gap Analysis**: `docs/platform-foundation/GAP-ANALYSIS.md`

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Decision Consistency | >= 85% | Same decision count / total decisions |
| Method Improvement | >= 10% | Improvement over 150 decisions |
| Quality Score | >= 0.7 | Weighted outcome + evidence + alternatives |
| Test Coverage | >= 80% | Lines covered |
| TypeScript Errors | 0 | Strict mode, no `any` types |

---

## Deferred Components

| Component | Reason | Trigger |
|-----------|--------|---------|
| CriticalReasoningEngine | CBR+LLM research not mature | Production-ready CBR patterns |
| AgentPromptEnhancer | Depends on CriticalReasoningEngine | CriticalReasoningEngine complete |

---

**Version**: 2.0.0
**Last Updated**: 2026-01-12
