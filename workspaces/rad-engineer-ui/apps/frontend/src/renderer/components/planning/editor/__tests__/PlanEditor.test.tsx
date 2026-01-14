/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for PlanEditor component
 * Tests YAML editor, validation panel, and preview integration
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { PlanEditor } from '../PlanEditor';
import i18n from '../../../../../shared/i18n';
import type { ReactNode } from 'react';

// Wrapper component for i18n
function TestWrapper({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

// Custom render with wrapper
function renderWithI18n(ui: React.ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

// Mock window.api
const mockValidatePlan = vi.fn();
const mockSavePlan = vi.fn();
const mockUpdatePlan = vi.fn();

// Set up window.api globally before all tests
beforeAll(() => {
  (global as any).window = {
    ...((global as any).window || {}),
    api: {
      planning: {
        validatePlan: mockValidatePlan,
        savePlan: mockSavePlan,
        updatePlan: mockUpdatePlan
      }
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanEditor', () => {
  const mockInitialPlan = `name: Sample Project
version: 1.0.0
waves:
  - id: wave-1
    stories:
      - id: story-1
        title: Setup project`;

  beforeEach(() => {
    mockValidatePlan.mockResolvedValue({
      success: true,
      data: { valid: true, errors: [], warnings: [] }
    });
    mockSavePlan.mockResolvedValue({
      success: true,
      data: { planId: 'plan-123' }
    });
    mockUpdatePlan.mockResolvedValue({
      success: true
    });
  });

  describe('Initialization', () => {
    it('should render editor with initial content', () => {
      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      expect(screen.getByRole('textbox')).toHaveValue(mockInitialPlan);
    });

    it('should render with empty content when no initial content provided', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('should display editor title from i18n', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      expect(screen.getByText(/plan editor/i)).toBeInTheDocument();
    });
  });

  describe('YAML Editor', () => {
    it('should allow editing YAML content', async () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      const newContent = 'name: Updated Project';

      fireEvent.change(editor, { target: { value: newContent } });

      expect(editor).toHaveValue(newContent);
    });

    it('should show character count', () => {
      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      // Should display character count indicator
      expect(screen.getByText(/characters/i)).toBeInTheDocument();
    });

    it('should auto-resize textarea based on content', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      expect(editor).toHaveClass('resize-none');
    });
  });

  describe('Validation', () => {
    it('should validate plan on content change', async () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: mockInitialPlan } });

      await waitFor(() => {
        expect(mockValidatePlan).toHaveBeenCalledWith('proj-1', mockInitialPlan);
      });
    });

    it('should display validation errors', async () => {
      mockValidatePlan.mockResolvedValue({
        success: true,
        data: {
          valid: false,
          errors: ['Missing required field: name', 'Invalid wave ID format'],
          warnings: []
        }
      });

      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent="invalid: yaml" onSave={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText(/missing required field: name/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid wave id format/i)).toBeInTheDocument();
      });
    });

    it('should display validation warnings', async () => {
      mockValidatePlan.mockResolvedValue({
        success: true,
        data: {
          valid: true,
          errors: [],
          warnings: ['Story story-1 has no description']
        }
      });

      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText(/story story-1 has no description/i)).toBeInTheDocument();
      });
    });

    it('should show valid status when no errors', async () => {
      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText(/valid/i)).toBeInTheDocument();
      });
    });

    it('should debounce validation calls', async () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');

      // Type multiple characters quickly
      fireEvent.change(editor, { target: { value: 'a' } });
      fireEvent.change(editor, { target: { value: 'ab' } });
      fireEvent.change(editor, { target: { value: 'abc' } });

      // Should only validate once after debounce delay
      await waitFor(() => {
        expect(mockValidatePlan).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Save Functionality', () => {
    it('should show save button', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should disable save button when content is empty', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when content is valid', async () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: mockInitialPlan } });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should call savePlan IPC when save button is clicked', async () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: mockInitialPlan } });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);
      });

      expect(mockSavePlan).toHaveBeenCalledWith('proj-1', mockInitialPlan);
    });

    it('should call onSave callback on successful save', async () => {
      const onSave = vi.fn();
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={onSave} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: mockInitialPlan } });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('plan-123');
      });
    });

    it('should show saving indicator while saving', async () => {
      mockSavePlan.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: mockInitialPlan } });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('should show error message when save fails', async () => {
      mockSavePlan.mockResolvedValue({
        success: false,
        error: 'Failed to save plan'
      });

      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: mockInitialPlan } });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to save plan/i)).toBeInTheDocument();
      });
    });
  });

  describe('Preview Panel', () => {
    it('should display preview of plan content', () => {
      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      // Preview should show formatted version of the plan
      expect(screen.getByText(/sample project/i)).toBeInTheDocument();
    });

    it('should update preview when content changes', async () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: 'name: New Project' } });

      await waitFor(() => {
        expect(screen.getByText(/new project/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no content', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      expect(screen.getByText(/no plan content/i)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should display editor and preview side by side', () => {
      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      const container = screen.getByRole('textbox').closest('.grid');
      expect(container).toHaveClass('grid-cols-2');
    });

    it('should be responsive on smaller screens', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      const container = screen.getByRole('textbox').closest('.grid');
      expect(container).toHaveClass('md:grid-cols-2');
    });
  });

  describe('i18n Integration', () => {
    it('should use translation keys for all UI text', () => {
      renderWithI18n(<PlanEditor projectId="proj-1" onSave={vi.fn()} />);

      // Check that i18n is being used for buttons and labels
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should translate validation messages', async () => {
      mockValidatePlan.mockResolvedValue({
        success: true,
        data: { valid: true, errors: [], warnings: [] }
      });

      renderWithI18n(
        <PlanEditor projectId="proj-1" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      await waitFor(() => {
        // Validation status should be translated
        expect(screen.getByText(/valid/i)).toBeInTheDocument();
      });
    });
  });

  describe('Update Mode', () => {
    it('should call updatePlan when planId is provided', async () => {
      renderWithI18n(
        <PlanEditor projectId="proj-1" planId="plan-123" initialContent={mockInitialPlan} onSave={vi.fn()} />
      );

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: 'name: Updated' } });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      expect(mockUpdatePlan).toHaveBeenCalledWith('proj-1', 'plan-123', 'name: Updated');
    });
  });
});
