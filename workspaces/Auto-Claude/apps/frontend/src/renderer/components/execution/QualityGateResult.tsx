import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import type { QualityGateResult as QualityGateResultType } from '../../../preload/api/execution-api';

interface QualityGateResultProps {
  gate: QualityGateResultType;
}

const QualityGateResult: React.FC<QualityGateResultProps> = ({ gate }) => {
  const { t } = useTranslation(['execution', 'common']);

  const getStatusBadgeVariant = (status: QualityGateResultType['status']) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'info';
      case 'pending':
        return 'muted';
      default:
        return 'default';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{t(`execution:qualityGates.types.${gate.type}`)}</h4>
          <Badge variant={getStatusBadgeVariant(gate.status)}>
            {t(`execution:qualityGates.status.${gate.status}`)}
          </Badge>
        </div>

        {gate.duration > 0 && (
          <div className="text-sm text-muted-foreground">
            {t('execution:qualityGates.duration', { duration: gate.duration })}
          </div>
        )}

        {gate.output && (
          <div className="mt-2 rounded-md bg-muted p-3">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
              {gate.output}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};

export default QualityGateResult;
