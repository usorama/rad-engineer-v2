# Implementation Backlog

> **Purpose**: Track deferred items for future implementation (post full-feature release)
> **Created**: 2026-01-13
> **Status**: Deferred (not MVP - these are future enhancements)
> **Priority**: After core deterministic platform is complete

---

## Rationale

These items were identified during planning but deferred to achieve the **shortest path to success**. They are NOT required for the deterministic engineering platform to function. They represent expansion and optimization opportunities.

**Current Focus**: Full-featured deterministic platform (not MVP)
**Backlog Focus**: Expansion beyond software engineering + performance optimization

---

## Deferred Items by Category

### 1. Multi-Language AST Parsing (ESS)

**Deferred From**: Phase 1 of original plan
**Reason**: Only TypeScript needed for rad-engineer-v2 indexing

| Language | Parser | Effort | Use Case |
|----------|--------|--------|----------|
| Python | tree-sitter-python | 4h | Already exists, verified |
| JavaScript | tree-sitter-javascript | 2h | JSX/TSX edge cases |
| Go | tree-sitter-go | 4h | Go projects |
| Rust | tree-sitter-rust | 4h | Rust projects |
| Java | tree-sitter-java | 4h | Enterprise projects |
| C/C++ | tree-sitter-c, tree-sitter-cpp | 6h | Systems projects |
| Ruby | tree-sitter-ruby | 4h | Rails projects |
| PHP | tree-sitter-php | 4h | Legacy web projects |
| Swift | tree-sitter-swift | 4h | iOS projects |
| Kotlin | tree-sitter-kotlin | 4h | Android/JVM projects |

**Total Effort**: ~40h
**When to Implement**: When users request non-TypeScript project support

---

### 2. Universal Business Domain Extensions

**Deferred From**: Phase 6 of original plan
**Reason**: Software engineering domain is priority

| Domain | Description | Use Cases | Effort |
|--------|-------------|-----------|--------|
| HR | Human Resources & People Ops | Hiring, onboarding, reviews | 8h |
| Finance | Accounting & Financial Ops | Invoicing, budgeting, reporting | 8h |
| Data Analysis | BI & Analytics | Dashboards, reports, ETL | 6h |
| Marketing | Marketing Operations | Campaigns, content, analytics | 6h |
| Legal | Legal & Compliance | Contracts, compliance, review | 6h |
| Operations | Supply Chain & Ops | Inventory, logistics, processes | 6h |
| Customer Success | Customer Operations | Support, retention, feedback | 6h |
| Sales | Sales Operations | Pipeline, forecasting, CRM | 6h |

**Total Effort**: ~52h
**When to Implement**: Phase 2 of platform vision (after core platform stable)

**Schema files needed**:
- `hr.schema.yaml`
- `finance.schema.yaml`
- `data-analysis.schema.yaml`
- `marketing.schema.yaml`
- `legal.schema.yaml`
- `operations.schema.yaml`
- `customer-success.schema.yaml`
- `sales.schema.yaml`

---

### 3. npx Installer & Distribution

**Deferred From**: Phase 7 of original plan
**Reason**: Developer-focused, not needed for internal use

| Component | Description | Effort |
|-----------|-------------|--------|
| `create-rad-engineer` | npm package | 2h |
| CLI entry point | Interactive installer | 6h |
| Project templates | Per-domain templates | 4h |
| VPS connector | Setup VPS integration | 3h |
| Documentation | User guide, troubleshooting | 4h |

**Total Effort**: ~19h
**When to Implement**: When platform is ready for external distribution

---

### 4. Formal Verification Integration

**Deferred From**: VAC enhancement
**Reason**: Runtime verification is sufficient initially

| Component | Description | Effort |
|-----------|-------------|--------|
| Z3 integration | SMT solver for contract proofs | 16h |
| CrossHair integration | Python contract verification | 8h |
| VERIFICATION_REPORT.json | Proof certificate generation | 4h |
| Formal spec language | DSL for contracts | 12h |

**Total Effort**: ~40h
**When to Implement**: When runtime verification shows gaps

---

### 5. Advanced Observability

**Deferred From**: Production hardening
**Reason**: Basic logging is sufficient initially

| Component | Description | Effort |
|-----------|-------------|--------|
| OpenTelemetry integration | Distributed tracing | 8h |
| Grafana dashboards | Metrics visualization | 6h |
| Alerting rules | Prometheus alerts | 4h |
| Log aggregation | ELK/Loki stack | 8h |
| Custom metrics exporter | Business metrics | 4h |

**Total Effort**: ~30h
**When to Implement**: When operating at scale

---

### 6. SWE-Bench Full Integration

**Deferred From**: Evaluation framework
**Reason**: Internal benchmarks sufficient initially

| Component | Description | Effort |
|-----------|-------------|--------|
| Docker harness | SWE-Bench environment | 8h |
| Automated runner | CI integration | 6h |
| Leaderboard tracking | Score monitoring | 4h |
| Pro subset runner | Filtered benchmark | 4h |

**Total Effort**: ~22h
**When to Implement**: When comparing to other platforms

---

### 7. Human-in-the-Loop Gateway

**Deferred From**: Universal domain support
**Reason**: Not needed for software engineering domain

| Component | Description | Effort |
|-----------|-------------|--------|
| `HumanInTheLoopGateway.ts` | Queue tasks for humans | 6h |
| Notification system | Email, Slack, SMS | 4h |
| Evidence collection | Photo, signature, document | 4h |
| Escalation paths | Timeout handling | 3h |

**Total Effort**: ~17h
**When to Implement**: When non-coding domains are added

---

### 8. Advanced Caching Layer

**Deferred From**: Performance optimization
**Reason**: Basic caching is sufficient initially

| Component | Description | Effort |
|-----------|-------------|--------|
| Embedding cache | Skip re-embedding | 4h |
| Query result cache | Cache ESS responses | 4h |
| Invalidation logic | Smart cache invalidation | 4h |
| Distributed cache | Multi-instance support | 6h |

**Total Effort**: ~18h
**When to Implement**: When performance bottlenecks appear

---

### 9. ESS MCP Server Wrapper

**Deferred From**: ESS integration (2026-01-13)
**Reason**: HTTP client sufficient for initial integration

| Component | Description | Effort |
|-----------|-------------|--------|
| MCP server scaffold | TypeScript MCP server | 2h |
| Tool definitions | query, conversation, health | 2h |
| Claude Code config | mcpServers entry | 1h |
| Documentation | Usage guide | 1h |
| Tests | MCP protocol tests | 2h |

**Total Effort**: ~8h
**When to Implement**: When native Claude Code MCP integration is preferred over HTTP

**Notes**:
- HTTP client (`ESSClient`) already implemented and working
- MCP would allow: `mcp__ess__query("How does auth work?")`
- Benefits: Native Claude Code integration, tool discovery
- Current solution: Import and use ESSClient directly in code

---

## Backlog Priority Order

When core platform is complete, implement in this order:

### Priority 1: Stability & Performance
1. Advanced Caching Layer (18h)
2. Advanced Observability (30h)

### Priority 2: Verification Enhancement
3. Formal Verification Integration (40h)
4. SWE-Bench Full Integration (22h)

### Priority 3: Language Expansion
5. Multi-Language AST Parsing (40h)

### Priority 4: Domain Expansion
6. Human-in-the-Loop Gateway (17h)
7. Universal Business Domains (52h)

### Priority 5: Distribution
8. npx Installer (19h)

### Priority 6: Integration Enhancement
9. ESS MCP Server Wrapper (8h)

---

## Total Backlog Effort

| Category | Effort | Priority |
|----------|--------|----------|
| Stability & Performance | 48h | P1 |
| Verification | 62h | P2 |
| Languages | 40h | P3 |
| Domains | 69h | P4 |
| Distribution | 19h | P5 |
| Integration | 8h | P6 |
| **Total** | **246h** | ~6 weeks |

---

## Tracking

When an item is moved from backlog to active development:

1. Create task in relevant IMPLEMENTATION-PLAN.md
2. Remove from this file
3. Add note: "Moved from backlog on YYYY-MM-DD"

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-13
**Review Cadence**: After each phase completion
