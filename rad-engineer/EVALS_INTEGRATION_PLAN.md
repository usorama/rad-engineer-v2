# EVALS System Integration Plan
## Self-Learning EVALS System → Smart Orchestrator Integration

**Date**: 2026-01-06
**Status**: Implementation Complete, Integration Pending
**Commit**: e8e3581 (32 files, 8225 lines added)

---

## Executive Summary

The Self-Learning EVALS System has been fully implemented with 75 tests passing. Now we need to integrate it with the rest of the Smart Orchestrator system to enable intelligent provider routing for all agent operations.

**Current State**:
- ✅ EVALS system implemented (100% feature complete)
- ✅ ProviderFactory integration added
- ❌ SDKIntegration not using EVALS routing
- ❌ No /execute skill to leverage EVALS
- ❌ No feedback loop from agent execution to EVALS store

**Target State**:
- All agent operations route through EVALS for provider selection
- Automatic quality feedback from every agent execution
- /execute skill leverages EVALS for optimal provider selection
- Continuous learning from real agent performance

---

## Architecture Overview: Integrated System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SMART ORCHESTRATOR                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Command: /execute "Implement X"                                    │
│      │                                                                   │
│      ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    IntakeHandler (Plan Phase)                   │   │
│  │  - Parse user request                                            │   │
│  │  - Extract requirements                                          │   │
│  │  - Classify task type (code, research, design)                   │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                             │                                             │
│                             ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              ExecutionPlanGenerator (Plan Phase)                 │   │
│  │  - Generate execution plan with stories                          │   │
│  │  - Estimate complexity                                           │   │
│  │  - Determine required capabilities                               │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                             │                                             │
│                             ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  WaveOrchestrator (Execute Phase)                │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │         EVALS Routing Decision (NEW INTEGRATION)           │ │   │
│  │  │  1. Extract query features from story description           │ │   │
│  │  │  2. Route via BanditRouter → optimal provider               │ │   │
│  │  │  3. Execute story with selected provider                   │ │   │
│  │  │  4. Evaluate response quality                              │ │   │
│  │  │  5. Update PerformanceStore with feedback                   │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  For each story in wave:                                         │   │
│  │    1. Query EVALS for optimal provider                          │   │
│  │    2. Spawn agent via SDKIntegration → selected provider        │   │
│  │    3. Monitor execution (ResourceManager)                       │   │
│  │    4. Evaluate result (EvaluationLoop)                          │   │
│  │    5. Update EVALS store (PerformanceStore)                     │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                             │                                             │
│                             ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   ErrorRecoveryEngine (Recovery)                 │   │
│  │  - Retry with alternative provider (query EVALS again)           │   │
│  │  - Circuit breaker per provider (EVALS tracks success rate)     │   │
│  │  - Saga pattern for multi-story transactions                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. SDKIntegration + ProviderFactory Integration

**File**: `src/sdk/SDKIntegration.ts`

**Current Behavior**:
- Hardcodes `claude-3-5-sonnet-20241022` for all agent execution
- No intelligent provider selection
- No learning from execution results

**Required Changes**:

```typescript
export class SDKIntegration {
  private client: Anthropic | null = null;
  private resourceMonitor: ResourceMonitor;
  private streamingEnabled = false;
  private hooksRegistered = false;

  // NEW: EVALS integration
  private providerFactory?: ProviderFactory; // ← Add this
  private evalsEnabled = false;

  constructor(providerFactory?: ProviderFactory) { // ← Accept ProviderFactory
    this.resourceMonitor = new ResourceMonitor();
    this.providerFactory = providerFactory; // ← Store it
  }

  // NEW: Enable EVALS routing
  enableEvalsRouting(): void {
    this.evalsEnabled = true;
  }

  async testAgent(task: AgentTask): Promise<TestResult> {
    // ... existing validation ...

    // NEW: EVALS routing decision
    let providerId = "anthropic"; // default fallback
    let model = "claude-3-5-sonnet-20241022";

    if (this.evalsEnabled && this.providerFactory?.hasEvalsRouting()) {
      // Extract features from prompt
      const features = this.providerFactory.extractFeatures(task.prompt);

      // Route via EVALS
      const decision = await this.providerFactory.routeViaEvals(features);

      providerId = decision.provider;
      model = decision.model;

      console.log(`[EVALS] Routed to ${providerId}/${model} (confidence: ${decision.confidence.toFixed(2)})`);
    }

    // NEW: Use selected provider instead of hardcoded Anthropic
    const provider = await this.providerFactory.getProvider(providerId);
    const response = await provider.execute({
      model,
      messages: [{ role: "user", content: task.prompt }],
      tools,
      stream: this.streamingEnabled,
    });

    // NEW: Evaluate and update EVALS store
    if (this.evalsEnabled && response.success) {
      await this.providerFactory.recordEvalsFeedback(
        task.prompt,
        response.agentResponse,
        providerId,
        model,
        {
          cost: response.cost || 0,
          latency: response.duration,
          success: response.success,
        }
      );
    }

    return response;
  }
}
```

**Benefits**:
- Automatic provider selection based on task characteristics
- Continuous learning from every agent execution
- Cost optimization (rout simple tasks to cheaper providers)
- Quality optimization (route complex tasks to best providers)

---

### 2. WaveOrchestrator Integration

**File**: `src/advanced/WaveOrchestrator.ts`

**Current Behavior**:
- Orchestrates multiple agent stories in waves
- No intelligent provider selection per story

**Required Changes**:

```typescript
export class WaveOrchestrator {
  private sdk: SDKIntegration;
  private resourceManager: ResourceManager;
  private providerFactory?: ProviderFactory; // ← Add EVALS access

  constructor(
    sdk: SDKIntegration,
    resourceManager: ResourceManager,
    providerFactory?: ProviderFactory // ← Accept ProviderFactory
  ) {
    this.sdk = sdk;
    this.resourceManager = resourceManager;
    this.providerFactory = providerFactory;
  }

  async executeWave(stories: Story[]): Promise<WaveResult> {
    const results: StoryResult[] = [];

    for (const story of stories) {
      // NEW: EVALS routing per story
      let providerId = "anthropic";
      let model = "claude-3-5-sonnet-20241022";

      if (this.providerFactory?.hasEvalsRouting()) {
        const features = this.providerFactory.extractFeatures(story.description);
        const decision = await this.providerFactory.routeViaEvals(features);

        providerId = decision.provider;
        model = decision.model;

        console.log(`[EVALS] Story "${story.name}" → ${providerId}/${model}`);
      }

      // Execute story with selected provider
      const result = await this.executeStory(story, providerId, model);
      results.push(result);

      // NEW: Update EVALS with feedback
      if (this.providerFactory) {
        await this.providerFactory.recordEvalsFeedback(
          story.description,
          result.output,
          providerId,
          model,
          {
            cost: result.cost,
            latency: result.duration,
            success: result.success,
          }
        );
      }
    }

    return { stories: results };
  }
}
```

**Benefits**:
- Each story routes to optimal provider
- Parallel stories can use different providers
- Cost optimization across entire wave
- Fine-grained performance tracking per story type

---

### 3. /execute Skill Implementation

**File**: `.claude/skills/execute.md` (NEW)

**Purpose**: User-facing skill that leverages EVALS for autonomous execution

**Workflow**:

```
User: /execute "Implement user authentication with JWT"

1. IntakeHandler parses request
   - Extract: "Implement user authentication with JWT"
   - Classify: Code domain, high complexity
   - Features: { domain: "code", complexityScore: 0.8 }

2. ExecutionPlanGenerator generates plan
   - Stories: [Design schema, Implement backend, Add tests, Write docs]
   - Estimate: 4 stories, medium difficulty

3. WaveOrchestrator queries EVALS for each story
   - Story 1 (Design): → anthropic/claude-3-5-sonnet (high quality needed)
   - Story 2 (Implement): → glm/glm-4.7 (code generation, good value)
   - Story 3 (Tests): → glm/glm-4.7 (test writing, cost-effective)
   - Story 4 (Docs): → openai/gpt-4o-mini (documentation, fast/cheap)

4. Execute each story with selected provider
   - Monitor via ResourceManager
   - Evaluate results via EvaluationLoop
   - Update PerformanceStore with feedback

5. Return results to user
   - Show provider used per story
   - Show cost/quality metrics
   - Show EVALS confidence scores
```

**Implementation**:

```typescript
// .claude/skills/execute.md

## Execute Skill - Autonomous Implementation with EVALS

**Trigger**: `/execute [task description]`

**Purpose**: Execute autonomous implementation tasks using EVALS for optimal provider selection

**Workflow**:

### Phase 1: Intake (IntakeHandler)
1. Parse user request
2. Extract requirements
3. Classify task domain and complexity
4. Extract features for EVALS routing

### Phase 2: Planning (ExecutionPlanGenerator)
1. Generate execution plan with stories
2. Estimate story complexity
3. Determine dependencies
4. Calculate resource requirements

### Phase 3: Execution (WaveOrchestrator + EVALS)
For each story in plan:
  1. Extract features from story description
  2. Query EVALS BanditRouter for optimal provider
  3. Execute story with selected provider
  4. Evaluate response quality
  5. Update EVALS PerformanceStore with feedback

### Phase 4: Recovery (ErrorRecoveryEngine)
- Retry failures with alternative provider (re-query EVALS)
- Circuit breaker per provider
- Saga pattern for rollback

### Phase 5: Response
- Summary of implementation
- Provider used per story
- Cost and quality metrics
- EVALS confidence scores

**Configuration**:

```yaml
# ~/.config/rad-engineer/execute.yaml
evals:
  enabled: true
  explorationRate: 0.10
  qualityThreshold: 0.7

execution:
  maxConcurrentStories: 3
  timeoutPerStory: 300000  # 5 minutes
  retriesPerStory: 3

providers:
  # Provider selection is automatic via EVALS
  # But can override for specific story types:
  codeGeneration:
    prefer: ["glm", "anthropic"]
  documentation:
    prefer: ["openai", "anthropic"]
  testing:
    prefer: ["glm", "ollama"]
```

**Example Output**:

```
✅ Executed: Implement user authentication with JWT

## Implementation Summary

Generated 4 stories, executed 4 successfully

### Stories Executed

1. ✅ Design JWT authentication schema
   Provider: anthropic/claude-3-5-sonnet-20241022
   Duration: 2.3s | Cost: $0.008 | Quality: 0.92
   EVALS Confidence: 0.88 | Exploit (not explore)

2. ✅ Implement backend authentication logic
   Provider: glm/glm-4.7
   Duration: 3.1s | Cost: $0.002 | Quality: 0.85
   EVALS Confidence: 0.82 | Exploit (not explore)

3. ✅ Write unit tests for authentication
   Provider: glm/glm-4.7
   Duration: 2.8s | Cost: $0.001 | Quality: 0.89
   EVALS Confidence: 0.79 | Exploit (not explore)

4. ✅ Write API documentation
   Provider: openai/gpt-4o-mini
   Duration: 1.2s | Cost: $0.0005 | Quality: 0.87
   EVALS Confidence: 0.91 | Explore (trying new provider)

### Overall Metrics

Total Cost: $0.0115 | Total Duration: 9.4s
Average Quality: 0.88 | Success Rate: 100%

### EVALS Learning

PerformanceStore updated with 4 new data points:
- anthropic/claude-3-5-sonnet: +1 success (code domain)
- glm/glm-4.7: +2 successes (code domain)
- openai/gpt-4o-mini: +1 success (general domain)

State version: 2026-01-06T20:30:45.123Z
```

**Benefits**:
- Automatic optimal provider selection per task
- Cost optimization without manual configuration
- Quality optimization based on historical performance
- Continuous learning from every execution
- Full transparency of routing decisions

---

### 4. ErrorRecoveryEngine Integration

**File**: `src/advanced/ErrorRecoveryEngine.ts`

**Current Behavior**:
- Fixed retry logic
- No provider fallback

**Required Changes**:

```typescript
export class ErrorRecoveryEngine {
  constructor(
    private sdk: SDKIntegration,
    private providerFactory?: ProviderFactory // ← Add EVALS access
  ) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { story: string; provider: string; model: string }
  ): Promise<T> {
    let lastError: Error;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // NEW: Query EVALS for alternative provider
        if (this.providerFactory?.hasEvalsRouting() && attempt < maxRetries - 1) {
          // Mark current provider as failed for this context
          await this.providerFactory.recordEvalsFeedback(
            context.story,
            "",
            context.provider,
            context.model,
            { success: false, cost: 0, latency: 0 }
          );

          // Get alternative provider
          const features = this.providerFactory.extractFeatures(context.story);
          const decision = await this.providerFactory.routeViaEvals(features);

          console.log(`[EVALS] Retry ${attempt + 1}: Switching to ${decision.provider}/${decision.model}`);

          // Update context for next retry
          context.provider = decision.provider;
          context.model = decision.model;

          // Continue to retry with new provider
          continue;
        }

        // No EVALS or last attempt - fail
        throw error;
      }
    }

    throw lastError!;
  }
}
```

**Benefits**:
- Automatic provider fallback on failure
- Circuit breaker pattern (EVALS tracks failure rates)
- Respects cost/quality constraints during retries
- Learns from failures to avoid repeat mistakes

---

### 5. CLI Commands Integration

**File**: `src/cli/index.ts`

**New Commands**:

```bash
# Enable EVALS for a project
rad-engineer evals enable

# View performance stats
rad-engineer evals stats

# Compare providers
rad-engineer evals compare anthropic claude-3-5-sonnet glm glm-4.7

# Reset performance store
rad-engineer evals reset --confirm

# Export metrics
rad-engineer evals export --format json > metrics.json

# View routing decision for a query
rad-engineer evals route "Write a function to sort an array"
```

**Implementation**:

```typescript
// src/cli/index.ts
import { EvalsFactory } from "../adaptive/index.js";
import { ProviderFactory } from "../sdk/providers/index.js";

export const cliCommands = {
  evals: {
    async enable() {
      const factory = new ProviderFactory();
      const evals = await EvalsFactory.initialize(factory);

      console.log("✅ EVALS enabled for this project");
      console.log(`   Exploration rate: ${evals.router.getExplorationRate()}`);
      console.log(`   Quality threshold: ${evals.evaluation.getConfig().qualityThreshold}`);
    },

    async stats() {
      const factory = new ProviderFactory();
      const evals = await EvalsFactory.initialize(factory);

      const stats = evals.evaluation.getStats();
      console.log(`\n📊 EVALS Statistics`);
      console.log(`   Total evaluations: ${stats.totalEvaluations}`);
      console.log(`   Average quality: ${stats.averageQuality.toFixed(2)}`);
      console.log(`   Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    },

    async compare(provider1: string, model1: string, provider2: string, model2: string) {
      const factory = new ProviderFactory();
      const evals = await EvalsFactory.initialize(factory);

      const comparison = evals.router.compareProviders(
        provider1, model1,
        provider2, model2
      );

      console.log(`\n📊 Provider Comparison`);
      console.log(`   ${provider1}/${model1}:`);
      console.log(`     Quality: ${comparison.provider1.avgQuality.toFixed(2)}`);
      console.log(`     Cost: $${comparison.provider1.avgCost.toFixed(4)}`);
      console.log(`   ${provider2}/${model2}:`);
      console.log(`     Quality: ${comparison.provider2.avgQuality.toFixed(2)}`);
      console.log(`     Cost: $${comparison.provider2.avgCost.toFixed(4)}`);
    },

    async route(query: string) {
      const factory = new ProviderFactory();
      const evals = await EvalsFactory.initialize(factory);

      const features = evals.featureExtractor.extract(query);
      const decision = await evals.router.route(features);

      console.log(`\n🔀 Routing Decision`);
      console.log(`   Query: "${query}"`);
      console.log(`   Domain: ${features.domain}`);
      console.log(`   Complexity: ${features.complexityScore.toFixed(2)}`);
      console.log(`   Selected: ${decision.provider}/${decision.model}`);
      console.log(`   Confidence: ${decision.confidence.toFixed(2)}`);
      console.log(`   Exploration: ${decision.exploration ? "Yes" : "No"}`);
    },
  },
};
```

---

## Implementation Steps

### Step 1: SDKIntegration Integration (2 hours)
- [ ] Add ProviderFactory parameter to SDKIntegration constructor
- [ ] Add `enableEvalsRouting()` method
- [ ] Modify `testAgent()` to use EVALS routing
- [ ] Add feedback recording after execution
- [ ] Write tests for EVALS-enabled SDKIntegration

### Step 2: WaveOrchestrator Integration (2 hours)
- [ ] Add ProviderFactory parameter to WaveOrchestrator constructor
- [ ] Modify `executeWave()` to route each story via EVALS
- [ ] Add feedback recording per story
- [ ] Write tests for EVALS-enabled WaveOrchestrator

### Step 3: /execute Skill (4 hours)
- [ ] Create `.claude/skills/execute.md` skill definition
- [ ] Implement skill trigger and workflow
- [ ] Connect IntakeHandler → ExecutionPlanGenerator → WaveOrchestrator
- [ ] Add EVALS routing per story
- [ ] Add result formatting with EVALS metrics
- [ ] Write skill tests

### Step 4: ErrorRecoveryEngine Integration (2 hours)
- [ ] Add ProviderFactory parameter to ErrorRecoveryEngine constructor
- [ ] Modify `executeWithRetry()` to query EVALS for alternative providers
- [ ] Add failure recording to EVALS store
- [ ] Write tests for EVALS-aware error recovery

### Step 5: CLI Commands (2 hours)
- [ ] Implement `rad-engineer evals enable`
- [ ] Implement `rad-engineer evals stats`
- [ ] Implement `rad-engineer evals compare`
- [ ] Implement `rad-engineer evals route`
- [ ] Write CLI tests

### Step 6: End-to-End Testing (4 hours)
- [ ] Write integration test: /execute → EVALS routing → provider selection
- [ ] Write integration test: Error recovery with provider fallback
- [ ] Write integration test: Continuous learning from execution
- [ ] Performance test: 100 consecutive /execute operations
- [ ] Cost analysis: Compare EVALS routing vs fixed provider

**Total Estimated Time**: 16 hours (2 days)

---

## Success Metrics

### Integration Success Criteria

1. **Functional Completeness**:
   - [ ] SDKIntegration uses EVALS routing when enabled
   - [ ] WaveOrchestrator routes each story via EVALS
   - [ ] /execute skill leverages EVALS for all operations
   - [ ] ErrorRecoveryEngine falls back to alternative providers

2. **Performance Metrics**:
   - [ ] Routing latency < 10ms (EVALS decision overhead)
   - [ ] No regression in overall execution speed
   - [ ] Memory overhead < 50MB for EVALS system

3. **Quality Metrics**:
   - [ ] 100% of agent executions record feedback to EVALS store
   - [ ] EVALS converges to optimal provider after 100 executions
   - [ ] Cost reduction vs fixed provider (target: 30-50%)
   - [ ] Quality improvement vs random routing (target: 20-30%)

4. **Test Coverage**:
   - [ ] All integration points have tests
   - [ ] End-to-end /execute workflow tested
   - [ ] Error recovery scenarios tested
   - [ ] Overall test coverage ≥80%

5. **User Experience**:
   - [ ] /execute "just works" with optimal provider selection
   - [ ] Transparent routing decisions (user sees which provider used)
   - [ ] Clear metrics output (cost, quality, confidence)
   - [ ] CLI commands for monitoring and management

---

## Configuration

### Default Configuration

```yaml
# ~/.config/rad-engineer/evals.yaml
version: "1.0"
enabled: true

explorationRate: 0.10  # 10% exploration
qualityThreshold: 0.7  # Success if quality > 0.7

# Catastrophic forgetting prevention
ewc:
  enabled: true
  lambda: 0.5  # Regularization strength

# State persistence
state:
  path: ~/.config/rad-engineer/performance-store.yaml
  autoSave: true
  versionsToKeep: 100

# Evaluation config
evaluation:
  timeout: 5000  # 5s max per evaluation
  useLocalModel: true  # Use Ollama for metrics
  localModel: llama3.2
```

### Provider Preferences (Optional)

Users can override EVALS for specific task types:

```yaml
# ~/.config/rad-engineer/provider-preferences.yaml
preferences:
  codeGeneration:
    prefer: ["glm", "anthropic"]
    avoid: ["openai"]  # OpenAI not good for code

  documentation:
    prefer: ["openai", "anthropic"]
    maxCost: 0.01  # Cheap providers for docs

  testing:
    prefer: ["glm", "ollama"]
    requireQuality: 0.8  # High quality for tests

  research:
    prefer: ["anthropic", "openai"]
    requireQuality: 0.9  # Highest quality for research
```

---

## Monitoring and Observability

### Metrics to Track

1. **Per-Provider Metrics**:
   - Success rate (domain-specific)
   - Average cost per task type
   - Average latency
   - Quality score distribution
   - Exploration vs exploitation ratio

2. **System-Level Metrics**:
   - Routing decision distribution (which providers selected)
   - Cost savings vs baseline
   - Quality improvement vs baseline
   - Convergence rate (how fast system learns)

3. **Alerts**:
   - Catastrophic forgetting detected (>20% drop in old task performance)
   - Provider failure rate > 30% (circuit breaker)
   - Exploration rate too low (<5%) or too high (>20%)
   - PerformanceStore corruption detected

### CLI Monitoring Commands

```bash
# Real-time monitoring
rad-engineer evals monitor

# Performance trends
rad-engineer evals trends --last 7days

# Cost analysis
rad-engineer evals costs --by-domain

# Quality analysis
rad-engineer evals quality --by-provider

# Export for external analysis
rad-engineer evals export --format csv --with-timestamps > evals-data.csv
```

---

## Risks and Mitigations

### Risk 1: Cold Start Problem

**Problem**: Empty PerformanceStore → random routing → poor initial performance

**Mitigation**:
- Pre-seed with historical data (if available)
- Use conservative exploration rate (5%) until 100 data points
- Provide recommended defaults per domain (based on research)

### Risk 2: Catastrophic Forgetting

**Problem**: Learning new tasks degrades performance on old tasks

**Mitigation**:
- EWC implemented in PerformanceStore
- Monitor for performance drops > 20%
- Alert user if forgetting detected
- Maintain separate per-domain statistics

### Risk 3: Over-Optimization for Cost

**Problem**: System might route everything to cheapest provider

**Mitigation**:
- Quality threshold (0.7) prevents low-quality selections
- User can set `minQuality` constraint per task
- Track cost vs quality tradeoff in metrics
- Alert if quality drops below threshold

### Risk 4: Non-Determinism in Production

**Problem**: Despite seeded RNG, some non-determinism remains

**Mitigation**:
- State versioning provides reproducibility
- Can replay any historical decision by loading old version
- Logging provides audit trail
- Determinism verified by tests (100 trials)

---

## Future Enhancements

### Phase 2: Advanced Features (Post-Integration)

1. **Contextual Bandit with High-Dimensional Features**:
   - Current: (domain, complexity) buckets
   - Future: Full feature vector with LinUCB algorithm
   - Benefit: More granular routing decisions

2. **Multi-Armed Bandit with Hierarchical Clustering**:
   - Current: Flat provider selection
   - Future: Hierarchical (provider → model → region)
   - Benefit: More nuanced selection

3. **Reinforcement Learning with Policy Gradient**:
   - Current: Thompson Sampling (Bayesian approach)
   - Future: Learn policy directly from rewards
   - Benefit: Better long-term optimization

4. **A/B Testing Framework**:
   - Current: Single EVALS system
   - Future: Run multiple routing strategies in parallel
   - Benefit: Continuous improvement via experimentation

5. **Provider Auto-Scaling**:
   - Current: Static provider list
   - Future: Dynamically add/remove providers based on performance
   - Benefit: Always use best available providers

---

## Summary

**What We Have**:
- ✅ Complete EVALS system (75 tests passing)
- ✅ ProviderFactory integration
- ✅ All core components implemented

**What We Need**:
- Integrate SDKIntegration with EVALS routing
- Integrate WaveOrchestrator with EVALS routing
- Implement /execute skill
- Integrate ErrorRecoveryEngine with EVALS fallback
- Add CLI commands for monitoring
- End-to-end testing

**Estimated Time**: 16 hours (2 days)

**Expected Benefits**:
- 30-50% cost reduction via intelligent routing
- 20-30% quality improvement via learning
- Full transparency of routing decisions
- Continuous improvement from every execution
- Production-ready system with comprehensive testing

**Next Steps**:
1. Review and approve integration plan
2. Begin Step 1: SDKIntegration integration
3. Continue through Steps 2-6
4. Deploy to production when all tests pass

---

**Status**: Ready for Implementation
**Priority**: HIGH (enables /execute skill)
**Dependencies**: None (EVALS system complete)
**Blockers**: None

---

## 🔴 CRITICAL ADDITION (Added 2026-01-06)

### Issue: API Key Availability Not Tracked

**Problem Discovered**: EVALS BanditRouter can select providers that don't have valid API keys, causing runtime failures.

**Root Cause**:
- BanditRouter only knows about performance metrics (success/failure rates)
- No awareness of which providers have API keys configured
- ProviderFactory doesn't validate API keys on initialization

**Example Failure Scenario**:
```
1. System learns that "openai/gpt-4o" is 90% quality, 20% cheaper than Anthropic
2. EVALS routes task to OpenAI based on performance data
3. ProviderFactory.getProvider("openai") succeeds (provider is registered)
4. ❌ API call fails: 401 Unauthorized (no OPENAI_API_KEY in environment)
5. User task fails despite "optimal" routing decision
```

### Required Fix: Provider Availability Layer

**New Component**: `ProviderAvailability` (or add to ProviderFactory)

```typescript
// src/sdk/providers/ProviderAvailability.ts

/**
 * Check which providers have valid API keys configured
 */
export class ProviderAvailability {
  private factory: ProviderFactory;
  private availableProviders: Set<string> = new Set();
  private lastCheck: number = 0;
  private cacheTTL: number = 60000; // 1 minute cache

  constructor(factory: ProviderFactory) {
    this.factory = factory;
  }

  /**
   * Check if a provider has a valid API key
   * @param providerName - Provider to check
   * @returns true if API key is present and valid
   */
  async isProviderAvailable(providerName: string): Promise<boolean> {
    try {
      const provider = await this.factory.getProvider(providerName);
      
      // Make a minimal API call to validate key
      // For Anthropic: get current user info
      // For OpenAI: list models
      // For Ollama: list local models
      const isValid = await this.validateApiKey(provider);
      
      return isValid;
    } catch (error) {
      console.warn(`Provider ${providerName} not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get list of providers with valid API keys
   * @returns Array of available provider names
   */
  async getAvailableProviders(): Promise<string[]> {
    const now = Date.now();
    
    // Cache for 1 minute to avoid excessive API calls
    if (now - this.lastCheck < this.cacheTTL && this.availableProviders.size > 0) {
      return Array.from(this.availableProviders);
    }

    this.availableProviders.clear();
    
    const allProviders = this.factory.getRegisteredProviders();
    for (const providerName of allProviders) {
      const available = await this.isProviderAvailable(providerName);
      if (available) {
        this.availableProviders.add(providerName);
      }
    }

    this.lastCheck = now;
    return Array.from(this.availableProviders);
  }

  /**
   * Validate API key by making minimal API call
   * Provider-specific implementation
   */
  private async validateApiKey(provider: ProviderAdapter): Promise<boolean> {
    // Provider-specific validation
    // Anthropic: GET /v1/models (or user info endpoint)
    // OpenAI: GET /v1/models
    // Ollama: GET /api/tags
    // GLM: Check if apiKey is non-empty
    
    try {
      await provider.validateCredentials();
      return true;
    } catch {
      return false;
    }
  }
}
```

### Integration Points

**1. Update ProviderFactory**:

```typescript
export class ProviderFactory {
  private availability?: ProviderAvailability;

  constructor(config: ProviderFactoryConfig) {
    // ... existing code ...
    
    // Add availability checker
    this.availability = new ProviderAvailability(this);
  }

  /**
   * Get only providers with valid API keys
   */
  async getAvailableProviders(): Promise<string[]> {
    return this.availability?.getAvailableProviders() || [];
  }

  /**
   * Check if specific provider is available
   */
  async isProviderAvailable(name: string): Promise<boolean> {
    return this.availability?.isProviderAvailable(name) ?? false;
  }
}
```

**2. Update BanditRouter**:

```typescript
export class BanditRouter {
  private factory?: ProviderFactory; // Add factory reference

  constructor(
    store: PerformanceStore,
    factory?: ProviderFactory, // Accept factory
    config?: Partial<EvalConfig>
  ) {
    this.store = store;
    this.factory = factory;
    // ... existing code ...
  }

  async route(features: QueryFeatures): Promise<RoutingDecision> {
    // Get all candidates from performance store
    const allCandidates = this.store.getCandidates(
      features.domain,
      features.complexityScore
    );

    // NEW: Filter to only available providers
    let availableCandidates = allCandidates;
    if (this.factory) {
      const availableProviders = await this.factory.getAvailableProviders();
      availableCandidates = allCandidates.filter(c => 
        availableProviders.includes(c.provider)
      );
    }

    if (availableCandidates.length === 0) {
      throw new Error(
        "No available providers with valid API keys for this task. " +
        "Configure API keys in environment variables."
      );
    }

    // Continue with Thompson Sampling on available candidates
    // ... rest of existing code ...
  }
}
```

**3. Update EvalsFactory**:

```typescript
export async function initialize(
  providerFactory: ProviderFactory,
  config?: Partial<EvalsConfigFile>
): Promise<EvalsSystem> {
  // ... existing initialization ...

  // Pass factory to BanditRouter
  const router = new BanditRouter(store, providerFactory, evalConfig);

  // ... rest of existing code ...
}
```

### Provider-Specific Validation

**Add to each Provider Adapter**:

```typescript
// AnthropicProvider.ts
export class AnthropicProvider implements ProviderAdapter {
  
  /**
   * Validate API credentials by making minimal API call
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Minimal API call to validate key
      // Using models endpoint (lightweight)
      await this.client.models.list(); // Note: Anthropic SDK may not have this, use alternative
      // Alternative: Create minimal message and check for auth error
      return true;
    } catch (error) {
      if (error.message?.includes('401') || error.message?.includes('authentication')) {
        return false;
      }
      throw error; // Re-throw network errors
    }
  }
}
```

### Alternative: Lightweight Check

If API validation is too expensive, use **environment variable check**:

```typescript
/**
 * Check if API key is present in environment (cheaper than API call)
 */
private async hasApiKeyInEnv(providerName: string): Promise<boolean> {
  const envVarMap = {
    'anthropic': 'ANTHROPIC_API_KEY',
    'openai': 'OPENAI_API_KEY',
    'glm': 'GLM_API_KEY',
    'ollama': 'OLLAMA_HOST', // Ollama doesn't need key, just host
  };

  const envVar = envVarMap[providerName];
  if (!envVar) return false;

  // For Ollama, just check if env var is set
  if (providerName === 'ollama') {
    return !!process.env[envVar];
  }

  // For others, check if non-empty
  const key = process.env[envVar];
  return !!key && key.length > 0;
}
```

### Updated Implementation Steps

Add to integration plan:

**Step 0: Provider Availability Layer (NEW - CRITICAL)**
- [ ] Implement `ProviderAvailability` class
- [ ] Add `validateCredentials()` to each provider adapter
- [ ] Update `BanditRouter` to filter by available providers
- [ ] Update `EvalsFactory` to pass factory to router
- [ ] Add tests for availability filtering
- [ ] Add tests for routing with partial provider availability

**Estimated Time**: 3 hours

**Priority**: CRITICAL - Must be done before Step 1 (SDKIntegration integration)

**Why Critical**: Without this, EVALS will route to unavailable providers and cause runtime failures.

### Test Scenarios

```typescript
// Test: Routing with only some providers available
test("should route only to available providers", async () => {
  const factory = new ProviderFactory({
    providers: {
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
      openai: { apiKey: "" }, // No key configured
    },
  });

  const evals = await EvalsFactory.initialize(factory);

  // Mock performance data showing OpenAI is "better"
  evals.store.updateStats("openai", "gpt-4o", "code", 0.5, true, 0.001, 0.95, 500);
  evals.store.updateStats("anthropic", "claude-3-5-sonnet", "code", 0.5, true, 0.003, 0.85, 1000);

  const features = { domain: "code", complexityScore: 0.5, ... };

  // Should choose Anthropic (available) not OpenAI (unavailable)
  const decision = await evals.router.route(features);
  
  expect(decision.provider).toBe("anthropic");
});
```

