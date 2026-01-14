/**
 * PlanVisualizer Component
 * Tabbed container for visualizing plan data (Graph/Timeline/List views)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { DependencyGraph } from './DependencyGraph';
import { WaveTimeline } from './WaveTimeline';
import { StoryList } from './StoryList';
import type { PlanData } from './types';

export interface PlanVisualizerProps {
  planData?: PlanData;
}

export function PlanVisualizer({ planData }: PlanVisualizerProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  // Empty state when no plan data
  if (!planData || (planData.waves.length === 0 && planData.stories.length === 0)) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CardTitle className="mb-2">{t('planning:visualizer.empty.title')}</CardTitle>
          <CardDescription>{t('planning:visualizer.empty.description')}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="graph" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="graph">{t('planning:visualizer.tabs.graph')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('planning:visualizer.tabs.timeline')}</TabsTrigger>
          <TabsTrigger value="list">{t('planning:visualizer.tabs.list')}</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('planning:visualizer.graph.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DependencyGraph stories={planData.stories} dependencies={planData.dependencies} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('planning:visualizer.timeline.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <WaveTimeline waves={planData.waves} stories={planData.stories} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('planning:visualizer.list.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StoryList stories={planData.stories} waves={planData.waves} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
