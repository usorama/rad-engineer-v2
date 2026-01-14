/**
 * Unit tests for ExecutionDashboard
 * Tests execution dashboard, wave display, and real-time updates
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ExecutionDashboard from '../ExecutionDashboard';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

// Mock window.api.execution
const mockGetWaveStatus = vi.fn();
const mockOnWaveProgress = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Setup window.api mock
  (window as unknown as { api: unknown }).api = {
    execution: {
      getWaveStatus: mockGetWaveStatus,
      onWaveProgress: mockOnWaveProgress
    }
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExecutionDashboard', () => {
  const mockSpecId = 'spec-001';

  describe('Component Rendering', () => {
    it('should render with tabs (Overview, Waves, Timeline)', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:tabs.overview')).toBeInTheDocument();
        expect(screen.getByText('execution:tabs.waves')).toBeInTheDocument();
        expect(screen.getByText('execution:tabs.timeline')).toBeInTheDocument();
      });
    });

    it('should default to Overview tab', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        const overviewTab = screen.getByText('execution:tabs.overview');
        expect(overviewTab.closest('[data-state="active"]')).toBeInTheDocument();
      });
    });
  });

  describe('Wave Status Fetching', () => {
    it('should fetch wave status on mount', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: {
          waves: [
            { id: 'wave-1', status: 'pending', agentCount: 3 }
          ],
          currentWave: null
        }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockGetWaveStatus).toHaveBeenCalledWith(mockSpecId);
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: false,
        error: 'Failed to fetch waves'
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:errors.fetchFailed')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching', () => {
      mockGetWaveStatus.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ExecutionDashboard specId={mockSpecId} />);

      expect(screen.getByText('common:labels.loading')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to wave progress updates on mount', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });
      mockOnWaveProgress.mockReturnValue(() => {}); // Cleanup function

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockOnWaveProgress).toHaveBeenCalledWith(
          mockSpecId,
          expect.any(Function)
        );
      });
    });

    it('should unsubscribe from updates on unmount', async () => {
      const unsubscribe = vi.fn();
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });
      mockOnWaveProgress.mockReturnValue(unsubscribe);

      const { unmount } = render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockOnWaveProgress).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should update wave status when progress event received', async () => {
      let progressCallback: ((wave: unknown) => void) | null = null;

      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: {
          waves: [
            { id: 'wave-1', status: 'pending', agentCount: 3, name: 'Wave 1' }
          ],
          currentWave: null
        }
      });

      mockOnWaveProgress.mockImplementation((_specId, callback) => {
        progressCallback = callback;
        return () => {};
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockOnWaveProgress).toHaveBeenCalled();
      });

      // Simulate progress update
      progressCallback?.({
        id: 'wave-1',
        status: 'running',
        agentCount: 3,
        name: 'Wave 1',
        progress: 50
      });

      await waitFor(() => {
        expect(screen.getByText('execution:status.running')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Switching', () => {
    it('should switch to Waves tab when clicked', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:tabs.waves')).toBeInTheDocument();
      });

      const wavesTab = screen.getByText('execution:tabs.waves');
      fireEvent.click(wavesTab);

      await waitFor(() => {
        expect(wavesTab.closest('[data-state="active"]')).toBeInTheDocument();
      });
    });

    it('should switch to Timeline tab when clicked', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:tabs.timeline')).toBeInTheDocument();
      });

      const timelineTab = screen.getByText('execution:tabs.timeline');
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(timelineTab.closest('[data-state="active"]')).toBeInTheDocument();
      });
    });
  });

  describe('WaveDashboard Integration', () => {
    it('should display waves in grid layout', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: {
          waves: [
            { id: 'wave-1', status: 'pending', agentCount: 3, name: 'Wave 1' },
            { id: 'wave-2', status: 'running', agentCount: 2, name: 'Wave 2' },
            { id: 'wave-3', status: 'completed', agentCount: 4, name: 'Wave 3' }
          ],
          currentWave: 'wave-2'
        }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('Wave 1')).toBeInTheDocument();
        expect(screen.getByText('Wave 2')).toBeInTheDocument();
        expect(screen.getByText('Wave 3')).toBeInTheDocument();
      });
    });

    it('should show empty state when no waves', async () => {
      mockGetWaveStatus.mockResolvedValue({
        success: true,
        data: { waves: [], currentWave: null }
      });

      render(<ExecutionDashboard specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:noWaves')).toBeInTheDocument();
      });
    });
  });
});
