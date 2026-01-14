import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgentStatusCard, { Agent } from './AgentStatusCard';

interface AgentMonitorProps {
  specId: string;
}

const AgentMonitor: React.FC<AgentMonitorProps> = ({ specId }) => {
  const { t } = useTranslation(['execution', 'common']);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await window.electronAPI.execution.getAgentStatus(specId);

        if (result.success && result.data) {
          setAgents(result.data.agents);
        } else {
          setError(result.error?.message || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAgentStatus();

    // Subscribe to real-time updates
    const unsubscribe = window.electronAPI.execution.onAgentProgress(specId, (updatedAgent) => {
      setAgents((prevAgents) => {
        const agentIndex = prevAgents.findIndex((a) => a.id === updatedAgent.id);

        if (agentIndex >= 0) {
          // Update existing agent
          const newAgents = [...prevAgents];
          newAgents[agentIndex] = updatedAgent as Agent;
          return newAgents;
        } else {
          // Add new agent
          return [...prevAgents, updatedAgent as Agent];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [specId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t('common:labels.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">{t('execution:errors.agentStatusFailed')}</div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t('execution:agentMonitor.noActiveAgents')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('execution:agentMonitor.title')}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
};

export default AgentMonitor;
