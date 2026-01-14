import { describe, it, expect } from "bun:test";
import { ScopeStack } from "../../src/memory/ScopeStack";
import { Scope, ScopeLevel } from "../../src/memory/Scope";

describe("ScopeStack", () => {
  describe("constructor", () => {
    it("should create empty scope stack", () => {
      const stack = new ScopeStack();
      expect(stack.size()).toBe(0);
      expect(stack.isEmpty()).toBe(true);
      expect(stack.current()).toBe(null);
    });
  });

  describe("push", () => {
    it("should push scope onto stack", () => {
      const stack = new ScopeStack();
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      stack.push(scope);
      expect(stack.size()).toBe(1);
      expect(stack.isEmpty()).toBe(false);
      expect(stack.current()).toBe(scope);
    });

    it("should maintain LIFO order when pushing multiple scopes", () => {
      const stack = new ScopeStack();

      const scope1 = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "First scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const scope2 = new Scope({
        id: "scope-2",
        parentId: "scope-1",
        goal: "Second scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      stack.push(scope1);
      stack.push(scope2);

      expect(stack.size()).toBe(2);
      expect(stack.current()).toBe(scope2); // Most recent should be current
    });

    it("should automatically set parentId when pushing child scope", () => {
      const stack = new ScopeStack();

      const parentScope = new Scope({
        id: "parent",
        parentId: null,
        goal: "Parent scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const childScope = new Scope({
        id: "child",
        parentId: "parent", // Should match current scope
        goal: "Child scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      stack.push(parentScope);
      stack.push(childScope);

      expect(childScope.parentId).toBe("parent");
      expect(stack.current()).toBe(childScope);
    });
  });

  describe("pop", () => {
    it("should pop scope from stack", () => {
      const stack = new ScopeStack();
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      stack.push(scope);
      const popped = stack.pop();

      expect(popped).toBe(scope);
      expect(stack.size()).toBe(0);
      expect(stack.isEmpty()).toBe(true);
      expect(stack.current()).toBe(null);
    });

    it("should return null when popping from empty stack", () => {
      const stack = new ScopeStack();
      const popped = stack.pop();
      expect(popped).toBe(null);
    });

    it("should maintain stack order with multiple operations", () => {
      const stack = new ScopeStack();

      const scope1 = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "First scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const scope2 = new Scope({
        id: "scope-2",
        parentId: "scope-1",
        goal: "Second scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      // Push both
      stack.push(scope1);
      stack.push(scope2);

      // Pop should return most recent first
      expect(stack.pop()).toBe(scope2);
      expect(stack.current()).toBe(scope1);
      expect(stack.pop()).toBe(scope1);
      expect(stack.current()).toBe(null);
    });
  });

  describe("current", () => {
    it("should return null for empty stack", () => {
      const stack = new ScopeStack();
      expect(stack.current()).toBe(null);
    });

    it("should return top scope without removing it", () => {
      const stack = new ScopeStack();
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      stack.push(scope);

      // Multiple calls should return same scope
      expect(stack.current()).toBe(scope);
      expect(stack.current()).toBe(scope);
      expect(stack.size()).toBe(1); // Size unchanged
    });
  });

  describe("peek", () => {
    it("should return scope at specified depth", () => {
      const stack = new ScopeStack();

      const scope1 = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Bottom scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const scope2 = new Scope({
        id: "scope-2",
        parentId: "scope-1",
        goal: "Middle scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      const scope3 = new Scope({
        id: "scope-3",
        parentId: "scope-2",
        goal: "Top scope",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      stack.push(scope1);
      stack.push(scope2);
      stack.push(scope3);

      expect(stack.peek(0)).toBe(scope3); // Top
      expect(stack.peek(1)).toBe(scope2); // Middle
      expect(stack.peek(2)).toBe(scope1); // Bottom
      expect(stack.peek(3)).toBe(null);   // Out of bounds
    });
  });

  describe("getPath", () => {
    it("should return hierarchy path from root to current", () => {
      const stack = new ScopeStack();

      const global = new Scope({
        id: "global",
        parentId: null,
        goal: "Global scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const task = new Scope({
        id: "task-1",
        parentId: "global",
        goal: "Task scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      const local = new Scope({
        id: "local-1",
        parentId: "task-1",
        goal: "Local scope",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      stack.push(global);
      stack.push(task);
      stack.push(local);

      const path = stack.getPath();
      expect(path).toEqual(["global", "task-1", "local-1"]);
    });

    it("should return empty array for empty stack", () => {
      const stack = new ScopeStack();
      expect(stack.getPath()).toEqual([]);
    });
  });

  describe("findScope", () => {
    it("should find scope by id in stack", () => {
      const stack = new ScopeStack();

      const scope1 = new Scope({
        id: "find-me",
        parentId: null,
        goal: "Findable scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const scope2 = new Scope({
        id: "other",
        parentId: "find-me",
        goal: "Other scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      stack.push(scope1);
      stack.push(scope2);

      expect(stack.findScope("find-me")).toBe(scope1);
      expect(stack.findScope("other")).toBe(scope2);
      expect(stack.findScope("nonexistent")).toBe(null);
    });
  });

  describe("getTotalTokenCount", () => {
    it("should sum token counts for all scopes in stack", () => {
      const stack = new ScopeStack();

      const scope1 = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "First scope with some content",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const scope2 = new Scope({
        id: "scope-2",
        parentId: "scope-1",
        goal: "Second scope with more content",
        level: ScopeLevel.TASK,
        events: [],
      });

      stack.push(scope1);
      stack.push(scope2);

      const totalTokens = stack.getTotalTokenCount();
      expect(typeof totalTokens).toBe("number");
      expect(totalTokens).toBeGreaterThan(0);
      expect(totalTokens).toBe(scope1.getTokenCount() + scope2.getTokenCount());
    });

    it("should return 0 for empty stack", () => {
      const stack = new ScopeStack();
      expect(stack.getTotalTokenCount()).toBe(0);
    });
  });

  describe("clear", () => {
    it("should clear all scopes from stack", () => {
      const stack = new ScopeStack();

      const scope1 = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "First scope",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const scope2 = new Scope({
        id: "scope-2",
        parentId: "scope-1",
        goal: "Second scope",
        level: ScopeLevel.TASK,
        events: [],
      });

      stack.push(scope1);
      stack.push(scope2);

      expect(stack.size()).toBe(2);

      stack.clear();

      expect(stack.size()).toBe(0);
      expect(stack.isEmpty()).toBe(true);
      expect(stack.current()).toBe(null);
    });
  });
});