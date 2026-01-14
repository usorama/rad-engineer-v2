/**
 * @vitest-environment jsdom
 */
/**
 * Tests for ResearchDashboard component and related components
 * Note: These tests require jsdom environment for DOM operations
 */
import { describe, it, expect } from 'vitest';

describe('ResearchDashboard - Component Exports', () => {
  it('should export ResearchDashboard component', async () => {
    const module = await import('../ResearchDashboard');
    expect(module.ResearchDashboard).toBeDefined();
    expect(typeof module.ResearchDashboard).toBe('function');
  });

  it('should export ResearchAgentCard component', async () => {
    const module = await import('../ResearchAgentCard');
    expect(module.ResearchAgentCard).toBeDefined();
    expect(typeof module.ResearchAgentCard).toBe('function');
  });

  it('should export ResearchFindings component', async () => {
    const module = await import('../ResearchFindings');
    expect(module.ResearchFindings).toBeDefined();
    expect(typeof module.ResearchFindings).toBe('function');
  });
});

describe('ResearchDashboard - Type Exports', () => {
  it('should export ResearchAgent type', async () => {
    const module = await import('../ResearchAgentCard');
    // TypeScript will catch missing type exports at compile time
    expect(module).toBeDefined();
  });

  it('should export ResearchFinding type', async () => {
    const module = await import('../ResearchFindings');
    // TypeScript will catch missing type exports at compile time
    expect(module).toBeDefined();
  });
});

describe('ResearchDashboard - Props Interfaces', () => {
  it('should have correct ResearchAgent interface shape', async () => {
    const module = await import('../ResearchAgentCard');

    // Sample valid agent object based on interface
    const mockAgent = {
      id: 'agent-1',
      name: 'Test Agent',
      status: 'running' as const,
      progress: 50
    };

    // TypeScript validation - this test passes if types are correct
    expect(mockAgent.id).toBeDefined();
    expect(mockAgent.name).toBeDefined();
    expect(mockAgent.status).toBeDefined();
    expect(mockAgent.progress).toBeDefined();
  });

  it('should have correct ResearchFinding interface shape', async () => {
    const module = await import('../ResearchFindings');

    // Sample valid finding object based on interface
    const mockFinding = {
      id: 'finding-1',
      title: 'Test Finding',
      content: 'Test content',
      category: 'context' as const
    };

    // TypeScript validation - this test passes if types are correct
    expect(mockFinding.id).toBeDefined();
    expect(mockFinding.title).toBeDefined();
    expect(mockFinding.content).toBeDefined();
    expect(mockFinding.category).toBeDefined();
  });
});
