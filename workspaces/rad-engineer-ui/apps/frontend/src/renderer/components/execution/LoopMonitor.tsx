/**
 * LoopMonitor - RepeatUntil loop visualization
 * Phase 7: Frontend UI Integration
 *
 * Displays:
 * - Current iteration progress
 * - Exit condition status
 * - Iteration history
 * - Loop control actions
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, XCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

interface ExitCondition {
  type: string;
  progress: number;
  satisfied: boolean;
}

interface IterationResult {
  iteration: number;
  success: boolean;
  durationMs: number;
  conditionSatisfied: boolean;
  conditionMessage?: string;
  error?: string;
}

interface LoopMonitorProps {
  loopId: string;
  loopName: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentIteration: number;
  maxIterations: number;
  exitConditions: ExitCondition[];
  iterations: IterationResult[];
  estimatedRemainingTime?: number;
  onForceExit?: () => void;
  loading?: boolean;
}

const LoopMonitor: React.FC<LoopMonitorProps> = ({
  loopId,
  loopName,
  status,
  currentIteration,
  maxIterations,
  exitConditions,
  iterations,
  estimatedRemainingTime,
  onForceExit,
  loading,
}) => {
  const { t } = useTranslation(['execution', 'common']);

  const progressPercent = Math.round((currentIteration / maxIterations) * 100);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {t('execution:loop.status.running')}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircle className="h-3 w-3" />
            {t('execution:loop.status.completed')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
            <XCircle className="h-3 w-3" />
            {t('execution:loop.status.failed')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            {t('execution:loop.status.cancelled')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{loopName}</h3>
          {getStatusBadge()}
        </div>
        {status === 'running' && onForceExit && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onForceExit}
            disabled={loading}
          >
            {t('execution:loop.forceExit')}
          </Button>
        )}
      </div>

      {/* Iteration Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('execution:loop.iteration', { current: currentIteration, max: maxIterations })}
          </span>
          <span className="font-medium">{progressPercent}%</span>
        </div>

        {/* Visual iteration indicators */}
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(maxIterations, 10) }, (_, i) => {
            const iterNum = i + 1;
            const isCompleted = iterNum < currentIteration;
            const isCurrent = iterNum === currentIteration;
            const result = iterations.find((it) => it.iteration === iterNum);

            return (
              <div
                key={i}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-all',
                  isCompleted && result?.success && 'border-green-500 bg-green-100 text-green-700',
                  isCompleted && !result?.success && 'border-red-500 bg-red-100 text-red-700',
                  isCurrent && 'border-blue-500 bg-blue-100 text-blue-700 ring-2 ring-blue-500/50',
                  !isCompleted && !isCurrent && 'border-muted bg-background text-muted-foreground'
                )}
                title={result?.conditionMessage}
              >
                {iterNum}
              </div>
            );
          })}
          {maxIterations > 10 && (
            <span className="text-sm text-muted-foreground">+{maxIterations - 10} more</span>
          )}
        </div>

        <Progress value={progressPercent} className="h-2" />

        {estimatedRemainingTime && status === 'running' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t('execution:loop.estimatedRemaining', { time: formatDuration(estimatedRemainingTime) })}
          </div>
        )}
      </div>

      {/* Exit Conditions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t('execution:loop.exitConditions')}</h4>
        {exitConditions.map((condition, index) => (
          <div
            key={index}
            className={cn(
              'rounded-lg border p-3',
              condition.satisfied ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-muted'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium capitalize">{condition.type}</span>
              {condition.satisfied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <span className="text-xs text-muted-foreground">{condition.progress}%</span>
              )}
            </div>
            <Progress value={condition.progress} className="h-1.5" />
          </div>
        ))}
      </div>

      {/* Recent Iterations */}
      {iterations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('execution:loop.recentIterations')}</h4>
          <div className="flex flex-wrap gap-2">
            {iterations.slice(-5).map((iteration) => (
              <div
                key={iteration.iteration}
                className={cn(
                  'rounded-lg border px-2 py-1 text-xs',
                  iteration.success
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
                )}
                title={iteration.error || iteration.conditionMessage}
              >
                <span className="font-medium">#{iteration.iteration}</span>
                <span className="mx-1 text-muted-foreground">|</span>
                <span>{formatDuration(iteration.durationMs)}</span>
                <span className="mx-1">
                  {iteration.success ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loop ID (for debugging) */}
      <div className="pt-2 border-t">
        <span className="text-xs text-muted-foreground font-mono">{loopId}</span>
      </div>
    </div>
  );
};

export default LoopMonitor;
