import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';

export interface Wave {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentCount: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface WaveStatusData {
  waves: Wave[];
  currentWave: string | null;
}

export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  cpuPercent: number;
  memoryMB: number;
  currentTask: string;
  startedAt: string;
}

export interface AgentStatusData {
  agents: Agent[];
}

export interface QualityGateResult {
  type: 'typecheck' | 'lint' | 'test';
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  output?: string;
}

export interface State {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  transitions: string[];
}

export interface StateMachineData {
  states: State[];
  currentState: string | null;
}

export interface StateChange {
  fromState: string;
  toState: string;
  timestamp: string;
}

export interface ExecutionAPI {
  execution: {
    getWaveStatus: (specId: string) => Promise<IPCResult<WaveStatusData>>;
    onWaveProgress: (specId: string, callback: (wave: Wave) => void) => () => void;
    getAgentStatus: (specId: string) => Promise<IPCResult<AgentStatusData>>;
    onAgentProgress: (specId: string, callback: (agent: Agent) => void) => () => void;
    getQualityGates: (specId: string) => Promise<IPCResult<QualityGateResult[]>>;
    onQualityGateResult: (specId: string, callback: (result: QualityGateResult) => void) => () => void;
    getStateMachineStatus: (specId: string) => Promise<IPCResult<StateMachineData>>;
    onStateChanged: (specId: string, callback: (stateChange: StateChange) => void) => () => void;
  };
}

export const createExecutionAPI = (): ExecutionAPI => ({
  execution: {
    getWaveStatus: async (specId: string): Promise<IPCResult<WaveStatusData>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.EXECUTION_GET_WAVE_STATUS, specId);
    },

    onWaveProgress: (specId: string, callback: (wave: Wave) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, waveData: Wave) => {
        callback(waveData);
      };

      const channel = `${IPC_CHANNELS.EXECUTION_WAVE_PROGRESS}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    getAgentStatus: async (specId: string): Promise<IPCResult<AgentStatusData>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.EXECUTION_GET_AGENT_STATUS, specId);
    },

    onAgentProgress: (specId: string, callback: (agent: Agent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, agentData: Agent) => {
        callback(agentData);
      };

      const channel = `${IPC_CHANNELS.EXECUTION_AGENT_PROGRESS}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    getQualityGates: async (specId: string): Promise<IPCResult<QualityGateResult[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.EXECUTION_GET_QUALITY_GATES, specId);
    },

    onQualityGateResult: (specId: string, callback: (result: QualityGateResult) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, resultData: QualityGateResult) => {
        callback(resultData);
      };

      const channel = `${IPC_CHANNELS.EXECUTION_QUALITY_GATE_RESULT}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    getStateMachineStatus: async (specId: string): Promise<IPCResult<StateMachineData>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.EXECUTION_GET_STATE_MACHINE_STATUS, specId);
    },

    onStateChanged: (specId: string, callback: (stateChange: StateChange) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, stateChangeData: StateChange) => {
        callback(stateChangeData);
      };

      const channel = `${IPC_CHANNELS.EXECUTION_STATE_CHANGED}:${specId}`;
      ipcRenderer.on(channel, handler);

      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    }
  }
});
