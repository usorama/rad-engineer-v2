/**
 * EVALS CLI Commands
 *
 * Command implementations for the self-learning EVALS system
 * Uses EvalsFactory for system initialization
 */

import { EvalsFactory, type EvalsSystem } from "../adaptive/EvalsFactory.js";
import { ProviderAutoDetector } from "../config/ProviderAutoDetector.js";
import { ProviderFactory } from "../sdk/providers/ProviderFactory.js";

/**
 * EVALS CLI Commands
 */
export class EvalCommands {
  private system: EvalsSystem | null = null;
  private providerFactory: ProviderFactory | null = null;

  /**
   * Initialize EVALS system
   */
  private async initialize(): Promise<void> {
    if (this.system) {
      return; // Already initialized
    }

    // Auto-detect providers from environment
    const factoryConfig = ProviderAutoDetector.initializeFromEnv();
    this.providerFactory = new ProviderFactory(factoryConfig);

    // Initialize EVALS system
    this.system = await EvalsFactory.initialize(this.providerFactory);
  }

  /**
   * Show performance statistics
   */
  async stats(): Promise<void> {
    await this.initialize();

    if (!this.system) {
      console.error("\n❌ Failed to initialize EVALS system");
      return;
    }

    const stats = EvalsFactory.getStats(this.system);

    console.log("\n=== EVALS Performance Statistics ===\n");
    console.log(`Version: ${stats.store.version}`);
    console.log(`Last Updated: ${new Date(stats.store.timestamp).toISOString()}`);
    console.log(`Total Providers: ${stats.store.providers.length}`);
    console.log(`Domains: ${stats.store.domains.join(", ")}`);
    console.log(`\nTotal Evaluations: ${stats.evaluation.totalEvaluations}`);
    console.log(`Average Quality: ${(stats.evaluation.averageQuality * 100).toFixed(1)}%`);
    console.log(`Success Rate: ${(stats.evaluation.successRate * 100).toFixed(1)}%`);
    console.log(`Exploration Rate: ${(stats.routing.explorationRate * 100).toFixed(1)}%`);

    // Show per-provider stats
    console.log("\n=== Provider Performance ===\n");
    for (const provider of stats.store.providers) {
      const providerSummary = this.system.router.getProviderSummary(provider, "general");
      if (providerSummary.length > 0) {
        console.log(`\n${provider}:`);
        for (const summary of providerSummary) {
          console.log(`  Domain: ${summary.domain}`);
          console.log(`  Success: ${summary.success} | Failure: ${summary.failure}`);
          console.log(`  Mean: ${summary.mean.toFixed(2)} | CI: [${summary.confidenceInterval[0].toFixed(2)}, ${summary.confidenceInterval[1].toFixed(2)}]`);
          console.log(`  Avg Quality: ${(summary.avgQuality * 100).toFixed(1)}%`);
          console.log(`  Avg Cost: $${summary.avgCost.toFixed(4)}`);
          console.log(`  Avg Latency: ${summary.avgLatency.toFixed(0)}ms`);
        }
      } else {
        console.log(`\n${provider}: No data yet`);
      }
    }
  }

  /**
   * Compare two providers
   */
  async compare(provider1: string, model1: string, provider2: string, model2: string): Promise<void> {
    await this.initialize();

    if (!this.system) {
      console.error("\n❌ Failed to initialize EVALS system");
      return;
    }

    try {
      const comparison = this.system.router.compareProviders(
        provider1,
        model1,
        provider2,
        model2
      );

      console.log("\n=== Provider Comparison ===\n");
      console.log(`\n${provider1}/${model1}:`);
      console.log(`  Average Quality: ${(comparison.provider1.avgQuality * 100).toFixed(1)}%`);
      console.log(`  Average Cost: $${comparison.provider1.avgCost.toFixed(4)}`);
      console.log(`  Mean Score: ${comparison.provider1.mean.toFixed(2)}`);

      console.log(`\n${provider2}/${model2}:`);
      console.log(`  Average Quality: ${(comparison.provider2.avgQuality * 100).toFixed(1)}%`);
      console.log(`  Average Cost: $${comparison.provider2.avgCost.toFixed(4)}`);
      console.log(`  Mean Score: ${comparison.provider2.mean.toFixed(2)}`);

      console.log(`\n📊 ${comparison.recommendation}`);
    } catch (error) {
      console.error("\n❌ Comparison failed:", error instanceof Error ? error.message : error);
    }
  }

  /**
   * Show routing decision for a query
   */
  async route(query: string): Promise<void> {
    await this.initialize();

    if (!this.system) {
      console.error("\n❌ Failed to initialize EVALS system");
      return;
    }

    try {
      const features = this.system.featureExtractor.extract(query);

      console.log("\n=== Query Analysis ===\n");
      console.log(`Query: ${query}`);
      console.log(`Domain: ${features.domain}`);
      console.log(`Complexity: ${(features.complexityScore * 100).toFixed(0)}%`);
      console.log(`Tokens: ${features.tokenCount}`);
      console.log(`Lines: ${features.lineCount}`);
      console.log(`Depth: ${features.maxDepth}`);

      // Get routing decision
      const decision = await this.system.router.route(features);

      console.log("\n=== Routing Decision ===\n");
      console.log(`Provider: ${decision.provider}`);
      console.log(`Model: ${decision.model}`);
      console.log(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`Mode: ${decision.exploration ? "Exploration" : "Exploitation"}`);
      console.log(`Reason: ${decision.reason}`);
    } catch (error) {
      console.error("\n❌ Routing failed:", error instanceof Error ? error.message : error);
    }
  }

  /**
   * Reset performance store
   */
  async reset(confirm = false): Promise<void> {
    if (!confirm) {
      console.log("\n⚠️  This will reset all performance data.");
      console.log("Use --confirm to proceed.");
      return;
    }

    await this.initialize();

    if (!this.system) {
      console.error("\n❌ Failed to initialize EVALS system");
      return;
    }

    try {
      await EvalsFactory.resetState(this.system);
      console.log("\n✅ Performance store reset successfully");
    } catch (error) {
      console.error("\n❌ Reset failed:", error instanceof Error ? error.message : error);
    }
  }

  /**
   * Export metrics to file
   */
  async export(format: "json" | "yaml" = "json", outputPath = "./metrics.json"): Promise<void> {
    await this.initialize();

    if (!this.system) {
      console.error("\n❌ Failed to initialize EVALS system");
      return;
    }

    try {
      await this.system.stateManager.exportToFile(outputPath, format);
      console.log(`\n✅ Metrics exported to ${outputPath} (${format})`);
    } catch (error) {
      console.error("\n❌ Export failed:", error instanceof Error ? error.message : error);
    }
  }

  /**
   * Run diagnostic checks
   */
  async diagnose(): Promise<void> {
    await this.initialize();

    if (!this.system) {
      console.error("\n❌ Failed to initialize EVALS system");
      return;
    }

    console.log("\n=== EVALS System Diagnostics ===\n");

    // Check state file
    console.log("1. State File:");
    try {
      await this.system.stateManager.load();
      const summary = this.system.stateManager.getSummary();
      console.log(`   ✅ State loaded (version: ${summary.version})`);
      console.log(`   ✅ ${summary.statsCount} provider stats`);
    } catch (error) {
      console.log(`   ❌ Failed to load state: ${error}`);
    }

    // Check router
    console.log("\n2. Bandit Router:");
    try {
      const routerStats = this.system.router.getStats();
      console.log(`   ✅ Router operational`);
      console.log(`   ✅ ${routerStats.totalCandidates} candidates`);
      console.log(`   ✅ Exploration rate: ${(this.system.router.getExplorationRate() * 100).toFixed(0)}%`);
    } catch (error) {
      console.log(`   ❌ Router error: ${error}`);
    }

    // Check evaluation
    console.log("\n3. Evaluation Loop:");
    try {
      const evalStats = this.system.evaluation.getStats();
      console.log(`   ✅ Evaluation loop operational`);
      console.log(`   ✅ Configuration: timeout=${this.system.evaluation.getConfig().timeout}ms`);
    } catch (error) {
      console.log(`   ❌ Evaluation error: ${error}`);
    }

    // Check determinism
    console.log("\n4. Determinism Check:");
    try {
      const testQuery = "test query";
      const features1 = this.system.featureExtractor.extract(testQuery);
      const features2 = this.system.featureExtractor.extract(testQuery);

      const isDeterministic =
        JSON.stringify(features1) === JSON.stringify(features2);

      if (isDeterministic) {
        console.log(`   ✅ Feature extraction is deterministic`);
      } else {
        console.log(`   ❌ Feature extraction is NOT deterministic`);
      }
    } catch (error) {
      console.log(`   ❌ Determinism check error: ${error}`);
    }

    // Check provider factory
    console.log("\n5. Provider Factory:");
    try {
      if (this.providerFactory) {
        const isEvalsEnabled = this.providerFactory.isEvalsRoutingEnabled();
        console.log(`   ✅ Provider factory initialized`);
        console.log(`   ✅ EVALS routing: ${isEvalsEnabled ? "enabled" : "disabled"}`);
      } else {
        console.log(`   ⚠️  Provider factory not initialized`);
      }
    } catch (error) {
      console.log(`   ❌ Provider factory error: ${error}`);
    }

    console.log("\n=== Diagnostics Complete ===\n");
  }
}
