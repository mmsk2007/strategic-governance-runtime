/**
 * ArtifactStore — interface and in-memory implementation for
 * persisting and retrieving decision artifacts.
 *
 * The store is the canonical source of truth for all governance
 * decisions rendered by the runtime. Implementations may back
 * the store with databases, file systems, or distributed logs.
 */

import type { DecisionArtifact } from '../types/index.js';

// ── Local types ─────────────────────────────────────────────────────

/** Filter criteria for listing stored artifacts. */
export interface ArtifactFilter {
  readonly from_timestamp?: string;
  readonly to_timestamp?: string;
  readonly epoch_id?: string;
  readonly authorized_by?: string;
}

/** Interface for artifact persistence. */
export interface ArtifactStore {
  /**
   * Store a decision artifact. Throws if an artifact with the same
   * decision_id already exists.
   */
  store(artifact: DecisionArtifact): void;

  /**
   * Retrieve a single artifact by its decision_id.
   * Returns undefined if not found.
   */
  retrieve(decisionId: string): DecisionArtifact | undefined;

  /**
   * List artifacts matching the optional filter criteria.
   * Returns all artifacts if no filter is provided.
   */
  list(filter?: ArtifactFilter): DecisionArtifact[];

  /**
   * Check whether an artifact with the given decision_id exists.
   */
  exists(decisionId: string): boolean;
}

// ── In-memory implementation ────────────────────────────────────────

/**
 * In-memory artifact store backed by a Map.
 *
 * Suitable for testing, development, and short-lived runtime sessions.
 * Not suitable for production use where durability is required.
 */
export class InMemoryArtifactStore implements ArtifactStore {
  private readonly artifacts = new Map<string, DecisionArtifact>();

  store(artifact: DecisionArtifact): void {
    if (this.artifacts.has(artifact.decision_id)) {
      throw new Error(
        `Artifact with decision_id '${artifact.decision_id}' already exists`,
      );
    }
    this.artifacts.set(artifact.decision_id, artifact);
  }

  retrieve(decisionId: string): DecisionArtifact | undefined {
    return this.artifacts.get(decisionId);
  }

  list(filter?: ArtifactFilter): DecisionArtifact[] {
    let results = Array.from(this.artifacts.values());

    if (!filter) {
      return results;
    }

    if (filter.from_timestamp) {
      const from = new Date(filter.from_timestamp).getTime();
      results = results.filter(
        (a) => new Date(a.decided_at).getTime() >= from,
      );
    }

    if (filter.to_timestamp) {
      const to = new Date(filter.to_timestamp).getTime();
      results = results.filter(
        (a) => new Date(a.decided_at).getTime() <= to,
      );
    }

    if (filter.epoch_id) {
      results = results.filter(
        (a) => a.authority_epoch_id === filter.epoch_id,
      );
    }

    if (filter.authorized_by) {
      results = results.filter(
        (a) => a.requesting_principal_id === filter.authorized_by,
      );
    }

    return results;
  }

  exists(decisionId: string): boolean {
    return this.artifacts.has(decisionId);
  }

  /**
   * Return the total number of stored artifacts.
   * Convenience method for testing.
   */
  size(): number {
    return this.artifacts.size;
  }

  /**
   * Remove all stored artifacts.
   * Convenience method for testing.
   */
  clear(): void {
    this.artifacts.clear();
  }
}
