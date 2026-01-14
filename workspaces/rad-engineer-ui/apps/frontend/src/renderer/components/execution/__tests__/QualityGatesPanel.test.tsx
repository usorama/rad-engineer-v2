/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for QualityGatesPanel
 * Tests quality gate display, status updates, and real-time notifications
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QualityGatesPanel from '../QualityGatesPanel';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

// Mock window.api.execution
const mockGetQualityGates = vi.fn();
const mockOnQualityGateResult = vi.fn();

// Setup global window mock
if (typeof window === 'undefined') {
  (global as unknown as { window: unknown }).window = {};
}

beforeEach(() => {
  vi.clearAllMocks();

  // Setup window.api mock
  (window as unknown as { api: unknown }).api = {
    execution: {
      getQualityGates: mockGetQualityGates,
      onQualityGateResult: mockOnQualityGateResult
    }
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QualityGatesPanel', () => {
  const mockSpecId = 'spec-001';

  describe('Component Rendering', () => {
    it('should render quality gates panel with title', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: []
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.title')).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching', () => {
      mockGetQualityGates.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<QualityGatesPanel specId={mockSpecId} />);

      expect(screen.getByText('common:labels.loading')).toBeInTheDocument();
    });

    it('should handle fetch errors gracefully', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: false,
        error: 'Failed to fetch quality gates'
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.errors.fetchFailed')).toBeInTheDocument();
      });
    });
  });

  describe('Quality Gate Display', () => {
    it('should display typecheck gate', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          {
            type: 'typecheck',
            status: 'passed',
            duration: 1200,
            output: 'No type errors found'
          }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.types.typecheck')).toBeInTheDocument();
        expect(screen.getByText('execution:qualityGates.status.passed')).toBeInTheDocument();
      });
    });

    it('should display lint gate', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          {
            type: 'lint',
            status: 'passed',
            duration: 800,
            output: 'All files passed linting'
          }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.types.lint')).toBeInTheDocument();
        expect(screen.getByText('execution:qualityGates.status.passed')).toBeInTheDocument();
      });
    });

    it('should display multiple quality gates', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          { type: 'typecheck', status: 'passed', duration: 1200 },
          { type: 'lint', status: 'passed', duration: 800 }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.types.typecheck')).toBeInTheDocument();
        expect(screen.getByText('execution:qualityGates.types.lint')).toBeInTheDocument();
      });
    });

    it('should display failed gate with error message', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          {
            type: 'typecheck',
            status: 'failed',
            duration: 1500,
            output: 'Type error in src/utils.ts:42'
          }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.status.failed')).toBeInTheDocument();
        expect(screen.getByText('Type error in src/utils.ts:42')).toBeInTheDocument();
      });
    });

    it('should display running gate', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          {
            type: 'lint',
            status: 'running',
            duration: 0
          }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.status.running')).toBeInTheDocument();
      });
    });

    it('should display duration for completed gates', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          {
            type: 'typecheck',
            status: 'passed',
            duration: 1234
          }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.duration')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to quality gate results on mount', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: []
      });
      mockOnQualityGateResult.mockReturnValue(() => {}); // Cleanup function

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockOnQualityGateResult).toHaveBeenCalledWith(
          mockSpecId,
          expect.any(Function)
        );
      });
    });

    it('should unsubscribe from updates on unmount', async () => {
      const unsubscribe = vi.fn();
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: []
      });
      mockOnQualityGateResult.mockReturnValue(unsubscribe);

      const { unmount } = render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockOnQualityGateResult).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should update gate status when result event received', async () => {
      let resultCallback: ((result: unknown) => void) | null = null;

      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          { type: 'typecheck', status: 'running', duration: 0 }
        ]
      });

      mockOnQualityGateResult.mockImplementation((_specId, callback) => {
        resultCallback = callback;
        return () => {};
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(mockOnQualityGateResult).toHaveBeenCalled();
      });

      // Simulate result update
      resultCallback?.({
        type: 'typecheck',
        status: 'passed',
        duration: 1200,
        output: 'No type errors found'
      });

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.status.passed')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no quality gates', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: []
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.noGates')).toBeInTheDocument();
      });
    });
  });

  describe('Status Indicators', () => {
    it('should show success badge for passed gates', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          { type: 'typecheck', status: 'passed', duration: 1200 }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        const badge = screen.getByText('execution:qualityGates.status.passed');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show error badge for failed gates', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          { type: 'lint', status: 'failed', duration: 800, output: 'Linting errors found' }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        const badge = screen.getByText('execution:qualityGates.status.failed');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show running indicator for in-progress gates', async () => {
      mockGetQualityGates.mockResolvedValue({
        success: true,
        data: [
          { type: 'typecheck', status: 'running', duration: 0 }
        ]
      });

      render(<QualityGatesPanel specId={mockSpecId} />);

      await waitFor(() => {
        expect(screen.getByText('execution:qualityGates.status.running')).toBeInTheDocument();
      });
    });
  });
});
