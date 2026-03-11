/**
 * Authority epoch types for Strategic Governance Runtime v2.
 *
 * An authority epoch represents a contiguous time interval during
 * which the authority graph, policy, and model configuration are
 * stable. Epoch boundaries are triggered by changes to any of these
 * inputs, creating a clear audit boundary.
 */

import type { SemanticVersion, VersionVector } from "./version-binding.js";

/**
 * Events that trigger an epoch boundary.
 */
export type EpochTrigger =
  | "policy_update"
  | "authority_change"
  | "model_update"
  | "manual"
  | "scheduled";

/**
 * A single authority epoch record.
 */
export interface AuthorityEpoch {
  /** Unique identifier for this epoch */
  readonly epoch_id: string;

  /** Monotonically increasing sequence number */
  readonly sequence: number;

  /** What triggered this epoch boundary */
  readonly trigger: EpochTrigger;

  /** Human-readable description of the trigger event */
  readonly trigger_description: string;

  /** Version vector active during this epoch */
  readonly version_vector: VersionVector;

  /** ISO-8601 timestamp when this epoch began */
  readonly started_at: string;

  /** ISO-8601 timestamp when this epoch ended, or null if current */
  readonly ended_at: string | null;

  /** ID of the principal or system that triggered the epoch */
  readonly triggered_by: string;

  /** ID of the preceding epoch, or null for the first epoch */
  readonly previous_epoch_id: string | null;
}

/**
 * Summary of epoch lineage for audit queries.
 */
export interface EpochLineage {
  /** The current (most recent) epoch */
  readonly current: AuthorityEpoch;

  /** Total number of epochs in the lineage */
  readonly total_epochs: number;

  /** Ordered list of epoch IDs from oldest to newest */
  readonly epoch_chain: ReadonlyArray<string>;
}
