/**
 * FailureEmbedding - Error embedding generation for semantic similarity
 *
 * Converts error messages and failure contexts into vector embeddings
 * for efficient similarity search in the FailureIndex.
 */

export interface FailureContext {
  /** Error message or description */
  message: string;
  /** Error type/category */
  type: string;
  /** Stack trace if available */
  stackTrace?: string;
  /** Task that failed */
  taskId?: string;
  /** Agent that encountered failure */
  agentId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface EmbeddingResult {
  /** The embedding vector */
  vector: number[];
  /** Tokens extracted from the failure */
  tokens: string[];
  /** Normalized message used for embedding */
  normalizedMessage: string;
  /** Feature weights used */
  featureWeights: Record<string, number>;
}

export interface EmbeddingConfig {
  /** Dimension of embedding vectors */
  dimensions: number;
  /** Whether to use TF-IDF weighting */
  useTfIdf: boolean;
  /** Minimum token length */
  minTokenLength: number;
  /** Stop words to exclude */
  stopWords: Set<string>;
  /** Feature weights for different components */
  featureWeights: {
    message: number;
    type: number;
    stackTrace: number;
    tokens: number;
  };
}

// Default stop words for error messages
const DEFAULT_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "to",
  "with",
  "and",
  "but",
  "if",
  "or",
  "because",
  "as",
  "until",
  "while",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
]);

/**
 * FailureEmbedding generates vector embeddings for failure contexts
 * using a combination of:
 * - Bag-of-words with TF-IDF weighting
 * - Error type encoding
 * - Stack trace pattern extraction
 */
export class FailureEmbedding {
  private config: EmbeddingConfig;
  private vocabulary: Map<string, number> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments: number = 0;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      dimensions: 128,
      useTfIdf: true,
      minTokenLength: 2,
      stopWords: DEFAULT_STOP_WORDS,
      featureWeights: {
        message: 0.4,
        type: 0.2,
        stackTrace: 0.2,
        tokens: 0.2,
      },
      ...config,
    };
  }

  /**
   * Generate embedding for a failure context
   */
  embed(context: FailureContext): EmbeddingResult {
    const normalizedMessage = this.normalizeMessage(context.message);
    const tokens = this.tokenize(normalizedMessage);

    // Update vocabulary and document frequency
    this.updateVocabulary(tokens);

    // Build feature vector
    const vector = this.buildVector(context, tokens);

    return {
      vector,
      tokens,
      normalizedMessage,
      featureWeights: { ...this.config.featureWeights },
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  similarity(embedding1: EmbeddingResult, embedding2: EmbeddingResult): number {
    return this.cosineSimilarity(embedding1.vector, embedding2.vector);
  }

  /**
   * Batch embed multiple failures
   */
  batchEmbed(contexts: FailureContext[]): EmbeddingResult[] {
    // First pass: update vocabulary with all documents
    const allTokens: string[][] = [];
    for (const context of contexts) {
      const normalized = this.normalizeMessage(context.message);
      const tokens = this.tokenize(normalized);
      allTokens.push(tokens);
    }

    // Batch update document frequencies
    for (const tokens of allTokens) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        const freq = this.documentFrequency.get(token) || 0;
        this.documentFrequency.set(token, freq + 1);
      }
    }
    this.totalDocuments += contexts.length;

    // Second pass: generate embeddings
    return contexts.map((context) => this.embed(context));
  }

  /**
   * Find most similar failures from a set of embeddings
   */
  findSimilar(
    query: EmbeddingResult,
    candidates: EmbeddingResult[],
    topK: number = 5
  ): Array<{ embedding: EmbeddingResult; similarity: number }> {
    const results = candidates.map((candidate) => ({
      embedding: candidate,
      similarity: this.similarity(query, candidate),
    }));

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topK);
  }

  /**
   * Get current vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * Get document count for TF-IDF
   */
  getDocumentCount(): number {
    return this.totalDocuments;
  }

  /**
   * Reset the embedding model state
   */
  reset(): void {
    this.vocabulary.clear();
    this.documentFrequency.clear();
    this.totalDocuments = 0;
  }

  /**
   * Export model state for persistence
   */
  exportState(): {
    vocabulary: Array<[string, number]>;
    documentFrequency: Array<[string, number]>;
    totalDocuments: number;
  } {
    return {
      vocabulary: Array.from(this.vocabulary.entries()),
      documentFrequency: Array.from(this.documentFrequency.entries()),
      totalDocuments: this.totalDocuments,
    };
  }

  /**
   * Import model state from persistence
   */
  importState(state: {
    vocabulary: Array<[string, number]>;
    documentFrequency: Array<[string, number]>;
    totalDocuments: number;
  }): void {
    this.vocabulary = new Map(state.vocabulary);
    this.documentFrequency = new Map(state.documentFrequency);
    this.totalDocuments = state.totalDocuments;
  }

  // Private methods

  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  private tokenize(message: string): string[] {
    return message
      .split(" ")
      .filter(
        (token) =>
          token.length >= this.config.minTokenLength &&
          !this.config.stopWords.has(token)
      );
  }

  private updateVocabulary(tokens: string[]): void {
    const uniqueTokens = new Set(tokens);

    for (const token of uniqueTokens) {
      if (!this.vocabulary.has(token)) {
        this.vocabulary.set(token, this.vocabulary.size);
      }

      const freq = this.documentFrequency.get(token) || 0;
      this.documentFrequency.set(token, freq + 1);
    }

    this.totalDocuments++;
  }

  private buildVector(context: FailureContext, tokens: string[]): number[] {
    const vector = new Array(this.config.dimensions).fill(0);

    // 1. Message token features (using TF-IDF)
    const tokenFeatures = this.buildTokenFeatures(tokens);
    this.addWeightedFeatures(
      vector,
      tokenFeatures,
      0,
      this.config.featureWeights.tokens
    );

    // 2. Error type features
    const typeFeatures = this.buildTypeFeatures(context.type);
    this.addWeightedFeatures(
      vector,
      typeFeatures,
      32,
      this.config.featureWeights.type
    );

    // 3. Stack trace pattern features
    if (context.stackTrace) {
      const stackFeatures = this.buildStackTraceFeatures(context.stackTrace);
      this.addWeightedFeatures(
        vector,
        stackFeatures,
        64,
        this.config.featureWeights.stackTrace
      );
    }

    // 4. Message semantic features (simple n-gram hashing)
    const messageFeatures = this.buildMessageFeatures(context.message);
    this.addWeightedFeatures(
      vector,
      messageFeatures,
      96,
      this.config.featureWeights.message
    );

    // Normalize the vector
    return this.normalize(vector);
  }

  private buildTokenFeatures(tokens: string[]): number[] {
    const features = new Array(32).fill(0);
    const termFrequency = new Map<string, number>();

    // Calculate term frequency
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    // Build TF-IDF features using hashing trick
    for (const [token, tf] of termFrequency) {
      const idf = this.config.useTfIdf ? this.calculateIdf(token) : 1;
      const tfidf = tf * idf;
      const index = this.hashToken(token) % 32;
      features[index] += tfidf;
    }

    return features;
  }

  private buildTypeFeatures(type: string): number[] {
    const features = new Array(32).fill(0);

    // Common error type patterns
    const typePatterns: Record<string, number[]> = {
      TypeError: [1, 0, 0, 0, 0, 0, 0, 0],
      SyntaxError: [0, 1, 0, 0, 0, 0, 0, 0],
      ReferenceError: [0, 0, 1, 0, 0, 0, 0, 0],
      RangeError: [0, 0, 0, 1, 0, 0, 0, 0],
      NetworkError: [0, 0, 0, 0, 1, 0, 0, 0],
      TimeoutError: [0, 0, 0, 0, 0, 1, 0, 0],
      ValidationError: [0, 0, 0, 0, 0, 0, 1, 0],
      Unknown: [0, 0, 0, 0, 0, 0, 0, 1],
    };

    // Match type to pattern
    let matched = false;
    for (const [pattern, encoding] of Object.entries(typePatterns)) {
      if (type.toLowerCase().includes(pattern.toLowerCase())) {
        for (let i = 0; i < encoding.length; i++) {
          features[i] = encoding[i];
        }
        matched = true;
        break;
      }
    }

    // If no match, hash the type
    if (!matched) {
      const index = this.hashToken(type) % 32;
      features[index] = 1;
    }

    return features;
  }

  private buildStackTraceFeatures(stackTrace: string): number[] {
    const features = new Array(32).fill(0);

    // Extract file patterns
    const fileMatches = stackTrace.match(/\.(ts|js|tsx|jsx):\d+/g) || [];
    features[0] = Math.min(fileMatches.length / 10, 1);

    // Extract function names
    const funcMatches = stackTrace.match(/at (\w+)/g) || [];
    features[1] = Math.min(funcMatches.length / 10, 1);

    // Check for common patterns
    if (stackTrace.includes("node_modules")) features[2] = 1;
    if (stackTrace.includes("async")) features[3] = 1;
    if (stackTrace.includes("Promise")) features[4] = 1;
    if (stackTrace.includes("EventEmitter")) features[5] = 1;

    // Stack depth indicator
    const lines = stackTrace.split("\n").length;
    features[6] = Math.min(lines / 20, 1);

    // Hash unique file names
    const uniqueFiles = new Set(fileMatches);
    for (const file of uniqueFiles) {
      const index = 7 + (this.hashToken(file) % 25);
      features[index] = 1;
    }

    return features;
  }

  private buildMessageFeatures(message: string): number[] {
    const features = new Array(32).fill(0);

    // Generate character n-grams (2-grams and 3-grams)
    const normalized = message.toLowerCase();

    // 2-grams
    for (let i = 0; i < normalized.length - 1; i++) {
      const ngram = normalized.substring(i, i + 2);
      const index = this.hashToken(ngram) % 16;
      features[index] += 0.1;
    }

    // 3-grams
    for (let i = 0; i < normalized.length - 2; i++) {
      const ngram = normalized.substring(i, i + 3);
      const index = 16 + (this.hashToken(ngram) % 16);
      features[index] += 0.1;
    }

    return features;
  }

  private addWeightedFeatures(
    target: number[],
    features: number[],
    offset: number,
    weight: number
  ): void {
    for (let i = 0; i < features.length && offset + i < target.length; i++) {
      target[offset + i] += features[i] * weight;
    }
  }

  private calculateIdf(token: string): number {
    const docFreq = this.documentFrequency.get(token) || 0;
    if (docFreq === 0 || this.totalDocuments === 0) return 1;
    return Math.log(1 + this.totalDocuments / docFreq);
  }

  private hashToken(token: string): number {
    // Simple djb2 hash
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 33) ^ token.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
