import React from 'react';
import { useTranslation } from 'react-i18next';

interface SimilarityGaugesProps {
  structuralSimilarity: number;
  contentSimilarity: number;
}

export function SimilarityGauges({ structuralSimilarity, contentSimilarity }: SimilarityGaugesProps): JSX.Element {
  const { t } = useTranslation('verification');

  // Clamp values to 0-100 range
  const clampedStructural = Math.max(0, Math.min(100, structuralSimilarity));
  const clampedContent = Math.max(0, Math.min(100, contentSimilarity));

  // Color based on similarity percentage
  const getColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    if (percentage >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBackgroundColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500/10';
    if (percentage >= 60) return 'bg-yellow-500/10';
    if (percentage >= 40) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  };

  const renderGauge = (label: string, percentage: number) => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const color = getColor(clampedPercentage);
    const backgroundColor = getBackgroundColor(clampedPercentage);

    return (
      <div className="flex flex-col items-center space-y-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`relative w-32 h-32 rounded-full ${backgroundColor} flex items-center justify-center`}>
          <div className="relative">
            <svg className="w-24 h-24" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted opacity-20"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={color}
                strokeDasharray={`${(clampedPercentage / 100) * 251.2} 251.2`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${color}`}>{clampedPercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center space-x-12 p-6">
      {renderGauge(t('astComparison.structuralSimilarity'), clampedStructural)}
      {renderGauge(t('astComparison.contentSimilarity'), clampedContent)}
    </div>
  );
}
