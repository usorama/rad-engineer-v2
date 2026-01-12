/**
 * BMAD Methods - Main Class
 *
 * Integrates 50 BMAD elicitation methods for advanced decision-making.
 * Provides method selection, catalog access, and learning integration.
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type {
  ReasoningMethod,
  MethodCategory,
  Domain,
  MethodSelectionContext,
  MethodSelectionResult,
  MethodCatalogStats,
} from './types.js';
import { MethodCatalog } from './MethodCatalog.js';
import { MethodSelector } from './MethodSelector.js';
import { DecisionLearningStore } from '../decision/DecisionLearningStore.js';

/**
 * Default path to methods.csv
 */
const DEFAULT_CSV_PATH = '../../../../bmad-research/src/core/workflows/advanced-elicitation/methods.csv';

/**
 * BMAD Methods class
 *
 * Main entry point for BMAD method selection and catalog access.
 */
export class BMADMethods {
  private catalog: MethodCatalog;
  private selector: MethodSelector;
  private decisionStore: DecisionLearningStore;
  private initialized: boolean = false;

  constructor(decisionStore?: DecisionLearningStore) {
    this.catalog = new MethodCatalog();
    this.decisionStore = decisionStore ?? new DecisionLearningStore();
    this.selector = new MethodSelector(this.catalog, this.decisionStore);
  }

  /**
   * Initialize BMAD methods catalog
   *
   * @param csvPath - Optional custom path to methods.csv
   * @throws {Error} If catalog cannot be loaded
   */
  initialize(csvPath?: string): void {
    if (this.initialized) {
      console.warn('BMADMethods already initialized');
      return;
    }

    try {
      // Resolve CSV path
      const resolvedPath = csvPath ?? this.resolveDefaultCSVPath();

      // Load catalog
      this.catalog.loadFromCSV(resolvedPath);

      this.initialized = true;

      // Log statistics
      const stats = this.getStats();
      console.log(`BMADMethods initialized: ${stats.totalMethods} methods loaded`);
    } catch (error) {
      throw new Error(`BMAD_INIT_FAILED: ${error}`);
    }
  }

  /**
   * Select best method for context
   *
   * @param context - Method selection context
   * @returns Selected method with metadata
   */
  selectMethod(context: MethodSelectionContext): MethodSelectionResult {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.selector.selectMethod(context);
  }

  /**
   * Get method by ID
   *
   * @param id - Method ID
   * @returns Method or undefined if not found
   */
  getMethod(id: string): ReasoningMethod | undefined {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.catalog.getMethod(id);
  }

  /**
   * Get method by name
   *
   * @param name - Method name
   * @returns Method or undefined if not found
   */
  getMethodByName(name: string): ReasoningMethod | undefined {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.catalog.getMethodByName(name);
  }

  /**
   * Get all methods
   *
   * @returns All methods in catalog
   */
  getAllMethods(): ReasoningMethod[] {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.catalog.getAllMethods();
  }

  /**
   * Get methods by category
   *
   * @param category - Method category
   * @returns Methods in category
   */
  getMethodsByCategory(category: MethodCategory): ReasoningMethod[] {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.catalog.getByCategory(category);
  }

  /**
   * Get methods by domain
   *
   * @param domain - Domain
   * @returns Methods applicable to domain
   */
  getMethodsByDomain(domain: Domain): ReasoningMethod[] {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.catalog.getByDomain(domain);
  }

  /**
   * Get catalog statistics
   *
   * @returns Catalog statistics
   */
  getStats(): MethodCatalogStats {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    return this.catalog.getStats();
  }

  /**
   * Check if initialized
   *
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Track method outcome for learning
   *
   * @param methodName - Name of method used
   * @param outcome - Decision outcome
   */
  trackMethodOutcome(methodName: string, outcome: { success: boolean; quality: number }): void {
    if (!this.initialized) {
      throw new Error('BMAD_NOT_INITIALIZED: Call initialize() first');
    }

    try {
      const effectiveness = this.decisionStore['methodEffectiveness'] ?? new Map();
      const current = effectiveness.get(methodName) ?? 0.5;
      const learningRate = 0.1;
      const newEffectiveness = (1 - learningRate) * current + learningRate * (outcome.success ? 1 : 0);
      effectiveness.set(methodName, newEffectiveness);
    } catch (error) {
      console.error('TRACK_METHOD_OUTCOME_FAILED:', error);
    }
  }

  /**
   * Resolve default CSV path
   *
   * @returns Resolved path to methods.csv
   */
  private resolveDefaultCSVPath(): string {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      return join(__dirname, DEFAULT_CSV_PATH);
    } catch {
      // Fallback for environments where import.meta.url is not available
      return DEFAULT_CSV_PATH;
    }
  }
}
