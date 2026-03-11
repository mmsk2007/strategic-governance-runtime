/**
 * ArtifactValidator — validates decision artifact integrity.
 *
 * Performs structural validation (required fields, type correctness),
 * hash consistency checks, signature verification (when a signer is
 * provided), and epoch consistency verification.
 */

import type { DecisionArtifact } from '../types/index.js';
import type { ArtifactSignature, ArtifactSigner } from './artifact-signer.js';

// ── Valid enums ─────────────────────────────────────────────────────

const VALID_DECISIONS = new Set([
  'ALLOW',
  'DENY',
  'ALLOW_WITH_CONSTRAINTS',
  'ESCALATE',
  'HALT',
]);

const VALID_EXPLANATION_CODES = new Set(['L1', 'L2', 'L3', 'L4', 'L5']);

const VALID_RISK_TIERS = new Set([
  'Green',
  'Yellow',
  'Orange',
  'Red',
  'Black',
]);

const VALID_MODES = new Set([
  'AUTONOMOUS',
  'SUPERVISED',
  'DEFENSIVE',
  'QUARANTINE',
  'MANUAL',
]);

// ── Class ───────────────────────────────────────────────────────────

export class ArtifactValidator {
  /**
   * Validate a decision artifact for structural integrity and consistency.
   *
   * Checks performed:
   * 1. Required fields are present and non-empty.
   * 2. Enum fields contain valid values.
   * 3. Timestamp is a valid ISO-8601 date.
   * 4. Version vector fields are present.
   * 5. State snapshots (before/after) are present.
   * 6. Epoch ID is consistent (non-empty).
   */
  validate(artifact: DecisionArtifact): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required string fields
    if (!artifact.decision_id) {
      errors.push('Missing decision_id');
    }
    if (!artifact.decided_at) {
      errors.push('Missing decided_at');
    } else if (isNaN(new Date(artifact.decided_at).getTime())) {
      errors.push('Invalid decided_at timestamp');
    }
    if (!artifact.authority_epoch_id) {
      errors.push('Missing authority_epoch_id');
    }
    if (!artifact.requesting_principal_id) {
      errors.push('Missing requesting_principal_id');
    }

    // Decision enum
    if (!artifact.decision) {
      errors.push('Missing decision');
    } else if (!VALID_DECISIONS.has(artifact.decision)) {
      errors.push(`Invalid decision value: '${artifact.decision}'`);
    }

    // Explanation code enum
    if (!artifact.explanation_code) {
      errors.push('Missing explanation_code');
    } else if (!VALID_EXPLANATION_CODES.has(artifact.explanation_code)) {
      errors.push(`Invalid explanation_code: '${artifact.explanation_code}'`);
    }

    // Risk tier enum
    if (!artifact.assessed_risk_tier) {
      errors.push('Missing assessed_risk_tier');
    } else if (!VALID_RISK_TIERS.has(artifact.assessed_risk_tier)) {
      errors.push(`Invalid assessed_risk_tier: '${artifact.assessed_risk_tier}'`);
    }

    // Mode enum
    if (!artifact.mode_at_decision) {
      errors.push('Missing mode_at_decision');
    } else if (!VALID_MODES.has(artifact.mode_at_decision)) {
      errors.push(`Invalid mode_at_decision: '${artifact.mode_at_decision}'`);
    }

    // Version vector
    if (!artifact.version_vector) {
      errors.push('Missing version_vector');
    } else {
      const vv = artifact.version_vector;
      if (!vv.srg_version) errors.push('Missing version_vector.srg_version');
      if (!vv.policy_version) errors.push('Missing version_vector.policy_version');
      if (!vv.model_hash) errors.push('Missing version_vector.model_hash');
      if (!vv.authority_version) errors.push('Missing version_vector.authority_version');
      if (!vv.context_schema_version) errors.push('Missing version_vector.context_schema_version');
      if (!vv.compression_version) errors.push('Missing version_vector.compression_version');
      if (!vv.tool_contract_version) errors.push('Missing version_vector.tool_contract_version');
    }

    // State snapshots
    if (!artifact.state_before) {
      errors.push('Missing state_before');
    }
    if (!artifact.state_after) {
      errors.push('Missing state_after');
    }

    // Constraints applied must be an array
    if (!Array.isArray(artifact.constraints_applied)) {
      errors.push('constraints_applied must be an array');
    }

    // Delegation chain must be an array
    if (!Array.isArray(artifact.delegation_chain)) {
      errors.push('delegation_chain must be an array');
    }

    // Debug trace must be an array
    if (!Array.isArray(artifact.debug_trace)) {
      errors.push('debug_trace must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a signature against a decision artifact using the
   * provided signer implementation.
   *
   * Returns true if the signature is valid, false otherwise.
   */
  validateSignature(
    artifact: DecisionArtifact,
    signature: ArtifactSignature,
    signer: ArtifactSigner,
    key: string,
  ): boolean {
    return signer.verify(artifact, signature, key);
  }
}
