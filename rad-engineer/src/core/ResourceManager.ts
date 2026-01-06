/**
 * ResourceManager - Core Orchestrator Component
 * Phase 1: Deterministic execution foundation
 *
 * Manages concurrent agent execution with system resource monitoring
 * Enforces maximum concurrent agent limits (2-3 agents) to prevent system overload
 *
 * Responsibilities:
 * - Track active agents and enforce concurrent limits
 * - Check system resources before allowing agent spawns
 * - Integrate with ResourceMonitor for metrics collection
 * - Support wave-based execution patterns
 *
 * Failure Modes:
 * - AGENT_LIMIT_EXCEEDED: Thrown when exceeding maxConcurrent limit
 * - DUPLICATE_AGENT_ID: Thrown when registering existing agent ID
 * - BASELINE_SET_FAILED: Logged when ResourceMonitor.setBaseline() fails
 * - RESOURCE_CHECK_FAILED: Logged when system resource checks fail
 */

import { execFileNoThrow } from "@/utils/execFileNoThrow.js";
import type { ResourceMetrics } from "@/sdk/types.js";

/**
 * Resource check result with detailed metrics
 */
export interface ResourceCheckResult {
  /** Whether an agent can be spawned */
  canSpawnAgent: boolean;
  /** Current system resource metrics */
  metrics: ResourceMetrics;
  /** List of threshold violations (empty if all OK) */
  violations: string[];
}

/**
 * Configuration for ResourceManager
 */
export interface ResourceManagerConfig {
  /** Maximum concurrent agents (default: 3) */
  maxConcurrent?: number;
  /** Optional custom ResourceMonitor instance */
  resourceMonitor?: {
    getCurrentMetrics(): Promise<ResourceMetrics>;
    setBaseline(): Promise<void>;
    getDeltaFromBaseline?(): Promise<ResourceMetrics | null>;
  } | null;
}

/**
 * Error codes for ResourceManager operations
 */
export enum ResourceManagerError {
  AGENT_LIMIT_EXCEEDED = "AGENT_LIMIT_EXCEEDED",
  DUPLICATE_AGENT_ID = "DUPLICATE_AGENT_ID",
  BASELINE_SET_FAILED = "BASELINE_SET_FAILED",
  RESOURCE_CHECK_FAILED = "RESOURCE_CHECK_FAILED",
}

/**
 * Custom error for ResourceManager operations
 */
export class ResourceManagerException extends Error {
  constructor(
    public code: ResourceManagerError,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ResourceManagerException";
  }
}

/**
 * ResourceManager - Manages agent concurrency and system resources
 *
 * @example
 * ```ts
 * const manager = new ResourceManager({ maxConcurrent: 3 });
 * await manager.setBaseline();
 *
 * if (await manager.canSpawnAgent()) {
 *   await manager.registerAgent("agent-1");
 *   // Spawn agent...
 *   await manager.unregisterAgent("agent-1");
 * }
 * ```
 */
export class ResourceManager {
  private readonly activeAgents: Set<string> = new Set();
  private readonly maxConcurrent: number;
  private readonly resourceMonitor: ResourceManagerConfig["resourceMonitor"];

  // Thresholds from verified research (CLAIM-001 through CLAIM-010)
  private readonly thresholds = {
    kernel_task_cpu: 50, // percent
    memory_free_percent: 20, // percent (minimum free)
    process_count: 400, // count
    thread_count_warning: 300, // warning level
    thread_count_critical: 350, // block agent spawns
  };

  constructor(config: ResourceManagerConfig = {}) {
    this.maxConcurrent = config.maxConcurrent ?? 3;
    this.resourceMonitor = config.resourceMonitor ?? null;

    if (this.maxConcurrent < 1 || this.maxConcurrent > 3) {
      throw new Error("maxConcurrent must be between 1 and 3");
    }
  }

  /**
   * Check if a new agent can be spawned
   *
   * Checks:
   * 1. Active agent count < maxConcurrent
   * 2. System resources within thresholds
   *
   * @returns true if agent can be spawned, false otherwise
   */
  async canSpawnAgent(): Promise<boolean> {
    // Check concurrent limit
    if (this.activeAgents.size >= this.maxConcurrent) {
      return false;
    }

    // Check system resources
    const result = await this.checkResources();
    return result.canSpawnAgent;
  }

  /**
   * Register a new agent as active
   *
   * @param agentId - Unique identifier for the agent
   * @throws ResourceManagerException if limit exceeded or duplicate ID
   */
  async registerAgent(agentId: string): Promise<void> {
    if (this.activeAgents.has(agentId)) {
      throw new ResourceManagerException(
        ResourceManagerError.DUPLICATE_AGENT_ID,
        `Agent ID "${agentId}" is already registered`,
        { agentId, activeCount: this.activeAgents.size }
      );
    }

    if (this.activeAgents.size >= this.maxConcurrent) {
      throw new ResourceManagerException(
        ResourceManagerError.AGENT_LIMIT_EXCEEDED,
        `Cannot register agent: at concurrent limit (${this.activeAgents.size}/${this.maxConcurrent})`,
        { currentCount: this.activeAgents.size, maxConcurrent: this.maxConcurrent }
      );
    }

    this.activeAgents.add(agentId);
  }

  /**
   * Unregister an agent (mark as inactive)
   *
   * Idempotent operation - logs warning if agent not found
   *
   * @param agentId - Agent identifier to unregister
   */
  async unregisterAgent(agentId: string): Promise<void> {
    if (!this.activeAgents.has(agentId)) {
      console.warn(`[ResourceManager] Agent "${agentId}" not found in active agents (idempotent unregister)`);
      return;
    }

    this.activeAgents.delete(agentId);
  }

  /**
   * Check current system resources
   *
   * Uses ResourceMonitor if available, falls back to execFileNoThrow
   *
   * @returns ResourceCheckResult with metrics and violations
   */
  async checkResources(): Promise<ResourceCheckResult> {
    let metrics: ResourceMetrics;

    try {
      if (this.resourceMonitor) {
        metrics = await this.resourceMonitor.getCurrentMetrics();
      } else {
        metrics = await this.collectMetricsDirect();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ResourceManager] Resource check failed: ${errorMessage}`);
      // Conservative fallback: return canSpawnAgent=false to prevent overload
      return {
        canSpawnAgent: false,
        metrics: this.getDefaultMetrics(),
        violations: ["Resource check failed - using conservative fallback"],
      };
    }

    const violations: string[] = [];

    // Check kernel_task CPU threshold
    if (metrics.kernel_task_cpu >= this.thresholds.kernel_task_cpu) {
      violations.push(
        `kernel_task CPU (${metrics.kernel_task_cpu}% ≥ ${this.thresholds.kernel_task_cpu}%)`
      );
    }

    // Check memory pressure (convert to free percent)
    const memoryFreePercent = 100 - metrics.memory_pressure;
    if (memoryFreePercent < this.thresholds.memory_free_percent) {
      violations.push(
        `Memory free (${memoryFreePercent}% < ${this.thresholds.memory_free_percent}%)`
      );
    }

    // Check process count
    if (metrics.process_count >= this.thresholds.process_count) {
      violations.push(
        `Process count (${metrics.process_count} ≥ ${this.thresholds.process_count})`
      );
    }

    // Check thread count (if available)
    if ("thread_count" in metrics && typeof metrics.thread_count === "number") {
      if (metrics.thread_count >= this.thresholds.thread_count_critical) {
        violations.push(
          `Thread count (${metrics.thread_count} ≥ ${this.thresholds.thread_count_critical})`
        );
      }
    }

    return {
      canSpawnAgent: violations.length === 0,
      metrics,
      violations,
    };
  }

  /**
   * Get current active agent count
   *
   * @returns Number of currently active agents
   */
  getActiveAgentCount(): number {
    return this.activeAgents.size;
  }

  /**
   * Set baseline for resource monitoring
   *
   * Calls ResourceMonitor.setBaseline() if available
   * Logs error but continues if baseline setting fails
   *
   * @throws ResourceManagerException only if baseline is critical
   */
  async setBaseline(): Promise<void> {
    if (!this.resourceMonitor) {
      console.warn("[ResourceManager] No ResourceMonitor available - baseline not set");
      return;
    }

    try {
      await this.resourceMonitor.setBaseline();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ResourceManager] ${ResourceManagerError.BASELINE_SET_FAILED}: ${message}`);
      // Continue without baseline - non-critical failure
    }
  }

  /**
   * Collect system metrics directly using execFileNoThrow
   *
   * Fallback when ResourceMonitor is not available
   */
  private async collectMetricsDirect(): Promise<ResourceMetrics> {
    const timestamp = new Date().toISOString();

    // Get kernel_task CPU
    const kernelTaskCpuResult = await execFileNoThrow("ps", [
      "-A",
      "-o",
      "%cpu,comm",
    ]);
    let kernel_task_cpu = 0;
    if (kernelTaskCpuResult.success) {
      const match = kernelTaskCpuResult.stdout.match(/kernel_task\s+(\d+\.?\d*)/m);
      kernel_task_cpu = match ? parseFloat(match[1]) : 0;
    }

    // Get memory pressure (using vm_stat on macOS)
    const memoryResult = await execFileNoThrow("vm_stat", []);
    let memory_pressure = 50; // Default
    if (memoryResult.success) {
      const freeMatch = memoryResult.stdout.match(/Pages free:\s+(\d+)/);
      if (freeMatch) {
        const freePages = parseInt(freeMatch[1], 10);
        const pageSize = 4096; // 4KB pages on macOS
        const freeMB = (freePages * pageSize) / (1024 * 1024);
        const totalMB = 16384; // Assume 16GB total
        memory_pressure = 100 - (freeMB / totalMB) * 100;
      }
    }

    // Get process count
    const processResult = await execFileNoThrow("ps", ["-A"]);
    let process_count = 200; // Default
    if (processResult.success) {
      const lines = processResult.stdout.trim().split("\n");
      process_count = lines.length;
    }

    // Get thread count
    const threadResult = await execFileNoThrow("ps", ["-A", "-o", "thcount"]);
    let thread_count = 0;
    if (threadResult.success) {
      const lines = threadResult.stdout.trim().split("\n").slice(1); // Skip header
      thread_count = lines.reduce((sum, line) => sum + parseInt(line.trim() || "0", 10), 0);
    }

    return {
      kernel_task_cpu,
      memory_pressure,
      process_count,
      thread_count,
      can_spawn_agent: false, // Will be evaluated by checkResources
      timestamp,
    } as ResourceMetrics & { thread_count: number };
  }

  /**
   * Get default metrics when collection fails
   */
  private getDefaultMetrics(): ResourceMetrics {
    return {
      kernel_task_cpu: 30,
      memory_pressure: 60,
      process_count: 250,
      can_spawn_agent: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current threshold values (for testing/debugging)
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Get maximum concurrent agents
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Get list of active agent IDs (for testing/debugging)
   */
  getActiveAgents(): string[] {
    return Array.from(this.activeAgents);
  }
}
