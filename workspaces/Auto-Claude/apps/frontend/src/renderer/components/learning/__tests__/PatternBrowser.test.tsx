/**
 * @vitest-environment jsdom
 */
/**
 * Test suite for PatternBrowser component
 * Tests pattern display, filtering, and search functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatternBrowser } from '../PatternBrowser';
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
const mockGetPatterns = vi.fn();
const mockSearchPatterns = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock window.api.learning
  if (typeof window !== 'undefined') {
    const existingApi = (window as any).api || {};
    (window as any).api = {
      ...existingApi,
      learning: {
        getPatterns: mockGetPatterns,
        searchPatterns: mockSearchPatterns
      }
    };
  }

  // Default mock responses
  mockGetPatterns.mockResolvedValue({
    success: true,
    data: [
      {
        id: '1',
        name: 'Error handling pattern',
        description: 'Use try-catch with specific error types',
        category: 'typescript',
        confidence: 0.85,
        tags: ['error-handling', 'typescript'],
        appliedCount: 12,
        successRate: 0.90
      },
      {
        id: '2',
        name: 'React hooks pattern',
        description: 'Use custom hooks for shared state logic',
        category: 'react',
        confidence: 0.92,
        tags: ['react', 'hooks'],
        appliedCount: 8,
        successRate: 0.95
      },
      {
        id: '3',
        name: 'Test setup pattern',
        description: 'Mock window.api in beforeEach',
        category: 'testing',
        confidence: 0.78,
        tags: ['testing', 'vitest'],
        appliedCount: 15,
        successRate: 0.87
      }
    ]
  });

  mockSearchPatterns.mockResolvedValue({
    success: true,
    data: []
  });
});

describe('PatternBrowser - Component Structure', () => {
  it('should render the browser with title', () => {
    renderWithWrapper(<PatternBrowser />);

    expect(screen.getByText(i18n.t('learning:patterns.title'))).toBeInTheDocument();
  });

  it('should render search input', () => {
    renderWithWrapper(<PatternBrowser />);

    expect(screen.getByPlaceholderText(i18n.t('learning:patterns.searchPlaceholder'))).toBeInTheDocument();
  });

  it('should render filter controls', () => {
    renderWithWrapper(<PatternBrowser />);

    expect(screen.getByText(i18n.t('learning:patterns.filters.category'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('learning:patterns.filters.confidence'))).toBeInTheDocument();
  });
});

describe('PatternBrowser - Data Loading', () => {
  it('should call getPatterns IPC on mount', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(mockGetPatterns).toHaveBeenCalledTimes(1);
    });
  });

  it('should display patterns when data loads', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument();
      expect(screen.getByText('React hooks pattern')).toBeInTheDocument();
      expect(screen.getByText('Test setup pattern')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', () => {
    mockGetPatterns.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithWrapper(<PatternBrowser />);

    expect(screen.getByText(i18n.t('common:labels.loading'))).toBeInTheDocument();
  });

  it('should show error message when fetch fails', async () => {
    mockGetPatterns.mockResolvedValue({
      success: false,
      error: 'Failed to fetch patterns'
    });

    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:patterns.errors.loadFailed'))).toBeInTheDocument();
    });
  });

  it('should show empty state when no patterns exist', async () => {
    mockGetPatterns.mockResolvedValue({
      success: true,
      data: []
    });

    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:patterns.empty'))).toBeInTheDocument();
    });
  });
});

describe('PatternBrowser - Pattern Display', () => {
  it('should display pattern name', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument();
    });
  });

  it('should display pattern confidence percentage', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  it('should display category badge', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('typescript')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('testing')).toBeInTheDocument();
    });
  });

  it('should display pattern description', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Use try-catch with specific error types')).toBeInTheDocument();
    });
  });

  it('should display pattern tags', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('error-handling')).toBeInTheDocument();
      expect(screen.getByText('hooks')).toBeInTheDocument();
    });
  });
});

describe('PatternBrowser - Search', () => {
  it('should call searchPatterns when typing in search', async () => {
    renderWithWrapper(<PatternBrowser />);

    const searchInput = screen.getByPlaceholderText(i18n.t('learning:patterns.searchPlaceholder'));
    fireEvent.change(searchInput, { target: { value: 'error' } });

    await waitFor(() => {
      expect(mockSearchPatterns).toHaveBeenCalledWith('error');
    });
  });

  it('should debounce search input', async () => {
    vi.useFakeTimers();
    renderWithWrapper(<PatternBrowser />);

    const searchInput = screen.getByPlaceholderText(i18n.t('learning:patterns.searchPlaceholder'));

    fireEvent.change(searchInput, { target: { value: 'e' } });
    fireEvent.change(searchInput, { target: { value: 'er' } });
    fireEvent.change(searchInput, { target: { value: 'err' } });

    expect(mockSearchPatterns).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(mockSearchPatterns).toHaveBeenCalledTimes(1);
      expect(mockSearchPatterns).toHaveBeenCalledWith('err');
    });

    vi.useRealTimers();
  });

  it('should display search results', async () => {
    mockSearchPatterns.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          name: 'Error handling pattern',
          description: 'Use try-catch with specific error types',
          category: 'typescript',
          confidence: 0.85,
          tags: ['error-handling', 'typescript'],
          appliedCount: 12,
          successRate: 0.90
        }
      ]
    });

    renderWithWrapper(<PatternBrowser />);

    const searchInput = screen.getByPlaceholderText(i18n.t('learning:patterns.searchPlaceholder'));
    fireEvent.change(searchInput, { target: { value: 'error' } });

    await waitFor(() => {
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument();
      expect(screen.queryByText('React hooks pattern')).not.toBeInTheDocument();
    });
  });
});

describe('PatternBrowser - Filtering', () => {
  it('should filter by category', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument();
    });

    // Click category filter
    const categoryFilter = screen.getByText(i18n.t('learning:patterns.filters.category'));
    fireEvent.click(categoryFilter);

    // Select typescript
    const typescriptOption = screen.getByText('typescript');
    fireEvent.click(typescriptOption);

    await waitFor(() => {
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument();
      expect(screen.queryByText('React hooks pattern')).not.toBeInTheDocument();
    });
  });

  it('should filter by confidence range', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Test setup pattern')).toBeInTheDocument();
    });

    // Set min confidence to 80%
    const confidenceSlider = screen.getByLabelText(i18n.t('learning:patterns.filters.minConfidence'));
    fireEvent.change(confidenceSlider, { target: { value: '80' } });

    await waitFor(() => {
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument(); // 85%
      expect(screen.getByText('React hooks pattern')).toBeInTheDocument(); // 92%
      expect(screen.queryByText('Test setup pattern')).not.toBeInTheDocument(); // 78%
    });
  });

  it('should combine multiple filters', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(3);
    });

    // Filter by category and confidence
    const categoryFilter = screen.getByText(i18n.t('learning:patterns.filters.category'));
    fireEvent.click(categoryFilter);
    const typescriptOption = screen.getByText('typescript');
    fireEvent.click(typescriptOption);

    const confidenceSlider = screen.getByLabelText(i18n.t('learning:patterns.filters.minConfidence'));
    fireEvent.change(confidenceSlider, { target: { value: '80' } });

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(1);
      expect(screen.getByText('Error handling pattern')).toBeInTheDocument();
    });
  });

  it('should clear filters', async () => {
    renderWithWrapper(<PatternBrowser />);

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(3);
    });

    // Apply filters
    const confidenceSlider = screen.getByLabelText(i18n.t('learning:patterns.filters.minConfidence'));
    fireEvent.change(confidenceSlider, { target: { value: '90' } });

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(1);
    });

    // Clear filters
    const clearButton = screen.getByText(i18n.t('learning:patterns.filters.clear'));
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(3);
    });
  });
});
