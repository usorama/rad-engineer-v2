/**
 * MethodCard - Display individual BMAD method details
 *
 * Shows method name, domain badge, effectiveness rating, and description
 * Supports selection state and click handling
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export interface BMADMethod {
  id: string;
  name: string;
  domain: string;
  effectiveness: number;
  description: string;
  research?: string;
  whenToUse?: string;
}

interface MethodCardProps {
  method: BMADMethod;
  onSelect: (method: BMADMethod) => void;
  isSelected?: boolean;
}

export function MethodCard({ method, onSelect, isSelected = false }: MethodCardProps) {
  const { t } = useTranslation(['learning']);

  const effectivenessPercent = Math.round(method.effectiveness * 100);

  // Determine effectiveness color based on rating
  const getEffectivenessColor = (effectiveness: number): string => {
    if (effectiveness >= 0.8) return 'text-green-600';
    if (effectiveness >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const effectivenessColor = getEffectivenessColor(method.effectiveness);

  return (
    <button
      onClick={() => onSelect(method)}
      className={cn(
        'w-full text-left transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'rounded-lg'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(method);
        }
      }}
    >
      <Card
        className={cn(
          'hover:bg-accent/50 transition-colors cursor-pointer',
          isSelected && 'border-primary border-2'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{method.name}</CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {method.domain}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {t('learning:methodSelector.card.effectiveness')}:
            </span>
            <span className={cn('text-sm font-bold', effectivenessColor)}>
              {effectivenessPercent}%
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">{method.description}</CardDescription>
        </CardContent>
      </Card>
    </button>
  );
}
