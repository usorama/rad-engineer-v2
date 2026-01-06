/**
 * Evaluation Loop
 *
 * Evaluates provider responses and updates performance store.
 * Uses DeepEval-inspired metrics for quality assessment.
 */

import { AnswerRelevancyMetric } from "./metrics/AnswerRelevancy.js";
import { FaithfulnessMetric } from "./metrics/Faithfulness.js";
import { ContextualPrecisionMetric } from "./metrics/ContextualPrecision.js";
import { ContextualRecallMetric } from "./metrics/ContextualRecall.js";
import { PerformanceStore } from "./PerformanceStore.js";
import { QueryFeatureExtractor } from "./QueryFeatureExtractor.js";
import type {
  QualityMetrics,
  EvaluationResult,
  Domain,
} from "./types.js";

/**
 * Evaluation Loop Configuration
 */
export interface EvaluationConfig {
  timeout: number; // ms
  weights: {
    relevancy: number;
    faithfulness: number;
    precision: number;
    recall: number;
  };
}

/**
 * Evaluation Loop
 */
export class EvaluationLoop {
  private store: PerformanceStore;
  private featureExtractor: QueryFeatureExtractor;
  private relevancyMetric: AnswerRelevancyMetric;
  private faithfulnessMetric: FaithfulnessMetric;
  private precisionMetric: ContextualPrecisionMetric;
  private recallMetric: ContextualRecallMetric;
  private config: EvaluationConfig;

  constructor(
    store: PerformanceStore,
    config?: Partial<EvaluationConfig>
  ) {
    this.store = store;
    this.featureExtractor = new QueryFeatureExtractor();
    this.relevancyMetric = new AnswerRelevancyMetric();
    this.faithfulnessMetric = new FaithfulnessMetric();
    this.precisionMetric = new ContextualPrecisionMetric();
    this.recallMetric = new ContextualRecallMetric();

    this.config = {
      timeout: config?.timeout ?? 5000,
      weights: config?.weights ?? {
        relevancy: 0.3,
        faithfulness: 0.3,
        precision: 0.2,
        recall: 0.2,
      },
    };
  }

  /**
   * Evaluate a single response
   */
  async evaluate(
    query: string,
    response: string,
    provider: string,
    model: string,
    context?: string[],
    cost?: number,
    latency?: number
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    // Extract features
    const features = this.featureExtractor.extract(query);

    // Calculate individual metrics
    const relevancy = await this.relevancyMetric.calculate(query, response);
    const faithfulness = await this.faithfulnessMetric.calculate(
      response,
      context || []
    );
    const precision = await this.precisionMetric.calculate(
      query,
      context || [],
      response
    );
    const recall = await this.recallMetric.calculate(
      query,
      context || [],
      response
    );

    // Calculate overall score
    const overall = this.calculateOverall({
      answerRelevancy: relevancy,
      faithfulness,
      contextualPrecision: precision,
      contextualRecall: recall,
    });

    const metrics: QualityMetrics = {
      answerRelevancy: relevancy,
      faithfulness,
      contextualPrecision: precision,
      contextualRecall: recall,
      overall,
    };

    return {
      query,
      response,
      provider,
      model,
      metrics,
      cost: cost ?? 0,
      latency: latency ?? (Date.now() - startTime),
      timestamp: Date.now(),
    };
  }

  /**
   * Evaluate and update store in one step
   */
  async evaluateAndUpdate(
    query: string,
    response: string,
    provider: string,
    model: string,
    context?: string[],
    cost?: number,
    latency?: number
  ): Promise<EvaluationResult & { success: boolean }> {
    // Evaluate
    const result = await this.evaluate(
      query,
      response,
      provider,
      model,
      context,
      cost,
      latency
    );

    // Determine success
    const success = result.metrics.overall >= 0.7;

    // Update store
    const features = this.featureExtractor.extract(query);
    this.store.updateStats(
      provider,
      model,
      features.domain,
      features.complexityScore,
      success,
      result.cost,
      result.metrics.overall,
      result.latency
    );

    return { ...result, success };
  }

  /**
   * Batch evaluate multiple responses
   */
  async evaluateBatch(
    evaluations: Array<{
      query: string;
      response: string;
      provider: string;
      model: string;
      context?: string[];
      cost?: number;
      latency?: number;
    }>
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    for (const evaluationItem of evaluations) {
      const result = await this.evaluate(
        evaluationItem.query,
        evaluationItem.response,
        evaluationItem.provider,
        evaluationItem.model,
        evaluationItem.context,
        evaluationItem.cost,
        evaluationItem.latency
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverall(metrics: QualityMetrics): number {
    return (
      metrics.answerRelevancy * this.config.weights.relevancy +
      metrics.faithfulness * this.config.weights.faithfulness +
      metrics.contextualPrecision * this.config.weights.precision +
      metrics.contextualRecall * this.config.weights.recall
    );
  }

  /**
   * Get evaluation statistics
   */
  getStats(): {
    totalEvaluations: number;
    averageQuality: number;
    successRate: number;
  } {
    const state = this.store.getState();

    let totalSuccess = 0;
    let totalSamples = 0;
    let totalQuality = 0;
    let qualityCount = 0;

    for (const stats of state.stats) {
      totalSuccess += stats.success;
      totalSamples += stats.success + stats.failure;
      totalQuality += stats.avgQuality;
      qualityCount++;
    }

    return {
      totalEvaluations: totalSamples,
      averageQuality: qualityCount > 0 ? totalQuality / qualityCount : 0,
      successRate: totalSamples > 0 ? totalSuccess / totalSamples : 0,
    };
  }

  /**
   * Compare providers based on evaluation data
   */
  compareProviders(
    providers: Array<{ provider: string; model: string }>
  ): Array<{
    provider: string;
    model: string;
    avgQuality: number;
    avgCost: number;
    avgLatency: number;
    successRate: number;
    sampleCount: number;
  }> {
    const comparisons = [];

    for (const { provider, model } of providers) {
      const stats = this.store.getStats(provider, model, "general");

      if (stats) {
        const totalSamples = stats.success + stats.failure;
        comparisons.push({
          provider,
          model,
          avgQuality: stats.avgQuality,
          avgCost: stats.avgCost,
          avgLatency: stats.avgLatency,
          successRate: totalSamples > 0 ? stats.success / totalSamples : 0,
          sampleCount: totalSamples,
        });
      } else {
        comparisons.push({
          provider,
          model,
          avgQuality: 0,
          avgCost: 0,
          avgLatency: 0,
          successRate: 0,
          sampleCount: 0,
        });
      }
    }

    // Sort by quality (descending)
    comparisons.sort((a, b) => b.avgQuality - a.avgQuality);

    return comparisons;
  }

  /**
   * Detect catastrophic forgetting
   * Returns true if performance on old tasks has degraded significantly
   */
  detectCatastrophicForgetting(
    provider: string,
    model: string,
    domain: Domain,
    threshold: number = 0.2
  ): boolean {
    const currentStats = this.store.getStats(provider, model, domain);

    if (!currentStats) {
      return false; // No data yet
    }

    const totalSamples = currentStats.success + currentStats.failure;

    if (totalSamples < 10) {
      return false; // Not enough data
    }

    // Check if recent performance is worse than historical
    // Use confidence interval width as proxy for uncertainty
    const [low, high] = currentStats.confidenceInterval;
    const width = high - low;

    // Wide confidence interval with low mean suggests potential forgetting
    if (width > threshold && currentStats.mean < 0.6) {
      return true;
    }

    return false;
  }

  /**
   * Get evaluation configuration
   */
  getConfig(): EvaluationConfig {
    return { ...this.config };
  }

  /**
   * Update evaluation configuration
   */
  updateConfig(config: Partial<EvaluationConfig>): void {
    if (config.timeout !== undefined) {
      this.config.timeout = config.timeout;
    }
    if (config.weights !== undefined) {
      this.config.weights = { ...this.config.weights, ...config.weights };
    }
  }
}
