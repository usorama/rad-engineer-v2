/**
 * DecisionLog - Transparency view of all decisions
 * Phase 7: Frontend UI Integration
 *
 * Displays:
 * - All decisions made during execution
 * - Decision rationale and alternatives
 * - Confidence scores
 * - Export functionality
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, RotateCcw, SkipForward, HelpCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface DecisionEntry {
  id: string;
  stepId: string;
  timestamp: string;
  category: 'RETRY' | 'SKIP' | 'APPROACH' | 'RECOVERY' | 'ABORT';
  decision: string;
  rationale: string;
  alternatives?: string[];
  confidence: number;
}

interface DecisionLogProps {
  decisions: DecisionEntry[];
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  loading?: boolean;
}

const DecisionLog: React.FC<DecisionLogProps> = ({
  decisions,
  onExportMarkdown,
  onExportJson,
  loading,
}) => {
  const { t } = useTranslation(['execution', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getCategoryIcon = (category: DecisionEntry['category']) => {
    switch (category) {
      case 'RETRY':
        return <RotateCcw className="h-4 w-4 text-blue-500" />;
      case 'SKIP':
        return <SkipForward className="h-4 w-4 text-amber-500" />;
      case 'APPROACH':
        return <Lightbulb className="h-4 w-4 text-green-500" />;
      case 'RECOVERY':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'ABORT':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: DecisionEntry['category']) => {
    switch (category) {
      case 'RETRY':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      case 'SKIP':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20';
      case 'APPROACH':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'RECOVERY':
        return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
      case 'ABORT':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      default:
        return 'border-muted bg-muted/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const categories = ['all', 'RETRY', 'SKIP', 'APPROACH', 'RECOVERY', 'ABORT'];

  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      // Category filter
      if (categoryFilter !== 'all' && decision.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          decision.decision.toLowerCase().includes(query) ||
          decision.rationale.toLowerCase().includes(query) ||
          decision.stepId.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [decisions, categoryFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {t('common:labels.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('execution:decisions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? t('execution:decisions.allCategories') : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {onExportMarkdown && (
            <Button variant="outline" size="sm" onClick={onExportMarkdown}>
              <Download className="mr-2 h-4 w-4" />
              {t('execution:decisions.exportMarkdown')}
            </Button>
          )}
          {onExportJson && (
            <Button variant="outline" size="sm" onClick={onExportJson}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {categories.slice(1).map((cat) => {
          const count = decisions.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
              className={cn(
                'rounded-lg border p-2 text-center transition-colors hover:bg-accent',
                categoryFilter === cat && 'ring-2 ring-primary'
              )}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">{cat}</div>
            </button>
          );
        })}
      </div>

      {/* Decision list */}
      {filteredDecisions.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          {searchQuery || categoryFilter !== 'all'
            ? t('execution:decisions.noMatchingDecisions')
            : t('execution:decisions.noDecisions')}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map((decision) => {
            const isExpanded = expandedIds.has(decision.id);

            return (
              <div
                key={decision.id}
                className={cn(
                  'rounded-lg border transition-colors',
                  getCategoryColor(decision.category)
                )}
              >
                <button
                  onClick={() => toggleExpanded(decision.id)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getCategoryIcon(decision.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium">{decision.decision}</span>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTimestamp(decision.timestamp)}</span>
                          <span>•</span>
                          <span className="font-mono">{decision.stepId}</span>
                          <span>•</span>
                          <span className={getConfidenceColor(decision.confidence)}>
                            {Math.round(decision.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        <div>
                          <h5 className="text-sm font-medium mb-1">{t('execution:decisions.rationale')}</h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {decision.rationale}
                          </p>
                        </div>

                        {decision.alternatives && decision.alternatives.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-1">{t('execution:decisions.alternatives')}</h5>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {decision.alternatives.map((alt, idx) => (
                                <li key={idx}>{alt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DecisionLog;
