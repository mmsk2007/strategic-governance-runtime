/**
 * Authority types for Strategic Governance Runtime v2.
 *
 * Authorities model the principals (humans, services, agents, system)
 * that can propose, approve, escalate, override, revoke, or delegate
 * decisions. Each principal has a ceiling that caps the risk tier and
 * delegation depth it may exercise.
 */

/**
 * Kind of principal in the authority graph.
 */
export type AuthorityKind = "human" | "service" | "agent" | "system";

/**
 * Decision rights that can be granted to a principal.
 */
export type DecisionRight =
  | "propose"
  | "approve"
  | "escalate"
  | "override"
  | "revoke"
  | "delegate";

/**
 * Intervention gate risk tiers, ordered from lowest to highest risk.
 *
 * - Green:  Routine; no special oversight required.
 * - Yellow: Elevated; additional logging and review.
 * - Orange: High; requires explicit approval.
 * - Red:    Critical; multi-party approval required.
 * - Black:  Existential; system halt unless overridden by top authority.
 */
export type InterventionGate =
  | "Green"
  | "Yellow"
  | "Orange"
  | "Red"
  | "Black";

/**
 * Ceiling that limits what a principal is allowed to do.
 */
export interface AuthorityCeiling {
  /** Maximum risk tier this principal can approve */
  readonly max_risk_tier: InterventionGate;

  /** Maximum delegation chain depth this principal can create */
  readonly max_delegation_depth: number;

  /**
   * Maximum scope breadth (number of distinct resource domains)
   * this principal can govern simultaneously.
   */
  readonly max_scope_breadth: number;
}

/**
 * A scope constraining where a principal's authority applies.
 */
export interface AuthorityScope {
  /** Resource domain, e.g. "finance", "infrastructure", "data" */
  readonly domain: string;

  /** Specific resource pattern within the domain, e.g. "prod/*" */
  readonly resource_pattern: string;
}

/**
 * A principal in the authority graph.
 */
export interface AuthorityPrincipal {
  /** Unique identifier for this principal */
  readonly principal_id: string;

  /** Kind of principal */
  readonly kind: AuthorityKind;

  /** Human-readable display name */
  readonly display_name: string;

  /** Decision rights granted to this principal */
  readonly rights: ReadonlyArray<DecisionRight>;

  /** Ceiling limiting this principal's authority */
  readonly ceiling: AuthorityCeiling;

  /** Scopes within which this principal may act */
  readonly scopes: ReadonlyArray<AuthorityScope>;

  /** Whether this principal is currently active */
  readonly active: boolean;

  /** ISO-8601 timestamp when this principal was registered */
  readonly registered_at: string;
}

/**
 * Opaque token proving a principal's identity and authority
 * at the time a governance request is made.
 */
export interface AuthorityToken {
  /** The principal making the request */
  readonly principal_id: string;

  /** Rights being exercised in this request */
  readonly exercised_rights: ReadonlyArray<DecisionRight>;

  /** ISO-8601 timestamp when the token was issued */
  readonly issued_at: string;

  /** ISO-8601 timestamp when the token expires */
  readonly expires_at: string;

  /** Cryptographic signature over the token payload */
  readonly signature: string;
}
