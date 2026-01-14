/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationRunner } from '../VerificationRunner';
import i18n from '../../../../shared/i18n';

// Mock window.api.vac
const mockRunVerification = vi.fn();
const mockGetVerificationHistory = vi.fn();
const mockGetAllContracts = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).api = {
    vac: {
      runVerification: mockRunVerification,
      getVerificationHistory: mockGetVerificationHistory,
      getAllContracts: mockGetAllContracts
    }
  };
});

// Test data: Verification results
const mockVerificationResult = {
  contractId: 'contract-1',
  contractName: 'User Authentication Contract',
  timestamp: Date.now(),
  preconditionsResults: [
    { condition: 'User credentials must be provided', passed: true, error: null },
    { condition: 'Database connection must be active', passed: true, error: null }
  ],
  postconditionsResults: [
    { condition: 'User session token is generated', passed: true, error: null },
    { condition: 'Session is stored in database', passed: false, error: 'Database write failed' }
  ],
  invariantsResults: [
    { condition: 'Password must never be logged', passed: true, error: null },
    { condition: 'Session must expire after 24 hours', passed: true, error: null }
  ],
  overallStatus: 'failed' as const
};

const mockContracts = [
  {
    id: 'contract-1',
    name: 'User Authentication Contract',
    status: 'verified',
    createdAt: Date.now() - 86400000
  },
  {
    id: 'contract-2',
    name: 'File Upload Contract',
    status: 'pending',
    createdAt: Date.now() - 3600000
  }
];

describe('VerificationRunner - Component Structure', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
    mockGetVerificationHistory.mockResolvedValue([]);
  });

  it('should render VerificationRunner with contract selector and run button', async () => {
    render(<VerificationRunner />);

    // Should show contract selector label
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Should show run button
    expect(screen.getByText(i18n.t('verification:runner.runVerification'))).toBeInTheDocument();

    // Run button should be disabled when no contract selected
    const runButton = screen.getByText(i18n.t('verification:runner.runVerification')).closest('button');
    expect(runButton).toBeDisabled();
  });

  it('should enable run button after contract selection', async () => {
    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Open contract selector (simulate dropdown)
    const selector = screen.getByRole('combobox');
    fireEvent.click(selector);

    // Select a contract (after dropdown opens)
    await waitFor(() => {
      const contract = screen.getByText('User Authentication Contract');
      fireEvent.click(contract);
    });

    // Run button should now be enabled
    const runButton = screen.getByText(i18n.t('verification:runner.runVerification')).closest('button');
    expect(runButton).not.toBeDisabled();
  });

  it('should show loading state when verification is running', async () => {
    mockRunVerification.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select contract
    const selector = screen.getByRole('combobox');
    fireEvent.click(selector);
    await waitFor(() => {
      const contract = screen.getByText('User Authentication Contract');
      fireEvent.click(contract);
    });

    // Click run button
    const runButton = screen.getByText(i18n.t('verification:runner.runVerification')).closest('button');
    fireEvent.click(runButton!);

    // Should show running state
    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:runner.running'))).toBeInTheDocument();
    });
  });
});

describe('VerificationRunner - Running Verification', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
    mockGetVerificationHistory.mockResolvedValue([]);
  });

  it('should call runVerification API with selected contract', async () => {
    mockRunVerification.mockResolvedValue({
      success: true,
      data: mockVerificationResult
    });

    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select contract
    const selector = screen.getByRole('combobox');
    fireEvent.click(selector);
    await waitFor(() => {
      const contract = screen.getByText('User Authentication Contract');
      fireEvent.click(contract);
    });

    // Click run button
    const runButton = screen.getByText(i18n.t('verification:runner.runVerification')).closest('button');
    fireEvent.click(runButton!);

    // Should call API with correct contract ID
    await waitFor(() => {
      expect(mockRunVerification).toHaveBeenCalledWith('contract-1');
    });
  });

  it('should display verification results after successful run', async () => {
    mockRunVerification.mockResolvedValue({
      success: true,
      data: mockVerificationResult
    });

    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select and run
    const selector = screen.getByRole('combobox');
    fireEvent.click(selector);
    await waitFor(() => {
      const contract = screen.getByText('User Authentication Contract');
      fireEvent.click(contract);
    });

    const runButton = screen.getByText(i18n.t('verification:runner.runVerification')).closest('button');
    fireEvent.click(runButton!);

    // Should display results
    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:results.title'))).toBeInTheDocument();
    });
  });

  it('should show error message when verification fails', async () => {
    mockRunVerification.mockRejectedValue(new Error('Verification engine not available'));

    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select and run
    const selector = screen.getByRole('combobox');
    fireEvent.click(selector);
    await waitFor(() => {
      const contract = screen.getByText('User Authentication Contract');
      fireEvent.click(contract);
    });

    const runButton = screen.getByText(i18n.t('verification:runner.runVerification')).closest('button');
    fireEvent.click(runButton!);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:runner.error'))).toBeInTheDocument();
    });
  });
});

describe('VerificationRunner - History Display', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
  });

  it('should display verification history on mount', async () => {
    const mockHistory = [
      {
        ...mockVerificationResult,
        timestamp: Date.now() - 3600000 // 1 hour ago
      },
      {
        ...mockVerificationResult,
        contractId: 'contract-2',
        contractName: 'File Upload Contract',
        overallStatus: 'passed' as const,
        timestamp: Date.now() - 7200000 // 2 hours ago
      }
    ];

    mockGetVerificationHistory.mockResolvedValue(mockHistory);

    render(<VerificationRunner />);

    // Should show history section
    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:runner.history.title'))).toBeInTheDocument();
    });

    // Should display both verification runs
    expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    expect(screen.getByText('File Upload Contract')).toBeInTheDocument();
  });

  it('should show empty history message when no verifications run yet', async () => {
    mockGetVerificationHistory.mockResolvedValue([]);

    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:runner.history.empty'))).toBeInTheDocument();
    });
  });

  it('should allow clicking history item to view past results', async () => {
    const mockHistory = [mockVerificationResult];
    mockGetVerificationHistory.mockResolvedValue(mockHistory);

    render(<VerificationRunner />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:runner.history.title'))).toBeInTheDocument();
    });

    // Click on history item
    const historyItem = screen.getByText('User Authentication Contract').closest('div');
    fireEvent.click(historyItem!);

    // Should display results
    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:results.title'))).toBeInTheDocument();
    });
  });
});
