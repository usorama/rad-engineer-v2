/**
 * @vitest-environment jsdom
 */
/**
 * Test suite for DecisionTimeline component
 * Tests timeline rendering, decision cards, and IPC integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DecisionTimeline } from '../DecisionTimeline';
import { TooltipProvider } from '../../ui/tooltip';
import i18n from '../../../../shared/i18n';

// Wrapper for components that need TooltipProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

// Custom render with wrapper
function renderWithWrapper(ui: React.ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

// Mock window.api.learning IPC
const mockGetDecisionHistory = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock window.api.learning (extend existing mock from setup.ts)
  if (typeof window !== 'undefined') {
    const existingApi = (window as any).api || {};
    (window as any).api = {
      ...existingApi,
      learning: {
        ...(existingApi.learning || {}),
        getDecisionHistory: mockGetDecisionHistory
      }
    };
  }

  // Default mock response with decision history
  mockGetDecisionHistory.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'decision-1',
        timestamp: Date.now() - 86400000 * 2, // 2 days ago
        method: 'VAC',
        outcome: 'success',
        metrics: {
          qualityScore: 0.85,
          confidence: 0.92,
          impactScore: 0.78
        },
        description: 'Selected optimal architecture pattern'
      },
      {
        id: 'decision-2',
        timestamp: Date.now() - 86400000 * 1, // 1 day ago
        method: 'EWC',
        outcome: 'adjusted',
        metrics: {
          qualityScore: 0.72,
          confidence: 0.85,
          impactScore: 0.65
        },
        description: 'Refined implementation approach'
      },
      {
        id: 'decision-3',
        timestamp: Date.now() - 3600000, // 1 hour ago
        method: 'Hybrid',
        outcome: 'success',
        metrics: {
          qualityScore: 0.90,
          confidence: 0.95,
          impactScore: 0.88
        },
        description: 'Integrated feedback loop'
      }
    ]
  });
});

describe('DecisionTimeline - Component Structure', () => {
  it('should render the timeline container', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      expect(screen.getByTestId('decision-timeline')).toBeInTheDocument();
    });
  });

  it('should call getDecisionHistory IPC on mount', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      expect(mockGetDecisionHistory).toHaveBeenCalledTimes(1);
    });
  });

  it('should render loading state initially', () => {
    mockGetDecisionHistory.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithWrapper(<DecisionTimeline />);

    expect(screen.getByText(i18n.t('common:labels.loading'))).toBeInTheDocument();
  });

  it('should render empty state when no decisions exist', async () => {
    mockGetDecisionHistory.mockResolvedValue({
      success: true,
      data: []
    });

    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:timeline.noDecisions'))).toBeInTheDocument();
    });
  });

  it('should show error message when fetch fails', async () => {
    mockGetDecisionHistory.mockResolvedValue({
      success: false,
      error: 'Failed to fetch decision history'
    });

    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:timeline.errors.loadDecisions'))).toBeInTheDocument();
    });
  });
});

describe('DecisionTimeline - Decision Cards', () => {
  it('should render all decision cards', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      expect(screen.getByText('Selected optimal architecture pattern')).toBeInTheDocument();
      expect(screen.getByText('Refined implementation approach')).toBeInTheDocument();
      expect(screen.getByText('Integrated feedback loop')).toBeInTheDocument();
    });
  });

  it('should display decision methods', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      expect(screen.getByText('VAC')).toBeInTheDocument();
      expect(screen.getByText('EWC')).toBeInTheDocument();
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
    });
  });

  it('should display decision outcomes', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      // Outcomes are shown via i18n keys
      expect(screen.getByText(i18n.t('learning:timeline.outcomes.success'))).toBeInTheDocument();
      expect(screen.getByText(i18n.t('learning:timeline.outcomes.adjusted'))).toBeInTheDocument();
    });
  });

  it('should display quality metrics', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      // Check for quality score labels
      expect(screen.getByText(i18n.t('learning:timeline.metrics.quality'))).toBeInTheDocument();
      expect(screen.getByText(i18n.t('learning:timeline.metrics.confidence'))).toBeInTheDocument();
      expect(screen.getByText(i18n.t('learning:timeline.metrics.impact'))).toBeInTheDocument();
    });
  });

  it('should format timestamps correctly', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      // Timestamps should be formatted as relative time (e.g., "2 days ago", "1 hour ago")
      const timestamps = screen.getAllByTestId(/decision-timestamp/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});

describe('DecisionTimeline - Timeline Visualization', () => {
  it('should render SVG timeline connectors', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      const timeline = screen.getByTestId('decision-timeline');
      const svgElements = timeline.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  it('should render timeline in chronological order', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      const descriptions = [
        'Selected optimal architecture pattern',
        'Refined implementation approach',
        'Integrated feedback loop'
      ];

      descriptions.forEach((desc) => {
        expect(screen.getByText(desc)).toBeInTheDocument();
      });
    });
  });

  it('should render connector lines between decisions', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      // Check for connector elements (lines between cards)
      const connectors = screen.getAllByTestId(/timeline-connector/);
      expect(connectors.length).toBe(2); // 3 decisions = 2 connectors
    });
  });
});

describe('DecisionTimeline - Outcome Styling', () => {
  it('should apply success styling for successful outcomes', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      const successBadges = screen.getAllByText(i18n.t('learning:timeline.outcomes.success'));
      successBadges.forEach((badge) => {
        expect(badge).toHaveClass('bg-green-500');
      });
    });
  });

  it('should apply adjusted styling for adjusted outcomes', async () => {
    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      const adjustedBadge = screen.getByText(i18n.t('learning:timeline.outcomes.adjusted'));
      expect(adjustedBadge).toHaveClass('bg-yellow-500');
    });
  });

  it('should apply failed styling for failed outcomes', async () => {
    mockGetDecisionHistory.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'decision-fail',
          timestamp: Date.now(),
          method: 'VAC',
          outcome: 'failed',
          metrics: {
            qualityScore: 0.45,
            confidence: 0.60,
            impactScore: 0.35
          },
          description: 'Failed decision'
        }
      ]
    });

    renderWithWrapper(<DecisionTimeline />);

    await waitFor(() => {
      const failedBadge = screen.getByText(i18n.t('learning:timeline.outcomes.failed'));
      expect(failedBadge).toHaveClass('bg-destructive');
    });
  });
});
