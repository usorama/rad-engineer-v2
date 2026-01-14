import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import WaveDashboard from './WaveDashboard';

interface Wave {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentCount: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
}

interface WaveStatusData {
  waves: Wave[];
  currentWave: string | null;
}

interface ExecutionDashboardProps {
  specId: string;
}

const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({ specId }) => {
  const { t } = useTranslation(['execution', 'common']);
  const [waveData, setWaveData] = useState<WaveStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWaveStatus = async () => {
      try {
        setLoading(true);
        const result = await window.api.execution.getWaveStatus(specId);

        if (result.success) {
          setWaveData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch waves');
      } finally {
        setLoading(false);
      }
    };

    fetchWaveStatus();

    // Subscribe to real-time updates
    const unsubscribe = window.api.execution.onWaveProgress(specId, (updatedWave: Wave) => {
      setWaveData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          waves: prev.waves.map((w) =>
            w.id === updatedWave.id ? { ...w, ...updatedWave } : w
          ),
          currentWave: updatedWave.status === 'running' ? updatedWave.id : prev.currentWave
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, [specId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('common:labels.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{t('execution:errors.fetchFailed')}</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList>
        <TabsTrigger value="overview">{t('execution:tabs.overview')}</TabsTrigger>
        <TabsTrigger value="waves">{t('execution:tabs.waves')}</TabsTrigger>
        <TabsTrigger value="timeline">{t('execution:tabs.timeline')}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="space-y-4 p-4">
          <h3 className="text-lg font-semibold">{t('execution:overview.title')}</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{t('execution:overview.totalWaves')}</p>
              <p className="text-2xl font-bold">{waveData?.waves.length || 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{t('execution:overview.completedWaves')}</p>
              <p className="text-2xl font-bold">
                {waveData?.waves.filter((w) => w.status === 'completed').length || 0}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{t('execution:overview.currentWave')}</p>
              <p className="text-2xl font-bold">{waveData?.currentWave || '-'}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{t('execution:overview.totalAgents')}</p>
              <p className="text-2xl font-bold">
                {waveData?.waves.reduce((sum, w) => sum + w.agentCount, 0) || 0}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="waves">
        {waveData && waveData.waves.length > 0 ? (
          <WaveDashboard waves={waveData.waves} currentWave={waveData.currentWave} />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('execution:noWaves')}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="timeline">
        <div className="p-4">
          <p className="text-muted-foreground">Timeline view (coming soon)</p>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ExecutionDashboard;
