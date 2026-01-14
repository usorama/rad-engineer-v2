import React from 'react';
import { useTranslation } from 'react-i18next';

interface DiffLine {
  lineNumber: number;
  content: string;
}

interface CodeDiffViewerProps {
  file1: string;
  file2: string;
  code1: string;
  code2: string;
  addedLines: DiffLine[];
  removedLines: DiffLine[];
}

export function CodeDiffViewer({ file1, file2, code1, code2, addedLines, removedLines }: CodeDiffViewerProps): JSX.Element {
  const { t } = useTranslation('verification');

  // Create a map of line numbers to diff types
  const removedLineNumbers = new Set(removedLines.map(line => line.lineNumber));
  const addedLineNumbers = new Set(addedLines.map(line => line.lineNumber));

  // Split code into lines
  const code1Lines = code1.split('\n');
  const code2Lines = code2.split('\n');

  const renderCodePanel = (title: string, lines: string[], diffLineNumbers: Set<number>, diffType: 'added' | 'removed') => {
    const backgroundColor = diffType === 'added' ? 'bg-green-500/10' : 'bg-red-500/10';
    const borderColor = diffType === 'added' ? 'border-green-500/30' : 'border-red-500/30';
    const diffPrefix = diffType === 'added' ? '+' : '-';

    return (
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="font-mono text-xs leading-relaxed">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isDiff = diffLineNumbers.has(lineNumber);

              return (
                <div
                  key={lineNumber}
                  className={`flex ${isDiff ? `${backgroundColor} ${borderColor} border-l-2` : ''}`}
                >
                  <span className="inline-block w-12 text-right pr-3 text-muted-foreground select-none flex-shrink-0">
                    {lineNumber}
                  </span>
                  {isDiff && (
                    <span className={`inline-block w-4 ${diffType === 'added' ? 'text-green-500' : 'text-red-500'} font-bold`}>
                      {diffPrefix}
                    </span>
                  )}
                  {!isDiff && <span className="inline-block w-4" />}
                  <span className="flex-1 pr-4 whitespace-pre-wrap break-all">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground">{t('astComparison.codeDiff')}</h3>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span className="flex items-center space-x-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
            <span>{t('astComparison.removedLines')}: {removedLines.length}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
            <span>{t('astComparison.addedLines')}: {addedLines.length}</span>
          </span>
        </div>
      </div>

      <div className="flex space-x-4 border border-border rounded-lg overflow-hidden" style={{ height: '500px' }}>
        {renderCodePanel(file1, code1Lines, removedLineNumbers, 'removed')}
        <div className="w-px bg-border" />
        {renderCodePanel(file2, code2Lines, addedLineNumbers, 'added')}
      </div>
    </div>
  );
}
