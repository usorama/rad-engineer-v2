import { Logger } from '@/observability/Logger';

/**
 * Chaos injection configuration
 */
export interface ChaosConfig {
  /** Failure injection probability (0-1) */
  failureRate: number;
  /** Timeout injection probability (0-1) */
  timeoutRate: number;
  /** Resource exhaustion probability (0-1) */
  resourceExhaustionRate: number;
  /** Minimum delay for timeout injection (ms) */
  minTimeoutDelay: number;
  /** Maximum delay for timeout injection (ms) */
  maxTimeoutDelay: number;
  /** Enable detailed logging */
  verbose?: boolean;
}

/**
 * Fault types that can be injected
 */
export enum FaultType {
  RANDOM_FAILURE = 'random_failure',
  TIMEOUT = 'timeout',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
}

/**
 * Fault injection record
 */
export interface FaultRecord {
  type: FaultType;
  timestamp: number;
  targetFunction: string;
  recovered: boolean;
  recoveryTime?: number;
  error?: Error;
}

/**
 * System health status
 */
export interface HealthStatus {
  healthy: boolean;
  faultsInjected: number;
  faultsRecovered: number;
  averageRecoveryTime: number;
  lastFaultTime?: number;
}

/**
 * ChaosMonkey - Fault injection system for resilience testing
 *
 * Injects controlled faults to verify system recovery mechanisms:
 * - Random failures (exceptions)
 * - Timeouts (delayed responses)
 * - Resource exhaustion (memory/CPU spikes)
 *
 * Tracks all injected faults and recovery times to verify resilience.
 *
 * @example
 * ```ts
 * const chaos = new ChaosMonkey({
 *   failureRate: 0.1,
 *   timeoutRate: 0.05,
 *   resourceExhaustionRate: 0.02,
 *   minTimeoutDelay: 1000,
 *   maxTimeoutDelay: 5000,
 * });
 *
 * // Wrap a function with chaos injection
 * const result = await chaos.inject('myFunction', async () => {
 *   return await riskyOperation();
 * });
 *
 * // Check system health
 * const health = chaos.getHealthStatus();
 * console.log(`Recovery rate: ${health.faultsRecovered / health.faultsInjected}`);
 * ```
 */
export class ChaosMonkey {
  private config: ChaosConfig;
  private logger: Logger;
  private faultHistory: FaultRecord[] = [];
  private enabled: boolean = true;

  constructor(config: ChaosConfig) {
    this.config = config;

    // Suppress logging in test environment unless verbose is explicitly set
    // Pino's 'fatal' level (highest) essentially silences most logging
    const logLevel = process.env.NODE_ENV === 'test' && !config.verbose ? 'error' :
                     config.verbose ? 'debug' : 'info';

    this.logger = new Logger({
      component: 'ChaosMonkey',
      level: logLevel,
    });

    this.validateConfig();
  }

  /**
   * Validate configuration parameters
   */
  private validateConfig(): void {
    const { failureRate, timeoutRate, resourceExhaustionRate, minTimeoutDelay, maxTimeoutDelay } =
      this.config;

    if (failureRate < 0 || failureRate > 1) {
      throw new Error('failureRate must be between 0 and 1');
    }
    if (timeoutRate < 0 || timeoutRate > 1) {
      throw new Error('timeoutRate must be between 0 and 1');
    }
    if (resourceExhaustionRate < 0 || resourceExhaustionRate > 1) {
      throw new Error('resourceExhaustionRate must be between 0 and 1');
    }
    if (minTimeoutDelay < 0 || maxTimeoutDelay < minTimeoutDelay) {
      throw new Error('Invalid timeout delay configuration');
    }
  }

  /**
   * Enable chaos injection
   */
  enable(): void {
    this.enabled = true;
    this.logger.info('Chaos injection enabled');
  }

  /**
   * Disable chaos injection
   */
  disable(): void {
    this.enabled = false;
    this.logger.info('Chaos injection disabled');
  }

  /**
   * Check if chaos injection is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Inject faults into a function execution
   *
   * @param targetFunction - Name of the function being tested
   * @param fn - The function to execute with chaos injection
   * @returns Result of the function or throws injected error
   */
  async inject<T>(targetFunction: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    // Determine which fault (if any) to inject
    const faultType = this.selectFaultType();

    if (!faultType) {
      // No fault injected, execute normally
      return fn();
    }

    const faultRecord: FaultRecord = {
      type: faultType,
      timestamp: Date.now(),
      targetFunction,
      recovered: false,
    };

    this.logger.warn(`Injecting ${faultType} into ${targetFunction}`);

    // Start timing from before fault injection
    const startTime = Date.now();

    try {
      switch (faultType) {
        case FaultType.RANDOM_FAILURE:
          await this.injectRandomFailure(faultRecord);
          break;
        case FaultType.TIMEOUT:
          await this.injectTimeout(faultRecord);
          break;
        case FaultType.RESOURCE_EXHAUSTION:
          await this.injectResourceExhaustion(faultRecord);
          break;
      }

      // If we reach here, the fault was injected but didn't prevent execution
      // Execute the function and check for recovery
      const result = await fn();
      const recoveryTime = Date.now() - startTime;

      faultRecord.recovered = true;
      faultRecord.recoveryTime = recoveryTime;

      this.logger.info(
        `Recovered from ${faultType} in ${recoveryTime}ms`,
        { targetFunction, recoveryTime }
      );

      this.faultHistory.push(faultRecord);
      return result;
    } catch (error) {
      faultRecord.error = error instanceof Error ? error : new Error(String(error));
      this.faultHistory.push(faultRecord);

      this.logger.error(`Fault ${faultType} caused failure in ${targetFunction}`, faultRecord.error);
      throw error;
    }
  }

  /**
   * Select a fault type based on configured probabilities
   */
  private selectFaultType(): FaultType | null {
    const random = Math.random();

    if (random < this.config.failureRate) {
      return FaultType.RANDOM_FAILURE;
    }

    if (random < this.config.failureRate + this.config.timeoutRate) {
      return FaultType.TIMEOUT;
    }

    if (
      random <
      this.config.failureRate + this.config.timeoutRate + this.config.resourceExhaustionRate
    ) {
      return FaultType.RESOURCE_EXHAUSTION;
    }

    return null;
  }

  /**
   * Inject a random failure (exception)
   */
  private async injectRandomFailure(record: FaultRecord): Promise<void> {
    const error = new Error(`[CHAOS] Random failure injected in ${record.targetFunction}`);
    error.name = 'ChaosInjectedError';
    throw error;
  }

  /**
   * Inject a timeout delay
   */
  private async injectTimeout(record: FaultRecord): Promise<void> {
    const delay =
      this.config.minTimeoutDelay +
      Math.random() * (this.config.maxTimeoutDelay - this.config.minTimeoutDelay);

    this.logger.debug(`Injecting ${delay}ms timeout delay`);

    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Inject resource exhaustion (memory allocation spike)
   */
  private async injectResourceExhaustion(record: FaultRecord): Promise<void> {
    this.logger.debug('Injecting resource exhaustion (memory spike)');

    // Allocate temporary memory to simulate resource pressure
    const buffer = new Array(1000000).fill('x'.repeat(100));

    // Hold for a brief moment then release
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // Allow GC to clean up
    buffer.length = 0;
  }

  /**
   * Get current system health status
   */
  getHealthStatus(): HealthStatus {
    const faultsInjected = this.faultHistory.length;
    const faultsRecovered = this.faultHistory.filter((f) => f.recovered).length;

    const recoveryTimes = this.faultHistory
      .filter((f) => f.recovered && f.recoveryTime !== undefined)
      .map((f) => f.recoveryTime!);

    const averageRecoveryTime =
      recoveryTimes.length > 0
        ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
        : 0;

    const lastFault = this.faultHistory[this.faultHistory.length - 1];

    return {
      healthy: faultsRecovered === faultsInjected,
      faultsInjected,
      faultsRecovered,
      averageRecoveryTime,
      lastFaultTime: lastFault?.timestamp,
    };
  }

  /**
   * Get all fault records
   */
  getFaultHistory(): readonly FaultRecord[] {
    return [...this.faultHistory];
  }

  /**
   * Clear fault history
   */
  clearHistory(): void {
    this.faultHistory = [];
    this.logger.info('Fault history cleared');
  }

  /**
   * Get statistics about injected faults
   */
  getStatistics(): {
    totalFaults: number;
    faultsByType: Record<FaultType, number>;
    recoveryRate: number;
    averageRecoveryTime: number;
  } {
    const faultsByType = this.faultHistory.reduce(
      (acc, fault) => {
        acc[fault.type] = (acc[fault.type] || 0) + 1;
        return acc;
      },
      {} as Record<FaultType, number>
    );

    const health = this.getHealthStatus();

    return {
      totalFaults: this.faultHistory.length,
      faultsByType,
      recoveryRate: health.faultsInjected > 0 ? health.faultsRecovered / health.faultsInjected : 1,
      averageRecoveryTime: health.averageRecoveryTime,
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig();
    this.logger.info('Configuration updated', { config: this.config });
  }
}
