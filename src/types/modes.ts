/**
 * Mode and posture types for Strategic Governance Runtime v2.
 *
 * Modes represent the runtime's operational posture. They range from
 * fully passive (SHADOW) through normal operation to emergency states
 * (QUARANTINE, HALT). The runtime transitions between modes based on
 * trust scores, drift, and external triggers.
 */

/**
 * Operational modes of the governance runtime.
 *
 * - SHADOW:      Observe only; never intervene. Used during rollout.
 * - BOOTSTRAP:   Learning phase; collects baselines, intervenes conservatively.
 * - NORMAL:      Standard operation with full policy enforcement.
 * - AGGRESSIVE:  Heightened scrutiny; lower thresholds for deny/escalate.
 * - DEFENSIVE:   Elevated caution triggered by drift or anomalies.
 * - QUARANTINE:  Isolate the system; deny all non-essential actions.
 * - HALT:        Full stop; deny everything until manual intervention.
 */
export type GovernanceMode =
  | "SHADOW"
  | "BOOTSTRAP"
  | "NORMAL"
  | "AGGRESSIVE"
  | "DEFENSIVE"
  | "QUARANTINE"
  | "HALT";

/**
 * Risk posture influences how aggressively thresholds are applied
 * within a given mode.
 */
export type RiskPosture =
  | "permissive"
  | "balanced"
  | "cautious"
  | "restrictive";

/**
 * A mode transition record for audit purposes.
 */
export interface ModeTransition {
  /** Mode before the transition */
  readonly from: GovernanceMode;

  /** Mode after the transition */
  readonly to: GovernanceMode;

  /** Reason for the transition */
  readonly reason: string;

  /** ISO-8601 timestamp of the transition */
  readonly transitioned_at: string;

  /** ID of the principal or system that triggered the transition */
  readonly triggered_by: string;
}
