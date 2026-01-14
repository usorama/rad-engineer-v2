/**
 * DecisionTimeline Component
 * Vertical timeline showing decision history chronologically with SVG connectors
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecisionCard, type Decision } from './DecisionCard';

interface DecisionHistoryResponse {
  success: boolean;
  data?: Decision[];
  error?: string;
}

export function DecisionTimeline(): React.ReactElement {
  const { t } = useTranslation(['learning', 'common']);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDecisionHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const result: DecisionHistoryResponse = await window.api.learning.getDecisionHistory();

        if (result.success && result.data) {
          // Sort decisions chronologically (oldest first)
          const sortedDecisions = [...result.data].sort((a, b) => a.timestamp - b.timestamp);
          setDecisions(sortedDecisions);
        } else {
          setError(result.error || t('learning:timeline.errors.loadDecisions'));
        }
      } catch (err) {
        console.error('Failed to fetch decision history:', err);
        setError(t('learning:timeline.errors.loadDecisions'));
      } finally {
        setLoading(false);
      }
    };

    void fetchDecisionHistory();
  }, [t]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">{t('common:labels.loading')}</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  // Empty state
  if (decisions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">{t('learning:timeline.noDecisions')}</div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 py-4" data-testid="decision-timeline">
      {decisions.map((decision, index) => (
        <div key={decision.id} className="relative">
          {/* Timeline connector line (vertical) */}
          {index < decisions.length - 1 && (
            <div
              className="absolute left-8 top-full h-6 w-0.5 bg-border"
              data-testid={`timeline-connector-${index}`}
              aria-hidden="true"
            />
          )}

          {/* Timeline node (circle) */}
          <div className="absolute left-6 top-4 h-4 w-4 rounded-full border-2 border-primary bg-background" />

          {/* Decision card with left margin for timeline */}
          <div className="ml-16">
            <DecisionCard decision={decision} />
          </div>
        </div>
      ))}
    </div>
  );
}
