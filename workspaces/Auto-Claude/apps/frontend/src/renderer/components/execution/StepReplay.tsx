/**
 * StepReplay - Checkpoint management and replay controls
 * Phase 7: Frontend UI Integration
 *
 * Displays:
 * - Available checkpoints list
 * - Checkpoint details
 * - Replay options
 * - Resume functionality
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Flag, Clock, GitBranch, FileCode, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../lib/utils';

interface StepCheckpoint {
  id: string;
  sessionId: string;
  stepId: string;
  stepName: string;
  stepSequence: number;
  createdAt: string;
  label?: string;
  memoryUtilization?: number;
  filesModified?: string[];
  gitCommit?: string;
}

interface ResumeRecommendation {
  action: 'resume' | 'restart' | 'skip' | 'abort';
  reason: string;
  fromStep: string;
  confidence: number;
}

interface ReplayOptions {
  skipFailedStep: boolean;
  restoreFiles: boolean;
  restoreGit: boolean;
}

interface StepReplayProps {
  checkpoints: StepCheckpoint[];
  selectedCheckpoint?: StepCheckpoint | null;
  recommendation?: ResumeRecommendation | null;
  onSelectCheckpoint: (checkpoint: StepCheckpoint) => void;
  onResume: (checkpointId: string, options: ReplayOptions) => void;
  loading?: boolean;
}

const StepReplay: React.FC<StepReplayProps> = ({
  checkpoints,
  selectedCheckpoint,
  recommendation,
  onSelectCheckpoint,
  onResume,
  loading,
}) => {
  const { t } = useTranslation(['execution', 'common']);

  const [options, setOptions] = useState<ReplayOptions>({
    skipFailedStep: false,
    restoreFiles: true,
    restoreGit: true,
  });

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecommendationBadge = (action: string) => {
    switch (action) {
      case 'resume':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircle className="h-3 w-3" />
            {t('execution:replay.recommendation.resume')}
          </span>
        );
      case 'skip':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            {t('execution:replay.recommendation.skip')}
          </span>
        );
      case 'restart':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            {t('execution:replay.recommendation.restart')}
          </span>
        );
      case 'abort':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
            <AlertCircle className="h-3 w-3" />
            {t('execution:replay.recommendation.abort')}
          </span>
        );
      default:
        return null;
    }
  };

  const handleResume = () => {
    if (selectedCheckpoint) {
      onResume(selectedCheckpoint.id, options);
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Checkpoint List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('execution:replay.availableCheckpoints')}</h3>

        {checkpoints.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {t('execution:replay.noCheckpoints')}
          </div>
        ) : (
          <div className="space-y-2">
            {checkpoints.map((checkpoint) => {
              const isSelected = selectedCheckpoint?.id === checkpoint.id;

              return (
                <button
                  key={checkpoint.id}
                  onClick={() => onSelectCheckpoint(checkpoint)}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                    isSelected && 'border-primary ring-2 ring-primary'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Flag className={cn(
                        'h-5 w-5',
                        isSelected ? 'text-primary' : 'text-amber-500'
                      )} />
                      <div>
                        <div className="font-medium">
                          {checkpoint.label || `Checkpoint #${checkpoint.stepSequence}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {checkpoint.stepName}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {formatDateTime(checkpoint.createdAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkpoint Details & Options */}
      <div className="space-y-4">
        {selectedCheckpoint ? (
          <>
            {/* Checkpoint Details */}
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="font-semibold">{t('execution:replay.checkpointDetails')}</h4>

              <div className="grid gap-4 sm:grid-cols-2">
                {selectedCheckpoint.memoryUtilization !== undefined && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">{t('execution:replay.memoryContext')}</div>
                    <div className="text-lg font-semibold">{selectedCheckpoint.memoryUtilization}%</div>
                  </div>
                )}

                {selectedCheckpoint.gitCommit && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {t('execution:replay.gitCommit')}
                    </div>
                    <div className="text-sm font-mono">{selectedCheckpoint.gitCommit}</div>
                  </div>
                )}
              </div>

              {selectedCheckpoint.filesModified && selectedCheckpoint.filesModified.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <FileCode className="h-3 w-3" />
                    {t('execution:replay.filesModified')}
                  </div>
                  <div className="text-sm font-mono bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                    {selectedCheckpoint.filesModified.map((file, idx) => (
                      <div key={idx} className="truncate">{file}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground font-mono">
                {selectedCheckpoint.id}
              </div>
            </div>

            {/* Recommendation */}
            {recommendation && (
              <div className={cn(
                'rounded-lg border p-4',
                recommendation.action === 'abort' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-muted'
              )}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold">{t('execution:replay.recommendation.title')}</h4>
                  {getRecommendationBadge(recommendation.action)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{recommendation.reason}</p>
                <div className="text-xs text-muted-foreground">
                  {t('execution:replay.recommendation.confidence')}: {Math.round(recommendation.confidence * 100)}%
                </div>
              </div>
            )}

            {/* Replay Options */}
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="font-semibold">{t('execution:replay.options')}</h4>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipFailedStep"
                    checked={options.skipFailedStep}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, skipFailedStep: checked === true }))
                    }
                  />
                  <label
                    htmlFor="skipFailedStep"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('execution:replay.options.skipFailedStep')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="restoreFiles"
                    checked={options.restoreFiles}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, restoreFiles: checked === true }))
                    }
                  />
                  <label
                    htmlFor="restoreFiles"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('execution:replay.options.restoreFiles')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="restoreGit"
                    checked={options.restoreGit}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, restoreGit: checked === true }))
                    }
                  />
                  <label
                    htmlFor="restoreGit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('execution:replay.options.restoreGit')}
                  </label>
                </div>
              </div>
            </div>

            {/* Resume Button */}
            <Button
              onClick={handleResume}
              className="w-full"
              size="lg"
              disabled={recommendation?.action === 'abort'}
            >
              <Play className="mr-2 h-4 w-4" />
              {t('execution:replay.resumeFromCheckpoint')}
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {t('execution:replay.selectCheckpoint')}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepReplay;
