import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import QualityGateResult from './QualityGateResult';
import type { QualityGateResult as QualityGateResultType } from '../../../preload/api/execution-api';

interface QualityGatesPanelProps {
  specId: string;
}

const QualityGatesPanel: React.FC<QualityGatesPanelProps> = ({ specId }) => {
  const { t } = useTranslation(['execution', 'common']);
  const [gates, setGates] = useState<QualityGateResultType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQualityGates = async () => {
      try {
        setLoading(true);
        const result = await window.api.execution.getQualityGates(specId);

        if (result.success) {
          setGates(result.data);
          setError(null);
        } else {
          setError(result.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quality gates');
      } finally {
        setLoading(false);
      }
    };

    fetchQualityGates();

    // Subscribe to real-time updates
    const unsubscribe = window.api.execution.onQualityGateResult(
      specId,
      (updatedGate: QualityGateResultType) => {
        setGates((prev) => {
          const existingIndex = prev.findIndex((g) => g.type === updatedGate.type);

          if (existingIndex >= 0) {
            // Update existing gate
            const updated = [...prev];
            updated[existingIndex] = updatedGate;
            return updated;
          } else {
            // Add new gate
            return [...prev, updatedGate];
          }
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [specId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('common:labels.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{t('execution:qualityGates.errors.fetchFailed')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">{t('execution:qualityGates.title')}</h3>

      {gates.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">{t('execution:qualityGates.noGates')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {gates.map((gate) => (
            <QualityGateResult key={gate.type} gate={gate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default QualityGatesPanel;
