/**
 * PatternCard - Display individual learning pattern
 *
 * Shows pattern name, confidence, category badge, description, and tags
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: string;
  confidence: number;
  tags: string[];
  appliedCount?: number;
  successRate?: number;
}

interface PatternCardProps {
  pattern: Pattern;
}

export function PatternCard({ pattern }: PatternCardProps) {
  const { t } = useTranslation(['learning']);

  // Format confidence as percentage
  const confidencePercent = Math.round(pattern.confidence * 100);

  // Get category badge variant
  const getCategoryVariant = (category: string): 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'purple' => {
    const categoryMap: Record<string, 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'purple'> = {
      typescript: 'info',
      react: 'purple',
      testing: 'success',
      'error-handling': 'warning',
    };
    return categoryMap[category] || 'default';
  };

  return (
    <Card role="article" className="hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{pattern.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getCategoryVariant(pattern.category)}>
              {pattern.category}
            </Badge>
            <span className="text-sm font-semibold text-primary">
              {confidencePercent}%
            </span>
          </div>
        </div>
        <CardDescription>{pattern.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tags */}
          {pattern.tags && pattern.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pattern.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          {(pattern.appliedCount !== undefined || pattern.successRate !== undefined) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {pattern.appliedCount !== undefined && (
                <div>
                  <span className="font-medium">{t('learning:patterns.card.appliedCount')}:</span>{' '}
                  {pattern.appliedCount} {t('learning:patterns.card.times')}
                </div>
              )}
              {pattern.successRate !== undefined && (
                <div>
                  <span className="font-medium">{t('learning:patterns.card.successRate')}:</span>{' '}
                  {Math.round(pattern.successRate * 100)}%
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
