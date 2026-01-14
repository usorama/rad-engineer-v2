/**
 * ResearchAgentCard Component
 * Displays individual research agent status with progress
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';

export interface ResearchAgent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}

export interface ResearchAgentCardProps {
  agent: ResearchAgent;
}

export function ResearchAgentCard({ agent }: ResearchAgentCardProps): React.ReactElement {
  const { t } = useTranslation('planning');

  const getStatusVariant = (status: string): 'default' | 'success' | 'info' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <Badge variant={getStatusVariant(agent.status)}>
            {t(`planning:research.status.${agent.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('planning:research.agent.progress', { progress: agent.progress })}
            </span>
            <span className="font-medium">{agent.progress}%</span>
          </div>
          <Progress value={agent.progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
