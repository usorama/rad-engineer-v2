/**
 * ExecutionDashboardEnhanced - Step-level execution visibility
 * Phase 7: Frontend UI Integration
 *
 * Enhanced dashboard combining:
 * - Current step details
 * - Step timeline
 * - Verification status
 * - Active loop monitoring
 * - Quick actions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Pause, Play, Flag, FileText, Activity, Shield, RefreshCw, Clock, Target, CheckCircle, XCircle } from 'lucide-react';
import StepTimeline from './StepTimeline';
import LoopMonitor from './LoopMonitor';
import { cn } from '../../lib/utils';

interface CurrentStep {
  id: string;
  name: string;
  status: string;
  phase: string;
  progress: number;
  attemptNumber: number;
  maxAttempts: number;
  elapsedMs: number;
}

interface StepTimelineEntry {
  id: string;
  name: string;
  status: string;
  durationMs: number | null;
  hasCheckpoint: boolean;
}

interface ActiveLoop {
  id: string;
  name: string;
  currentIteration: number;
  maxIterations: number;
  exitConditions: Array<{ type: string; progress: number; satisfied: boolean }>;
}

interface Verification {
  lastChecked: string;
  preconditions: Array<{ name: string; passed: boolean }>;
  postconditions: Array<{ name: string; passed: boolean }>;
}

interface Metrics {
  totalSteps: number;
  completedSteps: number;
  firstPassRate: number;
  avgStepDuration: number;
}

interface RecentEvent {
  type: string;
  message: string;
  timestamp: string;
}

interface ExecutionDashboardEnhancedProps {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskProgress: number;
  currentStep: CurrentStep | null;
  steps: StepTimelineEntry[];
  activeLoop: ActiveLoop | null;
  verification: Verification;
  metrics: Metrics;
  recentEvents: RecentEvent[];
  onPause?: () => void;
  onResume?: () => void;
  onCreateCheckpoint?: () => void;
  onViewDecisions?: () => void;
  onStepClick?: (stepId: string) => void;
  onForceExitLoop?: () => void;
  paused?: boolean;
  loading?: boolean;
}

const ExecutionDashboardEnhanced: React.FC<ExecutionDashboardEnhancedProps> = ({
  taskId,
  taskTitle,
  taskStatus,
  taskProgress,
  currentStep,
  steps,
  activeLoop,
  verification,
  metrics,
  recentEvents,
  onPause,
  onResume,
  onCreateCheckpoint,
  onViewDecisions,
  onStepClick,
  onForceExitLoop,
  paused,
  loading,
}) => {
  const { t } = useTranslation(['execution', 'common']);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getPhaseLabel = (phase: string): string => {
    return t(`execution:step.phase.${phase}`, { defaultValue: phase });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'in_progress':
      case 'executing':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {t('common:labels.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{taskTitle}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className={cn('capitalize', getStatusColor(taskStatus))}>{taskStatus}</span>
            <span>•</span>
            <span>{taskProgress}% complete</span>
            <span>•</span>
            <span className="font-mono text-xs">{taskId}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {paused ? (
            <Button variant="default" size="sm" onClick={onResume}>
              <Play className="mr-2 h-4 w-4" />
              {t('execution:actions.resume')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="mr-2 h-4 w-4" />
              {t('execution:actions.pause')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onCreateCheckpoint}>
            <Flag className="mr-2 h-4 w-4" />
            {t('execution:actions.checkpoint')}
          </Button>
          <Button variant="outline" size="sm" onClick={onViewDecisions}>
            <FileText className="mr-2 h-4 w-4" />
            {t('execution:actions.decisions')}
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Step Card */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border p-4 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t('execution:currentStep.title')}</h3>
            </div>

            {currentStep ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-medium">{currentStep.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Step {steps.findIndex(s => s.id === currentStep.id) + 1} of {steps.length}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t('execution:currentStep.phase')}</div>
                    <div className="font-medium capitalize">{getPhaseLabel(currentStep.phase)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('execution:currentStep.attempt')}</div>
                    <div className="font-medium">{currentStep.attemptNumber}/{currentStep.maxAttempts}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t('execution:currentStep.progress')}</span>
                    <span>{currentStep.progress}%</span>
                  </div>
                  <Progress value={currentStep.progress} className="h-2" />
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDuration(currentStep.elapsedMs)}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {t('execution:currentStep.noActiveStep')}
              </div>
            )}
          </div>
        </div>

        {/* Step Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t('execution:stepTimeline.title')}</h3>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <StepTimeline
                steps={steps}
                currentStepId={currentStep?.id}
                onStepClick={onStepClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status & Active Loop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification Status */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t('execution:verification.title')}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">{t('execution:verification.preconditions')}</div>
              <div className="space-y-1">
                {verification.preconditions.length > 0 ? (
                  verification.preconditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {cond.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {cond.name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">{t('execution:verification.pending')}</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">{t('execution:verification.postconditions')}</div>
              <div className="space-y-1">
                {verification.postconditions.length > 0 ? (
                  verification.postconditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {cond.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {cond.name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">{t('execution:verification.pending')}</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            {t('execution:verification.lastChecked')}: {new Date(verification.lastChecked).toLocaleTimeString()}
          </div>
        </div>

        {/* Active Loop or Metrics */}
        {activeLoop ? (
          <LoopMonitor
            loopId={activeLoop.id}
            loopName={activeLoop.name}
            status="running"
            currentIteration={activeLoop.currentIteration}
            maxIterations={activeLoop.maxIterations}
            exitConditions={activeLoop.exitConditions}
            iterations={[]}
            onForceExit={onForceExitLoop}
          />
        ) : (
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t('execution:metrics.title')}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-2xl font-bold">{metrics.completedSteps}/{metrics.totalSteps}</div>
                <div className="text-xs text-muted-foreground">{t('execution:metrics.stepsCompleted')}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-2xl font-bold">{metrics.firstPassRate}%</div>
                <div className="text-xs text-muted-foreground">{t('execution:metrics.firstPassRate')}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center col-span-2">
                <div className="text-2xl font-bold">{formatDuration(metrics.avgStepDuration)}</div>
                <div className="text-xs text-muted-foreground">{t('execution:metrics.avgDuration')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-4">{t('execution:events.title')}</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentEvents.slice(-10).map((event, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                  {event.type}
                </span>
                <span className="text-muted-foreground">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionDashboardEnhanced;
