/**
 * Faithfulness Metric
 *
 * Measures how faithful the response is to retrieved context.
 * Checks for hallucinations and contradictions.
 */

export class FaithfulnessMetric {
  /**
   * Calculate faithfulness (0-1)
   * Deterministic
   */
  async calculate(
    response: string,
    context: string[]
  ): Promise<number> {
    if (context.length === 0) {
      // No context to verify against, assume neutral
      return 0.5;
    }

    // Extract claims from response
    const responseClaims = this.extractClaims(response);

    if (responseClaims.length === 0) {
      return 1; // No claims to verify
    }

    // Verify each claim against context
    let verifiedCount = 0;
    for (const claim of responseClaims) {
      if (this.verifyClaim(claim, context)) {
        verifiedCount++;
      }
    }

    return verifiedCount / responseClaims.length;
  }

  /**
   * Extract factual claims from text
   * Deterministic
   */
  private extractClaims(text: string): string[] {
    const claims: string[] = [];

    // Simple sentence splitting
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Look for sentences with factual indicators
    const factualPatterns = [
      /\b(is|are|was|were)\b/i,
      /\b(can|could|will|would)\b/i,
      /\b(has|have|had)\b/i,
      /\d+/, // Contains numbers
    ];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (factualPatterns.some((pattern) => pattern.test(trimmed))) {
        claims.push(trimmed);
      }
    }

    return claims;
  }

  /**
   * Verify claim against context
   * Deterministic
   */
  private verifyClaim(claim: string, context: string[]): boolean {
    const claimWords = this.tokenize(claim);

    // Check if any context chunk contains most claim words
    for (const ctx of context) {
      const contextWords = this.tokenize(ctx);

      // Calculate overlap
      const overlap = claimWords.filter((w) => contextWords.has(w));
      const overlapRatio = overlap.length / claimWords.length;

      // High overlap suggests claim is supported
      if (overlapRatio >= 0.6) {
        // Also check for contradictions
        if (!this.hasContradiction(claim, ctx)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if claim contradicts context
   * Deterministic
   */
  private hasContradiction(claim: string, context: string): boolean {
    const contradictionPatterns = [
      /\b(not|no|never|neither)\b.*\b(is|are|was|were)\b/i,
      /\b(false|incorrect|wrong)\b/i,
    ];

    const claimLower = claim.toLowerCase();
    const contextLower = context.toLowerCase();

    // Check if claim has negation that contradicts positive assertion in context
    for (const pattern of contradictionPatterns) {
      if (pattern.test(claimLower)) {
        // Check if context has opposite meaning
        if (/\b(is|are|was|were|true|correct|yes)\b/i.test(contextLower)) {
          return true;
        }
      }
    }

    return false;
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
        .filter((w) => w.length > 2)
    );
  }
}
