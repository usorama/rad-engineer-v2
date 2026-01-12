/**
 * Outcome Injection Module
 *
 * Exports business outcome injection and reasoning method selection
 * for outcome-based decision making.
 */

export { OutcomeInjector } from './OutcomeInjector.js';
export type {
  InjectionContext,
  DecisionContext,
  ReasoningMethod,
  MethodCategory,
  ValidationResult,
  DecisionOutcome,
} from './OutcomeInjector.js';

// Re-export BusinessOutcome from plan module
export type { BusinessOutcome } from '../plan/BusinessOutcomeExtractor.js';
