# Deterministic Engineering Platform - Research Summary

> **Source**: "SDK Replication and Deterministic Platform" (Meta/Harvard CCA + Neo-Confucius)
> **Purpose**: Distilled concepts for implementing truly deterministic AI engineering

---

## Core Thesis

**Scaffolding > Model Size**: A mid-sized model (Claude 3.5 Sonnet) outperforms larger models (Opus) when wrapped in superior cognitive architecture. Innovation happens in the "agent scaffold" - memory, planning, tool use.

---

## The Three Experience Framework

| Layer | Focus | Purpose |
|-------|-------|---------|
| **AX (Agent)** | Information architecture for model | Prevent context pollution |
| **UX (User)** | Transparency, audit trails | Build trust, enable human oversight |
| **DX (Developer)** | Observability, modularity | Enable tool hot-swapping, debugging |

---

## Mechanism 1: Hierarchical Working Memory

**Problem**: Linear context causes "myopia" - fixing immediate errors while violating global invariants.

**Solution**: Stack-based memory scopes:

```
GLOBAL SCOPE (immutable)
├── Project manifesto
├── Architectural patterns
└── High-level task description

TASK SCOPE (persistent per task)
├── Current plan
└── Progress summaries

LOCAL SCOPE (ephemeral)
├── Immediate tool outputs
└── Compiler errors, grep results
```

**Critical Behavior**: When subtask completes → LOCAL SCOPE is COMPRESSED → summary promoted to TASK SCOPE → raw logs discarded.

**Benefit**: Token usage is logarithmic (not linear) with task length.

---

## Mechanism 2: Persistent Note-Taking (Hindsight System)

**Problem**: "Catastrophic forgetting" - knowledge lost when session ends.

**Solution**: Monitor agent interactions, record hindsight notes:
- **Conventions**: Repo-specific coding styles
- **Failures**: "subprocess.run is banned; use safe_exec instead"
- **Resolution Paths**: Successful strategies for recurring problems

**Storage Format** (improving_memory.md):
```markdown
## Conventions
- Logging: Use structlog instead of logging
- Async: All DB calls must be awaited

## Failure Index
- Error: RecursionError in graph.py
  - Cause: Circular dependency
  - Fix: Use iterative stack approach
```

**Impact**: -11k tokens/session, +1.4% success rate

---

## Mechanism 3: Meta-Agent Optimization Loop

Automates agent design via Build-Test-Improve:

1. **Synthesis**: Generate agent configuration (prompts, tools)
2. **Execution**: Run on benchmark task
3. **Refinement**: Analyze trace, identify bottlenecks, modify config

**Outcome**: Agent engineering becomes optimization problem.

---

## The Innovation: Verifiable Agentic Contract (VAC)

**Core Insight**: Agent should never write code directly. It writes a SPECIFICATION, then code to satisfy it.

### VAC Protocol (3 Phases)

**Phase 1: Contract Proposal**
- Agent analyzes task
- Calls `propose_contract` tool
- Specifies: Preconditions, Postconditions, Invariants
- System verifies logical consistency

**Phase 2: Implementation**
- Agent writes code to satisfy contract
- No direct commits allowed

**Phase 3: Formal Verification**
- Property-based testing (Hypothesis) derived from contract
- Fuzz-test against thousands of inputs
- Postconditions must hold for all valid preconditions

### Safety Hook Enforcement

```python
async def enforce_vac_protocol(input_data, tool_use_id, context):
    if tool_name == "commit_changes":
        if not context.get("contract_verified", False):
            return {"permissionDecision": "deny",
                    "reason": "RISK BLOCK: Run verify_contract first"}
```

**Result**: System refuses to "hallucinate" commits. Forces proof before acceptance.

---

## Calculator Mode: High-Level Atomic Actions (HLAAs)

**Replace non-deterministic with deterministic**:

| Instead of | Use |
|------------|-----|
| `sed` | `semantic_replace(symbol="User", new_symbol="Customer")` |
| `rm` | `archive_module` |
| Raw bash | Constrained semantic operations |

**Guarantee**: Tools either succeed completely OR fail with clear error. No undefined states.

---

## Metrics Framework

### Performance
| Metric | Target | Measurement |
|--------|--------|-------------|
| Resolve@1 | >54.3% | Issues resolved in single attempt |
| Pass@5 | High | Reliability indicator |

### Efficiency
| Metric | Purpose |
|--------|---------|
| Context Saturation Rate | How often compression triggered (lower = better) |
| Hindsight Utilization | % sessions using persistent notes |
| Token-to-Code Ratio | Economic efficiency |

### Determinism (VAC Validation)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Contract Coverage | 100% | % code changes covered by VAC |
| Verification Rejection Rate | Track | Bugs caught before commit |
| Drift Rate | 0% | Same task x 10 = identical AST |
| Hallucination Rate | <1% | Via deterministic tools |

---

## Implementation Roadmap

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1-4 | Hierarchical Memory Orchestrator |
| 2 | 5-6 | Persistence Layer (Hindsight) |
| 3 | 7-10 | VAC + Safety Hooks |
| 4 | 11-14 | Meta-Agent Optimization |

---

## Architecture Comparison

| Feature | Standard RAG | CCA | Neo-Confucius (Target) |
|---------|-------------|-----|------------------------|
| Context | Rolling Window | Hierarchical Stack | Hierarchical + Scope Locking |
| Memory | None | Hindsight Notes | Notes + Knowledge Graph |
| Tools | Ad-hoc functions | Modular Extensions | MCP + Calculator Mode |
| Safety | None | Human Review | **VAC (Mathematical)** |
| Optimization | Manual | Meta-Agent | Continuous Meta-Learning |

---

## Key Artifacts to Generate

1. **DECISION_LOG.md**: User-facing explanation of architectural choices
2. **VERIFICATION_REPORT.json**: Proof that code meets VAC ("Certificate of Authenticity")

---

## Critical Success Factors

1. **Scope-Aware Loop**: Context bounded logarithmically
2. **Active Hindsight**: Learning persists across sessions
3. **Contract-First**: Never write code without specification
4. **Deterministic Tools**: No undefined states possible
5. **Continuous Optimization**: Meta-agent improves system automatically

---

## For AI Agents Reading This

**Apply these principles**:
1. Structure your memory hierarchically (global → task → local)
2. Compress completed work into summaries, discard raw logs
3. Record failures and solutions for future sessions
4. Never commit without verification
5. Use high-level semantic operations, not raw commands
6. Measure drift - same inputs must produce same outputs

**Mathematical Certainty Loop**:
```
WHILE certainty < threshold:
    propose_contract()
    implement()
    verify()
    IF verification_fails:
        analyze_trace()
        refine_approach()
    ELSE:
        certainty = calculate_certainty(contract_coverage, drift_rate, test_pass_rate)
```

---

**Lines**: ~175 (vs original 391 = 45% reduction)
**Last Updated**: 2026-01-12
