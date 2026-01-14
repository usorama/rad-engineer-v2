/**
 * ResearchDashboard Component
 * Main container showing research progress with agent status and findings
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { ResearchAgentCard, type ResearchAgent } from './ResearchAgentCard';
import { ResearchFindings, type ResearchFinding } from './ResearchFindings';

export interface ResearchDashboardProps {
  specId: string;
}

interface _ResearchStatusData {
  agents: ResearchAgent[];
}

interface ResearchFindingsData {
  [agentId: string]: ResearchFinding[];
}

export function ResearchDashboard({ specId }: ResearchDashboardProps): React.ReactElement {
  const { t } = useTranslation('planning');

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<ResearchAgent[]>([]);
  const [findings, setFindings] = useState<ResearchFindingsData>({});

  // Load research status
  useEffect(() => {
    async function loadResearchStatus() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await window.api.planning.getResearchStatus(specId);

        if (!result.success) {
          setError(result.error || t('planning:research.error'));
          return;
        }

        setAgents(result.data.agents);
      } catch (err) {
        setError(t('planning:research.error'));
        console.error('Failed to load research status:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadResearchStatus();
  }, [specId, t]);

  // Load findings for completed agents
  useEffect(() => {
    async function loadFindings() {
      const completedAgents = agents.filter(agent => agent.status === 'completed');

      if (completedAgents.length === 0) {
        return;
      }

      try {
        const result = await window.api.planning.getResearchFindings(specId);

        if (result.success) {
          setFindings(result.data);
        }
      } catch (err) {
        console.error('Failed to load research findings:', err);
      }
    }

    if (agents.length > 0) {
      loadFindings();
    }
  }, [specId, agents]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = window.api.planning.onResearchAgentUpdate((updatedAgent: ResearchAgent) => {
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === updatedAgent.id ? updatedAgent : agent
        )
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">
            {t('planning:research.loading')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Render no agents state
  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">
            {t('planning:research.noAgents')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('planning:research.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <ResearchAgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show findings for completed agents */}
      {Object.keys(findings).length > 0 && (
        <div className="space-y-4">
          {Object.entries(findings).map(([agentId, agentFindings]) => {
            const agent = agents.find(a => a.id === agentId);
            return (
              <ResearchFindings
                key={agentId}
                findings={agentFindings}
                agentName={agent?.name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
