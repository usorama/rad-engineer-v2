/**
 * Qdrant Client Mock
 *
 * Mock implementation for testing DecisionLearningStore export functionality.
 */

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantBatch {
  collection: string;
  points: QdrantPoint[];
}

export interface QdrantClientMockConfig {
  shouldFail?: boolean;
  delay?: number;
}

/**
 * Mock Qdrant Client
 */
export class QdrantClientMock {
  private shouldFail: boolean;
  private delay: number;
  private storage: Map<string, QdrantPoint[]> = new Map();

  constructor(config?: QdrantClientMockConfig) {
    this.shouldFail = config?.shouldFail ?? false;
    this.delay = config?.delay ?? 0;
  }

  /**
   * Upsert points (mock implementation)
   */
  async upsert(collection: string, batch: QdrantBatch): Promise<void> {
    if (this.delay > 0) {
      const waitUntil = Date.now() + this.delay;
      while (Date.now() < waitUntil) {
        // Busy wait
      }
    }

    if (this.shouldFail) {
      throw new Error("QDRANT_CONNECTION_FAILED: Mock connection failure");
    }

    // Store points
    if (!this.storage.has(collection)) {
      this.storage.set(collection, []);
    }

    const collectionPoints = this.storage.get(collection)!;
    for (const point of batch.points) {
      const existingIndex = collectionPoints.findIndex((p) => p.id === point.id);
      if (existingIndex >= 0) {
        collectionPoints[existingIndex] = point;
      } else {
        collectionPoints.push(point);
      }
    }
  }

  /**
   * Get stored points (for testing)
   */
  getPoints(collection: string): QdrantPoint[] {
    return this.storage.get(collection) || [];
  }

  /**
   * Clear storage (for testing)
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Set failure mode
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}
