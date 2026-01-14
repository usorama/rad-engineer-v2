/**
 * Unit tests for PlanApproval component
 * Tests approval workflow, confirmation dialogs, i18n integration
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanApproval } from '../PlanApproval';
import type { ImplementationPlan } from '../../../../../shared/types';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'planning:approval.title': 'Plan Approval',
        'planning:approval.description': 'Review and approve or reject the implementation plan',
        'planning:approval.summary.title': 'Plan Summary',
        'planning:approval.summary.subtasks': 'Total Subtasks',
        'planning:approval.summary.phases': 'Phases',
        'planning:approval.summary.effort': 'Estimated Effort',
        'planning:approval.summary.hours': `${params?.count || 0} hours`,
        'planning:approval.comments.title': 'Comments & Feedback',
        'planning:approval.comments.placeholder': 'Add comments or feedback (optional)...',
        'planning:approval.comments.characterCount': `${params?.count || 0}/${params?.max || 1000} characters`,
        'planning:approval.comments.maxLength': `Comment cannot exceed ${params?.max || 1000} characters`,
        'planning:approval.buttons.approve': 'Approve Plan',
        'planning:approval.buttons.reject': 'Reject Plan',
        'planning:approval.buttons.confirm': 'Confirm',
        'planning:approval.buttons.cancel': 'Cancel',
        'planning:approval.dialog.approve.title': 'Confirm Approval',
        'planning:approval.dialog.approve.description': 'Are you sure you want to approve this plan? This will start the implementation process.',
        'planning:approval.dialog.approve.warning': 'This action cannot be undone.',
        'planning:approval.dialog.reject.title': 'Confirm Rejection',
        'planning:approval.dialog.reject.description': 'Are you sure you want to reject this plan? You will need to create a new plan.',
        'planning:approval.dialog.reject.warning': 'This action cannot be undone.'
      };
      return translations[key] || key;
    }
  })
}));

describe('PlanApproval', () => {
  const mockPlan: ImplementationPlan = {
    title: 'User Authentication Feature',
    workflow_type: 'feature_development',
    phases: [
      {
        phase: 1,
        name: 'Setup',
        type: 'setup',
        subtasks: [
          { id: 'task-1', description: 'Create auth service', status: 'pending' as const },
          { id: 'task-2', description: 'Add login endpoint', status: 'pending' as const }
        ]
      },
      {
        phase: 2,
        name: 'Implementation',
        type: 'implementation',
        subtasks: [
          { id: 'task-3', description: 'Implement JWT validation', status: 'pending' as const },
          { id: 'task-4', description: 'Add session management', status: 'pending' as const },
          { id: 'task-5', description: 'Create user profile UI', status: 'pending' as const }
        ]
      }
    ],
    final_acceptance: ['All tests pass', 'Security audit complete'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    spec_file: 'specs/001-auth.md'
  };

  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render PlanApproval component', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      expect(screen.getByText(/user authentication feature/i)).toBeInTheDocument();
    });

    it('should render PlanSummary with correct stats', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // 5 total subtasks across all phases
      expect(screen.getByText(/5/)).toBeInTheDocument();
      // 2 phases
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should render CommentsPanel', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      expect(screen.getByPlaceholderText(/add comments/i)).toBeInTheDocument();
    });

    it('should render approve and reject buttons', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  describe('Plan Summary Display', () => {
    it('should display plan title', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      expect(screen.getByText(/user authentication feature/i)).toBeInTheDocument();
    });

    it('should display total subtasks count', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // 5 subtasks total
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it('should display phases count', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // 2 phases
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should calculate and display estimated effort', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // Check for effort display (calculated as subtasks * 2 hours)
      // Use more specific text to avoid matching character count
      expect(screen.getByText(/10 hours/)).toBeInTheDocument(); // 5 subtasks * 2 hours
    });
  });

  describe('Comments Panel', () => {
    it('should allow typing comments', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const textarea = screen.getByPlaceholderText(/add comments/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Looks good to me!' } });

      expect(textarea.value).toBe('Looks good to me!');
    });

    it('should show character count', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const textarea = screen.getByPlaceholderText(/add comments/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });

      expect(screen.getByText(/4/)).toBeInTheDocument();
    });

    it('should limit comments to max length', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const textarea = screen.getByPlaceholderText(/add comments/i);
      const longText = 'a'.repeat(1100); // Exceeds 1000 char limit
      fireEvent.change(textarea, { target: { value: longText } });

      expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Approve Action', () => {
    it('should show confirmation dialog when approve is clicked', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm approval/i)).toBeInTheDocument();
      });
    });

    it('should call onApprove when confirmation is accepted', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // Click approve button
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // Confirm in dialog
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith(undefined);
      });
    });

    it('should include comments in onApprove call', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // Add comment
      const textarea = screen.getByPlaceholderText(/add comments/i);
      fireEvent.change(textarea, { target: { value: 'Approved with minor notes' } });

      // Click approve
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // Confirm
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith('Approved with minor notes');
      });
    });

    it('should not call onApprove when dialog is cancelled', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      expect(mockOnApprove).not.toHaveBeenCalled();
    });
  });

  describe('Reject Action', () => {
    it('should show confirmation dialog when reject is clicked', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm rejection/i)).toBeInTheDocument();
      });
    });

    it('should call onReject when confirmation is accepted', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // Click reject button
      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      // Confirm in dialog
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith(undefined);
      });
    });

    it('should include comments in onReject call', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // Add comment
      const textarea = screen.getByPlaceholderText(/add comments/i);
      fireEvent.change(textarea, { target: { value: 'Needs more detail' } });

      // Click reject
      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      // Confirm
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith('Needs more detail');
      });
    });

    it('should not call onReject when dialog is cancelled', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      expect(mockOnReject).not.toHaveBeenCalled();
    });
  });

  describe('i18n Integration', () => {
    it('should use translation keys for all UI text', () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      // Check that buttons use translations
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('should translate dialog text', async () => {
      render(
        <PlanApproval plan={mockPlan} onApprove={mockOnApprove} onReject={mockOnReject} />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm approval/i)).toBeInTheDocument();
      });
    });
  });
});
