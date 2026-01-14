/**
 * @vitest-environment jsdom
 */
/**
 * Test suite for LearningDashboard component
 * Tests tabs navigation, chart rendering, and IPC integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearningDashboard } from '../LearningDashboard';
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
const mockGetQualityTrends = vi.fn();
const mockGetEWCCurves = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock window.api.learning (extend existing mock from setup.ts)
  if (typeof window !== 'undefined') {
    const existingApi = (window as any).api || {};
    (window as any).api = {
      ...existingApi,
      learning: {
        getQualityTrends: mockGetQualityTrends,
        getEWCCurves: mockGetEWCCurves
      }
    };
  }

  // Default mock responses
  mockGetQualityTrends.mockResolvedValue({
    success: true,
    data: [
      { timestamp: Date.now() - 86400000 * 7, qualityScore: 0.65 },
      { timestamp: Date.now() - 86400000 * 6, qualityScore: 0.70 },
      { timestamp: Date.now() - 86400000 * 5, qualityScore: 0.72 },
      { timestamp: Date.now() - 86400000 * 4, qualityScore: 0.75 },
      { timestamp: Date.now() - 86400000 * 3, qualityScore: 0.78 },
      { timestamp: Date.now() - 86400000 * 2, qualityScore: 0.80 },
      { timestamp: Date.now() - 86400000 * 1, qualityScore: 0.82 }
    ]
  });

  mockGetEWCCurves.mockResolvedValue({
    success: true,
    data: {
      shortTerm: [
        { timestamp: Date.now() - 86400000 * 7, value: 0.60 },
        { timestamp: Date.now() - 86400000 * 6, value: 0.65 },
        { timestamp: Date.now() - 86400000 * 5, value: 0.68 }
      ],
      mediumTerm: [
        { timestamp: Date.now() - 86400000 * 7, value: 0.55 },
        { timestamp: Date.now() - 86400000 * 6, value: 0.58 },
        { timestamp: Date.now() - 86400000 * 5, value: 0.60 }
      ],
      longTerm: [
        { timestamp: Date.now() - 86400000 * 7, value: 0.50 },
        { timestamp: Date.now() - 86400000 * 6, value: 0.52 },
        { timestamp: Date.now() - 86400000 * 5, value: 0.54 }
      ]
    }
  });
});

describe('LearningDashboard - Component Structure', () => {
  it('should render the dashboard with title', () => {
    renderWithWrapper(<LearningDashboard />);

    expect(screen.getByText(i18n.t('learning:dashboard.title'))).toBeInTheDocument();
  });

  it('should render tabs navigation', () => {
    renderWithWrapper(<LearningDashboard />);

    expect(screen.getByText(i18n.t('learning:dashboard.tabs.trends'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('learning:dashboard.tabs.patterns'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('learning:dashboard.tabs.timeline'))).toBeInTheDocument();
  });

  it('should show Trends tab by default', () => {
    renderWithWrapper(<LearningDashboard />);

    const trendsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.trends') });
    expect(trendsTab).toHaveAttribute('data-state', 'active');
  });
});

describe('LearningDashboard - Tab Navigation', () => {
  it('should switch to Patterns tab when clicked', async () => {
    renderWithWrapper(<LearningDashboard />);

    const patternsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.patterns') });
    fireEvent.click(patternsTab);

    await waitFor(() => {
      expect(patternsTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('should switch to Timeline tab when clicked', async () => {
    renderWithWrapper(<LearningDashboard />);

    const timelineTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.timeline') });
    fireEvent.click(timelineTab);

    await waitFor(() => {
      expect(timelineTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('should switch between tabs correctly', async () => {
    renderWithWrapper(<LearningDashboard />);

    const trendsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.trends') });
    const patternsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.patterns') });

    // Start at Trends
    expect(trendsTab).toHaveAttribute('data-state', 'active');

    // Switch to Patterns
    fireEvent.click(patternsTab);
    await waitFor(() => {
      expect(patternsTab).toHaveAttribute('data-state', 'active');
      expect(trendsTab).toHaveAttribute('data-state', 'inactive');
    });

    // Switch back to Trends
    fireEvent.click(trendsTab);
    await waitFor(() => {
      expect(trendsTab).toHaveAttribute('data-state', 'active');
      expect(patternsTab).toHaveAttribute('data-state', 'inactive');
    });
  });
});

describe('LearningDashboard - Quality Trends Chart', () => {
  it('should call getQualityTrends IPC on mount', async () => {
    renderWithWrapper(<LearningDashboard />);

    await waitFor(() => {
      expect(mockGetQualityTrends).toHaveBeenCalledTimes(1);
    });
  });

  it('should render quality trends chart when data loads', async () => {
    renderWithWrapper(<LearningDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('quality-trends-chart')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching trends', () => {
    mockGetQualityTrends.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithWrapper(<LearningDashboard />);

    expect(screen.getByText(i18n.t('common:labels.loading'))).toBeInTheDocument();
  });

  it('should show error message when trends fetch fails', async () => {
    mockGetQualityTrends.mockResolvedValue({
      success: false,
      error: 'Failed to fetch trends'
    });

    renderWithWrapper(<LearningDashboard />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:dashboard.errors.loadTrends'))).toBeInTheDocument();
    });
  });
});

describe('LearningDashboard - EWC Curves Chart', () => {
  it('should call getEWCCurves IPC when switching to Patterns tab', async () => {
    renderWithWrapper(<LearningDashboard />);

    const patternsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.patterns') });
    fireEvent.click(patternsTab);

    await waitFor(() => {
      expect(mockGetEWCCurves).toHaveBeenCalledTimes(1);
    });
  });

  it('should render EWC curves chart in Patterns tab', async () => {
    renderWithWrapper(<LearningDashboard />);

    const patternsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.patterns') });
    fireEvent.click(patternsTab);

    await waitFor(() => {
      expect(screen.getByTestId('ewc-curves-chart')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching curves', async () => {
    mockGetEWCCurves.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithWrapper(<LearningDashboard />);

    const patternsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.patterns') });
    fireEvent.click(patternsTab);

    expect(screen.getByText(i18n.t('common:labels.loading'))).toBeInTheDocument();
  });

  it('should show error message when curves fetch fails', async () => {
    mockGetEWCCurves.mockResolvedValue({
      success: false,
      error: 'Failed to fetch curves'
    });

    renderWithWrapper(<LearningDashboard />);

    const patternsTab = screen.getByRole('tab', { name: i18n.t('learning:dashboard.tabs.patterns') });
    fireEvent.click(patternsTab);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:dashboard.errors.loadCurves'))).toBeInTheDocument();
    });
  });
});
