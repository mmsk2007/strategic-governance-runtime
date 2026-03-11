/**
 * Decision and artifact types for Strategic Governance Runtime v2.
 *
 * A decision artifact is the atomic unit of audit. It captures
 * everything about a single governance decision: inputs, outputs,
 * state, authority context, and version vector.
 */

import type { GovernanceDecision, GovernanceState } from "./governance.js";
import type { ExplanationCode } from "./policy.js";
import type { GovernanceMode } from "./modes.js";
import type { VersionVector, ReplayBinding } from "./version-binding.js";
import type { InterventionGate } from "./authority.js";

/**
 * A single entry in the debug trace log.
 */
export interface DebugTraceEntry {
  /** ISO-8601 timestamp of the trace event */
  readonly timestamp: string;

  /** Component that emitted the trace */
  readonly source: string;

  /** Trace message */
  readonly message: string;

  /** Optional structured data */
  readonly data?: Record<string, unknown>;
}

/**
 * Constraints applied to an ALLOW_WITH_CONSTRAINTS decision.
 */
export interface AppliedConstraint {
  /** Unique identifier for the constraint */
  readonly constraint_id: string;

  /** Human-readable description */
  readonly description: string;

  /** The policy rule that produced this constraint */
  readonly source_rule_id: string;

  /** Structured constraint parameters */
  readonly parameters: Record<string, unknown>;
}

/**
 * The complete decision artifact: the atomic unit of audit.
 * Every field required for replay and forensic analysis is present.
 */
export interface DecisionArtifact {
  /** Globally unique decision identifier */
  readonly decision_id: string;

  /** ISO-8601 timestamp when the decision was rendered */
  readonly decided_at: string;

  /** The final decision */
  readonly decision: GovernanceDecision;

  /** Explanation code classifying the reason */
  readonly explanation_code: ExplanationCode;

  /** Constraints applied (populated for ALLOW_WITH_CONSTRAINTS) */
  readonly constraints_applied: ReadonlyArray<AppliedConstraint>;

  /** Risk tier assessed for the proposed action */
  readonly assessed_risk_tier: InterventionGate;

  /** Governance mode at the time of the decision */
  readonly mode_at_decision: GovernanceMode;

  /** Governance state snapshot before the decision */
  readonly state_before: GovernanceState;

  /** Governance state snapshot after the decision */
  readonly state_after: GovernanceState;

  /** Version vector active when the decision was made */
  readonly version_vector: VersionVector;

  /** Authority epoch in which the decision was made */
  readonly authority_epoch_id: string;

  /** ID of the principal whose request triggered this decision */
  readonly requesting_principal_id: string;

  /** Delegation chain IDs if the request was delegated */
  readonly delegation_chain: ReadonlyArray<string>;

  /** Debug trace entries collected during evaluation */
  readonly debug_trace: ReadonlyArray<DebugTraceEntry>;

  /** Optional replay binding if this decision was replayed */
  readonly replay_binding: ReplayBinding | null;
}
