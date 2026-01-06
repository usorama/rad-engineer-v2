#!/usr/bin/env bun
/**
 * Smart Orchestrator - Proof of Concept
 *
 * Demonstrates 100% deterministic agent management using Claude Agent SDK principles
 * Tests hypothesis: Agent SDK provides programmatic control vs Claude Code's Task tool
 *
 * Key Features:
 * 1. Prompt validation (< 500 chars)
 * 2. Resource limits (max 2-3 concurrent)
 * 3. Context overflow prevention
 * 4. Structured JSON output enforcement
 */

import { v4 as uuidv4 } from "uuid";

// Types for structured agent communication
interface AgentOutput {
  success: boolean;
  filesModified: string[];
  testsWritten: string[];
  summary: string; // Max 500 chars
  errors: string[];
  nextSteps: string[];
}

interface AgentJob {
  jobId: string;
  startedAt: number;
  taskDescription: string;
  status: "running" | "completed" | "queued" | "failed";
  contextUsage?: number;
}

interface ValidationError {
  code: string;
  message: string;
  field: string;
}

// System prompt for enforcing JSON output
const ORCHESTRATOR_SYSTEM_PROMPT = `You are a specialized agent orchestrator.

CRITICAL: You MUST return ONLY valid JSON in this exact format:
{
  "success": true,
  "filesModified": ["path/to/file.ts"],
  "testsWritten": ["path/to/test.ts"],
  "summary": "Brief description of work done (max 500 chars)",
  "errors": [],
  "nextSteps": ["next action if needed"]
}

No prose. No explanations. Only JSON.`;

/**
 * Resource Manager - Enforces 2-3 agent concurrency limit
 * Prevents the kernel_task crashes we've seen with 5+ agents
 */
class ResourceManager {
  private readonly maxConcurrent: number;
  private runningJobs = new Map<string, AgentJob>();
  private jobQueue: Array<{ jobId: string; task: string }> = [];

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async canSpawnAgent(): Promise<boolean> {
    this.cleanupCompletedJobs();
    return this.runningJobs.size < this.maxConcurrent;
  }

  async spawnIfAvailable(jobId: string, task: string): Promise<boolean> {
    if (await this.canSpawnAgent()) {
      this.runningJobs.set(jobId, {
        jobId,
        startedAt: Date.now(),
        taskDescription: task,
        status: "running",
      });
      console.log(
        `🚀 [SPAWN] Agent ${jobId.slice(0, 8)} (${this.runningJobs.size}/${this.maxConcurrent} running)`,
      );
      return true;
    }

    // Queue for later execution
    this.jobQueue.push({ jobId, task });
    console.log(
      `⏳ [QUEUE] Agent ${jobId.slice(0, 8)} queued (${this.runningJobs.size}/${this.maxConcurrent} running)`,
    );
    return false;
  }

  async markComplete(jobId: string, success: boolean = true) {
    const job = this.runningJobs.get(jobId);
    if (job) {
      job.status = success ? "completed" : "failed";
      this.runningJobs.delete(jobId);
      console.log(
        `✅ [COMPLETE] Agent ${jobId.slice(0, 8)} (${this.runningJobs.size}/${this.maxConcurrent} running)`,
      );
    }

    // Process queue
    await this.processQueue();
  }

  private cleanupCompletedJobs() {
    const now = Date.now();
    const oneHour = 3600000;

    for (const [jobId, job] of this.runningJobs.entries()) {
      if (
        job.status === "completed" ||
        job.status === "failed" ||
        now - job.startedAt > oneHour
      ) {
        this.runningJobs.delete(jobId);
      }
    }
  }

  private async processQueue() {
    if (this.jobQueue.length > 0 && (await this.canSpawnAgent())) {
      const queuedJob = this.jobQueue.shift();
      if (queuedJob) {
        console.log(
          `🔄 [DEQUEUE] Processing queued agent ${queuedJob.jobId.slice(0, 8)}`,
        );
        await this.spawnIfAvailable(queuedJob.jobId, queuedJob.task);
      }
    }
  }

  getStatus() {
    return {
      running: this.runningJobs.size,
      maxConcurrent: this.maxConcurrent,
      queued: this.jobQueue.length,
      utilizationPercent: Math.round(
        (this.runningJobs.size / this.maxConcurrent) * 100,
      ),
    };
  }
}

/**
 * Prompt Validator - Enforces <500 character limit
 * Prevents context bloat that causes agent failures
 */
class PromptValidator {
  private static readonly MAX_PROMPT_SIZE = 500;

  static validate(prompt: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Size validation
    if (prompt.length > this.MAX_PROMPT_SIZE) {
      errors.push({
        code: "PROMPT_TOO_LARGE",
        message: `Prompt exceeds ${this.MAX_PROMPT_SIZE} chars: ${prompt.length} chars. Use minimal template.`,
        field: "prompt",
      });
    }

    // Content validation
    if (prompt.length === 0) {
      errors.push({
        code: "PROMPT_EMPTY",
        message: "Prompt cannot be empty",
        field: "prompt",
      });
    }

    // Anti-pattern detection
    if (prompt.includes("Please analyze the entire codebase")) {
      errors.push({
        code: "PROMPT_TOO_BROAD",
        message: "Use specific file paths, not 'entire codebase'",
        field: "prompt",
      });
    }

    return errors;
  }

  static buildMinimalPrompt(
    task: string,
    files: string[],
    rules?: string,
  ): string {
    const template = `Task: ${task.slice(0, 200)}
Files: ${files.slice(0, 5).join(", ")}
Output: JSON {filesModified, summary, errors}
Rules: ${rules || "Grep-first, LSP for navigation, JSON output"}`;

    if (template.length > this.MAX_PROMPT_SIZE) {
      throw new Error(
        `Even minimal template exceeds limit: ${template.length} chars`,
      );
    }

    return template;
  }
}

/**
 * Response Parser - Enforces structured JSON output
 * Prevents the "prose response" problem we have with Task tool
 */
class ResponseParser {
  static enforceStructuredResponse(responseText: string): AgentOutput {
    if (!responseText || responseText.trim().length === 0) {
      throw new Error("Agent returned empty response");
    }

    // Try to extract JSON from various formats
    let jsonStr = responseText;

    // Extract from markdown code blocks
    if (responseText.includes("```json")) {
      const jsonStart = responseText.indexOf("```json") + 7;
      const jsonEnd = responseText.indexOf("```", jsonStart);
      if (jsonEnd > jsonStart) {
        jsonStr = responseText.substring(jsonStart, jsonEnd).trim();
      }
    }

    // Parse JSON
    let data: any;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(
        `Agent output is not valid JSON: ${e}\nOutput: ${responseText.slice(0, 200)}...`,
      );
    }

    // Validate required fields
    const requiredFields = ["success", "filesModified", "summary", "errors"];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required JSON fields: ${missingFields.join(", ")}`,
      );
    }

    // Validate field types
    if (typeof data.success !== "boolean") {
      throw new Error("Field 'success' must be boolean");
    }

    if (!Array.isArray(data.filesModified)) {
      throw new Error("Field 'filesModified' must be array");
    }

    if (!Array.isArray(data.errors)) {
      throw new Error("Field 'errors' must be array");
    }

    // Validate summary length
    if (data.summary && data.summary.length > 500) {
      throw new Error(`Summary exceeds 500 chars: ${data.summary.length}`);
    }

    return data as AgentOutput;
  }
}

/**
 * Smart Orchestrator - Main orchestration class
 * Provides 100% deterministic agent management
 */
export class SmartOrchestrator {
  private resourceManager: ResourceManager;
  private completedTasks = new Map<string, AgentOutput>();
  private stats = {
    totalSpawned: 0,
    totalCompleted: 0,
    totalBlocked: 0,
    promptValidationFailures: 0,
    resourceLimitBlocks: 0,
  };

  constructor(maxConcurrentAgents: number = 2) {
    this.resourceManager = new ResourceManager(maxConcurrentAgents);
  }

  /**
   * Attempt to spawn an agent with full validation and resource management
   * Returns: Job ID if spawned/queued, throws error if validation fails
   */
  async spawnTask(
    task: string,
    allowedTools: string[] = ["Read", "Edit", "Glob", "Grep"],
    waveId?: string,
  ): Promise<{ jobId: string; status: "spawned" | "queued" | "blocked" }> {
    const jobId = uuidv4();
    waveId = waveId || uuidv4();

    console.log(`\n🎯 [REQUEST] Agent spawn request: ${task.slice(0, 50)}...`);

    // 1. PROMPT VALIDATION (100% DETERMINISTIC)
    const validationErrors = PromptValidator.validate(task);
    if (validationErrors.length > 0) {
      this.stats.promptValidationFailures++;
      this.stats.totalBlocked++;

      const error = validationErrors[0];
      console.log(`🚫 [BLOCKED] ${error.code}: ${error.message}`);
      throw new Error(`Prompt validation failed: ${error.message}`);
    }

    this.stats.totalSpawned++;

    // 2. RESOURCE MANAGEMENT (100% DETERMINISTIC)
    const canSpawn = await this.resourceManager.spawnIfAvailable(jobId, task);
    if (!canSpawn) {
      this.stats.resourceLimitBlocks++;
      return { jobId, status: "queued" };
    }

    // 3. SPAWN AGENT (simulated - in real implementation would use Agent SDK)
    this.simulateAgentExecution(jobId, task, allowedTools, waveId);

    return { jobId, status: "spawned" };
  }

  /**
   * Simulate agent execution - in real implementation would use Claude Agent SDK
   * This shows the structure of how it would work
   */
  private async simulateAgentExecution(
    jobId: string,
    task: string,
    allowedTools: string[],
    waveId: string,
  ) {
    // Simulate agent work
    setTimeout(
      async () => {
        try {
          // Simulate response from agent
          const simulatedResponse = this.generateSimulatedAgentResponse(
            task,
            allowedTools,
          );

          // 4. ENFORCE STRUCTURED OUTPUT (100% DETERMINISTIC)
          const result =
            ResponseParser.enforceStructuredResponse(simulatedResponse);

          this.completedTasks.set(jobId, result);
          this.stats.totalCompleted++;

          console.log(`✅ [SUCCESS] ${jobId.slice(0, 8)}: ${result.summary}`);
        } catch (e) {
          console.log(`❌ [FAILED] ${jobId.slice(0, 8)}: ${String(e)}`);

          this.completedTasks.set(jobId, {
            success: false,
            filesModified: [],
            testsWritten: [],
            summary: `Task failed: ${String(e)}`,
            errors: [String(e)],
            nextSteps: ["Fix validation error and retry"],
          });
        } finally {
          await this.resourceManager.markComplete(jobId, true);
        }
      },
      Math.random() * 3000 + 1000,
    ); // 1-4 second simulation
  }

  /**
   * Generate simulated agent response for testing
   */
  private generateSimulatedAgentResponse(
    task: string,
    allowedTools: string[],
  ): string {
    // Simulate different response types for testing
    const scenarios = [
      // Valid JSON response
      () =>
        JSON.stringify({
          success: true,
          filesModified: ["src/hooks/useAuth.ts"],
          testsWritten: ["src/hooks/__tests__/useAuth.test.ts"],
          summary: `Implemented ${task.slice(0, 50)}`,
          errors: [],
          nextSteps: [],
        }),

      // Invalid JSON (to test enforcement)
      () => "I have successfully implemented the feature. The code looks good.",

      // JSON with missing fields (to test validation)
      () => JSON.stringify({ success: true, summary: "Done" }),

      // Valid JSON with code block
      () =>
        `Here's the result:\n\`\`\`json\n${JSON.stringify({
          success: true,
          filesModified: ["src/components/Button.tsx"],
          testsWritten: [],
          summary: "Updated component implementation",
          errors: [],
          nextSteps: ["Add more test coverage"],
        })}\n\`\`\``,
    ];

    // Choose scenario based on task (deterministic for testing)
    const scenarioIndex = task.length % scenarios.length;
    return scenarios[scenarioIndex]();
  }

  /**
   * Get result for completed task
   */
  getResult(jobId: string): AgentOutput | undefined {
    return this.completedTasks.get(jobId);
  }

  /**
   * Wait for specific task to complete
   */
  async waitForCompletion(
    jobId: string,
    timeoutMs: number = 30000,
  ): Promise<AgentOutput> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = this.getResult(jobId);
      if (result) {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Task ${jobId} did not complete within ${timeoutMs}ms`);
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      ...this.stats,
      resourceStatus: this.resourceManager.getStatus(),
      determinismLevel: this.calculateDeterminismLevel(),
    };
  }

  /**
   * Calculate determinism level based on enforcement success
   */
  private calculateDeterminismLevel(): string {
    const totalAttempts = this.stats.totalSpawned + this.stats.totalBlocked;
    if (totalAttempts === 0) return "0% (no attempts)";

    const enforcementRate =
      ((this.stats.promptValidationFailures + this.stats.resourceLimitBlocks) /
        totalAttempts) *
      100;
    return `${Math.round(enforcementRate)}% enforcement rate`;
  }
}

// Export for testing
export { PromptValidator, ResourceManager, ResponseParser };
