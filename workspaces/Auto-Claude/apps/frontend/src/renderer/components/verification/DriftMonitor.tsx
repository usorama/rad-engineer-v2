import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DriftGauge } from './DriftGauge';
import { DriftTimeline, DriftDataPoint } from './DriftTimeline';

interface DriftCheckResult {
  driftPercentage: number;
  timestamp: number;
}

export function DriftMonitor(): JSX.Element {
  const { t } = useTranslation('verification');
  const [currentDrift, setCurrentDrift] = useState<DriftCheckResult | null>(null);
  const [driftHistory, setDriftHistory] = useState<DriftDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDriftData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load current drift and history in parallel
        const [currentResult, historyResult] = await Promise.all([
          window.api.vac.checkDrift(),
          window.api.vac.getDriftHistory()
        ]);

        setCurrentDrift(currentResult);
        setDriftHistory(historyResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDriftData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('drift.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">{t('drift.error')}</p>
      </div>
    );
  }

  if (!currentDrift || driftHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <p className="text-muted-foreground">{t('drift.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('drift.title')}</h2>
        <p className="text-muted-foreground">{t('drift.description')}</p>
      </div>

      {/* Current Drift Gauge */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('drift.currentRate')}</h3>
        <div className="flex justify-center p-6 bg-card rounded-lg border">
          <DriftGauge percentage={currentDrift.driftPercentage} />
        </div>
      </div>

      {/* Drift Trend Timeline */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('drift.trend')}</h3>
        <div className="p-6 bg-card rounded-lg border">
          <DriftTimeline history={driftHistory} />
        </div>
      </div>
    </div>
  );
}
