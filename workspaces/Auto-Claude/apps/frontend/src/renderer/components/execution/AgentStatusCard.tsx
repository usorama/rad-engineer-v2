import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  cpuPercent: number;
  memoryMB: number;
  currentTask: string;
  startedAt: string;
}

interface AgentStatusCardProps {
  agent: Agent;
}

const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ agent }) => {
  const { t } = useTranslation(['execution', 'common']);

  const statusColors = {
    running: 'bg-blue-500 text-white',
    completed: 'bg-green-500 text-white',
    failed: 'bg-destructive text-destructive-foreground',
    idle: 'bg-muted text-muted-foreground'
  };

  const calculateElapsedTime = (startedAt: string): string => {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = now - start;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{agent.name}</CardTitle>
          <Badge className={cn('capitalize', statusColors[agent.status])}>
            {t(`execution:status.${agent.status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Resource Usage */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">
                {t('execution:agentMonitor.cpuUsage', { percent: agent.cpuPercent.toFixed(1) })}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">
                {t('execution:agentMonitor.memoryUsage', { mb: agent.memoryMB })}
              </div>
            </div>
          </div>

          {/* Current Task */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              {t('execution:agentMonitor.currentTask')}
            </div>
            <div className="flex items-start gap-2">
              {agent.status === 'running' && (
                <div className="mt-1 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-blue-500" />
              )}
              <div className="text-sm">
                {agent.currentTask || t('execution:agentMonitor.noTask')}
              </div>
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="text-xs text-muted-foreground">
            {t('execution:agentMonitor.elapsed', { time: calculateElapsedTime(agent.startedAt) })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentStatusCard;
