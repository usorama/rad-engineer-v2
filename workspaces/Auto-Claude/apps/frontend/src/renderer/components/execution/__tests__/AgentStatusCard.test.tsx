import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentStatusCard from '../AgentStatusCard';
import React from 'react';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'execution:agentMonitor.cpuUsage') return `CPU: ${params?.percent}%`;
      if (key === 'execution:agentMonitor.memoryUsage') return `Memory: ${params?.mb}MB`;
      if (key === 'execution:agentMonitor.elapsed') return `Elapsed: ${params?.time}`;
      return key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn()
    }
  })
}));

interface Agent {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  cpuPercent: number;
  memoryMB: number;
  currentTask: string;
  startedAt: string;
}

describe('AgentStatusCard', () => {
  const mockAgent: Agent = {
    id: 'agent-1',
    name: 'Planner Agent',
    status: 'running',
    cpuPercent: 15.5,
    memoryMB: 128,
    currentTask: 'Creating implementation plan',
    startedAt: '2026-01-13T20:00:00Z'
  };

  it('renders agent name', () => {
    render(<AgentStatusCard agent={mockAgent} />);
    expect(screen.getByText('Planner Agent')).toBeInTheDocument();
  });

  it('displays agent status badge', () => {
    render(<AgentStatusCard agent={mockAgent} />);
    expect(screen.getByText('execution:status.running')).toBeInTheDocument();
  });

  it('shows CPU usage percentage', () => {
    render(<AgentStatusCard agent={mockAgent} />);
    expect(screen.getByText('CPU: 15.5%')).toBeInTheDocument();
  });

  it('shows memory usage in MB', () => {
    render(<AgentStatusCard agent={mockAgent} />);
    expect(screen.getByText('Memory: 128MB')).toBeInTheDocument();
  });

  it('displays current task', () => {
    render(<AgentStatusCard agent={mockAgent} />);
    expect(screen.getByText('Creating implementation plan')).toBeInTheDocument();
  });

  it('calculates and displays elapsed time', () => {
    render(<AgentStatusCard agent={mockAgent} />);
    expect(screen.getByText(/Elapsed:/)).toBeInTheDocument();
  });

  it('applies correct status styling for running agent', () => {
    const { container } = render(<AgentStatusCard agent={mockAgent} />);
    const badge = container.querySelector('.bg-blue-500');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct status styling for completed agent', () => {
    const completedAgent: Agent = { ...mockAgent, status: 'completed' };
    const { container } = render(<AgentStatusCard agent={completedAgent} />);
    const badge = container.querySelector('.bg-green-500');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct status styling for failed agent', () => {
    const failedAgent: Agent = { ...mockAgent, status: 'failed' };
    const { container } = render(<AgentStatusCard agent={failedAgent} />);
    const badge = container.querySelector('.bg-destructive');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct status styling for idle agent', () => {
    const idleAgent: Agent = { ...mockAgent, status: 'idle' };
    const { container } = render(<AgentStatusCard agent={idleAgent} />);
    const badge = container.querySelector('.bg-muted');
    expect(badge).toBeInTheDocument();
  });

  it('formats CPU percentage with one decimal place', () => {
    const agentWithPreciseCPU: Agent = { ...mockAgent, cpuPercent: 22.345678 };
    render(<AgentStatusCard agent={agentWithPreciseCPU} />);
    expect(screen.getByText('CPU: 22.3%')).toBeInTheDocument();
  });

  it('displays zero values correctly', () => {
    const idleAgent: Agent = {
      ...mockAgent,
      status: 'idle',
      cpuPercent: 0,
      memoryMB: 0
    };
    render(<AgentStatusCard agent={idleAgent} />);
    expect(screen.getByText('CPU: 0%')).toBeInTheDocument();
    expect(screen.getByText('Memory: 0MB')).toBeInTheDocument();
  });

  it('handles empty current task', () => {
    const agentNoTask: Agent = { ...mockAgent, currentTask: '' };
    render(<AgentStatusCard agent={agentNoTask} />);
    expect(screen.getByText('execution:agentMonitor.noTask')).toBeInTheDocument();
  });

  it('displays progress indicator for running agent', () => {
    const { container } = render(<AgentStatusCard agent={mockAgent} />);
    const progressIndicator = container.querySelector('.animate-pulse');
    expect(progressIndicator).toBeInTheDocument();
  });

  it('does not display progress indicator for completed agent', () => {
    const completedAgent: Agent = { ...mockAgent, status: 'completed' };
    const { container } = render(<AgentStatusCard agent={completedAgent} />);
    const progressIndicator = container.querySelector('.animate-pulse');
    expect(progressIndicator).not.toBeInTheDocument();
  });
});
