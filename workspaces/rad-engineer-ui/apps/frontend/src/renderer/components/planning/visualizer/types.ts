/**
 * Type definitions for Plan Visualizer components
 */

export interface Wave {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Story {
  id: string;
  title: string;
  waveId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  description?: string;
}

export interface Dependency {
  from: string;  // Story ID
  to: string;    // Story ID
}

export interface PlanData {
  waves: Wave[];
  stories: Story[];
  dependencies: Dependency[];
}

export interface StoryNode {
  id: string;
  title: string;
  x: number;
  y: number;
  status: Story['status'];
}

export interface DependencyLine {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
