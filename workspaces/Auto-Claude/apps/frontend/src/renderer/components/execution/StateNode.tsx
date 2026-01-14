import React from 'react';
import { useTranslation } from 'react-i18next';

interface StateNodeProps {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  x: number;
  y: number;
}

const StateNode: React.FC<StateNodeProps> = ({ id, name, status, x, y }) => {
  const { t } = useTranslation(['execution']);

  const getStatusColor = (): string => {
    switch (status) {
      case 'active':
        return 'fill-blue-500 stroke-blue-700';
      case 'completed':
        return 'fill-green-500 stroke-green-700';
      case 'failed':
        return 'fill-red-500 stroke-red-700';
      case 'pending':
      default:
        return 'fill-gray-300 stroke-gray-500';
    }
  };

  const getTextColor = (): string => {
    switch (status) {
      case 'pending':
        return 'fill-gray-700';
      default:
        return 'fill-white';
    }
  };

  return (
    <g data-state-id={id} data-status={status} transform={`translate(${x}, ${y})`}>
      {/* State circle */}
      <circle
        cx="0"
        cy="0"
        r="40"
        className={`${getStatusColor()} transition-colors duration-300`}
        strokeWidth="2"
      />

      {/* State name */}
      <text
        x="0"
        y="5"
        textAnchor="middle"
        className={`text-sm font-semibold ${getTextColor()}`}
      >
        {name}
      </text>

      {/* Status indicator (small badge) */}
      <text
        x="0"
        y="-50"
        textAnchor="middle"
        className="text-xs fill-gray-600"
      >
        {t(`execution:stateMachine.stateStatus.${status}`)}
      </text>
    </g>
  );
};

export default StateNode;
