/**
 * DecisionCard Component
 * Displays individual decision with timestamp, method, outcome, and metrics
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export interface DecisionMetrics {
  qualityScore: number;
  confidence: number;
  impactScore: number;
}

export interface Decision {
  id: string;
  timestamp: number;
  method: 'VAC' | 'EWC' | 'Hybrid';
  outcome: 'success' | 'adjusted' | 'failed';
  metrics: DecisionMetrics;
  description: string;
}

interface DecisionCardProps {
  decision: Decision;
}

export function DecisionCard({ decision }: DecisionCardProps): React.ReactElement {
  const { t } = useTranslation(['learning']);

  // Outcome badge styling
  const outcomeStyling = {
    success: 'bg-green-500 text-white',
    adjusted: 'bg-yellow-500 text-white',
    failed: 'bg-destructive text-destructive-foreground'
  };

  // Format timestamp as relative time
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
    }
  };

  // Format percentage for display
  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Method badge and outcome */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs font-medium">
              {decision.method}
            </Badge>
            <Badge className={cn('capitalize', outcomeStyling[decision.outcome])}>
              {t(`learning:timeline.outcomes.${decision.outcome}`)}
            </Badge>
          </div>

          {/* Description */}
          <div className="text-sm font-medium">{decision.description}</div>

          {/* Timestamp */}
          <div
            className="text-xs text-muted-foreground"
            data-testid={`decision-timestamp-${decision.id}`}
          >
            {formatTimestamp(decision.timestamp)}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {/* Quality Score */}
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">
                {t('learning:timeline.metrics.quality')}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {formatPercentage(decision.metrics.qualityScore)}
              </div>
            </div>

            {/* Confidence */}
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">
                {t('learning:timeline.metrics.confidence')}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {formatPercentage(decision.metrics.confidence)}
              </div>
            </div>

            {/* Impact */}
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">
                {t('learning:timeline.metrics.impact')}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {formatPercentage(decision.metrics.impactScore)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
