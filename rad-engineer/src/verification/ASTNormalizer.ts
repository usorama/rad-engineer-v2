/**
 * ASTNormalizer - Normalize code for semantic comparison
 *
 * Converts code to a canonical form by:
 * - Removing comments
 * - Normalizing whitespace
 * - Sorting imports
 * - Standardizing formatting
 */

export interface NormalizationConfig {
  /** Remove all comments */
  removeComments: boolean;
  /** Normalize whitespace to single spaces */
  normalizeWhitespace: boolean;
  /** Sort import statements alphabetically */
  sortImports: boolean;
  /** Remove empty lines */
  removeEmptyLines: boolean;
  /** Normalize string quotes (single vs double) */
  normalizeQuotes: boolean;
  /** Preserve function order */
  preserveFunctionOrder: boolean;
  /** Language for parsing */
  language: "typescript" | "javascript" | "python" | "auto";
}

export interface NormalizationResult {
  /** Normalized code */
  normalized: string;
  /** Hash of normalized code */
  hash: string;
  /** Transformations applied */
  transformations: string[];
  /** Original line count */
  originalLineCount: number;
  /** Normalized line count */
  normalizedLineCount: number;
}

export interface CodeSection {
  type: "import" | "export" | "function" | "class" | "variable" | "other";
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * ASTNormalizer provides code normalization for semantic comparison
 */
export class ASTNormalizer {
  private config: NormalizationConfig;

  constructor(config: Partial<NormalizationConfig> = {}) {
    this.config = {
      removeComments: true,
      normalizeWhitespace: true,
      sortImports: true,
      removeEmptyLines: true,
      normalizeQuotes: true,
      preserveFunctionOrder: true,
      language: "auto",
      ...config,
    };
  }

  /**
   * Normalize code to canonical form
   */
  normalize(code: string): NormalizationResult {
    const transformations: string[] = [];
    let normalized = code;
    const originalLineCount = code.split("\n").length;

    // Detect language if auto
    const language = this.config.language === "auto"
      ? this.detectLanguage(code)
      : this.config.language;

    // Apply transformations in order
    if (this.config.removeComments) {
      normalized = this.removeComments(normalized, language);
      transformations.push("removeComments");
    }

    if (this.config.normalizeWhitespace) {
      normalized = this.normalizeWhitespace(normalized);
      transformations.push("normalizeWhitespace");
    }

    if (this.config.removeEmptyLines) {
      normalized = this.removeEmptyLines(normalized);
      transformations.push("removeEmptyLines");
    }

    if (this.config.sortImports) {
      normalized = this.sortImports(normalized, language);
      transformations.push("sortImports");
    }

    if (this.config.normalizeQuotes) {
      normalized = this.normalizeQuotes(normalized, language);
      transformations.push("normalizeQuotes");
    }

    // Final cleanup
    normalized = normalized.trim();
    const normalizedLineCount = normalized.split("\n").length;

    return {
      normalized,
      hash: this.hashCode(normalized),
      transformations,
      originalLineCount,
      normalizedLineCount,
    };
  }

  /**
   * Compare two code strings semantically
   */
  compare(code1: string, code2: string): {
    identical: boolean;
    similarity: number;
    differences: string[];
  } {
    const norm1 = this.normalize(code1);
    const norm2 = this.normalize(code2);

    if (norm1.hash === norm2.hash) {
      return { identical: true, similarity: 1.0, differences: [] };
    }

    // Calculate line-by-line similarity
    const lines1 = norm1.normalized.split("\n");
    const lines2 = norm2.normalized.split("\n");

    const { similarity, differences } = this.compareLines(lines1, lines2);

    return { identical: false, similarity, differences };
  }

  /**
   * Extract structural sections from code
   */
  extractSections(code: string): CodeSection[] {
    const sections: CodeSection[] = [];
    const lines = code.split("\n");
    const language = this.detectLanguage(code);

    let currentSection: CodeSection | null = null;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track brace depth for multi-line constructs
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Detect section type
      const sectionType = this.detectSectionType(trimmed, language);

      if (sectionType && !currentSection) {
        currentSection = {
          type: sectionType,
          content: line,
          startLine: i + 1,
          endLine: i + 1,
        };
      } else if (currentSection) {
        currentSection.content += "\n" + line;
        currentSection.endLine = i + 1;

        // Check if section is complete
        if (braceDepth === 0 || this.isSectionComplete(trimmed, language)) {
          sections.push(currentSection);
          currentSection = null;
        }
      } else if (trimmed) {
        // Single-line section
        sections.push({
          type: sectionType || "other",
          content: line,
          startLine: i + 1,
          endLine: i + 1,
        });
      }
    }

    // Handle any remaining section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Get canonical form for comparison
   */
  getCanonicalForm(code: string): string {
    return this.normalize(code).normalized;
  }

  /**
   * Create fingerprint of code structure
   */
  fingerprint(code: string): string {
    const sections = this.extractSections(code);
    const structure = sections.map(s => `${s.type}:${s.content.length}`).join("|");
    return this.hashCode(structure);
  }

  // Private methods

  private detectLanguage(code: string): "typescript" | "javascript" | "python" {
    // Simple heuristics for language detection
    if (code.includes("def ") || code.includes("import ") && !code.includes("from '")) {
      if (code.includes("def ") && code.includes(":")) {
        return "python";
      }
    }
    if (code.includes(": ") && (code.includes("interface ") || code.includes("<") && code.includes(">"))) {
      return "typescript";
    }
    return "javascript";
  }

  private removeComments(code: string, language: string): string {
    if (language === "python") {
      // Remove Python comments
      return code
        .replace(/#.*$/gm, "") // Line comments
        .replace(/'''[\s\S]*?'''/g, "") // Triple single-quote strings used as comments
        .replace(/"""[\s\S]*?"""/g, ""); // Triple double-quote strings used as comments
    }

    // JavaScript/TypeScript comments
    return code
      .replace(/\/\/.*$/gm, "") // Line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Block comments
  }

  private normalizeWhitespace(code: string): string {
    return code
      .split("\n")
      .map(line => {
        // Preserve indentation but normalize spaces within line
        const indent = line.match(/^(\s*)/)?.[1] || "";
        const content = line.slice(indent.length);
        const normalizedContent = content.replace(/\s+/g, " ").trim();
        return indent + normalizedContent;
      })
      .join("\n");
  }

  private removeEmptyLines(code: string): string {
    return code
      .split("\n")
      .filter(line => line.trim().length > 0)
      .join("\n");
  }

  private sortImports(code: string, language: string): string {
    const lines = code.split("\n");
    const importLines: string[] = [];
    const otherLines: string[] = [];
    let inImportSection = true;

    for (const line of lines) {
      const trimmed = line.trim();

      if (inImportSection) {
        if (this.isImportLine(trimmed, language)) {
          importLines.push(line);
        } else if (trimmed === "") {
          // Skip empty lines in import section
          continue;
        } else {
          inImportSection = false;
          otherLines.push(line);
        }
      } else {
        otherLines.push(line);
      }
    }

    // Sort imports
    const sortedImports = [...importLines].sort((a, b) => {
      // Extract module name for sorting
      const moduleA = this.extractModuleName(a, language);
      const moduleB = this.extractModuleName(b, language);
      return moduleA.localeCompare(moduleB);
    });

    // Combine
    if (sortedImports.length > 0) {
      return [...sortedImports, "", ...otherLines].join("\n");
    }
    return otherLines.join("\n");
  }

  private isImportLine(line: string, language: string): boolean {
    if (language === "python") {
      return line.startsWith("import ") || line.startsWith("from ");
    }
    return line.startsWith("import ") || line.startsWith("export ") && line.includes("from");
  }

  private extractModuleName(line: string, language: string): string {
    if (language === "python") {
      const match = line.match(/(?:from|import)\s+([^\s]+)/);
      return match?.[1] || line;
    }
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    return match?.[1] || line;
  }

  private normalizeQuotes(code: string, language: string): string {
    if (language === "python") {
      // Python: normalize to double quotes
      return code.replace(/'/g, '"');
    }
    // JS/TS: normalize to single quotes (common convention)
    // But be careful not to change template literals
    return code.replace(/(?<!`)"/g, "'").replace(/''/g, '""');
  }

  private detectSectionType(
    line: string,
    language: string
  ): CodeSection["type"] | null {
    if (language === "python") {
      if (line.startsWith("import ") || line.startsWith("from ")) return "import";
      if (line.startsWith("def ")) return "function";
      if (line.startsWith("class ")) return "class";
      if (line.match(/^\w+\s*=/)) return "variable";
      return null;
    }

    // JavaScript/TypeScript
    if (line.startsWith("import ")) return "import";
    if (line.startsWith("export ")) return "export";
    if (line.match(/^(export\s+)?(async\s+)?function\s/)) return "function";
    if (line.match(/^(export\s+)?(abstract\s+)?class\s/)) return "class";
    if (line.match(/^(export\s+)?(const|let|var)\s/)) return "variable";
    return null;
  }

  private isSectionComplete(line: string, language: string): boolean {
    if (language === "python") {
      // Python uses indentation, not braces
      return false; // Need more sophisticated tracking
    }
    return line.endsWith("}") || line.endsWith(";");
  }

  private compareLines(
    lines1: string[],
    lines2: string[]
  ): { similarity: number; differences: string[] } {
    const differences: string[] = [];
    const maxLen = Math.max(lines1.length, lines2.length);
    let matchCount = 0;

    // Create sets for faster lookup
    const set1 = new Set(lines1);
    const set2 = new Set(lines2);

    // Count matches
    for (const line of lines1) {
      if (set2.has(line)) {
        matchCount++;
      } else {
        differences.push(`- ${line.substring(0, 50)}...`);
      }
    }

    for (const line of lines2) {
      if (!set1.has(line)) {
        differences.push(`+ ${line.substring(0, 50)}...`);
      }
    }

    const similarity = maxLen > 0 ? matchCount / maxLen : 1.0;

    return { similarity, differences: differences.slice(0, 10) };
  }

  private hashCode(str: string): string {
    // Simple hash for comparison purposes
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

/**
 * Create a default AST normalizer
 */
export function createNormalizer(
  config?: Partial<NormalizationConfig>
): ASTNormalizer {
  return new ASTNormalizer(config);
}
