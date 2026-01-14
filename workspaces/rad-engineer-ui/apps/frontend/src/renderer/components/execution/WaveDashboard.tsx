import React from 'react';
import WaveCard from './WaveCard';

interface Wave {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentCount: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
}

interface WaveDashboardProps {
  waves: Wave[];
  currentWave: string | null;
}

const WaveDashboard: React.FC<WaveDashboardProps> = ({ waves, currentWave }) => {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {waves.map((wave) => (
        <WaveCard
          key={wave.id}
          wave={wave}
          isCurrent={wave.id === currentWave}
        />
      ))}
    </div>
  );
};

export default WaveDashboard;
