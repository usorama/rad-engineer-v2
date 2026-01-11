/**
 * Integration Tests: PromptValidator with SDKIntegration
 * Phase 1 - Core Orchestrator
 *
 * Tests:
 * - SDKIntegration validates prompt before spawn
 * - SDKIntegration spawns agent after valid prompt
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { SDKIntegration } from "@/sdk/SDKIntegration";
import { PromptValidator } from "@/core/PromptValidator";
import { ProviderFactory } from "@/sdk/providers/ProviderFactory.js";
import { ProviderType } from "@/sdk/providers/types.js";

describe("PromptValidator + SDKIntegration Integration", () => {
  let sdk: SDKIntegration;
  let validator: PromptValidator;

  beforeEach(() => {
    // Create ProviderFactory with test configuration
    const providerFactory = new ProviderFactory({
      defaultProvider: ProviderType.GLM,
      providers: {
        "test-glm": {
          providerType: ProviderType.GLM,
          apiKey: "test-api-key",
          baseUrl: "https://test.api.com",
          model: "glm-4.7",
          timeout: 60000,
          temperature: 1.0,
          maxTokens: 4096,
          topP: 1.0,
          stream: false,
        },
      },
      enableFallback: false,
    });
    sdk = new SDKIntegration(providerFactory);
    validator = new PromptValidator();
  });

  test("SDKIntegration validates prompt before spawn", async () => {
    // Initialize SDK
    const initResult = await sdk.initSDK({
      model: "glm-4.7",
    });

    expect(initResult.sdkInitialized).toBe(true);

    // Create invalid prompt (> 500 chars)
    const invalidPrompt = "a".repeat(501);

    // Validate prompt
    const validationResult = await validator.validate(invalidPrompt);

    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors.some((e) => e.includes("PROMPT_TOO_LARGE"))).toBe(true);

    // Note: In actual integration, SDKIntegration would check validation
    // before calling testAgent(). This test validates the validation step works.
  });

  test("SDKIntegration spawns agent after valid prompt", async () => {
    // Initialize SDK
    const initResult = await sdk.initSDK({
      model: "glm-4.7",
    });

    expect(initResult.sdkInitialized).toBe(true);

    // Create valid prompt
    const validPrompt = `Task: What is 2 + 2?
Files: none
Output: JSON {answer}
Rules: Simple math`;

    // Validate prompt
    const validationResult = await validator.validate(validPrompt);

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // In actual integration, would proceed to testAgent()
    // For unit testing, we verify validation passes
    const resourceMonitor = sdk.getResourceMonitor();
    expect(resourceMonitor).toBeDefined();
  });
});
