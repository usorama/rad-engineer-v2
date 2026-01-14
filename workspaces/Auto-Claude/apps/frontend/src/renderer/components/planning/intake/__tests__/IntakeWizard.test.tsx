/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for IntakeWizard component
 * Tests multi-step wizard flow, i18n integration, and IPC communication
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { IntakeWizard } from '../IntakeWizard';
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
const mockStartIntake = vi.fn();
const mockSubmitAnswers = vi.fn();

// Set up window.api globally before all tests
beforeAll(() => {
  (global as any).window = {
    ...((global as any).window || {}),
    api: {
      planning: {
        startIntake: mockStartIntake,
        submitAnswers: mockSubmitAnswers
      }
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('IntakeWizard', () => {
  const mockQuestions = [
    { id: 'q1', question: 'What is your project goal?', type: 'text' as const },
    { id: 'q2', question: 'Who are your users?', type: 'text' as const },
    { id: 'q3', question: 'Any technical constraints?', type: 'textarea' as const }
  ];

  beforeEach(() => {
    mockStartIntake.mockResolvedValue({
      success: true,
      data: { questions: mockQuestions }
    });
    mockSubmitAnswers.mockResolvedValue({
      success: true,
      data: { specId: 'spec-123' }
    });
  });

  describe('Initialization', () => {
    it('should render loading state initially', () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should call startIntake IPC on mount', async () => {
      const { container } = renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Give the component time to render and run effects
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockStartIntake).toHaveBeenCalledWith('proj-1');
    });

    it('should display error when startIntake fails', async () => {
      mockStartIntake.mockResolvedValue({
        success: false,
        error: 'Failed to initialize'
      });

      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to initialize/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Bar', () => {
    it('should show progress bar with correct step count', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Check aria-label shows current step
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '1');
      expect(progressBar).toHaveAttribute('aria-valuemax', '3');
    });

    it('should update progress bar when navigating steps', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Fill first question and go next
      const input = screen.getByPlaceholderText(/project goal/i);
      fireEvent.change(input, { target: { value: 'Build a web app' } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '2');
      });
    });
  });

  describe('Step Navigation', () => {
    it('should render first question on load', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/what is your project goal/i)).toBeInTheDocument();
      });
    });

    it('should disable Next button when answer is empty', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it('should enable Next button when answer is provided', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test answer' } });
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('should advance to next question when Next is clicked', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Build web app' } });
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/who are your users/i)).toBeInTheDocument();
      });
    });

    it('should show Back button after first step', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
      });

      // Go to second step
      const input = screen.getByPlaceholderText(/project goal/i);
      fireEvent.change(input, { target: { value: 'Test' } });
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('should go back to previous step when Back is clicked', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Navigate to step 2
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/who are your users/i)).toBeInTheDocument();
      });

      // Go back
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText(/what is your project goal/i)).toBeInTheDocument();
      });
    });

    it('should preserve answers when navigating back and forth', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Answer first question
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Build web app' } });
      });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      // Answer second question
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Developers' } });
      });

      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // Check first answer is preserved
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i) as HTMLInputElement;
        expect(input.value).toBe('Build web app');
      });
    });
  });

  describe('Summary Step', () => {
    it('should show Review button on last question', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Navigate to last step
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
      });
    });

    it('should display summary of all answers', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Fill all answers
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Build web app' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Developers' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/constraints/i);
        fireEvent.change(input, { target: { value: 'Use React' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /review/i }));

      // Check summary displays all answers
      await waitFor(() => {
        expect(screen.getByText(/build web app/i)).toBeInTheDocument();
        expect(screen.getByText(/developers/i)).toBeInTheDocument();
        expect(screen.getByText(/use react/i)).toBeInTheDocument();
      });
    });

    it('should allow editing from summary', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Navigate to summary
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/constraints/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /review/i }));

      // Click edit button for first question
      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        fireEvent.click(editButtons[0]);
      });

      // Should navigate back to first question
      await waitFor(() => {
        expect(screen.getByText(/what is your project goal/i)).toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('should submit answers when Submit is clicked', async () => {
      const onComplete = vi.fn();
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={onComplete} />);

      // Fill all answers and navigate to summary
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Build web app' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Developers' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/constraints/i);
        fireEvent.change(input, { target: { value: 'Use React' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        expect(mockSubmitAnswers).toHaveBeenCalledWith('proj-1', {
          q1: 'Build web app',
          q2: 'Developers',
          q3: 'Use React'
        });
      });
    });

    it('should call onComplete with specId on successful submission', async () => {
      const onComplete = vi.fn();
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={onComplete} />);

      // Navigate and submit
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/constraints/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith('spec-123');
      });
    });

    it('should show error when submission fails', async () => {
      mockSubmitAnswers.mockResolvedValue({
        success: false,
        error: 'Submission failed'
      });

      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Navigate and submit
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/constraints/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });
    });

    it('should disable Submit button while submitting', async () => {
      mockSubmitAnswers.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      // Navigate to summary
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/project goal/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/users/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/constraints/i);
        fireEvent.change(input, { target: { value: 'Test' } });
      });
      fireEvent.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        fireEvent.click(submitButton);
      });

      const submitButton = screen.getByRole('button', { name: /submitting/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('i18n Integration', () => {
    it('should use translation keys for all UI text', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        // Check that i18n is being used (buttons should have translated text)
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should translate progress indicator', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} />);

      await waitFor(() => {
        // Progress should show "Step X of Y" format from i18n
        expect(screen.getByText(/step/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Action', () => {
    it('should show cancel button', async () => {
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('should call onCancel when cancel is clicked', async () => {
      const onCancel = vi.fn();
      renderWithI18n(<IntakeWizard projectId="proj-1" onComplete={vi.fn()} onCancel={onCancel} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      });

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
