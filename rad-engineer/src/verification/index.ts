/**
 * Verification Module - Verifiable Agentic Contract (VAC) System
 *
 * Provides contract-first execution with formal verification,
 * ensuring deterministic, reproducible agent execution.
 *
 * Components:
 * - Condition: Pre/post/invariant conditions
 * - AgentContract: Contract definitions
 * - ContractRegistry: Contract storage and retrieval
 * - ContractValidator: Contract validation
 * - PropertyTestRunner: Hypothesis-style testing
 * - VACHook: Pre-commit verification
 */

// Condition exports
export {
  Condition,
  StandardConditions,
  type ConditionDefinition,
  type ConditionResult,
  type ConditionSeverity,
  type ConditionType,
  type ExecutionContext,
  type ExecutionState,
} from "./Condition.js";

// AgentContract exports
export {
  AgentContract,
  ContractBuilder,
  StandardContracts,
  type AgentContractDefinition,
  type ContractEvaluationResult,
  type EvaluationOptions,
  type TaskType,
  type VerificationMethod,
} from "./AgentContract.js";

// ContractRegistry exports
export {
  ContractRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
  type ContractMetadata,
  type QueryOptions,
  type RegistryStats,
} from "./ContractRegistry.js";

// ContractValidator exports
export {
  ContractValidator,
  validateContract,
  assertValidContract,
  type ValidationIssue,
  type ValidationOptions,
  type ValidationResult,
  type ValidationRule,
  type ValidationSeverity,
} from "./ContractValidator.js";

// PropertyTestRunner exports
export {
  PropertyTestRunner,
  Generators,
  generateExecutionContext,
  type FailingExample,
  type Generator,
  type PropertyTestConfig,
  type PropertyTestResult,
  type RandomSource,
  type TestStatistics,
} from "./PropertyTestRunner.js";

// VACHook exports
export {
  VACHook,
  verifyWithVAC,
  type HookMode,
  type HookResult,
  type VACHookConfig,
  type VerificationEvidence,
  type VerificationStatus,
} from "./VACHook.js";
