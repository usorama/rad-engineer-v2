/**
 * ContractValidator - Validates contract consistency and correctness
 *
 * Ensures contracts are well-formed, non-contradictory, and meet
 * the requirements for verifiable agentic execution.
 *
 * Validation checks:
 * - Structural validity (required fields present)
 * - Condition validity (predicates are functions)
 * - Consistency (no contradictory conditions)
 * - Completeness (all required conditions present)
 */

import type {
  AgentContract,
  TaskType,
  VerificationMethod,
} from "./AgentContract.js";
import type { Condition, ConditionType } from "./Condition.js";
import type { ContractRegistry } from "./ContractRegistry.js";

/**
 * Validation severity levels
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Single validation issue
 */
export interface ValidationIssue {
  /** Issue code */
  code: string;
  /** Issue message */
  message: string;
  /** Severity */
  severity: ValidationSeverity;
  /** Path to the issue (e.g., "preconditions[0].predicate") */
  path?: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed (no errors) */
  valid: boolean;
  /** Contract ID being validated */
  contractId: string;
  /** All issues found */
  issues: ValidationIssue[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Info count */
  infoCount: number;
  /** Validation timestamp */
  validatedAt: Date;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Check for missing recommended conditions */
  checkCompleteness?: boolean;
  /** Check for potential contradictions */
  checkConsistency?: boolean;
  /** Validate against registry for duplicates */
  registry?: ContractRegistry;
  /** Custom validation rules */
  customRules?: ValidationRule[];
  /** Minimum preconditions required */
  minPreconditions?: number;
  /** Minimum postconditions required */
  minPostconditions?: number;
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Validation function */
  validate: (contract: AgentContract) => ValidationIssue[];
}

/**
 * Recommended conditions by task type
 */
const RECOMMENDED_CONDITIONS: Record<TaskType, {
  preconditions: string[];
  postconditions: string[];
}> = {
  implement_feature: {
    preconditions: ["has-specification", "has-context"],
    postconditions: ["has-code", "has-tests", "no-errors"],
  },
  fix_bug: {
    preconditions: ["has-bug-report", "has-reproduction"],
    postconditions: ["bug-fixed", "no-regression", "no-errors"],
  },
  refactor: {
    preconditions: ["has-code", "tests-passing"],
    postconditions: ["tests-passing", "no-behavior-change"],
  },
  test: {
    preconditions: ["has-code-to-test"],
    postconditions: ["has-tests", "coverage-met"],
  },
  review: {
    preconditions: ["has-code-to-review"],
    postconditions: ["has-feedback"],
  },
  deploy: {
    preconditions: ["tests-passing", "build-passing"],
    postconditions: ["deployed", "health-check-passed"],
  },
  custom: {
    preconditions: [],
    postconditions: [],
  },
};

/**
 * ContractValidator - Validates contract consistency
 *
 * @example
 * ```ts
 * const validator = new ContractValidator();
 *
 * const result = validator.validate(myContract);
 * if (!result.valid) {
 *   console.error("Contract validation failed:", result.issues);
 * }
 *
 * // Validate with options
 * const resultWithOptions = validator.validate(myContract, {
 *   checkCompleteness: true,
 *   checkConsistency: true,
 *   registry: myRegistry,
 * });
 * ```
 */
export class ContractValidator {
  /**
   * Validate a contract
   */
  validate(
    contract: AgentContract,
    options: ValidationOptions = {}
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const {
      checkCompleteness = true,
      checkConsistency = true,
      registry,
      customRules = [],
      minPreconditions = 0,
      minPostconditions = 0,
    } = options;

    // 1. Structural validation
    issues.push(...this.validateStructure(contract));

    // 2. Condition validation
    issues.push(...this.validateConditions(contract));

    // 3. Minimum conditions
    issues.push(
      ...this.validateMinimumConditions(
        contract,
        minPreconditions,
        minPostconditions
      )
    );

    // 4. Completeness check
    if (checkCompleteness) {
      issues.push(...this.checkCompleteness(contract));
    }

    // 5. Consistency check
    if (checkConsistency) {
      issues.push(...this.checkConsistency(contract));
    }

    // 6. Registry validation
    if (registry) {
      issues.push(...this.validateAgainstRegistry(contract, registry));
    }

    // 7. Custom rules
    for (const rule of customRules) {
      try {
        issues.push(...rule.validate(contract));
      } catch (error) {
        issues.push({
          code: "CUSTOM_RULE_ERROR",
          message: `Custom rule '${rule.name}' threw an error: ${error instanceof Error ? error.message : String(error)}`,
          severity: "error",
          path: `customRules.${rule.id}`,
        });
      }
    }

    // Count by severity
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;

    return {
      valid: errorCount === 0,
      contractId: contract.id,
      issues,
      errorCount,
      warningCount,
      infoCount,
      validatedAt: new Date(),
    };
  }

  /**
   * Validate multiple contracts
   */
  validateAll(
    contracts: AgentContract[],
    options: ValidationOptions = {}
  ): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();

    for (const contract of contracts) {
      results.set(contract.id, this.validate(contract, options));
    }

    return results;
  }

  /**
   * Validate structural requirements
   */
  private validateStructure(contract: AgentContract): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check ID
    if (!contract.id || contract.id.trim() === "") {
      issues.push({
        code: "MISSING_ID",
        message: "Contract ID is required",
        severity: "error",
        path: "id",
      });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(contract.id)) {
      issues.push({
        code: "INVALID_ID_FORMAT",
        message:
          "Contract ID should only contain alphanumeric characters, hyphens, and underscores",
        severity: "warning",
        path: "id",
        suggestion: "Use a format like 'contract-001' or 'implement_feature_v1'",
      });
    }

    // Check name
    if (!contract.name || contract.name.trim() === "") {
      issues.push({
        code: "MISSING_NAME",
        message: "Contract name is required",
        severity: "error",
        path: "name",
      });
    }

    // Check task type
    const validTaskTypes: TaskType[] = [
      "implement_feature",
      "fix_bug",
      "refactor",
      "test",
      "review",
      "deploy",
      "custom",
    ];
    if (!validTaskTypes.includes(contract.taskType)) {
      issues.push({
        code: "INVALID_TASK_TYPE",
        message: `Invalid task type: ${contract.taskType}`,
        severity: "error",
        path: "taskType",
        suggestion: `Valid types: ${validTaskTypes.join(", ")}`,
      });
    }

    // Check verification method
    const validMethods: VerificationMethod[] = [
      "runtime",
      "property-test",
      "formal",
      "hybrid",
    ];
    if (!validMethods.includes(contract.verificationMethod)) {
      issues.push({
        code: "INVALID_VERIFICATION_METHOD",
        message: `Invalid verification method: ${contract.verificationMethod}`,
        severity: "error",
        path: "verificationMethod",
        suggestion: `Valid methods: ${validMethods.join(", ")}`,
      });
    }

    return issues;
  }

  /**
   * Validate individual conditions
   */
  private validateConditions(contract: AgentContract): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const validateConditionSet = (
      conditions: Condition[],
      type: ConditionType
    ): void => {
      const seenIds = new Set<string>();

      for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        const path = `${type}s[${i}]`;

        // Check for duplicate IDs
        if (seenIds.has(condition.id)) {
          issues.push({
            code: "DUPLICATE_CONDITION_ID",
            message: `Duplicate condition ID: ${condition.id}`,
            severity: "error",
            path: `${path}.id`,
            suggestion: "Each condition must have a unique ID within the contract",
          });
        }
        seenIds.add(condition.id);

        // Check ID format
        if (!condition.id || condition.id.trim() === "") {
          issues.push({
            code: "MISSING_CONDITION_ID",
            message: "Condition ID is required",
            severity: "error",
            path: `${path}.id`,
          });
        }

        // Check name
        if (!condition.name || condition.name.trim() === "") {
          issues.push({
            code: "MISSING_CONDITION_NAME",
            message: "Condition name is required",
            severity: "error",
            path: `${path}.name`,
          });
        }

        // Check error message
        if (!condition.errorMessage || condition.errorMessage.trim() === "") {
          issues.push({
            code: "MISSING_ERROR_MESSAGE",
            message: "Condition error message is required",
            severity: "warning",
            path: `${path}.errorMessage`,
            suggestion: "Provide a descriptive error message for debugging",
          });
        }

        // Check condition type matches position
        if (condition.type !== type) {
          issues.push({
            code: "CONDITION_TYPE_MISMATCH",
            message: `Condition type '${condition.type}' does not match expected type '${type}'`,
            severity: "warning",
            path: `${path}.type`,
            suggestion: `Consider using a ${type} instead`,
          });
        }
      }
    };

    validateConditionSet(contract.getPreconditions(), "precondition");
    validateConditionSet(contract.getPostconditions(), "postcondition");
    validateConditionSet(contract.getInvariants(), "invariant");

    return issues;
  }

  /**
   * Validate minimum condition requirements
   */
  private validateMinimumConditions(
    contract: AgentContract,
    minPreconditions: number,
    minPostconditions: number
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const preCount = contract.getPreconditions().length;
    const postCount = contract.getPostconditions().length;

    if (preCount < minPreconditions) {
      issues.push({
        code: "INSUFFICIENT_PRECONDITIONS",
        message: `Contract has ${preCount} preconditions but ${minPreconditions} are required`,
        severity: "error",
        path: "preconditions",
      });
    }

    if (postCount < minPostconditions) {
      issues.push({
        code: "INSUFFICIENT_POSTCONDITIONS",
        message: `Contract has ${postCount} postconditions but ${minPostconditions} are required`,
        severity: "error",
        path: "postconditions",
      });
    }

    // Warn if no conditions at all
    if (preCount === 0 && postCount === 0) {
      issues.push({
        code: "NO_CONDITIONS",
        message: "Contract has no preconditions or postconditions",
        severity: "warning",
        suggestion:
          "Consider adding at least one precondition and postcondition for meaningful verification",
      });
    }

    return issues;
  }

  /**
   * Check for missing recommended conditions
   */
  private checkCompleteness(contract: AgentContract): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const recommended = RECOMMENDED_CONDITIONS[contract.taskType];

    if (!recommended) {
      return issues;
    }

    const preconditionIds = new Set(
      contract.getPreconditions().map((c) => c.id.toLowerCase())
    );
    const postconditionIds = new Set(
      contract.getPostconditions().map((c) => c.id.toLowerCase())
    );

    // Check preconditions
    for (const rec of recommended.preconditions) {
      const hasCondition = [...preconditionIds].some(
        (id) => id.includes(rec) || rec.includes(id.replace(/^pre-/, ""))
      );
      if (!hasCondition) {
        issues.push({
          code: "MISSING_RECOMMENDED_PRECONDITION",
          message: `Recommended precondition '${rec}' is missing for task type '${contract.taskType}'`,
          severity: "info",
          path: "preconditions",
          suggestion: `Consider adding a precondition for: ${rec}`,
        });
      }
    }

    // Check postconditions
    for (const rec of recommended.postconditions) {
      const hasCondition = [...postconditionIds].some(
        (id) => id.includes(rec) || rec.includes(id.replace(/^post-/, ""))
      );
      if (!hasCondition) {
        issues.push({
          code: "MISSING_RECOMMENDED_POSTCONDITION",
          message: `Recommended postcondition '${rec}' is missing for task type '${contract.taskType}'`,
          severity: "info",
          path: "postconditions",
          suggestion: `Consider adding a postcondition for: ${rec}`,
        });
      }
    }

    return issues;
  }

  /**
   * Check for potential contradictions
   */
  private checkConsistency(contract: AgentContract): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const preconditions = contract.getPreconditions();
    const postconditions = contract.getPostconditions();
    const invariants = contract.getInvariants();

    // Check for potential conflicts between preconditions and postconditions
    // This is a heuristic check based on naming patterns
    for (const pre of preconditions) {
      for (const post of postconditions) {
        // Check for opposite conditions (e.g., "has-X" vs "no-X")
        if (
          (pre.id.includes("has-") && post.id.includes("no-" + pre.id.replace("has-", ""))) ||
          (pre.id.includes("no-") && post.id.includes("has-" + pre.id.replace("no-", "")))
        ) {
          issues.push({
            code: "POTENTIAL_CONTRADICTION",
            message: `Potential contradiction between precondition '${pre.id}' and postcondition '${post.id}'`,
            severity: "warning",
            suggestion:
              "Review these conditions to ensure they don't contradict each other",
          });
        }
      }
    }

    // Check for invariants that might conflict with state changes
    for (const inv of invariants) {
      // Invariants about specific states might be too restrictive
      if (inv.id.includes("state-") && !inv.id.includes("valid-state")) {
        issues.push({
          code: "RESTRICTIVE_INVARIANT",
          message: `Invariant '${inv.id}' might be too restrictive for state transitions`,
          severity: "info",
          suggestion:
            "Consider using 'validState' which allows a set of valid states",
        });
      }
    }

    return issues;
  }

  /**
   * Validate against existing registry
   */
  private validateAgainstRegistry(
    contract: AgentContract,
    registry: ContractRegistry
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for duplicate ID
    const existing = registry.get(contract.id);
    if (existing && existing !== contract) {
      issues.push({
        code: "DUPLICATE_CONTRACT_IN_REGISTRY",
        message: `A contract with ID '${contract.id}' already exists in the registry`,
        severity: "warning",
        suggestion:
          "This will update the existing contract. Use a unique ID if you want a separate contract.",
      });
    }

    // Check for duplicate name with different ID
    const allContracts = registry.getAll();
    for (const other of allContracts) {
      if (
        other.id !== contract.id &&
        other.name.toLowerCase() === contract.name.toLowerCase()
      ) {
        issues.push({
          code: "DUPLICATE_CONTRACT_NAME",
          message: `Another contract with name '${other.name}' already exists (ID: ${other.id})`,
          severity: "info",
          suggestion: "Consider using a unique name for clarity",
        });
        break;
      }
    }

    return issues;
  }
}

/**
 * Quick validation function
 */
export function validateContract(
  contract: AgentContract,
  options?: ValidationOptions
): ValidationResult {
  return new ContractValidator().validate(contract, options);
}

/**
 * Throw if contract is invalid
 */
export function assertValidContract(
  contract: AgentContract,
  options?: ValidationOptions
): void {
  const result = validateContract(contract, options);
  if (!result.valid) {
    const errors = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `${i.path ? `[${i.path}] ` : ""}${i.message}`)
      .join("; ");
    throw new Error(`Contract validation failed: ${errors}`);
  }
}
