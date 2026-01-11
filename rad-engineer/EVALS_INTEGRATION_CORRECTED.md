# EVALS Integration Plan - CORRECTED
## Based on Actual Codebase State

**Date**: 2026-01-06 (Revised after code review)
**Previous Plan Issues**: Assumed /execute skill existed, misunderstood architecture

---

## Actual Architecture (Evidence-Based)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                           │
│                                                                     │
│  User invokes commands (CLI, skills, API)                           │
│      │                                                              │
│      ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   WaveOrchestrator                              ││
│  │  - Orchestrates multiple tasks in waves                        ││
│  │  - Manages resource limits                                     ││
│  │  - Resolves dependencies                                       ││
│  │  - Currently: executeTask() is MOCKED ← NEEDS FIX             ││
│  └─────────────────────────────┬───────────────────────────────────┘│
│                                │ should call                        │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   SDKIntegration                               ││
│  │  - Wraps Claude Agent SDK                                      ││
│  │  - Executes single agent tasks                                ││
│  │  - Has ProviderFactory integration point ← EVALS hooks here    ││
│  │  - Currently: hardcoded claude-3-5-sonnet ← NEEDS EVALS       ││
│  └─────────────────────────────┬───────────────────────────────────┘│
│                                │ uses                               │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   ProviderFactory                              ││
│  │  - Manages 40+ provider adapters                              ││
│  │  - Has EVALS integration methods (already added)               ││
│  │  - Currently: EVALS not enabled by default                     ││
│  └─────────────────────────────┬───────────────────────────────────┘│
│                                │ routes via                        │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   EVALS System (DONE)                          ││
│  │  - BanditRouter: Thompson Sampling                            ││
│  │  - PerformanceStore: Historical metrics                       ││
│  │  - QueryFeatureExtractor: Feature extraction                  ││
│  │  - EvaluationLoop: Quality feedback                           ││
│  │  - Status: ✅ Implemented (75 tests passing)                  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## What Actually Needs Integration

### Step 1: Fix WaveOrchestrator.executeTask() (CRITICAL)

**Problem**: WaveOrchestrator has mocked executeTask() - line 336

**Solution**: Connect to SDKIntegration for real execution

```typescript
// src/advanced/WaveOrchestrator.ts

export class WaveOrchestrator {
  private readonly sdk: SDKIntegration; // ← Add this

  constructor(config: {
    resourceManager: ResourceManager;
    promptValidator: PromptValidator;
    responseParser: ResponseParser;
    sdk: SDKIntegration; // ← Add SDKIntegration
  }) {
    this.resourceManager = config.resourceManager;
    this.promptValidator = config.promptValidator;
    this.responseParser = config.responseParser;
    this.sdk = config.sdk; // ← Store SDK
  }

  private async executeTask(task: Task): Promise<TaskResult> {
    // NEW: Real execution via SDKIntegration
    const agentTask: AgentTask = {
      version: "1.0",
      prompt: task.prompt,
    };

    const result = await this.sdk.testAgent(agentTask);

    // Parse response
    const response = await this.responseParser.parse(result.agentResponse);

    return {
      id: task.id,
      success: result.success,
      response: response,
    };
  }
}
```

**Estimated Time**: 2 hours
**Priority**: CRITICAL - WaveOrchestrator is non-functional without this

---

### Step 2: Enable EVALS in SDKIntegration (HIGH)

**Problem**: SDKIntegration hardcodes claude-3-5-sonnet, line 167

**Solution**: Use ProviderFactory with EVALS routing

```typescript
// src/sdk/SDKIntegration.ts

export class SDKIntegration {
  private client: Anthropic | null = null;
  private providerFactory?: ProviderFactory; // ← Add
  private evalsEnabled = false;

  constructor(providerFactory?: ProviderFactory) { // ← Accept factory
    this.resourceMonitor = new ResourceMonitor();
    this.providerFactory = providerFactory;
  }

  async testAgent(task: AgentTask): Promise<TestResult> {
    // ... existing validation ...

    // NEW: EVALS routing
    let providerResponse;
    
    if (this.evalsEnabled && this.providerFactory?.isEvalsRoutingEnabled()) {
      // Route via EVALS
      const { provider, decision } = await this.providerFactory.routeProvider(task.prompt);
      
      // Execute with selected provider
      providerResponse = await provider.createChat({
        messages: [{ role: "user", content: task.prompt }],
        tools: this.getDefaultTools(),
      });

      // Record feedback
      await this.recordEvalsFeedback(task, providerResponse, decision);
    } else {
      // Fallback to hardcoded Anthropic (current behavior)
      providerResponse = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: task.prompt }],
        tools: this.getDefaultTools(),
      });
    }

    // Convert to TestResult...
  }
}
```

**Estimated Time**: 2 hours
**Priority**: HIGH - enables intelligent provider selection

---

### Step 3: Provider Availability Filter (CRITICAL)

**Problem**: EVALS can select providers without API keys

**Solution**: Add availability checking before routing

(Detailed in EVALS_INTEGRATION_PLAN.md Step 0)

**Estimated Time**: 3 hours
**Priority**: CRITICAL - prevents runtime failures

---

### Step 4: ErrorRecoveryEngine Integration (MEDIUM)

**Problem**: ErrorRecoveryEngine doesn't use EVALS for provider fallback

**Solution**: Query EVALS for alternative providers on retry

```typescript
// src/advanced/ErrorRecoveryEngine.ts

async executeWithRetry<T>(
  operation: () => Promise<T>,
  context: { task: string; provider: string }
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // NEW: Ask EVALS for alternative provider
      if (this.providerFactory?.isEvalsRoutingEnabled()) {
        // Record failure
        await this.recordFailure(context.provider, context.task);
        
        // Get alternative
        const { provider, decision } = await this.providerFactory.routeProvider(context.task);
        context.provider = decision.provider;
        
        // Retry with new provider
        continue;
      }
      throw error;
    }
  }
}
```

**Estimated Time**: 2 hours
**Priority**: MEDIUM - improves resilience

---

### Step 5: CLI Commands (LOW)

**Problem**: No way to view/manipulate EVALS state

**Solution**: Add CLI commands

(Detailed in EVALS_INTEGRATION_PLAN.md CLI section)

**Estimated Time**: 2 hours
**Priority**: LOW - nice to have, not critical

---

### Step 6: Integration Tests (HIGH)

**Problem**: No end-to-end tests for EVALS integration

**Solution**: Test full pipeline

```typescript
// test/integration/evals-full-pipeline.test.ts

describe("EVALS Full Pipeline", () => {
  it("should route wave execution through EVALS", async () => {
    const factory = new ProviderFactory({
      providers: {
        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
        glm: { apiKey: process.env.GLM_API_KEY },
      },
    });

    const evals = await EvalsFactory.initialize(factory);
    const sdk = new SDKIntegration(factory);
    sdk.enableEvalsRouting();

    const orchestrator = new WaveOrchestrator({
      resourceManager,
      promptValidator,
      responseParser,
      sdk, // ← Connect SDK with EVALS
    });

    // Execute tasks
    const result = await orchestrator.executeWave([
      { id: "1", prompt: "Write a function" },
      { id: "2", prompt: "Write tests" },
    ]);

    // Verify EVALS was used
    expect(result.tasks[0].provider).toBeDefined();
    expect(result.totalSuccess).toBe(2);
  });
});
```

**Estimated Time**: 3 hours
**Priority**: HIGH - validates integration works

---

## Corrected Implementation Steps

| Step | Task | Time | Priority | Dependency |
|------|------|------|----------|------------|
| 0 | Provider Availability Filter | 3h | **CRITICAL** | None |
| 1 | Fix WaveOrchestrator.executeTask() | 2h | **CRITICAL** | None |
| 2 | Enable EVALS in SDKIntegration | 2h | HIGH | Step 0 |
| 3 | ErrorRecoveryEngine integration | 2h | MEDIUM | Step 2 |
| 4 | Integration tests | 3h | HIGH | Steps 1-2 |
| 5 | CLI commands | 2h | LOW | Step 2 |
| **Total** | | **14h** | | |

---

## What Was REMOVED from Original Plan

### ❌ "/execute skill" - DOES NOT EXIST
- Original plan assumed a skill file at `.claude/skills/execute.md`
- Reality: No such file exists
- Execution happens through SDKIntegration directly

### ❌ Separate "WaveOrchestrator integration" step
- Original plan treated WaveOrchestrator as fully implemented
- Reality: WaveOrchestrator.executeTask() is MOCKED
- Need to implement real execution, not "integrate"

### ❌ Multiple redundant integration points
- Original plan had SDKIntegration + WaveOrchestrator + /execute as separate
- Reality: WaveOrchestrator → SDKIntegration → ProviderFactory → EVALS (chain)

---

## Summary

**Original Plan**: 19 hours, included non-existent /execute skill
**Corrected Plan**: 14 hours, focuses on actual code

**Critical Changes**:
1. Removed /execute skill (doesn't exist)
2. Added WaveOrchestrator.executeTask() implementation (was mocked)
3. Clarified architecture: WaveOrchestrator → SDKIntegration → EVALS
4. Added Provider Availability Filter (prevents crashes)

**Next Step**: Start with Step 0 (Provider Availability) or Step 1 (WaveOrchestrator)?

