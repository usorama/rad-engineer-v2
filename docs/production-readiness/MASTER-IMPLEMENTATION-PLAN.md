# Master Implementation Plan: Production Readiness

> **Version**: 1.0.0
> **Generated**: 2026-01-14
> **Purpose**: Comprehensive implementation plan for /execute skill execution
> **Status**: READY_FOR_EXECUTION

---

## Executive Summary

This plan consolidates all production readiness work into an executable format compatible with the `/execute` skill. It includes:

- **Original Plan**: 91 story points (20 stories, 6 waves) - Production infra focus
- **UI Integration**: 41 story points (7 stories) - Frontend/Backend integration
- **ESS Integration**: 54 story points (6 phases) - Codebase indexing & veracity
- **SDK Best Practices**: 18 story points (6 stories) - Production SDK patterns

**Total Scope**: 204 story points across 39 stories
**Estimated Duration**: 8-12 weeks (with 2-3 parallel agents per wave)

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION READINESS DEPENDENCY GRAPH                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WAVE 1: Foundation (Parallel)                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ W1-S1: SDK    │  │ W1-S2: Cross- │  │ W1-S3: Config │                   │
│  │ Install (3pt) │  │ Platform (5pt)│  │ System (3pt)  │                   │
│  └───────┬───────┘  └───────────────┘  └───────┬───────┘                   │
│          │                                      │                           │
│          ▼                                      ▼                           │
│  WAVE 2: Core Integration (Sequential)                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ W2-S1: Real   │──│ W2-S2: Integ  │──│ W2-S3: Mode   │                   │
│  │ Agent (8pt)   │  │ Tests (5pt)   │  │ Toggle (3pt)  │                   │
│  └───────┬───────┘  └───────────────┘  └───────────────┘                   │
│          │                                                                  │
│          │         ┌─────────────────────────────────────┐                 │
│          │         │  PARALLEL TRACK: UI INTEGRATION     │                 │
│          │         ├─────────────────────────────────────┤                 │
│          │         │  UI-S1: IPC Registration (8pt)      │                 │
│          │         │  UI-S2: EventBroadcaster (3pt)      │                 │
│          │         │  UI-S3: Format Translation (5pt)    │                 │
│          │         └─────────────────────────────────────┘                 │
│          │                                                                  │
│          ▼                                                                  │
│  WAVE 3: Observability (Parallel)                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ W3-S1: Struct │  │ W3-S2: Prom   │  │ W3-S3: Health │                   │
│  │ Logging (5pt) │  │ Metrics (5pt) │  │ Check (3pt)   │                   │
│  └───────┬───────┘  └───────────────┘  └───────────────┘                   │
│          │                                                                  │
│          ▼                                                                  │
│  WAVE 4: Reliability (Sequential)                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ W4-S1: State  │──│ W4-S2: File   │──│ W4-S3: Grace  │──│ W4-S4: Dist │  │
│  │ Compact (3pt) │  │ Lock (3pt)    │  │ Shutdown (3pt)│  │ Trace (5pt) │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘  │
│                                                                             │
│          ▼                                                                  │
│  WAVE 5: Security (Sequential)                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ W5-S1: Rate   │──│ W5-S2: Audit  │──│ W5-S3: Sec    │                   │
│  │ Limit (5pt)   │  │ Persist (3pt) │  │ Audit (8pt)   │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                             │
│          ▼                                                                  │
│  WAVE 6: Verification (Sequential)                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ W6-S1: E2E    │──│ W6-S2: Load   │──│ W6-S3: Chaos  │──│ W6-S4: Docs │  │
│  │ Tests (8pt)   │  │ Test (5pt)    │  │ Test (5pt)    │  │ (3pt)       │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘  │
│                                                                             │
│         ═══════════════════════════════════════════════════════            │
│                                                                             │
│  PARALLEL TRACK: ESS DEVELOPMENT (Separate Session)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Phase 0 │──│ Phase 1 │──│ Phase 2 │──│ Phase 3 │──│ Phase 4 │          │
│  │ Local   │  │ TS AST  │  │ HTTP GW │  │ LLM Q   │  │ Model   │          │
│  │ (4h)    │  │ (16h)   │  │ (8h)    │  │ (8h)    │  │ Pin (2h)│          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stories

### Wave 1: Critical Foundation (11 points, 3 stories, PARALLEL)

---

## Story 1: Install @anthropic-ai/sdk and Fix SDK Tests

**ID**: W1-S1
**Points**: 3
**Agent**: developer
**Dependencies**: None

### Tasks
- Task 1.1.1: Verify SDK already installed (check package.json)
- Task 1.1.2: Run SDK-dependent tests to identify failures
- Task 1.1.3: Fix any failing SDK tests
- Task 1.1.4: Verify TypeScript types resolved

### Tests
- [ ] `bun test src/sdk/` passes with 0 failures
- [ ] `bun run typecheck` shows 0 errors
- [ ] SDK import statement works without errors

### Verification
```bash
cd rad-engineer
bun run typecheck  # 0 errors
bun test src/sdk/  # All pass
```

### Files
- `rad-engineer/package.json`
- `rad-engineer/src/sdk/SDKIntegration.ts`
- `rad-engineer/test/sdk/SDKIntegration.test.ts`

### Wave Assignment
- Wave 1, Agent 1

---

## Story 2: Add Cross-Platform ResourceMonitor

**ID**: W1-S2
**Points**: 5
**Agent**: developer
**Dependencies**: None

### Tasks
- Task 1.2.1: Create PlatformMonitor interface
- Task 1.2.2: Implement LinuxMonitor (/proc/meminfo, /proc/stat)
- Task 1.2.3: Refactor existing code to DarwinMonitor
- Task 1.2.4: Implement FallbackMonitor (conservative defaults)
- Task 1.2.5: Add platform detection factory function
- Task 1.2.6: Add platform-specific tests

### Tests
- [ ] Platform detection returns correct monitor type
- [ ] LinuxMonitor parses /proc/meminfo correctly
- [ ] DarwinMonitor works on macOS
- [ ] FallbackMonitor provides safe defaults
- [ ] All tests pass on current platform

### Verification
```bash
bun test rad-engineer/test/sdk/ResourceMonitor.test.ts
# Must include platform-specific test cases
```

### Files
- `rad-engineer/src/sdk/ResourceMonitor.ts`
- `rad-engineer/src/sdk/monitors/LinuxMonitor.ts` (new)
- `rad-engineer/src/sdk/monitors/DarwinMonitor.ts` (new)
- `rad-engineer/src/sdk/monitors/FallbackMonitor.ts` (new)
- `rad-engineer/test/sdk/ResourceMonitor.test.ts`

### Wave Assignment
- Wave 1, Agent 2

---

## Story 3: Create Centralized Configuration System

**ID**: W1-S3
**Points**: 3
**Agent**: developer
**Dependencies**: None

### Tasks
- Task 1.3.1: Create Zod schema for configuration
- Task 1.3.2: Add environment variable support with defaults
- Task 1.3.3: Add config validation at startup
- Task 1.3.4: Write config tests
- Task 1.3.5: Document configuration options

### Tests
- [ ] Schema validates correct config
- [ ] Schema rejects invalid config
- [ ] Environment variables override defaults
- [ ] Feature flags work correctly

### Verification
```bash
bun test rad-engineer/test/config/
```

### Files
- `rad-engineer/src/config/index.ts` (new)
- `rad-engineer/src/config/schema.ts` (new)
- `rad-engineer/test/config/config.test.ts` (new)

### Wave Assignment
- Wave 1, Agent 3

---

### Wave 2: Real Agent Integration (16 points, 3 stories, SEQUENTIAL)

---

## Story 4: Implement Real Agent Spawning

**ID**: W2-S1
**Points**: 8
**Agent**: developer
**Dependencies**: W1-S1, W1-S3

### Tasks
- Task 2.1.1: Read existing WaveOrchestrator.executeTask() implementation
- Task 2.1.2: Add real agent execution path when config.useRealAgents = true
- Task 2.1.3: Integrate SDKIntegration.executeAgent() call
- Task 2.1.4: Wire ResponseParser for real responses
- Task 2.1.5: Wire SecurityLayer for output scanning
- Task 2.1.6: Add metrics collection for real execution
- Task 2.1.7: Preserve mock behavior when useRealAgents = false
- Task 2.1.8: Add integration test for real flow

### Tests
- [ ] Mock mode works identically to before
- [ ] Real mode calls SDKIntegration
- [ ] Responses parsed through ResponseParser
- [ ] Outputs scanned by SecurityLayer
- [ ] Metrics captured for real execution

### Verification
```bash
# Mock mode
USE_REAL_AGENTS=false bun test rad-engineer/test/advanced/WaveOrchestrator.test.ts

# Real mode (requires API key)
ANTHROPIC_API_KEY=xxx USE_REAL_AGENTS=true bun test rad-engineer/test/advanced/WaveOrchestrator.integration.test.ts
```

### Files
- `rad-engineer/src/advanced/WaveOrchestrator.ts`
- `rad-engineer/test/advanced/WaveOrchestrator.test.ts`
- `rad-engineer/test/advanced/WaveOrchestrator.integration.test.ts` (new)

### Wave Assignment
- Wave 2, Agent 1

---

## Story 5: Add Integration Tests for Real Agent Flow

**ID**: W2-S2
**Points**: 5
**Agent**: test-writer
**Dependencies**: W2-S1

### Tasks
- Task 2.2.1: Create test file for real agent flow
- Task 2.2.2: Write simple task end-to-end test
- Task 2.2.3: Write timeout handling test
- Task 2.2.4: Write metrics collection test
- Task 2.2.5: Write state checkpointing test
- Task 2.2.6: Write error recovery test
- Task 2.2.7: Add skip logic for CI without API key

### Tests
- [ ] Simple task executes end-to-end
- [ ] Timeout triggers correctly
- [ ] Metrics captured accurately
- [ ] State checkpointed during execution
- [ ] Errors recovered gracefully

### Files
- `rad-engineer/test/integration/real-agent-flow.test.ts` (new)
- `rad-engineer/test/integration/agent-error-recovery.test.ts` (new)

### Wave Assignment
- Wave 2, Agent 1 (sequential after W2-S1)

---

## Story 6: Create Mock/Real Execution Mode Toggle

**ID**: W2-S3
**Points**: 3
**Agent**: developer
**Dependencies**: W2-S1

### Tasks
- Task 2.3.1: Add config.useRealAgents flag to config schema
- Task 2.3.2: Log which mode is active on startup
- Task 2.3.3: Document mode toggle in README
- Task 2.3.4: Add environment variable support
- Task 2.3.5: Test mode switching

### Tests
- [ ] Flag defaults to false (mock mode)
- [ ] Environment variable overrides default
- [ ] Log message shows correct mode
- [ ] Mode toggle works at runtime

### Files
- `rad-engineer/src/config/schema.ts`
- `rad-engineer/src/advanced/WaveOrchestrator.ts`

### Wave Assignment
- Wave 2, Agent 2 (parallel with W2-S2)

---

### Wave 3: Observability (13 points, 3 stories, PARALLEL)

---

## Story 7: Add Structured Logging with Pino

**ID**: W3-S1
**Points**: 5
**Agent**: developer
**Dependencies**: W1-S3

### Tasks
- Task 3.1.1: Install pino package
- Task 3.1.2: Create logger module with JSON output
- Task 3.1.3: Add correlation ID support
- Task 3.1.4: Create component logger factory
- Task 3.1.5: Replace all console.* calls with logger
- Task 3.1.6: Add async logging to not block execution
- Task 3.1.7: Write logging tests

### Tests
- [ ] Logger outputs JSON format
- [ ] Correlation IDs propagate correctly
- [ ] All console.* calls replaced (grep returns nothing)
- [ ] Async logging doesn't block
- [ ] Log levels configurable

### Verification
```bash
bun test rad-engineer/test/logging/
grep -r "console\." rad-engineer/src/ # Should return nothing
```

### Files
- `rad-engineer/src/logging/index.ts` (new)
- `rad-engineer/src/logging/correlation.ts` (new)
- `rad-engineer/test/logging/logging.test.ts` (new)
- All `src/**/*.ts` files (replace console.*)

### Wave Assignment
- Wave 3, Agent 1

---

## Story 8: Implement Prometheus Metrics Export

**ID**: W3-S2
**Points**: 5
**Agent**: developer
**Dependencies**: W1-S3

### Tasks
- Task 3.2.1: Install prom-client package
- Task 3.2.2: Create metrics registry
- Task 3.2.3: Define counters (agents_spawned, agents_failed, requests)
- Task 3.2.4: Define gauges (active_agents, cpu_usage, memory_usage)
- Task 3.2.5: Define histograms (agent_duration, prompt_tokens)
- Task 3.2.6: Create /metrics endpoint
- Task 3.2.7: Write metrics tests

### Tests
- [ ] /metrics endpoint returns Prometheus format
- [ ] Counters increment correctly
- [ ] Gauges reflect current state
- [ ] Histograms bucket correctly
- [ ] Labels applied correctly

### Files
- `rad-engineer/src/metrics/index.ts` (new)
- `rad-engineer/src/metrics/server.ts` (new)
- `rad-engineer/test/metrics/metrics.test.ts` (new)

### Wave Assignment
- Wave 3, Agent 2

---

## Story 9: Add Health Check Endpoints

**ID**: W3-S3
**Points**: 3
**Agent**: developer
**Dependencies**: W1-S3

### Tasks
- Task 3.3.1: Create /health endpoint (liveness)
- Task 3.3.2: Create /ready endpoint (readiness)
- Task 3.3.3: Add component health checks
- Task 3.3.4: Add configurable port (default 9090)
- Task 3.3.5: Write health check tests

### Tests
- [ ] /health returns 200 if process running
- [ ] /ready returns 200 if resources available
- [ ] /ready returns 503 if component unhealthy
- [ ] Response includes component breakdown
- [ ] Port configurable via environment

### Files
- `rad-engineer/src/health/index.ts` (new)
- `rad-engineer/src/health/server.ts` (new)
- `rad-engineer/test/health/health.test.ts` (new)

### Wave Assignment
- Wave 3, Agent 3

---

### Wave 4: Reliability (14 points, 4 stories, SEQUENTIAL)

---

## Story 10: Implement StateManager.compact()

**ID**: W4-S1
**Points**: 3
**Agent**: developer
**Dependencies**: None

### Tasks
- Task 4.1.1: Add compact() method to StateManager
- Task 4.1.2: Implement configurable max age (default 7 days)
- Task 4.1.3: Keep minimum N checkpoints (default 3)
- Task 4.1.4: Log compaction results
- Task 4.1.5: Add compact tests

### Tests
- [ ] Compaction removes old checkpoints
- [ ] Minimum checkpoints preserved
- [ ] Age threshold configurable
- [ ] Results logged correctly

### Files
- `rad-engineer/src/advanced/StateManager.ts`
- `rad-engineer/test/advanced/StateManager.test.ts`

### Wave Assignment
- Wave 4, Agent 1

---

## Story 11: Add File Locking for Checkpoints

**ID**: W4-S2
**Points**: 3
**Agent**: developer
**Dependencies**: W4-S1

### Tasks
- Task 4.2.1: Install proper-lockfile package
- Task 4.2.2: Wrap checkpoint writes with locks
- Task 4.2.3: Add lock timeout (5s default)
- Task 4.2.4: Handle stale lock cleanup
- Task 4.2.5: Add locking tests

### Tests
- [ ] Lock acquired before write
- [ ] Lock released after write
- [ ] Timeout triggers on lock contention
- [ ] Stale locks cleaned up

### Files
- `rad-engineer/src/advanced/StateManager.ts`
- `rad-engineer/package.json`

### Wave Assignment
- Wave 4, Agent 1 (sequential)

---

## Story 12: Implement Graceful Shutdown Handlers

**ID**: W4-S3
**Points**: 3
**Agent**: developer
**Dependencies**: W3-S1

### Tasks
- Task 4.3.1: Register SIGTERM handler
- Task 4.3.2: Register SIGINT handler
- Task 4.3.3: Pause new task acceptance on shutdown
- Task 4.3.4: Drain in-flight agents (with timeout)
- Task 4.3.5: Checkpoint state before exit
- Task 4.3.6: Clean exit codes
- Task 4.3.7: Add shutdown tests

### Tests
- [ ] SIGTERM triggers shutdown sequence
- [ ] In-flight tasks allowed to complete
- [ ] State checkpointed
- [ ] Exit code reflects success/failure

### Files
- `rad-engineer/src/shutdown/index.ts` (new)
- `rad-engineer/test/shutdown/shutdown.test.ts` (new)

### Wave Assignment
- Wave 4, Agent 1 (sequential)

---

## Story 13: Add Distributed Tracing Support

**ID**: W4-S4
**Points**: 5
**Agent**: developer
**Dependencies**: W3-S1, W3-S2

### Tasks
- Task 4.4.1: Install OpenTelemetry packages
- Task 4.4.2: Create tracing initialization
- Task 4.4.3: Add spans for task execution
- Task 4.4.4: Add spans for agent spawn
- Task 4.4.5: Add spans for response parsing
- Task 4.4.6: Add spans for security scan
- Task 4.4.7: Configure export to Jaeger/Zipkin
- Task 4.4.8: Add tracing tests

### Tests
- [ ] Trace context propagated through calls
- [ ] Spans created for key operations
- [ ] Exportable to external systems
- [ ] Minimal performance impact

### Files
- `rad-engineer/src/tracing/index.ts` (new)
- `rad-engineer/src/tracing/spans.ts` (new)
- `rad-engineer/test/tracing/tracing.test.ts` (new)

### Wave Assignment
- Wave 4, Agent 2

---

### Wave 5: Security Hardening (16 points, 3 stories, SEQUENTIAL)

---

## Story 14: Implement Rate Limiting

**ID**: W5-S1
**Points**: 5
**Agent**: developer
**Dependencies**: W2-S1

### Tasks
- Task 5.1.1: Create TokenBucketRateLimiter class
- Task 5.1.2: Implement configurable max tokens and refill rate
- Task 5.1.3: Add per-session limits
- Task 5.1.4: Add global limits
- Task 5.1.5: Return 429 with retry-after on exceed
- Task 5.1.6: Add metrics for rate limit hits
- Task 5.1.7: Integrate with WaveOrchestrator
- Task 5.1.8: Add rate limiter tests

### Tests
- [ ] Token bucket allows requests within limit
- [ ] Exceeding limit returns false
- [ ] Tokens refill over time
- [ ] Retry-after calculated correctly
- [ ] Metrics increment on limit hit

### Files
- `rad-engineer/src/security/RateLimiter.ts` (new)
- `rad-engineer/src/advanced/WaveOrchestrator.ts`
- `rad-engineer/test/security/RateLimiter.test.ts` (new)

### Wave Assignment
- Wave 5, Agent 1

---

## Story 15: Add Audit Log Persistence Tests

**ID**: W5-S2
**Points**: 3
**Agent**: test-writer
**Dependencies**: W3-S1

### Tasks
- Task 5.2.1: Create audit persistence test file
- Task 5.2.2: Test audit log survives restart
- Task 5.2.3: Test audit log rotation
- Task 5.2.4: Verify no PII in audit logs
- Task 5.2.5: Test audit log encryption (if implemented)

### Tests
- [ ] Audit log persists across restart
- [ ] Rotation works correctly
- [ ] No PII found in logs
- [ ] Encryption verified

### Files
- `rad-engineer/test/integration/audit-persistence.test.ts` (new)

### Wave Assignment
- Wave 5, Agent 1 (sequential)

---

## Story 16: Security Audit

**ID**: W5-S3
**Points**: 8
**Agent**: code-reviewer
**Dependencies**: W5-S1, W5-S2

### Tasks
- Task 5.3.1: Review OWASP LLM Top 10
- Task 5.3.2: Test prompt injection patterns
- Task 5.3.3: Verify secret scanning
- Task 5.3.4: Scan dependencies for vulnerabilities
- Task 5.3.5: Review credential handling
- Task 5.3.6: Test rate limiting effectiveness
- Task 5.3.7: Generate security report

### Tests
- [ ] No high/critical findings
- [ ] Prompt injection detected
- [ ] Secrets not exposed
- [ ] Dependencies clean
- [ ] Credentials secured

### Files
- `rad-engineer/docs/SECURITY_AUDIT_REPORT.md` (new)

### Wave Assignment
- Wave 5, Agent 2

---

### Wave 6: Integration & Verification (21 points, 4 stories, SEQUENTIAL)

---

## Story 17: Full Pipeline Integration Tests

**ID**: W6-S1
**Points**: 8
**Agent**: test-writer
**Dependencies**: W2-S2, W4-S4

### Tasks
- Task 6.1.1: Create full-pipeline.test.ts
- Task 6.1.2: Test Input -> Validation -> Agent -> Parse -> Security -> State
- Task 6.1.3: Create multi-wave.test.ts
- Task 6.1.4: Test wave dependency resolution
- Task 6.1.5: Create checkpoint-recovery.test.ts
- Task 6.1.6: Test recovery from checkpoint

### Tests
- [ ] Full pipeline executes successfully
- [ ] Multi-wave dependencies respected
- [ ] Checkpoint recovery works
- [ ] All stages verified

### Files
- `rad-engineer/test/e2e/full-pipeline.test.ts` (new)
- `rad-engineer/test/e2e/multi-wave.test.ts` (new)
- `rad-engineer/test/e2e/checkpoint-recovery.test.ts` (new)

### Wave Assignment
- Wave 6, Agent 1

---

## Story 18: Load Testing

**ID**: W6-S2
**Points**: 5
**Agent**: developer
**Dependencies**: W6-S1

### Tasks
- Task 6.2.1: Create load-test.ts script
- Task 6.2.2: Implement 10 agent benchmark
- Task 6.2.3: Implement 50 agent benchmark
- Task 6.2.4: Implement 100 agent benchmark
- Task 6.2.5: Measure throughput, latency p50/p95/p99
- Task 6.2.6: Verify resource limits enforced
- Task 6.2.7: Check for memory leaks
- Task 6.2.8: Generate performance report

### Tests
- [ ] 10 agents: < 1% error rate
- [ ] 50 agents: < 2% error rate
- [ ] 100 agents: < 5% error rate
- [ ] No memory leaks

### Files
- `rad-engineer/scripts/load-test.ts` (new)
- `rad-engineer/docs/PERFORMANCE_REPORT.md` (new)

### Wave Assignment
- Wave 6, Agent 1 (sequential)

---

## Story 19: Chaos Testing

**ID**: W6-S3
**Points**: 5
**Agent**: test-writer
**Dependencies**: W6-S1

### Tasks
- Task 6.3.1: Create cascading-failures.test.ts
- Task 6.3.2: Test agent kill mid-execution
- Task 6.3.3: Test SDK API failure -> circuit breaker
- Task 6.3.4: Test state corruption -> checkpoint restore
- Task 6.3.5: Test resource exhaustion -> graceful degradation
- Task 6.3.6: Create recovery-scenarios.test.ts

### Tests
- [ ] Agent kill triggers recovery
- [ ] Circuit breaker trips on API failures
- [ ] Checkpoint restore works
- [ ] Graceful degradation active

### Files
- `rad-engineer/test/chaos/cascading-failures.test.ts` (new)
- `rad-engineer/test/chaos/recovery-scenarios.test.ts` (new)

### Wave Assignment
- Wave 6, Agent 2

---

## Story 20: Documentation and Runbooks

**ID**: W6-S4
**Points**: 3
**Agent**: planner
**Dependencies**: W6-S2, W6-S3

### Tasks
- Task 6.4.1: Update README with production setup
- Task 6.4.2: Create DEPLOYMENT_RUNBOOK.md
- Task 6.4.3: Create TROUBLESHOOTING.md
- Task 6.4.4: Create PERFORMANCE_TUNING.md

### Tests
- [ ] README covers production setup
- [ ] Runbook steps tested
- [ ] Troubleshooting covers common issues
- [ ] Performance guide actionable

### Files
- `rad-engineer/docs/DEPLOYMENT_RUNBOOK.md` (new)
- `rad-engineer/docs/TROUBLESHOOTING.md` (new)
- `rad-engineer/docs/PERFORMANCE_TUNING.md` (new)

### Wave Assignment
- Wave 6, Agent 3

---

## UI Integration Stories (Parallel Track)

---

## Story 21: IPC Handler Registration

**ID**: UI-S1
**Points**: 8
**Agent**: developer
**Dependencies**: None

### Tasks
- Task U.1.1: Create main/ipc-handlers.ts in Electron main process
- Task U.1.2: Register all task channels with ipcMain.handle()
- Task U.1.3: Initialize ElectronIPCAdapter
- Task U.1.4: Provide getWindows() to EventBroadcaster
- Task U.1.5: Handle IPC lifecycle
- Task U.1.6: Write integration tests

### Tests
- [ ] All channels registered
- [ ] IPC calls invoke correct handlers
- [ ] Windows receive events
- [ ] Errors propagate correctly

### Files
- `workspaces/rad-engineer-ui/apps/frontend/electron/main/ipc-handlers.ts` (new)
- Integration with ElectronIPCAdapter

### Wave Assignment
- UI Wave 1, Agent 1

---

## Story 22: EventBroadcaster Integration

**ID**: UI-S2
**Points**: 3
**Agent**: developer
**Dependencies**: UI-S1

### Tasks
- Task U.2.1: Wire EventBroadcaster to BrowserWindow.getAllWindows()
- Task U.2.2: Verify multi-window broadcasting
- Task U.2.3: Test backpressure handling
- Task U.2.4: Add integration tests

### Tests
- [ ] Events broadcast to all windows
- [ ] Backpressure handled without freeze
- [ ] Event buffering works

### Files
- `rad-engineer/src/ui-adapter/EventBroadcaster.ts`
- Electron main process integration

### Wave Assignment
- UI Wave 1, Agent 2

---

## Story 23: Format Translation Enhancement

**ID**: UI-S3
**Points**: 5
**Agent**: developer
**Dependencies**: UI-S1

### Tasks
- Task U.3.1: Enhance toRadEngineerWave() parsing
- Task U.3.2: Extract stories from description
- Task U.3.3: Map priority/tags to Wave attributes
- Task U.3.4: Generate story dependencies
- Task U.3.5: Write translation tests

### Tests
- [ ] Description parsed into stories
- [ ] Priority mapped correctly
- [ ] Dependencies generated
- [ ] Full Wave object created

### Files
- `rad-engineer/src/ui-adapter/FormatTranslator.ts`
- `rad-engineer/test/ui-adapter/FormatTranslator.test.ts` (new)

### Wave Assignment
- UI Wave 1, Agent 3

---

## Progress Tracking

### Summary

| Wave | Stories | Points | Status |
|------|---------|--------|--------|
| Wave 1: Foundation | 3 | 11 | pending |
| Wave 2: Real Agent | 3 | 16 | pending |
| Wave 3: Observability | 3 | 13 | pending |
| Wave 4: Reliability | 4 | 14 | pending |
| Wave 5: Security | 3 | 16 | pending |
| Wave 6: Integration | 4 | 21 | pending |
| UI Integration | 3 | 16 | pending |
| **Total** | **23** | **107** | **pending** |

### Story Status Tracker

```
Wave 1: Foundation
  [ ] W1-S1: Install SDK (3 pts)
  [ ] W1-S2: Cross-platform Monitor (5 pts)
  [ ] W1-S3: Config System (3 pts)

Wave 2: Real Agent Integration
  [ ] W2-S1: Real agent spawning (8 pts) - depends: W1-S1, W1-S3
  [ ] W2-S2: Integration tests (5 pts) - depends: W2-S1
  [ ] W2-S3: Mock/real toggle (3 pts) - depends: W2-S1

Wave 3: Observability
  [ ] W3-S1: Structured logging (5 pts) - depends: W1-S3
  [ ] W3-S2: Prometheus metrics (5 pts) - depends: W1-S3
  [ ] W3-S3: Health checks (3 pts) - depends: W1-S3

Wave 4: Reliability
  [ ] W4-S1: StateManager.compact() (3 pts)
  [ ] W4-S2: File locking (3 pts) - depends: W4-S1
  [ ] W4-S3: Graceful shutdown (3 pts) - depends: W3-S1
  [ ] W4-S4: Distributed tracing (5 pts) - depends: W3-S1, W3-S2

Wave 5: Security Hardening
  [ ] W5-S1: Rate limiting (5 pts) - depends: W2-S1
  [ ] W5-S2: Audit persistence tests (3 pts) - depends: W3-S1
  [ ] W5-S3: Security audit (8 pts) - depends: W5-S1, W5-S2

Wave 6: Integration & Verification
  [ ] W6-S1: Full pipeline tests (8 pts) - depends: W2-S2, W4-S4
  [ ] W6-S2: Load testing (5 pts) - depends: W6-S1
  [ ] W6-S3: Chaos testing (5 pts) - depends: W6-S1
  [ ] W6-S4: Documentation (3 pts) - depends: W6-S2, W6-S3

UI Integration (Parallel)
  [ ] UI-S1: IPC registration (8 pts)
  [ ] UI-S2: EventBroadcaster (3 pts) - depends: UI-S1
  [ ] UI-S3: Format translation (5 pts) - depends: UI-S1
```

---

## Quality Gates

### Per-Story Gates

Every story must pass:
```bash
bun run typecheck  # 0 errors
bun run lint       # All rules pass
bun test           # All tests pass, coverage >= 80%
```

### Per-Wave Gates

Before proceeding to next wave:
- [ ] All stories in wave completed
- [ ] Integration tests pass
- [ ] No regressions in existing functionality
- [ ] Documentation updated

### Final Gate (Production Readiness)

- [ ] All 6 waves completed
- [ ] UI Integration completed
- [ ] Load test passes (100+ agents, <5% error rate)
- [ ] Security audit passes (no high/critical findings)
- [ ] Documentation complete
- [ ] Stakeholder sign-off

---

## Execution Instructions

### Starting Execution

```bash
# 1. Read this plan
cat docs/production-readiness/MASTER-IMPLEMENTATION-PLAN.md

# 2. Start Wave 1 (all 3 stories can run in parallel)
/execute wave=1

# 3. After Wave 1 completes, start Wave 2
/execute wave=2

# Continue through all waves...
```

### Resuming Execution

```bash
# Check current progress
cat docs/production-readiness/MASTER-IMPLEMENTATION-PLAN.md | grep -A 50 "Story Status"

# Resume from last incomplete wave
/execute resume
```

---

## Related Documents

- **Gap Analysis**: `docs/production-readiness/COMPREHENSIVE-GAP-ANALYSIS.yaml`
- **Risk Assessment**: `docs/production-readiness/RISK-ASSESSMENT.md`
- **Testing Requirements**: `docs/production-readiness/TESTING-REQUIREMENTS.md`
- **Original Plan**: `.claude/orchestration/docs/planning/PRODUCTION_READINESS_ACTION_PLAN.md`
- **UI Integration Plan**: `~/.claude/plans/stateless-petting-eclipse.md`
- **ESS Implementation**: `docs/platform-foundation/engg-support-system/IMPLEMENTATION-PLAN.md`

---

## Wave 7: Deployment & CLI (24 points, 4 stories, SEQUENTIAL)

---

## Story 24: OrbStack Container Configuration

**ID**: W7-S1
**Points**: 8
**Agent**: developer
**Dependencies**: W6-S4

### Tasks
- Task 7.1.1: Create Dockerfile for rad-engineer service
- Task 7.1.2: Create docker-compose.yml for OrbStack
- Task 7.1.3: Configure volume mounts for state persistence
- Task 7.1.4: Set up network configuration for ESS integration
- Task 7.1.5: Create OrbStack machine definition
- Task 7.1.6: Add health checks to container
- Task 7.1.7: Write container deployment tests
- Task 7.1.8: Document OrbStack setup process

### Tests
- [ ] Container builds successfully
- [ ] Container starts and passes health check
- [ ] Volume mounts persist state across restarts
- [ ] Network reaches ESS endpoint
- [ ] All services communicate correctly

### Verification
```bash
# Build container
docker build -t rad-engineer:latest .

# Test with OrbStack
orb start
docker-compose up -d
curl http://localhost:9090/health  # Should return 200
```

### Files
- `rad-engineer/Dockerfile` (new)
- `rad-engineer/docker-compose.yml` (new)
- `rad-engineer/.dockerignore` (new)
- `rad-engineer/docs/ORBSTACK_DEPLOYMENT.md` (new)

### Wave Assignment
- Wave 7, Agent 1

---

## Story 25: One-Command CLI Installation

**ID**: W7-S2
**Points**: 5
**Agent**: developer
**Dependencies**: W7-S1

### Tasks
- Task 7.2.1: Create install.sh script with auto-detection
- Task 7.2.2: Implement dependency checking (node, bun, docker)
- Task 7.2.3: Add configuration wizard for first-time setup
- Task 7.2.4: Handle API key configuration securely
- Task 7.2.5: Create uninstall.sh script
- Task 7.2.6: Add version management
- Task 7.2.7: Write installation tests
- Task 7.2.8: Create curl-based one-liner

### Tests
- [ ] Fresh install succeeds on macOS
- [ ] Fresh install succeeds on Linux
- [ ] Dependency check warns if missing
- [ ] API keys stored securely
- [ ] Uninstall removes all artifacts
- [ ] Upgrade preserves configuration

### Verification
```bash
# One-command installation
curl -fsSL https://raw.githubusercontent.com/umasankr/rad-engineer-v2/main/install.sh | bash

# Verify installation
rad-engineer --version
rad-engineer health
```

### Files
- `install.sh` (new, at repo root)
- `uninstall.sh` (new, at repo root)
- `rad-engineer/bin/rad-engineer` (new, CLI entry point)
- `rad-engineer/src/cli/index.ts` (new)
- `rad-engineer/src/cli/commands/` (new directory)

### Wave Assignment
- Wave 7, Agent 1 (sequential)

---

## Story 26: UI Support for New Projects

**ID**: W7-S3
**Points**: 5
**Agent**: developer
**Dependencies**: UI-S3, W7-S2

### Tasks
- Task 7.3.1: Create project initialization wizard in UI
- Task 7.3.2: Implement template selection (blank, web, api, fullstack)
- Task 7.3.3: Add project configuration form
- Task 7.3.4: Wire create-project IPC channel
- Task 7.3.5: Implement project scaffolding
- Task 7.3.6: Add Git initialization option
- Task 7.3.7: Write project creation tests
- Task 7.3.8: Create project templates

### Tests
- [ ] Wizard collects all required info
- [ ] Templates scaffold correctly
- [ ] Git repository initialized if selected
- [ ] Project structure valid
- [ ] Configuration saved correctly

### Verification
```bash
# Via CLI
rad-engineer init --name my-project --template web

# Via UI
# Click "New Project" → Select template → Configure → Create
```

### Files
- `workspaces/rad-engineer-ui/apps/frontend/src/components/ProjectWizard.tsx` (new)
- `rad-engineer/src/cli/commands/init.ts` (new)
- `rad-engineer/templates/` (new directory)
- `rad-engineer/src/project/scaffolder.ts` (new)

### Wave Assignment
- Wave 7, Agent 2

---

## Story 27: UI Support for Existing Projects

**ID**: W7-S4
**Points**: 6
**Agent**: developer
**Dependencies**: UI-S3, W7-S2

### Tasks
- Task 7.4.1: Create project import dialog in UI
- Task 7.4.2: Implement project detection (package.json, .git, etc.)
- Task 7.4.3: Add codebase analysis integration (ESS)
- Task 7.4.4: Create project configuration wizard for existing code
- Task 7.4.5: Wire import-project IPC channel
- Task 7.4.6: Implement project indexing trigger
- Task 7.4.7: Write project import tests
- Task 7.4.8: Create project dashboard view

### Tests
- [ ] Project detection identifies type correctly
- [ ] Import preserves existing configuration
- [ ] ESS indexing triggered on import
- [ ] Dashboard shows project status
- [ ] Multiple projects can be imported

### Verification
```bash
# Via CLI
cd /path/to/existing-project
rad-engineer import .

# Via UI
# Click "Import Project" → Browse → Select folder → Configure → Import
```

### Files
- `workspaces/rad-engineer-ui/apps/frontend/src/components/ProjectImport.tsx` (new)
- `rad-engineer/src/cli/commands/import.ts` (new)
- `rad-engineer/src/project/detector.ts` (new)
- `rad-engineer/src/project/indexer.ts` (new)

### Wave Assignment
- Wave 7, Agent 2 (sequential)

---

## Wave 8: Production Validation (16 points, 3 stories, SEQUENTIAL)

---

## Story 28: Production Validation Suite

**ID**: W8-S1
**Points**: 8
**Agent**: test-writer
**Dependencies**: W7-S1, W7-S2

### Tasks
- Task 8.1.1: Create production validation script
- Task 8.1.2: Implement API connectivity check
- Task 8.1.3: Implement resource availability check
- Task 8.1.4: Implement security configuration check
- Task 8.1.5: Implement integration health check
- Task 8.1.6: Add ESS connectivity verification
- Task 8.1.7: Create comprehensive validation report
- Task 8.1.8: Implement automated remediation suggestions

### Tests
- [ ] All connectivity checks pass
- [ ] Resource thresholds validated
- [ ] Security configuration correct
- [ ] Integrations healthy
- [ ] Report generated with actionable items

### Verification
```bash
# Run production validation
rad-engineer validate --production

# Expected output:
# ✓ API Connectivity: PASS
# ✓ Resource Availability: PASS
# ✓ Security Configuration: PASS
# ✓ Integration Health: PASS
# ✓ ESS Connection: PASS
#
# Production Readiness: READY
```

### Files
- `rad-engineer/src/cli/commands/validate.ts` (new)
- `rad-engineer/src/validation/production.ts` (new)
- `rad-engineer/src/validation/checks/` (new directory)
- `rad-engineer/test/validation/production.test.ts` (new)

### Wave Assignment
- Wave 8, Agent 1

---

## Story 29: Local Deployment Automation

**ID**: W8-S2
**Points**: 5
**Agent**: developer
**Dependencies**: W8-S1

### Tasks
- Task 8.2.1: Create `rad-engineer deploy local` command
- Task 8.2.2: Implement automatic OrbStack detection
- Task 8.2.3: Add container orchestration via docker-compose
- Task 8.2.4: Implement service health waiting
- Task 8.2.5: Create deployment status reporting
- Task 8.2.6: Add rollback capability
- Task 8.2.7: Write deployment automation tests

### Tests
- [ ] OrbStack detected automatically
- [ ] Containers start in correct order
- [ ] Health checks pass before reporting success
- [ ] Rollback works on failure
- [ ] Status accurately reflects deployment state

### Verification
```bash
# One-command local deployment
rad-engineer deploy local

# Expected output:
# → Detecting OrbStack... found
# → Building containers... done
# → Starting services... done
# → Waiting for health... healthy
#
# Local deployment complete!
# Dashboard: http://localhost:3000
# API: http://localhost:8080
# Metrics: http://localhost:9090
```

### Files
- `rad-engineer/src/cli/commands/deploy.ts` (new)
- `rad-engineer/src/deployment/local.ts` (new)
- `rad-engineer/src/deployment/orchestrator.ts` (new)

### Wave Assignment
- Wave 8, Agent 1 (sequential)

---

## Story 30: End-to-End Production Smoke Tests

**ID**: W8-S3
**Points**: 3
**Agent**: test-writer
**Dependencies**: W8-S2

### Tasks
- Task 8.3.1: Create production smoke test suite
- Task 8.3.2: Test UI project creation flow
- Task 8.3.3: Test CLI project import flow
- Task 8.3.4: Test agent execution flow
- Task 8.3.5: Test checkpoint/recovery flow
- Task 8.3.6: Generate production readiness certificate

### Tests
- [ ] UI project creation succeeds
- [ ] CLI project import succeeds
- [ ] Agent execution completes
- [ ] Checkpoint created and recovered
- [ ] All smoke tests pass

### Verification
```bash
# Run smoke tests
rad-engineer test --smoke

# Expected output:
# ✓ Project Creation: PASS
# ✓ Project Import: PASS
# ✓ Agent Execution: PASS
# ✓ Checkpoint/Recovery: PASS
#
# Production Smoke Tests: ALL PASS
```

### Files
- `rad-engineer/test/smoke/production.test.ts` (new)
- `rad-engineer/test/smoke/ui-flows.test.ts` (new)
- `rad-engineer/test/smoke/cli-flows.test.ts` (new)

### Wave Assignment
- Wave 8, Agent 2

---

## Updated Progress Tracking

### Summary (Updated)

| Wave | Stories | Points | Status |
|------|---------|--------|--------|
| Wave 1: Foundation | 3 | 11 | pending |
| Wave 2: Real Agent | 3 | 16 | pending |
| Wave 3: Observability | 3 | 13 | pending |
| Wave 4: Reliability | 4 | 14 | pending |
| Wave 5: Security | 3 | 16 | pending |
| Wave 6: Integration | 4 | 21 | pending |
| Wave 7: Deployment & CLI | 4 | 24 | pending |
| Wave 8: Production Validation | 3 | 16 | pending |
| UI Integration | 3 | 16 | pending |
| **Total** | **30** | **147** | **pending** |

### Story Status Tracker (Updated)

```
Wave 1: Foundation
  [ ] W1-S1: Install SDK (3 pts)
  [ ] W1-S2: Cross-platform Monitor (5 pts)
  [ ] W1-S3: Config System (3 pts)

Wave 2: Real Agent Integration
  [ ] W2-S1: Real agent spawning (8 pts) - depends: W1-S1, W1-S3
  [ ] W2-S2: Integration tests (5 pts) - depends: W2-S1
  [ ] W2-S3: Mock/real toggle (3 pts) - depends: W2-S1

Wave 3: Observability
  [ ] W3-S1: Structured logging (5 pts) - depends: W1-S3
  [ ] W3-S2: Prometheus metrics (5 pts) - depends: W1-S3
  [ ] W3-S3: Health checks (3 pts) - depends: W1-S3

Wave 4: Reliability
  [ ] W4-S1: StateManager.compact() (3 pts)
  [ ] W4-S2: File locking (3 pts) - depends: W4-S1
  [ ] W4-S3: Graceful shutdown (3 pts) - depends: W3-S1
  [ ] W4-S4: Distributed tracing (5 pts) - depends: W3-S1, W3-S2

Wave 5: Security Hardening
  [ ] W5-S1: Rate limiting (5 pts) - depends: W2-S1
  [ ] W5-S2: Audit persistence tests (3 pts) - depends: W3-S1
  [ ] W5-S3: Security audit (8 pts) - depends: W5-S1, W5-S2

Wave 6: Integration & Verification
  [ ] W6-S1: Full pipeline tests (8 pts) - depends: W2-S2, W4-S4
  [ ] W6-S2: Load testing (5 pts) - depends: W6-S1
  [ ] W6-S3: Chaos testing (5 pts) - depends: W6-S1
  [ ] W6-S4: Documentation (3 pts) - depends: W6-S2, W6-S3

Wave 7: Deployment & CLI
  [ ] W7-S1: OrbStack container (8 pts) - depends: W6-S4
  [ ] W7-S2: One-command CLI (5 pts) - depends: W7-S1
  [ ] W7-S3: UI new projects (5 pts) - depends: UI-S3, W7-S2
  [ ] W7-S4: UI existing projects (6 pts) - depends: UI-S3, W7-S2

Wave 8: Production Validation
  [ ] W8-S1: Validation suite (8 pts) - depends: W7-S1, W7-S2
  [ ] W8-S2: Local deployment automation (5 pts) - depends: W8-S1
  [ ] W8-S3: Production smoke tests (3 pts) - depends: W8-S2

UI Integration (Parallel)
  [ ] UI-S1: IPC registration (8 pts)
  [ ] UI-S2: EventBroadcaster (3 pts) - depends: UI-S1
  [ ] UI-S3: Format translation (5 pts) - depends: UI-S1
```

---

## Final Quality Gates

### Production Readiness Checklist

- [ ] All 30 stories completed
- [ ] All 8 waves verified
- [ ] 80%+ test coverage achieved
- [ ] Load test passes (100+ agents, <5% error rate)
- [ ] Security audit passes (no high/critical findings)
- [ ] UI integration functional with new/existing projects
- [ ] CLI one-command installation works
- [ ] OrbStack local deployment works
- [ ] Production validation suite passes
- [ ] Smoke tests pass
- [ ] Documentation complete
- [ ] Stakeholder sign-off obtained

### One-Command Validation

```bash
# Complete production validation in one command
rad-engineer validate --production --full

# This runs:
# 1. Unit tests (bun test)
# 2. Integration tests (bun test:integration)
# 3. Security audit (bun audit)
# 4. Production validation checks
# 5. Smoke tests
# 6. Generates comprehensive report
```

---

**Document Version**: 2.0.0
**Last Updated**: 2026-01-14
**Status**: READY_FOR_EXECUTION
