/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContractExplorer } from '../ContractExplorer';
import i18n from '../../../../shared/i18n';

// Mock window.api.vac
const mockGetAllContracts = vi.fn();
const mockGetContract = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).api = {
    vac: {
      getAllContracts: mockGetAllContracts,
      getContract: mockGetContract
    }
  };
});

// Test data: VAC contracts
const mockContracts = [
  {
    id: 'contract-1',
    name: 'User Authentication Contract',
    status: 'verified',
    createdAt: Date.now() - 86400000,
    preconditions: [
      'User credentials must be provided',
      'Database connection must be active'
    ],
    postconditions: [
      'User session token is generated',
      'Session is stored in database'
    ],
    invariants: [
      'Password must never be logged',
      'Session must expire after 24 hours'
    ]
  },
  {
    id: 'contract-2',
    name: 'File Upload Contract',
    status: 'pending',
    createdAt: Date.now() - 3600000,
    preconditions: [
      'File size must be < 10MB',
      'File type must be allowed'
    ],
    postconditions: [
      'File is stored in S3',
      'Database record is created'
    ],
    invariants: [
      'Original filename is preserved',
      'Upload must be atomic'
    ]
  },
  {
    id: 'contract-3',
    name: 'Payment Processing Contract',
    status: 'failed',
    createdAt: Date.now() - 172800000,
    preconditions: [
      'Payment method must be valid',
      'Amount must be positive'
    ],
    postconditions: [
      'Transaction is recorded',
      'Receipt is generated'
    ],
    invariants: [
      'Payment idempotency is guaranteed',
      'No double charges allowed'
    ]
  }
];

describe('ContractExplorer - Component Structure', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
  });

  it('should render ContractExplorer with filter bar and contract list', async () => {
    render(<ContractExplorer />);

    // Should show loading initially
    expect(screen.getByText(i18n.t('verification:contracts.loading'))).toBeInTheDocument();

    // Wait for contracts to load
    await waitFor(() => {
      expect(mockGetAllContracts).toHaveBeenCalled();
    });

    // Should show filter bar
    expect(screen.getByPlaceholderText(i18n.t('verification:contracts.searchPlaceholder'))).toBeInTheDocument();

    // Should show contracts
    expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    expect(screen.getByText('File Upload Contract')).toBeInTheDocument();
  });

  it('should show empty state when no contracts exist', async () => {
    mockGetAllContracts.mockResolvedValue([]);

    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:contracts.empty.title'))).toBeInTheDocument();
    });

    expect(screen.getByText(i18n.t('verification:contracts.empty.description'))).toBeInTheDocument();
  });

  it('should show error state when API fails', async () => {
    mockGetAllContracts.mockRejectedValue(new Error('API error'));

    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:contracts.error'))).toBeInTheDocument();
    });
  });
});

describe('ContractExplorer - Search Functionality', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
  });

  it('should filter contracts by search term', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(i18n.t('verification:contracts.searchPlaceholder'));
    fireEvent.change(searchInput, { target: { value: 'Authentication' } });

    // Should show filtered results
    expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    expect(screen.queryByText('File Upload Contract')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Processing Contract')).not.toBeInTheDocument();
  });

  it('should show no results message when search has no matches', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(i18n.t('verification:contracts.searchPlaceholder'));
    fireEvent.change(searchInput, { target: { value: 'NonExistentContract' } });

    expect(screen.getByText(i18n.t('verification:contracts.noResults'))).toBeInTheDocument();
  });
});

describe('ContractExplorer - Status Filter', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
  });

  it('should filter contracts by status', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    // Click verified filter (get the button, not the badge)
    const buttons = screen.getAllByRole('button');
    const verifiedButton = buttons.find(btn => btn.textContent === i18n.t('verification:contracts.status.verified'));
    fireEvent.click(verifiedButton!);

    // Should show only verified contracts
    expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    expect(screen.queryByText('File Upload Contract')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Processing Contract')).not.toBeInTheDocument();
  });

  it('should show all contracts when "All" filter is selected', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    // Click all filter button
    const allButton = screen.getByRole('button', { name: i18n.t('verification:contracts.status.all') });
    fireEvent.click(allButton);

    // Should show all contracts
    expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    expect(screen.getByText('File Upload Contract')).toBeInTheDocument();
    expect(screen.getByText('Payment Processing Contract')).toBeInTheDocument();
  });
});

describe('ContractList - Display', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
  });

  it('should display contract cards with all information', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    // Should display status badges (use getAllByText since buttons and badges share text)
    const verifiedElements = screen.getAllByText(i18n.t('verification:contracts.status.verified'));
    expect(verifiedElements.length).toBeGreaterThan(0);

    // Should display section labels (multiple cards, so use getAllByText)
    const preconditionsLabels = screen.getAllByText(i18n.t('verification:contracts.preconditions'));
    expect(preconditionsLabels.length).toBeGreaterThan(0);

    // Should display specific preconditions
    expect(screen.getByText('User credentials must be provided')).toBeInTheDocument();

    // Should display postconditions label
    const postconditionsLabels = screen.getAllByText(i18n.t('verification:contracts.postconditions'));
    expect(postconditionsLabels.length).toBeGreaterThan(0);

    // Should display invariants label
    const invariantsLabels = screen.getAllByText(i18n.t('verification:contracts.invariants'));
    expect(invariantsLabels.length).toBeGreaterThan(0);
  });

  it('should display different status badges correctly', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    // Should show all status types (buttons + badges, so use getAllByText)
    const verifiedElements = screen.getAllByText(i18n.t('verification:contracts.status.verified'));
    expect(verifiedElements.length).toBeGreaterThan(0);

    const pendingElements = screen.getAllByText(i18n.t('verification:contracts.status.pending'));
    expect(pendingElements.length).toBeGreaterThan(0);

    const failedElements = screen.getAllByText(i18n.t('verification:contracts.status.failed'));
    expect(failedElements.length).toBeGreaterThan(0);
  });
});

describe('ContractExplorer - Contract Details', () => {
  beforeEach(() => {
    mockGetAllContracts.mockResolvedValue(mockContracts);
    mockGetContract.mockResolvedValue(mockContracts[0]);
  });

  it('should expand contract to show full details on click', async () => {
    render(<ContractExplorer />);

    await waitFor(() => {
      expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();
    });

    // Click contract card
    const contractCard = screen.getByText('User Authentication Contract').closest('div');
    fireEvent.click(contractCard!);

    // Should show all preconditions
    await waitFor(() => {
      expect(screen.getByText('Database connection must be active')).toBeInTheDocument();
    });

    // Should show all postconditions
    expect(screen.getByText('Session is stored in database')).toBeInTheDocument();

    // Should show all invariants
    expect(screen.getByText('Session must expire after 24 hours')).toBeInTheDocument();
  });
});
