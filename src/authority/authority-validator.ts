/**
 * AuthorityValidator - Validates authority before governance decisions.
 *
 * Performs multi-layered validation including token validity, scope
 * sufficiency, ceiling compliance, and epoch consistency to ensure
 * that every governance decision is backed by legitimate authority.
 */

import type { AuthorityRegistry, ScopedToken, AuthorityValidationResult } from './authority-registry.js';
import type { EpochManager } from './epoch-manager.js';
import type {
  AuthorityPrincipal,
  AuthorityScope,
  DecisionRight,
  InterventionGate,
} from './authority-model.js';

// ---------------------------------------------------------------------------
// Risk tier ordering (for ceiling comparison)
// ---------------------------------------------------------------------------

const RISK_TIER_ORDER: Record<InterventionGate, number> = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3,
  BLACK: 4,
};

// ---------------------------------------------------------------------------
// Delegation envelope type (local definition for optional input)
// ---------------------------------------------------------------------------

/** Minimal delegation envelope shape used for validation. */
export interface DelegationEnvelopeInput {
  readonly delegation_id: string;
  readonly delegator_id: string;
  readonly delegate_id: string;
  readonly delegated_rights: ReadonlyArray<DecisionRight>;
  readonly delegated_ceiling: {
    readonly max_risk_tier: InterventionGate;
    readonly max_delegation_depth: number;
    readonly max_scope_breadth: number;
  };
  readonly delegated_scopes: ReadonlyArray<AuthorityScope>;
  readonly chain_depth: number;
  readonly status: string;
  readonly expires_at: string;
}

// ---------------------------------------------------------------------------
// Validation input
// ---------------------------------------------------------------------------

/** Input to the authority validation process. */
export interface AuthorityValidationInput {
  /** The scoped token to validate. */
  readonly authority_token: ScopedToken;
  /** Optional delegation envelope if authority is delegated. */
  readonly delegation_envelope?: DelegationEnvelopeInput;
  /** The risk tier of the action being authorised. */
  readonly risk_tier?: InterventionGate;
}

// ---------------------------------------------------------------------------
// AuthorityValidator
// ---------------------------------------------------------------------------

export class AuthorityValidator {
  private readonly registry: AuthorityRegistry;
  private readonly epochManager: EpochManager;

  /**
   * @param authorityRegistry - The runtime principal registry.
   * @param epochManager      - The epoch lifecycle manager.
   */
  constructor(authorityRegistry: AuthorityRegistry, epochManager: EpochManager) {
    this.registry = authorityRegistry;
    this.epochManager = epochManager;
  }

  /**
   * Validate authority for a governance decision.
   *
   * Performs the following checks in order:
   * 1. Token validity (existence, signature, expiry, principal status).
   * 2. Epoch consistency (an active epoch must exist).
   * 3. Scope sufficiency (the token scope must cover the requested action).
   * 4. Ceiling compliance (the principal's ceiling must permit the risk tier).
   * 5. Delegation validation (if a delegation envelope is provided).
   *
   * @param input - The validation input containing token, optional delegation,
   *                and optional risk tier.
   * @returns A structured validation result.
   */
  validate(input: AuthorityValidationInput): AuthorityValidationResult {
    const { authority_token, delegation_envelope, risk_tier } = input;

    // 1. Token validity.
    const tokenResult = this.registry.validateToken(authority_token);
    if (!tokenResult.valid) {
      return tokenResult;
    }

    const principalId = tokenResult.principal_id!;
    const effectiveScope = tokenResult.effective_scope!;

    // 2. Epoch consistency.
    const currentEpoch = this.epochManager.currentEpoch();
    if (!currentEpoch) {
      return {
        valid: false,
        principal_id: principalId,
        reason: 'No active epoch exists; cannot validate authority outside an epoch boundary',
      };
    }

    // 3. Scope sufficiency - check that the token scope has rights.
    if (!effectiveScope.rights || effectiveScope.rights.length === 0) {
      return {
        valid: false,
        principal_id: principalId,
        effective_scope: effectiveScope,
        reason: 'Token scope grants no decision rights',
      };
    }

    // 4. Ceiling compliance - check risk tier against principal ceiling.
    if (risk_tier) {
      const principal = this.registry.getPrincipal(principalId);
      if (!principal) {
        return {
          valid: false,
          principal_id: principalId,
          reason: 'Principal not found during ceiling check',
        };
      }

      const ceilingResult = this.checkCeiling(principal, risk_tier);
      if (!ceilingResult.valid) {
        return ceilingResult;
      }
    }

    // 5. Delegation validation.
    if (delegation_envelope) {
      const delegationResult = this.validateDelegation(
        principalId,
        delegation_envelope,
      );
      if (!delegationResult.valid) {
        return delegationResult;
      }
    }

    return {
      valid: true,
      principal_id: principalId,
      effective_scope: effectiveScope,
    };
  }

  /**
   * Check that the principal's ceiling permits the requested risk tier.
   */
  private checkCeiling(
    principal: AuthorityPrincipal,
    riskTier: InterventionGate,
  ): AuthorityValidationResult {
    const maxAllowed = RISK_TIER_ORDER[principal.ceiling.max_risk_tier];
    const requested = RISK_TIER_ORDER[riskTier];

    if (requested > maxAllowed) {
      return {
        valid: false,
        principal_id: principal.principal_id,
        reason:
          `Risk tier ${riskTier} exceeds principal ceiling of ${principal.ceiling.max_risk_tier}`,
      };
    }

    // Check human confirmation requirement.
    if (
      principal.ceiling.requires_human_confirmation_above &&
      principal.kind !== 'human'
    ) {
      const confirmThreshold =
        RISK_TIER_ORDER[principal.ceiling.requires_human_confirmation_above];
      if (requested > confirmThreshold) {
        return {
          valid: false,
          principal_id: principal.principal_id,
          reason:
            `Risk tier ${riskTier} requires human confirmation (threshold: ${principal.ceiling.requires_human_confirmation_above})`,
        };
      }
    }

    return { valid: true, principal_id: principal.principal_id };
  }

  /**
   * Validate a delegation envelope.
   */
  private validateDelegation(
    principalId: string,
    envelope: DelegationEnvelopeInput,
  ): AuthorityValidationResult {
    // The delegate must match the token principal.
    if (envelope.delegate_id !== principalId) {
      return {
        valid: false,
        principal_id: principalId,
        reason:
          `Delegation delegate_id (${envelope.delegate_id}) does not match token principal (${principalId})`,
      };
    }

    // Delegation must be active.
    if (envelope.status !== 'active') {
      return {
        valid: false,
        principal_id: principalId,
        reason: `Delegation is not active (status: ${envelope.status})`,
      };
    }

    // Delegation must not be expired.
    const now = Date.now();
    const expiresAt = new Date(envelope.expires_at).getTime();
    if (now > expiresAt) {
      return {
        valid: false,
        principal_id: principalId,
        reason: 'Delegation envelope has expired',
        expired: true,
      };
    }

    // Delegator must exist and be active.
    const delegator = this.registry.getPrincipal(envelope.delegator_id);
    if (!delegator) {
      return {
        valid: false,
        principal_id: principalId,
        reason: `Delegator principal not found: ${envelope.delegator_id}`,
      };
    }
    if (delegator.revoked_at) {
      return {
        valid: false,
        principal_id: principalId,
        reason: `Delegator has been revoked: ${envelope.delegator_id}`,
      };
    }

    // Chain depth must not exceed delegator's ceiling.
    if (envelope.chain_depth > delegator.ceiling.max_delegation_depth) {
      return {
        valid: false,
        principal_id: principalId,
        reason:
          `Delegation chain depth (${envelope.chain_depth}) exceeds delegator ceiling (${delegator.ceiling.max_delegation_depth})`,
      };
    }

    return { valid: true, principal_id: principalId };
  }
}
