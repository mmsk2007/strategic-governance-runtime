/**
 * DelegationEnvelope — creation and validation of delegation envelopes.
 *
 * An envelope is a sealed, non-expandable grant of authority from one
 * principal (delegator) to another (delegatee).
 */

import { randomUUID, createHmac } from 'node:crypto';
import type {
  DecisionRight,
  AuthorityScope,
} from '../types/index.js';

// ── Local types (defined inline per project convention) ─────────────

/** Parameters for creating a new delegation envelope. */
export interface CreateEnvelopeParams {
  readonly delegator: string;
  readonly delegatee: string;
  readonly rights_granted: DecisionRight[];
  readonly scope_restriction: AuthorityScope;
  readonly max_sub_delegation_depth: number;
  readonly expires_at: string;
  readonly audit_ref: string;
  readonly parent_envelope_id?: string;
  readonly signing_key: string;
}

/** Shape of a delegation envelope document. */
export interface Envelope {
  readonly envelope_id: string;
  readonly delegator: string;
  readonly delegatee: string;
  readonly rights_granted: DecisionRight[];
  readonly scope_restriction: AuthorityScope;
  readonly max_sub_delegation_depth: number;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly audit_ref: string;
  readonly parent_envelope_id?: string;
  readonly signature: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function computeSignature(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex');
}

function canonicalPayload(env: Omit<Envelope, 'signature'>): string {
  return JSON.stringify({
    envelope_id: env.envelope_id,
    delegator: env.delegator,
    delegatee: env.delegatee,
    rights_granted: [...env.rights_granted].sort(),
    scope_restriction: env.scope_restriction,
    max_sub_delegation_depth: env.max_sub_delegation_depth,
    issued_at: env.issued_at,
    expires_at: env.expires_at,
    audit_ref: env.audit_ref,
    parent_envelope_id: env.parent_envelope_id ?? null,
  });
}

// ── Class ───────────────────────────────────────────────────────────

export class DelegationEnvelope {
  /**
   * Create a new delegation envelope with a unique id and HMAC signature.
   */
  static create(params: CreateEnvelopeParams): Envelope {
    const partial: Omit<Envelope, 'signature'> = {
      envelope_id: randomUUID(),
      delegator: params.delegator,
      delegatee: params.delegatee,
      rights_granted: params.rights_granted,
      scope_restriction: params.scope_restriction,
      max_sub_delegation_depth: params.max_sub_delegation_depth,
      issued_at: new Date().toISOString(),
      expires_at: params.expires_at,
      audit_ref: params.audit_ref,
      parent_envelope_id: params.parent_envelope_id,
    };

    const signature = computeSignature(
      canonicalPayload(partial),
      params.signing_key,
    );

    return { ...partial, signature };
  }

  /**
   * Validate a delegation envelope.
   *
   * Checks:
   * 1. Signature integrity (requires signing key).
   * 2. Expiry — envelope must not have passed its `expires_at`.
   * 3. Scope constraints — rights_granted must be non-empty,
   *    max_sub_delegation_depth >= 0.
   */
  static validate(
    envelope: Envelope,
    signingKey?: string,
  ): { valid: boolean; reason?: string } {
    // Required fields
    if (!envelope.envelope_id) {
      return { valid: false, reason: 'Missing envelope_id' };
    }
    if (!envelope.delegator) {
      return { valid: false, reason: 'Missing delegator' };
    }
    if (!envelope.delegatee) {
      return { valid: false, reason: 'Missing delegatee' };
    }
    if (envelope.delegator === envelope.delegatee) {
      return { valid: false, reason: 'Delegator and delegatee must differ' };
    }

    // Rights
    if (!envelope.rights_granted || envelope.rights_granted.length === 0) {
      return { valid: false, reason: 'No rights granted' };
    }

    // Depth
    if (envelope.max_sub_delegation_depth < 0) {
      return { valid: false, reason: 'max_sub_delegation_depth must be >= 0' };
    }

    // Expiry
    const now = new Date();
    const expiresAt = new Date(envelope.expires_at);
    if (isNaN(expiresAt.getTime())) {
      return { valid: false, reason: 'Invalid expires_at timestamp' };
    }
    if (expiresAt <= now) {
      return { valid: false, reason: 'Envelope has expired' };
    }

    // Signature (only if key provided)
    if (signingKey !== undefined) {
      const { signature: _sig, ...rest } = envelope;
      const expected = computeSignature(canonicalPayload(rest), signingKey);
      if (expected !== envelope.signature) {
        return { valid: false, reason: 'Invalid signature' };
      }
    }

    return { valid: true };
  }
}
