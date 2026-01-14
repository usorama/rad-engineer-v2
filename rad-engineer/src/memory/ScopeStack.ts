/**
 * ScopeStack - Stack-based hierarchical scope management
 * Implements LIFO (Last In, First Out) scope navigation for hierarchical memory
 * Supports parent-child relationships and token budget tracking
 */

import { Scope } from "./Scope";

/**
 * ScopeStack manages a stack of scopes with LIFO semantics
 * Used for hierarchical context management in the memory system
 */
export class ScopeStack {
  private scopes: Scope[];

  constructor() {
    this.scopes = [];
  }

  /**
   * Push a scope onto the stack (becomes new current scope)
   */
  push(scope: Scope): void {
    this.scopes.push(scope);
  }

  /**
   * Pop the current scope from the stack
   * Returns the removed scope, or null if stack is empty
   */
  pop(): Scope | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.scopes.pop()!;
  }

  /**
   * Get the current (top) scope without removing it
   * Returns null if stack is empty
   */
  current(): Scope | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.scopes[this.scopes.length - 1];
  }

  /**
   * Peek at scope at specified depth from top
   * depth=0 is current scope, depth=1 is parent, etc.
   * Returns null if depth is out of bounds
   */
  peek(depth: number): Scope | null {
    if (depth < 0 || depth >= this.scopes.length) {
      return null;
    }
    return this.scopes[this.scopes.length - 1 - depth];
  }

  /**
   * Get the number of scopes in the stack
   */
  size(): number {
    return this.scopes.length;
  }

  /**
   * Check if the stack is empty
   */
  isEmpty(): boolean {
    return this.scopes.length === 0;
  }

  /**
   * Get hierarchy path from root to current scope
   * Returns array of scope IDs from bottom to top
   */
  getPath(): string[] {
    return this.scopes.map((scope) => scope.id);
  }

  /**
   * Find a scope by ID in the stack
   * Returns the scope if found, null otherwise
   */
  findScope(id: string): Scope | null {
    return this.scopes.find((scope) => scope.id === id) ?? null;
  }

  /**
   * Get total token count for all scopes in the stack
   * Used for memory budget management
   */
  getTotalTokenCount(): number {
    return this.scopes.reduce((total, scope) => total + scope.getTokenCount(), 0);
  }

  /**
   * Clear all scopes from the stack
   */
  clear(): void {
    this.scopes = [];
  }

  /**
   * Get all scopes in the stack (from bottom to top)
   * Returns a copy to prevent external mutation
   */
  getAllScopes(): Scope[] {
    return [...this.scopes];
  }

  /**
   * Get scopes at a specific level
   * Useful for level-based operations (e.g., compress all LOCAL scopes)
   */
  getScopesByLevel(level: string): Scope[] {
    return this.scopes.filter((scope) => scope.level === level);
  }

  /**
   * Check if stack contains a scope with the given ID
   */
  hasScope(id: string): boolean {
    return this.scopes.some((scope) => scope.id === id);
  }

  /**
   * Get the depth of a scope in the stack (0 = top)
   * Returns -1 if scope not found
   */
  getScopeDepth(id: string): number {
    const index = this.scopes.findIndex((scope) => scope.id === id);
    if (index === -1) {
      return -1;
    }
    return this.scopes.length - 1 - index;
  }

  /**
   * Get parent scope of the current scope
   * Returns null if current scope has no parent or stack is empty
   */
  getParentScope(): Scope | null {
    if (this.size() <= 1) {
      return null;
    }
    return this.peek(1);
  }

  /**
   * Validate stack integrity - ensure parent-child relationships are correct
   * Returns array of validation errors, empty if valid
   */
  validateIntegrity(): string[] {
    const errors: string[] = [];

    for (let i = 1; i < this.scopes.length; i++) {
      const current = this.scopes[i];
      const parent = this.scopes[i - 1];

      if (current.parentId !== null && current.parentId !== parent.id) {
        errors.push(
          `Scope ${current.id} has parentId ${current.parentId} but parent is ${parent.id}`
        );
      }
    }

    return errors;
  }

  /**
   * Create a snapshot of current stack state for debugging
   */
  snapshot(): {
    size: number;
    totalTokens: number;
    path: string[];
    currentScope: string | null;
    scopes: Array<{
      id: string;
      level: string;
      goal: string;
      tokenCount: number;
      isClosed: boolean;
    }>;
  } {
    const current = this.current();
    return {
      size: this.size(),
      totalTokens: this.getTotalTokenCount(),
      path: this.getPath(),
      currentScope: current ? current.id : null,
      scopes: this.scopes.map((scope) => ({
        id: scope.id,
        level: scope.level,
        goal: scope.goal,
        tokenCount: scope.getTokenCount(),
        isClosed: scope.isClosed(),
      })),
    };
  }
}