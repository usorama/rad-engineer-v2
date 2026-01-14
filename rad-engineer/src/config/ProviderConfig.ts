/**
 * Provider Configuration Management
 *
 * Manages provider configuration from:
 * - User defaults: ~/.config/rad-engineer/providers.yaml
 * - Project override: .rad-engineer/providers.yaml
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { ProviderConfig, ProviderType } from "../sdk/providers/types.js";

/**
 * Provider configuration file structure
 */
export interface ProviderConfigFile {
  version: string;
  providers: Record<string, ProviderConfig>;
  defaults?: {
    provider: string;
  };
}

/**
 * Configuration storage locations
 */
const CONFIG_PATHS = {
  user: `${process.env.HOME || process.env.USERPROFILE}/.config/rad-engineer/providers.yaml`,
  project: `.rad-engineer/providers.yaml`,
};

/**
 * Provider configuration manager
 */
export class ProviderConfigManager {
  /**
   * Load configuration from file (project override or user defaults)
   */
  static load(): ProviderConfigFile {
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

    // Return empty config if no files exist
    return {
      version: "1.0",
      providers: {},
    };
  }

  /**
   * Save configuration to project override
   */
  static saveProject(config: ProviderConfigFile): void {
    const dir = dirname(CONFIG_PATHS.project);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATHS.project, this.stringifyConfig(config), "utf-8");
  }

  /**
   * Save configuration to user defaults
   */
  static saveUser(config: ProviderConfigFile): void {
    const dir = dirname(CONFIG_PATHS.user);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATHS.user, this.stringifyConfig(config), "utf-8");
  }

  /**
   * Get merged configuration (project override + user defaults)
   */
  static getMergedConfig(): Record<string, ProviderConfig> {
    const userConfig = existsSync(CONFIG_PATHS.user)
      ? this.parseConfig(readFileSync(CONFIG_PATHS.user, "utf-8"))
      : { version: "1.0", providers: {} };

    const projectConfig = existsSync(CONFIG_PATHS.project)
      ? this.parseConfig(readFileSync(CONFIG_PATHS.project, "utf-8"))
      : { version: "1.0", providers: {} };

    // Project override takes precedence
    return {
      ...userConfig.providers,
      ...projectConfig.providers,
    };
  }

  /**
   * Get provider configuration by name
   */
  static getProvider(name: string): ProviderConfig | undefined {
    const configs = this.getMergedConfig();
    return configs[name];
  }

  /**
   * Expand environment variables in config values
   */
  static expandEnv(config: ProviderConfig): ProviderConfig {
    const expanded: ProviderConfig = {
      ...config,
      apiKey: config.apiKey ? this.expandEnvValue(config.apiKey) : undefined,
      baseUrl: config.baseUrl ? this.expandEnvValue(config.baseUrl) : config.baseUrl,
    };

    return expanded;
  }

  /**
   * Parse YAML-like configuration file
   */
  private static parseConfig(content: string): ProviderConfigFile {
    const lines = content.split("\n");
    const config: ProviderConfigFile = {
      version: "1.0",
      providers: {},
    };

    let currentProvider: string | null = null;
    let inProvidersSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Check for version
      if (trimmed.startsWith("version:")) {
        config.version = trimmed.split(":")[1].trim();
        continue;
      }

      // Check for providers section
      if (trimmed === "providers:" || trimmed === "providers:") {
        inProvidersSection = true;
        continue;
      }

      // Parse provider entries (simple YAML format)
      if (inProvidersSection && trimmed.startsWith("- ") || trimmed.match(/^[a-z_]+:/)) {
        const match = trimmed.match(/^([a-z_]+):$/);
        if (match) {
          currentProvider = match[1];
          config.providers[currentProvider] = {
            providerType: "anthropic" as ProviderType,
            baseUrl: "",
            model: "",
          };
          continue;
        }

        if (currentProvider && trimmed.includes(":")) {
          const [key, value] = trimmed.split(":").map((s) => s.trim());
          const providerConfig = config.providers[currentProvider];

          switch (key) {
            case "providerType":
              providerConfig.providerType = value as ProviderType;
              break;
            case "apiKey":
              providerConfig.apiKey = value;
              break;
            case "baseUrl":
              providerConfig.baseUrl = value;
              break;
            case "model":
              providerConfig.model = value;
              break;
            case "timeout":
              providerConfig.timeout = parseInt(value, 10);
              break;
            case "temperature":
              providerConfig.temperature = parseFloat(value);
              break;
            case "maxTokens":
              providerConfig.maxTokens = parseInt(value, 10);
              break;
            case "stream":
              providerConfig.stream = value === "true";
              break;
          }
        }
      }
    }

    return config;
  }

  /**
   * Stringify configuration to YAML-like format
   */
  private static stringifyConfig(config: ProviderConfigFile): string {
    let yaml = `version: "${config.version}"\nproviders:\n`;

    for (const [name, providerConfig] of Object.entries(config.providers)) {
      yaml += `  ${name}:\n`;
      yaml += `    providerType: "${providerConfig.providerType}"\n`;
      if (providerConfig.apiKey) yaml += `    apiKey: "${providerConfig.apiKey}"\n`;
      if (providerConfig.baseUrl) yaml += `    baseUrl: "${providerConfig.baseUrl}"\n`;
      if (providerConfig.model) yaml += `    model: "${providerConfig.model}"\n`;
      if (providerConfig.timeout) yaml += `    timeout: ${providerConfig.timeout}\n`;
      if (providerConfig.temperature !== undefined) yaml += `    temperature: ${providerConfig.temperature}\n`;
      if (providerConfig.maxTokens) yaml += `    maxTokens: ${providerConfig.maxTokens}\n`;
      if (providerConfig.stream !== undefined) yaml += `    stream: ${providerConfig.stream}\n`;
      yaml += "\n";
    }

    if (config.defaults) {
      yaml += `defaults:\n`;
      yaml += `  provider: "${config.defaults.provider}"\n`;
    }

    return yaml;
  }

  /**
   * Expand environment variable in value
   */
  private static expandEnvValue(value: string): string {
    // Match ${VAR_NAME} or $VAR_NAME patterns
    return value.replace(
      /\$\{([^}]+)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_, bracketed, plain) => {
        const varName = bracketed || plain;
        return process.env[varName] || "";
      }
    );
  }
}

/**
 * Quick load helper
 */
export function loadProviderConfig(): ProviderConfigFile {
  return ProviderConfigManager.load();
}

/**
 * Quick save helper (project override)
 */
export function saveProviderConfig(config: ProviderConfigFile): void {
  return ProviderConfigManager.saveProject(config);
}

/**
 * Quick get merged helper
 */
export function getMergedProviderConfigs(): Record<string, ProviderConfig> {
  return ProviderConfigManager.getMergedConfig();
}
