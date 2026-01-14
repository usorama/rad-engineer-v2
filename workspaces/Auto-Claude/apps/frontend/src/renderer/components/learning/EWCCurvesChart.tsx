/**
 * EWCCurvesChart - Area chart showing knowledge consolidation curves
 *
 * Displays short-term, medium-term, and long-term knowledge retention
 * using exponentially weighted consolidation (EWC) curves
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface EWCCurvesData {
  shortTerm: DataPoint[];
  mediumTerm: DataPoint[];
  longTerm: DataPoint[];
}

interface EWCCurvesResponse {
  success: boolean;
  data?: EWCCurvesData;
  error?: string;
}

export function EWCCurvesChart() {
  const { t } = useTranslation(['learning', 'common']);
  const [data, setData] = useState<EWCCurvesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurves = async () => {
      try {
        setLoading(true);
        setError(null);

        const result: EWCCurvesResponse = await window.api.learning.getEWCCurves();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || t('learning:dashboard.errors.loadCurves'));
        }
      } catch (_err) {
        setError(t('learning:dashboard.errors.loadCurves'));
      } finally {
        setLoading(false);
      }
    };

    fetchCurves();
  }, [t]);

  if (loading) {
    return <div>{t('common:labels.loading')}</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  if (!data || data.shortTerm.length === 0) {
    return <div className="text-muted-foreground">{t('learning:dashboard.errors.noData')}</div>;
  }

  // Calculate chart dimensions
  const width = 600;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Combine all data points to find min/max
  const allPoints = [...data.shortTerm, ...data.mediumTerm, ...data.longTerm];
  const timestamps = allPoints.map(d => d.timestamp);
  const values = allPoints.map(d => d.value);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const minValue = 0; // Start from 0 for better visualization
  const maxValue = Math.max(...values);

  // Scale functions
  const scaleX = (timestamp: number) => {
    return padding + (timestamp - minTime) / (maxTime - minTime) * chartWidth;
  };

  const scaleY = (value: number) => {
    return height - padding - (value - minValue) / (maxValue - minValue) * chartHeight;
  };

  // Generate area path for a curve
  const generateAreaPath = (points: DataPoint[]) => {
    if (points.length === 0) return '';

    const linePath = points.map((point, index) => {
      const x = scaleX(point.timestamp);
      const y = scaleY(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Close the path to create an area
    const firstX = scaleX(points[0].timestamp);
    const lastX = scaleX(points[points.length - 1].timestamp);
    const baseline = height - padding;

    return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  };

  // Format date for labels
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div data-testid="ewc-curves-chart">
      <svg width={width} height={height} className="border rounded">
        {/* Y-axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground"
        />

        {/* X-axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground"
        />

        {/* Y-axis label */}
        <text
          x={10}
          y={height / 2}
          className="text-xs fill-muted-foreground"
          textAnchor="middle"
          transform={`rotate(-90 10 ${height / 2})`}
        >
          {t('learning:charts.knowledgeConsolidation')}
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 5}
          className="text-xs fill-muted-foreground"
          textAnchor="middle"
        >
          {t('learning:charts.time')}
        </text>

        {/* Long-term curve (bottom layer) */}
        <path
          d={generateAreaPath(data.longTerm)}
          fill="hsl(var(--primary))"
          fillOpacity="0.2"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* Medium-term curve (middle layer) */}
        <path
          d={generateAreaPath(data.mediumTerm)}
          fill="hsl(var(--primary))"
          fillOpacity="0.4"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* Short-term curve (top layer) */}
        <path
          d={generateAreaPath(data.shortTerm)}
          fill="hsl(var(--primary))"
          fillOpacity="0.6"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* X-axis labels (first, middle, last) */}
        {[0, Math.floor(data.shortTerm.length / 2), data.shortTerm.length - 1].map((index) => {
          const point = data.shortTerm[index];
          if (!point) return null;
          return (
            <text
              key={index}
              x={scaleX(point.timestamp)}
              y={height - padding + 20}
              className="text-xs fill-muted-foreground"
              textAnchor="middle"
            >
              {formatDate(point.timestamp)}
            </text>
          );
        })}

        {/* Y-axis labels */}
        {[minValue, (minValue + maxValue) / 2, maxValue].map((value, index) => (
          <text
            key={index}
            x={padding - 10}
            y={scaleY(value) + 4}
            className="text-xs fill-muted-foreground"
            textAnchor="end"
          >
            {value.toFixed(2)}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary))', opacity: 0.6 }} />
          <span>{t('learning:charts.shortTerm')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary))', opacity: 0.4 }} />
          <span>{t('learning:charts.mediumTerm')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary))', opacity: 0.2 }} />
          <span>{t('learning:charts.longTerm')}</span>
        </div>
      </div>
    </div>
  );
}
