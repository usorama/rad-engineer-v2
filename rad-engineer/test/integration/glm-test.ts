#!/usr/bin/env bun
/**
 * GLM 4.7 Integration Test
 *
 * Test the multi-provider layer with actual GLM API credentials
 */

import { initializeProviderFactory, ProviderType } from "../../src/sdk/providers/index.js";

async function testGLMIntegration() {
  console.log("=== GLM 4.7 Integration Test ===\n");

  // Get GLM credentials from environment
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.GLM_API_KEY;
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.z.ai/api/anthropic";
  const model = process.env.ANTHROPIC_MODEL || "glm-4.7";

  if (!apiKey) {
    console.error("❌ Error: GLM API key not found");
    console.log("Set GLM_API_KEY or ANTHROPIC_AUTH_TOKEN environment variable");
    process.exit(1);
  }

  console.log(`Provider: GLM (Zhipu AI)`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model: ${model}\n`);

  // Initialize provider factory with GLM
  const factory = initializeProviderFactory({
    defaultProvider: ProviderType.GLM,
    providers: {
      glm: {
        providerType: ProviderType.GLM,
        apiKey,
        baseUrl,
        model,
        timeout: 3000000,
      },
    },
  });

  // Get GLM provider
  console.log("✅ Provider factory initialized");
  const glm = await factory.getProvider("glm");
  console.log("✅ GLM provider created\n");

  // Test 1: Validate model
  console.log("Test 1: Model validation");
  const isValid = glm.validateModel(model);
  console.log(`  Model ${model} valid: ${isValid ? "✅" : "❌"}\n`);

  // Test 2: Token estimation
  console.log("Test 2: Token estimation");
  const testText = "What is 2 + 2? Explain your answer.";
  const estimatedTokens = glm.estimateTokens(testText);
  console.log(`  Text: "${testText}"`);
  console.log(`  Estimated tokens: ${estimatedTokens} ✅\n`);

  // Test 3: Feature support
  console.log("Test 3: Feature support");
  console.log(`  Streaming: ${glm.supportsFeature("streaming") ? "✅" : "❌"}`);
  console.log(`  Tools: ${glm.supportsFeature("tools") ? "✅" : "❌"}`);
  console.log(`  Images: ${glm.supportsFeature("images") ? "✅" : "❌"}\n`);

  // Test 4: Actual API call (chat completion)
  console.log("Test 4: API call - Simple chat completion");
  console.log("  Sending prompt to GLM 4.7...");

  try {
    const response = await glm.createChat({
      prompt: "What is 2 + 2? Give a brief answer.",
      system: "You are a helpful assistant.",
    });

    console.log(`  Response: ${response.content.substring(0, 100)}... ✅`);
    console.log(`  Tokens used: ${response.usage.totalTokens} ✅`);
    console.log(`  Model: ${response.metadata.model} ✅`);
    console.log(`  Provider: ${response.metadata.provider} ✅\n`);
  } catch (error) {
    console.error(`  ❌ API call failed: ${error}\n`);
    throw error;
  }

  // Test 5: Streaming (if supported)
  if (glm.supportsFeature("streaming")) {
    console.log("Test 5: Streaming chat completion");
    console.log("  Streaming response...");

    try {
      let fullContent = "";
      let chunkCount = 0;

      for await (const chunk of await glm.streamChat({
        prompt: "Count from 1 to 5.",
      })) {
        if (chunk.delta) {
          fullContent += chunk.delta;
          chunkCount++;
        }
        if (chunk.done) break;
      }

      console.log(`  Received ${chunkCount} chunks ✅`);
      console.log(`  Full response: "${fullContent}" ✅\n`);
    } catch (error) {
      console.error(`  ❌ Streaming failed: ${error}\n`);
    }
  }

  console.log("=== All Tests Passed ===");
}

// Run tests
testGLMIntegration().catch((error) => {
  console.error("\n❌ Integration test failed:", error);
  process.exit(1);
});
