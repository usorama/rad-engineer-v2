/**
 * EVALS Configuration Management
 *
 * Manages EVALS system configuration from:
 * - User defaults: ~/.config/rad-engineer/evals.yaml
 * - Project override: .rad-engineer/evals.yaml
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

/**
 * EVALS configuration file structure
 */
export interface EvalsConfigFile {
  version: string;
  enabled: boolean;

  // Exploration settings
  explorationRate: number;

  // Quality threshold
  qualityThreshold: number;

  // Catastrophic forgetting prevention
  ewc: {
    enabled: boolean;
    lambda: number;
  };

  // State persistence
  state: {
    path: string;
    autoSave: boolean;
    versionsToKeep: number;
  };

  // Evaluation config
  evaluation: {
    timeout: number;
    useLocalModel: boolean;
    localModel: string;
  };
}

/**
 * Default EVALS configuration
 */
export const DEFAULT_EVALS_CONFIG: EvalsConfigFile = {
  version: "1.0",
  enabled: true,
  explorationRate: 0.10, // 10% exploration
  qualityThreshold: 0.7, // Success if quality > 0.7
  ewc: {
    enabled: true,
    lambda: 0.5, // Regularization strength
  },
  state: {
    path: `${process.env.HOME || process.env.USERPROFILE}/.config/rad-engineer/performance-store.json`,
    autoSave: true,
    versionsToKeep: 100,
  },
  evaluation: {
    timeout: 5000, // 5s max per evaluation
    useLocalModel: true, // Use Ollama for metrics
    localModel: "llama3.2",
  },
};

/**
 * Configuration storage locations
 */
const CONFIG_PATHS = {
  user: `${process.env.HOME || process.env.USERPROFILE}/.config/rad-engineer/evals.yaml`,
  project: `.rad-engineer/evals.yaml`,
};

/**
 * EVALS configuration manager
 */
export class EvalsConfigManager {
  /**
   * Load configuration from file (project override or user defaults)
   */
  static load(): EvalsConfigFile {
    // Try project override first
    if (existsSync(CONFIG_PATHS.project)) {
      const content = readFileSync(CONFIG_PATHS.project, "utf-8");
      return this.parseConfig(content);
    }

    // Fall back to user defaults
    if (existsSync(CONFIG_PATHS.user)) {
      const content = readFileSync(CONFIG_PATHS.user, "utf-8");
      return this.parseConfig(content);
    }

    // Return default config if no files exist
    return { ...DEFAULT_EVALS_CONFIG };
  }

  /**
   * Save configuration to project override
   */
  static saveProject(config: EvalsConfigFile): void {
    const dir = dirname(CONFIG_PATHS.project);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATHS.project, this.stringifyConfig(config), "utf-8");
  }

  /**
   * Save configuration to user defaults
   */
  static saveUser(config: EvalsConfigFile): void {
    const dir = dirname(CONFIG_PATHS.user);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATHS.user, this.stringifyConfig(config), "utf-8");
  }

  /**
   * Parse YAML-like configuration file
   */
  private static parseConfig(content: string): EvalsConfigFile {
    const lines = content.split("\n");
    const config: EvalsConfigFile = { ...DEFAULT_EVALS_CONFIG };

    let currentSection: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Check for version
      if (trimmed.startsWith("version:")) {
        config.version = trimmed.split(":")[1].trim().replace(/"/g, "");
        continue;
      }

      // Check for enabled
      if (trimmed.startsWith("enabled:")) {
        config.enabled = trimmed.split(":")[1].trim() === "true";
        continue;
      }

      // Check for explorationRate
      if (trimmed.startsWith("explorationRate:")) {
        config.explorationRate = parseFloat(trimmed.split(":")[1].trim());
        continue;
      }

      // Check for qualityThreshold
      if (trimmed.startsWith("qualityThreshold:")) {
        config.qualityThreshold = parseFloat(trimmed.split(":")[1].trim());
        continue;
      }

      // Check for sections
      if (trimmed === "ewc:") {
        currentSection = "ewc";
        continue;
      }
      if (trimmed === "state:") {
        currentSection = "state";
        continue;
      }
      if (trimmed === "evaluation:") {
        currentSection = "evaluation";
        continue;
      }

      // Parse section values
      if (currentSection && trimmed.includes(":")) {
        const [key, value] = trimmed.split(":").map((s) => s.trim());

        if (currentSection === "ewc") {
          if (key === "enabled") config.ewc.enabled = value === "true";
          if (key === "lambda") config.ewc.lambda = parseFloat(value);
        } else if (currentSection === "state") {
          if (key === "path") config.state.path = value.replace(/"/g, "");
          if (key === "autoSave") config.state.autoSave = value === "true";
          if (key === "versionsToKeep") config.state.versionsToKeep = parseInt(value, 10);
        } else if (currentSection === "evaluation") {
          if (key === "timeout") config.evaluation.timeout = parseInt(value, 10);
          if (key === "useLocalModel") config.evaluation.useLocalModel = value === "true";
          if (key === "localModel") config.evaluation.localModel = value.replace(/"/g, "");
        }
      }
    }

    return config;
  }

  /**
   * Stringify configuration to YAML-like format
   */
  private static stringifyConfig(config: EvalsConfigFile): string {
    let yaml = `version: "${config.version}"\n`;
    yaml += `enabled: ${config.enabled}\n`;
    yaml += `explorationRate: ${config.explorationRate}\n`;
    yaml += `qualityThreshold: ${config.qualityThreshold}\n`;
    yaml += `\n`;
    yaml += `ewc:\n`;
    yaml += `  enabled: ${config.ewc.enabled}\n`;
    yaml += `  lambda: ${config.ewc.lambda}\n`;
    yaml += `\n`;
    yaml += `state:\n`;
    yaml += `  path: "${config.state.path}"\n`;
    yaml += `  autoSave: ${config.state.autoSave}\n`;
    yaml += `  versionsToKeep: ${config.state.versionsToKeep}\n`;
    yaml += `\n`;
    yaml += `evaluation:\n`;
    yaml += `  timeout: ${config.evaluation.timeout}\n`;
    yaml += `  useLocalModel: ${config.evaluation.useLocalModel}\n`;
    yaml += `  localModel: "${config.evaluation.localModel}"\n`;

    return yaml;
  }
}

/**
 * Quick load helper
 */
export function loadEvalsConfig(): EvalsConfigFile {
  return EvalsConfigManager.load();
}

/**
 * Quick save helper (project override)
 */
export function saveEvalsConfig(config: EvalsConfigFile): void {
  return EvalsConfigManager.saveProject(config);
}
