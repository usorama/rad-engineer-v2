/**
 * Hierarchical Memory Scope Implementation
 * Based on CCA (Cognitive Control Architecture) patterns
 * Provides parent/child relationships and token-aware memory management
 */

export enum ScopeLevel {
  GLOBAL = "GLOBAL",  // 2000 tokens, never compressed
  TASK = "TASK",      // 4000 × complexity, compressed on close
  LOCAL = "LOCAL",    // 2000 tokens, aggressively compressed
}

export type ContextEventType =
  | "USER_INPUT"
  | "AGENT_OUTPUT"
  | "TOOL_EXECUTION"
  | "ERROR"
  | "DECISION"
  | "STATE_CHANGE";

export interface ContextEvent {
  id: string;
  type: ContextEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface ScopeConstructorParams {
  id: string;
  parentId: string | null;
  goal: string;
  level: ScopeLevel;
  events: ContextEvent[];
  summary?: string | null;
  artifacts?: Map<string, unknown>;
}

/**
 * Scope represents a hierarchical memory container with parent/child relationships
 * Implements token budgeting and compression for memory management
 */
export class Scope {
  public readonly id: string;
  public readonly parentId: string | null;
  public readonly goal: string;
  public readonly level: ScopeLevel;
  public readonly events: ContextEvent[];
  public summary: string | null;
  public readonly artifacts: Map<string, unknown>;
  public readonly createdAt: Date;
  public closedAt: Date | null;

  constructor(params: ScopeConstructorParams) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.goal = params.goal;
    this.level = params.level;
    this.events = [...params.events]; // Clone to prevent external mutation
    this.summary = params.summary ?? null;
    this.artifacts = params.artifacts ?? new Map<string, unknown>();
    this.createdAt = new Date();
    this.closedAt = null;
  }

  /**
   * Add a context event to this scope
   */
  addEvent(event: ContextEvent): void {
    if (this.isClosed()) {
      throw new Error("Cannot add event to closed scope");
    }
    this.events.push(event);
  }

  /**
   * Set an artifact in this scope's artifact map
   */
  setArtifact(key: string, value: unknown): void {
    if (this.isClosed()) {
      throw new Error("Cannot set artifact in closed scope");
    }
    this.artifacts.set(key, value);
  }

  /**
   * Get an artifact from this scope's artifact map
   */
  getArtifact<T = unknown>(key: string): T | undefined {
    return this.artifacts.get(key) as T | undefined;
  }

  /**
   * Close this scope with a summary
   * Once closed, no more events or artifacts can be added
   */
  close(summary: string): void {
    if (this.isClosed()) {
      throw new Error("Scope is already closed");
    }
    this.summary = summary;
    this.closedAt = new Date();
  }

  /**
   * Check if this scope is closed
   */
  isClosed(): boolean {
    return this.closedAt !== null;
  }

  /**
   * Estimate token count for this scope's content
   * Used for token budget management and compression decisions
   */
  getTokenCount(): number {
    // Simple token estimation: ~4 characters per token
    let content = this.goal;

    // Add event data
    for (const event of this.events) {
      content += JSON.stringify(event.data);
    }

    // Add artifact data
    for (const [key, value] of this.artifacts) {
      content += key + JSON.stringify(value);
    }

    // Add summary if present
    if (this.summary) {
      content += this.summary;
    }

    return Math.ceil(content.length / 4);
  }

  /**
   * Apply compression to this scope by replacing content with summaries
   */
  applyCompression(eventSummary: string, artifactSummary: string): void {
    if (!this.isClosed()) {
      throw new Error("Cannot compress open scope");
    }

    // Replace events with a summary event
    this.events.splice(0, this.events.length);
    if (eventSummary) {
      this.events.push({
        id: "compressed-events",
        type: "STATE_CHANGE",
        timestamp: new Date(),
        data: { summary: eventSummary },
      });
    }

    // Replace artifacts with a summary artifact
    this.artifacts.clear();
    if (artifactSummary) {
      this.artifacts.set("compressed-artifacts", { summary: artifactSummary });
    }
  }

  /**
   * Get scope hierarchy path from root to this scope
   * Useful for debugging and logging
   */
  getPath(): string {
    if (this.parentId === null) {
      return this.id;
    }
    // Note: Full path resolution would require access to scope registry
    // For now, return simple parent->child notation
    return `${this.parentId}->${this.id}`;
  }

  /**
   * Create a compressed representation of this scope for storage
   * Used by ScopeCompressor when memory limits are reached
   */
  toCompressed(): {
    id: string;
    parentId: string | null;
    goal: string;
    level: ScopeLevel;
    eventCount: number;
    artifactCount: number;
    summary: string | null;
    tokenCount: number;
    createdAt: Date;
    closedAt: Date | null;
  } {
    return {
      id: this.id,
      parentId: this.parentId,
      goal: this.goal,
      level: this.level,
      eventCount: this.events.length,
      artifactCount: this.artifacts.size,
      summary: this.summary,
      tokenCount: this.getTokenCount(),
      createdAt: this.createdAt,
      closedAt: this.closedAt,
    };
  }
}