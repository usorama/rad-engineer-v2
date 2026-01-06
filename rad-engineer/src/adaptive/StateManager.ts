/**
 * State Manager
 *
 * Handles persistence and recovery of performance store state.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { PerformanceStore } from "./PerformanceStore.js";
import type { EvalConfig } from "./types.js";

/**
 * State Manager Configuration
 */
export interface StateManagerConfig {
  path: string;
  autoSave: boolean;
  versionsToKeep: number;
}

/**
 * State Manager for persistence
 */
export class StateManager {
  private store: PerformanceStore;
  private config: StateManagerConfig;

  constructor(store: PerformanceStore, config?: Partial<StateManagerConfig>) {
    this.store = store;
    this.config = {
      path: this.expandPath(config?.path || "~/.config/rad-engineer/performance-store.yaml"),
      autoSave: config?.autoSave ?? true,
      versionsToKeep: config?.versionsToKeep || 100,
    };
  }

  /**
   * Load state from disk
   */
  async load(): Promise<PerformanceStore> {
    if (!existsSync(this.config.path)) {
      // No existing state, create new
      return this.store;
    }

    try {
      const content = readFileSync(this.config.path, "utf-8");
      const data = JSON.parse(content);

      // Restore state
      this.store.importJSON(JSON.stringify(data));

      return this.store;
    } catch (error) {
      console.error("Failed to load state:", error);
      return this.store;
    }
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    const dir = dirname(this.config.path);

    // Create directory if it doesn't exist
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      const json = this.store.exportJSON();
      writeFileSync(this.config.path, json, "utf-8");
    } catch (error) {
      console.error("Failed to save state:", error);
      throw error;
    }
  }

  /**
   * Export state to file
   */
  async exportToFile(path: string, format: "json" | "yaml" = "json"): Promise<void> {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (format === "json") {
      const json = this.store.exportJSON();
      writeFileSync(path, json, "utf-8");
    } else {
      // YAML format (simple)
      const state = this.store.getState();
      const yaml = this.toYAML(state);
      writeFileSync(path, yaml, "utf-8");
    }
  }

  /**
   * Import state from file
   */
  async importFromFile(path: string): Promise<PerformanceStore> {
    const content = readFileSync(path, "utf-8");

    if (path.endsWith(".json")) {
      this.store.importJSON(content);
    } else {
      // Assume YAML
      const data = this.fromYAML(content);
      this.store.importJSON(JSON.stringify(data));
    }

    return this.store;
  }

  /**
   * Reset state
   */
  async reset(): Promise<void> {
    this.store.reset();

    if (this.config.autoSave) {
      await this.save();
    }
  }

  /**
   * Get state summary
   */
  getSummary(): {
    version: string;
    timestamp: number;
    statsCount: number;
    providers: string[];
    domains: string[];
  } {
    const state = this.store.getState();

    const providers = new Set<string>();
    const domains = new Set<string>();

    for (const stats of state.stats) {
      providers.add(stats.provider);
      domains.add(stats.domain);
    }

    return {
      version: state.version,
      timestamp: state.timestamp,
      statsCount: state.stats.length,
      providers: Array.from(providers),
      domains: Array.from(domains),
    };
  }

  /**
   * Convert state to YAML format
   */
  private toYAML(state: any): string {
    let yaml = `version: "${state.version}"\n`;
    yaml += `timestamp: ${state.timestamp}\n`;
    yaml += `stats:\n`;

    for (const stats of state.stats) {
      yaml += `  - provider: ${stats.provider}\n`;
      yaml += `    model: ${stats.model}\n`;
      yaml += `    domain: ${stats.domain}\n`;
      yaml += `    complexityRange: [${stats.complexityRange[0]}, ${stats.complexityRange[1]}]\n`;
      yaml += `    success: ${stats.success}\n`;
      yaml += `    failure: ${stats.failure}\n`;
      yaml += `    mean: ${stats.mean}\n`;
      yaml += `    variance: ${stats.variance}\n`;
      yaml += `    confidenceInterval: [${stats.confidenceInterval[0]}, ${stats.confidenceInterval[1]}]\n`;
      yaml += `    avgCost: ${stats.avgCost}\n`;
      yaml += `    avgLatency: ${stats.avgLatency}\n`;
      yaml += `    avgQuality: ${stats.avgQuality}\n`;
      yaml += `    importanceWeights: [${stats.importanceWeights.join(", ")}]\n`;
      yaml += `    lastUpdated: ${stats.lastUpdated}\n`;
    }

    yaml += `\nchecksum: "${state.checksum}"\n`;

    return yaml;
  }

  /**
   * Parse YAML (simple implementation)
   */
  private fromYAML(yaml: string): any {
    // Simple YAML parser for our specific format
    const lines = yaml.split("\n");
    const result: any = {
      stats: [],
    };

    let currentStats: any = null;
    let inStats = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("version:")) {
        result.version = trimmed.split(":")[1].trim().replace(/"/g, "");
      } else if (trimmed.startsWith("timestamp:")) {
        result.timestamp = parseInt(trimmed.split(":")[1].trim(), 10);
      } else if (trimmed.startsWith("stats:")) {
        inStats = true;
      } else if (inStats && trimmed.startsWith("- provider:")) {
        currentStats = {
          provider: trimmed.split(":")[1].trim(),
        };
        result.stats.push(currentStats);
      } else if (currentStats && trimmed.startsWith("model:")) {
        currentStats.model = trimmed.split(":")[1].trim();
      } else if (currentStats && trimmed.startsWith("domain:")) {
        currentStats.domain = trimmed.split(":")[1].trim();
      } else if (currentStats && trimmed.startsWith("complexityRange:")) {
        const match = trimmed.match(/\[([\d.]+),\s*([\d.]+)\]/);
        if (match) {
          currentStats.complexityRange = [parseFloat(match[1]), parseFloat(match[2])];
        }
      } else if (currentStats && trimmed.startsWith("success:")) {
        currentStats.success = parseInt(trimmed.split(":")[1].trim(), 10);
      } else if (currentStats && trimmed.startsWith("failure:")) {
        currentStats.failure = parseInt(trimmed.split(":")[1].trim(), 10);
      } else if (currentStats && trimmed.startsWith("mean:")) {
        currentStats.mean = parseFloat(trimmed.split(":")[1].trim());
      } else if (currentStats && trimmed.startsWith("variance:")) {
        currentStats.variance = parseFloat(trimmed.split(":")[1].trim());
      } else if (currentStats && trimmed.startsWith("confidenceInterval:")) {
        const match = trimmed.match(/\[([\d.]+),\s*([\d.]+)\]/);
        if (match) {
          currentStats.confidenceInterval = [parseFloat(match[1]), parseFloat(match[2])];
        }
      } else if (currentStats && trimmed.startsWith("avgCost:")) {
        currentStats.avgCost = parseFloat(trimmed.split(":")[1].trim());
      } else if (currentStats && trimmed.startsWith("avgLatency:")) {
        currentStats.avgLatency = parseFloat(trimmed.split(":")[1].trim());
      } else if (currentStats && trimmed.startsWith("avgQuality:")) {
        currentStats.avgQuality = parseFloat(trimmed.split(":")[1].trim());
      } else if (currentStats && trimmed.startsWith("importanceWeights:")) {
        const match = trimmed.match(/\[(.*?)\]/);
        if (match) {
          currentStats.importanceWeights = match[1].split(",").map((s: string) => parseFloat(s.trim()));
        }
      } else if (currentStats && trimmed.startsWith("lastUpdated:")) {
        currentStats.lastUpdated = parseInt(trimmed.split(":")[1].trim(), 10);
      } else if (trimmed.startsWith("checksum:")) {
        result.checksum = trimmed.split(":")[1].trim().replace(/"/g, "");
      }
    }

    return result;
  }

  /**
   * Expand path (handle ~)
   */
  private expandPath(path: string): string {
    if (path.startsWith("~")) {
      return path.replace("~", process.env.HOME || process.env.USERPROFILE || "");
    }
    return path;
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(): void {
    this.config.autoSave = true;
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    this.config.autoSave = false;
  }

  /**
   * Check if auto-save is enabled
   */
  isAutoSaveEnabled(): boolean {
    return this.config.autoSave;
  }
}
