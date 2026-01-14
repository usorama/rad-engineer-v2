import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StateMachineVisualizer from '../StateMachineVisualizer';
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
const mockGetStateMachineStatus = vi.fn();
const mockOnStateChanged = vi.fn();

// Set up window mock before all tests
beforeAll(() => {
  // @ts-expect-error - Mocking window.electronAPI for tests
  global.window = global.window || {};
  // @ts-expect-error - Mocking window.electronAPI for tests
  global.window.electronAPI = global.window.electronAPI || {};
});

beforeEach(() => {
  vi.clearAllMocks();

  // Setup window.electronAPI.execution mock
  // Default mock for onStateChanged returns an unsubscribe function
  mockOnStateChanged.mockReturnValue(vi.fn());

  // @ts-expect-error - Mocking window.electronAPI for tests
  global.window.electronAPI.execution = {
    getStateMachineStatus: mockGetStateMachineStatus,
    onStateChanged: mockOnStateChanged
  };
});

describe('StateMachineVisualizer', () => {
  it('renders loading state while fetching state machine status', () => {
    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: [], currentState: null }
    });

    render(<StateMachineVisualizer specId="001" />);

    expect(screen.getByText('common:labels.loading')).toBeInTheDocument();
  });

  it('renders state machine diagram when states are loaded', async () => {
    const mockStates = [
      {
        id: 'pending',
        name: 'Pending',
        status: 'completed',
        transitions: ['running']
      },
      {
        id: 'running',
        name: 'Running',
        status: 'active',
        transitions: ['completed', 'failed']
      },
      {
        id: 'completed',
        name: 'Completed',
        status: 'pending',
        transitions: []
      },
      {
        id: 'failed',
        name: 'Failed',
        status: 'pending',
        transitions: []
      }
    ];

    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: mockStates, currentState: 'running' }
    });

    render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('highlights the current state', async () => {
    const mockStates = [
      {
        id: 'pending',
        name: 'Pending',
        status: 'completed',
        transitions: ['running']
      },
      {
        id: 'running',
        name: 'Running',
        status: 'active',
        transitions: ['completed']
      }
    ];

    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: mockStates, currentState: 'running' }
    });

    render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      const runningStateNode = screen.getByText('Running').closest('g');
      expect(runningStateNode).toHaveAttribute('data-status', 'active');
    });
  });

  it('calls getStateMachineStatus with correct specId', async () => {
    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: [], currentState: null }
    });

    render(<StateMachineVisualizer specId="test-spec-456" />);

    await waitFor(() => {
      expect(mockGetStateMachineStatus).toHaveBeenCalledWith('test-spec-456');
    });
  });

  it('subscribes to real-time state change updates', async () => {
    const mockUnsubscribe = vi.fn();
    mockOnStateChanged.mockReturnValue(mockUnsubscribe);
    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: [], currentState: null }
    });

    const { unmount } = render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      expect(mockOnStateChanged).toHaveBeenCalledWith('001', expect.any(Function));
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('displays error message when API call fails', async () => {
    mockGetStateMachineStatus.mockResolvedValue({
      success: false,
      error: 'Failed to fetch state machine status'
    });

    render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('execution:errors.stateMachineFailed')).toBeInTheDocument();
    });
  });

  it('updates state on real-time state change event', async () => {
    const initialStates = [
      {
        id: 'pending',
        name: 'Pending',
        status: 'completed',
        transitions: ['running']
      },
      {
        id: 'running',
        name: 'Running',
        status: 'active',
        transitions: ['completed']
      },
      {
        id: 'completed',
        name: 'Completed',
        status: 'pending',
        transitions: []
      }
    ];

    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: initialStates, currentState: 'running' }
    });

    let stateChangeCallback: ((stateChange: unknown) => void) | null = null;
    mockOnStateChanged.mockImplementation((_specId: string, callback: (stateChange: unknown) => void) => {
      stateChangeCallback = callback;
      return vi.fn();
    });

    render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Simulate state change to completed
    const stateChange = {
      fromState: 'running',
      toState: 'completed',
      timestamp: '2026-01-13T21:00:00Z'
    };

    if (stateChangeCallback) {
      stateChangeCallback(stateChange);
    }

    await waitFor(() => {
      const completedStateNode = screen.getByText('Completed').closest('g');
      expect(completedStateNode).toHaveAttribute('data-status', 'active');
    });
  });

  it('renders SVG with proper structure', async () => {
    const mockStates = [
      {
        id: 'pending',
        name: 'Pending',
        status: 'completed',
        transitions: ['running']
      }
    ];

    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: mockStates, currentState: 'pending' }
    });

    const { container } = render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox');
    });
  });

  it('renders empty state when no states are available', async () => {
    mockGetStateMachineStatus.mockResolvedValue({
      success: true,
      data: { states: [], currentState: null }
    });

    render(<StateMachineVisualizer specId="001" />);

    await waitFor(() => {
      expect(screen.getByText('execution:stateMachine.noStates')).toBeInTheDocument();
    });
  });
});
