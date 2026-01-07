/**
 * Provider Auto-Detection Demo
 *
 * Demonstrates how to use ProviderAutoDetector for zero-configuration provider setup
 */

import {
  ProviderAutoDetector,
  autoDetectProviders,
  getDefaultProvider,
  detectAllProviders,
} from "../src/config/ProviderAutoDetector";
import { ProviderFactory } from "../src/sdk/providers/ProviderFactory";

// Example 1: Print detected providers
console.log("=".repeat(60));
console.log("Example 1: Detecting providers from environment");
console.log("=".repeat(60));
console.log(ProviderAutoDetector.printDetectedProviders());
console.log("");

// Example 2: Get default provider
console.log("=".repeat(60));
console.log("Example 2: Getting default provider");
console.log("=".repeat(60));
try {
  const defaultProvider = getDefaultProvider();
  console.log(`Default Provider: ${defaultProvider.name}`);
  console.log(`  Type: ${defaultProvider.providerType}`);
  console.log(`  Model: ${defaultProvider.model}`);
  console.log(`  URL: ${defaultProvider.baseUrl}`);
  console.log(`  Available: ${defaultProvider.available ? "Yes" : "No"}`);
} catch (error) {
  console.error("Error:", (error as Error).message);
}
console.log("");

// Example 3: Initialize ProviderFactory with auto-detected providers
console.log("=".repeat(60));
console.log("Example 3: Initialize ProviderFactory from environment");
console.log("=".repeat(60));
try {
  const config = autoDetectProviders();
  console.log("ProviderFactory Config:");
  console.log(`  Default Provider: ${config.defaultProvider}`);
  console.log(`  Available Providers: ${Object.keys(config.providers).join(", ")}`);
  console.log(`  Fallback Enabled: ${config.enableFallback ? "Yes" : "No"}`);

  // Note: Actual ProviderFactory initialization would require implemented adapters
  // const factory = new ProviderFactory(config);
  // console.log(`  Registered Providers: ${factory.getProviderCount()}`);
} catch (error) {
  console.error("Error:", (error as Error).message);
}
console.log("");

// Example 4: Check specific provider availability
console.log("=".repeat(60));
console.log("Example 4: Check provider availability");
console.log("=".repeat(60));
const providers = ["anthropic", "glm", "openai", "ollama"];
for (const provider of providers) {
  const available = ProviderAutoDetector.isProviderAvailable(provider as any);
  console.log(`  ${provider}: ${available ? "✓ Available" : "✗ Not configured"}`);
}
console.log("");

// Example 5: Get detection summary
console.log("=".repeat(60));
console.log("Example 5: Detection summary");
console.log("=".repeat(60));
const result = detectAllProviders();
console.log(`Total Providers Detected: ${result.availableCount}`);
console.log(`Default Provider: ${result.defaultProvider?.name || "none"}`);
console.log("");
console.log("All Detected Providers:");
result.providers.forEach((provider) => {
  console.log(`  - ${provider.name} (${provider.providerType})`);
  console.log(`    Model: ${provider.model}`);
  console.log(`    Status: ${provider.available ? "Ready" : "Not Ready"}`);
});
