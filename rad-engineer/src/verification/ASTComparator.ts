/**
 * ASTComparator - Semantic code comparison
 *
 * Compares code at the semantic level, accounting for:
 * - Different variable names
 * - Different formatting
 * - Functionally equivalent constructs
 */

import { ASTNormalizer, CodeSection, NormalizationConfig } from "./ASTNormalizer.js";

export interface ComparisonResult {
  /** Are the codes semantically identical? */
  identical: boolean;
  /** Similarity score (0-1) */
  similarity: number;
  /** Structural similarity (same functions, classes, etc.) */
  structuralSimilarity: number;
  /** Content similarity after normalization */
  contentSimilarity: number;
  /** Detailed differences */
  differences: Difference[];
  /** Comparison metadata */
  metadata: ComparisonMetadata;
}

export interface Difference {
  type: "added" | "removed" | "modified" | "moved";
  location: { line: number; column?: number };
  description: string;
  code?: string;
  section?: string;
}

export interface ComparisonMetadata {
  /** Time taken for comparison (ms) */
  comparisonTimeMs: number;
  /** Lines in code A */
  linesA: number;
  /** Lines in code B */
  linesB: number;
  /** Sections compared */
  sectionsCompared: number;
  /** Normalization applied */
  normalizationApplied: boolean;
}

export interface ComparatorConfig {
  /** Minimum similarity for "identical" */
  identicalThreshold: number;
  /** Weight for structural similarity */
  structuralWeight: number;
  /** Weight for content similarity */
  contentWeight: number;
  /** Ignore whitespace differences */
  ignoreWhitespace: boolean;
  /** Ignore comment differences */
  ignoreComments: boolean;
  /** Normalization config */
  normalization: Partial<NormalizationConfig>;
}

/**
 * ASTComparator provides semantic code comparison
 */
export class ASTComparator {
  private config: ComparatorConfig;
  private normalizer: ASTNormalizer;

  constructor(config: Partial<ComparatorConfig> = {}) {
    this.config = {
      identicalThreshold: 0.98,
      structuralWeight: 0.4,
      contentWeight: 0.6,
      ignoreWhitespace: true,
      ignoreComments: true,
      normalization: {},
      ...config,
    };

    this.normalizer = new ASTNormalizer({
      removeComments: this.config.ignoreComments,
      normalizeWhitespace: this.config.ignoreWhitespace,
      ...this.config.normalization,
    });
  }

  /**
   * Compare two code strings
   */
  compare(codeA: string, codeB: string): ComparisonResult {
    const startTime = performance.now();

    // Normalize both codes
    const normA = this.normalizer.normalize(codeA);
    const normB = this.normalizer.normalize(codeB);

    // Quick check: identical after normalization
    if (normA.hash === normB.hash) {
      return {
        identical: true,
        similarity: 1.0,
        structuralSimilarity: 1.0,
        contentSimilarity: 1.0,
        differences: [],
        metadata: {
          comparisonTimeMs: performance.now() - startTime,
          linesA: normA.originalLineCount,
          linesB: normB.originalLineCount,
          sectionsCompared: 0,
          normalizationApplied: true,
        },
      };
    }

    // Extract sections for structural comparison
    const sectionsA = this.normalizer.extractSections(codeA);
    const sectionsB = this.normalizer.extractSections(codeB);

    // Calculate structural similarity
    const structuralSimilarity = this.compareStructure(sectionsA, sectionsB);

    // Calculate content similarity
    const contentComparison = this.normalizer.compare(codeA, codeB);
    const contentSimilarity = contentComparison.similarity;

    // Weighted overall similarity
    const similarity =
      structuralSimilarity * this.config.structuralWeight +
      contentSimilarity * this.config.contentWeight;

    // Identify differences
    const differences = this.identifyDifferences(
      normA.normalized,
      normB.normalized,
      sectionsA,
      sectionsB
    );

    return {
      identical: similarity >= this.config.identicalThreshold,
      similarity,
      structuralSimilarity,
      contentSimilarity,
      differences,
      metadata: {
        comparisonTimeMs: performance.now() - startTime,
        linesA: normA.originalLineCount,
        linesB: normB.originalLineCount,
        sectionsCompared: sectionsA.length + sectionsB.length,
        normalizationApplied: true,
      },
    };
  }

  /**
   * Compare multiple code samples to find consensus
   */
  findConsensus(codes: string[]): {
    consensus: string | null;
    agreementRate: number;
    clusters: Array<{ code: string; count: number }>;
  } {
    if (codes.length === 0) {
      return { consensus: null, agreementRate: 0, clusters: [] };
    }

    if (codes.length === 1) {
      return {
        consensus: codes[0],
        agreementRate: 1.0,
        clusters: [{ code: codes[0], count: 1 }],
      };
    }

    // Normalize all codes
    const normalized = codes.map((code) => ({
      original: code,
      norm: this.normalizer.normalize(code),
    }));

    // Group by hash
    const groups = new Map<string, { code: string; count: number }>();
    for (const { original, norm } of normalized) {
      const existing = groups.get(norm.hash);
      if (existing) {
        existing.count++;
      } else {
        groups.set(norm.hash, { code: original, count: 1 });
      }
    }

    // Find majority
    const clusters = Array.from(groups.values()).sort((a, b) => b.count - a.count);
    const consensus = clusters[0];

    return {
      consensus: consensus.code,
      agreementRate: consensus.count / codes.length,
      clusters,
    };
  }

  /**
   * Check if codes are functionally equivalent
   */
  areFunctionallyEquivalent(codeA: string, codeB: string): boolean {
    const result = this.compare(codeA, codeB);
    return result.identical;
  }

  /**
   * Calculate drift between code samples
   */
  calculateDrift(samples: string[]): {
    driftRate: number;
    uniqueVariants: number;
    consensus: string | null;
  } {
    const result = this.findConsensus(samples);

    const uniqueVariants = result.clusters.length;
    const driftRate = samples.length > 0
      ? ((uniqueVariants - 1) / samples.length) * 100
      : 0;

    return {
      driftRate,
      uniqueVariants,
      consensus: result.consensus,
    };
  }

  /**
   * Get diff-style output
   */
  getDiff(codeA: string, codeB: string): string[] {
    const linesA = codeA.split("\n");
    const linesB = codeB.split("\n");

    const diff: string[] = [];
    const maxLen = Math.max(linesA.length, linesB.length);

    // Simple diff algorithm
    const lcsTable = this.buildLCSTable(linesA, linesB);
    const lcs = this.backtrackLCS(lcsTable, linesA, linesB);

    let indexA = 0;
    let indexB = 0;

    for (const commonLine of lcs) {
      // Output removed lines before common
      while (indexA < linesA.length && linesA[indexA] !== commonLine) {
        diff.push(`- ${linesA[indexA]}`);
        indexA++;
      }

      // Output added lines before common
      while (indexB < linesB.length && linesB[indexB] !== commonLine) {
        diff.push(`+ ${linesB[indexB]}`);
        indexB++;
      }

      // Output common line
      diff.push(`  ${commonLine}`);
      indexA++;
      indexB++;
    }

    // Remaining lines
    while (indexA < linesA.length) {
      diff.push(`- ${linesA[indexA]}`);
      indexA++;
    }
    while (indexB < linesB.length) {
      diff.push(`+ ${linesB[indexB]}`);
      indexB++;
    }

    return diff;
  }

  // Private methods

  private compareStructure(
    sectionsA: CodeSection[],
    sectionsB: CodeSection[]
  ): number {
    // Compare section types and order
    const typesA = sectionsA.map((s) => s.type);
    const typesB = sectionsB.map((s) => s.type);

    // Count matching types
    const countA = new Map<string, number>();
    const countB = new Map<string, number>();

    for (const t of typesA) {
      countA.set(t, (countA.get(t) || 0) + 1);
    }
    for (const t of typesB) {
      countB.set(t, (countB.get(t) || 0) + 1);
    }

    // Calculate similarity based on type distribution
    let matchScore = 0;
    let totalScore = 0;

    const allTypes = new Set([...countA.keys(), ...countB.keys()]);
    for (const t of allTypes) {
      const a = countA.get(t) || 0;
      const b = countB.get(t) || 0;
      matchScore += Math.min(a, b);
      totalScore += Math.max(a, b);
    }

    return totalScore > 0 ? matchScore / totalScore : 1.0;
  }

  private identifyDifferences(
    normA: string,
    normB: string,
    sectionsA: CodeSection[],
    sectionsB: CodeSection[]
  ): Difference[] {
    const differences: Difference[] = [];

    // Find removed sections (in A but not in B)
    const sectionContentsB = new Set(
      sectionsB.map((s) => this.normalizer.getCanonicalForm(s.content))
    );

    for (const section of sectionsA) {
      const canonical = this.normalizer.getCanonicalForm(section.content);
      if (!sectionContentsB.has(canonical)) {
        differences.push({
          type: "removed",
          location: { line: section.startLine },
          description: `Removed ${section.type}`,
          code: section.content.substring(0, 100),
          section: section.type,
        });
      }
    }

    // Find added sections (in B but not in A)
    const sectionContentsA = new Set(
      sectionsA.map((s) => this.normalizer.getCanonicalForm(s.content))
    );

    for (const section of sectionsB) {
      const canonical = this.normalizer.getCanonicalForm(section.content);
      if (!sectionContentsA.has(canonical)) {
        differences.push({
          type: "added",
          location: { line: section.startLine },
          description: `Added ${section.type}`,
          code: section.content.substring(0, 100),
          section: section.type,
        });
      }
    }

    return differences.slice(0, 20); // Limit differences
  }

  private buildLCSTable(a: string[], b: string[]): number[][] {
    const table: number[][] = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(0));

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          table[i][j] = table[i - 1][j - 1] + 1;
        } else {
          table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
        }
      }
    }

    return table;
  }

  private backtrackLCS(table: number[][], a: string[], b: string[]): string[] {
    const lcs: string[] = [];
    let i = a.length;
    let j = b.length;

    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (table[i - 1][j] > table[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }
}

/**
 * Create a default comparator
 */
export function createComparator(
  config?: Partial<ComparatorConfig>
): ASTComparator {
  return new ASTComparator(config);
}
