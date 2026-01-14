/**
 * DependencyGraph Component
 * SVG visualization of story dependencies using simple boxes and arrows
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Story, Dependency, StoryNode, DependencyLine } from './types';

export interface DependencyGraphProps {
  stories: Story[];
  dependencies: Dependency[];
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 100;
const PADDING = 40;

export function DependencyGraph({ stories, dependencies }: DependencyGraphProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  // Calculate node positions using simple layered layout
  const { nodes, lines, width, height } = useMemo(() => {
    if (stories.length === 0) {
      return { nodes: [], lines: [], width: 400, height: 300 };
    }

    // Create dependency map
    const dependsOnMap = new Map<string, string[]>();
    dependencies.forEach((dep) => {
      if (!dependsOnMap.has(dep.to)) {
        dependsOnMap.set(dep.to, []);
      }
      dependsOnMap.get(dep.to)!.push(dep.from);
    });

    // Assign layers (simple topological sort)
    const layers = new Map<string, number>();
    const visited = new Set<string>();

    function assignLayer(storyId: string): number {
      if (visited.has(storyId)) {
        return layers.get(storyId) ?? 0;
      }
      visited.add(storyId);

      const deps = dependsOnMap.get(storyId) ?? [];
      if (deps.length === 0) {
        layers.set(storyId, 0);
        return 0;
      }

      const maxDepLayer = Math.max(...deps.map(assignLayer));
      const layer = maxDepLayer + 1;
      layers.set(storyId, layer);
      return layer;
    }

    stories.forEach((story) => assignLayer(story.id));

    // Group stories by layer
    const layerGroups = new Map<number, Story[]>();
    stories.forEach((story) => {
      const layer = layers.get(story.id) ?? 0;
      if (!layerGroups.has(layer)) {
        layerGroups.set(layer, []);
      }
      layerGroups.get(layer)!.push(story);
    });

    // Calculate positions
    const storyNodes: StoryNode[] = [];

    Array.from(layerGroups.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([layer, layerStories]) => {
        layerStories.forEach((story, index) => {
          const x = PADDING + layer * HORIZONTAL_SPACING;
          const y = PADDING + index * VERTICAL_SPACING;
          storyNodes.push({
            id: story.id,
            title: story.title,
            x,
            y,
            status: story.status
          });
        });
      });

    // Calculate dependency lines
    const nodeMap = new Map(storyNodes.map((n) => [n.id, n]));
    const dependencyLines: DependencyLine[] = dependencies
      .map((dep) => {
        const fromNode = nodeMap.get(dep.from);
        const toNode = nodeMap.get(dep.to);
        if (!fromNode || !toNode) return null;

        return {
          from: dep.from,
          to: dep.to,
          x1: fromNode.x + NODE_WIDTH,
          y1: fromNode.y + NODE_HEIGHT / 2,
          x2: toNode.x,
          y2: toNode.y + NODE_HEIGHT / 2
        };
      })
      .filter((line): line is DependencyLine => line !== null);

    // Calculate SVG dimensions
    const maxX = Math.max(...storyNodes.map((n) => n.x));
    const maxY = Math.max(...storyNodes.map((n) => n.y));
    const svgWidth = maxX + NODE_WIDTH + PADDING;
    const svgHeight = maxY + NODE_HEIGHT + PADDING;

    return {
      nodes: storyNodes,
      lines: dependencyLines,
      width: svgWidth,
      height: svgHeight
    };
  }, [stories, dependencies]);

  if (stories.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {t('planning:visualizer.graph.noStories')}
      </div>
    );
  }

  // Status colors
  const getStatusColor = (status: Story['status']): string => {
    switch (status) {
      case 'completed':
        return 'fill-green-100 stroke-green-600';
      case 'in_progress':
        return 'fill-blue-100 stroke-blue-600';
      case 'blocked':
        return 'fill-red-100 stroke-red-600';
      case 'pending':
      default:
        return 'fill-gray-100 stroke-gray-400';
    }
  };

  return (
    <div className="overflow-auto rounded-md border bg-card">
      <svg width={width} height={height} className="min-w-full" role="img" aria-hidden="true">
        {/* Dependency lines */}
        <g className="dependency-lines">
          {lines.map((line, index) => (
            <g key={`${line.from}-${line.to}-${index}`}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted-foreground"
                markerEnd="url(#arrowhead)"
              />
            </g>
          ))}
        </g>

        {/* Arrowhead marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="currentColor" className="text-muted-foreground" />
          </marker>
        </defs>

        {/* Story nodes */}
        <g className="story-nodes">
          {nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="8"
                className={getStatusColor(node.status)}
                strokeWidth="2"
              />
              <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT}>
                <div className="flex h-full items-center justify-center px-3 text-center">
                  <div className="truncate text-sm font-medium text-foreground">{node.title}</div>
                </div>
              </foreignObject>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
