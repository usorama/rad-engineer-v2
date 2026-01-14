import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DriftMonitor } from '../DriftMonitor';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'drift.title': 'Drift Detection',
        'drift.description': 'Monitor code drift from verified contracts',
        'drift.loading': 'Checking for drift...',
        'drift.error': 'Failed to load drift data',
        'drift.currentRate': 'Current Drift Rate',
        'drift.trend': 'Drift Trend',
        'drift.noData': 'No drift data available'
      };
      return translations[key] || key;
    }
  })
}));

// Mock window.api.vac
const mockCheckDrift = vi.fn();
const mockGetDriftHistory = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as unknown as { api: { vac: { checkDrift: typeof mockCheckDrift; getDriftHistory: typeof mockGetDriftHistory } } }).api = {
      vac: {
        checkDrift: mockCheckDrift,
        getDriftHistory: mockGetDriftHistory
      }
    };
  }
});

describe('DriftMonitor', () => {
  it('renders loading state initially', () => {
    mockCheckDrift.mockReturnValue(new Promise(() => {})); // Never resolves
    mockGetDriftHistory.mockReturnValue(new Promise(() => {}));

    render(<DriftMonitor />);
    expect(screen.getByText('Checking for drift...')).toBeInTheDocument();
  });

  it('renders drift data after loading', async () => {
    mockCheckDrift.mockResolvedValue({
      driftPercentage: 23.5,
      timestamp: Date.now()
    });
    mockGetDriftHistory.mockResolvedValue([
      { timestamp: Date.now() - 3600000, driftPercentage: 15.0 },
      { timestamp: Date.now() - 1800000, driftPercentage: 20.0 },
      { timestamp: Date.now(), driftPercentage: 23.5 }
    ]);

    render(<DriftMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Drift Detection')).toBeInTheDocument();
    });

    expect(screen.getByText('Current Drift Rate')).toBeInTheDocument();
    expect(screen.getByText('Drift Trend')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    mockCheckDrift.mockRejectedValue(new Error('API error'));
    mockGetDriftHistory.mockRejectedValue(new Error('API error'));

    render(<DriftMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load drift data')).toBeInTheDocument();
    });
  });

  it('renders no data state when no drift history', async () => {
    mockCheckDrift.mockResolvedValue({
      driftPercentage: 0,
      timestamp: Date.now()
    });
    mockGetDriftHistory.mockResolvedValue([]);

    render(<DriftMonitor />);

    await waitFor(() => {
      expect(screen.getByText('No drift data available')).toBeInTheDocument();
    });
  });

  it('renders DriftGauge with correct percentage', async () => {
    mockCheckDrift.mockResolvedValue({
      driftPercentage: 42.8,
      timestamp: Date.now()
    });
    mockGetDriftHistory.mockResolvedValue([
      { timestamp: Date.now(), driftPercentage: 42.8 }
    ]);

    render(<DriftMonitor />);

    await waitFor(() => {
      // DriftGauge should display the percentage
      expect(screen.getByText(/42\.8%/)).toBeInTheDocument();
    });
  });

  it('renders DriftTimeline with history data', async () => {
    const history = [
      { timestamp: Date.now() - 7200000, driftPercentage: 10.0 },
      { timestamp: Date.now() - 3600000, driftPercentage: 15.0 },
      { timestamp: Date.now(), driftPercentage: 25.0 }
    ];

    mockCheckDrift.mockResolvedValue({
      driftPercentage: 25.0,
      timestamp: Date.now()
    });
    mockGetDriftHistory.mockResolvedValue(history);

    render(<DriftMonitor />);

    await waitFor(() => {
      // DriftTimeline should render SVG chart
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
