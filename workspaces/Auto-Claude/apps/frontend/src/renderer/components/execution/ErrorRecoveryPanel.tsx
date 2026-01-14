import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import ErrorRecoveryAction from './ErrorRecoveryAction';
import { Badge } from '../ui/badge';

interface Checkpoint {
  id: string;
  name: string;
  timestamp: string;
}

interface ErrorRecoveryStatus {
  hasError: boolean;
  errorMessage?: string;
  failedStep?: string;
  failedTaskId?: string;
  waveId?: string;
  checkpoints?: Checkpoint[];
}

interface ErrorRecoveryPanelProps {
  specId: string;
}

const ErrorRecoveryPanel: React.FC<ErrorRecoveryPanelProps> = ({ specId }) => {
  const { t } = useTranslation('execution');
  const [status, setStatus] = useState<ErrorRecoveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);

  useEffect(() => {
    fetchErrorRecoveryStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specId]);

  const fetchErrorRecoveryStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.execution.getErrorRecoveryStatus(specId);

      if (result.success) {
        setStatus(result.data);
      } else {
        setError(t('errorRecovery.fetchFailed'));
      }
    } catch (_err) {
      setError(t('errorRecovery.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRetryWave = async () => {
    if (!status?.waveId) return;

    setRecovering(true);
    try {
      await window.api.execution.retryWave(specId, status.waveId);
      await fetchErrorRecoveryStatus();
    } catch (_err) {
      setError(t('errorRecovery.fetchFailed'));
    } finally {
      setRecovering(false);
    }
  };

  const handleRetryTask = async () => {
    if (!status?.waveId || !status?.failedTaskId) return;

    setRecovering(true);
    try {
      await window.api.execution.retryTask(specId, status.waveId, status.failedTaskId);
      await fetchErrorRecoveryStatus();
    } catch (_err) {
      setError(t('errorRecovery.fetchFailed'));
    } finally {
      setRecovering(false);
    }
  };

  const handleRestoreCheckpoint = async () => {
    if (!selectedCheckpoint) return;

    setRecovering(true);
    try {
      await window.api.execution.restoreCheckpoint(specId, selectedCheckpoint);
      await fetchErrorRecoveryStatus();
    } catch (_err) {
      setError(t('errorRecovery.fetchFailed'));
    } finally {
      setRecovering(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('errorRecovery.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('errorRecovery.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('errorRecovery.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!status?.hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('errorRecovery.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('errorRecovery.noErrors')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('errorRecovery.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Details */}
        <div className="space-y-2">
          {status.errorMessage && (
            <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                {t('errorRecovery.errorMessage', { message: status.errorMessage })}
              </p>
            </div>
          )}

          {status.failedStep && (
            <p className="text-sm text-muted-foreground">
              {t('errorRecovery.failedStep', { step: status.failedStep })}
            </p>
          )}
        </div>

        {/* Recovery Actions */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {status.waveId && (
              <ErrorRecoveryAction
                type="retryWave"
                onConfirm={handleRetryWave}
                disabled={recovering}
              />
            )}

            {status.failedTaskId && status.waveId && (
              <ErrorRecoveryAction
                type="retryTask"
                onConfirm={handleRetryTask}
                disabled={recovering}
              />
            )}
          </div>
        </div>

        {/* Available Checkpoints */}
        {status.checkpoints && status.checkpoints.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{t('errorRecovery.availableCheckpoints')}</h4>
            <div className="space-y-2">
              {status.checkpoints.map((checkpoint) => (
                <div
                  key={checkpoint.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedCheckpoint(checkpoint.id)}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{checkpoint.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(checkpoint.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {selectedCheckpoint === checkpoint.id && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
              ))}
            </div>

            {selectedCheckpoint && (
              <ErrorRecoveryAction
                type="restoreCheckpoint"
                onConfirm={handleRestoreCheckpoint}
                disabled={recovering}
                checkpointName={
                  status.checkpoints.find((cp) => cp.id === selectedCheckpoint)?.name
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorRecoveryPanel;
