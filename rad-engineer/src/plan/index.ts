/**
 * /plan Skill Integration Module
 *
 * Exports all components for the /plan skill:
 * - IntakeHandler: Q&A logic for gathering requirements
 * - ResearchCoordinator: Parallel research agent spawning
 * - ExecutionPlanGenerator: YAML-based execution plan generation
 * - ValidationUtils: Plan validation for /execute compatibility
 * - BusinessOutcomeExtractor: Extract business outcomes from PRDs
 */

export * from './types.js';
export { IntakeHandler } from './IntakeHandler.js';
export { ResearchCoordinator } from './ResearchCoordinator.js';
export { ExecutionPlanGenerator } from './ExecutionPlanGenerator.js';
export { ValidationUtils } from './ValidationUtils.js';
export { BusinessOutcomeExtractor } from './BusinessOutcomeExtractor.js';
export type {
  BusinessOutcome,
  KPI,
  ImpactMetric,
  ValidationResult as OutcomeValidationResult,
  SourceLocation,
} from './BusinessOutcomeExtractor.js';
