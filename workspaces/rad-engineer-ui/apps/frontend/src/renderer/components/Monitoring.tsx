/**
 * Monitoring - Embedded Grafana and Prometheus dashboards
 *
 * Provides real-time system metrics visualization:
 * - Grafana dashboards (port 3001) - Primary visualization
 * - Prometheus metrics (port 9091) - Raw metrics access
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Gauge,
  BarChart3,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MonitoringProps {
  grafanaUrl?: string;
  prometheusUrl?: string;
}

interface ServiceStatus {
  available: boolean;
  loading: boolean;
  error: string | null;
}

const DEFAULT_GRAFANA_URL = 'http://localhost:3001';
const DEFAULT_PROMETHEUS_URL = 'http://localhost:9091';

export function Monitoring({
  grafanaUrl = DEFAULT_GRAFANA_URL,
  prometheusUrl = DEFAULT_PROMETHEUS_URL
}: MonitoringProps) {
  const { t } = useTranslation(['common']);
  const [activeTab, setActiveTab] = useState<'grafana' | 'prometheus'>('grafana');
  const [grafanaStatus, setGrafanaStatus] = useState<ServiceStatus>({
    available: false,
    loading: true,
    error: null
  });
  const [prometheusStatus, setPrometheusStatus] = useState<ServiceStatus>({
    available: false,
    loading: true,
    error: null
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Check service availability
  const checkService = useCallback(async (url: string, serviceName: string): Promise<ServiceStatus> => {
    try {
      // Use a simple fetch with no-cors mode to check if service is reachable
      // Note: We can't read the response due to CORS, but we can detect if the request fails
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return { available: true, loading: false, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      return {
        available: false,
        loading: false,
        error: `${serviceName} is not reachable at ${url}. ${errorMessage}`
      };
    }
  }, []);

  // Check both services on mount and refresh
  useEffect(() => {
    const checkServices = async () => {
      setGrafanaStatus(prev => ({ ...prev, loading: true }));
      setPrometheusStatus(prev => ({ ...prev, loading: true }));

      const [grafana, prometheus] = await Promise.all([
        checkService(grafanaUrl, 'Grafana'),
        checkService(prometheusUrl, 'Prometheus')
      ]);

      setGrafanaStatus(grafana);
      setPrometheusStatus(prometheus);
    };

    checkServices();
  }, [grafanaUrl, prometheusUrl, checkService, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenExternal = (url: string) => {
    window.open(url, '_blank');
  };

  const renderStatusBadge = (status: ServiceStatus, serviceName: string) => {
    if (status.loading) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking...
        </span>
      );
    }

    if (status.available) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        Unavailable
      </span>
    );
  };

  const renderServiceFrame = (
    url: string,
    status: ServiceStatus,
    serviceName: string,
    icon: React.ReactNode
  ) => {
    if (status.loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Connecting to {serviceName}...</p>
          </div>
        </div>
      );
    }

    if (!status.available || status.error) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <Card className="max-w-md border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {serviceName} Unavailable
              </CardTitle>
              <CardDescription>
                {status.error || `Cannot connect to ${serviceName}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">To start the monitoring services:</p>
                <code className="block rounded bg-muted p-2 text-xs">
                  cd rad-engineer-v2 && docker compose up -d
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Expected URLs:
                  <br />
                  - Grafana: {DEFAULT_GRAFANA_URL}
                  <br />
                  - Prometheus: {DEFAULT_PROMETHEUS_URL}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <iframe
        key={refreshKey}
        src={url}
        className="h-full w-full border-0"
        title={serviceName}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Gauge className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              System metrics and performance dashboards
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={grafanaStatus.loading || prometheusStatus.loading}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              (grafanaStatus.loading || prometheusStatus.loading) && "animate-spin"
            )} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenExternal(activeTab === 'grafana' ? grafanaUrl : prometheusUrl)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open External
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'grafana' | 'prometheus')}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="grafana" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Grafana
              {renderStatusBadge(grafanaStatus, 'Grafana')}
            </TabsTrigger>
            <TabsTrigger value="prometheus" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Prometheus
              {renderStatusBadge(prometheusStatus, 'Prometheus')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grafana" className="flex-1 m-0 data-[state=active]:flex">
          <div className="flex-1">
            {renderServiceFrame(
              grafanaUrl,
              grafanaStatus,
              'Grafana',
              <BarChart3 className="h-4 w-4" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="prometheus" className="flex-1 m-0 data-[state=active]:flex">
          <div className="flex-1">
            {renderServiceFrame(
              prometheusUrl,
              prometheusStatus,
              'Prometheus',
              <Gauge className="h-4 w-4" />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Monitoring;
