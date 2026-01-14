/**
 * Verification Module - Contracts, State Machines, and Drift Detection
 *
 * Provides:
 * - AgentContract: Design-by-contract for agents
 * - Condition: Preconditions, postconditions, invariants
 * - ContractValidator: Validate contracts
 * - ContractRegistry: Register and manage contracts
 * - PropertyTestRunner: Property-based testing
 * - VACHook: Verify-Apply-Commit hooks
 * - StateMachineExecutor: State machine execution
 * - Transition: State transitions
 * - DriftDetector: Measure output determinism
 * - ASTComparator: Semantic code comparison
 * - ASTNormalizer: Normalize code for comparison
 * - ReproducibilityTest: Run tasks multiple times
 */

// AgentContract exports
export {
  AgentContract,
  ContractBuilder,
  StandardContracts,
  type TaskType,
  type VerificationMethod,
  type ContractEvaluationResult,
  type AgentContractDefinition,
  type EvaluationOptions,
} from "./AgentContract.js";

// Condition exports
export {
  Condition,
  StandardConditions,
  type ConditionSeverity,
  type ConditionType,
  type ExecutionContext,
  type ExecutionState,
  type ConditionResult,
  type ConditionDefinition,
} from "./Condition.js";

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
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationResult,
  type ValidationOptions,
  type ValidationRule,
} from "./ContractValidator.js";

// PropertyTestRunner exports
export {
  PropertyTestRunner,
  Generators,
  generateExecutionContext,
  type Generator,
  type RandomSource,
  type PropertyTestConfig,
  type PropertyTestResult,
  type FailingExample,
  type TestStatistics,
} from "./PropertyTestRunner.js";

// VACHook exports
export {
  VACHook,
  type VerificationStatus,
  type HookMode,
  type VerificationEvidence,
  type HookResult,
  type VACHookConfig,
} from "./VACHook.js";

// StateMachineExecutor exports
export {
  StateMachineExecutor,
  createExecutionContext,
  type StateMachineConfig,
  type HistoryEntry,
  type ExecutionResult,
} from "./StateMachineExecutor.js";

// Transition exports
export {
  Transition,
  StandardTransitions,
  type TransitionGuard,
  type TransitionAction,
  type RollbackAction,
  type TransitionResult,
  type TransitionDefinition,
} from "./Transition.js";

// UndefinedStateError exports
export {
  UndefinedStateError,
  isUndefinedStateError,
  type TransitionErrorContext,
} from "./UndefinedStateError.js";

// ASTNormalizer exports
export {
  ASTNormalizer,
  createNormalizer,
  type NormalizationConfig,
  type NormalizationResult,
  type CodeSection,
} from "./ASTNormalizer.js";

// ASTComparator exports
export {
  ASTComparator,
  createComparator,
  type ComparisonResult,
  type Difference,
  type ComparisonMetadata,
  type ComparatorConfig,
} from "./ASTComparator.js";

// ReproducibilityTest exports
export {
  ReproducibilityTest,
  createReproducibilityTest,
  type TestTask,
  type TaskResult,
  type ReproducibilityReport,
  type DifferenceAnalysis,
  type DifferenceCategory,
  type TestConfig,
  type TaskExecutor,
} from "./ReproducibilityTest.js";

// DriftDetector exports
export {
  DriftDetector,
  createDriftDetector,
  type DriftMeasurement,
  type DriftAnalysis,
  type DriftSource,
  type DriftThresholds,
  type DetectorConfig,
  type DriftReport,
  type DriftSummary,
} from "./DriftDetector.js";
