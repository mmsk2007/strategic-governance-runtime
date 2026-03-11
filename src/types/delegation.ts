/**
 * Delegation envelope types for Strategic Governance Runtime v2.
 *
 * Delegation allows a principal to grant a subset of its own rights
 * to another principal, subject to the non-expandability guarantee:
 * a delegate can never exceed the delegator's ceiling or scope.
 */

import type {
  AuthorityCeiling,
  AuthorityScope,
  DecisionRight,
  InterventionGate,
} from "./authority.js";

/**
 * Status of a delegation envelope.
 */
export type DelegationStatus =
  | "active"
  | "expired"
  | "revoked"
  | "superseded";

/**
 * A single link in the delegation chain, proving that authority
 * was transferred from one principal to another.
 */
export interface DelegationLink {
  /** Principal granting the delegation */
  readonly from_principal_id: string;

  /** Principal receiving the delegation */
  readonly to_principal_id: string;

  /** ISO-8601 timestamp when this link was created */
  readonly delegated_at: string;

  /** Cryptographic signature by the delegating principal */
  readonly signature: string;
}

/**
 * The delegation envelope: a sealed, non-expandable grant of
 * authority from one principal to another.
 *
 * Non-expandability guarantee: the delegated rights, ceiling,
 * and scopes must be a subset of (or equal to) the delegator's
 * own grants. The runtime validates this at every decision point.
 */
export interface DelegationEnvelope {
  /** Unique identifier for this delegation */
  readonly delegation_id: string;

  /** Principal who originated the delegation */
  readonly delegator_id: string;

  /** Principal who receives the delegated authority */
  readonly delegate_id: string;

  /** Rights being delegated (must be subset of delegator's rights) */
  readonly delegated_rights: ReadonlyArray<DecisionRight>;

  /**
   * Ceiling for the delegate (must not exceed delegator's ceiling).
   * This enforces max_risk_tier, max_delegation_depth, and
   * max_scope_breadth constraints.
   */
  readonly delegated_ceiling: AuthorityCeiling;

  /** Scopes the delegate may act within (subset of delegator's scopes) */
  readonly delegated_scopes: ReadonlyArray<AuthorityScope>;

  /** Current depth of the delegation chain (0 = direct grant) */
  readonly chain_depth: number;

  /** Ordered links in the delegation chain from origin to delegate */
  readonly chain: ReadonlyArray<DelegationLink>;

  /** Current status of this delegation */
  readonly status: DelegationStatus;

  /** ISO-8601 timestamp when this delegation was created */
  readonly created_at: string;

  /** ISO-8601 timestamp when this delegation expires */
  readonly expires_at: string;

  /** ISO-8601 timestamp when this delegation was revoked, if applicable */
  readonly revoked_at: string | null;

  /** Cryptographic signature sealing the envelope */
  readonly envelope_signature: string;
}
