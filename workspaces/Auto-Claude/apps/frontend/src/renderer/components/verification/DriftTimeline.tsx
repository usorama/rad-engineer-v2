import React from 'react';

export interface DriftDataPoint {
  timestamp: number;
  driftPercentage: number;
}

interface DriftTimelineProps {
  history: DriftDataPoint[];
}

export function DriftTimeline({ history }: DriftTimelineProps): JSX.Element {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No history data available
      </div>
    );
  }

  // SVG dimensions
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min/max for scaling
  const timestamps = history.map((d) => d.timestamp);
  const percentages = history.map((d) => d.driftPercentage);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const minPercentage = 0; // Always start at 0
  const maxPercentage = Math.max(100, Math.max(...percentages)); // At least 100

  // Scale functions
  const scaleX = (timestamp: number): number => {
    if (maxTimestamp === minTimestamp) return padding.left;
    return padding.left + ((timestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * chartWidth;
  };

  const scaleY = (percentage: number): number => {
    return (
      padding.top + chartHeight - ((percentage - minPercentage) / (maxPercentage - minPercentage)) * chartHeight
    );
  };

  // Generate line path
  const linePath = history
    .map((point, index) => {
      const x = scaleX(point.timestamp);
      const y = scaleY(point.driftPercentage);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate area path (filled under line)
  const areaPath =
    linePath +
    ` L ${scaleX(history[history.length - 1].timestamp)} ${scaleY(0)} L ${scaleX(history[0].timestamp)} ${scaleY(0)} Z`;

  // Format timestamp for labels
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100];

  // X-axis ticks (show first, middle, last)
  const xTickIndices = [0, Math.floor(history.length / 2), history.length - 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="text-foreground">
        {/* Y-axis grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={scaleY(tick)}
              x2={padding.left + chartWidth}
              y2={scaleY(tick)}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.1"
            />
            <text
              x={padding.left - 10}
              y={scaleY(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs"
              fill="currentColor"
              opacity="0.6"
            >
              {tick}%
            </text>
          </g>
        ))}

        {/* Area under line */}
        <path d={areaPath} fill="currentColor" opacity="0.1" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2" />

        {/* Data points */}
        {history.map((point, index) => (
          <circle
            key={index}
            cx={scaleX(point.timestamp)}
            cy={scaleY(point.driftPercentage)}
            r="4"
            fill="currentColor"
          />
        ))}

        {/* X-axis labels */}
        {xTickIndices.map((index) => {
          const point = history[index];
          return (
            <text
              key={index}
              x={scaleX(point.timestamp)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs"
              fill="currentColor"
              opacity="0.6"
            >
              {formatTime(point.timestamp)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
