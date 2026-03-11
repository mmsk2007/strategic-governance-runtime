/**
 * Input/output contract types for Strategic Governance Runtime v2.
 *
 * These types define the interface between callers and the governance
 * runtime. GovernanceInput is what callers provide; GovernanceOutput
 * is what the runtime returns.
 */

import type { GovernanceDecision } from "./governance.js";
import type { ExplanationCode } from "./policy.js";
import type { AppliedConstraint, DebugTraceEntry, DecisionArtifact } from "./decision.js";
import type { AuthorityToken, InterventionGate } from "./authority.js";
import type { DelegationEnvelope } from "./delegation.js";
import type { HumanConfirmation } from "./provenance.js";
import type { SemanticVersion } from "./version-binding.js";
import type { ReplayBinding } from "./version-binding.js";

/**
 * Caller-provided context for the governance decision.
 */
export interface GovernanceContext {
  /** Identifier for the session or conversation */
  readonly session_id: string;

  /** Identifier for the specific request or turn */
  readonly request_id: string;

  /** Domain or subsystem the action targets */
  readonly domain: string;

  /** Free-form environment tags, e.g. "production", "staging" */
  readonly environment: string;

  /** Additional context key-value pairs */
  readonly attributes: Record<string, unknown>;
}

/**
 * Constraints the caller wants the runtime to respect.
 */
export interface CallerConstraints {
  /** Maximum risk tier the caller is willing to accept */
  readonly max_risk_tier?: InterventionGate;

  /** Maximum latency budget in milliseconds */
  readonly max_latency_ms?: number;

  /** Whether to include debug trace in the output */
  readonly include_debug_trace?: boolean;

  /** Additional caller-specified constraint parameters */
  readonly custom?: Record<string, unknown>;
}

/**
 * Caller-provided metadata for observability and audit.
 */
export interface RequestMetadata {
  /** Caller's own trace or correlation ID */
  readonly correlation_id?: string;

  /** Caller's component or service name */
  readonly caller_component?: string;

  /** Caller's software version */
  readonly caller_version?: string;

  /** Additional metadata key-value pairs */
  readonly labels?: Record<string, string>;
}

/**
 * The complete input to the governance runtime.
 */
export interface GovernanceInput {
  /** The action being proposed, as a structured descriptor */
  readonly proposed_action: string;

  /** Raw score from the model, in [0, 1] */
  readonly model_score_raw: number;

  /** Final calibrated probability, in [0, 1] */
  readonly final_probability: number;

  /** Contextual information about the request */
  readonly context: GovernanceContext;

  /** Caller-specified constraints */
  readonly constraints: CallerConstraints;

  /** Observability and audit metadata */
  readonly metadata: RequestMetadata;

  // ── v2 additions ──────────────────────────────────────────

  /** Authority token proving the caller's identity and rights */
  readonly authority_token: AuthorityToken;

  /** Delegation envelope, if the caller is acting on delegated authority */
  readonly delegation_envelope: DelegationEnvelope | null;

  /** Human confirmation proof, if a human-in-the-loop confirmed the action */
  readonly human_confirmation: HumanConfirmation | null;

  /** Version of the context schema the caller is using */
  readonly context_schema_version: SemanticVersion;
}

/**
 * The complete output from the governance runtime.
 */
export interface GovernanceOutput {
  /** The rendered decision */
  readonly final_decision: GovernanceDecision;

  /** Constraints applied to the action (for ALLOW_WITH_CONSTRAINTS) */
  readonly constraints_applied: ReadonlyArray<AppliedConstraint>;

  /** Explanation code classifying the reason for the decision */
  readonly explanation_code: ExplanationCode;

  /** Globally unique identifier for this decision */
  readonly decision_id: string;

  /** Debug trace entries, if requested */
  readonly debug_trace: ReadonlyArray<DebugTraceEntry>;

  // ── v2 additions ──────────────────────────────────────────

  /** Complete decision artifact for audit and replay */
  readonly decision_artifact: DecisionArtifact;

  /** Authority epoch in which the decision was rendered */
  readonly authority_epoch_id: string;

  /** Replay binding for deterministic replay of this decision */
  readonly replay_binding: ReplayBinding;
}
