/**
 * UI Adapter Module - Auto-Claude Integration
 *
 * Exports:
 * - ElectronIPCAdapter: Main adapter for IPC communication
 * - FormatTranslator: Format conversion utilities
 * - Types: TypeScript interfaces for UI integration
 */

export { ElectronIPCAdapter } from "./ElectronIPCAdapter.js";
export { FormatTranslator } from "./FormatTranslator.js";
export type {
  AutoClaudeTask,
  AutoClaudeTaskSpec,
  AutoClaudeTaskStatus,
  TaskProgressEvent,
  IPCAdapterConfig,
  TaskWaveMapping,
} from "./types.js";
