#!/usr/bin/env bun
/**
 * EVALS CLI Commands
 *
 * Command-line interface for the self-learning EVALS system
 */

import { PerformanceStore } from "../adaptive/PerformanceStore.js";
import { BanditRouter } from "../adaptive/BanditRouter.js";
import { EvaluationLoop } from "../adaptive/EvaluationLoop.js";
import { StateManager } from "../adaptive/StateManager.js";
import { QueryFeatureExtractor } from "../adaptive/QueryFeatureExtractor.js";
import type { EvalConfig } from "../adaptive/types.js";

/**
 * EVALS CLI
 */
class EvalCLI {
  private store: PerformanceStore;
  private router: BanditRouter;
  private evaluation: EvaluationLoop;
  private stateManager: StateManager;
  private featureExtractor: QueryFeatureExtractor;

  constructor(config?: Partial<EvalConfig>) {
    this.store = new PerformanceStore(config?.state);
    this.router = new BanditRouter(this.store, config);
    this.evaluation = new EvaluationLoop(this.store);
    this.stateManager = new StateManager(this.store, config?.state);
    this.featureExtractor = new QueryFeatureExtractor();
  }

  /**
   * Show performance statistics
   */
  async stats(args: string[]): Promise<void> {
    // Load state
    await this.stateManager.load();

    const summary = this.stateManager.getSummary();
    const evalStats = this.evaluation.getStats();
    const routerStats = this.router.getStats();

    console.log("\n=== EVALS Performance Statistics ===\n");
    console.log(`Version: ${summary.version}`);
    console.log(`Last Updated: ${new Date(summary.timestamp).toISOString()}`);
    console.log(`Total Providers: ${summary.providers.length}`);
    console.log(`Domains: ${summary.domains.join(", ")}`);
    console.log(`\nTotal Evaluations: ${evalStats.totalEvaluations}`);
    console.log(`Average Quality: ${(evalStats.averageQuality * 100).toFixed(1)}%`);
    console.log(`Success Rate: ${(evalStats.successRate * 100).toFixed(1)}%`);

    // Show per-provider stats
    console.log("\n=== Provider Performance ===\n");
    for (const provider of summary.providers) {
      const providerSummary = this.router.getProviderSummary(provider, "general");
      if (providerSummary.length > 0) {
        console.log(`\n${provider}:`);
        for (const stats of providerSummary) {
          console.log(`  Domain: ${stats.domain}`);
          console.log(`  Success: ${stats.success} | Failure: ${stats.failure}`);
          console.log(`  Mean: ${stats.mean.toFixed(2)} | CI: [${stats.confidenceInterval[0].toFixed(2)}, ${stats.confidenceInterval[1].toFixed(2)}]`);
          console.log(`  Avg Quality: ${(stats.avgQuality * 100).toFixed(1)}%`);
          console.log(`  Avg Cost: $${stats.avgCost.toFixed(4)}`);
          console.log(`  Avg Latency: ${stats.avgLatency.toFixed(0)}ms`);
        }
      }
    }
  }

  /**
   * Reset performance store
   */
  async reset(args: string[]): Promise<void> {
    const confirm = args.includes("--confirm");

    if (!confirm) {
      console.log("\n⚠️  This will reset all performance data.");
      console.log("Use --confirm to proceed.");
      return;
    }

    await this.stateManager.reset();
    console.log("\n✅ Performance store reset successfully");
  }

  /**
   * Export metrics to file
   */
  async export(args: string[]): Promise<void> {
    // Load state
    await this.stateManager.load();

    let format: "json" | "yaml" = "json";
    let outputPath = "./metrics.json";

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--format" && args[i + 1]) {
        format = args[i + 1] as "json" | "yaml";
        i++;
      } else if (!args[i].startsWith("--")) {
        outputPath = args[i];
      }
    }

    await this.stateManager.exportToFile(outputPath, format);
    console.log(`\n✅ Metrics exported to ${outputPath} (${format})`);
  }

  /**
   * Compare two providers
   */
  async compare(args: string[]): Promise<void> {
    if (args.length < 4) {
      console.log("\nUsage: bun evals compare <provider1> <model1> <provider2> <model2>");
      console.log("Example: bun evals compare anthropic claude-3-5-sonnet-20241022 glm glm-4.7");
      return;
    }

    // Load state
    await this.stateManager.load();

    const provider1 = args[0];
    const model1 = args[1];
    const provider2 = args[2];
    const model2 = args[3];

    const comparison = this.router.compareProviders(provider1, model1, provider2, model2);

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
  }

  /**
   * Test routing for a query
   */
  async route(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log("\nUsage: bun evals route \"your query here\"");
      return;
    }

    // Load state
    await this.stateManager.load();

    const query = args.join(" ");
    const features = this.featureExtractor.extract(query);

    console.log("\n=== Query Analysis ===\n");
    console.log(`Query: ${query}`);
    console.log(`Domain: ${features.domain}`);
    console.log(`Complexity: ${(features.complexityScore * 100).toFixed(0)}%`);
    console.log(`Tokens: ${features.tokenCount}`);
    console.log(`Lines: ${features.lineCount}`);
    console.log(`Depth: ${features.maxDepth}`);

    // Get routing decision
    const decision = await this.router.route(features);

    console.log("\n=== Routing Decision ===\n");
    console.log(`Provider: ${decision.provider}`);
    console.log(`Model: ${decision.model}`);
    console.log(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`Mode: ${decision.exploration ? "Exploration" : "Exploitation"}`);
    console.log(`Reason: ${decision.reason}`);
  }

  /**
   * Run diagnostic checks
   */
  async diagnose(args: string[]): Promise<void> {
    console.log("\n=== EVALS System Diagnostics ===\n");

    // Check state file
    console.log("1. State File:");
    try {
      await this.stateManager.load();
      const summary = this.stateManager.getSummary();
      console.log(`   ✅ State loaded (version: ${summary.version})`);
      console.log(`   ✅ ${summary.statsCount} provider stats`);
    } catch (error) {
      console.log(`   ❌ Failed to load state: ${error}`);
    }

    // Check router
    console.log("\n2. Bandit Router:");
    try {
      const routerStats = this.router.getStats();
      console.log(`   ✅ Router operational`);
      console.log(`   ✅ ${routerStats.totalCandidates} candidates`);
      console.log(`   ✅ Exploration rate: ${(this.router.getExplorationRate() * 100).toFixed(0)}%`);
    } catch (error) {
      console.log(`   ❌ Router error: ${error}`);
    }

    // Check evaluation
    console.log("\n3. Evaluation Loop:");
    try {
      const evalStats = this.evaluation.getStats();
      console.log(`   ✅ Evaluation loop operational`);
      console.log(`   ✅ Configuration: timeout=${this.evaluation.getConfig().timeout}ms`);
    } catch (error) {
      console.log(`   ❌ Evaluation error: ${error}`);
    }

    // Check determinism
    console.log("\n4. Determinism Check:");
    try {
      const testQuery = "test query";
      const features1 = this.featureExtractor.extract(testQuery);
      const features2 = this.featureExtractor.extract(testQuery);

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

    console.log("\n=== Diagnostics Complete ===\n");
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  const cli = new EvalCLI();

  switch (command) {
    case "stats":
      await cli.stats(args);
      break;

    case "reset":
      await cli.reset(args);
      break;

    case "export":
      await cli.export(args);
      break;

    case "compare":
      await cli.compare(args);
      break;

    case "route":
      await cli.route(args);
      break;

    case "diagnose":
      await cli.diagnose(args);
      break;

    default:
      console.log(`
EVALS CLI - Self-Learning Evaluation System

Commands:
  stats                    Show performance statistics
  reset --confirm          Reset performance store
  export [--format json|yaml] [path]
                           Export metrics to file
  compare <p1> <m1> <p2> <m2>
                           Compare two providers
  route "query"             Test routing for a query
  diagnose                 Run system diagnostics

Examples:
  bun evals stats
  bun evals export --format json ./metrics.json
  bun evals compare anthropic claude-3-5-sonnet-20241022 glm glm-4.7
  bun evals route "write a function to calculate fibonacci"
  bun evals diagnose
      `);
  }
}

// Run CLI
main().catch((error) => {
  console.error("\n❌ Error:", error);
  process.exit(1);
});
