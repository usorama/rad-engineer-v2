/**
 * LearningDashboard - Container for learning analytics
 *
 * Displays quality trends, learning patterns, and timeline
 * with tabbed navigation between different views
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { QualityTrendsChart } from './QualityTrendsChart';
import { EWCCurvesChart } from './EWCCurvesChart';

export function LearningDashboard() {
  const { t } = useTranslation(['learning', 'common']);
  const [activeTab, setActiveTab] = useState('trends');

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('learning:dashboard.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('learning:dashboard.subtitle')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList>
          <TabsTrigger value="trends">
            {t('learning:dashboard.tabs.trends')}
          </TabsTrigger>
          <TabsTrigger value="patterns">
            {t('learning:dashboard.tabs.patterns')}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            {t('learning:dashboard.tabs.timeline')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('learning:dashboard.tabs.trends')}</CardTitle>
              <CardDescription>
                {t('learning:charts.qualityScore')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QualityTrendsChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('learning:dashboard.tabs.patterns')}</CardTitle>
              <CardDescription>
                {t('learning:charts.knowledgeConsolidation')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EWCCurvesChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('learning:dashboard.tabs.timeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('learning:dashboard.errors.noData')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
