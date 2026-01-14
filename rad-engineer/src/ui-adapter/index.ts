/**
 * UI Adapter Module - rad-engineer Integration
 *
 * Exports:
 * - ElectronIPCAdapter: Main adapter for IPC communication
 * - TaskAPIHandler: Task CRUD operations with StateManager persistence
 * - SettingsAPIHandler: Settings & profile management with secure storage
 * - TerminalAPIHandler: Terminal PTY operations with task association
 * - ChangelogAPIHandler: Automated changelog generation from git history
 * - EventBroadcaster: Real-time event broadcasting with backpressure handling
 * - FormatTranslator: Format conversion utilities
 * - Types: TypeScript interfaces for UI integration
 */

export { ElectronIPCAdapter } from "./ElectronIPCAdapter.js";
export { TaskAPIHandler } from "./TaskAPIHandler.js";
export type { TaskAPIHandlerConfig } from "./TaskAPIHandler.js";
export { SettingsAPIHandler } from "./SettingsAPIHandler.js";
export type {
  SettingsAPIHandlerConfig,
  APIProfile,
  AppSettings,
  ProviderType,
} from "./SettingsAPIHandler.js";
export { TerminalAPIHandler } from "./TerminalAPIHandler.js";
export type {
  TerminalAPIHandlerConfig,
  TerminalCreateOptions,
  TerminalOperationResult,
  TerminalSession,
  TerminalManager,
} from "./TerminalAPIHandler.js";
export { ChangelogAPIHandler } from "./ChangelogAPIHandler.js";
export type {
  ChangelogAPIHandlerConfig,
  ConventionalCommit,
  GitCommit,
  VersionSuggestion,
  BumpType,
} from "./ChangelogAPIHandler.js";
export {
  EventBroadcaster,
  EventType,
} from "./EventBroadcaster.js";
export type {
  EventBroadcasterConfig,
  AgentOutputEvent,
  TerminalOutputEvent,
  TaskStatusEvent,
} from "./EventBroadcaster.js";
export { FormatTranslator } from "./FormatTranslator.js";
export type {
  RadEngineerTask,
  RadEngineerTaskSpec,
  RadEngineerTaskStatus,
  TaskProgressEvent,
  IPCAdapterConfig,
  TaskWaveMapping,
} from "./types.js";

// Step-level replay and visibility
export { StepAPIHandler } from "./StepAPIHandler.js";
export type {
  StepAPIHandlerConfig,
  StepUIStatus,
  StepEvidence,
  StepAPIEvents,
  StepEvent,
  StepProgressEvent,
  StepPhaseEvent,
  VerificationEvent,
  CheckpointEvent,
} from "./StepAPIHandler.js";

// RepeatUntil loop visibility
export { LoopAPIHandler } from "./LoopAPIHandler.js";
export type {
  LoopAPIHandlerConfig,
  LoopUIStatus,
  IterationUIResult,
  ConditionUIStatus,
  LoopAPIEvents,
  LoopUIEvent,
  LoopIterationEvent,
  LoopConditionEvent,
} from "./LoopAPIHandler.js";

// Unified metrics API
export { MetricsAPIHandler } from "./MetricsAPIHandler.js";
export type {
  MetricsAPIHandlerConfig,
  StepMetrics,
  LoopMetrics,
  SessionSummary,
  TimelineDataPoint,
  TimelineData,
} from "./MetricsAPIHandler.js";

// Dashboard data provider (single source of truth)
export { DashboardDataProvider } from "./DashboardDataProvider.js";
export type {
  DashboardDataProviderConfig,
  CurrentStepInfo,
  StepTimelineEntry,
  ActiveLoopInfo,
  VerificationStatus,
  DashboardMetrics,
  RecentEvent,
  RecentDecision,
  CheckpointEntry,
  ExecutionDashboard,
} from "./DashboardDataProvider.js";
