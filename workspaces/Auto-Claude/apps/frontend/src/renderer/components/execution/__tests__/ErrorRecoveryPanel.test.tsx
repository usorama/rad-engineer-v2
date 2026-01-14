import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ErrorRecoveryPanel from '../ErrorRecoveryPanel';
import React from 'react';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'errorRecovery.title') return 'Error Recovery';
      if (key === 'errorRecovery.noErrors') return 'No errors to recover from';
      if (key === 'errorRecovery.errorMessage') return `Error: ${params?.message}`;
      if (key === 'errorRecovery.failedStep') return `Failed Step: ${params?.step}`;
      if (key === 'errorRecovery.availableCheckpoints') return 'Available Checkpoints';
      if (key === 'errorRecovery.actions.retryWave') return 'Retry Wave';
      if (key === 'errorRecovery.actions.retryTask') return 'Retry Task';
      if (key === 'errorRecovery.actions.restoreCheckpoint') return 'Restore Checkpoint';
      if (key === 'errorRecovery.confirm.retryWaveTitle') return 'Retry Wave?';
      if (key === 'errorRecovery.confirm.retryWaveMessage') return 'This will retry the entire wave.';
      if (key === 'errorRecovery.confirm.retryTaskTitle') return 'Retry Task?';
      if (key === 'errorRecovery.confirm.retryTaskMessage') return 'This will retry the failed task.';
      if (key === 'errorRecovery.confirm.restoreCheckpointTitle') return 'Restore Checkpoint?';
      if (key === 'errorRecovery.confirm.restoreCheckpointMessage') return 'This will restore to checkpoint.';
      if (key === 'errorRecovery.confirm.cancel') return 'Cancel';
      if (key === 'errorRecovery.confirm.confirm') return 'Confirm';
      if (key === 'errorRecovery.loading') return 'Loading...';
      if (key === 'errorRecovery.fetchFailed') return 'Failed to load error recovery status';
      return key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn()
    }
  })
}));

// Mock window.api.execution
const mockGetErrorRecoveryStatus = vi.fn();
const mockRetryWave = vi.fn();
const mockRetryTask = vi.fn();
const mockRestoreCheckpoint = vi.fn();

if (typeof window !== 'undefined') {
  (window as unknown as { api: { execution: unknown } }).api = {
    execution: {
      getErrorRecoveryStatus: mockGetErrorRecoveryStatus,
      retryWave: mockRetryWave,
      retryTask: mockRetryTask,
      restoreCheckpoint: mockRestoreCheckpoint
    }
  };
}

interface ErrorRecoveryStatus {
  hasError: boolean;
  errorMessage?: string;
  failedStep?: string;
  failedTaskId?: string;
  waveId?: string;
  checkpoints?: Array<{
    id: string;
    name: string;
    timestamp: string;
  }>;
}

describe('ErrorRecoveryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title', () => {
    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: { hasError: false }
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);
    expect(screen.getByText('Error Recovery')).toBeInTheDocument();
  });

  it('shows no errors message when no errors', async () => {
    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: { hasError: false }
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('No errors to recover from')).toBeInTheDocument();
    });
  });

  it('displays error message when error exists', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'TypeScript compilation failed',
      failedStep: 'quality-gate-typecheck',
      failedTaskId: 'task-1',
      waveId: 'wave-1'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Error: TypeScript compilation failed')).toBeInTheDocument();
      expect(screen.getByText('Failed Step: quality-gate-typecheck')).toBeInTheDocument();
    });
  });

  it('displays recovery action buttons when error exists', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Test failed',
      failedStep: 'test-execution',
      failedTaskId: 'task-1',
      waveId: 'wave-1'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Wave')).toBeInTheDocument();
      expect(screen.getByText('Retry Task')).toBeInTheDocument();
    });
  });

  it('displays available checkpoints', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Agent failed',
      failedStep: 'agent-execution',
      checkpoints: [
        { id: 'cp-1', name: 'Before Wave 1', timestamp: '2026-01-13T20:00:00Z' },
        { id: 'cp-2', name: 'After Agent Init', timestamp: '2026-01-13T20:05:00Z' }
      ]
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Available Checkpoints')).toBeInTheDocument();
      expect(screen.getByText('Before Wave 1')).toBeInTheDocument();
      expect(screen.getByText('After Agent Init')).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog when retrying wave', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Wave failed',
      waveId: 'wave-1',
      failedStep: 'wave-execution'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Wave')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry Wave'));

    await waitFor(() => {
      expect(screen.getByText('Retry Wave?')).toBeInTheDocument();
      expect(screen.getByText('This will retry the entire wave.')).toBeInTheDocument();
    });
  });

  it('calls retryWave API when confirmed', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Wave failed',
      waveId: 'wave-1',
      failedStep: 'wave-execution'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    mockRetryWave.mockResolvedValue({ success: true });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Wave')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry Wave'));

    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockRetryWave).toHaveBeenCalledWith('spec-1', 'wave-1');
    });
  });

  it('shows confirmation dialog when retrying task', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Task failed',
      failedTaskId: 'task-1',
      waveId: 'wave-1',
      failedStep: 'task-execution'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Task')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry Task'));

    await waitFor(() => {
      expect(screen.getByText('Retry Task?')).toBeInTheDocument();
      expect(screen.getByText('This will retry the failed task.')).toBeInTheDocument();
    });
  });

  it('calls retryTask API when confirmed', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Task failed',
      failedTaskId: 'task-1',
      waveId: 'wave-1',
      failedStep: 'task-execution'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    mockRetryTask.mockResolvedValue({ success: true });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Task')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry Task'));

    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockRetryTask).toHaveBeenCalledWith('spec-1', 'wave-1', 'task-1');
    });
  });

  it('calls restoreCheckpoint API when checkpoint selected', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Error',
      failedStep: 'execution',
      checkpoints: [
        { id: 'cp-1', name: 'Checkpoint 1', timestamp: '2026-01-13T20:00:00Z' }
      ]
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    mockRestoreCheckpoint.mockResolvedValue({ success: true });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    // Wait for checkpoint to be rendered
    await waitFor(() => {
      expect(screen.getByText('Checkpoint 1')).toBeInTheDocument();
    });

    // Click on the checkpoint to select it
    fireEvent.click(screen.getByText('Checkpoint 1'));

    // Now the Restore Checkpoint button should appear
    await waitFor(() => {
      expect(screen.getByText('Restore Checkpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Restore Checkpoint'));

    await waitFor(() => {
      expect(screen.getByText('Restore Checkpoint?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockRestoreCheckpoint).toHaveBeenCalledWith('spec-1', 'cp-1');
    });
  });

  it('shows loading state while fetching status', () => {
    mockGetErrorRecoveryStatus.mockImplementation(() => new Promise(() => {}));

    render(<ErrorRecoveryPanel specId="spec-1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: false,
      error: 'Network error'
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load error recovery status')).toBeInTheDocument();
    });
  });

  it('cancels confirmation dialog without calling API', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Wave failed',
      waveId: 'wave-1',
      failedStep: 'wave-execution'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Wave')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry Wave'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(mockRetryWave).not.toHaveBeenCalled();
    });
  });

  it('disables action buttons while recovery is in progress', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Wave failed',
      waveId: 'wave-1',
      failedStep: 'wave-execution'
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    mockRetryWave.mockImplementation(() => new Promise(() => {}));

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry Wave')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry Wave');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(retryButton).toBeDisabled();
    });
  });

  it('handles multiple checkpoints correctly', async () => {
    const mockStatus: ErrorRecoveryStatus = {
      hasError: true,
      errorMessage: 'Error',
      failedStep: 'execution',
      checkpoints: [
        { id: 'cp-1', name: 'Before Wave 1', timestamp: '2026-01-13T20:00:00Z' },
        { id: 'cp-2', name: 'After Wave 1', timestamp: '2026-01-13T20:05:00Z' },
        { id: 'cp-3', name: 'Before Wave 2', timestamp: '2026-01-13T20:10:00Z' }
      ]
    };

    mockGetErrorRecoveryStatus.mockResolvedValue({
      success: true,
      data: mockStatus
    });

    render(<ErrorRecoveryPanel specId="spec-1" />);

    await waitFor(() => {
      expect(screen.getByText('Before Wave 1')).toBeInTheDocument();
      expect(screen.getByText('After Wave 1')).toBeInTheDocument();
      expect(screen.getByText('Before Wave 2')).toBeInTheDocument();
    });
  });
});
