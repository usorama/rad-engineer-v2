/**
 * Query Feature Extractor
 *
 * Extracts deterministic features from queries for routing decisions.
 * All extraction is deterministic (no ML models, no probabilistic classification).
 */

import type { QueryFeatures, Domain } from "./types.js";

/**
 * Domain keyword mappings (deterministic)
 */
const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  code: [
    "function",
    "class",
    "import",
    "export",
    "const",
    "let",
    "var",
    "async",
    "await",
    "return",
    "if",
    "else",
    "for",
    "while",
    "```",
    "def ",
    "class ",
    "print(",
    "//",
    "/*",
  ],
  creative: [
    "write",
    "story",
    "poem",
    "creative",
    "imagine",
    "fiction",
    "narrative",
    "character",
    "plot",
    "setting",
  ],
  reasoning: [
    "why",
    "how",
    "explain",
    "reason",
    "because",
    "therefore",
    "analyze",
    "compare",
    "evaluate",
    "justify",
    "solve",
    "problem",
  ],
  analysis: [
    "analyze",
    "summarize",
    "extract",
    "find",
    "identify",
    "list",
    "count",
    "calculate",
    "measure",
    "determine",
  ],
  general: [], // Default
};

/**
 * Complexity keywords (weighted)
 */
const COMPLEXITY_KEYWORDS: Record<string, number> = {
  // High complexity
  algorithm: 0.8,
  recursion: 0.8,
  optimization: 0.7,
  "design pattern": 0.7,
  architecture: 0.7,
  "machine learning": 0.9,
  "neural network": 0.9,
  "distributed system": 0.8,

  // Medium complexity
  function: 0.4,
  class: 0.4,
  object: 0.3,
  array: 0.3,
  string: 0.2,
  number: 0.2,
  boolean: 0.2,

  // Low complexity
  hello: 0.1,
  example: 0.1,
  simple: 0.1,
  basic: 0.1,
};

/**
 * Extract features from query (deterministic)
 */
export class QueryFeatureExtractor {
  /**
   * Extract all features from query
   */
  extract(query: string): QueryFeatures {
    const trimmed = query.trim();

    return {
      tokenCount: this.countTokens(trimmed),
      lineCount: this.countLines(trimmed),
      maxDepth: this.calculateDepth(trimmed),
      hasCodeBlock: this.hasCodeBlock(trimmed),
      hasMath: this.hasMath(trimmed),
      domain: this.classifyDomain(trimmed),
      complexityScore: this.calculateComplexity(trimmed),
      maxCost: this.extractMaxCost(trimmed),
      minQuality: this.extractMinQuality(trimmed),
      maxLatency: this.extractMaxLatency(trimmed),
    };
  }

  /**
   * Count tokens (approximate: ~4 characters per token)
   * Deterministic
   */
  private countTokens(query: string): number {
    return Math.ceil(query.length / 4);
  }

  /**
   * Count lines
   * Deterministic
   */
  private countLines(query: string): number {
    return query.split("\n").length;
  }

  /**
   * Calculate maximum nesting depth (for code)
   * Deterministic
   */
  private calculateDepth(query: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of query) {
      if (char === "{" || char === "(" || char === "[" || char === "<") {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === "}" || char === ")" || char === "]" || char === ">") {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Check if query contains code block markers
   * Deterministic
   */
  private hasCodeBlock(query: string): boolean {
    return query.includes("```") || query.includes("import ") || query.includes("def ");
  }

  /**
   * Check if query contains math notation
   * Deterministic
   */
  private hasMath(query: string): boolean {
    const mathPatterns = [
      /\$\$[\s\S]*?\$\$/, // $$...$$
      /\$[^$]+\$/, // $...$
      /\\[a-zA-Z]+/, // LaTeX commands
      /\b(sin|cos|tan|log|sqrt|sum|int|prod|lim)\b/i, // Math functions
    ];

    return mathPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Classify domain using keyword matching
   * Deterministic
   */
  private classifyDomain(query: string): Domain {
    const lower = query.toLowerCase();

    // Count keyword matches for each domain
    const scores: Record<Domain, number> = {
      code: 0,
      creative: 0,
      reasoning: 0,
      analysis: 0,
      general: 0,
    };

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          scores[domain as Domain]++;
        }
      }
    }

    // Find domain with highest score
    let maxScore = 0;
    let bestDomain: Domain = "general";

    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain as Domain;
      }
    }

    return bestDomain;
  }

  /**
   * Calculate complexity score (0-1)
   * Deterministic
   */
  private calculateComplexity(query: string): number {
    const lower = query.toLowerCase();

    // Start with base complexity
    let complexity = 0.3;

    // Add complexity for keywords
    for (const [keyword, weight] of Object.entries(COMPLEXITY_KEYWORDS)) {
      if (lower.includes(keyword)) {
        complexity += weight * 0.5;
      }
    }

    // Adjust based on structure
    const depth = this.calculateDepth(query);
    complexity += Math.min(depth * 0.1, 0.3);

    const tokens = this.countTokens(query);
    if (tokens > 1000) {
      complexity += 0.2;
    } else if (tokens > 500) {
      complexity += 0.1;
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Extract max cost requirement from query
   * Looks for patterns like "max cost: $0.01" or "cost < 0.01"
   */
  private extractMaxCost(query: string): number | undefined {
    const patterns = [
      /max cost:\s*\$?([\d.]+)/i,
      /cost\s*<\s*\$?([\d.]+)/i,
      /maximum cost:\s*\$?([\d.]+)/i,
      /budget:\s*\$?([\d.]+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Extract min quality requirement from query
   * Looks for patterns like "min quality: 0.8" or "quality > 0.8"
   */
  private extractMinQuality(query: string): number | undefined {
    const patterns = [
      /min quality:\s*([\d.]+)/i,
      /quality\s*>\s*([\d.]+)/i,
      /minimum quality:\s*([\d.]+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Extract max latency requirement from query
   * Looks for patterns like "max latency: 1s" or "latency < 1000ms"
   */
  private extractMaxLatency(query: string): number | undefined {
    const patterns = [
      /max latency:\s*(\d+)\s*(ms|s)/i,
      /latency\s*<\s*(\d+)\s*(ms|s)/i,
      /maximum latency:\s*(\d+)\s*(ms|s)/i,
      /timeout:\s*(\d+)\s*(ms|s)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        let value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit === "s") {
          value *= 1000; // Convert to ms
        }
        return value;
      }
    }

    return undefined;
  }

  /**
   * Batch extract features from multiple queries
   * Deterministic
   */
  extractBatch(queries: string[]): QueryFeatures[] {
    return queries.map((q) => this.extract(q));
  }

  /**
   * Compare two queries for similarity
   * Deterministic (simple token overlap)
   */
  similarity(query1: string, query2: string): number {
    const tokens1 = new Set(this.tokenize(query1));
    const tokens2 = new Set(this.tokenize(query2));

    if (tokens1.size === 0 && tokens2.size === 0) {
      return 1; // Both empty
    }

    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Tokenize query into words
   * Deterministic
   */
  private tokenize(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }
}
