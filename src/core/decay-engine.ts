/**
 * Decay engine for Strategic Governance Runtime v2.
 *
 * Implements time-based exponential decay toward equilibrium values for
 * governance state variables (trust, confidence debt, drift). Decay is
 * applied whenever the governor loads state, ensuring that stale state
 * naturally relaxes toward safe defaults.
 *
 * Each variable decays with a configurable half-life:
 *   value(t) = equilibrium + (value_0 - equilibrium) * 2^(-elapsed / half_life)
 */

import type { GovernanceState, Streaks } from "./state-store.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for the decay engine.
 * All half-lives are specified in milliseconds.
 */
export interface DecayConfig {
  /** Half-life for trust score decay toward 0.5. Default: 7 days. */
  readonly trust_half_life_ms?: number;

  /** Half-life for confidence debt decay toward 0. Default: 3 days. */
  readonly debt_half_life_ms?: number;

  /** Half-life for drift score decay toward 0. Default: 1 day. */
  readonly drift_half_life_ms?: number;

  /** Minimum elapsed time (ms) before decay is applied. Default: 1000 (1s). */
  readonly min_elapsed_ms?: number;
}

/**
 * Detailed breakdown of decay applied to each variable.
 */
export interface DecayBreakdown {
  /** Elapsed time in milliseconds used for decay computation. */
  readonly elapsed_ms: number;

  /** Trust score before and after decay. */
  readonly trust: { readonly before: number; readonly after: number };

  /** Confidence debt before and after decay. */
  readonly debt: { readonly before: number; readonly after: number };

  /** Drift score before and after decay. */
  readonly drift: { readonly before: number; readonly after: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: Required<DecayConfig> = {
  trust_half_life_ms: 7 * MS_PER_DAY,
  debt_half_life_ms: 3 * MS_PER_DAY,
  drift_half_life_ms: 1 * MS_PER_DAY,
  min_elapsed_ms: 1000,
};

/** Equilibrium values — what each variable decays toward. */
const EQUILIBRIUM = {
  trust_score: 0.5,
  confidence_debt: 0,
  drift_score: 0,
} as const;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Exponential decay toward an equilibrium value.
 *
 *   result = equilibrium + (current - equilibrium) * 2^(-elapsed / half_life)
 */
function exponentialDecay(
  current: number,
  equilibrium: number,
  elapsed_ms: number,
  half_life_ms: number,
): number {
  if (half_life_ms <= 0) return equilibrium;
  if (elapsed_ms <= 0) return current;
  const factor = Math.pow(2, -elapsed_ms / half_life_ms);
  return equilibrium + (current - equilibrium) * factor;
}

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// DecayEngine
// ---------------------------------------------------------------------------

/**
 * Applies time-based exponential decay to governance state variables.
 *
 * The decay engine is stateless — it takes a state snapshot and elapsed
 * time, and returns a new state with decay applied. It never mutates
 * its inputs.
 */
export class DecayEngine {
  private readonly config: Required<DecayConfig>;

  constructor(config?: DecayConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Apply decay to a governance state based on elapsed time.
   *
   * @param state    — Current governance state (not mutated).
   * @param elapsed_ms — Milliseconds since the state was last updated.
   * @param configOverride — Optional per-call config override.
   * @returns A new GovernanceState with decayed values and updated timestamp.
   */
  decay(
    state: GovernanceState,
    elapsed_ms: number,
    configOverride?: DecayConfig,
  ): GovernanceState {
    const cfg = configOverride
      ? { ...this.config, ...configOverride }
      : this.config;

    // Skip decay if elapsed time is below the minimum threshold
    if (elapsed_ms < cfg.min_elapsed_ms) {
      return { ...state };
    }

    const trust_score = clamp(
      exponentialDecay(
        state.trust_score,
        EQUILIBRIUM.trust_score,
        elapsed_ms,
        cfg.trust_half_life_ms,
      ),
      0,
      1,
    );

    const confidence_debt = Math.max(
      0,
      exponentialDecay(
        state.confidence_debt,
        EQUILIBRIUM.confidence_debt,
        elapsed_ms,
        cfg.debt_half_life_ms,
      ),
    );

    const drift_score = clamp(
      exponentialDecay(
        state.drift_score,
        EQUILIBRIUM.drift_score,
        elapsed_ms,
        cfg.drift_half_life_ms,
      ),
      0,
      1,
    );

    return {
      trust_score,
      confidence_debt,
      drift_score,
      streaks: { ...state.streaks },
      mode: state.mode,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Apply decay and return a detailed breakdown of each variable's change.
   */
  decayDetailed(
    state: GovernanceState,
    elapsed_ms: number,
    configOverride?: DecayConfig,
  ): { state: GovernanceState; breakdown: DecayBreakdown } {
    const newState = this.decay(state, elapsed_ms, configOverride);

    return {
      state: newState,
      breakdown: {
        elapsed_ms,
        trust: { before: state.trust_score, after: newState.trust_score },
        debt: { before: state.confidence_debt, after: newState.confidence_debt },
        drift: { before: state.drift_score, after: newState.drift_score },
      },
    };
  }

  /**
   * Compute the elapsed time in milliseconds from a last_updated ISO timestamp
   * to now (or a provided reference time).
   */
  static computeElapsed(lastUpdated: string, now?: Date): number {
    const last = new Date(lastUpdated).getTime();
    const current = (now ?? new Date()).getTime();
    return Math.max(0, current - last);
  }

  /**
   * Return the current decay configuration.
   */
  getConfig(): Readonly<Required<DecayConfig>> {
    return { ...this.config };
  }
}
