import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import StateNode from './StateNode';

interface State {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  transitions: string[];
}

interface StateMachineData {
  states: State[];
  currentState: string | null;
}

interface StateChange {
  fromState: string;
  toState: string;
  timestamp: string;
}

interface StateMachineVisualizerProps {
  specId: string;
}

const StateMachineVisualizer: React.FC<StateMachineVisualizerProps> = ({ specId }) => {
  const { t } = useTranslation(['execution', 'common']);
  const [stateMachineData, setStateMachineData] = useState<StateMachineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStateMachineStatus = async () => {
      try {
        setLoading(true);
        const result = await window.electronAPI.execution.getStateMachineStatus(specId);

        if (result.success) {
          setStateMachineData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch state machine status');
      } finally {
        setLoading(false);
      }
    };

    fetchStateMachineStatus();

    // Subscribe to real-time state change updates
    const unsubscribe = window.electronAPI.execution.onStateChanged(specId, (stateChange: StateChange) => {
      setStateMachineData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          states: prev.states.map((state) => {
            if (state.id === stateChange.fromState) {
              return { ...state, status: 'completed' };
            }
            if (state.id === stateChange.toState) {
              return { ...state, status: 'active' };
            }
            return state;
          }),
          currentState: stateChange.toState
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, [specId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('common:labels.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{t('execution:errors.stateMachineFailed')}</p>
      </div>
    );
  }

  if (!stateMachineData || stateMachineData.states.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('execution:stateMachine.noStates')}</p>
      </div>
    );
  }

  // Calculate positions for states in a horizontal flow
  const statePositions: { [key: string]: { x: number; y: number } } = {};
  const horizontalSpacing = 200;
  const verticalCenter = 150;
  const startX = 100;

  stateMachineData.states.forEach((state, index) => {
    statePositions[state.id] = {
      x: startX + index * horizontalSpacing,
      y: verticalCenter
    };
  });

  // Calculate SVG viewBox
  const svgWidth = Math.max(600, stateMachineData.states.length * horizontalSpacing + 100);
  const svgHeight = 300;

  return (
    <div className="w-full h-full p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{t('execution:stateMachine.title')}</h3>
        {stateMachineData.currentState && (
          <p className="text-sm text-muted-foreground">
            {t('execution:stateMachine.currentState', { state: stateMachineData.currentState })}
          </p>
        )}
      </div>

      <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full min-h-[300px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Render transition arrows */}
          {stateMachineData.states.map((state) => {
            const fromPos = statePositions[state.id];
            if (!fromPos) return null;

            return state.transitions.map((toStateId) => {
              const toPos = statePositions[toStateId];
              if (!toPos) return null;

              // Draw arrow from fromPos to toPos
              const arrowPath = `M ${fromPos.x + 40} ${fromPos.y} L ${toPos.x - 40} ${toPos.y}`;

              return (
                <g key={`${state.id}-${toStateId}`}>
                  <path
                    d={arrowPath}
                    className="stroke-gray-400 dark:stroke-gray-600"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            });
          })}

          {/* Define arrowhead marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              className="fill-gray-400 dark:fill-gray-600"
            >
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>

          {/* Render state nodes */}
          {stateMachineData.states.map((state) => {
            const pos = statePositions[state.id];
            if (!pos) return null;

            return (
              <StateNode
                key={state.id}
                id={state.id}
                name={state.name}
                status={state.status}
                x={pos.x}
                y={pos.y}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default StateMachineVisualizer;
