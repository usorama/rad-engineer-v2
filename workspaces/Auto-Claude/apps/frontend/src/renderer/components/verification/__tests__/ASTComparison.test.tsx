/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ASTComparison } from '../ASTComparison';
import { CodeDiffViewer } from '../CodeDiffViewer';
import { SimilarityGauges } from '../SimilarityGauges';
import i18n from '../../../../shared/i18n';

// Mock window.api.vac
const mockCompareAST = vi.fn();

// Set up window.api.vac mock before tests run
if (typeof window !== 'undefined') {
  (window as any).api = {
    vac: {
      compareAST: mockCompareAST,
      getAllContracts: vi.fn(),
      getContract: vi.fn(),
      runVerification: vi.fn(),
      getVerificationHistory: vi.fn(),
      checkDrift: vi.fn(),
      getDriftHistory: vi.fn()
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCompareAST.mockReset();
});

// Test data: AST comparison result
const mockComparisonResult = {
  file1: 'src/components/Button.tsx',
  file2: 'src/components/ButtonNew.tsx',
  code1: `function Button({ label }) {
  return <button>{label}</button>;
}`,
  code2: `function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}`,
  addedLines: [
    { lineNumber: 1, content: 'function Button({ label, onClick }) {' },
    { lineNumber: 2, content: '  return <button onClick={onClick}>{label}</button>;' }
  ],
  removedLines: [
    { lineNumber: 1, content: 'function Button({ label }) {' },
    { lineNumber: 2, content: '  return <button>{label}</button>;' }
  ],
  structuralSimilarity: 85,
  contentSimilarity: 92
};

describe('ASTComparison - Component Structure', () => {
  it('should render file selectors', () => {
    render(<ASTComparison />);

    expect(screen.getByText(i18n.t('verification:astComparison.selectFiles'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'))).toBeInTheDocument();
  });

  it('should render compare button', () => {
    render(<ASTComparison />);

    expect(screen.getByText(i18n.t('verification:astComparison.compareButton'))).toBeInTheDocument();
  });

  it('should disable compare button when files are not selected', () => {
    render(<ASTComparison />);

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    expect(compareButton).toBeDisabled();
  });
});

describe('ASTComparison - File Selection', () => {
  it('should enable compare button when both files are selected', () => {
    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    expect(compareButton).not.toBeDisabled();
  });

  it('should clear comparison results when files change', async () => {
    mockCompareAST.mockResolvedValue(mockComparisonResult);

    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    fireEvent.click(compareButton);

    await waitFor(() => {
      expect(screen.getByText(/85/)).toBeInTheDocument();
    });

    // Change file1
    fireEvent.change(file1Input, { target: { value: 'src/components/Other.tsx' } });

    // Results should be cleared
    expect(screen.queryByText(/85/)).not.toBeInTheDocument();
  });
});

describe('ASTComparison - Comparison Execution', () => {
  it('should call compareAST API when compare button is clicked', async () => {
    mockCompareAST.mockResolvedValue(mockComparisonResult);

    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    fireEvent.click(compareButton);

    await waitFor(() => {
      expect(mockCompareAST).toHaveBeenCalledWith('src/components/Button.tsx', 'src/components/ButtonNew.tsx');
    });
  });

  it('should show loading state while comparing', async () => {
    mockCompareAST.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockComparisonResult), 100)));

    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    fireEvent.click(compareButton);

    expect(screen.getByText(i18n.t('verification:astComparison.comparing'))).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(i18n.t('verification:astComparison.comparing'))).not.toBeInTheDocument();
    });
  });

  it('should display error message when comparison fails', async () => {
    mockCompareAST.mockRejectedValue(new Error('Comparison failed'));

    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    fireEvent.click(compareButton);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:astComparison.error'))).toBeInTheDocument();
    });
  });
});

describe('ASTComparison - Results Display', () => {
  beforeEach(() => {
    mockCompareAST.mockResolvedValue(mockComparisonResult);
  });

  it('should display similarity gauges after successful comparison', async () => {
    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    fireEvent.click(compareButton);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:astComparison.structuralSimilarity'))).toBeInTheDocument();
    });

    expect(screen.getByText(i18n.t('verification:astComparison.contentSimilarity'))).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('should display code diff viewer after successful comparison', async () => {
    render(<ASTComparison />);

    const file1Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file1Placeholder'));
    const file2Input = screen.getByPlaceholderText(i18n.t('verification:astComparison.file2Placeholder'));

    fireEvent.change(file1Input, { target: { value: 'src/components/Button.tsx' } });
    fireEvent.change(file2Input, { target: { value: 'src/components/ButtonNew.tsx' } });

    const compareButton = screen.getByText(i18n.t('verification:astComparison.compareButton'));
    fireEvent.click(compareButton);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('verification:astComparison.codeDiff'))).toBeInTheDocument();
    });

    // Should show file names
    expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/components/ButtonNew.tsx')).toBeInTheDocument();
  });
});

describe('CodeDiffViewer - Component', () => {
  it('should display side-by-side code comparison', () => {

    render(
      <CodeDiffViewer
        file1="src/test1.ts"
        file2="src/test2.ts"
        code1="const x = 1;"
        code2="const x = 2;"
        addedLines={[{ lineNumber: 1, content: 'const x = 2;' }]}
        removedLines={[{ lineNumber: 1, content: 'const x = 1;' }]}
      />
    );

    expect(screen.getByText('src/test1.ts')).toBeInTheDocument();
    expect(screen.getByText('src/test2.ts')).toBeInTheDocument();
  });

  it('should highlight added lines in green', () => {

    const { container } = render(
      <CodeDiffViewer
        file1="src/test1.ts"
        file2="src/test2.ts"
        code1=""
        code2="const x = 2;"
        addedLines={[{ lineNumber: 1, content: 'const x = 2;' }]}
        removedLines={[]}
      />
    );

    const addedElements = container.querySelectorAll('.bg-green-500\\/10');
    expect(addedElements.length).toBeGreaterThan(0);
  });

  it('should highlight removed lines in red', () => {

    const { container } = render(
      <CodeDiffViewer
        file1="src/test1.ts"
        file2="src/test2.ts"
        code1="const x = 1;"
        code2=""
        addedLines={[]}
        removedLines={[{ lineNumber: 1, content: 'const x = 1;' }]}
      />
    );

    const removedElements = container.querySelectorAll('.bg-red-500\\/10');
    expect(removedElements.length).toBeGreaterThan(0);
  });
});

describe('SimilarityGauges - Component', () => {
  it('should display structural and content similarity percentages', () => {

    render(<SimilarityGauges structuralSimilarity={85} contentSimilarity={92} />);

    expect(screen.getByText(i18n.t('verification:astComparison.structuralSimilarity'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('verification:astComparison.contentSimilarity'))).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('should clamp similarity values to 0-100 range', () => {

    render(<SimilarityGauges structuralSimilarity={150} contentSimilarity={-10} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should use different colors based on similarity percentage', () => {

    const { container: container1 } = render(<SimilarityGauges structuralSimilarity={95} contentSimilarity={95} />);
    const highSimilarityElements = container1.querySelectorAll('.text-green-500');
    expect(highSimilarityElements.length).toBeGreaterThan(0);

    const { container: container2 } = render(<SimilarityGauges structuralSimilarity={50} contentSimilarity={50} />);
    const mediumSimilarityElements = container2.querySelectorAll('.text-orange-500');
    expect(mediumSimilarityElements.length).toBeGreaterThan(0);

    const { container: container3 } = render(<SimilarityGauges structuralSimilarity={20} contentSimilarity={20} />);
    const lowSimilarityElements = container3.querySelectorAll('.text-red-500');
    expect(lowSimilarityElements.length).toBeGreaterThan(0);
  });
});
