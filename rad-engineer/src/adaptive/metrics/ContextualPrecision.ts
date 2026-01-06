/**
 * Contextual Precision Metric
 *
 * Measures what proportion of retrieved context is relevant to the query.
 * Deterministic keyword-based approach.
 */

export class ContextualPrecisionMetric {
  /**
   * Calculate contextual precision (0-1)
   * Deterministic
   */
  async calculate(
    query: string,
    context: string[],
    response: string
  ): Promise<number> {
    if (context.length === 0) {
      return 1; // No precision penalty if no context
    }

    const queryWords = this.tokenize(query);
    const responseWords = this.tokenize(response);

    // Check each context chunk for relevance
    let relevantChunks = 0;
    for (const ctx of context) {
      if (this.isRelevant(ctx, queryWords, responseWords)) {
        relevantChunks++;
      }
    }

    return relevantChunks / context.length;
  }

  /**
   * Check if context chunk is relevant
   * Deterministic
   */
  private isRelevant(
    context: string,
    queryWords: string[],
    responseWords: string[]
  ): boolean {
    const contextWords = this.tokenize(context);

    // Calculate overlap with query
    const queryOverlap = contextWords.filter((w) => queryWords.includes(w));
    const queryOverlapRatio = queryOverlap.length / queryWords.length;

    // Calculate overlap with response
    const responseOverlap = contextWords.filter((w) => responseWords.includes(w));
    const responseOverlapRatio = responseOverlap.length / responseWords.length;

    // Context is relevant if it overlaps with either query or response
    return queryOverlapRatio >= 0.1 || responseOverlapRatio >= 0.1;
  }

  /**
   * Tokenize text into words
   * Deterministic
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }
}
