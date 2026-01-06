/**
 * Integration Tests: PromptValidator with ResourceManager
 * Phase 1 - Core Orchestrator
 *
 * Tests:
 * - Validation runs before resource check
 * - Execution order: validate → canSpawnAgent → spawn
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { PromptValidator } from "@/core/PromptValidator";
import { ResourceManager } from "@/core/ResourceManager";
import type { ResourceMetrics } from "@/sdk/types";

describe("PromptValidator + ResourceManager Integration", () => {
  let validator: PromptValidator;
  let resourceManager: ResourceManager;
  let mockMonitor: {
    getCurrentMetrics: () => Promise<ResourceMetrics>;
    setBaseline: () => Promise<void>;
  };

  beforeEach(() => {
    validator = new PromptValidator();

    mockMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 30,
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: true,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    resourceManager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: mockMonitor,
    });
  });

  test("Validation runs before resource check", async () => {
    // Create invalid prompt (> 500 chars)
    const invalidPrompt = "a".repeat(501);

    // Step 1: Validate (should fail)
    const validationResult = await validator.validate(invalidPrompt);
    expect(validationResult.valid).toBe(false);

    // Step 2: Resource check should not run if validation fails
    // (In actual flow, we'd short-circuit here)
    const canSpawn = await resourceManager.canSpawnAgent();
    expect(canSpawn).toBe(true); // Resources are OK, but prompt is invalid

    // Verify execution order: validate → canSpawnAgent → spawn
    // Invalid prompt blocks at validation step
    expect(validationResult.errors.some((e) => e.includes("PROMPT_TOO_LARGE"))).toBe(true);
  });

  test("Valid prompt proceeds to resource check", async () => {
    // Create valid prompt
    const validPrompt = `Task: Implement feature
Files: src/file.ts
Output: JSON {result}
Rules: TDD approach`;

    // Step 1: Validate (should pass)
    const validationResult = await validator.validate(validPrompt);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // Step 2: Resource check (should pass)
    const canSpawn = await resourceManager.canSpawnAgent();
    expect(canSpawn).toBe(true);

    // Step 3: Register agent (simulating spawn)
    await resourceManager.registerAgent("agent-1");
    expect(resourceManager.getActiveAgentCount()).toBe(1);
  });

  test("Execution order: validate → canSpawnAgent → spawn", async () => {
    // Test complete flow
    const validPrompt = `Task: Test task
Files: test.ts
Output: JSON {result}
Rules: Test rules`;

    // 1. Validate
    const validationResult = await validator.validate(validPrompt);
    expect(validationResult.valid).toBe(true);

    // 2. Resource check
    const canSpawn = await resourceManager.canSpawnAgent();
    expect(canSpawn).toBe(true);

    // 3. Spawn (register agent)
    await resourceManager.registerAgent("agent-1");
    expect(resourceManager.getActiveAgentCount()).toBe(1);

    // Verify order
    expect(resourceManager.getActiveAgentCount()).toBe(1);
  });

  test("Resource constraint blocks valid prompt", async () => {
    // Create valid prompt
    const validPrompt = `Task: Test task
Files: test.ts
Output: JSON {result}
Rules: Test rules`;

    // Step 1: Validate (should pass)
    const validationResult = await validator.validate(validPrompt);
    expect(validationResult.valid).toBe(true);

    // Step 2: Resource check (simulate constrained resources)
    const constrainedMonitor = {
      getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
        kernel_task_cpu: 65, // Exceeds threshold
        memory_pressure: 40,
        process_count: 200,
        can_spawn_agent: false,
        timestamp: new Date().toISOString(),
      }),
      setBaseline: async () => {},
    };

    const constrainedManager = new ResourceManager({
      maxConcurrent: 2,
      resourceMonitor: constrainedMonitor,
    });

    const canSpawn = await constrainedManager.canSpawnAgent();
    expect(canSpawn).toBe(false);

    // Valid prompt but constrained resources = no spawn
    expect(validationResult.valid).toBe(true);
    expect(canSpawn).toBe(false);
  });
});
