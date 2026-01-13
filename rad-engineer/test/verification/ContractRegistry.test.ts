/**
 * Unit tests for ContractRegistry
 * Tests: registration, lookup, queries, statistics
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  ContractRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
  AgentContract,
  StandardConditions,
} from "@/verification/index.js";

/**
 * Create a test contract
 */
function createTestContract(id: string, taskType: string = "implement_feature", tags: string[] = []): AgentContract {
  return new AgentContract({
    id,
    name: `Test Contract ${id}`,
    taskType: taskType as "implement_feature" | "fix_bug" | "refactor" | "test",
    preconditions: [StandardConditions.hasInput("prompt")],
    postconditions: [StandardConditions.hasOutput("code")],
    invariants: [],
    verificationMethod: "runtime",
    tags,
  });
}

describe("ContractRegistry: Basic Operations", () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
  });

  it("Registers a contract", () => {
    const contract = createTestContract("reg-001");
    registry.register(contract);

    expect(registry.size).toBe(1);
    expect(registry.has("reg-001")).toBe(true);
  });

  it("Gets a registered contract", () => {
    const contract = createTestContract("get-001");
    registry.register(contract);

    const retrieved = registry.get("get-001");
    expect(retrieved).toBe(contract);
  });

  it("Returns undefined for missing contract", () => {
    expect(registry.get("missing")).toBeUndefined();
  });

  it("Unregisters a contract", () => {
    const contract = createTestContract("unreg-001");
    registry.register(contract);

    expect(registry.unregister("unreg-001")).toBe(true);
    expect(registry.has("unreg-001")).toBe(false);
    expect(registry.size).toBe(0);
  });

  it("Returns false when unregistering missing contract", () => {
    expect(registry.unregister("missing")).toBe(false);
  });

  it("Clears all contracts", () => {
    registry.register(createTestContract("clear-001"));
    registry.register(createTestContract("clear-002"));

    registry.clear();

    expect(registry.size).toBe(0);
  });
});

describe("ContractRegistry: Metadata", () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
  });

  it("Tracks registration metadata", () => {
    const contract = createTestContract("meta-001");
    registry.register(contract);

    const meta = registry.getMetadata("meta-001");

    expect(meta).toBeDefined();
    expect(meta?.id).toBe("meta-001");
    expect(meta?.version).toBe(1);
    expect(meta?.registeredAt).toBeInstanceOf(Date);
    expect(meta?.updatedAt).toBeInstanceOf(Date);
  });

  it("Increments version on re-registration", () => {
    const contract1 = createTestContract("ver-001");
    registry.register(contract1);

    const contract2 = createTestContract("ver-001");
    registry.register(contract2);

    const meta = registry.getMetadata("ver-001");
    expect(meta?.version).toBe(2);
  });

  it("Updates updatedAt on re-registration", async () => {
    const contract1 = createTestContract("update-001");
    registry.register(contract1);

    const firstMeta = registry.getMetadata("update-001");
    const firstUpdated = firstMeta?.updatedAt;

    // Small delay to ensure time difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const contract2 = createTestContract("update-001");
    registry.register(contract2);

    const secondMeta = registry.getMetadata("update-001");
    expect(secondMeta?.updatedAt.getTime()).toBeGreaterThan(
      firstUpdated?.getTime() || 0
    );
  });
});

describe("ContractRegistry: Queries", () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
    registry.register(createTestContract("feature-1", "implement_feature", ["core"]));
    registry.register(createTestContract("feature-2", "implement_feature", ["ui"]));
    registry.register(createTestContract("bug-1", "fix_bug", ["core"]));
    registry.register(createTestContract("test-1", "test", ["testing"]));
  });

  it("Finds contracts by task type", () => {
    const features = registry.findByTaskType("implement_feature");
    expect(features).toHaveLength(2);
    expect(features.every((c) => c.taskType === "implement_feature")).toBe(true);
  });

  it("Returns empty for non-existent task type", () => {
    const results = registry.findByTaskType("deploy");
    expect(results).toHaveLength(0);
  });

  it("Finds contracts by tags", () => {
    const core = registry.findByTags(["core"]);
    expect(core).toHaveLength(2);
  });

  it("Finds contracts matching any tag", () => {
    const coreOrUi = registry.findByTags(["core", "ui"]);
    expect(coreOrUi).toHaveLength(3); // feature-1, feature-2, bug-1
  });

  it("Queries with multiple filters", () => {
    const results = registry.query({
      taskType: "implement_feature",
      tags: ["core"],
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("feature-1");
  });

  it("Gets all contracts", () => {
    const all = registry.getAll();
    expect(all).toHaveLength(4);
  });

  it("Limits results", () => {
    const limited = registry.getAll({ limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it("Sorts by name ascending", () => {
    const sorted = registry.getAll({
      sortBy: "name",
      sortOrder: "asc",
    });
    expect(sorted[0].name.includes("bug")).toBe(true);
    expect(sorted[sorted.length - 1].name.includes("test")).toBe(true);
  });

  it("Sorts by name descending", () => {
    const sorted = registry.getAll({
      sortBy: "name",
      sortOrder: "desc",
    });
    expect(sorted[0].name.includes("test")).toBe(true);
  });
});

describe("ContractRegistry: Enable/Disable", () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
    registry.register(createTestContract("enable-001"));
  });

  it("Disables a contract", () => {
    const result = registry.disable("enable-001");
    expect(result).toBe(true);

    const meta = registry.getMetadata("enable-001");
    expect(meta?.enabled).toBe(false);
  });

  it("Re-enables a contract", () => {
    registry.disable("enable-001");
    const result = registry.enable("enable-001");

    expect(result).toBe(true);
    const meta = registry.getMetadata("enable-001");
    expect(meta?.enabled).toBe(true);
  });

  it("Excludes disabled contracts from queries by default", () => {
    registry.register(createTestContract("enable-002"));
    registry.disable("enable-001");

    const results = registry.getAll();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("enable-002");
  });

  it("Includes disabled contracts when requested", () => {
    registry.register(createTestContract("enable-002"));
    registry.disable("enable-001");

    const results = registry.getAll({ includeDisabled: true });
    expect(results).toHaveLength(2);
  });

  it("Returns false for missing contract", () => {
    expect(registry.enable("missing")).toBe(false);
    expect(registry.disable("missing")).toBe(false);
  });
});

describe("ContractRegistry: Statistics", () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
    registry.register(createTestContract("stats-1", "implement_feature", ["a", "b"]));
    registry.register(createTestContract("stats-2", "implement_feature", ["a"]));
    registry.register(createTestContract("stats-3", "fix_bug", ["c"]));
  });

  it("Counts total contracts", () => {
    const stats = registry.getStats();
    expect(stats.totalContracts).toBe(3);
  });

  it("Counts enabled contracts", () => {
    registry.disable("stats-1");
    const stats = registry.getStats();
    expect(stats.enabledContracts).toBe(2);
  });

  it("Counts by task type", () => {
    const stats = registry.getStats();
    expect(stats.byTaskType.implement_feature).toBe(2);
    expect(stats.byTaskType.fix_bug).toBe(1);
  });

  it("Lists unique tags", () => {
    const stats = registry.getStats();
    expect(stats.uniqueTags.sort()).toEqual(["a", "b", "c"]);
  });

  it("Calculates average conditions per contract", () => {
    const stats = registry.getStats();
    // Each test contract has 1 pre + 1 post = 2 conditions
    expect(stats.avgConditionsPerContract).toBe(2);
  });
});

describe("ContractRegistry: Global Registry", () => {
  beforeEach(() => {
    resetGlobalRegistry();
  });

  it("Returns singleton instance", () => {
    const reg1 = getGlobalRegistry();
    const reg2 = getGlobalRegistry();
    expect(reg1).toBe(reg2);
  });

  it("Persists contracts across calls", () => {
    const reg1 = getGlobalRegistry();
    reg1.register(createTestContract("global-001"));

    const reg2 = getGlobalRegistry();
    expect(reg2.has("global-001")).toBe(true);
  });

  it("Resets with resetGlobalRegistry", () => {
    const reg1 = getGlobalRegistry();
    reg1.register(createTestContract("reset-001"));

    resetGlobalRegistry();

    const reg2 = getGlobalRegistry();
    expect(reg2.has("reset-001")).toBe(false);
  });
});

describe("ContractRegistry: JSON Export", () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
    registry.register(createTestContract("json-001", "implement_feature", ["a"]));
  });

  it("Exports to JSON", () => {
    const json = registry.toJSON();

    expect(json.contracts).toBeInstanceOf(Array);
    expect(json.stats).toBeDefined();
    expect((json.contracts as unknown[]).length).toBe(1);
  });

  it("Includes metadata in export", () => {
    const json = registry.toJSON();
    const contracts = json.contracts as Array<Record<string, unknown>>;

    expect(contracts[0].metadata).toBeDefined();
    expect((contracts[0].metadata as Record<string, unknown>).version).toBe(1);
  });
});
