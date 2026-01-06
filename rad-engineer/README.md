# Rad Engineer v2 - Smart Orchestrator

> Autonomous Engineering Platform with Deterministic Claude Agent SDK Orchestration

## Overview

Rad Engineer v2 is a production-grade autonomous engineering platform that orchestrates Claude AI agents through a deterministic, wave-based execution system. This is Phase 1 of a larger vision (~15% of the full platform).

## Architecture

The Smart Orchestrator consists of 9 components across 4 phases:

### Phase 0: Foundation
- **SDK Integration**: Claude Agent SDK orchestration, agent spawning, response handling
- **Baseline Measurement**: Token tracking, metrics collection, success rate measurement

### Phase 1: Core Orchestrator  
- **ResourceManager**: Resource limits enforcement, concurrent agent management (max 2-3)
- **PromptValidator**: Input validation (≤500 chars), injection detection, PII redaction
- **ResponseParser**: Structured JSON output parsing, 6 required fields validation

### Phase 2: Advanced Features
- **WaveOrchestrator**: Wave execution coordination, dependency management
- **StateManager**: Checkpoint save/load/compact for recovery

### Phase 3: Integration & Polish
- **ErrorRecoveryEngine**: Exponential backoff retry, circuit breakers
- **SecurityLayer**: Threat scanning, PII detection, audit logging

## Key Constraints

### Agent Concurrency
- **HARD LIMIT**: Maximum 2-3 parallel agents
- Exceeding this causes system crash (verified: 5 agents = 685 threads)
- Enforced by ResourceManager

### Security
- Prompt injection detection (OWASP LLM01:2025 patterns)
- PII redaction (email, phone, SSN, credit card)
- Forbidden content detection
- Audit logging for all security events

### Quality Gates
- TypeScript typecheck: 0 errors
- ESLint: Pass
- Tests: ≥80% coverage, all passing

## Project Structure

```
rad-engineer/
├── src/
│   ├── sdk/              # Phase 0: SDK Integration
│   ├── baseline/         # Phase 0: Baseline Measurement
│   ├── core/             # Phase 1: ResourceManager, PromptValidator, ResponseParser
│   ├── advanced/         # Phase 2: WaveOrchestrator, StateManager
│   └── integration/      # Phase 3: ErrorRecoveryEngine, SecurityLayer
├── test/
│   └── (mirrors src/ structure)
└── package.json
```

## Development

### Prerequisites
- Bun (runtime + package manager)
- TypeScript 5.7
- Node.js (for @anthropic-ai/sdk)

### Setup
```bash
cd rad-engineer
bun install
```

### Quality Gates
```bash
bun run typecheck    # 0 errors required
bun run lint         # Must pass
bun test             # All tests pass
```

## Test Coverage

- **Total Tests**: 278 across all components
- **Overall Coverage**: >90% functions, >90% lines
- **Test Types**: Unit, Integration, E2E, Chaos

## Progress

All 9 components implemented and verified:
- Phase 0: 100% complete (2/2) ✅
- Phase 1: 100% complete (3/3) ✅
- Phase 2: 100% complete (2/2) ✅
- Phase 3: 100% complete (2/2) ✅

## Documentation

- Full platform vision: `.claude/orchestration/docs/planning/AUTONOMOUS_ENGINEERING_PLATFORM_ANALYSIS.md`
- Integration plan: `.claude/orchestration/docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md`
- Component specs: `.claude/orchestration/specs/`

## License

MIT

---

**Version**: 1.0.0  
**Status**: Phase 1 Complete  
**Last Updated**: 2026-01-06
