/**
 * Governance state and input/output types for Strategic Governance Runtime v2.
 *
 * These types model the runtime's mutable state variables and the
 * core decision enum.
 */

import type { GovernanceMode } from "./modes.js";

/**
 * Possible decisions the governance runtime can render.
 *
 * - ALLOW:                  Action is permitted without modification.
 * - DENY:                   Action is forbidden.
 * - ALLOW_WITH_CONSTRAINTS: Action is permitted subject to constraints.
 * - ESCALATE:               Action requires higher-authority approval.
 * - HALT:                   Immediate system halt; emergency stop.
 */
export type GovernanceDecision =
  | "ALLOW"
  | "DENY"
  | "ALLOW_WITH_CONSTRAINTS"
  | "ESCALATE"
  | "HALT";

/**
 * Streak counters for consecutive decision runs.
 */
export interface Streaks {
  /** Number of consecutive ALLOW decisions */
  readonly allow_streak: number;

  /** Number of consecutive DENY decisions */
  readonly deny_streak: number;

  /** Number of consecutive ESCALATE decisions */
  readonly escalate_streak: number;
}

/**
 * The runtime's mutable state, carried across decision cycles.
 */
export interface GovernanceState {
  /** Current operational mode */
  readonly mode: GovernanceMode;

  /**
   * Trust score in [0, 1]. Reflects accumulated trust based on
   * model behaviour and decision history.
   */
  readonly trust_score: number;

  /**
   * Confidence debt in [0, +inf). Accumulated uncertainty that
   * must be repaid through conservative decisions or escalation.
   */
  readonly confidence_debt: number;

  /**
   * Drift score in [0, 1]. Measures divergence between expected
   * and observed model behaviour.
   */
  readonly drift_score: number;

  /** Consecutive decision streak counters */
  readonly streaks: Streaks;

  /** Total number of decisions rendered in this session */
  readonly decision_count: number;

  /** ISO-8601 timestamp of the last decision */
  readonly last_decision_at: string | null;
}
