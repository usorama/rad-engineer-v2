import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface Wave {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentCount: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
}

interface WaveCardProps {
  wave: Wave;
  isCurrent: boolean;
}

const WaveCard: React.FC<WaveCardProps> = ({ wave, isCurrent }) => {
  const { t } = useTranslation(['execution', 'common']);

  const statusColors = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-blue-500 text-white',
    completed: 'bg-green-500 text-white',
    failed: 'bg-destructive text-destructive-foreground'
  };

  const statusBorderColors = {
    pending: 'border-muted',
    running: 'border-blue-500',
    completed: 'border-green-500',
    failed: 'border-destructive'
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isCurrent && 'ring-2 ring-primary',
        statusBorderColors[wave.status]
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{wave.name}</CardTitle>
          <Badge className={cn('capitalize', statusColors[wave.status])}>
            {t(`execution:status.${wave.status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('execution:labels.agentCount', { count: wave.agentCount })}
            </span>
            <span className="font-medium">{wave.agentCount}</span>
          </div>

          {wave.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('execution:labels.progress', { percent: wave.progress })}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${wave.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
        {wave.startedAt && (
          <div>
            {t('execution:labels.startedAt', {
              time: new Date(wave.startedAt).toLocaleTimeString()
            })}
          </div>
        )}
        {wave.completedAt && (
          <div>
            {t('execution:labels.completedAt', {
              time: new Date(wave.completedAt).toLocaleTimeString()
            })}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default WaveCard;
