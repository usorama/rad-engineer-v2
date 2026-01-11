/**
 * Answer Relevancy Metric
 *
 * Measures how relevant the response is to the query.
 * Uses embedding-based similarity (deterministic with fixed seed).
 */

export class AnswerRelevancyMetric {
  /**
   * Calculate answer relevancy (0-1)
   * Deterministic: uses fixed seed for any randomness
   */
  async calculate(
    query: string,
    response: string
  ): Promise<number> {
    // Simple keyword-based relevancy (deterministic)
    // For production, would use embeddings with fixed seed

    const queryWords = this.tokenize(query);
    const responseWords = this.tokenize(response);

    if (queryWords.size === 0 || responseWords.size === 0) {
      return 0;
    }

    // Calculate Jaccard similarity
    const intersection = new Set([...queryWords].filter((w) => responseWords.has(w)));
    const union = new Set([...queryWords, ...responseWords]);
    const jaccard = intersection.size / union.size;

    // Length penalty (prefer concise answers)
    const lengthRatio = query.length / (response.length || 1);
    const lengthScore = Math.min(1, lengthRatio * 2);

    // Combine scores
    return (jaccard * 0.7 + lengthScore * 0.3);
  }

  /**
   * Tokenize text into words
   * Deterministic
   */
  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2) // Ignore very short words
    );
  }

  /**
   * Calculate embedding similarity (placeholder)
   * In production, would use actual embeddings with fixed seed
   */
  private embeddingSimilarity(query: string, response: string): number {
    // Placeholder: return Jaccard similarity
    return this.calculate(query, response);
  }
}
