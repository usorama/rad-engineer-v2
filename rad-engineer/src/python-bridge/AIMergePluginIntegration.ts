/**
 * AI Merge Plugin Integration
 * ============================
 *
 * TypeScript wrapper for rad-engineer's AI merge conflict resolver.
 * Provides type-safe interface for resolving git merge conflicts using AI.
 *
 * Features:
 * - Single conflict resolution
 * - Batch conflict resolution
 * - Context building without resolution
 * - Support for Anthropic and OpenAI providers
 * - Git workflow integration
 *
 * Usage:
 * ```ts
 * const integration = new AIMergeIntegration({
 *   aiProvider: "anthropic",
 *   apiKey: process.env.ANTHROPIC_API_KEY!
 * });
 *
 * const result = await integration.resolveConflict(conflict, {
 *   baselineCode: "...",
 *   taskSnapshots: [...]
 * });
 * ```
 */

import { PythonPluginBridge } from "./PythonPluginBridge.js";
import type { PluginInput, PluginResult } from "./PythonPluginBridge.js";
import { resolve } from "node:path";

// ============================================================================
// TYPES (matching Python plugin types)
// ============================================================================

export type ChangeType =
  | "add_import"
  | "remove_import"
  | "modify_import"
  | "add_function"
  | "remove_function"
  | "modify_function"
  | "rename_function"
  | "add_hook_call"
  | "remove_hook_call"
  | "wrap_jsx"
  | "unwrap_jsx"
  | "add_jsx_element"
  | "modify_jsx_props"
  | "add_variable"
  | "remove_variable"
  | "modify_variable"
  | "add_constant"
  | "add_class"
  | "remove_class"
  | "modify_class"
  | "add_method"
  | "remove_method"
  | "modify_method"
  | "add_property"
  | "add_type"
  | "modify_type"
  | "add_interface"
  | "modify_interface"
  | "add_decorator"
  | "remove_decorator"
  | "add_comment"
  | "modify_comment"
  | "formatting_only"
  | "unknown";

export type ConflictSeverity = "none" | "low" | "medium" | "high" | "critical";

export type MergeStrategy =
  | "combine_imports"
  | "hooks_first"
  | "hooks_then_wrap"
  | "append_statements"
  | "append_functions"
  | "append_methods"
  | "combine_props"
  | "order_by_dependency"
  | "order_by_time"
  | "ai_required"
  | "human_required";

export type MergeDecision =
  | "auto_merged"
  | "ai_merged"
  | "needs_human_review"
  | "failed";

export type AIProvider = "anthropic" | "openai";

export interface SemanticChange {
  change_type: ChangeType;
  target: string;
  location: string;
  line_start: number;
  line_end: number;
  content_before?: string | null;
  content_after?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConflictRegion {
  file_path: string;
  location: string;
  tasks_involved: string[];
  change_types: ChangeType[];
  severity: ConflictSeverity;
  can_auto_merge: boolean;
  merge_strategy?: MergeStrategy | null;
  reason?: string;
}

export interface TaskSnapshot {
  task_id: string;
  task_intent: string;
  started_at: string; // ISO datetime
  completed_at?: string | null;
  content_hash_before?: string;
  content_hash_after?: string;
  semantic_changes?: SemanticChange[];
  raw_diff?: string | null;
}

export interface MergeResult {
  decision: MergeDecision;
  file_path: string;
  merged_content?: string | null;
  conflicts_resolved: ConflictRegion[];
  conflicts_remaining: ConflictRegion[];
  ai_calls_made: number;
  tokens_used: number;
  explanation: string;
  error?: string | null;
}

export interface ConflictContext {
  file_path: string;
  location: string;
  language: string;
  prompt_context: string;
  estimated_tokens: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AIMergeConfig {
  /** AI provider to use */
  aiProvider: AIProvider;
  /** API key for the AI provider */
  apiKey: string;
  /** Model to use (optional, uses provider default) */
  model?: string;
  /** Maximum context tokens (default: 4000) */
  maxContextTokens?: number;
  /** Timeout for plugin execution (ms, default: 60000) */
  timeout?: number;
  /** Python executable path (default: 'python3') */
  pythonPath?: string;
}

export interface ResolveConflictInput {
  baselineCode: string;
  taskSnapshots: TaskSnapshot[];
}

export interface ResolveOptions {
  /** Override AI provider for this call */
  aiProvider?: AIProvider;
  /** Override API key for this call */
  apiKey?: string;
  /** Override model for this call */
  model?: string;
}

// ============================================================================
// AI MERGE INTEGRATION
// ============================================================================

export class AIMergeIntegration {
  private readonly bridge: PythonPluginBridge;
  private readonly config: Required<Omit<AIMergeConfig, "model">> & {
    model?: string;
  };

  constructor(config: AIMergeConfig) {
    // Resolve plugin path
    const pluginPath = resolve(
      process.cwd(),
      "python-plugins",
      "ai_merge.py"
    );

    // Create bridge with config
    this.bridge = new PythonPluginBridge(pluginPath, {
      pythonPath: config.pythonPath || "python3",
      timeout: config.timeout || 60000,
      maxRetries: 3,
    });

    // Store config with defaults
    this.config = {
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      maxContextTokens: config.maxContextTokens || 4000,
      timeout: config.timeout || 60000,
      pythonPath: config.pythonPath || "python3",
    };
  }

  /**
   * Resolve a single conflict using AI
   */
  async resolveConflict(
    conflict: ConflictRegion,
    input: ResolveConflictInput,
    options?: ResolveOptions
  ): Promise<PluginResult<MergeResult>> {
    const pluginInput: PluginInput<{
      conflict: ConflictRegion;
      baseline_code: string;
      task_snapshots: TaskSnapshot[];
      ai_provider: AIProvider;
      api_key: string;
      model?: string;
      max_context_tokens: number;
    }> = {
      action: "resolve_conflict",
      data: {
        conflict,
        baseline_code: input.baselineCode,
        task_snapshots: input.taskSnapshots,
        ai_provider: options?.aiProvider || this.config.aiProvider,
        api_key: options?.apiKey || this.config.apiKey,
        model: options?.model || this.config.model,
        max_context_tokens: this.config.maxContextTokens,
      },
    };

    return this.bridge.execute<typeof pluginInput.data, MergeResult>(
      pluginInput
    );
  }

  /**
   * Build conflict context without resolving
   * Useful for inspecting what will be sent to AI
   */
  async buildContext(
    conflict: ConflictRegion,
    input: ResolveConflictInput
  ): Promise<PluginResult<ConflictContext>> {
    const pluginInput: PluginInput<{
      conflict: ConflictRegion;
      baseline_code: string;
      task_snapshots: TaskSnapshot[];
    }> = {
      action: "build_context",
      data: {
        conflict,
        baseline_code: input.baselineCode,
        task_snapshots: input.taskSnapshots,
      },
    };

    return this.bridge.execute<typeof pluginInput.data, ConflictContext>(
      pluginInput
    );
  }

  /**
   * Resolve multiple conflicts sequentially
   */
  async resolveConflicts(
    conflicts: ConflictRegion[],
    input: ResolveConflictInput,
    options?: ResolveOptions
  ): Promise<MergeResult[]> {
    const results: MergeResult[] = [];

    for (const conflict of conflicts) {
      const result = await this.resolveConflict(conflict, input, options);

      if (result.success && result.output?.data) {
        results.push(result.output.data);
      } else {
        // On failure, add failed result
        results.push({
          decision: "failed",
          file_path: conflict.file_path,
          conflicts_resolved: [],
          conflicts_remaining: [conflict],
          ai_calls_made: 0,
          tokens_used: 0,
          explanation: result.error || "Plugin execution failed",
          error: result.error,
        });
      }
    }

    return results;
  }

  /**
   * Get merge statistics
   */
  getStats(results: MergeResult[]): {
    total: number;
    resolved: number;
    remaining: number;
    aiCallsMade: number;
    tokensUsed: number;
  } {
    return {
      total: results.length,
      resolved: results.reduce(
        (sum, r) => sum + r.conflicts_resolved.length,
        0
      ),
      remaining: results.reduce(
        (sum, r) => sum + r.conflicts_remaining.length,
        0
      ),
      aiCallsMade: results.reduce((sum, r) => sum + r.ai_calls_made, 0),
      tokensUsed: results.reduce((sum, r) => sum + r.tokens_used, 0),
    };
  }

  /**
   * Shutdown the plugin bridge
   */
  async shutdown(): Promise<void> {
    await this.bridge.shutdown();
  }
}

// ============================================================================
// GIT WORKFLOW INTEGRATION
// ============================================================================

/**
 * Detect merge conflicts in a git repository
 * Returns list of files with conflicts
 */
export async function detectMergeConflicts(
  repoPath: string
): Promise<string[]> {
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  try {
    // Check git status for unmerged files
    const { stdout } = await execAsync("git status --porcelain", {
      cwd: repoPath,
    });

    // Parse unmerged files (U* status codes)
    const conflictedFiles = stdout
      .split("\n")
      .filter((line) => line.startsWith("UU ") || line.startsWith("AA "))
      .map((line) => line.slice(3).trim());

    return conflictedFiles;
  } catch (error) {
    throw new Error(
      `Failed to detect merge conflicts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract git conflict markers from a file
 */
export interface GitConflictMarkers {
  filePath: string;
  conflicts: Array<{
    ours: string;
    theirs: string;
    lineStart: number;
    lineEnd: number;
  }>;
}

export async function extractGitConflictMarkers(
  filePath: string
): Promise<GitConflictMarkers> {
  const { readFile } = await import("node:fs/promises");

  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const conflicts: GitConflictMarkers["conflicts"] = [];

  let inConflict = false;
  let conflictStart = -1;
  let ours = "";
  let theirs = "";
  let inOurs = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("<<<<<<<")) {
      inConflict = true;
      inOurs = true;
      conflictStart = i;
      ours = "";
      theirs = "";
    } else if (line.startsWith("=======") && inConflict) {
      inOurs = false;
    } else if (line.startsWith(">>>>>>>") && inConflict) {
      conflicts.push({
        ours,
        theirs,
        lineStart: conflictStart,
        lineEnd: i,
      });
      inConflict = false;
    } else if (inConflict) {
      if (inOurs) {
        ours += line + "\n";
      } else {
        theirs += line + "\n";
      }
    }
  }

  return {
    filePath,
    conflicts,
  };
}
