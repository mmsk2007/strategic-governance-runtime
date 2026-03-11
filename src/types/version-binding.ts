/**
 * Version vector types for Strategic Governance Runtime v2.
 *
 * A version vector captures the exact combination of software, policy,
 * model, authority, and schema versions active at the time a decision
 * was made. This enables deterministic replay and audit.
 */

/** Semantic version string, e.g. "2.1.0" */
export type SemanticVersion = string;

/** Hex-encoded hash digest, e.g. SHA-256 */
export type HashDigest = string;

/**
 * Complete version vector pinned to every decision artifact.
 * All fields are required so that replay can reconstruct the
 * exact environment that produced a decision.
 */
export interface VersionVector {
  /** Version of the SRG runtime itself */
  readonly srg_version: SemanticVersion;

  /** Version of the active policy document */
  readonly policy_version: SemanticVersion;

  /** Hash of the model weights / checkpoint used for scoring */
  readonly model_hash: HashDigest;

  /** Version of the authority graph */
  readonly authority_version: SemanticVersion;

  /** Version of the context schema accepted by the runtime */
  readonly context_schema_version: SemanticVersion;

  /** Version of the log / artifact compression codec */
  readonly compression_version: SemanticVersion;

  /** Version of the tool-contract interface specification */
  readonly tool_contract_version: SemanticVersion;
}

/**
 * Binds a replay session to the version vector that was active
 * when the original decisions were recorded.
 */
export interface ReplayBinding {
  /** Unique identifier for the replay session */
  readonly replay_session_id: string;

  /** The version vector that must be restored for faithful replay */
  readonly version_vector: VersionVector;

  /** ISO-8601 timestamp when the binding was created */
  readonly bound_at: string;

  /** Whether the replay environment matched the vector exactly */
  readonly exact_match: boolean;

  /** Human-readable notes on any version mismatches */
  readonly mismatches: ReadonlyArray<string>;
}
