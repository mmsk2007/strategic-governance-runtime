/**
 * State store for Strategic Governance Runtime v2.
 *
 * Provides a pluggable persistence abstraction for governance state.
 * The runtime ships with an in-memory implementation; adapters for
 * Redis, SQLite, etc. can implement the same interface.
 */

import type { GovernanceMode } from "../types/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Win/loss streak counters used by the outcome attribution system.
 */
export interface Streaks {
  /** Consecutive positive outcomes. */
  wins: number;

  /** Consecutive negative outcomes. */
  losses: number;
}

/**
 * The core governance state tracked per scope (agent, session, etc.).
 */
export interface GovernanceState {
  /** Trust score in [0, 1]. Default 0.5. */
  trust_score: number;

  /** Confidence debt, non-negative. Default 0. */
  confidence_debt: number;

  /** Drift score in [0, 1]. Default 0. */
  drift_score: number;

  /** Win/loss streaks. */
  streaks: Streaks;

  /** Current governance mode. */
  mode: GovernanceMode;

  /** ISO-8601 timestamp of last state update. */
  last_updated: string;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Abstract state store interface.
 *
 * Implementations must be safe for concurrent reads but are NOT required
 * to support concurrent writes (the governor serializes writes per scope).
 */
export interface StateStore {
  /**
   * Load the governance state for a given scope.
   *
   * @returns The stored state, or `null` if no state exists for this scope.
   */
  load(scope: string): Promise<GovernanceState | null>;

  /**
   * Persist the governance state for a given scope.
   * Overwrites any existing state for that scope.
   */
  save(scope: string, state: GovernanceState): Promise<void>;

  /**
   * Check whether state exists for a scope without loading it.
   */
  exists(scope: string): Promise<boolean>;

  /**
   * Delete the state for a scope. No-op if the scope does not exist.
   */
  delete(scope: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh default governance state.
 */
export function createDefaultState(mode: GovernanceMode = "NORMAL"): GovernanceState {
  return {
    trust_score: 0.5,
    confidence_debt: 0,
    drift_score: 0,
    streaks: { wins: 0, losses: 0 },
    mode,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Deep-clone a governance state (structuredClone-safe).
 */
function cloneState(state: GovernanceState): GovernanceState {
  return {
    trust_score: state.trust_score,
    confidence_debt: state.confidence_debt,
    drift_score: state.drift_score,
    streaks: { ...state.streaks },
    mode: state.mode,
    last_updated: state.last_updated,
  };
}

// ---------------------------------------------------------------------------
// In-Memory Implementation
// ---------------------------------------------------------------------------

/**
 * Simple in-memory state store backed by a `Map`.
 *
 * Suitable for tests, single-process runtimes, and development.
 * State is lost when the process exits.
 */
export class InMemoryStateStore implements StateStore {
  private readonly store = new Map<string, GovernanceState>();

  async load(scope: string): Promise<GovernanceState | null> {
    const state = this.store.get(scope);
    return state ? cloneState(state) : null;
  }

  async save(scope: string, state: GovernanceState): Promise<void> {
    this.store.set(scope, cloneState(state));
  }

  async exists(scope: string): Promise<boolean> {
    return this.store.has(scope);
  }

  async delete(scope: string): Promise<void> {
    this.store.delete(scope);
  }

  /**
   * Clear all stored state. Useful in tests.
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Return the number of scopes currently stored.
   */
  get size(): number {
    return this.store.size;
  }
}
