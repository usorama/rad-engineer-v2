/**
 * FormatTranslator - Convert between Auto-Claude and rad-engineer formats
 *
 * Responsibilities:
 * - Convert Auto-Claude TaskSpec to rad-engineer Wave
 * - Convert rad-engineer Wave to Auto-Claude Task
 * - Map status between systems
 *
 * P0 Implementation: Basic stub conversions for demo
 */

import type { Wave } from "@/plan/types.js";
import type { WaveState } from "@/advanced/StateManager.js";
import type {
  AutoClaudeTask,
  AutoClaudeTaskSpec,
  AutoClaudeTaskStatus,
} from "./types.js";

/**
 * FormatTranslator - Bidirectional format conversion
 *
 * @example
 * ```ts
 * const translator = new FormatTranslator();
 *
 * // Auto-Claude → rad-engineer
 * const wave = translator.toRadEngineerWave(autoClaudeTaskSpec);
 *
 * // rad-engineer → Auto-Claude
 * const task = translator.toAutoClaudeTask(wave);
 * ```
 */
export class FormatTranslator {
  /**
   * Convert Auto-Claude TaskSpec to rad-engineer Wave
   *
   * P0: Creates a stub Wave with minimal fields
   * Future: Full Wave generation with stories, dependencies, etc.
   *
   * @param spec - Auto-Claude task specification
   * @param taskId - Generated task ID
   * @returns rad-engineer Wave object
   */
  toRadEngineerWave(spec: AutoClaudeTaskSpec, taskId: string): Wave {
    // P0: Create stub Wave
    // Future: Parse spec.description to generate stories, dependencies
    return {
      id: `wave-${taskId}`,
      number: 1,
      phase: 0, // Foundation phase
      name: spec.title,
      dependencies: [],
      estimatedMinutes: 30, // Default estimate
      parallelization: "sequential" as const,
      maxConcurrent: 1,
      stories: [
        {
          id: `story-${taskId}-1`,
          waveId: `wave-${taskId}`,
          title: spec.title,
          description: spec.description,
          agentType: "developer" as const,
          model: "sonnet" as const,
          estimatedMinutes: 30,
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
  }

  /**
   * Convert rad-engineer Wave to Auto-Claude Task
   *
   * P0: Maps basic fields with stub status
   * Future: Include wave execution details, progress tracking
   *
   * @param wave - rad-engineer Wave object
   * @param waveState - Optional wave execution state
   * @returns Auto-Claude Task object
   */
  toAutoClaudeTask(wave: Wave, waveState?: WaveState): AutoClaudeTask {
    // Extract task ID from wave ID (remove "wave-" prefix)
    const taskId = wave.id.replace(/^wave-/, "");

    // Determine status from wave state
    let status: AutoClaudeTaskStatus = "pending";
    let progress = 0;

    if (waveState) {
      const totalTasks = wave.stories.length;
      const completedTasks = waveState.completedTasks.length;
      const failedTasks = waveState.failedTasks.length;

      progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      if (failedTasks > 0) {
        status = "failed";
      } else if (completedTasks === totalTasks) {
        status = "completed";
      } else if (completedTasks > 0) {
        status = "in_progress";
      }
    }

    // Extract description from first story (stub approach)
    const firstStory = wave.stories[0];

    return {
      id: taskId,
      title: wave.name,
      description: firstStory?.description || wave.name,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress,
    };
  }

  /**
   * Map rad-engineer WaveState to Auto-Claude status
   *
   * @param waveState - Wave execution state
   * @param totalStories - Total stories in wave
   * @returns Auto-Claude task status
   */
  toAutoClaudeStatus(waveState: WaveState, totalStories: number): AutoClaudeTaskStatus {
    const { completedTasks, failedTasks } = waveState;

    // Failed if any tasks failed
    if (failedTasks.length > 0) {
      return "failed";
    }

    // Completed if all tasks done
    if (completedTasks.length === totalStories) {
      return "completed";
    }

    // In progress if some tasks done
    if (completedTasks.length > 0) {
      return "in_progress";
    }

    // Otherwise pending
    return "pending";
  }
}
