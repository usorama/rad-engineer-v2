import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';

export interface IntakeQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface IntakeAnswers {
  [questionId: string]: string | boolean;
}

export interface IntakeProgressData {
  phase: string;
  progress: number;
  message: string;
}

export interface ResearchAgent {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  findings?: string[];
}

export interface ResearchAgentUpdate {
  agentId: string;
  status: 'running' | 'completed' | 'failed';
  findings?: string[];
}

export interface ResearchStatus {
  agents: ResearchAgent[];
  overallProgress: number;
}

export interface ResearchFindings {
  [agentId: string]: string[];
}

export interface Plan {
  id: string;
  tasks: PlanTask[];
  dependencies: string[];
  estimatedDuration?: number;
}

export interface PlanTask {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface PlanUpdate {
  taskId: string;
  changes: Partial<PlanTask>;
}

export interface PlanAPI {
  planning: {
    startIntake: (specId: string) => Promise<IPCResult<IntakeQuestion[]>>;
    submitAnswers: (specId: string, answers: IntakeAnswers) => Promise<IPCResult<void>>;
    getQuestions: (specId: string) => Promise<IPCResult<IntakeQuestion[]>>;
    startResearch: (specId: string) => Promise<IPCResult<void>>;
    getResearchStatus: (specId: string) => Promise<IPCResult<ResearchStatus>>;
    getResearchFindings: (specId: string) => Promise<IPCResult<ResearchFindings>>;
    generatePlan: (specId: string) => Promise<IPCResult<Plan>>;
    validatePlan: (specId: string, plan: Plan) => Promise<IPCResult<ValidationResult>>;
    savePlan: (specId: string, plan: Plan) => Promise<IPCResult<void>>;
    updatePlan: (specId: string, updates: PlanUpdate[]) => Promise<IPCResult<Plan>>;
    onIntakeProgress: (specId: string, callback: (progress: IntakeProgressData) => void) => () => void;
    onResearchAgentUpdate: (specId: string, callback: (update: ResearchAgentUpdate) => void) => () => void;
    onResearchComplete: (specId: string, callback: (findings: ResearchFindings) => void) => () => void;
    onPlanGenerated: (specId: string, callback: (plan: Plan) => void) => () => void;
  };
}

export const createPlanningAPI = (): PlanAPI => ({
  planning: {
    startIntake: async (specId: string): Promise<IPCResult<IntakeQuestion[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_START_INTAKE, specId);
    },

    submitAnswers: async (specId: string, answers: IntakeAnswers): Promise<IPCResult<void>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_SUBMIT_ANSWERS, specId, answers);
    },

    getQuestions: async (specId: string): Promise<IPCResult<IntakeQuestion[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_GET_QUESTIONS, specId);
    },

    startResearch: async (specId: string): Promise<IPCResult<void>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_START_RESEARCH, specId);
    },

    getResearchStatus: async (specId: string): Promise<IPCResult<ResearchStatus>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_GET_RESEARCH_STATUS, specId);
    },

    getResearchFindings: async (specId: string): Promise<IPCResult<ResearchFindings>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_GET_RESEARCH_FINDINGS, specId);
    },

    generatePlan: async (specId: string): Promise<IPCResult<Plan>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_GENERATE_PLAN, specId);
    },

    validatePlan: async (specId: string, plan: Plan): Promise<IPCResult<ValidationResult>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_VALIDATE_PLAN, specId, plan);
    },

    savePlan: async (specId: string, plan: Plan): Promise<IPCResult<void>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_SAVE_PLAN, specId, plan);
    },

    updatePlan: async (specId: string, updates: PlanUpdate[]): Promise<IPCResult<Plan>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.PLANNING_UPDATE_PLAN, specId, updates);
    },

    onIntakeProgress: (specId: string, callback: (progress: IntakeProgressData) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progressData: IntakeProgressData) => {
        callback(progressData);
      };

      const channel = `${IPC_CHANNELS.PLANNING_INTAKE_PROGRESS}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    onResearchAgentUpdate: (specId: string, callback: (update: ResearchAgentUpdate) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, updateData: ResearchAgentUpdate) => {
        callback(updateData);
      };

      const channel = `${IPC_CHANNELS.PLANNING_RESEARCH_AGENT_UPDATE}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    onResearchComplete: (specId: string, callback: (findings: ResearchFindings) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, findingsData: ResearchFindings) => {
        callback(findingsData);
      };

      const channel = `${IPC_CHANNELS.PLANNING_RESEARCH_COMPLETE}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    onPlanGenerated: (specId: string, callback: (plan: Plan) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, planData: Plan) => {
        callback(planData);
      };

      const channel = `${IPC_CHANNELS.PLANNING_PLAN_GENERATED}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    }
  }
});
