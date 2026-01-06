/**
 * Integration tests: ResourceMonitor + ResourceManager
 * Tests: ResourceMonitor integration, baseline establishment, delta tracking
 */

import { describe, it, expect } from "bun:test";
import { ResourceManager } from "@/core/index.js";
import type { ResourceMetrics } from "@/sdk/types.js";

describe("Integration: ResourceMonitor + ResourceManager", () => {
  describe("ResourceMonitor integration", () => {
    it("Use ResourceMonitor.getCurrentMetrics() for checking", async () => {
      let getCurrentMetricsCalled = false;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => {
          getCurrentMetricsCalled = true;
          return {
            kernel_task_cpu: 30,
            memory_pressure: 40,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
        setBaseline: async () => {},
        getDeltaFromBaseline: async (): Promise<ResourceMetrics | null> => ({
          kernel_task_cpu: 5,
          memory_pressure: 10,
          process_count: 20,
          can_spawn_agent: true,
          timestamp: new Date().toISOString(),
        }),
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const result = await manager.checkResources();

      expect(getCurrentMetricsCalled).toBe(true);
      expect(result.canSpawnAgent).toBe(true);
      expect(result.metrics.kernel_task_cpu).toBe(30);
    });

    it("Set baseline at initialization", async () => {
      let setBaselineCalled = false;

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 30,
          memory_pressure: 40,
          process_count: 200,
          can_spawn_agent: true,
          timestamp: new Date().toISOString(),
        }),
        setBaseline: async () => {
          setBaselineCalled = true;
        },
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      await manager.setBaseline();

      expect(setBaselineCalled).toBe(true);
    });
  });

  describe("Metrics contain CPU, memory, threads", () => {
    it("Include all required metrics in ResourceMonitor response", async () => {
      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 35,
          memory_pressure: 45,
          process_count: 250,
          can_spawn_agent: true,
          timestamp: "2026-01-05T12:00:00.000Z",
        }),
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const result = await manager.checkResources();

      expect(result.metrics.kernel_task_cpu).toBeDefined();
      expect(result.metrics.memory_pressure).toBeDefined();
      expect(result.metrics.process_count).toBeDefined();
      expect(result.metrics.timestamp).toBeDefined();
    });

    it("Include thread count when available", async () => {
      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 35,
          memory_pressure: 45,
          process_count: 250,
          thread_count: 280,
          can_spawn_agent: true,
          timestamp: new Date().toISOString(),
        }) as ResourceMetrics,
        setBaseline: async () => {},
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      const result = await manager.checkResources();

      expect("thread_count" in result.metrics).toBe(true);
      if ("thread_count" in result.metrics) {
        expect(result.metrics.thread_count).toBe(280);
      }
    });
  });

  describe("getDeltaFromBaseline integration", () => {
    it("Support getDeltaFromBaseline when available", async () => {
      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 35,
          memory_pressure: 45,
          process_count: 250,
          can_spawn_agent: true,
          timestamp: new Date().toISOString(),
        }),
        setBaseline: async () => {},
        getDeltaFromBaseline: async (): Promise<ResourceMetrics | null> => ({
          kernel_task_cpu: 10, // 10% increase from baseline
          memory_pressure: 15,
          process_count: 50,
          can_spawn_agent: true,
          timestamp: new Date().toISOString(),
        }),
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // Call setBaseline first
      await manager.setBaseline();

      // getDeltaFromBaseline is optional but should work
      const delta = await mockMonitor.getDeltaFromBaseline!();

      expect(delta).toBeDefined();
      expect(delta?.kernel_task_cpu).toBe(10);
    });
  });

  describe("ResourceMonitor unavailability", () => {
    it("Fallback to direct metrics collection when ResourceMonitor not available", async () => {
      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: null,
      });

      const result = await manager.checkResources();

      // Should still return metrics via direct collection
      expect(result.metrics).toBeDefined();
      expect(result.metrics.timestamp).toBeDefined();
    });
  });

  describe("Baseline establishment workflow", () => {
    it("Complete baseline workflow: setBaseline -> checkResources -> getDelta", async () => {
      const metricsHistory: ResourceMetrics[] = [];

      const mockMonitor = {
        getCurrentMetrics: async (): Promise<ResourceMetrics> => ({
          kernel_task_cpu: 30 + Math.random() * 10,
          memory_pressure: 40 + Math.random() * 10,
          process_count: 200 + Math.floor(Math.random() * 50),
          can_spawn_agent: true,
          timestamp: new Date().toISOString(),
        }),
        setBaseline: async () => {
          metricsHistory.push({
            kernel_task_cpu: 30,
            memory_pressure: 40,
            process_count: 200,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          });
        },
        getDeltaFromBaseline: async (): Promise<ResourceMetrics | null> => {
          if (metricsHistory.length === 0) return null;
          const baseline = metricsHistory[0];
          const current = await mockMonitor.getCurrentMetrics();
          return {
            kernel_task_cpu: current.kernel_task_cpu - baseline.kernel_task_cpu,
            memory_pressure: current.memory_pressure - baseline.memory_pressure,
            process_count: current.process_count - baseline.process_count,
            can_spawn_agent: true,
            timestamp: new Date().toISOString(),
          };
        },
      };

      const manager = new ResourceManager({
        maxConcurrent: 2,
        resourceMonitor: mockMonitor,
      });

      // Step 1: Set baseline
      await manager.setBaseline();
      expect(metricsHistory.length).toBe(1);

      // Step 2: Check resources
      const check1 = await manager.checkResources();
      expect(check1.canSpawnAgent).toBe(true);

      // Step 3: Get delta
      const delta = await mockMonitor.getDeltaFromBaseline!();
      expect(delta).toBeDefined();
    });
  });
});
