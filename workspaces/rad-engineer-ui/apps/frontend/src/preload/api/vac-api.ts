import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';

export interface Contract {
  id: string;
  name: string;
  description: string;
  type: 'interface' | 'behavior' | 'state';
  rules: ContractRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractRule {
  id: string;
  type: 'precondition' | 'postcondition' | 'invariant';
  expression: string;
  description: string;
}

export interface VerificationResult {
  contractId: string;
  status: 'passed' | 'failed' | 'warning';
  violations: Violation[];
  timestamp: string;
  duration: number;
}

export interface Violation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
}

export interface DriftResult {
  contractId: string;
  hasDrift: boolean;
  changes: DriftChange[];
  timestamp: string;
}

export interface DriftChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  before?: string;
  after?: string;
}

export interface ASTComparison {
  differences: ASTDifference[];
  similarity: number;
}

export interface ASTDifference {
  type: 'structure' | 'type' | 'name';
  path: string;
  expected: string;
  actual: string;
}

export interface VerificationHistory {
  contractId: string;
  runs: VerificationRun[];
}

export interface VerificationRun {
  id: string;
  timestamp: string;
  status: 'passed' | 'failed' | 'warning';
  violationCount: number;
  duration: number;
}

export interface DriftHistory {
  contractId: string;
  checks: DriftCheck[];
}

export interface DriftCheck {
  id: string;
  timestamp: string;
  hasDrift: boolean;
  changeCount: number;
}

export interface VACAPI {
  vac: {
    getAllContracts: () => Promise<IPCResult<Contract[]>>;
    getContract: (contractId: string) => Promise<IPCResult<Contract>>;
    createContract: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Promise<IPCResult<Contract>>;
    updateContract: (contractId: string, updates: Partial<Contract>) => Promise<IPCResult<Contract>>;
    deleteContract: (contractId: string) => Promise<IPCResult<void>>;
    runVerification: (contractId: string) => Promise<IPCResult<VerificationResult>>;
    checkDrift: (contractId: string) => Promise<IPCResult<DriftResult>>;
    compareAST: (contractId: string, sourceCode: string) => Promise<IPCResult<ASTComparison>>;
    getVerificationHistory: (contractId: string) => Promise<IPCResult<VerificationHistory>>;
    getDriftHistory: (contractId: string) => Promise<IPCResult<DriftHistory>>;
  };
}

export const createVACAPI = (): VACAPI => ({
  vac: {
    getAllContracts: async (): Promise<IPCResult<Contract[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_GET_ALL_CONTRACTS);
    },

    getContract: async (contractId: string): Promise<IPCResult<Contract>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_GET_CONTRACT, contractId);
    },

    createContract: async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPCResult<Contract>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_CREATE_CONTRACT, contract);
    },

    updateContract: async (contractId: string, updates: Partial<Contract>): Promise<IPCResult<Contract>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_UPDATE_CONTRACT, contractId, updates);
    },

    deleteContract: async (contractId: string): Promise<IPCResult<void>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_DELETE_CONTRACT, contractId);
    },

    runVerification: async (contractId: string): Promise<IPCResult<VerificationResult>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_RUN_VERIFICATION, contractId);
    },

    checkDrift: async (contractId: string): Promise<IPCResult<DriftResult>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_CHECK_DRIFT, contractId);
    },

    compareAST: async (contractId: string, sourceCode: string): Promise<IPCResult<ASTComparison>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_COMPARE_AST, contractId, sourceCode);
    },

    getVerificationHistory: async (contractId: string): Promise<IPCResult<VerificationHistory>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_GET_VERIFICATION_HISTORY, contractId);
    },

    getDriftHistory: async (contractId: string): Promise<IPCResult<DriftHistory>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.VAC_GET_DRIFT_HISTORY, contractId);
    }
  }
});
