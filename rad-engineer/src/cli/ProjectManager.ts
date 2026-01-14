/**
 * ProjectManager - Utilities for UI project integration
 *
 * Handles:
 * - Project type detection (node, python, etc.)
 * - Configuration file management (.rad-engineer.json)
 * - Project initialization and validation
 * - Scaffolding new projects or initializing existing ones
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Supported project types
 */
export type ProjectType = "node" | "python" | "unknown";

/**
 * Project configuration structure
 */
export interface ProjectConfig {
  /** Project name */
  name: string;
  /** Project type (node, python, etc.) */
  type: ProjectType;
  /** Version of rad-engineer config format */
  version: string;
  /** Workspace root directory */
  workspace: string;
  /** Optional custom settings */
  settings?: {
    /** Enable automatic context tracking */
    autoContext?: boolean;
    /** Enable decision learning */
    decisionLearning?: boolean;
    /** Enable execution monitoring */
    executionMonitoring?: boolean;
  };
}

/**
 * Project validation result
 */
export interface ValidationResult {
  /** Whether project is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Detected project type */
  projectType?: ProjectType;
  /** Configuration file exists */
  hasConfig: boolean;
}

/**
 * ProjectManager handles project initialization and configuration
 */
export class ProjectManager {
  private readonly configFileName = ".rad-engineer.json";
  private readonly configVersion = "1.0.0";

  /**
   * Detect project type by checking for characteristic files
   *
   * @param projectPath - Absolute path to project root
   * @returns Detected project type
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * const type = manager.detectProjectType("/path/to/project");
   * console.log(type); // "node" or "python" or "unknown"
   * ```
   */
  detectProjectType(projectPath: string): ProjectType {
    const absPath = resolve(projectPath);

    // Check for Node.js project markers
    const nodeMarkers = ["package.json", "node_modules", "tsconfig.json"];
    const hasNodeMarkers = nodeMarkers.some((marker) =>
      existsSync(join(absPath, marker))
    );

    if (hasNodeMarkers) {
      return "node";
    }

    // Check for Python project markers
    const pythonMarkers = [
      "setup.py",
      "pyproject.toml",
      "requirements.txt",
      "Pipfile",
    ];
    const hasPythonMarkers = pythonMarkers.some((marker) =>
      existsSync(join(absPath, marker))
    );

    if (hasPythonMarkers) {
      return "python";
    }

    return "unknown";
  }

  /**
   * Create configuration file for project
   *
   * @param projectPath - Absolute path to project root
   * @param options - Optional configuration overrides
   * @returns Path to created config file
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * const configPath = manager.createConfigFile("/path/to/project", {
   *   name: "my-project",
   *   type: "node"
   * });
   * ```
   */
  createConfigFile(
    projectPath: string,
    options?: Partial<ProjectConfig>
  ): string {
    const absPath = resolve(projectPath);
    const configPath = join(absPath, this.configFileName);

    // Detect project type if not provided
    const projectType = options?.type || this.detectProjectType(absPath);

    // Extract project name from path or options
    const projectName =
      options?.name || absPath.split("/").pop() || "unnamed-project";

    // Build configuration
    const config: ProjectConfig = {
      name: projectName,
      type: projectType,
      version: this.configVersion,
      workspace: absPath,
      settings: {
        autoContext: options?.settings?.autoContext ?? true,
        decisionLearning: options?.settings?.decisionLearning ?? true,
        executionMonitoring: options?.settings?.executionMonitoring ?? true,
        ...options?.settings,
      },
    };

    // Write config file (pretty printed)
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    return configPath;
  }

  /**
   * Initialize existing project with rad-engineer support
   *
   * @param projectPath - Absolute path to existing project
   * @returns Configuration file path
   * @throws Error if project path doesn't exist
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * const configPath = manager.initProject("/path/to/existing/project");
   * ```
   */
  initProject(projectPath: string): string {
    const absPath = resolve(projectPath);

    // Validate project directory exists
    if (!existsSync(absPath)) {
      throw new Error(`Project path does not exist: ${absPath}`);
    }

    // Check if already initialized
    const configPath = join(absPath, this.configFileName);
    if (existsSync(configPath)) {
      throw new Error(
        `Project already initialized with rad-engineer config at: ${configPath}`
      );
    }

    // Create configuration
    return this.createConfigFile(absPath);
  }

  /**
   * Validate project is ready for rad-engineer
   *
   * @param projectPath - Absolute path to project root
   * @returns Validation result with errors and warnings
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * const result = manager.validateProject("/path/to/project");
   *
   * if (result.valid) {
   *   console.log("Project is ready!");
   * } else {
   *   console.error("Validation errors:", result.errors);
   * }
   * ```
   */
  validateProject(projectPath: string): ValidationResult {
    const absPath = resolve(projectPath);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check project directory exists
    if (!existsSync(absPath)) {
      errors.push(`Project directory does not exist: ${absPath}`);
      return {
        valid: false,
        errors,
        warnings,
        hasConfig: false,
      };
    }

    // Check for config file
    const configPath = join(absPath, this.configFileName);
    const hasConfig = existsSync(configPath);

    if (!hasConfig) {
      warnings.push(
        `No rad-engineer config found. Run 'initProject()' to create one.`
      );
    }

    // Detect project type
    const projectType = this.detectProjectType(absPath);

    if (projectType === "unknown") {
      warnings.push(
        "Could not detect project type (no package.json, setup.py, etc.)"
      );
    }

    // Validate config if it exists
    if (hasConfig) {
      try {
        const configContent = readFileSync(configPath, "utf-8");
        const config = JSON.parse(configContent) as ProjectConfig;

        // Validate required fields
        if (!config.name) {
          errors.push("Config missing required field: name");
        }
        if (!config.type) {
          errors.push("Config missing required field: type");
        }
        if (!config.version) {
          errors.push("Config missing required field: version");
        }
        if (!config.workspace) {
          errors.push("Config missing required field: workspace");
        }

        // Validate version compatibility
        if (config.version !== this.configVersion) {
          warnings.push(
            `Config version ${config.version} may not match current version ${this.configVersion}`
          );
        }

        // Validate workspace path matches
        if (config.workspace !== absPath) {
          warnings.push(
            `Config workspace path (${config.workspace}) differs from provided path (${absPath})`
          );
        }
      } catch (error) {
        errors.push(
          `Invalid config file: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      projectType,
      hasConfig,
    };
  }

  /**
   * Scaffold new project with rad-engineer structure
   *
   * @param projectPath - Absolute path for new project
   * @param projectName - Name of the project
   * @param projectType - Type of project to scaffold
   * @returns Path to created config file
   * @throws Error if directory already exists
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * const configPath = manager.scaffoldProject(
   *   "/path/to/new/project",
   *   "my-app",
   *   "node"
   * );
   * ```
   */
  scaffoldProject(
    projectPath: string,
    projectName: string,
    projectType: ProjectType
  ): string {
    const absPath = resolve(projectPath);

    // Check if directory already exists
    if (existsSync(absPath)) {
      throw new Error(
        `Directory already exists: ${absPath}. Use initProject() for existing projects.`
      );
    }

    // Create project directory
    mkdirSync(absPath, { recursive: true });

    // Create basic directory structure
    const dirs = ["src", "test", "docs"];
    dirs.forEach((dir) => {
      mkdirSync(join(absPath, dir), { recursive: true });
    });

    // Create config file
    return this.createConfigFile(absPath, {
      name: projectName,
      type: projectType,
    });
  }

  /**
   * Read project configuration
   *
   * @param projectPath - Absolute path to project root
   * @returns Parsed project configuration
   * @throws Error if config doesn't exist or is invalid
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * const config = manager.readConfig("/path/to/project");
   * console.log(config.name, config.type);
   * ```
   */
  readConfig(projectPath: string): ProjectConfig {
    const absPath = resolve(projectPath);
    const configPath = join(absPath, this.configFileName);

    if (!existsSync(configPath)) {
      throw new Error(`No config file found at: ${configPath}`);
    }

    const configContent = readFileSync(configPath, "utf-8");
    return JSON.parse(configContent) as ProjectConfig;
  }

  /**
   * Update project configuration
   *
   * @param projectPath - Absolute path to project root
   * @param updates - Partial config updates to apply
   * @throws Error if config doesn't exist
   *
   * @example
   * ```ts
   * const manager = new ProjectManager();
   * manager.updateConfig("/path/to/project", {
   *   settings: { autoContext: false }
   * });
   * ```
   */
  updateConfig(projectPath: string, updates: Partial<ProjectConfig>): void {
    const absPath = resolve(projectPath);
    const configPath = join(absPath, this.configFileName);

    // Read existing config
    const config = this.readConfig(absPath);

    // Merge updates
    const updatedConfig: ProjectConfig = {
      ...config,
      ...updates,
      settings: {
        ...config.settings,
        ...updates.settings,
      },
    };

    // Write updated config
    writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), "utf-8");
  }
}
