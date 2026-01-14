/**
 * WaveTimeline Component
 * Horizontal timeline visualization showing waves with date ranges
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/badge';
import type { Wave, Story } from './types';

export interface WaveTimelineProps {
  waves: Wave[];
  stories: Story[];
}

export function WaveTimeline({ waves, stories }: WaveTimelineProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  if (waves.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {t('planning:visualizer.timeline.noWaves')}
      </div>
    );
  }

  // Count stories per wave
  const storyCountByWave = stories.reduce((acc, story) => {
    acc[story.waveId] = (acc[story.waveId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Format dates
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {waves.map((wave, index) => {
        const storyCount = storyCountByWave[wave.id] || 0;
        const startDate = formatDate(wave.startDate);
        const endDate = formatDate(wave.endDate);

        return (
          <div key={wave.id} className="relative">
            {/* Wave card */}
            <div className="rounded-lg border bg-card p-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      Wave {index + 1}
                    </Badge>
                    <h3 className="text-lg font-semibold">{wave.name}</h3>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {t('planning:visualizer.timeline.dateRange', {
                        start: startDate,
                        end: endDate
                      })}
                    </span>
                    <span className="text-xs">
                      {storyCount} {storyCount === 1 ? 'story' : 'stories'}
                    </span>
                  </div>
                </div>

                {/* Visual indicator */}
                <div className="flex h-12 w-24 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <span className="text-2xl font-bold">{storyCount}</span>
                </div>
              </div>
            </div>

            {/* Connecting line to next wave */}
            {index < waves.length - 1 && (
              <div className="ml-8 h-4 w-0.5 bg-border" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
