/**
 * ContractRegistry - Store and retrieve agent contracts
 *
 * Provides a central repository for all contracts in the system,
 * with support for:
 * - Registration and lookup by ID or task type
 * - Contract versioning
 * - Persistence (optional)
 * - Contract composition and inheritance
 */

import type { AgentContract, TaskType } from "./AgentContract.js";

/**
 * Contract metadata for registry storage
 */
export interface ContractMetadata {
  /** Contract ID */
  id: string;
  /** Contract name */
  name: string;
  /** Task type */
  taskType: TaskType;
  /** Version number */
  version: number;
  /** When contract was registered */
  registeredAt: Date;
  /** When contract was last updated */
  updatedAt: Date;
  /** Tags for filtering */
  tags: string[];
  /** Whether contract is enabled */
  enabled: boolean;
  /** Optional description */
  description?: string;
}

/**
 * Registry query options
 */
export interface QueryOptions {
  /** Filter by task type */
  taskType?: TaskType;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Include disabled contracts */
  includeDisabled?: boolean;
  /** Limit results */
  limit?: number;
  /** Sort by field */
  sortBy?: "name" | "registeredAt" | "updatedAt" | "version";
  /** Sort order */
  sortOrder?: "asc" | "desc";
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  /** Total contracts */
  totalContracts: number;
  /** Enabled contracts */
  enabledContracts: number;
  /** Contracts by task type */
  byTaskType: Record<TaskType, number>;
  /** Unique tags */
  uniqueTags: string[];
  /** Average conditions per contract */
  avgConditionsPerContract: number;
}

/**
 * ContractRegistry - Manages contract storage and retrieval
 *
 * @example
 * ```ts
 * const registry = new ContractRegistry();
 *
 * // Register a contract
 * registry.register(implementFeatureContract);
 *
 * // Find contracts for a task type
 * const contracts = registry.findByTaskType("implement_feature");
 *
 * // Get a specific contract
 * const contract = registry.get("contract-001");
 * ```
 */
export class ContractRegistry {
  private contracts: Map<string, AgentContract> = new Map();
  private metadata: Map<string, ContractMetadata> = new Map();
  private taskTypeIndex: Map<TaskType, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  /**
   * Register a contract
   * @param contract - Contract to register
   * @param version - Optional version number (default 1)
   */
  register(contract: AgentContract, version: number = 1): void {
    const now = new Date();
    const existingMeta = this.metadata.get(contract.id);

    // Store contract
    this.contracts.set(contract.id, contract);

    // Store/update metadata
    const meta: ContractMetadata = {
      id: contract.id,
      name: contract.name,
      taskType: contract.taskType,
      version: existingMeta ? existingMeta.version + 1 : version,
      registeredAt: existingMeta?.registeredAt || now,
      updatedAt: now,
      tags: contract.tags,
      enabled: contract.enabled,
      description: contract.description,
    };
    this.metadata.set(contract.id, meta);

    // Update task type index
    if (!this.taskTypeIndex.has(contract.taskType)) {
      this.taskTypeIndex.set(contract.taskType, new Set());
    }
    this.taskTypeIndex.get(contract.taskType)!.add(contract.id);

    // Update tag index
    for (const tag of contract.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(contract.id);
    }
  }

  /**
   * Unregister a contract
   * @param id - Contract ID
   * @returns True if contract was removed
   */
  unregister(id: string): boolean {
    const contract = this.contracts.get(id);
    if (!contract) {
      return false;
    }

    // Remove from contracts
    this.contracts.delete(id);
    this.metadata.delete(id);

    // Remove from task type index
    const taskTypeSet = this.taskTypeIndex.get(contract.taskType);
    if (taskTypeSet) {
      taskTypeSet.delete(id);
      if (taskTypeSet.size === 0) {
        this.taskTypeIndex.delete(contract.taskType);
      }
    }

    // Remove from tag index
    for (const tag of contract.tags) {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(id);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    return true;
  }

  /**
   * Get a contract by ID
   * @param id - Contract ID
   * @returns Contract or undefined
   */
  get(id: string): AgentContract | undefined {
    return this.contracts.get(id);
  }

  /**
   * Get contract metadata
   * @param id - Contract ID
   * @returns Metadata or undefined
   */
  getMetadata(id: string): ContractMetadata | undefined {
    return this.metadata.get(id);
  }

  /**
   * Check if a contract exists
   * @param id - Contract ID
   * @returns True if contract exists
   */
  has(id: string): boolean {
    return this.contracts.has(id);
  }

  /**
   * Find contracts by task type
   * @param taskType - Task type to search
   * @param options - Query options
   * @returns Array of matching contracts
   */
  findByTaskType(taskType: TaskType, options: QueryOptions = {}): AgentContract[] {
    const ids = this.taskTypeIndex.get(taskType);
    if (!ids) {
      return [];
    }

    return this.filterAndSort([...ids], options);
  }

  /**
   * Find contracts by tags
   * @param tags - Tags to search (any match)
   * @param options - Query options
   * @returns Array of matching contracts
   */
  findByTags(tags: string[], options: QueryOptions = {}): AgentContract[] {
    const matchingIds = new Set<string>();

    for (const tag of tags) {
      const ids = this.tagIndex.get(tag);
      if (ids) {
        for (const id of ids) {
          matchingIds.add(id);
        }
      }
    }

    return this.filterAndSort([...matchingIds], options);
  }

  /**
   * Query contracts with options
   * @param options - Query options
   * @returns Array of matching contracts
   */
  query(options: QueryOptions = {}): AgentContract[] {
    let ids = [...this.contracts.keys()];

    // Filter by task type
    if (options.taskType) {
      const taskTypeIds = this.taskTypeIndex.get(options.taskType);
      if (taskTypeIds) {
        ids = ids.filter((id) => taskTypeIds.has(id));
      } else {
        return [];
      }
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      const tagMatchIds = new Set<string>();
      for (const tag of options.tags) {
        const tagIds = this.tagIndex.get(tag);
        if (tagIds) {
          for (const id of tagIds) {
            tagMatchIds.add(id);
          }
        }
      }
      ids = ids.filter((id) => tagMatchIds.has(id));
    }

    return this.filterAndSort(ids, options);
  }

  /**
   * Get all contracts
   * @param options - Query options
   * @returns Array of all contracts
   */
  getAll(options: QueryOptions = {}): AgentContract[] {
    return this.query(options);
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const byTaskType: Record<string, number> = {};

    for (const [taskType, ids] of this.taskTypeIndex) {
      byTaskType[taskType] = ids.size;
    }

    let totalConditions = 0;
    for (const contract of this.contracts.values()) {
      totalConditions +=
        contract.getPreconditions().length +
        contract.getPostconditions().length +
        contract.getInvariants().length;
    }

    let enabledCount = 0;
    for (const [id, contract] of this.contracts) {
      const meta = this.metadata.get(id);
      const isEnabled = meta?.enabled ?? contract.enabled;
      if (isEnabled) {
        enabledCount++;
      }
    }

    return {
      totalContracts: this.contracts.size,
      enabledContracts: enabledCount,
      byTaskType: byTaskType as Record<TaskType, number>,
      uniqueTags: [...this.tagIndex.keys()],
      avgConditionsPerContract:
        this.contracts.size > 0 ? totalConditions / this.contracts.size : 0,
    };
  }

  /**
   * Clear all contracts
   */
  clear(): void {
    this.contracts.clear();
    this.metadata.clear();
    this.taskTypeIndex.clear();
    this.tagIndex.clear();
  }

  /**
   * Get contract count
   */
  get size(): number {
    return this.contracts.size;
  }

  /**
   * Enable a contract
   */
  enable(id: string): boolean {
    const contract = this.contracts.get(id);
    const meta = this.metadata.get(id);
    if (!contract || !meta) {
      return false;
    }

    meta.enabled = true;
    meta.updatedAt = new Date();
    return true;
  }

  /**
   * Disable a contract
   */
  disable(id: string): boolean {
    const contract = this.contracts.get(id);
    const meta = this.metadata.get(id);
    if (!contract || !meta) {
      return false;
    }

    meta.enabled = false;
    meta.updatedAt = new Date();
    return true;
  }

  /**
   * Export registry to JSON
   */
  toJSON(): Record<string, unknown> {
    const contracts: Record<string, unknown>[] = [];

    for (const [id, contract] of this.contracts) {
      contracts.push({
        ...contract.toJSON(),
        metadata: this.metadata.get(id),
      });
    }

    return {
      contracts,
      stats: this.getStats(),
    };
  }

  /**
   * Helper to filter and sort contracts
   */
  private filterAndSort(ids: string[], options: QueryOptions): AgentContract[] {
    const { includeDisabled = false, limit, sortBy, sortOrder = "asc" } = options;

    let contracts: AgentContract[] = [];

    for (const id of ids) {
      const contract = this.contracts.get(id);
      const meta = this.metadata.get(id);
      if (contract) {
        // Check metadata enabled status (updated by enable/disable methods)
        const isEnabled = meta?.enabled ?? contract.enabled;
        if (includeDisabled || isEnabled) {
          contracts.push(contract);
        }
      }
    }

    // Sort
    if (sortBy) {
      contracts.sort((a, b) => {
        const metaA = this.metadata.get(a.id);
        const metaB = this.metadata.get(b.id);

        let valueA: string | number | Date;
        let valueB: string | number | Date;

        switch (sortBy) {
          case "name":
            valueA = a.name;
            valueB = b.name;
            break;
          case "registeredAt":
            valueA = metaA?.registeredAt || new Date(0);
            valueB = metaB?.registeredAt || new Date(0);
            break;
          case "updatedAt":
            valueA = metaA?.updatedAt || new Date(0);
            valueB = metaB?.updatedAt || new Date(0);
            break;
          case "version":
            valueA = metaA?.version || 0;
            valueB = metaB?.version || 0;
            break;
          default:
            return 0;
        }

        if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
        if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (limit && limit > 0) {
      contracts = contracts.slice(0, limit);
    }

    return contracts;
  }
}

/**
 * Global singleton registry instance
 */
let globalRegistry: ContractRegistry | null = null;

/**
 * Get the global contract registry
 */
export function getGlobalRegistry(): ContractRegistry {
  if (!globalRegistry) {
    globalRegistry = new ContractRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
