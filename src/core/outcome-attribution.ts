/**
 * Outcome attribution for Strategic Governance Runtime v2.
 *
 * Applies exactly-once outcome feedback to governance state. When a
 * decision's outcome is observed (good or bad), this module updates
 * trust, debt, and streaks accordingly. Decision IDs are tracked to
 * prevent double-application.
 */

import type { GovernanceState, Streaks } from "./state-store.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * An observed outcome for a previous governance decision.
 */
export interface Outcome {
  /** The decision ID this outcome refers to. */
  readonly decision_id: string;

  /**
   * Value of the outcome. Positive means good (the decision led to a
   * beneficial result), negative means bad (the decision led to harm
   * or a missed opportunity).
   */
  readonly value: number;

  /**
   * Confidence in the outcome observation, in [0, 1].
   * 1.0 = fully certain; 0.0 = completely uncertain.
   */
  readonly confidence: number;

  /**
   * Whether this outcome is settled (final) or provisional.
   * Provisional outcomes may be superseded by later observations.
   */
  readonly settled: boolean;
}

/**
 * Configuration for outcome attribution.
 */
export interface OutcomeAttributionConfig {
  /** Maximum trust adjustment per outcome. Default: 0.1. */
  readonly max_trust_delta?: number;

  /** Maximum debt adjustment per outcome. Default: 0.2. */
  readonly max_debt_delta?: number;

  /** Base trust increase per unit of positive value. Default: 0.05. */
  readonly trust_gain_rate?: number;

  /** Base trust decrease per unit of negative value. Default: 0.08. */
  readonly trust_loss_rate?: number;

  /** Base debt decrease per unit of positive value. Default: 0.03. */
  readonly debt_reduction_rate?: number;

  /** Base debt increase per unit of negative value. Default: 0.1. */
  readonly debt_increase_rate?: number;
}

/**
 * Result of applying an outcome attribution.
 */
export interface AttributionResult {
  /** The updated governance state. */
  readonly state: GovernanceState;

  /** Whether the outcome was applied (false if it was a duplicate). */
  readonly applied: boolean;

  /** Trust score delta (positive = trust increased). */
  readonly trust_delta: number;

  /** Debt delta (positive = debt increased). */
  readonly debt_delta: number;

  /** Decision ID that was attributed. */
  readonly decision_id: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<OutcomeAttributionConfig> = {
  max_trust_delta: 0.1,
  max_debt_delta: 0.2,
  trust_gain_rate: 0.05,
  trust_loss_rate: 0.08,
  debt_reduction_rate: 0.03,
  debt_increase_rate: 0.1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// OutcomeAttribution
// ---------------------------------------------------------------------------

/**
 * Applies outcome feedback to governance state with exactly-once semantics.
 *
 * Tracks which decision IDs have already been attributed to prevent
 * double-application. Good outcomes increase trust and decrease debt;
 * bad outcomes decrease trust and increase debt. All adjustments are
 * scaled by the outcome's confidence and value magnitude.
 */
export class OutcomeAttribution {
  private readonly config: Required<OutcomeAttributionConfig>;
  private readonly appliedDecisions: Set<string> = new Set();

  constructor(config?: OutcomeAttributionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Apply an outcome to the governance state.
   *
   * If the decision_id has already been applied, the outcome is ignored
   * and the state is returned unchanged (exactly-once semantics).
   *
   * @param outcome — The observed outcome.
   * @param state   — Current governance state (not mutated).
   * @returns Attribution result with updated state and deltas.
   */
  apply(outcome: Outcome, state: GovernanceState): AttributionResult {
    // Exactly-once guard
    if (this.appliedDecisions.has(outcome.decision_id)) {
      return {
        state: { ...state },
        applied: false,
        trust_delta: 0,
        debt_delta: 0,
        decision_id: outcome.decision_id,
      };
    }

    const magnitude = Math.abs(outcome.value) * outcome.confidence;
    const isPositive = outcome.value >= 0;

    let trust_delta: number;
    let debt_delta: number;

    if (isPositive) {
      // Good outcome: increase trust, decrease debt
      trust_delta = clamp(
        magnitude * this.config.trust_gain_rate,
        0,
        this.config.max_trust_delta,
      );
      debt_delta = -clamp(
        magnitude * this.config.debt_reduction_rate,
        0,
        this.config.max_debt_delta,
      );
    } else {
      // Bad outcome: decrease trust, increase debt
      trust_delta = -clamp(
        magnitude * this.config.trust_loss_rate,
        0,
        this.config.max_trust_delta,
      );
      debt_delta = clamp(
        magnitude * this.config.debt_increase_rate,
        0,
        this.config.max_debt_delta,
      );
    }

    const newTrust = clamp(state.trust_score + trust_delta, 0, 1);
    const newDebt = Math.max(0, state.confidence_debt + debt_delta);

    // Update streaks
    const newStreaks: Streaks = isPositive
      ? { wins: state.streaks.wins + 1, losses: 0 }
      : { wins: 0, losses: state.streaks.losses + 1 };

    const newState: GovernanceState = {
      trust_score: newTrust,
      confidence_debt: newDebt,
      drift_score: state.drift_score,
      streaks: newStreaks,
      mode: state.mode,
      last_updated: new Date().toISOString(),
    };

    // Mark as applied (exactly-once)
    this.appliedDecisions.add(outcome.decision_id);

    return {
      state: newState,
      applied: true,
      trust_delta,
      debt_delta,
      decision_id: outcome.decision_id,
    };
  }

  /**
   * Check whether an outcome for a given decision ID has already been applied.
   */
  hasBeenApplied(decisionId: string): boolean {
    return this.appliedDecisions.has(decisionId);
  }

  /**
   * Return the set of all decision IDs that have been attributed.
   */
  getAppliedDecisionIds(): ReadonlySet<string> {
    return this.appliedDecisions;
  }

  /**
   * Reset the attribution tracker. Useful in tests.
   */
  reset(): void {
    this.appliedDecisions.clear();
  }

  /**
   * Return the current configuration.
   */
  getConfig(): Readonly<Required<OutcomeAttributionConfig>> {
    return { ...this.config };
  }
}
