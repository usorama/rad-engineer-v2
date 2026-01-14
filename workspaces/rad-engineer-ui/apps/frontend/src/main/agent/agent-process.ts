// PYTHON REMOVED: Python agent spawning has been removed
// This file is kept for compatibility but agent execution is stubbed
// import { spawn } from 'child_process'; // REMOVED: No longer spawning Python processes
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { app } from 'electron';
import { EventEmitter } from 'events';
import { AgentState } from './agent-state';
import { AgentEvents } from './agent-events';
import { ProcessType, ExecutionProgressData } from './types';
import type { CompletablePhase } from '../../shared/constants/phase-protocol';
import { detectRateLimit, createSDKRateLimitInfo, getProfileEnv, detectAuthFailure } from '../rate-limit-detector';
import { getAPIProfileEnv } from '../services/profile';
import { projectStore } from '../project-store';
import { getClaudeProfileManager } from '../claude-profile-manager';
// REMOVED: Python detection imports
// import { parsePythonCommand, validatePythonPath } from '../python-detector';
// import { pythonEnvManager, getConfiguredPythonPath } from '../python-env-manager';
import { buildMemoryEnvVars } from '../memory-env-builder';
import { readSettingsFile } from '../settings-utils';
import type { AppSettings } from '../../shared/types/settings';
import { getOAuthModeClearVars } from './env-utils';
import { getAugmentedEnv } from '../env-utils';
import { getToolInfo } from '../cli-tool-manager';


function deriveGitBashPath(gitExePath: string): string | null {
  if (process.platform !== 'win32') {
    return null;
  }

  try {
    const gitDir = path.dirname(gitExePath);  // e.g., D:\...\Git\mingw64\bin
    const gitDirName = path.basename(gitDir).toLowerCase();

    // Find Git installation root
    let gitRoot: string;

    if (gitDirName === 'cmd') {
      // .../Git/cmd/git.exe -> .../Git
      gitRoot = path.dirname(gitDir);
    } else if (gitDirName === 'bin') {
      // Could be .../Git/bin/git.exe OR .../Git/mingw64/bin/git.exe
      const parent = path.dirname(gitDir);
      const parentName = path.basename(parent).toLowerCase();
      if (parentName === 'mingw64' || parentName === 'mingw32') {
        // .../Git/mingw64/bin/git.exe -> .../Git
        gitRoot = path.dirname(parent);
      } else {
        // .../Git/bin/git.exe -> .../Git
        gitRoot = parent;
      }
    } else {
      // Unknown structure - try to find 'bin' sibling
      gitRoot = path.dirname(gitDir);
    }

    // Bash.exe is in Git/bin/bash.exe
    const bashPath = path.join(gitRoot, 'bin', 'bash.exe');

    if (existsSync(bashPath)) {
      console.log('[AgentProcess] Derived git-bash path:', bashPath);
      return bashPath;
    }

    // Fallback: check one level up if gitRoot didn't work
    const altBashPath = path.join(path.dirname(gitRoot), 'bin', 'bash.exe');
    if (existsSync(altBashPath)) {
      console.log('[AgentProcess] Found git-bash at alternate path:', altBashPath);
      return altBashPath;
    }

    console.warn('[AgentProcess] Could not find bash.exe from git path:', gitExePath);
    return null;
  } catch (error) {
    console.error('[AgentProcess] Error deriving git-bash path:', error);
    return null;
  }
}

/**
 * Process spawning and lifecycle management
 */
export class AgentProcessManager {
  private state: AgentState;
  private events: AgentEvents;
  private emitter: EventEmitter;
  // Python path will be configured by pythonEnvManager after venv is ready
  // Use null to indicate not yet configured - getPythonPath() will use fallback
  private _pythonPath: string | null = null;
  private autoBuildSourcePath: string = '';

  constructor(state: AgentState, events: AgentEvents, emitter: EventEmitter) {
    this.state = state;
    this.events = events;
    this.emitter = emitter;
  }

  configure(pythonPath?: string, autoBuildSourcePath?: string): void {
    // STUBBED: Python configuration removed
    console.log('[AgentProcess] STUB: configure() called - Python agent execution is disabled');
    if (autoBuildSourcePath) {
      this.autoBuildSourcePath = autoBuildSourcePath;
    }
  }

  private setupProcessEnvironment(
    extraEnv: Record<string, string>
  ): NodeJS.ProcessEnv {
    const profileEnv = getProfileEnv();
    // Use getAugmentedEnv() to ensure common tool paths (dotnet, homebrew, etc.)
    // are available even when app is launched from Finder/Dock
    const augmentedEnv = getAugmentedEnv();

    // On Windows, detect and pass git-bash path for Claude Code CLI
    // Electron can detect git via where.exe, but Python subprocess may not have the same PATH
    const gitBashEnv: Record<string, string> = {};
    if (process.platform === 'win32' && !process.env.CLAUDE_CODE_GIT_BASH_PATH) {
      try {
        const gitInfo = getToolInfo('git');
        if (gitInfo.found && gitInfo.path) {
          const bashPath = deriveGitBashPath(gitInfo.path);
          if (bashPath) {
            gitBashEnv['CLAUDE_CODE_GIT_BASH_PATH'] = bashPath;
            console.log('[AgentProcess] Setting CLAUDE_CODE_GIT_BASH_PATH:', bashPath);
          }
        }
      } catch (error) {
        console.warn('[AgentProcess] Failed to detect git-bash path:', error);
      }
    }

    return {
      ...augmentedEnv,
      ...gitBashEnv,
      ...extraEnv,
      ...profileEnv,
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1'
    } as NodeJS.ProcessEnv;
  }

  private handleProcessFailure(
    taskId: string,
    allOutput: string,
    processType: ProcessType
  ): boolean {
    console.log('[AgentProcess] Checking for rate limit in output (last 500 chars):', allOutput.slice(-500));

    const rateLimitDetection = detectRateLimit(allOutput);
    console.log('[AgentProcess] Rate limit detection result:', {
      isRateLimited: rateLimitDetection.isRateLimited,
      resetTime: rateLimitDetection.resetTime,
      limitType: rateLimitDetection.limitType,
      profileId: rateLimitDetection.profileId,
      suggestedProfile: rateLimitDetection.suggestedProfile
    });

    if (rateLimitDetection.isRateLimited) {
      const wasHandled = this.handleRateLimitWithAutoSwap(
        taskId,
        rateLimitDetection,
        processType
      );
      if (wasHandled) return true;

      const source = processType === 'spec-creation' ? 'roadmap' : 'task';
      const rateLimitInfo = createSDKRateLimitInfo(source, rateLimitDetection, { taskId });
      console.log('[AgentProcess] Emitting sdk-rate-limit event (manual):', rateLimitInfo);
      this.emitter.emit('sdk-rate-limit', rateLimitInfo);
      return true;
    }

    return this.handleAuthFailure(taskId, allOutput);
  }

  private handleRateLimitWithAutoSwap(
    taskId: string,
    rateLimitDetection: ReturnType<typeof detectRateLimit>,
    processType: ProcessType
  ): boolean {
    const profileManager = getClaudeProfileManager();
    const autoSwitchSettings = profileManager.getAutoSwitchSettings();

    console.log('[AgentProcess] Auto-switch settings:', {
      enabled: autoSwitchSettings.enabled,
      autoSwitchOnRateLimit: autoSwitchSettings.autoSwitchOnRateLimit,
      proactiveSwapEnabled: autoSwitchSettings.proactiveSwapEnabled
    });

    if (!autoSwitchSettings.enabled || !autoSwitchSettings.autoSwitchOnRateLimit) {
      console.log('[AgentProcess] Auto-switch disabled - showing manual modal');
      return false;
    }

    const currentProfileId = rateLimitDetection.profileId;
    const bestProfile = profileManager.getBestAvailableProfile(currentProfileId);

    console.log('[AgentProcess] Best available profile:', bestProfile ? {
      id: bestProfile.id,
      name: bestProfile.name
    } : 'NONE');

    if (!bestProfile) {
      console.log('[AgentProcess] No alternative profile available - falling back to manual modal');
      return false;
    }

    console.log('[AgentProcess] AUTO-SWAP: Switching from', currentProfileId, 'to', bestProfile.id);
    profileManager.setActiveProfile(bestProfile.id);

    const source = processType === 'spec-creation' ? 'roadmap' : 'task';
    const rateLimitInfo = createSDKRateLimitInfo(source, rateLimitDetection, { taskId });
    rateLimitInfo.wasAutoSwapped = true;
    rateLimitInfo.swappedToProfile = { id: bestProfile.id, name: bestProfile.name };
    rateLimitInfo.swapReason = 'reactive';

    console.log('[AgentProcess] Emitting sdk-rate-limit event (auto-swapped):', rateLimitInfo);
    this.emitter.emit('sdk-rate-limit', rateLimitInfo);

    console.log('[AgentProcess] Emitting auto-swap-restart-task event for task:', taskId);
    this.emitter.emit('auto-swap-restart-task', taskId, bestProfile.id);
    return true;
  }

  private handleAuthFailure(taskId: string, allOutput: string): boolean {
    console.log('[AgentProcess] No rate limit detected - checking for auth failure');
    const authFailureDetection = detectAuthFailure(allOutput);

    if (authFailureDetection.isAuthFailure) {
      console.log('[AgentProcess] Auth failure detected:', authFailureDetection);
      this.emitter.emit('auth-failure', taskId, {
        profileId: authFailureDetection.profileId,
        failureType: authFailureDetection.failureType,
        message: authFailureDetection.message,
        originalError: authFailureDetection.originalError
      });
      return true;
    }

    console.log('[AgentProcess] Process failed but no rate limit or auth failure detected');
    return false;
  }

  /**
   * Get the configured Python path.
   * STUBBED: Returns placeholder - Python execution removed
   */
  getPythonPath(): string {
    // STUBBED: Python path removed
    console.log('[AgentProcess] STUB: getPythonPath() called - Python agent execution is disabled');
    return '/stub/python/path';
  }

  /**
   * Get the auto-claude source path (detects automatically if not configured)
   */
  getAutoBuildSourcePath(): string | null {
    // Use runners/spec_runner.py as the validation marker - this is the file actually needed
    const validatePath = (p: string): boolean => {
      return existsSync(p) && existsSync(path.join(p, 'runners', 'spec_runner.py'));
    };

    // If manually configured AND valid, use that
    if (this.autoBuildSourcePath && validatePath(this.autoBuildSourcePath)) {
      return this.autoBuildSourcePath;
    }

    // Auto-detect from app location (configured path was invalid or not set)
    const possiblePaths = [
      // Packaged app: backend is in extraResources (process.resourcesPath/backend)
      ...(app.isPackaged ? [path.join(process.resourcesPath, 'backend')] : []),
      // Dev mode: from dist/main -> ../../backend (apps/frontend/out/main -> apps/backend)
      path.resolve(__dirname, '..', '..', '..', 'backend'),
      // Alternative: from app root -> apps/backend
      path.resolve(app.getAppPath(), '..', 'backend'),
      // If running from repo root with apps structure
      path.resolve(process.cwd(), 'apps', 'backend')
    ];

    for (const p of possiblePaths) {
      if (validatePath(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Get project-specific environment variables based on project settings
   */
  private getProjectEnvVars(projectPath: string): Record<string, string> {
    const env: Record<string, string> = {};

    // Find project by path
    const projects = projectStore.getProjects();
    const project = projects.find((p) => p.path === projectPath);

    if (project?.settings) {
      // Graphiti MCP integration
      if (project.settings.graphitiMcpEnabled) {
        const graphitiUrl = project.settings.graphitiMcpUrl || 'http://localhost:8000/mcp/';
        env['GRAPHITI_MCP_URL'] = graphitiUrl;
      }

      // CLAUDE.md integration (enabled by default)
      if (project.settings.useClaudeMd !== false) {
        env['USE_CLAUDE_MD'] = 'true';
      }
    }

    return env;
  }

  /**
   * Parse environment variables from a .env file content.
   * Filters out empty values to prevent overriding valid tokens from profiles.
   */
  private parseEnvFile(envPath: string): Record<string, string> {
    if (!existsSync(envPath)) {
      return {};
    }

    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const envVars: Record<string, string> = {};

      // Handle both Unix (\n) and Windows (\r\n) line endings
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          let value = trimmed.substring(eqIndex + 1).trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          // Skip empty values to prevent overriding valid values from other sources
          if (value) {
            envVars[key] = value;
          }
        }
      }

      return envVars;
    } catch {
      return {};
    }
  }

  /**
   * Load environment variables from project's .auto-claude/.env file
   * This contains frontend-configured settings like memory/Graphiti configuration
   */
  private loadProjectEnv(projectPath: string): Record<string, string> {
    // Find project by path to get autoBuildPath
    const projects = projectStore.getProjects();
    const project = projects.find((p) => p.path === projectPath);

    if (!project?.autoBuildPath) {
      return {};
    }

    const envPath = path.join(projectPath, project.autoBuildPath, '.env');
    return this.parseEnvFile(envPath);
  }

  /**
   * Load environment variables from auto-claude .env file
   */
  loadAutoBuildEnv(): Record<string, string> {
    const autoBuildSource = this.getAutoBuildSourcePath();
    if (!autoBuildSource) {
      return {};
    }

    const envPath = path.join(autoBuildSource, '.env');
    return this.parseEnvFile(envPath);
  }

  /**
   * Spawn a Python process for task execution
   * STUBBED: Returns immediately with placeholder progress events
   */
  async spawnProcess(
    taskId: string,
    cwd: string,
    args: string[],
    extraEnv: Record<string, string> = {},
    processType: ProcessType = 'task-execution'
  ): Promise<void> {
    console.log('[AgentProcess] STUB: spawnProcess() called - Python agent execution is disabled');
    console.log('[AgentProcess] STUB: taskId:', taskId, 'cwd:', cwd, 'args:', args, 'processType:', processType);

    const isSpecRunner = processType === 'spec-creation';
    this.killProcess(taskId);

    const spawnId = this.state.generateSpawnId();

    // STUBBED: Create a placeholder "process" that doesn't actually run
    // This allows the UI to show that agents are disabled without crashing
    const stubProcess = {
      kill: () => true,
      killed: false,
      pid: -1
    } as any;

    this.state.addProcess(taskId, {
      taskId,
      process: stubProcess,
      startedAt: new Date(),
      spawnId
    });

    let currentPhase: ExecutionProgressData['phase'] = isSpecRunner ? 'planning' : 'planning';
    let sequenceNumber = 0;
    let completedPhases: CompletablePhase[] = [];

    // STUBBED: Emit placeholder progress event
    this.emitter.emit('execution-progress', taskId, {
      phase: currentPhase,
      phaseProgress: 0,
      overallProgress: this.events.calculateOverallProgress(currentPhase, 0),
      message: 'STUB: Python agent execution is disabled. Agents will not run.',
      sequenceNumber: ++sequenceNumber,
      completedPhases: [...completedPhases]
    });

    // STUBBED: Instead of spawning Python process and listening to output,
    // immediately emit a "failed" status and clean up
    setTimeout(() => {
      this.state.deleteProcess(taskId);

      // Emit failed progress
      this.emitter.emit('execution-progress', taskId, {
        phase: 'failed',
        phaseProgress: 0,
        overallProgress: 0,
        message: 'Python agent execution is disabled. rad-engineer-v2 TypeScript backend will be integrated.',
        sequenceNumber: ++sequenceNumber,
        completedPhases: [...completedPhases]
      });

      // Emit error for UI notification
      this.emitter.emit('error', taskId, 'Agent execution is disabled - awaiting rad-engineer-v2 integration');

      // Emit exit with non-zero code
      this.emitter.emit('exit', taskId, 1, processType);
    }, 100); // Small delay to ensure UI has time to register the start
  }

  /**
   * Kill a specific task's process
   */
  killProcess(taskId: string): boolean {
    const agentProcess = this.state.getProcess(taskId);
    if (agentProcess) {
      try {
        // Mark this specific spawn as killed so its exit handler knows to ignore
        this.state.markSpawnAsKilled(agentProcess.spawnId);

        // Send SIGTERM first for graceful shutdown
        agentProcess.process.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!agentProcess.process.killed) {
            agentProcess.process.kill('SIGKILL');
          }
        }, 5000);

        this.state.deleteProcess(taskId);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Kill all running processes
   */
  async killAllProcesses(): Promise<void> {
    const killPromises = this.state.getRunningTaskIds().map((taskId) => {
      return new Promise<void>((resolve) => {
        this.killProcess(taskId);
        resolve();
      });
    });
    await Promise.all(killPromises);
  }

  /**
   * Get combined environment variables for a project
   *
   * Priority (later sources override earlier):
   * 1. App-wide memory settings from settings.json (NEW - enables memory from onboarding)
   * 2. Backend source .env (apps/backend/.env) - CLI defaults
   * 3. Project's .auto-claude/.env - Frontend-configured settings (memory, integrations)
   * 4. Project settings (graphitiMcpUrl, useClaudeMd) - Runtime overrides
   */
  getCombinedEnv(projectPath: string): Record<string, string> {
    // Load app-wide memory settings from settings.json
    // This bridges onboarding config to backend agents
    const appSettings = (readSettingsFile() || {}) as Partial<AppSettings>;
    const memoryEnv = buildMemoryEnvVars(appSettings as AppSettings);

    // Existing env sources
    const autoBuildEnv = this.loadAutoBuildEnv();
    const projectFileEnv = this.loadProjectEnv(projectPath);
    const projectSettingsEnv = this.getProjectEnvVars(projectPath);

    // Priority: app-wide memory -> backend .env -> project .env -> project settings
    // Later sources override earlier ones
    return { ...memoryEnv, ...autoBuildEnv, ...projectFileEnv, ...projectSettingsEnv };
  }
}
