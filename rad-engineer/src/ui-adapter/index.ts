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
