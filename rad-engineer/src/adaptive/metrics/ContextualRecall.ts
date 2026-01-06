/**
 * Contextual Recall Metric
 *
 * Measures what proportion of relevant context is used in the response.
 * Deterministic keyword-based approach.
 */

export class ContextualRecallMetric {
  /**
   * Calculate contextual recall (0-1)
   * Deterministic
   */
  async calculate(
    query: string,
    context: string[],
    response: string
  ): Promise<number> {
    if (context.length === 0) {
      return 1; // No recall penalty if no context
    }

    // Identify relevant context chunks
    const queryWords = this.tokenize(query);
    const relevantChunks = this.identifyRelevantChunks(context, queryWords);

    if (relevantChunks.length === 0) {
      return 1; // No relevant context to recall
    }

    // Check how much relevant content is used in response
    let usedChunks = 0;
    const responseWords = this.tokenize(response);

    for (const chunk of relevantChunks) {
      if (this.isUsed(chunk, responseWords)) {
        usedChunks++;
      }
    }

    return usedChunks / relevantChunks.length;
  }

  /**
   * Identify context chunks relevant to query
   * Deterministic
   */
  private identifyRelevantChunks(
    context: string[],
    queryWords: string[]
  ): string[] {
    const relevant: string[] = [];

    for (const ctx of context) {
      const contextWords = this.tokenize(ctx);
      const overlap = contextWords.filter((w) => queryWords.includes(w));
      const overlapRatio = overlap.length / queryWords.length;

      // Consider relevant if has at least 10% overlap with query
      if (overlapRatio >= 0.1) {
        relevant.push(ctx);
      }
    }

    return relevant;
  }

  /**
   * Check if context chunk is used in response
   * Deterministic
   */
  private isUsed(chunk: string, responseWords: string[]): boolean {
    const chunkWords = this.tokenize(chunk);

    // Calculate overlap
    const overlap = chunkWords.filter((w) => responseWords.includes(w));
    const overlapRatio = overlap.length / chunkWords.length;

    // Consider used if at least 20% of chunk appears in response
    return overlapRatio >= 0.2;
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
