import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { CodeDiffViewer } from './CodeDiffViewer';
import { SimilarityGauges } from './SimilarityGauges';

interface DiffLine {
  lineNumber: number;
  content: string;
}

interface ComparisonResult {
  file1: string;
  file2: string;
  code1: string;
  code2: string;
  addedLines: DiffLine[];
  removedLines: DiffLine[];
  structuralSimilarity: number;
  contentSimilarity: number;
}

export function ASTComparison(): JSX.Element {
  const { t } = useTranslation('verification');
  const [file1, setFile1] = useState('');
  const [file2, setFile2] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  // Clear results when files change
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file1, file2]);

  const handleCompare = async (): Promise<void> => {
    if (!file1 || !file2) return;

    setIsComparing(true);
    setError(null);

    try {
      const comparisonResult = await window.api.vac.compareAST(file1, file2);
      setResult(comparisonResult);
    } catch (err) {
      setError(t('astComparison.error'));
      console.error('AST comparison failed:', err);
    } finally {
      setIsComparing(false);
    }
  };

  const canCompare = file1.trim() !== '' && file2.trim() !== '';

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{t('astComparison.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('astComparison.description')}</p>
      </div>

      {/* File Selectors */}
      <div className="flex flex-col space-y-4 p-4 bg-muted/30 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground">{t('astComparison.selectFiles')}</h3>
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={file1}
              onChange={(e) => setFile1(e.target.value)}
              placeholder={t('astComparison.file1Placeholder')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={file2}
              onChange={(e) => setFile2(e.target.value)}
              placeholder={t('astComparison.file2Placeholder')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleCompare}
            disabled={!canCompare || isComparing}
            className="min-w-32"
          >
            {isComparing ? t('astComparison.comparing') : t('astComparison.compareButton')}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col space-y-6">
          {/* Similarity Gauges */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <SimilarityGauges
              structuralSimilarity={result.structuralSimilarity}
              contentSimilarity={result.contentSimilarity}
            />
          </div>

          {/* Code Diff Viewer */}
          <CodeDiffViewer
            file1={result.file1}
            file2={result.file2}
            code1={result.code1}
            code2={result.code2}
            addedLines={result.addedLines}
            removedLines={result.removedLines}
          />
        </div>
      )}

      {/* Empty State */}
      {!result && !isComparing && !error && canCompare && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('astComparison.selectFiles')}
          </p>
        </div>
      )}
    </div>
  );
}
