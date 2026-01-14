/**
 * useExecution - React hooks for execution visibility
 * Phase 7: Frontend UI Integration
 *
 * Provides hooks for:
 * - Step status and events
 * - Loop status and events
 * - Execution dashboard data
 * - Checkpoints and replay
 * - Decision log
 * - Verification report
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface StepStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  phase: 'pending' | 'preconditions' | 'executing' | 'postconditions' | 'completed' | 'failed';
  progress: number;
  attemptNumber: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface LoopStatus {
  loopId: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentIteration: number;
  maxIterations: number;
  elapsedMs: number;
  exitConditionName: string;
  conditionSatisfied: boolean;
  progressPercent: number;
  estimatedRemainingIterations?: number;
  estimatedRemainingTime?: number;
}

export interface IterationResult {
  iteration: number;
  success: boolean;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  conditionSatisfied: boolean;
  conditionMessage?: string;
  error?: string;
}

export interface ConditionStatus {
  name: string;
  type: string;
  description: string;
  satisfied: boolean;
  progress: number;
  lastEvaluation?: {
    actualValue: unknown;
    expectedValue: unknown;
    message: string;
    durationMs: number;
    timestamp: string;
  };
}

export interface StepCheckpoint {
  id: string;
  sessionId: string;
  stepId: string;
  stepName: string;
  createdAt: string;
  label?: string;
}

export interface DecisionEntry {
  id: string;
  stepId: string;
  timestamp: string;
  category: string;
  decision: string;
  rationale: string;
  alternatives?: string[];
  confidence: number;
}

export interface VerificationResult {
  conditionName: string;
  conditionType: string;
  passed: boolean;
  message: string;
  timestamp: string;
}

export interface ExecutionDashboard {
  task: {
    id: string;
    title: string;
    status: string;
    progress: number;
  };
  currentStep: {
    id: string;
    name: string;
    status: string;
    phase: string;
    progress: number;
    attemptNumber: number;
    maxAttempts: number;
    elapsedMs: number;
  } | null;
  steps: Array<{
    id: string;
    name: string;
    status: string;
    durationMs: number | null;
    hasCheckpoint: boolean;
  }>;
  activeLoop: {
    id: string;
    name: string;
    currentIteration: number;
    maxIterations: number;
    exitConditions: Array<{ type: string; progress: number; satisfied: boolean }>;
  } | null;
  verification: {
    lastChecked: string;
    preconditions: Array<{ name: string; passed: boolean }>;
    postconditions: Array<{ name: string; passed: boolean }>;
  };
  metrics: {
    totalSteps: number;
    completedSteps: number;
    firstPassRate: number;
    avgStepDuration: number;
  };
  recentDecisions: Array<{
    timestamp: string;
    decision: string;
    rationale: string;
  }>;
  checkpoints: Array<{
    id: string;
    name: string;
    stepId: string;
    createdAt: string;
  }>;
  recentEvents: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  lastUpdated: string;
}

export interface VerificationReport {
  sessionId: string;
  status: 'verified' | 'failed' | 'partial';
  certaintyScore: number;
  steps: Array<{
    stepId: string;
    stepName: string;
    preconditions: { total: number; passed: number };
    postconditions: { total: number; passed: number };
    verified: boolean;
  }>;
  qualityGates: Array<{
    name: string;
    passed: boolean;
    value?: string | number;
  }>;
  generatedAt: string;
}

export interface StepEvent {
  stepId: string;
  taskId: string;
  stepName: string;
  status: string;
  timestamp: string;
}

export interface LoopEvent {
  loopId: string;
  loopName: string;
  status: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get step status by ID
 */
export function useStepStatus(stepId: string): {
  status: StepStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [status, setStatus] = useState<StepStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!stepId) return;

    try {
      setLoading(true);
      const result = await window.api.step?.getStatus?.(stepId);
      if (result?.success) {
        setStatus(result.data);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch step status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [stepId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

/**
 * Hook to get all steps for a task
 */
export function useStepsByTask(taskId: string): {
  steps: StepStatus[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSteps = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const result = await window.api.step?.getByTask?.(taskId);
      if (result?.success) {
        setSteps(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch steps');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  return { steps, loading, error, refetch: fetchSteps };
}

/**
 * Hook to get loop status
 */
export function useLoopStatus(loopId: string): {
  status: LoopStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!loopId) return;

    try {
      setLoading(true);
      const result = await window.api.loop?.getStatus?.(loopId);
      if (result?.success) {
        setStatus(result.data);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch loop status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [loopId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

/**
 * Hook to get loop iterations
 */
export function useLoopIterations(loopId: string): {
  iterations: IterationResult[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [iterations, setIterations] = useState<IterationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIterations = useCallback(async () => {
    if (!loopId) return;

    try {
      setLoading(true);
      const result = await window.api.loop?.getIterations?.(loopId);
      if (result?.success) {
        setIterations(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch iterations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [loopId]);

  useEffect(() => {
    fetchIterations();
  }, [fetchIterations]);

  return { iterations, loading, error, refetch: fetchIterations };
}

/**
 * Hook to get loop conditions
 */
export function useLoopConditions(loopId: string): {
  conditions: ConditionStatus[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [conditions, setConditions] = useState<ConditionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConditions = useCallback(async () => {
    if (!loopId) return;

    try {
      setLoading(true);
      const result = await window.api.loop?.getConditions?.(loopId);
      if (result?.success) {
        setConditions(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch conditions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [loopId]);

  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  return { conditions, loading, error, refetch: fetchConditions };
}

/**
 * Hook to get execution dashboard data
 */
export function useExecutionDashboard(taskId: string): {
  dashboard: ExecutionDashboard | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [dashboard, setDashboard] = useState<ExecutionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const result = await window.api.dashboard?.getExecutionDashboard?.(taskId);
      if (result?.success) {
        setDashboard(result.data);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { dashboard, loading, error, refetch: fetchDashboard };
}

/**
 * Hook for step events subscription
 */
export function useStepEvents(): {
  events: StepEvent[];
  subscribe: (taskId: string) => () => void;
  clearEvents: () => void;
} {
  const [events, setEvents] = useState<StepEvent[]>([]);

  const subscribe = useCallback((taskId: string) => {
    const unsubscribe = window.api.step?.onStepEvent?.(taskId, (event: StepEvent) => {
      setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
    });
    return unsubscribe || (() => {});
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, subscribe, clearEvents };
}

/**
 * Hook for loop events subscription
 */
export function useLoopEvents(): {
  events: LoopEvent[];
  subscribe: (loopId: string) => () => void;
  clearEvents: () => void;
} {
  const [events, setEvents] = useState<LoopEvent[]>([]);

  const subscribe = useCallback((loopId: string) => {
    const unsubscribe = window.api.loop?.onLoopEvent?.(loopId, (event: LoopEvent) => {
      setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
    });
    return unsubscribe || (() => {});
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, subscribe, clearEvents };
}

/**
 * Hook to get checkpoints for a session
 */
export function useCheckpoints(sessionId: string): {
  checkpoints: StepCheckpoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createCheckpoint: (stepId: string, label?: string) => Promise<string | null>;
} {
  const [checkpoints, setCheckpoints] = useState<StepCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckpoints = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const result = await window.api.step?.getCheckpoints?.(sessionId);
      if (result?.success) {
        setCheckpoints(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch checkpoints');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const createCheckpoint = useCallback(async (stepId: string, label?: string): Promise<string | null> => {
    try {
      const result = await window.api.step?.createCheckpoint?.(stepId, label);
      if (result?.success) {
        await fetchCheckpoints(); // Refresh list
        return result.data?.checkpointId || null;
      }
      return null;
    } catch {
      return null;
    }
  }, [fetchCheckpoints]);

  useEffect(() => {
    fetchCheckpoints();
  }, [fetchCheckpoints]);

  return { checkpoints, loading, error, refetch: fetchCheckpoints, createCheckpoint };
}

/**
 * Hook to get decision log
 */
export function useDecisionLog(sessionId: string): {
  decisions: DecisionEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  exportAsMarkdown: () => Promise<string | null>;
} {
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const result = await window.api.step?.getDecisionLog?.(sessionId);
      if (result?.success) {
        setDecisions(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch decisions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const exportAsMarkdown = useCallback(async (): Promise<string | null> => {
    try {
      const result = await window.api.step?.exportDecisionLog?.(sessionId);
      if (result?.success) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  return { decisions, loading, error, refetch: fetchDecisions, exportAsMarkdown };
}

/**
 * Hook to get verification report
 */
export function useVerificationReport(sessionId: string): {
  report: VerificationReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const result = await window.api.verification?.getReport?.(sessionId);
      if (result?.success) {
        setReport(result.data);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch verification report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}

/**
 * Hook for replay actions
 */
export function useReplay(): {
  resumeFromCheckpoint: (checkpointId: string, options?: {
    skipFailedStep?: boolean;
    restoreFiles?: boolean;
    restoreGit?: boolean;
  }) => Promise<boolean>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumeFromCheckpoint = useCallback(async (
    checkpointId: string,
    options?: {
      skipFailedStep?: boolean;
      restoreFiles?: boolean;
      restoreGit?: boolean;
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.step?.replayFromCheckpoint?.(checkpointId, options);
      if (result?.success) {
        return true;
      }
      setError(result?.error || 'Failed to resume from checkpoint');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resumeFromCheckpoint, loading, error };
}

/**
 * Hook for loop control actions
 */
export function useLoopControl(loopId: string): {
  forceExit: () => Promise<boolean>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forceExit = useCallback(async (): Promise<boolean> => {
    if (!loopId) return false;

    try {
      setLoading(true);
      setError(null);
      const result = await window.api.loop?.forceExit?.(loopId);
      if (result?.success) {
        return true;
      }
      setError(result?.error || 'Failed to force exit loop');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loopId]);

  return { forceExit, loading, error };
}
