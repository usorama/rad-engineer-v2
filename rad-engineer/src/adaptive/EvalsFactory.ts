/**
 * EVALS System Factory
 *
 * One-stop initialization for the entire EVALS system
 * Integrates BanditRouter, PerformanceStore, QueryFeatureExtractor,
 * EvaluationLoop, StateManager with ProviderFactory
 */

import { BanditRouter } from "./BanditRouter.js";
import { PerformanceStore } from "./PerformanceStore.js";
import { QueryFeatureExtractor } from "./QueryFeatureExtractor.js";
import { EvaluationLoop } from "./EvaluationLoop.js";
import { StateManager } from "./StateManager.js";
import type { EvalsConfigFile } from "../config/EvalsConfig.js";
import type { ProviderFactory } from "../sdk/providers/ProviderFactory.js";

/**
 * Initialized EVALS system components
 */
export interface EvalsSystem {
  /** Bandit router for intelligent routing */
  router: BanditRouter;
  /** Performance store with versioning */
  store: PerformanceStore;
  /** Query feature extractor */
  featureExtractor: QueryFeatureExtractor;
  /** Evaluation loop for quality assessment */
  evaluation: EvaluationLoop;
  /** State manager for persistence */
  stateManager: StateManager;
}

/**
 * EVALS System Factory
 *
 * Provides static methods for initializing and managing EVALS system
 */
export class EvalsFactory {
  /**
   * Initialize EVALS system and integrate with ProviderFactory
   *
   * @param providerFactory - Provider factory to integrate with
   * @param config - EVALS configuration
   * @returns Initialized EVALS system components
   */
  static async initialize(
    providerFactory: ProviderFactory,
    config?: Partial<EvalsConfigFile>
  ): Promise<EvalsSystem> {
    // Load default config if not provided
    const evalsConfig = config
      ? { ...(await import("../config/EvalsConfig.js")).DEFAULT_EVALS_CONFIG, ...config }
      : (await import("../config/EvalsConfig.js")).loadEvalsConfig();

    // Initialize core components
    const store = new PerformanceStore();
    const router = new BanditRouter(store, providerFactory, evalsConfig);
    const featureExtractor = new QueryFeatureExtractor();
    const evaluation = new EvaluationLoop(store, {
      timeout: evalsConfig.evaluation.timeout,
      weights: {
        relevancy: 0.3,
        faithfulness: 0.3,
        precision: 0.2,
        recall: 0.2,
      },
    });

    // Initialize state manager
    const stateManager = new StateManager(store, {
      path: evalsConfig.state.path,
      autoSave: evalsConfig.state.autoSave,
      versionsToKeep: evalsConfig.state.versionsToKeep,
    });

    // Load existing state if available
    try {
      await stateManager.load();
    } catch (error) {
      // State file doesn't exist yet, will be created on first save
      console.debug("[EvalsFactory] No existing state found, starting fresh");
    }

    // Integrate with ProviderFactory
    providerFactory.enableEvalsRouting(router, featureExtractor, store);

    return {
      router,
      store,
      featureExtractor,
      evaluation,
      stateManager,
    };
  }

  /**
   * Disconnect EVALS system from ProviderFactory
   *
   * @param providerFactory - Provider factory to disconnect from
   * @param system - EVALS system to disconnect
   */
  static disconnect(providerFactory: ProviderFactory, system: EvalsSystem): void {
    providerFactory.disableEvalsRouting();

    // Save final state
    void system.stateManager.save();
  }

  /**
   * Save EVALS system state
   *
   * @param system - EVALS system to save
   */
  static async saveState(system: EvalsSystem): Promise<void> {
    await system.stateManager.save();
  }

  /**
   * Reset EVALS system state (clear all performance data)
   *
   * @param system - EVALS system to reset
   */
  static async resetState(system: EvalsSystem): Promise<void> {
    await system.stateManager.reset();
  }

  /**
   * Get EVALS system statistics
   *
   * @param system - EVALS system to query
   * @returns System statistics summary
   */
  static getStats(system: EvalsSystem): {
    store: ReturnType<StateManager["getSummary"]>;
    evaluation: ReturnType<EvaluationLoop["getStats"]>;
    routing: {
      explorationRate: number;
    };
  } {
    return {
      store: system.stateManager.getSummary(),
      evaluation: system.evaluation.getStats(),
      routing: {
        explorationRate: system.router.getExplorationRate(),
      },
    };
  }
}
