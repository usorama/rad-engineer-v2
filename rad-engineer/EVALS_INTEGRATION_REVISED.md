# EVALS Integration Plan - REVISED FOR REALITY
## Based on Actual Configuration: GLM 4.7 Only

**Date**: 2026-01-06 (Revised after checking environment)
**Critical Finding**: System ONLY has GLM 4.7 configured via api.z.ai proxy
**Issue**: Code has hardcoded claude-3-5-sonnet references that will FAIL

---

## Current Configuration Reality

### Environment Variables (What's Actually Set)

```bash
ANTHROPIC_AUTH_TOKEN=aa68297c2a324ad2a2185566fcb2e7f6.amBtO8ouL1EHNqUs
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic  # ← GLM proxy!
ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4.7
ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4.7
ANTHROPIC_MODEL=glm-4.7

# NOT SET:
# - ANTHROPIC_API_KEY (for Anthropic directly)
# - OPENAI_API_KEY
# - GLM_API_KEY (using ANTHROPIC_AUTH_TOKEN via proxy)
```

### Providers Available

| Provider | API Key | Model | Status |
|----------|---------|-------|--------|
| GLM (via api.z.ai) | ✅ ANTHROPIC_AUTH_TOKEN | glm-4.7 | **ONLY WORKING ONE** |
| Anthropic (direct) | ❌ Not set | claude-3-5-sonnet-20241022 | **WILL FAIL** |
| OpenAI | ❌ Not set | gpt-4o-mini | **WILL FAIL** |
| Ollama | ❌ Not set | llama3.2 | **WILL FAIL** |

---

## Critical Problem: Hardcoded Model References

### Files with Hardcoded claude-3-5-sonnet

**1. SDKIntegration.ts (Line 167, 198)**
```typescript
// ❌ HARDODED - WILL FAIL
const stream = await this.client.messages.create({
  model: "claude-3-5-sonnet-20241022",  // ← No API key for this!
  // ...
});

const response = await this.client.messages.create({
  model: "claude-3-5-sonnet-20241022",  // ← No API key for this!
  // ...
});
```

**2. AnthropicProvider.ts (Line 31)**
```typescript
this.config = {
  // ...
  model: "claude-3-5-sonnet-20241022",  // ← Hardcoded default
};
```

**3. Error message (SDKIntegration.ts:81)**
```typescript
throw new SDKError(
  SDKErrorCode.INVALID_MODEL,
  `Model name "${config.model}" not recognized`,
  `Falling back to default model: claude-3-5-sonnet-20241022`  // ← Wrong fallback
);
```

---

## Revised Integration Strategy

### Principle: **No Hardcoded Models**

**Old approach**: "Use claude-3-5-sonnet by default"
**New approach**: "Use whatever provider is configured"

### Architecture Change

```
BEFORE (Wrong):
├── SDKIntegration hardcodes claude-3-5-sonnet
├── AnthropicProvider defaults to claude-3-5-sonnet
└── System assumes Anthropic API key exists

AFTER (Correct):
├── ProviderFactory reads available providers from config/env
├── SDKIntegration queries ProviderFactory for available provider
├── EVALS routes to whatever providers have API keys
└── System works with ANY configured provider
```

---

## Implementation Steps

### Step 0: Remove All Hardcoded Models (CRITICAL)

**Files to modify**:

#### 0.1: SDKIntegration.ts

```typescript
// BEFORE (Wrong):
async testAgent(task: AgentTask): Promise<TestResult> {
  const stream = await this.client.messages.create({
    model: "claude-3-5-sonnet-20241022",  // ❌ Hardcoded
    // ...
  });
}

// AFTER (Correct):
async testAgent(task: AgentTask): Promise<TestResult> {
  // Get provider from factory (no hardcoding)
  const { provider, decision } = await this.providerFactory.routeProvider(task.prompt);
  
  // Use whatever model provider selected
  const response = await provider.createChat({
    messages: [{ role: "user", content: task.prompt }],
    tools: this.getDefaultTools(),
  });
  
  // Record which provider was used
  console.log(`[EVALS] Used ${decision.provider}/${decision.model}`);
}
```

#### 0.2: AnthropicProvider.ts

```typescript
// BEFORE (Wrong):
constructor() {
  this.config = {
    model: "claude-3-5-sonnet-20241022",  // ❌ Hardcoded
    // ...
  };
}

// AFTER (Correct):
constructor() {
  this.config = {
    model: "",  // ← Empty, must be set via initialize()
    // ...
  };
}

async initialize(config: ProviderConfig): Promise<void> {
  if (!config.model) {
    throw new Error("Model must be specified in config");
  }
  
  this.config = {
    ...this.config,
    ...config,
  };
  
  // Use configured model (not hardcoded)
  this.client = new Anthropic({
    apiKey: config.apiKey || process.env.ANTHROPIC_AUTH_TOKEN,
    baseURL: config.baseUrl || process.env.ANTHROPIC_BASE_URL,
    // ...
  });
}
```

#### 0.3: Remove hardcoded fallback message

```typescript
// SDKIntegration.ts line 78-82
throw new SDKError(
  SDKErrorCode.INVALID_MODEL,
  `Model name "${config.model}" not recognized`,
  `Please specify a valid model in config`  // ✅ Generic message
);
```

---

### Step 1: Provider Configuration Layer (CRITICAL)

**Create**: `src/config/ProviderConfigManager.ts`

```typescript
/**
 * Provider Configuration Manager
 * 
 * Reads available providers from environment and config
 * NO HARDCODED VALUES - purely data-driven
 */

export interface ProviderInfo {
  name: string;
  providerType: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  available: boolean;
}

export class ProviderConfigManager {
  /**
   * Detect available providers from environment
   * Returns list of providers with API keys configured
   */
  static detectAvailableProviders(): ProviderInfo[] {
    const providers: ProviderInfo[] = [];

    // Check GLM (via api.z.ai proxy)
    if (process.env.ANTHROPIC_AUTH_TOKEN) {
      providers.push({
        name: "glm",
        providerType: "anthropic", // Uses Anthropic client
        model: process.env.ANTHROPIC_MODEL || "glm-4.7",
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
        baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.z.ai/api/anthropic",
        available: true,
      });
    }

    // Check Anthropic directly
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        name: "anthropic",
        providerType: "anthropic",
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
        available: true,
      });
    }

    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: "openai",
        providerType: "openai",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        available: true,
      });
    }

    // Check Ollama
    if (process.env.OLLAMA_HOST) {
      providers.push({
        name: "ollama",
        providerType: "ollama",
        model: process.env.OLLAMA_MODEL || "llama3.2",
        apiKey: "", // Ollama doesn't need API key
        baseUrl: process.env.OLLAMA_HOST,
        available: true,
      });
    }

    return providers;
  }

  /**
   * Get default provider (first available)
   * Throws if no providers configured
   */
  static getDefaultProvider(): ProviderInfo {
    const providers = this.detectAvailableProviders();
    
    if (providers.length === 0) {
      throw new Error(
        "No LLM providers configured. " +
        "Set one of: ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_HOST"
      );
    }

    return providers[0];
  }

  /**
   * Initialize ProviderFactory from environment
   * Auto-detects all available providers
   */
  static initializeFromEnv(): ProviderFactoryConfig {
    const providers = this.detectAvailableProviders();
    
    const config: ProviderFactoryConfig = {
      defaultProvider: providers[0]?.name,
      providers: {},
      enableFallback: true,
    };

    for (const provider of providers) {
      config.providers[provider.name] = {
        providerType: provider.providerType as any,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        model: provider.model,
      };
    }

    return config;
  }
}
```

---

### Step 2: Fix SDKIntegration to Use ProviderFactory (CRITICAL)

**Modify**: `src/sdk/SDKIntegration.ts`

```typescript
import { ProviderFactory } from "./providers/index.js";
import { ProviderConfigManager } from "../config/ProviderConfigManager.js";

export class SDKIntegration {
  private client: Anthropic | null = null;
  private providerFactory: ProviderFactory;
  private evalsEnabled = false;

  constructor(providerFactory?: ProviderFactory) {
    this.resourceMonitor = new ResourceMonitor();

    // Auto-initialize from environment if not provided
    if (!providerFactory) {
      const config = ProviderConfigManager.initializeFromEnv();
      this.providerFactory = new ProviderFactory(config);
      console.log(`[SDK] Auto-detected providers: ${Array.from(this.providerFactory.getRegisteredProviders()).join(", ")}`);
    } else {
      this.providerFactory = providerFactory;
    }
  }

  /**
   * Execute agent task with provider routing
   * NO HARDCODED MODELS - uses whatever is configured
   */
  async testAgent(task: AgentTask): Promise<TestResult> {
    const startTime = Date.now();
    const toolsInvoked: string[] = [];

    try {
      // Check system resources
      const resourceCheck = await this.resourceMonitor.checkResources();
      if (!resourceCheck.can_spawn_agent) {
        throw new SDKError(
          SDKErrorCode.AGENT_TIMEOUT,
          `Cannot spawn agent: ${resourceCheck.reason}`,
          "Wait for resources to free up"
        );
      }

      // Validate prompt
      if (task.prompt.length > 500) {
        console.warn(`Prompt exceeds 500 characters (${task.prompt.length})`);
      }

      // Get provider (with EVALS routing if enabled)
      let providerResponse;
      let providerUsed: string;
      let modelUsed: string;

      if (this.evalsEnabled && this.providerFactory.isEvalsRoutingEnabled()) {
        // Route via EVALS
        const { provider, decision } = await this.providerFactory.routeProvider(task.prompt);
        providerUsed = decision.provider;
        modelUsed = decision.model;

        console.log(`[EVALS] Routed to ${providerUsed}/${modelUsed} (confidence: ${decision.confidence.toFixed(2)})`);

        // Execute with selected provider
        providerResponse = await provider.createChat({
          messages: [{ role: "user", content: task.prompt }],
          tools: this.getDefaultTools(),
        });

        // Record feedback to EVALS
        await this.recordEvalsFeedback(task, providerResponse, decision);
      } else {
        // Use default provider (no EVALS)
        const defaultProvider = await this.providerFactory.getProvider();
        const config = defaultProvider.getConfig();
        providerUsed = "default";
        modelUsed = config.model;

        console.log(`[SDK] Using default provider: ${modelUsed}`);

        providerResponse = await defaultProvider.createChat({
          messages: [{ role: "user", content: task.prompt }],
          tools: this.providerFactory ? this.getDefaultTools() : [],
        });
      }

      const duration = Date.now() - startTime;

      // Convert to TestResult
      return {
        success: true,
        agentResponse: providerResponse.content,
        tokensUsed: {
          promptTokens: providerResponse.usage?.promptTokens || 0,
          completionTokens: providerResponse.usage?.completionTokens || 0,
          totalTokens: (providerResponse.usage?.promptTokens || 0) + (providerResponse.usage?.completionTokens || 0),
        },
        duration,
        toolsInvoked: providerResponse.toolsInvoked || [],
        error: null,
        providerUsed,  // ← NEW: Track which provider
        modelUsed,     // ← NEW: Track which model
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        agentResponse: "",
        tokensUsed: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        duration,
        toolsInvoked: [],
        error: error instanceof Error ? error : new Error(String(error)),
        providerUsed: "none",
        modelUsed: "none",
      };
    }
  }

  /**
   * Enable EVALS routing
   */
  enableEvalsRouting(): void {
    this.evalsEnabled = true;
    console.log("[SDK] EVALS routing enabled");
  }

  /**
   * Record feedback to EVALS store
   */
  private async recordEvalsFeedback(
    task: AgentTask,
    response: ChatResponse,
    decision: RoutingDecision
  ): Promise<void> {
    if (!this.providerFactory) return;

    // This will be implemented in Step 3
    // For now, placeholder
    console.log(`[EVALS] Recording feedback for ${decision.provider}/${decision.model}`);
  }
}
```

---

### Step 3: Fix WaveOrchestrator.executeTask() (CRITICAL)

**Modify**: `src/advanced/WaveOrchestrator.ts`

```typescript
import type { SDKIntegration } from "@/sdk/index.js";

export class WaveOrchestrator {
  private readonly resourceManager: ResourceManager;
  private readonly promptValidator: PromptValidator;
  private readonly responseParser: ResponseParser;
  private readonly sdk: SDKIntegration;  // ← Add this

  constructor(config: {
    resourceManager: ResourceManager;
    promptValidator: PromptValidator;
    responseParser: ResponseParser;
    sdk: SDKIntegration;  // ← Require SDK
  }) {
    this.resourceManager = config.resourceManager;
    this.promptValidator = config.promptValidator;
    this.responseParser = config.responseParser;
    this.sdk = config.sdk;  // ← Store SDK
  }

  /**
   * Execute task using SDKIntegration
   * NO MOCKED RESPONSES - real execution
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    try {
      // Use SDKIntegration (with EVALS if enabled)
      const result = await this.sdk.testAgent({
        version: "1.0",
        prompt: task.prompt,
      });

      if (!result.success) {
        return {
          id: task.id,
          success: false,
          error: result.error?.message || "Task execution failed",
        };
      }

      // Parse response
      const response = await this.responseParser.parse(result.agentResponse);

      return {
        id: task.id,
        success: true,
        response: response,
        providerUsed: result.providerUsed,  // ← NEW
        modelUsed: result.modelUsed,        // ← NEW
      };
    } catch (error) {
      return {
        id: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

---

### Step 4: Provider Availability Filter (CRITICAL)

**Already covered in previous plan** - ensures EVALS only routes to providers with API keys

**Key point**: With GLM as the only provider, EVALS will:
- Initially: Explore (try GLM since it's the only option)
- After data: Always use GLM (it's the only available provider)
- When more providers added: Automatically start exploring them

---

### Step 5: Update Test Files (CRITICAL)

**Problem**: Tests use hardcoded claude-3-5-sonnet

**Solution**: Use environment-based provider selection

```typescript
// test/sdk/SDKIntegration.test.ts

describe("SDKIntegration", () => {
  let sdk: SDKIntegration;

  beforeEach(() => {
    // Auto-detect from environment
    sdk = new SDKIntegration();
  });

  it("should execute task with available provider", async () => {
    const result = await sdk.testAgent({
      version: "1.0",
      prompt: "What is 2 + 2?",
    });

    expect(result.success).toBe(true);
    expect(result.providerUsed).toBeDefined();  // ← Don't hardcode which provider
    expect(result.modelUsed).toBeDefined();     // ← Don't hardcode which model
  });
});
```

---

## Implementation Order

| Step | Task | Time | Priority | Dependency |
|------|------|------|----------|------------|
| 0 | Remove hardcoded models from all files | 2h | **CRITICAL** | None |
| 1 | Create ProviderConfigManager | 2h | **CRITICAL** | Step 0 |
| 2 | Fix SDKIntegration to use ProviderFactory | 3h | **CRITICAL** | Step 1 |
| 3 | Fix WaveOrchestrator.executeTask() | 2h | **CRITICAL** | Step 2 |
| 4 | Provider availability filter | 3h | **CRITICAL** | Step 2 |
| 5 | Update types to include provider/model in results | 1h | MEDIUM | Step 2 |
| 6 | Update all test files | 2h | HIGH | Steps 0-4 |
| 7 | Integration tests | 3h | HIGH | Steps 0-5 |
| **Total** | | **18h** | | |

---

## What This Achieves

### Before Integration
```
User: /execute "Write a function"
  ↓
SDKIntegration: "I will use claude-3-5-sonnet"  // ❌ Hardcoded
  ↓
API Call: 401 Unauthorized  // ❌ No API key!
  ↓
Result: FAILURE
```

### After Integration
```
User: /execute "Write a function"
  ↓
SDKIntegration: "Checking available providers..."
  ↓
ProviderConfigManager: "Found: glm (glm-4.7)"
  ↓
SDKIntegration: "Using glm/glm-4.7"
  ↓
API Call: SUCCESS (api.z.ai proxy)
  ↓
Result: SUCCESS (with EVALS learning for future)
```

---

## Environment Configuration Example

### Current (Your Setup)
```bash
# Only GLM configured
export ANTHROPIC_AUTH_TOKEN="aa68297c..."
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL="glm-4.7"
```

### Future (Adding More Providers)
```bash
# GLM (existing)
export ANTHROPIC_AUTH_TOKEN="aa68297c..."
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL="glm-4.7"

# Anthropic directly (if you add it)
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_DIRECT_MODEL="claude-3-5-sonnet-20241022"

# OpenAI (if you add it)
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o-mini"

# Ollama (if you add it)
export OLLAMA_HOST="http://localhost:11434"
export OLLAMA_MODEL="llama3.2"
```

**Key Point**: System auto-detects whatever is configured. No code changes needed when adding providers.

---

## Testing Strategy

### Unit Tests
- Test ProviderConfigManager with various env var combinations
- Test SDKIntegration with auto-detected providers
- Test WaveOrchestrator with real SDK calls

### Integration Tests
- Test full pipeline with only GLM (current setup)
- Test with multiple providers (future)
- Test EVALS routing with single provider (should always use GLM)
- Test EVALS routing when new provider added (should explore)

### Environment Tests
```bash
# Test 1: Only GLM (current)
ANTHROPIC_AUTH_TOKEN=... bun test

# Test 2: GLM + OpenAI
ANTHROPIC_AUTH_TOKEN=... OPENAI_API_KEY=... bun test

# Test 3: No providers (should fail gracefully)
bun test  # Should show clear error message
```

---

## Success Criteria

### Must Have
- [ ] Zero hardcoded model references in code
- [ ] Works with only GLM 4.7 configured
- [ ] Auto-detects available providers from environment
- [ ] Clear error when no providers configured
- [ ] EVALS only routes to available providers

### Should Have
- [ ] Adding new provider requires only env vars (no code changes)
- [ ] Tests pass with any provider configuration
- [ ] Logging shows which provider/model was used

### Nice to Have
- [ ] CLI command to list available providers
- [ ] CLI command to test provider connectivity
- [ ] Per-project provider configuration files

---

## Summary

**Critical Changes**:
1. Remove ALL hardcoded model references
2. Auto-detect providers from environment
3. Make system work with ANY configured provider
4. Current setup: GLM 4.7 only (this should work!)

**Estimated Time**: 18 hours
**Risk**: LOW - mostly removing bad assumptions

**Next Step**: Start with Step 0 (remove hardcoded models)?

