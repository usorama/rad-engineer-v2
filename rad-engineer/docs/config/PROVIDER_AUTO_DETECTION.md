# Provider Auto-Detection

## Overview

The `ProviderAutoDetector` automatically discovers and configures LLM providers from environment variables, enabling zero-configuration setup for the Rad Engineer platform.

## Features

- **Zero Configuration**: Automatically detects available providers from environment
- **Multi-Provider Support**: Detects Anthropic, GLM, OpenAI, Ollama, and more
- **GLM Proxy Detection**: Automatically detects GLM via api.z.ai proxy
- **Smart Defaults**: Provides sensible defaults for all detected providers
- **Clear Error Messages**: Helpful guidance when no providers are configured
- **Type-Safe**: Full TypeScript support with exported types

## Supported Environment Variables

### Anthropic / GLM via api.z.ai

```bash
# For GLM via api.z.ai proxy (current setup)
export ANTHROPIC_AUTH_TOKEN="your-api-key"
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"

# For standard Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
export ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

### GLM Direct API

```bash
export GLM_API_KEY="your-glm-key"
export GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4/"
export GLM_MODEL="glm-4.7"
```

### OpenAI

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_MODEL="gpt-4o"
```

### Ollama (Local)

```bash
export OLLAMA_HOST="http://localhost:11434"
export OLLAMA_MODEL="llama2"
```

## Usage

### Basic Usage

```typescript
import { autoDetectProviders } from "@/config";

// Auto-detect and initialize ProviderFactory
const config = autoDetectProviders();
const factory = new ProviderFactory(config);

// Use the factory
const provider = await factory.getProvider();
```

### Get Default Provider

```typescript
import { getDefaultProvider } from "@/config";

try {
  const provider = getDefaultProvider();
  console.log(`Using: ${provider.name} (${provider.model})`);
} catch (error) {
  console.error("No providers configured");
}
```

### Detect All Providers

```typescript
import { detectAllProviders } from "@/config";

const result = detectAllProviders();

console.log(`Detected ${result.availableCount} providers:`);
result.providers.forEach((p) => {
  console.log(`  - ${p.name}: ${p.model}`);
});
```

### Check Provider Availability

```typescript
import { ProviderAutoDetector } from "@/config";

if (ProviderAutoDetector.isProviderAvailable("glm")) {
  console.log("GLM is available");
}

const provider = ProviderAutoDetector.getProviderByType("glm");
if (provider) {
  console.log(`GLM config: ${provider.baseUrl}`);
}
```

### Debug Detection

```typescript
import { ProviderAutoDetector } from "@/config";

// Print detailed detection results
console.log(ProviderAutoDetector.printDetectedProviders());
```

## Detection Priority

Providers are detected in this priority order:

1. **Anthropic** (if `ANTHROPIC_API_KEY` is set without api.z.ai URL)
2. **GLM Proxy** (if `ANTHROPIC_AUTH_TOKEN` with api.z.ai URL)
3. **GLM Direct** (if `GLM_API_KEY` is set)
4. **OpenAI** (if `OPENAI_API_KEY` is set)
5. **Ollama** (if `OLLAMA_HOST` is set)

## Provider Configuration

### GLM via api.z.ai (Current Setup)

The system automatically detects GLM when:

- `ANTHROPIC_AUTH_TOKEN` is set
- `ANTHROPIC_BASE_URL` contains `api.z.ai`

Configuration:
```typescript
{
  name: "glm-proxy",
  providerType: "glm",
  model: "glm-4.7",          // Default, can override with GLM_MODEL
  baseUrl: "https://api.z.ai/api/anthropic",
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  available: true
}
```

### Standard Anthropic

Detected when `ANTHROPIC_API_KEY` is set without api.z.ai URL:

```typescript
{
  name: "anthropic",
  providerType: "anthropic",
  model: "claude-sonnet-4-20250514",
  baseUrl: "https://api.anthropic.com",
  apiKey: process.env.ANTHROPIC_API_KEY,
  available: true
}
```

## Error Handling

### No Providers Configured

If no providers are detected, the system throws a clear error:

```typescript
try {
  const config = autoDetectProviders();
} catch (error) {
  // Error: "No LLM providers detected from environment. Please configure at least one provider."
}
```

### Helpful Error Messages

```typescript
try {
  const provider = getDefaultProvider();
} catch (error) {
  console.log(error.message);
  // Output:
  // "No LLM providers configured. Please set one of the following environment variables:
  //   - ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY (for Anthropic/GLM)
  //   - OPENAI_API_KEY (for OpenAI)
  //   - OLLAMA_HOST (for Ollama)
  //   - GLM_API_KEY (for GLM direct API)"
}
```

## Integration with ProviderFactory

The auto-detected configuration integrates seamlessly with ProviderFactory:

```typescript
import { ProviderAutoDetector } from "@/config";
import { ProviderFactory } from "@/sdk/providers";

// Auto-detect providers
const config = ProviderAutoDetector.initializeFromEnv();

// Initialize factory
const factory = new ProviderFactory(config);

// Use providers
const provider = await factory.getProvider("glm-proxy");
const response = await provider.createChat({
  prompt: "Hello, GLM!",
});
```

## Testing

The auto-detection system is fully tested:

```bash
# Run all auto-detection tests
bun test test/config/ProviderAutoDetector.test.ts

# Run integration tests
bun test test/config/provider-auto-integration.test.ts

# Run all config tests
bun test test/config/
```

## Examples

See `/examples/provider-auto-detection-demo.ts` for complete usage examples.

## API Reference

### ProviderAutoDetector

Static class for auto-detecting providers.

#### Methods

- `detectAvailableProviders(): ProviderInfo[]` - Detect all available providers
- `getDefaultProvider(): ProviderInfo` - Get default (first available) provider
- `initializeFromEnv(): ProviderFactoryConfig` - Initialize ProviderFactory config
- `detectAll(): DetectionResult` - Get detection result with summary
- `isProviderAvailable(providerType): boolean` - Check if provider is available
- `getProviderByType(providerType): ProviderInfo | undefined` - Get provider by type
- `printDetectedProviders(): string` - Print formatted detection results

### Helper Functions

- `autoDetectProviders(): ProviderFactoryConfig` - Quick initialize from env
- `getDefaultProvider(): ProviderInfo` - Quick get default provider
- `detectAllProviders(): DetectionResult` - Quick detect all providers

### Types

```typescript
interface ProviderInfo {
  name: string;
  providerType: ProviderType;
  model: string;
  apiKey: string;
  baseUrl: string;
  available: boolean;
}

interface DetectionResult {
  providers: ProviderInfo[];
  defaultProvider: ProviderInfo | null;
  availableCount: number;
}
```

## Implementation Details

- **File**: `src/config/ProviderAutoDetector.ts`
- **Tests**: `test/config/ProviderAutoDetector.test.ts` (25 tests, 100% coverage)
- **Integration Tests**: `test/config/provider-auto-integration.test.ts` (10 tests)
- **Dependencies**: None (uses only Node.js `process.env`)

## Migration Guide

### From Manual Configuration

**Before (Manual):**
```typescript
const config: ProviderFactoryConfig = {
  defaultProvider: "glm",
  providers: {
    "glm-proxy": {
      providerType: "glm",
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN!,
      baseUrl: "https://api.z.ai/api/anthropic",
      model: "glm-4.7",
      // ...
    },
  },
};
```

**After (Auto-Detection):**
```typescript
const config = autoDetectProviders();
```

## Troubleshooting

### Provider Not Detected

1. Check environment variables are set:
   ```bash
   echo $ANTHROPIC_AUTH_TOKEN
   echo $ANTHROPIC_BASE_URL
   ```

2. Run detection debug:
   ```typescript
   console.log(ProviderAutoDetector.printDetectedProviders());
   ```

3. Verify detection logic matches your setup:
   - GLM via api.z.ai needs `ANTHROPIC_AUTH_TOKEN` + api.z.ai URL
   - Standard Anthropic needs `ANTHROPIC_API_KEY`
   - GLM direct needs `GLM_API_KEY`

### Wrong Provider Detected

If the system detects Anthropic instead of GLM:

```bash
# Make sure to use AUTH_TOKEN (not API_KEY) for GLM via api.z.ai
export ANTHROPIC_AUTH_TOKEN="your-key"
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
```

## Future Enhancements

- Support for more providers (DeepSeek, Qwen, etc.)
- Provider health checks
- Automatic failover configuration
- Provider capability detection
- Dynamic provider loading from config files
