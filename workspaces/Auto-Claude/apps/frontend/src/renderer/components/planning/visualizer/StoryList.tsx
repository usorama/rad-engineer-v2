/**
 * StoryList Component
 * Table/card view showing all stories with wave and status information
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/badge';
import type { Story, Wave } from './types';

export interface StoryListProps {
  stories: Story[];
  waves: Wave[];
}

export function StoryList({ stories, waves }: StoryListProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  if (stories.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {t('planning:visualizer.list.noStories')}
      </div>
    );
  }

  // Create wave lookup map
  const waveMap = new Map(waves.map((w) => [w.id, w.name]));

  // Get status badge variant
  const getStatusVariant = (status: Story['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      case 'pending':
      default:
        return 'outline';
    }
  };

  // Get status label
  const getStatusLabel = (status: Story['status']): string => {
    return t(`planning:visualizer.list.status.${status}`, status);
  };

  return (
    <div className="space-y-4">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
        <div className="col-span-2">{t('planning:visualizer.list.columns.id')}</div>
        <div className="col-span-5">{t('planning:visualizer.list.columns.title')}</div>
        <div className="col-span-3">{t('planning:visualizer.list.columns.wave')}</div>
        <div className="col-span-2">{t('planning:visualizer.list.columns.status')}</div>
      </div>

      {/* Story rows */}
      <div className="space-y-2">
        {stories.map((story) => {
          const waveName = waveMap.get(story.waveId) || story.waveId;

          return (
            <div
              key={story.id}
              className="grid grid-cols-12 gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-sm"
            >
              <div className="col-span-2 flex items-center">
                <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{story.id}</code>
              </div>

              <div className="col-span-5 flex items-center">
                <div>
                  <div className="font-medium">{story.title}</div>
                  {story.description && (
                    <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {story.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-3 flex items-center">
                <Badge variant="outline" className="text-xs">
                  {waveName}
                </Badge>
              </div>

              <div className="col-span-2 flex items-center">
                <Badge variant={getStatusVariant(story.status)} className="text-xs">
                  {getStatusLabel(story.status)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
