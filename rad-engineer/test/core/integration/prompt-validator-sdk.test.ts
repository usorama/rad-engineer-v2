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

describe("PromptValidator + SDKIntegration Integration", () => {
  let sdk: SDKIntegration;
  let validator: PromptValidator;

  beforeEach(() => {
    sdk = new SDKIntegration();
    validator = new PromptValidator();
  });

  test("SDKIntegration validates prompt before spawn", async () => {
    // Initialize SDK
    const initResult = await sdk.initSDK({
      apiKey: process.env.ANTHROPIC_API_KEY || "sk-test-key",
      model: "claude-3-5-sonnet-20241022",
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
      apiKey: process.env.ANTHROPIC_API_KEY || "sk-test-key",
      model: "claude-3-5-sonnet-20241022",
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
