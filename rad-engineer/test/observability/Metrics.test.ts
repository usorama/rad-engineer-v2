/**
 * Unit tests for Metrics module
 * Tests: task recording, active agents tracking, resource utilization
 *
 * Coverage requirements:
 * - Unit tests: All public methods
 * - Branches: 85%
 * - Functions: 90%
 * - Lines: 90%
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Metrics, MetricsRegistry } from "@/observability/index.js";

describe("Metrics", () => {
  let metrics: Metrics;

  beforeEach(() => {
    // Reset singleton instance before each test
    MetricsRegistry.resetInstance();
    metrics = new Metrics();
  });

  afterEach(() => {
    // Clean up after each test
    MetricsRegistry.resetInstance();
  });

  describe("recordTaskCompletion", () => {
    it("Records successful task completion", async () => {
      metrics.recordTaskCompletion({
        taskId: "task-1",
        status: "success",
        durationSeconds: 10.5,
        waveId: "wave-1",
      });

      // Verify metrics were recorded using JSON API
      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const counterMetric = metricsJson.find((m) => m.name === "agent_tasks_total");
      expect(counterMetric).toBeDefined();
      expect(counterMetric?.values.length).toBeGreaterThan(0);

      const taskMetric = counterMetric?.values.find(
        (v) => v.labels.task_id === "task-1" && v.labels.status === "success"
      );
      expect(taskMetric).toBeDefined();
      expect(taskMetric?.value).toBe(1);
    });

    it("Records failed task completion", async () => {
      metrics.recordTaskCompletion({
        taskId: "task-2",
        status: "failure",
        durationSeconds: 5.2,
        waveId: "wave-1",
      });

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const counterMetric = metricsJson.find((m) => m.name === "agent_tasks_total");
      const taskMetric = counterMetric?.values.find(
        (v) => v.labels.task_id === "task-2" && v.labels.status === "failure"
      );
      expect(taskMetric).toBeDefined();
      expect(taskMetric?.value).toBe(1);
    });

    it("Uses default wave_id when not provided", async () => {
      metrics.recordTaskCompletion({
        taskId: "task-3",
        status: "success",
        durationSeconds: 3.0,
      });

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const counterMetric = metricsJson.find((m) => m.name === "agent_tasks_total");
      const taskMetric = counterMetric?.values.find(
        (v) => v.labels.task_id === "task-3" && v.labels.wave_id === "default"
      );
      expect(taskMetric).toBeDefined();
    });

    it("Records task duration histogram", async () => {
      metrics.recordTaskCompletion({
        taskId: "task-4",
        status: "success",
        durationSeconds: 2.5,
        waveId: "wave-1",
      });

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const histogramMetric = metricsJson.find((m) => m.name === "agent_task_duration_seconds");
      expect(histogramMetric).toBeDefined();
      expect(histogramMetric?.values.length).toBeGreaterThan(0);

      // Histogram creates multiple buckets (including sum and count)
      // At minimum: multiple buckets + sum + count = many values
      const taskValues = histogramMetric?.values.filter((v) => v.labels.task_id === "task-4");
      expect(taskValues && taskValues.length > 3).toBe(true);
    });
  });

  describe("incrementActiveAgents", () => {
    it("Increments active agents gauge", async () => {
      metrics.incrementActiveAgents("wave-1");
      metrics.incrementActiveAgents("wave-1");

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");
      const waveMetric = gaugeMetric?.values.find((v) => v.labels.wave_id === "wave-1");
      expect(waveMetric).toBeDefined();
      expect(waveMetric?.value).toBe(2);
    });

    it("Uses default wave_id when not provided", async () => {
      metrics.incrementActiveAgents();

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");
      const waveMetric = gaugeMetric?.values.find((v) => v.labels.wave_id === "default");
      expect(waveMetric).toBeDefined();
      expect(waveMetric?.value).toBe(1);
    });
  });

  describe("decrementActiveAgents", () => {
    it("Decrements active agents gauge", async () => {
      metrics.incrementActiveAgents("wave-1");
      metrics.incrementActiveAgents("wave-1");
      metrics.incrementActiveAgents("wave-1");
      metrics.decrementActiveAgents("wave-1");

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");
      const waveMetric = gaugeMetric?.values.find((v) => v.labels.wave_id === "wave-1");
      expect(waveMetric).toBeDefined();
      expect(waveMetric?.value).toBe(2);
    });
  });

  describe("setActiveAgents", () => {
    it("Sets active agents to specific value", async () => {
      metrics.setActiveAgents(5, "wave-2");

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");
      const waveMetric = gaugeMetric?.values.find((v) => v.labels.wave_id === "wave-2");
      expect(waveMetric).toBeDefined();
      expect(waveMetric?.value).toBe(5);
    });

    it("Overwrites previous values", async () => {
      metrics.incrementActiveAgents("wave-2");
      metrics.incrementActiveAgents("wave-2");
      metrics.setActiveAgents(10, "wave-2");

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");
      const waveMetric = gaugeMetric?.values.find((v) => v.labels.wave_id === "wave-2");
      expect(waveMetric?.value).toBe(10);
    });
  });

  describe("recordResourceUtilization", () => {
    it("Records CPU utilization", async () => {
      metrics.recordResourceUtilization("cpu", 45.5);

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "resource_utilization_percent");
      const cpuMetric = gaugeMetric?.values.find((v) => v.labels.resource_type === "cpu");
      expect(cpuMetric).toBeDefined();
      expect(cpuMetric?.value).toBe(45.5);
    });

    it("Records memory utilization", async () => {
      metrics.recordResourceUtilization("memory", 78.3);

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "resource_utilization_percent");
      const memMetric = gaugeMetric?.values.find((v) => v.labels.resource_type === "memory");
      expect(memMetric).toBeDefined();
      expect(memMetric?.value).toBe(78.3);
    });

    it("Records multiple resource types", async () => {
      metrics.recordResourceUtilization("cpu", 45.5);
      metrics.recordResourceUtilization("memory", 78.3);
      metrics.recordResourceUtilization("disk", 60.0);

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const gaugeMetric = metricsJson.find((m) => m.name === "resource_utilization_percent");
      expect(gaugeMetric?.values.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getMetrics", () => {
    it("Returns Prometheus exposition format", async () => {
      metrics.recordTaskCompletion({
        taskId: "task-1",
        status: "success",
        durationSeconds: 10.5,
        waveId: "wave-1",
      });
      metrics.incrementActiveAgents("wave-1");
      metrics.recordResourceUtilization("cpu", 45.5);

      const metricsOutput = await metrics.getMetrics();

      // Verify Prometheus format
      expect(metricsOutput).toContain("# HELP agent_tasks_total");
      expect(metricsOutput).toContain("# TYPE agent_tasks_total counter");
      expect(metricsOutput).toContain("agent_tasks_total{");
      expect(metricsOutput).toContain('task_id="task-1"');
      expect(metricsOutput).toContain('status="success"');
      expect(metricsOutput).toContain('wave_id="wave-1"');

      expect(metricsOutput).toContain("# HELP active_agents");
      expect(metricsOutput).toContain("# TYPE active_agents gauge");

      expect(metricsOutput).toContain("# HELP resource_utilization_percent");
      expect(metricsOutput).toContain("# TYPE resource_utilization_percent gauge");
    });

    it("Includes default Node.js metrics", async () => {
      const metricsOutput = await metrics.getMetrics();

      // prom-client includes default metrics like process_cpu_user_seconds_total
      expect(metricsOutput).toContain("process_cpu_user_seconds_total");
      expect(metricsOutput).toContain("nodejs_");
    });
  });

  describe("reset", () => {
    it("Resets all metrics", async () => {
      metrics.recordTaskCompletion({
        taskId: "task-1",
        status: "success",
        durationSeconds: 10.5,
        waveId: "wave-1",
      });
      metrics.incrementActiveAgents("wave-1");

      metrics.reset();

      const registry = MetricsRegistry.getInstance();
      const metricsJson = await registry.getRegistry().getMetricsAsJSON();

      const counterMetric = metricsJson.find((m) => m.name === "agent_tasks_total");
      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");

      expect(counterMetric?.values.length || 0).toBe(0);
      expect(gaugeMetric?.values.length || 0).toBe(0);
    });
  });
});

describe("MetricsRegistry", () => {
  afterEach(() => {
    MetricsRegistry.resetInstance();
  });

  describe("getInstance", () => {
    it("Returns same instance (singleton)", () => {
      const instance1 = MetricsRegistry.getInstance();
      const instance2 = MetricsRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("Creates new instance after resetInstance", () => {
      const instance1 = MetricsRegistry.getInstance();
      MetricsRegistry.resetInstance();
      const instance2 = MetricsRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("metrics definition", () => {
    it("Has agentTasksTotal counter with correct labels", async () => {
      const registry = MetricsRegistry.getInstance();

      expect(registry.agentTasksTotal).toBeDefined();
      // Verify it's a counter by incrementing
      registry.agentTasksTotal.inc({ task_id: "test", status: "success", wave_id: "wave-1" });

      const metricsJson = await registry.getRegistry().getMetricsAsJSON();
      const counterMetric = metricsJson.find((m) => m.name === "agent_tasks_total");
      expect(counterMetric?.values.length).toBe(1);
      expect(counterMetric?.values[0].value).toBe(1);
    });

    it("Has agentTaskDuration histogram with correct buckets", async () => {
      const registry = MetricsRegistry.getInstance();

      expect(registry.agentTaskDuration).toBeDefined();
      // Verify it's a histogram
      registry.agentTaskDuration.observe(
        { task_id: "test", status: "success", wave_id: "wave-1" },
        5.5
      );

      const metricsJson = await registry.getRegistry().getMetricsAsJSON();
      const histogramMetric = metricsJson.find((m) => m.name === "agent_task_duration_seconds");
      // Histograms have multiple buckets
      expect(histogramMetric?.values.length || 0).toBeGreaterThan(1);
    });

    it("Has activeAgents gauge", async () => {
      const registry = MetricsRegistry.getInstance();

      expect(registry.activeAgents).toBeDefined();
      registry.activeAgents.set({ wave_id: "wave-1" }, 3);

      const metricsJson = await registry.getRegistry().getMetricsAsJSON();
      const gaugeMetric = metricsJson.find((m) => m.name === "active_agents");
      expect(gaugeMetric?.values[0].value).toBe(3);
    });

    it("Has resourceUtilization gauge", async () => {
      const registry = MetricsRegistry.getInstance();

      expect(registry.resourceUtilization).toBeDefined();
      registry.resourceUtilization.set({ resource_type: "cpu" }, 45.5);

      const metricsJson = await registry.getRegistry().getMetricsAsJSON();
      const gaugeMetric = metricsJson.find((m) => m.name === "resource_utilization_percent");
      expect(gaugeMetric?.values[0].value).toBe(45.5);
    });
  });
});
