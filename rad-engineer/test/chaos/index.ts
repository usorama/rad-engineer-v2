/**
 * Chaos Testing Module
 *
 * Provides fault injection capabilities for resilience testing.
 *
 * @example
 * ```ts
 * import { ChaosMonkey, FaultType } from './chaos';
 *
 * const chaos = new ChaosMonkey({
 *   failureRate: 0.1,
 *   timeoutRate: 0.05,
 *   resourceExhaustionRate: 0.02,
 *   minTimeoutDelay: 1000,
 *   maxTimeoutDelay: 5000,
 * });
 *
 * const result = await chaos.inject('riskyOperation', async () => {
 *   return await performRiskyOperation();
 * });
 * ```
 */

export { ChaosMonkey, FaultType } from './ChaosMonkey';
export type { ChaosConfig, FaultRecord, HealthStatus } from './ChaosMonkey';
