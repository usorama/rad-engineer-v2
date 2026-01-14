/**
 * QualityTrendsChart - Line chart showing quality score over time
 *
 * Fetches quality trends data via IPC and renders a simple SVG line chart
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface QualityDataPoint {
  timestamp: number;
  qualityScore: number;
}

interface QualityTrendsResponse {
  success: boolean;
  data?: QualityDataPoint[];
  error?: string;
}

export function QualityTrendsChart() {
  const { t } = useTranslation(['learning', 'common']);
  const [data, setData] = useState<QualityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        setError(null);

        const result: QualityTrendsResponse = await window.api.learning.getQualityTrends();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || t('learning:dashboard.errors.loadTrends'));
        }
      } catch (_err) {
        setError(t('learning:dashboard.errors.loadTrends'));
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [t]);

  if (loading) {
    return <div>{t('common:labels.loading')}</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="text-muted-foreground">{t('learning:dashboard.errors.noData')}</div>;
  }

  // Calculate chart dimensions
  const width = 600;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Find min/max for scaling
  const timestamps = data.map(d => d.timestamp);
  const scores = data.map(d => d.qualityScore);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Scale functions
  const scaleX = (timestamp: number) => {
    return padding + (timestamp - minTime) / (maxTime - minTime) * chartWidth;
  };

  const scaleY = (score: number) => {
    return height - padding - (score - minScore) / (maxScore - minScore) * chartHeight;
  };

  // Generate line path
  const linePath = data.map((point, index) => {
    const x = scaleX(point.timestamp);
    const y = scaleY(point.qualityScore);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Format date for labels
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div data-testid="quality-trends-chart">
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
          {t('learning:charts.qualityScore')}
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

        {/* Quality score line */}
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* Data points */}
        {data.map((point, index) => (
          <circle
            key={index}
            cx={scaleX(point.timestamp)}
            cy={scaleY(point.qualityScore)}
            r="4"
            fill="hsl(var(--primary))"
          />
        ))}

        {/* X-axis labels (first, middle, last) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((index) => {
          const point = data[index];
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
        {[minScore, (minScore + maxScore) / 2, maxScore].map((score, index) => (
          <text
            key={index}
            x={padding - 10}
            y={scaleY(score) + 4}
            className="text-xs fill-muted-foreground"
            textAnchor="end"
          >
            {score.toFixed(2)}
          </text>
        ))}
      </svg>
    </div>
  );
}
