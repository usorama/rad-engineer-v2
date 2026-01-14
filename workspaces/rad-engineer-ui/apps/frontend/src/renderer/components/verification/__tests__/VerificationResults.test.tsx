/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { VerificationResults } from '../VerificationResults';
import i18n from '../../../../shared/i18n';

// Test data: Verification results
const mockPassedResult = {
  contractId: 'contract-1',
  contractName: 'User Authentication Contract',
  timestamp: Date.now(),
  preconditionsResults: [
    { condition: 'User credentials must be provided', passed: true, error: null },
    { condition: 'Database connection must be active', passed: true, error: null }
  ],
  postconditionsResults: [
    { condition: 'User session token is generated', passed: true, error: null },
    { condition: 'Session is stored in database', passed: true, error: null }
  ],
  invariantsResults: [
    { condition: 'Password must never be logged', passed: true, error: null },
    { condition: 'Session must expire after 24 hours', passed: true, error: null }
  ],
  overallStatus: 'passed' as const
};

const mockFailedResult = {
  contractId: 'contract-2',
  contractName: 'File Upload Contract',
  timestamp: Date.now(),
  preconditionsResults: [
    { condition: 'File size must be < 10MB', passed: true, error: null },
    { condition: 'File type must be allowed', passed: false, error: 'Invalid file type: .exe' }
  ],
  postconditionsResults: [
    { condition: 'File is stored in S3', passed: false, error: 'S3 connection timeout' },
    { condition: 'Database record is created', passed: true, error: null }
  ],
  invariantsResults: [
    { condition: 'Original filename is preserved', passed: true, error: null },
    { condition: 'Upload must be atomic', passed: false, error: 'Partial upload detected' }
  ],
  overallStatus: 'failed' as const
};

describe('VerificationResults - Component Structure', () => {
  it('should render results with contract name and timestamp', () => {
    render(<VerificationResults result={mockPassedResult} />);

    // Should display title
    expect(screen.getByText(i18n.t('verification:results.title'))).toBeInTheDocument();

    // Should display contract name
    expect(screen.getByText('User Authentication Contract')).toBeInTheDocument();

    // Should display timestamp label (may be split by elements, use regex)
    expect(screen.getByText(/Verified at/i)).toBeInTheDocument();
  });

  it('should render three sections: preconditions, postconditions, invariants', () => {
    render(<VerificationResults result={mockPassedResult} />);

    // Should have preconditions section
    expect(screen.getByText(i18n.t('verification:results.preconditions'))).toBeInTheDocument();

    // Should have postconditions section
    expect(screen.getByText(i18n.t('verification:results.postconditions'))).toBeInTheDocument();

    // Should have invariants section
    expect(screen.getByText(i18n.t('verification:results.invariants'))).toBeInTheDocument();
  });

  it('should display overall status badge', () => {
    render(<VerificationResults result={mockPassedResult} />);

    // Should show passed status
    expect(screen.getByText(i18n.t('verification:results.status.passed'))).toBeInTheDocument();
  });
});

describe('VerificationResults - Passed Verification', () => {
  it('should display all passed conditions with check icons', () => {
    render(<VerificationResults result={mockPassedResult} />);

    // Should display preconditions
    expect(screen.getByText('User credentials must be provided')).toBeInTheDocument();
    expect(screen.getByText('Database connection must be active')).toBeInTheDocument();

    // Should display postconditions
    expect(screen.getByText('User session token is generated')).toBeInTheDocument();
    expect(screen.getByText('Session is stored in database')).toBeInTheDocument();

    // Should display invariants
    expect(screen.getByText('Password must never be logged')).toBeInTheDocument();
    expect(screen.getByText('Session must expire after 24 hours')).toBeInTheDocument();
  });

  it('should show summary with total conditions tested', () => {
    render(<VerificationResults result={mockPassedResult} />);

    // Should show summary label
    expect(screen.getByText(i18n.t('verification:results.summary'))).toBeInTheDocument();

    // Should show total conditions (2 pre + 2 post + 2 inv = 6) - use more specific selector
    const summarySection = screen.getByText(i18n.t('verification:results.summary')).closest('div');
    expect(summarySection).toHaveTextContent('6');
    expect(summarySection).toHaveTextContent('conditions tested');
  });
});

describe('VerificationResults - Failed Verification', () => {
  it('should display failed status badge', () => {
    render(<VerificationResults result={mockFailedResult} />);

    // Should show failed status
    expect(screen.getByText(i18n.t('verification:results.status.failed'))).toBeInTheDocument();
  });

  it('should display failed conditions with error messages', () => {
    render(<VerificationResults result={mockFailedResult} />);

    // Should display failed precondition
    expect(screen.getByText('File type must be allowed')).toBeInTheDocument();
    expect(screen.getByText('Invalid file type: .exe')).toBeInTheDocument();

    // Should display failed postcondition
    expect(screen.getByText('File is stored in S3')).toBeInTheDocument();
    expect(screen.getByText('S3 connection timeout')).toBeInTheDocument();

    // Should display failed invariant
    expect(screen.getByText('Upload must be atomic')).toBeInTheDocument();
    expect(screen.getByText('Partial upload detected')).toBeInTheDocument();
  });

  it('should show passed conditions alongside failed ones', () => {
    render(<VerificationResults result={mockFailedResult} />);

    // Should display passed conditions
    expect(screen.getByText('File size must be < 10MB')).toBeInTheDocument();
    expect(screen.getByText('Database record is created')).toBeInTheDocument();
    expect(screen.getByText('Original filename is preserved')).toBeInTheDocument();
  });

  it('should show failure summary with counts', () => {
    render(<VerificationResults result={mockFailedResult} />);

    // Should show failures label
    expect(screen.getByText(i18n.t('verification:results.failureCount'))).toBeInTheDocument();

    // Should show failure count (1 pre + 1 post + 1 inv = 3 failures) - use more specific selector
    const failureSection = screen.getByText(i18n.t('verification:results.failureCount')).closest('div');
    expect(failureSection).toHaveTextContent('3');
  });
});

describe('VerificationResults - Condition Display', () => {
  it('should visually differentiate passed and failed conditions', () => {
    const { container } = render(<VerificationResults result={mockFailedResult} />);

    // Get all condition items
    const conditionItems = container.querySelectorAll('[data-testid^="condition-"]');

    // Should have some items marked as passed and some as failed
    const passedItems = Array.from(conditionItems).filter(
      (item) => item.getAttribute('data-status') === 'passed'
    );
    const failedItems = Array.from(conditionItems).filter(
      (item) => item.getAttribute('data-status') === 'failed'
    );

    expect(passedItems.length).toBeGreaterThan(0);
    expect(failedItems.length).toBeGreaterThan(0);
  });

  it('should show error messages only for failed conditions', () => {
    render(<VerificationResults result={mockFailedResult} />);

    // Failed conditions should have error messages
    expect(screen.getByText('Invalid file type: .exe')).toBeInTheDocument();
    expect(screen.getByText('S3 connection timeout')).toBeInTheDocument();
    expect(screen.getByText('Partial upload detected')).toBeInTheDocument();

    // Passed conditions should NOT have error messages displayed
    const passedConditionText = screen.getByText('File size must be < 10MB');
    const parent = passedConditionText.closest('[data-testid^="condition-"]');
    expect(parent?.textContent).not.toContain('error');
  });
});

describe('VerificationResults - Empty Results', () => {
  it('should handle results with no conditions gracefully', () => {
    const emptyResult = {
      contractId: 'contract-3',
      contractName: 'Empty Contract',
      timestamp: Date.now(),
      preconditionsResults: [],
      postconditionsResults: [],
      invariantsResults: [],
      overallStatus: 'passed' as const
    };

    render(<VerificationResults result={emptyResult} />);

    // Should still render sections
    expect(screen.getByText(i18n.t('verification:results.preconditions'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('verification:results.postconditions'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('verification:results.invariants'))).toBeInTheDocument();

    // Should show 0 conditions tested - use more specific selector
    const summarySection = screen.getByText(i18n.t('verification:results.summary')).closest('div');
    expect(summarySection).toHaveTextContent('0');
  });
});
