/**
 * Rad-Engineer Integration Handlers
 *
 * IPC handlers that wire rad-engineer frontend to rad-engineer backend adapter.
 * This enables end-to-end testing of the rad-engineer ElectronIPCAdapter.
 *
 * Registered channels:
 *
 * Task Management:
 * - rad-engineer:get-all-tasks
 * - rad-engineer:create-task
 * - rad-engineer:start-task
 * - rad-engineer:task-progress (event channel for progress broadcasting)
 *
 * Settings Management:
 * - rad-engineer:get-settings
 * - rad-engineer:update-settings
 * - rad-engineer:get-profiles
 * - rad-engineer:add-profile
 * - rad-engineer:remove-profile
 * - rad-engineer:set-active-profile
 *
 * Planning Workflow (10 channels):
 * - rad-engineer:planning-start-intake
 * - rad-engineer:planning-submit-answers
 * - rad-engineer:planning-get-questions
 * - rad-engineer:planning-start-research
 * - rad-engineer:planning-get-research-status
 * - rad-engineer:planning-get-research-findings
 * - rad-engineer:planning-generate-plan
 * - rad-engineer:planning-validate-plan
 * - rad-engineer:planning-save-plan
 * - rad-engineer:planning-update-plan
 *
 * Planning Events:
 * - rad-engineer:planning-intake-progress
 * - rad-engineer:planning-research-agent-update
 * - rad-engineer:planning-research-complete
 * - rad-engineer:planning-plan-generated
 *
 * Execution Monitoring (13 channels):
 * - rad-engineer:execution:get-status
 * - rad-engineer:execution:get-wave-status
 * - rad-engineer:execution:get-agent-status
 * - rad-engineer:execution:get-quality-gates
 * - rad-engineer:execution:get-state-machine-status
 * - rad-engineer:execution:get-error-recovery-status
 * - rad-engineer:execution:retry-wave
 * - rad-engineer:execution:retry-task
 * - rad-engineer:execution:change-provider
 * - rad-engineer:execution:restore-checkpoint
 * - rad-engineer:execution:delete-checkpoint
 * - rad-engineer:execution:retry-quality-gate
 * - rad-engineer:execution:get-timeline
 *
 * Execution Events (12 real-time events):
 * - rad-engineer:execution:wave-started
 * - rad-engineer:execution:wave-progress
 * - rad-engineer:execution:wave-completed
 * - rad-engineer:execution:agent-started
 * - rad-engineer:execution:agent-progress
 * - rad-engineer:execution:agent-completed
 * - rad-engineer:execution:quality-gate-started
 * - rad-engineer:execution:quality-gate-result
 * - rad-engineer:execution:state-changed
 * - rad-engineer:execution:task-failed
 * - rad-engineer:execution:task-retry-scheduled
 * - rad-engineer:execution:circuit-breaker-state-changed
 *
 * VAC Verification (10 channels):
 * - rad-engineer:vac:get-all-contracts
 * - rad-engineer:vac:get-contract
 * - rad-engineer:vac:create-contract
 * - rad-engineer:vac:update-contract
 * - rad-engineer:vac:delete-contract
 * - rad-engineer:vac:run-verification
 * - rad-engineer:vac:check-drift
 * - rad-engineer:vac:compare-ast
 * - rad-engineer:vac:get-verification-history
 * - rad-engineer:vac:get-drift-history
 *
 * Decision Learning (10 channels):
 * - rad-engineer:learning:get-decision-history
 * - rad-engineer:learning:get-learning-analytics
 * - rad-engineer:learning:get-patterns
 * - rad-engineer:learning:search-patterns
 * - rad-engineer:learning:get-method-effectiveness
 * - rad-engineer:learning:select-method
 * - rad-engineer:learning:get-outcome-metrics
 * - rad-engineer:learning:export-learning-report
 * - rad-engineer:learning:get-quality-trends
 * - rad-engineer:learning:get-ewc-curves
 */

import { ipcMain, BrowserWindow } from 'electron';
import { ElectronIPCAdapter } from '@rad-engineer/ui-adapter/ElectronIPCAdapter';
import { SettingsAPIHandler } from '@rad-engineer/ui-adapter/SettingsAPIHandler';
import { PlanningAPIHandler } from '@rad-engineer/ui-adapter/PlanningAPIHandler';
import { ExecutionAPIHandler } from '@rad-engineer/ui-adapter/ExecutionAPIHandler';
import { VACAPIHandler } from '@rad-engineer/ui-adapter/VACAPIHandler';
import { LearningAPIHandler } from '@rad-engineer/ui-adapter/LearningAPIHandler';
import type {
  RadEngineerTask,
  RadEngineerTaskSpec,
  TaskProgressEvent,
  QualityGateType
} from '@rad-engineer/ui-adapter/types';
import type { APIProfile, AppSettings } from '@rad-engineer/ui-adapter/SettingsAPIHandler';

// Global adapter instance (singleton per main process)
let adapterInstance: ElectronIPCAdapter | null = null;

// Global settings handler instance (singleton per main process)
let settingsHandlerInstance: SettingsAPIHandler | null = null;

// Global planning handler instance (singleton per main process)
let planningHandlerInstance: PlanningAPIHandler | null = null;

// Global execution handler instance (singleton per main process)
let executionHandlerInstance: ExecutionAPIHandler | null = null;

// Global VAC handler instance (singleton per main process)
let vacHandlerInstance: VACAPIHandler | null = null;

// Global Learning handler instance (singleton per main process)
let learningHandlerInstance: LearningAPIHandler | null = null;

/**
 * Get or create the ElectronIPCAdapter instance
 *
 * @param projectDir - Project directory path (defaults to current project root)
 * @returns Initialized adapter instance
 */
function getAdapter(projectDir?: string): ElectronIPCAdapter {
  if (!adapterInstance) {
    const defaultProjectDir = projectDir || '/Users/umasankr/Projects/rad-engineer-v2';
    adapterInstance = new ElectronIPCAdapter({
      projectDir: defaultProjectDir,
      debug: true,
    });

    console.log('[rad-engineer-handlers] ElectronIPCAdapter initialized');
  }
  return adapterInstance;
}

/**
 * Get or create the SettingsAPIHandler instance
 *
 * @param projectDir - Project directory path (defaults to current project root)
 * @returns Initialized settings handler instance
 */
function getSettingsHandler(projectDir?: string): SettingsAPIHandler {
  if (!settingsHandlerInstance) {
    const defaultProjectDir = projectDir || '/Users/umasankr/Projects/rad-engineer-v2';
    settingsHandlerInstance = new SettingsAPIHandler({
      projectDir: defaultProjectDir,
      debug: true,
    });

    console.log('[rad-engineer-handlers] SettingsAPIHandler initialized');
  }
  return settingsHandlerInstance;
}

/**
 * Get or create the PlanningAPIHandler instance
 *
 * @param projectDir - Project directory path (defaults to current project root)
 * @returns Initialized planning handler instance
 */
function getPlanningHandler(projectDir?: string): PlanningAPIHandler {
  if (!planningHandlerInstance) {
    const defaultProjectDir = projectDir || '/Users/umasankr/Projects/rad-engineer-v2';
    planningHandlerInstance = new PlanningAPIHandler({
      projectDir: defaultProjectDir,
      debug: true,
    });

    console.log('[rad-engineer-handlers] PlanningAPIHandler initialized');
  }
  return planningHandlerInstance;
}

/**
 * Get or create the ExecutionAPIHandler instance
 *
 * @param projectDir - Project directory path (defaults to current project root)
 * @returns Initialized execution handler instance
 */
function getExecutionHandler(projectDir?: string): ExecutionAPIHandler {
  if (!executionHandlerInstance) {
    const defaultProjectDir = projectDir || '/Users/umasankr/Projects/rad-engineer-v2';
    executionHandlerInstance = new ExecutionAPIHandler({
      projectDir: defaultProjectDir,
      debug: true,
    });

    console.log('[rad-engineer-handlers] ExecutionAPIHandler initialized');
  }
  return executionHandlerInstance;
}

/**
 * Get or create the VACAPIHandler instance
 *
 * @param projectDir - Project directory path (defaults to current project root)
 * @returns Initialized VAC handler instance
 */
function getVACHandler(projectDir?: string): VACAPIHandler {
  if (!vacHandlerInstance) {
    const defaultProjectDir = projectDir || '/Users/umasankr/Projects/rad-engineer-v2';
    vacHandlerInstance = new VACAPIHandler({
      projectDir: defaultProjectDir,
      debug: true,
    });

    console.log('[rad-engineer-handlers] VACAPIHandler initialized');
  }
  return vacHandlerInstance;
}

/**
 * Get or create the LearningAPIHandler instance
 *
 * @param projectDir - Project directory path (defaults to current project root)
 * @returns Initialized Learning handler instance
 */
function getLearningHandler(projectDir?: string): LearningAPIHandler {
  if (!learningHandlerInstance) {
    const defaultProjectDir = projectDir || '/Users/umasankr/Projects/rad-engineer-v2';
    learningHandlerInstance = new LearningAPIHandler({
      projectDir: defaultProjectDir,
      debug: true,
    });

    console.log('[rad-engineer-handlers] LearningAPIHandler initialized');
  }
  return learningHandlerInstance;
}

/**
 * Register rad-engineer IPC handlers
 *
 * @param getMainWindow - Function to get the main BrowserWindow
 */
export function registerRadEngineerHandlers(
  getMainWindow: () => BrowserWindow | null
): void {
  const adapter = getAdapter();

  // Setup progress event forwarding
  adapter.on('task:progress', (event: TaskProgressEvent) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:task-progress', event);
      console.log(`[rad-engineer-handlers] Progress event forwarded: ${event.taskId} - ${event.progress}%`);
    }
  });

  /**
   * Get all tasks
   * IPC: rad-engineer:get-all-tasks
   */
  ipcMain.handle('rad-engineer:get-all-tasks', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:get-all-tasks called');
      const tasks = await adapter.getAllTasks();
      console.log(`[rad-engineer-handlers] Returning ${tasks.length} tasks`);
      return { success: true, data: tasks };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in get-all-tasks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Create a new task
   * IPC: rad-engineer:create-task
   */
  ipcMain.handle('rad-engineer:create-task', async (_, spec: RadEngineerTaskSpec) => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:create-task called', spec);
      const task = await adapter.createTask(spec);
      console.log(`[rad-engineer-handlers] Task created: ${task.id}`);
      return { success: true, data: task };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in create-task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Start task execution
   * IPC: rad-engineer:start-task
   */
  ipcMain.handle('rad-engineer:start-task', async (_, taskId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:start-task called for: ${taskId}`);
      await adapter.startTask(taskId);
      console.log(`[rad-engineer-handlers] Task started: ${taskId}`);
      return { success: true };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in start-task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get specific task by ID
   * IPC: rad-engineer:get-task
   */
  ipcMain.handle('rad-engineer:get-task', async (_, taskId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:get-task called for: ${taskId}`);
      const task = await adapter.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, data: task };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in get-task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ===== Settings API Handlers =====

  const settingsHandler = getSettingsHandler();

  /**
   * Get all settings
   * IPC: rad-engineer:get-settings
   */
  ipcMain.handle('rad-engineer:get-settings', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:get-settings called');
      const settings = await settingsHandler.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in get-settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Update settings
   * IPC: rad-engineer:update-settings
   */
  ipcMain.handle('rad-engineer:update-settings', async (_, updates: Partial<AppSettings>) => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:update-settings called', updates);
      const settings = await settingsHandler.updateSettings(updates);
      return { success: true, data: settings };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in update-settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get all profiles
   * IPC: rad-engineer:get-profiles
   */
  ipcMain.handle('rad-engineer:get-profiles', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:get-profiles called');
      const profiles = await settingsHandler.getProfiles();
      return { success: true, data: profiles };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in get-profiles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Add a new profile
   * IPC: rad-engineer:add-profile
   */
  ipcMain.handle('rad-engineer:add-profile', async (_, profile: APIProfile) => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:add-profile called', { id: profile.id, name: profile.name });
      const addedProfile = await settingsHandler.addProfile(profile);
      return { success: true, data: addedProfile };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in add-profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Remove a profile
   * IPC: rad-engineer:remove-profile
   */
  ipcMain.handle('rad-engineer:remove-profile', async (_, profileId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:remove-profile called for: ${profileId}`);
      const removed = await settingsHandler.removeProfile(profileId);
      if (!removed) {
        return { success: false, error: 'Profile not found' };
      }
      return { success: true, data: true };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in remove-profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Set active profile
   * IPC: rad-engineer:set-active-profile
   */
  ipcMain.handle('rad-engineer:set-active-profile', async (_, profileId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:set-active-profile called for: ${profileId}`);
      const activated = await settingsHandler.setActiveProfile(profileId);
      if (!activated) {
        return { success: false, error: 'Profile not found' };
      }
      return { success: true, data: true };
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in set-active-profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ===== Planning API Handlers =====

  const planningHandler = getPlanningHandler();

  // Setup planning event forwarding
  planningHandler.on('intake-progress', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:planning-intake-progress', event);
      console.log(`[rad-engineer-handlers] Planning intake progress: ${event.progress}%`);
    }
  });

  planningHandler.on('research-agent-update', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:planning-research-agent-update', event);
      console.log(`[rad-engineer-handlers] Research agent update: ${event.agentId}`);
    }
  });

  planningHandler.on('research-complete', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:planning-research-complete', event);
      console.log(`[rad-engineer-handlers] Research complete: ${event.sessionId}`);
    }
  });

  planningHandler.on('plan-generated', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:planning-plan-generated', event);
      console.log(`[rad-engineer-handlers] Plan generated: ${event.planId}`);
    }
  });

  /**
   * Start intake workflow
   * IPC: rad-engineer:planning-start-intake
   */
  ipcMain.handle('rad-engineer:planning-start-intake', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:planning-start-intake called');
      const result = await planningHandler.startIntake();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-start-intake:', error);
      return {
        success: false,
        sessionId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Submit answers to intake questions
   * IPC: rad-engineer:planning-submit-answers
   */
  ipcMain.handle('rad-engineer:planning-submit-answers', async (_, sessionId: string, answers: Record<string, any>) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-submit-answers called for session: ${sessionId}`);
      const result = await planningHandler.submitAnswers(sessionId, answers);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-submit-answers:', error);
      return {
        success: false,
        complete: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get current questions for session
   * IPC: rad-engineer:planning-get-questions
   */
  ipcMain.handle('rad-engineer:planning-get-questions', async (_, sessionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-get-questions called for session: ${sessionId}`);
      const result = await planningHandler.getQuestions(sessionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-get-questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Start research phase
   * IPC: rad-engineer:planning-start-research
   */
  ipcMain.handle('rad-engineer:planning-start-research', async (_, sessionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-start-research called for session: ${sessionId}`);
      const result = await planningHandler.startResearch(sessionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-start-research:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get research status
   * IPC: rad-engineer:planning-get-research-status
   */
  ipcMain.handle('rad-engineer:planning-get-research-status', async (_, researchId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-get-research-status called for: ${researchId}`);
      const result = await planningHandler.getResearchStatus(researchId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-get-research-status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get research findings
   * IPC: rad-engineer:planning-get-research-findings
   */
  ipcMain.handle('rad-engineer:planning-get-research-findings', async (_, researchId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-get-research-findings called for: ${researchId}`);
      const result = await planningHandler.getResearchFindings(researchId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-get-research-findings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Generate implementation plan
   * IPC: rad-engineer:planning-generate-plan
   */
  ipcMain.handle('rad-engineer:planning-generate-plan', async (_, sessionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-generate-plan called for session: ${sessionId}`);
      const result = await planningHandler.generatePlan(sessionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-generate-plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Validate plan structure
   * IPC: rad-engineer:planning-validate-plan
   */
  ipcMain.handle('rad-engineer:planning-validate-plan', async (_, planId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-validate-plan called for: ${planId}`);
      const result = await planningHandler.validatePlan(planId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-validate-plan:', error);
      return {
        success: false,
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  });

  /**
   * Save plan to storage
   * IPC: rad-engineer:planning-save-plan
   */
  ipcMain.handle('rad-engineer:planning-save-plan', async (_, planId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-save-plan called for: ${planId}`);
      const result = await planningHandler.savePlan(planId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-save-plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Update existing plan
   * IPC: rad-engineer:planning-update-plan
   */
  ipcMain.handle('rad-engineer:planning-update-plan', async (_, planId: string, updates: any) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:planning-update-plan called for: ${planId}`);
      const result = await planningHandler.updatePlan(planId, updates);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in planning-update-plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ===== Execution API Handlers =====

  const executionHandler = getExecutionHandler();

  // Setup execution event forwarding
  executionHandler.on('wave-started', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:wave-started', event);
      console.log(`[rad-engineer-handlers] Wave started: ${event.waveId}`);
    }
  });

  executionHandler.on('wave-progress', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:wave-progress', event);
    }
  });

  executionHandler.on('wave-completed', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:wave-completed', event);
      console.log(`[rad-engineer-handlers] Wave completed: ${event.waveId}`);
    }
  });

  executionHandler.on('agent-started', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:agent-started', event);
      console.log(`[rad-engineer-handlers] Agent started: ${event.agentId}`);
    }
  });

  executionHandler.on('agent-progress', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:agent-progress', event);
    }
  });

  executionHandler.on('agent-completed', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:agent-completed', event);
      console.log(`[rad-engineer-handlers] Agent completed: ${event.agentId}`);
    }
  });

  executionHandler.on('quality-gate-started', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:quality-gate-started', event);
      console.log(`[rad-engineer-handlers] Quality gate started: ${event.gateType}`);
    }
  });

  executionHandler.on('quality-gate-result', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:quality-gate-result', event);
      console.log(`[rad-engineer-handlers] Quality gate result: ${event.gateType} - ${event.passed ? 'PASS' : 'FAIL'}`);
    }
  });

  executionHandler.on('state-changed', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:state-changed', event);
      console.log(`[rad-engineer-handlers] State changed: ${event.oldState} -> ${event.newState}`);
    }
  });

  executionHandler.on('task-failed', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:task-failed', event);
      console.log(`[rad-engineer-handlers] Task failed: ${event.taskId}`);
    }
  });

  executionHandler.on('task-retry-scheduled', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:task-retry-scheduled', event);
      console.log(`[rad-engineer-handlers] Task retry scheduled: ${event.taskId}`);
    }
  });

  executionHandler.on('circuit-breaker-state-changed', (event) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('rad-engineer:execution:circuit-breaker-state-changed', event);
      console.log(`[rad-engineer-handlers] Circuit breaker state changed: ${event.newState}`);
    }
  });

  /**
   * Get execution status
   * IPC: rad-engineer:execution:get-status
   */
  ipcMain.handle('rad-engineer:execution:get-status', async (_, executionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-status called for: ${executionId}`);
      const result = await executionHandler.getExecutionStatus(executionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get wave status
   * IPC: rad-engineer:execution:get-wave-status
   */
  ipcMain.handle('rad-engineer:execution:get-wave-status', async (_, waveId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-wave-status called for: ${waveId}`);
      const result = await executionHandler.getWaveStatus(waveId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-wave-status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get agent status
   * IPC: rad-engineer:execution:get-agent-status
   */
  ipcMain.handle('rad-engineer:execution:get-agent-status', async (_, agentId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-agent-status called for: ${agentId}`);
      const result = await executionHandler.getAgentStatus(agentId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-agent-status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get quality gates results
   * IPC: rad-engineer:execution:get-quality-gates
   */
  ipcMain.handle('rad-engineer:execution:get-quality-gates', async (_, executionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-quality-gates called for: ${executionId}`);
      const result = await executionHandler.getQualityGates(executionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-quality-gates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get state machine status
   * IPC: rad-engineer:execution:get-state-machine-status
   */
  ipcMain.handle('rad-engineer:execution:get-state-machine-status', async (_, executionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-state-machine-status called for: ${executionId}`);
      const result = await executionHandler.getStateMachineStatus(executionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-state-machine-status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get error recovery status
   * IPC: rad-engineer:execution:get-error-recovery-status
   */
  ipcMain.handle('rad-engineer:execution:get-error-recovery-status', async (_, executionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-error-recovery-status called for: ${executionId}`);
      const result = await executionHandler.getErrorRecoveryStatus(executionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-error-recovery-status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Retry wave
   * IPC: rad-engineer:execution:retry-wave
   */
  ipcMain.handle('rad-engineer:execution:retry-wave', async (_, waveId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:retry-wave called for: ${waveId}`);
      const result = await executionHandler.retryWave(waveId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:retry-wave:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Retry task
   * IPC: rad-engineer:execution:retry-task
   */
  ipcMain.handle('rad-engineer:execution:retry-task', async (_, taskId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:retry-task called for: ${taskId}`);
      const result = await executionHandler.retryTask(taskId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:retry-task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Change provider
   * IPC: rad-engineer:execution:change-provider
   */
  ipcMain.handle('rad-engineer:execution:change-provider', async (_, executionId: string, provider: string, model: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:change-provider called: ${provider}/${model}`);
      const result = await executionHandler.changeProvider(executionId, provider, model);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:change-provider:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Restore checkpoint
   * IPC: rad-engineer:execution:restore-checkpoint
   */
  ipcMain.handle('rad-engineer:execution:restore-checkpoint', async (_, executionId: string, checkpointId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:restore-checkpoint called: ${checkpointId}`);
      const result = await executionHandler.restoreCheckpoint(executionId, checkpointId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:restore-checkpoint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Delete checkpoint
   * IPC: rad-engineer:execution:delete-checkpoint
   */
  ipcMain.handle('rad-engineer:execution:delete-checkpoint', async (_, checkpointId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:delete-checkpoint called: ${checkpointId}`);
      const result = await executionHandler.deleteCheckpoint(checkpointId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:delete-checkpoint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Retry quality gate
   * IPC: rad-engineer:execution:retry-quality-gate
   */
  ipcMain.handle('rad-engineer:execution:retry-quality-gate', async (_, executionId: string, gateType: QualityGateType) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:retry-quality-gate called: ${gateType}`);
      const result = await executionHandler.retryQualityGate(executionId, gateType);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:retry-quality-gate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get execution timeline
   * IPC: rad-engineer:execution:get-timeline
   */
  ipcMain.handle('rad-engineer:execution:get-timeline', async (_, executionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:execution:get-timeline called for: ${executionId}`);
      const result = await executionHandler.getExecutionTimeline(executionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in execution:get-timeline:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ===== VAC Verification API Handlers =====

  const vacHandler = getVACHandler();

  /**
   * Get all contracts
   * IPC: rad-engineer:vac:get-all-contracts
   */
  ipcMain.handle('rad-engineer:vac:get-all-contracts', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:vac:get-all-contracts called');
      const result = await vacHandler.getAllContracts();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:get-all-contracts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get specific contract
   * IPC: rad-engineer:vac:get-contract
   */
  ipcMain.handle('rad-engineer:vac:get-contract', async (_, contractId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:get-contract called for: ${contractId}`);
      const result = await vacHandler.getContract(contractId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:get-contract:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Create new contract
   * IPC: rad-engineer:vac:create-contract
   */
  ipcMain.handle('rad-engineer:vac:create-contract', async (_, contractData: any) => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:vac:create-contract called');
      const result = await vacHandler.createContract(contractData);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:create-contract:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Update existing contract
   * IPC: rad-engineer:vac:update-contract
   */
  ipcMain.handle('rad-engineer:vac:update-contract', async (_, contractId: string, updates: any) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:update-contract called for: ${contractId}`);
      const result = await vacHandler.updateContract(contractId, updates);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:update-contract:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Delete contract
   * IPC: rad-engineer:vac:delete-contract
   */
  ipcMain.handle('rad-engineer:vac:delete-contract', async (_, contractId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:delete-contract called for: ${contractId}`);
      const result = await vacHandler.deleteContract(contractId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:delete-contract:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Run verification for contract
   * IPC: rad-engineer:vac:run-verification
   */
  ipcMain.handle('rad-engineer:vac:run-verification', async (_, contractId: string, context: any) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:run-verification called for: ${contractId}`);
      const result = await vacHandler.runVerification(contractId, context);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:run-verification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Check for contract drift
   * IPC: rad-engineer:vac:check-drift
   */
  ipcMain.handle('rad-engineer:vac:check-drift', async (_, contractId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:check-drift called for: ${contractId}`);
      const result = await vacHandler.checkDrift(contractId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:check-drift:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Compare AST for drift detection
   * IPC: rad-engineer:vac:compare-ast
   */
  ipcMain.handle('rad-engineer:vac:compare-ast', async (_, contractId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:compare-ast called for: ${contractId}`);
      const result = await vacHandler.compareAST(contractId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:compare-ast:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get verification history
   * IPC: rad-engineer:vac:get-verification-history
   */
  ipcMain.handle('rad-engineer:vac:get-verification-history', async (_, contractId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:get-verification-history called for: ${contractId}`);
      const result = await vacHandler.getVerificationHistory(contractId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:get-verification-history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get drift history
   * IPC: rad-engineer:vac:get-drift-history
   */
  ipcMain.handle('rad-engineer:vac:get-drift-history', async (_, contractId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:vac:get-drift-history called for: ${contractId}`);
      const result = await vacHandler.getDriftHistory(contractId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in vac:get-drift-history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ===== Learning API Handlers =====

  const learningHandler = getLearningHandler();

  /**
   * Get decision history
   * IPC: rad-engineer:learning:get-decision-history
   */
  ipcMain.handle('rad-engineer:learning:get-decision-history', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:get-decision-history called');
      const result = await learningHandler.getDecisionHistory();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-decision-history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get learning analytics
   * IPC: rad-engineer:learning:get-learning-analytics
   */
  ipcMain.handle('rad-engineer:learning:get-learning-analytics', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:get-learning-analytics called');
      const result = await learningHandler.getLearningAnalytics();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-learning-analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get patterns
   * IPC: rad-engineer:learning:get-patterns
   */
  ipcMain.handle('rad-engineer:learning:get-patterns', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:get-patterns called');
      const result = await learningHandler.getPatterns();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-patterns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Search patterns
   * IPC: rad-engineer:learning:search-patterns
   */
  ipcMain.handle('rad-engineer:learning:search-patterns', async (_, query: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:learning:search-patterns called with: ${query}`);
      const result = await learningHandler.searchPatterns(query);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:search-patterns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get method effectiveness
   * IPC: rad-engineer:learning:get-method-effectiveness
   */
  ipcMain.handle('rad-engineer:learning:get-method-effectiveness', async (_, methodId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:learning:get-method-effectiveness called for: ${methodId}`);
      const result = await learningHandler.getMethodEffectiveness(methodId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-method-effectiveness:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Select method
   * IPC: rad-engineer:learning:select-method
   */
  ipcMain.handle('rad-engineer:learning:select-method', async (_, context: Record<string, unknown>) => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:select-method called');
      const result = await learningHandler.selectMethod(context);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:select-method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get outcome metrics
   * IPC: rad-engineer:learning:get-outcome-metrics
   */
  ipcMain.handle('rad-engineer:learning:get-outcome-metrics', async (_, decisionId: string) => {
    try {
      console.log(`[rad-engineer-handlers] rad-engineer:learning:get-outcome-metrics called for: ${decisionId}`);
      const result = await learningHandler.getOutcomeMetrics(decisionId);
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-outcome-metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Export learning report
   * IPC: rad-engineer:learning:export-learning-report
   */
  ipcMain.handle('rad-engineer:learning:export-learning-report', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:export-learning-report called');
      const result = await learningHandler.exportLearningReport();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:export-learning-report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get quality trends
   * IPC: rad-engineer:learning:get-quality-trends
   */
  ipcMain.handle('rad-engineer:learning:get-quality-trends', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:get-quality-trends called');
      const result = await learningHandler.getQualityTrends();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-quality-trends:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get EWC curves
   * IPC: rad-engineer:learning:get-ewc-curves
   */
  ipcMain.handle('rad-engineer:learning:get-ewc-curves', async () => {
    try {
      console.log('[rad-engineer-handlers] rad-engineer:learning:get-ewc-curves called');
      const result = await learningHandler.getEWCCurves();
      return result;
    } catch (error) {
      console.error('[rad-engineer-handlers] Error in learning:get-ewc-curves:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  console.log('[rad-engineer-handlers] All handlers registered successfully (tasks + settings + planning + execution + vac + learning)');
}

/**
 * Cleanup adapter instance (call on app shutdown)
 */
export function cleanupRadEngineerAdapter(): void {
  if (adapterInstance) {
    adapterInstance.removeAllListeners();
    adapterInstance = null;
    console.log('[rad-engineer-handlers] Adapter cleaned up');
  }

  if (settingsHandlerInstance) {
    settingsHandlerInstance.removeAllListeners();
    settingsHandlerInstance = null;
    console.log('[rad-engineer-handlers] Settings handler cleaned up');
  }

  if (planningHandlerInstance) {
    planningHandlerInstance.removeAllListeners();
    planningHandlerInstance = null;
    console.log('[rad-engineer-handlers] Planning handler cleaned up');
  }

  if (executionHandlerInstance) {
    executionHandlerInstance.removeAllListeners();
    executionHandlerInstance = null;
    console.log('[rad-engineer-handlers] Execution handler cleaned up');
  }

  if (vacHandlerInstance) {
    vacHandlerInstance.removeAllListeners();
    vacHandlerInstance = null;
    console.log('[rad-engineer-handlers] VAC handler cleaned up');
  }

  if (learningHandlerInstance) {
    learningHandlerInstance.removeAllListeners();
    learningHandlerInstance = null;
    console.log('[rad-engineer-handlers] Learning handler cleaned up');
  }
}
