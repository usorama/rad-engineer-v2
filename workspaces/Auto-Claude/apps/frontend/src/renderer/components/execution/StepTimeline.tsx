/**
 * StepTimeline - Visual timeline of step execution
 * Phase 7: Frontend UI Integration
 *
 * Displays:
 * - All steps in a task with their status
 * - Progress indicators
 * - Duration information
 * - Checkpoint markers
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Circle, Loader2, Clock, Flag } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepTimelineEntry {
  id: string;
  name: string;
  status: string;
  durationMs: number | null;
  hasCheckpoint: boolean;
}

interface StepTimelineProps {
  steps: StepTimelineEntry[];
  currentStepId?: string | null;
  onStepClick?: (stepId: string) => void;
}

const StepTimeline: React.FC<StepTimelineProps> = ({
  steps,
  currentStepId,
  onStepClick,
}) => {
  const { t } = useTranslation(['execution', 'common']);

  const getStatusIcon = (status: string, isCurrentStep: boolean) => {
    if (isCurrentStep && status === 'executing') {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }

    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'executing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'skipped':
        return <Circle className="h-5 w-5 text-gray-400" />;
      case 'pending':
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'executing':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'skipped':
        return 'border-gray-400 bg-gray-50 dark:bg-gray-900/20';
      case 'pending':
      default:
        return 'border-muted bg-muted/20';
    }
  };

  const formatDuration = (ms: number | null): string => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {t('execution:steps.noSteps')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isCurrentStep = step.id === currentStepId;
        const isLastStep = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Connection line */}
            {!isLastStep && (
              <div
                className={cn(
                  'absolute left-[18px] top-[40px] h-full w-0.5',
                  step.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}

            {/* Step card */}
            <button
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                'relative flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50',
                getStatusColor(step.status),
                isCurrentStep && 'ring-2 ring-blue-500 ring-offset-2'
              )}
              disabled={!onStepClick}
            >
              {/* Status icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(step.status, isCurrentStep)}
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{step.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step.hasCheckpoint && (
                      <Flag className="h-4 w-4 text-amber-500" title={t('execution:steps.hasCheckpoint')} />
                    )}
                    {step.durationMs !== null && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(step.durationMs)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {t(`execution:steps.status.${step.status}`, { defaultValue: step.status })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    #{index + 1}
                  </span>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default StepTimeline;
