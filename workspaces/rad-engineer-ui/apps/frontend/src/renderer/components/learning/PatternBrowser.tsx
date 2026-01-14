/**
 * PatternBrowser - Container for browsing learned patterns
 *
 * Displays patterns with search, filtering, and card-based layout
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { PatternCard, type Pattern } from './PatternCard';
import { PatternFilters } from './PatternFilters';

interface PatternsResponse {
  success: boolean;
  data?: Pattern[];
  error?: string;
}

export function PatternBrowser() {
  const { t } = useTranslation(['learning', 'common']);
  const [allPatterns, setAllPatterns] = useState<Pattern[]>([]);
  const [displayedPatterns, setDisplayedPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch patterns on mount
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        setLoading(true);
        setError(null);

        const result: PatternsResponse = await window.api.learning.getPatterns();

        if (result.success && result.data) {
          setAllPatterns(result.data);
          setDisplayedPatterns(result.data);

          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(result.data.map((p) => p.category))
          ).sort();
          setCategories(uniqueCategories);
        } else {
          setError(result.error || t('learning:patterns.errors.loadFailed'));
        }
      } catch (_err) {
        setError(t('learning:patterns.errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, [t]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        applyFilters(allPatterns);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Apply filters when filter state changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      applyFilters(allPatterns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, minConfidence, allPatterns]);

  const handleSearch = async (query: string) => {
    try {
      const result: PatternsResponse = await window.api.learning.searchPatterns(query);

      if (result.success && result.data) {
        applyFilters(result.data);
      } else {
        setDisplayedPatterns([]);
      }
    } catch (_err) {
      setDisplayedPatterns([]);
    }
  };

  const applyFilters = useCallback(
    (patterns: Pattern[]) => {
      let filtered = patterns;

      // Filter by category
      if (selectedCategory !== 'all') {
        filtered = filtered.filter((p) => p.category === selectedCategory);
      }

      // Filter by confidence
      filtered = filtered.filter((p) => p.confidence * 100 >= minConfidence);

      setDisplayedPatterns(filtered);
    },
    [selectedCategory, minConfidence]
  );

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setMinConfidence(0);
    setSearchQuery('');
    setDisplayedPatterns(allPatterns);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('common:labels.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('learning:patterns.title')}</h2>
      </div>

      {/* Search */}
      <div>
        <Input
          type="search"
          placeholder={t('learning:patterns.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Main Content */}
      <div className="flex gap-6 flex-1">
        {/* Filters Sidebar */}
        <div className="w-64 flex-shrink-0">
          <PatternFilters
            selectedCategory={selectedCategory}
            minConfidence={minConfidence}
            onCategoryChange={setSelectedCategory}
            onMinConfidenceChange={setMinConfidence}
            onClear={handleClearFilters}
            categories={categories}
          />
        </div>

        {/* Patterns Grid */}
        <div className="flex-1">
          {displayedPatterns.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{t('learning:patterns.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayedPatterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
