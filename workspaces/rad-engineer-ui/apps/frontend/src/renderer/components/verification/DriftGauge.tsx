import React from 'react';

interface DriftGaugeProps {
  percentage: number;
}

export function DriftGauge({ percentage }: DriftGaugeProps): JSX.Element {
  // Clamp percentage between 0-100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Calculate SVG arc path for gauge
  // Gauge goes from -120deg to +120deg (240deg total)
  const startAngle = -120;
  const endAngle = 120;
  const totalAngle = endAngle - startAngle;
  const currentAngle = startAngle + (totalAngle * clampedPercentage) / 100;

  // Convert to radians
  const startRad = (startAngle * Math.PI) / 180;
  const currentRad = (currentAngle * Math.PI) / 180;

  // SVG parameters
  const centerX = 100;
  const centerY = 100;
  const radius = 80;

  // Calculate arc coordinates
  const startX = centerX + radius * Math.cos(startRad);
  const startY = centerY + radius * Math.sin(startRad);
  const endX = centerX + radius * Math.cos(currentRad);
  const endY = centerY + radius * Math.sin(currentRad);

  // Large arc flag (1 if angle > 180deg)
  const largeArcFlag = (currentAngle - startAngle) > 180 ? 1 : 0;

  // Color based on drift percentage
  const getColor = (pct: number): string => {
    if (pct < 10) return '#22c55e'; // green
    if (pct < 25) return '#eab308'; // yellow
    if (pct < 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const color = getColor(clampedPercentage);

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="150" viewBox="0 0 200 150" className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${centerX + radius * Math.cos((endAngle * Math.PI) / 180)} ${centerY + radius * Math.sin((endAngle * Math.PI) / 180)}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted opacity-20"
        />

        {/* Active arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Center text */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-3xl font-bold"
          fill="currentColor"
        >
          {clampedPercentage.toFixed(1)}%
        </text>
      </svg>
    </div>
  );
}
