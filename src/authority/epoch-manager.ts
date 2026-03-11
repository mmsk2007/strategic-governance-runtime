/**
 * EpochManager - Manages the authority epoch lifecycle.
 *
 * An epoch is a contiguous interval during which authority configuration,
 * policy, and model versions are stable. Epoch boundaries are created
 * whenever one of these inputs changes.
 */

import { randomUUID, createHmac } from 'node:crypto';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Version vector active during an epoch. */
export interface VersionVector {
  readonly srg_version: string;
  readonly policy_version: string;
  readonly model_hash: string;
  readonly authority_version: string;
  readonly context_schema_version: string;
  readonly compression_version: string;
  readonly tool_contract_version: string;
}

/** Discriminated union of triggers that can cause an epoch boundary. */
export type EpochTrigger =
  | { readonly kind: 'policy_update'; readonly policy_version: string }
  | { readonly kind: 'authority_change'; readonly principal_id: string; readonly change: string }
  | { readonly kind: 'model_update'; readonly model_hash: string }
  | { readonly kind: 'manual'; readonly reason: string }
  | { readonly kind: 'scheduled'; readonly schedule_id: string };

/** A single authority epoch record. */
export interface AuthorityEpoch {
  /** Unique identifier for this epoch. */
  readonly epoch_id: string;
  /** Monotonically increasing epoch number. */
  readonly epoch_number: number;
  /** ISO-8601 timestamp when this epoch started. */
  readonly started_at: string;
  /** ISO-8601 timestamp when this epoch ended, or undefined if current. */
  readonly ended_at?: string;
  /** Version vector active during this epoch. */
  readonly version_vector: VersionVector;
  /** SHA-256 hash of the authority configuration snapshot. */
  readonly authority_config_hash: string;
  /** SHA-256 hash of the state snapshot at epoch start. */
  readonly state_snapshot_hash: string;
  /** Trigger that caused this epoch to begin. */
  readonly trigger: EpochTrigger;
  /** ID of the preceding epoch, if any. */
  readonly previous_epoch_id?: string;
}

// ---------------------------------------------------------------------------
// EpochManager
// ---------------------------------------------------------------------------

export class EpochManager {
  private readonly epochs: AuthorityEpoch[] = [];
  private versionVector: VersionVector;

  /**
   * @param initialVersionVector - The version vector for the first epoch.
   */
  constructor(initialVersionVector: VersionVector) {
    this.versionVector = { ...initialVersionVector };
  }

  /**
   * Return the current (most recent) epoch, or undefined if none exists.
   */
  currentEpoch(): AuthorityEpoch | undefined {
    return this.epochs.length > 0 ? this.epochs[this.epochs.length - 1] : undefined;
  }

  /**
   * Advance to a new epoch, closing the current one.
   *
   * @param trigger - The trigger that caused the epoch boundary.
   * @returns The newly created epoch.
   */
  advanceEpoch(trigger: EpochTrigger): AuthorityEpoch {
    const now = new Date().toISOString();

    // Close the current epoch.
    if (this.epochs.length > 0) {
      const current = this.epochs[this.epochs.length - 1];
      // Replace with ended_at set.
      (this.epochs as AuthorityEpoch[])[this.epochs.length - 1] = {
        ...current,
        ended_at: now,
      };
    }

    // Update version vector based on trigger kind.
    if (trigger.kind === 'policy_update') {
      this.versionVector = { ...this.versionVector, policy_version: trigger.policy_version };
    } else if (trigger.kind === 'model_update') {
      this.versionVector = { ...this.versionVector, model_hash: trigger.model_hash };
    }

    const previousEpochId = this.epochs.length > 0
      ? this.epochs[this.epochs.length - 1].epoch_id
      : undefined;

    const configHash = createHmac('sha256', 'authority-config')
      .update(JSON.stringify(this.versionVector))
      .digest('hex');

    const stateHash = createHmac('sha256', 'state-snapshot')
      .update(now)
      .digest('hex');

    const epoch: AuthorityEpoch = {
      epoch_id: randomUUID(),
      epoch_number: this.epochs.length + 1,
      started_at: now,
      version_vector: { ...this.versionVector },
      authority_config_hash: configHash,
      state_snapshot_hash: stateHash,
      trigger,
      previous_epoch_id: previousEpochId,
    };

    this.epochs.push(epoch);
    return epoch;
  }

  /**
   * Retrieve an epoch by its id.
   */
  getEpoch(epochId: string): AuthorityEpoch | undefined {
    return this.epochs.find((e) => e.epoch_id === epochId);
  }

  /**
   * Return the full append-only epoch history.
   */
  getEpochHistory(): ReadonlyArray<AuthorityEpoch> {
    return [...this.epochs];
  }
}
