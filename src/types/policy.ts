/**
 * Policy types for Strategic Governance Runtime v2.
 *
 * Policies define the rules, thresholds, and constraints that the
 * runtime enforces. They are versioned and immutable once published.
 */

import type { GovernanceMode, RiskPosture } from "./modes.js";
import type { SemanticVersion } from "./version-binding.js";

/**
 * Explanation codes attached to every decision, indicating the
 * governing reason class.
 *
 * - L1: Hard Stop       - Unconditional deny; policy forbids the action.
 * - L2: Trust Stop      - Trust score too low for the requested action.
 * - L3: Environment Stop - Environmental constraint (rate limit, resource cap).
 * - L4: Constraint      - Action allowed but with constraints applied.
 * - L5: Informational   - No restriction; informational annotation only.
 */
export type ExplanationCode = "L1" | "L2" | "L3" | "L4" | "L5";

/**
 * Thresholds that govern mode transitions and decision boundaries.
 */
export interface PolicyThresholds {
  /** Trust score below which the runtime enters DEFENSIVE mode */
  readonly defensive_threshold: number;

  /** Trust score below which the runtime enters QUARANTINE mode */
  readonly quarantine_threshold: number;

  /** Drift score above which the runtime enters AGGRESSIVE mode */
  readonly drift_alert_threshold: number;

  /** Confidence debt above which escalation is required */
  readonly confidence_debt_ceiling: number;

  /** Consecutive allow streak after which scrutiny increases */
  readonly max_allow_streak: number;

  /** Consecutive deny streak after which mode review triggers */
  readonly max_deny_streak: number;
}

/**
 * A single policy rule that maps conditions to outcomes.
 */
export interface PolicyRule {
  /** Unique identifier for this rule */
  readonly rule_id: string;

  /** Human-readable description */
  readonly description: string;

  /** Modes in which this rule is active */
  readonly active_modes: ReadonlyArray<GovernanceMode>;

  /** Explanation code produced when this rule fires */
  readonly explanation_code: ExplanationCode;

  /** Priority; lower numbers take precedence */
  readonly priority: number;

  /** Whether this rule is currently enabled */
  readonly enabled: boolean;
}

/**
 * A complete, versioned policy document.
 */
export interface PolicyDocument {
  /** Semantic version of this policy */
  readonly version: SemanticVersion;

  /** Human-readable policy name */
  readonly name: string;

  /** ISO-8601 timestamp when the policy was published */
  readonly published_at: string;

  /** Default risk posture when no overrides apply */
  readonly default_posture: RiskPosture;

  /** Decision thresholds */
  readonly thresholds: PolicyThresholds;

  /** Ordered list of policy rules */
  readonly rules: ReadonlyArray<PolicyRule>;
}
