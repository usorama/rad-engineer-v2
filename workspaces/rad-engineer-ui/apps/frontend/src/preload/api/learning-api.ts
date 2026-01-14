import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';

export interface Decision {
  id: string;
  timestamp: string;
  context: string;
  options: DecisionOption[];
  selectedOption: string;
  outcome: 'success' | 'failure' | 'pending';
  metrics?: OutcomeMetrics;
}

export interface DecisionOption {
  id: string;
  name: string;
  description: string;
  reasoning: string;
}

export interface LearningAnalytics {
  totalDecisions: number;
  successRate: number;
  averageConfidence: number;
  topPatterns: Pattern[];
  recentTrends: Trend[];
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  successRate: number;
  contexts: string[];
}

export interface Trend {
  period: string;
  metric: string;
  value: number;
  change: number;
}

export interface PatternSearchResult {
  patterns: Pattern[];
  totalCount: number;
}

export interface MethodEffectiveness {
  methodId: string;
  methodName: string;
  successRate: number;
  avgDuration: number;
  usageCount: number;
  contexts: string[];
}

export interface MethodSelection {
  methodId: string;
  context: string;
  confidence: number;
  reasoning: string;
}

export interface OutcomeMetrics {
  accuracy: number;
  duration: number;
  resourceUsage: number;
  qualityScore: number;
}

export interface LearningReport {
  generatedAt: string;
  period: string;
  summary: string;
  decisions: Decision[];
  patterns: Pattern[];
  recommendations: string[];
}

export interface QualityTrend {
  timestamp: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface EWCCurve {
  taskId: string;
  iterations: EWCIteration[];
  convergenceRate: number;
  finalAccuracy: number;
}

export interface EWCIteration {
  iteration: number;
  accuracy: number;
  loss: number;
  fisherInformation: number;
}

export interface LearningAPI {
  learning: {
    getDecisionHistory: (filters?: DecisionFilters) => Promise<IPCResult<Decision[]>>;
    getLearningAnalytics: (period?: string) => Promise<IPCResult<LearningAnalytics>>;
    getPatterns: () => Promise<IPCResult<Pattern[]>>;
    searchPatterns: (query: string, filters?: PatternFilters) => Promise<IPCResult<PatternSearchResult>>;
    getMethodEffectiveness: (methodId?: string) => Promise<IPCResult<MethodEffectiveness[]>>;
    selectMethod: (context: string, options: string[]) => Promise<IPCResult<MethodSelection>>;
    getOutcomeMetrics: (decisionId: string) => Promise<IPCResult<OutcomeMetrics>>;
    exportLearningReport: (period: string) => Promise<IPCResult<LearningReport>>;
    getQualityTrends: (metric: string, period: string) => Promise<IPCResult<QualityTrend[]>>;
    getEWCCurves: (taskId?: string) => Promise<IPCResult<EWCCurve[]>>;
  };
}

export interface DecisionFilters {
  startDate?: string;
  endDate?: string;
  outcome?: 'success' | 'failure' | 'pending';
  context?: string;
}

export interface PatternFilters {
  minFrequency?: number;
  minSuccessRate?: number;
  context?: string;
}

export const createLearningAPI = (): LearningAPI => ({
  learning: {
    getDecisionHistory: async (filters?: DecisionFilters): Promise<IPCResult<Decision[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_DECISION_HISTORY, filters);
    },

    getLearningAnalytics: async (period?: string): Promise<IPCResult<LearningAnalytics>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_ANALYTICS, period);
    },

    getPatterns: async (): Promise<IPCResult<Pattern[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_PATTERNS);
    },

    searchPatterns: async (query: string, filters?: PatternFilters): Promise<IPCResult<PatternSearchResult>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_SEARCH_PATTERNS, query, filters);
    },

    getMethodEffectiveness: async (methodId?: string): Promise<IPCResult<MethodEffectiveness[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_METHOD_EFFECTIVENESS, methodId);
    },

    selectMethod: async (context: string, options: string[]): Promise<IPCResult<MethodSelection>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_SELECT_METHOD, context, options);
    },

    getOutcomeMetrics: async (decisionId: string): Promise<IPCResult<OutcomeMetrics>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_OUTCOME_METRICS, decisionId);
    },

    exportLearningReport: async (period: string): Promise<IPCResult<LearningReport>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_EXPORT_REPORT, period);
    },

    getQualityTrends: async (metric: string, period: string): Promise<IPCResult<QualityTrend[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_QUALITY_TRENDS, metric, period);
    },

    getEWCCurves: async (taskId?: string): Promise<IPCResult<EWCCurve[]>> => {
      return await ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_EWC_CURVES, taskId);
    }
  }
});
