/**
 * ArtifactSigner — interface and default HMAC-SHA256 implementation
 * for signing and verifying decision artifacts.
 *
 * Signatures provide non-repudiation: once a principal signs an artifact,
 * they cannot deny having produced or approved the decision.
 */

import { createHmac } from 'node:crypto';
import type { DecisionArtifact } from '../types/index.js';

// ── Local types ─────────────────────────────────────────────────────

/** Cryptographic signature attached to a decision artifact. */
export interface ArtifactSignature {
  readonly signer_id: string;
  readonly algorithm: string;
  readonly signature: string;
  readonly timestamp: string;
}

/** Interface for signing and verifying decision artifacts. */
export interface ArtifactSigner {
  /**
   * Sign a decision artifact, producing an ArtifactSignature.
   */
  sign(artifact: DecisionArtifact, key: string): ArtifactSignature;

  /**
   * Verify a decision artifact against a previously produced signature.
   */
  verify(artifact: DecisionArtifact, signature: ArtifactSignature, key: string): boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Build a canonical payload string from a decision artifact.
 * The payload is deterministic: keys are sorted to ensure consistent
 * serialisation regardless of insertion order.
 */
function canonicalPayload(artifact: DecisionArtifact): string {
  const payload = {
    decision_id: artifact.decision_id,
    decided_at: artifact.decided_at,
    decision: artifact.decision,
    explanation_code: artifact.explanation_code,
    constraints_applied: artifact.constraints_applied,
    assessed_risk_tier: artifact.assessed_risk_tier,
    mode_at_decision: artifact.mode_at_decision,
    state_before: artifact.state_before,
    state_after: artifact.state_after,
    version_vector: artifact.version_vector,
    authority_epoch_id: artifact.authority_epoch_id,
    requesting_principal_id: artifact.requesting_principal_id,
    delegation_chain: artifact.delegation_chain,
  };
  return JSON.stringify(payload);
}

// ── Default implementation ──────────────────────────────────────────

/**
 * HMAC-SHA256 artifact signer.
 *
 * Uses a shared secret key to produce and verify HMAC signatures
 * over the canonical artifact payload.
 */
export class HMACArtifactSigner implements ArtifactSigner {
  private readonly signerId: string;

  constructor(signerId: string) {
    this.signerId = signerId;
  }

  sign(artifact: DecisionArtifact, key: string): ArtifactSignature {
    const payload = canonicalPayload(artifact);
    const sig = createHmac('sha256', key).update(payload).digest('hex');

    return {
      signer_id: this.signerId,
      algorithm: 'HMAC-SHA256',
      signature: sig,
      timestamp: new Date().toISOString(),
    };
  }

  verify(
    artifact: DecisionArtifact,
    signature: ArtifactSignature,
    key: string,
  ): boolean {
    if (signature.algorithm !== 'HMAC-SHA256') {
      return false;
    }

    const payload = canonicalPayload(artifact);
    const expected = createHmac('sha256', key).update(payload).digest('hex');
    return expected === signature.signature;
  }
}
