import { describe, it, expect, beforeEach } from 'bun:test';
import { ChaosMonkey, FaultType, type ChaosConfig } from './ChaosMonkey';

describe('ChaosMonkey', () => {
  let chaos: ChaosMonkey;
  const defaultConfig: ChaosConfig = {
    failureRate: 0,
    timeoutRate: 0,
    resourceExhaustionRate: 0,
    minTimeoutDelay: 100,
    maxTimeoutDelay: 500,
    verbose: false,
  };

  // Suppress logger output in tests
  process.env.LOG_LEVEL = 'silent';

  beforeEach(() => {
    chaos = new ChaosMonkey(defaultConfig);
  });

  describe('configuration validation', () => {
    it('should accept valid configuration', () => {
      const config: ChaosConfig = {
        failureRate: 0.1,
        timeoutRate: 0.05,
        resourceExhaustionRate: 0.02,
        minTimeoutDelay: 1000,
        maxTimeoutDelay: 5000,
      };
      expect(() => new ChaosMonkey(config)).not.toThrow();
    });

    it('should reject invalid failureRate', () => {
      const config: ChaosConfig = {
        ...defaultConfig,
        failureRate: 1.5,
      };
      expect(() => new ChaosMonkey(config)).toThrow('failureRate must be between 0 and 1');
    });

    it('should reject invalid timeoutRate', () => {
      const config: ChaosConfig = {
        ...defaultConfig,
        timeoutRate: -0.1,
      };
      expect(() => new ChaosMonkey(config)).toThrow('timeoutRate must be between 0 and 1');
    });

    it('should reject invalid resourceExhaustionRate', () => {
      const config: ChaosConfig = {
        ...defaultConfig,
        resourceExhaustionRate: 2,
      };
      expect(() => new ChaosMonkey(config)).toThrow(
        'resourceExhaustionRate must be between 0 and 1'
      );
    });

    it('should reject invalid timeout delays', () => {
      const config: ChaosConfig = {
        ...defaultConfig,
        minTimeoutDelay: 1000,
        maxTimeoutDelay: 500,
      };
      expect(() => new ChaosMonkey(config)).toThrow('Invalid timeout delay configuration');
    });
  });

  describe('enable/disable', () => {
    it('should start enabled by default', () => {
      expect(chaos.isEnabled()).toBe(true);
    });

    it('should disable chaos injection', () => {
      chaos.disable();
      expect(chaos.isEnabled()).toBe(false);
    });

    it('should enable chaos injection', () => {
      chaos.disable();
      chaos.enable();
      expect(chaos.isEnabled()).toBe(true);
    });

    it('should not inject faults when disabled', async () => {
      chaos.disable();
      const result = await chaos.inject('testFunction', async () => 'success');
      expect(result).toBe('success');
      expect(chaos.getFaultHistory()).toHaveLength(0);
    });
  });

  describe('fault injection - random failure', () => {
    it('should inject random failures based on probability', async () => {
      const failingChaos = new ChaosMonkey({
        ...defaultConfig,
        failureRate: 1.0, // Always fail
      });

      await expect(
        failingChaos.inject('testFunction', async () => 'should not succeed')
      ).rejects.toThrow('[CHAOS] Random failure injected');

      const history = failingChaos.getFaultHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(FaultType.RANDOM_FAILURE);
      expect(history[0].recovered).toBe(false);
    });

    it('should record error in fault history', async () => {
      const failingChaos = new ChaosMonkey({
        ...defaultConfig,
        failureRate: 1.0,
      });

      try {
        await failingChaos.inject('testFunction', async () => 'should not succeed');
      } catch (error) {
        // Expected
      }

      const history = failingChaos.getFaultHistory();
      expect(history[0].error).toBeDefined();
      expect(history[0].error?.name).toBe('ChaosInjectedError');
    });
  });

  describe('fault injection - timeout', () => {
    it('should inject timeout delays', async () => {
      const timeoutChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0, // Always timeout
        minTimeoutDelay: 100,
        maxTimeoutDelay: 200,
      });

      const startTime = Date.now();
      const result = await timeoutChaos.inject('testFunction', async () => 'success');
      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(elapsed).toBeGreaterThanOrEqual(100); // At least min delay
      expect(elapsed).toBeLessThan(300); // Not too much more than max

      const history = timeoutChaos.getFaultHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(FaultType.TIMEOUT);
      expect(history[0].recovered).toBe(true);
    });

    it('should record recovery time for timeouts', async () => {
      const timeoutChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 50,
        maxTimeoutDelay: 100,
      });

      await timeoutChaos.inject('testFunction', async () => 'success');

      const history = timeoutChaos.getFaultHistory();
      expect(history[0].recoveryTime).toBeDefined();
      expect(history[0].recoveryTime!).toBeGreaterThan(0);
    });
  });

  describe('fault injection - resource exhaustion', () => {
    it('should inject resource exhaustion', async () => {
      const resourceChaos = new ChaosMonkey({
        ...defaultConfig,
        resourceExhaustionRate: 1.0, // Always exhaust resources
      });

      const result = await resourceChaos.inject('testFunction', async () => 'success');

      expect(result).toBe('success');

      const history = resourceChaos.getFaultHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(FaultType.RESOURCE_EXHAUSTION);
      expect(history[0].recovered).toBe(true);
    });

    it('should complete within reasonable time', async () => {
      const resourceChaos = new ChaosMonkey({
        ...defaultConfig,
        resourceExhaustionRate: 1.0,
      });

      const startTime = Date.now();
      await resourceChaos.inject('testFunction', async () => 'success');
      const elapsed = Date.now() - startTime;

      // Resource exhaustion should complete quickly (< 500ms)
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('probabilistic injection', () => {
    it('should not inject faults when all rates are 0', async () => {
      const safeChaos = new ChaosMonkey(defaultConfig);

      for (let i = 0; i < 10; i++) {
        const result = await safeChaos.inject('testFunction', async () => 'success');
        expect(result).toBe('success');
      }

      expect(safeChaos.getFaultHistory()).toHaveLength(0);
    });

    it('should inject faults approximately at configured rate', async () => {
      const probabilisticChaos = new ChaosMonkey({
        ...defaultConfig,
        failureRate: 0.3, // 30% failure rate
      });

      let failureCount = 0;
      const iterations = 50; // Reduced for faster test

      for (let i = 0; i < iterations; i++) {
        try {
          await probabilisticChaos.inject('testFunction', async () => 'success');
        } catch (error) {
          failureCount++;
        }
      }

      // Should be roughly 15 failures out of 50 (allow for randomness)
      expect(failureCount).toBeGreaterThan(5); // At least 10%
      expect(failureCount).toBeLessThan(25); // At most 50%
    });
  });

  describe('health status', () => {
    it('should report healthy when no faults injected', () => {
      const health = chaos.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.faultsInjected).toBe(0);
      expect(health.faultsRecovered).toBe(0);
    });

    it('should report healthy when all faults recovered', async () => {
      const recoveryChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 10,
        maxTimeoutDelay: 20,
      });

      await recoveryChaos.inject('testFunction', async () => 'success');

      const health = recoveryChaos.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.faultsInjected).toBe(1);
      expect(health.faultsRecovered).toBe(1);
    });

    it('should report unhealthy when faults not recovered', async () => {
      const failingChaos = new ChaosMonkey({
        ...defaultConfig,
        failureRate: 1.0,
      });

      try {
        await failingChaos.inject('testFunction', async () => 'should not succeed');
      } catch (error) {
        // Expected
      }

      const health = failingChaos.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.faultsInjected).toBe(1);
      expect(health.faultsRecovered).toBe(0);
    });

    it('should calculate average recovery time', async () => {
      const recoveryChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 50,
        maxTimeoutDelay: 100,
      });

      // Inject multiple faults
      for (let i = 0; i < 3; i++) {
        await recoveryChaos.inject('testFunction', async () => 'success');
      }

      const health = recoveryChaos.getHealthStatus();
      expect(health.averageRecoveryTime).toBeGreaterThan(0);
      expect(health.averageRecoveryTime).toBeLessThan(200);
    });

    it('should track last fault time', async () => {
      const timeoutChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 10,
        maxTimeoutDelay: 20,
      });

      const beforeTime = Date.now();
      await timeoutChaos.inject('testFunction', async () => 'success');
      const afterTime = Date.now();

      const health = timeoutChaos.getHealthStatus();
      expect(health.lastFaultTime).toBeDefined();
      expect(health.lastFaultTime!).toBeGreaterThanOrEqual(beforeTime);
      expect(health.lastFaultTime!).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('fault history', () => {
    it('should track fault history', async () => {
      const mixedChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 10,
        maxTimeoutDelay: 20,
      });

      await mixedChaos.inject('function1', async () => 'success');
      await mixedChaos.inject('function2', async () => 'success');

      const history = mixedChaos.getFaultHistory();
      expect(history).toHaveLength(2);
      expect(history[0].targetFunction).toBe('function1');
      expect(history[1].targetFunction).toBe('function2');
    });

    it('should clear fault history', async () => {
      const timeoutChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 10,
        maxTimeoutDelay: 20,
      });

      await timeoutChaos.inject('testFunction', async () => 'success');
      expect(timeoutChaos.getFaultHistory()).toHaveLength(1);

      timeoutChaos.clearHistory();
      expect(timeoutChaos.getFaultHistory()).toHaveLength(0);
    });
  });

  describe('statistics', () => {
    it('should provide fault statistics', async () => {
      const mixedChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 0.5,
        resourceExhaustionRate: 0.5,
        minTimeoutDelay: 10,
        maxTimeoutDelay: 20,
      });

      // Generate some faults
      for (let i = 0; i < 5; i++) { // Reduced for faster test
        await mixedChaos.inject('testFunction', async () => 'success');
      }

      const stats = mixedChaos.getStatistics();
      expect(stats.totalFaults).toBeGreaterThan(0);
      expect(stats.recoveryRate).toBe(1); // All should recover
      expect(stats.faultsByType).toBeDefined();
    });

    it('should calculate recovery rate correctly', async () => {
      const partialRecoveryChaos = new ChaosMonkey({
        ...defaultConfig,
        failureRate: 0.5, // 50% fail
        timeoutRate: 0.5, // 50% timeout (recoverable)
      });

      for (let i = 0; i < 10; i++) { // Reduced for faster test
        try {
          await partialRecoveryChaos.inject('testFunction', async () => 'success');
        } catch (error) {
          // Some will fail
        }
      }

      const stats = partialRecoveryChaos.getStatistics();
      expect(stats.recoveryRate).toBeGreaterThan(0);
      expect(stats.recoveryRate).toBeLessThanOrEqual(1);
    });
  });

  describe('runtime configuration updates', () => {
    it('should update configuration at runtime', () => {
      chaos.updateConfig({ failureRate: 0.5 });
      // Should not throw
      expect(chaos.isEnabled()).toBe(true);
    });

    it('should validate updated configuration', () => {
      expect(() => chaos.updateConfig({ failureRate: 2.0 })).toThrow();
    });

    it('should apply updated configuration immediately', async () => {
      chaos.updateConfig({ failureRate: 1.0 });

      await expect(
        chaos.inject('testFunction', async () => 'should not succeed')
      ).rejects.toThrow('[CHAOS] Random failure injected');
    });
  });

  describe('recovery verification', () => {
    it('should verify system returns to healthy state after timeout', async () => {
      const recoveryChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 50,
        maxTimeoutDelay: 100,
      });

      // Inject fault and recover
      await recoveryChaos.inject('testFunction', async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      });

      // Verify system is healthy after recovery
      const health = recoveryChaos.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.faultsRecovered).toBe(health.faultsInjected);
    });

    it('should track multiple recovery cycles', async () => {
      const recoveryChaos = new ChaosMonkey({
        ...defaultConfig,
        resourceExhaustionRate: 1.0,
      });

      // Multiple recovery cycles
      for (let i = 0; i < 5; i++) {
        await recoveryChaos.inject('testFunction', async () => 'success');
      }

      const health = recoveryChaos.getHealthStatus();
      expect(health.faultsInjected).toBe(5);
      expect(health.faultsRecovered).toBe(5);
      expect(health.healthy).toBe(true);
    });
  });

  describe('target function tracking', () => {
    it('should track which functions had faults injected', async () => {
      const trackingChaos = new ChaosMonkey({
        ...defaultConfig,
        timeoutRate: 1.0,
        minTimeoutDelay: 10,
        maxTimeoutDelay: 20,
      });

      await trackingChaos.inject('function1', async () => 'success');
      await trackingChaos.inject('function2', async () => 'success');
      await trackingChaos.inject('function1', async () => 'success');

      const history = trackingChaos.getFaultHistory();
      const function1Faults = history.filter((f) => f.targetFunction === 'function1');
      const function2Faults = history.filter((f) => f.targetFunction === 'function2');

      expect(function1Faults).toHaveLength(2);
      expect(function2Faults).toHaveLength(1);
    });
  });
});
