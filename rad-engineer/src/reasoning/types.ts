/**
 * BMAD Methods - Type Definitions
 *
 * Type definitions for the BMAD (Better Methods for Analysis and Decisions)
 * elicitation methods catalog and selection system.
 */

import type { Domain } from '../adaptive/types.js';

// Re-export Domain for convenience
export type { Domain };

/**
 * Reasoning method from BMAD catalog
 */
export interface ReasoningMethod {
  id: string;                    // e.g., "first-principles"
  name: string;                  // e.g., "First Principles Analysis"
  category: MethodCategory;      // e.g., "core"
  description: string;           // Full description
  outputPattern: string;         // e.g., "assumptions → truths → new approach"
  domains: Domain[];             // Applicable domains
  complexity: number;            // 1-10
  timeRequired: TimeRequirement; // quick, medium, extensive
  stakeholders: StakeholderReq;  // solo, pair, team
  parameters: Record<string, unknown>;
}

/**
 * Method categories from BMAD
 */
export type MethodCategory =
  | 'core'
  | 'advanced'
  | 'collaboration'
  | 'competitive'
  | 'creative'
  | 'learning'
  | 'philosophical'
  | 'research'
  | 'retrospective'
  | 'risk'
  | 'technical';

/**
 * Time requirement for method
 */
export type TimeRequirement = 'quick' | 'medium' | 'extensive';

/**
 * Stakeholder requirement
 */
export type StakeholderReq = 'solo' | 'pair' | 'team';

/**
 * Method selection context
 */
export interface MethodSelectionContext {
  domain: Domain;
  complexity: number;
  stakeholders: string[];
  constraints: string[];
  timeAvailable: number;  // seconds
}

/**
 * Method with confidence score
 */
export interface MethodWithScore {
  method: ReasoningMethod;
  score: number;
  reasons: string[];
}

/**
 * CSV row structure for methods.csv
 */
export interface MethodCSVRow {
  num: number;
  category: string;
  method_name: string;
  description: string;
  output_pattern: string;
}

/**
 * Method catalog statistics
 */
export interface MethodCatalogStats {
  totalMethods: number;
  methodsByCategory: Record<MethodCategory, number>;
  methodsByDomain: Record<Domain, number>;
  averageComplexity: number;
}

/**
 * Method selection result with metadata
 */
export interface MethodSelectionResult {
  method: ReasoningMethod;
  confidence: number;
  reasons: string[];
  alternatives: ReasoningMethod[];
  fallbackUsed: boolean;
}
