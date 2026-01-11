/**
 * Python Plugin Bridge - TypeScript <-> Python Communication
 *
 * Provides a bridge for executing Python plugins from TypeScript with:
 * - JSON-based stdin/stdout communication
 * - Timeout handling and retry logic
 * - Process monitoring and health checks
 * - Graceful shutdown and cleanup
 */

export {
  PythonPluginBridge,
  PythonBridgeException,
  PythonBridgeError,
} from "./PythonPluginBridge.js";

export type {
  PluginConfig,
  PluginInput,
  PluginOutput,
  PluginResult,
  ProcessHealth,
} from "./PythonPluginBridge.js";

export {
  SpecGeneratorPlugin,
} from "./SpecGenPluginIntegration.js";

export type {
  ComplexityLevel,
  ComplexityAssessment,
  ComplexityAssessmentInput,
  SpecGenerationInput,
  SpecGenerationResult,
  PhaseListInput,
  PhaseListResult,
  SpecGenPluginConfig,
} from "./SpecGenPluginIntegration.js";

export {
  AIMergeIntegration,
  detectMergeConflicts,
  extractGitConflictMarkers,
} from "./AIMergePluginIntegration.js";

export type {
  AIMergeConfig,
  ResolveConflictInput,
  ResolveOptions,
  ChangeType,
  ConflictSeverity,
  MergeStrategy,
  MergeDecision,
  AIProvider,
  SemanticChange,
  ConflictRegion,
  TaskSnapshot,
  MergeResult,
  ConflictContext,
  GitConflictMarkers,
} from "./AIMergePluginIntegration.js";
