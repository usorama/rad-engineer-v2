/**
 * @vitest-environment jsdom
 */
/**
 * Test suite for MethodSelector, MethodCatalog, and MethodCard components
 * Tests BMAD method selection wizard flow with 50 methods
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MethodSelector } from '../MethodSelector';
import { MethodCatalog } from '../MethodCatalog';
import { MethodCard } from '../MethodCard';
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
const mockSelectMethod = vi.fn();
const mockGetMethodEffectiveness = vi.fn();

// Sample BMAD methods for testing
const mockMethods = [
  {
    id: 'chunking',
    name: 'Chunking',
    domain: 'Memory',
    effectiveness: 0.85,
    description: 'Breaking information into manageable chunks for better retention'
  },
  {
    id: 'spaced-repetition',
    name: 'Spaced Repetition',
    domain: 'Memory',
    effectiveness: 0.92,
    description: 'Reviewing material at increasing intervals to improve long-term retention'
  },
  {
    id: 'interleaving',
    name: 'Interleaving',
    domain: 'Problem Solving',
    effectiveness: 0.78,
    description: 'Mixing different types of problems or subjects during practice'
  },
  {
    id: 'elaboration',
    name: 'Elaboration',
    domain: 'Understanding',
    effectiveness: 0.81,
    description: 'Explaining and describing ideas with many details'
  },
  {
    id: 'dual-coding',
    name: 'Dual Coding',
    domain: 'Memory',
    effectiveness: 0.88,
    description: 'Combining visual and verbal information to enhance learning'
  }
];

beforeEach(() => {
  vi.clearAllMocks();

  // Mock window.api.learning (extend existing mock from setup.ts)
  if (typeof window !== 'undefined') {
    const existingApi = (window as any).api || {};
    (window as any).api = {
      ...existingApi,
      learning: {
        ...(existingApi.learning || {}),
        selectMethod: mockSelectMethod,
        getMethodEffectiveness: mockGetMethodEffectiveness
      }
    };
  }

  // Default mock responses
  mockSelectMethod.mockResolvedValue({
    success: true,
    data: { methodId: 'chunking', appliedAt: Date.now() }
  });

  mockGetMethodEffectiveness.mockResolvedValue({
    success: true,
    data: { methodId: 'chunking', effectiveness: 0.85 }
  });
});

describe('MethodCard - Individual Method Display', () => {
  const sampleMethod = mockMethods[0];

  it('should render method name', () => {
    renderWithWrapper(
      <MethodCard method={sampleMethod} onSelect={() => {}} />
    );

    expect(screen.getByText('Chunking')).toBeInTheDocument();
  });

  it('should render domain badge', () => {
    renderWithWrapper(
      <MethodCard method={sampleMethod} onSelect={() => {}} />
    );

    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  it('should render effectiveness percentage', () => {
    renderWithWrapper(
      <MethodCard method={sampleMethod} onSelect={() => {}} />
    );

    // 0.85 -> 85%
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should render method description', () => {
    renderWithWrapper(
      <MethodCard method={sampleMethod} onSelect={() => {}} />
    );

    expect(screen.getByText(/Breaking information into manageable chunks/)).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const handleSelect = vi.fn();
    renderWithWrapper(
      <MethodCard method={sampleMethod} onSelect={handleSelect} />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(handleSelect).toHaveBeenCalledWith(sampleMethod);
  });

  it('should show selected state when isSelected is true', () => {
    renderWithWrapper(
      <MethodCard method={sampleMethod} onSelect={() => {}} isSelected={true} />
    );

    const card = screen.getByRole('button');
    expect(card).toHaveClass('border-primary');
  });

  it('should display different effectiveness colors based on rating', () => {
    // High effectiveness (>= 80%) - green
    const { rerender } = renderWithWrapper(
      <MethodCard
        method={{ ...sampleMethod, effectiveness: 0.85 }}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText('85%').className).toContain('text-green-600');

    // Medium effectiveness (60-79%) - yellow
    rerender(
      <TestWrapper>
        <MethodCard
          method={{ ...sampleMethod, effectiveness: 0.70 }}
          onSelect={() => {}}
        />
      </TestWrapper>
    );
    expect(screen.getByText('70%').className).toContain('text-yellow-600');

    // Low effectiveness (< 60%) - red
    rerender(
      <TestWrapper>
        <MethodCard
          method={{ ...sampleMethod, effectiveness: 0.50 }}
          onSelect={() => {}}
        />
      </TestWrapper>
    );
    expect(screen.getByText('50%').className).toContain('text-red-600');
  });
});

describe('MethodCatalog - Grid View of Methods', () => {
  it('should render all provided methods', () => {
    renderWithWrapper(
      <MethodCatalog methods={mockMethods} onSelect={() => {}} />
    );

    expect(screen.getByText('Chunking')).toBeInTheDocument();
    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    expect(screen.getByText('Interleaving')).toBeInTheDocument();
    expect(screen.getByText('Elaboration')).toBeInTheDocument();
    expect(screen.getByText('Dual Coding')).toBeInTheDocument();
  });

  it('should render methods in grid layout', () => {
    renderWithWrapper(
      <MethodCatalog methods={mockMethods} onSelect={() => {}} />
    );

    const grid = screen.getByRole('list');
    expect(grid).toHaveClass('grid');
  });

  it('should filter methods by domain', () => {
    renderWithWrapper(
      <MethodCatalog methods={mockMethods} onSelect={() => {}} domainFilter="Memory" />
    );

    // Should show Memory methods
    expect(screen.getByText('Chunking')).toBeInTheDocument();
    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    expect(screen.getByText('Dual Coding')).toBeInTheDocument();

    // Should NOT show non-Memory methods
    expect(screen.queryByText('Interleaving')).not.toBeInTheDocument();
    expect(screen.queryByText('Elaboration')).not.toBeInTheDocument();
  });

  it('should search methods by name or description', () => {
    renderWithWrapper(
      <MethodCatalog methods={mockMethods} onSelect={() => {}} searchQuery="repetition" />
    );

    // Should show matching method
    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();

    // Should NOT show non-matching methods
    expect(screen.queryByText('Chunking')).not.toBeInTheDocument();
    expect(screen.queryByText('Interleaving')).not.toBeInTheDocument();
  });

  it('should show empty state when no methods match filters', () => {
    renderWithWrapper(
      <MethodCatalog methods={mockMethods} onSelect={() => {}} searchQuery="nonexistent" />
    );

    expect(screen.getByText(i18n.t('learning:methodSelector.catalog.noMethods'))).toBeInTheDocument();
  });

  it('should call onSelect when a method card is clicked', () => {
    const handleSelect = vi.fn();
    renderWithWrapper(
      <MethodCatalog methods={mockMethods} onSelect={handleSelect} />
    );

    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    expect(handleSelect).toHaveBeenCalledWith(mockMethods[0]);
  });

  it('should highlight selected method', () => {
    renderWithWrapper(
      <MethodCatalog
        methods={mockMethods}
        onSelect={() => {}}
        selectedMethodId="chunking"
      />
    );

    const chunkingCard = screen.getByText('Chunking').closest('button');
    expect(chunkingCard).toHaveClass('border-primary');
  });
});

describe('MethodSelector - Selection Wizard', () => {
  it('should render with title and subtitle', () => {
    renderWithWrapper(<MethodSelector />);

    expect(screen.getByText(i18n.t('learning:methodSelector.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('learning:methodSelector.subtitle'))).toBeInTheDocument();
  });

  it('should show search input', () => {
    renderWithWrapper(<MethodSelector />);

    const searchInput = screen.getByPlaceholderText(
      i18n.t('learning:methodSelector.searchPlaceholder')
    );
    expect(searchInput).toBeInTheDocument();
  });

  it('should show domain filter dropdown', () => {
    renderWithWrapper(<MethodSelector />);

    expect(screen.getByText(i18n.t('learning:methodSelector.filters.domain'))).toBeInTheDocument();
  });

  it('should filter methods when search query changes', async () => {
    renderWithWrapper(<MethodSelector />);

    const searchInput = screen.getByPlaceholderText(
      i18n.t('learning:methodSelector.searchPlaceholder')
    );

    fireEvent.change(searchInput, { target: { value: 'spaced' } });

    // Should show filtered results (debounced)
    await waitFor(() => {
      expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    });
  });

  it('should filter methods when domain filter changes', async () => {
    renderWithWrapper(<MethodSelector />);

    // Click domain filter
    const domainFilter = screen.getByRole('combobox', {
      name: i18n.t('learning:methodSelector.filters.domain')
    });
    fireEvent.click(domainFilter);

    // Select "Memory" option
    await waitFor(() => {
      const memoryOption = screen.getByText('Memory');
      fireEvent.click(memoryOption);
    });

    // Should show only Memory methods
    expect(screen.getByText('Chunking')).toBeInTheDocument();
    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    expect(screen.queryByText('Interleaving')).not.toBeInTheDocument();
  });

  it('should show method details when method is selected', async () => {
    renderWithWrapper(<MethodSelector />);

    // Click a method card
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      // Should show details panel
      expect(screen.getByText(i18n.t('learning:methodSelector.details.title'))).toBeInTheDocument();
      expect(screen.getByText('Chunking')).toBeInTheDocument();
      expect(screen.getByText(/Breaking information into manageable chunks/)).toBeInTheDocument();
    });
  });

  it('should show confirm button when method is selected', async () => {
    renderWithWrapper(<MethodSelector />);

    // Click a method card
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', {
        name: i18n.t('learning:methodSelector.actions.confirm')
      });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('should call selectMethod IPC when confirm is clicked', async () => {
    renderWithWrapper(<MethodSelector />);

    // Select a method
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    // Click confirm
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', {
        name: i18n.t('learning:methodSelector.actions.confirm')
      });
      fireEvent.click(confirmButton);
    });

    // Should call IPC
    expect(mockSelectMethod).toHaveBeenCalledWith('chunking');
  });

  it('should show success message after method is confirmed', async () => {
    renderWithWrapper(<MethodSelector />);

    // Select and confirm
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', {
        name: i18n.t('learning:methodSelector.actions.confirm')
      });
      fireEvent.click(confirmButton);
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:methodSelector.success'))).toBeInTheDocument();
    });
  });

  it('should show error message when selectMethod fails', async () => {
    mockSelectMethod.mockResolvedValue({
      success: false,
      error: 'Selection failed'
    });

    renderWithWrapper(<MethodSelector />);

    // Select and confirm
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', {
        name: i18n.t('learning:methodSelector.actions.confirm')
      });
      fireEvent.click(confirmButton);
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:methodSelector.errors.selectFailed'))).toBeInTheDocument();
    });
  });

  it('should allow deselecting a method by clicking it again', async () => {
    renderWithWrapper(<MethodSelector />);

    // Select a method
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:methodSelector.details.title'))).toBeInTheDocument();
    });

    // Click again to deselect
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      // Details panel should be hidden
      expect(screen.queryByText(i18n.t('learning:methodSelector.details.title'))).not.toBeInTheDocument();
    });
  });

  it('should show cancel button that clears selection', async () => {
    renderWithWrapper(<MethodSelector />);

    // Select a method
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', {
        name: i18n.t('learning:methodSelector.actions.cancel')
      });
      expect(cancelButton).toBeInTheDocument();
      fireEvent.click(cancelButton);
    });

    // Details panel should be hidden
    await waitFor(() => {
      expect(screen.queryByText(i18n.t('learning:methodSelector.details.title'))).not.toBeInTheDocument();
    });
  });

  it('should load method effectiveness from IPC', async () => {
    renderWithWrapper(<MethodSelector />);

    // Select a method
    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    // Should call IPC to get effectiveness
    await waitFor(() => {
      expect(mockGetMethodEffectiveness).toHaveBeenCalledWith('chunking');
    });
  });

  it('should render 50 BMAD methods in catalog', () => {
    renderWithWrapper(<MethodSelector />);

    // Component should load 50 methods
    const methodCards = screen.getAllByRole('button').filter(
      (button) => button.closest('[role="list"]')
    );
    expect(methodCards.length).toBe(50);
  });
});

describe('MethodSelector - Accessibility', () => {
  it('should have proper ARIA labels', () => {
    renderWithWrapper(<MethodSelector />);

    const searchInput = screen.getByPlaceholderText(
      i18n.t('learning:methodSelector.searchPlaceholder')
    );
    expect(searchInput).toHaveAttribute('type', 'search');
  });

  it('should allow keyboard navigation', async () => {
    renderWithWrapper(<MethodSelector />);

    const chunkingCard = screen.getByText('Chunking').closest('button');

    // Focus the card
    chunkingCard?.focus();
    expect(document.activeElement).toBe(chunkingCard);

    // Press Enter to select
    fireEvent.keyDown(chunkingCard!, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('learning:methodSelector.details.title'))).toBeInTheDocument();
    });
  });

  it('should announce selection changes to screen readers', async () => {
    renderWithWrapper(<MethodSelector />);

    const chunkingCard = screen.getByText('Chunking').closest('button');
    fireEvent.click(chunkingCard!);

    await waitFor(() => {
      const detailsPanel = screen.getByText(i18n.t('learning:methodSelector.details.title')).closest('div');
      expect(detailsPanel).toHaveAttribute('role', 'region');
      expect(detailsPanel).toHaveAttribute('aria-label');
    });
  });
});
