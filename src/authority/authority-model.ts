/**
 * AuthorityModel - Canonical authority configuration for the governance runtime.
 *
 * Holds the set of authority principals and provides lookup methods for
 * principals, scopes, and decision rights.
 */

// ---------------------------------------------------------------------------
// Local type definitions (fallback if ../types/index.js is not yet available)
// ---------------------------------------------------------------------------

/** Intervention gate risk tiers, ordered lowest to highest. */
export type InterventionGate = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';

/** Decision rights that can be granted to a principal. */
export type DecisionRight =
  | 'propose'
  | 'approve'
  | 'escalate'
  | 'override'
  | 'revoke'
  | 'delegate';

/** Kind of principal in the authority graph. */
export type AuthorityKind = 'human' | 'service' | 'agent' | 'system';

/** A condition attached to a scope that further constrains when it applies. */
export interface PolicyCondition {
  readonly field: string;
  readonly operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
  readonly value: unknown;
}

/** Ceiling limiting what a principal may do. */
export interface AuthorityCeiling {
  /** Maximum risk tier this principal can approve. */
  readonly max_risk_tier: InterventionGate;
  /** Maximum delegation chain depth. */
  readonly max_delegation_depth: number;
  /** Maximum number of distinct resource scopes. */
  readonly max_scope_breadth: number;
  /** If set, human confirmation is required above this tier. */
  readonly requires_human_confirmation_above?: InterventionGate;
}

/** A scope constraining where a principal's authority applies. */
export interface AuthorityScope {
  /** Resource identifier or pattern, e.g. "finance:prod/*". */
  readonly resource: string;
  /** Decision rights available within this scope. */
  readonly rights: ReadonlyArray<DecisionRight>;
  /** Optional monetary / quantity cap for this scope. */
  readonly max_value?: number;
  /** Optional conditions that must hold for the scope to apply. */
  readonly conditions?: ReadonlyArray<PolicyCondition>;
}

/** A principal in the authority graph. */
export interface AuthorityPrincipal {
  /** Unique identifier for this principal. */
  readonly principal_id: string;
  /** Kind of principal. */
  readonly kind: AuthorityKind;
  /** Human-readable display name. */
  readonly display_name: string;
  /** Scopes within which this principal may act. */
  readonly scopes: ReadonlyArray<AuthorityScope>;
  /** Ceiling limiting this principal's authority. */
  readonly ceiling: AuthorityCeiling;
  /** ISO-8601 timestamp when this principal was created. */
  readonly created_at: string;
  /** ISO-8601 timestamp when this principal was revoked, if applicable. */
  readonly revoked_at?: string;
}

// ---------------------------------------------------------------------------
// AuthorityModel
// ---------------------------------------------------------------------------

export class AuthorityModel {
  private readonly principals: ReadonlyMap<string, AuthorityPrincipal>;

  /**
   * Construct an AuthorityModel from an array of principal definitions.
   *
   * @param definitions - The authority principals to include in the model.
   * @throws If duplicate principal_id values are detected.
   */
  constructor(definitions: ReadonlyArray<AuthorityPrincipal>) {
    const map = new Map<string, AuthorityPrincipal>();
    for (const def of definitions) {
      if (map.has(def.principal_id)) {
        throw new Error(`Duplicate principal_id: ${def.principal_id}`);
      }
      map.set(def.principal_id, def);
    }
    this.principals = map;
  }

  /**
   * Retrieve a principal by id.
   *
   * @returns The matching principal, or undefined if not found.
   */
  getPrincipal(id: string): AuthorityPrincipal | undefined {
    return this.principals.get(id);
  }

  /**
   * Check whether a principal exists in the model.
   */
  hasPrincipal(id: string): boolean {
    return this.principals.has(id);
  }

  /**
   * Get the scope for a specific principal and resource.
   *
   * @returns The matching scope, or undefined if the principal does not
   *          have authority over the given resource.
   */
  getScope(principalId: string, resource: string): AuthorityScope | undefined {
    const principal = this.principals.get(principalId);
    if (!principal) return undefined;
    return principal.scopes.find((s) => s.resource === resource);
  }

  /**
   * Check whether a principal holds a specific right for a resource.
   *
   * @returns `true` if the principal has the right within a matching scope.
   */
  checkRight(principalId: string, right: DecisionRight, resource: string): boolean {
    const scope = this.getScope(principalId, resource);
    if (!scope) return false;
    return scope.rights.includes(right);
  }

  /**
   * List all principals in the model.
   */
  listPrincipals(): ReadonlyArray<AuthorityPrincipal> {
    return Array.from(this.principals.values());
  }
}
