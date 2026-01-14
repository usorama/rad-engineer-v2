/**
 * Unit tests for ContractValidator
 * Tests: structural validation, condition validation, consistency checks
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  ContractValidator,
  validateContract,
  assertValidContract,
  AgentContract,
  ContractRegistry,
  StandardConditions,
} from "@/verification/index.js";
import { Condition } from "@/verification/Condition.js";

/**
 * Create a valid test contract
 */
function createValidContract(id: string = "valid-001"): AgentContract {
  return new AgentContract({
    id,
    name: "Valid Contract",
    taskType: "implement_feature",
    preconditions: [StandardConditions.hasInput("prompt")],
    postconditions: [StandardConditions.hasOutput("code")],
    invariants: [],
    verificationMethod: "runtime",
  });
}

describe("ContractValidator: Structural Validation", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Validates a well-formed contract", () => {
    const contract = createValidContract();
    const result = validator.validate(contract);

    expect(result.valid).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it("Warns on non-standard ID format", () => {
    const contract = new AgentContract({
      id: "id with spaces",
      name: "Test",
      taskType: "implement_feature",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract);

    expect(result.valid).toBe(true); // Warning, not error
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.code === "INVALID_ID_FORMAT")).toBe(true);
  });

  it("Validates task type", () => {
    const contract = new AgentContract({
      id: "type-001",
      name: "Test",
      taskType: "implement_feature",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract);
    expect(result.issues.some((i) => i.code === "INVALID_TASK_TYPE")).toBe(false);
  });

  it("Validates verification method", () => {
    const contract = new AgentContract({
      id: "method-001",
      name: "Test",
      taskType: "implement_feature",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "hybrid",
    });

    const result = validator.validate(contract);
    expect(result.issues.some((i) => i.code === "INVALID_VERIFICATION_METHOD")).toBe(
      false
    );
  });
});

describe("ContractValidator: Condition Validation", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Validates conditions have unique IDs", () => {
    const contract = new AgentContract({
      id: "dup-001",
      name: "Duplicate Conditions",
      taskType: "test",
      preconditions: [
        StandardConditions.hasInput("a"),
        StandardConditions.hasInput("a"), // Same ID
      ],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract);

    expect(result.issues.some((i) => i.code === "DUPLICATE_CONDITION_ID")).toBe(
      true
    );
  });

  it("Warns when condition type mismatches position", () => {
    // Create a postcondition but put it in preconditions
    const postcond = Condition.postcondition(
      "post-001",
      "Wrong Place",
      () => true,
      "Error"
    );

    const contract = new AgentContract({
      id: "mismatch-001",
      name: "Mismatch",
      taskType: "test",
      preconditions: [postcond as unknown as typeof postcond], // Force wrong position
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract);

    expect(result.issues.some((i) => i.code === "CONDITION_TYPE_MISMATCH")).toBe(
      true
    );
  });
});

describe("ContractValidator: Minimum Conditions", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Enforces minimum preconditions", () => {
    const contract = new AgentContract({
      id: "min-001",
      name: "Min Pre",
      taskType: "test",
      preconditions: [],
      postconditions: [StandardConditions.hasOutput("result")],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract, {
      minPreconditions: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INSUFFICIENT_PRECONDITIONS")).toBe(
      true
    );
  });

  it("Enforces minimum postconditions", () => {
    const contract = new AgentContract({
      id: "min-002",
      name: "Min Post",
      taskType: "test",
      preconditions: [StandardConditions.hasInput("input")],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract, {
      minPostconditions: 2,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INSUFFICIENT_POSTCONDITIONS")).toBe(
      true
    );
  });

  it("Warns when no conditions at all", () => {
    const contract = new AgentContract({
      id: "empty-001",
      name: "Empty",
      taskType: "test",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract);

    expect(result.issues.some((i) => i.code === "NO_CONDITIONS")).toBe(true);
  });
});

describe("ContractValidator: Completeness Check", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Suggests missing recommended preconditions", () => {
    const contract = new AgentContract({
      id: "complete-001",
      name: "Incomplete",
      taskType: "implement_feature",
      preconditions: [], // Missing has-specification, has-context
      postconditions: [
        StandardConditions.hasOutput("code"),
        StandardConditions.hasOutput("tests"),
        StandardConditions.noError(),
      ],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract, {
      checkCompleteness: true,
    });

    expect(
      result.issues.some((i) => i.code === "MISSING_RECOMMENDED_PRECONDITION")
    ).toBe(true);
  });

  it("Does not warn for custom task type", () => {
    const contract = new AgentContract({
      id: "custom-001",
      name: "Custom",
      taskType: "custom",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract, {
      checkCompleteness: true,
    });

    expect(
      result.issues.filter((i) => i.code === "MISSING_RECOMMENDED_PRECONDITION")
        .length
    ).toBe(0);
  });
});

describe("ContractValidator: Consistency Check", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Detects potential contradictions", () => {
    const hasFile = Condition.precondition(
      "has-file",
      "Has File",
      () => true,
      "Missing file"
    );
    const noFile = Condition.postcondition(
      "no-file",
      "No File",
      () => true,
      "File present"
    );

    const contract = new AgentContract({
      id: "contra-001",
      name: "Contradiction",
      taskType: "test",
      preconditions: [hasFile],
      postconditions: [noFile],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(contract, {
      checkConsistency: true,
    });

    expect(result.issues.some((i) => i.code === "POTENTIAL_CONTRADICTION")).toBe(
      true
    );
  });
});

describe("ContractValidator: Registry Validation", () => {
  let validator: ContractValidator;
  let registry: ContractRegistry;

  beforeEach(() => {
    validator = new ContractValidator();
    registry = new ContractRegistry();
    registry.register(createValidContract("existing-001"));
  });

  it("Warns about duplicate ID in registry", () => {
    const duplicate = createValidContract("existing-001");

    const result = validator.validate(duplicate, {
      registry,
    });

    expect(
      result.issues.some((i) => i.code === "DUPLICATE_CONTRACT_IN_REGISTRY")
    ).toBe(true);
  });

  it("Notes duplicate name with different ID", () => {
    const sameName = new AgentContract({
      id: "different-id",
      name: "Valid Contract", // Same name as existing-001
      taskType: "implement_feature",
      preconditions: [StandardConditions.hasInput("prompt")],
      postconditions: [StandardConditions.hasOutput("code")],
      invariants: [],
      verificationMethod: "runtime",
    });

    const result = validator.validate(sameName, {
      registry,
    });

    expect(result.issues.some((i) => i.code === "DUPLICATE_CONTRACT_NAME")).toBe(
      true
    );
  });
});

describe("ContractValidator: Custom Rules", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Applies custom validation rules", () => {
    const contract = createValidContract("custom-rule-001");

    const result = validator.validate(contract, {
      customRules: [
        {
          id: "require-description",
          name: "Require Description",
          validate: (c) => {
            if (!c.description) {
              return [
                {
                  code: "MISSING_DESCRIPTION",
                  message: "Contract should have a description",
                  severity: "warning",
                },
              ];
            }
            return [];
          },
        },
      ],
    });

    expect(result.issues.some((i) => i.code === "MISSING_DESCRIPTION")).toBe(
      true
    );
  });

  it("Handles custom rule errors", () => {
    const contract = createValidContract("error-rule-001");

    const result = validator.validate(contract, {
      customRules: [
        {
          id: "error-rule",
          name: "Error Rule",
          validate: () => {
            throw new Error("Custom rule error");
          },
        },
      ],
    });

    expect(result.issues.some((i) => i.code === "CUSTOM_RULE_ERROR")).toBe(true);
  });
});

describe("ContractValidator: Utility Functions", () => {
  it("validateContract is a shortcut", () => {
    const contract = createValidContract();
    const result = validateContract(contract);

    expect(result.valid).toBe(true);
    expect(result.contractId).toBe("valid-001");
  });

  it("assertValidContract does not throw for valid contract", () => {
    const contract = createValidContract();
    expect(() => assertValidContract(contract)).not.toThrow();
  });

  it("assertValidContract throws for invalid contract", () => {
    const contract = new AgentContract({
      id: "",
      name: "",
      taskType: "implement_feature",
      preconditions: [],
      postconditions: [],
      invariants: [],
      verificationMethod: "runtime",
    });

    expect(() => assertValidContract(contract)).toThrow(
      "Contract validation failed"
    );
  });
});

describe("ContractValidator: validateAll", () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  it("Validates multiple contracts", () => {
    const contracts = [
      createValidContract("multi-001"),
      createValidContract("multi-002"),
      createValidContract("multi-003"),
    ];

    const results = validator.validateAll(contracts);

    expect(results.size).toBe(3);
    expect(results.get("multi-001")?.valid).toBe(true);
    expect(results.get("multi-002")?.valid).toBe(true);
    expect(results.get("multi-003")?.valid).toBe(true);
  });
});
