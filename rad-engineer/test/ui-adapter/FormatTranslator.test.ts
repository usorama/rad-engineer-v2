/**
 * Unit tests for FormatTranslator
 *
 * Tests:
 * - Auto-Claude → rad-engineer conversion
 * - rad-engineer → Auto-Claude conversion
 * - Status mapping
 *
 * Coverage requirements:
 * - Branches: 80%
 * - Functions: 85%
 * - Lines: 85%
 */

import { describe, it, expect } from "bun:test";
import { FormatTranslator } from "@/ui-adapter/FormatTranslator.js";
import type { AutoClaudeTaskSpec } from "@/ui-adapter/types.js";
import type { Wave } from "@/plan/types.js";
import type { WaveState } from "@/advanced/StateManager.js";

describe("FormatTranslator: toRadEngineerWave", () => {
  it("Converts Auto-Claude TaskSpec to rad-engineer Wave with minimal fields", () => {
    const translator = new FormatTranslator();

    const spec: AutoClaudeTaskSpec = {
      title: "Implement authentication",
      description: "Add JWT authentication to API endpoints",
      priority: 5,
      tags: ["backend", "security"],
    };

    const taskId = "task-123";
    const wave = translator.toRadEngineerWave(spec, taskId);

    // Validate Wave structure
    expect(wave.id).toBe(`wave-${taskId}`);
    expect(wave.number).toBe(1);
    expect(wave.phase).toBe(0);
    expect(wave.name).toBe(spec.title);
    expect(wave.dependencies).toEqual([]);
    expect(wave.estimatedMinutes).toBeGreaterThan(0);
    expect(wave.parallelization).toBe("sequential");
    expect(wave.maxConcurrent).toBe(1);

    // Validate stories array
    expect(wave.stories).toHaveLength(1);
    expect(wave.stories[0].id).toBe(`story-${taskId}-1`);
    expect(wave.stories[0].waveId).toBe(`wave-${taskId}`);
    expect(wave.stories[0].title).toBe(spec.title);
    expect(wave.stories[0].description).toBe(spec.description);
    expect(wave.stories[0].agentType).toBe("developer");
    expect(wave.stories[0].model).toBe("sonnet");
    expect(wave.stories[0].testRequirements.coverageTarget).toBe(80);
  });

  it("Handles TaskSpec without priority and tags", () => {
    const translator = new FormatTranslator();

    const spec: AutoClaudeTaskSpec = {
      title: "Simple task",
      description: "Basic task description",
    };

    const wave = translator.toRadEngineerWave(spec, "task-456");

    // Validate basic story structure exists
    expect(wave.stories[0].agentType).toBe("developer");
    expect(wave.stories[0].model).toBe("sonnet");
  });
});

describe("FormatTranslator: toAutoClaudeTask", () => {
  it("Converts rad-engineer Wave to Auto-Claude Task without state", () => {
    const translator = new FormatTranslator();

    const wave: Wave = {
      id: "wave-task-789",
      number: 1,
      phase: 0,
      name: "Build user dashboard",
      dependencies: [],
      estimatedMinutes: 60,
      parallelization: "sequential",
      maxConcurrent: 2,
      stories: [
        {
          id: "story-1",
          waveId: "wave-task-789",
          title: "Build user dashboard",
          description: "Create React dashboard component",
          agentType: "developer",
          model: "sonnet",
          estimatedMinutes: 60,
          dependencies: [],
          parallelGroup: 1,
          acceptanceCriteria: [],
          filesInScope: [],
          testRequirements: {
            unitTests: 5,
            integrationTests: 2,
            coverageTarget: 80,
          },
        },
      ],
    };

    const task = translator.toAutoClaudeTask(wave);

    // Validate task structure
    expect(task.id).toBe("task-789");
    expect(task.title).toBe(wave.name);
    expect(task.description).toBe("Create React dashboard component");
    expect(task.status).toBe("pending");
    expect(task.progress).toBe(0);
    expect(task.createdAt).toBeTruthy();
    expect(task.updatedAt).toBeTruthy();
  });

  it("Converts Wave to Task with in-progress state", () => {
    const translator = new FormatTranslator();

    const wave: Wave = {
      id: "wave-task-999",
      number: 1,
      phase: 1,
      name: "Test wave",
      dependencies: [],
      estimatedMinutes: 30,
      parallelization: "sequential",
      maxConcurrent: 1,
      stories: [
        {
          id: "story-1",
          waveId: "wave-task-999",
          title: "Story 1",
          description: "First story",
          agentType: "developer",
          model: "sonnet",
          estimatedMinutes: 15,
          dependencies: [],
          parallelGroup: 1,
          acceptanceCriteria: [],
          filesInScope: [],
          testRequirements: {
            unitTests: 1,
            integrationTests: 0,
            coverageTarget: 80,
          },
        },
        {
          id: "story-2",
          waveId: "wave-task-999",
          title: "Story 2",
          description: "Second story",
          agentType: "developer",
          model: "sonnet",
          estimatedMinutes: 15,
          dependencies: [],
          parallelGroup: 1,
          acceptanceCriteria: [],
          filesInScope: [],
          testRequirements: {
            unitTests: 1,
            integrationTests: 0,
            coverageTarget: 80,
          },
        },
      ],
    };

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: ["story-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    const task = translator.toAutoClaudeTask(wave, waveState);

    expect(task.status).toBe("in_progress");
    expect(task.progress).toBe(50); // 1 of 2 stories completed
  });

  it("Converts Wave to Task with completed state", () => {
    const translator = new FormatTranslator();

    const wave: Wave = {
      id: "wave-task-888",
      number: 1,
      phase: 2,
      name: "Completed wave",
      dependencies: [],
      estimatedMinutes: 20,
      parallelization: "sequential",
      maxConcurrent: 1,
      stories: [
        {
          id: "story-1",
          waveId: "wave-task-888",
          title: "Only story",
          description: "Single story",
          agentType: "developer",
          model: "sonnet",
          estimatedMinutes: 20,
          dependencies: [],
          parallelGroup: 1,
          acceptanceCriteria: [],
          filesInScope: [],
          testRequirements: {
            unitTests: 1,
            integrationTests: 0,
            coverageTarget: 80,
          },
        },
      ],
    };

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: ["story-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    const task = translator.toAutoClaudeTask(wave, waveState);

    expect(task.status).toBe("completed");
    expect(task.progress).toBe(100);
  });

  it("Converts Wave to Task with failed state", () => {
    const translator = new FormatTranslator();

    const wave: Wave = {
      id: "wave-task-777",
      number: 1,
      phase: 1,
      name: "Failed wave",
      dependencies: [],
      estimatedMinutes: 40,
      parallelization: "sequential",
      maxConcurrent: 1,
      stories: [
        {
          id: "story-1",
          waveId: "wave-task-777",
          title: "Story 1",
          description: "First story",
          agentType: "developer",
          model: "sonnet",
          estimatedMinutes: 40,
          dependencies: [],
          parallelGroup: 1,
          acceptanceCriteria: [],
          filesInScope: [],
          testRequirements: {
            unitTests: 1,
            integrationTests: 0,
            coverageTarget: 80,
          },
        },
      ],
    };

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: [],
      failedTasks: ["story-1"],
      timestamp: new Date().toISOString(),
    };

    const task = translator.toAutoClaudeTask(wave, waveState);

    expect(task.status).toBe("failed");
  });
});

describe("FormatTranslator: toAutoClaudeStatus", () => {
  it("Returns 'failed' status when tasks have failed", () => {
    const translator = new FormatTranslator();

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: ["task-2"],
      timestamp: new Date().toISOString(),
    };

    const status = translator.toAutoClaudeStatus(waveState, 3);

    expect(status).toBe("failed");
  });

  it("Returns 'completed' status when all tasks are done", () => {
    const translator = new FormatTranslator();

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1", "task-2", "task-3"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    const status = translator.toAutoClaudeStatus(waveState, 3);

    expect(status).toBe("completed");
  });

  it("Returns 'in_progress' status when some tasks are done", () => {
    const translator = new FormatTranslator();

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: ["task-1"],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    const status = translator.toAutoClaudeStatus(waveState, 3);

    expect(status).toBe("in_progress");
  });

  it("Returns 'pending' status when no tasks are done", () => {
    const translator = new FormatTranslator();

    const waveState: WaveState = {
      waveNumber: 1,
      completedTasks: [],
      failedTasks: [],
      timestamp: new Date().toISOString(),
    };

    const status = translator.toAutoClaudeStatus(waveState, 3);

    expect(status).toBe("pending");
  });
});
