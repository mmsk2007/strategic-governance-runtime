/**
 * ArtifactBuilder — constructs DecisionArtifact instances from
 * governance computation results.
 *
 * Each artifact is the atomic unit of audit. The builder computes
 * SHA-256 hashes for the input, context, and state snapshot so that
 * downstream consumers can verify integrity without accessing the
 * original payloads.
 */

import { randomUUID, createHash } from 'node:crypto';
import type {
  DecisionArtifact,
  DebugTraceEntry,
  AppliedConstraint,
  GovernanceDecision,
  ExplanationCode,
  InterventionGate,
  GovernanceMode,
  GovernanceState,
  VersionVector,
  ReplayBinding,
} from '../types/index.js';

// ── Local types ─────────────────────────────────────────────────────

/** Override data attached when a decision was manually overridden. */
export interface OverrideData {
  readonly overridden_by: string;
  readonly reason: string;
  readonly original_decision: GovernanceDecision;
  readonly override_timestamp: string;
}

/** Parameters for building a decision artifact. */
export interface BuildArtifactParams {
  readonly input: Record<string, unknown>;
  readonly output: {
    readonly decision: GovernanceDecision;
    readonly explanation_code: ExplanationCode;
    readonly constraints_applied: ReadonlyArray<AppliedConstraint>;
    readonly assessed_risk_tier: InterventionGate;
    readonly proposed_action: string;
  };
  readonly epochId: string;
  readonly versionVector: VersionVector;
  readonly authorizedBy: string;
  readonly mode: GovernanceMode;
  readonly stateBefore: GovernanceState;
  readonly stateAfter: GovernanceState;
  readonly delegationChain?: ReadonlyArray<string>;
  readonly overrideData?: OverrideData;
  readonly debugTrace?: ReadonlyArray<DebugTraceEntry>;
  readonly replayBinding?: ReplayBinding | null;
}

// ── Helpers ─────────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function canonicalize(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

// ── Class ───────────────────────────────────────────────────────────

export class ArtifactBuilder {
  /**
   * Build a complete DecisionArtifact from governance computation results.
   *
   * Computes SHA-256 hashes for the input, context (version vector),
   * and state snapshot to enable integrity verification.
   */
  build(params: BuildArtifactParams): DecisionArtifact {
    const decisionId = randomUUID();
    const timestamp = new Date().toISOString();

    const inputHash = sha256(canonicalize(params.input));
    const contextHash = sha256(canonicalize(params.versionVector));
    const stateSnapshotHash = sha256(canonicalize(params.stateBefore));

    const artifact: DecisionArtifact = {
      decision_id: decisionId,
      decided_at: timestamp,
      decision: params.output.decision,
      explanation_code: params.output.explanation_code,
      constraints_applied: params.output.constraints_applied,
      assessed_risk_tier: params.output.assessed_risk_tier,
      mode_at_decision: params.mode,
      state_before: params.stateBefore,
      state_after: params.stateAfter,
      version_vector: params.versionVector,
      authority_epoch_id: params.epochId,
      requesting_principal_id: params.authorizedBy,
      delegation_chain: params.delegationChain ?? [],
      debug_trace: params.debugTrace ?? [],
      replay_binding: params.replayBinding ?? null,
    };

    return artifact;
  }

  /**
   * Compute the SHA-256 hash of a decision artifact for signing purposes.
   * Excludes mutable fields (debug_trace, replay_binding) from the hash.
   */
  computeArtifactHash(artifact: DecisionArtifact): string {
    const hashPayload = {
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
    return sha256(JSON.stringify(hashPayload));
  }
}
