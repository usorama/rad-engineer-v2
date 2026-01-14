/**
 * BMAD Method Catalog
 *
 * Catalogs and manages 50 BMAD elicitation methods loaded from methods.csv.
 * Provides fast lookup, filtering, and categorization of reasoning methods.
 */

import { readFileSync } from 'fs';
import type {
  ReasoningMethod,
  MethodCategory,
  Domain,
  MethodCSVRow,
  MethodCatalogStats,
} from './types.js';

/**
 * Default domains for methods if not specified
 */
const DEFAULT_DOMAINS: Domain[] = ['code', 'creative', 'reasoning', 'analysis'];

/**
 * Category to complexity mapping
 */
const CATEGORY_COMPLEXITY: Record<MethodCategory, number> = {
  core: 3,
  advanced: 7,
  collaboration: 6,
  competitive: 5,
  creative: 5,
  learning: 4,
  philosophical: 6,
  research: 7,
  retrospective: 4,
  risk: 6,
  technical: 5,
};

/**
 * Category to time requirement mapping
 */
const CATEGORY_TIME: Record<MethodCategory, 'quick' | 'medium' | 'extensive'> = {
  core: 'quick',
  advanced: 'medium',
  collaboration: 'extensive',
  competitive: 'medium',
  creative: 'medium',
  learning: 'quick',
  philosophical: 'medium',
  research: 'extensive',
  retrospective: 'medium',
  risk: 'medium',
  technical: 'medium',
};

/**
 * Category to stakeholder requirement mapping
 */
const CATEGORY_STAKEHOLDERS: Record<MethodCategory, 'solo' | 'pair' | 'team'> = {
  core: 'solo',
  advanced: 'solo',
  collaboration: 'team',
  competitive: 'team',
  creative: 'pair',
  learning: 'solo',
  philosophical: 'solo',
  research: 'pair',
  retrospective: 'solo',
  risk: 'pair',
  technical: 'pair',
};

/**
 * Method Catalog class
 *
 * Loads and manages the BMAD methods catalog from CSV.
 */
export class MethodCatalog {
  private methods: Map<string, ReasoningMethod>;
  private byCategory: Map<MethodCategory, ReasoningMethod[]>;
  private byDomain: Map<Domain, ReasoningMethod[]>;
  private loaded: boolean = false;

  constructor() {
    this.methods = new Map();
    this.byCategory = new Map();
    this.byDomain = new Map();
  }

  /**
   * Load methods from CSV file
   *
   * @param csvPath - Path to methods.csv file
   * @throws {Error} If CSV cannot be parsed or has invalid structure
   */
  loadFromCSV(csvPath: string): void {
    const startTime = Date.now();

    try {
      const content = readFileSync(csvPath, 'utf-8');
      const rows = this.parseCSV(content);

      if (rows.length === 0) {
        throw new Error('NO_METHODS_FOUND: CSV file is empty');
      }

      // Clear existing methods
      this.methods.clear();
      this.byCategory.clear();
      this.byDomain.clear();

      // Load each method
      for (const row of rows) {
        const method = this.rowToMethod(row);
        this.addMethod(method);
      }

      this.loaded = true;

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > 500) {
        throw new Error(`CATALOG_LOAD_TIMEOUT: Took ${elapsed}ms`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`CATALOG_LOAD_FAILED: ${error.message}`);
      }
      throw new Error('CATALOG_LOAD_FAILED: Unknown error');
    }
  }

  /**
   * Get method by ID
   *
   * @param id - Method ID
   * @returns Method or undefined if not found
   */
  getMethod(id: string): ReasoningMethod | undefined {
    return this.methods.get(id);
  }

  /**
   * Get method by name
   *
   * @param name - Method name
   * @returns Method or undefined if not found
   */
  getMethodByName(name: string): ReasoningMethod | undefined {
    for (const method of this.methods.values()) {
      if (method.name === name) {
        return method;
      }
    }
    return undefined;
  }

  /**
   * Get all methods
   *
   * @returns All methods in catalog
   */
  getAllMethods(): ReasoningMethod[] {
    return Array.from(this.methods.values());
  }

  /**
   * Get methods by category
   *
   * @param category - Method category
   * @returns Methods in category
   */
  getByCategory(category: MethodCategory): ReasoningMethod[] {
    return this.byCategory.get(category) ?? [];
  }

  /**
   * Get methods by domain
   *
   * @param domain - Domain
   * @returns Methods applicable to domain
   */
  getByDomain(domain: Domain): ReasoningMethod[] {
    return this.byDomain.get(domain) ?? [];
  }

  /**
   * Get catalog statistics
   *
   * @returns Catalog statistics
   */
  getStats(): MethodCatalogStats {
    const methods = this.getAllMethods();
    const methodsByCategory: Record<MethodCategory, number> = {
      core: 0,
      advanced: 0,
      collaboration: 0,
      competitive: 0,
      creative: 0,
      learning: 0,
      philosophical: 0,
      research: 0,
      retrospective: 0,
      risk: 0,
      technical: 0,
    };
    const methodsByDomain: Record<Domain, number> = {
      code: 0,
      creative: 0,
      reasoning: 0,
      analysis: 0,
      general: 0,
    };

    let totalComplexity = 0;

    for (const method of methods) {
      methodsByCategory[method.category]++;
      for (const domain of method.domains) {
        methodsByDomain[domain]++;
      }
      totalComplexity += method.complexity;
    }

    return {
      totalMethods: methods.length,
      methodsByCategory,
      methodsByDomain,
      averageComplexity: methods.length > 0 ? totalComplexity / methods.length : 0,
    };
  }

  /**
   * Check if catalog is loaded
   *
   * @returns True if catalog is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Add method to catalog
   *
   * @param method - Method to add
   */
  private addMethod(method: ReasoningMethod): void {
    // Add to main map
    this.methods.set(method.id, method);

    // Add to category map
    if (!this.byCategory.has(method.category)) {
      this.byCategory.set(method.category, []);
    }
    this.byCategory.get(method.category)!.push(method);

    // Add to domain maps
    for (const domain of method.domains) {
      if (!this.byDomain.has(domain)) {
        this.byDomain.set(domain, []);
      }
      this.byDomain.get(domain)!.push(method);
    }
  }

  /**
   * Parse CSV content
   *
   * @param content - CSV content
   * @returns Parsed rows
   */
  private parseCSV(content: string): MethodCSVRow[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error('CSV_TOO_SHORT: Must have header and at least one row');
    }

    // Skip header line
    const dataLines = lines.slice(1);
    const rows: MethodCSVRow[] = [];

    for (const line of dataLines) {
      try {
        const row = this.parseCSVLine(line);
        rows.push(row);
      } catch {
        console.warn(`Failed to parse CSV line: ${line}`);
        // Continue with next line
      }
    }

    return rows;
  }

  /**
   * Parse single CSV line
   *
   * @param line - CSV line
   * @returns Parsed row
   */
  private parseCSVLine(line: string): MethodCSVRow {
    // Split by comma, but handle quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last part
    parts.push(current.trim());

    if (parts.length !== 5) {
      throw new Error(`CSV_INVALID_FORMAT: Expected 5 columns, got ${parts.length}`);
    }

    return {
      num: parseInt(parts[0], 10),
      category: parts[1],
      method_name: parts[2],
      description: parts[3],
      output_pattern: parts[4],
    };
  }

  /**
   * Convert CSV row to method
   *
   * @param row - CSV row
   * @returns Reasoning method
   */
  private rowToMethod(row: MethodCSVRow): ReasoningMethod {
    // Validate category
    const validCategories: MethodCategory[] = [
      'core', 'advanced', 'collaboration', 'competitive', 'creative',
      'learning', 'philosophical', 'research', 'retrospective', 'risk', 'technical'
    ];

    const category = row.category.toLowerCase() as MethodCategory;
    if (!validCategories.includes(category)) {
      throw new Error(`INVALID_CATEGORY: ${row.category}`);
    }

    // Generate ID from method name
    const id = this.methodNameToId(row.method_name);

    return {
      id,
      name: row.method_name,
      category,
      description: row.description,
      outputPattern: row.output_pattern,
      domains: DEFAULT_DOMAINS,
      complexity: CATEGORY_COMPLEXITY[category],
      timeRequired: CATEGORY_TIME[category],
      stakeholders: CATEGORY_STAKEHOLDERS[category],
      parameters: {},
    };
  }

  /**
   * Convert method name to ID
   *
   * @param name - Method name
   * @returns Method ID
   */
  private methodNameToId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
