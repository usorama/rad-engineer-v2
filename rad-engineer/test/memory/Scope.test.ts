import { describe, it, expect } from "bun:test";
import { Scope, ScopeLevel, type ContextEvent } from "../../src/memory/Scope";

describe("Scope", () => {
  describe("constructor", () => {
    it("should create a scope with all required properties", () => {
      const mockEvent: ContextEvent = {
        id: "event-1",
        type: "USER_INPUT",
        timestamp: new Date("2026-01-13T10:00:00Z"),
        data: { message: "Hello" },
      };

      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.GLOBAL,
        events: [mockEvent],
      });

      expect(scope.id).toBe("scope-1");
      expect(scope.parentId).toBe(null);
      expect(scope.goal).toBe("Test goal");
      expect(scope.level).toBe(ScopeLevel.GLOBAL);
      expect(scope.events).toEqual([mockEvent]);
      expect(scope.summary).toBe(null);
      expect(scope.artifacts).toBeInstanceOf(Map);
      expect(scope.artifacts.size).toBe(0);
      expect(scope.createdAt).toBeInstanceOf(Date);
      expect(scope.closedAt).toBe(null);
    });

    it("should create child scope with parent reference", () => {
      const parentScope = new Scope({
        id: "parent-1",
        parentId: null,
        goal: "Parent goal",
        level: ScopeLevel.GLOBAL,
        events: [],
      });

      const childScope = new Scope({
        id: "child-1",
        parentId: "parent-1",
        goal: "Child goal",
        level: ScopeLevel.TASK,
        events: [],
      });

      expect(childScope.parentId).toBe("parent-1");
      expect(childScope.level).toBe(ScopeLevel.TASK);
    });
  });

  describe("addEvent", () => {
    it("should add event to scope", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      const event: ContextEvent = {
        id: "event-1",
        type: "AGENT_OUTPUT",
        timestamp: new Date(),
        data: { result: "success" },
      };

      scope.addEvent(event);
      expect(scope.events).toHaveLength(1);
      expect(scope.events[0]).toEqual(event);
    });
  });

  describe("setArtifact", () => {
    it("should set artifact in scope", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      scope.setArtifact("testKey", { value: "testData" });
      expect(scope.artifacts.get("testKey")).toEqual({ value: "testData" });
    });
  });

  describe("getArtifact", () => {
    it("should get artifact from scope", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      const testData = { value: "testData" };
      scope.setArtifact("testKey", testData);
      expect(scope.getArtifact<{ value: string }>("testKey")).toEqual(testData);
    });

    it("should return undefined for non-existent artifact", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      expect(scope.getArtifact("nonExistent")).toBeUndefined();
    });
  });

  describe("close", () => {
    it("should set closedAt timestamp when closed", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      const summary = "Scope completed successfully";
      scope.close(summary);

      expect(scope.closedAt).toBeInstanceOf(Date);
      expect(scope.summary).toBe(summary);
    });

    it("should not allow closing already closed scope", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      scope.close("First close");

      expect(() => scope.close("Second close")).toThrow("Scope is already closed");
    });
  });

  describe("isClosed", () => {
    it("should return false for open scope", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      expect(scope.isClosed()).toBe(false);
    });

    it("should return true for closed scope", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal",
        level: ScopeLevel.LOCAL,
        events: [],
      });

      scope.close("Completed");
      expect(scope.isClosed()).toBe(true);
    });
  });

  describe("getTokenCount", () => {
    it("should estimate token count for scope content", () => {
      const scope = new Scope({
        id: "scope-1",
        parentId: null,
        goal: "Test goal with some content",
        level: ScopeLevel.LOCAL,
        events: [
          {
            id: "event-1",
            type: "USER_INPUT",
            timestamp: new Date(),
            data: { message: "Hello world this is a test message" },
          },
        ],
      });

      const tokenCount = scope.getTokenCount();
      expect(typeof tokenCount).toBe("number");
      expect(tokenCount).toBeGreaterThan(0);
    });
  });
});