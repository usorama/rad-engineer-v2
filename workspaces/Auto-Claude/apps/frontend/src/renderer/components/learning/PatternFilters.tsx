/**
 * PatternFilters - Filter controls for pattern browser
 *
 * Provides category select, confidence range slider, and clear button
 */
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface PatternFiltersProps {
  selectedCategory: string;
  minConfidence: number;
  onCategoryChange: (category: string) => void;
  onMinConfidenceChange: (confidence: number) => void;
  onClear: () => void;
  categories: string[];
}

export function PatternFilters({
  selectedCategory,
  minConfidence,
  onCategoryChange,
  onMinConfidenceChange,
  onClear,
  categories,
}: PatternFiltersProps) {
  const { t } = useTranslation(['learning']);

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('learning:patterns.filters.category')}</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('learning:patterns.filters.clear')}
        </Button>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <Label htmlFor="category-select">{t('learning:patterns.filters.category')}</Label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger id="category-select">
            <SelectValue placeholder={t('learning:patterns.filters.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Confidence Filter */}
      <div className="space-y-2">
        <Label htmlFor="confidence-slider">
          {t('learning:patterns.filters.minConfidence')}: {minConfidence}%
        </Label>
        <input
          id="confidence-slider"
          type="range"
          min="0"
          max="100"
          value={minConfidence}
          onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
          aria-label={t('learning:patterns.filters.minConfidence')}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${minConfidence}%, hsl(var(--muted)) ${minConfidence}%, hsl(var(--muted)) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
