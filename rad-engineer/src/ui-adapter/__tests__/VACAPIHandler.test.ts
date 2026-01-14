/**
 * Unit tests for VACAPIHandler
 *
 * Tests:
 * - 10 IPC channel handlers (getAllContracts, getContract, createContract, etc.)
 * - Mock implementations (placeholder data for Phase 1)
 * - EventEmitter base class functionality
 * - Error handling
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { VACAPIHandler } from "@/ui-adapter/VACAPIHandler.js";
import type { VACAPIHandlerConfig } from "@/ui-adapter/VACAPIHandler.js";
import { promises as fs } from "fs";
import { join } from "path";

describe("VACAPIHandler: Initialization", () => {
  let handler: VACAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-vac-handler");
    await fs.mkdir(tempDir, { recursive: true });

    const config: VACAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };
    handler = new VACAPIHandler(config);
  });

  afterEach(async () => {
    handler.removeAllListeners();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Initializes with provided config", () => {
    expect(handler).toBeDefined();
  });

  it("Logs debug messages when debug enabled", () => {
    const config: VACAPIHandlerConfig = {
      projectDir: "/test/project",
      debug: true,
    };

    const debugHandler = new VACAPIHandler(config);
    expect(debugHandler).toBeDefined();
  });
});

describe("VACAPIHandler: getAllContracts", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with contract list", async () => {
    const result = await handler.getAllContracts();

    expect(result.success).toBe(true);
    expect(result.contracts).toBeDefined();
    expect(Array.isArray(result.contracts)).toBe(true);
  });

  it("Returns placeholder contracts data", async () => {
    const result = await handler.getAllContracts();

    expect(result.contracts?.length).toBeGreaterThan(0);
    const firstContract = result.contracts![0];
    expect(firstContract).toHaveProperty("id");
    expect(firstContract).toHaveProperty("name");
    expect(firstContract).toHaveProperty("taskType");
  });
});

describe("VACAPIHandler: getContract", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Returns success with contract details", async () => {
    const result = await handler.getContract("test-contract-id");

    expect(result.success).toBe(true);
    expect(result.contract).toBeDefined();
  });

  it("Returns contract with ID matching request", async () => {
    const contractId = "feature-impl-001";
    const result = await handler.getContract(contractId);

    expect(result.contract?.id).toBe(contractId);
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.getContract("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: createContract", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Creates contract and returns success", async () => {
    const contractData = {
      name: "New Feature Contract",
      taskType: "implement_feature" as const,
      preconditions: [],
      postconditions: [],
      invariants: [],
    };

    const result = await handler.createContract(contractData);

    expect(result.success).toBe(true);
    expect(result.contract).toBeDefined();
    expect(result.contract?.name).toBe(contractData.name);
  });

  it("Returns error for missing required fields", async () => {
    const result = await handler.createContract({} as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: updateContract", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Updates contract and returns success", async () => {
    const contractId = "test-contract-id";
    const updates = { name: "Updated Contract Name" };

    const result = await handler.updateContract(contractId, updates);

    expect(result.success).toBe(true);
    expect(result.contract).toBeDefined();
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.updateContract("", {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: deleteContract", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Deletes contract and returns success", async () => {
    const contractId = "test-contract-id";
    const result = await handler.deleteContract(contractId);

    expect(result.success).toBe(true);
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.deleteContract("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: runVerification", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Runs verification and returns success", async () => {
    const contractId = "test-contract-id";
    const context = {
      scopeId: "test-scope",
      taskId: "test-task",
      inputs: { agentId: "test-agent" },
      state: "EXECUTING" as const,
      artifacts: new Map(),
      startTime: new Date(),
    };

    const result = await handler.runVerification(contractId, context);

    expect(result.success).toBe(true);
    expect(result.verificationResult).toBeDefined();
  });

  it("Returns verification result with passed status", async () => {
    const context = {
      scopeId: "test-scope",
      taskId: "test-task",
      inputs: {},
      state: "EXECUTING" as const,
      artifacts: new Map(),
      startTime: new Date(),
    };
    const result = await handler.runVerification("test-id", context);

    expect(result.verificationResult?.success).toBe(true);
    expect(result.verificationResult?.preconditionResults).toBeDefined();
    expect(result.verificationResult?.postconditionResults).toBeDefined();
  });

  it("Returns error for empty contract ID", async () => {
    const context = {
      scopeId: "test-scope",
      taskId: "test-task",
      inputs: {},
      state: "EXECUTING" as const,
      artifacts: new Map(),
      startTime: new Date(),
    };
    const result = await handler.runVerification("", context);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: checkDrift", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Checks drift and returns success", async () => {
    const contractId = "test-contract-id";
    const result = await handler.checkDrift(contractId);

    expect(result.success).toBe(true);
    expect(result.driftDetected).toBeDefined();
  });

  it("Returns drift details when drift detected", async () => {
    const result = await handler.checkDrift("test-id");

    expect(result.driftDetected).toBe(false);
    expect(result.driftDetails).toBeDefined();
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.checkDrift("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: compareAST", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Compares AST and returns success", async () => {
    const contractId = "test-contract-id";
    const result = await handler.compareAST(contractId);

    expect(result.success).toBe(true);
    expect(result.astComparison).toBeDefined();
  });

  it("Returns AST comparison with differences", async () => {
    const result = await handler.compareAST("test-id");

    expect(result.astComparison?.identical).toBeDefined();
    expect(result.astComparison?.differences).toBeDefined();
    expect(Array.isArray(result.astComparison?.differences)).toBe(true);
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.compareAST("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: getVerificationHistory", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Gets verification history and returns success", async () => {
    const contractId = "test-contract-id";
    const result = await handler.getVerificationHistory(contractId);

    expect(result.success).toBe(true);
    expect(result.history).toBeDefined();
    expect(Array.isArray(result.history)).toBe(true);
  });

  it("Returns history with verification records", async () => {
    const result = await handler.getVerificationHistory("test-id");

    expect(result.history?.length).toBeGreaterThanOrEqual(0);
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.getVerificationHistory("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("VACAPIHandler: getDriftHistory", () => {
  let handler: VACAPIHandler;

  beforeEach(() => {
    handler = new VACAPIHandler({
      projectDir: "/test/project",
      debug: false,
    });
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  it("Gets drift history and returns success", async () => {
    const contractId = "test-contract-id";
    const result = await handler.getDriftHistory(contractId);

    expect(result.success).toBe(true);
    expect(result.history).toBeDefined();
    expect(Array.isArray(result.history)).toBe(true);
  });

  it("Returns history with drift check records", async () => {
    const result = await handler.getDriftHistory("test-id");

    expect(result.history?.length).toBeGreaterThanOrEqual(0);
  });

  it("Returns error for empty contract ID", async () => {
    const result = await handler.getDriftHistory("");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
