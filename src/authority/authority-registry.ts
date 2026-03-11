/**
 * AuthorityRegistry - Runtime principal registry with token management.
 *
 * Manages the lifecycle of authority principals at runtime, including
 * registration, revocation, and scoped token issuance/validation.
 */

import { randomUUID, createHmac } from 'node:crypto';

import type {
  AuthorityPrincipal,
  AuthorityScope,
  DecisionRight,
  InterventionGate,
  AuthorityKind,
} from './authority-model.js';

// ---------------------------------------------------------------------------
// Token & validation types
// ---------------------------------------------------------------------------

/** A scoped, time-limited token proving a principal's authority. */
export interface ScopedToken {
  /** Unique identifier for this token. */
  readonly token_id: string;
  /** The principal this token was issued to. */
  readonly principal_id: string;
  /** The scope this token authorises. */
  readonly scope: AuthorityScope;
  /** ISO-8601 timestamp when the token was issued. */
  readonly issued_at: string;
  /** ISO-8601 timestamp when the token expires. */
  readonly expires_at: string;
  /** HMAC signature over the token payload. */
  readonly signature: string;
}

/** Result of validating an authority token. */
export interface AuthorityValidationResult {
  /** Whether the token is valid. */
  readonly valid: boolean;
  /** The principal id the token belongs to, if valid. */
  readonly principal_id?: string;
  /** The effective scope of the token, if valid. */
  readonly effective_scope?: AuthorityScope;
  /** Human-readable reason for the validation outcome. */
  readonly reason?: string;
  /** Whether the token has expired. */
  readonly expired?: boolean;
}

// ---------------------------------------------------------------------------
// AuthorityRegistry
// ---------------------------------------------------------------------------

/** HMAC secret used for token signatures. In production this should be injected. */
const TOKEN_HMAC_SECRET = 'srg-authority-token-secret';

export class AuthorityRegistry {
  private readonly principals = new Map<string, AuthorityPrincipal>();
  private readonly tokens = new Map<string, ScopedToken>();

  /**
   * Register a new authority principal.
   *
   * @param principal - The principal to register.
   * @throws If a principal with the same id is already registered.
   */
  registerPrincipal(principal: AuthorityPrincipal): void {
    if (this.principals.has(principal.principal_id)) {
      throw new Error(
        `Principal already registered: ${principal.principal_id}`,
      );
    }
    this.principals.set(principal.principal_id, principal);
  }

  /**
   * Revoke a principal, marking it as revoked and invalidating all
   * outstanding tokens for that principal.
   *
   * @param principalId - The id of the principal to revoke.
   * @param revokedBy   - The id of the principal performing the revocation.
   * @throws If the principal is not found.
   */
  revokePrincipal(principalId: string, revokedBy: string): void {
    const existing = this.principals.get(principalId);
    if (!existing) {
      throw new Error(`Principal not found: ${principalId}`);
    }

    // Replace with a revoked copy.
    const revoked: AuthorityPrincipal = {
      ...existing,
      revoked_at: new Date().toISOString(),
    };
    this.principals.set(principalId, revoked);

    // Invalidate all tokens for this principal.
    for (const [tokenId, token] of this.tokens) {
      if (token.principal_id === principalId) {
        this.tokens.delete(tokenId);
      }
    }
  }

  /**
   * Issue a scoped, time-limited token for a principal.
   *
   * @param principalId - The principal to issue the token for.
   * @param scope       - The scope the token should authorise.
   * @param ttlMs       - Time-to-live in milliseconds.
   * @returns The issued ScopedToken.
   * @throws If the principal is not found or has been revoked.
   */
  issueToken(
    principalId: string,
    scope: AuthorityScope,
    ttlMs: number,
  ): ScopedToken {
    const principal = this.principals.get(principalId);
    if (!principal) {
      throw new Error(`Principal not found: ${principalId}`);
    }
    if (principal.revoked_at) {
      throw new Error(`Principal has been revoked: ${principalId}`);
    }

    const now = new Date();
    const tokenId = randomUUID();
    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

    const payload = JSON.stringify({
      token_id: tokenId,
      principal_id: principalId,
      scope,
      issued_at: issuedAt,
      expires_at: expiresAt,
    });

    const signature = createHmac('sha256', TOKEN_HMAC_SECRET)
      .update(payload)
      .digest('hex');

    const token: ScopedToken = {
      token_id: tokenId,
      principal_id: principalId,
      scope,
      issued_at: issuedAt,
      expires_at: expiresAt,
      signature,
    };

    this.tokens.set(tokenId, token);
    return token;
  }

  /**
   * Validate a scoped token.
   *
   * Checks that:
   * 1. The token exists in the registry.
   * 2. The signature is valid.
   * 3. The token has not expired.
   * 4. The owning principal has not been revoked.
   *
   * @param token - The token to validate.
   * @returns A structured validation result.
   */
  validateToken(token: ScopedToken): AuthorityValidationResult {
    // 1. Check token exists.
    const stored = this.tokens.get(token.token_id);
    if (!stored) {
      return { valid: false, reason: 'Token not found in registry' };
    }

    // 2. Verify signature.
    const payload = JSON.stringify({
      token_id: stored.token_id,
      principal_id: stored.principal_id,
      scope: stored.scope,
      issued_at: stored.issued_at,
      expires_at: stored.expires_at,
    });
    const expectedSig = createHmac('sha256', TOKEN_HMAC_SECRET)
      .update(payload)
      .digest('hex');

    if (token.signature !== expectedSig) {
      return { valid: false, reason: 'Token signature mismatch' };
    }

    // 3. Check expiry.
    const now = Date.now();
    const expiresAt = new Date(stored.expires_at).getTime();
    if (now > expiresAt) {
      return {
        valid: false,
        principal_id: stored.principal_id,
        reason: 'Token has expired',
        expired: true,
      };
    }

    // 4. Check principal is still active.
    const principal = this.principals.get(stored.principal_id);
    if (!principal) {
      return { valid: false, reason: 'Principal no longer exists' };
    }
    if (principal.revoked_at) {
      return {
        valid: false,
        principal_id: stored.principal_id,
        reason: 'Principal has been revoked',
      };
    }

    return {
      valid: true,
      principal_id: stored.principal_id,
      effective_scope: stored.scope,
    };
  }

  /**
   * Retrieve a registered principal by id.
   */
  getPrincipal(principalId: string): AuthorityPrincipal | undefined {
    return this.principals.get(principalId);
  }
}
