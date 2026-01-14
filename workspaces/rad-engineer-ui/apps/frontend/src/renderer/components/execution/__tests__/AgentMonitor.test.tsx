import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentMonitor from '../AgentMonitor';
import React from 'react';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn()
    }
  })
}));

// Mock window.electronAPI.execution
const mockGetAgentStatus = vi.fn();
const mockOnAgentProgress = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Setup window.electronAPI.execution mock
  (window as unknown as { electronAPI: { execution: unknown } }).electronAPI = {
    execution: {
      getAgentStatus: mockGetAgentStatus,
      onAgentProgress: mockOnAgentProgress
    }
  };
});

describe('AgentMonitor', () => {
  it('renders empty state when no agents are active', async () => {
    mockGetAgentStatus.mockResolvedValue({
      success: true,
      data: { agents: [] }
    });

    render(<AgentMonitor specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('execution:agentMonitor.noActiveAgents')).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching agent status', () => {
    mockGetAgentStatus.mockResolvedValue({
      success: true,
      data: { agents: [] }
    });

    render(<AgentMonitor specId="001" />);

    expect(screen.getByText('common:labels.loading')).toBeInTheDocument();
  });

  it('renders agent cards when agents are active', async () => {
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Planner Agent',
        status: 'running',
        cpuPercent: 15.5,
        memoryMB: 128,
        currentTask: 'Creating implementation plan',
        startedAt: '2026-01-13T20:00:00Z'
      },
      {
        id: 'agent-2',
        name: 'Coder Agent',
        status: 'running',
        cpuPercent: 22.3,
        memoryMB: 256,
        currentTask: 'Implementing feature',
        startedAt: '2026-01-13T20:01:00Z'
      }
    ];

    mockGetAgentStatus.mockResolvedValue({
      success: true,
      data: { agents: mockAgents }
    });

    render(<AgentMonitor specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('Planner Agent')).toBeInTheDocument();
      expect(screen.getByText('Coder Agent')).toBeInTheDocument();
    });
  });

  it('calls getAgentStatus with correct specId', async () => {
    mockGetAgentStatus.mockResolvedValue({
      success: true,
      data: { agents: [] }
    });

    render(<AgentMonitor specId="test-spec-123" />);

    await waitFor(() => {
      expect(mockGetAgentStatus).toHaveBeenCalledWith('test-spec-123');
    });
  });

  it('subscribes to real-time agent progress updates', async () => {
    const mockUnsubscribe = vi.fn();
    mockOnAgentProgress.mockReturnValue(mockUnsubscribe);
    mockGetAgentStatus.mockResolvedValue({
      success: true,
      data: { agents: [] }
    });

    const { unmount } = render(<AgentMonitor specId="001" />);

    await waitFor(() => {
      expect(mockOnAgentProgress).toHaveBeenCalledWith('001', expect.any(Function));
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('displays error message when API call fails', async () => {
    mockGetAgentStatus.mockResolvedValue({
      success: false,
      error: { message: 'Failed to fetch agent status' }
    });

    render(<AgentMonitor specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('execution:errors.agentStatusFailed')).toBeInTheDocument();
    });
  });

  it('updates agent status on real-time progress event', async () => {
    const initialAgents = [
      {
        id: 'agent-1',
        name: 'Planner Agent',
        status: 'running',
        cpuPercent: 15.5,
        memoryMB: 128,
        currentTask: 'Creating plan',
        startedAt: '2026-01-13T20:00:00Z'
      }
    ];

    mockGetAgentStatus.mockResolvedValue({
      success: true,
      data: { agents: initialAgents }
    });

    let progressCallback: ((agent: unknown) => void) | null = null;
    mockOnAgentProgress.mockImplementation((_specId: string, callback: (agent: unknown) => void) => {
      progressCallback = callback;
      return vi.fn();
    });

    render(<AgentMonitor specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('Creating plan')).toBeInTheDocument();
    });

    // Simulate progress update
    const updatedAgent = {
      id: 'agent-1',
      name: 'Planner Agent',
      status: 'running',
      cpuPercent: 25.8,
      memoryMB: 156,
      currentTask: 'Finalizing plan',
      startedAt: '2026-01-13T20:00:00Z'
    };

    if (progressCallback) {
      progressCallback(updatedAgent);
    }

    await waitFor(() => {
      expect(screen.getByText('Finalizing plan')).toBeInTheDocument();
      expect(screen.getByText(/25\.8%/)).toBeInTheDocument();
    });
  });
});
