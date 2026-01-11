/**
 * UI Adapter Module - Auto-Claude Integration
 *
 * Exports:
 * - ElectronIPCAdapter: Main adapter for IPC communication
 * - TaskAPIHandler: Task CRUD operations with StateManager persistence
 * - SettingsAPIHandler: Settings & profile management with secure storage
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
export { FormatTranslator } from "./FormatTranslator.js";
export type {
  AutoClaudeTask,
  AutoClaudeTaskSpec,
  AutoClaudeTaskStatus,
  TaskProgressEvent,
  IPCAdapterConfig,
  TaskWaveMapping,
} from "./types.js";
